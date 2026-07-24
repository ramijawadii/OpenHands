import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nextSeq } from "./command-store";

export type CellExecutionState =
  | "idle"
  | "queued"
  | "running"
  | "success"
  | "error";

export type RuntimeState = "idle" | "starting" | "busy" | "restarting" | "dead";

export type Cell = {
  id: string;
  content: string;
  type: "input" | "output";
  imageUrls?: string[];
  ts?: number;
  seq?: number;
  exitCode?: number | null;
  executionState: CellExecutionState;
  executionCount?: number;
  executionStart?: number;
  executionDuration?: number;
};

export type ExecutionRecord = {
  cellId: string;
  executionCount: number;
  startTime: number;
  endTime: number;
  duration: number;
  status: "success" | "error";
};

interface JupyterState {
  // ephemeral (not persisted)
  cells: Cell[];
  connected: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  executionHistory: ExecutionRecord[];
  executionCounter: number;

  // persisted
  notebookTitle: string;
  kernelName: string;

  appendJupyterInput: (content: string) => void;
  appendJupyterOutput: (payload: {
    content: string;
    imageUrls?: string[];
  }) => void;
  clearJupyter: () => void;
  setNotebookTitle: (title: string) => void;
  setConnected: (connected: boolean) => void;
  newNotebook: () => void;
  markSaved: () => void;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

// Bound the in-memory Jupyter log: the agent can execute code thousands of times
// in a long session, and every run appends a cell + a history record. Keep only
// the most recent — older cells scroll out of view anyway and the authoritative
// record lives server-side. Prevents unbounded heap growth over a session.
const MAX_CELLS = 400;
const MAX_HISTORY = 400;
const capTail = <T>(arr: T[], max: number): T[] =>
  arr.length > max ? arr.slice(arr.length - max) : arr;

const isErrorContent = (content: string): boolean =>
  /^(Traceback|Error:|Exception:|\[ERROR\])/m.test(content.trimStart());

export const useJupyterStore = create<JupyterState>()(
  persist(
    (set, get) => ({
      cells: [],
      connected: false,
      isDirty: false,
      lastSaved: null,
      executionHistory: [],
      executionCounter: 0,
      notebookTitle: "Untitled.ipynb",
      kernelName: "Python 3",

      appendJupyterInput: (content: string) => {
        const id = generateId();
        const now = Date.now();
        const nextCount = get().executionCounter + 1;
        set((state) => ({
          cells: capTail(
            [
              ...state.cells,
              {
                id,
                content,
                type: "input",
                ts: now,
                seq: nextSeq(),
                executionState: "running",
                executionCount: nextCount,
                executionStart: now,
              },
            ],
            MAX_CELLS,
          ),
          connected: true,
          isDirty: true,
          executionCounter: nextCount,
        }));
      },

      appendJupyterOutput: (payload: {
        content: string;
        imageUrls?: string[];
      }) => {
        const id = generateId();
        const now = Date.now();
        const { cells } = get();

        // find last running input cell
        let runningInputIdx = -1;
        for (let i = cells.length - 1; i >= 0; i -= 1) {
          if (
            cells[i].type === "input" &&
            cells[i].executionState === "running"
          ) {
            runningInputIdx = i;
            break;
          }
        }

        const isError = isErrorContent(payload.content);
        const newExecState: CellExecutionState = isError ? "error" : "success";

        set((state) => {
          const updatedCells = [...state.cells];
          let historyRecord: ExecutionRecord | null = null;

          if (runningInputIdx !== -1) {
            const inputCell = { ...updatedCells[runningInputIdx] };
            const duration = now - (inputCell.executionStart ?? now);
            inputCell.executionState = newExecState;
            inputCell.executionDuration = duration;
            updatedCells[runningInputIdx] = inputCell;

            if (inputCell.executionCount != null) {
              historyRecord = {
                cellId: inputCell.id,
                executionCount: inputCell.executionCount,
                startTime: inputCell.executionStart ?? now,
                endTime: now,
                duration,
                status: isError ? "error" : "success",
              };
            }
          }

          const outputCell: Cell = {
            id,
            content: payload.content,
            type: "output",
            imageUrls: payload.imageUrls,
            executionState: "idle",
          };

          return {
            cells: capTail([...updatedCells, outputCell], MAX_CELLS),
            isDirty: true,
            executionHistory: historyRecord
              ? capTail([...state.executionHistory, historyRecord], MAX_HISTORY)
              : state.executionHistory,
          };
        });
      },

      clearJupyter: () =>
        set(() => ({
          cells: [],
          isDirty: false,
          lastSaved: new Date(),
          connected: false,
        })),

      setNotebookTitle: (title: string) =>
        set(() => ({ notebookTitle: title, isDirty: true })),

      setConnected: (connected: boolean) => set(() => ({ connected })),

      newNotebook: () =>
        set(() => ({
          cells: [],
          notebookTitle: "Untitled.ipynb",
          lastSaved: null,
          isDirty: false,
          executionHistory: [],
          executionCounter: 0,
          connected: false,
        })),

      markSaved: () => set(() => ({ isDirty: false, lastSaved: new Date() })),
    }),
    {
      name: "jupyter-notebook-meta",
      storage: createJSONStorage(() => localStorage),
      // only persist user-facing metadata, not ephemeral execution state
      partialize: (state) => ({
        notebookTitle: state.notebookTitle,
        kernelName: state.kernelName,
      }),
    },
  ),
);

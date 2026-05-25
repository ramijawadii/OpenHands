import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CellExecutionState =
  | "idle"
  | "queued"
  | "running"
  | "success"
  | "error";

export type RuntimeState =
  | "idle"
  | "starting"
  | "busy"
  | "restarting"
  | "dead";

export type Cell = {
  id: string;
  content: string;
  type: "input" | "output";
  imageUrls?: string[];
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
          cells: [
            ...state.cells,
            {
              id,
              content,
              type: "input",
              executionState: "running",
              executionCount: nextCount,
              executionStart: now,
            },
          ],
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
        for (let i = cells.length - 1; i >= 0; i--) {
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
            cells: [...updatedCells, outputCell],
            isDirty: true,
            executionHistory: historyRecord
              ? [...state.executionHistory, historyRecord]
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

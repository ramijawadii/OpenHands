import { create } from "zustand";

/** Execution metadata carried alongside each entry.
 *  `seq` is a monotonic arrival counter used to break timestamp ties and to
 *  keep ordering stable when a timestamp is missing or unparseable. */
export type ExecMeta = {
  /** epoch ms; undefined when the event carried no usable timestamp */
  ts?: number;
  seq?: number;
  /** outputs only: real process exit code. null/undefined = unknown, NOT ok. */
  exitCode?: number | null;
};

export type Command = {
  content: string;
  type: "input" | "output";
} & ExecMeta;

let seqCounter = 0;
/** Monotonic arrival sequence, shared across stores so streams interleave. */
export const nextSeq = () => {
  seqCounter += 1;
  return seqCounter;
};

/** ISO8601 → epoch ms, tolerant of missing/garbage values (never NaN). */
export const parseTs = (iso?: string): number | undefined => {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : t;
};

interface CommandState {
  commands: Command[];
  appendInput: (content: string, ts?: number) => void;
  appendOutput: (content: string, ts?: number, exitCode?: number | null) => void;
  clearTerminal: () => void;
}

export const useCommandStore = create<CommandState>((set) => ({
  commands: [],
  appendInput: (content: string, ts?: number) =>
    set((state) => ({
      commands: [
        ...state.commands,
        { content, type: "input", ts, seq: nextSeq() },
      ],
    })),
  appendOutput: (content: string, ts?: number, exitCode?: number | null) =>
    set((state) => ({
      commands: [
        ...state.commands,
        { content, type: "output", ts, seq: nextSeq(), exitCode },
      ],
    })),
  clearTerminal: () => set({ commands: [] }),
}));

/**
 * Layer 9 — Compact Warning Zustand Store
 *
 * Tracks the lifecycle of context-window compaction (condensation) events.
 * Updated by ws-client-provider when condensation actions/observations arrive
 * via the `oh_event` Socket.IO channel.
 *
 * State surface:
 *   isCompacting       — true between CondensationRequestAction and CondensationObservation
 *   compactionCount    — increments each time compaction completes
 *   lastCompactedAt    — timestamp of the most recent completed compaction
 *   lastSummary        — the summary text from the most recent compaction (if any)
 */
import { create } from "zustand";

interface CompactState {
  /** True while a compaction request is in-flight (request seen, result not yet received). */
  isCompacting: boolean;
  /** How many compactions have completed in this session. */
  compactionCount: number;
  /** Timestamp of the last completed compaction, or null if none yet. */
  lastCompactedAt: Date | null;
  /** The summary text from the most recent completed compaction. */
  lastSummary: string | null;
}

interface CompactActions {
  /** Call when a CondensationRequestAction arrives (compaction started). */
  recordCompactionStarted: () => void;
  /** Call when a CondensationObservation arrives (compaction finished). */
  recordCompactionComplete: (summary?: string) => void;
  /** Reset to initial state on conversation change. */
  reset: () => void;
}

export type CompactStore = CompactState & CompactActions;

const initialState: CompactState = {
  isCompacting: false,
  compactionCount: 0,
  lastCompactedAt: null,
  lastSummary: null,
};

export const useCompactStore = create<CompactStore>((set) => ({
  ...initialState,

  recordCompactionStarted: () => set({ isCompacting: true }),

  recordCompactionComplete: (summary?: string) =>
    set((state) => ({
      isCompacting: false,
      compactionCount: state.compactionCount + 1,
      lastCompactedAt: new Date(),
      lastSummary: summary !== undefined ? summary : state.lastSummary,
    })),

  reset: () => set(initialState),
}));

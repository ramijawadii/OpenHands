/**
 * Layer — Context Pressure Zustand Store
 *
 * Tracks how full the current context window is relative to the
 * condenser's max_size threshold. Updated via `oh_context_pressure`
 * Socket.IO events emitted by the backend on every agent state change.
 *
 * `used`     — current event count in the session
 * `max`      — condenser max_size (default 120)
 * `pressure` — used/max clamped to [0, 1]
 */
import { create } from "zustand";

interface ContextPressureStore {
  used: number;
  max: number;
  pressure: number;
  setContextPressure: (used: number, max: number) => void;
  reset: () => void;
}

export const useContextPressureStore = create<ContextPressureStore>((set) => ({
  used: 0,
  max: 120,
  pressure: 0,

  setContextPressure: (used, max) =>
    set({
      used,
      max,
      pressure: max > 0 ? Math.min(used / max, 1.0) : 0,
    }),

  reset: () => set({ used: 0, max: 120, pressure: 0 }),
}));

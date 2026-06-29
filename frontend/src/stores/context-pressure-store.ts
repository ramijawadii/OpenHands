/**
 * Layer — Context Pressure Zustand Store
 *
 * Tracks how full the current context window is using REAL token data from
 * the backend LLM metrics (Claude Code architecture).
 *
 * Architecture (mirrors Claude Code):
 *   token_usage      = prompt + cache_read + cache_write + completion tokens
 *                      from the most recent API response
 *   context_window   = model's max context window (e.g. 200k for Claude Sonnet)
 *   auto_compact_threshold = context_window − 20k (output reserve) − 13k (trigger buffer)
 *   percent_remaining = max(0, round(((threshold − usage) / threshold) × 100))
 *   pressure          = min(usage / threshold, 1.0)   — drives the ring fill
 *
 * Updated via `oh_context_pressure` Socket.IO events emitted by the backend on
 * every AgentStateChangedObservation.
 */
import { create } from "zustand";

export interface ContextPressurePayload {
  token_usage: number;
  context_window: number;
  auto_compact_threshold: number;
  percent_remaining: number;
  pressure: number;
}

interface ContextPressureStore {
  tokenUsage: number;
  contextWindow: number;
  autoCompactThreshold: number;
  percentRemaining: number;
  pressure: number;
  setContextPressure: (payload: ContextPressurePayload) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  tokenUsage: 0,
  contextWindow: 0,
  autoCompactThreshold: 0,
  percentRemaining: 100,
  pressure: 0,
};

export const useContextPressureStore = create<ContextPressureStore>((set) => ({
  ...INITIAL_STATE,

  setContextPressure: (payload) =>
    set({
      tokenUsage: payload.token_usage,
      contextWindow: payload.context_window,
      autoCompactThreshold: payload.auto_compact_threshold,
      percentRemaining: payload.percent_remaining,
      pressure: payload.pressure,
    }),

  reset: () => set({ ...INITIAL_STATE }),
}));

/**
 * Layer 9 — External Session State Zustand Store
 *
 * Mirrors the backend `ExternalSessionState` 3-state surface.
 * Updated by ws-client-provider when `agent_external_state` Socket.IO events
 * arrive from the backend (emitted on every AgentStateChangedObservation).
 *
 * State values: "idle" | "running" | "requires_action"
 * Corresponds to openhands/server/session/external_state.py
 */
import { create } from "zustand";

export type ExternalStateName = "idle" | "running" | "requires_action";

export interface PendingAction {
  tool_name: string;
  action_description: string;
  tool_use_id: string;
  request_id?: string;
  input?: Record<string, unknown>;
}

export interface AgentExternalStatePayload {
  state: ExternalStateName;
  permission_mode?: string;
  model?: string;
  pending_action?: PendingAction;
  post_turn_summary?: string;
  task_summary?: string;
}

interface ExternalStateStore {
  /** The current 3-state external surface. */
  externalState: ExternalStateName;
  /** Full payload from the last agent_external_state event. */
  payload: AgentExternalStatePayload | null;
  /** Update from an incoming agent_external_state Socket.IO event payload. */
  setExternalState: (payload: AgentExternalStatePayload) => void;
  /** Reset on conversation change. */
  reset: () => void;
}

export const useExternalStateStore = create<ExternalStateStore>((set) => ({
  externalState: "idle",
  payload: null,

  setExternalState: (payload: AgentExternalStatePayload) =>
    set({ externalState: payload.state, payload }),

  reset: () => set({ externalState: "idle", payload: null }),
}));

/**
 * Tests for external-state-store (Layer 9)
 *
 * Coverage:
 *   - initial state: externalState="idle", payload=null
 *   - setExternalState: updates externalState and full payload
 *   - all three state values accepted: idle, running, requires_action
 *   - optional payload fields stored
 *   - reset: returns to idle with null payload
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useExternalStateStore } from "../external-state-store";
import type { AgentExternalStatePayload } from "../external-state-store";

function getStore() {
  return useExternalStateStore.getState();
}

describe("useExternalStateStore", () => {
  beforeEach(() => {
    useExternalStateStore.getState().reset();
  });

  describe("initial state", () => {
    it('externalState is "idle"', () => {
      expect(getStore().externalState).toBe("idle");
    });

    it("payload is null", () => {
      expect(getStore().payload).toBeNull();
    });
  });

  describe("setExternalState", () => {
    it('accepts "running"', () => {
      getStore().setExternalState({ state: "running" });
      expect(getStore().externalState).toBe("running");
    });

    it('accepts "requires_action"', () => {
      getStore().setExternalState({ state: "requires_action" });
      expect(getStore().externalState).toBe("requires_action");
    });

    it('accepts "idle"', () => {
      getStore().setExternalState({ state: "running" });
      getStore().setExternalState({ state: "idle" });
      expect(getStore().externalState).toBe("idle");
    });

    it("stores the full payload", () => {
      const payload: AgentExternalStatePayload = {
        state: "running",
        model: "vertex_ai/gemini-2.5-flash",
        permission_mode: "default",
      };
      getStore().setExternalState(payload);
      expect(getStore().payload).toEqual(payload);
    });

    it("stores pending_action when present", () => {
      const payload: AgentExternalStatePayload = {
        state: "requires_action",
        pending_action: {
          tool_name: "bash",
          action_description: "Run ls -la",
          tool_use_id: "t-001",
        },
      };
      getStore().setExternalState(payload);
      expect(getStore().payload?.pending_action?.tool_name).toBe("bash");
    });

    it("overwrites previous state on subsequent calls", () => {
      getStore().setExternalState({ state: "running" });
      getStore().setExternalState({ state: "requires_action" });
      expect(getStore().externalState).toBe("requires_action");
    });
  });

  describe("reset", () => {
    it('resets externalState to "idle"', () => {
      getStore().setExternalState({ state: "running" });
      getStore().reset();
      expect(getStore().externalState).toBe("idle");
    });

    it("resets payload to null", () => {
      getStore().setExternalState({ state: "running", model: "gemini" });
      getStore().reset();
      expect(getStore().payload).toBeNull();
    });
  });
});

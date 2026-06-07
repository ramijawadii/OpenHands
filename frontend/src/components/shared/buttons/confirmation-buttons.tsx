import { useCallback, useEffect } from "react";
import { AgentState } from "#/types/agent-state";
import { generateAgentStateChangeEvent } from "#/services/agent-state-service";
import { useWsClient } from "#/context/ws-client-provider";
import { isOpenHandsAction } from "#/types/core/guards";
import { useEventMessageStore } from "#/stores/event-message-store";

/**
 * CloudGuard: the inline Confirm/Reject buttons are intentionally NOT rendered — action
 * confirmation is surfaced in the gray ConfirmationBanner attached to the chatbox (with
 * View more / red-green diff). This component is kept only to preserve the keyboard
 * shortcuts (⌘↩ confirm, ⇧⌘⌫ reject); it renders nothing.
 */
export function ConfirmationButtons() {
  const addSubmittedEventId = useEventMessageStore(
    (state) => state.addSubmittedEventId,
  );

  const { send, parsedEvents } = useWsClient();

  // Find the most recent action awaiting confirmation
  const awaitingAction = parsedEvents
    .slice()
    .reverse()
    .find((ev) => {
      if (!isOpenHandsAction(ev) || ev.source !== "agent") return false;
      const args = ev.args as Record<string, unknown>;
      return args?.confirmation_state === "awaiting_confirmation";
    });

  const handleStateChange = useCallback(
    (state: AgentState) => {
      if (!awaitingAction) {
        return;
      }
      addSubmittedEventId(awaitingAction.id);
      send(generateAgentStateChangeEvent(state));
    },
    [send, addSubmittedEventId, awaitingAction],
  );

  // Preserve keyboard shortcuts (the visible controls live in ConfirmationBanner).
  useEffect(() => {
    if (!awaitingAction) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.metaKey && event.key === "Backspace") {
        event.preventDefault();
        handleStateChange(AgentState.USER_REJECTED);
      }
      if (event.metaKey && event.key === "Enter") {
        event.preventDefault();
        handleStateChange(AgentState.USER_CONFIRMED);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [awaitingAction, handleStateChange]);

  return null;
}

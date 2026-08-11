import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsEventType } from "#/types/core/base";
import {
  isCommandAction,
  isCommandObservation,
  isOpenHandsAction,
  isOpenHandsObservation,
} from "#/types/core/guards";
import { OpenHandsObservation } from "#/types/core/observations";

const COMMON_NO_RENDER_LIST: OpenHandsEventType[] = [
  "system",
  "agent_state_changed",
  "change_agent_state",
];

const ACTION_NO_RENDER_LIST: OpenHandsEventType[] = [
  "recall",
  "condensation_request", // internal compaction plumbing — never shown in chat
  "condensation", // compaction result (CondensationAction) shown via CompactionBanner, not in chat
];

const OBSERVATION_NO_RENDER_LIST: OpenHandsEventType[] = [
  "think",
  "condensation", // kept for safety; completion is actually an action, not an observation
  // The "Microagent ready" card — workspace context the agent recalled at the
  // start of a turn (date, runtime hosts, repo instructions). It is plumbing
  // the agent needs and the reader does not; it opened every conversation with
  // a block about ports nobody asked about. The recall ACTION is already
  // hidden above, so hiding the observation removes the pair.
  "recall",
];

export const shouldRenderEvent = (
  event: OpenHandsAction | OpenHandsObservation,
) => {
  if (isOpenHandsAction(event)) {
    if (isCommandAction(event) && event.source === "user") {
      // For user commands, we always hide them from the chat interface
      return false;
    }

    /*
      The awaiting-confirmation copy of an action is never rendered.

      When you approve or reject, `AgentController._set_agent_state_to` clears
      the pending action's id and RE-ADDS IT to the stream with
      `confirmation_state` set. So an approved action legitimately appears
      twice: once awaiting, once confirmed — and the transcript showed the same
      command as two cards, the second arriving the moment you pressed Approve.

      While it is awaiting, ConfirmationBanner already shows it (read straight
      from the event store, not from this list). Afterwards the confirmed copy
      carries the observation. The awaiting copy has no moment where it is the
      right thing to draw.
    */
    const confirmationState = (event.args as { confirmation_state?: string })
      ?.confirmation_state;
    if (confirmationState === "awaiting_confirmation") {
      return false;
    }

    const noRenderList = COMMON_NO_RENDER_LIST.concat(ACTION_NO_RENDER_LIST);
    return !noRenderList.includes(event.action);
  }

  if (isOpenHandsObservation(event)) {
    if (isCommandObservation(event) && event.source === "user") {
      // For user commands, we always hide them from the chat interface
      return false;
    }

    const noRenderList = COMMON_NO_RENDER_LIST.concat(
      OBSERVATION_NO_RENDER_LIST,
    );
    return !noRenderList.includes(event.observation);
  }

  return true;
};

export const hasUserEvent = (
  events: (OpenHandsAction | OpenHandsObservation)[],
) =>
  events.some((event) => isOpenHandsAction(event) && event.source === "user");

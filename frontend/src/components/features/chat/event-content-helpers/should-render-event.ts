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
];

export const shouldRenderEvent = (
  event: OpenHandsAction | OpenHandsObservation,
) => {
  if (isOpenHandsAction(event)) {
    if (isCommandAction(event) && event.source === "user") {
      // For user commands, we always hide them from the chat interface
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

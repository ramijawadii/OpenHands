import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";
import { isOpenHandsAction, isOpenHandsObservation } from "#/types/core/guards";
import { extractPlanMarkdown } from "./plan-snapshot-message";

/**
 * Pre-computed O(1) lookups over the rendered message list.
 *
 * `messages.tsx` previously did two linear scans PER ROW — `actionHasObservationPair`
 * (`messages.some`) and the plan-snapshot `messages.find` — i.e. O(n²) per frame on a
 * long conversation. This builds those once (O(n)) so each row reads in O(1). Port of
 * Claude Code's `MessageLookups` (MEMORY_MANAGEMENT_IMPLEMENTATION.md §3).
 */
export interface MessageLookups {
  /** action.id -> its FIRST paired observation (observation.cause === action.id). */
  observationByCauseId: Map<number, OpenHandsObservation>;
  /** action.id -> the [CLOUDGUARD_PLAN] markdown carried by its observation, if any. */
  planSnapshotByCause: Map<number, string>;
  /** event.id -> the action with that id (for cross-row references). */
  actionById: Map<number, OpenHandsAction>;
}

export function buildMessageLookups(
  messages: (OpenHandsAction | OpenHandsObservation)[],
): MessageLookups {
  const observationByCauseId = new Map<number, OpenHandsObservation>();
  const planSnapshotByCause = new Map<number, string>();
  const actionById = new Map<number, OpenHandsAction>();

  for (const msg of messages) {
    if (isOpenHandsAction(msg)) {
      if (typeof msg.id === "number") actionById.set(msg.id, msg);
    } else if (
      isOpenHandsObservation(msg) &&
      typeof msg.cause === "number" &&
      // First observation for a cause wins — matches the previous .find/.some semantics.
      !observationByCauseId.has(msg.cause)
    ) {
      observationByCauseId.set(msg.cause, msg);
      const plan = extractPlanMarkdown(msg.content);
      if (plan) planSnapshotByCause.set(msg.cause, plan);
    }
  }

  return { observationByCauseId, planSnapshotByCause, actionById };
}

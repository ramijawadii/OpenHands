import React from "react";
import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";
import { isOpenHandsAction, isOpenHandsObservation } from "#/types/core/guards";
import { ThoughtIndicator } from "../thought-indicator";
import { GenericEventMessage } from "../generic-event-message";
import { ConfirmationButtons } from "#/components/shared/buttons/confirmation-buttons";
import { getEventContent } from "../event-content-helpers/get-event-content";
import { getObservationResult } from "../event-content-helpers/get-observation-result";
import { getEventIcon } from "../event-content-helpers/event-type-icon";
import { CommandCell } from "../command-cell";
import { getObservationContent } from "../event-content-helpers/get-observation-content";

const hasThoughtProperty = (
  obj: Record<string, unknown>,
): obj is { thought: string } => "thought" in obj && !!obj.thought;

/**
 * A command is rendered as a notebook cell rather than as a generic collapsed
 * row: it is the one event type where the *content* — what was run and what it
 * printed — is the point, and hiding it behind a chevron made the transcript
 * unskimmable.
 *
 * Both the action (`run`, before output) and its observation (`run`, with
 * output) map to the same cell, so the row does not change shape when the
 * result arrives.
 */
const commandOf = (
  event: OpenHandsAction | OpenHandsObservation,
): string | null => {
  if (isOpenHandsAction(event) && event.action === "run") {
    const args = event.args as { command?: string };
    return args.command ?? null;
  }
  if (isOpenHandsObservation(event) && event.observation === "run") {
    const extras = event.extras as { command?: string };
    return extras.command ?? null;
  }
  return null;
};

/**
 * The execution counter.
 *
 * `id` is the event-stream sequence, which is monotonic per conversation, so
 * the same number lands on an action and on its observation only if we use the
 * ACTION's id — the observation carries `cause` pointing back at it. That is
 * what makes `In [n]` and `Out [n]` agree.
 */
const counterOf = (
  event: OpenHandsAction | OpenHandsObservation,
): number | undefined => {
  const e = event as { id?: number; cause?: number };
  return e.cause ?? e.id;
};

interface GenericEventMessageWrapperProps {
  event: OpenHandsAction | OpenHandsObservation;
  shouldShowConfirmationButtons: boolean;
}

export function GenericEventMessageWrapper({
  event,
  shouldShowConfirmationButtons,
}: GenericEventMessageWrapperProps) {
  const Icon = getEventIcon(event);
  const content = getEventContent(event);
  const command = commandOf(event);

  if (command !== null) {
    return (
      <div>
        {isOpenHandsAction(event) &&
          hasThoughtProperty(event.args) &&
          event.action !== "think" && <ThoughtIndicator />}

        <CommandCell
          command={command}
          index={counterOf(event)}
          output={
            isOpenHandsObservation(event)
              ? getObservationContent(event)
              : undefined
          }
          status={
            isOpenHandsObservation(event)
              ? getObservationResult(event)
              : undefined
          }
        />

        {shouldShowConfirmationButtons && <ConfirmationButtons />}
      </div>
    );
  }

  return (
    <div>
      {isOpenHandsAction(event) &&
        hasThoughtProperty(event.args) &&
        event.action !== "think" && <ThoughtIndicator />}

      <GenericEventMessage
        title={content.title}
        details={content.details}
        success={
          isOpenHandsObservation(event)
            ? getObservationResult(event)
            : undefined
        }
        icon={Icon}
      />

      {shouldShowConfirmationButtons && <ConfirmationButtons />}
    </div>
  );
}

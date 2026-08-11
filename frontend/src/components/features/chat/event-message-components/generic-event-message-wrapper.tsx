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
import { ToolEventView, getToolEventKind } from "../tool-event-view";

const hasThoughtProperty = (
  obj: Record<string, unknown>,
): obj is { thought: string } => "thought" in obj && !!obj.thought;

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

  // Every tool in/out — bash, IPython, MCP, read, edit, write — goes through the
  // one pair of blocks. Only events that are not tool calls fall through to the
  // generic collapsed row below.
  if (getToolEventKind(event) !== null) {
    return (
      <div>
        {isOpenHandsAction(event) &&
          hasThoughtProperty(event.args) &&
          event.action !== "think" && <ThoughtIndicator />}

        <ToolEventView
          event={event}
          success={
            isOpenHandsObservation(event)
              ? getObservationResult(event) === "success"
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

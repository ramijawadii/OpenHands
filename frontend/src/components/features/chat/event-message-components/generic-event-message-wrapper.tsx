import React from "react";
import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";
import { isOpenHandsAction, isOpenHandsObservation } from "#/types/core/guards";
import { ChatMessage } from "../chat-message";
import { GenericEventMessage } from "../generic-event-message";
import { ConfirmationButtons } from "#/components/shared/buttons/confirmation-buttons";
import { getEventContent } from "../event-content-helpers/get-event-content";
import { getObservationResult } from "../event-content-helpers/get-observation-result";
import { getEventIcon } from "../event-content-helpers/event-type-icon";

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

  return (
    <div>
      {isOpenHandsAction(event) &&
        hasThoughtProperty(event.args) &&
        event.action !== "think" && (
          <ChatMessage type="agent" message={event.args.thought} />
        )}

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

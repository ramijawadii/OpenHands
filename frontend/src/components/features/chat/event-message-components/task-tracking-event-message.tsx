import React from "react";
import { useTranslation } from "react-i18next";
import { OpenHandsObservation } from "#/types/core/observations";
import { isTaskTrackingObservation } from "#/types/core/guards";
import { GenericEventMessage } from "../generic-event-message";
import { TaskTrackingObservationContent } from "../task-tracking-observation-content";
import { ConfirmationButtons } from "#/components/shared/buttons/confirmation-buttons";
import { getObservationResult } from "../event-content-helpers/get-observation-result";

interface TaskTrackingEventMessageProps {
  event: OpenHandsObservation;
  shouldShowConfirmationButtons: boolean;
}

export function TaskTrackingEventMessage({
  event,
  shouldShowConfirmationButtons,
}: TaskTrackingEventMessageProps) {
  const { t } = useTranslation();

  if (!isTaskTrackingObservation(event)) {
    return null;
  }

  const { command } = event.extras;
  let title: React.ReactNode;
  let initiallyExpanded = false;
  // The plan is the agent's working state — always visible, never behind a dropdown.
  const isPlan = command === "plan";

  // Determine title and expansion state based on command
  if (isPlan) {
    title = t("OBSERVATION_MESSAGE$TASK_TRACKING_PLAN");
    initiallyExpanded = true;
  } else {
    // command === "view"
    title = t("OBSERVATION_MESSAGE$TASK_TRACKING_VIEW");
    initiallyExpanded = false;
  }

  return (
    <div>
      <GenericEventMessage
        title={title}
        details={<TaskTrackingObservationContent event={event} />}
        success={getObservationResult(event)}
        initiallyExpanded={initiallyExpanded}
        collapsible={!isPlan}
      />
      {shouldShowConfirmationButtons && <ConfirmationButtons />}
    </div>
  );
}

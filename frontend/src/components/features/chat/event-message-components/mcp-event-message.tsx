import React from "react";
import { OpenHandsObservation } from "#/types/core/observations";
import { isMcpObservation } from "#/types/core/guards";
import { ConfirmationButtons } from "#/components/shared/buttons/confirmation-buttons";
import { getObservationResult } from "../event-content-helpers/get-observation-result";
import { ToolEventView } from "../tool-event-view";

interface McpEventMessageProps {
  event: OpenHandsObservation;
  shouldShowConfirmationButtons: boolean;
}

/**
 * An MCP call is a tool call like any other, so it renders as the same terminal
 * block as bash and IPython — the tool name and its JSON arguments are the
 * "command", the result is the output. It used to have its own bespoke layout
 * (GenericEventMessage + MCPObservationContent), which made identical
 * information look like a different kind of event.
 */
export function McpEventMessage({
  event,
  shouldShowConfirmationButtons,
}: McpEventMessageProps) {
  if (!isMcpObservation(event)) {
    return null;
  }

  return (
    <div>
      <ToolEventView
        event={event}
        success={getObservationResult(event) === "success"}
      />
      {shouldShowConfirmationButtons && <ConfirmationButtons />}
    </div>
  );
}

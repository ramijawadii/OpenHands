import React from "react";
import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";
import { isErrorObservation } from "#/types/core/guards";
import { LikertScale } from "../../feedback/likert-scale";

interface LikertScaleWrapperProps {
  event: OpenHandsAction | OpenHandsObservation;
  isLastMessage: boolean;
  isInLast10Actions: boolean;
  config?: { APP_MODE?: string } | null;
  isCheckingFeedback: boolean;
  feedbackData: {
    exists: boolean;
    rating?: number;
    reason?: string;
  };
}

export function LikertScaleWrapper({
  event,
  isLastMessage,
  isInLast10Actions,
  config,
  isCheckingFeedback,
  feedbackData,
}: LikertScaleWrapperProps) {
  return null;
}

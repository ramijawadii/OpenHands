interface TrajectoryActionsProps {
  onPositiveFeedback: () => void;
  onNegativeFeedback: () => void;
  isSaasMode?: boolean;
}

export function TrajectoryActions(_props: TrajectoryActionsProps) {
  return <div data-testid="feedback-actions" />;
}

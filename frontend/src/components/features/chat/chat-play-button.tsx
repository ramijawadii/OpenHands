import { Play } from "lucide-react";
import { cn } from "#/utils/utils";

export interface ChatResumeAgentButtonProps {
  onAgentResumed: () => void;
  disabled?: boolean;
}

export function ChatResumeAgentButton({
  onAgentResumed,
  disabled = false,
}: ChatResumeAgentButtonProps) {
  return (
    <button
      type="button"
      onClick={onAgentResumed}
      data-testid="play-button"
      disabled={disabled}
      className={cn("cursor-pointer", disabled && "cursor-not-allowed")}
    >
      <Play size={16} className="block" />
    </button>
  );
}

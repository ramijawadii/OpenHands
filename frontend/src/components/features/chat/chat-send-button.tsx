import { ArrowUp } from "lucide-react";
import { cn } from "#/utils/utils";

export interface ChatSendButtonProps {
  buttonClassName: string;
  handleSubmit: () => void;
  disabled: boolean;
}

export function ChatSendButton({
  buttonClassName,
  handleSubmit,
  disabled,
}: ChatSendButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center rounded-full border size-[32px] transition-colors duration-150 bg-[var(--cg-bg-page)]",
        disabled
          ? "cursor-not-allowed border-[var(--cg-border)] text-[var(--cg-border-strong)]"
          : "cursor-pointer border-[var(--cg-border-strong)] text-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)] hover:border-[var(--cg-text-primary)] hover:bg-[var(--cg-workspace-bg)]",
        buttonClassName,
      )}
      data-name="arrow-up-circle-fill"
      data-testid="submit-button"
      onClick={handleSubmit}
      disabled={disabled}
    >
      <ArrowUp size={14} />
    </button>
  );
}

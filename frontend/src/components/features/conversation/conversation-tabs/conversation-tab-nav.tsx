import { ComponentType } from "react";
import { cn } from "#/utils/utils";

type ConversationTabNavProps = {
  icon: ComponentType<{ className: string }>;
  label?: string;
  onClick(): void;
  isActive?: boolean;
};

export function ConversationTabNav({
  icon: Icon,
  label,
  onClick,
  isActive,
}: ConversationTabNavProps) {
  // Matches the CloudGuard reference: pill tabs, active = card background.
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5",
        "text-[12.5px] whitespace-nowrap transition-colors cursor-pointer",
        isActive
          ? "bg-[var(--cg-bg-card)] text-[var(--cg-text-primary)]"
          : "text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-primary)]",
      )}
    >
      <Icon className="h-3.5 w-3.5 text-inherit shrink-0" />
      {label && <span>{label}</span>}
    </button>
  );
}

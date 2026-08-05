import { ComponentType } from "react";
import { cn } from "#/utils/utils";

type ConversationTabNavProps = {
  icon: ComponentType<{ className: string }>;
  label?: string;
  onClick(): void;
  isActive?: boolean;
  /** Icon only — the label moves to the tooltip. See `ConversationTabs`. */
  compact?: boolean;
};

export function ConversationTabNav({
  icon: Icon,
  label,
  onClick,
  isActive,
  compact,
}: ConversationTabNavProps) {
  // Matches the CloudGuard reference: pill tabs, active = card background.
  return (
    <button
      type="button"
      onClick={onClick}
      // `aria-label` always carries the full label: the accessible name must
      // not disappear just because the drawer got narrow.
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center rounded-md py-1.5",
        "text-[12.5px] whitespace-nowrap transition-colors cursor-pointer",
        compact ? "gap-0 px-2" : "gap-1.5 px-2.5",
        isActive
          ? "bg-[var(--cg-bg-card)] text-[var(--cg-text-primary)]"
          : "text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-primary)]",
      )}
    >
      <Icon className="h-3.5 w-3.5 text-inherit shrink-0" />
      {label && !compact && <span>{label}</span>}
    </button>
  );
}

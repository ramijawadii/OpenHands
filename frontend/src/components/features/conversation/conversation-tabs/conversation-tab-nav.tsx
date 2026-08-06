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
  /**
   * Pill tabs on the drawer's header strip.
   *
   * **Active and hover are the strip's black, not its card grey.** The strip
   * sits on `--cg-bg-sidebar` (#1f1f1e), and the active pill used
   * `--cg-bg-card` (#121212) — a 13-point step that is legible on a large
   * surface but not on a 24px-tall pill, so the selected tab read as unselected.
   * Worse, `--cg-bg-hover` (#0d0d0c) is DARKER than that card grey, so merely
   * hovering an inactive tab made it look more selected than the active one.
   *
   * Active now takes `--cg-bg-active`, the darkest token, and hover sits one
   * step lighter — so the two states are both clearly visible against the strip
   * AND correctly ordered, with the selected tab always the strongest mark.
   * Both are tokens, so the light theme inverts to its own greys rather than
   * being handed a hard-coded black.
   */
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
          ? "bg-[var(--cg-tab-active-bg)] text-[var(--cg-text-primary)]"
          : "text-[var(--cg-text-nav)] hover:bg-[var(--cg-tab-hover-bg)] hover:text-[var(--cg-text-primary)]",
      )}
    >
      <Icon className="h-3.5 w-3.5 text-inherit shrink-0" />
      {label && !compact && <span>{label}</span>}
    </button>
  );
}

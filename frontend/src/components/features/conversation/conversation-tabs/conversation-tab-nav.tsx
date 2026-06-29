/* eslint-disable no-param-reassign -- hover styling mutates e.currentTarget.style */
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
  return (
    <button
      type="button"
      onClick={() => {
        onClick();
      }}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md cursor-pointer",
        "text-[13px] font-medium whitespace-nowrap transition-colors duration-150",
        isActive
          ? "text-[var(--cg-text-primary)]"
          : "text-[var(--cg-text-nav)]",
      )}
      style={{
        backgroundColor: isActive ? "var(--cg-bg-page)" : "transparent",
        border: `1px solid ${isActive ? "var(--cg-border)" : "transparent"}`,
      }}
      onMouseEnter={(e) => {
        if (!isActive)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "var(--cg-workspace-bg-hover)";
        (e.currentTarget as HTMLButtonElement).style.color =
          "var(--cg-text-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = isActive
          ? "var(--cg-bg-page)"
          : "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = isActive
          ? "var(--cg-text-primary)"
          : "var(--cg-text-nav)";
      }}
    >
      <Icon className={cn("w-4 h-4 text-inherit shrink-0")} />
      {label && <span>{label}</span>}
    </button>
  );
}

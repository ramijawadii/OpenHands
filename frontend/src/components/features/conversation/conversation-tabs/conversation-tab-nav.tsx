import { ComponentType } from "react";
import { cn } from "#/utils/utils";

type ConversationTabNavProps = {
  icon: ComponentType<{ className: string }>;
  onClick(): void;
  isActive?: boolean;
};

export function ConversationTabNav({
  icon: Icon,
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
        "p-2 rounded-lg cursor-pointer transition-colors duration-150",
        isActive
          ? "text-[var(--cg-text-primary)]"
          : "text-[var(--cg-text-nav)]",
      )}
      style={{
        backgroundColor: isActive ? "var(--cg-bg-page)" : "var(--cg-workspace-bg-hover)",
        border: "1px solid var(--cg-border)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--cg-bg-page)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--cg-text-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = isActive ? "var(--cg-bg-page)" : "var(--cg-workspace-bg-hover)";
        (e.currentTarget as HTMLButtonElement).style.color = isActive ? "var(--cg-text-primary)" : "var(--cg-text-nav)";
      }}
    >
      <Icon className={cn("w-5 h-5 text-inherit")} />
    </button>
  );
}

import React from "react";
import { ListChecks } from "lucide-react";
import { cn } from "#/utils/utils";
import { usePlanPanelStore, planProgress } from "#/state/plan-panel-store";

/**
 * "A plan is running" — in the corner of the composer, next to the other chips.
 *
 * Renders nothing until a plan actually exists, so a conversation that never
 * invoked one sees no change. Clicking opens the task list on the composer's
 * banner strip (see PlanBanner).
 */
export function PlanIndicatorButton() {
  const todos = usePlanPanelStore((s) => s.todos);
  const isOpen = usePlanPanelStore((s) => s.isOpen);
  const toggle = usePlanPanelStore((s) => s.toggle);

  if (!todos.length) return null;

  const { done, total } = planProgress(todos);
  const active = todos.some((t) => t.status === "in_progress");

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={toggle}
      aria-expanded={isOpen}
      aria-label={`Task plan: ${done} of ${total} done`}
      title={`Task plan — ${done}/${total} done`}
      className={cn(
        "text-foreground hover:bg-accent/60 flex cursor-default items-center gap-1 rounded-full px-2 py-1 outline-none transition-all duration-200",
        isOpen && "bg-accent/60",
      )}
    >
      <ListChecks
        className={cn("size-3.5", active && "text-green-500")}
        aria-hidden
      />
      <span className="text-xs font-semibold tabular-nums select-none">
        {done}/{total}
      </span>
    </button>
  );
}

import React from "react";
import { Plan } from "#/components/tool-ui/plan";
import type { PlanTodo } from "#/components/tool-ui/plan/schema";

/**
 * CloudGuard plan snapshot rendered ALWAYS-VISIBLE in the chat flow.
 *
 * The kernel emits the whole plan as a `[CLOUDGUARD_PLAN]…[/CLOUDGUARD_PLAN]`
 * markdown checklist on every task change. Rendered only via the (collapsed)
 * cell observation it stays buried; this renders the LAST such block of a cell
 * as a standalone message, one per task change, so it scrolls with history.
 *
 * The rendering itself is `@tool-ui/plan` — the same block the rest of the
 * transcript's tool output uses, instead of the hand-rolled rail + checklist
 * this file used to draw.
 */

const PLAN_RE = /\[CLOUDGUARD_PLAN\]\s*([\s\S]*?)\s*\[\/CLOUDGUARD_PLAN\]/g;

/** Extract the LAST plan block's inner markdown from arbitrary text, or "" if none. */
export function extractPlanMarkdown(content: string | undefined): string {
  if (!content) return "";
  let last = "";
  let m: RegExpExecArray | null;
  PLAN_RE.lastIndex = 0;
  // eslint-disable-next-line no-cond-assign
  while ((m = PLAN_RE.exec(content)) !== null) {
    last = m[1].trim();
  }
  return last;
}

/** Parse `- [x] subject` / `- [ ] subject _(in progress)_` lines into plan todos. */
export function parsePlanTodos(md: string): PlanTodo[] {
  const items: PlanTodo[] = [];
  md.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    const match = line.match(/^-\s*\[([ xX~])\]\s*(.*)$/);
    if (!match) return;
    const mark = match[1].toLowerCase();
    let label = match[2].trim();
    let status: PlanTodo["status"] = mark === "x" ? "completed" : "pending";
    // Both spellings occur: `[~]` from the task-tracking observation, and the
    // `_(in progress)_` suffix from the kernel's markdown snapshot.
    if (mark === "~" || /_\(in progress\)_/.test(label)) {
      status = "in_progress";
      label = label.replace(/_\(in progress\)_/g, "").trim();
    }
    if (!label) return;
    items.push({ id: String(i + 1), label, status });
  });
  return items;
}

/** How many steps show before the block folds the rest behind its own expander. */
const MAX_VISIBLE_TODOS = 5;

export function PlanSnapshotMessage({
  planMarkdown,
}: {
  planMarkdown: string;
}) {
  const todos = parsePlanTodos(planMarkdown);
  if (!todos.length) return null;

  return (
    <div className="cg-tool-card w-full">
      <Plan
        id="plan-snapshot"
        title="Task plan"
        todos={todos}
        maxVisibleTodos={MAX_VISIBLE_TODOS}
      />
    </div>
  );
}

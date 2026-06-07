/* eslint-disable i18next/no-literal-string */
import React from "react";
import { ListChecks } from "lucide-react";
import { TaskListSection } from "./task-tracking/task-list-section";

/**
 * CloudGuard plan snapshot rendered ALWAYS-VISIBLE in the chat flow.
 *
 * The kernel emits the whole plan as a `[CLOUDGUARD_PLAN]…[/CLOUDGUARD_PLAN]` markdown
 * checklist on every task change. Rendered only via the (collapsed) cell-observation it
 * stays buried; this renders the LAST such block of a cell as a standalone gray
 * checklist message (one per task change → persistent, scrolls with history).
 */

interface PlanItem {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
}

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

/** Parse `- [x] subject` / `- [ ] subject _(in progress)_` lines into task items. */
function parsePlan(md: string): PlanItem[] {
  const items: PlanItem[] = [];
  md.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    const match = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
    if (!match) return;
    const checked = match[1].toLowerCase() === "x";
    let title = match[2].trim();
    let status: PlanItem["status"] = checked ? "done" : "todo";
    if (!checked && /_\(in progress\)_/.test(title)) {
      status = "in_progress";
      title = title.replace(/_\(in progress\)_/g, "").trim();
    }
    items.push({ id: String(i + 1), title, status });
  });
  return items;
}

export function PlanSnapshotMessage({
  planMarkdown,
}: {
  planMarkdown: string;
}) {
  const items = parsePlan(planMarkdown);
  if (!items.length) return null;
  const done = items.filter((i) => i.status === "done").length;

  return (
    <div className="flex w-full">
      <div className="w-[20px] flex flex-col items-center shrink-0" aria-hidden>
        <div
          className="w-px flex-1"
          style={{ background: "var(--cg-border)" }}
        />
        <ListChecks
          size={16}
          className="shrink-0 my-[3px]"
          style={{ color: "var(--cg-text-muted)" }}
        />
        <div
          className="w-px flex-1"
          style={{ background: "var(--cg-border)" }}
        />
      </div>
      <div className="min-w-0 pl-2 py-1.5 flex-1">
        <div className="text-sm mb-1" style={{ color: "var(--cg-text-nav)" }}>
          Task plan · {done}/{items.length} done
        </div>
        <TaskListSection taskList={items} />
      </div>
    </div>
  );
}

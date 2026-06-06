/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useParams } from "react-router";
import { ListChecks } from "lucide-react";
import { openHands } from "#/api/open-hands-axios";
import { TaskListSection } from "./task-tracking/task-list-section";

/** A Plane T task (cloudguard.tasks). status is pending|in_progress|completed. */
interface PlaneTask {
  id: string;
  subject?: string;
  status?: "pending" | "in_progress" | "completed";
  notes?: string;
}

const POLL_MS = 3000;

// Plane T status -> the gray task-item render states.
function mapStatus(s?: string): "todo" | "in_progress" | "done" {
  if (s === "completed") return "done";
  if (s === "in_progress") return "in_progress";
  return "todo";
}

/** CloudGuard's single task surface: the durable, conversation-scoped Plane T plan,
 *  always visible (no dropdown), rendered with the neutral gray checkbox UI. */
export function TaskPlanPanel() {
  const { conversationId } = useParams();
  const [tasks, setTasks] = React.useState<PlaneTask[]>([]);

  React.useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { data } = await openHands.get("/api/cloudguard/tasks", {
          params: { conversation_id: conversationId },
        });
        if (alive) setTasks(data?.tasks ?? []);
      } catch {
        /* endpoint absent / not configured — panel stays hidden */
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [conversationId]);

  if (!tasks.length) return null;

  const items = tasks.map((t) => ({
    id: t.id,
    title: t.subject || "Untitled task",
    status: mapStatus(t.status),
    notes: t.notes,
  }));
  const done = items.filter((i) => i.status === "done").length;

  // Render as a message in the conversation flow (timeline rail like the agent's
  // other messages), NOT a chrome card pinned to the input box.
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

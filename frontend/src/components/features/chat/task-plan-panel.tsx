/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useParams } from "react-router";
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

  return (
    <div
      className="flex flex-col gap-1 px-3 py-2 rounded-md border"
      style={{
        borderColor: "var(--cg-border)",
        background: "var(--cg-input-bg)",
      }}
    >
      <span className="text-xs" style={{ color: "var(--cg-text-muted)" }}>
        Plan · {done}/{items.length} done
      </span>
      <TaskListSection taskList={items} />
    </div>
  );
}

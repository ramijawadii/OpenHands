import React from "react";
import { useParams } from "react-router";
import { openHands } from "#/api/open-hands-axios";
import { Plan } from "#/components/tool-ui/plan";
import type { PlanTodo } from "#/components/tool-ui/plan/schema";
import { usePlanPanelStore } from "#/state/plan-panel-store";

/** A Plane T task (cloudguard.tasks). */
interface PlaneTask {
  id: string;
  subject?: string;
  status?: "pending" | "in_progress" | "completed";
  notes?: string;
}

const POLL_MS = 3000;

const toTodo = (t: PlaneTask): PlanTodo => ({
  id: t.id,
  label: t.subject || "Untitled task",
  status:
    t.status === "completed" || t.status === "in_progress"
      ? t.status
      : "pending",
  description: t.notes || undefined,
});

/**
 * Keeps the shared plan store fed from the durable, conversation-scoped Plane T
 * plan. Mounted once by the conversation; the composer's indicator and this
 * banner both read the result.
 */
export function usePlanPolling() {
  const { conversationId } = useParams();
  const setTodos = usePlanPanelStore((s) => s.setTodos);

  React.useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { data } = await openHands.get("/api/cloudguard/tasks", {
          params: { conversation_id: conversationId },
        });
        if (alive) setTodos((data?.tasks ?? []).map(toTodo));
      } catch {
        /* endpoint absent / not configured — the indicator simply stays hidden */
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [conversationId, setTodos]);
}

/** How many steps show before the block folds the rest behind its own expander. */
const MAX_VISIBLE_TODOS = 5;

/**
 * The plan, opened from the composer's indicator, rendered on the composer's
 * banner strip — the same place every other mid-turn interruption appears.
 */
export function PlanBanner() {
  const todos = usePlanPanelStore((s) => s.todos);
  const isOpen = usePlanPanelStore((s) => s.isOpen);

  if (!isOpen || !todos.length) return null;

  return (
    <div className="cg-tool-card w-full">
      <Plan
        id="plan-banner"
        title="Task plan"
        todos={todos}
        maxVisibleTodos={MAX_VISIBLE_TODOS}
      />
    </div>
  );
}

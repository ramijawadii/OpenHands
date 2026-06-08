/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useParams } from "react-router";
import { openHands } from "#/api/open-hands-axios";
import { useWsClient } from "#/context/ws-client-provider";
import { useAgentStore } from "#/stores/agent-store";
import { AgentState } from "#/types/agent-state";
import { createChatMessage } from "#/services/chat-service";

const POLL_MS = 2500;

// Agent has paused (turn ended) — safe to ask the user how to proceed.
const WAITING_STATES = new Set<AgentState>([
  AgentState.FINISHED,
  AgentState.AWAITING_USER_INPUT,
  AgentState.STOPPED,
  AgentState.AWAITING_USER_CONFIRMATION,
]);

/** After the agent finishes a plan in Plan mode, ask the user how to implement it:
 *  run autonomously, ask before each step, or request changes. Reuses the Plane T
 *  plan (tasks route) + the conversation mode store. */
export function PlanApprovalBanner() {
  const { conversationId } = useParams();
  const { send } = useWsClient();
  const { curAgentState } = useAgentStore();
  const [mode, setMode] = React.useState<string>("autonomous");
  const [planStatus, setPlanStatus] = React.useState<string>("none");
  const [taskCount, setTaskCount] = React.useState(0);
  const [revise, setRevise] = React.useState(false);
  const [reviseText, setReviseText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const [m, t] = await Promise.all([
          openHands.get("/api/cloudguard/mode", {
            params: { conversation_id: conversationId },
          }),
          openHands.get("/api/cloudguard/tasks", {
            params: { conversation_id: conversationId },
          }),
        ]);
        if (!alive) return;
        setMode(m.data?.mode ?? "autonomous");
        setPlanStatus(m.data?.plan_status ?? "none");
        setTaskCount((t.data?.tasks ?? []).length);
      } catch {
        /* endpoints absent — banner hidden */
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [conversationId]);

  const agentWaiting = WAITING_STATES.has(curAgentState);
  // Only show once the agent has explicitly marked the plan READY (plan_status
  // is set to "ready" when the agent finishes planning). A bare "not decided"
  // check replayed the banner whenever you switched into plan mode with stale
  // tasks present, even if no fresh plan was produced this turn.
  const visible =
    mode === "plan" && planStatus === "ready" && taskCount > 0 && agentWaiting;
  if (!visible) return null;

  const decide = async (
    decision: "auto" | "ask" | "changes",
    message: string,
  ) => {
    setBusy(true);
    try {
      await openHands.post("/api/cloudguard/plan/decision", {
        conversation_id: conversationId,
        decision,
      });
      send(createChatMessage(message, [], [], new Date().toISOString()));
      setRevise(false);
      setReviseText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 px-3 py-2 text-xs text-neutral-300 border border-neutral-700 bg-neutral-800/60 rounded-md">
      <span>
        Plan ready ({taskCount} {taskCount === 1 ? "task" : "tasks"}). How
        should I implement it?
      </span>

      {!revise ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded bg-neutral-200 px-2 py-1 font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
            onClick={() =>
              decide(
                "auto",
                "Approved the plan — proceed autonomously and keep the task statuses updated as you go.",
              )
            }
          >
            Run autonomously
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded bg-neutral-700 px-2 py-1 text-neutral-100 hover:bg-neutral-600 disabled:opacity-50"
            onClick={() =>
              decide(
                "ask",
                "Approved the plan — execute it, but ask me before each consequential action.",
              )
            }
          >
            Ask before each step
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-700/50 disabled:opacity-50"
            onClick={() => setRevise(true)}
          >
            Request changes…
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <textarea
            className="rounded bg-neutral-900/70 p-2 text-neutral-200"
            rows={2}
            placeholder="What should change about the plan?"
            value={reviseText}
            onChange={(e) => setReviseText(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !reviseText.trim()}
              className="rounded bg-neutral-200 px-2 py-1 font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
              onClick={() =>
                decide(
                  "changes",
                  `Please revise the plan: ${reviseText.trim()}`,
                )
              }
            >
              Send changes
            </button>
            <button
              type="button"
              className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-700/50"
              onClick={() => setRevise(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useParams } from "react-router";
import { openHands } from "#/api/open-hands-axios";

/** A staged consequential edit awaiting human approval. The facts (path/summary/
 *  diff) come from the server (the staged record), NOT from agent prose. */
interface ApprovalRecord {
  id: string;
  context?: { path?: string; summary?: string; diff?: string; class?: string };
}

const POLL_MS = 3000;

export function ApprovalBanner() {
  const { conversationId } = useParams();
  const [pending, setPending] = React.useState<ApprovalRecord[]>([]);
  const [showDiff, setShowDiff] = React.useState(false);
  const [other, setOther] = React.useState(false);
  const [otherText, setOtherText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { data } = await openHands.get("/api/cloudguard/approvals", {
          // Scope to THIS conversation so another session's staged diff is never
          // shown here (and cannot be approved from the wrong banner).
          params: { status: "pending", conversation_id: conversationId },
        });
        if (alive) setPending(data?.approvals ?? []);
      } catch {
        /* endpoint absent / not configured — banner simply stays hidden */
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [conversationId]);

  const current = pending[0];
  if (!current) return null;

  const ctx = current.context ?? {};
  const decide = async (approved: boolean, reason = "") => {
    setBusy(true);
    try {
      await openHands.post(`/api/cloudguard/approvals/${current.id}/decision`, {
        approved,
        reviewer: "user",
        reason,
      });
      setPending((p) => p.filter((r) => r.id !== current.id));
      setShowDiff(false);
      setOther(false);
      setOtherText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 px-3 py-2 text-xs text-neutral-300 border border-neutral-700 bg-neutral-800/60 rounded-md">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span aria-hidden className="text-neutral-500">
            ✎
          </span>
          <span>
            Approve write to{" "}
            <b className="text-neutral-100">{ctx.path ?? "a file"}</b>
            {ctx.summary ? ` (${ctx.summary})` : ""}?
          </span>
        </span>
        <button
          type="button"
          className="underline text-neutral-400 hover:text-neutral-200"
          onClick={() => setShowDiff((s) => !s)}
        >
          {showDiff ? "Hide" : "View more"}
        </button>
      </div>

      {showDiff && (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-neutral-900/70 p-2 text-[11px] text-neutral-300">
          {ctx.diff || "(no diff available)"}
        </pre>
      )}

      {!other ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded bg-neutral-200 px-2 py-1 font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
            onClick={() => decide(true)}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded bg-neutral-700 px-2 py-1 text-neutral-100 hover:bg-neutral-600 disabled:opacity-50"
            onClick={() => decide(false)}
          >
            Reject
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-700/50 disabled:opacity-50"
            onClick={() => setOther(true)}
          >
            Other…
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <textarea
            className="rounded bg-neutral-900/70 p-2 text-neutral-200"
            rows={2}
            placeholder="Tell the agent what to do instead…"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !otherText.trim()}
              className="rounded bg-neutral-200 px-2 py-1 font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
              onClick={() => decide(false, otherText.trim())}
            >
              Send instruction
            </button>
            <button
              type="button"
              className="rounded border border-neutral-600 px-2 py-1 text-neutral-300 hover:bg-neutral-700/50"
              onClick={() => setOther(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

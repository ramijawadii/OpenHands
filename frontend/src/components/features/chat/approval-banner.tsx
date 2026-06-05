/* eslint-disable i18next/no-literal-string */
import React from "react";
import { openHands } from "#/api/open-hands-axios";

/** A staged consequential edit awaiting human approval. The facts (path/summary/
 *  diff) come from the server (the staged record), NOT from agent prose. */
interface ApprovalRecord {
  id: string;
  context?: { path?: string; summary?: string; diff?: string; class?: string };
}

const POLL_MS = 3000;

export function ApprovalBanner() {
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
          params: { status: "pending" },
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
  }, []);

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
    <div className="flex flex-col gap-2 px-3 py-2 text-xs text-amber-200 border border-amber-700/60 bg-amber-900/20 rounded-md">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span aria-hidden>✎</span>
          <span>
            Approve write to <b>{ctx.path ?? "a file"}</b>
            {ctx.summary ? ` (${ctx.summary})` : ""}?
          </span>
        </span>
        <button
          type="button"
          className="underline opacity-80 hover:opacity-100"
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
            className="rounded bg-emerald-700/80 px-2 py-1 hover:bg-emerald-600 disabled:opacity-50"
            onClick={() => decide(true)}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded bg-neutral-700/80 px-2 py-1 hover:bg-neutral-600 disabled:opacity-50"
            onClick={() => decide(false)}
          >
            Reject
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded border border-neutral-600 px-2 py-1 hover:bg-neutral-700/50 disabled:opacity-50"
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
              className="rounded bg-amber-700/80 px-2 py-1 hover:bg-amber-600 disabled:opacity-50"
              onClick={() => decide(false, otherText.trim())}
            >
              Send instruction
            </button>
            <button
              type="button"
              className="rounded border border-neutral-600 px-2 py-1 hover:bg-neutral-700/50"
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

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

/** Render a unified diff with red (removed) / green (added) line highlighting. */
function DiffView({ diff }: { diff?: string }) {
  if (!diff) {
    return (
      <pre className="border-border text-muted-foreground rounded-md border bg-transparent p-2 text-[11px]">
        (no diff available)
      </pre>
    );
  }
  const lineClass = (l: string): string => {
    if (l.startsWith("+++") || l.startsWith("---"))
      return "text-muted-foreground";
    if (l.startsWith("@@")) return "text-cyan-300/80";
    if (l.startsWith("+")) return "bg-green-900/30 text-green-200";
    if (l.startsWith("-")) return "bg-red-900/30 text-red-200";
    return "text-foreground";
  };
  return (
    <pre className="border-border max-h-64 overflow-auto rounded-md border bg-transparent p-2 text-[11px] leading-snug whitespace-pre-wrap">
      {diff.split("\n").map((l, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className={lineClass(l)}>
          {l || " "}
        </div>
      ))}
    </pre>
  );
}

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
    <div className="cg-tool-card border-border bg-card flex w-full flex-col gap-2.5 rounded-lg border px-3 py-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span aria-hidden className="text-muted-foreground">
            ✎
          </span>
          <span>
            Approve write to{" "}
            <b className="text-foreground">{ctx.path ?? "a file"}</b>
            {ctx.summary ? ` (${ctx.summary})` : ""}?
          </span>
        </span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground shrink-0 underline transition-colors"
          onClick={() => setShowDiff((s) => !s)}
        >
          {showDiff ? "Hide" : "View more"}
        </button>
      </div>

      {showDiff && <DiffView diff={ctx.diff} />}

      {!other ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            className="bg-foreground text-background rounded-full px-3 py-1 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            onClick={() => decide(true)}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            className="border-border text-foreground hover:bg-muted/60 rounded-full border px-3 py-1 transition-colors disabled:opacity-50"
            onClick={() => decide(false)}
          >
            Reject
          </button>
          <button
            type="button"
            disabled={busy}
            className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1 transition-colors disabled:opacity-50"
            onClick={() => setOther(true)}
          >
            Other…
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <textarea
            className="border-border text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/40 w-full rounded-md border bg-transparent px-2 py-1 outline-none"
            rows={2}
            placeholder="Tell the agent what to do instead…"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !otherText.trim()}
              className="bg-foreground text-background rounded-full px-3 py-1 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              onClick={() => decide(false, otherText.trim())}
            >
              Send instruction
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1 transition-colors"
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

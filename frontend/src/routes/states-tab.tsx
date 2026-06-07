/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useParams } from "react-router";
import { Undo2, GitCommitVertical, Check } from "lucide-react";
import { openHands } from "#/api/open-hands-axios";
import { useWsClient } from "#/context/ws-client-provider";
import { createChatMessage } from "#/services/chat-service";

/**
 * States — the file-history rewind timeline ("flashpoints"). Each checkpoint is a
 * restorable state of the workspace. Reverse rolls the workspace back to that flashpoint
 * (restores edited files, removes files created since). The CURRENT state is marked and
 * its Reverse is disabled — you cannot double-rollback to the state you are already in.
 *
 * Backups + the actual restore live in the sandbox; Reverse dispatches the agent to run
 * the hardened, path-confined file_rewind() — the app never touches sandbox files.
 */

interface Flashpoint {
  snapshot_id: string;
  label?: string;
  timestamp?: string;
  file_count?: number;
  files?: string[];
  is_current?: boolean;
}

const POLL_MS = 4000;

function fmt(ts?: string): string {
  if (!ts) return "";
  try {
    return new Date(`${ts}Z`).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function StatesTab() {
  const { conversationId } = useParams();
  const { send } = useWsClient();
  const [points, setPoints] = React.useState<Flashpoint[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { data } = await openHands.get("/api/cloudguard/file-history", {
          params: { conversation_id: conversationId },
        });
        if (alive) setPoints(data?.checkpoints ?? []);
      } catch {
        /* endpoint absent */
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [conversationId]);

  const reverse = (fp: Flashpoint) => {
    if (fp.is_current) return;
    const label = fp.label ? ` ("${fp.label}")` : "";
    // eslint-disable-next-line no-alert
    const ok = window.confirm(
      `Reverse the workspace to flashpoint ${fp.snapshot_id}${label}? This restores files edited since then and removes files created since.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      send(
        createChatMessage(
          `Reverse the workspace to flashpoint ${fp.snapshot_id}${label} by running ` +
            `file_rewind("${fp.snapshot_id}") in an execute_ipython_cell, then report exactly ` +
            `which files were restored and which were removed.`,
          [],
          [],
          new Date().toISOString(),
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  // Newest flashpoint at the top.
  const ordered = points.slice().reverse();

  if (!ordered.length) {
    return (
      <div
        className="h-full flex items-center justify-center text-sm"
        style={{ color: "var(--cg-text-muted)" }}
      >
        No flashpoints yet — the agent creates one with a checkpoint before
        remediating.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar-always px-4 py-4">
      <div className="mb-4">
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--cg-text-primary)" }}
        >
          Workspace states
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--cg-text-muted)" }}>
          Restore points (flashpoints). Reverse rolls the workspace back to a
          state.
        </p>
      </div>

      <div className="flex flex-col">
        {ordered.map((fp, i) => {
          const isLast = i === ordered.length - 1;
          return (
            <div key={fp.snapshot_id} className="flex gap-3">
              {/* rail: dot + connecting line */}
              <div className="flex flex-col items-center w-5 shrink-0">
                <span
                  className="flex size-5 items-center justify-center rounded-full"
                  style={{
                    background: fp.is_current
                      ? "var(--cg-text-nav)"
                      : "var(--cg-bg-badge)",
                    color: fp.is_current
                      ? "var(--cg-bg-primary)"
                      : "var(--cg-text-muted)",
                  }}
                >
                  {fp.is_current ? (
                    <Check size={12} />
                  ) : (
                    <GitCommitVertical size={14} />
                  )}
                </span>
                {!isLast && (
                  <span
                    className="w-px flex-1 my-1"
                    style={{ background: "var(--cg-border)" }}
                  />
                )}
              </div>

              {/* content */}
              <div className="flex-1 pb-5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="rounded px-1.5 py-0.5 text-[11px] font-medium shrink-0"
                      style={{
                        background: "var(--cg-bg-badge)",
                        color: "var(--cg-text-nav)",
                      }}
                    >
                      #{fp.snapshot_id}
                    </span>
                    {fp.is_current && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                        style={{
                          background: "var(--cg-bg-active)",
                          color: "var(--cg-text-primary)",
                        }}
                      >
                        current
                      </span>
                    )}
                    <span
                      className="text-xs"
                      style={{ color: "var(--cg-text-muted)" }}
                    >
                      {fmt(fp.timestamp)}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={busy || fp.is_current}
                    title={
                      fp.is_current
                        ? "Already at this state"
                        : "Reverse to this state"
                    }
                    className="flex items-center gap-1 rounded border px-2 py-0.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      borderColor: "var(--cg-border)",
                      color: "var(--cg-text-nav)",
                    }}
                    onClick={() => reverse(fp)}
                  >
                    <Undo2 size={12} />
                    Reverse
                  </button>
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "var(--cg-text-nav)" }}
                >
                  {fp.label || "Checkpoint"}
                </div>
                <div
                  className="text-[11px] mt-0.5"
                  style={{ color: "var(--cg-text-muted)" }}
                >
                  {fp.file_count ?? 0} file
                  {(fp.file_count ?? 0) === 1 ? "" : "s"} tracked
                  {fp.files && fp.files.length > 0
                    ? ` · ${fp.files.map((f) => f.split("/").pop()).join(", ")}`
                    : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StatesTab;

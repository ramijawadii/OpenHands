/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useParams } from "react-router";
import { History, Undo2 } from "lucide-react";
import { openHands } from "#/api/open-hands-axios";
import { useWsClient } from "#/context/ws-client-provider";
import { createChatMessage } from "#/services/chat-service";

/**
 * File-history rewind panel. Lists the checkpoints the sandbox kernel mirrors to the
 * shared volume (GET /api/cloudguard/file-history) and lets the user roll the workspace
 * back. The backups + the actual restore live in the sandbox, so "Rewind" dispatches the
 * agent to run the hardened, path-confined file_rewind() kernel function — the app never
 * touches sandbox files directly. Only shows when checkpoints exist.
 */

interface Checkpoint {
  snapshot_id: string;
  label?: string;
  timestamp?: string;
  file_count?: number;
  files?: string[];
}

const POLL_MS = 4000;

export function FileHistoryPanel() {
  const { conversationId } = useParams();
  const { send } = useWsClient();
  const [checkpoints, setCheckpoints] = React.useState<Checkpoint[]>([]);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { data } = await openHands.get("/api/cloudguard/file-history", {
          params: { conversation_id: conversationId },
        });
        if (alive) setCheckpoints(data?.checkpoints ?? []);
      } catch {
        /* endpoint absent — panel stays hidden */
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [conversationId]);

  if (!checkpoints.length) return null;

  const rewind = (cp: Checkpoint) => {
    const label = cp.label ? ` ("${cp.label}")` : "";
    const ok =
      // eslint-disable-next-line no-alert
      window.confirm(
        `Roll the workspace back to checkpoint ${cp.snapshot_id}${label}? This restores files edited since then and removes files created since.`,
      );
    if (!ok) {
      return;
    }
    setBusy(true);
    try {
      send(
        createChatMessage(
          `Roll the workspace back to checkpoint ${cp.snapshot_id}${label} by running ` +
            `file_rewind("${cp.snapshot_id}") in an execute_ipython_cell, then report exactly ` +
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

  return (
    <div
      className="flex flex-col gap-1 px-3 py-2 rounded-md border text-xs"
      style={{
        borderColor: "var(--cg-border)",
        background: "var(--cg-input-bg)",
      }}
    >
      <button
        type="button"
        className="flex items-center gap-2 text-left"
        style={{ color: "var(--cg-text-nav)" }}
        onClick={() => setOpen((v) => !v)}
      >
        <History size={14} style={{ color: "var(--cg-text-muted)" }} />
        <span>Rewind points · {checkpoints.length}</span>
        <span style={{ color: "var(--cg-text-muted)" }}>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-1 mt-1">
          {checkpoints
            .slice()
            .reverse()
            .map((cp) => (
              <div
                key={cp.snapshot_id}
                className="flex items-center justify-between gap-2 py-0.5"
              >
                <span
                  className="min-w-0 truncate"
                  style={{ color: "var(--cg-text-nav)" }}
                >
                  <b className="text-neutral-100">#{cp.snapshot_id}</b>{" "}
                  {cp.label || "(checkpoint)"}{" "}
                  <span style={{ color: "var(--cg-text-muted)" }}>
                    · {cp.file_count ?? 0} file
                    {(cp.file_count ?? 0) === 1 ? "" : "s"}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className="flex items-center gap-1 rounded border px-2 py-0.5 disabled:opacity-50"
                  style={{
                    borderColor: "var(--cg-border)",
                    color: "var(--cg-text-nav)",
                  }}
                  onClick={() => rewind(cp)}
                >
                  <Undo2 size={12} />
                  Rewind
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

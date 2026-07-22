import { ActionMessage, ObservationMessage } from "#/types/message";
import {
  useLogStore,
  effectOf,
  titleOf,
  LogKind,
  LogStatus,
} from "#/state/log-store";
import { parseTs } from "#/state/command-store";

/** Feeds the Logs tab from the same WS stream the chat uses. Entries are keyed by
 *  the backend event id and completed via `cause`, so ordering and pairing come
 *  from the server rather than from arrival order in the browser. */

const ACTION_KIND: Record<string, LogKind> = {
  run: "bash",
  run_ipython: "python",
  read: "read",
  write: "edit",
  edit: "edit",
  browse: "browse",
  browse_interactive: "browse",
  mcp: "mcp",
  call_tool_mcp: "mcp",
};

/** Same signal the notebook store uses to decide a cell errored. */
const isErrorContent = (content: string): boolean =>
  /^(Traceback|Error:|Exception:|\[ERROR\])/m.test((content ?? "").trimStart());

export function recordAction(message: ActionMessage): void {
  const kind = ACTION_KIND[message.action];
  if (!kind) return; // only executions are audited, not chatter

  const args = (message.args ?? {}) as Record<string, string>;
  const raw =
    args.command ?? args.code ?? args.path ?? args.url ?? message.message ?? "";

  useLogStore.getState().push({
    id: message.id,
    ts: parseTs(message.timestamp) ?? Date.now(),
    kind,
    title: titleOf(raw) || message.action,
    status: "running",
    effect: effectOf(kind),
    source: message.source,
  });
}

export function recordObservation(message: ObservationMessage): void {
  if (typeof message.cause !== "number") return;

  const exitCode =
    (message.extras?.metadata as { exit_code?: number | null } | undefined)
      ?.exit_code ?? null;

  let status: LogStatus;
  if (message.observation === "error") {
    status = "failed";
  } else if (exitCode != null) {
    // real process exit code — authoritative
    status = exitCode === 0 ? "ok" : "failed";
  } else if (message.observation === "run") {
    // a shell command that reported no exit code: say so, never assume success
    status = "unknown";
  } else if (message.observation === "run_ipython") {
    status = isErrorContent(message.content) ? "failed" : "ok";
  } else {
    status = "ok";
  }

  useLogStore.getState().complete(message.cause, {
    status,
    exitCode,
    // observation time — the store turns this into a duration, it does not
    // overwrite the entry's start timestamp.
    ts: parseTs(message.timestamp) ?? Date.now(),
    detail: (message.content ?? "").slice(0, 2000),
  });
}

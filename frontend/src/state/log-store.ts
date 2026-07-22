import { create } from "zustand";

/** Audit log for the Logs tab: one entry per agent execution, in arrival order.
 *
 *  Identity is the BACKEND event id (never a client-minted hash), so a reconnect
 *  that replays history updates entries in place instead of duplicating them.
 *  Observations are matched to their action through `cause`, which is
 *  authoritative — we never pair by "the last thing in the array".
 */

/** Does this execution mutate state? DECLARED, never inferred from the command
 *  text: `aws ec2 describe-*` can be chained into a delete. Anything we cannot
 *  positively classify as read-only is `unknown` and must be treated as a write
 *  by any consumer that gates on it (fail-closed). */
export type LogEffect = "read" | "write" | "unknown";

export type LogStatus = "running" | "ok" | "failed" | "unknown";

export type LogKind =
  | "bash"
  | "python"
  | "edit"
  | "read"
  | "browse"
  | "mcp"
  | "error"
  | "agent";

/** Was the action permitted, and by what? */
export type LogVerdict =
  | "allowed"
  | "approved"
  | "denied"
  | "blocked"
  | "redacted"
  | "n/a";

/** Can this be undone, and how. Declared — never inferred from command text. */
export type LogReversibility =
  | "reversible"
  | "recreate-only"
  | "irreversible"
  | "n/a";

/** WHERE it landed. The join key to the graph / blast-radius model, and what
 *  makes the log answerable by account rather than by grep. */
export type ResourceCoordinate = {
  provider?: "aws" | "azure" | "gcp" | "k8s" | "local";
  accountId?: string;
  region?: string;
  resourceType?: string;
  resourceId?: string;
};

/** WHO decided. `model` matters forensically: after a bad remediation the first
 *  question is which model made the call. */
export type Actor = {
  principal?: string;
  kind?: "human" | "agent" | "system";
  model?: string;
  agentVersion?: string;
  onBehalfOf?: string;
};

export type LogEntry = {
  /** backend event id — the dedupe key */
  id: number;
  /** for observations: the action id this completes */
  cause?: number;
  ts: number;
  kind: LogKind;
  title: string;
  detail?: string;

  // ── correlation ────────────────────────────────────────────────────────
  tenantId?: string;
  conversationId?: string;
  assessmentId?: string;

  // ── actor / target ─────────────────────────────────────────────────────
  actor?: Actor;
  target?: ResourceCoordinate;

  // ── decision ───────────────────────────────────────────────────────────
  effect: LogEffect;
  verdict?: LogVerdict;
  skillId?: string;
  executionMode?: string;
  approver?: string;
  policyRuleId?: string;
  /** as computed AT DECISION TIME — we record what the approver saw */
  blastRadius?: number;

  // ── outcome ────────────────────────────────────────────────────────────
  status: LogStatus;
  exitCode?: number | null;
  durationMs?: number;
  resourcesAffected?: number;
  /** typed class, never raw stderr */
  errorClass?: string;
  reversibility?: LogReversibility;
  snapshotId?: string;

  source?: "agent" | "user" | "environment";
};

/** Hard cap. A chatty session must not grow the tab without bound; we keep the
 *  most recent window and flag that older entries were evicted. */
export const MAX_ENTRIES = 500;

/** Effect class per event type. `run`/`run_ipython` are deliberately `unknown`:
 *  the effect of an arbitrary shell command is only knowable from the dispatch
 *  layer (skill catalog), not from this side of the wire. */
const EFFECT_BY_KIND: Record<LogKind, LogEffect> = {
  bash: "unknown",
  python: "unknown",
  edit: "write",
  read: "read",
  browse: "read",
  mcp: "unknown",
  error: "read",
  agent: "read",
};

export const effectOf = (kind: LogKind): LogEffect =>
  EFFECT_BY_KIND[kind] ?? "unknown";

/** One-line title from a command/code blob. */
export const titleOf = (text: string, max = 80): string => {
  const first = (text ?? "").trim().split("\n")[0] ?? "";
  return first.length > max ? `${first.slice(0, max)}…` : first;
};

interface LogState {
  entries: LogEntry[];
  /** true once the ring buffer has dropped at least one entry */
  truncated: boolean;
  /** Insert, or update in place when the id was already seen (reconnect replay). */
  push: (entry: LogEntry) => void;
  /** Complete the entry whose id === cause. No-op if it was already evicted. */
  complete: (
    cause: number,
    patch: Partial<Pick<LogEntry, "status" | "exitCode" | "detail" | "ts">>,
  ) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  entries: [],
  truncated: false,

  push: (entry: LogEntry) =>
    set((state) => {
      const existing = state.entries.findIndex((e) => e.id === entry.id);
      if (existing !== -1) {
        // replayed on reconnect — keep the richer, already-completed record
        const entries = [...state.entries];
        entries[existing] = { ...entry, ...state.entries[existing] };
        return { entries };
      }
      const entries = [...state.entries, entry];
      if (entries.length <= MAX_ENTRIES) return { entries };
      return {
        entries: entries.slice(entries.length - MAX_ENTRIES),
        truncated: true,
      };
    }),

  complete: (cause: number, patch) =>
    set((state) => {
      const idx = state.entries.findIndex((e) => e.id === cause);
      if (idx === -1) return state; // evicted or never seen — drop silently
      const entries = [...state.entries];
      const prev = entries[idx];
      // duration from the action's start to this completion; `ts` on the patch is
      // the observation time, so the entry keeps its original start.
      const durationMs =
        patch.ts != null && patch.ts >= prev.ts ? patch.ts - prev.ts : undefined;
      entries[idx] = {
        ...prev,
        ...patch,
        ts: prev.ts,
        durationMs: durationMs ?? prev.durationMs,
      };
      return { entries };
    }),

  clearLogs: () => set({ entries: [], truncated: false }),
}));

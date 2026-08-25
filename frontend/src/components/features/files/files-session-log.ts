/**
 * What YOU did in this surface, this session.
 *
 * WHY THIS IS NOT THE AUDIT LEDGER
 * ────────────────────────────────
 * The Audit log tab reads `/api/cloudguard/audit/ledger` — a tamper-evident,
 * hash-chained record of operations the SERVER performed. Navigation, search and
 * view changes never appear there, and that is deliberate on the server side:
 * `VFS.list_dir` documents that a listing is "one act of looking", and writing an
 * audit entry per browsed folder would bury the writes that matter under
 * navigation noise. Chain length is also the integrity claim — padding it with
 * UI events weakens the thing the chain exists to prove.
 *
 * But "what did I just do" is still a real question, so it gets its own record:
 * in memory, session-scoped, and clearly labelled as NOT part of the chain. The
 * two must never be merged into one list — a reader has to be able to tell an
 * auditable fact from a UI breadcrumb at a glance.
 */

export type SessionEventKind =
  | "navigate"
  | "search"
  | "open"
  | "view"
  | "store"
  | "select";

export interface SessionEvent {
  id: number;
  at: number;
  kind: SessionEventKind;
  /** Human-readable, already resolved — the log must not need the app to render. */
  detail: string;
  /** Which store it happened in, since the same path exists in both. */
  store: string;
}

/** Bounded: this is a breadcrumb trail, not storage. Oldest are dropped. */
const CAP = 300;

let seq = 0;
let events: SessionEvent[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function recordSessionEvent(
  kind: SessionEventKind,
  detail: string,
  store: string,
): void {
  const last = events[0];
  // Collapse identical consecutive entries. Typing in the search box or
  // clicking the same folder twice would otherwise flood the list and push the
  // interesting events off the end.
  if (last && last.kind === kind && last.detail === detail) {
    events = [{ ...last, at: Date.now() }, ...events.slice(1)];
    emit();
    return;
  }
  seq += 1;
  events = [{ id: seq, at: Date.now(), kind, detail, store }, ...events].slice(
    0,
    CAP,
  );
  emit();
}

export function getSessionEvents(): SessionEvent[] {
  return events;
}

export function clearSessionEvents(): void {
  events = [];
  emit();
}

/** Subscribe for `useSyncExternalStore`. */
export function subscribeSessionEvents(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const SESSION_EVENT_LABELS: Record<SessionEventKind, string> = {
  navigate: "Opened folder",
  search: "Searched",
  open: "Opened file",
  view: "Changed view",
  store: "Switched store",
  select: "Selected",
};

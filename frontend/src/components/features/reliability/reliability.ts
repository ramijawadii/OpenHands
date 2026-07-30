/**
 * Frontend reliability plane.
 *
 * The UI is built on the assumption that any surface can fail. That is only
 * true if failures are (a) contained, (b) recoverable, and (c) COUNTED — an
 * uncounted failure is indistinguishable from no failure, so the first two
 * degrade silently over time.
 *
 * This module is the counting half. It is deliberately transport-agnostic:
 * events are buffered in memory, exposed for inspection, and forwarded to a
 * transport ONLY if one is installed via `configureReliabilityTransport`.
 *
 * DO NOT point that transport at `POST /api/cloudguard/monitoring/ingest`.
 * That endpoint exists, but it is the SANDBOX→app bridge:
 *   - it authenticates with a shared `X-CloudGuard-Ingest-Token`. Shipping that
 *     secret to a browser hands every user a key that writes into the tenant's
 *     ledger.
 *   - it appends to `tenant_audit`, the tamper-evident security chain. Browser
 *     UI crash counters are not security-audit records and must not dilute it.
 * A browser sink needs its own principal-authenticated, rate-limited route
 * writing to a separate store. Until that exists, buffered-and-inspectable is
 * the honest option — and is why this file has no fetch in it.
 */

export type ReliabilitySurface =
  | "drawer"
  | "sidebar"
  | "explore"
  | "tab"
  | "websocket"
  | "request";

export type ReliabilityKind =
  | "crash" // a render/runtime error caught by a boundary
  | "recovered" // a boundary reset that then rendered successfully
  | "stall" // a load that exceeded its budget
  | "retry" // an explicit or automatic retry attempt
  | "degraded" // a surface rendered a reduced experience on purpose
  | "reconnect"; // a transport re-established itself

export interface ReliabilityEvent {
  surface: ReliabilitySurface;
  kind: ReliabilityKind;
  /** Free-form discriminator, e.g. the tab name or endpoint. */
  detail?: string;
  message?: string;
  at: number;
}

/** Ring buffer: bounded so a crash loop cannot exhaust memory. */
const MAX_EVENTS = 200;
const events: ReliabilityEvent[] = [];
const counters = new Map<string, number>();
const listeners = new Set<() => void>();

let transport: ((e: ReliabilityEvent) => void) | null = null;

/** Install a sink (HTTP, OTLP, whatever). Errors in it are swallowed — the
 *  reliability plane must never become a source of failure itself. */
export function configureReliabilityTransport(
  fn: ((e: ReliabilityEvent) => void) | null,
): void {
  transport = fn;
}

const key = (e: ReliabilityEvent) =>
  `${e.surface}.${e.kind}${e.detail ? `.${e.detail}` : ""}`;

export function reportReliability(
  surface: ReliabilitySurface,
  kind: ReliabilityKind,
  opts: { detail?: string; message?: string } = {},
): void {
  const event: ReliabilityEvent = { surface, kind, ...opts, at: Date.now() };

  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();
  const k = key(event);
  counters.set(k, (counters.get(k) ?? 0) + 1);

  // Structured so it is greppable in a browser log capture even with no sink.
  // eslint-disable-next-line no-console
  console.warn(`[reliability] ${k}`, opts.message ?? "");

  try {
    transport?.(event);
  } catch {
    /* a broken sink must not break the surface that reported to it */
  }
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore */
    }
  });
}

export function reliabilitySnapshot(): {
  counters: Record<string, number>;
  events: ReliabilityEvent[];
} {
  return {
    counters: Object.fromEntries(counters),
    events: [...events],
  };
}

export function subscribeReliability(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Inspectable from the console during an incident without a debugger attached.
if (typeof window !== "undefined") {
  (
    window as unknown as { __cgReliability?: typeof reliabilitySnapshot }
  ).__cgReliability = reliabilitySnapshot;
}

/**
 * Crash-loop detection, keyed per surface and SHARED ACROSS REMOUNTS.
 *
 * A boundary's own retry budget lives in component state, so it resets every
 * time the boundary unmounts — which a remount-on-crash does. That makes an
 * "auto-recover once" policy silently unlimited over a session: a surface can
 * crash, recover, crash, recover forever, and to the user it just looks slow.
 *
 * This keeps the history outside React so the loop is detectable. Once a surface
 * exceeds the budget inside the window it is declared UNSTABLE: no more silent
 * recovery, show a persistent degraded state and let a human decide.
 */
const CRASH_WINDOW_MS = 60_000;
const CRASH_BUDGET = 3;
const crashLog = new Map<string, number[]>();

export function registerCrash(surfaceKey: string): {
  count: number;
  unstable: boolean;
} {
  const now = Date.now();
  const recent = (crashLog.get(surfaceKey) ?? []).filter(
    (t) => now - t < CRASH_WINDOW_MS,
  );
  recent.push(now);
  crashLog.set(surfaceKey, recent);
  return { count: recent.length, unstable: recent.length > CRASH_BUDGET };
}

export function resetCrashLog(surfaceKey?: string): void {
  if (surfaceKey) crashLog.delete(surfaceKey);
  else crashLog.clear();
}

import { openHands } from "#/api/open-hands-axios";
import {
  configureReliabilityTransport,
  type ReliabilityEvent,
} from "./reliability";

/**
 * Ships reliability events to `POST /api/cloudguard/client-events`.
 *
 * The governing constraint is that telemetry must never amplify the incident it
 * is reporting. A naive sink does the opposite: the app starts failing, every
 * failure fires a request, those requests fail, each failure is itself an event,
 * and the browser turns a partial outage into a self-sustaining request storm.
 *
 * So the rules here are deliberately the opposite of the app's own data paths:
 *   - BATCH on an interval, never per event
 *   - DROP on failure. Never retry: the payload is diagnostic, and a retry queue
 *     under a failing backend is unbounded growth plus amplification
 *   - never report a telemetry failure through the reliability plane, or the
 *     sink feeds itself
 *   - flush with `sendBeacon` on pagehide, because the most valuable event is
 *     usually the last one before the tab went away
 *   - bounded queue: newest events win, because during a storm the recent ones
 *     describe the current state
 */

const ENDPOINT = "/api/cloudguard/client-events";
const FLUSH_INTERVAL_MS = 10_000;
/** Server caps a batch at 50; match it so nothing is silently discarded. */
const MAX_BATCH = 50;
/** Hard queue ceiling — a crash loop must not grow memory without limit. */
const MAX_QUEUE = 200;
/** After this many consecutive failures, stop trying for the session. The sink
 *  is optional; the app is not. */
const MAX_CONSECUTIVE_FAILURES = 3;

let queue: ReliabilityEvent[] = [];
let timer: number | undefined;
let inflight = false;
let consecutiveFailures = 0;
let disabled = false;
let started = false;

/** Distinguishes browser sessions in the store without any identity. */
const sessionId = Math.random().toString(36).slice(2, 10);
const release = import.meta.env.VITE_APP_VERSION ?? "dev";

function payload(events: ReliabilityEvent[]) {
  return {
    events: events.map((e) => ({
      surface: e.surface,
      kind: e.kind,
      detail: e.detail ?? "",
      message: e.message ?? "",
      session: sessionId,
      release,
    })),
  };
}

async function flush(): Promise<void> {
  if (disabled || inflight || queue.length === 0) return;
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(batch.length);
  inflight = true;
  try {
    await openHands.post(ENDPOINT, payload(batch));
    consecutiveFailures = 0;
  } catch {
    // Intentionally silent and intentionally lossy. Reporting this failure
    // through reportReliability would make the sink its own traffic source.
    consecutiveFailures += 1;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) disabled = true;
  } finally {
    inflight = false;
  }
}

/** Last-gasp flush. `sendBeacon` survives page teardown, where fetch/xhr do not. */
function flushOnHide(): void {
  if (disabled || queue.length === 0) return;
  const batch = queue.slice(0, MAX_BATCH);
  queue = [];
  try {
    const body = new Blob([JSON.stringify(payload(batch))], {
      type: "application/json",
    });
    // Same-origin, so the session cookie rides along and the route still sees a
    // real principal. If beacon is unavailable the events are simply lost —
    // acceptable for diagnostics, and better than blocking unload.
    navigator.sendBeacon?.(ENDPOINT, body);
  } catch {
    /* never delay teardown for telemetry */
  }
}

export function startTelemetry(): () => void {
  if (started || typeof window === "undefined") return () => {};
  started = true;

  configureReliabilityTransport((event) => {
    if (disabled) return;
    queue.push(event);
    // Newest-wins: during a storm the recent events describe the current state,
    // and the oldest are the least useful thing to keep.
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  });

  timer = window.setInterval(() => {
    flush().catch(() => {
      /* flush already swallows; this guards the timer callback itself */
    });
  }, FLUSH_INTERVAL_MS);

  window.addEventListener("pagehide", flushOnHide);
  // Safari historically does not fire pagehide reliably on tab close.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushOnHide();
  });

  return () => {
    if (timer) window.clearInterval(timer);
    window.removeEventListener("pagehide", flushOnHide);
    configureReliabilityTransport(null);
    started = false;
  };
}

/** Test seam. */
export function telemetryStateForTests() {
  return { queued: queue.length, disabled, consecutiveFailures };
}

export function resetTelemetryForTests() {
  queue = [];
  disabled = false;
  consecutiveFailures = 0;
  inflight = false;
  started = false;
  if (timer) window.clearInterval(timer);
  timer = undefined;
  configureReliabilityTransport(null);
}

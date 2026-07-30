import { reportReliability } from "./reliability";

/**
 * Per-endpoint circuit breaker.
 *
 * Retry policy alone bounds a SINGLE query: 3 attempts, then it gives up. It
 * does nothing about the aggregate. A dead endpoint is still called afresh on
 * every mount, every remount after an error-boundary retry, and by every
 * component that happens to use it — so a backend that is already failing gets
 * hit harder the moment the UI starts recovering. That is the retry-storm shape
 * that turns a partial outage into a full one.
 *
 * States are the standard three:
 *   closed    calls pass through; consecutive failures are counted
 *   open      calls are rejected immediately for COOL_DOWN_MS (no network)
 *   half-open one trial call is allowed; success closes, failure re-opens
 *
 * Scoped per endpoint KEY, never globally: one broken route must not stop the
 * rest of the app from talking to a healthy backend.
 */

const FAILURE_THRESHOLD = 5;
const COOL_DOWN_MS = 30_000;

type State = "closed" | "open" | "half-open";

interface Circuit {
  state: State;
  failures: number;
  openedAt: number;
}

const circuits = new Map<string, Circuit>();

function get(key: string): Circuit {
  const existing = circuits.get(key);
  if (existing) return existing;
  const fresh: Circuit = { state: "closed", failures: 0, openedAt: 0 };
  circuits.set(key, fresh);
  return fresh;
}

/** True when the call must NOT be attempted. Transitions open → half-open once
 *  the cool-down has elapsed, so recovery needs no external trigger. */
export function isOpen(key: string): boolean {
  const c = get(key);
  if (c.state === "open" && Date.now() - c.openedAt >= COOL_DOWN_MS) {
    c.state = "half-open"; // let exactly one trial through
    return false;
  }
  return c.state === "open";
}

export function recordSuccess(key: string): void {
  const c = get(key);
  if (c.state !== "closed") {
    reportReliability("request", "recovered", { detail: key });
  }
  c.state = "closed";
  c.failures = 0;
}

export function recordFailure(key: string): void {
  const c = get(key);
  // A failed trial in half-open re-opens immediately: the endpoint had its
  // chance, and hammering it now is exactly what the breaker exists to prevent.
  if (c.state === "half-open") {
    c.state = "open";
    c.openedAt = Date.now();
    reportReliability("request", "degraded", { detail: `${key}:reopened` });
    return;
  }
  c.failures += 1;
  if (c.failures >= FAILURE_THRESHOLD) {
    c.state = "open";
    c.openedAt = Date.now();
    reportReliability("request", "degraded", { detail: `${key}:open` });
  }
}

/** Error thrown for a rejected call. Distinguishable so callers can render
 *  "temporarily unavailable" rather than a generic network message. */
export class CircuitOpenError extends Error {
  constructor(public readonly key: string) {
    super(`circuit open for ${key}`);
    this.name = "CircuitOpenError";
  }
}

export function circuitSnapshot(): Record<string, State> {
  return Object.fromEntries([...circuits].map(([k, v]) => [k, v.state]));
}

/** Test seam — production code never needs this. */
export function resetCircuits(): void {
  circuits.clear();
}

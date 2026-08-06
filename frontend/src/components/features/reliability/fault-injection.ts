import { reportReliability, type ReliabilitySurface } from "./reliability";

/**
 * Fault injection — deliberately break things, on purpose, in a running app.
 *
 * The automated tests prove containment in isolation. They cannot prove it in
 * the real composed shell, with real providers, real iframes and real network.
 * This is how you verify that a drawer crash in PRODUCTION-shaped code leaves
 * navigation usable, and how a reviewer checks the claim without reading source.
 *
 * GATED, because an app that can be told to crash itself is a denial-of-service
 * primitive if it ships enabled. Requires BOTH:
 *   - a non-production build, or the explicit `cg_fault_injection=1` local flag
 *   - a deliberate action in the panel; nothing here fires on its own
 *
 * The flag is read at call time (never cached) so it cannot be flipped on by a
 * stale module-level value captured during an earlier session.
 */

export const FAULT_FLAG_KEY = "cg_fault_injection";

export function faultInjectionEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV) return true;
  try {
    return window.localStorage.getItem(FAULT_FLAG_KEY) === "1";
  } catch {
    return false; // storage blocked → stay disabled
  }
}

/** Surfaces that can be targeted, matching the boundaries in the shell. */
export const INJECTABLE: ReliabilitySurface[] = [
  "drawer",
  "sidebar",
  "explore",
  "tab",
];

type Listener = (surface: ReliabilitySurface) => void;
const listeners = new Set<Listener>();

/**
 * Subscribe a surface to render-fault requests. A surface opts in by calling
 * this and throwing from its own render when notified — injection cannot reach
 * into a component that has not opted in, which keeps the blast radius of the
 * harness itself explicit.
 */
export function onRenderFault(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function injectRenderFault(surface: ReliabilitySurface): void {
  if (!faultInjectionEnabled()) return;
  listeners.forEach((l) => l(surface));
}

/** A throw inside a timer: unreachable by any React error boundary, so this is
 *  what verifies the global capture rather than the boundaries. */
export function injectAsyncFault(surface: ReliabilitySurface): void {
  if (!faultInjectionEnabled()) return;
  window.setTimeout(() => {
    throw new Error(`injected async fault in ${surface}`);
  }, 0);
}

/** An unhandled rejection: the other half of what boundaries cannot see. */
export function injectRejection(surface: ReliabilitySurface): void {
  if (!faultInjectionEnabled()) return;
  // eslint-disable-next-line no-promise-executor-return
  Promise.reject(new Error(`injected rejection in ${surface}`)).catch(() => {
    // Re-throw asynchronously so it becomes a genuine unhandled rejection,
    // which is the whole point of this injector.
    setTimeout(() => {
      throw new Error(`injected rejection in ${surface}`);
    }, 0);
  });
}

/** Burns a surface's error budget without breaking anything, so the SLO maths
 *  and the burn bars can be checked independently of real failures. */
export function injectBudgetBurn(surface: ReliabilitySurface, count = 5): void {
  if (!faultInjectionEnabled()) return;
  for (let i = 0; i < count; i += 1) {
    reportReliability(surface, "crash", {
      detail: "injected",
      message: "synthetic budget burn",
    });
  }
}

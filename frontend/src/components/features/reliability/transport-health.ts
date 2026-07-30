import React from "react";

/**
 * Subscribable health for the conversation transport.
 *
 * `SurfaceSupervisor` gives the three cross-origin editor surfaces a health
 * signal any component can subscribe to. The WebSocket — which the entire
 * conversation depends on — had nothing equivalent: its state lived inside
 * `WsClientProvider`, so only its own React subtree could see it, and counters
 * alone let you audit a drop AFTER the fact without letting anything REACT to
 * one.
 *
 * This is the missing signal. It is intentionally outside React (a module store
 * + `useSyncExternalStore`) so surfaces that are not descendants of the provider
 * — the sidebar, a dashboard tile — can still render a degraded state.
 */

export interface TransportHealth {
  healthy: boolean;
  reason: string;
  at: number;
}

let snapshot: TransportHealth = {
  healthy: true,
  reason: "not-connected",
  at: 0,
};
const listeners = new Set<() => void>();

export function publishTransportHealth(
  next: Omit<TransportHealth, "at">,
): void {
  // Identical states must not notify: a socket that re-reports "connected" on
  // every heartbeat would otherwise re-render every subscriber.
  if (snapshot.healthy === next.healthy && snapshot.reason === next.reason) {
    return;
  }
  snapshot = { ...next, at: Date.now() };
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* a broken subscriber must not stop the others being told */
    }
  });
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot(): TransportHealth {
  return snapshot;
}

export function useTransportHealth(): TransportHealth {
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Test seam. */
export function resetTransportHealth(): void {
  snapshot = { healthy: true, reason: "not-connected", at: 0 };
  listeners.clear();
}

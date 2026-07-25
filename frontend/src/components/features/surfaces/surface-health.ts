import React from "react";
import { openHands } from "#/api/open-hands-axios";

/**
 * SurfaceSupervisor — the liveness signal for isolated Canvas surfaces.
 *
 * The Notebook / ONLYOFFICE / draw.io surfaces render from separate cross-origin
 * backends (own OS process). They are third-party apps, so we can't handshake a
 * heartbeat with them — instead a single shared poller asks the backend health
 * aggregator (`/api/cloudguard/surfaces/health`) which backend is up, and every
 * SurfaceHost subscribes. One interval, fanned out via useSyncExternalStore.
 *
 * See docs/architecture/isolation-failsafe/FAIL_SAFE_ISOLATION_SPEC.md.
 */

export type SurfaceId = "notebook" | "onlyoffice" | "whiteboard";
export interface SurfaceStatus {
  healthy: boolean;
  reason: string;
}
type Snapshot = Partial<Record<SurfaceId, SurfaceStatus>>;

const POLL_MS = 8_000;

let currentCid: string | null = null;
let snapshot: Snapshot = {};
let timer: number | null = null;
let inflight = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

async function poll() {
  if (!currentCid || inflight) return;
  inflight = true;
  try {
    const { data } = await openHands.get<{ surfaces: Snapshot }>(
      "/api/cloudguard/surfaces/health",
      { params: { conversation_id: currentCid } },
    );
    snapshot = data?.surfaces ?? {};
    emit();
  } catch {
    // Network/backend error reaching the AGGREGATOR itself: don't flap every
    // surface to unhealthy (that would nuke healthy editors) — keep the last
    // snapshot and try again next tick.
  } finally {
    inflight = false;
  }
}

function ensurePolling(cid: string) {
  if (currentCid !== cid) {
    currentCid = cid;
    snapshot = {};
    emit();
  }
  if (timer == null) {
    poll();
    timer = window.setInterval(poll, POLL_MS);
  }
}

function maybeStop() {
  if (listeners.size === 0 && timer != null) {
    window.clearInterval(timer);
    timer = null;
  }
}

function subscribeSurfaceHealth(cid: string, cb: () => void): () => void {
  listeners.add(cb);
  ensurePolling(cid);
  return () => {
    listeners.delete(cb);
    maybeStop();
  };
}

function getSurfaceStatus(id: SurfaceId): SurfaceStatus | null {
  return snapshot[id] ?? null;
}

/** Force an immediate re-poll (e.g. after a manual Reopen). */
export function refreshSurfaceHealth(): void {
  poll();
}

/** Subscribe a component to one surface's backend health. `null` = not yet known. */
export function useSurfaceHealth(
  id: SurfaceId,
  conversationId: string,
): SurfaceStatus | null {
  const subscribe = React.useCallback(
    (cb: () => void) => subscribeSurfaceHealth(conversationId, cb),
    [conversationId],
  );
  const getSnapshot = React.useCallback(() => getSurfaceStatus(id), [id]);
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

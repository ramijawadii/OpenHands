/**
 * Sidebar visibility preferences — which nav items the operator has hidden. Persisted to
 * localStorage and shared (via useSyncExternalStore) between the profile drawer (which toggles
 * them) and the Sidebar (which filters by them). Ids: `domain:<id>` and `global:<label>`.
 */
import React from "react";
import { safeGetJson, safeSetJson } from "#/utils/safe-storage";

const KEY = "cg_sidebar_hidden";
const EVT = "cg-sidebar-prefs";

function read(): Set<string> {
  // safe-storage handles BOTH failure modes: access denied (private mode,
  // origin policy) and malformed persisted JSON.
  return new Set(safeGetJson<string[]>(KEY, []));
}

let cache = read();

export function isHidden(id: string): boolean {
  return cache.has(id);
}

export function toggleHidden(id: string): void {
  const next = new Set(cache);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  cache = next;
  safeSetJson(KEY, [...next]);
  window.dispatchEvent(new Event(EVT));
}

/** Commit a complete hidden-set at once (used by the Customize drawer's Save button). */
export function setHidden(ids: Iterable<string>): void {
  const next = new Set(ids);
  cache = next;
  safeSetJson(KEY, [...next]);
  window.dispatchEvent(new Event(EVT));
}

function subscribe(cb: () => void): () => void {
  const handler = () => {
    cache = read();
    cb();
  };
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useHiddenNav(): Set<string> {
  return React.useSyncExternalStore(
    subscribe,
    () => cache,
    () => cache,
  );
}

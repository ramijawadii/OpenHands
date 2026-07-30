/**
 * localStorage that cannot take the app down.
 *
 * `localStorage` throws — not just on quota exhaustion, but on plain access in
 * Safari private mode and when a browser policy blocks storage for the origin.
 * A raw `setItem` inside a React effect turns that into an unhandled throw,
 * which unwinds to the nearest error boundary; for anything in the root layout
 * that means a persisted UI preference can white-screen the shell.
 *
 * Reads return the fallback, writes become no-ops. Losing a preference is an
 * acceptable degradation; losing the application is not.
 */

export function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** JSON read with a fallback for both access failure and malformed content —
 *  a corrupt persisted value must not be able to crash a consumer either. */
export function safeGetJson<T>(key: string, fallback: T): T {
  const raw = safeGet(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeSetJson(key: string, value: unknown): boolean {
  try {
    return safeSet(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

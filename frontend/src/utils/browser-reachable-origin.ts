/**
 * Rewrite a loopback origin to one the *current* browser can actually reach.
 *
 * Several side-car services (draw.io, the ONLYOFFICE document server) are
 * configured with browser-facing origins like `http://localhost:8085`. That is
 * correct only while the app is opened on the machine running the containers.
 * Open the same app from a phone or laptop on the LAN and `localhost` resolves
 * to *that* device, so the editor iframe loads nothing and the surface fails
 * with no useful error.
 *
 * The host the page was served from is the one host we know the browser can
 * reach — it just fetched this bundle over it. So when a configured origin
 * points at loopback and the page did not come from loopback, we swap the host
 * and keep the port. Ports are published on 0.0.0.0 by compose, so the swapped
 * origin is reachable whenever the app itself is.
 *
 * Deliberately *not* a blanket rewrite: a real hostname or a public origin is
 * an explicit deployment decision and is left exactly as configured. This only
 * repairs the case that is unambiguously wrong.
 */

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK.has(host.toLowerCase());
}

export function browserReachableOrigin(configured: string): string {
  if (!configured) return configured;
  if (typeof window === "undefined") return configured;

  try {
    const url = new URL(configured, window.location.origin);
    if (!isLoopbackHost(url.hostname)) return configured;
    // The page itself is on loopback — the configured value is already right.
    if (isLoopbackHost(window.location.hostname)) return configured;

    url.hostname = window.location.hostname;
    // Keep the configured port; only the host was wrong. `toString()` would
    // append a trailing slash on a bare origin, which concatenates badly.
    return url.origin;
  } catch {
    // Not a parseable absolute URL (e.g. a same-origin path). Leave it be —
    // a relative value is already reachable by definition.
    return configured;
  }
}

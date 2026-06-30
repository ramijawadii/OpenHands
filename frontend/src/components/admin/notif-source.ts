/**
 * Notification data source — Novu when configured, local sample data otherwise.
 *
 * Production wiring (self-hosted Novu): set these Vite envs and the drawer streams
 * real notifications via @novu/js while keeping our 3-category + HITL UI:
 *   VITE_NOVU_APP_ID         Novu Application Identifier
 *   VITE_NOVU_SUBSCRIBER_ID  the signed-in operator's subscriber id
 *   VITE_NOVU_BACKEND_URL    e.g. http://localhost:3000  (Novu api)
 *   VITE_NOVU_SOCKET_URL     e.g. ws://localhost:3002    (Novu ws)
 *
 * Mapping contract: a Novu notification's `payload` carries our taxonomy —
 *   payload.category ∈ "agent" | "team" | "platform", payload.critical, payload.hitl.
 * HITL Approve/Deny map to Novu primary/secondary action buttons in the workflow.
 * If Novu is unconfigured or unreachable, we fall back to the passed-in local list,
 * so the app always works.
 */
export type Cat = "agent" | "team" | "platform";
export type Notif = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  category: Cat;
  critical?: boolean;
  hitl?: { resource: string; policy: string };
  decision?: "approved" | "denied";
};

type NovuCfg = {
  applicationIdentifier: string;
  subscriberId: string;
  subscriberHash: string; // HMAC, minted server-side — secret never reaches the browser
  backendUrl?: string;
  socketUrl?: string;
};

// Tenant-scoped subscriber config comes from OUR backend (extreme-isolation N0): the server
// namespaces the subscriberId by tenant and signs the HMAC with the Novu secret key.
async function cfg(): Promise<NovuCfg | null> {
  try {
    const res = await fetch("/api/cloudguard/notifications/subscriber", {
      credentials: "include",
    });
    if (!res.ok) return null; // 503 → Novu not configured → local fallback
    const c = (await res.json()) as NovuCfg;
    return c.applicationIdentifier && c.subscriberId && c.subscriberHash
      ? c
      : null;
  } catch {
    return null;
  }
}

function relTime(iso?: string): string {
  if (!iso) return "now";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNovu(n: any): Notif {
  const p = n.payload ?? n.data ?? {};
  const category: Cat = (p.category as Cat) ?? "platform";
  return {
    id: String(n.id ?? n._id ?? n.transactionId ?? Math.random()),
    title: n.subject ?? p.title ?? "Notification",
    body: n.body ?? p.body ?? "",
    time: relTime(n.createdAt),
    read: !!(n.isRead ?? n.read),
    category,
    critical: !!p.critical,
    hitl: p.hitl,
  };
}

/** Fetch the inbox — real Novu data when configured, else the local fallback. */
export async function fetchNotifications(
  localFallback: Notif[],
): Promise<Notif[]> {
  const c = await cfg();
  if (!c) return localFallback;
  try {
    const { Novu } = await import("@novu/js");
    const novu = new Novu({
      applicationIdentifier: c.applicationIdentifier,
      subscriberId: c.subscriberId,
      subscriberHash: c.subscriberHash,
      ...(c.backendUrl ? { backendUrl: c.backendUrl } : {}),
      ...(c.socketUrl ? { socketUrl: c.socketUrl } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp: any = await (novu as any).notifications.list({ limit: 50 });
    const list = resp?.data?.notifications ?? resp?.data ?? resp ?? [];
    return Array.isArray(list) && list.length
      ? list.map(mapNovu)
      : localFallback;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Novu unavailable — using local notifications", err);
    return localFallback;
  }
}

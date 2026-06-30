/**
 * Log / volume search client — calls the tenant-scoped backend route that proxies
 * OpenSearch (openhands/server/routes/cloudguard_search.py). The browser never talks
 * to OpenSearch directly. Used for high-volume log search (audit/CDR/telemetry),
 * distinct from the instant in-memory Orama nav search.
 */
export type LogHit = {
  id: string;
  score?: number;
  "@timestamp"?: string;
  stream?: string;
  level?: string;
  actor?: string;
  resource?: string;
  message?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

export type LogSearchResult = {
  total: number;
  took_ms: number;
  tenant_id: string;
  hits: LogHit[];
  facets: { stream: Record<string, number> };
};

export async function searchLogs(params: {
  q?: string;
  size?: number;
  from?: number;
  stream?: string;
  since?: string;
}): Promise<LogSearchResult> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  sp.set("size", String(params.size ?? 25));
  if (params.from) sp.set("from", String(params.from));
  if (params.stream) sp.set("stream", params.stream);
  if (params.since) sp.set("since", params.since);
  const res = await fetch(`/api/cloudguard/search/logs?${sp.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`log search failed (${res.status}): ${detail}`);
  }
  return res.json();
}

export async function logSearchHealth(): Promise<{
  configured: boolean;
  ok: boolean;
  detail?: string;
  cluster?: string;
  version?: string;
}> {
  const res = await fetch("/api/cloudguard/search/health", {
    credentials: "include",
  });
  return res.json();
}

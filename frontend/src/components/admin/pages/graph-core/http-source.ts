/* eslint-disable class-methods-use-this -- interface stubs (shortestPath/report served server-side) */
// ─────────────────────────────────────────────────────────────────────────────
// HttpGraphSource — the browser's client for the server Graph API
// (cloudguard/api/graph.py). Same GraphSource interface as Local/Neo4j, so the
// UI is unchanged: it just fetches bounded subgraphs from the server instead of
// computing them in-memory. This is how the graph scales past the browser.
//
// The tenant is derived server-side from the verified principal, so it is NOT
// sent from the client (never trust a tenant from the body).
// ─────────────────────────────────────────────────────────────────────────────
import { type GraphMetrics } from "./metrics";
import { type GraphSpec, type NeighborhoodOpts, type Subgraph } from "./model";
import { type ValidationReport } from "./validate";
import { type GraphSource, type ReachQuery } from "./source";

type Fetcher = (url: string) => Promise<{ json: () => Promise<unknown> }>;

export class HttpGraphSource implements GraphSource {
  readonly kind = "neo4j" as const; // server-backed (graph DB behind the API)

  readonly tenantId: string;

  private base: string;

  private fetcher: Fetcher;

  constructor(
    baseUrl = "/api/cloudguard",
    tenantId = "server",
    fetcher?: Fetcher,
  ) {
    this.base = baseUrl.replace(/\/$/, "");
    this.tenantId = tenantId;
    this.fetcher =
      fetcher ?? ((url: string) => fetch(url, { credentials: "same-origin" }));
  }

  private async get<T>(path: string, qs: Record<string, unknown>): Promise<T> {
    const params = new URLSearchParams();
    Object.entries(qs).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v));
    });
    const q = params.toString();
    const res = await this.fetcher(`${this.base}${path}${q ? `?${q}` : ""}`);
    return (await res.json()) as T;
  }

  async snapshot(): Promise<GraphSpec> {
    const r = await this.get<{ nodes?: unknown[]; edges?: unknown[] }>(
      "/graph/snapshot",
      {},
    );
    return {
      nodes: (r.nodes ?? []) as GraphSpec["nodes"],
      edges: (r.edges ?? []) as GraphSpec["edges"],
    };
  }

  async reach(rootId: string, opts: ReachQuery = {}): Promise<string[]> {
    const r = await this.get<{ ids: string[] }>("/graph/reach", {
      root: rootId,
      direction: opts.dir ?? "down",
      depth: opts.maxDepth ?? 0,
    });
    return r.ids ?? [];
  }

  async blastRadius(rootId: string): Promise<number> {
    const r = await this.get<{ blastRadius: number }>("/graph/blast-radius", {
      root: rootId,
    });
    return r.blastRadius ?? 0;
  }

  async fanIn(rootId: string): Promise<number> {
    const r = await this.get<{ fanIn: number }>("/graph/blast-radius", {
      root: rootId,
    });
    return r.fanIn ?? 0;
  }

  async neighborhood(
    rootId: string,
    opts: NeighborhoodOpts = {},
  ): Promise<Subgraph> {
    const r = await this.get<Subgraph>("/graph/neighborhood", {
      root: rootId,
      direction: opts.dir ?? "down",
      depth: opts.maxDepth ?? 0,
      limit: opts.nodeLimit ?? 1500,
    });
    return {
      rootId,
      nodes: r.nodes ?? [],
      edges: r.edges ?? [],
      truncated: !!r.truncated,
    };
  }

  async shortestPath(): Promise<string[] | null> {
    // exposed by the server when needed; not on the hot path today
    return null;
  }

  async metrics(): Promise<GraphMetrics> {
    return this.get<GraphMetrics>("/graph/metrics", {});
  }

  async report(): Promise<ValidationReport> {
    // the ingest report is surfaced by the ETL; default to OK for the client
    return {
      ok: true,
      errors: 0,
      warnings: 0,
      issues: [],
      counts: { nodes: 0, edges: 0 },
    };
  }
}

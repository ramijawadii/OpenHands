// ─────────────────────────────────────────────────────────────────────────────
// Neo4j-backed GraphSource — the scale implementation. Same interface as
// LocalGraphSource, so the UI never changes. Traversal runs in the DB (bounded,
// tenant-scoped), which is what lets the graph grow past what a browser can
// hold or compute.
//
// A `CypherRunner` is injected so the frontend has no hard driver dependency
// (the actual bolt/HTTP call lives in the app layer / a thin API proxy). The
// queries below are the contract; the contract test drives them with a mock
// runner to assert direction, depth-bound, tenant scoping and row mapping.
// ─────────────────────────────────────────────────────────────────────────────
import { type GraphMetrics } from "./metrics";
import {
  type Dir,
  type GraphNodeInput,
  type NeighborhoodOpts,
  type NormEdge,
  type Subgraph,
} from "./model";
import { type ValidationReport } from "./validate";
import { type GraphSource, type ReachQuery } from "./source";

export type CypherRunner = (
  cypher: string,
  params: Record<string, unknown>,
) => Promise<Record<string, unknown>[]>;

// relationship pattern for a direction, with an optional bounded length
function relPattern(dir: Dir, maxDepth?: number): string {
  const bound = maxDepth && maxDepth > 0 ? `*1..${maxDepth}` : "*1..";
  const rel = `[r:REL${bound}]`;
  if (dir === "up") return `<-${rel}-`;
  if (dir === "both") return `-${rel}-`;
  return `-${rel}->`;
}

// WHERE clauses that keep a variable-length traversal tenant-scoped, on-kind,
// and above a confidence floor — the correctness guarantees of the query.
function relGuards(kinds?: string[], minConfidence?: number): string {
  const parts: string[] = ["all(n IN nodes(p) WHERE n.tenantId = $tenant)"];
  if (kinds && kinds.length)
    parts.push("all(e IN relationships(p) WHERE e.kind IN $kinds)");
  if (minConfidence !== undefined)
    parts.push("all(e IN relationships(p) WHERE e.confidence >= $minConf)");
  return parts.join(" AND ");
}

export class Neo4jGraphSource implements GraphSource {
  readonly kind = "neo4j" as const;

  readonly tenantId: string;

  private run: CypherRunner;

  constructor(run: CypherRunner, tenantId: string) {
    this.run = run;
    this.tenantId = tenantId;
  }

  private base(extra: Record<string, unknown> = {}): Record<string, unknown> {
    return { tenant: this.tenantId, ...extra };
  }

  async reach(rootId: string, opts: ReachQuery = {}): Promise<string[]> {
    const dir = opts.dir ?? "down";
    const cypher = `
      MATCH p = (root {id: $id, tenantId: $tenant})${relPattern(dir, opts.maxDepth)}(n)
      WHERE ${relGuards(opts.kinds, opts.minConfidence)}
      WITH collect(DISTINCT n.id) AS ids
      RETURN ids`;
    const rows = await this.run(
      cypher,
      this.base({
        id: rootId,
        kinds: opts.kinds ?? null,
        minConf: opts.minConfidence ?? 0,
      }),
    );
    const ids = (rows[0]?.ids as string[]) ?? [];
    return opts.includeRoot === false
      ? ids
      : [rootId, ...ids.filter((x) => x !== rootId)];
  }

  async blastRadius(rootId: string): Promise<number> {
    const cypher = `
      MATCH p = (root {id: $id, tenantId: $tenant})${relPattern("down")}(n)
      WHERE ${relGuards()}
      RETURN count(DISTINCT n) AS c`;
    const rows = await this.run(cypher, this.base({ id: rootId }));
    return Number(rows[0]?.c ?? 0);
  }

  async fanIn(rootId: string): Promise<number> {
    const cypher = `
      MATCH p = (root {id: $id, tenantId: $tenant})${relPattern("up")}(n)
      WHERE ${relGuards()}
      RETURN count(DISTINCT n) AS c`;
    const rows = await this.run(cypher, this.base({ id: rootId }));
    return Number(rows[0]?.c ?? 0);
  }

  async neighborhood(
    rootId: string,
    opts: NeighborhoodOpts = {},
  ): Promise<Subgraph> {
    const dir = opts.dir ?? "down";
    const limit = opts.nodeLimit ?? 1500;
    let kinds: string[] | undefined;
    if (opts.kinds)
      kinds = Array.isArray(opts.kinds) ? opts.kinds : [...opts.kinds];
    // pull the bounded subgraph's nodes + induced edges, capped at limit+1 so we
    // can flag truncation.
    const cypher = `
      MATCH p = (root {id: $id, tenantId: $tenant})${relPattern(dir, opts.maxDepth)}(n)
      WHERE ${relGuards(kinds, opts.minConfidence)}
      WITH root, collect(DISTINCT n) AS ns
      WITH root, ns[0..$limit] AS ns, size(ns) > $limit AS truncated
      UNWIND ([root] + ns) AS node
      WITH collect(DISTINCT node) AS nodes, truncated
      UNWIND nodes AS a
      MATCH (a)-[e:REL]->(b) WHERE b IN nodes
      RETURN nodes, collect(DISTINCT e) AS edges, truncated`;
    const rows = await this.run(
      cypher,
      this.base({
        id: rootId,
        limit,
        kinds: kinds ?? null,
        minConf: opts.minConfidence ?? 0,
      }),
    );
    const row = rows[0] ?? {};
    const nodes = ((row.nodes as { properties?: GraphNodeInput }[]) ?? []).map(
      (r) => r.properties ?? (r as unknown as GraphNodeInput),
    );
    const edges = ((row.edges as { properties?: NormEdge }[]) ?? []).map(
      (r) => r.properties ?? (r as unknown as NormEdge),
    );
    return {
      nodes,
      edges,
      truncated: !!row.truncated,
      rootId,
    };
  }

  async shortestPath(
    a: string,
    b: string,
    opts: ReachQuery = {},
  ): Promise<string[] | null> {
    const dir = opts.dir ?? "down";
    const cypher = `
      MATCH (a {id: $a, tenantId: $tenant}), (b {id: $b, tenantId: $tenant})
      MATCH p = shortestPath((a)${relPattern(dir)}(b))
      WHERE ${relGuards(opts.kinds, opts.minConfidence)}
      RETURN [x IN nodes(p) | x.id] AS ids`;
    const rows = await this.run(
      cypher,
      this.base({
        a,
        b,
        kinds: opts.kinds ?? null,
        minConf: opts.minConfidence ?? 0,
      }),
    );
    const ids = rows[0]?.ids as string[] | undefined;
    return ids && ids.length ? ids : null;
  }

  async metrics(): Promise<GraphMetrics> {
    // Cheap aggregates run live; blast-radius percentiles come from a nightly
    // precompute at scale (full-graph reach per node is not an interactive
    // query). We surface the aggregates and leave percentiles to the job.
    const cypher = `
      MATCH (n {tenantId: $tenant})
      OPTIONAL MATCH (n)-[o:REL]->()
      OPTIONAL MATCH (n)<-[i:REL]-()
      WITH n, count(DISTINCT o) AS outd, count(DISTINCT i) AS ind
      RETURN count(n) AS nodes,
             sum(outd) AS edges,
             max(outd) AS maxOut,
             max(ind) AS maxIn,
             sum(CASE WHEN outd + ind = 0 THEN 1 ELSE 0 END) AS orphans,
             collect({id: n.id, degree: outd + ind}) AS degs`;
    const rows = await this.run(cypher, this.base());
    const r = rows[0] ?? {};
    const nodes = Number(r.nodes ?? 0);
    const edges = Number(r.edges ?? 0);
    const degs = ((r.degs as { id: string; degree: number }[]) ?? [])
      .sort((x, y) => y.degree - x.degree)
      .slice(0, 8);
    return {
      nodes,
      edges,
      avgDegree: nodes ? +(edges / nodes).toFixed(2) : 0,
      maxOutDegree: Number(r.maxOut ?? 0),
      maxInDegree: Number(r.maxIn ?? 0),
      orphanRate: nodes ? +(Number(r.orphans ?? 0) / nodes).toFixed(3) : 0,
      hubs: degs,
      reach: { p50: 0, p90: 0, p99: 0, max: 0 }, // precomputed nightly
    };
  }

  async report(): Promise<ValidationReport> {
    // validation runs at ingest (ETL) time in the DB pipeline, which writes an
    // :IngestReport for the tenant; we read the latest one back.
    const rows = await this.run(
      `MATCH (r:IngestReport {tenantId: $tenant})
       RETURN r ORDER BY r.ts DESC LIMIT 1`,
      this.base(),
    );
    const r = (rows[0]?.r as { properties?: ValidationReport })?.properties;
    return (
      r ?? {
        ok: true,
        errors: 0,
        warnings: 0,
        issues: [],
        counts: { nodes: 0, edges: 0 },
      }
    );
  }
}

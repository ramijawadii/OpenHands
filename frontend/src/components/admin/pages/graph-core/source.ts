// ─────────────────────────────────────────────────────────────────────────────
// graph-core query source — the async seam the UI talks to.
//
// The drill / expand / hover UI should depend on this INTERFACE, not on the
// in-memory engine. Today it's satisfied by LocalGraphSource (wraps the engine
// for Sample data); at scale the SAME interface is satisfied by a graph-DB
// (Neo4jGraphSource) with zero call-site changes. Every implementation is
// tenant-scoped and must pass the shared contract test.
// ─────────────────────────────────────────────────────────────────────────────
import { GraphEngine } from "./engine";
import { graphMetrics, type GraphMetrics } from "./metrics";
import {
  type NeighborhoodOpts,
  type Subgraph,
  type Dir,
  type EdgeKind,
  type GraphSpec,
} from "./model";
import { type ValidationReport } from "./validate";

export interface ReachQuery {
  dir?: Dir;
  maxDepth?: number;
  kinds?: EdgeKind[];
  minConfidence?: number;
  includeRoot?: boolean;
}

export interface GraphSource {
  /** stable identifier for the backing store (telemetry / debugging) */
  readonly kind: "local" | "neo4j";
  /** tenant this source is scoped to — never crosses tenants */
  readonly tenantId: string;

  /** full estate (nodes + edges) — the initial graph the page renders */
  snapshot(): Promise<GraphSpec>;
  /** bounded neighborhood (LOD) — the primary query the drill UI fetches */
  neighborhood(rootId: string, opts?: NeighborhoodOpts): Promise<Subgraph>;
  /** reachable node ids in a direction, bounded by depth */
  reach(rootId: string, opts?: ReachQuery): Promise<string[]>;
  /** downstream blast radius (unique nodes, excl. root) */
  blastRadius(rootId: string): Promise<number>;
  /** upstream fan-in (unique nodes, excl. root) */
  fanIn(rootId: string): Promise<number>;
  /** shortest directed path a→b, or null */
  shortestPath(
    a: string,
    b: string,
    opts?: ReachQuery,
  ): Promise<string[] | null>;
  /** graph-wide quality + scale metrics */
  metrics(): Promise<GraphMetrics>;
  /** ingest-time validation report (may be cached at build time) */
  report(): Promise<ValidationReport>;
}

// ── in-memory implementation (Sample data / small graphs) ────────────────────
export class LocalGraphSource implements GraphSource {
  readonly kind = "local" as const;

  readonly tenantId: string;

  private engine: GraphEngine;

  private validation: ValidationReport;

  constructor(
    engine: GraphEngine,
    report: ValidationReport,
    tenantId = "local",
  ) {
    this.engine = engine;
    this.validation = report;
    this.tenantId = tenantId;
  }

  async snapshot(): Promise<GraphSpec> {
    return this.engine.snapshot();
  }

  async neighborhood(
    rootId: string,
    opts?: NeighborhoodOpts,
  ): Promise<Subgraph> {
    return this.engine.neighborhood(rootId, opts);
  }

  async reach(rootId: string, opts?: ReachQuery): Promise<string[]> {
    return this.engine.reach(rootId, {
      dir: opts?.dir,
      maxDepth: opts?.maxDepth,
      kinds: opts?.kinds,
      minConfidence: opts?.minConfidence,
      includeRoot: opts?.includeRoot,
    });
  }

  async blastRadius(rootId: string): Promise<number> {
    return this.engine.blastRadius(rootId);
  }

  async fanIn(rootId: string): Promise<number> {
    return this.engine.fanIn(rootId);
  }

  async shortestPath(
    a: string,
    b: string,
    opts?: ReachQuery,
  ): Promise<string[] | null> {
    return this.engine.shortestPath(a, b, {
      dir: opts?.dir,
      kinds: opts?.kinds,
      minConfidence: opts?.minConfidence,
    });
  }

  async metrics(): Promise<GraphMetrics> {
    return graphMetrics(this.engine);
  }

  async report(): Promise<ValidationReport> {
    return this.validation;
  }
}

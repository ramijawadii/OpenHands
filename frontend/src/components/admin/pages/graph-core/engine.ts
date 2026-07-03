/* eslint-disable no-continue, no-restricted-syntax -- tight CSR/BFS loops */
// ─────────────────────────────────────────────────────────────────────────────
// graph-core engine — the ONE place graph traversal happens.
//
// Built on a compressed-sparse-row (CSR) adjacency with typed arrays and
// bitset-visited BFS, so reachability/neighborhood are O(V+E) with tiny memory
// and stay fast into the millions of edges. Both the Security Graph and the
// Explorer call this instead of ad-hoc JS closures, so "chain", "blast radius"
// and "attack path" can never disagree.
// ─────────────────────────────────────────────────────────────────────────────
import {
  EDGE_KINDS,
  type Dir,
  type GraphNodeInput,
  type GraphSpec,
  type NeighborhoodOpts,
  type NormEdge,
  type Subgraph,
} from "./model";
import { validateGraph, type ValidationReport } from "./validate";

const kindCode = new Map(EDGE_KINDS.map((k, i) => [k, i]));

// build a per-edge-kind allow mask (null = allow all)
function kindMask(kinds?: Set<string> | string[]): Uint8Array | null {
  if (!kinds) return null;
  const set = Array.isArray(kinds) ? new Set(kinds) : kinds;
  const mask = new Uint8Array(EDGE_KINDS.length);
  EDGE_KINDS.forEach((k, i) => {
    if (set.has(k)) mask[i] = 1;
  });
  return mask;
}

export interface WalkOpts {
  dir?: Dir;
  /** hop bound; 0/undefined = unbounded */
  maxDepth?: number;
  kinds?: Set<string> | string[];
  minConfidence?: number;
  /** include the root id in the result set (default true) */
  includeRoot?: boolean;
}

export class GraphEngine {
  readonly n: number;

  readonly m: number;

  private idToIdx: Map<string, number>;

  private idxToId: string[];

  private nodesByIdx: GraphNodeInput[];

  // CSR — out edges
  private outOff: Uint32Array;

  private outAdj: Uint32Array; // target node idx

  private outEdge: Uint32Array; // edge idx

  // CSR — in edges
  private inOff: Uint32Array;

  private inAdj: Uint32Array; // source node idx

  private inEdge: Uint32Array; // edge idx

  // edge attribute columns (parallel to edge index)
  private eKind: Uint8Array;

  private eConf: Float32Array;

  private eSource: Uint32Array;

  private eTarget: Uint32Array;

  private eProv: string[];

  private constructor(spec: GraphSpec) {
    const { nodes } = spec;
    this.n = nodes.length;
    this.idToIdx = new Map();
    this.idxToId = new Array(this.n);
    this.nodesByIdx = nodes;
    for (let i = 0; i < this.n; i += 1) {
      this.idToIdx.set(nodes[i].id, i);
      this.idxToId[i] = nodes[i].id;
    }

    // keep only edges whose endpoints exist (validator flags the rest)
    const edges = spec.edges.filter(
      (e) => this.idToIdx.has(e.source) && this.idToIdx.has(e.target),
    );
    this.m = edges.length;
    this.eKind = new Uint8Array(this.m);
    this.eConf = new Float32Array(this.m);
    this.eSource = new Uint32Array(this.m);
    this.eTarget = new Uint32Array(this.m);
    this.eProv = new Array(this.m);

    const outDeg = new Uint32Array(this.n);
    const inDeg = new Uint32Array(this.n);
    for (let e = 0; e < this.m; e += 1) {
      const s = this.idToIdx.get(edges[e].source)!;
      const t = this.idToIdx.get(edges[e].target)!;
      this.eSource[e] = s;
      this.eTarget[e] = t;
      this.eKind[e] =
        kindCode.get(edges[e].kind ?? "generic") ?? kindCode.get("generic")!;
      this.eConf[e] = edges[e].confidence ?? 1;
      this.eProv[e] = edges[e].provenance ?? "";
      outDeg[s] += 1;
      inDeg[t] += 1;
    }

    // build offsets
    this.outOff = new Uint32Array(this.n + 1);
    this.inOff = new Uint32Array(this.n + 1);
    for (let i = 0; i < this.n; i += 1) {
      this.outOff[i + 1] = this.outOff[i] + outDeg[i];
      this.inOff[i + 1] = this.inOff[i] + inDeg[i];
    }
    this.outAdj = new Uint32Array(this.m);
    this.outEdge = new Uint32Array(this.m);
    this.inAdj = new Uint32Array(this.m);
    this.inEdge = new Uint32Array(this.m);
    const outCur = this.outOff.slice(0, this.n);
    const inCur = this.inOff.slice(0, this.n);
    for (let e = 0; e < this.m; e += 1) {
      const s = this.eSource[e];
      const t = this.eTarget[e];
      const op = outCur[s];
      outCur[s] += 1;
      this.outAdj[op] = t;
      this.outEdge[op] = e;
      const ip = inCur[t];
      inCur[t] += 1;
      this.inAdj[ip] = s;
      this.inEdge[ip] = e;
    }
  }

  /** Build + validate in one step (report is advisory; engine still builds). */
  static build(spec: GraphSpec): {
    engine: GraphEngine;
    report: ValidationReport;
  } {
    const report = validateGraph(spec);
    return { engine: new GraphEngine(spec), report };
  }

  index(id: string): number {
    return this.idToIdx.get(id) ?? -1;
  }

  node(id: string): GraphNodeInput | undefined {
    const i = this.index(id);
    return i < 0 ? undefined : this.nodesByIdx[i];
  }

  // core bounded BFS returning a visited bitset over node indices
  private walkIdx(rootIdx: number, opts: WalkOpts): Uint8Array {
    const visited = new Uint8Array(this.n);
    if (rootIdx < 0) return visited;
    const dir: Dir = opts.dir ?? "down";
    const maxDepth =
      opts.maxDepth && opts.maxDepth > 0 ? opts.maxDepth : Infinity;
    const minConf = opts.minConfidence ?? 0;
    const mask = kindMask(opts.kinds);

    visited[rootIdx] = 1;
    let frontier: number[] = [rootIdx];
    let depth = 0;
    const step = (
      u: number,
      off: Uint32Array,
      adj: Uint32Array,
      edg: Uint32Array,
      next: number[],
    ) => {
      for (let p = off[u]; p < off[u + 1]; p += 1) {
        const e = edg[p];
        if (this.eConf[e] < minConf) continue;
        if (mask && !mask[this.eKind[e]]) continue;
        const v = adj[p];
        if (!visited[v]) {
          visited[v] = 1;
          next.push(v);
        }
      }
    };
    while (frontier.length && depth < maxDepth) {
      const next: number[] = [];
      for (const u of frontier) {
        if (dir === "down" || dir === "both")
          step(u, this.outOff, this.outAdj, this.outEdge, next);
        if (dir === "up" || dir === "both")
          step(u, this.inOff, this.inAdj, this.inEdge, next);
      }
      frontier = next;
      depth += 1;
    }
    if (opts.includeRoot === false) visited[rootIdx] = 0;
    return visited;
  }

  /** Reachable node ids from `id` in the given direction, bounded by depth. */
  reach(id: string, opts: WalkOpts = {}): string[] {
    const root = this.index(id);
    if (root < 0) return [];
    const bs = this.walkIdx(root, opts);
    const out: string[] = [];
    for (let i = 0; i < this.n; i += 1) if (bs[i]) out.push(this.idxToId[i]);
    return out;
  }

  /** Downstream blast radius (unique nodes reachable OUT), excluding root. */
  blastRadius(id: string): number {
    const root = this.index(id);
    if (root < 0) return 0;
    const bs = this.walkIdx(root, { dir: "down", includeRoot: false });
    let c = 0;
    for (let i = 0; i < this.n; i += 1) c += bs[i];
    return c;
  }

  /** Upstream fan-in (unique nodes that can reach this node), excluding root. */
  fanIn(id: string): number {
    const root = this.index(id);
    if (root < 0) return 0;
    const bs = this.walkIdx(root, { dir: "up", includeRoot: false });
    let c = 0;
    for (let i = 0; i < this.n; i += 1) c += bs[i];
    return c;
  }

  degree(id: string): { in: number; out: number } {
    const i = this.index(id);
    if (i < 0) return { in: 0, out: 0 };
    return {
      out: this.outOff[i + 1] - this.outOff[i],
      in: this.inOff[i + 1] - this.inOff[i],
    };
  }

  /**
   * Bounded neighborhood as an induced subgraph — the level-of-detail query the
   * drill UI should call instead of filtering one in-memory blob. Caps nodes so
   * a hub can't return the whole graph; `truncated` flags when the cap was hit.
   */
  neighborhood(id: string, opts: NeighborhoodOpts = {}): Subgraph {
    const root = this.index(id);
    const nodeLimit = opts.nodeLimit ?? 1500;
    if (root < 0) return { nodes: [], edges: [], truncated: false, rootId: id };

    const dir: Dir = opts.dir ?? "down";
    const maxDepth =
      opts.maxDepth && opts.maxDepth > 0 ? opts.maxDepth : Infinity;
    const minConf = opts.minConfidence ?? 0;
    const mask = kindMask(opts.kinds);

    const inSet = new Uint8Array(this.n);
    inSet[root] = 1;
    let count = 1;
    let truncated = false;
    let frontier: number[] = [root];
    let depth = 0;
    const expand = (
      u: number,
      off: Uint32Array,
      adj: Uint32Array,
      edg: Uint32Array,
      next: number[],
    ) => {
      for (let p = off[u]; p < off[u + 1]; p += 1) {
        const e = edg[p];
        if (this.eConf[e] < minConf) continue;
        if (mask && !mask[this.eKind[e]]) continue;
        const v = adj[p];
        if (!inSet[v]) {
          if (count >= nodeLimit) {
            truncated = true;
            return;
          }
          inSet[v] = 1;
          count += 1;
          next.push(v);
        }
      }
    };
    while (frontier.length && depth < maxDepth && !truncated) {
      const next: number[] = [];
      for (const u of frontier) {
        if (truncated) break;
        if (dir === "down" || dir === "both")
          expand(u, this.outOff, this.outAdj, this.outEdge, next);
        if (dir === "up" || dir === "both")
          expand(u, this.inOff, this.inAdj, this.inEdge, next);
      }
      frontier = next;
      depth += 1;
    }

    const nodes: GraphNodeInput[] = [];
    for (let i = 0; i < this.n; i += 1)
      if (inSet[i]) nodes.push(this.nodesByIdx[i]);
    // induced edges: both endpoints inside the set (respecting kind/confidence)
    const edges: NormEdge[] = [];
    for (let e = 0; e < this.m; e += 1) {
      if (!inSet[this.eSource[e]] || !inSet[this.eTarget[e]]) continue;
      if (this.eConf[e] < minConf) continue;
      if (mask && !mask[this.eKind[e]]) continue;
      edges.push(this.normEdge(e));
    }
    return { nodes, edges, truncated, rootId: id };
  }

  /** Shortest directed path a→b (BFS), or null. Returns node ids. */
  shortestPath(a: string, b: string, opts: WalkOpts = {}): string[] | null {
    const s = this.index(a);
    const t = this.index(b);
    if (s < 0 || t < 0) return null;
    if (s === t) return [a];
    const dir: Dir = opts.dir ?? "down";
    const minConf = opts.minConfidence ?? 0;
    const mask = kindMask(opts.kinds);
    const prev = new Int32Array(this.n).fill(-1);
    const seen = new Uint8Array(this.n);
    seen[s] = 1;
    let frontier: number[] = [s];
    const relax = (
      u: number,
      off: Uint32Array,
      adj: Uint32Array,
      edg: Uint32Array,
      next: number[],
    ) => {
      for (let p = off[u]; p < off[u + 1]; p += 1) {
        const e = edg[p];
        if (this.eConf[e] < minConf) continue;
        if (mask && !mask[this.eKind[e]]) continue;
        const v = adj[p];
        if (!seen[v]) {
          seen[v] = 1;
          prev[v] = u;
          next.push(v);
        }
      }
    };
    while (frontier.length) {
      const next: number[] = [];
      for (const u of frontier) {
        if (dir === "down" || dir === "both")
          relax(u, this.outOff, this.outAdj, this.outEdge, next);
        if (dir === "up" || dir === "both")
          relax(u, this.inOff, this.inAdj, this.inEdge, next);
      }
      if (seen[t]) break;
      frontier = next;
    }
    if (!seen[t]) return null;
    const path: string[] = [];
    let cur = t;
    while (cur !== -1) {
      path.push(this.idxToId[cur]);
      if (cur === s) break;
      cur = prev[cur];
    }
    return path.reverse();
  }

  private normEdge(e: number): NormEdge {
    return {
      source: this.idxToId[this.eSource[e]],
      target: this.idxToId[this.eTarget[e]],
      kind: EDGE_KINDS[this.eKind[e]],
      confidence: this.eConf[e],
      provenance: this.eProv[e],
    };
  }

  /** All edges (normalised) — for metrics / export. */
  allEdges(): NormEdge[] {
    const out: NormEdge[] = [];
    for (let e = 0; e < this.m; e += 1) out.push(this.normEdge(e));
    return out;
  }

  allNodeIds(): string[] {
    return this.idxToId.slice();
  }

  /** Full estate (nodes + normalised edges) — the initial graph the UI renders. */
  snapshot(): GraphSpec {
    return { nodes: this.nodesByIdx.slice(), edges: this.allEdges() };
  }
}

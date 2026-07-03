/**
 * GraphScene (M2 / B2) — the renderer's data model, independent of GL.
 *
 * Holds node positions/styling + edges + adjacency, maintains a quadtree for
 * culling, and packs INSTANCED vertex buffers for the visible set. One draw call
 * covers all visible nodes and one all visible edges (instanced), so GL draw
 * calls are O(1) in element count — only the per-frame upload is O(visible).
 *
 * Pure + fully unit-testable (no GL). The renderer consumes `packNodes()` /
 * `packEdges()` and uploads them; culling is `visibleNodeIds(camera, w, h)`.
 */

import type { BBox } from "../canvas";
import { Camera } from "./camera";
import { boundsOf, Quadtree, type QPoint } from "./quadtree";

export interface SceneNode {
  id: string;
  x: number;
  y: number;
  r: number; // radius (world units)
  color: [number, number, number]; // 0..1 rgb
  classes: Set<string>;
  /** domain payload (kind/label/tier/attrs) the UI reads via data() */
  data: Record<string, unknown>;
}

export interface SceneNodeInput {
  id: string;
  x: number;
  y: number;
  r?: number;
  color?: [number, number, number];
  classes?: string[];
  data?: Record<string, unknown>;
}

export interface SceneEdgeInput {
  source: string;
  target: string;
}

/** A live update (B5) — one node or edge upserted/removed, applied in place. */
export type SceneDelta =
  | { kind: "node"; op: "upsert"; node: SceneNodeInput }
  | { kind: "node"; op: "tombstone"; id: string; node?: undefined }
  | { kind: "edge"; op: "upsert"; edge: SceneEdgeInput }
  | { kind: "edge"; op: "tombstone"; edge: SceneEdgeInput };

const DEFAULT_COLOR: [number, number, number] = [0.6, 0.63, 0.68];
const DEFAULT_R = 12;
/** cull margin (fraction of viewport) so nodes just off-screen stay warm. */
const CULL_MARGIN = 0.15;

/** floats per instance in the packed buffers (kept in sync with the shaders). */
export const NODE_STRIDE = 6; // x,y,r,r_,g_,b_  → cx,cy,radius,red,green,blue
export const EDGE_STRIDE = 4; // x1,y1,x2,y2
/** reserved class marking a node hidden via style("display","none"). */
export const HIDDEN_CLASS = "__display_none";

/** expand a viewport bbox by the cull margin so near-offscreen nodes stay warm. */
function marginBox(view: BBox): BBox {
  const mx = Math.abs(view.w) * CULL_MARGIN;
  const my = Math.abs(view.h) * CULL_MARGIN;
  return {
    x1: view.x1 - mx,
    y1: view.y1 - my,
    x2: view.x2 + mx,
    y2: view.y2 + my,
    w: view.w + 2 * mx,
    h: view.h + 2 * my,
  };
}

export class GraphScene {
  private nodes = new Map<string, SceneNode>();

  private edges: Array<{ source: string; target: string }> = [];

  private adj = new Map<string, Set<string>>();

  private tree: Quadtree | null = null;

  private treeDirty = true;

  // ── ingest ─────────────────────────────────────────────────────────────────
  setElements(nodes: SceneNodeInput[], edges: SceneEdgeInput[]): void {
    this.nodes.clear();
    this.edges = [];
    this.adj.clear();
    for (const n of nodes) this.addNodeInternal(n);
    for (const e of edges) this.addEdgeInternal(e.source, e.target);
    this.treeDirty = true;
  }

  private addNodeInternal(n: SceneNodeInput): void {
    this.nodes.set(n.id, {
      id: n.id,
      x: n.x,
      y: n.y,
      r: n.r ?? DEFAULT_R,
      color: n.color ?? DEFAULT_COLOR,
      classes: new Set(n.classes ?? []),
      data: n.data ?? {},
    });
    if (!this.adj.has(n.id)) this.adj.set(n.id, new Set());
  }

  private addEdgeInternal(source: string, target: string): void {
    this.edges.push({ source, target });
    (this.adj.get(source) ?? this.adj.set(source, new Set()).get(source)!).add(
      target,
    );
    (this.adj.get(target) ?? this.adj.set(target, new Set()).get(target)!).add(
      source,
    );
  }

  // ── live delta patching (B5) — apply WS deltas in place, no full rebuild ─────
  /**
   * Apply a single live delta. `upsert` adds/updates a node (or edge) without
   * touching the rest of the scene; `tombstone` removes it. Node position/attr
   * changes mark the quadtree dirty (structure moved); an edge-only or class
   * change does not. Returns true if anything changed. Tenant isolation is the
   * caller's job (the WS subscription filter only ever delivers in-tenant deltas).
   */
  applyDelta(delta: SceneDelta): boolean {
    if (delta.kind === "node") {
      if (delta.op === "tombstone") return this.removeNode(delta.id);
      if (delta.node) {
        const existed = this.nodes.has(delta.node.id);
        const prev = this.nodes.get(delta.node.id);
        this.addNodeInternal(delta.node);
        // moved or new → tree stale; a pure attr/color change on the same spot
        // still safely re-queries, but only flag when position actually changes.
        if (!existed || prev?.x !== delta.node.x || prev?.y !== delta.node.y) {
          this.treeDirty = true;
        }
        return true;
      }
      return false;
    }
    // edge delta
    if (delta.op === "tombstone" && delta.edge)
      return this.removeEdge(delta.edge.source, delta.edge.target);
    if (delta.op === "upsert" && delta.edge) {
      if (this.hasEdge(delta.edge.source, delta.edge.target)) return false;
      this.addEdgeInternal(delta.edge.source, delta.edge.target);
      return true;
    }
    return false;
  }

  applyDeltas(deltas: SceneDelta[]): number {
    let n = 0;
    for (const d of deltas) if (this.applyDelta(d)) n += 1;
    return n;
  }

  private hasEdge(source: string, target: string): boolean {
    return this.adj.get(source)?.has(target) ?? false;
  }

  private removeNode(id: string): boolean {
    if (!this.nodes.has(id)) return false;
    this.nodes.delete(id);
    // drop incident edges + adjacency
    this.edges = this.edges.filter((e) => e.source !== id && e.target !== id);
    for (const nbr of this.adj.get(id) ?? []) this.adj.get(nbr)?.delete(id);
    this.adj.delete(id);
    this.treeDirty = true;
    return true;
  }

  private removeEdge(source: string, target: string): boolean {
    const before = this.edges.length;
    this.edges = this.edges.filter(
      (e) =>
        !(
          (e.source === source && e.target === target) ||
          (e.source === target && e.target === source)
        ),
    );
    this.adj.get(source)?.delete(target);
    this.adj.get(target)?.delete(source);
    return this.edges.length !== before;
  }

  get nodeCount(): number {
    return this.nodes.size;
  }

  get edgeCount(): number {
    return this.edges.length;
  }

  node(id: string): SceneNode | undefined {
    return this.nodes.get(id);
  }

  /** All node ids (insertion order) — the handle's nodes()/elements() source. */
  ids(): string[] {
    return [...this.nodes.keys()];
  }

  /** neighbour node ids — the dep-chain BFS primitive (renderer-agnostic). */
  neighbors(id: string): string[] {
    return [...(this.adj.get(id) ?? [])];
  }

  // ── styling state (classes drive shader color/size selection) ───────────────
  addClass(id: string, cls: string): void {
    this.nodes.get(id)?.classes.add(cls);
  }

  removeClass(id: string, cls: string): void {
    this.nodes.get(id)?.classes.delete(cls);
  }

  setPosition(id: string, x: number, y: number): void {
    const n = this.nodes.get(id);
    if (n) {
      n.x = x;
      n.y = y;
      this.treeDirty = true;
    }
  }

  // ── culling ─────────────────────────────────────────────────────────────────
  private rebuildTree(): void {
    const pts: QPoint[] = [];
    this.nodes.forEach((n) => pts.push({ id: n.id, x: n.x, y: n.y }));
    this.tree = Quadtree.fromPoints(pts);
    this.treeDirty = false;
  }

  bounds(): BBox {
    const pts: QPoint[] = [];
    this.nodes.forEach((n) => pts.push({ id: n.id, x: n.x, y: n.y }));
    return boundsOf(pts);
  }

  /** Node ids visible in the camera's viewport (+ cull margin), excluding any
   *  hidden via style("display","none") — parity with the Cytoscape path. */
  visibleNodeIds(camera: Camera, width: number, height: number): string[] {
    if (this.treeDirty || !this.tree) this.rebuildTree();
    const view = marginBox(camera.visibleExtent(width, height));
    const ids = this.tree!.query(view);
    return ids.filter((id) => !this.nodes.get(id)?.classes.has(HIDDEN_CLASS));
  }

  // ── instanced buffer packing ────────────────────────────────────────────────
  /** Pack visible nodes into a flat instance buffer: [cx,cy,r, red,green,blue]×N. */
  packNodes(ids: string[]): Float32Array {
    const buf = new Float32Array(ids.length * NODE_STRIDE);
    let o = 0;
    for (const id of ids) {
      const n = this.nodes.get(id);
      if (n) {
        const [cr, cg, cb] = n.color;
        buf[o] = n.x;
        buf[o + 1] = n.y;
        buf[o + 2] = n.r;
        buf[o + 3] = cr;
        buf[o + 4] = cg;
        buf[o + 5] = cb;
        o += NODE_STRIDE;
      }
    }
    // trim if any id was stale
    return o === buf.length ? buf : buf.subarray(0, o);
  }

  /** Pack edges with at least one visible endpoint: [x1,y1,x2,y2]×E. */
  packEdges(visibleIds: Set<string>): Float32Array {
    const rows: number[] = [];
    for (const e of this.edges) {
      if (visibleIds.has(e.source) || visibleIds.has(e.target)) {
        const a = this.nodes.get(e.source);
        const b = this.nodes.get(e.target);
        if (a && b) rows.push(a.x, a.y, b.x, b.y);
      }
    }
    return new Float32Array(rows);
  }
}

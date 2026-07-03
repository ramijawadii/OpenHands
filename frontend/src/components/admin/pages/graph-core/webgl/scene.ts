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
}

export interface SceneNodeInput {
  id: string;
  x: number;
  y: number;
  r?: number;
  color?: [number, number, number];
  classes?: string[];
}

export interface SceneEdgeInput {
  source: string;
  target: string;
}

const DEFAULT_COLOR: [number, number, number] = [0.6, 0.63, 0.68];
const DEFAULT_R = 12;
/** cull margin (fraction of viewport) so nodes just off-screen stay warm. */
const CULL_MARGIN = 0.15;

/** floats per instance in the packed buffers (kept in sync with the shaders). */
export const NODE_STRIDE = 6; // x,y,r,r_,g_,b_  → cx,cy,radius,red,green,blue
export const EDGE_STRIDE = 4; // x1,y1,x2,y2

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

  get nodeCount(): number {
    return this.nodes.size;
  }

  get edgeCount(): number {
    return this.edges.length;
  }

  node(id: string): SceneNode | undefined {
    return this.nodes.get(id);
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

  /** Node ids visible in the camera's viewport (+ cull margin). */
  visibleNodeIds(camera: Camera, width: number, height: number): string[] {
    if (this.treeDirty || !this.tree) this.rebuildTree();
    const view = marginBox(camera.visibleExtent(width, height));
    return this.tree!.query(view);
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

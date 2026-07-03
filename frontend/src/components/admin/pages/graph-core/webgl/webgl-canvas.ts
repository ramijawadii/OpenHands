/**
 * WebglCanvas (M2 / B4-B5 payoff) — the WebGL implementation of the SAME
 * GraphCanvasHandle contract the CytoscapeCanvas satisfies.
 *
 * It ties the engine together: GraphScene (data + culling + live delta) +
 * WebglRenderer (instanced draw) + PickingIndex (O(1) hit-test) + label LOD. The
 * pages drive it through the identical handle, so `renderer=webgl` is a drop-in
 * swap with ZERO UI change — that's the whole point of the B1 contract.
 *
 * Element identity/styling state lives in the scene (class sets, adjacency), so
 * addClass/removeClass/connectedNodes/filter behave like the Cytoscape path.
 */

import type {
  AnimateTarget,
  BBox,
  CanvasElements,
  ElementCollection,
  ElementHandle,
  ElementQuery,
  GraphCanvasHandle,
} from "../canvas";
import { GraphScene, type SceneDelta } from "./scene";
import { WebglRenderer } from "./renderer";
import { PickingIndex, type RGB } from "./picking";

/* eslint-disable @typescript-eslint/no-use-before-define, class-methods-use-this, @typescript-eslint/no-this-alias -- node/collection handles are mutually recursive (graph-shaped); several handle methods are uniform contract stubs (no per-instance state) */

const EMPTY_BBOX: BBox = { x1: 0, y1: 0, x2: 0, y2: 0, w: 0, h: 0 };

type Handler = (e: unknown) => void;

export class WebglCanvas implements GraphCanvasHandle {
  readonly renderer: WebglRenderer;

  readonly picking = new PickingIndex();

  private readonly scene: GraphScene;

  private handlers = new Map<string, Handler[]>();

  constructor(
    gl: WebGL2RenderingContext | null,
    opts?: { minZoom?: number; maxZoom?: number },
  ) {
    this.renderer = new WebglRenderer(gl, opts);
    this.scene = this.renderer.scene;
  }

  setElements(els: CanvasElements): void {
    this.renderer.setElements(
      els.nodes.map((n) => ({
        id: n.id,
        x: n.position?.x ?? 0,
        y: n.position?.y ?? 0,
        classes: n.classes ? n.classes.split(/\s+/).filter(Boolean) : [],
        data: { kind: n.kind, label: n.label, tier: n.tier, ...n.attrs },
      })),
      els.edges.map((e) => ({ source: e.source, target: e.target })),
    );
    this.picking.assign(els.nodes.map((n) => n.id));
  }

  /** Feed a live WS delta straight into the scene (B5) + keep pick ids stable. */
  applyDelta(delta: SceneDelta): boolean {
    const changed = this.scene.applyDelta(delta);
    if (delta.kind === "node" && delta.op === "upsert")
      this.picking.assign([delta.node.id]);
    return changed;
  }

  /** Resolve a pick-buffer pixel to an element handle (or null for background). */
  pick(rgb: RGB): ElementHandle | null {
    const id = this.picking.idAt(rgb);
    return id ? this.nodeHandle(id) : null;
  }

  render(): void {
    this.renderer.render();
  }

  // ── GraphCanvasHandle: lifecycle ─────────────────────────────────────────────
  ready(fn: () => void): void {
    fn();
  }

  resize(): void {
    /* size is driven via the React wrapper's ResizeObserver → renderer.resize */
  }

  destroy(): void {
    this.renderer.destroy();
    this.handlers.clear();
  }

  stop(): void {
    /* no running animation loop to cancel in the headless/handle layer */
  }

  // ── camera ───────────────────────────────────────────────────────────────────
  zoom(): number;
  zoom(level: number): void;
  zoom(level?: number): number | void {
    if (level === undefined) return this.renderer.camera.zoom;
    this.renderer.camera.setZoom(level);
    return undefined;
  }

  pan(): { x: number; y: number };
  pan(p: { x: number; y: number }): void;
  pan(p?: { x: number; y: number }): { x: number; y: number } | void {
    if (p === undefined) return { ...this.renderer.camera.pan };
    this.renderer.camera.pan = { ...p };
    return undefined;
  }

  panBy(delta: { x: number; y: number }): void {
    this.renderer.camera.panBy(delta);
  }

  fit(_eles?: ElementQuery, padding = 40): void {
    this.renderer.camera.fit(
      this.scene.bounds(),
      this.width(),
      this.height(),
      padding,
    );
  }

  extent(): BBox {
    return this.renderer.camera.visibleExtent(this.width(), this.height());
  }

  width(): number {
    return this.renderer.viewportWidth;
  }

  height(): number {
    return this.renderer.viewportHeight;
  }

  animate(target: AnimateTarget): void {
    // no tween in the handle layer — apply the end-state immediately (the React
    // wrapper owns rAF); keeps the contract's semantics (camera reaches target).
    if (target.zoom !== undefined) this.renderer.camera.setZoom(target.zoom);
    if (target.pan) this.renderer.camera.pan = { ...target.pan };
    if (target.fit) this.fit(target.fit.eles, target.fit.padding);
  }

  // ── element access ───────────────────────────────────────────────────────────
  batch(fn: () => void): void {
    fn();
  }

  getElementById(id: string): ElementHandle {
    return this.nodeHandle(id);
  }

  elements(): ElementCollection {
    return this.collection(this.allNodeIds());
  }

  nodes(): ElementCollection {
    return this.collection(this.allNodeIds());
  }

  edges(): ElementCollection {
    return this.collection([]); // edges are not individually handle-addressed here
  }

  // ── structure + layout ───────────────────────────────────────────────────────
  layout(): { run(): void } {
    // WebGL consumes precomputed positions (from the engine / compute LOD); a
    // layout run is a no-op placeholder so the contract call site is uniform.
    return { run: () => {} };
  }

  add(elements: CanvasElements): void {
    for (const n of elements.nodes) {
      this.applyDelta({
        kind: "node",
        op: "upsert",
        node: {
          id: n.id,
          x: n.position?.x ?? 0,
          y: n.position?.y ?? 0,
          data: { kind: n.kind, label: n.label },
        },
      });
    }
    for (const e of elements.edges) {
      this.applyDelta({
        kind: "edge",
        op: "upsert",
        edge: { source: e.source, target: e.target },
      });
    }
  }

  remove(sel: ElementQuery): void {
    // supports "#id" removal (the only structural remove the pages issue)
    if (typeof sel === "string" && sel.startsWith("#")) {
      this.applyDelta({ kind: "node", op: "tombstone", id: sel.slice(1) });
    }
  }

  // ── events ───────────────────────────────────────────────────────────────────
  on(
    event: string,
    selectorOrHandler: string | Handler,
    handler?: Handler,
  ): void {
    const fn = (handler ?? selectorOrHandler) as Handler;
    const list = this.handlers.get(event) ?? [];
    list.push(fn);
    this.handlers.set(event, list);
  }

  /** Dispatch an event the React wrapper resolved (e.g. from a GPU pick). */
  emit(event: string, payload: unknown): void {
    for (const fn of this.handlers.get(event) ?? []) fn(payload);
  }

  // ── internals ────────────────────────────────────────────────────────────────
  private allNodeIds(): string[] {
    return this.scene.ids();
  }

  private nodeHandle(id: string): ElementHandle {
    const { scene } = this;
    const self = this;
    return {
      id: () => id,
      isNode: () => scene.node(id) !== undefined,
      isEdge: () => false,
      data: <T = unknown>(key?: string) => {
        const d = scene.node(id)?.data ?? {};
        return (key === undefined ? d : d[key]) as T;
      },
      position: () => {
        const n = scene.node(id);
        return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
      },
      boundingBox: () => EMPTY_BBOX,
      addClass: (cls: string) => {
        scene.addClass(id, cls);
        return self.nodeHandle(id);
      },
      removeClass: (cls: string) => {
        scene.removeClass(id, cls);
        return self.nodeHandle(id);
      },
      hasClass: (cls: string) => scene.node(id)?.classes.has(cls) ?? false,
      connectedEdges: () => self.collection([]),
      connectedNodes: () => self.collection(scene.neighbors(id)),
    };
  }

  private collection(ids: string[]): ElementCollection {
    const self = this;
    const handles = () => ids.map((id) => self.nodeHandle(id));
    const col: ElementCollection = {
      get length() {
        return ids.length;
      },
      forEach: (fn) => handles().forEach((h, i) => fn(h, i)),
      filter: (sel) =>
        self.collection(
          typeof sel === "function"
            ? ids.filter((id) =>
                (sel as (e: ElementHandle) => boolean)(self.nodeHandle(id)),
              )
            : ids,
        ),
      nodes: () => self.collection(ids),
      edges: () => self.collection([]),
      addClass: (cls: string) => {
        for (const id of ids) self.scene.addClass(id, cls);
        return col;
      },
      removeClass: (cls: string) => {
        for (const id of ids) self.scene.removeClass(id, cls);
        return col;
      },
      boundingBox: () => EMPTY_BBOX,
      outgoers: () =>
        self.collection(ids.flatMap((id) => self.scene.neighbors(id))),
      incomers: () =>
        self.collection(ids.flatMap((id) => self.scene.neighbors(id))),
      union: (other) =>
        self.collection([...new Set([...ids, ...other.map((h) => h.id())])]),
      map: <T>(fn: (el: ElementHandle) => T) => handles().map(fn),
    };
    return col;
  }
}

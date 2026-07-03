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
import { GraphScene, HIDDEN_CLASS, type SceneDelta } from "./scene";
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

  /**
   * Resolve a SCREEN-space pointer to the node under it (or null). CPU fallback
   * used until the GPU pick FBO is wired: converts to world space and returns the
   * nearest node whose radius covers the point. Tenant-scoped (only this scene).
   */
  pickAt(screenX: number, screenY: number): ElementHandle | null {
    const w = this.renderer.camera.screenToWorld({ x: screenX, y: screenY });
    let best: string | null = null;
    let bestD = Infinity;
    for (const id of this.scene.ids()) {
      const n = this.scene.node(id);
      if (!n) continue; // eslint-disable-line no-continue -- skip stale id
      const dx = n.x - w.x;
      const dy = n.y - w.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= n.r * n.r && d2 < bestD) {
        bestD = d2;
        best = id;
      }
    }
    return best ? this.nodeHandle(best) : null;
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
      get length() {
        return scene.node(id) ? 1 : 0;
      },
      id: () => id,
      isNode: () => scene.node(id) !== undefined,
      isEdge: () => false,
      visible: () => {
        const n = scene.node(id);
        return !!n && !n.classes.has(HIDDEN_CLASS);
      },
      data: <T = unknown>(key?: string) => {
        const d = scene.node(id)?.data ?? {};
        return (key === undefined ? d : d[key]) as T;
      },
      position: () => {
        const n = scene.node(id);
        return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
      },
      renderedPosition: () => {
        const n = scene.node(id);
        return n
          ? self.renderer.camera.worldToScreen({ x: n.x, y: n.y })
          : { x: 0, y: 0 };
      },
      renderedHeight: () => {
        const n = scene.node(id);
        return n ? n.r * 2 * self.renderer.camera.zoom : 0;
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
      style: (name: string, value: string) => {
        self.styleNode(id, name, value);
        return self.nodeHandle(id);
      },
      connectedEdges: () => self.collection([]),
      connectedNodes: () => self.collection(scene.neighbors(id)),
      outgoers: () => self.collection(scene.outNeighbors(id)),
      incomers: () => self.collection(scene.inNeighbors(id)),
      successors: () => self.collection(scene.successors(id)),
      predecessors: () => self.collection(scene.predecessors(id)),
      // edges aren't individually handle-addressed in the WebGL scene yet, so
      // source()/target() (called only on EDGE handles) return self — never hit
      // on the node handles the WebGL path exercises.
      source: () => self.nodeHandle(id),
      target: () => self.nodeHandle(id),
    };
  }

  /** Map an inline style to the scene. Only "display" is meaningful to the WebGL
   *  renderer (visibility); other props are Cytoscape stylesheet concerns and are
   *  no-ops here (styling is class/shader-driven). */
  private styleNode(id: string, name: string, value: string): void {
    if (name === "display") {
      if (value === "none") this.scene.addClass(id, HIDDEN_CLASS);
      else this.scene.removeClass(id, HIDDEN_CLASS);
    }
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
      style: (name: string, value: string) => {
        for (const id of ids) self.styleNode(id, name, value);
        return col;
      },
      remove: () => {
        for (const id of ids)
          self.applyDelta({ kind: "node", op: "tombstone", id });
        return col;
      },
      layout: () => ({ run: () => {} }), // WebGL uses precomputed positions
      outgoers: () =>
        self.collection(ids.flatMap((id) => self.scene.outNeighbors(id))),
      incomers: () =>
        self.collection(ids.flatMap((id) => self.scene.inNeighbors(id))),
      successors: () =>
        self.collection([
          ...new Set(ids.flatMap((id) => self.scene.successors(id))),
        ]),
      predecessors: () =>
        self.collection([
          ...new Set(ids.flatMap((id) => self.scene.predecessors(id))),
        ]),
      contains: (el: ElementHandle) => ids.includes(el.id()),
      union: (other) =>
        self.collection([...new Set([...ids, ...other.map((h) => h.id())])]),
      map: <T>(fn: (el: ElementHandle) => T) => handles().map(fn),
    };
    return col;
  }
}

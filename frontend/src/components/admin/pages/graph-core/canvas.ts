/**
 * GraphCanvas contract (M2 / B1) — the stable seam between the analyst UI and
 * the graph RENDERER.
 *
 * Today both graphs (impact-analysis.tsx, identity.tsx) call the Cytoscape
 * instance (`cy`) directly. That couples the whole UI to one renderer. This file
 * formalises EXACTLY what those pages need from a renderer into a renderer-
 * agnostic interface, so a WebGL2 engine (B2+) can implement the same surface
 * and the pages swap renderer behind a feature flag with ZERO UI change.
 *
 * Scope discipline: this is a *contract*, extracted from the real `cy.*` usage
 * catalogued from the two pages (zoom/pan/fit/panBy/animate/extent/width/height/
 * resize/stop/ready/destroy/batch/layout/on + getElementById/nodes/edges/
 * elements and the element-collection ops addClass/removeClass/position/data/
 * boundingBox/:visible). No behaviour changes here — it is the frozen boundary
 * that makes the renderer swap possible and keeps Layer 6 (UI/UX) untouched.
 */

import type { EdgeKind, GraphNodeInput } from "./model";

// ── camera / viewport ────────────────────────────────────────────────────────
export interface Viewport {
  /** current zoom (Cytoscape-compatible scalar; 1 = 1:1) */
  zoom: number;
  /** current pan in rendered pixels */
  pan: { x: number; y: number };
}

/** Model-space bounding box (Cytoscape `extent()` / collection `boundingBox()`). */
export interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  h: number;
}

/** An animation target — matches the subset of Cytoscape `animate()` we use. */
export interface AnimateTarget {
  zoom?: number;
  pan?: { x: number; y: number };
  /** fit to a collection/all with padding (Cytoscape `fit` animation form) */
  fit?: { padding?: number; eles?: ElementQuery };
}

export interface AnimateOpts {
  duration?: number;
  easing?: string;
}

// ── element handles (renderer-agnostic) ──────────────────────────────────────
/** A CSS-like selector string or a concrete element/collection the pages pass. */
export type ElementQuery = string | undefined;

/** One node/edge as the renderer exposes it back to the page (read side). */
export interface ElementHandle {
  id(): string;
  isNode(): boolean;
  isEdge(): boolean;
  data<T = unknown>(key?: string): T;
  position(): { x: number; y: number };
  boundingBox(): BBox;
  addClass(cls: string): ElementHandle;
  removeClass(cls: string): ElementHandle;
  hasClass(cls: string): boolean;
  /** neighborhood step used by the dependency-chain BFS in the pages */
  connectedEdges(sel?: ElementQuery): ElementCollection;
  connectedNodes(sel?: ElementQuery): ElementCollection;
}

/** A collection supporting the fluent ops the pages use on `cy.nodes()` etc. */
export interface ElementCollection {
  length: number;
  forEach(fn: (el: ElementHandle, i: number) => void): void;
  filter(
    sel: ElementQuery | ((el: ElementHandle) => boolean),
  ): ElementCollection;
  nodes(sel?: ElementQuery): ElementCollection;
  edges(sel?: ElementQuery): ElementCollection;
  addClass(cls: string): ElementCollection;
  removeClass(cls: string): ElementCollection;
  boundingBox(): BBox;
  /** BFS one hop out — powers directional dep-chain expansion */
  outgoers(sel?: ElementQuery): ElementCollection;
  incomers(sel?: ElementQuery): ElementCollection;
  union(other: ElementCollection): ElementCollection;
  map<T>(fn: (el: ElementHandle) => T): T[];
}

// ── events (the 7 the pages subscribe to) ────────────────────────────────────
export interface CanvasPointerEvent {
  target: ElementHandle | null; // null = background
  /** rendered-position of the pointer, for tooltip/context-menu placement */
  renderedPosition: { x: number; y: number };
  originalEvent?: MouseEvent;
}

export interface GraphCanvasEvents {
  onNodeTap?(e: CanvasPointerEvent): void;
  onBackgroundTap?(e: CanvasPointerEvent): void;
  onNodeMouseOver?(e: CanvasPointerEvent): void;
  onNodeMouseOut?(e: CanvasPointerEvent): void;
  onNodeContext?(e: CanvasPointerEvent): void; // cxttap
  /** pan+zoom changed — drives the minimap + zoom readout */
  onViewportChange?(v: Viewport): void;
  onLayoutStop?(): void;
}

// ── layout ───────────────────────────────────────────────────────────────────
/** The layouts the pages request (fcose for the estate, preset for pinned). */
export interface LayoutSpec {
  name: "fcose" | "preset" | "concentric" | "breadthfirst" | "grid";
  animate?: boolean;
  animationDuration?: number;
  fit?: boolean;
  padding?: number;
  /** eles to lay out (a subset — used when expanding a dep-chain) */
  eles?: ElementQuery;
  /** free-form per-layout options passed straight through */
  options?: Record<string, unknown>;
}

// ── the imperative handle (what the pages hold and drive) ─────────────────────
/**
 * Everything the pages currently reach for on `cy`. A renderer is conformant iff
 * it implements this. `CytoscapeCanvas` wraps a real `cy`; `WebglCanvas` (B2)
 * implements the same surface over WebGL2 + the compute LOD tiles.
 */
export interface GraphCanvasHandle {
  // lifecycle
  ready(fn: () => void): void;
  resize(): void;
  destroy(): void;
  stop(): void;

  // camera
  zoom(): number;
  zoom(level: number): void;
  pan(): { x: number; y: number };
  pan(p: { x: number; y: number }): void;
  panBy(delta: { x: number; y: number }): void;
  fit(eles?: ElementQuery, padding?: number): void;
  extent(): BBox;
  width(): number;
  height(): number;
  animate(target: AnimateTarget, opts?: AnimateOpts): void;

  // element access + mutation
  batch(fn: () => void): void;
  getElementById(id: string): ElementHandle;
  elements(sel?: ElementQuery): ElementCollection;
  nodes(sel?: ElementQuery): ElementCollection;
  edges(sel?: ElementQuery): ElementCollection;

  // structure + layout
  layout(spec: LayoutSpec): { run(): void };
  add(elements: CanvasElements): void;
  remove(sel: ElementQuery): void;

  // events
  on(
    event: string,
    selectorOrHandler: string | ((e: unknown) => void),
    handler?: (e: unknown) => void,
  ): void;
}

// ── data the page hands the renderer at mount ────────────────────────────────
export interface CanvasNode extends GraphNodeInput {
  /** optional preset position (pinned/locked views) */
  position?: { x: number; y: number };
  /** initial classes (severity, spotlight, …) */
  classes?: string;
}

export interface CanvasEdge {
  id?: string;
  source: string;
  target: string;
  kind?: EdgeKind;
  confidence?: number;
  provenance?: string;
  classes?: string;
}

export interface CanvasElements {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

/** Props the React `<GraphCanvas>` wrapper accepts — a superset stays stable so
 *  the page JSX never changes when the renderer swaps. */
export interface GraphCanvasProps extends GraphCanvasEvents {
  elements: CanvasElements;
  /** styling stylesheet (Cytoscape-shaped today; renderer maps as needed) */
  stylesheet?: unknown;
  layout?: LayoutSpec;
  minZoom?: number;
  maxZoom?: number;
  /** explicit renderer override; otherwise resolved by selectRenderer() */
  renderer?: RendererKind;
  /** imperative handle escape hatch (pages drive the canvas through this) */
  onReady?(handle: GraphCanvasHandle): void;
  className?: string;
  style?: React.CSSProperties;
}

// ── renderer selection (capability detection + feature flag) ──────────────────
export type RendererKind = "cytoscape" | "webgl";

export interface RendererCapabilities {
  /** WebGL2 context obtainable in this browser */
  webgl2: boolean;
  /** approximate element count for this graph (drives the auto threshold) */
  elementCount: number;
}

/** Above this element count we prefer WebGL (Cytoscape SVG/canvas struggles). */
export const WEBGL_ELEMENT_THRESHOLD = 4000;

/**
 * Resolve the renderer. Order of authority:
 *   1. an explicit `override` (feature flag `graph.renderer` / prop),
 *   2. capability (no WebGL2 → always Cytoscape fallback),
 *   3. scale heuristic (large graphs → WebGL).
 * Small graphs stay on Cytoscape (proven, rich styling) — the WebGL engine is
 * the scale path, not a wholesale replacement.
 */
export function selectRenderer(
  caps: RendererCapabilities,
  override?: RendererKind | null,
): RendererKind {
  if (override === "cytoscape" || override === "webgl") return override;
  if (!caps.webgl2) return "cytoscape"; // hard fallback
  return caps.elementCount >= WEBGL_ELEMENT_THRESHOLD ? "webgl" : "cytoscape";
}

/** Feature-flag reader — `graph.renderer=webgl|cytoscape` via localStorage/env,
 *  so the swap is dark-launchable and instantly revertible. */
export function rendererFlag(): RendererKind | null {
  try {
    const v =
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("graph.renderer")) ||
      (typeof process !== "undefined" && process.env?.GRAPH_RENDERER) ||
      null;
    return v === "webgl" || v === "cytoscape" ? v : null;
  } catch {
    return null;
  }
}

/** Detect renderer capabilities in the current environment. */
export function detectCapabilities(elementCount: number): RendererCapabilities {
  let webgl2 = false;
  try {
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      webgl2 = !!c.getContext("webgl2");
    }
  } catch {
    webgl2 = false;
  }
  return { webgl2, elementCount };
}

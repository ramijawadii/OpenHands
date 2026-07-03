/**
 * CytoscapeCanvas (M2 / B2 prep) — the reference implementation of the
 * GraphCanvasHandle contract, backed by a real Cytoscape instance.
 *
 * Purpose:
 *  1. Prove the B1 contract wraps the CURRENT renderer 1:1 (if the pages can be
 *     driven through this handle, the contract is complete and correct).
 *  2. Be the permanent Cytoscape FALLBACK path (small graphs / no-WebGL) that
 *     `selectRenderer()` chooses — so the WebGL engine is purely additive.
 *
 * It is a thin delegation layer: Cytoscape's own API already matches most of the
 * contract, so this mostly wraps `cy` collections/singulars into our
 * ElementCollection / ElementHandle so nothing above the seam imports cytoscape.
 */

import type {
  AnimateOpts,
  AnimateTarget,
  BBox,
  CanvasElements,
  ElementCollection,
  ElementHandle,
  ElementQuery,
  GraphCanvasHandle,
  LayoutSpec,
} from "./canvas";

// The concrete cytoscape core/collection/singular types are `any` at this seam
// (cytoscape's own types are structural and noisy); the contract above is the
// real type boundary everything else depends on. wrapEl/wrapCol are mutually
// recursive (a node wraps its edge collection and vice-versa) — the seam is
// inherently graph-shaped, so the use-before-define is intentional.
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-use-before-define */
type CyCore = any;
type CyCollection = any;
type CySingular = any;

function toBBox(b: any): BBox {
  return { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, w: b.w, h: b.h };
}

function wrapEl(el: CySingular): ElementHandle {
  return {
    id: () => el.id(),
    isNode: () => el.isNode(),
    isEdge: () => el.isEdge(),
    data: <T = unknown>(key?: string) =>
      (key === undefined ? el.data() : el.data(key)) as T,
    position: () => ({ ...el.position() }),
    boundingBox: () => toBBox(el.boundingBox()),
    addClass: (cls: string) => {
      el.addClass(cls);
      return wrapEl(el);
    },
    removeClass: (cls: string) => {
      el.removeClass(cls);
      return wrapEl(el);
    },
    hasClass: (cls: string) => el.hasClass(cls),
    connectedEdges: (sel?: ElementQuery) => wrapCol(el.connectedEdges(sel)),
    // works on a node (neighbour nodes) OR an edge (its endpoints); cytoscape
    // only exposes connectedNodes() on edge collections, so route via neighborhood.
    connectedNodes: (sel?: ElementQuery) =>
      wrapCol(el.neighborhood(sel).nodes()),
  };
}

function wrapCol(col: CyCollection): ElementCollection {
  return {
    get length() {
      return col.length;
    },
    forEach: (fn) =>
      col.forEach((el: CySingular, i: number) => fn(wrapEl(el), i)),
    filter: (sel) =>
      wrapCol(
        typeof sel === "function"
          ? col.filter((el: CySingular) =>
              (sel as (e: ElementHandle) => boolean)(wrapEl(el)),
            )
          : col.filter(sel ?? "*"),
      ),
    nodes: (sel?: ElementQuery) => wrapCol(col.nodes(sel)),
    edges: (sel?: ElementQuery) => wrapCol(col.edges(sel)),
    addClass: (cls: string) => {
      col.addClass(cls);
      return wrapCol(col);
    },
    removeClass: (cls: string) => {
      col.removeClass(cls);
      return wrapCol(col);
    },
    boundingBox: () => toBBox(col.boundingBox()),
    outgoers: (sel?: ElementQuery) => wrapCol(col.outgoers(sel)),
    incomers: (sel?: ElementQuery) => wrapCol(col.incomers(sel)),
    union: (other: ElementCollection) =>
      wrapCol(col.union((other as any).__cy ?? col)),
    map: <T>(fn: (el: ElementHandle) => T) =>
      col.map((el: CySingular) => fn(wrapEl(el))),
    // stash the raw collection so union() across wrapped collections works
    __cy: col,
  } as ElementCollection & { __cy: CyCollection };
}

/** Wrap a live cytoscape core as a GraphCanvasHandle. */
export function cytoscapeCanvas(cy: CyCore): GraphCanvasHandle {
  return {
    // lifecycle
    ready: (fn) => cy.ready(fn),
    resize: () => cy.resize(),
    destroy: () => cy.destroy(),
    stop: () => cy.stop(),

    // camera (overloaded getter/setter, mirrors cytoscape)
    zoom: ((level?: number) =>
      level === undefined
        ? cy.zoom()
        : cy.zoom(level)) as GraphCanvasHandle["zoom"],
    pan: ((p?: { x: number; y: number }) =>
      p === undefined
        ? { ...cy.pan() }
        : cy.pan(p)) as GraphCanvasHandle["pan"],
    panBy: (delta) => cy.panBy(delta),
    fit: (eles?: ElementQuery, padding?: number) =>
      cy.fit(eles ? cy.$(eles) : undefined, padding),
    extent: () => toBBox(cy.extent()),
    width: () => cy.width(),
    height: () => cy.height(),
    animate: (target: AnimateTarget, opts?: AnimateOpts) => {
      const t: any = { ...target };
      if (target.fit)
        t.fit = {
          eles: target.fit.eles ? cy.$(target.fit.eles) : cy.elements(),
          padding: target.fit.padding,
        };
      cy.animate(t, opts ?? {});
    },

    // element access
    batch: (fn) => cy.batch(fn),
    getElementById: (id: string) => wrapEl(cy.getElementById(id)),
    elements: (sel?: ElementQuery) => wrapCol(cy.elements(sel)),
    nodes: (sel?: ElementQuery) => wrapCol(cy.nodes(sel)),
    edges: (sel?: ElementQuery) => wrapCol(cy.edges(sel)),

    // structure + layout
    layout: (spec: LayoutSpec) => {
      const eles = spec.eles ? cy.$(spec.eles) : cy;
      return eles.layout({
        name: spec.name,
        animate: spec.animate,
        animationDuration: spec.animationDuration,
        fit: spec.fit,
        padding: spec.padding,
        ...(spec.options ?? {}),
      });
    },
    add: (elements: CanvasElements) => {
      cy.add([
        ...elements.nodes.map((n) => ({
          group: "nodes" as const,
          data: {
            id: n.id,
            kind: n.kind,
            label: n.label,
            tier: n.tier,
            ...n.attrs,
          },
          position: n.position,
          classes: n.classes,
        })),
        ...elements.edges.map((e) => ({
          group: "edges" as const,
          data: {
            id: e.id ?? `${e.source}->${e.target}`,
            source: e.source,
            target: e.target,
            kind: e.kind,
            confidence: e.confidence,
            provenance: e.provenance,
          },
          classes: e.classes,
        })),
      ]);
    },
    remove: (sel: ElementQuery) => cy.remove(sel ? cy.$(sel) : cy.elements()),

    // events
    on: (event: string, selectorOrHandler: any, handler?: any) =>
      handler
        ? cy.on(event, selectorOrHandler, handler)
        : cy.on(event, selectorOrHandler),
  };
}

/**
 * createGraphHandle — the imperative factory the pages use to obtain a renderer
 * WITHOUT a JSX rewrite. Drop-in for an inline `cytoscape({...})` call: it returns
 * a `GraphCanvasHandle`, resolving the renderer from the `graph.renderer` flag →
 * WebGL2 capability → scale, DEFAULTING to Cytoscape so behaviour is unchanged.
 *
 *   const cy = createGraphHandle(container, cytoscapeOptions);  // was cytoscape({...})
 *
 * Cytoscape path: creates a real cy with the page's exact options and wraps it —
 * every `cy.*` the page makes runs through the (contract-complete) adapter, and
 * event targets are raw cy elements, so nothing changes.
 * WebGL path (behind the flag): mounts a <canvas>, drives an rAF loop +
 * pointer→pick→emit so the same page code drives the WebGL engine.
 */

import cytoscape from "cytoscape";
import type { GraphCanvasHandle, RendererKind } from "./canvas";
import { detectCapabilities, rendererFlag, selectRenderer } from "./canvas";
import { cytoscapeCanvas } from "./cytoscape-canvas";
import { WebglCanvas } from "./webgl/webgl-canvas";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-use-before-define -- cytoscape options are structural; mountWebglHandle is a helper defined below the factory */
type CyOptions = {
  container?: HTMLElement;
  elements?: any[];
  minZoom?: number;
  maxZoom?: number;
} & Record<string, unknown>;

export interface GraphHandleOptions {
  renderer?: RendererKind | null;
}

export function createGraphHandle(
  container: HTMLElement,
  cyOptions: CyOptions,
  opts: GraphHandleOptions = {},
): GraphCanvasHandle {
  const count = cyOptions.elements?.length ?? 0;
  const kind = selectRenderer(
    detectCapabilities(count),
    opts.renderer ?? rendererFlag(),
  );
  if (kind === "webgl") {
    return mountWebglHandle(container, cyOptions);
  }
  const cy = (cytoscape as unknown as (o: unknown) => unknown)({
    ...cyOptions,
    container,
  });
  return cytoscapeCanvas(cy);
}

// ── WebGL path ────────────────────────────────────────────────────────────────
function mountWebglHandle(
  container: HTMLElement,
  cyOptions: CyOptions,
): GraphCanvasHandle {
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  container.appendChild(canvas);

  const gl = canvas.getContext("webgl2");
  const cv = new WebglCanvas(gl, {
    minZoom: cyOptions.minZoom,
    maxZoom: cyOptions.maxZoom,
  });

  // convert cytoscape-shaped elements → CanvasElements
  const raw = cyOptions.elements ?? [];
  const nodes: any[] = [];
  const edges: any[] = [];
  for (const el of raw) {
    const d = el.data ?? {};
    if (d.source && d.target) {
      edges.push({ source: d.source, target: d.target, kind: d.kind });
    } else if (d.id) {
      nodes.push({
        id: d.id,
        kind: d.kind,
        label: d.label,
        tier: d.tier,
        attrs: d,
        position: el.position,
      });
    }
  }
  cv.setElements({ nodes, edges });

  const size = () => {
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    canvas.width = w;
    canvas.height = h;
    cv.renderer.resize(w, h);
  };
  size();
  cv.renderer.camera.fit(
    cv.renderer.scene.bounds(),
    cv.renderer.viewportWidth,
    cv.renderer.viewportHeight,
    40,
  );
  const ro =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(size) : null;
  ro?.observe(container);

  // pointer → CPU pick → emit the events the page subscribed to via cy.on
  const rectOf = () => canvas.getBoundingClientRect();
  const emitAt = (event: string, e: MouseEvent) => {
    const r = rectOf();
    const hit = cv.pickAt(e.clientX - r.left, e.clientY - r.top);
    cv.emit(event, {
      target: hit,
      renderedPosition: { x: e.clientX - r.left, y: e.clientY - r.top },
      originalEvent: e,
    });
  };
  canvas.addEventListener("click", (e) => emitAt("tap", e));
  canvas.addEventListener("mousemove", (e) => emitAt("mouseover", e));
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    emitAt("cxttap", e);
  });

  let raf = 0;
  const tick = () => {
    cv.render();
    raf =
      typeof requestAnimationFrame !== "undefined"
        ? requestAnimationFrame(tick)
        : 0;
  };
  tick();

  // wrap destroy so the rAF loop + observer are torn down with the handle
  const baseDestroy = cv.destroy.bind(cv);
  cv.destroy = () => {
    if (raf) cancelAnimationFrame(raf);
    ro?.disconnect();
    canvas.remove();
    baseDestroy();
  };
  return cv;
}

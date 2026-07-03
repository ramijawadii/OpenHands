/**
 * <GraphCanvas> (M2 — render-engine mount vehicle).
 *
 * The single React component the pages mount. It resolves the renderer
 * (feature flag → capability → scale) and mounts EITHER the WebGL engine or the
 * Cytoscape fallback, then hands the page a `GraphCanvasHandle` via `onReady`.
 * Because both renderers implement the identical handle, the page code above is
 * renderer-agnostic — swapping to WebGL is invisible to it (UI frozen).
 *
 *  - WebGL path: owns the <canvas>, rAF render loop, ResizeObserver, and pointer
 *    → CPU-pick → event dispatch (tap/hover/context, wheel-zoom, drag-pan).
 *  - Cytoscape path: mounts a real cy with the page's stylesheet/layout and wraps
 *    it via `cytoscapeCanvas` — the proven small-graph / no-WebGL renderer.
 */

/* eslint-disable no-param-reassign, @typescript-eslint/no-use-before-define -- handleRef.current is the standard React imperative-handle sink; mountWebgl/mountCytoscape are declared below the component that keys off them */
import * as React from "react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import type {
  GraphCanvasHandle,
  GraphCanvasProps,
  RendererKind,
} from "./canvas";
import { detectCapabilities, rendererFlag, selectRenderer } from "./canvas";
import { cytoscapeCanvas } from "./cytoscape-canvas";
import { WebglCanvas } from "./webgl/webgl-canvas";

let fcoseRegistered = false;
function ensureFcose(): void {
  if (!fcoseRegistered) {
    try {
      (cytoscape as unknown as { use: (ext: unknown) => void }).use(fcose);
    } catch {
      /* already registered */
    }
    fcoseRegistered = true;
  }
}

function resolveRenderer(count: number, override?: RendererKind): RendererKind {
  return selectRenderer(detectCapabilities(count), override ?? rendererFlag());
}

export function GraphCanvas(props: GraphCanvasProps): React.ReactElement {
  const { elements, renderer, className, style } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = React.useRef<GraphCanvasHandle | null>(null);

  const count = elements.nodes.length + elements.edges.length;
  const kind = resolveRenderer(count, renderer);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    if (kind === "webgl") {
      return mountWebgl(host, props, handleRef);
    }
    return mountCytoscape(host, props, handleRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount lifecycle keyed by renderer kind
  }, [kind]);

  // keep the label the page can read for diagnostics; no visual effect.
  return (
    <div
      ref={hostRef}
      className={className}
      data-renderer={kind}
      style={{ position: "relative", width: "100%", height: "100%", ...style }}
    />
  );
}

// ── WebGL mount ────────────────────────────────────────────────────────────────
function mountWebgl(
  host: HTMLDivElement,
  props: GraphCanvasProps,
  handleRef: React.MutableRefObject<GraphCanvasHandle | null>,
): () => void {
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  host.appendChild(canvas);

  const gl = canvas.getContext("webgl2");
  const cv = new WebglCanvas(gl, {
    minZoom: props.minZoom,
    maxZoom: props.maxZoom,
  });
  cv.setElements(props.elements);
  handleRef.current = cv;

  const sizeToHost = () => {
    const w = host.clientWidth || 800;
    const h = host.clientHeight || 600;
    canvas.width = w;
    canvas.height = h;
    cv.renderer.resize(w, h);
  };
  sizeToHost();
  cv.renderer.camera.fit(
    cv.renderer.scene.bounds(),
    cv.renderer.viewportWidth,
    cv.renderer.viewportHeight,
    40,
  );

  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(sizeToHost)
      : null;
  ro?.observe(host);

  // ── pointer interactions ──
  let dragging = false;
  let last = { x: 0, y: 0 };
  const rectOf = () => canvas.getBoundingClientRect();

  const onMove = (e: MouseEvent) => {
    const r = rectOf();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    if (dragging) {
      cv.renderer.camera.panBy({ x: sx - last.x, y: sy - last.y });
      last = { x: sx, y: sy };
      return;
    }
    const hit = cv.pickAt(sx, sy);
    if (hit)
      props.onNodeMouseOver?.({
        target: hit,
        renderedPosition: { x: sx, y: sy },
        originalEvent: e,
      });
    else
      props.onNodeMouseOut?.({
        target: null,
        renderedPosition: { x: sx, y: sy },
        originalEvent: e,
      });
  };
  const onDown = (e: MouseEvent) => {
    dragging = true;
    const r = rectOf();
    last = { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onUp = (e: MouseEvent) => {
    const wasDrag = dragging;
    dragging = false;
    if (wasDrag && (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2))
      return;
    const r = rectOf();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const hit = cv.pickAt(sx, sy);
    if (hit)
      props.onNodeTap?.({
        target: hit,
        renderedPosition: { x: sx, y: sy },
        originalEvent: e,
      });
    else
      props.onBackgroundTap?.({
        target: null,
        renderedPosition: { x: sx, y: sy },
        originalEvent: e,
      });
  };
  const onCtx = (e: MouseEvent) => {
    e.preventDefault();
    const r = rectOf();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const hit = cv.pickAt(sx, sy);
    if (hit)
      props.onNodeContext?.({
        target: hit,
        renderedPosition: { x: sx, y: sy },
        originalEvent: e,
      });
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = rectOf();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    cv.renderer.camera.zoomAt(
      { x: e.clientX - r.left, y: e.clientY - r.top },
      cv.renderer.camera.zoom * factor,
    );
    props.onViewportChange?.({
      zoom: cv.renderer.camera.zoom,
      pan: { ...cv.renderer.camera.pan },
    });
  };

  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("mouseup", onUp);
  canvas.addEventListener("contextmenu", onCtx);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  // ── rAF render loop ──
  let raf = 0;
  const tick = () => {
    cv.render();
    raf =
      typeof requestAnimationFrame !== "undefined"
        ? requestAnimationFrame(tick)
        : 0;
  };
  tick();

  props.onReady?.(cv);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    ro?.disconnect();
    canvas.removeEventListener("mousemove", onMove);
    canvas.removeEventListener("mousedown", onDown);
    canvas.removeEventListener("mouseup", onUp);
    canvas.removeEventListener("contextmenu", onCtx);
    canvas.removeEventListener("wheel", onWheel);
    cv.destroy();
    canvas.remove();
    handleRef.current = null;
  };
}

// ── Cytoscape mount (fallback) ─────────────────────────────────────────────────
function mountCytoscape(
  host: HTMLDivElement,
  props: GraphCanvasProps,
  handleRef: React.MutableRefObject<GraphCanvasHandle | null>,
): () => void {
  ensureFcose();
  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100%";
  host.appendChild(container);

  type CyCore = {
    on: (ev: string, sel: string, fn: (e: unknown) => void) => void;
    destroy: () => void;
  };
  let cy: CyCore | null = null;
  try {
    cy = (cytoscape as unknown as (opts: unknown) => CyCore)({
      container,
      elements: [
        ...props.elements.nodes.map((n) => ({
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
        ...props.elements.edges.map((e) => ({
          data: {
            id: e.id ?? `${e.source}->${e.target}`,
            source: e.source,
            target: e.target,
            kind: e.kind,
          },
          classes: e.classes,
        })),
      ],
      style: props.stylesheet as never,
      minZoom: props.minZoom,
      maxZoom: props.maxZoom,
      layout: props.layout
        ? { name: props.layout.name, ...(props.layout.options ?? {}) }
        : { name: "fcose" },
    });
  } catch {
    // renderer couldn't initialise (e.g. no 2d canvas) — fail safe rather than
    // white-screen the page. The host stays with data-renderer for diagnostics.
    return () => {
      container.remove();
      handleRef.current = null;
    };
  }

  if (!cy) {
    return () => {
      container.remove();
      handleRef.current = null;
    };
  }
  const core = cy;
  const handle = cytoscapeCanvas(core);
  handleRef.current = handle;

  // bridge the page events (same shape as the WebGL path)
  const bridge = (
    evt: unknown,
    cb?: (e: {
      target: unknown;
      renderedPosition: { x: number; y: number };
    }) => void,
  ) => {
    if (!cb) return;
    const e = evt as {
      target?: { id?: () => string };
      renderedPosition?: { x: number; y: number };
    };
    cb({
      target: e.target ?? null,
      renderedPosition: e.renderedPosition ?? { x: 0, y: 0 },
    });
  };
  core.on("tap", "node", (e: unknown) => bridge(e, props.onNodeTap as never));
  core.on("mouseover", "node", (e: unknown) =>
    bridge(e, props.onNodeMouseOver as never),
  );
  core.on("cxttap", "node", (e: unknown) =>
    bridge(e, props.onNodeContext as never),
  );

  props.onReady?.(handle);

  return () => {
    core.destroy();
    container.remove();
    handleRef.current = null;
  };
}

export default GraphCanvas;

/* eslint-disable i18next/no-literal-string, no-control-regex -- diagram status copy pending i18n; control chars are stripped deliberately from LLM-authored mermaid source */
/**
 * A standalone mermaid diagram, rendered as a full canvas.
 *
 * Distinct from MermaidBlock on purpose. That component is for a fence INSIDE
 * prose: a bounded preview with a "View Diagram" footer that jumps to the
 * Diagrams tab. Pointing it at a `.mmd` artifact produced exactly the wrong
 * thing — a small box with an expand button, sitting in an otherwise empty
 * pane, as though the diagram were an aside in a document that does not exist.
 *
 * When the file IS the diagram, it should fill the pane: no card, no footer,
 * scaled to fit. The SVG is also sized against the container here rather than
 * left at `height: auto`, which collapsed to nothing inside a short parent —
 * the reason the box looked empty even when mermaid rendered successfully.
 */

import * as React from "react";
import { Download, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "#/utils/utils";
import { applyMermaidTheme, loadMermaid } from "./mermaid-block";
import { sanitizeMermaid } from "#/utils/sanitize-mermaid";

export function MermaidCanvas({ code }: { code: string }) {
  const isArchitecture = /^\s*architecture-beta/m.test(code);
  const ref = React.useRef<HTMLDivElement>(null);
  const [err, setErr] = React.useState<string | null>(null);
  // Explicit stage, surfaced in the UI. Three attempts at this failed because
  // "blank with no error" is ambiguous — it can mean the effect never ran, the
  // renderer never called back, or an SVG rendered at zero size. Reporting the
  // stage makes the next failure diagnosable instead of guessable.
  // The mermaid chunk is large and can take several seconds on first open —
  // measured at over 8s in a cold headless browser. Without a visible state
  // that reads as a broken pane, which is how this looked for most of its life.
  const [ready, setReady] = React.useState(false);
  // Zoom is applied to a wrapper transform rather than re-rendering the
  // diagram: mermaid.render is expensive and re-running it per zoom step would
  // make the controls feel broken on a large topology.
  const [zoom, setZoom] = React.useState(1);
  // Pan offset. The previous implementation scaled a wrapper and shrank its
  // width to keep the scroll container useful, which fought itself: past ~1.5x
  // the diagram moved but could not be reached. A translate+scale pair with
  // drag-to-pan behaves like a canvas instead of a zoomed div.
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const dragRef = React.useRef<{ x: number; y: number } | null>(null);
  // mermaid writes text colour INTO the SVG at render time, so a theme switch
  // leaves an open diagram with the old colour — light-grey labels on white.
  // Watching the attribute and bumping this forces a re-render.
  const [themeTick, setThemeTick] = React.useState(0);
  React.useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick((t) => t + 1));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);
  const svgRef = React.useRef<SVGElement | null>(null);
  // Render after mount only: mermaid writes the SVG in with innerHTML, and
  // doing that during hydration makes server and client markup disagree
  // (React #418), which surfaced as a permanently blank diagram.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    const el = ref.current;
    if (!el) {
      return;
    }
    if (!code.trim()) {
      return;
    }
    setErr(null);
    el.innerHTML = "";
    const id = `cg-mmd-canvas-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    loadMermaid(async (m) => {
      if (!m) {
        setErr("Diagram renderer unavailable.");
        return;
      }
      try {
        // Architecture diagrams always render on a light ground, in either app
        // theme. The real draw.io artwork is drawn FOR white: navy AWS tiles and
        // dark Azure gradients disappear on a dark canvas, and unlike our
        // stencil icons they cannot be recoloured without destroying the brand
        // artwork. A white plate is the honest fix.
        applyMermaidTheme(m, true);
        const { svg } = await m.default.render(id, sanitizeMermaid(code));
        if (!svg || !svg.includes("<svg")) {
          setErr("Diagram produced no output.");
          return;
        }
        el.innerHTML = svg;
        const node = el.querySelector("svg");
        if (node) {
          const s = node as SVGElement;
          // KEEP mermaid's own width/height. Stripping them and sizing to
          // 100%/100% made the SVG depend on an ancestor chain resolving a
          // real height — and when any link in that chain was auto, it
          // collapsed to zero and the pane looked empty even though the SVG
          // was in the DOM. Intrinsic dimensions always resolve; the container
          // scrolls if the diagram is larger than the pane.
          //
          // Only max-width is cleared: mermaid caps it at the diagram's natural
          // width, which prevents the scroll container from ever being useful.
          // Scale to the pane using the viewBox rather than showing a slice
          // of the intrinsic size. mermaid sized this diagram 955x2033; the
          // pane is ~700 tall, so the visible region was the empty space
          // ABOVE the content and the diagram looked like it had not rendered
          // at all. It had — every time.
          //
          // A viewBox maps the whole drawing into whatever box we give it, so
          // width:100%/height:auto shows all of it, scaled. Without a viewBox
          // there is nothing to map, so the intrinsic size is kept and the
          // container scrolls instead.
          const vb = s.getAttribute("viewBox");
          s.style.maxWidth = "none";
          s.style.display = "block";
          if (vb) {
            s.removeAttribute("width");
            s.removeAttribute("height");
            // Fit BOTH axes, not just width. `height: auto` derived the height
            // from the viewBox aspect, so a tall flowchart became 1061x2258 —
            // full width, then twice the pane deep, which reads as broken even
            // though it is technically correct. 100%/100% plus "meet" scales
            // the drawing to fit inside the box on whichever axis binds first,
            // letterboxing the other.
            s.style.width = "100%";
            s.style.height = "100%";
            s.setAttribute("preserveAspectRatio", "xMidYMid meet");
          }
          svgRef.current = s;

          setReady(true);
        } else {
          setErr("Diagram rendered without an SVG root.");
        }
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
        el.innerHTML = "";
      } finally {
        // Remove mermaid's scratch node ONLY if it is outside our container.
        // The rendered SVG carries the SAME id, so an unconditional
        // getElementById(id).remove() deleted the diagram immediately after
        // inserting it — the element measured 589x1252, then vanished, which
        // is why every attempt looked blank with no error.
        const stray = document.getElementById(id);
        if (stray && !el.contains(stray)) stray.remove();
      }
    });
  }, [code, mounted, themeTick]);

  if (err) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6">
        <span className="text-[12px] text-[var(--cg-danger)]">{err}</span>
        {/* The source is still the deliverable: a diagram that will not draw is
            better shown as text than as nothing. */}
        <pre className="cg-scroll max-h-[60%] w-full overflow-auto rounded-lg border border-[var(--cg-border)] bg-[var(--cg-code-bg)] p-3 text-[11px] text-[var(--cg-text-nav)]">
          {code}
        </pre>
      </div>
    );
  }

  // min-h so the canvas has a real height even if an ancestor is auto-sized,
  // which is the failure the intrinsic-size note above describes.
  // Export the SVG as-is. It is self-contained (mermaid inlines its styles),
  // so the downloaded file opens anywhere — which is the point: an analyst
  // needs the diagram in a deck, not trapped in this pane.
  const exportSvg = () => {
    const node = svgRef.current;
    if (!node) return;
    const blob = new Blob([node.outerHTML], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const btn =
    "flex h-7 w-7 items-center justify-center rounded-md border border-[var(--cg-border)] text-[var(--cg-text-muted)] transition-colors hover:border-[var(--cg-border-strong)] hover:text-[var(--cg-text-primary)]";

  return (
    <div className="flex h-full min-h-[420px] w-full flex-col">
      {/* Controls. lucide, matching the composer's icon family. */}
      <div className="flex items-center gap-1.5 px-4 pt-3">
        <button
          type="button"
          className={btn}
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.2).toFixed(2)))}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={btn}
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(6, +(z + 0.2).toFixed(2)))}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={btn}
          title="Reset to fit"
          aria-label="Reset to fit"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={btn}
          title="Export SVG"
          aria-label="Export SVG"
          onClick={exportSvg}
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <span className="ml-1 font-mono text-[11px] text-[var(--cg-text-muted)]">
          {Math.round(zoom * 100)}%
        </span>
      </div>
      {/* Visible frame: an empty bordered box proves the component mounted,
          which a blank pane does not. */}
      <div
        className={cn(
          "m-4 flex-1 overflow-hidden rounded-lg border border-[var(--cg-border)] p-4",
          // White plate for architecture, themed card for everything else.
          // Always white, in both app themes. Vendor artwork is drawn FOR a
          // light ground — navy AWS tiles and Azure gradients disappear on a
          // dark canvas, and unlike stencil glyphs they cannot be recoloured
          // without destroying the brand artwork.
          "bg-white",
        )}
        style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          setZoom((z) =>
            Math.min(
              6,
              Math.max(0.2, +(z - Math.sign(e.deltaY) * 0.15).toFixed(2)),
            ),
          );
        }}
        onPointerDown={(e) => {
          dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = dragRef.current;
          if (!d) return;
          setPan({ x: e.clientX - d.x, y: e.clientY - d.y });
        }}
        onPointerUp={(e) => {
          dragRef.current = null;
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        }}
      >
        {!ready && (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--cg-text-muted)]">
            Rendering diagram…
          </div>
        )}
        <div
          ref={ref}
          data-arch={isArchitecture ? "true" : "false"}
          className="cg-mmd h-full w-full"
          style={{
            // Hidden rather than unmounted while loading: the ref must exist
            // for mermaid to render into.
            visibility: ready ? "visible" : "hidden",
            position: ready ? "static" : "absolute",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: dragRef.current ? "none" : "transform 0.12s ease-out",
          }}
        />
      </div>
    </div>
  );
}

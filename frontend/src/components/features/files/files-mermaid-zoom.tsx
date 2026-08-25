/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

/**
 * Pan and zoom for a rendered diagram.
 *
 * A diagram that fits a 440px box is readable as an illustration and useless as
 * a reference: the moment a flowchart has twenty nodes, the thing you actually
 * want is to get closer to one corner of it. Scaling the whole block taller is
 * not that — it pushes the document around and still shows everything at once.
 *
 * So the box stays a fixed size and the diagram MOVES INSIDE IT, the way a
 * canvas does. Wheel to zoom at the pointer, drag to pan, one button back to
 * fit.
 *
 * CSS TRANSFORM, not a re-render. The SVG is laid out once and then moved with
 * `transform`, which the compositor handles — re-rendering mermaid per zoom step
 * would re-parse the diagram on every wheel tick.
 */

const MIN_SCALE = 0.25;
const MAX_SCALE = 6;
const STEP = 1.15;

function clamp(v: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // The bar is `pointer-events-none` so it never eats a drag that passes
      // under it; each button turns them back on for itself.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className="pointer-events-auto rounded p-1 text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
    >
      {children}
    </button>
  );
}

export function ZoomPan({
  children,
  height,
  resetKey,
}: {
  children: React.ReactNode;
  height: number;
  /** Changes when the CONTENT changes. A stable value, unlike `children` —
   *  see the note on the reset effect. */
  resetKey?: string;
}) {
  const viewport = React.useRef<HTMLDivElement | null>(null);
  const [t, setT] = React.useState({ x: 0, y: 0, scale: 1 });
  const drag = React.useRef<{
    x: number;
    y: number;
    ox: number;
    oy: number;
  } | null>(null);

  const reset = React.useCallback(() => setT({ x: 0, y: 0, scale: 1 }), []);

  /**
   * A NEW DIAGRAM STARTS AT FIT — keeping the previous pan would drop someone
   * into the middle of a diagram they have not seen.
   *
   * Keyed on `resetKey`, NOT on `children`. A React element is a new object on
   * every render, so depending on it made this effect run every render, and it
   * calls `setT` with a fresh object — which is never `Object.is`-equal to the
   * previous state, so React re-renders, so the effect runs again. An unbounded
   * render loop, from a dependency that looks entirely reasonable.
   */
  React.useEffect(reset, [resetKey, reset]);

  /**
   * Zoom about the pointer, not about the centre.
   *
   * Centre-zoom sends whatever you were looking at off the edge, so you zoom in
   * and then hunt for it again. Anchoring at the cursor keeps the point under it
   * still, which is what every map and canvas does and what hands expect.
   */
  const zoomAt = React.useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      setT((prev) => {
        const next = clamp(prev.scale * factor);
        if (next === prev.scale) return prev;
        const box = viewport.current?.getBoundingClientRect();
        if (!box) return { ...prev, scale: next };
        // Default to the centre when there is no pointer (the buttons).
        const px = (clientX ?? box.left + box.width / 2) - box.left;
        const py = (clientY ?? box.top + box.height / 2) - box.top;
        const ratio = next / prev.scale;
        return {
          scale: next,
          x: px - (px - prev.x) * ratio,
          y: py - (py - prev.y) * ratio,
        };
      });
    },
    [],
  );

  /**
   * Wheel zoom is bound MANUALLY and non-passively.
   *
   * React's `onWheel` is registered passively, so `preventDefault` inside it is
   * ignored and the page scrolls behind the diagram while it zooms. A native
   * listener with `{ passive: false }` is the only way to claim the gesture.
   */
  React.useEffect(() => {
    const el = viewport.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      // Plain scroll passes THROUGH to the document: a diagram that swallowed
      // the wheel would trap the reader inside it half way down a page. Zoom is
      // deliberate — Ctrl/⌘ held, which is also the browser's own zoom idiom.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? STEP : 1 / STEP, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  return (
    <div className="relative">
      <div
        ref={viewport}
        role="presentation"
        style={{ height, touchAction: "none" }}
        className="overflow-hidden bg-[var(--cg-bg-page)]"
        onPointerDown={(e) => {
          // Pointer CAPTURE, so a drag that leaves the box keeps working —
          // without it the diagram sticks the moment the cursor crosses the
          // edge, which is most drags.
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, ox: t.x, oy: t.y };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setT((prev) => ({
            ...prev,
            x: d.ox + (e.clientX - d.x),
            y: d.oy + (e.clientY - d.y),
          }));
        }}
        onPointerUp={(e) => {
          (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div
          style={{
            transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
            transformOrigin: "0 0",
            cursor: drag.current ? "grabbing" : "grab",
            // Centred at rest, so a small diagram sits in the middle of the box
            // rather than in its top-left corner.
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
          }}
        >
          {children}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-0.5 rounded-md border border-[var(--cg-border)] bg-[var(--cg-bg-card,var(--cg-bg-page))]/90 p-0.5 backdrop-blur-sm">
        <ZoomButton label="Zoom out" onClick={() => zoomAt(1 / STEP)}>
          <ZoomOut className="h-3 w-3" />
        </ZoomButton>
        <span className="px-1 text-[10px] tabular-nums text-[var(--cg-text-muted)]">
          {Math.round(t.scale * 100)}%
        </span>
        <ZoomButton label="Zoom in" onClick={() => zoomAt(STEP)}>
          <ZoomIn className="h-3 w-3" />
        </ZoomButton>
        <ZoomButton label="Reset view" onClick={reset}>
          <Maximize2 className="h-3 w-3" />
        </ZoomButton>
      </div>
    </div>
  );
}

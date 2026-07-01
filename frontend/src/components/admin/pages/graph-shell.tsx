/* eslint-disable @typescript-eslint/no-explicit-any, i18next/no-literal-string -- CloudGuard shared graph chrome (navigator controller + minimap + toolbar). Cloned from the Security Graph so every graph canvas shares the exact same controller UI. */
import React from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Frame,
  Star,
  Plus,
  Minus,
} from "lucide-react";
import watermarkUrl from "./inference-defense-console.svg?url";

// Inference Defense Console wordmark — a faint watermark in the graph background
// (bottom-left, aligned with the navigator). It sits UNDER the transparent
// Cytoscape canvas so nodes/edges render above it. Shows on normal + full screen.
export function GraphWatermark() {
  return (
    <img
      src={watermarkUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{
        position: "absolute",
        bottom: 14,
        left: 14,
        width: 150,
        opacity: 0.45,
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 0,
      }}
    />
  );
}

// ── shared severity + schema primitives (data-agnostic drawer rendering) ──────
export type Severity = "Critical" | "High" | "Medium" | "Low" | "Informational";
export const SEV_ORDER: Severity[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Informational",
];
export const SEV_COLOUR: Record<Severity, string> = {
  Critical: "#e0492f",
  High: "#f0733a",
  Medium: "#d99a00",
  Low: "#3f9bd6",
  Informational: "#8a96a8",
};

export function SevChip({ sev }: { sev: Severity }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "1px 8px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        color: SEV_COLOUR[sev],
        background: `${SEV_COLOUR[sev]}22`,
        border: `1px solid ${SEV_COLOUR[sev]}66`,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: SEV_COLOUR[sev],
        }}
      />
      {sev}
    </span>
  );
}

export function GroupHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--cg-text-muted)",
        margin: "16px 0 6px",
      }}
    >
      {children}
    </div>
  );
}

export function Field({
  k,
  v,
}: {
  k: string;
  v: React.ReactNode | string | number | boolean | undefined | null;
}) {
  const absent =
    v === undefined || v === null || v === "" || v === "—" || v === false;
  let display: React.ReactNode = "—";
  if (!absent) display = v === true ? "Yes" : (v as React.ReactNode);
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "6px 0",
        fontSize: 12.5,
        borderBottom: "1px solid var(--cg-border-subtle)",
      }}
    >
      <span
        style={{ color: "var(--cg-text-muted)", minWidth: 132, flexShrink: 0 }}
      >
        {k}
      </span>
      <span
        style={{
          color: absent ? "var(--cg-text-muted)" : "var(--cg-text-primary)",
          fontStyle: absent ? "italic" : "normal",
          wordBreak: "break-word",
        }}
      >
        {display}
      </span>
    </div>
  );
}

// The graph drawers are a fixed WHITE panel independent of app theme: we pin the
// CloudGuard CSS vars to their light values on the drawer root so all descendants
// (which use var(--cg-*)) render as dark-on-white regardless of dark/light mode.
export const drawerShell = {
  position: "absolute",
  top: 0,
  right: 0,
  height: "100%",
  width: 340,
  display: "flex",
  flexDirection: "column",
  zIndex: 41,
  boxShadow: "-6px 0 18px rgba(0,0,0,0.12)",
  colorScheme: "light",
  background: "#ffffff",
  color: "hsl(0deg,0%,7%)",
  borderLeft: "1px solid rgba(30,20,10,0.12)",
  "--cg-bg-card": "#ffffff",
  "--cg-bg-hover": "hsl(50deg,20.7%,91%)",
  "--cg-text-primary": "hsl(0deg,0%,7%)",
  "--cg-text-muted": "hsl(51deg,3.1%,43.7%)",
  "--cg-text-nav": "hsl(60deg,2.5%,23.3%)",
  "--cg-border": "rgba(30,20,10,0.12)",
  "--cg-border-card": "rgba(30,20,10,0.2)",
  "--cg-border-subtle": "rgba(30,20,10,0.07)",
  "--cg-accent": "hsl(210deg,70.9%,51.6%)",
  "--cg-accent-bg": "rgba(45,134,212,0.08)",
  "--cg-code-bg": "#1a1a19",
} as React.CSSProperties;
export const drawerHead: React.CSSProperties = {
  padding: "16px 16px 14px",
  borderBottom: "1px solid var(--cg-border)",
  fontSize: 14.5,
  fontWeight: 600,
  color: "var(--cg-text-primary)",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

// zoom (model) ↔ slider-percent on a log scale
export const MINZ = 0.06;
export const MAXZ = 2.5;
export const zoomToPct = (z: number) =>
  Math.round(
    ((Math.log(z) - Math.log(MINZ)) / (Math.log(MAXZ) - Math.log(MINZ))) * 100,
  );
export const pctToZoom = (p: number) =>
  Math.exp(Math.log(MINZ) + (p / 100) * (Math.log(MAXZ) - Math.log(MINZ)));

// fixed-light chrome palette — the graph chrome is always white on the white
// canvas regardless of the app theme. Values are pinned to the app's LIGHT-mode
// CSS-token values so it looks identical to white mode.
export const CHROME = {
  bg: "#ffffff",
  border: "rgba(30,20,10,0.2)", // --cg-border-card (light)
  text: "hsl(0deg,0%,7%)", // --cg-text-primary (light)
  muted: "hsl(51deg,3.1%,43.7%)", // --cg-text-muted (light)
  hover: "hsl(50deg,20.7%,91%)", // --cg-bg-hover (light)
  accent: "hsl(210deg,70.9%,51.6%)", // --cg-accent (light)
  accentBg: "rgba(45,134,212,0.08)", // --cg-accent-bg (light)
};

// toolbar button — always white (fixed light), compact, sits top-left of canvas
export function graphToolBtn(disabled = false): React.CSSProperties {
  return {
    height: 28,
    padding: "0 9px",
    borderRadius: 7,
    border: `1px solid ${CHROME.border}`,
    background: CHROME.bg,
    color: disabled ? CHROME.muted : CHROME.text,
    fontSize: 11.5,
    cursor: disabled ? "default" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    whiteSpace: "nowrap",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    opacity: disabled ? 0.6 : 1,
  };
}

// ── navigator controller (directional pad + fit + minimap toggle + zoom slider) ──
export function GraphNavigator({
  onPan,
  onZoomIn,
  onZoomOut,
  onFit,
  zoomPct,
  onZoomPct,
  showMini,
  onToggleMini,
  markedCount,
  onOpenMarked,
  extra,
  showZoom = true,
}: {
  onPan: (dx: number, dy: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  zoomPct: number;
  onZoomPct: (p: number) => void;
  showMini: boolean;
  onToggleMini: () => void;
  markedCount?: number;
  onOpenMarked?: () => void;
  extra?: React.ReactNode;
  showZoom?: boolean;
}) {
  const STEP = 70;
  const ring = "rgb(23,23,22)";
  const padBtn: React.CSSProperties = {
    position: "absolute",
    width: 20,
    height: 20,
    border: "none",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };
  const sqBtn = (active = false): React.CSSProperties => ({
    width: 34,
    height: 34,
    borderRadius: 9,
    border: "none",
    background: active ? "rgba(255,255,255,0.18)" : ring,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 14,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 9,
        zIndex: 11,
      }}
    >
      {/* directional pad */}
      <div
        style={{
          position: "relative",
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: ring,
          boxShadow: "0 3px 10px rgba(0,0,0,0.28)",
        }}
      >
        <button
          type="button"
          aria-label="Pan up"
          style={{ ...padBtn, top: 3, left: 22 }}
          onClick={() => onPan(0, STEP)}
        >
          <ChevronUp size={15} />
        </button>
        <button
          type="button"
          aria-label="Pan down"
          style={{ ...padBtn, bottom: 3, left: 22 }}
          onClick={() => onPan(0, -STEP)}
        >
          <ChevronDown size={15} />
        </button>
        <button
          type="button"
          aria-label="Pan left"
          style={{ ...padBtn, left: 3, top: 22 }}
          onClick={() => onPan(STEP, 0)}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          aria-label="Pan right"
          style={{ ...padBtn, right: 3, top: 22 }}
          onClick={() => onPan(-STEP, 0)}
        >
          <ChevronRight size={15} />
        </button>
        <button
          type="button"
          aria-label="Fit to screen"
          onClick={onFit}
          style={{
            position: "absolute",
            left: 20,
            top: 20,
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "none",
            background: "#fff",
            color: ring,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Crosshair size={13} />
        </button>
      </div>

      {/* minimap toggle */}
      <button
        type="button"
        aria-label="Toggle minimap"
        onClick={onToggleMini}
        style={sqBtn(showMini)}
      >
        <Frame size={15} />
      </button>

      {/* extra controls (per-graph, e.g. replay / magnifier) */}
      {extra}

      {/* marked-resources list (optional) */}
      {onOpenMarked && (
        <button
          type="button"
          aria-label="Marked resources"
          onClick={onOpenMarked}
          style={{ ...sqBtn(false), position: "relative" }}
        >
          <Star size={15} color="#f5b301" fill="#f5b301" />
          {(markedCount ?? 0) > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 15,
                height: 15,
                borderRadius: 8,
                background: "#f5b301",
                color: "#3a2a00",
                fontSize: 10,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
              }}
            >
              {markedCount}
            </span>
          )}
        </button>
      )}

      {/* zoom slider */}
      {showZoom && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            background: ring,
            borderRadius: 18,
            padding: "10px 6px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.28)",
          }}
        >
          <button
            type="button"
            aria-label="Zoom in"
            onClick={onZoomIn}
            style={{
              border: "none",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <Plus size={15} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={zoomPct}
            onChange={(e) => onZoomPct(Number(e.target.value))}
            aria-label="Zoom"
            style={{
              writingMode: "vertical-lr" as any,
              direction: "rtl",
              width: 6,
              height: 96,
              accentColor: "#fff",
              cursor: "pointer",
            }}
          />
          <button
            type="button"
            aria-label="Zoom out"
            onClick={onZoomOut}
            style={{
              border: "none",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <Minus size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── frame viewer (minimap) ────────────────────────────────────────────────────
const MINI_DOT: Record<string, string> = {
  error: "#e0492f",
  warning: "#d99a00",
};
const MW = 168;
const MH = 108;

type Dot = { x: number; y: number; a: string };
type MiniFrame = {
  bb: { x: number; y: number; w: number; h: number };
  view: { x: number; y: number; w: number; h: number };
};

const MiniDots = React.memo(
  ({ dots, bb }: { dots: Dot[]; bb: MiniFrame["bb"] }) => {
    const s = Math.min(
      (MW - 20) / Math.max(bb.w, 1),
      (MH - 20) / Math.max(bb.h, 1),
    );
    const ox = (MW - bb.w * s) / 2;
    const oy = (MH - bb.h * s) / 2;
    return (
      <>
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={ox + (d.x - bb.x) * s}
            cy={oy + (d.y - bb.y) * s}
            r={d.a ? 2.6 : 1.9}
            fill={MINI_DOT[d.a] || "#aab6c4"}
          />
        ))}
      </>
    );
  },
);
MiniDots.displayName = "MiniDots";

export function GraphMinimap({
  frame,
  dots,
  onJump,
  rightOffset = 12,
}: {
  frame: MiniFrame;
  dots: Dot[];
  onJump: (gx: number, gy: number) => void;
  rightOffset?: number;
}) {
  const { bb, view } = frame;
  const s = Math.min(
    (MW - 20) / Math.max(bb.w, 1),
    (MH - 20) / Math.max(bb.h, 1),
  );
  const ox = (MW - bb.w * s) / 2;
  const oy = (MH - bb.h * s) / 2;
  const mx = (x: number) => ox + (x - bb.x) * s;
  const my = (y: number) => oy + (y - bb.y) * s;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  const vx = clamp(mx(view.x), 1, MW - 1);
  const vy = clamp(my(view.y), 1, MH - 1);
  const vw = clamp(view.w * s, 3, MW - vx - 1);
  const vh = clamp(view.h * s, 3, MH - vy - 1);
  return (
    <svg
      width={MW}
      height={MH}
      onClick={(e) => {
        const r = (e.target as SVGElement)
          .closest("svg")!
          .getBoundingClientRect();
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        onJump((px - ox) / s + bb.x, (py - oy) / s + bb.y);
      }}
      style={{
        position: "absolute",
        right: rightOffset,
        bottom: 12,
        transition: "right .28s ease",
        zIndex: 9,
        background: "#27313a",
        border: "1px solid #5b9bf0",
        borderRadius: 6,
        boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
        cursor: "pointer",
      }}
    >
      <MiniDots dots={dots} bb={bb} />
      <rect
        x={vx}
        y={vy}
        width={vw}
        height={vh}
        rx={2}
        fill="rgba(91,155,240,0.16)"
        stroke="#5b9bf0"
        strokeWidth={1.3}
      />
    </svg>
  );
}

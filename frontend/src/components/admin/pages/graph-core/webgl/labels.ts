/**
 * Label LOD + collision selection (M2 / B3) — which labels to draw this frame.
 *
 * Drawing 10k labels every frame is both slow and unreadable. This picks a
 * bounded, non-overlapping subset in SCREEN space each frame:
 *   1. only labels for on-screen nodes (the renderer passes the visible set),
 *   2. highest-priority first (degree / risk — the important nodes keep labels),
 *   3. reject any that collide with an already-placed label (screen-space grid),
 *   4. cap the total (`maxLabels`) so text upload/draw is bounded.
 *
 * Zoom falls out naturally: zoomed out, screen cells are dense → more collisions
 * → fewer labels; zoomed in, labels spread out → more show. Pure + testable; the
 * SDF glyph atlas + text draw are the renderer's job, this just decides placement.
 */

import type { Camera } from "./camera";

export interface LabelCandidate {
  id: string;
  /** world-space anchor (node center) */
  x: number;
  y: number;
  /** higher = more important (degree, risk, centrality) — kept preferentially */
  priority: number;
  /** approx label box in screen px (for collision); defaults applied if omitted */
  w?: number;
  h?: number;
}

export interface PlacedLabel {
  id: string;
  /** screen-space position of the label anchor */
  sx: number;
  sy: number;
  priority: number;
}

export interface LabelSelectOpts {
  maxLabels?: number;
  /** collision cell size in screen px (≈ label height) */
  cellSize?: number;
  defaultW?: number;
  defaultH?: number;
}

const DEFAULTS = { maxLabels: 200, cellSize: 22, defaultW: 90, defaultH: 18 };

function cellKey(sx: number, sy: number, cell: number): string {
  return `${Math.floor(sx / cell)}:${Math.floor(sy / cell)}`;
}

/** Every collision-grid cell key a (w×h) screen box anchored at (sx,sy) spans. */
function cellsFor(
  sx: number,
  sy: number,
  w: number,
  h: number,
  cell: number,
): string[] {
  const keys: string[] = [];
  for (let gx = sx; gx <= sx + w; gx += cell) {
    for (let gy = sy; gy <= sy + h; gy += cell) {
      keys.push(cellKey(gx, gy, cell));
    }
  }
  return keys;
}

/**
 * Select a bounded, non-overlapping set of labels for the current camera.
 * `candidates` should already be the on-screen nodes (renderer culls first).
 */
export function selectLabels(
  candidates: LabelCandidate[],
  camera: Camera,
  viewport: { width: number; height: number },
  opts: LabelSelectOpts = {},
): PlacedLabel[] {
  const o = { ...DEFAULTS, ...opts };
  // highest priority first; stable tiebreak by id so frames are deterministic.
  const ordered = [...candidates].sort(
    (a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1),
  );

  const occupied = new Set<string>();
  const placed: PlacedLabel[] = [];

  for (const c of ordered) {
    if (placed.length >= o.maxLabels) break;
    const s = camera.worldToScreen({ x: c.x, y: c.y });
    const onScreen =
      s.x >= -o.defaultW &&
      s.y >= -o.defaultH &&
      s.x <= viewport.width + o.defaultW &&
      s.y <= viewport.height + o.defaultH;
    if (onScreen) {
      // collision: cover the label's box across the cells it spans
      const w = c.w ?? o.defaultW;
      const h = c.h ?? o.defaultH;
      const keys = cellsFor(s.x, s.y, w, h, o.cellSize);
      const free = keys.every((k) => !occupied.has(k));
      if (free) {
        for (const k of keys) occupied.add(k);
        placed.push({ id: c.id, sx: s.x, sy: s.y, priority: c.priority });
      }
    }
  }

  return placed;
}

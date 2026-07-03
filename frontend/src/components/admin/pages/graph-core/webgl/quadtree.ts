/**
 * Quadtree (M2 / B2) — spatial index for frustum culling.
 *
 * The renderer must upload/draw only what's on screen, so `render()` cost tracks
 * VISIBLE elements, not the whole estate (the O(1)-draw-calls promise still needs
 * an O(visible) vertex upload). A quadtree answers "which node ids fall in this
 * world-space rectangle?" in ~O(log n + k). Pure, no GL — unit-testable.
 */

import type { BBox } from "../canvas";

export interface QPoint {
  id: string;
  x: number;
  y: number;
}

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function contains(r: Rect, p: QPoint): boolean {
  return p.x >= r.x1 && p.x <= r.x2 && p.y >= r.y1 && p.y <= r.y2;
}

function intersects(r: Rect, q: Rect): boolean {
  return !(q.x1 > r.x2 || q.x2 < r.x1 || q.y1 > r.y2 || q.y2 < r.y1);
}

/** normalize a BBox (which may have x1>x2 after transforms) into a sane Rect. */
function normRect(b: BBox | Rect): Rect {
  return {
    x1: Math.min(b.x1, b.x2),
    y1: Math.min(b.y1, b.y2),
    x2: Math.max(b.x1, b.x2),
    y2: Math.max(b.y1, b.y2),
  };
}

export class Quadtree {
  private readonly bounds: Rect;

  private readonly capacity: number;

  private readonly depth: number;

  private readonly maxDepth: number;

  private points: QPoint[] = [];

  private divided = false;

  private nw?: Quadtree;

  private ne?: Quadtree;

  private sw?: Quadtree;

  private se?: Quadtree;

  constructor(bounds: BBox | Rect, capacity = 16, maxDepth = 12, depth = 0) {
    this.bounds = normRect(bounds);
    this.capacity = capacity;
    this.maxDepth = maxDepth;
    this.depth = depth;
  }

  static fromPoints(points: QPoint[], capacity = 16): Quadtree {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- hoisted fn decl
    const b = boundsOf(points);
    const qt = new Quadtree(b, capacity);
    for (const p of points) qt.insert(p);
    return qt;
  }

  insert(p: QPoint): boolean {
    if (!contains(this.bounds, p)) return false;
    if (this.points.length < this.capacity || this.depth >= this.maxDepth) {
      this.points.push(p);
      return true;
    }
    if (!this.divided) this.subdivide();
    return (
      this.nw!.insert(p) ||
      this.ne!.insert(p) ||
      this.sw!.insert(p) ||
      this.se!.insert(p)
    );
  }

  private subdivide(): void {
    const { x1, y1, x2, y2 } = this.bounds;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const d = this.depth + 1;
    this.nw = new Quadtree(
      { x1, y1, x2: mx, y2: my },
      this.capacity,
      this.maxDepth,
      d,
    );
    this.ne = new Quadtree(
      { x1: mx, y1, x2, y2: my },
      this.capacity,
      this.maxDepth,
      d,
    );
    this.sw = new Quadtree(
      { x1, y1: my, x2: mx, y2 },
      this.capacity,
      this.maxDepth,
      d,
    );
    this.se = new Quadtree(
      { x1: mx, y1: my, x2, y2 },
      this.capacity,
      this.maxDepth,
      d,
    );
    this.divided = true;
  }

  /** All point ids intersecting a world-space query rectangle. */
  query(range: BBox | Rect, out: string[] = []): string[] {
    const q = normRect(range);
    if (!intersects(this.bounds, q)) return out;
    for (const p of this.points) if (contains(q, p)) out.push(p.id);
    if (this.divided) {
      this.nw!.query(q, out);
      this.ne!.query(q, out);
      this.sw!.query(q, out);
      this.se!.query(q, out);
    }
    return out;
  }
}

export function boundsOf(points: QPoint[]): BBox {
  if (points.length === 0) return { x1: 0, y1: 0, x2: 1, y2: 1, w: 1, h: 1 };
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const p of points) {
    if (p.x < x1) x1 = p.x;
    if (p.y < y1) y1 = p.y;
    if (p.x > x2) x2 = p.x;
    if (p.y > y2) y2 = p.y;
  }
  // pad by 1 so points on the max edge are strictly contained
  x2 += 1;
  y2 += 1;
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
}

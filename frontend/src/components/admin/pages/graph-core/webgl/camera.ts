/**
 * Camera (M2 / B2) — the world↔screen transform for the WebGL renderer.
 *
 * Uses the SAME convention as Cytoscape so the renderer swap is transparent:
 *   screen = world * zoom + pan     (pan is in screen/rendered pixels)
 *   world  = (screen - pan) / zoom
 *
 * Pure math, no GL — fully unit-testable. The renderer feeds this to the vertex
 * shader as a uniform; culling asks it for the visible world-space extent.
 */

import type { BBox } from "../canvas";

export interface Vec2 {
  x: number;
  y: number;
}

export class Camera {
  zoom: number;

  pan: Vec2;

  minZoom: number;

  maxZoom: number;

  constructor(opts?: {
    zoom?: number;
    pan?: Vec2;
    minZoom?: number;
    maxZoom?: number;
  }) {
    this.zoom = opts?.zoom ?? 1;
    this.pan = { x: opts?.pan?.x ?? 0, y: opts?.pan?.y ?? 0 };
    this.minZoom = opts?.minZoom ?? 0.02;
    this.maxZoom = opts?.maxZoom ?? 4;
  }

  private clampZoom(z: number): number {
    return Math.min(this.maxZoom, Math.max(this.minZoom, z));
  }

  worldToScreen(w: Vec2): Vec2 {
    return { x: w.x * this.zoom + this.pan.x, y: w.y * this.zoom + this.pan.y };
  }

  screenToWorld(s: Vec2): Vec2 {
    return {
      x: (s.x - this.pan.x) / this.zoom,
      y: (s.y - this.pan.y) / this.zoom,
    };
  }

  setZoom(z: number): void {
    this.zoom = this.clampZoom(z);
  }

  panBy(delta: Vec2): void {
    this.pan = { x: this.pan.x + delta.x, y: this.pan.y + delta.y };
  }

  /** Zoom keeping the given screen point anchored (wheel-to-cursor). */
  zoomAt(screen: Vec2, nextZoom: number): void {
    const z = this.clampZoom(nextZoom);
    const worldBefore = this.screenToWorld(screen);
    this.zoom = z;
    // re-pan so `worldBefore` maps back to the same screen point
    this.pan = {
      x: screen.x - worldBefore.x * z,
      y: screen.y - worldBefore.y * z,
    };
  }

  /** World-space rectangle currently visible in a (width×height) viewport. */
  visibleExtent(width: number, height: number): BBox {
    const tl = this.screenToWorld({ x: 0, y: 0 });
    const br = this.screenToWorld({ x: width, y: height });
    return {
      x1: tl.x,
      y1: tl.y,
      x2: br.x,
      y2: br.y,
      w: br.x - tl.x,
      h: br.y - tl.y,
    };
  }

  /** Fit a world-space bbox into the viewport with padding (screen px). */
  fit(box: BBox, width: number, height: number, padding = 40): void {
    const bw = Math.max(1e-6, box.w);
    const bh = Math.max(1e-6, box.h);
    const z = this.clampZoom(
      Math.min((width - 2 * padding) / bw, (height - 2 * padding) / bh),
    );
    this.zoom = z;
    const cx = box.x1 + bw / 2;
    const cy = box.y1 + bh / 2;
    // centre the box in the viewport
    this.pan = { x: width / 2 - cx * z, y: height / 2 - cy * z };
  }
}

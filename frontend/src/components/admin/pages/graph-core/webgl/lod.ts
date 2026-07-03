/**
 * LOD control + edge bundling (M2 / B4).
 *
 * The compute layer publishes multi-zoom tiles (L0 cluster super-graph / L1 / L2
 * full detail — see graph_compute.lod). This module decides WHICH level the
 * renderer shows for a given zoom and the cross-fade weight between adjacent
 * levels, and it bundles edges through cluster centroids so a dense estate reads
 * as flows between clusters instead of a hairball.
 *
 * Pure + testable; the renderer consumes `levelForZoom`/`crossFade` to choose a
 * tile and `bundleEdges` to lay out edge control points.
 */

import type { Camera } from "./camera";

export type LodLevel = "L0" | "L1" | "L2";

/** zoom thresholds: below L0_MAX → cluster super-graph; above L1_MAX → full. */
export const L0_MAX_ZOOM = 0.25;
export const L1_MAX_ZOOM = 0.75;

export function levelForZoom(zoom: number): LodLevel {
  if (zoom < L0_MAX_ZOOM) return "L0";
  if (zoom < L1_MAX_ZOOM) return "L1";
  return "L2";
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function pt(p: { x: number; y: number }): { x: number; y: number } {
  return { x: p.x, y: p.y };
}

function lerp(
  a: { x: number; y: number },
  b: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export interface CrossFade {
  level: LodLevel;
  /** the level being faded toward as zoom increases (null at the top) */
  next: LodLevel | null;
  /** 0 = fully `level`, 1 = fully `next` (linear across the band) */
  t: number;
}

/** Level + fade weight, so the renderer can blend L(n)→L(n+1) across a zoom band. */
export function crossFade(zoom: number): CrossFade {
  if (zoom < L0_MAX_ZOOM) {
    return { level: "L0", next: "L1", t: clamp01(zoom / L0_MAX_ZOOM) };
  }
  if (zoom < L1_MAX_ZOOM) {
    return {
      level: "L1",
      next: "L2",
      t: clamp01((zoom - L0_MAX_ZOOM) / (L1_MAX_ZOOM - L0_MAX_ZOOM)),
    };
  }
  return { level: "L2", next: null, t: 1 };
}

// ── edge bundling ─────────────────────────────────────────────────────────────
export interface BundleNode {
  id: string;
  x: number;
  y: number;
  cluster: string;
}

export interface BundleEdgeInput {
  source: string;
  target: string;
}

export interface BundledEdge {
  source: string;
  target: string;
  /** polyline control points (world space) incl. both endpoints */
  points: Array<{ x: number; y: number }>;
  /** true when the edge crosses clusters (routed through centroids) */
  bundled: boolean;
}

/** Centroid (mean position) of each cluster. */
export function clusterCentroids(
  nodes: BundleNode[],
): Map<string, { x: number; y: number; n: number }> {
  const acc = new Map<string, { x: number; y: number; n: number }>();
  for (const nd of nodes) {
    const c = acc.get(nd.cluster) ?? { x: 0, y: 0, n: 0 };
    c.x += nd.x;
    c.y += nd.y;
    c.n += 1;
    acc.set(nd.cluster, c);
  }
  for (const c of acc.values()) {
    c.x /= c.n;
    c.y /= c.n;
  }
  return acc;
}

/**
 * Route inter-cluster edges through their clusters' centroids (a cheap, stable
 * approximation of force-directed bundling): endpoint → src centroid → dst
 * centroid → endpoint. Intra-cluster edges stay straight. Deterministic.
 */
export function bundleEdges(
  nodes: BundleNode[],
  edges: BundleEdgeInput[],
  strength = 0.85,
): BundledEdge[] {
  const pos = new Map(nodes.map((n) => [n.id, n]));
  const centroids = clusterCentroids(nodes);
  const out: BundledEdge[] = [];

  for (const e of edges) {
    const a = pos.get(e.source);
    const b = pos.get(e.target);
    if (!a || !b) continue; // eslint-disable-line no-continue -- skip dangling edge
    if (a.cluster === b.cluster) {
      out.push({
        source: e.source,
        target: e.target,
        points: [pt(a), pt(b)],
        bundled: false,
      });
    } else {
      const ca = centroids.get(a.cluster)!;
      const cb = centroids.get(b.cluster)!;
      // pull control points toward the centroids by `strength`
      const p1 = lerp(a, ca, strength);
      const p2 = lerp(b, cb, strength);
      out.push({
        source: e.source,
        target: e.target,
        points: [pt(a), p1, p2, pt(b)],
        bundled: true,
      });
    }
  }
  return out;
}

/** Convenience: level for the camera's current zoom. */
export function levelForCamera(camera: Camera): LodLevel {
  return levelForZoom(camera.zoom);
}

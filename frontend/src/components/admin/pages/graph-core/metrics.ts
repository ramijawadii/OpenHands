// ─────────────────────────────────────────────────────────────────────────────
// graph-core metrics — quality + scale signals to gate ingests and watch drift.
// ─────────────────────────────────────────────────────────────────────────────
import { type GraphEngine } from "./engine";

export interface GraphMetrics {
  nodes: number;
  edges: number;
  /** edges / nodes — density signal */
  avgDegree: number;
  maxOutDegree: number;
  maxInDegree: number;
  /** fraction of nodes with no edges */
  orphanRate: number;
  /** hub node ids (highest total degree) */
  hubs: { id: string; degree: number }[];
  /** downstream reach distribution (blast radius) percentiles */
  reach: { p50: number; p90: number; p99: number; max: number };
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length),
  );
  return sorted[idx];
}

export function graphMetrics(
  engine: GraphEngine,
  opts: { reachSample?: number } = {},
): GraphMetrics {
  const ids = engine.allNodeIds();
  const n = ids.length;
  const m = engine.allEdges().length;

  let maxOut = 0;
  let maxIn = 0;
  let orphans = 0;
  const degrees: { id: string; degree: number }[] = [];
  for (const id of ids) {
    const d = engine.degree(id);
    maxOut = Math.max(maxOut, d.out);
    maxIn = Math.max(maxIn, d.in);
    if (d.in + d.out === 0) orphans += 1;
    degrees.push({ id, degree: d.in + d.out });
  }
  degrees.sort((a, b) => b.degree - a.degree);

  // blast-radius distribution — sample for very large graphs
  const sample = opts.reachSample ?? 400;
  const stride = n > sample ? Math.ceil(n / sample) : 1;
  const reachVals: number[] = [];
  for (let i = 0; i < n; i += stride)
    reachVals.push(engine.blastRadius(ids[i]));
  reachVals.sort((a, b) => a - b);

  return {
    nodes: n,
    edges: m,
    avgDegree: n ? +(m / n).toFixed(2) : 0,
    maxOutDegree: maxOut,
    maxInDegree: maxIn,
    orphanRate: n ? +(orphans / n).toFixed(3) : 0,
    hubs: degrees.slice(0, 8),
    reach: {
      p50: percentile(reachVals, 50),
      p90: percentile(reachVals, 90),
      p99: percentile(reachVals, 99),
      max: reachVals.length ? reachVals[reachVals.length - 1] : 0,
    },
  };
}

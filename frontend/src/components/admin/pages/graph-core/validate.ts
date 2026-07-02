/* eslint-disable no-continue, no-restricted-syntax -- validation scan loops */
// ─────────────────────────────────────────────────────────────────────────────
// graph-core validator — run on every ingest so a WRONG graph is caught before
// it is ever rendered. A scaled graph that is inaccurate is worse than a small
// correct one.
// ─────────────────────────────────────────────────────────────────────────────
import { EDGE_KINDS, type GraphSpec } from "./model";

export type Severity = "error" | "warning";

export interface Issue {
  code: string;
  severity: Severity;
  message: string;
  /** offending ids / keys for triage */
  refs: string[];
}

export interface ValidationReport {
  ok: boolean; // no errors (warnings allowed)
  errors: number;
  warnings: number;
  issues: Issue[];
  counts: { nodes: number; edges: number };
}

interface ValidateOpts {
  /** node ids that must be canonical (e.g. ARN-shaped). off by default */
  requireCanonicalIds?: boolean;
  /** treat these as acyclic; report back-edges as errors */
  expectAcyclic?: boolean;
}

const isArnish = (id: string) =>
  /^[a-z][a-z0-9+.-]*:/i.test(id) || id.includes("/");

export function validateGraph(
  spec: GraphSpec,
  opts: ValidateOpts = {},
): ValidationReport {
  const issues: Issue[] = [];
  const add = (
    severity: Severity,
    code: string,
    message: string,
    refs: string[] = [],
  ) => issues.push({ severity, code, message, refs });

  // ── node-level ─────────────────────────────────────────────────────────────
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const n of spec.nodes) {
    if (!n.id) add("error", "NODE_NO_ID", "Node with empty id", []);
    if (seen.has(n.id)) dupes.add(n.id);
    seen.add(n.id);
    if (!n.label)
      add("warning", "NODE_NO_LABEL", `Node ${n.id} has no label`, [n.id]);
    if (opts.requireCanonicalIds && n.id && !isArnish(n.id))
      add("warning", "NODE_NONCANONICAL_ID", `Node id not canonical: ${n.id}`, [
        n.id,
      ]);
  }
  if (dupes.size)
    add(
      "error",
      "DUP_NODE_ID",
      `${dupes.size} duplicate node id(s) — nodes must be deduped by canonical id`,
      [...dupes].slice(0, 20),
    );

  // ── edge-level ───────────────────────────────────────────────────────────
  const known = new Set(EDGE_KINDS);
  const edgeSeen = new Set<string>();
  let dangling = 0;
  let selfLoops = 0;
  let dupEdges = 0;
  let badConf = 0;
  const danglingRefs: string[] = [];
  for (const e of spec.edges) {
    if (!seen.has(e.source) || !seen.has(e.target)) {
      dangling += 1;
      if (danglingRefs.length < 20)
        danglingRefs.push(`${e.source}→${e.target}`);
      continue; // don't index a dangling edge into the other checks
    }
    if (e.source === e.target) selfLoops += 1;
    const key = `${e.source}|${e.target}|${e.kind ?? "generic"}`;
    if (edgeSeen.has(key)) dupEdges += 1;
    edgeSeen.add(key);
    if (e.kind && !known.has(e.kind))
      add("error", "EDGE_UNKNOWN_KIND", `Unknown edge kind: ${e.kind}`, [key]);
    if (e.confidence !== undefined && (e.confidence < 0 || e.confidence > 1))
      badConf += 1;
  }
  if (dangling)
    add(
      "error",
      "DANGLING_EDGE",
      `${dangling} edge(s) reference a missing node`,
      danglingRefs,
    );
  if (selfLoops)
    add("warning", "SELF_LOOP", `${selfLoops} self-loop edge(s)`, []);
  if (dupEdges) add("warning", "DUP_EDGE", `${dupEdges} duplicate edge(s)`, []);
  if (badConf)
    add(
      "error",
      "EDGE_BAD_CONFIDENCE",
      `${badConf} edge(s) with confidence out of [0,1]`,
      [],
    );

  // ── orphan nodes (no in/out edges) ─────────────────────────────────────────
  const connected = new Set<string>();
  for (const e of spec.edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  const orphans = spec.nodes
    .filter((n) => !connected.has(n.id))
    .map((n) => n.id);
  if (orphans.length)
    add(
      "warning",
      "ORPHAN_NODE",
      `${orphans.length} node(s) with no connections`,
      orphans.slice(0, 20),
    );

  // ── optional acyclicity (DFS back-edge detection) ──────────────────────────
  if (opts.expectAcyclic && !dangling && !dupes.size) {
    const adj = new Map<string, string[]>();
    for (const e of spec.edges)
      (adj.get(e.source) ?? adj.set(e.source, []).get(e.source)!).push(
        e.target,
      );
    const WHITE = 0;
    const GREY = 1;
    const BLACK = 2;
    const color = new Map<string, number>();
    spec.nodes.forEach((n) => color.set(n.id, WHITE));
    let cyclic = false;
    const stack: { id: string; it: number }[] = [];
    for (const start of spec.nodes) {
      if (color.get(start.id) !== WHITE) continue;
      stack.push({ id: start.id, it: 0 });
      color.set(start.id, GREY);
      while (stack.length) {
        const top = stack[stack.length - 1];
        const outs = adj.get(top.id) ?? [];
        if (top.it >= outs.length) {
          color.set(top.id, BLACK);
          stack.pop();
          continue;
        }
        const nxt = outs[top.it];
        top.it += 1;
        const c = color.get(nxt);
        if (c === GREY) {
          cyclic = true;
          break;
        }
        if (c === WHITE) {
          color.set(nxt, GREY);
          stack.push({ id: nxt, it: 0 });
        }
      }
      if (cyclic) break;
    }
    if (cyclic)
      add(
        "error",
        "CYCLE",
        "Graph expected to be acyclic but contains a cycle",
        [],
      );
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.length - errors;
  return {
    ok: errors === 0,
    errors,
    warnings,
    issues,
    counts: { nodes: spec.nodes.length, edges: spec.edges.length },
  };
}

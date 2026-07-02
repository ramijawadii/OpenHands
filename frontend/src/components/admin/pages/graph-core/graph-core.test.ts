/* eslint-disable no-bitwise, no-restricted-syntax, no-continue -- test RNG + scans */
import { describe, it, expect } from "vitest";
import {
  GraphEngine,
  validateGraph,
  graphMetrics,
  type GraphSpec,
} from "./index";

// ── fixtures ─────────────────────────────────────────────────────────────────
// a small IAM-shaped estate: identity → role → policy → resource
const spec: GraphSpec = {
  nodes: [
    { id: "u:alice", kind: "identity", label: "alice", tier: "identity" },
    { id: "u:bob", kind: "identity", label: "bob", tier: "identity" },
    { id: "r:admin", kind: "role", label: "admin", tier: "role" },
    { id: "r:read", kind: "role", label: "read", tier: "role" },
    { id: "p:full", kind: "policy", label: "full", tier: "policy" },
    { id: "p:ro", kind: "policy", label: "ro", tier: "policy" },
    { id: "res:bucket", kind: "s3", label: "bucket", tier: "resource" },
    { id: "res:db", kind: "db", label: "db", tier: "resource" },
    { id: "res:orphan", kind: "s3", label: "orphan", tier: "resource" },
  ],
  edges: [
    { source: "u:alice", target: "r:admin", kind: "assumes_role" },
    { source: "u:bob", target: "r:read", kind: "assumes_role" },
    { source: "r:admin", target: "p:full", kind: "attached_policy" },
    { source: "r:read", target: "p:ro", kind: "attached_policy" },
    { source: "p:full", target: "res:bucket", kind: "grants_access" },
    { source: "p:full", target: "res:db", kind: "grants_access" },
    { source: "p:ro", target: "res:bucket", kind: "grants_access" },
  ],
};

// naive reference closure — the engine must agree with this on fixtures
function naiveReach(s: GraphSpec, id: string, dir: "down" | "up"): Set<string> {
  const adj = new Map<string, string[]>();
  for (const e of s.edges) {
    const [a, b] = dir === "down" ? [e.source, e.target] : [e.target, e.source];
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  }
  const seen = new Set([id]);
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const nxt of adj.get(cur) ?? [])
      if (!seen.has(nxt)) {
        seen.add(nxt);
        stack.push(nxt);
      }
  }
  return seen;
}

describe("validateGraph", () => {
  it("passes a well-formed graph (orphan is a warning, not an error)", () => {
    const r = validateGraph(spec);
    expect(r.ok).toBe(true);
    expect(r.issues.some((i) => i.code === "ORPHAN_NODE")).toBe(true);
  });

  it("flags dangling edges and duplicate ids as errors", () => {
    const bad: GraphSpec = {
      nodes: [
        { id: "a", kind: "x", label: "a" },
        { id: "a", kind: "x", label: "a-dup" },
      ],
      edges: [{ source: "a", target: "ghost" }],
    };
    const r = validateGraph(bad);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(["DUP_NODE_ID", "DANGLING_EDGE"]),
    );
  });

  it("detects cycles when acyclicity is expected", () => {
    const cyc: GraphSpec = {
      nodes: [
        { id: "a", kind: "x", label: "a" },
        { id: "b", kind: "x", label: "b" },
      ],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
      ],
    };
    expect(validateGraph(cyc, { expectAcyclic: true }).ok).toBe(false);
    expect(validateGraph(cyc).ok).toBe(true); // fine when cycles allowed
  });
});

describe("GraphEngine traversal", () => {
  const { engine } = GraphEngine.build(spec);

  it("matches the naive reference closure (down and up)", () => {
    for (const id of spec.nodes.map((n) => n.id)) {
      expect(new Set(engine.reach(id, { dir: "down" }))).toEqual(
        naiveReach(spec, id, "down"),
      );
      expect(new Set(engine.reach(id, { dir: "up" }))).toEqual(
        naiveReach(spec, id, "up"),
      );
    }
  });

  it("upstream reach is the transpose of downstream reach", () => {
    // b in down(a)  ⟺  a in up(b)
    for (const a of spec.nodes.map((n) => n.id)) {
      const down = new Set(
        engine.reach(a, { dir: "down", includeRoot: false }),
      );
      for (const b of down) expect(engine.reach(b, { dir: "up" })).toContain(a);
    }
  });

  it("degree-bounds are monotonic: 1st ⊆ 2nd ⊆ full", () => {
    const d1 = new Set(engine.reach("u:alice", { dir: "down", maxDepth: 1 }));
    const d2 = new Set(engine.reach("u:alice", { dir: "down", maxDepth: 2 }));
    const dF = new Set(engine.reach("u:alice", { dir: "down" }));
    for (const x of d1) expect(d2.has(x)).toBe(true);
    for (const x of d2) expect(dF.has(x)).toBe(true);
    expect(d1.size).toBeLessThanOrEqual(d2.size);
    expect(d2.size).toBeLessThanOrEqual(dF.size);
  });

  it("blast radius / fan-in exclude the root and count uniques", () => {
    // alice → admin → full → {bucket, db} : 4 downstream
    expect(engine.blastRadius("u:alice")).toBe(4);
    // bucket reachable from alice(full) and bob(ro) chains upstream
    expect(engine.fanIn("res:bucket")).toBeGreaterThanOrEqual(4);
  });

  it("kind-filtered traversal only follows matching edges", () => {
    // only assumes_role edges: alice reaches admin, nothing further
    const r = engine.reach("u:alice", { dir: "down", kinds: ["assumes_role"] });
    expect(new Set(r)).toEqual(new Set(["u:alice", "r:admin"]));
  });

  it("shortestPath finds a directed path or null", () => {
    expect(engine.shortestPath("u:alice", "res:db")).toEqual([
      "u:alice",
      "r:admin",
      "p:full",
      "res:db",
    ]);
    expect(engine.shortestPath("u:bob", "res:db")).toBeNull(); // ro has no db
  });
});

describe("neighborhood (LOD) is bounded", () => {
  it("respects nodeLimit and flags truncation", () => {
    const { engine } = GraphEngine.build(spec);
    const full = engine.neighborhood("u:alice", { dir: "down" });
    expect(full.truncated).toBe(false);
    const capped = engine.neighborhood("u:alice", {
      dir: "down",
      nodeLimit: 2,
    });
    expect(capped.truncated).toBe(true);
    expect(capped.nodes.length).toBeLessThanOrEqual(2);
    // induced edges never reference a node outside the returned set
    const ids = new Set(capped.nodes.map((nn) => nn.id));
    for (const e of capped.edges) {
      expect(ids.has(e.source)).toBe(true);
      expect(ids.has(e.target)).toBe(true);
    }
  });
});

describe("scale — engine agrees with naive closure on a big random DAG", () => {
  it("1000 nodes / ~4000 edges", () => {
    const N = 1000;
    const nodes = Array.from({ length: N }, (_, i) => ({
      id: `n${i}`,
      kind: "x",
      label: `n${i}`,
    }));
    const edges: GraphSpec["edges"] = [];
    let s = 12345;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    for (let i = 0; i < N; i += 1)
      for (let k = 0; k < 4; k += 1) {
        const j = i + 1 + Math.floor(rnd() * Math.min(20, N - i - 1));
        if (j < N) edges.push({ source: `n${i}`, target: `n${j}` });
      }
    const big: GraphSpec = { nodes, edges };
    const { engine, report } = GraphEngine.build(big);
    expect(report.errors).toBe(0); // DAG, no dangling
    for (const probe of ["n0", "n123", "n500", "n900"]) {
      expect(new Set(engine.reach(probe, { dir: "down" }))).toEqual(
        naiveReach(big, probe, "down"),
      );
    }
    const mx = graphMetrics(engine);
    expect(mx.nodes).toBe(N);
    expect(mx.edges).toBeGreaterThan(0);
    expect(mx.avgDegree).toBeGreaterThan(0);
  });
});

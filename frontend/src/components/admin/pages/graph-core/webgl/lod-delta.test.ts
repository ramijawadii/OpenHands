import { describe, it, expect } from "vitest";
import {
  levelForZoom,
  crossFade,
  bundleEdges,
  clusterCentroids,
  L0_MAX_ZOOM,
  L1_MAX_ZOOM,
  type BundleNode,
} from "./lod";
import { GraphScene, type SceneDelta } from "./scene";

// ── B4: LOD level + cross-fade ────────────────────────────────────────────────
describe("LOD level selection", () => {
  it("maps zoom to L0/L1/L2 bands", () => {
    expect(levelForZoom(0.1)).toBe("L0");
    expect(levelForZoom(0.5)).toBe("L1");
    expect(levelForZoom(1.5)).toBe("L2");
    expect(levelForZoom(L0_MAX_ZOOM)).toBe("L1"); // band edge → next level
    expect(levelForZoom(L1_MAX_ZOOM)).toBe("L2");
  });

  it("cross-fades linearly toward the next level, saturating at L2", () => {
    const a = crossFade(L0_MAX_ZOOM / 2);
    expect(a.level).toBe("L0");
    expect(a.next).toBe("L1");
    expect(a.t).toBeCloseTo(0.5);

    const top = crossFade(3);
    expect(top.level).toBe("L2");
    expect(top.next).toBeNull();
    expect(top.t).toBe(1);
  });
});

// ── B4: edge bundling ─────────────────────────────────────────────────────────
describe("edge bundling", () => {
  const nodes: BundleNode[] = [
    { id: "a1", x: 0, y: 0, cluster: "A" },
    { id: "a2", x: 10, y: 0, cluster: "A" },
    { id: "b1", x: 100, y: 0, cluster: "B" },
    { id: "b2", x: 110, y: 0, cluster: "B" },
  ];

  it("computes cluster centroids", () => {
    const c = clusterCentroids(nodes);
    expect(c.get("A")!.x).toBeCloseTo(5);
    expect(c.get("B")!.x).toBeCloseTo(105);
  });

  it("keeps intra-cluster edges straight, routes inter-cluster through centroids", () => {
    const bundled = bundleEdges(nodes, [
      { source: "a1", target: "a2" }, // same cluster
      { source: "a1", target: "b1" }, // cross cluster
    ]);
    const intra = bundled.find((e) => e.target === "a2")!;
    const inter = bundled.find((e) => e.target === "b1")!;
    expect(intra.bundled).toBe(false);
    expect(intra.points).toHaveLength(2); // straight
    expect(inter.bundled).toBe(true);
    expect(inter.points).toHaveLength(4); // endpoint→c(A)→c(B)→endpoint
  });

  it("drops dangling edges (missing endpoint)", () => {
    const bundled = bundleEdges(nodes, [{ source: "a1", target: "ghost" }]);
    expect(bundled).toHaveLength(0);
  });

  it("is deterministic", () => {
    const e = [{ source: "a1", target: "b2" }];
    expect(bundleEdges(nodes, e)).toEqual(bundleEdges(nodes, e));
  });
});

// ── B5: live delta patching ───────────────────────────────────────────────────
describe("GraphScene.applyDelta (live patching)", () => {
  function base(): GraphScene {
    const s = new GraphScene();
    s.setElements(
      [
        { id: "u:alice", x: 0, y: 0 },
        { id: "r:admin", x: 100, y: 0 },
      ],
      [{ source: "u:alice", target: "r:admin" }],
    );
    return s;
  }

  it("upserts a new node in place (no full rebuild)", () => {
    const s = base();
    const d: SceneDelta = {
      kind: "node",
      op: "upsert",
      node: { id: "res:kms", x: 200, y: 0 },
    };
    expect(s.applyDelta(d)).toBe(true);
    expect(s.nodeCount).toBe(3);
    expect(s.node("res:kms")!.x).toBe(200);
  });

  it("updates an existing node's position", () => {
    const s = base();
    s.applyDelta({
      kind: "node",
      op: "upsert",
      node: { id: "u:alice", x: 5, y: 9 },
    });
    expect(s.node("u:alice")!.x).toBe(5);
    expect(s.nodeCount).toBe(2); // updated, not duplicated
  });

  it("tombstones a node and drops its incident edges + adjacency", () => {
    const s = base();
    expect(s.applyDelta({ kind: "node", op: "tombstone", id: "r:admin" })).toBe(
      true,
    );
    expect(s.nodeCount).toBe(1);
    expect(s.edgeCount).toBe(0);
    expect(s.neighbors("u:alice")).toEqual([]);
  });

  it("upserts + tombstones edges idempotently", () => {
    const s = base();
    // duplicate edge upsert → no-op
    expect(
      s.applyDelta({
        kind: "edge",
        op: "upsert",
        edge: { source: "u:alice", target: "r:admin" },
      }),
    ).toBe(false);
    // new edge
    s.applyDelta({
      kind: "node",
      op: "upsert",
      node: { id: "res:kms", x: 200, y: 0 },
    });
    expect(
      s.applyDelta({
        kind: "edge",
        op: "upsert",
        edge: { source: "r:admin", target: "res:kms" },
      }),
    ).toBe(true);
    expect(s.edgeCount).toBe(2);
    // remove it again
    expect(
      s.applyDelta({
        kind: "edge",
        op: "tombstone",
        edge: { source: "r:admin", target: "res:kms" },
      }),
    ).toBe(true);
    expect(s.edgeCount).toBe(1);
  });

  it("applyDeltas returns the count actually applied", () => {
    const s = base();
    const applied = s.applyDeltas([
      { kind: "node", op: "upsert", node: { id: "n1", x: 1, y: 1 } },
      {
        kind: "edge",
        op: "upsert",
        edge: { source: "u:alice", target: "r:admin" },
      }, // dup → skipped
      { kind: "node", op: "tombstone", id: "n1" },
    ]);
    expect(applied).toBe(2);
  });
});

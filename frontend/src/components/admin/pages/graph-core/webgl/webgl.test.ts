import { describe, it, expect } from "vitest";
import { Camera } from "./camera";
import { Quadtree, boundsOf } from "./quadtree";
import { GraphScene, NODE_STRIDE } from "./scene";
import { WebglRenderer } from "./renderer";
import type { SceneEdgeInput, SceneNodeInput } from "./scene";

// ── camera: world↔screen (Cytoscape convention) ──────────────────────────────
describe("Camera", () => {
  it("round-trips world→screen→world", () => {
    const cam = new Camera({ zoom: 2, pan: { x: 30, y: -10 } });
    const w = { x: 12, y: 7 };
    const s = cam.worldToScreen(w);
    expect(s).toEqual({ x: 12 * 2 + 30, y: 7 * 2 - 10 });
    expect(cam.screenToWorld(s)).toEqual(w);
  });

  it("zoomAt keeps the anchor point fixed on screen", () => {
    const cam = new Camera({ zoom: 1, pan: { x: 0, y: 0 } });
    const anchor = { x: 400, y: 300 };
    const worldBefore = cam.screenToWorld(anchor);
    cam.zoomAt(anchor, 2.5);
    const worldAfter = cam.screenToWorld(anchor);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
  });

  it("clamps zoom to [min,max]", () => {
    const cam = new Camera({ minZoom: 0.5, maxZoom: 3 });
    cam.setZoom(100);
    expect(cam.zoom).toBe(3);
    cam.setZoom(0.001);
    expect(cam.zoom).toBe(0.5);
  });

  it("fit centres a bbox in the viewport", () => {
    const cam = new Camera();
    cam.fit({ x1: 0, y1: 0, x2: 100, y2: 100, w: 100, h: 100 }, 800, 600, 0);
    const c = cam.worldToScreen({ x: 50, y: 50 });
    expect(c.x).toBeCloseTo(400);
    expect(c.y).toBeCloseTo(300);
  });
});

// ── quadtree culling ──────────────────────────────────────────────────────────
describe("Quadtree", () => {
  it("returns only points inside the query rect", () => {
    const pts = [
      { id: "a", x: 1, y: 1 },
      { id: "b", x: 50, y: 50 },
      { id: "c", x: 99, y: 99 },
    ];
    const qt = Quadtree.fromPoints(pts);
    const hit = qt.query({ x1: 0, y1: 0, x2: 10, y2: 10, w: 10, h: 10 }).sort();
    expect(hit).toEqual(["a"]);
  });

  it("scales: a small window over 10k points returns a small set", () => {
    const pts = Array.from({ length: 10_000 }, (_, i) => ({
      id: `n${i}`,
      x: (i % 100) * 10,
      y: Math.floor(i / 100) * 10,
    }));
    const qt = Quadtree.fromPoints(pts);
    const hit = qt.query({ x1: -1, y1: -1, x2: 25, y2: 25, w: 26, h: 26 });
    // a 3×3 grid cell window → 9 points, not all 10k
    expect(hit.length).toBeLessThan(20);
    expect(hit.length).toBeGreaterThan(0);
  });

  it("boundsOf pads the max edge so edge points are contained", () => {
    const b = boundsOf([{ id: "x", x: 5, y: 5 }]);
    expect(b.x2).toBeGreaterThan(5);
    expect(b.y2).toBeGreaterThan(5);
  });
});

// ── scene: adjacency + packing ────────────────────────────────────────────────
describe("GraphScene", () => {
  const nodes: SceneNodeInput[] = [
    { id: "u:alice", x: 0, y: 0 },
    { id: "r:admin", x: 100, y: 0 },
    { id: "res:bucket", x: 200, y: 0 },
  ];
  const edges: SceneEdgeInput[] = [
    { source: "u:alice", target: "r:admin" },
    { source: "r:admin", target: "res:bucket" },
  ];

  it("builds adjacency for the dep-chain BFS primitive", () => {
    const s = new GraphScene();
    s.setElements(nodes, edges);
    expect(s.neighbors("r:admin").sort()).toEqual(["res:bucket", "u:alice"]);
    expect(s.nodeCount).toBe(3);
    expect(s.edgeCount).toBe(2);
  });

  it("packs visible nodes into a strided instance buffer", () => {
    const s = new GraphScene();
    s.setElements(nodes, edges);
    const buf = s.packNodes(["u:alice", "r:admin"]);
    expect(buf.length).toBe(2 * NODE_STRIDE);
    expect(buf[0]).toBe(0); // alice cx
    expect(buf[NODE_STRIDE]).toBe(100); // admin cx
  });

  it("packs only edges with a visible endpoint", () => {
    const s = new GraphScene();
    s.setElements(nodes, edges);
    // only alice visible → just the alice–admin edge is packed
    const buf = s.packEdges(new Set(["u:alice"]));
    expect(buf.length).toBe(4); // one edge × [x1,y1,x2,y2]
  });

  it("class + position mutation is reflected", () => {
    const s = new GraphScene();
    s.setElements(nodes, edges);
    s.addClass("u:alice", "picked");
    expect(s.node("u:alice")!.classes.has("picked")).toBe(true);
    s.setPosition("u:alice", 5, 5);
    expect(s.node("u:alice")!.x).toBe(5);
  });
});

// ── renderer: O(1) draw calls + headless safety ──────────────────────────────
describe("WebglRenderer", () => {
  function bigGraph(n: number): {
    nodes: SceneNodeInput[];
    edges: SceneEdgeInput[];
  } {
    const ns: SceneNodeInput[] = Array.from({ length: n }, (_, i) => ({
      id: `n${i}`,
      x: (i % 200) * 20,
      y: Math.floor(i / 200) * 20,
    }));
    const es: SceneEdgeInput[] = Array.from({ length: n - 1 }, (_, i) => ({
      source: `n${i}`,
      target: `n${i + 1}`,
    }));
    return { nodes: ns, edges: es };
  }

  it("constructs headless (no GL) and still runs the pipeline", () => {
    const r = new WebglRenderer(null);
    expect(r.hasGL).toBe(false);
    r.setElements([{ id: "a", x: 0, y: 0 }], []);
    r.resize(800, 600);
    const stats = r.render();
    expect(stats.visibleNodes).toBe(1);
    expect(stats.drawCalls).toBe(1); // nodes only (no edges)
  });

  it("keeps draw calls ≤ 2 regardless of element count (instanced O(1))", () => {
    const small = new WebglRenderer(null);
    const g50 = bigGraph(50);
    small.setElements(g50.nodes, g50.edges);
    small.resize(800, 600);
    small.camera.fit(small.scene.bounds(), 800, 600, 20);
    const s50 = small.render();

    const big = new WebglRenderer(null);
    const g50k = bigGraph(50_000);
    big.setElements(g50k.nodes, g50k.edges);
    big.resize(800, 600);
    big.camera.fit(big.scene.bounds(), 800, 600, 20);
    const s50k = big.render();

    expect(s50.drawCalls).toBeLessThanOrEqual(2);
    expect(s50k.drawCalls).toBeLessThanOrEqual(2);
    // both fully zoomed-to-fit → both draw all, but with the SAME call count
    expect(s50k.drawCalls).toBe(s50.drawCalls);
  });

  it("culls: a zoomed-in viewport uploads far fewer instances than the estate", () => {
    const r = new WebglRenderer(null);
    const g = bigGraph(50_000);
    r.setElements(g.nodes, g.edges);
    r.resize(800, 600);
    // zoom into the top-left corner
    r.camera.setZoom(2);
    r.camera.pan = { x: 0, y: 0 };
    const stats = r.render();
    expect(stats.visibleNodes).toBeGreaterThan(0);
    expect(stats.visibleNodes).toBeLessThan(50_000 / 4); // culled hard
  });
});

import { describe, it, expect } from "vitest";
import { WebglCanvas } from "./webgl-canvas";
import { encodeIndex } from "./picking";
import type { CanvasElements, GraphCanvasHandle } from "../canvas";

// The SAME contract the CytoscapeCanvas conformance test exercises, driven on the
// WebGL implementation. If both pass, `renderer=webgl` is a true drop-in swap.
function makeCanvas(): WebglCanvas {
  const c = new WebglCanvas(null); // headless: no GL, full data/cull pipeline
  c.renderer.resize(800, 600);
  const els: CanvasElements = {
    nodes: [
      {
        id: "u:alice",
        kind: "identity",
        label: "alice",
        position: { x: 0, y: 0 },
      },
      {
        id: "r:admin",
        kind: "role",
        label: "admin",
        position: { x: 100, y: 0 },
      },
      {
        id: "res:bucket",
        kind: "s3",
        label: "bucket",
        position: { x: 200, y: 0 },
      },
    ],
    edges: [
      { source: "u:alice", target: "r:admin", kind: "assumes_role" },
      { source: "r:admin", target: "res:bucket", kind: "grants_access" },
    ],
  };
  c.setElements(els);
  return c;
}

describe("WebglCanvas — GraphCanvasHandle conformance", () => {
  it("satisfies the GraphCanvasHandle type", () => {
    const h: GraphCanvasHandle = makeCanvas();
    expect(typeof h.getElementById).toBe("function");
  });

  it("reads elements by id + collection queries", () => {
    const c = makeCanvas();
    expect(c.getElementById("u:alice").id()).toBe("u:alice");
    expect(c.getElementById("u:alice").isNode()).toBe(true);
    expect(c.getElementById("u:alice").data("kind")).toBe("identity");
    expect(c.nodes().length).toBe(3);
  });

  it("adds/removes classes through the handle", () => {
    const c = makeCanvas();
    c.getElementById("u:alice").addClass("picked");
    expect(c.getElementById("u:alice").hasClass("picked")).toBe(true);
    c.nodes().addClass("rect");
    expect(c.getElementById("res:bucket").hasClass("rect")).toBe(true);
    c.nodes().removeClass("rect");
    expect(c.getElementById("res:bucket").hasClass("rect")).toBe(false);
  });

  it("traverses connected nodes (dep-chain BFS primitive)", () => {
    const c = makeCanvas();
    const ids = c
      .getElementById("r:admin")
      .connectedNodes()
      .map((n) => n.id())
      .sort();
    expect(ids).toContain("u:alice");
    expect(ids).toContain("res:bucket");
  });

  it("filters collections by predicate", () => {
    const c = makeCanvas();
    const roles = c.nodes().filter((n) => n.data("kind") === "role");
    expect(roles.map((n) => n.id())).toEqual(["r:admin"]);
  });

  it("drives the camera (zoom/pan get+set)", () => {
    const c = makeCanvas();
    c.zoom(1.5);
    expect(c.zoom()).toBeCloseTo(1.5);
    c.pan({ x: 10, y: 20 });
    expect(c.pan()).toEqual({ x: 10, y: 20 });
  });

  it("adds + removes elements structurally (live delta path)", () => {
    const c = makeCanvas();
    c.add({
      nodes: [
        {
          id: "res:kms",
          kind: "kms",
          label: "kms",
          position: { x: 300, y: 0 },
        },
      ],
      edges: [{ source: "r:admin", target: "res:kms" }],
    });
    expect(c.getElementById("res:kms").isNode()).toBe(true);
    expect(c.nodes().length).toBe(4);
    c.remove("#res:kms");
    expect(c.getElementById("res:kms").isNode()).toBe(false);
  });

  it("subscribes + dispatches events through on()/emit()", () => {
    const c = makeCanvas();
    let got: unknown = null;
    c.on("tap", (e) => {
      got = e;
    });
    c.emit("tap", { id: "u:alice" });
    expect(got).toEqual({ id: "u:alice" });
  });

  it("resolves a GPU pick color back to the node handle", () => {
    const c = makeCanvas();
    // alice was assigned first → index 0 → color encodeIndex(0)
    const handle = c.pick(encodeIndex(0));
    expect(handle?.id()).toBe("u:alice");
    // background (black) → no hit
    expect(c.pick([0, 0, 0])).toBeNull();
  });

  it("resolves a screen-space pointer to the node under it (CPU pick)", () => {
    const c = makeCanvas();
    c.zoom(1);
    c.pan({ x: 0, y: 0 }); // world == screen
    // alice sits at world (0,0) with default radius → a click near it hits alice
    expect(c.pickAt(3, 3)?.id()).toBe("u:alice");
    // far from any node → miss
    expect(c.pickAt(500, 500)).toBeNull();
  });

  it("supports style(display)/renderedPosition/remove (renderer-swap surface)", () => {
    const c = makeCanvas();
    c.render();
    expect(c.renderer.stats().visibleNodes).toBe(3);
    // hide one via style("display","none") → culled from the next frame
    c.getElementById("u:alice").style("display", "none");
    c.render();
    expect(c.renderer.stats().visibleNodes).toBe(2);
    // un-hide restores it
    c.nodes().style("display", "element");
    c.render();
    expect(c.renderer.stats().visibleNodes).toBe(3);
    // renderedPosition is a screen point (world→screen via the camera)
    const rp = c.getElementById("r:admin").renderedPosition();
    expect(Number.isFinite(rp.x) && Number.isFinite(rp.y)).toBe(true);
    // collection remove drops nodes (live-delta path)
    c.nodes()
      .filter((n) => n.id() === "res:bucket")
      .remove();
    expect(c.getElementById("res:bucket").isNode()).toBe(false);
  });

  it("supports directed transitive traversal + contains (dep-chain surface)", () => {
    const c = makeCanvas();
    // directed closure over the scene's out/in adjacency
    expect(
      c
        .getElementById("u:alice")
        .successors()
        .map((n) => n.id())
        .sort(),
    ).toEqual(["r:admin", "res:bucket"]);
    expect(
      c
        .getElementById("res:bucket")
        .predecessors()
        .map((n) => n.id())
        .sort(),
    ).toEqual(["r:admin", "u:alice"]);
    // one-hop directed
    expect(
      c
        .getElementById("r:admin")
        .outgoers()
        .map((n) => n.id()),
    ).toEqual(["res:bucket"]);
    expect(
      c
        .getElementById("r:admin")
        .incomers()
        .map((n) => n.id()),
    ).toEqual(["u:alice"]);
    // contains + singular length/visible/renderedHeight
    const succ = c.getElementById("u:alice").successors();
    expect(succ.contains(c.getElementById("r:admin"))).toBe(true);
    // union accepts a single element handle (chainSet self-inclusion)
    const chain = succ.union(c.getElementById("u:alice"));
    expect(chain.map((n) => n.id())).toContain("u:alice");
    expect(c.getElementById("u:alice").length).toBe(1);
    expect(c.getElementById("nope").length).toBe(0);
    expect(c.getElementById("u:alice").visible()).toBe(true);
    c.getElementById("u:alice").style("display", "none");
    expect(c.getElementById("u:alice").visible()).toBe(false);
  });

  it("renders headless with draw calls ≤ 2", () => {
    const c = makeCanvas();
    c.render();
    expect(c.renderer.stats().drawCalls).toBeLessThanOrEqual(2);
    expect(c.renderer.stats().visibleNodes).toBeGreaterThan(0);
  });
});

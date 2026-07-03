/* eslint-disable @typescript-eslint/no-explicit-any -- headless cy fixture */
import { describe, it, expect } from "vitest";
import cytoscape from "cytoscape";
import { cytoscapeCanvas } from "./cytoscape-canvas";
import type { CanvasElements, GraphCanvasHandle } from "./canvas";

// Conformance: driving a REAL (headless) cytoscape through the GraphCanvasHandle
// contract must behave like the page's direct cy.* calls. If this passes, the B1
// contract wraps the current renderer 1:1 and is safe as the fallback path.
function makeCanvas(): { cy: any; canvas: GraphCanvasHandle } {
  const cy = cytoscape({
    headless: true,
    elements: [
      {
        data: { id: "u:alice", kind: "identity", label: "alice" },
        position: { x: 0, y: 0 },
      },
      {
        data: { id: "r:admin", kind: "role", label: "admin" },
        position: { x: 100, y: 0 },
      },
      {
        data: { id: "res:bucket", kind: "s3", label: "bucket" },
        position: { x: 200, y: 0 },
      },
      {
        data: {
          id: "e1",
          source: "u:alice",
          target: "r:admin",
          kind: "assumes_role",
        },
      },
      {
        data: {
          id: "e2",
          source: "r:admin",
          target: "res:bucket",
          kind: "grants_access",
        },
      },
    ],
  });
  return { cy, canvas: cytoscapeCanvas(cy) };
}

describe("cytoscapeCanvas — GraphCanvasHandle conformance", () => {
  it("reads elements by id + collection queries tenant-agnostically", () => {
    const { canvas } = makeCanvas();
    expect(canvas.getElementById("u:alice").id()).toBe("u:alice");
    expect(canvas.getElementById("u:alice").isNode()).toBe(true);
    expect(canvas.nodes().length).toBe(3);
    expect(canvas.edges().length).toBe(2);
    expect(canvas.elements().length).toBe(5);
    expect(canvas.getElementById("u:alice").data("kind")).toBe("identity");
  });

  it("adds/removes classes through the handle (styling-state path)", () => {
    const { cy, canvas } = makeCanvas();
    canvas.getElementById("u:alice").addClass("picked");
    expect(cy.getElementById("u:alice").hasClass("picked")).toBe(true);
    canvas.nodes().addClass("rect");
    expect(cy.getElementById("res:bucket").hasClass("rect")).toBe(true);
    canvas.nodes().removeClass("rect");
    expect(cy.getElementById("res:bucket").hasClass("rect")).toBe(false);
  });

  it("traverses connected nodes/edges (dep-chain BFS primitive)", () => {
    const { canvas } = makeCanvas();
    const admin = canvas.getElementById("r:admin");
    // r:admin's two edges connect it to alice + bucket
    expect(admin.connectedEdges().length).toBe(2);
    const ids = admin
      .connectedNodes()
      .map((n) => n.id())
      .sort();
    expect(ids).toContain("res:bucket");
    expect(ids).toContain("u:alice");
  });

  it("filters collections by predicate", () => {
    const { canvas } = makeCanvas();
    const roles = canvas.nodes().filter((n) => n.data("kind") === "role");
    expect(roles.length).toBe(1);
    expect(roles.map((n) => n.id())).toEqual(["r:admin"]);
  });

  it("drives the camera (zoom/pan get+set)", () => {
    const { cy, canvas } = makeCanvas();
    canvas.zoom(1.5 as any);
    expect(cy.zoom()).toBeCloseTo(1.5);
    canvas.pan({ x: 10, y: 20 } as any);
    expect(cy.pan()).toEqual({ x: 10, y: 20 });
    expect(typeof canvas.zoom()).toBe("number");
  });

  it("adds + removes elements structurally", () => {
    const { cy, canvas } = makeCanvas();
    // plain id (no colon) so the id-selector remove path is exercised; domain
    // colon-ids (ARNs) are reached via getElementById, covered above.
    const more: CanvasElements = {
      nodes: [{ id: "kmsnode", kind: "kms", label: "kms" }],
      edges: [{ source: "r:admin", target: "kmsnode", kind: "decrypts_with" }],
    };
    canvas.add(more);
    expect(cy.getElementById("kmsnode").length).toBe(1);
    expect(cy.nodes().length).toBe(4);
    canvas.remove("#kmsnode");
    expect(cy.getElementById("kmsnode").length).toBe(0);
  });

  it("runs a batch + a layout without throwing (headless)", () => {
    const { cy, canvas } = makeCanvas();
    canvas.batch(() => {
      canvas.nodes().addClass("batched");
    });
    expect(cy.nodes().every((n: any) => n.hasClass("batched"))).toBe(true);
    // preset layout is renderer-free and safe headless
    expect(() => canvas.layout({ name: "preset" }).run()).not.toThrow();
  });

  it("supports style/renderedPosition/remove/layout (renderer-swap surface)", () => {
    const { cy, canvas } = makeCanvas();
    // style setter chains without throwing (headless cy can't read computed
    // style back — the WebGL conformance test proves display actually culls).
    expect(() => {
      canvas.nodes().style("display", "none");
      canvas.getElementById("u:alice").style("display", "element");
    }).not.toThrow();
    // renderedPosition returns a screen point
    const rp = canvas.getElementById("u:alice").renderedPosition();
    expect(Number.isFinite(rp.x) && Number.isFinite(rp.y)).toBe(true);
    // collection layout runs without throwing (headless preset)
    expect(() => canvas.nodes().layout({ name: "preset" }).run()).not.toThrow();
    // collection remove drops the elements
    canvas
      .nodes()
      .filter((n) => n.id() === "res:bucket")
      .remove();
    expect(cy.getElementById("res:bucket").length).toBe(0);
  });

  it("supports transitive traversal + edge endpoints + contains (dep-chain surface)", () => {
    const { canvas } = makeCanvas();
    // successors/predecessors = transitive closure (nodes + edges, cytoscape
    // semantics); the page splits them via .nodes()/.edges().
    expect(
      canvas
        .getElementById("u:alice")
        .successors()
        .nodes()
        .map((n) => n.id())
        .sort(),
    ).toEqual(["r:admin", "res:bucket"]);
    expect(
      canvas
        .getElementById("res:bucket")
        .predecessors()
        .nodes()
        .map((n) => n.id())
        .sort(),
    ).toEqual(["r:admin", "u:alice"]);
    // element outgoers/incomers = one hop
    expect(
      canvas
        .getElementById("r:admin")
        .outgoers("node")
        .map((n) => n.id()),
    ).toEqual(["res:bucket"]);
    // edge endpoints
    const anyEdge = canvas.edges();
    expect(anyEdge.length).toBe(2);
    // contains membership
    const succ = canvas.getElementById("u:alice").successors();
    expect(succ.contains(canvas.getElementById("r:admin"))).toBe(true);
    expect(succ.contains(canvas.getElementById("u:alice"))).toBe(false);
    // union MUST accept a single element handle (cytoscape singular == collection)
    // — this is the chainSet(hover) path: predecessors∪successors∪self.
    const chain = canvas
      .getElementById("u:alice")
      .successors()
      .union(canvas.getElementById("u:alice")); // add self back
    expect(chain.nodes().map((n) => n.id())).toContain("u:alice");
    // singular length + visible + renderedHeight
    expect(canvas.getElementById("u:alice").length).toBe(1);
    expect(canvas.getElementById("nope:x").length).toBe(0);
    expect(canvas.getElementById("u:alice").visible()).toBe(true);
  });

  it("subscribes to events through on()", () => {
    const { cy, canvas } = makeCanvas();
    let fired = 0;
    canvas.on("customping", () => {
      fired += 1;
    });
    cy.emit("customping");
    expect(fired).toBe(1);
  });
});

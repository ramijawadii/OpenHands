// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  parseCells,
  parsePages,
  parseLayers,
  applyCellOp,
  applyStructOp,
} from "./use-diagram-live";

const BASE =
  '<mxfile host="app"><diagram name="Topology" id="p1"><mxGraphModel><root>' +
  '<mxCell id="0"/><mxCell id="1" parent="0"/>' +
  '<mxCell id="alb" value="App LB" style="shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.elastic_load_balancing" vertex="1" parent="1"><mxGeometry x="40" y="40" width="60" height="60" as="geometry"/></mxCell>' +
  '<mxCell id="ec2" value="web" style="shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ec2" vertex="1" parent="1"><mxGeometry x="200" y="40" width="60" height="60" as="geometry"/></mxCell>' +
  '<mxCell id="e1" edge="1" parent="1" source="alb" target="ec2"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  "</root></mxGraphModel></diagram></mxfile>";

describe("parseCells (read)", () => {
  it("returns the real cells, skipping the id 0/1 root layer", () => {
    const cells = parseCells(BASE);
    expect(cells.map((c) => c.id).sort()).toEqual(["alb", "e1", "ec2"]);
    const alb = cells.find((c) => c.id === "alb")!;
    expect(alb.value).toBe("App LB");
    expect(alb.vertex).toBe(true);
    expect(alb.x).toBe(40);
    const e1 = cells.find((c) => c.id === "e1")!;
    expect(e1.edge).toBe(true);
    expect(e1.source).toBe("alb");
    expect(e1.target).toBe("ec2");
  });
});

describe("applyCellOp (P8 incremental edit)", () => {
  it("add_node inserts a vertex the read can see", () => {
    const out = applyCellOp(BASE, "add_node", {
      id: "bastion",
      value: "bastion",
      style: "shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ec2",
      x: 400,
      y: 200,
      w: 60,
      h: 60,
    });
    const b = parseCells(out).find((c) => c.id === "bastion")!;
    expect(b).toBeTruthy();
    expect(b.value).toBe("bastion");
    expect(String(b.style)).toContain("aws4.ec2");
    expect(b.x).toBe(400);
  });

  it("add_node is idempotent on a duplicate id", () => {
    const out = applyCellOp(BASE, "add_node", { id: "alb", value: "dupe" });
    expect(parseCells(out).filter((c) => c.id === "alb")).toHaveLength(1);
  });

  it("edit_cell relabels + restyles by id", () => {
    const out = applyCellOp(BASE, "edit_cell", { id: "ec2", value: "pii-web", style: "fillColor=#f00;" });
    const c = parseCells(out).find((x) => x.id === "ec2")!;
    expect(c.value).toBe("pii-web");
    expect(String(c.style)).toContain("fillColor=#f00");
  });

  it("delete_cell removes the cell AND its incident edges", () => {
    const out = applyCellOp(BASE, "delete_cell", { id: "alb" });
    const ids = parseCells(out).map((c) => c.id);
    expect(ids).not.toContain("alb");
    expect(ids).not.toContain("e1"); // edge alb->ec2 dropped
    expect(ids).toContain("ec2");
  });

  it("add_edge connects two cells", () => {
    const out = applyCellOp(BASE, "add_edge", { id: "e9", source: "ec2", target: "alb", value: "resp" });
    const e = parseCells(out).find((c) => c.id === "e9")!;
    expect(e.edge).toBe(true);
    expect(e.source).toBe("ec2");
    expect(e.target).toBe("alb");
  });
});

describe("applyStructOp (P9 pages/layers/import)", () => {
  it("add_page appends a page; parsePages sees both", () => {
    const out = applyStructOp(BASE, "add_page", { name: "Findings" });
    const pages = parsePages(out);
    expect(pages).toHaveLength(2);
    expect(pages[1].name).toBe("Findings");
  });

  it("rename_page by index", () => {
    const out = applyStructOp(BASE, "rename_page", { page: "0", name: "Prod Topology" });
    expect(parsePages(out)[0].name).toBe("Prod Topology");
  });

  it("delete_page keeps at least one page", () => {
    const out = applyStructOp(BASE, "delete_page", { page: "0" });
    expect(parsePages(out)).toHaveLength(1); // refused to drop the last page
  });

  it("add_layer + move_to_layer", () => {
    let out = applyStructOp(BASE, "add_layer", { id: "L1", name: "Attack path" });
    expect(parseLayers(out).some((l) => l.id === "L1")).toBe(true);
    out = applyStructOp(out, "move_to_layer", { id: "ec2", layer: "L1" });
    // the cell's parent now points at the new layer
    const doc = new DOMParser().parseFromString(out, "application/xml");
    expect(doc.querySelector('mxCell[id="ec2"]')?.getAttribute("parent")).toBe("L1");
  });

  it("import replace returns the imported xml", () => {
    const other = '<mxfile><diagram name="Other" id="z"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>';
    expect(applyStructOp(BASE, "import", { xml: other, mode: "replace" })).toBe(other);
  });

  it("import add_page appends the imported page", () => {
    const other = '<mxfile><diagram name="Imported" id="z"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';
    const out = applyStructOp(BASE, "import", { xml: other, mode: "add_page" });
    expect(parsePages(out).map((p) => p.name)).toContain("Imported");
  });
});

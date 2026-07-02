/* eslint-disable no-restricted-syntax -- test scans */
import { describe, it, expect } from "vitest";
import {
  GraphEngine,
  LocalGraphSource,
  Neo4jGraphSource,
  type GraphSource,
  type GraphSpec,
  type CypherRunner,
} from "./index";

const spec: GraphSpec = {
  nodes: [
    { id: "a", kind: "identity", label: "a" },
    { id: "b", kind: "role", label: "b" },
    { id: "c", kind: "policy", label: "c" },
    { id: "d", kind: "resource", label: "d" },
  ],
  edges: [
    { source: "a", target: "b", kind: "assumes_role" },
    { source: "b", target: "c", kind: "attached_policy" },
    { source: "c", target: "d", kind: "grants_access" },
  ],
};

// ── the contract every GraphSource implementation must satisfy ────────────────
// Drives the source through the same behaviours the UI relies on, so a graph-DB
// implementation is provably interchangeable with the in-memory one.
async function runGraphSourceContract(source: GraphSource) {
  expect(source.tenantId).toBeTruthy();

  const down = await source.reach("a", { dir: "down" });
  expect(new Set(down)).toEqual(new Set(["a", "b", "c", "d"]));

  const up = await source.reach("d", { dir: "up" });
  expect(new Set(up)).toEqual(new Set(["d", "c", "b", "a"]));

  expect(await source.blastRadius("a")).toBe(3);
  expect(await source.fanIn("d")).toBe(3);

  const path = await source.shortestPath("a", "d");
  expect(path).toEqual(["a", "b", "c", "d"]);
  expect(await source.shortestPath("d", "a", { dir: "down" })).toBeNull();

  const nb = await source.neighborhood("a", { dir: "down", nodeLimit: 2 });
  expect(nb.rootId).toBe("a");
  expect(nb.truncated).toBe(true);
  const ids = new Set(nb.nodes.map((n) => n.id));
  for (const e of nb.edges) {
    expect(ids.has(e.source)).toBe(true);
    expect(ids.has(e.target)).toBe(true);
  }

  const m = await source.metrics();
  expect(m.nodes).toBeGreaterThan(0);
}

describe("LocalGraphSource satisfies the GraphSource contract", () => {
  it("passes the full contract", async () => {
    const { engine, report } = GraphEngine.build(spec);
    await runGraphSourceContract(new LocalGraphSource(engine, report, "t1"));
  });
});

// ── Neo4jGraphSource: assert it emits correct, tenant-scoped, bounded Cypher ──
describe("Neo4jGraphSource builds correct Cypher", () => {
  it("scopes every query to the tenant and picks the right direction/bound", async () => {
    const calls: { cypher: string; params: Record<string, unknown> }[] = [];
    const runner: CypherRunner = async (cypher, params) => {
      calls.push({ cypher, params });
      // canned rows so the source's row-mapping is exercised
      if (cypher.includes("collect(DISTINCT n.id) AS ids"))
        return [{ ids: ["b", "c", "d"] }];
      if (cypher.includes("count(DISTINCT n) AS c")) return [{ c: 3 }];
      if (cypher.includes("shortestPath"))
        return [{ ids: ["a", "b", "c", "d"] }];
      if (cypher.includes("RETURN nodes, collect(DISTINCT e)"))
        return [
          {
            nodes: [{ properties: { id: "a", kind: "identity", label: "a" } }],
            edges: [],
            truncated: false,
          },
        ];
      return [{}];
    };
    const src = new Neo4jGraphSource(runner, "tenant-42");

    const down = await src.reach("a", { dir: "down", maxDepth: 2 });
    expect(new Set(down)).toEqual(new Set(["a", "b", "c", "d"]));
    const last = calls[calls.length - 1];
    expect(last.params.tenant).toBe("tenant-42"); // tenant-scoped
    expect(last.params.id).toBe("a");
    expect(last.cypher).toContain("-[r:REL*1..2]->"); // down + depth bound
    expect(last.cypher).toContain("n.tenantId = $tenant"); // guard

    await src.reach("a", { dir: "up" });
    expect(calls[calls.length - 1].cypher).toContain("<-[r:REL*1..]-"); // up, unbounded

    expect(await src.blastRadius("a")).toBe(3);
    expect(await src.shortestPath("a", "d")).toEqual(["a", "b", "c", "d"]);

    const nb = await src.neighborhood("a", { dir: "down", nodeLimit: 5 });
    expect(nb.rootId).toBe("a");
    expect(nb.nodes[0].id).toBe("a"); // properties unwrapped from the DB row
    expect(calls[calls.length - 1].params.limit).toBe(5);
  });
});

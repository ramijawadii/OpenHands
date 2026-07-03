import { describe, it, expect } from "vitest";
import {
  encodeIndex,
  decodeColor,
  PickingIndex,
  MAX_PICK_IDS,
} from "./picking";
import { selectLabels, type LabelCandidate } from "./labels";
import { Camera } from "./camera";

// ── GPU picking codec ─────────────────────────────────────────────────────────
describe("picking codec", () => {
  it("round-trips index→color→index across the range", () => {
    for (const i of [
      0,
      1,
      255,
      256,
      65535,
      65536,
      1_000_000,
      MAX_PICK_IDS - 1,
    ]) {
      expect(decodeColor(encodeIndex(i))).toBe(i);
    }
  });

  it("reserves black (0,0,0) for the background → decodes to -1", () => {
    expect(decodeColor([0, 0, 0])).toBe(-1);
  });

  it("keeps a stable, tenant-agnostic index↔id map", () => {
    const p = new PickingIndex();
    p.assign(["u:alice", "r:admin", "res:bucket"]);
    const c = p.colorFor("r:admin")!;
    // resolving that exact color returns the same id
    expect(p.idAt(c)).toBe("r:admin");
    // re-assign with more ids preserves existing indices (stable colors)
    const before = p.colorFor("u:alice");
    p.assign(["u:alice", "res:kms"]);
    expect(p.colorFor("u:alice")).toEqual(before);
    expect(p.size).toBe(4);
  });

  it("returns null for a color outside the assigned range", () => {
    const p = new PickingIndex();
    p.assign(["only"]);
    expect(p.idAt(encodeIndex(999))).toBeNull();
    expect(p.idAt([0, 0, 0])).toBeNull(); // background
  });

  it("packs per-instance pick colors aligned to the visible order", () => {
    const p = new PickingIndex();
    p.assign(["a", "b"]);
    const buf = p.packPickColors(["a", "b"]);
    expect(buf.length).toBe(6);
    // a → index 0 → color (1,0,0)/255
    expect(buf[0]).toBeCloseTo(1 / 255);
  });
});

// ── label LOD + collision ─────────────────────────────────────────────────────
describe("selectLabels", () => {
  const viewport = { width: 800, height: 600 };

  function grid(n: number): LabelCandidate[] {
    // n×n nodes spread across a large world so screen density depends on zoom
    const out: LabelCandidate[] = [];
    let k = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        out.push({ id: `n${k}`, x: i * 40, y: j * 40, priority: k });
        k += 1;
      }
    }
    return out;
  }

  it("never places two labels in the same collision cell", () => {
    const cam = new Camera({ zoom: 1, pan: { x: 0, y: 0 } });
    const placed = selectLabels(grid(30), cam, viewport, { cellSize: 22 });
    // all placed anchors must be distinct enough not to share a cell
    const cells = new Set(
      placed.map((p) => `${Math.floor(p.sx / 22)}:${Math.floor(p.sy / 22)}`),
    );
    expect(cells.size).toBe(placed.length);
  });

  it("caps the label count (bounded text upload)", () => {
    const cam = new Camera({ zoom: 3, pan: { x: 0, y: 0 } });
    const placed = selectLabels(grid(50), cam, viewport, { maxLabels: 50 });
    expect(placed.length).toBeLessThanOrEqual(50);
  });

  it("prefers higher-priority labels on collision", () => {
    const cam = new Camera({ zoom: 0.01, pan: { x: 0, y: 0 } }); // everything overlaps
    const cands: LabelCandidate[] = [
      { id: "low", x: 0, y: 0, priority: 1 },
      { id: "high", x: 1, y: 1, priority: 100 },
    ];
    const placed = selectLabels(cands, cam, viewport, { maxLabels: 1 });
    expect(placed).toHaveLength(1);
    expect(placed[0].id).toBe("high");
  });

  it("shows MORE labels zoomed in than zoomed out (LOD)", () => {
    const cands = grid(40);
    const out = selectLabels(
      cands,
      new Camera({ zoom: 0.15, pan: { x: 0, y: 0 } }),
      viewport,
    );
    const inn = selectLabels(
      cands,
      new Camera({ zoom: 2, pan: { x: 0, y: 0 } }),
      viewport,
    );
    expect(inn.length).toBeGreaterThan(out.length);
  });

  it("is deterministic across frames (stable tiebreak)", () => {
    const cam = new Camera({ zoom: 1, pan: { x: 0, y: 0 } });
    const a = selectLabels(grid(20), cam, viewport);
    const b = selectLabels(grid(20), cam, viewport);
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });
});

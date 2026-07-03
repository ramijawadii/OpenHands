/**
 * GPU picking (M2 / B3) — color-id hit-testing.
 *
 * Instead of CPU hit-testing every node against the cursor (O(n) per move), the
 * scene is rendered ONCE to an offscreen buffer where each node's fragment color
 * encodes its index. A pick reads a single pixel and decodes the index → id in
 * O(1), so selection/hover stay cheap even at 10k+ nodes.
 *
 * Encoding: index `i` → RGB bytes of `i + 1` (24-bit). 0/black is reserved for
 * the background (a miss), so `idAt` returns null there. Pure codec + index map;
 * the GL readPixels wiring is guarded in the renderer.
 */

/* eslint-disable no-bitwise -- 24-bit color-id packing is inherently bitwise */

export type RGB = [number, number, number];

/** Encode a 0-based instance index into an RGB triple (bytes 0..255). */
export function encodeIndex(index: number): RGB {
  const v = index + 1; // reserve 0 for background
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff];
}

/** Decode an RGB triple back to a 0-based index, or -1 for background. */
export function decodeColor(rgb: RGB): number {
  const v = rgb[0] | (rgb[1] << 8) | (rgb[2] << 16);
  return v - 1; // 0 → -1 (background)
}

/** Max distinct pickable ids the 24-bit color space supports. */
export const MAX_PICK_IDS = 0xffffff - 1;

/**
 * Maintains a stable index↔id mapping so pick colors are deterministic across
 * frames (a node keeps its color until the set changes). Tenant-agnostic: it
 * only ever knows the ids the renderer was handed for one tenant's graph.
 */
export class PickingIndex {
  private idByIndex: string[] = [];

  private indexById = new Map<string, number>();

  /** (Re)assign indices for the current id set, preserving existing ones. */
  assign(ids: string[]): void {
    for (const id of ids) {
      if (!this.indexById.has(id)) {
        const idx = this.idByIndex.length;
        this.idByIndex.push(id);
        this.indexById.set(id, idx);
      }
    }
  }

  colorFor(id: string): RGB | null {
    const idx = this.indexById.get(id);
    return idx === undefined ? null : encodeIndex(idx);
  }

  indexOf(id: string): number {
    return this.indexById.get(id) ?? -1;
  }

  /** Resolve a pixel color read from the pick buffer to a node id (or null). */
  idAt(rgb: RGB): string | null {
    const idx = decodeColor(rgb);
    return idx >= 0 && idx < this.idByIndex.length ? this.idByIndex[idx] : null;
  }

  get size(): number {
    return this.idByIndex.length;
  }

  clear(): void {
    this.idByIndex = [];
    this.indexById.clear();
  }

  /**
   * Pack per-instance pick colors (0..1 floats) aligned to the given visible id
   * order — this feeds the picking pass's instanced color attribute.
   */
  packPickColors(visibleIds: string[]): Float32Array {
    const buf = new Float32Array(visibleIds.length * 3);
    let o = 0;
    for (const id of visibleIds) {
      const c = this.colorFor(id);
      if (c) {
        buf[o] = c[0] / 255;
        buf[o + 1] = c[1] / 255;
        buf[o + 2] = c[2] / 255;
      }
      o += 3;
    }
    return buf;
  }
}

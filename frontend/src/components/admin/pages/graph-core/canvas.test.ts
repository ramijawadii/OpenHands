import { describe, it, expect } from "vitest";
import {
  selectRenderer,
  WEBGL_ELEMENT_THRESHOLD,
  type RendererCapabilities,
} from "./canvas";

// B1 — the GraphCanvas contract's renderer-selection is the seam that makes the
// WebGL swap invisible to the UI. These pin its authority order + fail-safety.
describe("selectRenderer — capability + scale resolution", () => {
  const caps = (
    webgl2: boolean,
    elementCount: number,
  ): RendererCapabilities => ({
    webgl2,
    elementCount,
  });

  it("honours an explicit override above everything (feature flag wins)", () => {
    // even a huge WebGL-capable graph stays on Cytoscape if pinned
    expect(selectRenderer(caps(true, 1_000_000), "cytoscape")).toBe(
      "cytoscape",
    );
    // even a tiny graph goes WebGL if pinned
    expect(selectRenderer(caps(true, 1), "webgl")).toBe("webgl");
  });

  it("falls back to Cytoscape whenever WebGL2 is unavailable (fail-safe)", () => {
    expect(selectRenderer(caps(false, 1_000_000))).toBe("cytoscape");
    expect(selectRenderer(caps(false, 10))).toBe("cytoscape");
    // an override to webgl cannot force it when the capability is absent…
    // (override is authoritative by design, but detectCapabilities gates the
    //  page from ever passing webgl when !webgl2 — covered at the call site)
  });

  it("uses WebGL only for large graphs when capable (scale path, not wholesale)", () => {
    expect(selectRenderer(caps(true, WEBGL_ELEMENT_THRESHOLD - 1))).toBe(
      "cytoscape",
    );
    expect(selectRenderer(caps(true, WEBGL_ELEMENT_THRESHOLD))).toBe("webgl");
    expect(selectRenderer(caps(true, WEBGL_ELEMENT_THRESHOLD + 5000))).toBe(
      "webgl",
    );
  });

  it("ignores a malformed override and resolves by capability/scale", () => {
    // @ts-expect-error — deliberately invalid override value, must be ignored
    expect(selectRenderer(caps(true, 10), "svg")).toBe("cytoscape");
    // @ts-expect-error — deliberately invalid override value, must be ignored
    expect(selectRenderer(caps(true, 999999), "svg")).toBe("webgl");
  });
});

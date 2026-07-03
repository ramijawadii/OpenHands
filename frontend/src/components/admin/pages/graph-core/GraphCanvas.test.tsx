import { describe, it, expect, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import * as React from "react";
import { GraphCanvas } from "./GraphCanvas";
import type { CanvasElements, GraphCanvasHandle } from "./canvas";

const elements: CanvasElements = {
  nodes: [
    {
      id: "u:alice",
      kind: "identity",
      label: "alice",
      position: { x: 0, y: 0 },
    },
    { id: "r:admin", kind: "role", label: "admin", position: { x: 100, y: 0 } },
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

describe("<GraphCanvas> mount vehicle", () => {
  it("mounts the WebGL path when forced + hands the page a working handle", async () => {
    const onReady = vi.fn();
    // jsdom has no WebGL2, but the WebglCanvas degrades to the headless pipeline,
    // so forcing renderer=webgl still yields a usable handle without a GPU.
    const { container } = render(
      React.createElement(GraphCanvas, {
        elements,
        renderer: "webgl",
        onReady,
      }),
    );
    await waitFor(() => expect(onReady).toHaveBeenCalled());

    const handle = onReady.mock.calls[0][0] as GraphCanvasHandle;
    expect(handle.nodes().length).toBe(3);
    expect(handle.getElementById("r:admin").data("kind")).toBe("role");
    expect(container.querySelector("[data-renderer='webgl']")).not.toBeNull();
    cleanup();
  });

  it("cleans up on unmount without throwing", async () => {
    const onReady = vi.fn();
    const { unmount } = render(
      React.createElement(GraphCanvas, {
        elements,
        renderer: "webgl",
        onReady,
      }),
    );
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    expect(() => unmount()).not.toThrow();
  });

  it("resolves to the Cytoscape fallback when WebGL is unavailable + no override", () => {
    const onReady = vi.fn();
    // no override → detectCapabilities() sees no webgl2 in jsdom → cytoscape.
    // (jsdom can't back a real cy canvas, so the mount fails safe — we assert the
    //  RESOLUTION here; the actual cy render is browser-verified.)
    const { container } = render(
      React.createElement(GraphCanvas, { elements, onReady }),
    );
    expect(
      container.querySelector("[data-renderer='cytoscape']"),
    ).not.toBeNull();
    cleanup();
  });
});

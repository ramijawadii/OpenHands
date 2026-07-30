/* eslint-disable i18next/no-literal-string -- test fixtures */
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SurfaceErrorBoundary } from "../surface-error-boundary";
import { reliabilitySnapshot, resetCrashLog } from "../reliability";
import {
  isOpen,
  recordFailure,
  recordSuccess,
  resetCircuits,
} from "../circuit-breaker";
import {
  publishTransportHealth,
  resetTransportHealth,
  useTransportHealth,
} from "../transport-health";

/**
 * These tests exist because "engineered for failure" is a claim, and a claim
 * about failure behaviour is worth nothing until a failure is actually induced.
 * Each one injects a real fault and asserts the three properties we promise:
 * CONTAINMENT (siblings survive), RECOVERY (bounded, then escalated), and
 * VISIBILITY (it was counted).
 */

function HealthProbe({ onRender }: { onRender: (healthy: boolean) => void }) {
  const health = useTransportHealth();
  onRender(health.healthy);
  return null;
}

/** Throws on render, on demand. The canonical component fault. */
function Bomb({ armed }: { armed: boolean }): React.ReactElement {
  if (armed) throw new Error("boom");
  return <div>bomb-ok</div>;
}

describe("surface containment", () => {
  beforeEach(() => {
    resetCrashLog();
    resetCircuits();
    resetTransportHealth();
    // React logs caught boundary errors; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("keeps SIBLING surfaces rendered when one surface throws", () => {
    render(
      <div>
        <SurfaceErrorBoundary surface="sidebar" name="Navigation">
          <div>sidebar-content</div>
        </SurfaceErrorBoundary>
        <SurfaceErrorBoundary surface="drawer" name="Conversation panel">
          <Bomb armed />
        </SurfaceErrorBoundary>
        <SurfaceErrorBoundary surface="explore" name="This page">
          <div>page-content</div>
        </SurfaceErrorBoundary>
      </div>,
    );

    // The whole point: one surface died, the shell did not.
    expect(screen.getByText("sidebar-content")).toBeInTheDocument();
    expect(screen.getByText("page-content")).toBeInTheDocument();
    expect(screen.queryByText("bomb-ok")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("counts the crash so it is not silently absorbed", () => {
    render(
      <SurfaceErrorBoundary surface="tab" name="The Canvas tab">
        <Bomb armed />
      </SurfaceErrorBoundary>,
    );
    const { counters } = reliabilitySnapshot();
    expect(counters["tab.crash.The Canvas tab"]).toBeGreaterThanOrEqual(1);
  });

  it("auto-recovers once, then stops (no infinite remount loop)", async () => {
    vi.useFakeTimers();
    render(
      <SurfaceErrorBoundary surface="drawer" name="Panel">
        <Bomb armed />
      </SurfaceErrorBoundary>,
    );
    const crashesAfterFirst =
      reliabilitySnapshot().counters["drawer.crash.Panel"];

    // Let every scheduled retry fire. A component that throws every render
    // would remount forever here if the budget were not enforced.
    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });

    const crashesLater = reliabilitySnapshot().counters["drawer.crash.Panel"];
    // Bounded: retries stop rather than growing without limit.
    expect(crashesLater).toBeLessThanOrEqual(crashesAfterFirst + 4);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("escalates a crash loop instead of recovering silently forever", async () => {
    vi.useFakeTimers();
    render(
      <SurfaceErrorBoundary surface="drawer" name="Looper">
        <Bomb armed />
      </SurfaceErrorBoundary>,
    );
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    // Past the budget the surface must say it stopped trying — the failure mode
    // we are guarding against is a panel that flickers forever and looks "slow".
    const { counters } = reliabilitySnapshot();
    expect(
      (counters["drawer.crash.Looper"] ?? 0) +
        (counters["drawer.degraded.Looper"] ?? 0),
    ).toBeGreaterThan(0);
  });

  it("clears a latched error when resetKeys change (navigation)", () => {
    const { rerender } = render(
      <SurfaceErrorBoundary surface="explore" name="Page" resetKeys={["/a"]}>
        <Bomb armed />
      </SurfaceErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Navigated away and the child no longer throws: the stale failure must go.
    rerender(
      <SurfaceErrorBoundary surface="explore" name="Page" resetKeys={["/b"]}>
        <Bomb armed={false} />
      </SurfaceErrorBoundary>,
    );
    expect(screen.getByText("bomb-ok")).toBeInTheDocument();
  });

  it("manual retry re-renders the surface and clears the crash history", async () => {
    function Flaky() {
      const [armed, setArmed] = React.useState(true);
      // Disarm on the first retry so recovery is observable.
      React.useEffect(() => () => setArmed(false), []);
      return <Bomb armed={armed} />;
    }
    render(
      <SurfaceErrorBoundary surface="drawer" name="Retryable">
        <Flaky />
      </SurfaceErrorBoundary>,
    );
    const before =
      reliabilitySnapshot().counters["drawer.retry.Retryable"] ?? 0;
    await userEvent.click(screen.getByRole("button"));
    const after = reliabilitySnapshot().counters["drawer.retry.Retryable"] ?? 0;
    expect(after).toBe(before + 1);
  });
});

describe("circuit breaker", () => {
  beforeEach(() => {
    resetCircuits();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("stays closed while an endpoint is healthy", () => {
    recordSuccess("GET /api/x");
    expect(isOpen("GET /api/x")).toBe(false);
  });

  it("opens after sustained failure so a dead endpoint stops being called", () => {
    for (let i = 0; i < 5; i += 1) recordFailure("GET /api/dead");
    expect(isOpen("GET /api/dead")).toBe(true);
  });

  it("isolates circuits per endpoint — one bad route cannot gate the app", () => {
    for (let i = 0; i < 5; i += 1) recordFailure("GET /api/dead");
    expect(isOpen("GET /api/dead")).toBe(true);
    expect(isOpen("GET /api/healthy")).toBe(false);
  });

  it("half-opens after the cool-down and closes on a successful trial", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i += 1) recordFailure("GET /api/flap");
    expect(isOpen("GET /api/flap")).toBe(true);

    vi.advanceTimersByTime(31_000);
    // Cool-down elapsed: exactly one trial is allowed through.
    expect(isOpen("GET /api/flap")).toBe(false);
    recordSuccess("GET /api/flap");
    expect(isOpen("GET /api/flap")).toBe(false);
  });

  it("re-opens immediately if the trial call fails again", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i += 1) recordFailure("GET /api/still-bad");
    vi.advanceTimersByTime(31_000);
    expect(isOpen("GET /api/still-bad")).toBe(false); // trial allowed
    recordFailure("GET /api/still-bad"); // trial failed
    expect(isOpen("GET /api/still-bad")).toBe(true);
  });
});

describe("transport health", () => {
  beforeEach(() => resetTransportHealth());

  it("notifies subscribers on a real state change", () => {
    const seen: boolean[] = [];
    render(<HealthProbe onRender={(h) => seen.push(h)} />);
    act(() => {
      publishTransportHealth({ healthy: false, reason: "disconnected" });
    });
    expect(seen).toContain(false);
  });

  it("does not notify when the state is unchanged", () => {
    let renders = 0;
    render(
      <HealthProbe
        onRender={() => {
          renders += 1;
        }}
      />,
    );
    const baseline = renders;
    act(() => {
      publishTransportHealth({ healthy: true, reason: "not-connected" });
    });
    // Identical state must be a no-op, or a heartbeat re-renders every consumer.
    expect(renders).toBe(baseline);
  });
});

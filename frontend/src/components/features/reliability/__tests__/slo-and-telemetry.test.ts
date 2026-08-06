/* eslint-disable no-await-in-loop -- flush cycles are intentionally sequential */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportReliability, resetCrashLog } from "../reliability";
import { SLOS, evaluateSlos, sloVerdict } from "../slo";
import {
  resetTelemetryForTests,
  startTelemetry,
  telemetryStateForTests,
} from "../telemetry-transport";
import { openHands } from "#/api/open-hands-axios";

/**
 * SLO maths and telemetry behaviour. Both are load-bearing during an incident
 * and both are easy to get subtly wrong in ways no user would ever report:
 * a budget that counts recoveries makes self-healing look like an outage, and a
 * sink that retries turns an outage into a storm.
 */

// The reliability ring buffer is module state shared across tests.
async function clearRing() {
  const mod = await import("../reliability");
  // Push past the 200-event cap so prior tests cannot leak into the window.
  for (let i = 0; i < 205; i += 1) {
    mod.reportReliability("request", "recovered", { detail: "flush" });
  }
}

describe("SLO evaluation", () => {
  beforeEach(async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    resetCrashLog();
    await clearRing();
  });
  afterEach(() => vi.restoreAllMocks());

  it("reports ok when nothing has failed", () => {
    const sidebar = evaluateSlos().find((r) => r.surface === "sidebar");
    expect(sidebar?.consumed).toBe(0);
    expect(sidebar?.status).toBe("ok");
  });

  it("does NOT charge the budget for recoveries or retries", () => {
    // A self-heal is the system working. Charging for it would make a healthy
    // surface look breached and destroy trust in the signal.
    for (let i = 0; i < 20; i += 1) {
      reportReliability("drawer", "recovered", { detail: "x" });
      reportReliability("drawer", "retry", { detail: "x" });
    }
    const drawer = evaluateSlos().find((r) => r.surface === "drawer");
    expect(drawer?.consumed).toBe(0);
    expect(drawer?.status).toBe("ok");
  });

  it("charges crashes and marks the budget exhausted when spent", () => {
    const { budget } = SLOS.find((s) => s.surface === "sidebar")!;
    for (let i = 0; i < budget + 1; i += 1) {
      reportReliability("sidebar", "crash", { detail: "Navigation" });
    }
    const sidebar = evaluateSlos().find((r) => r.surface === "sidebar");
    expect(sidebar?.status).toBe("exhausted");
    expect(sidebar?.burn).toBeGreaterThanOrEqual(1);
  });

  it("warns at_risk BEFORE the budget is gone", () => {
    // The point of an early-warning line is having budget left to act with.
    const tab = SLOS.find((s) => s.surface === "tab")!;
    for (let i = 0; i < Math.ceil(tab.budget * 0.5); i += 1) {
      reportReliability("tab", "crash", { detail: "Canvas" });
    }
    const result = evaluateSlos().find((r) => r.surface === "tab");
    expect(result?.status).toBe("at_risk");
  });

  it("ignores events outside the rolling window", () => {
    reportReliability("sidebar", "crash", { detail: "old" });
    // Evaluate as if two hours have passed: the 1h window must have moved on.
    const later = Date.now() + 2 * 60 * 60 * 1000;
    const sidebar = evaluateSlos(later).find((r) => r.surface === "sidebar");
    expect(sidebar?.consumed).toBe(0);
  });

  it("the overall verdict takes the WORST surface", () => {
    // A shell with working tabs and dead navigation is not "mostly healthy".
    for (let i = 0; i < 10; i += 1) {
      reportReliability("sidebar", "crash", { detail: "Navigation" });
    }
    const verdict = sloVerdict();
    expect(verdict.status).toBe("exhausted");
    expect(verdict.exhausted).toContain("sidebar");
  });

  it("every surface has a defined budget greater than zero", () => {
    // A zero budget would divide by zero and render a broken tile instead of a
    // breach; a missing SLO would silently exempt a surface.
    SLOS.forEach((s) => {
      expect(s.budget).toBeGreaterThan(0);
      expect(s.countKinds.length).toBeGreaterThan(0);
    });
  });
});

describe("telemetry transport", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    resetTelemetryForTests();
  });
  afterEach(() => {
    resetTelemetryForTests();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("batches instead of sending one request per event", () => {
    const post = vi.spyOn(openHands, "post").mockResolvedValue({} as never);
    const stop = startTelemetry();
    for (let i = 0; i < 5; i += 1) {
      reportReliability("drawer", "crash", { detail: "batch" });
    }
    // Queued, not sent: a request per event is what turns an incident into a
    // storm.
    expect(post).not.toHaveBeenCalled();
    expect(telemetryStateForTests().queued).toBe(5);
    stop();
  });

  it("bounds the queue so a crash loop cannot grow memory", () => {
    const stop = startTelemetry();
    for (let i = 0; i < 500; i += 1) {
      reportReliability("tab", "crash", { detail: "flood" });
    }
    expect(telemetryStateForTests().queued).toBeLessThanOrEqual(200);
    stop();
  });

  it("gives up after repeated failures rather than retrying forever", async () => {
    vi.spyOn(openHands, "post").mockRejectedValue(new Error("backend down"));
    vi.useFakeTimers();
    const stop = startTelemetry();
    reportReliability("drawer", "crash", { detail: "x" });

    // Three flush cycles, all failing.
    for (let i = 0; i < 3; i += 1) {
      reportReliability("drawer", "crash", { detail: "x" });
      await vi.advanceTimersByTimeAsync(10_500);
    }
    // The sink is optional; the app is not. It must switch itself off.
    expect(telemetryStateForTests().disabled).toBe(true);
    stop();
  });

  it("stops queueing once disabled, so a dead sink costs nothing", async () => {
    vi.spyOn(openHands, "post").mockRejectedValue(new Error("backend down"));
    vi.useFakeTimers();
    const stop = startTelemetry();
    for (let i = 0; i < 4; i += 1) {
      reportReliability("drawer", "crash", { detail: "x" });
      await vi.advanceTimersByTimeAsync(10_500);
    }
    expect(telemetryStateForTests().disabled).toBe(true);
    const before = telemetryStateForTests().queued;
    reportReliability("drawer", "crash", { detail: "after-disable" });
    expect(telemetryStateForTests().queued).toBe(before);
    stop();
  });

  it("a failing sink never reports its own failure (no self-feeding loop)", async () => {
    vi.spyOn(openHands, "post").mockRejectedValue(new Error("backend down"));
    vi.useFakeTimers();
    const stop = startTelemetry();
    reportReliability("drawer", "crash", { detail: "seed" });
    await vi.advanceTimersByTimeAsync(10_500);

    const { events } = (await import("../reliability")).reliabilitySnapshot();
    // No event may name the telemetry endpoint, or the sink becomes its own
    // traffic source and the incident never converges.
    expect(
      events.some((e) => (e.message ?? "").includes("client-events")),
    ).toBe(false);
    stop();
  });
});

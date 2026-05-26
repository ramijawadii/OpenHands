/**
 * Tests for compact-store (Layer 9)
 *
 * Coverage:
 *   - initial state: isCompacting=false, count=0, no dates, no summary
 *   - recordCompactionStarted: sets isCompacting=true
 *   - recordCompactionComplete: clears isCompacting, increments count,
 *       sets lastCompactedAt, stores summary
 *   - recordCompactionComplete without summary: preserves previous lastSummary
 *   - multiple compaction cycles: count accumulates correctly
 *   - reset: returns to initial state
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useCompactStore } from "../compact-store";

function getStore() {
  return useCompactStore.getState();
}

describe("useCompactStore", () => {
  beforeEach(() => {
    useCompactStore.getState().reset();
  });

  describe("initial state", () => {
    it("isCompacting is false", () => {
      expect(getStore().isCompacting).toBe(false);
    });

    it("compactionCount is 0", () => {
      expect(getStore().compactionCount).toBe(0);
    });

    it("lastCompactedAt is null", () => {
      expect(getStore().lastCompactedAt).toBeNull();
    });

    it("lastSummary is null", () => {
      expect(getStore().lastSummary).toBeNull();
    });
  });

  describe("recordCompactionStarted", () => {
    it("sets isCompacting to true", () => {
      getStore().recordCompactionStarted();
      expect(getStore().isCompacting).toBe(true);
    });

    it("does not change compactionCount", () => {
      getStore().recordCompactionStarted();
      expect(getStore().compactionCount).toBe(0);
    });
  });

  describe("recordCompactionComplete", () => {
    it("sets isCompacting to false", () => {
      getStore().recordCompactionStarted();
      getStore().recordCompactionComplete();
      expect(getStore().isCompacting).toBe(false);
    });

    it("increments compactionCount by 1", () => {
      getStore().recordCompactionComplete();
      expect(getStore().compactionCount).toBe(1);
    });

    it("sets lastCompactedAt to a Date", () => {
      const before = new Date();
      getStore().recordCompactionComplete();
      const after = new Date();
      const ts = getStore().lastCompactedAt;
      expect(ts).not.toBeNull();
      expect(ts!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(ts!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("stores provided summary", () => {
      getStore().recordCompactionComplete(
        "Context compacted: fixed the login bug.",
      );
      expect(getStore().lastSummary).toBe(
        "Context compacted: fixed the login bug.",
      );
    });

    it("preserves previous lastSummary when no summary argument passed", () => {
      getStore().recordCompactionComplete("first summary");
      getStore().recordCompactionComplete(); // no summary
      expect(getStore().lastSummary).toBe("first summary");
    });

    it("overwrites lastSummary when new summary provided", () => {
      getStore().recordCompactionComplete("first");
      getStore().recordCompactionComplete("second");
      expect(getStore().lastSummary).toBe("second");
    });
  });

  describe("multiple compaction cycles", () => {
    it("count accumulates across multiple completions", () => {
      getStore().recordCompactionComplete();
      getStore().recordCompactionComplete();
      getStore().recordCompactionComplete();
      expect(getStore().compactionCount).toBe(3);
    });

    it("start → complete → start → complete updates isCompacting correctly", () => {
      getStore().recordCompactionStarted();
      expect(getStore().isCompacting).toBe(true);
      getStore().recordCompactionComplete();
      expect(getStore().isCompacting).toBe(false);
      getStore().recordCompactionStarted();
      expect(getStore().isCompacting).toBe(true);
      getStore().recordCompactionComplete();
      expect(getStore().isCompacting).toBe(false);
      expect(getStore().compactionCount).toBe(2);
    });

    it("lastCompactedAt updates each completion", async () => {
      getStore().recordCompactionComplete();
      const first = getStore().lastCompactedAt!.getTime();

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 5);
      });
      getStore().recordCompactionComplete();
      const second = getStore().lastCompactedAt!.getTime();

      expect(second).toBeGreaterThanOrEqual(first);
    });
  });

  describe("reset", () => {
    it("resets isCompacting to false", () => {
      getStore().recordCompactionStarted();
      getStore().reset();
      expect(getStore().isCompacting).toBe(false);
    });

    it("resets compactionCount to 0", () => {
      getStore().recordCompactionComplete();
      getStore().recordCompactionComplete();
      getStore().reset();
      expect(getStore().compactionCount).toBe(0);
    });

    it("resets lastCompactedAt to null", () => {
      getStore().recordCompactionComplete();
      getStore().reset();
      expect(getStore().lastCompactedAt).toBeNull();
    });

    it("resets lastSummary to null", () => {
      getStore().recordCompactionComplete("some summary");
      getStore().reset();
      expect(getStore().lastSummary).toBeNull();
    });
  });
});

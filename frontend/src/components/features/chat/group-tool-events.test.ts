import { describe, expect, it } from "vitest";
import { segmentEvents, MIN_GROUP } from "./group-tool-events";

const call = (id: number) =>
  ({ id, action: "call_tool_mcp", source: "agent", args: {} }) as never;
const result = (id: number, cause: number) =>
  ({ id, observation: "mcp", source: "agent", cause, content: "" }) as never;
const shell = (id: number) =>
  ({ id, action: "run", source: "agent", args: {} }) as never;
const say = (id: number) =>
  ({ id, action: "message", source: "agent", args: {} }) as never;

describe("segmentEvents", () => {
  it("leaves a short run alone", () => {
    // Two calls read fine individually; collapsing them hides the results
    // without buying meaningful space.
    const segs = segmentEvents([call(1), result(2, 1), call(3), result(4, 3)]);
    expect(segs.every((s) => s.type === "single")).toBe(true);
  });

  it("groups a run at the threshold", () => {
    const evs: (ReturnType<typeof call> | ReturnType<typeof result>)[] = [];
    for (let i = 0; i < MIN_GROUP; i += 1) {
      evs.push(call(i * 2 + 1), result(i * 2 + 2, i * 2 + 1));
    }
    const segs = segmentEvents(evs);
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe("group");
  });

  it("counts ACTIONS, not events", () => {
    // Three events — two calls and one result — is two actions, under the
    // threshold. Counting events would wrongly group it.
    const segs = segmentEvents([call(1), result(2, 1), call(3)]);
    expect(segs.every((s) => s.type === "single")).toBe(true);
  });

  it("breaks a run on a non-tool event", () => {
    const segs = segmentEvents([
      call(1),
      result(2, 1),
      call(3),
      result(4, 3),
      say(5), // interrupts
      call(6),
      result(7, 6),
      call(8),
      result(9, 8),
      call(10),
      result(11, 10),
    ]);
    // The trailing run of three groups; the leading pair does not.
    expect(segs.filter((s) => s.type === "group")).toHaveLength(1);
    expect(segs.some((s) => s.type === "single")).toBe(true);
  });

  it("never groups shell commands", () => {
    const segs = segmentEvents([shell(1), shell(2), shell(3), shell(4)]);
    expect(segs.every((s) => s.type === "single")).toBe(true);
  });

  it("preserves every event exactly once", () => {
    // The transcript must not lose or duplicate an event through segmentation.
    const evs = [
      say(1),
      call(2),
      result(3, 2),
      call(4),
      result(5, 4),
      call(6),
      result(7, 6),
      shell(8),
    ];
    const segs = segmentEvents(evs);
    const flat = segs.flatMap((s) =>
      s.type === "group" ? s.events : [s.event],
    );
    expect(flat).toHaveLength(evs.length);
    expect(flat.map((e) => (e as { id: number }).id)).toEqual(
      evs.map((e) => (e as { id: number }).id),
    );
  });

  it("handles an empty transcript", () => {
    expect(segmentEvents([])).toEqual([]);
  });
});

describe("richness rule", () => {
  const rich = (id: number, cause: number) =>
    ({
      id,
      observation: "mcp",
      source: "agent",
      cause,
      extras: { name: "kb_search" },
      content: JSON.stringify([
        { control: "CIS AWS 2.1.1", title: "Deny HTTP", severity: "HIGH" },
      ]),
    }) as never;

  it("does not swallow a result that renders as its own widget", () => {
    // Four calls would normally group. The third returns a control list, which
    // is the answer the operator asked for — folding it into a row of tool
    // names would hide exactly what this work exists to surface.
    const segs = segmentEvents([
      call(1),
      result(2, 1),
      call(3),
      result(4, 3),
      call(5),
      rich(6, 5),
      call(7),
      result(8, 7),
    ]);
    const flat = segs.flatMap((s) =>
      s.type === "group" ? s.events : [s.event],
    );
    // Still every event, exactly once.
    expect(flat).toHaveLength(8);
    // The rich observation is never inside a group.
    const grouped = segs
      .filter((s) => s.type === "group")
      .flatMap((s) => (s.type === "group" ? s.events : []));
    expect(grouped.some((e) => (e as { id: number }).id === 6)).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { buildMessageLookups } from "#/components/features/chat/message-lookups";
import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";

// Minimal event fixtures — buildMessageLookups only reads id / cause / content + the
// action|observation discriminator the guards key on (`action` vs `observation`).
const action = (id: number): OpenHandsAction =>
  ({
    id,
    source: "agent",
    action: "run_ipython",
    args: { code: "" },
  }) as unknown as OpenHandsAction;

const observation = (
  id: number,
  cause: number,
  content = "",
): OpenHandsObservation =>
  ({
    id,
    cause,
    source: "agent",
    observation: "run_ipython",
    content,
    extras: {},
  }) as unknown as OpenHandsObservation;

describe("buildMessageLookups", () => {
  it("indexes actions by id and observations by cause", () => {
    const msgs = [action(1), observation(2, 1), action(3)];
    const lk = buildMessageLookups(msgs);
    expect(lk.actionById.get(1)?.id).toBe(1);
    expect(lk.actionById.get(3)?.id).toBe(3);
    expect(lk.observationByCauseId.get(1)?.id).toBe(2);
    // action 3 has no paired observation
    expect(lk.observationByCauseId.has(3)).toBe(false);
  });

  it("first observation for a cause wins (matches old .find/.some semantics)", () => {
    const msgs = [
      action(1),
      observation(2, 1, "first"),
      observation(5, 1, "second"),
    ];
    const lk = buildMessageLookups(msgs);
    expect(lk.observationByCauseId.get(1)?.content).toBe("first");
  });

  it("extracts the plan snapshot from an observation's content", () => {
    const md = "noise [CLOUDGUARD_PLAN]\n- [x] done step\n[/CLOUDGUARD_PLAN] tail";
    const msgs = [action(1), observation(2, 1, md)];
    const lk = buildMessageLookups(msgs);
    expect(lk.planSnapshotByCause.get(1)).toBe("- [x] done step");
  });

  it("records no plan when the observation carries none", () => {
    const msgs = [action(1), observation(2, 1, "plain output")];
    const lk = buildMessageLookups(msgs);
    expect(lk.planSnapshotByCause.has(1)).toBe(false);
  });

  it("ignores observations without a numeric cause", () => {
    const orphan = {
      id: 9,
      source: "agent",
      observation: "run",
      content: "x",
      extras: {},
    } as unknown as OpenHandsObservation;
    const lk = buildMessageLookups([orphan]);
    expect(lk.observationByCauseId.size).toBe(0);
  });

  it("returns empty maps for an empty list", () => {
    const lk = buildMessageLookups([]);
    expect(lk.actionById.size).toBe(0);
    expect(lk.observationByCauseId.size).toBe(0);
    expect(lk.planSnapshotByCause.size).toBe(0);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  useCommandQueueStore,
  selectNextIndex,
  PRIORITY,
  QueuedCommand,
} from "#/stores/command-queue-store";

const mk = (priority: QueuedCommand["priority"]): QueuedCommand => ({
  id: Math.random().toString(36),
  conversationId: "c1",
  text: priority,
  images: [],
  files: [],
  priority,
  enqueuedAt: new Date().toISOString(),
});

describe("selectNextIndex", () => {
  it("returns -1 for an empty queue", () => {
    expect(selectNextIndex([])).toBe(-1);
  });

  it("picks the lowest priority number (now < next < later)", () => {
    expect(PRIORITY.now).toBeLessThan(PRIORITY.next);
    expect(PRIORITY.next).toBeLessThan(PRIORITY.later);
    const q = [mk("later"), mk("next"), mk("now")];
    expect(selectNextIndex(q)).toBe(2); // the "now" item
  });

  it("is FIFO within a level (earliest of equal priority wins)", () => {
    const q = [mk("next"), mk("next"), mk("next")];
    expect(selectNextIndex(q)).toBe(0);
  });

  it("prefers a higher priority even if enqueued later", () => {
    const q = [mk("next"), mk("later"), mk("now")];
    expect(selectNextIndex(q)).toBe(2);
  });
});

describe("useCommandQueueStore", () => {
  beforeEach(() => {
    useCommandQueueStore.setState({ queue: [], log: [] });
  });

  it("enqueues with a default priority of next, stamps conversationId, logs the op", () => {
    const id = useCommandQueueStore.getState().enqueue("c1", "hello", [], []);
    const s = useCommandQueueStore.getState();
    expect(s.queue).toHaveLength(1);
    expect(s.queue[0]).toMatchObject({
      id,
      conversationId: "c1",
      text: "hello",
      priority: "next",
    });
    expect(s.log.at(-1)).toMatchObject({ op: "enqueue", id, priority: "next" });
  });

  it("dequeues in priority order, then FIFO", () => {
    const { enqueue, dequeue } = useCommandQueueStore.getState();
    enqueue("c1", "a", [], [], "next");
    enqueue("c1", "b", [], [], "now");
    enqueue("c1", "c", [], [], "next");
    expect(dequeue()?.text).toBe("b"); // now first
    expect(dequeue()?.text).toBe("a"); // then FIFO next
    expect(dequeue()?.text).toBe("c");
    expect(dequeue()).toBeUndefined();
    expect(useCommandQueueStore.getState().queue).toHaveLength(0);
  });

  it("keeps turns from different conversations separable (Finding A)", () => {
    const { enqueue } = useCommandQueueStore.getState();
    enqueue("convA", "a-msg", [], []);
    enqueue("convB", "b-msg", [], []);
    const { queue } = useCommandQueueStore.getState();
    const forA = queue.filter((t) => t.conversationId === "convA");
    const forB = queue.filter((t) => t.conversationId === "convB");
    expect(forA.map((t) => t.text)).toEqual(["a-msg"]);
    expect(forB.map((t) => t.text)).toEqual(["b-msg"]);
    // selectNextIndex over a single-conversation slice never returns the other conv's turn
    expect(forA[selectNextIndex(forA)].conversationId).toBe("convA");
  });

  it("remove drops a specific queued command", () => {
    const { enqueue, remove } = useCommandQueueStore.getState();
    const id = enqueue("c1", "x", [], []);
    enqueue("c1", "y", [], []);
    remove(id);
    const s = useCommandQueueStore.getState();
    expect(s.queue.map((c) => c.text)).toEqual(["y"]);
    expect(s.log.at(-1)).toMatchObject({ op: "remove", id });
  });

  it("promoteToNow makes a later item flush first", () => {
    const { enqueue, promoteToNow, dequeue } = useCommandQueueStore.getState();
    enqueue("c1", "first", [], [], "next");
    const lateId = enqueue("c1", "urgent", [], [], "later");
    promoteToNow(lateId);
    expect(dequeue()?.text).toBe("urgent");
  });

  it("clear empties the queue and logs it", () => {
    const { enqueue, clear } = useCommandQueueStore.getState();
    enqueue("c1", "a", [], []);
    enqueue("c1", "b", [], []);
    clear();
    const s = useCommandQueueStore.getState();
    expect(s.queue).toHaveLength(0);
    expect(s.log.at(-1)).toMatchObject({ op: "clear" });
  });

  it("caps the op log at 200 entries", () => {
    const { enqueue } = useCommandQueueStore.getState();
    for (let i = 0; i < 250; i += 1) enqueue("c1", `m${i}`, [], []);
    expect(useCommandQueueStore.getState().log.length).toBeLessThanOrEqual(200);
  });
});

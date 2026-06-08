import { create } from "zustand";

/**
 * Priority command queue — a frontend input buffer for turns typed while the agent is
 * busy (mem-mgmt §2). The backend event stream stays authoritative for ordering; this
 * only decides WHICH buffered turn flushes next and lets the user reorder/cancel before
 * it does.
 *
 *   now   (0) — interrupt: stop the agent and run this turn immediately.
 *   next  (1) — normal queued turn (typed while the agent runs); flushes when idle.
 *   later (2) — low-priority / deferred.
 *
 * Port of Claude Code's now/next/later queue. Dequeue is a linear scan (queues are tiny,
 * < ~20 items) picking the lowest priority number, FIFO within a level.
 */

export type CommandPriority = "now" | "next" | "later";

export const PRIORITY: Record<CommandPriority, number> = {
  now: 0,
  next: 1,
  later: 2,
};

export interface QueuedCommand {
  id: string;
  text: string;
  images: File[];
  files: File[];
  priority: CommandPriority;
  enqueuedAt: string;
}

export interface QueueOp {
  op: "enqueue" | "dequeue" | "remove" | "promote" | "clear";
  id?: string;
  priority?: CommandPriority;
  at: string;
}

const LOG_CAP = 200;

/**
 * Index of the next command to flush: lowest priority number, FIFO within a level.
 * Pure + exported for unit testing. Returns -1 for an empty queue.
 */
export function selectNextIndex(queue: QueuedCommand[]): number {
  let best = -1;
  let bestRank = Number.POSITIVE_INFINITY;
  for (let i = 0; i < queue.length; i += 1) {
    const rank = PRIORITY[queue[i].priority];
    // strict < keeps FIFO within a level (the earlier-enqueued item wins ties)
    if (rank < bestRank) {
      bestRank = rank;
      best = i;
    }
  }
  return best;
}

let seq = 0;
function newId(): string {
  seq += 1;
  return `cq-${Date.now().toString(36)}-${seq}`;
}

interface CommandQueueState {
  queue: QueuedCommand[];
  log: QueueOp[];
  enqueue: (
    text: string,
    images: File[],
    files: File[],
    priority?: CommandPriority,
  ) => string;
  /** Remove and return the next command to flush (highest priority, FIFO). */
  dequeue: () => QueuedCommand | undefined;
  remove: (id: string) => void;
  /** Bump a queued command to `now` (the flush side treats it as an interrupt). */
  promoteToNow: (id: string) => void;
  clear: () => void;
}

function pushLog(log: QueueOp[], entry: QueueOp): QueueOp[] {
  const next = [...log, entry];
  return next.length > LOG_CAP ? next.slice(next.length - LOG_CAP) : next;
}

export const useCommandQueueStore = create<CommandQueueState>((set, get) => ({
  queue: [],
  log: [],

  enqueue: (text, images, files, priority = "next") => {
    const id = newId();
    const at = new Date().toISOString();
    set((s) => ({
      queue: [
        ...s.queue,
        { id, text, images, files, priority, enqueuedAt: at },
      ],
      log: pushLog(s.log, { op: "enqueue", id, priority, at }),
    }));
    return id;
  },

  dequeue: () => {
    const { queue } = get();
    const idx = selectNextIndex(queue);
    if (idx < 0) return undefined;
    const item = queue[idx];
    set((s) => ({
      queue: s.queue.filter((_, i) => i !== idx),
      log: pushLog(s.log, {
        op: "dequeue",
        id: item.id,
        priority: item.priority,
        at: new Date().toISOString(),
      }),
    }));
    return item;
  },

  remove: (id) =>
    set((s) => ({
      queue: s.queue.filter((c) => c.id !== id),
      log: pushLog(s.log, { op: "remove", id, at: new Date().toISOString() }),
    })),

  promoteToNow: (id) =>
    set((s) => ({
      queue: s.queue.map((c) =>
        c.id === id ? { ...c, priority: "now" as CommandPriority } : c,
      ),
      log: pushLog(s.log, {
        op: "promote",
        id,
        priority: "now",
        at: new Date().toISOString(),
      }),
    })),

  clear: () =>
    set((s) => ({
      queue: [],
      log: pushLog(s.log, { op: "clear", at: new Date().toISOString() }),
    })),
}));

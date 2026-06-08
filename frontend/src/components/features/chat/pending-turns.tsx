/* eslint-disable i18next/no-literal-string */
import { ArrowUp, X } from "lucide-react";
import { QueuedCommand } from "#/stores/command-queue-store";

/**
 * Buffered turns the user typed while the agent was busy (mem-mgmt §2). They flush in
 * priority order when the agent goes idle; "Run now" interrupts (stop + run immediately),
 * the ✕ cancels before it ever runs.
 */
export function PendingTurns({
  items,
  onRunNow,
  onCancel,
}: {
  items: QueuedCommand[];
  onRunNow: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className="flex flex-col gap-1 rounded-md border px-2 py-1.5 text-xs"
      style={{
        borderColor: "var(--cg-border)",
        background: "var(--cg-bg-badge)",
        color: "var(--cg-text-muted)",
      }}
    >
      <span>Queued ({items.length}) — will run when the agent is free</span>
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-2">
          {it.priority === "now" && (
            <span
              className="rounded px-1 text-[10px] font-medium shrink-0"
              style={{
                background: "var(--cg-bg-active)",
                color: "var(--cg-text-primary)",
              }}
            >
              now
            </span>
          )}
          <span
            className="truncate flex-1"
            style={{ color: "var(--cg-text-nav)" }}
            title={it.text}
          >
            {it.text}
          </span>
          <button
            type="button"
            onClick={() => onRunNow(it.id)}
            title="Run now (interrupt the agent)"
            className="flex items-center gap-0.5 rounded border px-1 py-0.5 hover:opacity-80"
            style={{ borderColor: "var(--cg-border)" }}
          >
            <ArrowUp size={11} />
            now
          </button>
          <button
            type="button"
            onClick={() => onCancel(it.id)}
            title="Cancel this queued turn"
            className="rounded border p-0.5 hover:opacity-80"
            style={{ borderColor: "var(--cg-border)" }}
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

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
      // Embedded in the composer strip, so no card of its own — the strip is
      // already the surface. Colours come from the composer's palette.
      className="flex w-full flex-col gap-1.5 text-xs"
      style={{ color: "var(--color-muted-foreground)" }}
    >
      <span>Queued ({items.length}) — will run when the agent is free</span>
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-2">
          {it.priority === "now" && (
            <span
              className="shrink-0 rounded-full px-2 text-[10px] font-semibold"
              style={{
                background: "var(--color-primary)",
                color: "var(--color-primary-foreground)",
              }}
            >
              now
            </span>
          )}
          <span
            className="truncate flex-1"
            style={{ color: "var(--color-foreground)" }}
            title={it.text}
          >
            {it.text}
          </span>
          <button
            type="button"
            onClick={() => onRunNow(it.id)}
            title="Run now (interrupt the agent)"
            className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold hover:opacity-80"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-foreground)",
            }}
          >
            <ArrowUp size={11} />
            now
          </button>
          <button
            type="button"
            onClick={() => onCancel(it.id)}
            title="Cancel this queued turn"
            className="flex size-5 items-center justify-center rounded-full border hover:opacity-80"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-muted-foreground)",
            }}
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

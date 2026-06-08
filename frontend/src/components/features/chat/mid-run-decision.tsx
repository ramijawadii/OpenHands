/* eslint-disable i18next/no-literal-string */
import { CornerUpRight, ListPlus, X } from "lucide-react";

/**
 * Shown when the user submits a message while the agent is busy (mem-mgmt §2). The user
 * decides PER MESSAGE whether to:
 *   • Add to current — send it now so the agent weaves it into the CURRENT task (it is
 *     added to history and picked up on the agent's next step within the same run); or
 *   • Queue for next — buffer it to run as a separate turn once the agent is free.
 * ✕ puts the text back in the input.
 */
export function MidRunDecision({
  text,
  onAddToCurrent,
  onQueue,
  onDismiss,
}: {
  text: string;
  onAddToCurrent: () => void;
  onQueue: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-md border px-3 py-2 text-xs"
      style={{
        borderColor: "var(--cg-border)",
        background: "var(--cg-bg-badge)",
        color: "var(--cg-text-muted)",
      }}
    >
      <span>
        The agent is working. Add this to the current task, or queue it to run
        next?
      </span>
      <div
        className="truncate"
        style={{ color: "var(--cg-text-nav)" }}
        title={text}
      >
        {text}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAddToCurrent}
          className="flex items-center gap-1 rounded px-2 py-1 font-medium"
          style={{
            background: "var(--cg-text-nav)",
            color: "var(--cg-bg-primary)",
          }}
        >
          <CornerUpRight size={12} />
          Add to current
        </button>
        <button
          type="button"
          onClick={onQueue}
          className="flex items-center gap-1 rounded border px-2 py-1"
          style={{
            borderColor: "var(--cg-border)",
            color: "var(--cg-text-nav)",
          }}
        >
          <ListPlus size={12} />
          Queue for next
        </button>
        <button
          type="button"
          onClick={onDismiss}
          title="Cancel — put the text back in the input"
          className="rounded border p-1"
          style={{ borderColor: "var(--cg-border)" }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

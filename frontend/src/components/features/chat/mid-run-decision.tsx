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
    <div className="flex w-full flex-col gap-2 text-xs">
      <span style={{ color: "var(--color-muted-foreground)" }}>
        The agent is working. Add this to the current task, or queue it to run
        next?
      </span>
      <div
        className="truncate"
        style={{ color: "var(--color-foreground)" }}
        title={text}
      >
        {text}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* Same vocabulary as the composer's send button: the primary choice
            is the solid inverted chip, the alternative is an outline. Both
            follow the composer's own palette rather than the page's, so the
            banner cannot end up light-on-light when it sits inside the box. */}
        <button
          type="button"
          onClick={onAddToCurrent}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
          }}
        >
          <CornerUpRight size={12} />
          Add to current
        </button>
        <button
          type="button"
          onClick={onQueue}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-foreground)",
          }}
        >
          <ListPlus size={12} />
          Queue for next
        </button>
        <button
          type="button"
          onClick={onDismiss}
          title="Cancel — put the text back in the input"
          className="flex size-6 items-center justify-center rounded-full border transition-colors"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-muted-foreground)",
          }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

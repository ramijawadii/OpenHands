/* eslint-disable i18next/no-literal-string */
interface TaskItemProps {
  task: {
    id: string;
    title: string;
    status: "todo" | "in_progress" | "done";
    notes?: string;
  };
}

/** Monochrome checkbox in the VSCode / Claude Code style — uses the app's own
 *  --cg-* gray palette (never a colored/emoji glyph). Empty = todo, filled-dot =
 *  in progress, SVG check = done. The check is an inline SVG so it can never get an
 *  emoji (blue) presentation. */
function TaskCheckbox({ status }: { status: TaskItemProps["task"]["status"] }) {
  const base =
    "mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border";
  if (status === "done") {
    return (
      <span
        className={base}
        style={{
          borderColor: "var(--cg-text-muted)",
          background: "var(--cg-text-muted)",
        }}
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2.5 6.2 L4.8 8.5 L9.5 3.5"
            stroke="var(--cg-bg, #1a1a1a)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className={base} style={{ borderColor: "var(--cg-text-primary)" }}>
        <span
          className="h-[6px] w-[6px] rounded-[1px]"
          style={{ background: "var(--cg-text-muted)" }}
        />
      </span>
    );
  }
  return (
    <span
      className="mt-[3px] inline-block h-3.5 w-3.5 shrink-0 rounded-[3px] border"
      style={{ borderColor: "var(--cg-border-strong)" }}
    />
  );
}

export function TaskItem({ task }: TaskItemProps) {
  const done = task.status === "done";
  return (
    <div className="flex items-start gap-2 py-0.5">
      <TaskCheckbox status={task.status} />
      <div className="min-w-0 flex-1">
        <span
          className="text-sm"
          style={{
            color: done ? "var(--cg-text-muted)" : "var(--cg-text-primary)",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {task.title || "Untitled task"}
        </span>
        {task.notes && (
          <span
            className="mt-0.5 block text-xs italic"
            style={{ color: "var(--cg-text-muted)" }}
          >
            {task.notes}
          </span>
        )}
      </div>
    </div>
  );
}

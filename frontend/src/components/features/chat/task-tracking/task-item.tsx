/* eslint-disable i18next/no-literal-string */
interface TaskItemProps {
  task: {
    id: string;
    title: string;
    status: "todo" | "in_progress" | "done";
    notes?: string;
  };
}

/** Monochrome checkbox in the VSCode / Claude Code style — gray/white, no emoji,
 *  no color badges. Empty = todo, filled-dot = in progress, check = done. */
function TaskCheckbox({ status }: { status: TaskItemProps["task"]["status"] }) {
  if (status === "done") {
    return (
      <span className="mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-neutral-400 bg-neutral-300 text-[10px] leading-none text-neutral-900">
        ✓
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-neutral-300">
        <span className="h-[6px] w-[6px] rounded-[1px] bg-neutral-300" />
      </span>
    );
  }
  return (
    <span className="mt-[3px] inline-block h-3.5 w-3.5 shrink-0 rounded-[3px] border border-neutral-600" />
  );
}

export function TaskItem({ task }: TaskItemProps) {
  const done = task.status === "done";
  return (
    <div className="flex items-start gap-2 py-0.5">
      <TaskCheckbox status={task.status} />
      <div className="min-w-0 flex-1">
        <span
          className={
            done
              ? "text-sm text-neutral-500 line-through"
              : "text-sm text-neutral-100"
          }
        >
          {task.title || "Untitled task"}
        </span>
        {task.notes && (
          <span className="mt-0.5 block text-xs italic text-neutral-500">
            {task.notes}
          </span>
        )}
      </div>
    </div>
  );
}

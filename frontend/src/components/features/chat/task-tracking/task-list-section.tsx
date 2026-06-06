import { TaskItem } from "./task-item";

interface TaskListSectionProps {
  taskList: Array<{
    id: string;
    title: string;
    status: "todo" | "in_progress" | "done";
    notes?: string;
  }>;
}

export function TaskListSection({ taskList }: TaskListSectionProps) {
  return (
    <div className="flex flex-col gap-0.5 max-h-[400px] overflow-auto">
      {taskList.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}

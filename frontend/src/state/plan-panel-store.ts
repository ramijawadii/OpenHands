import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { PlanTodo } from "#/components/tool-ui/plan/schema";

/**
 * The plan the agent is working to, shared between the composer's indicator and
 * the banner it opens.
 *
 * They live in different component trees — the button is inside the prompt
 * input, the banner is a node the conversation passes down as a prop — so the
 * open/closed state cannot be local to either.
 */
interface PlanPanelStore {
  todos: PlanTodo[];
  isOpen: boolean;
  setTodos: (todos: PlanTodo[]) => void;
  toggle: () => void;
  close: () => void;
}

export const usePlanPanelStore = create<PlanPanelStore>()(
  devtools(
    (set) => ({
      todos: [],
      isOpen: false,
      setTodos: (todos) => set({ todos }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      close: () => set({ isOpen: false }),
    }),
    { name: "plan-panel-store" },
  ),
);

/** Done / total, for the indicator's badge. */
export const planProgress = (todos: PlanTodo[]) => ({
  done: todos.filter((t) => t.status === "completed").length,
  total: todos.length,
});

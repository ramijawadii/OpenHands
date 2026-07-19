import { ReactNode } from "react";

interface TabContainerProps {
  children: ReactNode;
}

export function TabContainer({ children }: TabContainerProps) {
  return (
    <div className="bg-[var(--cg-bg-page)] border-l border-[var(--cg-border-strong)] flex flex-col h-full w-full">
      {children}
    </div>
  );
}

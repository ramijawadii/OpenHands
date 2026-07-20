import { ReactNode } from "react";

interface TabContainerProps {
  children: ReactNode;
}

export function TabContainer({ children }: TabContainerProps) {
  // The page divider + panel background live on the right column in
  // desktop-layout, so this is just a full-height flex shell.
  return <div className="flex flex-col h-full w-full">{children}</div>;
}

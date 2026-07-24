import { ReactNode } from "react";

interface TabContainerProps {
  children: ReactNode;
}

export function TabContainer({ children }: TabContainerProps) {
  // The page divider + panel background live on the right column in
  // desktop-layout, so this is just a full-height flex shell.
  // `relative` anchors the agent-loading overlay (which must sit on top of the
  // tabs rather than replace them — see conversation-tab-content).
  return <div className="relative flex flex-col h-full w-full">{children}</div>;
}

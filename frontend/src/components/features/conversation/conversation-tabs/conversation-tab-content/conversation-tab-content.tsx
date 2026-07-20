/* eslint-disable i18next/no-literal-string */
import { lazy } from "react";
import { ConversationLoading } from "../../conversation-loading";
import { TabWrapper } from "./tab-wrapper";
import { TabContainer } from "./tab-container";
import { TabContentArea } from "./tab-content-area";
import Terminal from "#/components/features/terminal/terminal";
import { useConversationStore } from "#/state/conversation-store";

// Lazy load all tab components
const EditorTab = lazy(() => import("#/routes/commands-tab"));
const JupyterTab = lazy(() => import("#/routes/jupyter-tab"));
const DiagramsTab = lazy(() => import("#/routes/diagrams-tab"));
const StatesTab = lazy(() => import("#/routes/states-tab"));

export function ConversationTabContent() {
  const { selectedTab, shouldShownAgentLoading } = useConversationStore();

  const isEditorActive = selectedTab === "editor";
  const isJupyterActive = selectedTab === "jupyter";
  const isTerminalActive = selectedTab === "terminal";
  const isDiagramsActive = selectedTab === "diagrams";
  const isStatesActive = selectedTab === "states";

  const tabs = [
    { key: "editor", component: EditorTab, isActive: isEditorActive },
    { key: "jupyter", component: JupyterTab, isActive: isJupyterActive },
    { key: "terminal", component: Terminal, isActive: isTerminalActive },
    { key: "diagrams", component: DiagramsTab, isActive: isDiagramsActive },
    { key: "states", component: StatesTab, isActive: isStatesActive },
  ];

  if (shouldShownAgentLoading) {
    return <ConversationLoading />;
  }

  return (
    <TabContainer>
      <TabContentArea>
        {tabs.map(({ key, component: Component, isActive }) => (
          <TabWrapper key={key} isActive={isActive}>
            <Component />
          </TabWrapper>
        ))}
      </TabContentArea>
    </TabContainer>
  );
}

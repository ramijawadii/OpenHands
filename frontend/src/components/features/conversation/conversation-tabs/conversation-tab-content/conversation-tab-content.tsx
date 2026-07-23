/* eslint-disable i18next/no-literal-string */
import { lazy } from "react";
import { ConversationLoading } from "../../conversation-loading";
import { TabWrapper } from "./tab-wrapper";
import { TabContainer } from "./tab-container";
import { TabContentArea } from "./tab-content-area";
import { useConversationStore } from "#/state/conversation-store";

// Lazy load all tab components.
//
// The store keys are HISTORICAL and no longer match their labels — they are kept
// so tab selections already persisted in localStorage keep resolving:
//   "terminal" = Chat, "jupyter" = Canvas, "diagrams" = Report,
//   "states" = Communication, "sandbox" = Settings.
const EditorTab = lazy(() => import("#/routes/commands-tab"));
const ChatTab = lazy(() => import("#/routes/chat-tab"));
// Canvas: Documents · Sheet · Notebook (JupyterLab IDE) · Whiteboard.
const CanvasTab = lazy(() => import("#/routes/canvas-tab"));
const DiagramsTab = lazy(() => import("#/routes/diagrams-tab"));
// Communication took over the "states" key when the Logs tab was removed.
// logs-tab.tsx / states-tab.tsx are intentionally kept on disk.
const CommunicationTab = lazy(() => import("#/routes/communication-tab"));
const RemediationTab = lazy(() => import("#/routes/remediation-tab"));
const SandboxHealthTab = lazy(() => import("#/routes/sandbox-health-tab"));

export function ConversationTabContent() {
  const { selectedTab, shouldShownAgentLoading } = useConversationStore();

  const isEditorActive = selectedTab === "editor";
  const isJupyterActive = selectedTab === "jupyter";
  const isTerminalActive = selectedTab === "terminal";
  const isDiagramsActive = selectedTab === "diagrams";
  const isStatesActive = selectedTab === "states";
  const isRemediationActive = selectedTab === "remediation";
  const isSandboxActive = selectedTab === "sandbox";

  const tabs = [
    { key: "editor", component: EditorTab, isActive: isEditorActive },
    { key: "jupyter", component: CanvasTab, isActive: isJupyterActive },
    { key: "terminal", component: ChatTab, isActive: isTerminalActive },
    { key: "diagrams", component: DiagramsTab, isActive: isDiagramsActive },
    { key: "states", component: CommunicationTab, isActive: isStatesActive },
    {
      key: "remediation",
      component: RemediationTab,
      isActive: isRemediationActive,
    },
    { key: "sandbox", component: SandboxHealthTab, isActive: isSandboxActive },
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

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
//   "terminal" = Chat, "jupyter" = Canvas, "diagrams" = Report, "sandbox" = Settings.
// Communication moved OUT of the drawer to the sidebar (replacing "Issues"), so
// the "states" key is retired here; communication-tab.tsx is reused by the page.
const EditorTab = lazy(() => import("#/routes/commands-tab"));
const ChatTab = lazy(() => import("#/routes/chat-tab"));
// Canvas: Documents · Sheet · Notebook (JupyterLab IDE) · Whiteboard.
const CanvasTab = lazy(() => import("#/routes/canvas-tab"));
// Report: artifact discovery (filter by type/date) + open-by-type viewers.
const ReportTab = lazy(() => import("#/routes/report-view"));
const RemediationTab = lazy(() => import("#/routes/remediation-tab"));
const SandboxHealthTab = lazy(() => import("#/routes/sandbox-health-tab"));

export function ConversationTabContent() {
  const { selectedTab, shouldShownAgentLoading } = useConversationStore();

  const isEditorActive = selectedTab === "editor";
  const isJupyterActive = selectedTab === "jupyter";
  const isTerminalActive = selectedTab === "terminal";
  const isDiagramsActive = selectedTab === "diagrams";
  const isRemediationActive = selectedTab === "remediation";
  const isSandboxActive = selectedTab === "sandbox";

  const tabs = [
    { key: "editor", component: EditorTab, isActive: isEditorActive },
    { key: "jupyter", component: CanvasTab, isActive: isJupyterActive },
    { key: "terminal", component: ChatTab, isActive: isTerminalActive },
    { key: "diagrams", component: ReportTab, isActive: isDiagramsActive },
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

/* eslint-disable i18next/no-literal-string */
import { lazy } from "react";
import { ConversationLoading } from "../../conversation-loading";
import { TabWrapper } from "./tab-wrapper";
import { TabContainer } from "./tab-container";
import { TabContentArea } from "./tab-content-area";
import { useConversationStore } from "#/state/conversation-store";

// Lazy load all tab components
const EditorTab = lazy(() => import("#/routes/commands-tab"));
// "terminal" now renders the embedded Chat (the xterm tab was removed); the key
// is kept so persisted tab selections stay valid.
const ChatTab = lazy(() => import("#/routes/chat-tab"));
// "jupyter" key now renders the Data Analysis tab (Jupyter · Sheet · Data
// Connector · File Systems); the key is kept for persisted selections.
const DataAnalysisTab = lazy(() => import("#/routes/data-analysis-tab"));
const DiagramsTab = lazy(() => import("#/routes/diagrams-tab"));
// Logs replaces the old States (file-history rewind) panel. states-tab.tsx is
// intentionally kept on disk — rewind belongs in the remediation path, not here.
const LogsTab = lazy(() => import("#/routes/logs-tab"));
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
    { key: "jupyter", component: DataAnalysisTab, isActive: isJupyterActive },
    { key: "terminal", component: ChatTab, isActive: isTerminalActive },
    { key: "diagrams", component: DiagramsTab, isActive: isDiagramsActive },
    { key: "states", component: LogsTab, isActive: isStatesActive },
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

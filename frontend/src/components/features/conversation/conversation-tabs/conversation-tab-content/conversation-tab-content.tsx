/* eslint-disable i18next/no-literal-string */
import { lazy, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ConversationLoading } from "../../conversation-loading";
import { I18nKey } from "#/i18n/declaration";
import { TabWrapper } from "./tab-wrapper";
import { TabContainer } from "./tab-container";
import { TabContentArea } from "./tab-content-area";
import { ConversationTabTitle } from "../conversation-tab-title";
import Terminal from "#/components/features/terminal/terminal";
import { useConversationStore } from "#/state/conversation-store";

// Lazy load all tab components
const EditorTab = lazy(() => import("#/routes/changes-tab"));
const JupyterTab = lazy(() => import("#/routes/jupyter-tab"));
const VSCodeTab = lazy(() => import("#/routes/vscode-tab"));
const DiagramsTab = lazy(() => import("#/routes/diagrams-tab"));

export function ConversationTabContent() {
  const { selectedTab, shouldShownAgentLoading } = useConversationStore();

  const { t } = useTranslation();

  const isEditorActive = selectedTab === "editor";
  const isJupyterActive = selectedTab === "jupyter";
  const isVSCodeActive = selectedTab === "vscode";
  const isTerminalActive = selectedTab === "terminal";
  const isDiagramsActive = selectedTab === "diagrams";

  const tabs = [
    { key: "editor", component: EditorTab, isActive: isEditorActive },
    { key: "jupyter", component: JupyterTab, isActive: isJupyterActive },
    { key: "vscode", component: VSCodeTab, isActive: isVSCodeActive },
    { key: "terminal", component: Terminal, isActive: isTerminalActive },
    { key: "diagrams", component: DiagramsTab, isActive: isDiagramsActive },
  ];

  const conversationTabTitle = useMemo(() => {
    if (isEditorActive) return t(I18nKey.COMMON$CHANGES);
    if (isJupyterActive) return t(I18nKey.COMMON$JUPYTER);
    if (isVSCodeActive) return t(I18nKey.COMMON$CODE);
    if (isTerminalActive) return t(I18nKey.COMMON$TERMINAL);
    if (isDiagramsActive) return "Pages";
    return "";
  }, [
    isEditorActive,
    isJupyterActive,
    isVSCodeActive,
    isTerminalActive,
    isDiagramsActive,
  ]);

  if (shouldShownAgentLoading) {
    return <ConversationLoading />;
  }

  return (
    <TabContainer>
      <ConversationTabTitle title={conversationTabTitle} />
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

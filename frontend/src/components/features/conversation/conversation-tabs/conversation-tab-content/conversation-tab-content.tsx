/* eslint-disable i18next/no-literal-string */
import React, { lazy } from "react";
import { ConversationLoading } from "../../conversation-loading";
import { TabWrapper } from "./tab-wrapper";
import { TabContainer } from "./tab-container";
import { TabContentArea } from "./tab-content-area";
import { TabErrorBoundary } from "./tab-error-boundary";
import { useConversationStore } from "#/state/conversation-store";

// Human labels for the boundary message (keys are historical — see below).
const TAB_LABELS: Record<string, string> = {
  editor: "Commands",
  jupyter: "Canvas",
  terminal: "Chat",
  diagrams: "Report",
  remediation: "Remediation",
  sandbox: "Settings",
};

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

/**
 * `loadingFallback` lets a host substitute its own busy state for the default
 * OpenHands spinner. The explore drawer passes a skeleton so it shows exactly
 * one loading treatment; the conversation page passes nothing and keeps the
 * stock spinner.
 */
export function ConversationTabContent({
  loadingFallback,
}: {
  loadingFallback?: React.ReactNode;
} = {}) {
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

  // The loading state is an OVERLAY, never an early return. Returning
  // <ConversationLoading/> instead unmounted every tab — and remounting the
  // Canvas Notebook re-initialises JupyterLab, which blows up on its
  // module-level singletons ("Cell executor can only be set once") and sends the
  // FAST design-token store into infinite recursion ("Maximum call stack size
  // exceeded"). Keeping the tabs mounted makes that class of crash impossible.
  return (
    <TabContainer>
      <TabContentArea>
        {tabs.map(({ key, component: Component, isActive }) => (
          <TabWrapper key={key} isActive={isActive}>
            <TabErrorBoundary name={TAB_LABELS[key] ?? key}>
              <Component />
            </TabErrorBoundary>
          </TabWrapper>
        ))}
      </TabContentArea>
      {shouldShownAgentLoading && (
        <div className="absolute inset-0 z-20 bg-[var(--cg-bg-page)]">
          {loadingFallback ?? <ConversationLoading />}
        </div>
      )}
    </TabContainer>
  );
}

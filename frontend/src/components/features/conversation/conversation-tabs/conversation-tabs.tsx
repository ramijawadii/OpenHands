import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "@uidotdev/usehooks";
import {
  StickyNote,
  FileTerminal,
  ScrollText,
  MessagesSquare,
  Workflow,
  Activity,
  X,
} from "lucide-react";
import { cn } from "#/utils/utils";
import { ConversationTabNav } from "./conversation-tab-nav";
import { ChatActionTooltip } from "../../chat/chat-action-tooltip";
import { I18nKey } from "#/i18n/declaration";
import {
  useConversationStore,
  type ConversationTab,
} from "#/state/conversation-store";

export function ConversationTabs() {
  const {
    selectedTab,
    isRightPanelShown,
    setHasRightPanelToggled,
    setSelectedTab,
  } = useConversationStore();

  // Persist selectedTab and isRightPanelShown in localStorage
  const [persistedSelectedTab, setPersistedSelectedTab] =
    useLocalStorage<ConversationTab | null>(
      "conversation-selected-tab",
      "editor",
    );

  const [persistedIsRightPanelShown, setPersistedIsRightPanelShown] =
    useLocalStorage<boolean>("conversation-right-panel-shown", true);

  const onTabChange = (value: ConversationTab | null) => {
    setSelectedTab(value);
    // Persist the selected tab to localStorage
    setPersistedSelectedTab(value);
  };

  // Initialize Zustand state from localStorage on component mount
  useEffect(() => {
    // Coerce stale persisted selections for tabs that no longer exist, so a
    // returning user never lands on an empty panel. "conversations" became a
    // mode of the Chat view rather than a tab of its own.
    const STALE: Record<string, ConversationTab> = {
      vscode: "terminal",
      // Commands is no longer a panel tab — it lives inside the Chat view.
      editor: "terminal",
      conversations: "terminal",
    };
    const initialTab =
      STALE[persistedSelectedTab as string] ?? persistedSelectedTab;
    if (initialTab !== persistedSelectedTab) {
      setPersistedSelectedTab(initialTab);
    }
    setSelectedTab(initialTab);
    setHasRightPanelToggled(persistedIsRightPanelShown);
  }, [
    setSelectedTab,
    setHasRightPanelToggled,
    persistedSelectedTab,
    persistedIsRightPanelShown,
    setPersistedSelectedTab,
  ]);

  useEffect(() => {
    const handlePanelVisibilityChange = () => {
      if (isRightPanelShown) {
        // If no tab is selected, default to editor tab
        if (!selectedTab) {
          onTabChange("editor");
        }
      }
    };

    handlePanelVisibilityChange();
  }, [isRightPanelShown, selectedTab, onTabChange]);

  const { t } = useTranslation();

  const onTabSelected = (tab: ConversationTab) => {
    if (selectedTab === tab && isRightPanelShown) {
      // If clicking the same active tab, close the drawer
      setHasRightPanelToggled(false);
      setPersistedIsRightPanelShown(false);
    } else {
      // If clicking a different tab or drawer is closed, open drawer and select tab
      onTabChange(tab);
      if (!isRightPanelShown) {
        setHasRightPanelToggled(true);
        setPersistedIsRightPanelShown(true);
      }
    }
  };

  const isTabActive = (tab: ConversationTab) =>
    isRightPanelShown && selectedTab === tab;

  // Chat · Commands · Jupyter · Report · Logs · Remediation · Sandbox.
  // The store keys are historical
  // ("terminal" = Chat, "diagrams" = Report, "states" = Logs) so that tab
  // selections already persisted in localStorage keep resolving.
  const tabs = [
    {
      isActive: isTabActive("terminal"),
      icon: MessagesSquare,
      label: "Chat",
      onClick: () => onTabSelected("terminal"),
      tooltipContent: "Chat — the conversation, embedded in the panel",
      tooltipAriaLabel: "Chat",
    },
    {
      isActive: isTabActive("jupyter"),
      icon: FileTerminal,
      label: "Data Analysis",
      onClick: () => onTabSelected("jupyter"),
      tooltipContent:
        "Data Analysis — Jupyter, Sheet, Data Connector, File Systems",
      tooltipAriaLabel: "Data Analysis",
    },
    {
      isActive: isTabActive("diagrams"),
      icon: StickyNote,
      label: "Report",
      onClick: () => onTabSelected("diagrams"),
      tooltipContent: "Report — generated artifacts and diagrams",
      tooltipAriaLabel: "Report",
    },
    {
      isActive: isTabActive("states"),
      icon: ScrollText,
      label: "Logs",
      onClick: () => onTabSelected("states"),
      tooltipContent: "Logs — audit trail of everything the agent executed",
      tooltipAriaLabel: "Logs",
    },
    {
      isActive: isTabActive("remediation"),
      icon: Workflow,
      label: "Remediation",
      onClick: () => onTabSelected("remediation"),
      tooltipContent:
        "Remediation Workflow — propose → blast radius → simulate → approve → apply",
      tooltipAriaLabel: "Remediation Workflow",
    },
    {
      isActive: isTabActive("sandbox"),
      icon: Activity,
      label: "Sandbox settings",
      onClick: () => onTabSelected("sandbox"),
      tooltipContent: "Sandbox settings — resources and running processes",
      tooltipAriaLabel: "Sandbox settings",
    },
  ];

  // Closing must ALSO persist, otherwise the effect above re-applies the stored
  // "shown" value and the panel snaps back open (looked like a view reset).
  const closePanel = () => {
    setHasRightPanelToggled(false);
    setPersistedIsRightPanelShown(false);
  };

  return (
    <div
      className={cn(
        "relative w-full",
        "flex flex-row justify-start lg:justify-end items-center gap-1",
      )}
    >
      {tabs.map(
        (
          { icon, label, onClick, isActive, tooltipContent, tooltipAriaLabel },
          index,
        ) => (
          <ChatActionTooltip
            key={index}
            tooltip={tooltipContent}
            ariaLabel={tooltipAriaLabel}
          >
            <ConversationTabNav
              icon={icon}
              label={label}
              onClick={onClick}
              isActive={isActive}
            />
          </ChatActionTooltip>
        ),
      )}
      {isRightPanelShown && (
        <button
          type="button"
          aria-label="Close panel"
          onClick={closePanel}
          className="ml-auto shrink-0 rounded p-1 text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-primary)] transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

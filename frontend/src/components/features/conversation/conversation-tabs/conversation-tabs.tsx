import { useEffect } from "react";
import { useLocalStorage } from "@uidotdev/usehooks";
import {
  StickyNote,
  LayoutGrid,
  MessagesSquare,
  Workflow,
  Send,
  Settings2,
  X,
} from "lucide-react";
import { cn } from "#/utils/utils";
import { ConversationTabNav } from "./conversation-tab-nav";
import { ChatActionTooltip } from "../../chat/chat-action-tooltip";
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

  // Chat · Canvas · Report · Remediation · Communication · Settings.
  // The store keys are HISTORICAL and no longer match their labels — they are
  // kept so tab selections already persisted in localStorage keep resolving:
  //   "terminal" = Chat, "jupyter" = Canvas, "diagrams" = Report,
  //   "states" = Communication (freed when the Logs tab was removed),
  //   "sandbox" = Settings.
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
      icon: LayoutGrid,
      label: "Canvas",
      onClick: () => onTabSelected("jupyter"),
      tooltipContent: "Canvas — Documents, Sheet, Notebook, Whiteboard",
      tooltipAriaLabel: "Canvas",
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
      isActive: isTabActive("remediation"),
      icon: Workflow,
      label: "Remediation",
      onClick: () => onTabSelected("remediation"),
      tooltipContent:
        "Remediation Workflow — propose → blast radius → simulate → approve → apply",
      tooltipAriaLabel: "Remediation Workflow",
    },
    {
      isActive: isTabActive("states"),
      icon: Send,
      label: "Communication",
      onClick: () => onTabSelected("states"),
      tooltipContent:
        "Communication — notifications, approvals and outbound updates",
      tooltipAriaLabel: "Communication",
    },
    {
      isActive: isTabActive("sandbox"),
      icon: Settings2,
      label: "Settings",
      onClick: () => onTabSelected("sandbox"),
      tooltipContent: "Settings — sandbox resources and running processes",
      tooltipAriaLabel: "Settings",
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

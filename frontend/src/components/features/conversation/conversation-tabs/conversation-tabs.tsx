import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "@uidotdev/usehooks";
import {
  StickyNote,
  FileTerminal,
  SquareTerminal,
  History,
  X,
} from "lucide-react";
import TerminalIcon from "#/icons/terminal.svg?react";
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
    // Coerce a stale persisted "vscode" selection (the tab was removed) to the
    // editor so returning users don't land on an empty panel.
    const initialTab =
      (persistedSelectedTab as string) === "vscode"
        ? "editor"
        : persistedSelectedTab;
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

  // Order mirrors the design mockup (Terminal · Artifact · Jupyter · …); the
  // Artifact (Pages) tab sits where the mockup's placeholder "Topology" was.
  const tabs = [
    {
      isActive: isTabActive("terminal"),
      icon: TerminalIcon,
      label: t(I18nKey.COMMON$TERMINAL),
      onClick: () => onTabSelected("terminal"),
      tooltipContent: t(I18nKey.COMMON$TERMINAL),
      tooltipAriaLabel: t(I18nKey.COMMON$TERMINAL),
    },
    {
      isActive: isTabActive("diagrams"),
      icon: StickyNote,
      label: "Artifact",
      onClick: () => onTabSelected("diagrams"),
      tooltipContent: "Artifact",
      tooltipAriaLabel: "Artifact",
    },
    {
      isActive: isTabActive("jupyter"),
      icon: FileTerminal,
      label: t(I18nKey.COMMON$JUPYTER),
      onClick: () => onTabSelected("jupyter"),
      tooltipContent: t(I18nKey.COMMON$JUPYTER),
      tooltipAriaLabel: t(I18nKey.COMMON$JUPYTER),
    },
    {
      isActive: isTabActive("editor"),
      icon: SquareTerminal,
      label: "Commands",
      onClick: () => onTabSelected("editor"),
      tooltipContent: "Commands — executed shell cells (In/Out)",
      tooltipAriaLabel: "Commands",
    },
    {
      isActive: isTabActive("states"),
      icon: History,
      label: "States",
      onClick: () => onTabSelected("states"),
      tooltipContent: "States — workspace rewind points (flashpoints)",
      tooltipAriaLabel: "States",
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

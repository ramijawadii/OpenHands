import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocalStorage } from "@uidotdev/usehooks";
import {
  StickyNote,
  LayoutGrid,
  MessagesSquare,
  Workflow,
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
  /**
   * Shrink to icons rather than overflow.
   *
   * The strip lives in a drawer the user can drag to any width, so no
   * breakpoint can be right: the decision has to come from the element. Below
   * the width the labelled tabs need, they collapse to icons and the label
   * moves to the tooltip — which is why every tab is wrapped in
   * `ChatActionTooltip` even when its label is visible.
   *
   * Measured against `scrollWidth` while expanded, so the threshold is the
   * real content width rather than a guess that rots when a tab is renamed.
   */
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);
  const expandedWidth = useRef(0);

  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;

    const measure = () => {
      // Only trust a measurement taken while expanded; in compact mode the
      // content is narrower and would let it flap back immediately.
      if (!compact) expandedWidth.current = el.scrollWidth;
      const needed = expandedWidth.current;
      // 8px of hysteresis: without it a drag that lands exactly on the
      // threshold oscillates between the two layouts on every frame.
      if (!compact && needed > el.clientWidth) setCompact(true);
      else if (compact && needed > 0 && el.clientWidth > needed + 8)
        setCompact(false);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);

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
      // Communication moved to the sidebar; retire its old drawer key.
      states: "terminal",
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
      tooltipContent: "Chat — talk to the agent about what you are looking at",
      tooltipAriaLabel: "Chat",
    },
    {
      isActive: isTabActive("jupyter"),
      icon: LayoutGrid,
      label: "Canvas",
      onClick: () => onTabSelected("jupyter"),
      tooltipContent: "Canvas — documents, sheets, notebooks and whiteboards",
      tooltipAriaLabel: "Canvas",
    },
    {
      isActive: isTabActive("diagrams"),
      icon: StickyNote,
      label: "Report",
      onClick: () => onTabSelected("diagrams"),
      tooltipContent: "Report — saved reports, artifacts and diagrams",
      tooltipAriaLabel: "Report",
    },
    {
      isActive: isTabActive("remediation"),
      icon: Workflow,
      label: "Remediation",
      onClick: () => onTabSelected("remediation"),
      tooltipContent:
        "Remediation — propose, check blast radius, simulate, approve, apply",
      tooltipAriaLabel: "Remediation",
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
      ref={stripRef}
      className={cn(
        "relative w-full min-w-0 overflow-hidden",
        "flex flex-row justify-start lg:justify-end items-center gap-1",
      )}
    >
      {tabs.map(
        (
          { icon, label, onClick, isActive, tooltipContent, tooltipAriaLabel },
          index,
        ) => (
          /*
           * No tooltip while the label is visible.
           *
           * A tooltip repeating the word already printed on the button is
           * noise that covers the strip next to it. It is still supplied in
           * COMPACT mode, where the label is dropped and the icon alone has to
           * carry the meaning — `aria-label` on the button keeps the
           * accessible name in both.
           */
          <React.Fragment key={index}>
            {compact ? (
              <ChatActionTooltip
                tooltip={tooltipContent}
                ariaLabel={tooltipAriaLabel}
              >
                <ConversationTabNav
                  icon={icon}
                  label={label}
                  onClick={onClick}
                  isActive={isActive}
                  compact={compact}
                />
              </ChatActionTooltip>
            ) : (
              <ConversationTabNav
                icon={icon}
                label={label}
                onClick={onClick}
                isActive={isActive}
                compact={compact}
              />
            )}
          </React.Fragment>
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

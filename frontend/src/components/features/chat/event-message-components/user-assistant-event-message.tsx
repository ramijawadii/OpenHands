/* eslint-disable i18next/no-literal-string */
import React from "react";
import { OpenHandsAction } from "#/types/core/actions";
import { isUserMessage, isAssistantMessage } from "#/types/core/guards";
import { ChatMessage } from "../chat-message";
import { ImageCarousel } from "../../images/image-carousel";
import { FileList } from "../../files/file-list";
import { ConfirmationButtons } from "#/components/shared/buttons/confirmation-buttons";
import { MicroagentStatusWrapper } from "./microagent-status-wrapper";
import { LikertScaleWrapper } from "./likert-scale-wrapper";
import { parseMessageFromEvent } from "../event-content-helpers/parse-message-from-event";
import { MicroagentStatus } from "#/types/microagent-status";
import {
  useConversationStore,
  type ConversationTab,
} from "#/state/conversation-store";
import { StickyNote, FileTerminal, GitMerge, TerminalSquare, Code2 } from "lucide-react";

// ── Tool badge row ────────────────────────────────────────────────────────────

const TAB_META: Record<
  ConversationTab,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    subtitle: string;
  }
> = {
  terminal: { icon: TerminalSquare, label: "Terminal", subtitle: "Shell · Interactive" },
  jupyter: { icon: FileTerminal, label: "Jupyter Notebook", subtitle: "Python · Interactive" },
  editor: { icon: GitMerge, label: "Changes", subtitle: "Git · Diff" },
  diagrams: { icon: StickyNote, label: "Artifact", subtitle: "Document · Pages" },
  vscode: { icon: Code2, label: "VSCode", subtitle: "Code · Editor" },
};

function ToolBadgesRow({ tabs }: { tabs: ConversationTab[] }) {
  const { setSelectedTab, setHasRightPanelToggled } = useConversationStore();

  if (tabs.length === 0) return null;

  const openTab = (tab: ConversationTab) => {
    setSelectedTab(tab);
    setHasRightPanelToggled(true);
  };

  return (
    <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/5">
      {tabs.map((tab) => {
        const meta = TAB_META[tab];
        if (!meta) return null;
        const Icon = meta.icon;
        return (
          <div
            key={tab}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--cg-border)] cursor-pointer hover:border-[var(--cg-border-strong)] transition-colors"
            style={{ backgroundColor: "var(--cg-input-bg)" }}
            onClick={() => openTab(tab)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && openTab(tab)}
          >
            {/* Icon box */}
            <div className="w-10 h-10 rounded-lg bg-[var(--cg-bg-badge)] border border-[var(--cg-border)] flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-[var(--cg-text-muted)]" />
            </div>
            {/* Labels */}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-[var(--cg-text-primary)] leading-tight">{meta.label}</span>
              <span className="text-xs text-[var(--cg-text-muted)] leading-tight mt-0.5">{meta.subtitle}</span>
            </div>
            {/* Open button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openTab(tab); }}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[var(--cg-border)] text-xs text-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)] hover:border-[var(--cg-border-strong)] hover:bg-[var(--cg-bg-badge)] transition-colors"
            >
              Open
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface UserAssistantEventMessageProps {
  event: OpenHandsAction;
  shouldShowConfirmationButtons: boolean;
  microagentStatus?: MicroagentStatus | null;
  microagentConversationId?: string;
  microagentPRUrl?: string;
  actions?: Array<{
    icon: React.ReactNode;
    onClick: () => void;
    tooltip?: string;
  }>;
  toolBadges?: ConversationTab[];
  isLastMessage: boolean;
  isInLast10Actions: boolean;
  config?: { APP_MODE?: string } | null;
  isCheckingFeedback: boolean;
  feedbackData: {
    exists: boolean;
    rating?: number;
    reason?: string;
  };
}

export function UserAssistantEventMessage({
  event,
  shouldShowConfirmationButtons,
  microagentStatus,
  microagentConversationId,
  microagentPRUrl,
  actions,
  toolBadges,
  isLastMessage,
  isInLast10Actions,
  config,
  isCheckingFeedback,
  feedbackData,
}: UserAssistantEventMessageProps) {
  if (!isUserMessage(event) && !isAssistantMessage(event)) {
    return null;
  }

  const message = parseMessageFromEvent(event);
  const isAgent = isAssistantMessage(event);

  return (
    <>
      <ChatMessage type={event.source} message={message} actions={actions}>
        {event.args.image_urls && event.args.image_urls.length > 0 && (
          <ImageCarousel size="small" images={event.args.image_urls} />
        )}
        {event.args.file_urls && event.args.file_urls.length > 0 && (
          <FileList files={event.args.file_urls} />
        )}
        {shouldShowConfirmationButtons && <ConfirmationButtons />}
        {isAgent && toolBadges && toolBadges.length > 0 && (
          <ToolBadgesRow tabs={toolBadges} />
        )}
      </ChatMessage>
      <MicroagentStatusWrapper
        microagentStatus={microagentStatus}
        microagentConversationId={microagentConversationId}
        microagentPRUrl={microagentPRUrl}
        actions={actions}
      />
      {isAssistantMessage(event) && event.action === "message" && (
        <LikertScaleWrapper
          event={event}
          isLastMessage={isLastMessage}
          isInLast10Actions={isInLast10Actions}
          config={config}
          isCheckingFeedback={isCheckingFeedback}
          feedbackData={feedbackData}
        />
      )}
    </>
  );
}

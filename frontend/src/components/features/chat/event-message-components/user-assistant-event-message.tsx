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
import JupyterIcon from "#/icons/jupyter.svg?react";
import TerminalIcon from "#/icons/terminal.svg?react";
import GitChanges from "#/icons/git_changes.svg?react";
import DiagramsIcon from "#/icons/diagrams.svg?react";

// ── Tool badge row ────────────────────────────────────────────────────────────

const TAB_META: Record<
  ConversationTab,
  { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string }
> = {
  terminal: { icon: TerminalIcon, label: "Terminal" },
  jupyter: { icon: JupyterIcon, label: "Jupyter" },
  editor: { icon: GitChanges, label: "Changes" },
  diagrams: { icon: DiagramsIcon, label: "Pages" },
  vscode: { icon: GitChanges, label: "Code" }, // fallback — vscode icon not used here
};

function ToolBadgesRow({ tabs }: { tabs: ConversationTab[] }) {
  const { setSelectedTab, setHasRightPanelToggled } = useConversationStore();

  if (tabs.length === 0) return null;

  const openTab = (tab: ConversationTab) => {
    setSelectedTab(tab);
    setHasRightPanelToggled(true);
  };

  return (
    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
      {tabs.map((tab) => {
        const meta = TAB_META[tab];
        if (!meta) return null;
        const Icon = meta.icon;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => openTab(tab)}
            title={`View in ${meta.label}`}
            className="w-6 h-6 rounded-full bg-[#1e2030] border border-[#3a3d52] flex items-center justify-center hover:bg-[#2d3244] hover:border-[#525670] transition-colors"
          >
            <Icon className="w-3.5 h-3.5 text-[#9299AA]" />
          </button>
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

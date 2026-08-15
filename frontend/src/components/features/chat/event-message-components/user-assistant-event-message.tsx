/* eslint-disable i18next/no-literal-string */
import React from "react";

import { OpenHandsAction } from "#/types/core/actions";
import { isUserMessage, isAssistantMessage } from "#/types/core/guards";
import { ArtifactCard } from "#/components/tool-ui/elements/artifact-card";
import type { TurnArtifact } from "../messages";
import { ChatMessage } from "../chat-message";
import { ImageCarousel } from "../../images/image-carousel";
import { FileList } from "../../files/file-list";
import { ConfirmationButtons } from "#/components/shared/buttons/confirmation-buttons";
import { MicroagentStatusWrapper } from "./microagent-status-wrapper";
import { LikertScaleWrapper } from "./likert-scale-wrapper";
import { MessageActionsRow } from "./message-actions-row";
import { MessageTimingRow } from "./message-timing-row";
import { parseMessageFromEvent } from "../event-content-helpers/parse-message-from-event";
import { MicroagentStatus } from "#/types/microagent-status";
import {
  useConversationStore,
  type ConversationTab,
} from "#/state/conversation-store";

// ── Tool badge row ────────────────────────────────────────────────────────────

/**
 * Artifacts produced by a turn.
 *
 * Was a stack of full-width surface rows — icon box, label, subtitle, Open
 * button — one per tab the agent had touched, including "Chat", which is not
 * an output. Three of those under a two-line reply dominated the transcript.
 *
 * Now an ArtifactCard per FILE: the name the analyst will open and what it is.
 * Compact, so a turn that produced a report and a diagram reads as two
 * deliverables rather than a menu.
 */
function ToolBadgesRow({ tabs }: { tabs: TurnArtifact[] }) {
  const { setSelectedTab, setHasRightPanelToggled } = useConversationStore();

  if (tabs.length === 0) return null;

  const openTab = (tab: ConversationTab) => {
    setSelectedTab(tab);
    setHasRightPanelToggled(true);
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
      {tabs.map((artifact) => (
        <button
          key={artifact.title}
          type="button"
          onClick={() => openTab(artifact.tab)}
          className="text-left"
        >
          <ArtifactCard title={artifact.title} meta={artifact.meta} />
        </button>
      ))}
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
  toolBadges?: TurnArtifact[];
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
        <>
          <MessageTimingRow timestamp={event.timestamp} />
          <MessageActionsRow eventId={event.id} message={message} />
        </>
      )}
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

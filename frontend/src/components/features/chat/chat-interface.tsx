import React from "react";
import posthog from "posthog-js";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { convertImageToBase64 } from "#/utils/convert-image-to-base-64";
import { TrajectoryActions } from "../trajectory/trajectory-actions";
import { createChatMessage } from "#/services/chat-service";
import { InteractiveChatBox } from "./interactive-chat-box";
import { AgentState } from "#/types/agent-state";
import { isOpenHandsAction } from "#/types/core/guards";
import { generateAgentStateChangeEvent } from "#/services/agent-state-service";
import { FeedbackModal } from "../feedback/feedback-modal";
import { useScrollToBottom } from "#/hooks/use-scroll-to-bottom";
import { useWsClient } from "#/context/ws-client-provider";
import { Messages } from "./messages";

import { ChatSuggestions } from "./chat-suggestions";
import { ScrollProvider } from "#/context/scroll-context";
import { useInitialQueryStore } from "#/stores/initial-query-store";
import { useAgentStore } from "#/stores/agent-store";

import { ScrollToBottomButton } from "#/components/shared/buttons/scroll-to-bottom-button";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { useErrorMessageStore } from "#/stores/error-message-store";
import { useOptimisticUserMessageStore } from "#/stores/optimistic-user-message-store";
import { ErrorMessageBanner } from "./error-message-banner";
import {
  hasUserEvent,
  shouldRenderEvent,
} from "./event-content-helpers/should-render-event";
import { useUploadFiles } from "#/hooks/mutation/use-upload-files";
import { useConfig } from "#/hooks/query/use-config";
import { validateFiles } from "#/utils/file-validation";
import { useConversationStore } from "#/state/conversation-store";
import { CompactionBanner } from "./compaction-banner";
import { ApprovalBanner } from "./approval-banner";
import { ClarificationBanner } from "./clarification-banner";
import { PlanBanner, usePlanPolling } from "./plan-banner";
import { PlanApprovalBanner } from "./plan-approval-banner";
import { ConfirmationBanner } from "./confirmation-banner";
import { FileHistoryPanel } from "./file-history-panel";
import { PendingTurns } from "./pending-turns";
import { MidRunDecision } from "./mid-run-decision";
import {
  useCommandQueueStore,
  selectNextIndex,
} from "#/stores/command-queue-store";

interface PendingDecision {
  text: string;
  images: File[];
  files: File[];
}

// Agent states in which a brand-new user turn can be sent right away. Anything else
// (RUNNING / LOADING / awaiting-confirmation / paused …) means the turn is buffered.
const READY_FOR_TURN = new Set<AgentState>([
  AgentState.FINISHED,
  AgentState.AWAITING_USER_INPUT,
  AgentState.STOPPED,
  AgentState.INIT,
]);

function getEntryPoint(
  hasRepository: boolean | null,
  hasReplayJson: boolean | null,
): string {
  if (hasRepository) return "github";
  if (hasReplayJson) return "replay";
  return "direct";
}

export function ChatInterface() {
  const { setMessageToSend } = useConversationStore();
  const { errorMessage } = useErrorMessageStore();
  const { send, isLoadingMessages, parsedEvents, streamingContent } =
    useWsClient();
  const { setOptimisticUserMessage, getOptimisticUserMessage } =
    useOptimisticUserMessageStore();
  const { t } = useTranslation();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const {
    scrollDomToBottom,
    onChatBodyScroll,
    hitBottom,
    autoScroll,
    setAutoScroll,
    setHitBottom,
  } = useScrollToBottom(scrollRef);
  const { data: config } = useConfig();

  const { curAgentState, setCurrentAgentState } = useAgentStore();
  const {
    queue: allTurns,
    enqueue: enqueueTurn,
    remove: removeTurn,
  } = useCommandQueueStore();
  const params = useParams();
  const conversationId = params.conversationId ?? "";
  // Only this conversation's turns — the store is global but turns must never flush into
  // another conversation (Finding A: cross-context delivery).
  const pendingTurns = React.useMemo(
    () => allTurns.filter((turn) => turn.conversationId === conversationId),
    [allTurns, conversationId],
  );

  // A message the user submitted while the agent was busy, awaiting their per-message
  // choice: add it to the current run (inject) or queue it as a separate turn.
  const [pendingDecision, setPendingDecision] =
    React.useState<PendingDecision | null>(null);

  const [feedbackPolarity, setFeedbackPolarity] = React.useState<
    "positive" | "negative"
  >("positive");
  const [feedbackModalIsOpen, setFeedbackModalIsOpen] = React.useState(false);
  const { selectedRepository, replayJson } = useInitialQueryStore();
  const { mutateAsync: uploadFiles } = useUploadFiles();

  const optimisticUserMessage = getOptimisticUserMessage();

  const events = parsedEvents.filter(shouldRenderEvent);

  // Check if there are any substantive agent actions (not just system messages)
  const hasSubstantiveAgentActions = React.useMemo(
    () =>
      parsedEvents.some(
        (event) =>
          isOpenHandsAction(event) &&
          event.source === "agent" &&
          event.action !== "system",
      ),
    [parsedEvents],
  );

  // The actual send: upload/convert + push the user turn over the websocket. Called
  // immediately when the agent is idle, or by the flush effect for a buffered turn.
  const doSend = async (
    content: string,
    originalImages: File[],
    originalFiles: File[],
  ) => {
    // Create mutable copies of the arrays
    const images = [...originalImages];
    const files = [...originalFiles];
    if (events.length === 0) {
      posthog.capture("initial_query_submitted", {
        entry_point: getEntryPoint(
          selectedRepository !== null,
          replayJson !== null,
        ),
        query_character_length: content.length,
        replay_json_size: replayJson?.length,
      });
    } else {
      posthog.capture("user_message_sent", {
        session_message_count: events.length,
        current_message_length: content.length,
      });
    }

    // Validate file sizes before any processing
    const allFiles = [...images, ...files];
    const validation = validateFiles(allFiles);

    if (!validation.isValid) {
      displayErrorToast(`Error: ${validation.errorMessage}`);
      return; // Stop processing if validation fails
    }

    const promises = images.map((image) => convertImageToBase64(image));
    const imageUrls = await Promise.all(promises);

    const timestamp = new Date().toISOString();

    const { skipped_files: skippedFiles, uploaded_files: uploadedFiles } =
      files.length > 0
        ? await uploadFiles({ conversationId: params.conversationId!, files })
        : { skipped_files: [], uploaded_files: [] };

    skippedFiles.forEach((f) => displayErrorToast(f.reason));

    const filePrompt = `${t("CHAT_INTERFACE$AUGMENTED_PROMPT_FILES_TITLE")}: ${uploadedFiles.join("\n\n")}`;
    const prompt =
      uploadedFiles.length > 0 ? `${content}\n\n${filePrompt}` : content;

    send(createChatMessage(prompt, imageUrls, uploadedFiles, timestamp));
    setOptimisticUserMessage(content);
    setMessageToSend("");
  };

  // Keep the latest doSend reachable from the flush effect without making the effect
  // re-run on every render (doSend closes over many values).
  const doSendRef = React.useRef(doSend);
  doSendRef.current = doSend;

  const handleSendMessage = async (
    content: string,
    images: File[],
    files: File[],
  ) => {
    // If the agent is busy, don't decide for the user — ask PER MESSAGE whether to add it
    // to the current run (inject) or queue it as a separate turn. (mem-mgmt §2)
    if (!READY_FOR_TURN.has(curAgentState)) {
      // If a decision is still on screen, queue that earlier one (safe default) so nothing
      // is lost, then raise the choice for this newest message.
      if (pendingDecision) {
        enqueueTurn(
          conversationId,
          pendingDecision.text,
          pendingDecision.images,
          pendingDecision.files,
          "next",
        );
      }
      setPendingDecision({ text: content, images, files });
      setMessageToSend("");
      return;
    }
    await doSend(content, images, files);
  };

  // Per-message decision handlers (mid-run).
  const decideAddToCurrent = async () => {
    const d = pendingDecision;
    if (!d) return;
    setPendingDecision(null);
    // Inject: send now. OpenHands adds it to history and the agent picks it up on its
    // next step within the CURRENT run.
    await doSend(d.text, d.images, d.files);
  };
  const decideQueue = () => {
    const d = pendingDecision;
    if (!d) return;
    setPendingDecision(null);
    enqueueTurn(conversationId, d.text, d.images, d.files, "next");
  };
  const decideDismiss = () => {
    if (pendingDecision) setMessageToSend(pendingDecision.text); // restore to the input
    setPendingDecision(null);
  };

  // Flush one buffered turn whenever the agent becomes ready. One-at-a-time: each send
  // moves the agent back to RUNNING, and the next flushes on the following idle.
  const flushingRef = React.useRef(false);
  React.useEffect(() => {
    if (flushingRef.current) return;
    if (!READY_FOR_TURN.has(curAgentState)) return;
    // Only flush turns belonging to THIS conversation (Finding A).
    const idx = selectNextIndex(pendingTurns);
    if (idx < 0) return;
    const next = pendingTurns[idx];
    flushingRef.current = true;
    removeTurn(next.id);
    Promise.resolve(doSendRef.current(next.text, next.images, next.files))
      .catch(() => undefined)
      .finally(() => {
        flushingRef.current = false;
      });
  }, [curAgentState, pendingTurns, removeTurn]);

  // "Run now": interrupt the agent (stop) and send this buffered turn immediately.
  const handleRunNow = async (id: string) => {
    const item = pendingTurns.find((c) => c.id === id);
    if (!item) return;
    removeTurn(id);
    send(generateAgentStateChangeEvent(AgentState.STOPPED));
    await doSend(item.text, item.images, item.files);
  };

  const handleStop = () => {
    posthog.capture("stop_button_clicked");
    /*
      Stop twice: locally first, then on the wire.

      The websocket round-trip is what actually halts the agent, but the button
      has to answer the click NOW — waiting for the server to echo STOPPED back
      left the composer showing a live run for as long as the current step took
      to notice, which reads as a stop that did not work. The optimistic state
      is corrected by the server's own agent_state_changed either way.
    */
    setCurrentAgentState(AgentState.STOPPED);
    send(generateAgentStateChangeEvent(AgentState.STOPPED));
  };

  const onClickShareFeedbackActionButton = async (
    polarity: "positive" | "negative",
  ) => {
    setFeedbackModalIsOpen(true);
    setFeedbackPolarity(polarity);
  };

  // Create a ScrollProvider with the scroll hook values
  const scrollProviderValue = {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollDomToBottom,
    hitBottom,
    setHitBottom,
    onChatBodyScroll,
  };

  const userEventsExist = hasUserEvent(events);

  // Feeds the shared plan store that the composer's indicator and PlanBanner
  // both read. Mounted here, once, rather than inside either consumer.
  usePlanPolling();

  return (
    <ScrollProvider value={scrollProviderValue}>
      {/* `data-chat-surface` marks the overlay host: a tool card's full view
          mounts here and covers the conversation only, never the dashboard
          around it (see tool-event-view.tsx). */}
      <div
        data-chat-surface
        className="cg-chat-surface h-full flex flex-col justify-between pr-0 md:pr-4 relative"
      >
        {!hasSubstantiveAgentActions &&
          !optimisticUserMessage &&
          !userEventsExist && (
            <ChatSuggestions
              onSuggestionsClick={(message) => setMessageToSend(message)}
            />
          )}
        {/* Note: We only hide chat suggestions when there's a user message */}

        <div
          ref={scrollRef}
          onScroll={(e) => onChatBodyScroll(e.currentTarget)}
          className="custom-scrollbar-always flex min-h-0 grow flex-col items-center overflow-y-auto overflow-x-hidden px-4 sm:px-6 pt-4 pb-6 fast-smooth-scroll"
        >
          {isLoadingMessages && (
            <div className="flex w-full justify-center">
              <LoadingSpinner size="small" />
            </div>
          )}

          {/*
            A measured column, not the full panel width.

            At the drawer's docked width the transcript happens to look right;
            fullscreen it stretched every bubble edge to edge, so a two-word
            reply became a full-width bar and the right-aligned user messages
            stopped reading as a side. Capping the column keeps the structure
            identical at every width — the panel gets wider, the conversation
            does not.
          */}
            <div className="flex w-full max-w-[820px] flex-col gap-5">
              {!isLoadingMessages && userEventsExist && (
                <Messages
                  messages={events}
                  isAwaitingUserConfirmation={
                    curAgentState === AgentState.AWAITING_USER_CONFIRMATION
                  }
                  streamingContent={streamingContent}
                />
              )}
            </div>

        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="flex justify-between relative">
            <div className="flex items-center gap-1">
              {events.length > 0 && (
                <TrajectoryActions
                  onPositiveFeedback={() =>
                    onClickShareFeedbackActionButton("positive")
                  }
                  onNegativeFeedback={() =>
                    onClickShareFeedbackActionButton("negative")
                  }
                  isSaasMode={config?.APP_MODE === "saas"}
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              {!hitBottom && (
                <ScrollToBottomButton onClick={scrollDomToBottom} />
              )}
            </div>
          </div>

          {/*
            Everything that used to be a card above the transcript now rides
            the composer's strip. They are all interruptions about the turn you
            are taking — a queued message, a staged edit, a compaction, an
            error — so they belong on the box rather than stacked between it
            and the conversation. Passed as one node so the strip can measure
            the real height and collapse to nothing when the stack is empty.
          */}
          <InteractiveChatBox
            onSubmit={handleSendMessage}
            onStop={handleStop}
            // The conversation surface is the composer's home, so it opens
            // ready to type rather than costing a click first.
            defaultExpanded
            // The mid-run decision is about the message being composed, so it
            // rides the composer's own strip instead of stacking above the
            // whole transcript.
            banner={
              <>
                <CompactionBanner />
                <FileHistoryPanel />
                <PlanBanner />
                <PlanApprovalBanner />
                <ConfirmationBanner />
                <ApprovalBanner />
                <ClarificationBanner />
                {errorMessage && <ErrorMessageBanner message={errorMessage} />}
                <PendingTurns
                  items={pendingTurns}
                  onRunNow={handleRunNow}
                  onCancel={removeTurn}
                />
                {pendingDecision && (
                  <MidRunDecision
                    text={pendingDecision.text}
                    onAddToCurrent={decideAddToCurrent}
                    onQueue={decideQueue}
                    onDismiss={decideDismiss}
                  />
                )}
              </>
            }
          />
        </div>

        {config?.APP_MODE !== "saas" && (
          <FeedbackModal
            isOpen={feedbackModalIsOpen}
            onClose={() => setFeedbackModalIsOpen(false)}
            polarity={feedbackPolarity}
          />
        )}
      </div>
    </ScrollProvider>
  );
}

import React from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";
import {
  isOpenHandsAction,
  isOpenHandsEvent,
  isAgentStateChangeObservation,
  isFinishAction,
  isAssistantMessage,
} from "#/types/core/guards";
import { EventMessage } from "./event-message";
import { PlanSnapshotMessage } from "./plan-snapshot-message";
import { buildMessageLookups } from "./message-lookups";
import { ChatMessage } from "./chat-message";
import { StreamingMessage } from "./streaming-message";
import { ThinkingOrbIndicator } from "./thinking-orb-indicator";
import { useOptimisticUserMessageStore } from "#/stores/optimistic-user-message-store";
import { LaunchMicroagentModal } from "./microagent/launch-microagent-modal";
import { useUserConversation } from "#/hooks/query/use-user-conversation";
import { useConversationId } from "#/hooks/use-conversation-id";
import { useCreateConversationAndSubscribeMultiple } from "#/hooks/use-create-conversation-and-subscribe-multiple";
import {
  MicroagentStatus,
  EventMicroagentStatus,
} from "#/types/microagent-status";
import { AgentState } from "#/types/agent-state";
import { getFirstPRUrl } from "#/utils/parse-pr-url";
import MemoryIcon from "#/icons/memory_icon.svg?react";
import type { ConversationTab } from "#/state/conversation-store";
import type { IPythonAction } from "#/types/core/actions";

// Rendered-window cap. A long conversation can hold thousands of events; each
// EventMessage is heavy (markdown + syntax highlight + mermaid), so rendering
// all of them balloons the DOM and memory. Render only the last RENDER_WINDOW
// by default (the tail is what auto-scroll shows) and reveal older ones in
// LOAD_CHUNK-sized steps on demand. The full `messages` array is kept intact for
// lookups/badges and for the "show earlier" reveal — nothing is lost. This is
// the Slack/Discord pattern: glitch-free (no variable-height virtualization) and
// bounds the DOM regardless of conversation length.
const RENDER_WINDOW = 60;
const LOAD_CHUNK = 100;

/**
 * What this turn PRODUCED, as artifacts.
 *
 * Previously this advertised surfaces, and the mapping had drifted: a shell
 * `run` resolved to the "terminal" key, which TAB_META labels "Chat" — so
 * executing a command told the operator it had produced a conversation. File
 * writes, the one thing that really is an output, were labelled "Commands".
 *
 * An output is a FILE the analyst can open: a document, a sheet, a notebook, a
 * diagram. A shell command is how work gets done, not a deliverable, so it no
 * longer appears here at all — it is already visible as its own tool card.
 */
export interface TurnArtifact {
  tab: ConversationTab;
  title: string;
  meta: string;
}

/** Extension → what the analyst is actually being handed. */
const ARTIFACT_KIND: { match: RegExp; meta: string; tab: ConversationTab }[] = [
  { match: /\.ipynb$/i, meta: "Notebook · Python", tab: "jupyter" },
  { match: /\.(drawio|excalidraw)$/i, meta: "Architecture diagram", tab: "diagrams" },
  { match: /\.mmd$/i, meta: "Mermaid diagram", tab: "diagrams" },
  { match: /\.(docx|doc|odt)$/i, meta: "Word document", tab: "diagrams" },
  { match: /\.(xlsx|xls|csv|ods)$/i, meta: "Spreadsheet", tab: "diagrams" },
  { match: /\.pdf$/i, meta: "PDF report", tab: "diagrams" },
  { match: /\.(md|markdown)$/i, meta: "Markdown document", tab: "diagrams" },
  { match: /\.(tex|latex)$/i, meta: "LaTeX source", tab: "diagrams" },
];

function computeTurnArtifacts(
  msgs: (OpenHandsAction | OpenHandsObservation)[],
  msgIndex: number,
): TurnArtifact[] {
  const byTitle = new Map<string, TurnArtifact>();
  let i = msgIndex - 1;
  while (i >= 0) {
    const evt = msgs[i];
    if (isAssistantMessage(evt)) break;
    if (isOpenHandsAction(evt) && evt.source === "agent") {
      if (evt.action === "run_ipython") {
        const code = (evt as IPythonAction).args.code ?? "";
        const isDiagram =
          code.includes("_safe_diagram") || code.includes("_safe_page");
        const title = isDiagram ? "Architecture diagram" : "Analysis notebook";
        byTitle.set(title, {
          tab: isDiagram ? "diagrams" : "jupyter",
          title,
          meta: isDiagram ? "Rendered · Canvas" : "Notebook · Python",
        });
      } else if (evt.action === "write" || evt.action === "edit") {
        // The real filename, not a surface name: "posture-2026-08.pdf" tells an
        // analyst what they are opening; "Commands" does not.
        const path = (evt.args as { path?: string }).path ?? "";
        const name = path.split("/").filter(Boolean).pop() ?? path;
        if (!name) {
          i -= 1;
          continue;
        }
        const kind = ARTIFACT_KIND.find((k) => k.match.test(name));
        // Files we have no opener for are skipped rather than offered: an
        // "Open" that lands nowhere is worse than no card.
        if (kind) {
          byTitle.set(name, { tab: kind.tab, title: name, meta: kind.meta });
        }
      }
    }
    i -= 1;
  }
  // Reversed: the map was filled walking BACKWARD, so this restores the order
  // the agent produced them in.
  return [...byTitle.values()].reverse();
}

const isErrorEvent = (evt: unknown): evt is { error: true; message: string } =>
  typeof evt === "object" &&
  evt !== null &&
  "error" in evt &&
  evt.error === true;

const isAgentStatusError = (evt: unknown): boolean =>
  isOpenHandsEvent(evt) &&
  isAgentStateChangeObservation(evt) &&
  evt.extras.agent_state === AgentState.ERROR;

interface MessagesProps {
  messages: (OpenHandsAction | OpenHandsObservation)[];
  isAwaitingUserConfirmation: boolean;
  streamingContent?: string | null;
}

export const Messages: React.FC<MessagesProps> = React.memo(
  ({ messages, isAwaitingUserConfirmation, streamingContent }) => {
    const {
      createConversationAndSubscribe,
      isPending,
      unsubscribeFromConversation,
    } = useCreateConversationAndSubscribeMultiple();
    const { getOptimisticUserMessage } = useOptimisticUserMessageStore();
    const { conversationId } = useConversationId();
    const { data: conversation } = useUserConversation(conversationId);

    const optimisticUserMessage = getOptimisticUserMessage();

    // How many trailing messages to render (see RENDER_WINDOW). Grows when the
    // user reveals older messages; never shrinks, so the tail keeps following.
    const [maxRender, setMaxRender] = React.useState(RENDER_WINDOW);

    const [selectedEventId, setSelectedEventId] = React.useState<number | null>(
      null,
    );
    const [showLaunchMicroagentModal, setShowLaunchMicroagentModal] =
      React.useState(false);
    const [microagentStatuses, setMicroagentStatuses] = React.useState<
      EventMicroagentStatus[]
    >([]);

    const { t } = useTranslation();

    // O(1) lookups built once per messages change (was two O(n)-per-row scans → O(n²)).
    const lookups = React.useMemo(
      () => buildMessageLookups(messages),
      [messages],
    );

    const actionHasObservationPair = React.useCallback(
      (event: OpenHandsAction | OpenHandsObservation): boolean =>
        isOpenHandsAction(event)
          ? lookups.observationByCauseId.has(event.id)
          : false,
      [lookups],
    );

    const getMicroagentStatusForEvent = React.useCallback(
      (eventId: number): MicroagentStatus | null => {
        const statusEntry = microagentStatuses.find(
          (entry) => entry.eventId === eventId,
        );
        return statusEntry?.status || null;
      },
      [microagentStatuses],
    );

    const getMicroagentConversationIdForEvent = React.useCallback(
      (eventId: number): string | undefined => {
        const statusEntry = microagentStatuses.find(
          (entry) => entry.eventId === eventId,
        );
        return statusEntry?.conversationId || undefined;
      },
      [microagentStatuses],
    );

    const getMicroagentPRUrlForEvent = React.useCallback(
      (eventId: number): string | undefined => {
        const statusEntry = microagentStatuses.find(
          (entry) => entry.eventId === eventId,
        );
        return statusEntry?.prUrl || undefined;
      },
      [microagentStatuses],
    );

    const handleMicroagentEvent = React.useCallback(
      (socketEvent: unknown, microagentConversationId: string) => {
        if (isErrorEvent(socketEvent) || isAgentStatusError(socketEvent)) {
          setMicroagentStatuses((prev) =>
            prev.map((statusEntry) =>
              statusEntry.conversationId === microagentConversationId
                ? { ...statusEntry, status: MicroagentStatus.ERROR }
                : statusEntry,
            ),
          );
        } else if (
          isOpenHandsEvent(socketEvent) &&
          isAgentStateChangeObservation(socketEvent)
        ) {
          // Handle completion states
          if (
            socketEvent.extras.agent_state === AgentState.FINISHED ||
            socketEvent.extras.agent_state === AgentState.AWAITING_USER_INPUT
          ) {
            setMicroagentStatuses((prev) =>
              prev.map((statusEntry) =>
                statusEntry.conversationId === microagentConversationId
                  ? { ...statusEntry, status: MicroagentStatus.COMPLETED }
                  : statusEntry,
              ),
            );

            unsubscribeFromConversation(microagentConversationId);
          }
        } else if (
          isOpenHandsEvent(socketEvent) &&
          isFinishAction(socketEvent)
        ) {
          // Check if the finish action contains a PR URL
          const prUrl = getFirstPRUrl(socketEvent.args.final_thought || "");
          if (prUrl) {
            setMicroagentStatuses((prev) =>
              prev.map((statusEntry) =>
                statusEntry.conversationId === microagentConversationId
                  ? {
                      ...statusEntry,
                      status: MicroagentStatus.COMPLETED,
                      prUrl,
                    }
                  : statusEntry,
              ),
            );
          }

          unsubscribeFromConversation(microagentConversationId);
        } else {
          // For any other event, transition from WAITING to CREATING if still waiting
          setMicroagentStatuses((prev) => {
            const currentStatus = prev.find(
              (entry) => entry.conversationId === microagentConversationId,
            )?.status;

            if (currentStatus === MicroagentStatus.WAITING) {
              return prev.map((statusEntry) =>
                statusEntry.conversationId === microagentConversationId
                  ? { ...statusEntry, status: MicroagentStatus.CREATING }
                  : statusEntry,
              );
            }
            return prev; // No change needed
          });
        }
      },
      [setMicroagentStatuses, unsubscribeFromConversation],
    );

    const handleLaunchMicroagent = (
      query: string,
      target: string,
      triggers: string[],
    ) => {
      const conversationInstructions = `Target file: ${target}\n\nDescription: ${query}\n\nTriggers: ${triggers.join(", ")}`;
      if (
        !conversation ||
        !conversation.selected_repository ||
        !conversation.selected_branch ||
        !conversation.git_provider ||
        !selectedEventId
      ) {
        return;
      }

      createConversationAndSubscribe({
        query,
        conversationInstructions,
        repository: {
          name: conversation.selected_repository,
          branch: conversation.selected_branch,
          gitProvider: conversation.git_provider,
        },
        onSuccessCallback: (newConversationId: string) => {
          setShowLaunchMicroagentModal(false);
          // Update status with conversation ID - start with WAITING
          setMicroagentStatuses((prev) => [
            ...prev.filter((status) => status.eventId !== selectedEventId),
            {
              eventId: selectedEventId,
              conversationId: newConversationId,
              status: MicroagentStatus.WAITING,
            },
          ]);
        },
        onEventCallback: (socketEvent: unknown, newConversationId: string) => {
          handleMicroagentEvent(socketEvent, newConversationId);
        },
      });
    };

    const startIdx =
      messages.length > maxRender ? messages.length - maxRender : 0;

    return (
      <>
        {startIdx > 0 && (
          <button
            type="button"
            onClick={() => setMaxRender((m) => m + LOAD_CHUNK)}
            className="mx-auto mb-1 rounded-full border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-3 py-1 text-[11px] text-[var(--cg-text-nav)] transition-colors hover:text-[var(--cg-text-primary)]"
          >
            {`Show ${startIdx} earlier message${startIdx === 1 ? "" : "s"}`}
          </button>
        )}
        {messages.slice(startIdx).map((message, i) => {
          const index = startIdx + i;
          // CloudGuard: if this action's paired observation carries a plan snapshot,
          // render the gray checklist always-visible after it (the cell stays collapsed).
          const planMarkdown = isOpenHandsAction(message)
            ? (lookups.planSnapshotByCause.get(message.id) ?? "")
            : "";
          return (
            <React.Fragment key={message.id ?? index}>
              <EventMessage
                event={message}
                hasObservationPair={actionHasObservationPair(message)}
                isAwaitingUserConfirmation={isAwaitingUserConfirmation}
                isLastMessage={messages.length - 1 === index}
                microagentStatus={getMicroagentStatusForEvent(message.id)}
                microagentConversationId={getMicroagentConversationIdForEvent(
                  message.id,
                )}
                microagentPRUrl={getMicroagentPRUrlForEvent(message.id)}
                actions={
                  conversation?.selected_repository
                    ? [
                        {
                          icon: (
                            <MemoryIcon className="w-[14px] h-[14px] text-[var(--cg-text-nav)]" />
                          ),
                          onClick: () => {
                            setSelectedEventId(message.id);
                            setShowLaunchMicroagentModal(true);
                          },
                          tooltip: t("MICROAGENT$ADD_TO_MEMORY"),
                        },
                      ]
                    : undefined
                }
                toolBadges={
                  isAssistantMessage(message)
                    ? computeTurnArtifacts(messages, index)
                    : undefined
                }
                isInLast10Actions={messages.length - 1 - index < 10}
              />
              {planMarkdown && (
                <PlanSnapshotMessage planMarkdown={planMarkdown} />
              )}
            </React.Fragment>
          );
        })}

        {streamingContent &&
          !isAssistantMessage(messages[messages.length - 1] as never) && (
            <StreamingMessage />
          )}

        {optimisticUserMessage && (
          <ChatMessage type="user" message={optimisticUserMessage} />
        )}

        {/* Last in the column, so it occupies the slot the reply will take and
            is replaced in place by the first token. */}
        <ThinkingOrbIndicator streaming={Boolean(streamingContent)} />
        {conversation?.selected_repository &&
          showLaunchMicroagentModal &&
          selectedEventId &&
          createPortal(
            <LaunchMicroagentModal
              onClose={() => setShowLaunchMicroagentModal(false)}
              onLaunch={handleLaunchMicroagent}
              selectedRepo={
                conversation.selected_repository.split("/").pop() || ""
              }
              eventId={selectedEventId}
              isLoading={isPending}
            />,
            document.getElementById("modal-portal-exit") || document.body,
          )}
      </>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.messages.length !== nextProps.messages.length) return false;
    if (prevProps.streamingContent !== nextProps.streamingContent) return false;
    return true;
  },
);

Messages.displayName = "Messages";

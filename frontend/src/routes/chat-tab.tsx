/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useNavigate } from "react-router";
import {
  History,
  MessageSquare,
  SquarePen,
  Loader2,
  SquareTerminal,
} from "lucide-react";
import { ChatInterface } from "#/components/features/chat/chat-interface";
import { ConversationHistory } from "#/components/features/conversations/conversation-history";
import CommandsView from "#/routes/commands-tab";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { useConversationStore } from "#/state/conversation-store";

type ChatView = "chat" | "history" | "commands";

/** Chat — the conversation surface embedded in the right panel, so the panel is
 *  self-sufficient and can later be reused where there is no chat column.
 *
 *  Conversation history lives HERE rather than as its own tab: it is a mode of
 *  the chat view, toggled from the icon in the top-right corner. Opening a
 *  conversation flips straight back to the chat.
 *
 *  Tabs stay mounted (hidden with CSS) while inactive, so we mount the chat only
 *  while this tab is selected — two live ChatInterface instances would double up
 *  its subscriptions and scroll handling.
 *
 *  NOTE: the store key is still "terminal" (the xterm tab this replaced) to keep
 *  previously persisted tab selections valid.
 */
function ChatTab() {
  const navigate = useNavigate();
  const { selectedTab, setSelectedTab, setHasRightPanelToggled } =
    useConversationStore();
  const [view, setView] = React.useState<ChatView>("chat");
  const { mutate: createConversation, isPending: isCreating } =
    useCreateConversation();

  // Creating stays inside the drawer: land on the new conversation's chat view.
  const startNewConversation = () =>
    createConversation(
      {},
      {
        onSuccess: (conversation) => {
          navigate(`/conversations/${conversation.conversation_id}`);
          setSelectedTab("terminal");
          setHasRightPanelToggled(true);
          setView("chat");
        },
      },
    );

  if (selectedTab !== "terminal") return null;

  const toggle = (v: ChatView) => setView((cur) => (cur === v ? "chat" : v));
  const iconBtn =
    "shrink-0 cursor-pointer rounded p-1 transition-colors hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-primary)]";
  const iconActive = (on: boolean) =>
    on ? "text-[var(--cg-text-primary)] bg-[var(--cg-bg-hover)]" : "text-[var(--cg-text-muted)]";

  const label =
    view === "history" ? "Conversations" : view === "commands" ? "Commands" : "";

  return (
    <div className="cg-chat-embedded flex h-full w-full flex-col overflow-hidden">
      {/* view switch — chat ⇄ history ⇄ commands */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2">
        <span className="min-w-0 flex-1 truncate text-[11px] tracking-wide text-[var(--cg-text-muted)] uppercase">
          {label}
        </span>
        <button
          type="button"
          title="New conversation"
          aria-label="New conversation"
          disabled={isCreating}
          onClick={startNewConversation}
          className={`${iconBtn} text-[var(--cg-text-muted)] disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SquarePen className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          title={view === "commands" ? "Back to chat" : "Executed commands"}
          aria-label="Executed commands"
          onClick={() => toggle("commands")}
          className={`${iconBtn} ${iconActive(view === "commands")}`}
        >
          <SquareTerminal className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={view === "history" ? "Back to chat" : "Conversation history"}
          aria-label="Conversation history"
          onClick={() => toggle("history")}
          className={`${iconBtn} ${iconActive(view === "history")}`}
        >
          {view === "history" ? (
            <MessageSquare className="h-4 w-4" />
          ) : (
            <History className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {view === "history" ? (
          <ConversationHistory onOpened={() => setView("chat")} />
        ) : view === "commands" ? (
          <CommandsView />
        ) : (
          <ChatInterface />
        )}
      </div>
    </div>
  );
}

export default ChatTab;

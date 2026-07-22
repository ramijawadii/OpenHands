/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useNavigate, useParams } from "react-router";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { usePaginatedConversations } from "#/hooks/query/use-paginated-conversations";
import { useStopConversation } from "#/hooks/mutation/use-stop-conversation";
import { useDeleteConversation } from "#/hooks/mutation/use-delete-conversation";
import { useUpdateConversation } from "#/hooks/mutation/use-update-conversation";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { ConversationCard } from "#/components/features/conversation-panel/conversation-card/conversation-card";
import { ConfirmDeleteModal } from "#/components/features/conversation-panel/confirm-delete-modal";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
import { useConversationStore } from "#/state/conversation-store";
import { displaySuccessToast } from "#/utils/custom-toast-handlers";
import type { ConversationStatus } from "#/types/conversation-status";
import type { Provider } from "#/types/settings";

/** Conversations — history and switching, inside the drawer.
 *
 *  SELF-CONTAINED: every transition it offers (open, create) resolves inside the
 *  drawer — it switches itself to the Chat tab rather than bouncing the user out
 *  to the home screen. That is what lets this panel be lifted into other parts of
 *  the dashboard later without carrying assumptions about the page around it.
 *
 *  Deliberately NOT reusing ConversationPanel: that component is a flyout wired
 *  to useClickOutsideElement(onClose), which would dismiss itself on any click in
 *  a docked tab. The cards, queries and mutations are shared. */

/** RUNNING/STARTING are live sandboxes; everything else is dormant history. */
const isLive = (s?: ConversationStatus) => s === "RUNNING" || s === "STARTING";

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-medium tracking-wider text-[var(--cg-text-nav)] uppercase">
          {title}
        </span>
        <span className="rounded bg-white/5 px-1.5 py-px text-[10px] tabular-nums text-[var(--cg-text-muted)]">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export function ConversationHistory({ onOpened }: { onOpened?: () => void }) {
  const navigate = useNavigate();
  const { conversationId: currentId } = useParams();
  const { setSelectedTab, setHasRightPanelToggled } = useConversationStore();

  const [search, setSearch] = React.useState("");
  // favourites ("marked") persist across reopens/reloads via localStorage
  const [favorites, setFavorites] = React.useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("cg-conv-favorites");
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set<string>();
    }
  });
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  const { data, isFetching, error } = usePaginatedConversations();
  const { mutate: stopConversation } = useStopConversation();
  const { mutate: deleteConversation } = useDeleteConversation();
  const { mutate: updateConversation } = useUpdateConversation();
  const { mutate: createConversation, isPending: isCreating } =
    useCreateConversation();

  const conversations = React.useMemo(
    () => data?.pages?.flatMap((p) => p.results) ?? [],
    [data],
  );

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((c) =>
      (c.title ?? "").toLowerCase().includes(needle),
    );
  }, [conversations, search]);

  const active = filtered.filter((c) => isLive(c.status));
  const dormant = filtered.filter((c) => !isLive(c.status));

  /** Stay inside the drawer: land on the conversation and show its Chat tab. */
  const openConversation = (id: string) => {
    navigate(`/conversations/${id}`);
    setSelectedTab("terminal");
    setHasRightPanelToggled(true);
    onOpened?.();
  };

  const startNewConversation = () => {
    createConversation(
      {},
      {
        onSuccess: (conversation) => {
          openConversation(conversation.conversation_id);
        },
      },
    );
  };

  const toggleFavorite = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(
          "cg-conv-favorites",
          JSON.stringify(Array.from(next)),
        );
      } catch {
        /* quota — non-fatal */
      }
      return next;
    });

  const renameConversation = (id: string, newTitle: string) => {
    updateConversation(
      { conversationId: id, newTitle },
      { onSuccess: () => displaySuccessToast("Conversation renamed") },
    );
  };

  const card = (c: (typeof conversations)[number]) => (
    <ConversationCard
      key={c.conversation_id}
      conversationId={c.conversation_id}
      title={c.title}
      selectedRepository={{
        selected_repository: c.selected_repository,
        selected_branch: c.selected_branch,
        git_provider: c.git_provider as Provider,
      }}
      lastUpdatedAt={c.last_updated_at}
      createdAt={c.created_at}
      conversationStatus={c.status}
      isActive={c.conversation_id === currentId}
      isFavorite={favorites.has(c.conversation_id)}
      onToggleFavorite={() => toggleFavorite(c.conversation_id)}
      showOptions
      onClick={() => openConversation(c.conversation_id)}
      onStop={() => stopConversation({ conversationId: c.conversation_id })}
      onDelete={() => setPendingDelete(c.conversation_id)}
      onChangeTitle={(title) => renameConversation(c.conversation_id, title)}
      contextMenuOpen={openMenuId === c.conversation_id}
      onContextMenuToggle={(isOpen) =>
        setOpenMenuId(isOpen ? c.conversation_id : null)
      }
    />
  );

  return (
    <div className="cg-conv-compact flex h-full w-full flex-col">
      {/* toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--cg-border-subtle)] px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cg-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] py-1.5 pr-7 pl-7 text-[11.5px] text-[var(--cg-text-primary)] outline-none placeholder:text-[var(--cg-text-muted)] focus:border-[var(--cg-text-muted)]"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          title="New conversation"
          aria-label="New conversation"
          disabled={isCreating}
          onClick={startNewConversation}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-2 py-1.5 text-[11.5px] text-[var(--cg-text-nav)] transition-colors hover:border-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          New
        </button>
      </div>

      {/* list */}
      <div className="cg-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isFetching && conversations.length === 0 && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="small" />
          </div>
        )}

        {error && (
          <p className="px-1 py-6 text-center text-[11.5px] text-[var(--cg-danger)]">
            Could not load conversations.
          </p>
        )}

        {!isFetching && !error && filtered.length === 0 && (
          <p className="px-1 py-6 text-center text-[11.5px] text-[var(--cg-text-muted)]">
            {search ? "No conversations match." : "No conversations yet."}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Section title="Active" count={active.length}>
            {active.map(card)}
          </Section>
          <Section title="History" count={dormant.length}>
            {dormant.map(card)}
          </Section>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDeleteModal
          onConfirm={() => {
            deleteConversation({ conversationId: pendingDelete });
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

export default ConversationHistory;

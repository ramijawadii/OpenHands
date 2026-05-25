import React from "react";
import { NavLink, useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Search, Star } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";
import { usePaginatedConversations } from "#/hooks/query/use-paginated-conversations";
import { useInfiniteScroll } from "#/hooks/use-infinite-scroll";
import { useDeleteConversation } from "#/hooks/mutation/use-delete-conversation";
import { useStopConversation } from "#/hooks/mutation/use-stop-conversation";
import { ConfirmDeleteModal } from "./confirm-delete-modal";
import { ConfirmStopModal } from "./confirm-stop-modal";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
import { ExitConversationModal } from "./exit-conversation-modal";
import { useClickOutsideElement } from "#/hooks/use-click-outside-element";
import { Provider } from "#/types/settings";
import { useUpdateConversation } from "#/hooks/mutation/use-update-conversation";
import { displaySuccessToast } from "#/utils/custom-toast-handlers";
import { ConversationCard } from "./conversation-card/conversation-card";

interface ConversationPanelProps {
  onClose: () => void;
}

export function ConversationPanel({ onClose }: ConversationPanelProps) {
  const { t } = useTranslation();
  const { conversationId: currentConversationId } = useParams();
  const ref = useClickOutsideElement<HTMLDivElement>(onClose);
  const navigate = useNavigate();

  const [confirmDeleteModalVisible, setConfirmDeleteModalVisible] =
    React.useState(false);
  const [confirmStopModalVisible, setConfirmStopModalVisible] =
    React.useState(false);
  const [
    confirmExitConversationModalVisible,
    setConfirmExitConversationModalVisible,
  ] = React.useState(false);
  const [selectedConversationId, setSelectedConversationId] = React.useState<
    string | null
  >(null);
  const [openContextMenuId, setOpenContextMenuId] = React.useState<
    string | null
  >(null);
  const [search, setSearch] = React.useState("");
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const {
    data,
    isFetching,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = usePaginatedConversations();

  // Flatten all pages into a single array of conversations
  const allConversations = data?.pages.flatMap((page) => page.results) ?? [];

  // Sort favorites first, then filter by search
  const conversations = React.useMemo(() => {
    const filtered = search.trim()
      ? allConversations.filter((c) =>
          c.title.toLowerCase().includes(search.toLowerCase()),
        )
      : allConversations;
    return [
      ...filtered.filter((c) => favorites.has(c.conversation_id)),
      ...filtered.filter((c) => !favorites.has(c.conversation_id)),
    ];
  }, [allConversations, search, favorites]);

  const { mutate: deleteConversation } = useDeleteConversation();
  const { mutate: stopConversation } = useStopConversation();
  const { mutate: updateConversation } = useUpdateConversation();

  // Set up infinite scroll
  const scrollContainerRef = useInfiniteScroll({
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    threshold: 200, // Load more when 200px from bottom
  });

  const handleDeleteProject = (conversationId: string) => {
    setConfirmDeleteModalVisible(true);
    setSelectedConversationId(conversationId);
  };

  const handleStopConversation = (conversationId: string) => {
    setConfirmStopModalVisible(true);
    setSelectedConversationId(conversationId);
  };

  const handleConversationTitleChange = async (
    conversationId: string,
    newTitle: string,
  ) => {
    updateConversation(
      { conversationId, newTitle },
      {
        onSuccess: () => {
          displaySuccessToast(t(I18nKey.CONVERSATION$TITLE_UPDATED));
        },
      },
    );
  };

  const handleConfirmDelete = () => {
    if (selectedConversationId) {
      deleteConversation(
        { conversationId: selectedConversationId },
        {
          onSuccess: () => {
            if (selectedConversationId === currentConversationId) {
              navigate("/");
            }
          },
        },
      );
    }
  };

  const handleConfirmStop = () => {
    if (selectedConversationId) {
      stopConversation({ conversationId: selectedConversationId });
    }
  };

  return (
    <div
      ref={(node) => {
        // TODO: Combine both refs somehow
        if (ref.current !== node) ref.current = node;
        if (scrollContainerRef.current !== node)
          scrollContainerRef.current = node;
      }}
      data-testid="conversation-panel"
      className="w-full md:w-[400px] h-full rounded-lg overflow-y-auto absolute custom-scrollbar-always"
      style={{ background: "var(--cg-bg-primary-sidebar)", border: "1px solid var(--cg-border)" }}
    >
      {/* Search bar */}
      <div
        className="sticky top-0 z-10 px-3 py-2.5"
        style={{ background: "var(--cg-bg-primary-sidebar)", borderBottom: "1px solid var(--cg-border)" }}
      >
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: "var(--cg-input-bg)", border: "1px solid var(--cg-border)" }}
        >
          <Search size={12} style={{ color: "var(--cg-text-muted)", flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-[13px] outline-none placeholder-[var(--cg-text-muted)]"
            style={{ color: "var(--cg-text-nav)" }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-[var(--cg-text-muted)] hover:text-[var(--cg-text-nav)] cursor-pointer text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {isFetching && allConversations.length === 0 && (
        <div className="w-full h-full absolute flex justify-center items-center">
          <LoadingSpinner size="small" />
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-danger">{error.message}</p>
        </div>
      )}
      {!isFetching && allConversations.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-neutral-400">
            {t(I18nKey.CONVERSATION$NO_CONVERSATIONS)}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-px px-2 mt-3 pb-3">
        {conversations?.map((project) => (
          <NavLink
            key={project.conversation_id}
            to={`/conversations/${project.conversation_id}`}
            onClick={onClose}
          >
            {({ isActive }) => (
              <ConversationCard
                isActive={isActive}
                isFavorite={favorites.has(project.conversation_id)}
                onToggleFavorite={() => toggleFavorite(project.conversation_id)}
                onDelete={() => handleDeleteProject(project.conversation_id)}
                onStop={() => handleStopConversation(project.conversation_id)}
                onChangeTitle={(title) =>
                  handleConversationTitleChange(project.conversation_id, title)
                }
                title={project.title}
                selectedRepository={{
                  selected_repository: project.selected_repository,
                  selected_branch: project.selected_branch,
                  git_provider: project.git_provider as Provider,
                }}
                lastUpdatedAt={project.last_updated_at}
                createdAt={project.created_at}
                conversationStatus={project.status}
                conversationId={project.conversation_id}
                contextMenuOpen={openContextMenuId === project.conversation_id}
                onContextMenuToggle={(isOpen) =>
                  setOpenContextMenuId(isOpen ? project.conversation_id : null)
                }
              />
            )}
          </NavLink>
        ))}
      </div>

      {/* Loading indicator for fetching more conversations */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <LoadingSpinner size="small" />
        </div>
      )}

      {confirmDeleteModalVisible && (
        <ConfirmDeleteModal
          onConfirm={() => {
            handleConfirmDelete();
            setConfirmDeleteModalVisible(false);
          }}
          onCancel={() => setConfirmDeleteModalVisible(false)}
        />
      )}

      {confirmStopModalVisible && (
        <ConfirmStopModal
          onConfirm={() => {
            handleConfirmStop();
            setConfirmStopModalVisible(false);
          }}
          onCancel={() => setConfirmStopModalVisible(false)}
        />
      )}

      {confirmExitConversationModalVisible && (
        <ExitConversationModal
          onConfirm={() => {
            onClose();
          }}
          onClose={() => setConfirmExitConversationModalVisible(false)}
        />
      )}
    </div>
  );
}

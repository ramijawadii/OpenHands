import React from "react";
import posthog from "posthog-js";
import { Star } from "lucide-react";
import { cn } from "#/utils/utils";
import { transformVSCodeUrl } from "#/utils/vscode-url-helper";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import { ConversationStatus } from "#/types/conversation-status";
import { RepositorySelection } from "#/api/open-hands.types";
import { ConversationStatusIndicator } from "../../home/recent-conversations/conversation-status-indicator";
import { ConversationCardTitle } from "./conversation-card-title";
import { ConversationCardActions } from "./conversation-card-actions";
import { ConversationCardFooter } from "./conversation-card-footer";

interface ConversationCardProps {
  isActive?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClick?: () => void;
  onDelete?: () => void;
  onStop?: () => void;
  onChangeTitle?: (title: string) => void;
  showOptions?: boolean;
  title: string;
  selectedRepository: RepositorySelection | null;
  lastUpdatedAt: string; // ISO 8601
  createdAt?: string; // ISO 8601
  conversationStatus?: ConversationStatus;
  conversationId?: string; // Optional conversation ID for VS Code URL
  contextMenuOpen?: boolean;
  onContextMenuToggle?: (isOpen: boolean) => void;
}

export function ConversationCard({
  isActive = false,
  isFavorite = false,
  onToggleFavorite,
  onClick,
  onDelete,
  onStop,
  onChangeTitle,
  showOptions,
  title,
  selectedRepository,
  // lastUpdatedAt is kept in props for backward compatibility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lastUpdatedAt,
  createdAt,
  conversationId,
  conversationStatus,
  contextMenuOpen = false,
  onContextMenuToggle,
}: ConversationCardProps) {
  const [titleMode, setTitleMode] = React.useState<"view" | "edit">("view");

  const onTitleSave = (newTitle: string) => {
    if (newTitle !== "" && newTitle !== title) {
      onChangeTitle?.(newTitle);
    }
    setTitleMode("view");
  };

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onDelete?.();
    onContextMenuToggle?.(false);
  };

  const handleStop = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onStop?.();
    onContextMenuToggle?.(false);
  };

  const handleEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setTitleMode("edit");
    onContextMenuToggle?.(false);
  };

  const handleDownloadViaVSCode = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    posthog.capture("download_via_vscode_button_clicked");

    // Fetch the VS Code URL from the API
    if (conversationId) {
      try {
        const data = await ConversationService.getVSCodeUrl(conversationId);
        if (data.vscode_url) {
          const transformedUrl = transformVSCodeUrl(data.vscode_url);
          if (transformedUrl) {
            window.open(transformedUrl, "_blank");
          }
        }
        // VS Code URL not available
      } catch (error) {
        // Failed to fetch VS Code URL
      }
    }

    onContextMenuToggle?.(false);
  };

  const hasContextMenu = !!(onDelete || onChangeTitle || showOptions);

  return (
    <div
      data-testid="conversation-card"
      data-context-menu-open={contextMenuOpen.toString()}
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-lg cursor-pointer px-3 py-2",
        "transition-colors duration-300",
        isActive
          ? "bg-[var(--cg-bg-active)]"
          : "bg-transparent hover:bg-[var(--cg-bg-hover)] focus:bg-[var(--cg-bg-hover)]",
        contextMenuOpen && "bg-[var(--cg-bg-hover)]",
        conversationStatus === "ARCHIVED" && "opacity-50",
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.165, 0.85, 0.45, 1)" }}
    >
      {/* Title row */}
      <div className="flex items-center justify-between w-full min-h-[20px]">
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
          {/* Status dot */}
          {conversationStatus && (
            <ConversationStatusIndicator conversationStatus={conversationStatus} />
          )}
          {/* Title with mask fade */}
          <ConversationCardTitle
            title={title}
            titleMode={titleMode}
            onSave={onTitleSave}
          />
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Favorite star */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite?.();
            }}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded transition-opacity duration-300 cursor-pointer",
              isFavorite
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100",
            )}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            style={{ transitionTimingFunction: "cubic-bezier(0.165, 0.85, 0.45, 1)" }}
          >
            <Star
              size={13}
              className={isFavorite ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[var(--cg-text-muted)]"}
            />
          </button>

          {/* ⋮ actions — hidden until hover/active */}
          {hasContextMenu && (
            <div
              className={cn(
                "transition-opacity duration-300",
                isActive || contextMenuOpen
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100",
              )}
              style={{ transitionTimingFunction: "cubic-bezier(0.165, 0.85, 0.45, 1)" }}
            >
              <ConversationCardActions
                contextMenuOpen={contextMenuOpen}
                onContextMenuToggle={onContextMenuToggle || (() => {})}
                onDelete={onDelete && handleDelete}
                onStop={onStop && handleStop}
                onEdit={onChangeTitle && handleEdit}
                onDownloadViaVSCode={handleDownloadViaVSCode}
                conversationStatus={conversationStatus}
                conversationId={conversationId}
                showOptions={showOptions}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer row */}
      <ConversationCardFooter
        selectedRepository={selectedRepository}
        lastUpdatedAt={lastUpdatedAt}
        createdAt={createdAt}
      />
    </div>
  );
}

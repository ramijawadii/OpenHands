import React from "react";
import { cn } from "#/utils/utils";
import { ConversationStatus } from "#/types/conversation-status";
import { ConversationCardContextMenu } from "./conversation-card-context-menu";
import EllipsisIcon from "#/icons/ellipsis.svg?react";

interface ConversationCardActionsProps {
  contextMenuOpen: boolean;
  onContextMenuToggle: (isOpen: boolean) => void;
  onDelete?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onStop?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onEdit?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDownloadViaVSCode?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  conversationStatus?: ConversationStatus;
  conversationId?: string;
  showOptions?: boolean;
}

export function ConversationCardActions({
  contextMenuOpen,
  onContextMenuToggle,
  onDelete,
  onStop,
  onEdit,
  onDownloadViaVSCode,
  conversationStatus,
  conversationId,
  showOptions,
}: ConversationCardActionsProps) {
  return (
    <div className="relative">
      <button
        data-testid="ellipsis-button"
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onContextMenuToggle(!contextMenuOpen);
        }}
        className="cursor-pointer w-6 h-6 flex flex-row items-center justify-center"
      >
        <EllipsisIcon />
      </button>
      {contextMenuOpen && (
        <ConversationCardContextMenu
          onClose={() => onContextMenuToggle(false)}
          onDelete={onDelete}
          onStop={conversationStatus !== "STOPPED" ? onStop : undefined}
          onEdit={onEdit}
          onDownloadViaVSCode={
            conversationId && showOptions ? onDownloadViaVSCode : undefined
          }
          position="bottom"
        />
      )}
    </div>
  );
}

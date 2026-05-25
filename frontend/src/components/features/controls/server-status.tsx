import { useTranslation } from "react-i18next";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { I18nKey } from "#/i18n/declaration";
import { ConversationStatus } from "#/types/conversation-status";
import { AgentState } from "#/types/agent-state";
import { ServerStatusContextMenu } from "./server-status-context-menu";
import { useStartConversation } from "#/hooks/mutation/use-start-conversation";
import { useConversationId } from "#/hooks/use-conversation-id";
import { useUserProviders } from "#/hooks/use-user-providers";
import { useStopConversation } from "#/hooks/mutation/use-stop-conversation";
import { useAgentStore } from "#/stores/agent-store";

export interface ServerStatusProps {
  className?: string;
  conversationStatus: ConversationStatus | null;
}

export function ServerStatus({
  className = "",
  conversationStatus,
}: ServerStatusProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLDivElement>(null);

  const { curAgentState } = useAgentStore();
  const { t } = useTranslation();
  const { conversationId } = useConversationId();

  const stopConversationMutation = useStopConversation();
  const startConversationMutation = useStartConversation();
  const { providers } = useUserProviders();

  const isStartingStatus =
    curAgentState === AgentState.LOADING || curAgentState === AgentState.INIT;
  const isStopStatus = conversationStatus === "STOPPED";

  const getStatusColor = (): string => {
    if (isStartingStatus) return "#FFD600";
    if (isStopStatus) return "#ffffff";
    if (curAgentState === AgentState.ERROR) return "#FF684E";
    return "#BCFF8C";
  };

  const getStatusText = (): string => {
    if (isStartingStatus) return t(I18nKey.COMMON$STARTING);
    if (isStopStatus) return t(I18nKey.COMMON$SERVER_STOPPED);
    if (curAgentState === AgentState.ERROR) return t(I18nKey.COMMON$ERROR);
    return t(I18nKey.COMMON$RUNNING);
  };

  const handleClick = () => {
    if (conversationStatus === "RUNNING" || conversationStatus === "STOPPED") {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        // Position menu below the trigger
        setMenuPos({ top: rect.bottom + 6, left: rect.left });
      }
      setShowContextMenu(true);
    }
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
    setMenuPos(null);
  };

  const handleStopServer = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    stopConversationMutation.mutate({ conversationId });
    handleCloseContextMenu();
  };

  const handleStartServer = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    startConversationMutation.mutate({ conversationId, providers });
    handleCloseContextMenu();
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={triggerRef}
        className="flex items-center gap-1.5 cursor-pointer"
        onClick={handleClick}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0 inline-block"
          style={{ backgroundColor: getStatusColor() }}
        />
        <span className="text-[11px] text-white font-normal leading-5">
          {getStatusText()}
        </span>
      </div>

      {showContextMenu &&
        menuPos &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              zIndex: 99999,
            }}
          >
            <ServerStatusContextMenu
              onClose={handleCloseContextMenu}
              onStopServer={handleStopServer}
              onStartServer={handleStartServer}
              conversationStatus={conversationStatus}
              position="bottom"
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

export default ServerStatus;

import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { useStatusStore } from "#/state/status-store";
import { useWsClient } from "#/context/ws-client-provider";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { getStatusCode } from "#/utils/status";
import { ChatStopButton } from "../chat/chat-stop-button";
import { AgentState } from "#/types/agent-state";
import { ChatResumeAgentButton } from "../chat/chat-play-button";
import { cn } from "#/utils/utils";
import { AgentLoading } from "./agent-loading";
import { useConversationStore } from "#/state/conversation-store";
import { useAgentStore } from "#/stores/agent-store";

export interface AgentStatusProps {
  className?: string;
  handleStop: () => void;
  handleResumeAgent: () => void;
  disabled?: boolean;
}

export function AgentStatus({
  className = "",
  handleStop,
  handleResumeAgent,
  disabled = false,
}: AgentStatusProps) {
  const { t } = useTranslation();
  const { setShouldShownAgentLoading } = useConversationStore();
  const { curAgentState } = useAgentStore();
  const { curStatusMessage } = useStatusStore();
  const { webSocketStatus } = useWsClient();
  const { data: conversation } = useActiveConversation();

  const statusCode = getStatusCode(
    curStatusMessage,
    webSocketStatus,
    conversation?.status || null,
    conversation?.runtime_status || null,
    curAgentState,
  );

  const shouldShownAgentLoading =
    curAgentState === AgentState.INIT ||
    curAgentState === AgentState.LOADING ||
    webSocketStatus === "CONNECTING";

  const shouldShownAgentError =
    curAgentState === AgentState.ERROR ||
    curAgentState === AgentState.RATE_LIMITED;

  const shouldShownAgentStop = curAgentState === AgentState.RUNNING;

  const shouldShownAgentResume = curAgentState === AgentState.STOPPED;

  // Update global state when agent loading condition changes.
  //
  // The cleanup is load-bearing, not tidiness: this component is the ONLY
  // writer of `shouldShownAgentLoading`, and it lives inside the chat input —
  // which exists only on the Chat tab. Switching the drawer to Canvas/Report/
  // Settings while the flag was true unmounted the writer and left the flag
  // stuck on, so the loading overlay covered every other tab indefinitely.
  // Clearing on unmount means a stale `true` can never outlive its writer.
  useEffect(() => {
    setShouldShownAgentLoading(shouldShownAgentLoading);
    return () => setShouldShownAgentLoading(false);
  }, [shouldShownAgentLoading, setShouldShownAgentLoading]);

  return (
    <div className={cn("flex items-center gap-1 min-w-0", className)}>
      <span
        className="text-[11px] text-white font-normal leading-5 flex-1 min-w-0 max-w-full whitespace-normal break-words"
        title={t(statusCode)}
      >
        {t(statusCode)}
      </span>
      <div
        className={cn(
          "bg-[#525252] box-border content-stretch flex flex-row gap-[3px] items-center justify-center overflow-clip px-0.5 py-1 relative rounded-[100px] shrink-0 size-6 transition-all duration-200 active:scale-95",
          (shouldShownAgentStop || shouldShownAgentResume) &&
            "hover:bg-[#737373] cursor-pointer",
        )}
      >
        {shouldShownAgentLoading && <AgentLoading />}
        {shouldShownAgentStop && <ChatStopButton handleStop={handleStop} />}
        {shouldShownAgentResume && (
          <ChatResumeAgentButton
            onAgentResumed={handleResumeAgent}
            disabled={disabled}
          />
        )}
        {shouldShownAgentError && <AlertCircle className="w-4 h-4" />}
        {!shouldShownAgentLoading &&
          !shouldShownAgentStop &&
          !shouldShownAgentResume &&
          !shouldShownAgentError && <Clock className="w-4 h-4" />}
      </div>
    </div>
  );
}

export default AgentStatus;

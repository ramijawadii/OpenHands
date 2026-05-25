import { ConversationStatus } from "#/types/conversation-status";
import { ServerStatus } from "#/components/features/controls/server-status";
import { AgentStatus } from "#/components/features/controls/agent-status";
import { ChatModeButton } from "./chat-mode-menu";

interface ChatInputActionsProps {
  conversationStatus: ConversationStatus | null;
  disabled: boolean;
  handleStop: (onStop?: () => void) => void;
  handleResumeAgent: () => void;
  onStop?: () => void;
}

export function ChatInputActions({
  conversationStatus,
  disabled,
  handleStop,
  handleResumeAgent,
  onStop,
}: ChatInputActionsProps) {
  return (
    <div className="w-full flex items-center justify-between">
      {/* Left: server connection status */}
      <ServerStatus conversationStatus={conversationStatus} />

      {/* Right: mode selector + stop/resume */}
      <div className="flex items-center gap-2">
        <ChatModeButton />
        <AgentStatus
          className="ml-1"
          handleStop={() => handleStop(onStop)}
          handleResumeAgent={handleResumeAgent}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

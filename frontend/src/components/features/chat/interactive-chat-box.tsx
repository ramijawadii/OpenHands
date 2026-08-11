import { useLocation } from "react-router";
import { PromptInput } from "./prompt-input";
import { viewLabel } from "./docked-composer";
import { useConversationStore } from "#/state/conversation-store";
import { useAgentStore } from "#/stores/agent-store";
import { AgentState } from "#/types/agent-state";

interface InteractiveChatBoxProps {
  onSubmit: (message: string, images: File[], files: File[]) => void;
  /** Cancel the current run — wired to the composer's stop control. */
  onStop: () => void;
  defaultExpanded?: boolean;
  banner?: React.ReactNode;
}

/**
 * The chat composer.
 *
 * The upload/validation pipeline that used to live here belonged to the old
 * input, which owned neither its attachments nor its own file chooser. The new
 * composer does both, so it hands the images back on submit and this component
 * is only the seam between it and the conversation store.
 */
export function InteractiveChatBox({
  onSubmit,
  onStop,
  defaultExpanded,
  banner,
}: InteractiveChatBoxProps) {
  const { curAgentState } = useAgentStore();
  /*
   * "Working" for the purposes of the stop control.
   *
   * Deliberately broader than RUNNING: a run that is starting up, or paused
   * waiting on a confirmation, is still a run the user may want to abandon, and
   * a stop button that disappears between states is worse than none.
   */
  const busy =
    curAgentState === AgentState.RUNNING ||
    curAgentState === AgentState.AWAITING_USER_CONFIRMATION;
  const { pathname } = useLocation();
  /*
   * No store consumer here any more.
   *
   * This component only exists while the drawer is open, so consuming the
   * posted-message channel from inside it meant a message sent with the drawer
   * closed sat unhandled until the drawer mounted. `ConversationSendBridge`
   * owns that channel now and is mounted at layout level.
   */
  const { files, clearAllFiles } = useConversationStore();

  return (
    <div data-testid="interactive-chat-box" className="flex justify-center">
      <PromptInput
        placeholder="Ask anything"
        defaultExpanded={defaultExpanded}
        tag={viewLabel(pathname) ?? undefined}
        banner={banner}
        busy={busy}
        onStop={onStop}
        onSubmit={(message, meta) => {
          // The composer owns its own image attachments, so they arrive with
          // the submission rather than through the conversation store. Files
          // added by drag/paste still come from the store.
          onSubmit(message, meta.attachments, files);
          clearAllFiles();
        }}
      />
    </div>
  );
}

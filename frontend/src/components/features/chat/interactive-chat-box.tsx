import { useLocation } from "react-router";
import { PromptInput } from "./prompt-input";
import { viewLabel } from "./docked-composer";
import { useConversationStore } from "#/state/conversation-store";

interface InteractiveChatBoxProps {
  onSubmit: (message: string, images: File[], files: File[]) => void;
  /**
   * Kept on the contract deliberately. The new composer does not render a
   * stop-runtime control yet, but every caller still supplies this and the
   * control is coming back — dropping it would churn the call sites twice.
   */
  // eslint-disable-next-line react/no-unused-prop-types
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
  defaultExpanded,
  banner,
}: InteractiveChatBoxProps) {
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

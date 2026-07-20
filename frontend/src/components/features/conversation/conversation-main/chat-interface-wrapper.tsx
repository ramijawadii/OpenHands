import React from "react";
import { createPortal } from "react-dom";
import { PanelRight } from "lucide-react";
import { useLocalStorage } from "@uidotdev/usehooks";
import { cn } from "#/utils/utils";
import { ChatInterface } from "../../chat/chat-interface";
import { ConversationName } from "../conversation-name";
import { useConversationStore } from "#/state/conversation-store";

/** Render the conversation title into the top bar's left slot. It stays mounted
 *  inside the conversation route (so useParams/queries still resolve) but paints
 *  top-left, on the same row as search/notifications. */
function TopBarLeftPortal({ children }: { children: React.ReactNode }) {
  const [el, setEl] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    setEl(document.getElementById("cg-topbar-left"));
  }, []);
  return el ? createPortal(children, el) : null;
}

interface ChatInterfaceWrapperProps {
  isRightPanelShown: boolean;
}

export function ChatInterfaceWrapper({
  isRightPanelShown,
}: ChatInterfaceWrapperProps) {
  const { setHasRightPanelToggled } = useConversationStore();
  const [, setPersistedIsRightPanelShown] = useLocalStorage<boolean>(
    "conversation-right-panel-shown",
    true,
  );

  // Reopen the artifact panel. Persist too, so it survives the init effect.
  const openPanel = () => {
    setHasRightPanelToggled(true);
    setPersistedIsRightPanelShown(true);
  };

  return (
    <div className="flex justify-center w-full h-full overflow-hidden">
      <div
        className={cn(
          "w-full h-full flex flex-col transition-all duration-300 ease-in-out",
          isRightPanelShown ? "max-w-4xl" : "max-w-6xl",
        )}
      >
        <TopBarLeftPortal>
          <ConversationName />
        </TopBarLeftPortal>

        {/* No separator here — the conversation name lives in the top bar, above
            the page rule. This row only carries the reopen affordance. */}
        {!isRightPanelShown && (
          <div className="shrink-0 flex items-center justify-end px-4 pt-2 sm:px-6">
            <button
              type="button"
              aria-label="Open artifact panel"
              title="Open artifact panel"
              onClick={openPanel}
              className="shrink-0 rounded p-1 text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-primary)] transition-colors cursor-pointer"
            >
              <PanelRight className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}

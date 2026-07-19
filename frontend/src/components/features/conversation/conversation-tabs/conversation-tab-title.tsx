import { X } from "lucide-react";
import { useConversationStore } from "#/state/conversation-store";

type ConversationTabTitleProps = {
  title: string;
};

export function ConversationTabTitle({ title }: ConversationTabTitleProps) {
  const { setHasRightPanelToggled } = useConversationStore();

  return (
    <div className="flex flex-row items-center justify-between border-b border-[#474A54] py-2 px-3">
      <span className="text-xs font-medium text-white">{title}</span>
      <button
        type="button"
        aria-label="Close panel"
        onClick={() => setHasRightPanelToggled(false)}
        className="text-white/60 hover:text-white transition-colors rounded p-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

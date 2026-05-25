import { Pause } from "lucide-react";

export interface ChatStopButtonProps {
  handleStop: () => void;
}

export function ChatStopButton({ handleStop }: ChatStopButtonProps) {
  return (
    <button
      type="button"
      onClick={handleStop}
      data-testid="stop-button"
      className="cursor-pointer"
    >
      <Pause size={16} className="block" />
    </button>
  );
}

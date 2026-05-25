import { ArrowDown } from "lucide-react";

interface ScrollToBottomButtonProps {
  onClick: () => void;
}

export function ScrollToBottomButton({ onClick }: ScrollToBottomButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="scroll-to-bottom"
      className="button-base p-1 hover:bg-neutral-500 rotate-180 cursor-pointer"
    >
      <ArrowDown size={15} />
    </button>
  );
}

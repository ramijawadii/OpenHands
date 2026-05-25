import { cn } from "#/utils/utils";
import { X } from "lucide-react";

interface RemoveButtonProps {
  onClick: () => void;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
}

export function RemoveButton({ onClick, className }: RemoveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-neutral-400 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer",
        className,
      )}
    >
      <X size={18} />
    </button>
  );
}

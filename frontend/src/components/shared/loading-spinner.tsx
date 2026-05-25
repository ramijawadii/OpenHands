import { Loader2 } from "lucide-react";
import { cn } from "#/utils/utils";

interface LoadingSpinnerProps {
  size: "small" | "large";
}

export function LoadingSpinner({ size }: LoadingSpinnerProps) {
  const sizeStyle =
    size === "small" ? "w-[25px] h-[25px]" : "w-[50px] h-[50px]";

  return (
    <div data-testid="loading-spinner" className={cn("relative flex items-center justify-center", sizeStyle)}>
      <Loader2 className={cn("animate-spin", sizeStyle)} />
    </div>
  );
}

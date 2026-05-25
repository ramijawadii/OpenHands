import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function RefreshButton({ onClick }: RefreshButtonProps) {
  return (
    <button type="button" onClick={onClick}>
      <RefreshCw size={14} />
    </button>
  );
}

import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { ObservationResultStatus } from "./event-content-helpers/get-observation-result";

interface SuccessIndicatorProps {
  status: ObservationResultStatus;
}

export function SuccessIndicator({ status }: SuccessIndicatorProps) {
  return (
    <span className="flex-shrink-0">
      {status === "success" && (
        <CheckCircle2
          data-testid="status-icon"
          className="h-4 w-4 ml-2 inline fill-transparent text-[#22c55e]"
        />
      )}

      {status === "error" && (
        <XCircle
          data-testid="status-icon"
          className="h-4 w-4 ml-2 inline fill-danger"
        />
      )}

      {status === "timeout" && (
        <Clock
          data-testid="status-icon"
          className="h-4 w-4 ml-2 inline fill-yellow-500"
        />
      )}
    </span>
  );
}

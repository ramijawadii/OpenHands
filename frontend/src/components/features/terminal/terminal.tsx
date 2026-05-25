import { useTerminal } from "#/hooks/use-terminal";
import "@xterm/xterm/css/xterm.css";
import { RUNTIME_INACTIVE_STATES } from "#/types/agent-state";
import { cn } from "#/utils/utils";
import { WaitingForRuntimeMessage } from "../chat/waiting-for-runtime-message";
import { useAgentStore } from "#/stores/agent-store";

function Terminal() {
  const { curAgentState } = useAgentStore();

  const isRuntimeInactive = RUNTIME_INACTIVE_STATES.includes(curAgentState);

  const ref = useTerminal();

  return (
    <div className="h-full flex flex-col bg-[#181818]">
      {isRuntimeInactive && <WaitingForRuntimeMessage className="pt-16" />}


      <div
        className={cn(
          "flex-1 min-h-0 p-3",
          isRuntimeInactive && "hidden",
        )}
      >
        <div ref={ref} className="w-full h-full" />
      </div>
    </div>
  );
}

export default Terminal;

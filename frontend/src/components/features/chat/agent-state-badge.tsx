/* eslint-disable i18next/no-literal-string */
import React from "react";
import {
  useExternalStateStore,
  ExternalStateName,
} from "#/stores/external-state-store";

const STYLES: Record<
  ExternalStateName,
  { dot: string; label: string; wrapper: string }
> = {
  idle: {
    dot: "bg-neutral-500",
    label: "Idle",
    wrapper: "text-neutral-500 border-neutral-700 bg-neutral-800/40",
  },
  running: {
    dot: "bg-blue-400 animate-pulse",
    label: "Running",
    wrapper: "text-blue-400 border-blue-800/50 bg-blue-900/20",
  },
  requires_action: {
    dot: "bg-amber-400 animate-pulse",
    label: "Action required",
    wrapper: "text-amber-400 border-amber-700/50 bg-amber-900/20",
  },
};

export function AgentStateBadge() {
  const { externalState } = useExternalStateStore();

  if (externalState === "idle") return null;

  const { dot, label, wrapper } = STYLES[externalState];

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border ${wrapper}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </div>
  );
}

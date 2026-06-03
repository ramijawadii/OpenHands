/* eslint-disable i18next/no-literal-string */
import React from "react";

interface ThoughtIndicatorProps {
  /** True while tokens are still streaming — shows a live "Thinking… Ns"
   *  counter; otherwise a static "Thought" marker that stays in the timeline. */
  streaming?: boolean;
}

/**
 * Minimal reasoning marker. The agent's thinking tokens are NEVER shown — only
 * a single point in the conversation timeline: a live "Thinking… 5s" counter
 * while it reasons, settling into a static "Thought" marker afterwards.
 */
export function ThoughtIndicator({ streaming = false }: ThoughtIndicatorProps) {
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    if (!streaming) return undefined;
    const start = Date.now();
    const id = setInterval(
      () => setSeconds(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [streaming]);

  return (
    <div className="flex items-center gap-2 my-1 text-xs text-[var(--cg-text-muted)] select-none">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          streaming ? "bg-violet-400 animate-pulse" : "bg-[var(--cg-text-muted)]"
        }`}
      />
      <span>{streaming ? `Thinking… ${seconds}s` : "Thought"}</span>
    </div>
  );
}

/* eslint-disable i18next/no-literal-string */
import React from "react";
import { ThinkingOrb } from "thinking-orbs";
import { useTheme } from "#/context/theme-context";

interface ThoughtIndicatorProps {
  /** True while tokens are still streaming — shows a live "Thinking… Ns"
   *  counter; otherwise a static "Thought" marker that stays in the timeline. */
  streaming?: boolean;
}

/**
 * Minimal reasoning marker. The agent's thinking tokens are NEVER shown — only
 * a single point in the conversation timeline: a live "Thinking… 5s" counter
 * while it reasons, settling into a static "Thought" marker afterwards.
 *
 * The live state uses the SAME orb as the end-of-list indicator
 * (`thinking-orb-indicator.tsx`). It used to draw its own pulsing purple dot,
 * so the app had two different-looking answers to "the agent is thinking"
 * depending on which one you happened to be looking at. The settled "Thought"
 * marker keeps the plain dot — it is a past event in the timeline, not
 * activity, and an orb there would read as still running.
 */
export function ThoughtIndicator({ streaming = false }: ThoughtIndicatorProps) {
  const [seconds, setSeconds] = React.useState(0);
  const { theme } = useTheme();

  React.useEffect(() => {
    if (!streaming) return undefined;
    const start = Date.now();
    const id = setInterval(
      () => setSeconds(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [streaming]);

  if (streaming) {
    return (
      <div
        className="my-1 flex items-center gap-2.5 select-none"
        aria-live="polite"
      >
        {/* 20 is the package's inline-text preset — the scale a line in a
            message column wants. */}
        <ThinkingOrb
          state="composing"
          size={20}
          theme={theme === "light" ? "light" : "dark"}
        />
        <span
          className="text-sm leading-6"
          style={{ color: "var(--cg-text-muted)" }}
        >
          Thinking… {seconds}s
        </span>
      </div>
    );
  }

  return (
    <div className="my-1 flex items-center gap-2 text-xs text-[var(--cg-text-muted)] select-none">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--cg-text-muted)]" />
      <span>Thought</span>
    </div>
  );
}

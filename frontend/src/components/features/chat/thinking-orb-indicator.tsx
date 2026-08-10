/* eslint-disable i18next/no-literal-string -- thinking indicator */
import React from "react";
import { ThinkingOrb } from "thinking-orbs";
import { AgentState } from "#/types/agent-state";
import { useAgentStore } from "#/stores/agent-store";
import { useTheme } from "#/context/theme-context";

/**
 * "Thinking…", placed where the reply will actually appear.
 *
 * The indicator it replaces was a `thinking` / `inferring` word animation
 * pinned to the bottom edge of the footer — nowhere near the conversation, so
 * it read as chrome about the app rather than as the agent's turn. This sits
 * at the end of the message list, which is the position the response itself
 * will take: the orb is replaced in place by the first token.
 *
 * Deliberately no pill. The reference demo wraps it in a translucent capsule
 * with an inset border, which on a message list draws a second card in a
 * column that already has cards in it. Transparent, it reads as a message
 * that has not arrived yet.
 */
export function ThinkingOrbIndicator({
  streaming,
}: {
  /** Real tokens are rendering, so the placeholder has been superseded. */
  streaming: boolean;
}) {
  const { curAgentState } = useAgentStore();
  const { theme } = useTheme();

  if (streaming) return null;
  if (curAgentState !== AgentState.RUNNING) return null;

  return (
    <div className="flex items-center gap-2.5" aria-live="polite">
      {/* The package ships 64 and 20 as tuned presets; 20 is the inline-text
          scale, which is what a line in a message column wants. */}
      <ThinkingOrb
        state="composing"
        size={20}
        theme={theme === "light" ? "light" : "dark"}
      />
      <span
        className="text-sm leading-6 select-none"
        style={{ color: "var(--cg-text-muted)" }}
      >
        Thinking…
      </span>
    </div>
  );
}

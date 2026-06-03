import React from "react";
import { ThoughtIndicator } from "./thought-indicator";

/**
 * While the agent streams, show ONLY a "Thinking… Ns" point in the timeline —
 * the thinking tokens themselves are never rendered. When the step completes
 * the stream clears and the action card's static "Thought" marker takes over.
 */
export function StreamingMessage() {
  return (
    <article data-testid="streaming-message" className="mt-6 w-full max-w-full">
      <ThoughtIndicator streaming />
    </article>
  );
}

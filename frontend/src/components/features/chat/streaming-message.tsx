import React from "react";
import { ThoughtDisclosure } from "./thought-disclosure";

interface StreamingMessageProps {
  content: string;
}

/**
 * Renders the agent's in-flight output while tokens stream in.
 *
 * The live text is contained in a COLLAPSED, openable "Thinking…" disclosure so
 * the running reasoning never spreads inline in the chat — the user sees a calm
 * marker they can expand. Mirrors how the persisted action thought renders
 * (same ThoughtDisclosure), so the hand-off when the step completes is seamless.
 */
export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <article data-testid="streaming-message" className="mt-6 w-full max-w-full">
      <ThoughtDisclosure content={content} streaming />
    </article>
  );
}

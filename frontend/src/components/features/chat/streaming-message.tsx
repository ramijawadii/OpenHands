/* eslint-disable i18next/no-literal-string */
import React from "react";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";

interface StreamingMessageProps {
  content: string;
}

/**
 * Renders the agent's in-flight output while tokens stream in.
 *
 * The live text is contained inside an OPEN "Thinking…" disclosure instead of
 * spreading raw into the chat: with Gemini thinking the model narrates its
 * reasoning as plain content, and that running narrative looked like loose
 * chat text that then vanished when the step's action card replaced it. Wrapping
 * it in a bounded, labelled, collapsible section keeps the chat calm and makes
 * the hand-off to the final card unobtrusive. Content uses the same
 * MarkdownRenderer + md-vscode--chat as the final message, so it is styled
 * identically (no unstyled flash).
 */
export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <article data-testid="streaming-message" className="mt-6 w-full max-w-full">
      <details
        open
        className="group rounded-lg border border-[var(--cg-border)] bg-[var(--cg-bg-card)] overflow-hidden"
      >
        <summary
          className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none
            text-xs text-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)]
            transition-colors list-none [&::-webkit-details-marker]:hidden"
        >
          <svg
            className="w-3 h-3 transition-transform group-open:rotate-90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span>Thinking…</span>
        </summary>
        <div
          className="px-3 pb-3 pt-1"
          style={{ wordBreak: "break-word" }}
        >
          <MarkdownRenderer
            content={content}
            className="md-vscode--chat"
            breaks
          />
          <span
            className="inline-block w-[2px] h-[0.85em] ml-[2px] animate-pulse"
            style={{
              background: "var(--cg-text-muted)",
              verticalAlign: "text-bottom",
            }}
          />
        </div>
      </details>
    </article>
  );
}

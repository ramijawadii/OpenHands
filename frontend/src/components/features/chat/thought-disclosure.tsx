/* eslint-disable i18next/no-literal-string */
import React from "react";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";

interface ThoughtDisclosureProps {
  content: string;
  /** True while tokens are still streaming — shows a pulse + caret and the
   *  "Thinking…" label; otherwise a static "Thought" marker. */
  streaming?: boolean;
}

/**
 * Collapsed-by-default disclosure for the agent's reasoning ("thought").
 *
 * Used both for the live stream and for the persisted thought on an action
 * card, so reasoning always appears as a calm, openable "Thinking"/"Thought"
 * marker in the conversation instead of spreading inline. Content uses the same
 * MarkdownRenderer + md-vscode--chat as a normal message, so expanding it looks
 * identical to the rest of the chat.
 */
export function ThoughtDisclosure({
  content,
  streaming = false,
}: ThoughtDisclosureProps) {
  return (
    <details className="group rounded-lg border border-[var(--cg-border)] bg-[var(--cg-bg-card)] overflow-hidden my-1">
      <summary
        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none
          text-xs text-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)]
          transition-colors list-none [&::-webkit-details-marker]:hidden"
      >
        <svg
          className="w-3 h-3 shrink-0 transition-transform group-open:rotate-90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
        {streaming && (
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        )}
        <span>{streaming ? "Thinking…" : "Thought"}</span>
      </summary>
      <div className="px-3 pb-3 pt-1" style={{ wordBreak: "break-word" }}>
        <MarkdownRenderer content={content} className="md-vscode--chat" breaks />
        {streaming && (
          <span
            className="inline-block w-[2px] h-[0.85em] ml-[2px] animate-pulse"
            style={{
              background: "var(--cg-text-muted)",
              verticalAlign: "text-bottom",
            }}
          />
        )}
      </div>
    </details>
  );
}

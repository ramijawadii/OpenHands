import React from "react";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";

interface StreamingMessageProps {
  content: string;
}

/**
 * Renders the in-flight assistant text while tokens stream in.
 *
 * It MUST mirror the final agent message exactly (ChatMessage → MarkdownRenderer
 * with className="md-vscode--chat" + breaks, wrapped in the same article/div),
 * otherwise the text appears unstyled during the stream and then visibly snaps
 * to the styled markdown when the complete message arrives. Using the same
 * renderer + scoping class makes the hand-off seamless — no reflow, no flash.
 */
export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <article
      data-testid="streaming-message"
      className="rounded-xl relative w-fit max-w-full mt-6 w-full flex flex-col gap-2"
    >
      <div style={{ wordBreak: "break-word" }}>
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
    </article>
  );
}

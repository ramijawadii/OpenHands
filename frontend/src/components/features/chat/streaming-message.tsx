import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { code } from "../markdown/code";
import { ul, ol } from "../markdown/list";
import { anchor } from "../markdown/anchor";
import { paragraph } from "../markdown/paragraph";

interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <article className="mt-6 w-full max-w-full">
      <div
        className="text-sm"
        style={{ whiteSpace: "normal", wordBreak: "break-word" }}
      >
        <Markdown
          components={{ code, ul, ol, a: anchor, p: paragraph }}
          remarkPlugins={[remarkGfm, remarkBreaks]}
        >
          {content}
        </Markdown>
        <span
          className="inline-block w-[2px] h-[0.85em] ml-[2px] animate-pulse"
          style={{ background: "var(--cg-text-muted)", verticalAlign: "text-bottom" }}
        />
      </div>
    </article>
  );
}

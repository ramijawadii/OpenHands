/**
 * The one mermaid interception used by every markdown surface.
 *
 * `MarkdownRenderer` renders ```mermaid as plain code unless handed a
 * codeRenderer. That opt-in was implemented as a local callback in chat and in
 * the diagrams tab, and simply forgotten in the report view — which is why a
 * report written as mermaid chapters displayed as source. Shared here so a new
 * markdown surface cannot silently miss it again.
 */
import * as React from "react";
import { MermaidBlock } from "./mermaid-block";

export const mermaidCodeRenderer = ({
  language,
  code,
}: {
  language: string;
  code: string;
  inline: boolean;
}) => {
  // null falls through to MarkdownRenderer's own code handling, which is what
  // every non-mermaid block should still get.
  if (language !== "mermaid") return null;
  return <MermaidBlock key={code} code={code} />;
};

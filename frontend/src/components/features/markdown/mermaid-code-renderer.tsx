/**
 * The one mermaid interception used by every markdown surface.
 *
 * Renders through the official `mermaid` package. An earlier revision parsed
 * flowcharts into a React Flow canvas to dodge a hydration mismatch — but that
 * only ever covered `flowchart`/`graph`, silently falling back for sequence,
 * gantt, class and state diagrams, and it reimplemented layout that mermaid
 * already does correctly. The mismatch had a smaller cause and a smaller fix:
 * render after mount, which MermaidBlock now does.
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
  // null falls through to MarkdownRenderer's own code handling, which every
  // non-mermaid block should still get.
  if (language !== "mermaid") return null;
  return <MermaidBlock key={code} code={code} />;
};

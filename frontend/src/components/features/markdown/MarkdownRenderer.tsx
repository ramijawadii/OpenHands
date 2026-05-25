import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";
import "./MarkdownRenderer.css";

interface MarkdownRendererProps {
  content: string;
  /** Extra CSS class(es) merged onto the wrapper div */
  className?: string;
  /** Convert single newlines to <br> — useful for chat messages */
  breaks?: boolean;
  // Optional custom renderer for code blocks (e.g. to intercept mermaid)
  codeRenderer?: (props: {
    language: string;
    code: string;
    inline: boolean;
  }) => React.ReactNode | null;
}

// SVG regex: captures full <svg ...>...</svg> blocks (multiline, non-greedy)
const SVG_RE = /(<svg[\s\S]*?<\/svg>)/gi;

function ensureXmlns(svg: string): string {
  return svg.replace(/<svg([^>]*)>/i, (_m, attrs: string) => {
    const withXmlns = /xmlns\s*=/.test(attrs)
      ? attrs
      : ` xmlns="http://www.w3.org/2000/svg"${attrs}`;
    const fixedViewBox = withXmlns.replace(/viewbox\s*=/gi, "viewBox=");
    return `<svg${fixedViewBox}>`;
  });
}

/** Split content into alternating [markdown, svg, markdown, svg, ...] segments */
function splitOnSvg(content: string): Array<{ type: "md" | "svg"; text: string }> {
  const parts = content.split(SVG_RE);
  return parts
    .filter((p) => p.length > 0)
    .map((p) => ({
      type: /^<svg/i.test(p) ? "svg" : "md",
      text: p,
    }));
}

/** Render an SVG string as a blob-URL <img> — avoids all React/namespace issues */
function SvgBlobImage({ svg }: { svg: string }) {
  const url = React.useMemo(() => {
    const blob = new Blob([ensureXmlns(svg)], { type: "image/svg+xml" });
    return URL.createObjectURL(blob);
  }, [svg]);

  React.useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <img
      src={url}
      alt="diagram"
      style={{ maxWidth: "100%", display: "block", height: "auto" }}
    />
  );
}

function extractNodeText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (n.type === "text" && typeof n.value === "string") return n.value;
  if (Array.isArray(n.children)) {
    return (n.children as unknown[]).map(extractNodeText).join("");
  }
  return "";
}

interface MdSegmentProps {
  content: string;
  remarkPlugins: Parameters<typeof ReactMarkdown>[0]["remarkPlugins"];
  components: Components;
}

function MdSegment({ content, remarkPlugins, components }: MdSegmentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={[rehypeRaw, [rehypeHighlight, { ignoreMissing: true }]]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}

export function MarkdownRenderer({
  content,
  codeRenderer,
  className,
  breaks,
}: MarkdownRendererProps) {
  const remarkPlugins = breaks ? [remarkGfm, remarkBreaks] : [remarkGfm];

  const components: Components = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code({ node, className: cls, children, ...props }: any) {
      const match = /language-(\w+)/.exec(cls ?? "");
      const language = match ? match[1] : "";
      const inline = !cls;
      const hastText = node ? extractNodeText(node) : "";
      // || not ?? — empty string from HAST fallback must also try children
      const code = (hastText || (typeof children === "string" ? children : String(children ?? ""))).replace(/\n$/, "");

      if (!inline && codeRenderer) {
        const custom = codeRenderer({ language, code, inline: false });
        if (custom !== null) return custom;
      }

      if (inline) {
        return (
          <code className="md-vscode-inline-code" {...props}>
            {children}
          </code>
        );
      }

      return (
        <code className={cls} {...props}>
          {children}
        </code>
      );
    },
  };

  const segments = splitOnSvg(content);

  return (
    <div className={`md-vscode${className ? ` ${className}` : ""}`}>
      {segments.map((seg, i) =>
        seg.type === "svg" ? (
          <SvgBlobImage key={i} svg={seg.text} />
        ) : (
          <MdSegment
            key={i}
            content={seg.text}
            remarkPlugins={remarkPlugins}
            components={components}
          />
        ),
      )}
    </div>
  );
}

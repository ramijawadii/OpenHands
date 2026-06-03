import React from "react";
import { BarChart2 } from "lucide-react";
import { cn } from "#/utils/utils";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import { CopyToClipboardButton } from "#/components/shared/buttons/copy-to-clipboard-button";
import { OpenHandsSourceType } from "#/types/core/base";
import { TooltipButton } from "#/components/shared/buttons/tooltip-button";
import { useConversationStore } from "#/state/conversation-store";
import { sanitizeMermaid } from "#/utils/sanitize-mermaid";

interface ChatMessageProps {
  type: OpenHandsSourceType;
  message: string;
  actions?: Array<{
    icon: React.ReactNode;
    onClick: () => void;
    tooltip?: string;
  }>;
}

// Lazy mermaid singleton (dark theme) — shared across chat blocks; mirrors the
// Pages-panel renderer so chat embeds the actual rendered diagram, not raw code.
type MermaidMod = typeof import("mermaid");
let _mermaid: MermaidMod | null = null;
let _mermaidReady = false;
let _mermaidLoading = false;
const _mermaidQueue: ((m: MermaidMod) => void)[] = [];
function loadMermaid(cb: (m: MermaidMod) => void) {
  if (_mermaidReady && _mermaid) {
    cb(_mermaid);
    return;
  }
  _mermaidQueue.push(cb);
  if (_mermaidLoading) return;
  _mermaidLoading = true;
  import("mermaid")
    .then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "loose",
        themeVariables: {
          primaryColor: "#252525",
          primaryTextColor: "#e2e8f0",
          primaryBorderColor: "#3a3a3a",
          lineColor: "#888888",
          background: "#181818",
          mainBkg: "#252525",
          clusterBkg: "#1a1a1a",
          fontFamily: "Inter, ui-sans-serif, sans-serif",
        },
      });
      _mermaid = m;
      _mermaidReady = true;
      _mermaidQueue.forEach((fn) => fn(m));
      _mermaidQueue.length = 0;
    })
    .catch(() => {
      _mermaidLoading = false;
    });
}

function MermaidBlock({ code }: { code: string }) {
  const { setSelectedTab, setHasRightPanelToggled } = useConversationStore();
  const ref = React.useRef<HTMLDivElement>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !code.trim()) return;
    setErr(null);
    el.innerHTML = "";
    const id = `cg-chat-mmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    loadMermaid(async (m) => {
      try {
        const { svg } = await m.default.render(id, sanitizeMermaid(code));
        el.innerHTML = svg
          .replace(/(<svg[^>]*)\swidth="[^"]*"/, "$1")
          .replace(/(<svg[^>]*)\sheight="[^"]*"/, "$1");
        const s = el.querySelector("svg");
        if (s) {
          (s as SVGElement).style.display = "block";
          (s as SVGElement).style.margin = "0 auto";
          (s as SVGElement).style.width = "100%";
          (s as SVGElement).style.maxWidth = "100%";
          (s as SVGElement).style.height = "auto";
        }
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
        el.innerHTML = "";
      } finally {
        document.getElementById(id)?.remove();
      }
    });
  }, [code]);

  return (
    <div
      style={{
        position: "relative",
        marginBottom: "8px",
        border: "1px solid var(--cg-border)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Rendered diagram (the embedded image) */}
      <div
        ref={ref}
        style={{ background: "var(--cg-bg-page)", padding: "12px", minHeight: "48px" }}
      />
      {/* Fallback: only if render failed, show the raw source so nothing is lost */}
      {err && (
        <pre
          style={{
            background: "var(--cg-input-bg)",
            padding: "10px 12px",
            margin: 0,
            fontSize: "12px",
            color: "var(--cg-text-nav)",
            overflowX: "auto",
            whiteSpace: "pre",
            fontFamily: "monospace",
            borderTop: "1px solid var(--cg-border)",
          }}
        >
          {code}
        </pre>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "6px 10px",
          borderTop: "1px solid var(--cg-border)",
          background: "var(--cg-bg-page)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setSelectedTab("diagrams");
            setHasRightPanelToggled(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            background: "var(--cg-workspace-bg-hover)",
            border: "1px solid var(--cg-border)",
            borderRadius: "6px",
            color: "var(--cg-text-nav)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          <BarChart2 size={13} />
          View Diagram
        </button>
      </div>
    </div>
  );
}

export function ChatMessage({
  type,
  message,
  children,
  actions,
}: React.PropsWithChildren<ChatMessageProps>) {
  const [isHovering, setIsHovering] = React.useState(false);
  const [isCopy, setIsCopy] = React.useState(false);

  const mermaidCodeRenderer = React.useCallback(
    ({ language, code }: { language: string; code: string; inline: boolean }) => {
      if (language !== "mermaid") return null;
      return <MermaidBlock key={code} code={code} />;
    },
    [],
  );

  const handleCopyToClipboard = async () => {
    await navigator.clipboard.writeText(message);
    setIsCopy(true);
  };

  React.useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isCopy) {
      timeout = setTimeout(() => {
        setIsCopy(false);
      }, 2000);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [isCopy]);

  return (
    <article
      data-testid={`${type}-message`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        "rounded-xl relative w-fit max-w-full last:mb-4",
        "flex flex-col gap-2",
        type === "user" && "p-4 self-end",
        type === "agent" && "mt-6 w-full max-w-full",
      )}
      style={
        type === "user"
          ? { backgroundColor: "var(--cg-input-bg)" }
          : {}
      }
    >
      <div
        className={cn(
          "absolute -top-2.5 -right-2.5",
          !isHovering ? "hidden" : "flex",
          "items-center gap-1",
        )}
      >
        {actions?.map((action, index) =>
          action.tooltip ? (
            <TooltipButton
              key={index}
              tooltip={action.tooltip}
              ariaLabel={action.tooltip}
              placement="top"
            >
              <button
                type="button"
                onClick={action.onClick}
                className="button-base p-1 cursor-pointer"
                aria-label={`Action ${index + 1}`}
              >
                {action.icon}
              </button>
            </TooltipButton>
          ) : (
            <button
              key={index}
              type="button"
              onClick={action.onClick}
              className="button-base p-1 cursor-pointer"
              aria-label={`Action ${index + 1}`}
            >
              {action.icon}
            </button>
          ),
        )}

        <CopyToClipboardButton
          isHidden={!isHovering}
          isDisabled={isCopy}
          onClick={handleCopyToClipboard}
          mode={isCopy ? "copied" : "copy"}
        />
      </div>

      <div style={{ wordBreak: "break-word" }}>
        <MarkdownRenderer
          content={message}
          className="md-vscode--chat"
          breaks
          codeRenderer={mermaidCodeRenderer}
        />
      </div>
      {children}
    </article>
  );
}

import React from "react";
import { BarChart2 } from "lucide-react";
import { cn } from "#/utils/utils";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import { CopyToClipboardButton } from "#/components/shared/buttons/copy-to-clipboard-button";
import { OpenHandsSourceType } from "#/types/core/base";
import { TooltipButton } from "#/components/shared/buttons/tooltip-button";
import { useConversationStore } from "#/state/conversation-store";

interface ChatMessageProps {
  type: OpenHandsSourceType;
  message: string;
  actions?: Array<{
    icon: React.ReactNode;
    onClick: () => void;
    tooltip?: string;
  }>;
}

function MermaidBlock({ code }: { code: string }) {
  const { setSelectedTab, setHasRightPanelToggled } = useConversationStore();

  return (
    <div style={{ position: "relative", marginBottom: "8px" }}>
      <pre
        style={{
          background: "var(--cg-input-bg)",
          border: "1px solid var(--cg-border)",
          borderRadius: "8px",
          padding: "12px 14px",
          fontSize: "12px",
          color: "var(--cg-text-nav)",
          overflowX: "auto",
          whiteSpace: "pre",
          fontFamily: "monospace",
        }}
      >
        {code}
      </pre>
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
          marginTop: "6px",
          padding: "5px 12px",
          background: "var(--cg-workspace-bg-hover)",
          border: "1px solid var(--cg-border)",
          borderRadius: "6px",
          color: "var(--cg-text-nav)",
          fontSize: "12px",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--cg-text-primary)";
          (e.currentTarget as HTMLButtonElement).style.background = "var(--cg-workspace-bg)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--cg-text-nav)";
          (e.currentTarget as HTMLButtonElement).style.background = "var(--cg-workspace-bg-hover)";
        }}
      >
        <BarChart2 size={13} />
        View Diagram
      </button>
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

import React from "react";
import { FileText, X, Maximize2 } from "lucide-react";

export interface PasteBlock {
  id: string;
  text: string;
  createdAt: number;
}

const LONG_PASTE_CHARS = 200;
const LONG_PASTE_LINES = 3;

export function isLongPaste(text: string): boolean {
  return (
    text.length > LONG_PASTE_CHARS ||
    (text.match(/\n/g)?.length ?? 0) >= LONG_PASTE_LINES
  );
}

function formatSize(text: string): string {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/* ─── Expand modal ─── */

interface PasteExpandModalProps {
  text: string;
  onClose: () => void;
}

function PasteExpandModal({ text, onClose }: PasteExpandModalProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Close on Escape
  React.useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  const lines = text.split("\n").length;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Panel */}
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          background: "var(--cg-bg-page)",
          border: "1px solid var(--cg-border)",
          width: "min(720px, 90vw)",
          maxHeight: "80vh",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--cg-border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-white">
              Pasted text
            </span>
            <span
              className="text-[11px] px-1.5 py-0.5 rounded"
              style={{ background: "var(--cg-bg-badge)", color: "var(--cg-text-muted)" }}
            >
              {lines} {lines === 1 ? "line" : "lines"} · {formatSize(text)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="text-[12px] px-3 py-1 rounded-md transition-colors"
              style={{
                background: "var(--cg-bg-badge)",
                color: copied ? "#6ee7b7" : "var(--cg-text-nav)",
                border: "1px solid var(--cg-border)",
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-6 h-6 rounded transition-colors"
              style={{ color: "var(--cg-text-muted)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--cg-text-nav)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--cg-text-muted)")
              }
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <pre
          className="flex-1 overflow-auto p-4 text-[13px] leading-relaxed font-mono custom-scrollbar"
          style={{
            color: "var(--cg-text-nav)",
            background: "var(--cg-bg-page)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            margin: 0,
          }}
        >
          {text}
        </pre>
      </div>
    </div>
  );
}

/* ─── Paste preview block (the collapsed chip) ─── */

interface PastePreviewBlockProps {
  block: PasteBlock;
  onRemove: (id: string) => void;
}

export function PastePreviewBlock({ block, onRemove }: PastePreviewBlockProps) {
  const [expanded, setExpanded] = React.useState(false);

  const lines = block.text.split("\n").length;
  // First 2 non-empty lines as snippet
  const snippet = block.text
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, 2)
    .join(" · ")
    .slice(0, 80);

  return (
    <>
      {expanded && (
        <PasteExpandModal
          text={block.text}
          onClose={() => setExpanded(false)}
        />
      )}

      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors select-none"
        style={{
          background: "var(--cg-bg-badge)",
          border: "1px solid var(--cg-border)",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.borderColor = "var(--cg-border-strong)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.borderColor = "var(--cg-border)")
        }
        onClick={() => setExpanded(true)}
      >
        {/* Doc icon */}
        <FileText size={14} className="flex-shrink-0" style={{ color: "var(--cg-text-muted)" }} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-white">
              Pasted text
            </span>
            <span className="text-[11px]" style={{ color: "var(--cg-text-muted)" }}>
              {lines} {lines === 1 ? "line" : "lines"} · {formatSize(block.text)}
            </span>
          </div>
          {snippet && (
            <div
              className="text-[11px] font-mono truncate mt-0.5"
              style={{ color: "var(--cg-text-muted)" }}
            >
              {snippet}
            </div>
          )}
        </div>

        {/* Click hint */}
        <Maximize2 size={11} className="flex-shrink-0" style={{ color: "var(--cg-border-strong)" }} />

        {/* Remove */}
        <button
          type="button"
          className="flex-shrink-0 flex items-center justify-center transition-colors"
          style={{ color: "var(--cg-text-muted)" }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            (e.currentTarget as HTMLElement).style.color = "var(--cg-text-nav)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--cg-text-muted)";
          }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(block.id);
          }}
        >
          <X size={13} />
        </button>
      </div>
    </>
  );
}

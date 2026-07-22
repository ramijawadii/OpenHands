/* eslint-disable i18next/no-literal-string */
import React from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";

/** The one execution card used by BOTH the Commands and Jupyter tabs.
 *  They rendered separate boxes before and drifted apart; keeping a single
 *  component is what stops that happening again. */

export type ExecStatus =
  | { kind: "running" }
  | { kind: "ok" }
  | { kind: "failed"; label: string; code?: number }
  | { kind: "unknown" };

/** Keep every card the same height: clip long code/output and mark it. */
export const MAX_LINES = 12;

export function clip(text: string): { body: string; clipped: boolean } {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.length <= MAX_LINES) return { body: lines.join("\n"), clipped: false };
  return { body: lines.slice(0, MAX_LINES).join("\n"), clipped: true };
}

function StatusChip({ status }: { status: ExecStatus }) {
  if (status.kind === "ok") {
    return (
      <>
        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        ok
      </>
    );
  }
  if (status.kind === "failed") {
    return (
      <>
        <XCircle className="h-3 w-3 text-[var(--cg-danger)]" />
        {status.label}
        {status.code != null && ` · exit ${status.code}`}
      </>
    );
  }
  if (status.kind === "running") {
    return (
      <>
        <Loader2 className="h-3 w-3 animate-spin" />
        running
      </>
    );
  }
  return (
    <>
      <HelpCircle className="h-3 w-3" />
      exit unknown
    </>
  );
}

function downloadImage(url: string, filename: string) {
  const a = document.createElement("a");
  a.download = filename;
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    a.href = url;
    a.click();
    return;
  }
  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(() => window.open(url, "_blank"));
}

interface ExecutionCellProps {
  n: number;
  /** right-hand label in the header: "bash", "Python 3", … */
  kindLabel: string;
  title: string;
  status: ExecStatus;
  code: string;
  output?: string;
  /** result images (matplotlib plots, etc.) rendered under the text output */
  images?: string[];
  /** optional richer renderer for the code region (e.g. CodeMirror) */
  renderCode?: (code: string) => React.ReactNode;
}

export function ExecutionCell({
  n,
  kindLabel,
  title,
  status,
  code,
  output,
  images,
  renderCode,
}: ExecutionCellProps) {
  const [expanded, setExpanded] = React.useState(false);
  const rawCode = code.trim();
  const rawOut = (output ?? "").trim();
  const clippedCode = clip(rawCode);
  const clippedOut = clip(rawOut);
  const shownCode = expanded ? { body: rawCode, clipped: false } : clippedCode;
  const shownOut = expanded ? { body: rawOut, clipped: false } : clippedOut;
  const canExpand = clippedCode.clipped || clippedOut.clipped;

  return (
    <div className="cg-msg-in overflow-hidden rounded-lg border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)]">
      {/* header: In [n] · title · kind · status */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--cg-border-subtle)] bg-black/20 px-3 py-1.5 text-[11px] text-[var(--cg-text-muted)]">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className="shrink-0">In [{n}]</span>
          <span className="truncate font-mono text-[var(--cg-text-nav)]">
            {title}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-2 font-mono">
          <span className="text-[var(--cg-text-muted)]">{kindLabel}</span>
          <StatusChip status={status} />
        </span>
      </div>

      {/* the executed code */}
      {renderCode ? (
        <div className="overflow-hidden">{renderCode(shownCode.body)}</div>
      ) : (
        <pre className="cg-scroll overflow-x-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words text-[var(--cg-text-primary)]">
          {shownCode.body}
          {shownCode.clipped && (
            <span className="text-[var(--cg-text-muted)]">{"\n… truncated"}</span>
          )}
        </pre>
      )}

      {/* text output */}
      {rawOut && (
        <div className="border-t border-[var(--cg-border-subtle)] bg-black/30 px-3 py-2 font-mono text-[11.5px] text-[var(--cg-text-nav)]">
          <span className="mr-2 text-[var(--cg-text-muted)]">Out[{n}]:</span>
          <pre className="inline whitespace-pre-wrap break-words">
            {shownOut.body}
          </pre>
          {shownOut.clipped && (
            <div className="mt-1 text-[11px] text-[var(--cg-text-muted)]">
              … output truncated
            </div>
          )}
        </div>
      )}

      {/* result images — plots used to be dropped silently */}
      {images && images.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[var(--cg-border-subtle)] bg-black/30 px-3 py-2">
          {images.map((url, i) => (
            <div key={url} className="group relative">
              <button
                type="button"
                title="Download as PNG"
                onClick={() => downloadImage(url, `output_${n}_${i + 1}.png`)}
                className="absolute top-2 right-2 z-10 grid h-6 w-6 place-items-center rounded-md border border-[var(--cg-border-strong)] bg-[var(--cg-bg-card)] text-[var(--cg-text-nav)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--cg-text-primary)] cursor-pointer"
              >
                <Download className="h-3 w-3" />
              </button>
              <img
                src={url}
                alt={`Output ${n} result ${i + 1}`}
                className="max-h-[60vh] w-full rounded-md object-contain"
              />
            </div>
          ))}
        </div>
      )}

      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1 border-t border-[var(--cg-border-subtle)] bg-black/20 px-3 py-1.5 text-[11px] text-[var(--cg-text-muted)] transition-colors hover:text-[var(--cg-text-primary)] cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              collapse
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              expand
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default ExecutionCell;

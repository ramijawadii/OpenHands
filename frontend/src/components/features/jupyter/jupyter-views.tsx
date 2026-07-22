/* eslint-disable i18next/no-literal-string */
import React from "react";
import {
  Activity,
  Database,
  NotebookText,
  Search,
  X,
  Download,
  RotateCcw,
  Square,
  FileDown,
  ArrowRightLeft,
  FileText,
  Table2,
  Braces,
  AlertTriangle,
} from "lucide-react";
import { cn } from "#/utils/utils";
import type { ExecutionRecord, RuntimeState } from "#/state/jupyter-store";

/** The Jupyter tab's three views. Kept out of jupyter.tsx, which is already
 *  large. Everything here is presentational — data and actions are passed in. */

export type JupyterView = "notebook" | "data" | "runtime";

// ── shared atoms ─────────────────────────────────────────────────────────────

const BTN =
  "inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] transition-colors hover:border-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer";

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "ok" | "warn" | "bad";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-2.5 py-2">
      <span className="text-[10px] tracking-wide text-[var(--cg-text-muted)] uppercase">
        {label}
      </span>
      <span
        className={cn(
          "truncate font-mono text-[12.5px]",
          tone === "ok" && "text-emerald-400",
          tone === "warn" && "text-amber-400",
          tone === "bad" && "text-[var(--cg-danger)]",
          !tone && "text-[var(--cg-text-primary)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] font-medium tracking-wider text-[var(--cg-text-nav)] uppercase">
        {children}
      </span>
      {hint && (
        <span className="text-[10px] text-[var(--cg-text-muted)]">{hint}</span>
      )}
    </div>
  );
}

/** Used wherever a panel needs data the frontend genuinely cannot obtain yet.
 *  Stating that plainly beats inventing plausible numbers. */
function Unavailable({ what, why }: { what: string; why: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-3 py-2">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
      <div className="min-w-0">
        <p className="text-[11.5px] text-[var(--cg-text-primary)]">{what}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-[var(--cg-text-muted)]">
          {why}
        </p>
      </div>
    </div>
  );
}

const fmtDur = (ms?: number): string => {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
};

// ── view switcher ────────────────────────────────────────────────────────────

const VIEWS: {
  id: JupyterView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "notebook", label: "Notebook", icon: NotebookText },
  { id: "data", label: "Data", icon: Database },
  { id: "runtime", label: "Runtime", icon: Activity },
];

export function JupyterViewSwitcher({
  view,
  onChange,
}: {
  view: JupyterView;
  onChange: (v: JupyterView) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] transition-colors",
            view === id
              ? "bg-[var(--cg-bg-card)] text-[var(--cg-text-primary)]"
              : "text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-primary)]",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ── notebook toolbar ─────────────────────────────────────────────────────────

export function NotebookToolbar({
  query,
  onQuery,
  matchCount,
  totalCount,
  busy,
  onInterrupt,
  onRestart,
  onExportIpynb,
  onExportHtml,
}: {
  query: string;
  onQuery: (q: string) => void;
  matchCount: number;
  totalCount: number;
  busy: boolean;
  onInterrupt: () => void;
  onRestart: () => void;
  onExportIpynb: () => void;
  onExportHtml: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--cg-border-subtle)] px-3 py-2">
      <div className="relative min-w-[160px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cg-text-muted)]" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search cells — code and output…"
          className="w-full rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] py-1 pr-7 pl-7 font-mono text-[11.5px] text-[var(--cg-text-primary)] outline-none placeholder:text-[var(--cg-text-muted)] focus:border-[var(--cg-text-muted)]"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onQuery("")}
            className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {query && (
        <span className="text-[11px] tabular-nums text-[var(--cg-text-muted)]">
          {matchCount}/{totalCount}
        </span>
      )}

      <button
        type="button"
        className={BTN}
        onClick={onInterrupt}
        disabled={!busy}
        title={
          busy
            ? "Ask the agent to interrupt the running cell"
            : "Nothing is running"
        }
      >
        <Square className="h-3 w-3" />
        Interrupt
      </button>
      <button
        type="button"
        className={BTN}
        onClick={onRestart}
        title="Ask the agent to restart the kernel"
      >
        <RotateCcw className="h-3 w-3" />
        Restart
      </button>
      <button
        type="button"
        className={BTN}
        onClick={onExportIpynb}
        title="Download as .ipynb"
      >
        <FileDown className="h-3 w-3" />
        .ipynb
      </button>
      <button
        type="button"
        className={BTN}
        onClick={onExportHtml}
        title="Download as HTML"
      >
        <Download className="h-3 w-3" />
        HTML
      </button>
    </div>
  );
}

// ── data view ────────────────────────────────────────────────────────────────

export interface DataFileEntry {
  path: string;
  name: string;
  kind: "input" | "output";
  cells: number[];
}

const EXT_ICON = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["csv", "tsv", "xlsx", "xls", "parquet"].includes(ext)) return Table2;
  if (["json", "jsonl", "yaml", "yml"].includes(ext)) return Braces;
  return FileText;
};

export function DataView({
  files,
  onAttachToReport,
}: {
  files: DataFileEntry[];
  onAttachToReport: (path: string) => void;
}) {
  const inputs = files.filter((f) => f.kind === "input");
  const outputs = files.filter((f) => f.kind === "output");

  const row = (f: DataFileEntry) => {
    const Icon = EXT_ICON(f.name);
    return (
      <div
        key={`${f.kind}:${f.path}`}
        className="flex items-center gap-2 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-2.5 py-1.5"
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--cg-text-muted)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[11.5px] text-[var(--cg-text-primary)]">
            {f.name}
          </p>
          <p className="truncate font-mono text-[10.5px] text-[var(--cg-text-muted)]">
            {f.path}
          </p>
        </div>
        {/* lineage — the "says who?" answer */}
        <span
          className="shrink-0 rounded bg-white/5 px-1.5 py-px font-mono text-[10px] text-[var(--cg-text-nav)]"
          title={`${f.kind === "input" ? "Read by" : "Written by"} cell ${f.cells.join(", ")}`}
        >
          {f.kind === "input" ? "in" : "out"} [{f.cells.join(",")}]
        </span>
        <button
          type="button"
          className={BTN}
          onClick={() => onAttachToReport(f.path)}
          title="Ask the agent to copy this artifact into the Report"
        >
          <ArrowRightLeft className="h-3 w-3" />
          Report
        </button>
      </div>
    );
  };

  return (
    <div className="cg-scroll flex h-full flex-col gap-4 overflow-y-auto px-3 py-3">
      <div className="flex flex-col gap-1.5">
        <SectionTitle hint="objects held by the kernel">
          Variable explorer
        </SectionTitle>
        <Unavailable
          what="DataFrames in memory are not listed yet."
          why="Listing shape/dtypes/memory requires running introspection inside the kernel. That makes this panel an executor, so it must first be a declared, audited read action rather than an invisible side channel."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionTitle hint={`${inputs.length} read`}>Inputs</SectionTitle>
        {inputs.length ? (
          <div className="flex flex-col gap-1">{inputs.map(row)}</div>
        ) : (
          <p className="px-1 text-[11.5px] text-[var(--cg-text-muted)]">
            No input files detected in this session.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionTitle hint={`${outputs.length} written`}>Outputs</SectionTitle>
        {outputs.length ? (
          <div className="flex flex-col gap-1">{outputs.map(row)}</div>
        ) : (
          <p className="px-1 text-[11.5px] text-[var(--cg-text-muted)]">
            No artifacts written yet.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionTitle>Preview</SectionTitle>
        <Unavailable
          what="head() / column stats / null counts are not available."
          why="Same constraint as the variable explorer — it needs kernel-side execution."
        />
      </div>
    </div>
  );
}

// ── runtime view ─────────────────────────────────────────────────────────────

const STATE_TONE: Record<RuntimeState, "ok" | "warn" | "bad" | undefined> = {
  idle: "ok",
  starting: "warn",
  busy: "warn",
  restarting: "warn",
  dead: "bad",
};

export function RuntimeView({
  runtimeState,
  kernelName,
  executionCounter,
  executionHistory,
  runningSince,
  runningLabel,
  queued,
  sessionStart,
}: {
  runtimeState: RuntimeState;
  kernelName: string;
  executionCounter: number;
  executionHistory: ExecutionRecord[];
  /** epoch ms the current cell started, when one is running */
  runningSince?: number;
  runningLabel?: string;
  queued: number;
  sessionStart: number;
}) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const errors = executionHistory.filter((r) => r.status === "error").length;
  const totalMs = executionHistory.reduce((a, r) => a + r.duration, 0);
  const slowest = [...executionHistory]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  return (
    <div className="cg-scroll flex h-full flex-col gap-4 overflow-y-auto px-3 py-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat
          label="kernel"
          value={runtimeState}
          tone={STATE_TONE[runtimeState]}
        />
        <Stat label="name" value={kernelName} />
        <Stat label="session uptime" value={fmtDur(now - sessionStart)} />
        <Stat label="executions" value={executionCounter} />
        <Stat
          label="errors"
          value={errors}
          tone={errors > 0 ? "bad" : undefined}
        />
        <Stat label="total compute" value={fmtDur(totalMs)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionTitle hint={queued > 0 ? `${queued} waiting` : undefined}>
          Execution queue
        </SectionTitle>
        {runningSince ? (
          <div className="flex items-center gap-2 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-2.5 py-2">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />
            <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-[var(--cg-text-primary)]">
              {runningLabel || "running cell"}
            </span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--cg-text-nav)]">
              {fmtDur(now - runningSince)}
            </span>
          </div>
        ) : (
          <p className="px-1 text-[11.5px] text-[var(--cg-text-muted)]">
            Nothing running.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionTitle hint="where the session's time went">
          Slowest cells
        </SectionTitle>
        {slowest.length ? (
          <div className="flex flex-col gap-1">
            {slowest.map((r) => (
              <div
                key={r.cellId}
                className="flex items-center gap-2 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-2.5 py-1.5"
              >
                <span className="shrink-0 font-mono text-[11px] text-[var(--cg-text-muted)]">
                  In [{r.executionCount}]
                </span>
                <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      r.status === "error"
                        ? "bg-[var(--cg-danger)]"
                        : "bg-[var(--cg-accent-purple)]",
                    )}
                    style={{
                      width: `${Math.max(4, (r.duration / (slowest[0]?.duration || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--cg-text-nav)]">
                  {fmtDur(r.duration)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-1 text-[11.5px] text-[var(--cg-text-muted)]">
            No completed executions yet.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionTitle hint="reproducibility / SBOM">Environment</SectionTitle>
        <Unavailable
          what="Python version and installed packages are not shown."
          why="These come from inside the sandbox — the same in-sandbox metrics endpoint the Sandbox Health tab is waiting on. The control plane's view would describe the wrong container."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionTitle>Kernel process</SectionTitle>
        <Unavailable
          what="Kernel CPU and memory are not shown."
          why="Distinct from container-level Sandbox Health: this is the kernel process itself, and needs per-process stats from inside the sandbox."
        />
      </div>
    </div>
  );
}

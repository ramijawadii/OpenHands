import React from "react";
import { useTranslation } from "react-i18next";
import { useScrollToBottom } from "#/hooks/use-scroll-to-bottom";
import { JupyterCell } from "./jupyter-cell";
import { ScrollToBottomButton } from "#/components/shared/buttons/scroll-to-bottom-button";
import { RUNTIME_INACTIVE_STATES, AgentState } from "#/types/agent-state";
import { I18nKey } from "#/i18n/declaration";
import JupyterLargeIcon from "#/icons/jupyter-large.svg?react";
import { WaitingForRuntimeMessage } from "../chat/waiting-for-runtime-message";
import { useAgentStore } from "#/stores/agent-store";
import { useJupyterStore, type RuntimeState, type Cell } from "#/state/jupyter-store";
import { useConversationId } from "#/hooks/use-conversation-id";
import { useWsClient } from "#/context/ws-client-provider";
import { createChatMessage } from "#/services/chat-service";
import ConversationService from "#/api/conversation-service/conversation-service.api";

// ── runtime mapping ───────────────────────────────────────

function agentStateToRuntimeState(s: AgentState): RuntimeState {
  switch (s) {
    case AgentState.LOADING:
    case AgentState.INIT:
      return "starting";
    case AgentState.RUNNING:
    case AgentState.USER_CONFIRMED:
      return "busy";
    case AgentState.ERROR:
    case AgentState.RATE_LIMITED:
      return "dead";
    default:
      return "idle";
  }
}

// ── helpers ───────────────────────────────────────────────

function fmtRelative(date: Date | null): string {
  if (!date) return "";
  const d = Date.now() - date.getTime();
  if (d < 5000) return "just now";
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  return `${Math.floor(d / 3600000)}h ago`;
}

function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? path;
}

function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

// ── notebook IO parsing ───────────────────────────────────

const DATA_EXTS = new Set([
  "csv", "tsv", "xlsx", "xls", "json", "jsonl", "parquet", "feather",
  "h5", "hdf5", "pkl", "pickle", "db", "sqlite", "npy", "npz", "txt",
  "yaml", "yml", "xml", "pt", "pth", "ckpt", "bin", "mat", "sav",
]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "bmp", "tiff", "svg", "webp"]);

function hasRelevantExt(path: string): boolean {
  const ext = (path.split(".").pop() ?? "").toLowerCase();
  return DATA_EXTS.has(ext) || IMAGE_EXTS.has(ext);
}

interface InputFile {
  name: string;
  path: string;
  cells: number[];
}

interface OutputItem {
  name: string;
  path?: string;
  url?: string;
  type: "file" | "image";
}

interface CellOutputGroup {
  cellCount: number;
  items: OutputItem[];
}

const INPUT_PATTERNS = [
  /pd(?:\s*\.\s*)?read_(?:csv|excel|parquet|json|feather|pickle|hdf|table|stata|sas|fwf|orc)\s*\(\s*["'`]([^"'`\n\s]+)["'`]/gi,
  /np\.(?:load|loadtxt|fromfile|genfromtxt)\s*\(\s*["'`]([^"'`\n\s]+)["'`]/gi,
  /(?:cv2\.imread|Image\.open|imageio\.imread|mpimg\.imread|skimage\.io\.imread)\s*\(\s*["'`]([^"'`\n\s]+)["'`]/gi,
  /(?:torch\.load|joblib\.load|tf\.keras\.models\.load_model|tf\.saved_model\.load)\s*\(\s*["'`]([^"'`\n\s]+)["'`]/gi,
  /open\s*\(\s*["'`]([^"'`\n\s]+)["'`]\s*,\s*["'`]r[b]?["'`]/gi,
  /with\s+open\s*\(\s*["'`]([^"'`\n\s]+)["'`]\s*,\s*["'`]r/gi,
  /h5py\.File\s*\(\s*["'`]([^"'`\n\s]+)["'`]/gi,
  /scipy\.io\.(?:loadmat|readsav|wavfile\.read)\s*\(\s*["'`]([^"'`\n\s]+)["'`]/gi,
] as const;

const OUTPUT_PATTERNS = [
  /\.to_(?:csv|excel|parquet|json|feather|pickle|hdf|stata|orc)\s*\(\s*["'`]([^"'`\n\s]+)["'`]/gi,
  /(?:plt|fig|figure)\s*\.savefig\s*\(\s*["'`]([^"'`\n\s]+)["'`]/gi,
  /ax(?:es)?\s*\.get_figure\s*\(\s*\)\s*\.savefig\s*\(\s*["'`]([^"'`\n\s]+)["'`]/gi,
  /np\.(?:save|savetxt|savez|savez_compressed)\s*\(\s*["'`]([^"'`\n\s]+)["'`]/gi,
  /(?:cv2\.imwrite|imageio\.imwrite|imageio\.v3\.imwrite|skimage\.io\.imsave)\s*\(\s*["'`]([^"'`\n\s]+)["'`]/gi,
  /(?:torch\.save|joblib\.dump)\s*\([^,\n]+,\s*["'`]([^"'`\n\s]+)["'`]/gi,
  /open\s*\(\s*["'`]([^"'`\n\s]+)["'`]\s*,\s*["'`]w[b]?["'`]/gi,
  /with\s+open\s*\(\s*["'`]([^"'`\n\s]+)["'`]\s*,\s*["'`]w/gi,
  /scipy\.io\.(?:savemat|wavfile\.write)\s*\(\s*["'`]([^"'`\n\s]+)["'`]/gi,
] as const;

function parseNotebookIO(cells: Cell[]): {
  inputs: InputFile[];
  outputs: CellOutputGroup[];
} {
  const inputMap = new Map<string, { path: string; cells: number[] }>();
  const outputGroups = new Map<number, OutputItem[]>();

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.type !== "input" || !cell.executionCount) continue;

    const count = cell.executionCount;
    const code = cell.content;

    // inputs
    for (const pattern of INPUT_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      for (const m of code.matchAll(re)) {
        const path = m[1];
        if (!path || path.length < 2 || !hasRelevantExt(path)) continue;
        if (!inputMap.has(path))
          inputMap.set(path, { path, cells: [] });
        const e = inputMap.get(path)!;
        if (!e.cells.includes(count)) e.cells.push(count);
      }
    }

    // outputs from code
    const items: OutputItem[] = outputGroups.get(count) ?? [];
    for (const pattern of OUTPUT_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      for (const m of code.matchAll(re)) {
        const path = m[1];
        if (!path || path.length < 2 || !hasRelevantExt(path)) continue;
        if (!items.find((o) => o.path === path))
          items.push({ name: basename(path), path, type: "file" });
      }
    }

    // image outputs from next adjacent output cell
    const next = cells[i + 1];
    if (next?.type === "output" && next.imageUrls?.length) {
      next.imageUrls.forEach((url, idx) => {
        items.push({
          name: `figure_${count}_${idx + 1}.png`,
          url,
          type: "image",
        });
      });
    }

    if (items.length > 0) outputGroups.set(count, items);
  }

  const inputs: InputFile[] = [...inputMap.values()]
    .map((e) => ({ name: basename(e.path), path: e.path, cells: e.cells.sort((a, b) => a - b) }))
    .sort((a, b) => a.cells[0] - b.cells[0]);

  const outputs: CellOutputGroup[] = [...outputGroups.entries()]
    .map(([cellCount, items]) => ({ cellCount, items }))
    .sort((a, b) => a.cellCount - b.cellCount);

  return { inputs, outputs };
}

// ── file-type icon ────────────────────────────────────────

const EXT_CFG: Record<string, { bg: string; label: string }> = {
  ".py": { bg: "#3572A5", label: "PY" },
  ".ipynb": { bg: "#F37626", label: "NB" },
  ".csv": { bg: "#217346", label: "CSV" },
  ".tsv": { bg: "#217346", label: "TSV" },
  ".xlsx": { bg: "#217346", label: "XLS" },
  ".xls": { bg: "#217346", label: "XLS" },
  ".json": { bg: "#CB8D13", label: "JSN" },
  ".jsonl": { bg: "#CB8D13", label: "JSL" },
  ".parquet": { bg: "#7C3AED", label: "PQ" },
  ".feather": { bg: "#6D28D9", label: "FTH" },
  ".h5": { bg: "#5B21B6", label: "H5" },
  ".hdf5": { bg: "#5B21B6", label: "HDF" },
  ".pkl": { bg: "#8B5CF6", label: "PKL" },
  ".pickle": { bg: "#8B5CF6", label: "PKL" },
  ".db": { bg: "#1D4ED8", label: "DB" },
  ".sqlite": { bg: "#1D4ED8", label: "SQL" },
  ".npy": { bg: "#0369A1", label: "NPY" },
  ".npz": { bg: "#0369A1", label: "NPZ" },
  ".pt": { bg: "#EE4C2C", label: "PT" },
  ".pth": { bg: "#EE4C2C", label: "PTH" },
  ".ckpt": { bg: "#EE4C2C", label: "CKP" },
  ".png": { bg: "#0891B2", label: "PNG" },
  ".jpg": { bg: "#0891B2", label: "JPG" },
  ".jpeg": { bg: "#0891B2", label: "JPG" },
  ".gif": { bg: "#0891B2", label: "GIF" },
  ".bmp": { bg: "#0891B2", label: "BMP" },
  ".tiff": { bg: "#0891B2", label: "TIF" },
  ".txt": { bg: "#6B7280", label: "TXT" },
  ".mat": { bg: "#E55C04", label: "MAT" },
};

function FileTypeIcon({ name }: { name: string }) {
  const ext = fileExt(name);
  const cfg = EXT_CFG[ext] ?? { bg: "#4B5563", label: ext.slice(1, 4).toUpperCase() || "DOC" };
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 rounded-[2px] font-bold select-none text-white"
      style={{
        background: cfg.bg,
        width: 18,
        height: 13,
        fontSize: "5.5px",
        letterSpacing: "-0.2px",
        lineHeight: 1,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── download utilities ────────────────────────────────────

async function downloadFromSandbox(
  conversationId: string,
  path: string,
  name: string,
): Promise<void> {
  let content: string | undefined;
  try {
    content = await ConversationService.getFile(conversationId, path);
  } catch {
    try {
      content = await ConversationService.getFile(
        conversationId,
        `/workspace/${path.replace(/^\/+/, "")}`,
      );
    } catch {
      return;
    }
  }
  if (content == null) return;
  const blob = new Blob([content], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadDataUrl(url: string, name: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── VSCode colors ─────────────────────────────────────────

const VS = {
  bg: "var(--cg-input-bg)",
  hover: "var(--cg-bg-hover)",
  text: "var(--cg-text-nav)",
  dim: "var(--cg-text-muted)",
  header: "var(--cg-text-nav)",
  sep: "var(--cg-border)",
  badge: "var(--cg-bg-badge)",
  cellBadge: "#1e3a5f",
  cellBadgeText: "#60a5fa",
};

// ── notebook IO panel ─────────────────────────────────────

function IORow({
  name,
  cellBadges,
  onDownload,
}: {
  name: string;
  cellBadges?: number[];
  onDownload: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      className="flex items-center gap-1.5 cursor-pointer select-none"
      style={{
        height: 22,
        paddingLeft: 12,
        paddingRight: 6,
        background: hovered ? VS.hover : "transparent",
        color: VS.text,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onDownload}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onDownload()}
    >
      <FileTypeIcon name={name} />
      <span
        className="flex-1 truncate"
        style={{ fontSize: 12.5 }}
        title={name}
      >
        {name}
      </span>

      {/* cell badges */}
      {cellBadges && cellBadges.length > 0 && (
        <span className="flex gap-0.5 shrink-0">
          {cellBadges.slice(0, 4).map((n) => (
            <span
              key={n}
              className="font-mono rounded-[2px] px-0.5"
              style={{
                fontSize: 9,
                lineHeight: "13px",
                background: VS.cellBadge,
                color: VS.cellBadgeText,
              }}
            >
              [{n}]
            </span>
          ))}
        </span>
      )}

      {/* download arrow on hover */}
      {hovered && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke={VS.dim}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 ml-0.5"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
    </div>
  );
}

function SectionHeader({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <div
      className="flex items-center justify-between select-none"
      style={{
        height: 24,
        paddingLeft: 10,
        paddingRight: 8,
        marginTop: 4,
      }}
    >
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: VS.header,
        }}
      >
        {label}
      </span>
      <span
        className="rounded-[3px] px-1 font-mono"
        style={{
          fontSize: 9.5,
          lineHeight: "14px",
          background: VS.badge,
          color: VS.dim,
        }}
      >
        {count}
      </span>
    </div>
  );
}

function CollapsibleCellGroup({
  cellCount,
  items,
  conversationId,
}: {
  cellCount: number;
  items: OutputItem[];
  conversationId: string;
}) {
  const [open, setOpen] = React.useState(true);
  const [hovered, setHovered] = React.useState(false);

  return (
    <div>
      {/* cell group header */}
      <div
        className="flex items-center gap-1 cursor-pointer select-none"
        style={{
          height: 22,
          paddingLeft: 10,
          background: hovered ? VS.hover : "transparent",
          color: VS.dim,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.1s",
            color: VS.dim,
            flexShrink: 0,
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span
          className="font-mono"
          style={{ fontSize: 11, color: VS.dim }}
        >
          Cell&nbsp;
        </span>
        <span
          className="font-mono rounded-[2px] px-0.5"
          style={{
            fontSize: 10,
            lineHeight: "14px",
            background: VS.cellBadge,
            color: VS.cellBadgeText,
          }}
        >
          [{cellCount}]
        </span>
        <span
          className="ml-1"
          style={{ fontSize: 10, color: VS.badge }}
        >
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* items */}
      {open &&
        items.map((item, idx) => (
          <div key={`${item.name}-${idx}`} style={{ paddingLeft: 10 }}>
            <IORow
              name={item.name}
              onDownload={() => {
                if (item.url) {
                  downloadDataUrl(item.url, item.name);
                } else if (item.path) {
                  downloadFromSandbox(conversationId, item.path, item.name);
                }
              }}
            />
          </div>
        ))}
    </div>
  );
}

function NotebookIOPanel({
  cells,
  conversationId,
}: {
  cells: Cell[];
  conversationId: string;
}) {
  const { inputs, outputs } = React.useMemo(
    () => parseNotebookIO(cells),
    [cells],
  );

  const hasContent = inputs.length > 0 || outputs.length > 0;

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: VS.bg, width: 210, minWidth: 210 }}
    >
      {/* panel title */}
      <div
        className="flex items-center px-3 shrink-0"
        style={{
          height: 30,
          borderBottom: `1px solid #1e1e1e`,
          letterSpacing: "0.1em",
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            textTransform: "uppercase",
            color: VS.header,
            letterSpacing: "0.1em",
          }}
        >
          Explorer
        </span>
      </div>

      {/* content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: `${VS.sep} transparent` }}
      >
        {!hasContent ? (
          <div
            className="px-3 py-4"
            style={{ color: VS.dim, fontSize: 11, lineHeight: 1.6 }}
          >
            <p className="italic">No file I/O detected yet.</p>
            <p className="mt-2" style={{ color: "#4b5563" }}>
              Files loaded or saved in cells will appear here automatically.
            </p>
          </div>
        ) : (
          <>
            {/* INPUTS */}
            {inputs.length > 0 && (
              <>
                <SectionHeader label="Inputs" count={inputs.length} />
                {inputs.map((f) => (
                  <IORow
                    key={f.path}
                    name={f.name}
                    cellBadges={f.cells}
                    onDownload={() =>
                      downloadFromSandbox(conversationId, f.path, f.name)
                    }
                  />
                ))}
              </>
            )}

            {/* separator */}
            {inputs.length > 0 && outputs.length > 0 && (
              <div
                className="mx-2 my-2"
                style={{ height: 1, background: VS.sep }}
              />
            )}

            {/* OUTPUTS */}
            {outputs.length > 0 && (
              <>
                <SectionHeader label="Outputs" count={outputs.reduce((s, g) => s + g.items.length, 0)} />
                {outputs.map((group) => (
                  <CollapsibleCellGroup
                    key={group.cellCount}
                    cellCount={group.cellCount}
                    items={group.items}
                    conversationId={conversationId}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── workspace files for empty state ──────────────────────

function useWorkspaceFiles(conversationId: string) {
  const [files, setFiles] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await ConversationService.getFiles(conversationId);
      setFiles(r ?? []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  React.useEffect(() => { refresh(); }, [refresh]);
  return { files, loading, refresh };
}

// ── runtime dot colors ────────────────────────────────────

const RUNTIME_DOT: Record<RuntimeState, string> = {
  idle: "#22c55e",
  starting: "#f59e0b",
  busy: "#f59e0b",
  restarting: "#f59e0b",
  dead: "#ef4444",
};

// ── empty notebook state ──────────────────────────────────

function EmptyNotebookState({
  runtimeState,
  kernelName,
  conversationId,
  onOpenNotebook,
  onNewNotebook,
}: {
  runtimeState: RuntimeState;
  kernelName: string;
  conversationId: string;
  onOpenNotebook: (path: string) => void;
  onNewNotebook: () => void;
}) {
  const { files, loading, refresh } = useWorkspaceFiles(conversationId);
  const notebooks = files.filter((f) => fileExt(f) === ".ipynb");
  const { t } = useTranslation();

  const stateLabel: Record<RuntimeState, string> = {
    idle: "kernel idle",
    starting: "initializing",
    busy: "kernel busy",
    restarting: "restarting",
    dead: "kernel dead",
  };

  const { send } = useWsClient();

  const handleAskAgent = () => {
    send(createChatMessage(
      "[NOTEBOOK] Create a new Jupyter notebook and open it in the panel.",
      [],
      [],
      new Date().toISOString(),
    ));
  };

  return (
    <div
      className="flex flex-col items-center justify-center w-full h-full gap-4"
      style={{ background: "var(--cg-bg-page)" }}
    >
      {/* Icon */}
      <svg
        className="w-14 h-14 opacity-20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        viewBox="0 0 24 24"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>

      {/* Title + subtitle */}
      <p className="text-lg font-medium text-[var(--cg-text-primary)]">No notebook open</p>
      <p className="text-sm text-center max-w-xs text-[var(--cg-text-muted)]">
        Ask the agent to create a notebook — it will appear here automatically.
      </p>

      {/* Action button */}
      <button
        type="button"
        onClick={handleAskAgent}
        className="mt-2 px-4 py-2 rounded-lg text-sm font-medium text-[#181818] bg-white hover:bg-[#e5e5e5] transition-colors cursor-pointer"
      >
        Ask agent to create notebook
      </button>


      {/* Saved notebooks (compact) */}
      {notebooks.length > 0 && (
        <div className="w-64 mt-2" style={{ borderTop: "1px solid var(--cg-border)", paddingTop: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cg-text-muted)" }}>
            Saved Notebooks
          </span>
          <div className="mt-1.5 flex flex-col gap-0.5">
            {notebooks.map((nb) => (
              <button
                key={nb}
                type="button"
                className="flex items-center gap-2 w-full px-1 py-1.5 rounded text-left transition-colors"
                style={{ color: "var(--cg-text-muted)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--cg-bg-hover)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                onClick={() => onOpenNotebook(nb)}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--cg-text-muted)" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span className="truncate" style={{ fontSize: 12 }}>{basename(nb)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── health bar ────────────────────────────────────────────

function HealthBar({
  runtimeState,
  kernelName,
  lastExecEndTime,
  execCounter,
  showFiles,
  onToggleFiles,
}: {
  runtimeState: RuntimeState;
  kernelName: string;
  lastExecEndTime: number | null;
  execCounter: number;
  showFiles: boolean;
  onToggleFiles: () => void;
}) {
  const [, tick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const stateLabel: Record<RuntimeState, string> = {
    idle: "kernel idle",
    starting: "initializing kernel",
    busy: "kernel busy",
    restarting: "restarting",
    dead: "kernel dead",
  };

  return (
    <div
      className="flex items-center gap-2 px-3 shrink-0"
      style={{
        height: 28,
        background: "var(--cg-input-bg)",
        borderBottom: "1px solid var(--cg-border)",
        fontSize: 11,
        color: "var(--cg-text-muted)",
      }}
    >
      {/* explorer toggle */}
      <button
        type="button"
        title={showFiles ? "Hide explorer" : "Show explorer"}
        onClick={onToggleFiles}
        style={{
          opacity: showFiles ? 1 : 0.45,
          color: showFiles ? "var(--cg-text-nav)" : "var(--cg-text-muted)",
          transition: "opacity 0.15s",
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <div
        className="self-stretch my-1"
        style={{ width: 1, background: "var(--cg-border)" }}
      />

      {/* runtime dot */}
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          backgroundColor: RUNTIME_DOT[runtimeState],
          boxShadow:
            runtimeState === "busy"
              ? `0 0 5px ${RUNTIME_DOT[runtimeState]}`
              : undefined,
        }}
      />
      <span style={{ color: "var(--cg-text-muted)" }}>{stateLabel[runtimeState]}</span>

      <span style={{ color: "var(--cg-border)" }}>•</span>
      <span>{kernelName}</span>

      {execCounter > 0 && (
        <>
          <span style={{ color: "var(--cg-border)" }}>•</span>
          <span className="font-mono">run [{execCounter}]</span>
          {lastExecEndTime && (
            <span style={{ color: "var(--cg-text-muted)" }}>
              {" "}{fmtRelative(new Date(lastExecEndTime))}
            </span>
          )}
        </>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────

interface JupyterEditorProps {
  maxWidth: number;
}

export function JupyterEditor({ maxWidth }: JupyterEditorProps) {
  const { curAgentState } = useAgentStore();
  const { send } = useWsClient();
  const { conversationId } = useConversationId();

  const {
    cells: rawCells,
    kernelName,
    executionHistory,
    executionCounter,
    isDirty,
    setNotebookTitle,
    newNotebook,
    markSaved,
  } = useJupyterStore();

  // Filter out internal CloudGuard publish cells (_safe_diagram / _safe_page / _safe_file)
  // and their immediately following output cells — they are infrastructure, not
  // user work.  We track state in a single pass so the filter never breaks if
  // the agent wraps multiple helpers in one cell.
  const INTERNAL_RE = /_safe_diagram\s*\(|_safe_page\s*\(|_safe_file\s*\(|latex_compile\.py/;
  const cells = React.useMemo(() => {
    let suppressOutput = false;
    return rawCells.filter((cell) => {
      if (cell.type === "input") {
        suppressOutput = INTERNAL_RE.test(cell.content);
        return !suppressOutput;
      }
      return !suppressOutput;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawCells]);

  const jupyterRef = React.useRef<HTMLDivElement>(null);
  const [showFiles, setShowFiles] = React.useState(false);

  const runtimeState = agentStateToRuntimeState(curAgentState);
  const isRuntimeInactive = RUNTIME_INACTIVE_STATES.includes(curAgentState);

  const { hitBottom, scrollDomToBottom, onChatBodyScroll } =
    useScrollToBottom(jupyterRef);

  // auto-save when execution settles
  const prevRuntime = React.useRef(runtimeState);
  React.useEffect(() => {
    if (prevRuntime.current === "busy" && runtimeState === "idle" && isDirty) {
      markSaved();
    }
    prevRuntime.current = runtimeState;
  }, [runtimeState, isDirty, markSaved]);

  const lastExec = executionHistory[executionHistory.length - 1] ?? null;

  const notifyAgent = React.useCallback(
    (msg: string) => {
      send(createChatMessage(msg, [], [], new Date().toISOString()));
    },
    [send],
  );

  const handleOpenNotebook = React.useCallback(
    (path: string) => {
      setNotebookTitle(basename(path));
      notifyAgent(`[NOTEBOOK] Opening notebook: ${path}. Please load and continue work in this notebook.`);
    },
    [setNotebookTitle, notifyAgent],
  );

  const handleNewNotebook = React.useCallback(() => {
    newNotebook();
    notifyAgent("[NOTEBOOK] Creating a new Jupyter notebook. Please start a fresh Python notebook session in /workspace.");
  }, [newNotebook, notifyAgent]);

  if (isRuntimeInactive) return <WaitingForRuntimeMessage />;

  return (
    <div
      className="flex-1 h-full flex flex-col"
      style={{ maxWidth, background: "var(--cg-bg-page)" }}
    >
      <HealthBar
        runtimeState={runtimeState}
        kernelName={kernelName}
        lastExecEndTime={lastExec?.endTime ?? null}
        execCounter={executionCounter}
        showFiles={showFiles}
        onToggleFiles={() => setShowFiles((v) => !v)}
      />

      <div className="flex-1 flex overflow-hidden">
        {showFiles && (
          <NotebookIOPanel cells={cells} conversationId={conversationId} />
        )}

        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ background: "var(--cg-bg-page)" }}
        >
          {cells.length === 0 ? (
            <EmptyNotebookState
              runtimeState={runtimeState}
              kernelName={kernelName}
              conversationId={conversationId}
              onOpenNotebook={handleOpenNotebook}
              onNewNotebook={handleNewNotebook}
            />
          ) : (
            <>
              <div
                data-testid="jupyter-container"
                className="flex-1 overflow-y-auto fast-smooth-scroll custom-scrollbar-always pt-3"
                style={{ background: "var(--cg-bg-page)" }}
                ref={jupyterRef}
                onScroll={(e) => onChatBodyScroll(e.currentTarget)}
              >
                {cells.map((cell) => (
                  <JupyterCell key={cell.id} cell={cell} />
                ))}
              </div>
              {!hitBottom && (
                <div className="sticky bottom-2 flex items-center justify-center">
                  <ScrollToBottomButton onClick={scrollDomToBottom} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

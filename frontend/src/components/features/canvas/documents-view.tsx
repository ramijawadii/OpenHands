/* eslint-disable i18next/no-literal-string */
import React from "react";
import {
  FileText,
  FileJson,
  FileSpreadsheet,
  ScrollText,
  FileCode,
  RefreshCw,
  Download,
  Inbox,
} from "lucide-react";
import { cn } from "#/utils/utils";
import ConversationService from "#/api/conversation-service/conversation-service.api";

/** Documents — the workspace's readable artifacts (reports, notes, data files).
 *
 *  Reads the REAL sandbox workspace via the conversation file API rather than
 *  showing sample data, so what you see is what the agent actually produced.
 */

type DocKind = "doc" | "data" | "code" | "log" | "other";

const KIND_OF: Record<string, DocKind> = {
  md: "doc",
  markdown: "doc",
  txt: "doc",
  pdf: "doc",
  rst: "doc",
  csv: "data",
  tsv: "data",
  xlsx: "data",
  xls: "data",
  json: "data",
  jsonl: "data",
  yaml: "data",
  yml: "data",
  py: "code",
  ipynb: "code",
  sh: "code",
  tf: "code",
  sql: "code",
  log: "log",
};

const KIND_META: Record<
  DocKind,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
  }
> = {
  doc: { label: "Documents", icon: FileText, tone: "text-sky-400" },
  data: { label: "Data", icon: FileSpreadsheet, tone: "text-emerald-400" },
  code: { label: "Code & Notebooks", icon: FileCode, tone: "text-amber-400" },
  log: { label: "Logs", icon: ScrollText, tone: "text-violet-400" },
  other: {
    label: "Other",
    icon: FileJson,
    tone: "text-[var(--cg-text-muted)]",
  },
};

function extOf(path: string): string {
  const base = path.split("/").pop() ?? path;
  const i = base.lastIndexOf(".");
  return i === -1 ? "" : base.slice(i + 1).toLowerCase();
}

function kindOf(path: string): DocKind {
  return KIND_OF[extOf(path)] ?? "other";
}

function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? path;
}

interface Props {
  conversationId: string;
}

export default function DocumentsView({ conversationId }: Props) {
  const [files, setFiles] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await ConversationService.getFiles(conversationId);
      setFiles(list ?? []);
    } catch {
      // Runtime not up yet, or the workspace isn't reachable — say so plainly
      // instead of rendering an empty list that looks like "no documents".
      setError("Workspace not reachable yet.");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const groups = React.useMemo(() => {
    const acc: Record<DocKind, string[]> = {
      doc: [],
      data: [],
      code: [],
      log: [],
      other: [],
    };
    files
      .filter((f) => !basename(f).startsWith("."))
      .forEach((f) => acc[kindOf(f)].push(f));
    return acc;
  }, [files]);

  const download = React.useCallback(
    async (path: string) => {
      try {
        const content = await ConversationService.getFile(conversationId, path);
        if (content == null) return;
        const url = URL.createObjectURL(
          new Blob([content], { type: "application/octet-stream" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = basename(path);
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        // Non-fatal — the file may have been removed since the listing.
      }
    },
    [conversationId],
  );

  const total = files.length;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--cg-border-subtle)] px-3 py-1.5">
        <span className="text-[11px] text-[var(--cg-text-muted)]">
          {loading
            ? "Loading…"
            : `${total} file${total === 1 ? "" : "s"} in /workspace`}
        </span>
        <button
          type="button"
          onClick={refresh}
          className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--cg-border-subtle)] px-2 py-0.5 text-[11px] text-[var(--cg-text-nav)] transition-colors hover:text-[var(--cg-text-primary)]"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      <div className="cg-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {error && (
          <p className="text-[11.5px] text-[var(--cg-text-muted)]">{error}</p>
        )}

        {!loading && !error && total === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Inbox className="h-8 w-8 opacity-30" />
            <p className="text-[12px] text-[var(--cg-text-muted)]">
              No documents yet — files the agent writes to /workspace appear
              here.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {(Object.keys(KIND_META) as DocKind[]).map((kind) => {
            const items = groups[kind];
            if (!items.length) return null;
            const { label, icon: Icon, tone } = KIND_META[kind];
            return (
              <div key={kind} className="flex flex-col gap-1.5">
                <span className="text-[10px] font-medium tracking-wider text-[var(--cg-text-nav)] uppercase">
                  {label}
                </span>
                {items.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => download(f)}
                    className="group flex cursor-pointer items-center gap-2 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-2.5 py-1.5 text-left transition-colors hover:border-[var(--cg-text-muted)]"
                  >
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", tone)} />
                    <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-[var(--cg-text-primary)]">
                      {f}
                    </span>
                    <Download className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

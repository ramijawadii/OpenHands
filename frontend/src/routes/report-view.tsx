/* eslint-disable i18next/no-literal-string */
import React from "react";
import {
  FileText,
  FileSpreadsheet,
  FileType2,
  Network,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Search as SearchIcon,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Inbox,
} from "lucide-react";
import { cn } from "#/utils/utils";
import { openHands } from "#/api/open-hands-axios";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import { useConversationId } from "#/hooks/use-conversation-id";
import { PDFViewer } from "#/components/features/office-viewer/PDFViewer";
import OnlyOfficeFile from "#/components/features/office-viewer/OnlyOfficeFile";
import { MarkdownRenderer } from "#/components/features/markdown/MarkdownRenderer";

/** Report — discovery of the conversation's existing artifacts (like the
 *  conversation history list): filter by type + date, then open each in the
 *  right viewer — pdf→PDF, doc/sheet→ONLYOFFICE, markdown→markdown (renders
 *  mermaid), architecture diagram→draw.io.
 */

const DrawioViewer = React.lazy(
  () => import("#/components/features/office-viewer/drawio-viewer"),
);

type Kind = "pdf" | "document" | "sheet" | "markdown" | "diagram";

interface Artifact {
  path: string;
  size: number;
  mtime: number; // epoch seconds
  kind: Kind;
}

const KIND_META: Record<
  Kind,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
  }
> = {
  document: { label: "Document", icon: FileText, tone: "text-sky-400" },
  sheet: { label: "Sheet", icon: FileSpreadsheet, tone: "text-emerald-400" },
  pdf: { label: "PDF", icon: FileType2, tone: "text-rose-400" },
  markdown: { label: "Markdown", icon: FileText, tone: "text-violet-400" },
  diagram: { label: "Diagram", icon: Network, tone: "text-amber-400" },
};

const FILTERS: { id: Kind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "document", label: "Documents" },
  { id: "sheet", label: "Sheets" },
  { id: "pdf", label: "PDFs" },
  { id: "markdown", label: "Markdown" },
  { id: "diagram", label: "Diagrams" },
];

function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? path;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtRelative(epochSeconds: number): string {
  const diff = Date.now() / 1000 - epochSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(epochSeconds * 1000).toLocaleDateString();
}

export default function ReportView() {
  const { conversationId } = useConversationId();
  const [artifacts, setArtifacts] = React.useState<Artifact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [filter, setFilter] = React.useState<Kind | "all">("all");
  const [query, setQuery] = React.useState("");
  const [newestFirst, setNewestFirst] = React.useState(true);
  const [selected, setSelected] = React.useState<Artifact | null>(null);

  const refresh = React.useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await openHands.get<{ artifacts: Artifact[] }>(
        "/api/cloudguard/artifacts",
        { params: { conversation_id: conversationId } },
      );
      setArtifacts(data.artifacts ?? []);
    } catch {
      setError("Workspace not reachable yet.");
      setArtifacts([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return artifacts
      .filter((a) => (filter === "all" ? true : a.kind === filter))
      .filter((a) => (q ? a.path.toLowerCase().includes(q) : true))
      .sort((a, b) => (newestFirst ? b.mtime - a.mtime : a.mtime - b.mtime));
  }, [artifacts, filter, query, newestFirst]);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: artifacts.length };
    artifacts.forEach((a) => {
      c[a.kind] = (c[a.kind] ?? 0) + 1;
    });
    return c;
  }, [artifacts]);

  // ── Viewer ──────────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--cg-bg-page)]">
        <div className="flex items-center gap-2 border-b border-[var(--cg-border-subtle)] px-3 py-1.5">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--cg-border-subtle)] px-2 py-0.5 text-[11px] text-[var(--cg-text-nav)] transition-colors hover:text-[var(--cg-text-primary)]"
          >
            <ArrowLeft className="h-3 w-3" />
            Reports
          </button>
          <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-[var(--cg-text-primary)]">
            {basename(selected.path)}
          </span>
          <span className="shrink-0 text-[10.5px] text-[var(--cg-text-muted)]">
            {KIND_META[selected.kind].label}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          {/* ArtifactViewer is a hoisted function declaration defined below. */}
          {/* eslint-disable-next-line @typescript-eslint/no-use-before-define */}
          <ArtifactViewer
            key={selected.path}
            artifact={selected}
            conversationId={conversationId!}
          />
        </div>
      </div>
    );
  }

  // ── Discovery list ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--cg-bg-page)]">
      {/* Filters row */}
      <div className="flex flex-col gap-2 border-b border-[var(--cg-border-subtle)] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cg-text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports…"
              className="w-full rounded-md border border-[var(--cg-border-subtle)] bg-transparent py-1 pl-7 pr-2 text-[12px] text-[var(--cg-text-primary)] placeholder:text-[var(--cg-text-muted)]"
            />
          </div>
          <button
            type="button"
            onClick={() => setNewestFirst((v) => !v)}
            title={newestFirst ? "Newest first" : "Oldest first"}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-[var(--cg-border-subtle)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] transition-colors hover:text-[var(--cg-text-primary)]"
          >
            {newestFirst ? (
              <ArrowDownWideNarrow className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpWideNarrow className="h-3.5 w-3.5" />
            )}
            Date
          </button>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh"
            className="inline-flex shrink-0 cursor-pointer items-center rounded-md border border-[var(--cg-border-subtle)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] transition-colors hover:text-[var(--cg-text-primary)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] transition-colors",
                filter === f.id
                  ? "bg-[var(--cg-bg-card)] text-[var(--cg-text-primary)]"
                  : "text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]",
              )}
            >
              {f.label}
              {counts[f.id] != null && (
                <span className="text-[10px] text-[var(--cg-text-muted)]">
                  {counts[f.id] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="cg-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-[var(--cg-text-muted)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-[12px]">Loading reports…</span>
          </div>
        )}
        {!loading && error && (
          <p className="px-1 text-[11.5px] text-[var(--cg-text-muted)]">
            {error}
          </p>
        )}
        {!loading && !error && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Inbox className="h-8 w-8 opacity-30" />
            <p className="text-[12px] text-[var(--cg-text-muted)]">
              No reports {filter === "all" ? "yet" : `of type "${filter}"`}.
            </p>
            <p className="max-w-xs text-[11px] text-[var(--cg-text-muted)]">
              Documents, sheets, PDFs, markdown and diagrams the agent writes to
              the workspace appear here.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1">
          {visible.map((a) => {
            const { icon: Icon, tone, label } = KIND_META[a.kind];
            return (
              <button
                key={a.path}
                type="button"
                onClick={() => setSelected(a)}
                className="group flex items-center gap-3 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-3 py-2 text-left transition-colors hover:border-[var(--cg-text-muted)]"
              >
                <Icon className={cn("h-4 w-4 shrink-0", tone)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] text-[var(--cg-text-primary)]">
                    {basename(a.path)}
                  </p>
                  <p className="truncate font-mono text-[10.5px] text-[var(--cg-text-muted)]">
                    {a.path}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="rounded bg-[var(--cg-bg-badge)] px-1.5 py-0.5 text-[10px] text-[var(--cg-text-nav)]">
                    {label}
                  </span>
                  <span className="text-[10px] text-[var(--cg-text-muted)]">
                    {fmtRelative(a.mtime)} · {fmtSize(a.size)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Per-kind viewer ─────────────────────────────────────────────────────────
function ArtifactViewer({
  artifact,
  conversationId,
}: {
  artifact: Artifact;
  conversationId: string;
}) {
  const [content, setContent] = React.useState<string | null>(null);
  const [buffer, setBuffer] = React.useState<ArrayBuffer | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const needsText = artifact.kind === "markdown";
  const needsBinary = artifact.kind === "pdf";

  React.useEffect(() => {
    let cancelled = false;
    setContent(null);
    setBuffer(null);
    setErr(null);
    if (needsText) {
      ConversationService.getFile(conversationId, artifact.path)
        .then((c) => !cancelled && setContent(c ?? ""))
        .catch(() => !cancelled && setErr("Could not load the file."));
    } else if (needsBinary) {
      ConversationService.getFileBinary(conversationId, artifact.path)
        .then((b) => !cancelled && setBuffer(b))
        .catch(() => !cancelled && setErr("Could not load the file."));
    }
    return () => {
      cancelled = true;
    };
  }, [artifact.path, artifact.kind, conversationId, needsText, needsBinary]);

  if (err) {
    return (
      <div className="flex h-full w-full items-center justify-center px-4 text-center text-[12px] text-[var(--cg-text-muted)]">
        {err}
      </div>
    );
  }

  if (artifact.kind === "document" || artifact.kind === "sheet") {
    return (
      <OnlyOfficeFile
        filePath={artifact.path}
        fileName={basename(artifact.path)}
        mode="edit"
      />
    );
  }

  if (artifact.kind === "diagram") {
    return (
      <React.Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--cg-text-muted)]">
            Loading diagram…
          </div>
        }
      >
        <DrawioViewer
          conversationId={conversationId}
          filePath={artifact.path}
        />
      </React.Suspense>
    );
  }

  if (artifact.kind === "pdf") {
    if (!buffer) {
      return (
        <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--cg-text-muted)]">
          Loading PDF…
        </div>
      );
    }
    return (
      <PDFViewer arrayBuffer={buffer} filename={basename(artifact.path)} />
    );
  }

  // markdown
  if (content == null) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--cg-text-muted)]">
        Loading…
      </div>
    );
  }
  return (
    <div className="cg-scroll h-full w-full overflow-y-auto px-4 py-3">
      <MarkdownRenderer content={content} />
    </div>
  );
}

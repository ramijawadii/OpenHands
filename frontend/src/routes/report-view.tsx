/* eslint-disable i18next/no-literal-string */
import React from "react";
import {
  Loader2,
  RefreshCw,
  ArrowLeft,
  Search,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  X,
  Share2,
} from "lucide-react";
import {
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileCsv,
  FaFileAlt,
} from "react-icons/fa";
import { SiMarkdown } from "react-icons/si";
import { cn } from "#/utils/utils";
import { openHands } from "#/api/open-hands-axios";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import { useConversationId } from "#/hooks/use-conversation-id";
import { PDFViewer } from "#/components/features/office-viewer/PDFViewer";
import OnlyOfficeFile from "#/components/features/office-viewer/OnlyOfficeFile";
import { MarkdownRenderer } from "#/components/features/markdown/MarkdownRenderer";

/** Report — discovery of the conversation's existing artifacts.
 *
 *  Deliberately mirrors the conversation-history UI (same toolbar, same
 *  Section headers with counts, same card rows) so the two feel identical —
 *  only the rows carry real file-type icons instead of a status dot.
 *
 *  Opens each artifact in the right viewer: pdf→PDF, doc/sheet→ONLYOFFICE,
 *  markdown→markdown (renders mermaid), architecture diagram→draw.io.
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

// Real file-type icons (react-icons) in their conventional brand colours, so a
// row reads as the actual file at a glance — the analog of the history list's
// status dot.
const KIND_META: Record<
  Kind,
  {
    label: string;
    icon: React.ComponentType<{
      className?: string;
      style?: React.CSSProperties;
    }>;
    color: string;
  }
> = {
  document: { label: "Documents", icon: FaFileWord, color: "#2B7CD3" },
  sheet: { label: "Sheets", icon: FaFileExcel, color: "#1D6F42" },
  pdf: { label: "PDFs", icon: FaFilePdf, color: "#E2574C" },
  markdown: { label: "Markdown", icon: SiMarkdown, color: "#9CA3AF" },
  // Neutral diagram glyph (no vendor brand mark). See docs/rebranding/.
  diagram: { label: "Diagrams", icon: Share2, color: "#F59E0B" },
};

// Section order = the order the groups appear in the list.
const KIND_ORDER: Kind[] = ["document", "sheet", "pdf", "markdown", "diagram"];

function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? path;
}

/** csv gets the csv glyph, plain text/rtf the generic doc glyph — a small
 *  fidelity win over using the group icon for every row. */
function iconFor(a: { path: string; kind: Kind }) {
  const ext = basename(a.path).split(".").pop()?.toLowerCase();
  if (ext === "csv") return { Icon: FaFileCsv, color: "#1D6F42" };
  if (ext === "txt" || ext === "rtf")
    return { Icon: FaFileAlt, color: "#9CA3AF" };
  const meta = KIND_META[a.kind];
  return { Icon: meta.icon, color: meta.color };
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
      .filter((a) => (q ? a.path.toLowerCase().includes(q) : true))
      .sort((a, b) => (newestFirst ? b.mtime - a.mtime : a.mtime - b.mtime));
  }, [artifacts, query, newestFirst]);

  // Grouped by kind — the type sections play the role Active/History plays in
  // the conversation list.
  const groups = React.useMemo(() => {
    const acc = {} as Record<Kind, Artifact[]>;
    KIND_ORDER.forEach((k) => {
      acc[k] = [];
    });
    visible.forEach((a) => acc[a.kind]?.push(a));
    return acc;
  }, [visible]);

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

  // ── Discovery list — same shell/toolbar/sections as conversation-history ────
  return (
    <div className="cg-conv-compact flex h-full w-full flex-col">
      {/* toolbar — mirrors conversation-history's */}
      <div className="flex items-center gap-2 border-b border-[var(--cg-border-subtle)] px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cg-text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports…"
            className="w-full rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] py-1.5 pr-7 pl-7 text-[11.5px] text-[var(--cg-text-primary)] outline-none placeholder:text-[var(--cg-text-muted)] focus:border-[var(--cg-text-muted)]"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          title={newestFirst ? "Newest first" : "Oldest first"}
          aria-label="Sort by date"
          onClick={() => setNewestFirst((v) => !v)}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-2 py-1.5 text-[11.5px] text-[var(--cg-text-nav)] transition-colors hover:border-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)]"
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
          title="Refresh"
          aria-label="Refresh"
          onClick={refresh}
          className="inline-flex shrink-0 cursor-pointer items-center rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-2 py-1.5 text-[11.5px] text-[var(--cg-text-nav)] transition-colors hover:border-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)]"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* list */}
      <div className="cg-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loading && artifacts.length === 0 && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--cg-text-muted)]" />
          </div>
        )}

        {error && (
          <p className="px-1 py-6 text-center text-[11.5px] text-[var(--cg-danger)]">
            Could not load reports.
          </p>
        )}

        {!loading && !error && visible.length === 0 && (
          <p className="px-1 py-6 text-center text-[11.5px] text-[var(--cg-text-muted)]">
            {query ? "No reports match." : "No reports yet."}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {KIND_ORDER.map((kind) => (
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            <Section
              key={kind}
              title={KIND_META[kind].label}
              count={groups[kind]?.length ?? 0}
            >
              {groups[kind]?.map((a) => {
                const { Icon, color } = iconFor(a);
                return (
                  <div
                    key={a.path}
                    onClick={() => setSelected(a)}
                    className={cn(
                      "group relative w-full cursor-pointer rounded-lg px-3 py-2",
                      "transition-colors duration-300",
                      "bg-transparent hover:bg-[var(--cg-bg-hover)]",
                    )}
                    style={{
                      transitionTimingFunction:
                        "cubic-bezier(0.165, 0.85, 0.45, 1)",
                    }}
                  >
                    {/* Title row — real file icon replaces the status dot */}
                    <div className="flex min-h-[20px] w-full items-center justify-between">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                        <Icon
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color }}
                        />
                        <span className="truncate text-[13px] text-[var(--cg-text-primary)]">
                          {basename(a.path)}
                        </span>
                      </div>
                    </div>
                    {/* Footer row — path left, relative time right */}
                    <div className="mt-1 flex flex-row items-center justify-between">
                      <span className="truncate text-xs text-[var(--cg-text-muted)]">
                        {a.path.includes("/")
                          ? a.path.slice(0, a.path.lastIndexOf("/"))
                          : "workspace"}
                      </span>
                      <p className="flex-1 text-right text-xs text-[#A3A3A3]">
                        <time>{fmtRelative(a.mtime)}</time>
                      </p>
                    </div>
                  </div>
                );
              })}
            </Section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Same section header as conversation-history (title + count pill). */
function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-medium tracking-wider text-[var(--cg-text-nav)] uppercase">
          {title}
        </span>
        <span className="rounded bg-white/5 px-1.5 py-px text-[10px] tabular-nums text-[var(--cg-text-muted)]">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
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

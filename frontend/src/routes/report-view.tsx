/* eslint-disable i18next/no-literal-string */
import React from "react";
import {
  Loader2,
  RefreshCw,
  ArrowLeft,
  History,
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
import SurfaceHost from "#/components/features/surfaces/surface-host";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import { useConversationId } from "#/hooks/use-conversation-id";
import { PDFViewer } from "#/components/features/office-viewer/PDFViewer";
import OnlyOfficeFile from "#/components/features/office-viewer/OnlyOfficeFile";
import OnlyOfficeEditor from "#/components/features/office-viewer/OnlyOfficeEditor";
import { MarkdownRenderer } from "#/components/features/markdown/MarkdownRenderer";
import { mermaidCodeRenderer } from "#/components/features/markdown/mermaid-code-renderer";
import { MermaidCanvas } from "#/components/features/markdown/mermaid-canvas";
import { EventReport } from "#/components/features/explore/cloudguard-grid/EventReport";
import {
  clearEventReport,
  useEventReport,
} from "#/components/features/explore/cloudguard-grid/event-report";
import { ResourceReport } from "#/components/features/explore/cloudguard-grid/ResourceReport";
import {
  clearResourceReport,
  useResourceReport,
} from "#/components/features/explore/cloudguard-grid/resource-report";

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

type Kind = "pdf" | "document" | "sheet" | "markdown" | "diagram" | "mermaid";

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
  // Kept separate from "Diagrams" (.drawio): a .mmd is text the agent wrote,
  // opened as a graph canvas, not a draw.io document.
  mermaid: { label: "Flow diagrams", icon: Share2, color: "#F59E0B" },
};

// Section order = the order the groups appear in the list.
const KIND_ORDER: Kind[] = [
  "document",
  "sheet",
  "pdf",
  "mermaid",
  "markdown",
  "diagram",
];

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
  // Which working files also exist in the durable artifact library, keyed by the
  // SOURCE path so a row can answer "is this published, and at what version".
  const [published, setPublished] = React.useState<
    Record<string, { version: number }>
  >({});
  const [publishing, setPublishing] = React.useState<string | null>(null);
  /**
   * A file the analyst opened inside the framed store. The frame posts the path
   * up rather than navigating, so artifacts open in the CONSOLE's viewers — the
   * same markdown and mermaid renderers used everywhere else — instead of the
   * store's own previewer or, worse, a new browser tab that leaves the console
   * behind entirely.
   */
  const [libraryFile, setLibraryFile] = React.useState<string | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  /**
   * The durable store's browser-reachable UI. Seafile's own library view gives
   * per-file revision history, restore, trash recovery, share links and
   * previews — all real features of the store we would otherwise be
   * reimplementing badly. `available` is false when the store is unconfigured,
   * and then the view is hidden rather than framing a page that cannot load.
   */
  const [store, setStore] = React.useState<{
    available: boolean;
    library_url: string;
  } | null>(null);
  /** The console's current palette, handed to the framed store so it matches.
   *  Watched rather than read once: the frame is keyed on it, so toggling the
   *  console theme reloads the frame in the new palette instead of leaving it
   *  in the old one until the tab is reopened. */
  const [theme, setTheme] = React.useState<"light" | "dark">(() =>
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark",
  );
  React.useEffect(() => {
    const root = document.documentElement;
    // The console expresses its palette as data-theme="light" (index.css), NOT
    // a `light` class. Reading the class list was always false, so the frame was
    // permanently told "dark" and stayed dark while the rest of the app went
    // light — the setting appeared to do nothing rather than to fail.
    const sync = () =>
      setTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, []);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [query, setQuery] = React.useState("");
  const [newestFirst, setNewestFirst] = React.useState(true);
  const [selected, setSelected] = React.useState<Artifact | null>(null);

  /**
   * A report opened from the Overview's events table, not yet on disk. It
   * pre-empts the listing so the tab shows what the click asked for, and is
   * dropped on "back" — nothing was written, so nothing is left behind.
   */
  const pendingEvent = useEventReport();
  const pendingResource = useResourceReport();

  /*
   * An artifact may already be open in the viewer when a report is raised.
   * Dropping it here means "back" from the report lands on the listing rather
   * than on whatever file happened to be open before.
   */
  React.useEffect(() => {
    if (pendingEvent || pendingResource) setSelected(null);
  }, [pendingEvent, pendingResource]);

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

    // The durable library, listed separately and NEVER fatal. The artifact store
    // is optional: a deployment without Seafile configured answers 503, and this
    // tab must still show the working files rather than break because durable
    // storage is absent.
    const prefix = `conversations/${conversationId}/`;
    try {
      const { data } = await openHands.get<{
        entries: { path: string; version: number }[];
      }>("/api/cloudguard/vfs/list", {
        params: {
          conversation_id: conversationId,
          store: "artifacts",
          prefix,
          recursive: true,
        },
      });
      const map: Record<string, { version: number }> = {};
      (data.entries ?? []).forEach((e) => {
        if (e.path.startsWith(prefix)) {
          map[e.path.slice(prefix.length)] = { version: e.version };
        }
      });
      setPublished(map);
    } catch {
      setPublished({});
    }
  }, [conversationId]);

  const publish = React.useCallback(
    async (path: string) => {
      if (!conversationId) return;
      setPublishing(path);
      try {
        await openHands.post("/api/cloudguard/vfs/publish", {
          conversation_id: conversationId,
          path,
        });
        await refresh();
      } catch {
        setError("Could not publish — the artifact store is not reachable.");
      } finally {
        setPublishing(null);
      }
    },
    [conversationId, refresh],
  );

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Same-origin only: the frame is proxied onto our origin precisely so it
      // is first-party, and a message from anywhere else has no business
      // driving what this tab opens.
      if (e.origin !== window.location.origin) return;
      const data = e.data as {
        type?: string;
        path?: string;
        view?: string;
      } | null;
      if (data && data.type === "id:open-artifact" && data.path) {
        setLibraryFile(data.path);
        // The store can ask for the document AND its history in one go — that is
        // what the row's history action and the intercepted revisions route both
        // want, and opening the file first and then hunting for the toggle is a
        // second step for something already asked for.
        if (data.view === "history") setShowHistory(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    openHands
      .get<{ available: boolean; library_url: string }>(
        "/api/cloudguard/vfs/artifact-store",
      )
      .then(({ data }) => {
        if (!cancelled) setStore(data);
      })
      .catch(() => {
        if (!cancelled) setStore({ available: false, library_url: "" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (pendingResource) {
    return (
      <ResourceReport
        resource={pendingResource}
        onBack={clearResourceReport}
        onSaved={refresh}
      />
    );
  }

  if (pendingEvent) {
    return (
      <EventReport
        event={pendingEvent}
        onBack={clearEventReport}
        // Saving writes a markdown artifact; refresh so it appears in the
        // listing the moment the user goes back to it.
        onSaved={refresh}
      />
    );
  }

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

  // ── Library view — Seafile's own UI, framed ─────────────────────────────────
  // Not a reimplementation: revision history, restore, trash recovery, share
  // links and previews already exist in the store, and rebuilding them against
  // its API would be strictly worse than showing the real thing.
  // A file opened from the library. Rendered by the console, with a way back —
  // the frame has no history of its own that the parent can drive, so "back"
  // has to be ours.
  if (libraryFile && store?.available) {
    return (
      <div className="cg-conv-compact flex h-full w-full flex-col bg-[var(--cg-bg-page)]">
        <div className="flex items-center gap-2 border-b border-[var(--cg-border-subtle)] px-3 py-1.5">
          <button
            type="button"
            onClick={() => setLibraryFile(null)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--cg-border-subtle)] px-2 py-0.5 text-[11px] text-[var(--cg-text-nav)] transition-colors hover:text-[var(--cg-text-primary)]"
          >
            <ArrowLeft className="h-3 w-3" />
            Library
          </button>
          <span className="truncate text-[11.5px] text-[var(--cg-text-primary)]">
            {basename(libraryFile)}
          </span>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            aria-pressed={showHistory}
            className={cn(
              "ml-auto inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors",
              showHistory
                ? "border-[var(--cg-border-subtle)] bg-[var(--cg-bg-active)] text-[var(--cg-text-primary)]"
                : "border-[var(--cg-border-subtle)] text-[var(--cg-text-nav)] hover:text-[var(--cg-text-primary)]",
            )}
          >
            <History className="h-3 w-3" />
            History
          </button>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1">
            {/* eslint-disable-next-line @typescript-eslint/no-use-before-define */}
            <StoreFileViewer path={libraryFile} />
          </div>
          {showHistory && (
            /* eslint-disable-next-line @typescript-eslint/no-use-before-define */
            <VersionHistory
              path={libraryFile}
              onReverted={() => setLibraryFile(libraryFile)}
            />
          )}
        </div>
      </div>
    );
  }

  if (store?.available) {
    return (
      <div className="cg-conv-compact flex h-full min-h-0 w-full flex-col">
        {/* Same isolation contract as Notebook / ONLYOFFICE / draw.io. The store
            is a heavy surface rendering from its own backend in a separate OS
            process, so it gets the same treatment: mount only once the backend
            is confirmed healthy, degrade to an overlay rather than tearing the
            frame down on a blip, and offer a hard Reopen when it wedges.
            Sharing the wrapper also means the memory a wedged surface holds is
            reclaimed the same way it is for the others, instead of this tab
            being the one that leaks. */}
        {/* `flex-1 min-h-0` is load-bearing, not decoration. SurfaceHost's root
            is `h-full`, and height:100% only resolves against a parent with a
            DEFINITE height. As a plain flex item in a column its height comes
            from its content instead — `align-items: stretch` sizes the CROSS
            axis, not the main one — so the frame collapsed to the height of
            whatever Seafile had rendered so far and left the rest of the tab
            empty. min-h-0 then stops the usual flex floor from reintroducing
            overflow. */}
        <div className="min-h-0 flex-1">
          {/* eslint-disable-next-line @typescript-eslint/no-use-before-define */}
          <SurfaceHost
            surfaceId="artifacts"
            conversationId={conversationId ?? ""}
            title="Artifact library"
          >
            {(reopenNonce) => (
              <iframe
                // Keyed on the reopen nonce as well, so Reopen gets a genuinely fresh
                // surface rather than the same wedged document.
                key={`${store.library_url}${theme}${reopenNonce}`}
                // The theme rides on the URL because a framed document cannot read
                // the parent's CSS variables across the document boundary — the proxy
                // reads it and injects the matching palette, so the frame paints in
                // the console's colours instead of flashing the store's own.
                // The store is ALWAYS light, whatever the console is set to.
                //
                // It is a document surface — files, previews, page content — and
                // documents are authored and read on white. The chat and the rest of
                // the console stay on the user's theme; this one pane is deliberately
                // fixed, the same way a PDF or a Word document does not invert
                // because the shell around it is dark.
                src={`${store.library_url}?cg_theme=light`}
                title="Artifact library"
                // h-full, NOT flex-1. SurfaceHost's root is `relative h-full` — a
                // BLOCK, not a flex container — so `flex-1` on this iframe is inert
                // and it falls back to the HTML default of 150px. Measured in a
                // harness: flex-1 inside a block parent renders 150px where
                // height:100% renders the full 300. That is why the store appeared as
                // a short strip with empty space beneath it.
                className="h-full w-full border-0"
                // No sandbox attribute, deliberately. The store is proxied onto OUR
                // origin so its SameSite=Lax session cookie is first-party — which is
                // the only way the frame works at all. Given that, `allow-scripts`
                // plus `allow-same-origin` is the combination the browser warns
                // "can escape its sandboxing": it would grant the frame our origin
                // while looking like a restriction. An honest absence beats a
                // sandbox that protects nothing.
                referrerPolicy="no-referrer"
              />
            )}
          </SurfaceHost>
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
                    <div className="flex min-h-[20px] w-full items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                        <Icon
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color }}
                        />
                        <span className="truncate text-[13px] text-[var(--cg-text-primary)]">
                          {basename(a.path)}
                        </span>
                      </div>
                      {/* Durability, stated rather than implied. A working file
                          lives in the sandbox container and goes away with the
                          conversation; a published one is in the artifact
                          library and outlives it. The badge is always visible
                          because it is a fact about the file, while the action
                          appears on hover so the list stays quiet. */}
                      {published[a.path] ? (
                        <span
                          title={`Published to the artifact library (version ${published[a.path].version})`}
                          className="shrink-0 rounded-md border border-[var(--cg-border-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--cg-text-nav)]"
                        >
                          Published v{published[a.path].version}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={publishing === a.path}
                          title="Publish to the durable artifact library"
                          onClick={(e) => {
                            // The row itself opens the viewer.
                            e.stopPropagation();
                            publish(a.path);
                          }}
                          className={cn(
                            "shrink-0 cursor-pointer rounded-md border border-[var(--cg-border-subtle)] px-1.5 py-0.5 text-[10px]",
                            "text-[var(--cg-text-nav)] transition-opacity hover:text-[var(--cg-text-primary)]",
                            publishing === a.path
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100",
                          )}
                        >
                          {publishing === a.path ? "Publishing…" : "Publish"}
                        </button>
                      )}
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

/** Working files vs the durable library. Two genuinely different things — one is
 *  the sandbox that dies with the conversation, the other is the store that does
 *  not — so this is a view switch, not a filter. */
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

  const needsText = artifact.kind === "markdown" || artifact.kind === "mermaid";
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
  // A .mmd is the diagram itself, so render it directly rather than wrapping it
  // in markdown just to have a fence to intercept. Every mermaid grammar is
  // supported because this is mermaid proper, not a partial reimplementation.
  if (artifact.kind === "mermaid") {
    // No scroll wrapper and no padding beyond the canvas's own: the diagram
    // fills the pane rather than sitting in a card inside it.
    return <MermaidCanvas code={content} />;
  }

  // Mermaid must be intercepted explicitly: MarkdownRenderer only draws
  // diagrams when handed a codeRenderer, and this view was calling it bare —
  // so a report full of ```mermaid chapters rendered as walls of source text.
  return (
    <div className="cg-scroll h-full w-full overflow-y-auto px-4 py-3">
      <MarkdownRenderer content={content} codeRenderer={mermaidCodeRenderer} />
    </div>
  );
}

/** A file read from the DURABLE store and rendered by the console.
 *
 *  Deliberately separate from ArtifactViewer: that one reads the conversation's
 *  sandbox through ConversationService, and these files live in the artifact
 *  library, which outlives the sandbox. Same renderers, different source.
 *
 *  Documents and spreadsheets are NOT handled here yet and say so plainly rather
 *  than rendering something broken: ONLYOFFICE is handed a signed URL scoped to
 *  a conversation's sandbox, and a store-backed equivalent has to exist on the
 *  backend before the editor can open a library file.
 */
// Kept beside the viewer rather than imported from the editor: this is the list
// of formats the FILES surface routes into ONLYOFFICE, which is a product
// decision, not the editor's full capability list.
const OFFICE_EXTS = new Set([
  "docx",
  "doc",
  "odt",
  "rtf",
  "xlsx",
  "xls",
  "ods",
  "csv",
  "pptx",
  "ppt",
  "odp",
  "pdf",
]);

interface StoreVersion {
  id: string;
  path: string;
  created_at: string;
  size: number;
  author: string;
  is_current: boolean;
}

function formatWhen(value: string): string {
  // Seafile reports ctime as epoch SECONDS in some responses and an ISO string
  // in others. Guessing wrong shows 1970 or an invalid date, so both are handled
  // rather than assuming the shape of whichever server we happened to test on.
  if (!value) return "";
  const asNumber = Number(value);
  const d =
    Number.isFinite(asNumber) && value.trim() !== ""
      ? new Date(asNumber > 1e12 ? asNumber : asNumber * 1000)
      : new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

/** Revisions of the open document, newest first, each restorable.
 *
 * Restoring writes a NEW revision rather than erasing the ones after it, so the
 * history stays append-only and a restore is itself auditable. That is what
 * makes this safe to put in front of an analyst instead of an administrator.
 */
function VersionHistory({
  path,
  onReverted,
}: {
  path: string;
  onReverted: () => void;
}) {
  const { conversationId } = useConversationId();
  const [versions, setVersions] = React.useState<StoreVersion[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    if (!conversationId) return undefined;
    let cancelled = false;
    setVersions(null);
    setErr(null);
    openHands
      .get<{ versions: StoreVersion[] }>("/api/cloudguard/vfs/versions", {
        params: { conversation_id: conversationId, path, store: "artifacts" },
      })
      .then(({ data }) => !cancelled && setVersions(data.versions ?? []))
      .catch(() => !cancelled && setErr("Could not load this file's history."));
    return () => {
      cancelled = true;
    };
  }, [path, conversationId, nonce]);

  const revert = async (versionId: string) => {
    if (!conversationId) return;
    setBusy(versionId);
    setErr(null);
    try {
      await openHands.post("/api/cloudguard/vfs/revert-file", {
        conversation_id: conversationId,
        path,
        version_id: versionId,
        store: "artifacts",
      });
      setNonce((n) => n + 1);
      onReverted();
    } catch {
      setErr("Restore failed. The file is unchanged.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <aside className="cg-scroll flex w-[248px] shrink-0 flex-col overflow-auto border-l border-[var(--cg-border-subtle)] bg-[var(--cg-bg-page)]">
      <div className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.4px] text-[var(--cg-text-muted)]">
        Version history
      </div>
      {err && (
        <div className="px-3 pb-2 text-[11px] text-[var(--cg-text-muted)]">
          {err}
        </div>
      )}
      {versions === null && !err && (
        <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--cg-text-muted)]">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading…
        </div>
      )}
      {versions?.length === 0 && (
        <div className="px-3 py-2 text-[11px] text-[var(--cg-text-muted)]">
          No earlier versions of this file.
        </div>
      )}
      {versions?.map((v) => (
        <div
          key={v.id}
          className="border-b border-[var(--cg-border-subtle)] px-3 py-2 last:border-b-0"
        >
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11.5px] text-[var(--cg-text-primary)]">
              {formatWhen(v.created_at) || v.id.slice(0, 8)}
            </span>
            {v.is_current && (
              <span className="text-[10px] text-[var(--cg-text-muted)]">
                current
              </span>
            )}
          </div>
          {v.author && (
            <div className="text-[10.5px] text-[var(--cg-text-muted)]">
              {v.author}
            </div>
          )}
          {!v.is_current && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => revert(v.id)}
              className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--cg-border-subtle)] px-2 py-0.5 text-[10.5px] text-[var(--cg-text-nav)] transition-colors hover:text-[var(--cg-text-primary)] disabled:cursor-default disabled:opacity-50"
            >
              {busy === v.id && <Loader2 className="h-3 w-3 animate-spin" />}
              Restore
            </button>
          )}
        </div>
      ))}
    </aside>
  );
}

function StoreFileViewer({ path }: { path: string }) {
  const [text, setText] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const { conversationId } = useConversationId();

  const ext = path.includes(".") ? path.split(".").pop()!.toLowerCase() : "";
  const isMermaid = ext === "mmd" || ext === "mermaid";
  const isMarkdown = ext === "md" || ext === "markdown";
  const readable = isMermaid || isMarkdown || ext === "txt" || ext === "json";
  // A document opens in the editor that owns its format, in place, rather than
  // in a preview that cannot edit it. These are the formats ONLYOFFICE handles;
  // the store is the LIBRARY, so a save here becomes a library version.
  const isOffice = OFFICE_EXTS.has(ext);

  React.useEffect(() => {
    if (!readable || !conversationId) return undefined;
    let cancelled = false;
    setText(null);
    setErr(null);
    openHands
      .get<string>("/api/cloudguard/vfs/read", {
        params: { conversation_id: conversationId, store: "artifacts", path },
        // The endpoint returns raw bytes; asking axios to parse JSON would
        // mangle a markdown document that happens to start with a brace.
        transformResponse: [(d: string) => d],
      })
      .then(({ data }) => !cancelled && setText(String(data ?? "")))
      .catch(
        () =>
          !cancelled && setErr("Could not read this file from the library."),
      );
    return () => {
      cancelled = true;
    };
  }, [path, readable, conversationId]);

  if (isOffice) {
    if (!conversationId) {
      return (
        <div className="flex h-full w-full items-center justify-center px-4 text-center text-[11px] text-[var(--cg-text-muted)]">
          Open a conversation to edit library documents.
        </div>
      );
    }
    return (
      <OnlyOfficeEditor
        conversationId={conversationId}
        filePath={path}
        store="artifacts"
        fileName={basename(path)}
        fileType={ext}
        mode={ext === "pdf" ? "view" : "edit"}
      />
    );
  }

  if (!readable) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-6 text-center">
        <span className="text-[12px] text-[var(--cg-text-primary)]">
          {basename(path)}
        </span>
        <span className="text-[11px] text-[var(--cg-text-muted)]">
          There is no viewer for {ext ? `.${ext}` : "this format"} in the
          console.
        </span>
      </div>
    );
  }

  if (err) {
    return (
      <div className="flex h-full w-full items-center justify-center px-4 text-center text-[12px] text-[var(--cg-text-muted)]">
        {err}
      </div>
    );
  }

  if (text === null) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--cg-text-muted)]">
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (isMermaid) return <MermaidCanvas code={text} />;

  return (
    <div className="cg-scroll min-h-0 flex-1 overflow-auto p-4">
      <MarkdownRenderer content={text} codeRenderer={mermaidCodeRenderer} />
    </div>
  );
}

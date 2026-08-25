/* eslint-disable i18next/no-literal-string -- canvas surface */
import React from "react";
import {
  FilePlus2,
  Download,
  Share2,
  Loader2,
  AlertTriangle,
  FileText,
  ChevronDown,
} from "lucide-react";
import {
  filesApi,
  VfsError,
  baseName,
  type VfsEntry,
} from "#/components/features/files/files-api";
import { TextView } from "#/components/features/files/files-textview";
import {
  PromptDialog,
  VersionHistoryDialog,
} from "#/components/features/files/files-dialogs";
import { ShareDialog } from "#/components/features/files/files-share";
import { PagePicker, rememberPage, readRecentPages } from "./page-picker";

/**
 * Markdown in Canvas — a working surface, not a browser.
 *
 * The Files tab answers "what is in the library"; this answers "let me write".
 * It opens with a picker over the markdown already there, creates new pages, and
 * hands off to the SAME editor and the SAME VFS write path the Files tab uses —
 * so a document written here is versioned, audited and shareable exactly like
 * one written anywhere else. A second editor with its own storage would be a
 * second source of truth.
 *
 * It sits BEFORE Documents in the tab order because markdown is what the agent
 * produces most; the ONLYOFFICE document surface is the heavier, rarer case.
 */

const ROOT = "pages";
/** The page Canvas falls back to when the surface has nothing open.
 *
 *  A STABLE name, deliberately: revisiting the tab reuses this one file rather
 *  than accumulating untitled-1, untitled-2… every time someone glances at the
 *  Canvas. */
const DEFAULT_PAGE = `${ROOT}/untitled.md`;

export default function MarkdownView({
  conversationId,
  store = "artifacts",
}: {
  conversationId: string;
  store?: string;
}) {
  const [pages, setPages] = React.useState<VfsEntry[]>([]);
  const [open, setOpen] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState(false);

  // Recorded HERE rather than only in the picker: a page can be opened by
  // creating it, or by a link, and those count as "recently opened" too.
  React.useEffect(() => {
    if (open) rememberPage(open);
  }, [open]);
  const [state, setState] = React.useState<{ loading: boolean; error: string }>(
    {
      loading: true,
      error: "",
    },
  );
  const [creating, setCreating] = React.useState(false);
  const [sharing, setSharing] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  const load = React.useCallback(() => {
    setState({ loading: true, error: "" });
    filesApi
      .listDir(ROOT, conversationId, store)
      .then((d) => {
        const md = d.entries.filter(
          (e) => e.kind === "file" && /\.(md|markdown)$/i.test(e.path),
        );
        setPages(md);
        setState({ loading: false, error: "" });
        // Canvas is an AUTHORING surface, so it must land in an editor rather
        // than on a picker. Newest first, because the page you were last working
        // on is the one you almost certainly want back.
        setOpen((current) => {
          if (current) return current;
          if (md.length) {
            return [...md].sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0))[0]
              .path;
          }
          return null;
        });
      })
      .catch((e: VfsError) => {
        // A missing folder is an EMPTY surface, not a failure — the first page
        // creates it.
        if (e.isMissing) {
          setPages([]);
          setState({ loading: false, error: "" });
          return;
        }
        setState({ loading: false, error: e.message });
      });
  }, [conversationId, store]);

  React.useEffect(load, [load]);

  /**
   * With no pages at all, create the untitled one and open it.
   *
   * Guarded by a ref so a re-render cannot fire a second write, and only after
   * the listing has actually come back — creating on a failed load would write
   * a file every time the store was briefly unreachable.
   */
  /**
   * PRESELECT a page as soon as the listing arrives.
   *
   * The surface used to open on "Select a page…" with nothing loaded, so the
   * first thing anyone saw was an empty pane and a control they had to operate
   * before the tab did anything. There is almost always an obvious answer —
   * the page you had open last — so it opens that, and falls back to the most
   * recently modified when this browser has no history to go on.
   *
   * Once only, guarded by a ref: re-running would yank someone back to the
   * preselected page after they deliberately chose another.
   */
  const preselected = React.useRef(false);
  React.useEffect(() => {
    if (preselected.current || state.loading || state.error || open) return;
    if (!pages.length) return;
    preselected.current = true;
    const known = new Set(pages.map((p) => p.path));
    const recent = readRecentPages().find((r) => known.has(r.path));
    const newest = [...pages].sort(
      (a, b) => (b.mtime ?? 0) - (a.mtime ?? 0),
    )[0];
    setOpen(recent?.path ?? newest?.path ?? null);
  }, [state.loading, state.error, open, pages]);

  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (
      state.loading ||
      state.error ||
      open ||
      pages.length ||
      seeded.current
    ) {
      return;
    }
    seeded.current = true;
    fetch("/api/cloudguard/vfs/write", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        path: DEFAULT_PAGE,
        text: "# Untitled\n\n",
        mime: "text/markdown",
        store,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setOpen(DEFAULT_PAGE);
        load();
      })
      .catch(() => {
        // Not fatal: the surface still offers New. Re-armed so a later attempt
        // can succeed once the store is reachable.
        seeded.current = false;
      });
  }, [
    state.loading,
    state.error,
    open,
    pages.length,
    conversationId,
    store,
    load,
  ]);

  const create = (title: string) => {
    const slug =
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "untitled";
    const path = `${ROOT}/${slug}.md`;
    fetch("/api/cloudguard/vfs/write", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        path,
        text: `# ${title.trim()}\n\n`,
        mime: "text/markdown",
        store,
      }),
    })
      .then(async (r) => {
        if (!r.ok) {
          let detail = `HTTP ${r.status}`;
          try {
            detail = (await r.json())?.detail ?? detail;
          } catch {
            /* a non-JSON error body is still an error */
          }
          throw new Error(detail);
        }
        setCreating(false);
        load();
        setOpen(path);
      })
      .catch((e: Error) => {
        setCreating(false);
        setState((s) => ({ ...s, error: e.message }));
      });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--cg-bg-page)]">
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--cg-border)] px-3 py-2">
        {/* A PICKER, not a dropdown. A flat list of every page in store order
            stopped being a way to choose somewhere around the twentieth page;
            what people do is return to something recent or search for a
            remembered word, so the panel leads with both. */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={picking}
            className="flex w-[260px] items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-1 text-left text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
          >
            <span className="min-w-0 flex-1 truncate">
              {open ? baseName(open) : "Select a page…"}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </button>
          {picking && (
            <PagePicker
              pages={pages}
              current={open}
              conversationId={conversationId}
              store={store}
              onPick={(p) => setOpen(p)}
              onClose={() => setPicking(false)}
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
        >
          <FilePlus2 className="h-3 w-3" />
          New
        </button>

        {open && (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setHistory(open)}
              className="flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
            >
              <FileText className="h-3 w-3" />
              Versions
            </button>
            <button
              type="button"
              onClick={() => setSharing(open)}
              className="flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
            >
              <Share2 className="h-3 w-3" />
              Share
            </button>
            {/* A real link, not a scripted save: the browser streams the file and
                the download survives the tab being closed mid-transfer. */}
            <a
              href={filesApi.downloadUrl(open, conversationId, store)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
            >
              <Download className="h-3 w-3" />
              Export
            </a>
          </div>
        )}
      </div>

      {state.error && (
        <div className="flex items-center gap-2 border-b border-[var(--cg-border)] px-3 py-1.5 text-[11px] text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {state.error}
        </div>
      )}

      <div className="min-h-0 flex-1">
        {state.loading && (
          <div className="flex items-center gap-2 p-6 text-[12px] text-[var(--cg-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading pages…
          </div>
        )}

        {!state.loading && !open && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-[13px] text-[var(--cg-text-nav)]">
              {pages.length
                ? "Pick a page to edit."
                : "Creating your first page…"}
            </p>
            <p className="max-w-md text-[11px] leading-relaxed text-[var(--cg-text-muted)]">
              Pages live under <code>{ROOT}/</code> in the artifact library, so
              they are versioned, audited and shareable like every other
              artifact.
            </p>
          </div>
        )}

        {open && (
          // Editable by default HERE, unlike the Files viewer. Canvas is the
          // authoring surface — arriving in read-only would mean a click before
          // every edit.
          <TextView
            key={open}
            path={open}
            store={store}
            conversationId={conversationId}
            readOnly={false}
            reloadToken={reloadToken}
            onSaved={load}
          />
        )}
      </div>

      {creating && (
        <PromptDialog
          title="New page"
          label={`Created in ${ROOT}/`}
          confirmLabel="Create"
          onCancel={() => setCreating(false)}
          onSubmit={create}
        />
      )}
      {sharing && (
        <ShareDialog path={sharing} onClose={() => setSharing(null)} />
      )}
      {history && (
        <VersionHistoryDialog
          path={history}
          conversationId={conversationId}
          onClose={() => setHistory(null)}
          onRestored={() => {
            // Same trap as the Files viewer: the path does not change, so the
            // editor has no reason to re-read unless told.
            setReloadToken((n) => n + 1);
            load();
          }}
        />
      )}
    </div>
  );
}

/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { Search, Loader2, FileText, Clock, X } from "lucide-react";
import {
  filesApi,
  baseName,
  type VfsEntry,
} from "#/components/features/files/files-api";

/**
 * Choosing which page to open.
 *
 * REPLACES A DROPDOWN, and the reason is that a dropdown is the wrong shape for
 * this once there is more than a screenful of pages. It answered exactly one
 * question — "show me every page, in the order the store returned them" — and
 * scrolling a 200-item list to find last Tuesday's report is not choosing, it is
 * hunting.
 *
 * What people actually do is one of two things: go back to something they had
 * open recently, or search for a word they remember. So the panel leads with
 * recents grouped by when, and the search box matches BOTH the name and the
 * text inside the document, because "the report about the public bucket" is a
 * phrase from the body far more often than it is a filename.
 */

const RECENTS_KEY = "cg-page-recents";
const RECENTS_CAP = 40;

interface Recent {
  path: string;
  at: number;
}

function readRecents(): Recent[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Recent[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Storage can be unavailable. No recents is a worse panel, not a broken one.
    return [];
  }
}

/** The recents list, for callers that want to preselect. Exported rather than
 *  duplicated: two readers of the same key that disagree about its shape is a
 *  bug waiting for the first schema change. */
export function readRecentPages(): { path: string; at: number }[] {
  return readRecents();
}

/** Record an open. Called by the surface, not by this component — a page can be
 *  opened without the picker ever appearing. */
export function rememberPage(path: string): void {
  if (!path) return;
  try {
    const next = [
      { path, at: Date.now() },
      ...readRecents().filter((r) => r.path !== path),
    ].slice(0, RECENTS_CAP);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* see readRecents */
  }
}

/**
 * Which bucket a timestamp falls in.
 *
 * Calendar days, NOT rolling 24-hour windows. "Yesterday" has to mean the day
 * before today or the label is a lie — something opened at 23:00 last night is
 * yesterday at 09:00 this morning, even though it is ten hours ago.
 */
type Bucket = "Today" | "Yesterday" | "This week" | "Earlier";

function bucketOf(at: number): Bucket {
  const day = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const today = day(Date.now());
  const then = day(at);
  const DAY = 86_400_000;
  if (then === today) return "Today";
  if (then === today - DAY) return "Yesterday";
  if (then > today - 7 * DAY) return "This week";
  return "Earlier";
}

const BUCKET_ORDER: Bucket[] = ["Today", "Yesterday", "This week", "Earlier"];

interface Hit {
  path: string;
  match: "name" | "content";
  line: number;
  text: string;
}

/**
 * One result row.
 *
 * MODULE LEVEL, not defined inside `PagePicker`. A component declared during
 * render is a new type on every render, so React tears down and rebuilds every
 * row on each keystroke in the search box — which destroys focus and makes the
 * list flicker while typing. The same rule the editor toolbar had to learn.
 */
function PageRow({
  path,
  current,
  version,
  subtitle,
  onPick,
}: {
  path: string;
  current: string | null;
  version?: number;
  subtitle?: React.ReactNode;
  onPick: (path: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(path)}
      className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--cg-bg-hover)] ${
        path === current ? "bg-[var(--cg-bg-hover)]" : ""
      }`}
    >
      <span className="mt-0.5 shrink-0 text-[var(--cg-text-muted)]">
        <FileText className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] text-[var(--cg-text-nav)]">
          {baseName(path)}
          {version ? (
            <span className="ml-1.5 text-[10px] text-[var(--cg-text-muted)]">
              v{version}
            </span>
          ) : null}
        </span>
        {subtitle}
      </span>
    </button>
  );
}

export function PagePicker({
  pages,
  current,
  conversationId,
  store,
  onPick,
  onClose,
}: {
  /** Everything available, for the fallback list and for version hints. */
  pages: VfsEntry[];
  current: string | null;
  conversationId: string;
  store: string;
  onPick: (path: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<Hit[] | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [truncated, setTruncated] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape and on a click outside. Bound on the document because the
  // panel floats over a surface it does not own.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  /**
   * Search, debounced, and cancellable.
   *
   * The `cancelled` flag matters more than the debounce: typing "report" fires
   * several overlapping requests and they do not necessarily come back in
   * order, so without it a stale response for "rep" can land after the one for
   * "report" and replace correct results with older ones.
   */
  React.useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits(null);
      setSearching(false);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      filesApi
        .search(q, conversationId, store, { limit: 40 })
        .then((d) => {
          if (cancelled) return;
          setHits(d.hits);
          setTruncated(d.truncated);
          setSearching(false);
        })
        .catch(() => {
          if (cancelled) return;
          setHits([]);
          setSearching(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, conversationId, store]);

  const versionOf = React.useMemo(() => {
    const m = new Map<string, number>();
    pages.forEach((p) => m.set(p.path, p.version));
    return m;
  }, [pages]);

  /** Recents that still exist. A page deleted since it was opened must not be
   *  offered — the click would 404 and read as a broken picker. */
  const recents = React.useMemo(() => {
    const known = new Set(pages.map((p) => p.path));
    return readRecents().filter((r) => known.has(r.path));
  }, [pages]);

  const grouped = React.useMemo(() => {
    const out = new Map<Bucket, Recent[]>();
    recents.forEach((r) => {
      const b = bucketOf(r.at);
      out.set(b, [...(out.get(b) ?? []), r]);
    });
    return out;
  }, [recents]);

  const pick = (path: string) => {
    rememberPage(path);
    onPick(path);
    onClose();
  };

  return (
    <div
      ref={panelRef}
      // `cg-surface-scroll` so the inner list uses the themed scrollbar rather
      // than the OS one, which is what made this panel look like a foreign
      // widget dropped into the surface.
      className="cg-surface-scroll absolute left-0 top-full z-50 mt-1 flex max-h-[420px] w-[380px] flex-col overflow-hidden rounded-lg border border-[var(--cg-border)] bg-[var(--cg-bg-card,var(--cg-bg-page))] shadow-xl"
    >
      <div className="flex items-center gap-2 border-b border-[var(--cg-border)] px-2.5 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-[var(--cg-text-muted)]" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages, or words inside them…"
          aria-label="Search pages"
          className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--cg-text-nav)] outline-none placeholder:text-[var(--cg-text-muted)]"
        />
        {searching && (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--cg-text-muted)]" />
        )}
        {query && !searching && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="shrink-0 rounded p-0.5 text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)]"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {hits === null ? (
          <>
            {recents.length > 0 &&
              BUCKET_ORDER.filter((b) => grouped.get(b)?.length).map((b) => (
                <div key={b} className="mb-1">
                  <div className="flex items-center gap-1.5 px-2 pb-0.5 pt-1.5 text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                    <Clock className="h-2.5 w-2.5" />
                    {b}
                  </div>
                  {(grouped.get(b) ?? []).map((r) => (
                    <PageRow
                      key={r.path}
                      path={r.path}
                      current={current}
                      version={versionOf.get(r.path)}
                      onPick={pick}
                      subtitle={
                        <span className="block truncate text-[10px] text-[var(--cg-text-muted)]">
                          {new Date(r.at).toLocaleString()}
                        </span>
                      }
                    />
                  ))}
                </div>
              ))}
            {/* Everything else, so the picker is never a dead end for a page
                that has simply not been opened on this machine yet. */}
            <div className="mb-1">
              <div className="px-2 pb-0.5 pt-1.5 text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
                {recents.length > 0 ? "All pages" : "Pages"}
              </div>
              {pages.length === 0 ? (
                <p className="px-2 py-2 text-[11px] text-[var(--cg-text-muted)]">
                  No pages yet.
                </p>
              ) : (
                pages.map((p) => (
                  <PageRow
                    key={p.path}
                    path={p.path}
                    current={current}
                    version={p.version}
                    onPick={pick}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {hits.length === 0 && !searching && (
              <p className="px-2 py-3 text-[11px] text-[var(--cg-text-muted)]">
                Nothing matches “{query}” — in a page name or inside one.
              </p>
            )}
            {hits.map((h) => (
              <PageRow
                key={`${h.path}:${h.line}`}
                path={h.path}
                current={current}
                version={versionOf.get(h.path)}
                onPick={pick}
                subtitle={
                  h.match === "content" ? (
                    // The matching LINE, because "it is in this file somewhere"
                    // is not an answer — seeing the sentence is what tells you
                    // whether it is the file you meant.
                    <span className="block truncate text-[10px] text-[var(--cg-text-muted)]">
                      line {h.line}: {h.text}
                    </span>
                  ) : (
                    <span className="block truncate text-[10px] text-[var(--cg-text-muted)]">
                      {h.path}
                    </span>
                  )
                }
              />
            ))}
            {truncated && (
              // Said, not hidden. A capped result list that looks complete is
              // how someone concludes a document does not exist.
              <p className="px-2 py-1.5 text-[10px] text-[var(--cg-text-muted)]">
                Showing the first matches — narrow the search for more.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

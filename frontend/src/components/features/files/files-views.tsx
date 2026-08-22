/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { Loader2, FileText, Check } from "lucide-react";
import {
  filesApi,
  baseName,
  VfsError,
  type Checkpoint,
  type VfsEntry,
} from "./files-api";
import { formatSize, formatWhen } from "./files-dialogs";
import { FileArt } from "./files-icons";
import {
  DateRangeFilter,
  Pager,
  withinRange,
  PAGE_SIZE,
  type DateRange,
} from "./files-feed";

/**
 * The non-table views.
 *
 * Gallery and History only. Kanban and Map — the other two Seafile offers — are
 * driven by user-defined metadata columns (single-select for a Kanban lane, a
 * location property for a map), and no VFS route WRITES metadata. A Kanban with
 * one permanent column, or a map with nothing on it, would be a worse answer
 * than not offering the view.
 */

const IMAGE_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "avif",
]);

export function isImage(path: string): boolean {
  const i = path.lastIndexOf(".");
  return i > 0 && IMAGE_EXT.has(path.slice(i + 1).toLowerCase());
}

export function GalleryView({
  entries,
  conversationId,
  store,
  onOpen,
  onSelect,
  selected,
}: {
  entries: VfsEntry[];
  conversationId: string;
  store: string;
  onOpen: (e: VfsEntry) => void;
  onSelect: (e: VfsEntry) => void;
  selected?: string;
}) {
  const images = entries.filter((e) => e.kind === "file" && isImage(e.path));
  const others = entries.filter((e) => e.kind !== "file" || !isImage(e.path));

  if (!images.length) {
    return (
      <div className="p-6 text-[12px] text-[var(--cg-text-muted)]">
        No images in this folder.
        {others.length > 0 && " Switch to Table to see the other files."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 overflow-auto p-3">
      {images.map((e) => (
        <button
          key={e.path}
          type="button"
          onClick={() => onSelect(e)}
          onDoubleClick={() => onOpen(e)}
          className={`group flex flex-col overflow-hidden rounded-md border text-left ${
            selected === e.path
              ? "border-[var(--cg-accent,#4C9AFF)]"
              : "border-[var(--cg-border)] hover:border-[var(--cg-text-muted)]"
          }`}
        >
          {/* Native lazy loading: a folder of screenshots would otherwise issue
              one full-size request per tile the moment the view mounts. */}
          <img
            src={filesApi.downloadUrl(e.path, conversationId, store)}
            alt={baseName(e.path)}
            loading="lazy"
            className="h-28 w-full bg-[var(--cg-bg-hover)] object-cover"
          />
          <span className="truncate px-2 py-1 text-[11px] text-[var(--cg-text-nav)]">
            {baseName(e.path)}
          </span>
          <span className="px-2 pb-1 text-[10px] text-[var(--cg-text-muted)]">
            {formatSize(e.size)}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Library modification history — screenshot 6's table.
 *
 * The same `/checkpoints` data the point-in-time dialog restores from, shown as
 * a record rather than as a list of restore targets. Seafile's own history view
 * exists because the commit DESCRIPTION ("Renamed directory X", "Deleted Y") is
 * what makes a point in time meaningful; an opaque list of hashes is not
 * something anyone can safely choose from.
 */
export function HistoryView({
  conversationId,
  store,
  onRestore,
}: {
  conversationId: string;
  store: string;
  onRestore: (cp: Checkpoint) => void;
}) {
  const [state, setState] = React.useState<{
    loading: boolean;
    supported: boolean;
    items: Checkpoint[];
    error: string;
  }>({ loading: true, supported: true, items: [], error: "" });
  const [range, setRange] = React.useState<DateRange>("all");
  const [page, setPage] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    filesApi
      .checkpoints(conversationId, store)
      .then((d) => {
        if (!cancelled)
          setState({
            loading: false,
            supported: d.supported,
            items: d.checkpoints,
            error: "",
          });
      })
      .catch((e: VfsError) => {
        if (!cancelled)
          setState({
            loading: false,
            supported: true,
            items: [],
            error: e.message,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, store]);

  if (state.loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-[12px] text-[var(--cg-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading library history…
      </div>
    );
  }
  if (state.error) {
    return <div className="p-6 text-[12px] text-amber-400">{state.error}</div>;
  }
  if (!state.supported) {
    return (
      <div className="p-6 text-[12px] text-[var(--cg-text-muted)]">
        This store keeps no history.
      </div>
    );
  }

  const filtered = state.items.filter((cp) =>
    withinRange(cp.created_at, range),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--cg-border)] px-3 py-1.5">
        <DateRangeFilter
          value={range}
          onChange={(r) => {
            setRange(r);
            setPage(0);
          }}
        />
        <span className="text-[10px] text-[var(--cg-text-muted)]">
          {filtered.length} change{filtered.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
              <th className="pb-2 font-medium">Change</th>
              <th className="pb-2 font-medium">When</th>
              <th className="pb-2 font-medium">By</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {shown.map((cp) => (
              <tr key={cp.id} className="border-t border-[var(--cg-border)]">
                <td className="py-2 pr-3 text-[var(--cg-text-nav)]">
                  {cp.description || "—"}
                </td>
                <td className="whitespace-nowrap py-2 pr-3 text-[var(--cg-text-muted)]">
                  {formatWhen(cp.created_at)}
                </td>
                <td className="py-2 pr-3 text-[var(--cg-text-muted)]">
                  {cp.author}
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onRestore(cp)}
                    className="rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] px-2 py-0.5 text-[11px] hover:bg-[var(--cg-bg-hover)]"
                  >
                    Restore to here
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex items-center gap-2 py-4 text-[12px] text-[var(--cg-text-muted)]">
            <FileText className="h-3.5 w-3.5" />
            {state.items.length
              ? "No changes in this period."
              : "Nothing has changed in this library yet."}
          </div>
        )}
      </div>
      <Pager page={current} total={filtered.length} onPage={setPage} />
    </div>
  );
}

/**
 * Tiles — the large-icon view every desktop file manager opens with.
 *
 * Default for a reason: a table is the right tool for comparing sizes and dates,
 * but the first question in a document library is "which one is it", and that is
 * answered by shape and colour far faster than by a filename column. Folders sort
 * ahead of files, as they do in the table.
 *
 * Images render their ACTUAL bytes as the thumbnail rather than the generic
 * picture artwork. A folder of screenshots where every tile looks identical is
 * the case this view exists to fix.
 */
/** Ticked, merely inspected, and neither are three different states, and the
 *  tile has to distinguish them: a filled highlight means "this is in the batch
 *  you are about to act on", a plain outline means "this is what the details
 *  panel is describing". Collapsing them would make a batch delete a surprise. */
function tileTone(isChecked: boolean, isSelected: boolean): string {
  if (isChecked)
    return "border-[var(--cg-accent,#4C9AFF)] bg-[var(--cg-bg-hover)]";
  if (isSelected) return "border-[var(--cg-accent,#4C9AFF)]";
  return "border-transparent hover:bg-[var(--cg-bg-hover)]";
}

export function TilesView({
  entries,
  conversationId,
  store,
  onOpen,
  onSelect,
  onContextMenu,
  selected,
  checked,
  onToggleCheck,
}: {
  entries: VfsEntry[];
  conversationId: string;
  store: string;
  onOpen: (e: VfsEntry) => void;
  onSelect: (e: VfsEntry) => void;
  onContextMenu: (e: VfsEntry, ev: React.MouseEvent) => void;
  selected?: string;
  checked: string[];
  onToggleCheck: (path: string) => void;
}) {
  const sorted = entries;

  if (!sorted.length) {
    return (
      <div className="p-6 text-[12px] text-[var(--cg-text-muted)]">
        This folder is empty.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-1 overflow-auto p-3">
      {sorted.map((e) => (
        <button
          key={e.path}
          type="button"
          title={e.path}
          onClick={() => onSelect(e)}
          onDoubleClick={() => onOpen(e)}
          onContextMenu={(ev) => {
            ev.preventDefault();
            onSelect(e);
            onContextMenu(e, ev);
          }}
          className={`group relative flex flex-col items-center gap-1 rounded-md border px-1 py-2 ${tileTone(
            checked.includes(e.path),
            selected === e.path,
          )}`}
        >
          {/* Revealed on hover, and kept visible once ticked — a checkbox on
              every tile at rest turns a document library into a form. Rendered
              as a span because a button inside a button is invalid HTML and the
              nested control silently stops receiving clicks in some browsers. */}
          <span
            role="checkbox"
            tabIndex={-1}
            aria-checked={checked.includes(e.path)}
            aria-label={`Select ${baseName(e.path)}`}
            onClick={(ev) => {
              ev.stopPropagation();
              onToggleCheck(e.path);
            }}
            className={`absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded border ${
              checked.includes(e.path)
                ? "border-[var(--cg-accent,#4C9AFF)] bg-[var(--cg-accent,#4C9AFF)] opacity-100"
                : "border-[var(--cg-text-muted)] bg-[var(--cg-bg-page)] opacity-0 group-hover:opacity-100"
            }`}
          >
            {checked.includes(e.path) && (
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            )}
          </span>
          {e.kind === "file" && isImage(e.path) ? (
            <img
              src={filesApi.downloadUrl(e.path, conversationId, store)}
              alt=""
              loading="lazy"
              className="h-12 w-12 rounded-sm object-cover"
            />
          ) : (
            <FileArt path={e.path} kind={e.kind} size={48} />
          )}
          {/* Two lines, then ellipsis — long report names are the norm here, and
              truncating to one line makes near-identical names indistinguishable. */}
          <span className="line-clamp-2 w-full break-all text-center text-[11px] leading-tight text-[var(--cg-text-nav)]">
            {baseName(e.path)}
          </span>
        </button>
      ))}
    </div>
  );
}

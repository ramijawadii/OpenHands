/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { ArrowUpDown, Group, ChevronRight } from "lucide-react";
import { PortalMenu, MenuRow } from "./files-menu";
import type { VfsEntry } from "./files-api";

/**
 * Sort-by and Group-by, in the shape desktop file managers use.
 *
 * Several of the keys people expect from that shape have no data behind them
 * here, and they are shown DISABLED with the reason rather than omitted or —
 * worse — offered and then sorting by a field that is empty for every row. A
 * sort that silently does nothing is indistinguishable from a broken one.
 *
 * What the listing actually carries is `path`, `size`, `mtime` and `kind`.
 * Author and tags live behind `/metadata`, which is a request PER FILE; running
 * that across a folder to populate a sort key would turn one listing into
 * dozens of requests. Created-time and title the store does not record at all.
 */

export type SortKey = "name" | "modified" | "type" | "size";
export type GroupKey = "none" | "type" | "date";

interface Option<T> {
  id: T;
  label: string;
  /** Why it cannot be picked. Present means disabled. */
  blocked?: string;
}

const SORTS: Option<SortKey | "created" | "author" | "tags" | "title">[] = [
  { id: "name", label: "Name" },
  { id: "modified", label: "Date modified" },
  { id: "type", label: "Type" },
  { id: "size", label: "Size" },
  {
    id: "created",
    label: "Date created",
    blocked: "The store records modified time only",
  },
  {
    id: "author",
    label: "Author",
    blocked: "Held per file behind metadata, not in the listing",
  },
  {
    id: "tags",
    label: "Tags",
    blocked: "Held per file behind metadata, not in the listing",
  },
  {
    id: "title",
    label: "Title",
    blocked: "The store records no separate title",
  },
];

const GROUPS: Option<GroupKey | "author" | "tags">[] = [
  { id: "none", label: "(None)" },
  { id: "type", label: "Type" },
  { id: "date", label: "Date modified" },
  {
    id: "author",
    label: "Author",
    blocked: "Held per file behind metadata, not in the listing",
  },
  {
    id: "tags",
    label: "Tags",
    blocked: "Held per file behind metadata, not in the listing",
  },
];

export function SortGroupControls({
  sort,
  onSort,
  group,
  onGroup,
  ascending,
  onDirection,
}: {
  sort: SortKey;
  onSort: (k: SortKey) => void;
  group: GroupKey;
  onGroup: (k: GroupKey) => void;
  ascending: boolean;
  onDirection: (asc: boolean) => void;
}) {
  const [openSort, setOpenSort] = React.useState(false);
  const [openGroup, setOpenGroup] = React.useState(false);
  const sortBtn = React.useRef<HTMLButtonElement | null>(null);
  const groupBtn = React.useRef<HTMLButtonElement | null>(null);

  const sortLabel = SORTS.find((o) => o.id === sort)?.label ?? "Name";

  return (
    <>
      <div className="relative">
        <button
          ref={sortBtn}
          type="button"
          onClick={() => {
            setOpenSort((v) => !v);
            setOpenGroup(false);
          }}
          aria-haspopup="menu"
          aria-expanded={openSort}
          title={`Sorted by ${sortLabel}`}
          className="flex items-center gap-1 rounded border border-[var(--cg-border)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
        >
          <ArrowUpDown className="h-3 w-3" />
          <span className="hidden md:inline">{sortLabel}</span>
        </button>
        <PortalMenu
          open={openSort}
          anchor={sortBtn}
          onClose={() => setOpenSort(false)}
        >
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
            Sort by
          </div>
          {SORTS.map((o) => (
            <MenuRow
              key={o.id}
              label={o.label}
              blocked={o.blocked}
              checked={o.id === sort}
              onClick={() => {
                onSort(o.id as SortKey);
                setOpenSort(false);
              }}
            />
          ))}
          <div className="my-1 h-px bg-[var(--cg-border)]" />
          <MenuRow
            label="Ascending"
            checked={ascending}
            onClick={() => {
              onDirection(true);
              setOpenSort(false);
            }}
          />
          <MenuRow
            label="Descending"
            checked={!ascending}
            onClick={() => {
              onDirection(false);
              setOpenSort(false);
            }}
          />
        </PortalMenu>
      </div>

      <div className="relative">
        <button
          ref={groupBtn}
          type="button"
          onClick={() => {
            setOpenGroup((v) => !v);
            setOpenSort(false);
          }}
          aria-haspopup="menu"
          aria-expanded={openGroup}
          title="Group by"
          className="flex items-center gap-1 rounded border border-[var(--cg-border)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
        >
          <Group className="h-3 w-3" />
          <ChevronRight className="h-3 w-3 rotate-90" />
        </button>
        <PortalMenu
          open={openGroup}
          anchor={groupBtn}
          onClose={() => setOpenGroup(false)}
        >
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
            Group by
          </div>
          {GROUPS.map((o) => (
            <MenuRow
              key={o.id}
              label={o.label}
              blocked={o.blocked}
              checked={o.id === group}
              onClick={() => {
                onGroup(o.id as GroupKey);
                setOpenGroup(false);
              }}
            />
          ))}
        </PortalMenu>
      </div>
    </>
  );
}

/** Buckets that read the way a person would say them, not raw dates. "Earlier
 *  this week" is what someone is actually looking for; "2026-08-19" is not. */
export function dateBucket(mtime: number): string {
  if (!mtime) return "Unknown";
  const then = new Date(mtime > 1e12 ? mtime : mtime * 1000);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Earlier this week";
  if (days < 30) return "Earlier this month";
  if (days < 365) return "Earlier this year";
  return "A long time ago";
}

export function sortEntries(
  entries: VfsEntry[],
  key: SortKey,
  ascending: boolean,
  typeOf: (e: VfsEntry) => string,
): VfsEntry[] {
  const dir = ascending ? 1 : -1;
  return [...entries].sort((a, b) => {
    // Folders stay grouped ahead of files under every key and both directions —
    // interleaving them is what makes a listing hard to scan.
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    if (key === "size") return (a.size - b.size) * dir;
    if (key === "modified") return (a.mtime - b.mtime) * dir;
    if (key === "type") {
      const t = typeOf(a).localeCompare(typeOf(b));
      return (t || a.path.localeCompare(b.path)) * dir;
    }
    return a.path.toLowerCase().localeCompare(b.path.toLowerCase()) * dir;
  });
}

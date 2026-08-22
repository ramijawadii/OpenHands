/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Dropdown } from "./files-menu";

/**
 * Shared chrome for the two chronological views — Activity and History.
 *
 * Both answer "what happened, and when", both can run to thousands of rows, and
 * both need the same two controls. Building them twice is how the History pager
 * ends up one page-size different from the Activity one.
 */

export type DateRange = "all" | "today" | "7d" | "30d" | "90d";

const RANGES: { id: DateRange; label: string; days: number }[] = [
  { id: "all", label: "All time", days: 0 },
  { id: "today", label: "Today", days: 1 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
];

export const PAGE_SIZE = 50;

/**
 * Whether a timestamp falls inside a range.
 *
 * Accepts what the two APIs actually return, which is not the same thing:
 * `/audit/ledger` gives an ISO string, `/checkpoints` gives unix SECONDS. A
 * helper that assumed one silently dropped every row from the other.
 */
export function withinRange(value: string | number, range: DateRange): boolean {
  if (range === "all") return true;
  const days = RANGES.find((r) => r.id === range)?.days ?? 0;
  if (!days) return true;

  let ms: number;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(n) && String(value).trim() !== "") {
    ms = n > 1e12 ? n : n * 1000;
  } else {
    ms = new Date(String(value)).getTime();
  }
  // A row whose date cannot be read is KEPT. Dropping it would silently hide
  // history because of a formatting quirk, which is the worse failure for a
  // record people consult to find out what happened.
  if (!Number.isFinite(ms)) return true;

  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return ms >= start.getTime();
  }
  return ms >= Date.now() - days * 86_400_000;
}

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  return (
    <Dropdown
      value={value}
      options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
      onChange={onChange}
      ariaLabel="Filter by date"
      width={180}
      icon={<CalendarDays className="h-3 w-3 text-[var(--cg-text-muted)]" />}
    />
  );
}

/**
 * Pager.
 *
 * Renders nothing on a single page — a disabled pager under a five-row list is
 * chrome that only ever says "there is no more".
 */
export function Pager({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const from = page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex items-center gap-2 border-t border-[var(--cg-border)] px-3 py-2 text-[11px] text-[var(--cg-text-muted)]">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
          className="rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] p-1 hover:bg-[var(--cg-bg-hover)] disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span className="px-1 text-[var(--cg-text-nav)]">
          {page + 1} / {pages}
        </span>
        <button
          type="button"
          disabled={page >= pages - 1}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
          className="rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] p-1 hover:bg-[var(--cg-bg-hover)] disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

import type { EventRow } from "./event-data";

/**
 * Structured JSON export of the events currently on screen.
 *
 * The unit of export is **what the operator is looking at**: the filters they
 * selected, and the rows those filters produced. An export that silently
 * carried more or fewer rows than the table showed would be worse than no
 * export at all — it gets pasted into a ticket and treated as evidence.
 *
 * So the pipeline is build → serialise → VERIFY → download, and a failure at
 * any stage produces no file and a message, rather than a partial one.
 *
 * ## Why the sanitiser exists
 *
 * `JSON.stringify` is lossy in ways that matter here and are all silent:
 *
 *   - a `Date` becomes an ISO string via `toJSON`, but an INVALID date becomes
 *     `null` with no indication the value was ever wrong;
 *   - `NaN` and `Infinity` become `null`, so a broken metric is indistinguishable
 *     from an absent one;
 *   - `undefined` properties vanish, changing the record's shape between rows;
 *   - a cycle throws mid-write, after the caller has already committed to the
 *     download.
 *
 * Each is handled explicitly below so the file says what was true.
 */

/** Filter state as the events table presents it. `"All"` means unfiltered. */
export interface EventsExportScope {
  severity: string;
  type: string;
  service: string;
  environment: string;
}

export interface EventsExportCounts {
  /** Rows available before the table's own filters — the page scope. */
  inScope: number;
  /** Rows the filters matched. */
  matched: number;
  /** Rows actually written. Equal to `matched` unless a cap applied. */
  exported: number;
}

export interface EventsExport {
  schema: "cloudguard.events.export";
  version: 1;
  exportedAt: string;
  scope: {
    filters: EventsExportScope;
    /** Only the filters actually narrowing the set — empty means unfiltered. */
    applied: { field: string; value: string }[];
  };
  counts: EventsExportCounts;
  events: Record<string, unknown>[];
}

const DEFAULT = "All";

/**
 * Recursively convert a value into something `JSON.stringify` round-trips
 * without losing meaning. Object keys are emitted in sorted order so two
 * exports of the same data are byte-identical and diffable.
 */
export function toJsonSafe(value: unknown, seen = new WeakSet()): unknown {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    const t = value.getTime();
    // An invalid Date must not masquerade as a missing field.
    return Number.isNaN(t) ? { $invalidDate: true } : value.toISOString();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : { $nonFinite: String(value) };
  }

  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return null;
  if (typeof value !== "object") return value;

  // A cycle would otherwise throw part-way through serialisation.
  if (seen.has(value as object)) return { $circular: true };
  seen.add(value as object);

  if (Array.isArray(value)) return value.map((v) => toJsonSafe(v, seen));

  const out: Record<string, unknown> = {};
  Object.keys(value as Record<string, unknown>)
    .sort()
    .forEach((k) => {
      out[k] = toJsonSafe((value as Record<string, unknown>)[k], seen);
    });
  return out;
}

/** The filters that are actually narrowing the set, in display order. */
export function appliedFilters(
  scope: EventsExportScope,
): { field: string; value: string }[] {
  return (
    [
      ["severity", scope.severity],
      ["type", scope.type],
      ["service", scope.service],
      ["environment", scope.environment],
    ] as const
  )
    .filter(([, v]) => v && v !== DEFAULT)
    .map(([field, value]) => ({ field, value }));
}

export function buildEventsExport(
  inScope: EventRow[],
  matched: EventRow[],
  scope: EventsExportScope,
  now: Date,
): EventsExport {
  return {
    schema: "cloudguard.events.export",
    version: 1,
    exportedAt: now.toISOString(),
    scope: { filters: { ...scope }, applied: appliedFilters(scope) },
    counts: {
      inScope: inScope.length,
      matched: matched.length,
      exported: matched.length,
    },
    events: matched.map((r) => toJsonSafe(r) as Record<string, unknown>),
  };
}

/**
 * Parse the produced text back and confirm it still describes the same set.
 *
 * This is the step that makes the export trustworthy rather than merely
 * plausible: it catches a sanitiser bug, a serialisation surprise, or a row
 * that lost its identity, BEFORE a file reaches the user's disk. Comparing ids
 * rather than just the count also catches a mapping that dropped one row and
 * duplicated another.
 */
export function verifyExport(text: string, expected: EventRow[]): void {
  let parsed: EventsExport;
  try {
    parsed = JSON.parse(text) as EventsExport;
  } catch (e) {
    throw new Error(
      `export is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (!Array.isArray(parsed.events))
    throw new Error("export is missing its events array");

  if (parsed.events.length !== expected.length)
    throw new Error(
      `export has ${parsed.events.length} events but ${expected.length} were selected`,
    );

  if (parsed.counts?.exported !== expected.length)
    throw new Error("export count does not agree with its own events array");

  const got = new Set(parsed.events.map((e) => String(e.id)));
  const missing = expected.filter((r) => !got.has(String(r.id)));
  if (missing.length > 0)
    throw new Error(
      `export is missing ${missing.length} selected event(s), first: ${missing[0].id}`,
    );
  if (got.size !== parsed.events.length)
    throw new Error("export contains duplicate event ids");
}

/** `events-2026-08-06T12-30-00Z-24-critical.json` — sortable and self-describing. */
export function exportFilename(
  payload: EventsExport,
  now: Date = new Date(),
): string {
  const stamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace(/-\d+Z$/, "Z");
  const suffix = payload.scope.applied.map((a) => a.value).join("-");
  const safe = suffix
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `events-${stamp}-${payload.counts.exported}${safe ? `-${safe}` : ""}.json`;
}

export type ExportResult =
  | { ok: true; filename: string; count: number }
  | { ok: false; error: string };

/**
 * Build, serialise, verify, then download — in that order, with no side effect
 * until every check has passed.
 */
export function exportEvents(
  inScope: EventRow[],
  matched: EventRow[],
  scope: EventsExportScope,
  now: Date = new Date(),
): ExportResult {
  try {
    if (matched.length === 0)
      return { ok: false, error: "Nothing to export — no events match." };

    const payload = buildEventsExport(inScope, matched, scope, now);
    const text = JSON.stringify(payload, null, 2);
    verifyExport(text, matched);

    const filename = exportFilename(payload, now);
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.click();
    } finally {
      // Always released, even if the click throws — an un-revoked object URL
      // pins the whole payload in memory for the life of the document.
      URL.revokeObjectURL(url);
    }
    return { ok: true, filename, count: matched.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

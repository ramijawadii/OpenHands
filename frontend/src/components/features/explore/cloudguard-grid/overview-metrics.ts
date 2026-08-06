import type { ResourceRow } from "./data";

/**
 * The Overview's chart series.
 *
 * **This capability is discovery and inventory, not findings.** Its siblings
 * are Multi-Cloud Inventory, Shadow Assets, Tagging & Ownership, Change
 * History and Orphaned Resources — so the Overview has to summarise the
 * ESTATE: what exists, where it came from, how well it is described, and what
 * changed. A findings dashboard here answers a question the user did not ask on
 * this page, and duplicates one they can ask properly elsewhere.
 *
 * Everything is computed from the SAME `buildRows` generator the inventory grid
 * uses, so a bar and a row can never disagree. A summary computed from a second
 * source is a summary that drifts.
 *
 * Three series, one per question, each mapping to a sibling capability:
 *
 *   line  · what has been discovered over time            → Change History
 *   bar 1 · how the estate distributes across services    → Multi-Cloud Inventory
 *   bar 2 · where the inventory record is incomplete      → Shadow / Tagging / Orphaned
 */

export interface Bucket {
  key: string;
  count: number;
  /** Secondary count that qualifies the bar (e.g. how many are reachable). */
  detail: number;
}

/** Leaves only — accounts and clusters are tree scaffolding, not assets. */
export function leavesOf(all: ResourceRow[]): ResourceRow[] {
  return all.filter((r) => r.kind !== "Account" && r.kind !== "Cluster");
}

/**
 * Group resources by a key, largest first.
 *
 * `limit` keeps the axis readable — beyond ~8 rows a horizontal bar chart stops
 * being scannable and becomes a table with worse alignment. The tail folds into
 * "Other" rather than being dropped, so the total still reconciles with the
 * count shown elsewhere on the page.
 */
export function bucketBy(
  rows: ResourceRow[],
  keyOf: (r: ResourceRow) => string,
  detailOf: (r: ResourceRow) => boolean,
  limit = 6,
): Bucket[] {
  const acc = new Map<string, Bucket>();
  rows.forEach((r) => {
    const key = keyOf(r);
    const b = acc.get(key) ?? { key, count: 0, detail: 0 };
    b.count += 1;
    if (detailOf(r)) b.detail += 1;
    acc.set(key, b);
  });

  const all = [...acc.values()].sort((a, b) => b.count - a.count);
  if (all.length <= limit) return all;

  const head = all.slice(0, limit - 1);
  head.push(
    all.slice(limit - 1).reduce(
      (sum, b) => ({
        key: "Other",
        count: sum.count + b.count,
        detail: sum.detail + b.detail,
      }),
      { key: "Other", count: 0, detail: 0 },
    ),
  );
  return head;
}

/**
 * Inventory hygiene — the gaps in the record itself.
 *
 * Deliberately NOT severities. These are the five ways an inventory can be
 * wrong, and each one is a sibling capability: a resource nobody declared
 * (shadow), one nothing points at any more (orphaned), one that cannot be
 * billed or paged for (untagged / unowned), and one the scanner has not
 * confirmed recently enough to trust (stale).
 */
export function hygieneBuckets(rows: ResourceRow[]): Bucket[] {
  const tagged = (r: ResourceRow, prefix: string) =>
    r.tags.some((t) => t.startsWith(prefix));

  const defs: { key: string; test: (r: ResourceRow) => boolean }[] = [
    { key: "Shadow", test: (r) => r.isShadow },
    { key: "Orphaned", test: (r) => r.isOrphaned },
    { key: "Unmanaged", test: (r) => r.managedBy === "manual" },
    { key: "No owner", test: (r) => !r.owner || !tagged(r, "app:") },
    {
      key: "Stale record",
      test: (r) => r.staleness === "Stale" || r.staleness === "Untrusted",
    },
  ];

  return defs
    .map(({ key, test }) => ({
      key,
      count: rows.filter(test).length,
      // How many of those are also internet-reachable — the subset that turns
      // an inventory gap into an exposure.
      detail: rows.filter((r) => test(r) && r.internetReachable).length,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface DiscoveryPoint {
  label: string;
  /** Resources whose record was first created in this bucket. */
  discovered: number;
  /** Running total of the estate at the end of the bucket. */
  total: number;
}

/**
 * Discovery over time — how the estate grew, and when.
 *
 * A running total plus the per-bucket intake: the cumulative line IS the
 * inventory, the intake is what changed. A step in the cumulative line with no
 * matching intake spike means a bulk import, which is exactly the kind of thing
 * Change History exists to explain.
 */
export function discoverySeries(
  rows: ResourceRow[],
  days = 30,
): DiscoveryPoint[] {
  const now = Date.now();
  const DAY = 86400000;
  const start = now - days * DAY;

  const intake = new Array<number>(days).fill(0);
  let before = 0;

  rows.forEach((r) => {
    const t = r.firstSeen.getTime();
    if (t < start) {
      before += 1;
      return;
    }
    const idx = Math.min(days - 1, Math.floor((t - start) / DAY));
    if (idx >= 0) intake[idx] += 1;
  });

  let running = before;
  return intake.map((discovered, i) => {
    running += discovered;
    return {
      label: new Date(start + i * DAY).toLocaleDateString([], {
        day: "2-digit",
        month: "short",
      }),
      discovered,
      total: running,
    };
  });
}

export interface EstateSummary {
  total: number;
  providers: number;
  accounts: number;
  regions: number;
  newThisWindow: number;
}

export function estateSummary(
  all: ResourceRow[],
  discovery: DiscoveryPoint[],
): EstateSummary {
  const leaves = leavesOf(all);
  return {
    total: leaves.length,
    providers: new Set(all.map((r) => r.provider)).size,
    accounts: new Set(all.map((r) => r.account)).size,
    regions: new Set(leaves.map((r) => r.region)).size,
    newThisWindow: discovery.reduce((s, p) => s + p.discovered, 0),
  };
}

/**
 * Text equivalents of the charts.
 *
 * An ECharts canvas is one opaque element to assistive technology. These state
 * the finding each chart exists to communicate rather than describing the
 * drawing.
 */
export function describeBuckets(title: string, buckets: Bucket[]): string {
  if (buckets.length === 0) return `${title}: nothing in the selected scope.`;
  const parts = buckets
    .slice(0, 6)
    .map((b) => `${b.key} ${b.count.toLocaleString()}`);
  return `${title}, largest first: ${parts.join("; ")}.`;
}

export function describeDiscovery(points: DiscoveryPoint[]): string {
  if (points.length === 0) return "Discovery: nothing in the selected scope.";
  const peak = points.reduce(
    (m, p) => (p.discovered > m.discovered ? p : m),
    points[0],
  );
  const last = points[points.length - 1];
  const added = points.reduce((s, p) => s + p.discovered, 0);
  return (
    `Resources discovered over the selected window. ${added.toLocaleString()} added in total, ` +
    `busiest day ${peak.label} with ${peak.discovered}. ` +
    `Estate now ${last.total.toLocaleString()} resources.`
  );
}

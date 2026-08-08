/* eslint-disable i18next/no-literal-string -- overview asset enumeration */
import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { buildRows, type ResourceRow } from "./data";
import { APP_FONT } from "./theme";
import { GridPalette } from "./palette";
import { ResourceIcon } from "./icons";
import { SvgIcon } from "./SvgIcon";
import { SeverityGauge } from "./SeverityGauge";

/**
 * Asset enumeration strip — the counts an operator reads before anything else.
 *
 * Modelled on the AWS console's service-overview card: a label, a large number,
 * and a vertical rule between each.
 *
 * Three things make it operational rather than decorative:
 *
 * **Every number is a query.** A count that cannot be opened is a dead end —
 * seeing "Internet facing 128" and then having to walk to Inventory, find the
 * Exposure column, open its filter and pick Public is four interactions to
 * reproduce a number already on screen. Recognition-over-recall, inverted.
 * Each cell is a button that navigates to Inventory with the filter applied.
 *
 * **Every number carries a delta.** "How many" is a question the operator has
 * already internalised; "how many more than last week" is the one that makes
 * them act. Change is the whole point of a monitoring surface.
 *
 * **The value leads the label.** The value is larger AND heavier; previously
 * the 10.5px label was `600` against a 19px value at `500`, so the eye landed
 * on the qualifier and needed a second fixation to reach the number — seven
 * times over.
 *
 * **One type colour.** Every label and number is `--cg-text-primary`. Risk is
 * carried by the icon's tint, so the strip has no second colour competing with
 * the severity language used everywhere else in the kit.
 *
 * Counts come from the SAME generator the inventory grid uses, so the strip and
 * the table can never disagree.
 */

/** Built once per session, not per mount — 1,150 rows for a header is visible. */
let cached: ResourceRow[] | null = null;
function rows(): ResourceRow[] {
  if (!cached) cached = buildRows(1150);
  return cached;
}

/** A filter the Inventory grid can apply, expressed as query parameters. */
export type DrillFilter = Record<string, string>;

export interface Stat {
  label: string;
  value: number;
  /** Small trailing qualifier, as a chart legend's unit slot. */
  unit: string;
  /** Previous-period value, when one is meaningful. */
  previous?: number;
  /** Risk lives HERE — the type stays one colour throughout. */
  icon?: React.ReactNode;
  /** Inventory filter this count represents. Optional — omit on read-only strips. */
  filter?: DrillFilter;
  /** Higher is worse — colours the delta. Counts of assets are neutral. */
  adverse?: boolean;
}

function computeStats(all: ResourceRow[]): { scope: string; stats: Stat[] } {
  const leaves = all.filter(
    (r) => r.kind !== "Account" && r.kind !== "Cluster",
  );
  const count = (fn: (r: ResourceRow) => boolean) => leaves.filter(fn).length;

  const accounts = new Set(all.map((r) => r.account)).size;
  const providers = new Set(all.map((r) => r.provider));
  const regions = new Set(leaves.map((r) => r.region)).size;

  const publicFacing = count((r) => r.exposure === "Public");
  const critical = count((r) => r.severity === "Critical");

  /**
   * Previous-period counts.
   *
   * Deterministic from the current value rather than random, so the delta is
   * stable across reloads — a number that changes every refresh reads as noise
   * and gets ignored. A connector replaces this with the real prior snapshot.
   */
  const prior = (v: number, pct: number) => Math.round(v * (1 - pct));

  return {
    scope: `${accounts} accounts · ${providers.size} clouds · ${regions} regions`,
    stats: [
      {
        label: "Instances",
        unit: "running",
        value: count((r) => r.kind === "Instance"),
        previous: prior(
          count((r) => r.kind === "Instance"),
          0.03,
        ),
        icon: <ResourceIcon kind="Instance" size={13} />,
        filter: { kind: "Instance" },
      },
      {
        label: "Buckets",
        unit: "stores",
        value: count((r) => r.kind === "Bucket"),
        previous: prior(
          count((r) => r.kind === "Bucket"),
          0.01,
        ),
        icon: <ResourceIcon kind="Bucket" size={13} />,
        filter: { kind: "Bucket" },
      },
      {
        label: "Databases",
        unit: "clusters",
        value: count((r) => r.kind === "Database"),
        previous: prior(
          count((r) => r.kind === "Database"),
          0,
        ),
        icon: <ResourceIcon kind="Database" size={13} />,
        filter: { kind: "Database" },
      },
      {
        label: "Functions",
        unit: "deployed",
        value: count((r) => r.kind === "Function"),
        previous: prior(
          count((r) => r.kind === "Function"),
          0.06,
        ),
        icon: <ResourceIcon kind="Function" size={13} />,
        filter: { kind: "Function" },
      },
      {
        label: "Load balancers",
        unit: "endpoints",
        value: count((r) => r.kind === "LoadBalancer"),
        previous: prior(
          count((r) => r.kind === "LoadBalancer"),
          0,
        ),
        icon: <ResourceIcon kind="LoadBalancer" size={13} />,
        filter: { kind: "LoadBalancer" },
      },
      {
        label: "Internet facing",
        unit: "exposed",
        value: publicFacing,
        previous: prior(publicFacing, 0.04),
        adverse: true,
        icon: (
          <SvgIcon
            slug="azure_public_ip_addresses"
            size={13}
            color="var(--cgx-critical)"
          />
        ),
        filter: { exposure: "Public" },
      },
      {
        label: "Critical",
        unit: "findings",
        value: critical,
        previous: prior(critical, 0.09),
        adverse: true,
        icon: (
          <SeverityGauge
            severity={critical > 0 ? "Critical" : "Low"}
            size={13}
          />
        ),
        filter: { severity: "Critical" },
      },
    ],
  };
}

/**
 * The change since the previous period.
 *
 * Colour is applied only where direction has a meaning: more exposed or more
 * critical resources is bad, more functions is just a number. Colouring
 * everything would make the two that matter invisible among five that do not.
 */
function Delta({ stat }: { stat: Stat }) {
  if (stat.previous === undefined) return null;
  const diff = stat.value - stat.previous;
  if (diff === 0)
    return (
      <span style={{ fontSize: 10, color: "var(--cg-text-muted)" }}>
        no change
      </span>
    );

  const worse = stat.adverse === true && diff > 0;
  const better = stat.adverse === true && diff < 0;
  const Arrow = diff > 0 ? ArrowUpRight : ArrowDownRight;
  let color = "var(--cg-text-muted)";
  if (worse) color = "var(--cgx-critical)";
  else if (better) color = "var(--cgx-low)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        fontSize: 10,
        color,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Arrow size={10} />
      {Math.abs(diff).toLocaleString()}
    </span>
  );
}

/**
 * One legend item, in the shape of a chart legend's large item.
 *
 * The pattern: a colour mark and a name on the first line, a large value with a
 * small trailing unit on the second, and hairline rules BETWEEN items rather
 * than a border around each — a box per figure reads as a table of cards, a
 * shared rule reads as one continuous strip.
 *
 * The colour mark is the kit's own resource icon rather than a plain swatch. It
 * carries the same tint a legend dot would, and additionally says WHICH kind of
 * thing is being counted, which a dot cannot.
 *
 * `inactive` dims the item without removing it — the legend convention for "this
 * series is toggled off", reused here for a count the current scope excludes, so
 * a figure never silently disappears from the row.
 */
function LargeItem({
  stat,
  inactive,
  onDrill,
}: {
  stat: Stat;
  inactive?: boolean;
  onDrill?: (f: DrillFilter) => void;
}) {
  const interactive = Boolean(onDrill) && !inactive;
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={() => stat.filter && onDrill?.(stat.filter)}
      title={
        interactive
          ? `Show ${stat.label.toLowerCase()} in Inventory`
          : undefined
      }
      className={`cg-stat-item cg-stat-sep${interactive ? " cg-stat-cell" : ""}`}
      style={{
        padding: "2px 14px",
        minWidth: 0,
        background: "transparent",
        color: "inherit",
        font: "inherit",
        textAlign: "left",
        cursor: interactive ? "pointer" : "default",
        // Square corners. The separator IS this element's left border, so any
        // radius bends its two ends into hooks — seven rules each curving away
        // from the vertical, which reads as a rendering artefact rather than as
        // the clean column dividers the strip is meant to have.
        borderRadius: 0,
        opacity: inactive ? 0.45 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 500,
          color: "var(--cg-text-muted)",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        <span style={{ display: "inline-flex", flexShrink: 0 }}>
          {stat.icon}
        </span>
        {/* Truncates instead of widening its track — a column that refuses to
            shrink is what forces the whole strip onto a second row. */}
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {stat.label}
        </span>
      </div>
      <div
        style={{
          marginTop: 3,
          display: "flex",
          alignItems: "baseline",
          gap: 5,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 22,
            lineHeight: 1.1,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            color: "var(--cg-text-primary)",
          }}
        >
          {stat.value.toLocaleString()}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--cg-text-muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {stat.unit}
        </span>
        <Delta stat={stat} />
      </div>
    </button>
  );
}

/** Legend loading state — the strip keeps its shape while data regenerates. */
function LargeItemSkeleton() {
  return (
    <div
      aria-hidden
      className="cg-stat-item cg-stat-sep"
      style={{ padding: "2px 14px", minWidth: 0 }}
    >
      <div
        className="cg-stat-pulse"
        style={{ height: 9, width: "70%", borderRadius: 3 }}
      />
      <div
        className="cg-stat-pulse"
        style={{ height: 18, width: "45%", borderRadius: 3, marginTop: 6 }}
      />
    </div>
  );
}

export function AssetStats({
  onDrill,
  loading = false,
}: {
  /** Omit to render the strip read-only (no Inventory to navigate to). */
  onDrill?: (f: DrillFilter) => void;
  loading?: boolean;
}) {
  const { scope, stats } = React.useMemo(() => computeStats(rows()), []);
  return (
    <AssetStatStrip
      scope={scope}
      stats={stats}
      onDrill={onDrill}
      loading={loading}
      note="Change shown against the previous period. Select a figure to open it in Inventory."
    />
  );
}

/**
 * Presentational asset-overview strip — the exact markup above, parameterised so any surface can render
 * the identical legend-strip look with its own figures (used by the Overview and by the admin
 * discovery-kit). `onDrill` omitted ⇒ read-only.
 */
export function AssetStatStrip({
  title = "Asset overview",
  scope,
  stats,
  onDrill,
  loading = false,
  note,
}: {
  title?: string;
  scope?: string;
  stats: Stat[];
  onDrill?: (f: DrillFilter) => void;
  loading?: boolean;
  note?: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      style={{
        marginLeft: 10,
        marginRight: 10,
        boxSizing: "border-box",
        fontFamily: APP_FONT,
        color: "var(--cg-text-primary)",
        // No outer box. The separators already group these into one strip, so
        // a border around them adds a second, redundant enclosure — and it made
        // the strip read as a card sitting on the page rather than as the page's
        // own header.
        padding: "9px 12px 11px",
        marginBottom: 22,
      }}
    >
      <GridPalette />
      <style>{`
        /* CSS owns the border: an inline one would outrank .cg-stat-sep. */
        .cg-stat-item { border: none; }
        .cg-stat-cell:hover { background: var(--cg-bg-hover); }
        /*
         * Separators BETWEEN items only, and deliberately more visible than
         * --cg-border-subtle: at 7% alpha the rules were invisible on the dark
         * canvas, so the strip read as loose text rather than as columns. Set
         * per theme rather than from a token because this element renders
         * outside the console token scope.
         */
        .cg-stat-sep { border-left: 1px solid rgba(255, 255, 255, 0.3); }
        :root[data-theme="light"] .cg-stat-sep {
          border-left-color: rgba(0, 0, 0, 0.22);
        }
        .cg-stat-pulse {
          background: var(--cg-border-card);
          opacity: .35;
          animation: cg-stat-pulse 1.4s ease-in-out infinite;
        }
        @keyframes cg-stat-pulse {
          0%, 100% { opacity: .2; }
          50%      { opacity: .45; }
        }
        .cg-stat-cell:focus-visible {
          outline: 2px solid var(--cg-accent);
          outline-offset: -2px;
        }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>{title}</h2>
        <span style={{ fontSize: 10.5, color: "var(--cg-text-muted)" }}>
          {scope}
        </span>
      </div>

      {/*
       * Wraps rather than scrolls. A horizontal scrollbar on a summary strip
       * hides the very counts it exists to surface.
       */}
      {/*
       * A GRID, not a wrapping flex row.
       *
       * With `flex: 1 1 auto` each figure sized itself from its own content, so
       * when the drawer opened and the strip wrapped, the second row's items
       * landed wherever there was space — "Internet facing" and "Critical" sat
       * under nothing in particular. Equal grid tracks mean a wrapped item
       * always lands directly beneath a column above it.
       *
       * `auto-fit` + `minmax` also makes the strip SHRINK before it wraps: seven
       * columns compress down to 132px each and only then fold, so opening the
       * drawer narrows the columns rather than immediately breaking the row.
       *
       * The -1px shift clips the leading separator of EVERY row at once. Rows
       * start at the same x because the tracks are equal, so one offset removes
       * the row-start rules without needing to know which item begins a row —
       * which is not knowable with `auto-fit`.
       */}
      <div style={{ overflow: "hidden", marginTop: 8 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
            rowGap: 14,
            marginLeft: -1,
            alignItems: "stretch",
          }}
        >
          {loading
            ? stats.map((st) => <LargeItemSkeleton key={st.label} />)
            : stats.map((st) => (
                <LargeItem
                  key={st.label}
                  stat={st}
                  // A count the current scope excludes is dimmed, not dropped —
                  // a figure that vanishes reads as a rendering bug.
                  inactive={st.value === 0}
                  onDrill={onDrill}
                />
              ))}
        </div>
      </div>

      {note && (
        <p style={{ margin: "8px 0 0", fontSize: 10, color: "var(--cg-text-muted)" }}>
          {note}
        </p>
      )}
    </section>
  );
}

/* eslint-disable i18next/no-literal-string -- overview asset enumeration */
import React from "react";
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
 * and a vertical rule between each. The number leads because it is what is
 * being read; the label only qualifies it.
 *
 * **Sized to the events table below it**, not to the page. The table occupies
 * the canvas's top-left quadrant — 10px in from the left, out to 46% — so the
 * strip takes exactly that box and the two share one left and right edge. A
 * full-width header over a half-width table reads as two unrelated things.
 *
 * **One type colour.** Every label and number is `--cg-text-primary` (white on
 * the dark canvas). Risk is carried by the icon's tint instead, so the strip
 * has no second colour competing with the severity language used everywhere
 * else in the kit.
 *
 * Counts come from the SAME generator the inventory grid uses, so the strip and
 * the table can never disagree — a summary computed from a second source is a
 * summary that drifts. It is memoised at module scope because the dataset is
 * deterministic and the Overview remounts on every tab switch; regenerating
 * 1,150 rows for a header would be visible.
 */

/** Built once per session, not per mount. */
let cached: ResourceRow[] | null = null;
function rows(): ResourceRow[] {
  if (!cached) cached = buildRows(1150);
  return cached;
}

interface Stat {
  label: string;
  value: number;
  /**
   * Mark rendered beside the label, in the kit's own iconography. Risk is
   * expressed HERE — the type stays one colour throughout.
   */
  icon?: React.ReactNode;
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

  return {
    scope: `${accounts} accounts · ${providers.size} clouds · ${regions} regions`,
    stats: [
      {
        label: "Instances",
        value: count((r) => r.kind === "Instance"),
        icon: <ResourceIcon kind="Instance" size={13} />,
      },
      {
        label: "Buckets",
        value: count((r) => r.kind === "Bucket"),
        icon: <ResourceIcon kind="Bucket" size={13} />,
      },
      {
        label: "Databases",
        value: count((r) => r.kind === "Database"),
        icon: <ResourceIcon kind="Database" size={13} />,
      },
      {
        label: "Functions",
        value: count((r) => r.kind === "Function"),
        icon: <ResourceIcon kind="Function" size={13} />,
      },
      {
        label: "Load balancers",
        value: count((r) => r.kind === "LoadBalancer"),
        icon: <ResourceIcon kind="LoadBalancer" size={13} />,
      },
      {
        label: "Internet facing",
        value: publicFacing,
        icon: (
          <SvgIcon
            slug="azure_public_ip_addresses"
            size={13}
            color="var(--cgx-critical)"
          />
        ),
      },
      {
        label: "Critical",
        value: critical,
        icon: (
          <SeverityGauge
            severity={critical > 0 ? "Critical" : "Low"}
            size={13}
          />
        ),
      },
    ],
  };
}

function StatCell({ stat, first }: { stat: Stat; first: boolean }) {
  return (
    <div
      style={{
        // Rules BETWEEN cells, not around them: a border on every cell reads as
        // a table of boxes rather than one continuous strip.
        borderLeft: first ? "none" : "1px solid var(--cg-border-subtle)",
        padding: first ? "0 10px 0 0" : "0 10px",
        minWidth: 0,
        flex: "1 1 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 10.5,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {stat.icon}
        {stat.label}
      </div>
      <div
        style={{
          marginTop: 1,
          fontSize: 19,
          lineHeight: 1.15,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {stat.value.toLocaleString()}
      </div>
    </div>
  );
}

export function AssetStats() {
  const { scope, stats } = React.useMemo(() => computeStats(rows()), []);

  return (
    <section
      aria-label="Asset overview"
      style={{
        // Mirrors EMPTY_QUADRANT (left: 10, right: "54%") so the strip lines up
        // with the events table beneath it on both edges.
        marginLeft: 10,
        width: "calc(46% - 10px)",
        minWidth: 380,
        boxSizing: "border-box",
        fontFamily: APP_FONT,
        color: "var(--cg-text-primary)",
        border: "1px solid var(--cg-border-card)",
        borderRadius: 4,
        padding: "9px 12px 11px",
        marginBottom: 10,
      }}
    >
      <GridPalette />

      <h2 style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>
        Asset overview
      </h2>
      <div style={{ margin: "1px 0 9px", fontSize: 10.5, opacity: 0.72 }}>
        {scope}
      </div>

      {/*
       * Wraps rather than scrolls. A horizontal scrollbar on a summary strip
       * hides the very counts it exists to surface, and the strip sits above a
       * canvas that already owns the horizontal axis.
       */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          rowGap: 9,
          alignItems: "flex-start",
        }}
      >
        {stats.map((s, i) => (
          <StatCell key={s.label} stat={s} first={i === 0} />
        ))}
      </div>
    </section>
  );
}

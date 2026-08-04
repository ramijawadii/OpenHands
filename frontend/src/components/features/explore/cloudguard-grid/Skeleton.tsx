import React from "react";

/**
 * Loading placeholders for the two heavy explore surfaces.
 *
 * Both AG Grid and ECharts need a measured container before they can render,
 * so neither can be replaced by a placeholder — the placeholder is laid *over*
 * the real host, which keeps its size and mounts underneath. Swapping the host
 * out would leave the chart initialising into a 0×0 box.
 *
 * Shapes mirror the real layout rather than being generic bars: a skeleton
 * that lands where the content lands reads as the page arriving, while one
 * that does not reads as a second, discarded page.
 *
 * `.skeleton` is the app's own utility (pulse, themed), so loading looks the
 * same here as it does everywhere else in the product.
 */

function Bar({
  w,
  h = 10,
  style,
}: {
  w: number | string;
  h?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="skeleton !rounded-sm"
      style={{ width: w, height: h, opacity: 0.18, ...style }}
    />
  );
}

/** Rows of bars at the grid's own row height, under a header band. */
export function GridSkeleton({ rows = 14 }: { rows?: number }) {
  const widths = ["38%", "12%", "10%", "14%", "9%", "11%"];
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--cg-bg-card)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Header band */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          height: 32,
          padding: "0 14px",
          borderBottom: "1px solid var(--cg-border)",
          flexShrink: 0,
        }}
      >
        {widths.map((w) => (
          <Bar key={w} w={w} h={9} style={{ opacity: 0.26 }} />
        ))}
      </div>

      {Array.from({ length: rows }).map((_, i) => (
        <div
          // Static placeholder list: the index is the only identity it has.
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            height: 28,
            padding: "0 14px",
            flexShrink: 0,
            // Fade out down the page so the list reads as continuing past the
            // fold rather than stopping at an arbitrary row.
            opacity: 1 - i / (rows + 4),
          }}
        >
          {/* First column is indented per depth, echoing the tree. */}
          <Bar w={widths[0]} style={{ marginLeft: (i % 3) * 16 }} />
          {widths.slice(1).map((w) => (
            <Bar key={w} w={w} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Title, legend and plot block per quadrant of the overview dashboard. */
function ChartBlock({ tall }: { tall?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Bar w={140} h={12} style={{ opacity: 0.26 }} />
        <Bar w={70} h={8} />
      </div>
      <div style={{ display: "flex", gap: 8, paddingLeft: 8 }}>
        <Bar w={10} h={10} />
        <Bar w={64} h={10} />
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 7,
          paddingLeft: 56,
        }}
      >
        {(tall
          ? [72, 46, 88, 58, 34, 66, 50, 80]
          : [64, 40, 78, 52, 30, 70]
        ).map((w, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <Bar key={i} w={`${w}%`} h={9} />
        ))}
      </div>
    </div>
  );
}

/** Four quadrants: events table, gradient line, and the two bar charts. */
export function OverviewSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--cg-bg-page)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 24,
        padding: 12,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Top-left is the events table, not a chart. */}
      <div style={{ position: "relative", minHeight: 0 }}>
        <GridSkeleton rows={9} />
      </div>
      <ChartBlock />
      <ChartBlock tall />
      <ChartBlock tall />
    </div>
  );
}

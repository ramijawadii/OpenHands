import React from "react";
import type { CustomCellRendererProps } from "ag-grid-react";

/**
 * Inline SVG sparkline — our stand-in for the Enterprise `SparklinesModule`.
 *
 * Deliberately hand-rolled rather than pulling a charting library: the
 * Enterprise sparkline requires `ag-charts-enterprise`, a second commercial
 * product, and a 12-point trend line does not justify either the licence or
 * the ~1MB of chart engine. This renders one `<path>` and costs nothing.
 */

const W = 92;
const H = 22;

export function Sparkline({ value }: CustomCellRendererProps) {
  const values = value as number[] | undefined;
  if (!Array.isArray(values) || values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = W / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / span) * H;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const rising = values[values.length - 1] >= values[0];
  // Same semantic palette as the rest of the grid, so the trend line darkens
  // in light mode along with the status text.
  const stroke = rising ? "var(--cgx-critical)" : "var(--cgx-low)";

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Trend, ${rising ? "rising" : "falling"}`}
      style={{ display: "block", marginTop: 8 }}
    >
      <path
        d={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

import React from "react";

/**
 * Severity gauge — a four-segment arc that fills left-to-right with severity.
 *
 * The source icon ships as one `<path>` holding four subpaths. Splitting them
 * into separate elements is what makes partial fill possible: each segment can
 * then take its own colour, so the gauge reads at a glance without the label.
 *
 * The third subpath in the original uses a *relative* moveto (`m-8.449 3.552`)
 * continuing from the previous subpath's close point (18, 9.292). It is
 * resolved to its absolute equivalent (9.551, 12.844) below, so each segment
 * stands alone and order no longer matters.
 *
 * Segments are ordered left → right, which is fill order.
 */

const SEGMENTS = [
  // 1 — far left
  "M5.292 9.999a9 9 0 0 0-2.237 5.003c-.06.549.393.998.945.998h3.005c.552 0 .988-.454 1.125-.99a4 4 0 0 1 .714-1.46z",
  // 2 — left of centre
  "M9.551 12.844a4 4 0 0 1 1.949-.807V7.014A9 9 0 0 0 6 9.292z",
  // 3 — right of centre
  "M18 9.292a9 9 0 0 0-5.5-2.278v5.023a4 4 0 0 1 1.949.807z",
  // 4 — far right
  "M20.945 15.002c.06.549-.393.998-.945.998h-3.005c-.552 0-.988-.454-1.125-.99a4 4 0 0 0-.714-1.46L18.708 10a9 9 0 0 1 2.237 5.002",
];

/** How many of the four segments each severity lights up, and in what colour. */
const LEVEL: Record<string, { filled: number; color: string }> = {
  Low: { filled: 1, color: "var(--cgx-neutral)" },
  Medium: { filled: 2, color: "var(--cgx-medium)" },
  High: { filled: 3, color: "var(--cgx-high)" },
  Critical: { filled: 4, color: "var(--cgx-critical)" },
};

export function SeverityGauge({
  severity,
  size = 17,
}: {
  severity: string;
  size?: number;
}) {
  const level = LEVEL[severity];
  if (!level) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={`Severity ${severity}, ${level.filled} of 4`}
      style={{ flexShrink: 0, display: "block" }}
    >
      {SEGMENTS.map((d, i) => (
        <path
          key={d}
          d={d}
          fillRule="evenodd"
          clipRule="evenodd"
          fill={i < level.filled ? level.color : "var(--cgx-gauge-empty)"}
        />
      ))}
    </svg>
  );
}

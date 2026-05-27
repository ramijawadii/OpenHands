/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useContextPressureStore } from "#/stores/context-pressure-store";
import { useWsClient } from "#/context/ws-client-provider";

// SVG ring geometry
const RADIUS = 10;
const STROKE = 2.5;
const SIZE = (RADIUS + STROKE) * 2 + 2; // 28px
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 62.83
const CX = SIZE / 2;
const CY = SIZE / 2;

function getRingColor(pressure: number): string {
  if (pressure >= 0.95) return "#ef4444"; // red — imminent
  if (pressure >= 0.8) return "#f97316"; // orange — high
  if (pressure >= 0.6) return "#eab308"; // yellow — moderate
  return "#22c55e"; // green — comfortable
}

/**
 * Circular progress ring showing how full the context window is before
 * the next auto-compaction fires.  Clicking it triggers an on-demand compact.
 *
 * Hidden when no events have been recorded yet (used === 0).
 */
export function ContextRingIndicator() {
  const { used, max, pressure } = useContextPressureStore();
  const { send } = useWsClient();

  if (used === 0 || max === 0) return null;

  const remaining = Math.max(0, Math.round((1 - pressure) * 100));
  const fillOffset = CIRCUMFERENCE * (1 - pressure);
  const color = getRingColor(pressure);
  const tooltipText = `${remaining}% of context remaining until next compact`;

  const handleCompact = (e: React.MouseEvent) => {
    e.stopPropagation();
    send({ action: "condensation_request" });
  };

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer group select-none"
      style={{ width: SIZE, height: SIZE, flexShrink: 0 }}
      onClick={handleCompact}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ")
          handleCompact(e as unknown as React.MouseEvent);
      }}
      role="button"
      tabIndex={0}
      aria-label={tooltipText}
      title={tooltipText}
    >
      {/* Ring */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={CX}
          cy={CY}
          r={RADIUS}
          fill="none"
          stroke="#404040"
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={0}
        />
        {/* Filled arc — grows clockwise */}
        <circle
          cx={CX}
          cy={CY}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={fillOffset}
          style={{
            transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease",
          }}
        />
      </svg>

      {/* Compact icon — always present, brightens on hover */}
      <span
        className="absolute text-neutral-500 group-hover:text-white transition-colors pointer-events-none"
        style={{ fontSize: "9px", lineHeight: 1, marginTop: "1px" }}
        aria-hidden="true"
      >
        ↻
      </span>
    </div>
  );
}

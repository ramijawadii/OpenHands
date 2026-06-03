/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useContextPressureStore } from "#/stores/context-pressure-store";
import { useWsClient } from "#/context/ws-client-provider";
import { useCompactStore } from "#/stores/compact-store";

// SVG ring geometry
const RADIUS = 10;
const STROKE = 2.5;
const SIZE = (RADIUS + STROKE) * 2 + 2; // 28px
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 62.83
const CX = SIZE / 2;
const CY = SIZE / 2;

function getRingColor(pressure: number): string {
  if (pressure >= 0.95) return "#ef4444"; // red — imminent compaction
  if (pressure >= 0.8) return "#f97316"; // orange — high pressure
  if (pressure >= 0.6) return "#eab308"; // yellow — moderate
  return "#22c55e"; // green — comfortable
}

/**
 * Circular progress ring showing how full the context window is before
 * the next auto-compaction fires (Claude Code architecture — real token data).
 *
 * pressure = tokenUsage / autoCompactThreshold (0–1)
 * percentRemaining = % of threshold left before auto-compact fires
 *
 * Hidden until the first LLM API response arrives (contextWindow === 0).
 * Clicking triggers an on-demand compact.
 */
export function ContextRingIndicator() {
  const { percentRemaining, pressure, contextWindow } =
    useContextPressureStore();
  const { send } = useWsClient();
  const [pulsing, setPulsing] = React.useState(false);

  // Hide until real token data arrives from the backend
  if (contextWindow === 0) return null;

  const fillOffset = CIRCUMFERENCE * (1 - pressure);
  const color = getRingColor(pressure);
  const tooltipText = `${percentRemaining}% of context remaining — click to compact`;

  const handleCompact = (e: React.MouseEvent) => {
    e.stopPropagation();
    send({ action: "condensation_request" });
    // Show CompactionBanner immediately. If agent is running the condenser fires
    // and CondensationObservation will resolve it. If agent is idle, the
    // CompactionBanner 30-second timeout switches to "⏳ Queued" and auto-clears.
    useCompactStore.getState().recordCompactionStarted();
    setPulsing(true);
    setTimeout(() => setPulsing(false), 600);
  };

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer group select-none"
      style={{
        width: SIZE,
        height: SIZE,
        flexShrink: 0,
        transform: pulsing ? "scale(1.25)" : "scale(1)",
        transition: "transform 0.15s ease",
      }}
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
        {/* Filled arc — grows clockwise as context fills up */}
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

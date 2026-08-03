/* eslint-disable i18next/no-literal-string -- attack timeline canvas */
import React from "react";
import * as echarts from "echarts";
import {
  Ban,
  CircleCheck,
  CircleHelp,
  Crosshair,
  Download,
  Search,
  TriangleAlert,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { APP_FONT } from "./theme";
import type { EventRow } from "./event-data";
import {
  PHASES,
  beforeDetection,
  buildReconstruction,
  confidenceLabel,
  formatDuration,
  type Phase,
  type PhaseStatus,
  type Reconstruction,
} from "./attack-timeline";

/**
 * Attack Timeline Reconstruction, to the timeline UX spec (v1.0).
 *
 * The base chart is unchanged — a horizontal boxplot per ATT&CK phase, time
 * running backwards to detection — because the distribution of the evidence is
 * still the quantity worth showing. What is added around it is everything
 * needed to *act* on a bar: where the estimate came from, how much of it is
 * observed rather than reasoned, and what to do next.
 *
 * Two decisions the spec forced, both worth keeping:
 *
 *  - **Status is never colour alone.** Confirmed / Likely / Inferred / No
 *    evidence each carry a glyph as well as a fill treatment, because the
 *    difference between "we saw this" and "this must have happened" is the
 *    single most important thing on the canvas and it cannot depend on a
 *    viewer distinguishing two opacities.
 *  - **Outliers are explained, not plotted.** A green dot with no hover was
 *    unreadable; each now says how far outside the window it fell and why
 *    that matters.
 *
 * The canvas is white in both themes — it is a drawing surface, and the phase
 * fills and status glyphs were chosen against paper.
 */

const CANVAS_BG = "#ffffff";
const INK = "#1f2937";
const MUTED = "#5f6b7a";
const RULE = "#d5d9df";

/**
 * Fill treatment per status. Solid for observed, translucent for corroborated,
 * dashed outline for reasoned, flat grey for absent — the visual weight tracks
 * how much the reconstruction actually knows.
 */
const STATUS_STYLE: Record<
  PhaseStatus,
  {
    color: string;
    border: string;
    borderType: "solid" | "dashed";
    tint: string;
  }
> = {
  Confirmed: {
    color: "#5470c6",
    border: "#3f56a5",
    borderType: "solid",
    tint: "#3f56a5",
  },
  Likely: {
    color: "#5470c655",
    border: "#5470c6",
    borderType: "solid",
    tint: "#4964b8",
  },
  Inferred: {
    color: "transparent",
    border: "#8d97ab",
    borderType: "dashed",
    tint: "#6b7280",
  },
  "No evidence": {
    color: "#e6e8ec",
    border: "#c3c8d0",
    borderType: "solid",
    tint: "#8d97ab",
  },
};

const STATUS_ICON: Record<
  PhaseStatus,
  React.ComponentType<{ size?: number; color?: string }>
> = {
  Confirmed: CircleCheck,
  Likely: TriangleAlert,
  Inferred: CircleHelp,
  "No evidence": Ban,
};

/** ECharts draws to canvas, so the status glyph in a label is a character. */
const STATUS_GLYPH: Record<PhaseStatus, string> = {
  Confirmed: "✔",
  Likely: "!",
  Inferred: "?",
  "No evidence": "∅",
};

const OUTLIER_COLOR = "#d97706";

/* ------------------------------------------------------------------ *
 * Chart
 * ------------------------------------------------------------------ */

/** Selecting a phase highlights it plus the step before and after it. */
function isNeighbour(name: string, selected: string): boolean {
  const a = PHASES.indexOf(name as (typeof PHASES)[number]);
  const b = PHASES.indexOf(selected as (typeof PHASES)[number]);
  return Math.abs(a - b) <= 1;
}

function dimmed(name: string, selected: string | null): boolean {
  return selected !== null && !isNeighbour(name, selected);
}

function tooltipHtml(p: Phase): string {
  const row = (k: string, v: string) =>
    `<tr><td style="color:${MUTED};padding:1px 10px 1px 0;white-space:nowrap">${k}</td>` +
    `<td style="color:${INK};font-weight:600">${v}</td></tr>`;

  return [
    `<div style="font-family:${APP_FONT};font-size:11.5px;max-width:280px">`,
    `<div style="font-weight:700;font-size:12.5px;color:${INK};margin-bottom:5px">`,
    `${STATUS_GLYPH[p.status]} ${p.name}`,
    `</div>`,
    `<table style="border-collapse:collapse">`,
    row("Estimated", beforeDetection(p.median)),
    row("Duration", formatDuration(p.durationMinutes)),
    row("Confidence", `${p.confidence}% · ${confidenceLabel(p.confidence)}`),
    row("Status", p.status),
    row("Evidence", `${p.evidenceCount} events`),
    row("MITRE", `${p.mitreId} · ${p.mitreTechnique}`),
    row("Assets", p.assets.join(", ")),
    row("Identities", p.users.join(", ")),
    row("Processes", p.processes.join(", ")),
    `</table>`,
    `<div style="margin-top:6px;color:${MUTED}">Click to investigate</div>`,
    `</div>`,
  ].join("");
}

function outlierTooltipHtml(o: {
  title: string;
  minutes: number;
  confidence: number;
  reason: string;
}): string {
  return [
    `<div style="font-family:${APP_FONT};font-size:11.5px;max-width:260px">`,
    `<div style="font-weight:700;color:${INK};margin-bottom:4px">Outlier event</div>`,
    `<div style="color:${INK};margin-bottom:4px">${o.title}</div>`,
    `<div style="color:${MUTED}">${beforeDetection(o.minutes)}</div>`,
    `<div style="color:${MUTED}">Confidence ${o.confidence}%</div>`,
    `<div style="color:${MUTED};margin-top:4px">${o.reason}</div>`,
    `</div>`,
  ].join("");
}

function buildOption(
  r: Reconstruction,
  visible: Phase[],
  selected: string | null,
): echarts.EChartsOption {
  const names = visible.map((p) => p.name);
  const shown = new Set(names);

  return {
    backgroundColor: CANVAS_BG,
    textStyle: { color: INK, fontFamily: APP_FONT },
    animationDuration: 500,
    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: "#ffffff",
      borderColor: RULE,
      borderWidth: 1,
      padding: [8, 10],
      extraCssText: "box-shadow:0 6px 20px rgba(15,20,26,.16);",
      formatter: (params: unknown) => {
        const p = params as { seriesName?: string; dataIndex: number };
        if (p.seriesName === "Outlier") {
          const list = r.outliers.filter((o) => shown.has(o.phase));
          return outlierTooltipHtml(list[p.dataIndex]);
        }
        return tooltipHtml(visible[p.dataIndex]);
      },
    },
    grid: { left: 8, right: 24, top: 14, bottom: 46, containLabel: true },
    xAxis: {
      type: "value",
      name: "minutes before detection",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: MUTED, fontSize: 10, fontFamily: APP_FONT },
      // Time runs backwards to detection, so the newest evidence — and the
      // detection line itself — sits at the right-hand edge.
      inverse: true,
      min: 0,
      axisLabel: { color: MUTED, fontSize: 10, fontFamily: APP_FONT },
      splitLine: { lineStyle: { color: RULE } },
      axisLine: { lineStyle: { color: RULE } },
    },
    yAxis: {
      type: "category",
      data: names,
      axisLabel: {
        color: INK,
        fontSize: 11,
        fontFamily: APP_FONT,
        width: 132,
        overflow: "truncate",
        align: "right",
        formatter: (name: string) => {
          const p = visible.find((v) => v.name === name);
          return p ? `${STATUS_GLYPH[p.status]}  ${name}` : name;
        },
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: RULE } },
      splitLine: { show: false },
    },
    dataZoom: [
      { type: "inside", xAxisIndex: 0 },
      {
        type: "slider",
        xAxisIndex: 0,
        height: 14,
        bottom: 18,
        borderColor: RULE,
        textStyle: { color: MUTED, fontSize: 9, fontFamily: APP_FONT },
      },
    ],
    series: [
      {
        name: "Phase",
        type: "boxplot",
        data: visible.map((p) => ({
          value: [p.end, p.q1, p.median, p.q3, p.start],
          itemStyle: {
            color: STATUS_STYLE[p.status].color,
            borderColor: STATUS_STYLE[p.status].border,
            borderType: STATUS_STYLE[p.status].borderType,
            borderWidth: p.name === selected ? 2.4 : 1.2,
            // The selected phase and its neighbours stay opaque; the rest
            // recede, which is what makes progression readable.
            opacity: dimmed(p.name, selected) ? 0.35 : 1,
          },
        })),
        emphasis: { itemStyle: { borderWidth: 2.4 } },
      },
      {
        name: "Outlier",
        type: "scatter",
        symbolSize: 9,
        symbol: "diamond",
        itemStyle: { color: OUTLIER_COLOR },
        data: r.outliers
          .filter((o) => shown.has(o.phase))
          .map((o) => [o.minutes, names.indexOf(o.phase)]),
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "#c74634", width: 1.4, type: "solid" },
          label: {
            formatter: "Detection",
            color: "#c74634",
            fontSize: 10,
            fontFamily: APP_FONT,
            position: "insideEndTop",
          },
          data: [{ xAxis: 0 }],
        },
      },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

const control: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  height: 22,
  padding: "0 8px",
  fontSize: 11,
  fontFamily: APP_FONT,
  background: "#ffffff",
  color: INK,
  border: `1px solid ${RULE}`,
  borderRadius: 3,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 9.5,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--cg-text-muted)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--cg-text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/** Green above high, amber through medium, red below — the SLA scale. */
function confidenceTint(pct: number): string {
  if (pct >= 75) return "var(--cgx-low)";
  if (pct >= 50) return "var(--cgx-medium)";
  return "var(--cgx-critical)";
}

function ConfidenceBar({ pct }: { pct: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{pct}%</span>
      <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
        {confidenceLabel(pct)}
      </span>
      <span
        aria-hidden="true"
        style={{
          flex: 1,
          minWidth: 60,
          height: 4,
          borderRadius: 2,
          background: "var(--cg-border)",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "block",
            width: `${pct}%`,
            height: "100%",
            background: confidenceTint(pct),
          }}
        />
      </span>
    </div>
  );
}

function Legend() {
  const item = (
    key: string,
    swatch: React.ReactNode,
    label: string,
  ): React.ReactNode => (
    <span
      key={key}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10.5,
        color: "var(--cg-text-muted)",
      }}
    >
      {swatch}
      {label}
    </span>
  );

  const box = (s: PhaseStatus) => (
    <span
      style={{
        width: 12,
        height: 9,
        borderRadius: 1,
        background: STATUS_STYLE[s].color,
        border: `1px ${STATUS_STYLE[s].borderType} ${STATUS_STYLE[s].border}`,
        boxSizing: "border-box",
      }}
    />
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {item("c", box("Confirmed"), "Confirmed")}
      {item("l", box("Likely"), "Likely")}
      {item("i", box("Inferred"), "Inferred")}
      {item("n", box("No evidence"), "No evidence")}
      {item(
        "o",
        <span
          style={{
            width: 8,
            height: 8,
            background: OUTLIER_COLOR,
            transform: "rotate(45deg)",
          }}
        />,
        "Outlier",
      )}
      {item(
        "d",
        <span style={{ width: 2, height: 10, background: "#c74634" }} />,
        "Detection time",
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Details
 * ------------------------------------------------------------------ */

function Detail({ phase, onClose }: { phase: Phase; onClose: () => void }) {
  const Icon = STATUS_ICON[phase.status];
  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: "flex", gap: 10, fontSize: 11.5, padding: "3px 0" }}>
      <span style={{ flex: "0 0 104px", color: "var(--cg-text-muted)" }}>
        {label}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          color: "var(--cg-text-primary)",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <aside
      aria-label={`${phase.name} details`}
      style={{
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--cg-border)",
        borderRadius: 4,
        padding: 12,
        overflowY: "auto",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 8,
        }}
      >
        <Icon size={14} color={STATUS_STYLE[phase.status].tint} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--cg-text-primary)",
          }}
        >
          {phase.name}
        </span>
        <button
          type="button"
          aria-label="Close phase details"
          onClick={onClose}
          style={{
            ...control,
            marginLeft: "auto",
            width: 22,
            padding: 0,
            justifyContent: "center",
            background: "transparent",
            color: "var(--cg-text-primary)",
            borderColor: "var(--cg-border)",
          }}
        >
          <X size={12} />
        </button>
      </header>

      <p
        style={{
          margin: "0 0 10px",
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--cg-text-primary)",
        }}
      >
        {phase.summary}
      </p>

      <div style={{ marginBottom: 10 }}>
        <ConfidenceBar pct={phase.confidence} />
      </div>

      {row("Status", phase.status)}
      {row("Estimated", beforeDetection(phase.median))}
      {row("Duration", formatDuration(phase.durationMinutes))}
      {row("MITRE", `${phase.mitreId} · ${phase.mitreTechnique}`)}
      {row("Assets", phase.assets.join(", "))}
      {row("Identities", phase.users.join(", "))}
      {row("Processes", phase.processes.join(", "))}
      {row("Sources", phase.sources.join(", ") || "—")}
      {row(
        "Related",
        phase.relatedFindings.length ? phase.relatedFindings.join(", ") : "—",
      )}

      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: "1px solid var(--cg-border-subtle)",
        }}
      >
        <div
          style={{
            fontSize: 9.5,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--cg-text-muted)",
            marginBottom: 5,
          }}
        >
          Evidence · {phase.evidenceCount} events
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {phase.evidence.length ? (
            phase.evidence.map((g) => (
              <span
                key={g.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "1px 8px",
                  fontSize: 11,
                  lineHeight: "17px",
                  borderRadius: 9,
                  border: "1px solid var(--cg-border)",
                  color: "var(--cg-text-primary)",
                }}
              >
                {g.label}
                <strong>{g.count}</strong>
              </span>
            ))
          ) : (
            <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
              No supporting evidence — this phase is drawn to keep the sequence
              honest about its gaps.
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: "1px solid var(--cg-border-subtle)",
          fontSize: 12,
          color: "var(--cg-text-primary)",
        }}
      >
        <div
          style={{
            fontSize: 9.5,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--cg-text-muted)",
            marginBottom: 4,
          }}
        >
          Investigate next
        </div>
        {phase.recommendation}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ *
 * Canvas
 * ------------------------------------------------------------------ */

export function AttackTimeline({
  event,
  wide,
}: {
  event: EventRow;
  /** Expanded canvas — details dock beside the chart rather than beneath it. */
  wide?: boolean;
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<echarts.ECharts | null>(null);

  const reconstruction = React.useMemo(
    () => buildReconstruction(event),
    [event],
  );
  const [threshold, setThreshold] = React.useState(0);
  const [sources, setSources] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);

  const visible = React.useMemo(
    () =>
      reconstruction.phases.filter(
        (p) =>
          p.confidence >= threshold &&
          (sources.length === 0 || p.sources.some((s) => sources.includes(s))),
      ),
    [reconstruction, threshold, sources],
  );

  const option = React.useMemo(
    () => buildOption(reconstruction, visible, selected),
    [reconstruction, visible, selected],
  );

  const selectedPhase =
    visible.find((p) => p.name === selected) ??
    (selected
      ? reconstruction.phases.find((p) => p.name === selected)
      : null) ??
    null;

  React.useEffect(() => {
    const dom = hostRef.current;
    if (!dom) return undefined;
    const chart = echarts.init(dom);
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(dom);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  // Click selects a phase. Registered against the live instance rather than in
  // the option, so re-rendering the option cannot drop the handler.
  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return undefined;
    const onClick = (p: { seriesName?: string; dataIndex: number }) => {
      if (p.seriesName === "Outlier") return;
      setSelected(visible[p.dataIndex]?.name ?? null);
    };
    chart.on("click", onClick);
    return () => {
      chart.off("click", onClick);
    };
  }, [visible]);

  /** Up / down walk the chain, Escape closes — the spec's keyboard model. */
  const onKeyDown = (e: KeyboardEvent) => {
    if (!visible.length) return;
    const at = visible.findIndex((p) => p.name === selected);
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const step = e.key === "ArrowUp" ? -1 : 1;
      const next =
        at < 0 ? 0 : Math.min(visible.length - 1, Math.max(0, at + step));
      setSelected(visible[next].name);
    } else if (e.key === "Escape") {
      setSelected(null);
    }
  };

  const keyRef = React.useRef(onKeyDown);
  keyRef.current = onKeyDown;
  React.useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;
    node.tabIndex = 0;
    const handler = (e: KeyboardEvent) => keyRef.current(e);
    node.addEventListener("keydown", handler);
    return () => node.removeEventListener("keydown", handler);
  }, []);

  const zoom = (factor: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    const opt = chart.getOption() as {
      dataZoom?: { start?: number; end?: number }[];
    };
    const z = opt.dataZoom?.[0] ?? { start: 0, end: 100 };
    const mid = ((z.start ?? 0) + (z.end ?? 100)) / 2;
    const half = (((z.end ?? 100) - (z.start ?? 0)) / 2) * factor;
    chart.dispatchAction({
      type: "dataZoom",
      start: Math.max(0, mid - half),
      end: Math.min(100, mid + half),
    });
  };

  const fit = () =>
    chartRef.current?.dispatchAction({ type: "dataZoom", start: 0, end: 100 });

  const reset = () => {
    setThreshold(0);
    setSources([]);
    setSelected(null);
    fit();
  };

  const exportPng = () => {
    const url = chartRef.current?.getDataURL({
      pixelRatio: 2,
      backgroundColor: CANVAS_BG,
    });
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `attack-timeline-${event.id}.png`;
    a.click();
  };

  const toggleSource = (s: string) =>
    setSources((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  return (
    <div
      ref={rootRef}
      role="application"
      aria-label="Attack timeline reconstruction"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        fontFamily: APP_FONT,
        outline: "none",
      }}
    >
      {/*
       * Chrome is canvas-only. In the drawer the quadrant is barely taller
       * than the eight phases it has to draw, and a header, a metadata row,
       * a toolbar and a legend consumed more of it than the chart itself —
       * every one of them restating something the canvas shows better.
       */}
      {wide && (
        <>
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--cg-text-primary)",
                }}
              >
                Attack timeline reconstruction
              </div>
              <div style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
                Estimated attack progression before detection.
              </div>
            </div>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10.5,
                color: "var(--cg-text-muted)",
              }}
            >
              Reconstructed {reconstruction.generatedAt.toLocaleTimeString()}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
              gap: 10,
              margin: "10px 0",
              flexShrink: 0,
            }}
          >
            <Meta
              label="Detection time"
              value={reconstruction.detectionAt.toLocaleString()}
            />
            <Meta
              label="Investigation confidence"
              value={<ConfidenceBar pct={reconstruction.confidence} />}
            />
            <Meta
              label="Events correlated"
              value={`${reconstruction.eventsCorrelated}`}
            />
            <Meta label="Sources" value={reconstruction.sources.join(" · ")} />
          </div>
        </>
      )}

      {/* ── Toolbar, filters, legend ───────────────────────────────── */}
      {wide && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            paddingBottom: 8,
            borderBottom: "1px solid var(--cg-border-subtle)",
            flexShrink: 0,
          }}
        >
          <button type="button" style={control} onClick={() => zoom(0.6)}>
            <ZoomIn size={12} /> In
          </button>
          <button type="button" style={control} onClick={() => zoom(1.6)}>
            <ZoomOut size={12} /> Out
          </button>
          <button type="button" style={control} onClick={fit}>
            <Crosshair size={12} /> Fit
          </button>
          <button type="button" style={control} onClick={reset}>
            Reset
          </button>
          <button type="button" style={control} onClick={exportPng}>
            <Download size={12} /> Export
          </button>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--cg-text-muted)",
            }}
          >
            Confidence ≥
            <input
              aria-label="Confidence threshold"
              type="range"
              min={0}
              max={95}
              step={5}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ width: 92 }}
            />
            <strong style={{ color: "var(--cg-text-primary)" }}>
              {threshold}%
            </strong>
          </span>

          {reconstruction.sources.map((s) => (
            <label
              key={s}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--cg-text-primary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={sources.length === 0 || sources.includes(s)}
                onChange={() => toggleSource(s)}
              />
              {s}
            </label>
          ))}

          <span style={{ marginLeft: "auto" }}>
            <Legend />
          </span>
        </div>
      )}

      {/* ── Canvas + details ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: wide ? 8 : 0,
          display: "grid",
          gap: 10,
          gridTemplateColumns:
            wide && selectedPhase
              ? "minmax(0,1fr) minmax(260px, 320px)"
              : "1fr",
          gridTemplateRows:
            !wide && selectedPhase ? "minmax(220px,1fr) auto" : "1fr",
        }}
      >
        {visible.length ? (
          <div
            style={{
              position: "relative",
              minHeight: 220,
              border: "1px solid var(--cg-border)",
              borderRadius: 4,
              background: CANVAS_BG,
              overflow: "hidden",
            }}
          >
            <div ref={hostRef} style={{ width: "100%", height: "100%" }} />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 220,
              padding: 24,
              border: "1px dashed var(--cg-border)",
              borderRadius: 4,
              textAlign: "center",
            }}
          >
            <Search size={18} color="var(--cg-text-muted)" />
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--cg-text-primary)",
              }}
            >
              No attack timeline available
            </div>
            <div style={{ fontSize: 11.5, color: "var(--cg-text-muted)" }}>
              Insufficient correlated evidence at this threshold.
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 16,
                fontSize: 11.5,
                color: "var(--cg-text-muted)",
                textAlign: "left",
              }}
            >
              <li>Lower the confidence threshold</li>
              <li>Include additional evidence sources</li>
              <li>Expand the search window</li>
            </ul>
          </div>
        )}

        {selectedPhase && (
          <Detail phase={selectedPhase} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}

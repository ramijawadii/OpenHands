/* eslint-disable i18next/no-literal-string -- dependency graph canvas */
import React from "react";
import * as echarts from "echarts";
import {
  Ban,
  CircleCheck,
  CircleHelp,
  Crosshair,
  Download,
  Flame,
  Star,
  TriangleAlert,
  X,
} from "lucide-react";
import { APP_FONT } from "./theme";
import { svgDataUri } from "./SvgIcon";
import type { EventRow } from "./event-data";
import {
  buildTopology,
  nextSteps,
  type Direction,
  type EdgeKind,
  type GraphNode,
  type Health,
  type NodeKind,
  type Topology,
} from "./dependency-graph";

/**
 * Dependency Graph, to the graph UX spec (v1.0).
 *
 * Built for triage: the affected resource stays centred, upstream converges
 * into it and downstream diverges out of it, and every node states its health,
 * risk and open-signal counts on the canvas rather than behind a click. An
 * analyst should be able to say which dependency is probably to blame without
 * opening anything.
 *
 * Three things the spec forced that are worth keeping:
 *
 *  - **Health is never colour alone.** Each node carries a status glyph beside
 *    its name as well as a coloured ring, because a red ring and an amber one
 *    are the same ring to a lot of people.
 *  - **Exactly one root cause.** The worst upstream node gets the star.
 *    Blaming three nodes is the same as blaming none.
 *  - **Chrome is canvas-only.** In the drawer the graph gets the whole box; a
 *    toolbar, a filter row and a legend would leave no room for the thing they
 *    describe.
 */

const CANVAS_BG = "#ffffff";
const INK = "#1f2937";
const MUTED = "#5f6b7a";
const RULE = "#d5d9df";

const HEALTH_COLOR: Record<Health, string> = {
  Healthy: "#2f9e5f",
  Warning: "#d9a441",
  Critical: "#c74634",
  Unknown: "#9aa3af",
};

const HEALTH_GLYPH: Record<Health, string> = {
  Healthy: "✔",
  Warning: "!",
  Critical: "✖",
  Unknown: "?",
};

const HEALTH_ICON: Record<
  Health,
  React.ComponentType<{ size?: number; color?: string }>
> = {
  Healthy: CircleCheck,
  Warning: TriangleAlert,
  Critical: Ban,
  Unknown: CircleHelp,
};

/** Node marks are the real vendor iconography, tinted per resource class. */
const KIND_ICON: Record<NodeKind, [string, string]> = {
  VM: ["azure_virtual_machine", "#0078d4"],
  Container: ["azure_virtual_machine", "#0f766e"],
  Storage: ["azure_storage_accounts", "#d9a441"],
  Database: ["azure_sql_database", "#c74634"],
  Function: ["azure_function_apps", "#c65eb4"],
  LoadBalancer: ["azure_load_balancers", "#0078d4"],
  Identity: ["azure_management_groups", "#6d28d9"],
  Network: ["azure_virtual_networks", "#0369a1"],
  KeyVault: ["azure_private_link", "#8661c5"],
  Service: ["azure_function_apps", "#0f766e"],
};

/** Edge style states the relationship; the legend spells each one out. */
const EDGE_STYLE: Record<
  EdgeKind,
  { type: "solid" | "dashed" | "dotted"; label: string }
> = {
  depends: { type: "solid", label: "Depends on" },
  network: { type: "dashed", label: "Network" },
  identity: { type: "dotted", label: "Identity" },
  replication: { type: "solid", label: "Replication" },
};

type LayoutId = "hierarchical" | "radial" | "force";
type DepthId = 1 | 2 | 99;

/* ------------------------------------------------------------------ *
 * Option
 * ------------------------------------------------------------------ */

/**
 * One badge only. Alerts outrank findings because an alert is firing now and a
 * finding is standing debt; showing both turns every label into a paragraph.
 */
function badgeFor(n: GraphNode): string {
  if (n.alerts > 0) return `  ${n.alerts}⚠`;
  if (n.findings > 0) return `  ${n.findings}◆`;
  return "";
}

/**
 * The drawer gets a four-line tooltip, the canvas the full record.
 *
 * A 270px card with eleven rows is taller than the embedded canvas itself, so
 * it covers the graph it is describing. Compact keeps only what decides
 * whether to open the node at all.
 */
function compactTooltipHtml(n: GraphNode): string {
  return [
    `<div style="font-family:${APP_FONT};font-size:11px;max-width:190px">`,
    `<div style="font-weight:700;color:${INK}">${HEALTH_GLYPH[n.health]} ${n.name}</div>`,
    `<div style="color:${MUTED}">${n.kind} · ${n.health} · risk ${n.risk}</div>`,
    n.alerts || n.findings
      ? `<div style="color:${MUTED}">${n.alerts} alerts · ${n.findings} findings</div>`
      : "",
    n.rootCause
      ? `<div style="color:#b45309;font-weight:600">★ Probable root cause</div>`
      : "",
    `</div>`,
  ].join("");
}

function tooltipHtml(n: GraphNode): string {
  const row = (k: string, v: string) =>
    `<tr><td style="color:${MUTED};padding:1px 10px 1px 0;white-space:nowrap">${k}</td>` +
    `<td style="color:${INK};font-weight:600">${v}</td></tr>`;
  return [
    `<div style="font-family:${APP_FONT};font-size:11.5px;max-width:270px">`,
    `<div style="font-weight:700;font-size:12.5px;color:${INK};margin-bottom:5px">`,
    `${HEALTH_GLYPH[n.health]} ${n.name}`,
    `</div>`,
    `<table style="border-collapse:collapse">`,
    row("Type", n.kind),
    row("Health", n.health),
    row("Risk", `${n.risk}`),
    row("Owner", n.owner),
    row("Cloud", `${n.cloud} · ${n.region}`),
    row("Environment", n.env),
    row("Alerts", `${n.alerts}`),
    row("Open findings", `${n.findings}`),
    row("Dependencies", `${n.dependencies}`),
    row("Dependents", `${n.dependents}`),
    row("Last change", `${n.lastChangeMinutes}m ago`),
    `</table>`,
    n.rootCause
      ? `<div style="margin-top:6px;color:#b45309;font-weight:600">★ Probable root cause</div>`
      : "",
    `<div style="margin-top:6px;color:${MUTED}">Click for details</div>`,
    `</div>`,
  ].join("");
}

/**
 * Positions per layout.
 *
 * Hierarchical is the default and the only one that reads as a *chain*:
 * upstream on the left, the affected resource in the centre, downstream on the
 * right. Radial and force exist for dense topologies where the chain stops
 * being the interesting structure.
 */
function positioned(nodes: GraphNode[], layout: LayoutId) {
  if (layout === "force")
    return nodes.map((n) => ({ ...n, x: undefined, y: undefined }));

  const byBand = new Map<string, GraphNode[]>();
  nodes.forEach((n) => {
    const key = `${n.direction}:${n.depth}`;
    const list = byBand.get(key);
    if (list) list.push(n);
    else byBand.set(key, [n]);
  });

  return nodes.map((n) => {
    const band = byBand.get(`${n.direction}:${n.depth}`) ?? [n];
    const i = band.indexOf(n);
    const spread = (i - (band.length - 1) / 2) / Math.max(1, band.length);

    if (layout === "radial") {
      const dirAngle = n.direction === "upstream" ? Math.PI : 0;
      const angle = dirAngle + spread * Math.PI * 0.9;
      const r = n.depth * 190;
      return {
        ...n,
        x: 500 + Math.cos(angle) * r,
        y: 320 + Math.sin(angle) * r,
      };
    }

    const sign = n.direction === "upstream" ? -1 : 1;
    return {
      ...n,
      x: 500 + sign * n.depth * 230,
      y: 320 + spread * 420,
    };
  });
}

function isAdjacent(
  edges: { source: string; target: string }[],
  a: string,
  b: string,
): boolean {
  return edges.some(
    (e) =>
      (e.source === a && e.target === b) || (e.target === a && e.source === b),
  );
}

/**
 * Right-angle ("taxi") routing for the hierarchical layout.
 *
 * A dependency chain is read as *levels*, and orthogonal connectors make the
 * level boundaries explicit: every edge leaves its source horizontally, turns
 * once at the midpoint between the two columns, and enters its target
 * horizontally. Curves cross each other ambiguously at this density, and the
 * eye cannot tell which line arrived where.
 *
 * Radial and force keep straight/curved links, where an elbow would be noise.
 */
function elbow(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number[][] {
  const mid = (a.x + b.x) / 2;
  if (Math.abs(a.y - b.y) < 1)
    return [
      [a.x, a.y],
      [b.x, b.y],
    ];
  return [
    [a.x, a.y],
    [mid, a.y],
    [mid, b.y],
    [b.x, b.y],
  ];
}

function buildOption(
  topo: Topology,
  nodes: GraphNode[],
  layout: LayoutId,
  selected: string | null,
  blastMode: boolean,
  wide: boolean,
): echarts.EChartsOption {
  const placed = positioned(nodes, layout);
  const ids = new Set(nodes.map((n) => n.id));
  const edges = topo.edges.filter(
    (e) => ids.has(e.source) && ids.has(e.target),
  );
  const at = new Map(placed.map((n) => [n.id, n]));
  const taxi = layout === "hierarchical";

  const edgeOpacity = (e: { source: string; target: string }) =>
    selected && !(e.source === selected || e.target === selected) ? 0.22 : 1;

  const option = {
    backgroundColor: CANVAS_BG,
    textStyle: { color: INK, fontFamily: APP_FONT },
    animationDuration: 450,
    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: "#ffffff",
      borderColor: RULE,
      borderWidth: 1,
      padding: [8, 10],
      extraCssText: "box-shadow:0 6px 20px rgba(15,20,26,.16);",
      formatter: (params: unknown) => {
        const p = params as { dataType?: string; dataIndex: number };
        if (p.dataType === "edge") {
          const e = edges[p.dataIndex];
          return `<div style="font-family:${APP_FONT};font-size:11.5px">${EDGE_STYLE[e.kind].label}</div>`;
        }
        const n = placed[p.dataIndex];
        return wide ? tooltipHtml(n) : compactTooltipHtml(n);
      },
    },
    series: [
      {
        type: "graph",
        layout: layout === "force" ? "force" : "none",
        ...(taxi ? { coordinateSystem: "cartesian2d" as const } : {}),
        z: 2,
        force: { repulsion: 320, edgeLength: 140, gravity: 0.06 },
        roam: true,
        draggable: layout === "force",
        edgeSymbol: ["none", "arrow"],
        edgeSymbolSize: 7,
        label: {
          show: true,
          position: "bottom",
          distance: 8,
          fontSize: 10.5,
          fontFamily: APP_FONT,
          color: INK,
          formatter: (p: unknown) => {
            const n = placed[(p as { dataIndex: number }).dataIndex];
            return `${HEALTH_GLYPH[n.health]} ${n.name}${badgeFor(n)}`;
          },
        },
        emphasis: { focus: "adjacency", scale: false },
        data: placed.map((n) => {
          const [slug, tint] = KIND_ICON[n.kind];
          const size = n.direction === "self" ? 46 : 30;
          // In blast-radius mode intensity tracks distance from the incident,
          // so what is directly affected separates from what is merely reached.
          const fade = blastMode ? Math.max(0.25, 1 - n.depth * 0.32) : 1;
          const dim =
            selected && selected !== n.id && !isAdjacent(edges, selected, n.id);
          return {
            id: n.id,
            name: n.name,
            // On a cartesian system a graph node is placed by `value`, not by
            // `x`/`y` — those are pixel coordinates and are ignored there, which
            // left every node unplaced and the canvas showing only connectors.
            ...(taxi ? { value: [n.x, n.y] } : { x: n.x, y: n.y }),
            symbol: svgDataUri(slug, tint, size) ?? "circle",
            symbolSize: size,
            itemStyle: {
              opacity: dim ? 0.3 : fade,
              borderColor: HEALTH_COLOR[n.health],
              borderWidth: n.id === selected ? 3 : 2,
              shadowBlur: n.rootCause ? 14 : 0,
              shadowColor: "#f59e0b",
            },
            label: { opacity: dim ? 0.35 : 1 },
          };
        }),
        // Taxi routing is drawn by the `lines` series below, so the graph's
        // own links are suppressed rather than drawn twice.
        links: taxi
          ? []
          : edges.map((e) => ({
              source: e.source,
              target: e.target,
              lineStyle: {
                color: "#b9c0ca",
                width: e.kind === "replication" ? 2.4 : 1.3,
                type: EDGE_STYLE[e.kind].type,
                curveness: layout === "radial" ? 0.12 : 0,
                opacity: edgeOpacity(e),
              },
            })),
      },
      ...(taxi
        ? [
            {
              type: "lines" as const,
              polyline: true,
              coordinateSystem: "cartesian2d" as const,
              silent: true,
              symbol: ["none", "arrow"] as [string, string],
              symbolSize: 7,
              z: 1,
              data: edges
                .map((e) => {
                  const a = at.get(e.source);
                  const b = at.get(e.target);
                  if (!a?.x || !b?.x) return null;
                  return {
                    coords: elbow(
                      { x: a.x, y: a.y as number },
                      { x: b.x, y: b.y as number },
                    ),
                    lineStyle: {
                      color: "#b9c0ca",
                      width: e.kind === "replication" ? 2.4 : 1.3,
                      type: EDGE_STYLE[e.kind].type,
                      opacity: edgeOpacity(e),
                    },
                  };
                })
                .filter(Boolean),
            },
          ]
        : []),
    ],
    // The `lines` series needs a coordinate system; a hidden 1:1 grid keeps the
    // node positions and the connectors in the same space.
    ...(taxi
      ? {
          grid: { left: 0, right: 0, top: 0, bottom: 0, show: false },
          xAxis: { type: "value" as const, show: false, min: 0, max: 1000 },
          yAxis: { type: "value" as const, show: false, min: 0, max: 640 },
        }
      : {}),
  };

  return option as echarts.EChartsOption;
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

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <span
      role="group"
      aria-label={label}
      style={{
        display: "inline-flex",
        border: `1px solid ${RULE}`,
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          onClick={() => onChange(o.id)}
          style={{
            height: 22,
            padding: "0 8px",
            fontSize: 11,
            fontFamily: APP_FONT,
            border: "none",
            cursor: "pointer",
            background: value === o.id ? "#eef1f6" : "#ffffff",
            color: value === o.id ? INK : "#6b7280",
            fontWeight: value === o.id ? 700 : 500,
          }}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}

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

function Legend() {
  const chip = (swatch: React.ReactNode, label: string, key: string) => (
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

  const ring = (h: Health) => (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        border: `2px solid ${HEALTH_COLOR[h]}`,
        boxSizing: "border-box",
      }}
    />
  );

  const line = (type: "solid" | "dashed" | "dotted", width = 1.5) => (
    <span
      style={{
        width: 16,
        borderTop: `${width}px ${type} #b9c0ca`,
      }}
    />
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {chip(ring("Healthy"), "Healthy", "h")}
      {chip(ring("Warning"), "Warning", "w")}
      {chip(ring("Critical"), "Critical", "c")}
      {chip(ring("Unknown"), "Unknown", "u")}
      {chip(<Star size={10} color="#b45309" />, "Root cause", "r")}
      {chip(line("solid"), "Depends on", "e1")}
      {chip(line("dashed"), "Network", "e2")}
      {chip(line("dotted"), "Identity", "e3")}
      {chip(line("solid", 2.6), "Replication", "e4")}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Details
 * ------------------------------------------------------------------ */

function Detail({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const Icon = HEALTH_ICON[node.health];
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
      aria-label={`${node.name} details`}
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
          marginBottom: 6,
        }}
      >
        <Icon size={14} color={HEALTH_COLOR[node.health]} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--cg-text-primary)",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.name}
        </span>
        <button
          type="button"
          aria-label="Close node details"
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

      {node.rootCause && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
            padding: "3px 8px",
            fontSize: 11,
            borderRadius: 9,
            border: "1px solid #b45309",
            color: "var(--cg-text-primary)",
          }}
        >
          <Star size={11} color="#b45309" /> Probable root cause
        </div>
      )}

      <p
        style={{
          margin: "0 0 10px",
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--cg-text-primary)",
        }}
      >
        {node.summary}
      </p>

      {row("Type", node.kind)}
      {row("Health", node.health)}
      {row(
        "Risk",
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {node.risk}
          {node.risk >= 80 && <Flame size={11} color={HEALTH_COLOR.Critical} />}
        </span>,
      )}
      {row("Owner", node.owner)}
      {row("Cloud", `${node.cloud} · ${node.region}`)}
      {row("Environment", node.env)}
      {row("Dependencies", String(node.dependencies))}
      {row("Dependents", String(node.dependents))}
      {row("Alerts", String(node.alerts))}
      {row("Open findings", String(node.findings))}
      {row("Incidents", String(node.incidents))}
      {row(
        "Last deployment",
        `${Math.round(node.lastDeployMinutes / 60)}h ago`,
      )}
      {row("Recent changes", String(node.recentChanges))}
      {row(
        "Related",
        node.relatedFindings.length ? node.relatedFindings.join(", ") : "—",
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
          Suggested next steps
        </div>
        <ol
          style={{
            margin: 0,
            paddingLeft: 16,
            display: "grid",
            gap: 4,
            fontSize: 11.5,
            color: "var(--cg-text-primary)",
          }}
        >
          {nextSteps(node).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ *
 * Canvas
 * ------------------------------------------------------------------ */

export function DependencyGraph({
  event,
  wide,
}: {
  event: EventRow;
  /** Expanded canvas — chrome and the details panel only appear here. */
  wide?: boolean;
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<echarts.ECharts | null>(null);

  const topo = React.useMemo(() => buildTopology(event), [event]);
  const [direction, setDirection] = React.useState<Direction | "both">("both");
  const [depth, setDepth] = React.useState<DepthId>(99);
  const [layout, setLayout] = React.useState<LayoutId>("hierarchical");
  const [criticalOnly, setCriticalOnly] = React.useState(false);
  const [blastMode, setBlastMode] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);

  const visible = React.useMemo(
    () =>
      topo.nodes.filter(
        (n) =>
          (n.direction === "self" ||
            direction === "both" ||
            n.direction === direction) &&
          n.depth <= depth &&
          (!criticalOnly ||
            n.direction === "self" ||
            n.health === "Critical" ||
            n.health === "Warning"),
      ),
    [topo, direction, depth, criticalOnly],
  );

  const option = React.useMemo(
    () =>
      buildOption(topo, visible, layout, selected, blastMode, Boolean(wide)),
    [topo, visible, layout, selected, blastMode, wide],
  );

  const selectedNode = visible.find((n) => n.id === selected) ?? null;

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

  // Registered against the live instance, so re-rendering the option cannot
  // silently drop the handler.
  React.useEffect(() => {
    const chart = chartRef.current;
    // Selection belongs to the full canvas. In the drawer there is nowhere to
    // put the details panel, so a click would dim half the graph and show
    // nothing for it.
    if (!chart || !wide) return undefined;
    const onClick = (p: { dataType?: string; dataIndex: number }) => {
      if (p.dataType === "edge") return;
      setSelected(visible[p.dataIndex]?.id ?? null);
    };
    chart.on("click", onClick);
    return () => {
      chart.off("click", onClick);
    };
  }, [visible, wide]);

  /** Arrows walk the node list, Escape closes — the spec's keyboard model. */
  const onKey = (e: KeyboardEvent) => {
    if (!visible.length) return;
    if (e.key === "Escape") {
      setSelected(null);
      return;
    }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
      return;
    e.preventDefault();
    const at = visible.findIndex((n) => n.id === selected);
    const step = e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 1;
    const next =
      at < 0 ? 0 : Math.min(visible.length - 1, Math.max(0, at + step));
    setSelected(visible[next].id);
  };

  const keyRef = React.useRef(onKey);
  keyRef.current = onKey;
  React.useEffect(() => {
    const node = rootRef.current;
    if (!node || !wide) return undefined;
    node.tabIndex = 0;
    const handler = (e: KeyboardEvent) => keyRef.current(e);
    node.addEventListener("keydown", handler);
    return () => node.removeEventListener("keydown", handler);
  }, [wide]);

  const centre = () => {
    setSelected(null);
    chartRef.current?.setOption(option, { notMerge: true });
  };

  const reset = () => {
    setDirection("both");
    setDepth(99);
    setLayout("hierarchical");
    setCriticalOnly(false);
    setBlastMode(false);
    setSelected(null);
  };

  const exportPng = () => {
    const url = chartRef.current?.getDataURL({
      pixelRatio: 2,
      backgroundColor: CANVAS_BG,
    });
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `dependency-graph-${event.id}.png`;
    a.click();
  };

  return (
    <div
      ref={rootRef}
      role="application"
      aria-label="Dependency graph"
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
       * Chrome is canvas-only: in the drawer the graph needs the whole box,
       * and a header restating the resource already named above it would be
       * the first thing to cut anyway.
       */}
      {wide && (
        <>
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
                Dependency graph
              </div>
              <div style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
                Relationships surrounding the affected resource.
              </div>
            </div>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10.5,
                color: "var(--cg-text-muted)",
              }}
            >
              Mapped {topo.generatedAt.toLocaleTimeString()}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 10,
              margin: "10px 0",
              flexShrink: 0,
            }}
          >
            <Meta label="Resource" value={event.resource} />
            <Meta label="Cloud" value={`${event.provider} · ${event.region}`} />
            <Meta label="Environment" value={event.env} />
            <Meta
              label="Blast radius"
              value={`${topo.blastRadius} resources`}
            />
            <Meta label="Dependencies" value={String(topo.dependencyCount)} />
          </div>

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
            <Segmented
              label="Direction"
              value={direction}
              onChange={setDirection}
              options={[
                { id: "upstream" as const, label: "Upstream" },
                { id: "downstream" as const, label: "Downstream" },
                { id: "both" as const, label: "Both" },
              ]}
            />
            <Segmented
              label="Depth"
              value={depth}
              onChange={setDepth}
              options={[
                { id: 1 as DepthId, label: "1" },
                { id: 2 as DepthId, label: "2" },
                { id: 99 as DepthId, label: "All" },
              ]}
            />
            <Segmented
              label="Layout"
              value={layout}
              onChange={setLayout}
              options={[
                { id: "hierarchical" as const, label: "Hierarchical" },
                { id: "radial" as const, label: "Radial" },
                { id: "force" as const, label: "Force" },
              ]}
            />
            <label
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
                checked={criticalOnly}
                onChange={() => setCriticalOnly((v) => !v)}
              />
              Critical only
            </label>
            <label
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
                checked={blastMode}
                onChange={() => setBlastMode((v) => !v)}
              />
              Blast radius
            </label>
            <button type="button" style={control} onClick={centre}>
              <Crosshair size={12} /> Centre
            </button>
            <button type="button" style={control} onClick={reset}>
              Reset
            </button>
            <button type="button" style={control} onClick={exportPng}>
              <Download size={12} /> Export
            </button>
            <span style={{ marginLeft: "auto" }}>
              <Legend />
            </span>
          </div>
        </>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: wide ? 8 : 0,
          display: "grid",
          gap: 10,
          gridTemplateColumns:
            wide && selectedNode ? "minmax(0,1fr) minmax(260px, 320px)" : "1fr",
          gridTemplateRows:
            !wide && selectedNode ? "minmax(200px,1fr) auto" : "1fr",
        }}
      >
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

        {selectedNode && (
          <Detail node={selectedNode} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}

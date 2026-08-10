/* eslint-disable i18next/no-literal-string -- simulation charts */
/**
 * The four simulation phases, drawn.
 *
 * One mount hook, four options. Each chart answers the question its phase
 * exists to answer, and none of them is decorative:
 *
 * - **Impact propagation** — the shape of the reachability, because "47
 *   resources" does not tell you whether that is one fan-out or a five-hop
 *   chain, and those call for different decisions.
 * - **Blast radius** — where the impact lands by environment, since prod
 *   weighs 3× staging and 10× dev in the classification.
 * - **Propagation** — the hop histogram, which is how you see a cascade: mass
 *   at hop 3+ is second and third-order breakage (`BR-003`).
 * - **Reversibility** — which actions have a recovery artifact and which do
 *   not, per partial-execution state.
 *
 * **Charts draw on a white canvas in both themes.** This follows the
 * dependency graph, which made the same call: a diagram is a figure, not a
 * region of the page, and giving it a light ground means the service marks
 * render in their own brand colours instead of being flipped to stay legible
 * on a dark panel. ECharts cannot read CSS custom properties, so the palette
 * is a literal one either way.
 */
import React from "react";
import * as echarts from "echarts";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";
import type { BlastRadiusReport, ImpactNode } from "./brr-model";
import { markUri } from "./resource-marks";

interface Palette {
  ink: string;
  muted: string;
  rule: string;
  accent: string;
  critical: string;
  high: string;
  medium: string;
  low: string;
  surface: string;
}

const CANVAS: Palette = {
  ink: "#1f2937",
  muted: "#5f6b7a",
  rule: "#d5d9df",
  accent: "#2f5fd0",
  critical: "#c74634",
  high: "rgb(224, 154, 45)",
  medium: "#9a7b1f",
  low: "#2f9e5f",
  surface: "#ffffff",
};

/** Mount, set option, resize with the container, dispose on unmount. */
function useChart(
  option: echarts.EChartsOption,
): React.RefObject<HTMLDivElement | null> {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!ref.current) return undefined;
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chart.setOption(option);
    // The drawer resizes constantly — docked, overlay, fullscreen — and an
    // ECharts instance does not follow its container without being told.
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [option]);

  return ref;
}

function Chart({
  option,
  height,
}: {
  option: echarts.EChartsOption;
  height: number;
}) {
  const ref = useChart(option);
  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height,
        background: CANVAS.surface,
        border: "1px solid var(--cg-border-subtle)",
        borderRadius: 6,
      }}
    />
  );
}

const TONE_FOR = (p: Palette, cls: string) =>
  ({
    CRITICAL: p.critical,
    HIGH: p.high,
    MEDIUM: p.medium,
    LOW: p.low,
  })[cls] ?? p.muted;

/* ------------------------------------------------------------------ *
 * Impact propagation — the reachability graph
 * ------------------------------------------------------------------ */

export function ImpactPropagationChart({
  action,
  nodes: visible,
}: {
  action: { resource: string };
  /**
   * The filtered impact set — the chart draws exactly what it is given.
   *
   * It takes the nodes rather than the whole report so filtering happens
   * before layout: the survivors re-space instead of leaving holes where the
   * filtered ones used to be.
   */
  nodes: ImpactNode[];
}) {
  const p = CANVAS;

  const option = React.useMemo<echarts.EChartsOption>(() => {
    // Laid out by hop on the x-axis so the chart reads left-to-right as
    // distance from the target — a force layout would scramble the one
    // dimension that matters here.
    const byHop = new Map<number, ImpactNode[]>();
    visible.forEach((n) => {
      byHop.set(n.hop, [...(byHop.get(n.hop) ?? []), n]);
    });

    const nodes: echarts.GraphSeriesOption["data"] = [
      {
        name: action.resource,
        x: 0,
        y: 0,
        symbolSize: 34,
        // The real service mark where one exists; a circle only where it does
        // not, so a missing icon is visibly missing rather than silently
        // substituted with something that means a different service.
        symbol: markUri(action.resource, p.accent, 30) ?? "circle",
        itemStyle: { color: p.accent },
        label: {
          color: p.ink,
          fontSize: 10,
          fontWeight: "bold",
        },
      },
    ];

    const links: echarts.GraphSeriesOption["links"] = [];
    [...byHop.keys()]
      .sort((a, b) => a - b)
      .forEach((hop) => {
        const group = byHop.get(hop) ?? [];
        group.forEach((n, i) => {
          const tone = TONE_FOR(p, n.criticality);
          nodes.push({
            name: n.resource,
            x: hop * 190,
            y: (i - (group.length - 1) / 2) * 78,
            // Size still carries score, so criticality (colour) and magnitude
            // (size) stay independent readings of the same node.
            symbolSize: 18 + Math.min(20, n.score * 10),
            symbol: markUri(n.resource, tone, 26) ?? "circle",
            itemStyle: { color: tone },
            label: { color: p.ink, fontSize: 9 },
          });
          const parent =
            hop === 1
              ? action.resource
              : (byHop.get(hop - 1)?.[0]?.resource ?? action.resource);
          links.push({
            source: parent,
            target: n.resource,
            label: { show: false },
            lineStyle: { width: 1 + n.score, curveness: 0.12, color: p.rule },
          });
        });
      });

    return {
      backgroundColor: p.surface,
      tooltip: {
        formatter: (params: unknown) => {
          const d = params as { name: string };
          const n = visible.find((x) => x.resource === d.name);
          if (!n) return d.name;
          return `${n.resource}<br/>${n.edgeClass} · hop ${n.hop} · score ${n.score.toFixed(2)}`;
        },
      },
      animationDurationUpdate: 900,
      animationEasingUpdate: "quinticInOut",
      series: [
        {
          type: "graph",
          layout: "none",
          roam: true,
          symbolSize: 28,
          label: { show: true, position: "bottom", fontFamily: APP_FONT },
          edgeSymbol: ["circle", "arrow"],
          edgeSymbolSize: [3, 8],
          data: nodes,
          links,
          lineStyle: { opacity: 0.8, width: 1.5, curveness: 0 },
        },
      ],
    };
  }, [action.resource, visible, p]);

  return <Chart option={option} height={280} />;
}

/* ------------------------------------------------------------------ *
 * Blast radius — where it lands, as a tree
 * ------------------------------------------------------------------ */

export function BlastRadiusChart({ report }: { report: BlastRadiusReport }) {
  const p = CANVAS;

  const option = React.useMemo<echarts.EChartsOption>(() => {
    const byEnv = new Map<string, ImpactNode[]>();
    report.impact.forEach((n) => {
      byEnv.set(n.environment, [...(byEnv.get(n.environment) ?? []), n]);
    });

    const root = {
      name: `${report.class} blast radius`,
      children: [...byEnv.entries()].map(([env, nodes]) => ({
        name: `${env} · ${nodes.length}`,
        // Non-production branches start collapsed: prod carries 3× the
        // classification weight, so it is what should be open on arrival.
        collapsed: env !== "prod",
        children: nodes.map((n) => ({
          name: `${n.resource} (${n.score.toFixed(2)})`,
          value: n.score,
          // Same service marks as the propagation graph, so a queue is a queue
          // in both pictures rather than a circle in one and an icon in the
          // other.
          symbol:
            markUri(n.resource, TONE_FOR(p, n.criticality), 18) ?? "circle",
          symbolSize: 18,
          itemStyle: { color: TONE_FOR(p, n.criticality) },
        })),
      })),
    };

    return {
      backgroundColor: p.surface,
      tooltip: { trigger: "item", triggerOn: "mousemove" },
      series: [
        {
          type: "tree",
          data: [root],
          top: "2%",
          left: "12%",
          bottom: "2%",
          right: "26%",
          symbolSize: 7,
          label: {
            position: "left",
            verticalAlign: "middle",
            align: "right",
            fontSize: 9,
            color: p.ink,
            fontFamily: APP_FONT,
          },
          leaves: {
            label: {
              position: "right",
              verticalAlign: "middle",
              align: "left",
              color: p.muted,
              fontSize: 9,
            },
          },
          emphasis: { focus: "descendant" },
          expandAndCollapse: true,
          animationDuration: 500,
          animationDurationUpdate: 700,
          lineStyle: { color: p.rule },
        },
      ],
    };
  }, [report, p]);

  return <Chart option={option} height={300} />;
}

/* ------------------------------------------------------------------ *
 * Propagation — the hop histogram
 * ------------------------------------------------------------------ */

export function PropagationChart({ report }: { report: BlastRadiusReport }) {
  const p = CANVAS;

  const option = React.useMemo<echarts.EChartsOption>(() => {
    const maxHop = 5;
    // Summed impact score, not a headcount. Six low-scoring nodes at hop 4 and
    // one financial queue at hop 1 are not the same finding, and a bar chart
    // of counts would draw them as though the six mattered more.
    const rows = Array.from({ length: maxHop + 1 }, (_, hop) => {
      const at = report.impact.filter((n) => n.hop === hop);
      return {
        hop,
        mass: Number(at.reduce((sum, n) => sum + n.score, 0).toFixed(2)),
        count: at.length,
      };
    });

    return {
      backgroundColor: p.surface,
      grid: { top: 16, left: 40, right: 12, bottom: 28 },
      tooltip: {
        trigger: "axis",
        formatter: (params: unknown) => {
          const arr = params as { dataIndex: number }[];
          const r = rows[arr[0]?.dataIndex ?? 0];
          if (!r) return "";
          return `Hop ${r.hop}<br/>${r.count} resource(s)<br/>risk mass ${r.mass.toFixed(2)}`;
        },
      },
      xAxis: {
        type: "category",
        data: rows.map((r) => `Hop ${r.hop}`),
        axisLabel: { color: p.muted, fontSize: 10, fontFamily: APP_FONT },
        axisLine: { lineStyle: { color: p.rule } },
      },
      yAxis: {
        type: "value",
        name: "risk mass",
        nameTextStyle: { color: p.muted, fontSize: 9 },
        axisLabel: { color: p.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: p.rule, opacity: 0.5 } },
      },
      series: [
        {
          type: "bar",
          data: rows.map((r) => ({
            value: r.mass,
            // Hop 3+ is second and third-order breakage — the thing a
            // traversal that truncates at hop 1 would never have found.
            itemStyle: { color: r.hop >= 3 ? p.high : p.accent },
          })),
          showBackground: true,
          backgroundStyle: { color: "rgba(180, 180, 180, 0.14)" },
          barMaxWidth: 34,
        },
      ],
    };
  }, [report, p]);

  return <Chart option={option} height={220} />;
}

/* ------------------------------------------------------------------ *
 * Reversibility — recovery artifact per partial state
 * ------------------------------------------------------------------ */

/**
 * What to call a plan state.
 *
 * `S0…S5` was the obvious shorthand and the wrong one: in a diagram that also
 * carries AWS service marks, `S3` reads as Amazon S3 rather than "state 3".
 * Naming the states for what they are removes the collision entirely.
 */
function stateName(stepsCompleted: number): string {
  return stepsCompleted === 0 ? "Start" : `After ${stepsCompleted}`;
}

export function ReversibilityChart({ report }: { report: BlastRadiusReport }) {
  const p = CANVAS;

  const option = React.useMemo<echarts.EChartsOption>(() => {
    /*
     * Horizontal spine, with the labels on staggered rows.
     *
     * Registry action IDs run to 27 characters, so two of them centred on
     * adjacent edges collide at any spacing that still fits the drawer. The
     * fix is not more space, it is more rows: forward labels alternate between
     * two heights above the spine and inverse labels between two heights
     * below, so neighbouring labels are never on the same line and the ones
     * that share a line are two steps — over 500px — apart.
     *
     * `rotate: 0` is explicit because ECharts otherwise aligns an edge label
     * to its edge, which is what turned the labels on their side when this was
     * laid out vertically.
     *
     * Nodes are plain discs, not service marks: these are STATES of the plan,
     * not resources, and the colour is the entire signal — an image symbol
     * cannot be tinted, so an icon would swallow it.
     */
    const STEP = 250;
    const NEAR = 12;
    const FAR = 30;

    const nodes = report.rollback.map((r, i) => {
      // Green returns cleanly, orange returns with loss, red has no way back.
      // Three states, because "recoverable" and "recoverable with loss" are
      // not the same promise.
      let tone = p.critical;
      if (r.available) tone = r.loss ? p.high : p.low;
      return {
        name: stateName(r.stepsCompleted),
        x: i * STEP,
        y: 0,
        symbol: "circle",
        symbolSize: 22,
        itemStyle: { color: tone, borderColor: p.surface, borderWidth: 2 },
        label: {
          show: true,
          position: "bottom" as const,
          distance: 8,
          color: p.ink,
          fontSize: 10,
          fontWeight: "bold" as const,
        },
      };
    });

    const links: NonNullable<echarts.GraphSeriesOption["links"]> = [];
    report.rollback.slice(1).forEach((r, i) => {
      const from = stateName(i);
      const to = stateName(r.stepsCompleted);
      const alt = i % 2 === 1;

      // Forward: what the executor runs to reach this state. Sits above.
      links.push({
        source: from,
        target: to,
        label: {
          show: true,
          formatter: r.forwardAction,
          fontSize: 9,
          color: p.muted,
          position: "middle",
          rotate: 0,
          verticalAlign: "bottom",
          padding: [0, 0, alt ? FAR : NEAR, 0],
        },
        lineStyle: { color: p.muted, width: 1.5, curveness: 0.2 },
      });

      // Return: the inverse, drawn only where one exists, below the spine. Its
      // absence is the whole point — an unreturnable state has no arrow home.
      if (r.inverseAction)
        links.push({
          source: to,
          target: from,
          label: {
            show: true,
            formatter: r.inverseAction,
            fontSize: 9,
            color: r.loss ? p.high : p.low,
            position: "middle",
            rotate: 0,
            verticalAlign: "top",
            padding: [alt ? FAR : NEAR, 0, 0, 0],
          },
          lineStyle: {
            color: r.loss ? p.high : p.low,
            width: 2,
            curveness: 0.2,
            // A lossy inverse is dashed: it gets you back, but not to the same
            // place, and a solid line would claim otherwise.
            type: r.loss ? "dashed" : "solid",
          },
        });
    });

    return {
      backgroundColor: p.surface,
      tooltip: {
        formatter: (params: unknown) => {
          const d = params as { dataType: string; dataIndex: number };
          if (d.dataType !== "node") return "";
          const r = report.rollback[d.dataIndex];
          return r ? `${r.stepsCompleted} step(s) done<br/>${r.procedure}` : "";
        },
      },
      series: [
        {
          type: "graph",
          layout: "none",
          // Wider than the drawer by design — the spine is pannable rather
          // than crushed to fit, which is what forced the labels to overlap.
          roam: true,
          label: { fontFamily: APP_FONT },
          edgeSymbol: ["none", "arrow"],
          edgeSymbolSize: [4, 9],
          edgeLabel: { fontSize: 9, fontFamily: APP_FONT },
          data: nodes,
          links,
          lineStyle: { opacity: 0.95, width: 2, curveness: 0.2 },
        },
      ],
    };
  }, [report, p]);

  // Two label rows above, two below, plus the node row and its captions.
  return <Chart option={option} height={210} />;
}

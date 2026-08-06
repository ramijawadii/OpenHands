/* eslint-disable i18next/no-literal-string -- overview dashboard */
import React from "react";
import * as echarts from "echarts";
import { useTheme } from "#/context/theme-context";
import { SurfaceErrorBoundary } from "#/components/features/reliability/surface-error-boundary";
import { RecentEvents, type EventsFilter } from "./RecentEvents";
import { OverviewSkeleton } from "./Skeleton";
import { AssetStats, type DrillFilter } from "./AssetStats";
import { OverviewScope, type Density } from "./OverviewScope";
import { APP_FONT } from "./theme";
import { buildEvents, type EventRow } from "./event-data";
import { buildRows, type ResourceRow } from "./data";
import { applyScope, useScope } from "./overview-scope";
import {
  bucketBy,
  describeBuckets,
  describeDiscovery,
  discoverySeries,
  hygieneBuckets,
  leavesOf,
  type Bucket,
  type DiscoveryPoint,
} from "./overview-metrics";

/**
 * Overview — the landing surface for **discovery and inventory**.
 *
 * **Scope of this capability.** Its siblings are Multi-Cloud Inventory, Shadow
 * Assets, Tagging & Ownership, Change History and Orphaned Resources. So the
 * question this page answers is "what does the customer actually have, and how
 * good is our record of it" — not "what is wrong with it". Findings belong to
 * the security capabilities; putting them here answered a question the user had
 * not asked on this page, while duplicating one they can ask properly
 * elsewhere.
 *
 * The three charts map one-to-one onto those siblings:
 *
 *   line  · resources discovered over time     → Change History
 *   bar 1 · estate by service type             → Multi-Cloud Inventory
 *   bar 2 · gaps in the inventory record       → Shadow / Tagging / Orphaned
 *
 * Series come from the same `buildRows` the inventory grid uses, so a bar and a
 * row can never disagree.
 *
 * **The events table stays.** It is the one place on this page where something
 * recent and specific can be opened, and "what changed on my estate" is a
 * discovery question as much as a security one.
 *
 * **Layout.** Events take the whole left column. Height is viewport-relative
 * with a floor rather than a hard 720px, which was leaving dead space on tall
 * displays and clipping on short ones.
 */

/** Below this the two columns cannot hold their labels; scroll instead. */
const MIN_WIDTH = 940;

/**
 * The estate's own blue — the colour the original curve used.
 *
 * Pinned rather than palette-assigned: ECharts assigns palette colours by
 * series order, so adding or reordering a series would silently recolour this
 * one.
 */
const ESTATE_BLUE = "#5470c6";
const INTAKE_GREEN = "#91cc75";

/**
 * Chart canvas height.
 *
 * Viewport-relative with a floor and a ceiling: a fixed height wastes a tall
 * display and clips a short one, while an unbounded one makes the charts
 * absurd on a 4K monitor.
 */
function frameHeight(): number {
  if (typeof window === "undefined") return 620;
  return Math.max(520, Math.min(860, window.innerHeight - 300));
}

/** The events column takes the left 46%; the charts stack in the right 54%. */
const LEFT_COLUMN = { left: 0, width: "46%" } as const;

/**
 * Vertical layout of the three stacked charts, in PIXELS.
 *
 * Each chart is a title block sitting above a plot. The title block is a fixed
 * height — 13px title + ECharts' 10px item gap + 10.5px subtext — but the grid
 * tops were percentages, so the gap under the subtitle scaled with the canvas
 * while the thing it had to clear did not. At the default height that left
 * roughly 6px under each subtitle, and the plot's top gridline read as
 * underlining the caption rather than opening the chart.
 *
 * Deriving both the title top and the plot top from one row origin makes the
 * gap a constant at every viewport height, and means the two can never drift
 * apart when a row is moved.
 */
const TITLE_BLOCK = 38;
const TITLE_GAP = 20;
/** Row origins as a fraction of canvas height — where each title starts. */
const ROW_TOP = [0, 0.35, 0.68] as const;

function buildOption(
  dark: boolean,
  h: number,
  discovery: DiscoveryPoint[],
  services: Bucket[],
  hygiene: Bucket[],
): echarts.EChartsOption {
  const titleTop = (i: number) => Math.round(ROW_TOP[i] * h);
  const plotTop = (i: number) => titleTop(i) + TITLE_BLOCK + TITLE_GAP;
  /**
   * Chart type.
   *
   * `fg` is pure white on dark rather than the slate the ECharts example used:
   * titles, axis labels and bar values are DATA, and reading them at reduced
   * contrast on a dark canvas costs a fixation each time. Only the subtitles
   * stay muted — they qualify a label rather than carrying a value.
   */
  const fg = dark ? "#ffffff" : "#0f141a";
  const muted = dark ? "#a9b2bf" : "#5f6b7a";
  const line = dark ? "#3f3f46" : "#dedee3";

  const titleStyle = {
    textAlign: "left" as const,
    textStyle: {
      color: fg,
      fontSize: 13,
      fontWeight: 600,
      fontFamily: APP_FONT,
    },
    subtextStyle: { color: muted, fontSize: 10.5, fontFamily: APP_FONT },
  };

  /**
   * Category axis for the two bar charts.
   *
   * A fixed label box keeps the plots in this column sharing one left edge —
   * `containLabel` alone sizes the gutter from whatever each chart's labels
   * happen to need, so two stacked charts start at different x positions.
   */
  const catAxis = (data: string[], gridIndex: number) => ({
    gridIndex,
    type: "category" as const,
    data,
    inverse: true,
    axisLabel: {
      interval: 0,
      width: 92,
      overflow: "truncate" as const,
      align: "right" as const,
      color: fg,
      fontSize: 10,
      fontFamily: APP_FONT,
    },
    axisLine: { lineStyle: { color: line } },
    axisTick: { show: false },
    splitLine: { show: false },
  });

  const barLabel = {
    show: true,
    position: "right" as const,
    color: fg,
    fontSize: 10,
    fontFamily: APP_FONT,
  };

  return {
    backgroundColor: "transparent",
    textStyle: { color: fg, fontFamily: APP_FONT },

    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "line",
        lineStyle: { color: muted, width: 1, type: "dashed" },
        label: {
          backgroundColor: dark ? "#3f3f46" : "#5f6b7a",
          color: "#fff",
          fontFamily: APP_FONT,
          fontSize: 11,
        },
      },
      backgroundColor: dark ? "#1f1f23" : "#ffffff",
      borderColor: line,
      borderWidth: 1,
      padding: [6, 10],
      textStyle: { color: fg, fontFamily: APP_FONT, fontSize: 12 },
      extraCssText: "box-shadow: 0 4px 14px rgba(0,0,0,.28);",
    },

    animation: true,
    animationDuration: 700,
    animationEasing: "cubicOut",
    animationDurationUpdate: 300,

    title: [
      {
        text: "Resources discovered",
        subtext: "estate size, and what was added",
        left: "48%",
        top: titleTop(0),
        ...titleStyle,
      },
      {
        text: "Estate by service",
        subtext: "largest first",
        left: "48%",
        top: titleTop(1),
        ...titleStyle,
      },
      {
        text: "Inventory gaps",
        subtext: "where the record is incomplete",
        left: "48%",
        top: titleTop(2),
        ...titleStyle,
      },
    ],

    legend: [
      {
        orient: "horizontal",
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 14,
        textStyle: { color: fg, fontSize: 10.5, fontFamily: APP_FONT },
        data: ["Estate size", "Newly discovered"],
        right: "3%",
        top: 2,
      },
    ],

    /**
     * Three stacked grids in the right column. The left column is left empty
     * by the chart and the events table is overlaid on exactly those bounds —
     * one definition, so a layout change moves both together.
     */
    grid: [
      {
        left: "52%",
        right: "3%",
        top: plotTop(0),
        bottom: "70%",
        containLabel: true,
      },
      {
        left: "52%",
        right: "3%",
        top: plotTop(1),
        bottom: "36%",
        containLabel: true,
      },
      {
        left: "52%",
        right: "3%",
        top: plotTop(2),
        bottom: 24,
        containLabel: true,
      },
    ],

    xAxis: [
      {
        gridIndex: 0,
        type: "category",
        data: discovery.map((p) => p.label),
        axisLabel: {
          color: fg,
          fontSize: 9.5,
          hideOverlap: true,
          fontFamily: APP_FONT,
        },
        axisLine: { lineStyle: { color: line } },
        axisTick: { show: false },
      },
      {
        gridIndex: 1,
        type: "value",
        axisLabel: { color: fg, fontSize: 9.5, fontFamily: APP_FONT },
        splitLine: { lineStyle: { color: line, type: "dashed" } },
      },
      {
        gridIndex: 2,
        type: "value",
        axisLabel: { color: fg, fontSize: 9.5, fontFamily: APP_FONT },
        splitLine: { lineStyle: { color: line, type: "dashed" } },
      },
    ],

    yAxis: [
      {
        gridIndex: 0,
        type: "value",
        // The cumulative estate does not start at zero, and forcing it to
        // would flatten the whole curve against the top of the plot.
        scale: true,
        axisLabel: { color: fg, fontSize: 9.5, fontFamily: APP_FONT },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: line, type: "dashed" } },
      },
      catAxis(
        services.map((b) => b.key),
        1,
      ),
      catAxis(
        hygiene.map((b) => b.key),
        2,
      ),
    ],

    series: [
      {
        name: "Estate size",
        type: "line",
        showSymbol: false,
        smooth: true,
        // The original blue, with its gradient fill under the curve.
        lineStyle: { width: 2, color: ESTATE_BLUE },
        itemStyle: { color: ESTATE_BLUE },
        areaStyle: {
          opacity: dark ? 0.22 : 0.12,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: ESTATE_BLUE },
            { offset: 1, color: "rgba(84,112,198,0)" },
          ]),
        },
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: discovery.map((p) => p.total),
      },
      {
        name: "Newly discovered",
        type: "line",
        showSymbol: false,
        lineStyle: { width: 1.5, color: INTAKE_GREEN, type: "dashed" },
        itemStyle: { color: INTAKE_GREEN },
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: discovery.map((p) => p.discovered),
      },
      {
        name: "Resources",
        type: "bar",
        xAxisIndex: 1,
        yAxisIndex: 1,
        barMaxWidth: 13,
        itemStyle: { color: ESTATE_BLUE, borderRadius: [0, 2, 2, 0] },
        label: barLabel,
        data: services.map((b) => b.count),
      },
      {
        name: "Resources ",
        type: "bar",
        xAxisIndex: 2,
        yAxisIndex: 2,
        barMaxWidth: 13,
        itemStyle: { color: INTAKE_GREEN, borderRadius: [0, 2, 2, 0] },
        label: barLabel,
        data: hygiene.map((b) => b.count),
      },
    ],
  };
}

export function OverviewView({
  onDrill,
}: {
  /** Navigate to Inventory with a filter applied. Omitted ⇒ strip is inert. */
  onDrill?: (f: DrillFilter) => void;
}) {
  const { theme } = useTheme();
  const scope = useScope();
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [painted, setPainted] = React.useState(false);
  const [density, setDensity] = React.useState<Density>("comfortable");
  const [filter, setFilter] = React.useState<EventsFilter>({
    type: "All",
    kind: "All",
    service: "All",
  });
  const [height, setHeight] = React.useState(frameHeight);

  /**
   * `refreshedAt` doubles as the regeneration key.
   *
   * Bumping it rebuilds the datasets, so Refresh is a real action rather than a
   * label — and the timestamp beside it can never claim a freshness the data
   * does not have.
   */
  const [refreshedAt, setRefreshedAt] = React.useState(() => new Date());

  const allEvents = React.useMemo<EventRow[]>(
    () => buildEvents(160),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh regenerates
    [refreshedAt],
  );
  const allResources = React.useMemo<ResourceRow[]>(
    () => buildRows(1150),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh regenerates
    [refreshedAt],
  );

  const scopedEvents = React.useMemo(
    () => applyScope(allEvents, scope),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allEvents, scope.range, scope.env, scope.account],
  );

  /**
   * The estate under the current scope.
   *
   * Resources carry `environment`, not `env`, and have no single event time —
   * so the page scope is applied to the fields they DO have rather than
   * pretending the two shapes match.
   */
  const scopedResources = React.useMemo(
    () =>
      leavesOf(allResources).filter(
        (r) =>
          (scope.env === "All" || r.environment === scope.env) &&
          (scope.account === "All" || r.account === scope.account),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allResources, scope.env, scope.account],
  );

  const accounts = React.useMemo(
    () => [...new Set(allEvents.map((e) => e.account))].sort(),
    [allEvents],
  );

  const discovery = React.useMemo(
    () =>
      discoverySeries(
        scopedResources,
        Number.isFinite(scope.hours)
          ? Math.max(7, Math.round(scope.hours / 24))
          : 30,
      ),
    [scopedResources, scope.hours],
  );
  const services = React.useMemo(
    () =>
      bucketBy(
        scopedResources,
        (r) => r.serviceType || "Other",
        (r) => r.internetReachable,
        6,
      ),
    [scopedResources],
  );
  const hygiene = React.useMemo(
    () => hygieneBuckets(scopedResources),
    [scopedResources],
  );

  React.useEffect(() => {
    const onResize = () => setHeight(frameHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    const chartDom = hostRef.current;
    if (!chartDom) return undefined;

    const myChart = echarts.init(chartDom);
    myChart.on("finished", () => setPainted(true));
    const settled = window.setTimeout(() => setPainted(true), 2500);
    myChart.setOption(
      buildOption(theme === "dark", height, discovery, services, hygiene),
      { notMerge: true },
    );

    /**
     * Cross-filtering — the step from dashboard to investigation surface.
     *
     * Clicking a service bar filters the events table to that service, so "the
     * Storage bar is tall" and "show me what happened there" are one
     * interaction instead of a mental note plus a filter hunt.
     */
    myChart.on("click", (p: { seriesIndex?: number; name?: string }) => {
      if (p.seriesIndex === 2 && p.name)
        setFilter((f) => ({
          ...f,
          service: f.service === p.name ? "All" : (p.name as string),
        }));
    });

    const ro = new ResizeObserver(() => myChart.resize());
    ro.observe(chartDom);

    return () => {
      window.clearTimeout(settled);
      ro.disconnect();
      myChart.dispose();
    };
    // `height` is a dependency because the layout is now computed in pixels
    // from it. `frameHeight` clamps to a whole number, so a drag that does not
    // change the clamped value bails out of setState and never re-inits.
  }, [theme, height, discovery, services, hygiene]);

  return (
    <SurfaceErrorBoundary surface="explore" name="Inventory overview">
      <OverviewScope
        scope={scope}
        accounts={accounts}
        refreshedAt={refreshedAt}
        onRefresh={() => setRefreshedAt(new Date())}
        density={density}
        onDensity={setDensity}
      />

      <AssetStats onDrill={onDrill} />

      <div style={{ width: "100%", overflowX: "auto", overflowY: "hidden" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            minWidth: MIN_WIDTH,
            height,
          }}
        >
          <div ref={hostRef} style={{ width: "100%", height: "100%" }} />

          {/*
           * Text equivalent of the canvas. An ECharts canvas is one opaque
           * element to assistive technology; this states the finding each
           * chart exists to communicate rather than describing the drawing.
           */}
          <p className="cg-sr-only">
            {describeDiscovery(discovery)}{" "}
            {describeBuckets("Estate by service", services)}{" "}
            {describeBuckets("Inventory gaps", hygiene)}
          </p>

          {!painted && <OverviewSkeleton />}

          <div
            style={{
              position: "absolute",
              left: LEFT_COLUMN.left,
              width: LEFT_COLUMN.width,
              top: 0,
              bottom: 8,
            }}
          >
            <RecentEvents
              rows={scopedEvents}
              density={density}
              filter={filter}
              onFilter={setFilter}
              scopeNarrowed={scope.narrowed}
              onResetScope={scope.clear}
            />
          </div>
        </div>
      </div>

      <style>{`
        .cg-sr-only {
          position: absolute; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
      `}</style>
    </SurfaceErrorBoundary>
  );
}

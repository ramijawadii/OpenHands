/* eslint-disable i18next/no-literal-string -- verbatim ECharts example */
import React from "react";
import * as echarts from "echarts";
import { useTheme } from "#/context/theme-context";
import { SurfaceErrorBoundary } from "#/components/features/reliability/surface-error-boundary";
import { RecentEvents } from "./RecentEvents";
import { APP_FONT } from "./theme";

/**
 * Overview — the ECharts "在线构建 / 各版本下载 / 主题下载" example, verbatim.
 *
 * Data, option, colours and titles are the example's own, created with a bare
 * `echarts.init` exactly as in the source.
 *
 * Departures from the source:
 *  - The tiled "ECHARTS" watermark background is **removed**; it is branding
 *    for the ECharts docs and has no place in this product.
 *  - **Theme-aware**: text, axes and the filler series follow light/dark. The
 *    example hard-codes `#eee` for the remainder bars, which is invisible on a
 *    light page and glaring on a dark one.
 *  - **Legends added**, one per chart, using explicit `legend.data` so only
 *    the meaningful series are listed — the grey remainder bars are filler and
 *    must not be toggleable. Legends are ECharts' built-in filter: clicking an
 *    entry hides that series. Presentation only for now; wiring comes later.
 *  - `dispose()` on unmount, which a plain script does not need but React
 *    does — without it every visit to this tab leaks a chart and its canvas.
 */

const builderJson = {
  all: 10887,
  charts: {
    map: 3237,
    lines: 2164,
    bar: 7561,
    line: 7778,
    pie: 7355,
    scatter: 2405,
    candlestick: 1842,
    radar: 2090,
    heatmap: 1762,
    treemap: 1593,
    graph: 2060,
    boxplot: 1537,
    parallel: 1908,
    gauge: 2107,
    funnel: 1692,
    sankey: 1568,
  } as Record<string, number>,
  components: {
    geo: 2788,
    title: 9575,
    legend: 9400,
    tooltip: 9466,
    grid: 9266,
    markPoint: 3419,
    markLine: 2984,
    timeline: 2739,
    dataZoom: 2744,
    visualMap: 2466,
    toolbox: 3034,
    polar: 1945,
  } as Record<string, number>,
  ie: 9743,
};

// prettier-ignore
const gradientData: [string, number][] = [["2000-06-05",116],["2000-06-06",129],["2000-06-07",135],["2000-06-08",86],["2000-06-09",73],["2000-06-10",85],["2000-06-11",73],["2000-06-12",68],["2000-06-13",92],["2000-06-14",130],["2000-06-15",245],["2000-06-16",139],["2000-06-17",115],["2000-06-18",111],["2000-06-19",309],["2000-06-20",206],["2000-06-21",137],["2000-06-22",128],["2000-06-23",85],["2000-06-24",94],["2000-06-25",71],["2000-06-26",106],["2000-06-27",84],["2000-06-28",93],["2000-06-29",85],["2000-06-30",73],["2000-07-01",83],["2000-07-02",125],["2000-07-03",107],["2000-07-04",82],["2000-07-05",44],["2000-07-06",72],["2000-07-07",106],["2000-07-08",107],["2000-07-09",66],["2000-07-10",91],["2000-07-11",92],["2000-07-12",113],["2000-07-13",107],["2000-07-14",131],["2000-07-15",111],["2000-07-16",64],["2000-07-17",69],["2000-07-18",88],["2000-07-19",77],["2000-07-20",83],["2000-07-21",111],["2000-07-22",57],["2000-07-23",55],["2000-07-24",60]];
const dateList = gradientData.map((item) => item[0]);
const valueList = gradientData.map((item) => item[1]);

/**
 * Second series on the same axes: a 7-point trailing mean of the first.
 *
 * A raw signal alone tells you today's number; plotted against its own moving
 * baseline it tells you whether today is unusual — which is the question the
 * spikes in this series actually raise. Derived rather than invented, so the
 * two curves can never disagree.
 */
const baselineList = valueList.map((_, i) => {
  const window = valueList.slice(Math.max(0, i - 6), i + 1);
  return Math.round(window.reduce((a, b) => a + b, 0) / window.length);
});

/**
 * Four charts on one canvas, laid out as a 2×2:
 *
 *   在线构建   |  各版本下载
 *   各组件使用 |  主题下载
 *
 * Each quadrant gets the same vertical rhythm — title, then a **horizontal**
 * legend, then the plot. Legends were vertical and right-anchored before,
 * which truncated the longer entries ("echarts.common.min") against the canvas
 * edge; horizontal legends have the full half-width and cannot clip.
 */
/**
 * Width reserved for every y-axis label block.
 *
 * `containLabel: true` sizes the space before a plot from whatever that
 * chart's labels happen to need — words on the bar charts, short numbers on
 * the line chart — so plots in the same column start at different x positions.
 * Pinning the label box makes the reserved space identical for every grid, so
 * the plots in a column share one left edge.
 *
 * 58px holds the longest label in either bar chart ("candlestick") at 10px, so
 * nothing truncates in practice; the box exists to make the gutter
 * deterministic, not to clip.
 */
export const AXIS_LABEL_WIDTH = 58;

/**
 * The top-left quadrant. The chart leaves it empty and the events table is
 * overlaid on exactly these bounds — one definition, so a layout change moves
 * both together instead of silently misaligning them.
 */
export const EMPTY_QUADRANT = {
  left: 10,
  right: "54%",
  // The table starts where that quadrant's title used to sit.
  top: 12,
  bottom: "56%",
} as const;

function buildOption(dark: boolean): echarts.EChartsOption {
  const fg = dark ? "#cbd5e1" : "#0f141a";
  const muted = dark ? "#94a3b8" : "#5f6b7a";
  const line = dark ? "#3f3f46" : "#dedee3";
  // The example's `#eee` filler is invisible on light and glaring on dark.
  const filler = dark ? "#3a3a40" : "#eee";

  const titleStyle = {
    textAlign: "center" as const,
    textStyle: { color: fg, fontSize: 15, fontFamily: APP_FONT },
    subtextStyle: { color: muted, fontSize: 11, fontFamily: APP_FONT },
  };

  const legendStyle = {
    orient: "horizontal" as const,
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 14,
    textStyle: { color: muted, fontSize: 11, fontFamily: APP_FONT },
  };

  const catAxis = (data: string[], gridIndex?: number) => ({
    ...(gridIndex === undefined ? {} : { gridIndex }),
    type: "category" as const,
    data,
    axisLabel: {
      interval: 0,
      // Fixed box, unrotated: the gutter has to be predictable to align.
      width: AXIS_LABEL_WIDTH,
      overflow: "truncate" as const,
      align: "right" as const,
      color: muted,
      fontSize: 10,
      fontFamily: APP_FONT,
    },
    axisLine: { lineStyle: { color: line } },
    axisTick: { show: false },
    splitLine: { show: false },
  });

  const valAxis = (gridIndex?: number) => ({
    ...(gridIndex === undefined ? {} : { gridIndex }),
    type: "value" as const,
    max: builderJson.all,
    splitLine: { show: false },
    axisLabel: { color: muted, fontSize: 10, fontFamily: APP_FONT },
    axisLine: { lineStyle: { color: line } },
  });

  /**
   * Entry animation. Bars grow from the axis and are staggered by row, so the
   * chart resolves into place rather than appearing fully formed.
   *
   * `animationDelay` applies on first render only; `animationDelayUpdate` is
   * deliberately 0 so a legend toggle or theme switch re-renders immediately
   * — staggering an interaction makes the UI feel laggy, not polished.
   */
  const stagger = (idx: number) => idx * 30;

  return {
    backgroundColor: "transparent",
    textStyle: { color: fg, fontFamily: APP_FONT },

    /**
     * `trigger: "axis"` gives the cartesian charts a crosshair that reads every
     * series at the hovered category — which is what was missing on the
     * gradient line. Pie series are not on an axis, so they fall back to item
     * trigger automatically.
     */
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

    visualMap: [
      {
        show: false,
        type: "continuous",
        seriesIndex: 4,
        min: 0,
        max: 400,
      },
    ],

    animation: true,
    animationDuration: 900,
    animationEasing: "cubicOut",
    animationDurationUpdate: 300,
    animationEasingUpdate: "cubicOut",

    title: [
      {
        text: "在线构建",
        subtext: `总计 ${builderJson.all}`,
        left: "25%",
        top: "50%",
        ...titleStyle,
      },
      {
        text: "各组件使用",
        subtext: `总计 ${builderJson.ie}`,
        left: "75%",
        top: "50%",
        ...titleStyle,
      },
      {
        text: "Gradient along the y axis",
        subtext: `${gradientData.length} days`,
        left: "75%",
        top: 4,
        ...titleStyle,
      },
    ],

    // `legend.data` is explicit so the grey remainder series stay out — they
    // are arithmetic filler, and hiding them would make the bars look wrong.
    legend: [
      { ...legendStyle, data: ["Charts"], left: "12%", top: "56%" },
      { ...legendStyle, data: ["Components"], left: "56%", top: "56%" },
    ],

    // Two separate grids with a real gap between them, mirroring the vertical
    // separation of the two pies.
    /**
     * Top-left is intentionally blank and keeps its original footprint — the
     * other three quadrants stay exactly where they were, so nothing reflows
     * to fill the gap.
     *
     *   (empty)  |  gradient line
     *   charts   |  components
     */
    grid: [
      // 0 · bottom-left — was top-left
      { left: 10, right: "54%", top: "63%", bottom: 16, containLabel: true },
      // 1 · bottom-right — was bottom-left
      { left: "56%", right: "4%", top: "63%", bottom: 16, containLabel: true },
      // 2 · top-right — unchanged
      {
        left: "56%",
        right: "4%",
        top: EMPTY_QUADRANT.top,
        bottom: EMPTY_QUADRANT.bottom,
        containLabel: true,
      },
    ],

    xAxis: [
      valAxis(),
      valAxis(1),
      {
        gridIndex: 2,
        type: "category",
        data: dateList,
        axisLabel: {
          color: muted,
          fontSize: 10,
          hideOverlap: true,
          fontFamily: APP_FONT,
        },
        axisLine: { lineStyle: { color: line } },
        axisTick: { show: false },
      },
    ],
    yAxis: [
      catAxis(Object.keys(builderJson.charts)),
      catAxis(Object.keys(builderJson.components), 1),
      {
        gridIndex: 2,
        type: "value",
        // Same reserved width as the bar charts, so this plot's left edge
        // lands exactly where the one below it does.
        axisLabel: {
          width: AXIS_LABEL_WIDTH,
          overflow: "truncate" as const,
          align: "right" as const,
          color: muted,
          fontSize: 10,
          fontFamily: APP_FONT,
        },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: line } },
      },
    ],

    series: [
      {
        name: "Charts",
        type: "bar",
        stack: "chart",
        z: 3,
        // Pinned, not palette-assigned: the palette follows series order, so
        // moving a chart would otherwise silently recolour it.
        itemStyle: { color: "#5470c6" },
        label: {
          position: "right",
          show: true,
          color: fg,
          fontSize: 10,
          fontFamily: APP_FONT,
        },
        animationDelay: stagger,
        animationDelayUpdate: 0,
        data: Object.keys(builderJson.charts).map((k) => builderJson.charts[k]),
      },
      {
        name: "Charts remainder",
        type: "bar",
        stack: "chart",
        silent: true,
        itemStyle: { color: filler },
        animationDelay: stagger,
        animationDelayUpdate: 0,
        data: Object.keys(builderJson.charts).map(
          (k) => builderJson.all - builderJson.charts[k],
        ),
      },
      {
        name: "Components",
        type: "bar",
        stack: "component",
        xAxisIndex: 1,
        yAxisIndex: 1,
        z: 3,
        itemStyle: { color: "#91cc75" },
        label: {
          position: "right",
          show: true,
          color: fg,
          fontSize: 10,
          fontFamily: APP_FONT,
        },
        animationDelay: stagger,
        animationDelayUpdate: 0,
        data: Object.keys(builderJson.components).map(
          (k) => builderJson.components[k],
        ),
      },
      {
        name: "Components remainder",
        type: "bar",
        stack: "component",
        silent: true,
        xAxisIndex: 1,
        yAxisIndex: 1,
        itemStyle: { color: filler },
        animationDelay: stagger,
        animationDelayUpdate: 0,
        data: Object.keys(builderJson.components).map(
          (k) => builderJson.all - builderJson.components[k],
        ),
      },
      {
        name: "Trend",
        type: "line",
        showSymbol: false,
        emphasis: { focus: "series" },
        lineStyle: { width: 2 },
        xAxisIndex: 2,
        yAxisIndex: 2,
        animationDelay: 120,
        data: valueList,
      },
      {
        name: "Baseline",
        type: "line",
        showSymbol: false,
        smooth: true,
        emphasis: { focus: "series" },
        // Pinned green, matching the components chart. The `visualMap` above
        // is scoped to `seriesIndex: 4`, so this line keeps its own colour
        // instead of being repainted by the gradient.
        lineStyle: { width: 1.5, color: "#91cc75", type: "dashed" },
        itemStyle: { color: "#91cc75" },
        xAxisIndex: 2,
        yAxisIndex: 2,
        animationDelay: 220,
        data: baselineList,
      },
    ],
  };
}

/**
 * Below this width the four quadrants cannot hold their labels, so the frame
 * scrolls horizontally rather than compressing into an unreadable mess.
 */
const MIN_WIDTH = 940;
const CHART_HEIGHT = 720;

export function OverviewView() {
  const { theme } = useTheme();
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const chartDom = hostRef.current;
    if (!chartDom) return undefined;

    const myChart = echarts.init(chartDom);
    // `notMerge` so a theme switch replaces the option rather than layering a
    // second set of legends and series on top of the first.
    myChart.setOption(buildOption(theme === "dark"), { notMerge: true });

    // The panel can resize without the window doing so — the drawer, the
    // sidebar and the tab strip all change our width on their own.
    const ro = new ResizeObserver(() => myChart.resize());
    ro.observe(chartDom);

    return () => {
      ro.disconnect();
      myChart.dispose();
    };
  }, [theme]);

  return (
    <SurfaceErrorBoundary surface="explore" name="Inventory overview">
      <div style={{ width: "100%", overflowX: "auto", overflowY: "hidden" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            minWidth: MIN_WIDTH,
            height: CHART_HEIGHT,
          }}
        >
          <div ref={hostRef} style={{ width: "100%", height: "100%" }} />

          {/* Sits in the quadrant the chart deliberately leaves blank. */}
          <div
            style={{
              position: "absolute",
              // Flush with the quadrant edge — the same vertical the bar
              // charts' axis labels start on, so the whole left column shares
              // one outer edge. Insetting to the *plot* left instead pushed
              // the table well right of everything below it.
              left: EMPTY_QUADRANT.left,
              right: EMPTY_QUADRANT.right,
              top: EMPTY_QUADRANT.top,
              bottom: EMPTY_QUADRANT.bottom,
            }}
          >
            <RecentEvents />
          </div>
        </div>
      </div>
    </SurfaceErrorBoundary>
  );
}

import React from "react";
import * as echarts from "echarts";
import { useTheme } from "#/context/theme-context";
import { APP_FONT } from "./theme";

/**
 * OverviewBar — the reusable horizontal ECharts bar used across the overview
 * surfaces (Domain / Discovery / Multi-Cloud). Extracted from `OverviewView`'s
 * "Estate by service" / "Inventory gaps" bars so every dashboard bar reads as one
 * chart: same theme-aware palette, APP_FONT, fixed left label gutter, right value
 * labels, `barMaxWidth` + `borderRadius`, tooltip, and resize/dispose lifecycle.
 *
 * Data-only per-bar colour is supported (e.g. tint a quota bar by utilisation);
 * omit `color` to use the estate blue. Pass `max` to pin the value axis (e.g. 100
 * for a percentage) so bars are comparable across charts.
 */
export interface OverviewBarDatum {
  label: string;
  value: number;
  /** Per-bar colour (severity/utilisation). Omit → estate blue. */
  color?: string;
  /** Right-hand label override; defaults to `${value}${valueSuffix}`. */
  display?: string;
}

const ESTATE_BLUE = "#5470c6";

export function OverviewBar({
  items,
  max,
  valueSuffix = "",
  rowHeight = 34,
  minHeight = 120,
}: {
  items: OverviewBarDatum[];
  max?: number;
  valueSuffix?: string;
  rowHeight?: number;
  minHeight?: number;
}) {
  const { theme } = useTheme();
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const dark = theme === "dark";
  const height = Math.max(minHeight, items.length * rowHeight + 24);

  React.useEffect(() => {
    const dom = hostRef.current;
    if (!dom) return undefined;

    const fg = dark ? "#ffffff" : "#0f141a";
    const line = dark ? "#3f3f46" : "#dedee3";

    const chart = echarts.init(dom);
    chart.setOption(
      {
        backgroundColor: "transparent",
        textStyle: { color: fg, fontFamily: APP_FONT },
        grid: { top: 6, bottom: 6, left: 4, right: 46, containLabel: true },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
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
        xAxis: {
          type: "value",
          max,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: line, type: "dashed" } },
        },
        yAxis: {
          type: "category",
          data: items.map((d) => d.label),
          inverse: true,
          axisLabel: {
            interval: 0,
            width: 120,
            overflow: "truncate",
            align: "right",
            color: fg,
            fontSize: 11,
            fontFamily: APP_FONT,
          },
          axisLine: { lineStyle: { color: line } },
          axisTick: { show: false },
          splitLine: { show: false },
        },
        series: [
          {
            type: "bar",
            barMaxWidth: 14,
            data: items.map((d) => ({
              value: d.value,
              itemStyle: {
                color: d.color ?? ESTATE_BLUE,
                borderRadius: [0, 2, 2, 0],
              },
            })),
            label: {
              show: true,
              position: "right",
              color: fg,
              fontSize: 10.5,
              fontFamily: APP_FONT,
              formatter: (p: { dataIndex: number; value: number }) =>
                items[p.dataIndex]?.display ?? `${p.value}${valueSuffix}`,
            },
          },
        ],
      },
      { notMerge: true },
    );

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(dom);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [items, max, valueSuffix, dark]);

  return <div ref={hostRef} style={{ width: "100%", height }} />;
}

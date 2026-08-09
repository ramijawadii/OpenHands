import React from "react";
import * as echarts from "echarts";
import { useTheme } from "#/context/theme-context";
import { APP_FONT } from "./theme";

/**
 * OverviewTree — a reusable ECharts `tree` for hierarchy/inheritance surfaces
 * (Inheritance Tree, org hierarchy). Same theming contract as OverviewBar
 * (theme-aware palette, APP_FONT, transparent ground, resize/dispose lifecycle),
 * rendered as a real interactive tree (expand/collapse, roam) rather than an
 * ASCII/box diagram.
 */
export interface TreeDatum {
  name: string;
  children?: TreeDatum[];
}

const NODE_BLUE = "#5470c6";

export function OverviewTree({
  data,
  height = 460,
  orient = "LR",
}: {
  data: TreeDatum;
  height?: number;
  orient?: "LR" | "TB";
}) {
  const { theme } = useTheme();
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const dark = theme === "dark";

  React.useEffect(() => {
    const dom = hostRef.current;
    if (!dom) return undefined;
    const fg = dark ? "#ffffff" : "#0f141a";
    const line = dark ? "#3f3f46" : "#c7c9d1";

    const chart = echarts.init(dom);
    chart.setOption(
      {
        backgroundColor: "transparent",
        textStyle: { color: fg, fontFamily: APP_FONT },
        tooltip: {
          trigger: "item",
          triggerOn: "mousemove",
          backgroundColor: dark ? "#1f1f23" : "#ffffff",
          borderColor: line,
          borderWidth: 1,
          padding: [6, 10],
          textStyle: { color: fg, fontFamily: APP_FONT, fontSize: 12 },
          extraCssText: "box-shadow: 0 4px 14px rgba(0,0,0,.28);",
        },
        series: [
          {
            type: "tree",
            data: [data],
            top: "3%",
            left: orient === "LR" ? "12%" : "3%",
            bottom: "3%",
            right: orient === "LR" ? "18%" : "3%",
            orient,
            symbol: "circle",
            symbolSize: 8,
            roam: true,
            expandAndCollapse: true,
            initialTreeDepth: -1,
            animationDuration: 550,
            animationDurationUpdate: 400,
            itemStyle: { color: NODE_BLUE, borderColor: NODE_BLUE },
            lineStyle: { color: line, width: 1, curveness: 0.35 },
            label: {
              position: orient === "LR" ? "left" : "top",
              verticalAlign: "middle",
              align: orient === "LR" ? "right" : "center",
              fontSize: 11,
              color: fg,
              fontFamily: APP_FONT,
            },
            leaves: {
              label: {
                position: orient === "LR" ? "right" : "bottom",
                verticalAlign: "middle",
                align: orient === "LR" ? "left" : "center",
              },
            },
            emphasis: { focus: "descendant" },
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
  }, [data, orient, dark]);

  return <div ref={hostRef} style={{ width: "100%", height }} />;
}

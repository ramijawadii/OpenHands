import React from "react";
import * as echarts from "echarts";
import { APP_FONT } from "./theme";

/**
 * OverviewTree — a reusable ECharts `tree` for hierarchy/inheritance surfaces
 * (Inheritance Tree, Organization Defaults). Rendered on a fixed-height WHITE
 * panel (so it reads as a distinct diagram in either app theme), with icon nodes
 * (a filled layers glyph) instead of dots, and `roam` enabled so it can be
 * zoomed/panned. Same reusable contract as OverviewBar.
 */
export interface TreeDatum {
  name: string;
  children?: TreeDatum[];
}

const NODE_BLUE = "#5470c6";
// Filled "layers" glyph (24×24) — an icon node in place of the default dot.
const NODE_ICON =
  "path://M12 2 2 7l10 5 10-5-10-5zM2 12l10 5 10-5-2.36-1.18L12 14.4 4.36 10.82 2 12zM2 17l10 5 10-5-2.36-1.18L12 19.4 4.36 15.82 2 17z";

export function OverviewTree({
  data,
  height = 460,
  orient = "LR",
}: {
  data: TreeDatum;
  height?: number;
  orient?: "LR" | "TB";
}) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const dom = hostRef.current;
    if (!dom) return undefined;
    // Always light — the panel is white regardless of app theme.
    const fg = "#0f141a";
    const line = "#c7c9d1";

    const chart = echarts.init(dom);
    chart.setOption(
      {
        backgroundColor: "#ffffff",
        textStyle: { color: fg, fontFamily: APP_FONT },
        tooltip: {
          trigger: "item",
          triggerOn: "mousemove",
          backgroundColor: "#ffffff",
          borderColor: line,
          borderWidth: 1,
          padding: [6, 10],
          textStyle: { color: fg, fontFamily: APP_FONT, fontSize: 12 },
          extraCssText: "box-shadow: 0 4px 14px rgba(0,0,0,.14);",
        },
        series: [
          {
            type: "tree",
            data: [data],
            top: "4%",
            left: orient === "LR" ? "12%" : "3%",
            bottom: "4%",
            right: orient === "LR" ? "18%" : "3%",
            orient,
            symbol: NODE_ICON,
            symbolSize: 18,
            roam: true, // zoom (scroll) + pan
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
  }, [data, orient]);

  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height,
        background: "#ffffff",
        borderRadius: 10,
      }}
    />
  );
}

/* eslint-disable i18next/no-literal-string -- security graph views */
import React from "react";
import { Maximize2, X } from "lucide-react";
import { SurfaceErrorBoundary } from "#/components/features/reliability/surface-error-boundary";
import {
  drawerTabStrip,
  drawerTab,
} from "#/components/admin/pages/graph-shell";
import { APP_FONT } from "./theme";
import { AttackTimeline } from "./AttackTimeline";
import { DependencyGraph } from "./DependencyGraph";
import type { EventRow } from "./event-data";

/**
 * The event's security graph: two analytic canvases over the same finding.
 *
 * **Dependency graph** — the affected resource centred, upstream converging
 * into it and downstream diverging out, with health, risk and open-signal
 * counts stated on each node. Built for triage rather than exploration.
 *
 * **Timeline reconstruction** — each ATT&CK phase as a box: the spread of when
 * the correlated signals for that phase were observed, with how much of each
 * phase is observed rather than reasoned.
 *
 * This module is now only the frame — the tab strip, and the canvas that
 * expands to full screen. Each view owns its own chrome, because the two have
 * almost nothing in common beyond living in the same box.
 */

type GraphViewId = "dependency" | "timeline";

const GRAPH_VIEWS: { id: GraphViewId; label: string }[] = [
  { id: "dependency", label: "Dependency graph" },
  { id: "timeline", label: "Timeline reconstruction" },
];

const iconBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  height: 22,
  padding: "0 8px",
  fontSize: 11,
  fontFamily: APP_FONT,
  background: "transparent",
  color: "var(--cg-text-primary)",
  border: "1px solid var(--cg-border)",
  borderRadius: 3,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

function GraphTabs({
  view,
  onChange,
  right,
}: {
  view: GraphViewId;
  onChange: (v: GraphViewId) => void;
  right?: React.ReactNode;
}) {
  return (
    <div
      className="cg-scroll"
      style={{
        ...drawerTabStrip,
        gap: 12,
        padding: "0 2px",
        alignItems: "center",
        overflowY: "hidden",
      }}
    >
      {GRAPH_VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          style={drawerTab(view === v.id)}
          onClick={() => onChange(v.id)}
        >
          {v.label}
        </button>
      ))}
      {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
    </div>
  );
}

function Body({
  view,
  event,
  wide,
}: {
  view: GraphViewId;
  event: EventRow;
  wide?: boolean;
}) {
  return view === "dependency" ? (
    <DependencyGraph event={event} wide={wide} />
  ) : (
    <AttackTimeline event={event} wide={wide} />
  );
}

export function SecurityGraph({ event }: { event: EventRow }) {
  const [view, setView] = React.useState<GraphViewId>("dependency");
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <SurfaceErrorBoundary surface="explore" name="Security graph">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
        }}
      >
        <GraphTabs
          view={view}
          onChange={setView}
          right={
            <button
              type="button"
              style={iconBtn}
              onClick={() => setExpanded(true)}
            >
              <Maximize2 size={12} /> Open canvas
            </button>
          }
        />

        {/*
         * The embed is a real canvas, not a thumbnail: at this size the shape
         * of the topology and the spread of the phases are already readable,
         * and the full screen is for working in rather than for finally
         * seeing something.
         */}
        <div style={{ flex: 1, minHeight: 300, marginTop: 8 }}>
          <Body view={view} event={event} />
        </div>
      </div>

      {expanded && (
        <div
          role="dialog"
          aria-label="Security graph canvas"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            display: "flex",
            flexDirection: "column",
            background: "var(--cg-bg-page)",
            fontFamily: APP_FONT,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderBottom: "1px solid var(--cg-border)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--cg-text-primary)",
              }}
            >
              Security graph — {event.resource}
            </span>
            <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
              {event.id} · {event.ruleId}
            </span>
            <span style={{ marginLeft: "auto" }}>
              <button
                type="button"
                style={iconBtn}
                onClick={() => setExpanded(false)}
              >
                <X size={12} /> Close
              </button>
            </span>
          </div>

          <div style={{ padding: "6px 12px 0", flexShrink: 0 }}>
            <GraphTabs view={view} onChange={setView} />
          </div>

          <div style={{ flex: 1, minHeight: 0, margin: 12 }}>
            <Body view={view} event={event} wide />
          </div>
        </div>
      )}
    </SurfaceErrorBoundary>
  );
}

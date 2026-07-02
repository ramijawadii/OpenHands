/* eslint-disable i18next/no-literal-string -- CloudGuard internal graph-health panel */
import React from "react";
import { X, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  type GraphSource,
  type GraphMetrics,
  type ValidationReport,
} from "./graph-core";
import { CHROME } from "./graph-shell";

// Live graph accuracy + scale signals — pulls metrics() + report() from the
// async GraphSource (LocalGraphSource today, a graph DB later), proving the
// query seam works end-to-end without touching the interactive emphasis path.
export function GraphHealthPanel({
  source,
  onClose,
}: {
  source: GraphSource;
  onClose: () => void;
}) {
  const [metrics, setMetrics] = React.useState<GraphMetrics | null>(null);
  const [report, setReport] = React.useState<ValidationReport | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([source.metrics(), source.report()])
      .then(([m, r]) => {
        if (!live) return;
        setMetrics(m);
        setReport(r);
        setLoading(false);
      })
      .catch(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [source]);

  const card: React.CSSProperties = {
    position: "absolute",
    top: 12,
    right: 12,
    width: 300,
    maxHeight: "calc(100% - 24px)",
    overflowY: "auto",
    zIndex: 20,
    background: CHROME.bg,
    border: `1px solid ${CHROME.border}`,
    borderRadius: 10,
    boxShadow: "0 10px 26px rgba(0,0,0,0.18)",
    color: CHROME.text,
    fontSize: 12.5,
  };
  const row = (k: string, v: React.ReactNode) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        padding: "5px 0",
        borderBottom: `1px solid ${CHROME.border}`,
      }}
    >
      <span style={{ color: CHROME.muted }}>{k}</span>
      <span style={{ fontWeight: 600 }}>{v}</span>
    </div>
  );

  return (
    <div style={card}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderBottom: `1px solid ${CHROME.border}`,
          fontWeight: 700,
        }}
      >
        <Activity size={15} /> Graph health
        <span style={{ fontSize: 10.5, color: CHROME.muted, fontWeight: 500 }}>
          {source.kind} · {source.tenantId}
        </span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            color: CHROME.muted,
            cursor: "pointer",
            display: "inline-flex",
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: "8px 12px 12px" }}>
        {loading && <div style={{ color: CHROME.muted }}>Loading…</div>}

        {report && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 8,
              marginBottom: 10,
              background: report.ok
                ? "rgba(57,184,78,0.1)"
                : "rgba(224,73,47,0.1)",
              color: report.ok ? "#2b8a3e" : "#c0392b",
              fontWeight: 600,
            }}
          >
            {report.ok ? (
              <CheckCircle2 size={15} />
            ) : (
              <AlertTriangle size={15} />
            )}
            {report.ok ? "Valid" : `${report.errors} error(s)`}
            {report.warnings > 0 && (
              <span style={{ color: CHROME.muted, fontWeight: 500 }}>
                · {report.warnings} warning(s)
              </span>
            )}
          </div>
        )}

        {metrics && (
          <>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: CHROME.muted,
                margin: "4px 0 4px",
              }}
            >
              Scale
            </div>
            {row("Nodes", metrics.nodes)}
            {row("Edges", metrics.edges)}
            {row("Avg degree", metrics.avgDegree)}
            {row(
              "Max out / in",
              `${metrics.maxOutDegree} / ${metrics.maxInDegree}`,
            )}
            {row("Orphan rate", `${(metrics.orphanRate * 100).toFixed(1)}%`)}
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: CHROME.muted,
                margin: "12px 0 4px",
              }}
            >
              Blast radius (p50 / p90 / p99 / max)
            </div>
            {row(
              "Downstream reach",
              `${metrics.reach.p50} / ${metrics.reach.p90} / ${metrics.reach.p99} / ${metrics.reach.max}`,
            )}
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: CHROME.muted,
                margin: "12px 0 4px",
              }}
            >
              Top hubs (degree)
            </div>
            {metrics.hubs.slice(0, 5).map((h) => (
              <div
                key={h.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "4px 0",
                  fontSize: 11.5,
                }}
              >
                <span
                  style={{
                    color: CHROME.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontFamily:
                      "'IBM Plex Mono', source-code-pro, Menlo, Consolas, monospace",
                  }}
                >
                  {h.id}
                </span>
                <span style={{ color: CHROME.muted, flexShrink: 0 }}>
                  {h.degree}
                </span>
              </div>
            ))}
          </>
        )}

        {report && report.issues.length > 0 && (
          <>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: CHROME.muted,
                margin: "12px 0 4px",
              }}
            >
              Findings
            </div>
            {report.issues.slice(0, 6).map((i) => (
              <div
                key={i.code}
                style={{
                  display: "flex",
                  gap: 6,
                  padding: "4px 0",
                  fontSize: 11.5,
                  color: i.severity === "error" ? "#c0392b" : CHROME.muted,
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  {i.severity[0].toUpperCase()}
                </span>
                <span>{i.message}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

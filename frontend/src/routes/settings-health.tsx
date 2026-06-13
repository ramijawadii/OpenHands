/* eslint-disable i18next/no-literal-string, no-nested-ternary, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, jsx-a11y/label-has-associated-control, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- CloudGuard Health tab */
import React from "react";
import { useParams, useNavigate } from "react-router";
import { Activity, RefreshCw, ChevronDown } from "lucide-react";
import {
  ScopeBadge,
  LiveCardSkeleton,
  ConfirmButton,
} from "#/components/features/settings/settings-kit";
import { Capable } from "#/components/features/acp/capable";
import {
  useHealth,
  useHealthSnapshots,
  useHealthHistory,
  useHealthProbe,
  useCollection,
  useSettingsDoc,
} from "#/hooks/query/use-cloudguard";
import { useLiveCollection } from "#/hooks/use-live-collection";
import { CloudGuardService } from "#/api/cloudguard-service";

const S = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  inputBg: "var(--cg-input-bg)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  warning: "#e09a2d",
  danger: "var(--cg-danger)",
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

const SUBSYSTEMS = [
  "control_plane",
  "llm",
  "tools",
  "container",
  "env_model",
  "mcp",
  "sandbox",
  "connector",
];

type MetricUnit = "%" | "ms" | "min" | "MB" | "bool" | "count";
interface MetricDef {
  key: string;
  label: string;
  unit: MetricUnit;
  desc: string;
}

// Per-subsystem health KPI catalog — the metrics an SRE/CISO actually watches for each
// subsystem. Always rendered (real value or "—"); the backend fills the ones it can observe,
// the rest land when their producer is instrumented. First ~5 appear as table columns; the
// expand shows the full set with descriptions.
const SUBSYSTEM_METRICS: Record<string, MetricDef[]> = {
  control_plane: [
    {
      key: "audit_chain_intact",
      label: "Chain intact",
      unit: "bool",
      desc: "Tamper-evident audit hash-chain verifies end to end.",
    },
    {
      key: "pending_approvals",
      label: "Pending approvals",
      unit: "count",
      desc: "Human-approval requests awaiting a decision.",
    },
    {
      key: "oldest_approval_age_min",
      label: "Oldest approval",
      unit: "min",
      desc: "Age of the longest-waiting approval (SLA risk).",
    },
    {
      key: "active_kill_switches",
      label: "Kill-switches",
      unit: "count",
      desc: "Active emergency-halt scopes.",
    },
    {
      key: "tenancy_strict",
      label: "Strict tenancy",
      unit: "bool",
      desc: "Edge is fail-closed (rejects unauthenticated / cross-tenant).",
    },
    {
      key: "audit_entries",
      label: "Audit volume",
      unit: "count",
      desc: "Total audit entries recorded for the tenant.",
    },
  ],
  llm: [
    {
      key: "provider_ready",
      label: "Provider ready",
      unit: "bool",
      desc: "A model provider is configured and selectable.",
    },
    {
      key: "latency_p95_ms",
      label: "p95 latency",
      unit: "ms",
      desc: "95th-percentile completion latency.",
    },
    {
      key: "error_rate_pct",
      label: "Error rate",
      unit: "%",
      desc: "Failed / 5xx completions over total.",
    },
    {
      key: "rate_limited_5m",
      label: "429s (5m)",
      unit: "count",
      desc: "Provider rate-limit responses in the last 5 minutes.",
    },
    {
      key: "tokens_per_min",
      label: "Tokens/min",
      unit: "count",
      desc: "Token throughput.",
    },
    {
      key: "context_used_pct",
      label: "Context used",
      unit: "%",
      desc: "Average context-window utilisation.",
    },
  ],
  tools: [
    {
      key: "success_rate_pct",
      label: "Success rate",
      unit: "%",
      desc: "Tool executions that succeeded.",
    },
    {
      key: "error_rate_pct",
      label: "Error rate",
      unit: "%",
      desc: "Tool executions that failed or aborted.",
    },
    {
      key: "p95_latency_ms",
      label: "p95 latency",
      unit: "ms",
      desc: "95th-percentile tool execution time.",
    },
    {
      key: "calls_1h",
      label: "Calls (1h)",
      unit: "count",
      desc: "Tool invocations in the last hour.",
    },
    {
      key: "degraded_tools",
      label: "Degraded tools",
      unit: "count",
      desc: "Tools trending toward failure / coverage gaps.",
    },
    {
      key: "timeouts_1h",
      label: "Timeouts (1h)",
      unit: "count",
      desc: "Tool calls that timed out.",
    },
  ],
  container: [
    {
      key: "cpu_pct",
      label: "CPU",
      unit: "%",
      desc: "Runtime CPU utilisation.",
    },
    {
      key: "mem_pct",
      label: "Memory",
      unit: "%",
      desc: "Runtime memory utilisation.",
    },
    {
      key: "mem_used_mb",
      label: "Mem used",
      unit: "MB",
      desc: "Resident memory in use.",
    },
    {
      key: "disk_used_pct",
      label: "Disk",
      unit: "%",
      desc: "Root filesystem utilisation.",
    },
    {
      key: "net_recv_mb",
      label: "Net in",
      unit: "MB",
      desc: "Cumulative network bytes received.",
    },
    {
      key: "net_sent_mb",
      label: "Net out",
      unit: "MB",
      desc: "Cumulative network bytes sent.",
    },
  ],
  env_model: [
    {
      key: "kg_reachable",
      label: "KG reachable",
      unit: "bool",
      desc: "Environment knowledge-graph store is reachable.",
    },
    {
      key: "modelled_resources",
      label: "Resources",
      unit: "count",
      desc: "Cloud resources currently modelled.",
    },
    {
      key: "coverage_pct",
      label: "Coverage",
      unit: "%",
      desc: "Share of expected resources successfully modelled.",
    },
    {
      key: "layers_built",
      label: "Layers built",
      unit: "count",
      desc: "Environment-model layers built this run.",
    },
    {
      key: "last_run_age_min",
      label: "Last run",
      unit: "min",
      desc: "Time since the last model build (freshness).",
    },
    {
      key: "drift_resources",
      label: "Drift",
      unit: "count",
      desc: "Resources changed since the last model.",
    },
  ],
  mcp: [
    {
      key: "servers_total",
      label: "Servers",
      unit: "count",
      desc: "MCP servers registered.",
    },
    {
      key: "servers_up",
      label: "Up",
      unit: "count",
      desc: "MCP servers responding to a handshake.",
    },
    {
      key: "tools_advertised",
      label: "Tools",
      unit: "count",
      desc: "Tools advertised across servers.",
    },
    {
      key: "handshake_p95_ms",
      label: "Handshake p95",
      unit: "ms",
      desc: "95th-percentile list-tools handshake time.",
    },
    {
      key: "error_rate_pct",
      label: "Error rate",
      unit: "%",
      desc: "Failed MCP calls over total.",
    },
  ],
  sandbox: [
    {
      key: "runtime_ready",
      label: "Runtime ready",
      unit: "bool",
      desc: "Sandbox runtime image + endpoint are configured.",
    },
    {
      key: "active_sandboxes",
      label: "Active",
      unit: "count",
      desc: "Sandboxes currently running.",
    },
    {
      key: "provision_success_pct",
      label: "Provision success",
      unit: "%",
      desc: "Sandbox provisions that succeeded.",
    },
    {
      key: "avg_provision_ms",
      label: "Avg provision",
      unit: "ms",
      desc: "Mean time to provision a sandbox.",
    },
    {
      key: "resource_pressure_pct",
      label: "Pressure",
      unit: "%",
      desc: "Peak CPU/memory pressure across sandboxes.",
    },
    {
      key: "volumes_mounted",
      label: "Volumes",
      unit: "count",
      desc: "Shared volumes mounted into the runtime.",
    },
  ],
  connector: [
    {
      key: "connectors_total",
      label: "Connectors",
      unit: "count",
      desc: "Cloud connectors configured.",
    },
    {
      key: "connectors_healthy",
      label: "Healthy",
      unit: "count",
      desc: "Connectors reachable with valid credentials.",
    },
    {
      key: "creds_valid",
      label: "Creds valid",
      unit: "count",
      desc: "Connectors whose credentials authenticated.",
    },
    {
      key: "last_read_age_min",
      label: "Last read",
      unit: "min",
      desc: "Time since the last successful cloud read.",
    },
    {
      key: "api_error_rate_pct",
      label: "API errors",
      unit: "%",
      desc: "Provider API error / 4xx rate.",
    },
    {
      key: "throttled_1h",
      label: "Throttled (1h)",
      unit: "count",
      desc: "Throttled / 429 provider responses in the last hour.",
    },
  ],
};

function fmtMetric(v: number | undefined, unit: MetricUnit): string {
  if (v === undefined || v === null) return "—";
  if (unit === "bool") return v ? "yes" : "no";
  if (unit === "%") return `${v}%`;
  if (unit === "ms") return `${v} ms`;
  if (unit === "min") return `${v} min`;
  if (unit === "MB") return `${v} MB`;
  return String(v);
}

// Per-metric thresholds (warn/crit). hiBad (default) = higher is worse; hiBad:false = higher is
// better (warn/crit are lower bounds). boolSev = severity when a bool metric reads 0/false.
type Threshold = {
  warn?: number;
  crit?: number;
  hiBad?: boolean;
  boolSev?: "warn" | "crit";
};
const THRESHOLDS: Record<string, Threshold> = {
  "control_plane.audit_chain_intact": { boolSev: "crit" },
  "control_plane.tenancy_strict": { boolSev: "warn" },
  "control_plane.pending_approvals": { warn: 25, crit: 50 },
  "control_plane.oldest_approval_age_min": { warn: 60, crit: 240 },
  "control_plane.active_kill_switches": { warn: 1, crit: 1 },
  "llm.provider_ready": { boolSev: "crit" },
  "llm.latency_p95_ms": { warn: 5000, crit: 10000 },
  "llm.error_rate_pct": { warn: 2, crit: 10 },
  "llm.rate_limited_5m": { warn: 1, crit: 10 },
  "tools.success_rate_pct": { hiBad: false, warn: 95, crit: 80 },
  "tools.error_rate_pct": { warn: 5, crit: 25 },
  "tools.p95_latency_ms": { warn: 8000, crit: 20000 },
  "tools.degraded_tools": { warn: 1, crit: 3 },
  "tools.timeouts_1h": { warn: 1, crit: 10 },
  "container.cpu_pct": { warn: 85, crit: 95 },
  "container.mem_pct": { warn: 80, crit: 90 },
  "container.disk_used_pct": { warn: 85, crit: 95 },
  "env_model.kg_reachable": { boolSev: "crit" },
  "env_model.coverage_pct": { hiBad: false, warn: 90, crit: 70 },
  "env_model.drift_resources": { warn: 1, crit: 25 },
  "mcp.error_rate_pct": { warn: 5, crit: 25 },
  "mcp.handshake_p95_ms": { warn: 2000, crit: 8000 },
  "sandbox.runtime_ready": { boolSev: "warn" },
  "sandbox.provision_success_pct": { hiBad: false, warn: 98, crit: 90 },
  "sandbox.resource_pressure_pct": { warn: 80, crit: 95 },
  "connector.api_error_rate_pct": { warn: 1, crit: 5 },
  "connector.last_read_age_min": { warn: 60, crit: 1440 },
};

const SEV_COLOR: Record<string, string> = {
  warn: "var(--cg-warning, #e09a2d)",
  crit: "var(--cg-danger)",
};

// Export a subsystem's samples to CSV (ts, status, then one column per catalog metric).
function exportSamplesCsv(
  subsystem: string,
  defs: MetricDef[],
  rows: { ts: string; status: string; metrics: Record<string, number> }[],
) {
  const headers = ["ts", "status", ...defs.map((d) => d.key)];
  const lines = [headers.join(",")];
  rows.forEach((r) => {
    lines.push(
      [
        r.ts,
        r.status,
        ...defs.map((d) =>
          r.metrics[d.key] === undefined ? "" : String(r.metrics[d.key]),
        ),
      ].join(","),
    );
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `health-${subsystem}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Returns a color for a metric value vs its threshold; "" means use the default text color.
function metricColor(
  subsystem: string,
  def: MetricDef,
  v: number | undefined,
): string {
  if (v === undefined || v === null) return "";
  const t = THRESHOLDS[`${subsystem}.${def.key}`];
  if (!t) return "";
  if (def.unit === "bool") {
    return v === 0 && t.boolSev ? SEV_COLOR[t.boolSev] : "";
  }
  const hiBad = t.hiBad !== false;
  if (hiBad) {
    if (t.crit != null && v >= t.crit) return SEV_COLOR.crit;
    if (t.warn != null && v >= t.warn) return SEV_COLOR.warn;
  } else {
    if (t.crit != null && v <= t.crit) return SEV_COLOR.crit;
    if (t.warn != null && v <= t.warn) return SEV_COLOR.warn;
  }
  return "";
}

function statusColor(st: string) {
  return st === "ok"
    ? S.success
    : st === "degraded"
      ? S.warning
      : st === "fail"
        ? S.danger
        : S.textMuted;
}
function Dot({ st, size = 8 }: { st: string; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: statusColor(st),
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

const STATUS_TINT: Record<string, string> = {
  ok: "rgba(76,175,125,0.14)",
  degraded: "rgba(224,154,45,0.16)",
  fail: "rgba(229,72,77,0.16)",
  skip: "var(--cg-bg-badge)",
};
const STATUS_RING: Record<string, string> = {
  ok: "rgba(76,175,125,0.45)",
  degraded: "rgba(224,154,45,0.5)",
  fail: "rgba(229,72,77,0.5)",
  skip: "var(--cg-border-strong)",
};
// Non-color shape cue (accessibility) alongside the color.
const STATUS_GLYPH: Record<string, string> = {
  ok: "✓",
  degraded: "!",
  fail: "✕",
  skip: "–",
};
function StatusPill({ st }: { st: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 20,
        padding: "0 9px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        color: statusColor(st),
        background: STATUS_TINT[st] || "var(--cg-bg-badge)",
        border: `1px solid ${STATUS_RING[st] || "var(--cg-border)"}`,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      <span aria-hidden style={{ fontWeight: 700 }}>
        {STATUS_GLYPH[st] || "•"}
      </span>
      {st}
    </span>
  );
}

// One health sample, collapsed to a single grid row (filling the width with this subsystem's
// metric columns) and expandable to its full metric set — the audit-log "row → detail" pattern.
function HealthSampleRow({
  r,
  cols,
  grid,
  allDefs,
  subsystem,
}: {
  r: SubRow;
  cols: MetricDef[];
  grid: string;
  allDefs: MetricDef[];
  subsystem: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--cg-border-subtle)" }}>
      <div
        role="button"
        tabIndex={0}
        className="cg-row"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen((o) => !o);
        }}
        style={{
          display: "grid",
          gridTemplateColumns: grid,
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          cursor: "pointer",
        }}
      >
        <ChevronDown
          size={14}
          color="var(--cg-text-muted)"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
          }}
        />
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            color: "var(--cg-text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {r.ts.replace("T", " ").replace("Z", "")}
        </span>
        <span>
          <StatusPill st={r.status} />
        </span>
        <span
          style={{
            minWidth: 0,
            fontSize: 12.5,
            color: "var(--cg-text-nav)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {r.summary || "—"}
        </span>
        {cols.map((d) => {
          const c = metricColor(subsystem, d, r.metrics[d.key]);
          return (
            <span
              key={d.key}
              style={{
                textAlign: "right",
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: c ? 600 : 400,
                color:
                  c ||
                  (r.metrics[d.key] === undefined
                    ? "var(--cg-text-muted)"
                    : "var(--cg-text-primary)"),
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fmtMetric(r.metrics[d.key], d.unit)}
            </span>
          );
        })}
      </div>
      {open && (
        <div
          style={{
            padding: "4px 16px 16px 42px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            columnGap: 32,
          }}
        >
          {allDefs.map((d) => (
            <div
              key={d.key}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid var(--cg-border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 12.5, color: "var(--cg-text-nav)" }}>
                  {d.label}
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: "monospace",
                    color:
                      metricColor(subsystem, d, r.metrics[d.key]) ||
                      (r.metrics[d.key] === undefined
                        ? "var(--cg-text-muted)"
                        : "var(--cg-text-primary)"),
                  }}
                >
                  {fmtMetric(r.metrics[d.key], d.unit)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--cg-text-muted)",
                  marginTop: 3,
                  lineHeight: 1.4,
                }}
              >
                {d.desc}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  height: 32,
  padding: "0 10px",
  background: S.inputBg,
  border: `1px solid ${S.border}`,
  borderRadius: 6,
  color: S.textPrimary,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  appearance: "none" as const,
  cursor: "pointer",
  paddingRight: 24,
};
const optBg = { background: "var(--cg-bg-card)" } as const;

// Build a de-duplicated string option list from a collection/doc (objects or strings).
function toOpts(arr: unknown, ...picks: string[]): string[] {
  const out: string[] = [];
  (Array.isArray(arr) ? arr : []).forEach((it) => {
    if (typeof it === "string") out.push(it);
    else if (it && typeof it === "object") {
      const o = it as Record<string, unknown>;
      const hit = picks
        .map((p) => o[p])
        .find((v) => typeof v === "string" && v);
      if (hit) out.push(hit as string);
    }
  });
  return Array.from(new Set(out));
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...selectStyle, flex: 1, minWidth: 130 }}
    >
      <option value="" style={optBg}>
        {label}
      </option>
      {options.map((o) => (
        <option key={o} value={o} style={optBg}>
          {o}
        </option>
      ))}
    </select>
  );
}

// ── Uptime bar (status-page style) ───────────────────────────────────────────
const BAR_N = 90;
const BAR_ORDER: Record<string, number> = {
  fail: 3,
  degraded: 2,
  ok: 1,
  skip: 0,
};
const BAR_COLOR: Record<string, string> = {
  ok: "#1f9d6b",
  degraded: "#e09a2d",
  fail: "var(--cg-danger)",
  // Distinct slate so "skip"/no-data segments stay visible even when the row is hovered
  // (the row hover repaints to --cg-bg-hover, which previously made these vanish).
  skip: "rgba(148,163,184,0.32)",
  none: "rgba(148,163,184,0.18)",
};
const OVERALL_LABEL: Record<string, string> = {
  ok: "Operational",
  degraded: "Degraded",
  fail: "Major outage",
  skip: "Unknown",
};

interface SampleLite {
  ts: string;
  status: string;
  metrics: Record<string, number>;
}
interface Bucket {
  status: string;
  sample: SampleLite | null; // worst-status sample in the bucket (the representative)
  start: number; // bucket time-range start (epoch ms, UTC)
  end: number; // bucket time-range end (epoch ms)
  count: number; // how many samples fell in this bucket
}

// Parse a snapshot timestamp (ISO "…Z" or "YYYY-MM-DD HH:MM:SS") to an epoch (ms).
function parseTs(ts: string): number {
  if (!ts) return 0;
  const norm = ts.includes("T") ? ts : ts.replace(" ", "T");
  const withZone = /[zZ]|[+-]\d\d:?\d\d$/.test(norm) ? norm : `${norm}Z`;
  const t = Date.parse(withZone);
  return Number.isNaN(t) ? 0 : t;
}

// Bucket by ACTUAL TIME, not by sample count: anchor the axis to the selected
// window [now-window, now] and split it into BAR_N equal real-time slices, so
// every bar maps to a precise, uniform interval regardless of how irregularly
// the snapshots are spaced. Gaps in monitoring show as empty ("none") buckets
// rather than being silently compressed away.
function bucketSamples(samples: SampleLite[], windowSec: number): Bucket[] {
  const now = Date.now();
  const tsList = samples.map((s) => parseTs(s.ts)).filter((t) => t > 0);
  const maxTs = tsList.length ? Math.max(...tsList) : now;
  const minTs = tsList.length ? Math.min(...tsList) : now;
  const spanMs = windowSec > 0 ? windowSec * 1000 : 0;
  // End at the latest of now / newest sample; start at the window edge, but never
  // clip samples that are older than the nominal window out of the chart.
  const end = Math.max(now, maxTs);
  let start = spanMs ? end - spanMs : minTs;
  if (tsList.length && minTs < start) start = minTs;
  const totalMs = Math.max(end - start, 1);
  const slice = totalMs / BAR_N;

  const buckets: Bucket[] = Array.from({ length: BAR_N }, (_, i) => ({
    status: "none",
    sample: null,
    start: start + i * slice,
    end: start + (i + 1) * slice,
    count: 0,
  }));

  samples.forEach((s) => {
    const t = parseTs(s.ts);
    if (!t) return;
    let idx = Math.floor(((t - start) / totalMs) * BAR_N);
    if (idx < 0) idx = 0;
    if (idx >= BAR_N) idx = BAR_N - 1;
    const b = buckets[idx];
    b.count += 1;
    const v = BAR_ORDER[s.status] ?? -1;
    const cur = b.sample ? (BAR_ORDER[b.status] ?? -1) : -2;
    // Keep the worst status; on a tie take the later sample (samples are oldest→newest).
    if (v >= cur) {
      b.status = s.status;
      b.sample = s;
    }
  });
  return buckets;
}

// Compact UTC clock for the tooltip's bucket range. Short windows → HH:MM;
// multi-day windows add the date so the hour is never ambiguous.
function fmtClock(ms: number, spanMs: number): string {
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  if (spanMs > 0 && spanMs <= 36 * 3600 * 1000) {
    const ss = String(d.getUTCSeconds()).padStart(2, "0");
    return spanMs <= 2 * 3600 * 1000 ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
  }
  const mo = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${mo} ${d.getUTCDate()} ${hh}:${mm}`;
}

function uptimePct(statuses: string[]): string {
  const counted = statuses.filter(
    (s) => s === "ok" || s === "degraded" || s === "fail",
  );
  if (!counted.length) return "—";
  const ok = counted.filter((s) => s === "ok").length;
  return `${((ok / counted.length) * 100).toFixed(3)}% uptime`;
}

// Status-page bar; hovering a bucket pops a compact, viewport-clamped tooltip with that
// window's full metric set. The tooltip is position:fixed (measured off the hovered cell) so
// it never gets clipped by a parent and flips above/below depending on available room.
const TT_W = 208;
function UptimeBar({
  samples,
  subsystem,
  windowSec = 0,
}: {
  samples: SampleLite[];
  subsystem: string;
  windowSec?: number;
}) {
  const buckets = bucketSamples(samples, windowSec);
  const spanMs =
    buckets.length > 0 ? buckets[buckets.length - 1].end - buckets[0].start : 0;
  const [hover, setHover] = React.useState<{
    i: number;
    x: number;
    y: number;
    below: boolean;
  } | null>(null);
  const defs = SUBSYSTEM_METRICS[subsystem] || [];
  const hb = hover ? buckets[hover.i] || null : null;
  const sm = hb?.sample || null;

  const onEnter = (e: React.MouseEvent, i: number) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // estimate tooltip height to decide flip; enough room above?
    const estH = 58 + defs.length * 20;
    const below = r.top < estH + 16;
    setHover({
      i,
      x: r.left + r.width / 2,
      y: below ? r.bottom + 8 : r.top - 8,
      below,
    });
  };
  const clampedX =
    hover &&
    Math.min(
      Math.max(hover.x, TT_W / 2 + 8),
      (typeof window !== "undefined" ? window.innerWidth : 1200) - TT_W / 2 - 8,
    );

  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
      <div style={{ display: "flex", gap: 2, height: 34 }}>
        {buckets.map((b, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            onMouseEnter={(e) => onEnter(e, i)}
            style={{
              flex: 1,
              background: BAR_COLOR[b.status] || BAR_COLOR.none,
              borderRadius: 1,
              cursor: "default",
              outline:
                hover?.i === i ? "1px solid var(--cg-text-primary)" : "none",
              outlineOffset: -1,
            }}
          />
        ))}
      </div>
      {hover && (
        <div
          style={{
            position: "fixed",
            top: hover.y,
            left: clampedX as number,
            transform: `translate(-50%, ${hover.below ? "0" : "-100%"})`,
            width: TT_W,
            background: "var(--cg-bg-card)",
            border: "1px solid var(--cg-border-strong)",
            borderRadius: 8,
            padding: "8px 10px",
            zIndex: 2000,
            boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
            pointerEvents: "none",
          }}
        >
          {/* Precise bucket time-range (UTC), independent of whether a sample landed here. */}
          {hb && (
            <div
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                color: "var(--cg-text-muted)",
                marginBottom: 6,
                whiteSpace: "nowrap",
              }}
            >
              {fmtClock(hb.start, spanMs)} – {fmtClock(hb.end, spanMs)} UTC
            </div>
          )}
          {sm ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    fontFamily: "monospace",
                    color: "var(--cg-text-muted)",
                  }}
                  title="Exact sample timestamp"
                >
                  @ {sm.ts.replace("T", " ").replace("Z", "")}
                  {(hb?.count ?? 0) > 1 ? ` · ${hb?.count} samples` : ""}
                </span>
                <StatusPill st={sm.status} />
              </div>
              {defs.map((d) => (
                <div
                  key={d.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "2px 0",
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      color: "var(--cg-text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      flexShrink: 0,
                      color:
                        metricColor(subsystem, d, sm.metrics[d.key]) ||
                        (sm.metrics[d.key] === undefined
                          ? "var(--cg-text-muted)"
                          : "var(--cg-text-primary)"),
                    }}
                  >
                    {fmtMetric(sm.metrics[d.key], d.unit)}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
              No data in this time bucket.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Status view ──────────────────────────────────────────────────────────────
function StatusView({
  filters,
  setFilters,
}: {
  filters: Record<string, string>;
  setFilters: (f: Record<string, string>) => void;
}) {
  const [ovWin, setOvWin] = React.useState(7776000); // overview history window
  const { data, isLoading, isError } = useHealth(filters);
  const snaps = useHealthSnapshots(ovWin);
  const probe = useHealthProbe();
  const navigate = useNavigate();
  const connectors = useCollection("connectors");
  const envDoc = useSettingsDoc("environments");
  const upd = (k: string, v: string) =>
    setFilters({ ...filters, [k]: v || undefined } as Record<string, string>);

  // Only the filters the aggregator actually honors today (no dead controls).
  const FILTERS: [string, string, string[]][] = [
    [
      "environment",
      "All environments",
      toOpts(
        (envDoc.data as { envs?: unknown[] } | undefined)?.envs,
        "name",
        "slug",
      ),
    ],
    ["connector", "All connectors", toOpts(connectors.data, "cloud", "name")],
  ];
  // Degraded-first: worst status floats to the top.
  const ordered = data
    ? [...data.subsystems].sort(
        (a, b) => (BAR_ORDER[b.status] ?? -1) - (BAR_ORDER[a.status] ?? -1),
      )
    : [];
  const winLabel =
    WINDOWS.find(([, v]) => v === ovWin)?.[0] ||
    `${Math.round(ovWin / 86400)}d`;

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
          border: `1px solid ${S.border}`,
          borderRadius: 8,
          padding: 10,
          background: S.cardBg,
        }}
      >
        {FILTERS.map(([k, label, options]) => (
          <FilterSelect
            key={k}
            label={label}
            value={filters[k] || ""}
            onChange={(v) => upd(k, v)}
            options={options}
          />
        ))}
        {Object.values(filters).some(Boolean) && (
          <button
            type="button"
            onClick={() => setFilters({})}
            style={{
              ...fieldStyle,
              width: "auto",
              color: S.accent,
              cursor: "pointer",
              border: "none",
              background: "transparent",
            }}
          >
            Clear
          </button>
        )}
        <Capable cap="remediate">
          <button
            type="button"
            onClick={() => probe.mutate()}
            style={{
              ...fieldStyle,
              width: "auto",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <RefreshCw size={13} /> Probe now
          </button>
        </Capable>
      </div>

      {isLoading && <LiveCardSkeleton lines={3} />}
      {isError && (
        <div style={{ fontSize: 13, color: S.danger }}>
          Health endpoint unreachable.
        </div>
      )}
      {data && (
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderRadius: 10,
            background: S.cardBg,
            padding: "18px 22px 8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span
              style={{ fontSize: 14, fontWeight: 600, color: S.textPrimary }}
            >
              Current status by service
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <select
                aria-label="History window"
                value={ovWin}
                onChange={(e) => setOvWin(Number(e.target.value))}
                style={{ ...selectStyle, height: 26, width: 96 }}
              >
                {WINDOWS.map(([l, v]) => (
                  <option key={v} value={v} style={optBg}>
                    Last {l}
                  </option>
                ))}
              </select>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  height: 26,
                  padding: "0 13px",
                  borderRadius: 99,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: statusColor(data.overall),
                  background: STATUS_TINT[data.overall] || "var(--cg-bg-badge)",
                  border: `1px solid ${STATUS_RING[data.overall] || "var(--cg-border)"}`,
                }}
              >
                <span aria-hidden style={{ fontWeight: 700 }}>
                  {STATUS_GLYPH[data.overall] || "•"}
                </span>
                {OVERALL_LABEL[data.overall] || data.overall}
              </span>
            </div>
          </div>

          {ordered.map((s, i) => {
            const samples = (snaps.data ?? [])
              .map((sn) => {
                const e = sn.subsystems.find(
                  (x) => x.subsystem === s.subsystem,
                );
                return e
                  ? { ts: sn.ts, status: e.status, metrics: e.metrics || {} }
                  : null;
              })
              .filter((x): x is SampleLite => x !== null);
            const up = uptimePct(samples.map((x) => x.status));
            return (
              <div
                key={s.subsystem}
                role="button"
                tabIndex={0}
                className="cg-row"
                onClick={() => navigate(`/settings/health/${s.subsystem}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    navigate(`/settings/health/${s.subsystem}`);
                }}
                title={`Open ${s.sub} health`}
                style={{
                  padding: "16px 0 14px",
                  borderTop:
                    i === 0 ? "none" : "1px solid var(--cg-border-subtle)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 9 }}
                  >
                    <Dot st={s.status} size={11} />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: S.textPrimary,
                      }}
                    >
                      {s.sub}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: s.status === "ok" ? S.success : S.textSecondary,
                    }}
                  >
                    {up}
                  </span>
                </div>
                <UptimeBar
                  samples={samples}
                  subsystem={s.subsystem}
                  windowSec={ovWin}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 7,
                    fontSize: 11.5,
                    color: S.textMuted,
                  }}
                >
                  <span>{winLabel} ago</span>
                  <span>Today</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Alerts view ────────────────────────────────────────────────────────────
interface AlertRule {
  id: string;
  name: string;
  subsystem: string;
  metric: string;
  condition: string;
  threshold: number;
  flag?: string;
  severity: string;
  forDurationSec: number;
  dedupWindowSec: number;
  channels: string[];
  recipients: string[];
  enabled: boolean;
}
const SEED_RULES: Partial<AlertRule>[] = [
  {
    name: "Container memory pressure",
    subsystem: "container",
    metric: "mem_pct",
    condition: ">",
    threshold: 90,
    severity: "warning",
    forDurationSec: 600,
    dedupWindowSec: 900,
    channels: ["in_app"],
    recipients: ["security-oncall"],
    enabled: true,
  },
  {
    name: "Audit chain broken",
    subsystem: "control_plane",
    metric: "",
    condition: "flag",
    flag: "audit_chain_broken",
    threshold: 0,
    severity: "critical",
    forDurationSec: 0,
    dedupWindowSec: 0,
    channels: ["email", "in_app"],
    recipients: ["ciso"],
    enabled: true,
  },
];

function AlertsView() {
  const col = useLiveCollection(
    "health-alerts",
    SEED_RULES as unknown as Record<string, unknown>[],
  );
  const rules = col.items as unknown as AlertRule[];
  const histQ = useHealthHistory(100);
  const fired = (histQ.data ?? []).filter(
    (e) => e.action === "health.alert.fired",
  );
  const testRule = (r: AlertRule) => {
    CloudGuardService.healthAlertTest(r as unknown as Record<string, unknown>)
      .then(() => setTimeout(() => histQ.refetch(), 400))
      .catch(() => undefined);
  };
  const [modal, setModal] = React.useState(false);
  const [form, setForm] = React.useState<AlertRule>({
    id: "",
    name: "",
    subsystem: "container",
    metric: "mem_pct",
    condition: ">",
    threshold: 90,
    flag: "",
    severity: "warning",
    forDurationSec: 300,
    dedupWindowSec: 900,
    channels: ["in_app"],
    recipients: [],
    enabled: true,
  });
  const setF = (p: Partial<AlertRule>) => setForm((f) => ({ ...f, ...p }));
  const save = () => {
    if (!form.name.trim()) return;
    const { id, ...body } = form;
    col.add(body as unknown as Record<string, unknown>);
    setModal(false);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13, color: S.textMuted }}>
          Alert when a subsystem breaches a threshold or flag — routed to your
          Notifications / Webhooks channels.
        </span>
        <Capable cap="admin">
          <button
            type="button"
            onClick={() => setModal(true)}
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 6,
              background: "var(--cg-text-primary)",
              color: "var(--cg-bg-card)",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            + New alert rule
          </button>
        </Capable>
      </div>

      <div
        style={{
          border: `1px solid ${S.border}`,
          borderRadius: 8,
          overflow: "hidden",
          background: S.cardBg,
          marginBottom: 24,
        }}
      >
        {rules.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: S.textMuted }}>
            No alert rules yet.
          </div>
        )}
        {rules.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom:
                i < rules.length - 1
                  ? "1px solid var(--cg-border-subtle)"
                  : "none",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  color: S.textPrimary,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Dot
                  st={
                    r.severity === "critical"
                      ? "fail"
                      : r.severity === "warning"
                        ? "degraded"
                        : "ok"
                  }
                  size={7}
                />
                {r.name}
              </div>
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                {r.subsystem} ·{" "}
                {r.condition === "flag"
                  ? `flag ${r.flag}`
                  : `${r.metric} ${r.condition} ${r.threshold}`}
                {r.forDurationSec ? ` for ${r.forDurationSec}s` : ""} →{" "}
                {(r.channels || []).join(", ") || "in_app"}
                {(r.recipients || []).length
                  ? ` (${r.recipients.join(", ")})`
                  : ""}
              </div>
            </div>
            <Capable cap="admin">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => col.update(r.id, { enabled: !r.enabled })}
                  style={{
                    height: 26,
                    padding: "0 10px",
                    borderRadius: 6,
                    border: `1px solid ${S.borderStrong}`,
                    background: r.enabled
                      ? "rgba(76,175,125,0.15)"
                      : "transparent",
                    color: r.enabled ? S.success : S.textMuted,
                    fontSize: 11.5,
                    cursor: "pointer",
                  }}
                >
                  {r.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  type="button"
                  onClick={() => testRule(r)}
                  title="Fire a synthetic alert through this rule's routing"
                  style={{
                    height: 26,
                    padding: "0 10px",
                    borderRadius: 6,
                    border: `1px solid ${S.borderStrong}`,
                    background: "transparent",
                    color: S.textSecondary,
                    fontSize: 11.5,
                    cursor: "pointer",
                  }}
                >
                  Test
                </button>
                <ConfirmButton
                  variant="ghost"
                  label="Delete"
                  title="Delete alert rule?"
                  body={`"${r.name}" will stop evaluating.`}
                  confirmLabel="Delete"
                  onConfirm={() => col.remove(r.id)}
                />
              </div>
            </Capable>
          </div>
        ))}
      </div>

      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: S.textPrimary,
          margin: "0 0 10px",
        }}
      >
        Recently fired
      </h3>
      <div
        style={{
          border: `1px solid ${S.border}`,
          borderRadius: 8,
          overflow: "hidden",
          background: S.cardBg,
        }}
      >
        {fired.length === 0 && (
          <div style={{ padding: 14, fontSize: 12.5, color: S.textMuted }}>
            No alerts have fired.
          </div>
        )}
        {fired.map((e) => (
          <div
            key={e.entry_hash}
            style={{
              display: "grid",
              gridTemplateColumns: "190px 1fr minmax(120px, 0.6fr)",
              gap: 12,
              padding: "9px 16px",
              borderBottom: "1px solid var(--cg-border-subtle)",
              fontSize: 12,
              alignItems: "center",
            }}
          >
            <span style={{ color: S.textMuted, fontFamily: "monospace" }}>
              {e.ts}
            </span>
            <span
              style={{
                color: S.textSecondary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {e.action}
            </span>
            <span
              style={{
                color: S.textMuted,
                textAlign: "right",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {e.resource}
            </span>
          </div>
        ))}
      </div>

      {modal && (
        <div
          onClick={() => setModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 460,
              maxWidth: "92vw",
              maxHeight: "88vh",
              overflowY: "auto",
              background: S.cardBg,
              border: `1px solid ${S.borderStrong}`,
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: S.textPrimary,
                margin: "0 0 18px",
              }}
            >
              New alert rule
            </h3>
            <Field label="Name">
              <input
                value={form.name}
                onChange={(e) => setF({ name: e.target.value })}
                style={{ ...fieldStyle, width: "100%", height: 36 }}
              />
            </Field>
            <Field label="Subsystem">
              <select
                value={form.subsystem}
                onChange={(e) => setF({ subsystem: e.target.value })}
                style={{ ...selectStyle, width: "100%", height: 36 }}
              >
                {SUBSYSTEMS.map((x) => (
                  <option key={x} value={x} style={optBg}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Condition">
              <select
                value={form.condition}
                onChange={(e) => setF({ condition: e.target.value })}
                style={{ ...selectStyle, width: "100%", height: 36 }}
              >
                {[">", ">=", "<", "<=", "==", "flag"].map((c) => (
                  <option key={c} value={c} style={optBg}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            {form.condition === "flag" ? (
              <Field label="Flag">
                <input
                  value={form.flag}
                  onChange={(e) => setF({ flag: e.target.value })}
                  placeholder="audit_chain_broken | kill_switch_active | creds_invalid | degraded"
                  style={{ ...fieldStyle, width: "100%", height: 36 }}
                />
              </Field>
            ) : (
              <>
                <Field label="Metric">
                  <select
                    value={form.metric}
                    onChange={(e) => setF({ metric: e.target.value })}
                    style={{ ...selectStyle, width: "100%", height: 36 }}
                  >
                    <option value="" style={optBg}>
                      Select a metric…
                    </option>
                    {(SUBSYSTEM_METRICS[form.subsystem] || []).map((d) => (
                      <option key={d.key} value={d.key} style={optBg}>
                        {d.label} ({d.key})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Threshold">
                  <input
                    type="number"
                    value={form.threshold}
                    onChange={(e) =>
                      setF({ threshold: Number(e.target.value) || 0 })
                    }
                    style={{ ...fieldStyle, width: "100%", height: 36 }}
                  />
                </Field>
              </>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Severity">
                <select
                  value={form.severity}
                  onChange={(e) => setF({ severity: e.target.value })}
                  style={{ ...selectStyle, width: "100%", height: 36 }}
                >
                  {["info", "warning", "critical"].map((x) => (
                    <option key={x} value={x} style={optBg}>
                      {x}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="For (sec)">
                <input
                  type="number"
                  value={form.forDurationSec}
                  onChange={(e) =>
                    setF({ forDurationSec: Number(e.target.value) || 0 })
                  }
                  style={{ ...fieldStyle, width: "100%", height: 36 }}
                />
              </Field>
              <Field label="Dedup (sec)">
                <input
                  type="number"
                  value={form.dedupWindowSec}
                  onChange={(e) =>
                    setF({ dedupWindowSec: Number(e.target.value) || 0 })
                  }
                  style={{ ...fieldStyle, width: "100%", height: 36 }}
                />
              </Field>
            </div>
            <Field label="Channels (comma) — from Notifications/Webhooks">
              <input
                value={(form.channels || []).join(", ")}
                onChange={(e) =>
                  setF({
                    channels: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="in_app, slack, email, pagerduty, webhook"
                style={{ ...fieldStyle, width: "100%", height: 36 }}
              />
            </Field>
            <Field label="Recipients (comma)">
              <input
                value={(form.recipients || []).join(", ")}
                onChange={(e) =>
                  setF({
                    recipients: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="security-oncall, ciso@org.io"
                style={{ ...fieldStyle, width: "100%", height: 36 }}
              />
            </Field>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                onClick={() => setModal(false)}
                style={{
                  height: 36,
                  padding: "0 16px",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid ${S.borderStrong}`,
                  color: S.textSecondary,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                style={{
                  height: 36,
                  padding: "0 16px",
                  borderRadius: 6,
                  background: "var(--cg-text-primary)",
                  color: "var(--cg-bg-card)",
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Create rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12, flex: 1 }}>
      <div style={{ fontSize: 12, color: S.textMuted, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ── Time-window options for the subsystem table filter ──────────────────────
const WINDOWS: [string, number][] = [
  ["1h", 3600],
  ["24h", 86400],
  ["7d", 604800],
  ["90d", 7776000],
];

const SUB_LABELS: Record<string, string> = {
  control_plane: "Control Plane",
  llm: "LLM API",
  tools: "Tools",
  container: "Conversation Container",
  env_model: "Environment Modelling",
  mcp: "MCP Servers",
  sandbox: "Sandboxes",
  connector: "Connectors",
};

interface SubRow {
  ts: string;
  status: string;
  summary: string;
  metrics: Record<string, number>;
}

// One subsystem = an audit-log-style view: current checks on top, then a filterable, paginated
// table of that subsystem's historical samples (from the persisted snapshots).
function SubsystemView({ subsystem }: { subsystem: string }) {
  const { data: snap, isLoading: liveLoading } = useHealth({});
  const cur = snap?.subsystems.find((s) => s.subsystem === subsystem);
  const probe = useHealthProbe();
  const navigate = useNavigate();

  const [win, setWin] = React.useState(3600);
  const [statusF, setStatusF] = React.useState("");
  const [search, setSearch] = React.useState("");
  const { data: snaps, isLoading } = useHealthSnapshots(win);

  const rows = React.useMemo<SubRow[]>(() => {
    const r = (snaps ?? [])
      .map((sn) => {
        const e = sn.subsystems.find((x) => x.subsystem === subsystem);
        return e
          ? {
              ts: sn.ts,
              status: e.status,
              summary: e.summary,
              metrics: e.metrics || {},
            }
          : null;
      })
      .filter((x): x is SubRow => x !== null);
    r.reverse(); // newest first
    return r;
  }, [snaps, subsystem]);

  const filtered = rows.filter((r) => {
    if (statusF && r.status !== statusF) return false;
    if (
      search &&
      !(r.summary || "").toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  // Columns come from the subsystem's KPI catalog (always shown, real value or "—"); the
  // expand reveals the full catalog with descriptions.
  const allDefs = SUBSYSTEM_METRICS[subsystem] || [];
  const colDefs = allDefs.slice(0, 5);
  const grid = `20px 168px 104px minmax(150px, 1.1fr) ${colDefs
    .map(() => "minmax(86px, 1fr)")
    .join(" ")}`;

  const PAGE = 25;
  const [page, setPage] = React.useState(0);
  React.useEffect(() => {
    setPage(0);
  }, [win, statusF, search, subsystem, filtered.length]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safe = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safe * PAGE, (safe + 1) * PAGE);

  const th = (t: string) => (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: S.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {t}
    </span>
  );

  // Uptime bar for THIS subsystem over the selected window (oldest -> newest).
  const barSamples = [...rows].reverse(); // oldest -> newest (SubRow ⊇ SampleLite)
  const winLabel = WINDOWS.find(([, v]) => v === win)?.[0] || "window";

  return (
    <div>
      {/* This subsystem's status row (uptime bar over the window) */}
      <div
        style={{
          border: `1px solid ${S.border}`,
          borderRadius: 10,
          background: S.cardBg,
          padding: "14px 18px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 12.5, color: S.textMuted }}>
            Uptime over last {winLabel}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: cur?.status === "ok" ? S.success : S.textSecondary,
            }}
          >
            {uptimePct(barSamples.map((s) => s.status))}
          </span>
        </div>
        <UptimeBar samples={barSamples} subsystem={subsystem} windowSec={win} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 7,
            fontSize: 11.5,
            color: S.textMuted,
          }}
        >
          <span>{winLabel} ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Current status + checks */}
      {liveLoading && !cur ? (
        <LiveCardSkeleton lines={3} />
      ) : (
        <div
          style={{
            background: S.cardBg,
            border: `1px solid ${S.border}`,
            borderRadius: 10,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: cur?.detail?.length ? 12 : 0,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <StatusPill st={cur?.status || "skip"} />
              <span style={{ fontSize: 13, color: S.textSecondary }}>
                {cur?.summary || "Awaiting first sample"}
              </span>
            </span>
            <Capable cap="remediate">
              <button
                type="button"
                onClick={() => probe.mutate()}
                style={{
                  ...fieldStyle,
                  width: "auto",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <RefreshCw size={13} /> Probe now
              </button>
            </Capable>
          </div>
          {(cur?.detail || []).map((d) => (
            <div
              key={d.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12,
                padding: "5px 0",
                borderTop: "1px solid var(--cg-border-subtle)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Dot st={d.status} size={6} />
                <span style={{ color: S.textSecondary }}>{d.name}</span>
              </span>
              <span style={{ color: S.textMuted }}>{d.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Audit-style filter bar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <select
          value={win}
          onChange={(e) => setWin(Number(e.target.value))}
          style={{ ...selectStyle, width: 110 }}
        >
          {WINDOWS.map(([l, v]) => (
            <option key={v} value={v} style={optBg}>
              Last {l}
            </option>
          ))}
        </select>
        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          style={{ ...selectStyle, width: 130 }}
        >
          <option value="" style={optBg}>
            All statuses
          </option>
          {["ok", "degraded", "fail", "skip"].map((s) => (
            <option key={s} value={s} style={optBg}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search summary…"
          style={{ ...fieldStyle, width: 220 }}
        />
        <span style={{ fontSize: 12, color: S.textMuted }}>
          {filtered.length} sample(s)
        </span>
        <button
          type="button"
          disabled={filtered.length === 0}
          onClick={() => exportSamplesCsv(subsystem, allDefs, filtered)}
          style={{
            ...fieldStyle,
            width: "auto",
            marginLeft: "auto",
            cursor: filtered.length === 0 ? "default" : "pointer",
            opacity: filtered.length === 0 ? 0.5 : 1,
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Related actions */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 14,
          fontSize: 12,
        }}
      >
        <span style={{ color: S.textMuted }}>Related:</span>
        {(
          [
            ["Audit log", "/settings/audit-log"],
            ["Enforcement", "/agent-control-plane/enforcement"],
            ["Monitoring", "/agent-control-plane/monitoring"],
            ["Alerts", "/settings/health/alerts"],
          ] as [string, string][]
        ).map(([label, to]) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            style={{
              background: "none",
              border: "none",
              color: S.accent,
              cursor: "pointer",
              padding: 0,
              fontSize: 12,
            }}
          >
            {label} →
          </button>
        ))}
      </div>

      {/* Samples — expandable rows (click a row for its full metric set) */}
      <div
        style={{
          border: `1px solid ${S.border}`,
          borderRadius: 8,
          overflow: "hidden",
          background: S.cardBg,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: grid,
            alignItems: "center",
            gap: 12,
            padding: "8px 16px",
            borderBottom: `1px solid ${S.border}`,
          }}
        >
          <span />
          {th("Time (UTC)")}
          {th("Status")}
          {th("Summary")}
          {colDefs.map((d) => (
            <span key={d.key} style={{ textAlign: "right" }} title={d.desc}>
              {th(d.label)}
            </span>
          ))}
        </div>
        {isLoading && (
          <div style={{ padding: 16 }}>
            <LiveCardSkeleton lines={3} />
          </div>
        )}
        {!isLoading && paged.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: S.textMuted }}>
            No samples in this window yet — history accrues as the tab polls (≈
            every minute), or hit <strong>Probe now</strong> above.
          </div>
        )}
        {paged.map((r) => (
          <HealthSampleRow
            key={r.ts}
            r={r}
            cols={colDefs}
            grid={grid}
            allDefs={allDefs}
            subsystem={subsystem}
          />
        ))}
      </div>

      {filtered.length > PAGE && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <span style={{ fontSize: 12, color: S.textMuted }}>
            {safe * PAGE + 1}–{Math.min((safe + 1) * PAGE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              type="button"
              disabled={safe === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{
                ...fieldStyle,
                width: "auto",
                cursor: safe === 0 ? "default" : "pointer",
                opacity: safe === 0 ? 0.5 : 1,
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 12.5, color: S.textSecondary }}>
              {safe + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safe >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              style={{
                ...fieldStyle,
                width: "auto",
                cursor: safe >= pageCount - 1 ? "default" : "pointer",
                opacity: safe >= pageCount - 1 ? 0.5 : 1,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HealthSettings() {
  const { section } = useParams();
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const isSub = !!section && !!SUB_LABELS[section];
  const title = isSub
    ? SUB_LABELS[section as string]
    : section === "alerts"
      ? "Health · Alerts"
      : "Health Overview";

  return (
    <div style={{ padding: "40px 48px", maxWidth: 1400, width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <Activity size={20} color={S.textPrimary} />
        <h1
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: S.textPrimary,
            margin: 0,
          }}
        >
          {title}
        </h1>
        <ScopeBadge scope="Organization" />
      </div>
      <p style={{ fontSize: 13, color: S.textMuted, margin: "0 0 22px" }}>
        {isSub
          ? "Live checks plus the filterable history of this subsystem's health samples."
          : "Head‑to‑toe status of every subsystem. Pick a subsystem in the sidebar for its filterable audit table. Auto‑refreshes every 30s."}
      </p>

      {!section && <StatusView filters={filters} setFilters={setFilters} />}
      {isSub && <SubsystemView subsystem={section as string} />}
      {section === "alerts" && <AlertsView />}
    </div>
  );
}

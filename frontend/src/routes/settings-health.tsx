/* eslint-disable i18next/no-literal-string, no-nested-ternary, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, jsx-a11y/label-has-associated-control, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- CloudGuard Health tab */
import React from "react";
import { Activity, RefreshCw } from "lucide-react";
import {
  ScopeBadge,
  LiveCardSkeleton,
  ConfirmButton,
} from "#/components/features/settings/settings-kit";
import { Capable } from "#/components/features/acp/capable";
import {
  useHealth,
  useHealthSeries,
  useHealthSnapshots,
  useHealthHistory,
  useHealthProbe,
} from "#/hooks/query/use-cloudguard";
import { useLiveCollection } from "#/hooks/use-live-collection";
import type { CGHealthSubsystem } from "#/api/cloudguard-service";

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
const METRIC_HINTS: Record<string, string> = {
  control_plane: "pending_approvals | active_kills | audit_entries",
  llm: "latency_p95_ms | error_rate | tokens_per_min",
  tools: "error_rate | executions",
  container: "cpu_pct | mem_pct | disk_write_mb | net_sent_mb",
  connector: "healthy | connectors",
  env_model: "coverage_pct | last_model_run_age",
  mcp: "tools | latency_ms",
  sandbox: "live | provision_fail_rate",
};

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

// ── Sparkline from a score/metric series ─────────────────────────────────────
function Sparkline({
  subsystem,
  metric,
}: {
  subsystem: string;
  metric: string;
}) {
  const { data } = useHealthSeries(subsystem, metric, 60);
  const pts = data ?? [];
  if (pts.length < 2)
    return (
      <div style={{ height: 28, color: S.textMuted, fontSize: 11 }}>—</div>
    );
  const vals = pts.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const w = 180;
  const h = 28;
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p.value - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <path d={d} fill="none" stroke={S.accent} strokeWidth={1.5} />
    </svg>
  );
}

// ── A single subsystem status card ───────────────────────────────────────────
function HealthCard({ s }: { s: CGHealthSubsystem }) {
  const [open, setOpen] = React.useState(false);
  const metricKeys = Object.keys(s.metrics || {}).slice(0, 4);
  return (
    <div
      style={{
        background: S.cardBg,
        border: `1px solid ${s.status === "fail" ? S.danger : s.status === "degraded" ? S.warning : S.border}`,
        borderRadius: 10,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dot st={s.status} />
          <span
            style={{ fontSize: 13.5, fontWeight: 600, color: S.textPrimary }}
          >
            {s.sub}
          </span>
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: statusColor(s.status),
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {s.st}
        </span>
      </div>
      <div style={{ fontSize: 12, color: S.textMuted }}>{s.summary}</div>
      {metricKeys.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {metricKeys.map((k) => (
            <span
              key={k}
              style={{
                fontSize: 11,
                color: S.textSecondary,
                background: S.badgeBg,
                borderRadius: 99,
                padding: "2px 8px",
              }}
            >
              {k.replace(/_/g, " ")}: {s.metrics[k]}
            </span>
          ))}
        </div>
      )}
      {s.status !== "skip" && (
        <Sparkline subsystem={s.subsystem} metric="score" />
      )}
      {(s.detail || []).length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            alignSelf: "flex-start",
            background: "none",
            border: "none",
            color: S.accent,
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {open ? "Hide checks" : "View checks"}
        </button>
      )}
      {open &&
        (s.detail || []).map((d) => (
          <div
            key={d.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
              padding: "4px 0",
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
  const { data, isLoading, isError } = useHealth(filters);
  const probe = useHealthProbe();
  const upd = (k: string, v: string) =>
    setFilters({ ...filters, [k]: v || undefined } as Record<string, string>);

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
        {(
          [
            "workspace",
            "user",
            "environment",
            "connector",
            "conversation",
          ] as const
        ).map((k) => (
          <input
            key={k}
            value={filters[k] || ""}
            onChange={(e) => upd(k, e.target.value)}
            placeholder={k}
            style={{ ...fieldStyle, width: 150 }}
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
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Dot st={data.overall} size={12} />
            <span
              style={{ fontSize: 15, fontWeight: 600, color: S.textPrimary }}
            >
              Overall: {data.overall.toUpperCase()}
            </span>
            <span style={{ fontSize: 12, color: S.textMuted }}>
              {data.subsystems.filter((s) => s.status === "ok").length} ok ·{" "}
              {data.subsystems.filter((s) => s.status === "degraded").length}{" "}
              degraded ·{" "}
              {data.subsystems.filter((s) => s.status === "fail").length} down ·{" "}
              {data.subsystems.filter((s) => s.status === "skip").length} n/a
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {data.subsystems.map((s) => (
              <HealthCard key={s.subsystem} s={s} />
            ))}
          </div>
        </>
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
  const fired = (useHealthHistory(100).data ?? []).filter(
    (e) => e.action === "health.alert.fired",
  );
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
              display: "flex",
              gap: 12,
              padding: "8px 16px",
              borderBottom: "1px solid var(--cg-border-subtle)",
              fontSize: 12,
            }}
          >
            <span style={{ color: S.textMuted, fontFamily: "monospace" }}>
              {e.ts}
            </span>
            <span style={{ color: S.textSecondary }}>{e.action}</span>
            <span style={{ color: S.textMuted }}>{e.resource}</span>
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
                <Field
                  label={`Metric (${METRIC_HINTS[form.subsystem] || "metric"})`}
                >
                  <input
                    value={form.metric}
                    onChange={(e) => setF({ metric: e.target.value })}
                    style={{ ...fieldStyle, width: "100%", height: 36 }}
                  />
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

// ── History view (scrub-back over persisted snapshots) ───────────────────────
const WINDOWS: [string, number][] = [
  ["1h", 3600],
  ["24h", 86400],
  ["7d", 604800],
  ["90d", 7776000],
];
function HistoryView() {
  const [win, setWin] = React.useState(3600);
  const { data: snaps, isLoading } = useHealthSnapshots(win);
  const transitions = (useHealthHistory(200).data ?? []).filter((e) =>
    (e.action || "").includes("->"),
  );
  const rows = (snaps ?? []).slice().reverse();
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {WINDOWS.map(([l, v]) => (
          <button
            key={v}
            type="button"
            onClick={() => setWin(v)}
            style={{
              height: 30,
              padding: "0 12px",
              borderRadius: 6,
              border: `1px solid ${win === v ? S.accent : S.borderStrong}`,
              background: win === v ? "rgba(45,134,212,0.12)" : "transparent",
              color: win === v ? S.textPrimary : S.textMuted,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            {l}
          </button>
        ))}
      </div>
      {isLoading && <LiveCardSkeleton lines={4} />}
      <div
        style={{
          border: `1px solid ${S.border}`,
          borderRadius: 8,
          overflow: "hidden",
          background: S.cardBg,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 90px 1fr",
            padding: "8px 16px",
            borderBottom: `1px solid ${S.border}`,
            fontSize: 10,
            fontWeight: 600,
            color: S.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          <span>Time</span>
          <span>Overall</span>
          <span>Subsystems</span>
        </div>
        {rows.length === 0 && (
          <div style={{ padding: 14, fontSize: 12.5, color: S.textMuted }}>
            No snapshots stored yet — they accrue as the tab polls (≈ every
            minute).
          </div>
        )}
        {rows.map((snap) => (
          <div
            key={snap.ts}
            style={{
              display: "grid",
              gridTemplateColumns: "180px 90px 1fr",
              padding: "8px 16px",
              borderBottom: "1px solid var(--cg-border-subtle)",
              alignItems: "center",
              fontSize: 12,
            }}
          >
            <span style={{ color: S.textMuted, fontFamily: "monospace" }}>
              {snap.ts}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: statusColor(snap.overall),
              }}
            >
              <Dot st={snap.overall} size={7} /> {snap.overall}
            </span>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {snap.subsystems.map((s) => (
                <span
                  key={s.subsystem}
                  title={`${s.subsystem}: ${s.summary}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: S.textMuted,
                  }}
                >
                  <Dot st={s.status} size={6} />
                  {s.subsystem}
                </span>
              ))}
            </span>
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
        Audited transitions
      </h3>
      <div
        style={{
          border: `1px solid ${S.border}`,
          borderRadius: 8,
          overflow: "hidden",
          background: S.cardBg,
        }}
      >
        {transitions.length === 0 && (
          <div style={{ padding: 14, fontSize: 12.5, color: S.textMuted }}>
            No status changes recorded.
          </div>
        )}
        {transitions.map((e) => (
          <div
            key={e.entry_hash}
            style={{
              display: "flex",
              gap: 12,
              padding: "8px 16px",
              borderBottom: "1px solid var(--cg-border-subtle)",
              fontSize: 12,
            }}
          >
            <span style={{ color: S.textMuted, fontFamily: "monospace" }}>
              {e.ts}
            </span>
            <span style={{ color: S.textSecondary }}>{e.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HealthSettings() {
  const [seg, setSeg] = React.useState<"status" | "alerts" | "history">(
    "status",
  );
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  return (
    <div style={{ padding: "40px 48px", maxWidth: 1040 }}>
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
          Health
        </h1>
        <ScopeBadge scope="Organization" />
      </div>
      <p style={{ fontSize: 13, color: S.textMuted, margin: "0 0 20px" }}>
        Head‑to‑toe status of every subsystem — control plane, LLM, tools,
        runtime container, environment modelling, MCP, sandboxes and connectors.
        Auto‑refreshes every 30s.
      </p>

      <div style={{ display: "flex", gap: 4, marginBottom: 22 }}>
        {(["status", "alerts", "history"] as const).map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => setSeg(x)}
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: 6,
              border: "none",
              background: seg === x ? S.inputBg : "transparent",
              color: seg === x ? S.textPrimary : S.textMuted,
              fontSize: 13,
              fontWeight: seg === x ? 600 : 400,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {x}
          </button>
        ))}
      </div>

      {seg === "status" && (
        <StatusView filters={filters} setFilters={setFilters} />
      )}
      {seg === "alerts" && <AlertsView />}
      {seg === "history" && <HistoryView />}
    </div>
  );
}

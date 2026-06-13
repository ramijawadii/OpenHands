/* eslint-disable i18next/no-literal-string, no-nested-ternary, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, jsx-a11y/label-has-associated-control -- CloudGuard Models & Inference tab */
import React from "react";
import { useParams } from "react-router";
import { Brain, ArrowUpCircle } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ScopeBadge,
  LiveCardSkeleton,
  ConfirmButton,
} from "#/components/features/settings/settings-kit";
import { Capable } from "#/components/features/acp/capable";
import {
  useLlmConfig,
  useSaveLlmConfig,
  useLlmRegistry,
  useLlmMigrate,
  useLlmRollback,
  useLlmOverview,
  useLlmAnalytics,
  useLlmLogs,
  useLlmSeed,
} from "#/hooks/query/use-cloudguard";
import type { CGLlmModel } from "#/api/cloudguard-service";

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

const SECTION_TITLE: Record<string, string> = {
  models: "Models",
  inference: "Inference Configuration",
  routing: "Routing & Fallbacks",
  usage: "Usage",
  performance: "Performance",
  reliability: "Reliability",
  quality: "Quality",
  cost: "Cost",
  quotas: "Quotas & Limits",
  logs: "Logs & Traces",
};

const num = (v: unknown) =>
  typeof v === "number" ? v.toLocaleString() : v == null ? "—" : String(v);
const usd = (v: unknown) =>
  typeof v === "number"
    ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : "—";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  height: 34,
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
};
const optBg = { background: "var(--cg-bg-card)" } as const;

function Card({
  title,
  children,
  right,
}: {
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: S.cardBg,
        border: `1px solid ${S.border}`,
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: S.textPrimary,
              margin: 0,
            }}
          >
            {title}
          </h2>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function KV({
  k,
  v,
  accent,
}: {
  k: string;
  v: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "7px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
        fontSize: 12.5,
      }}
    >
      <span style={{ color: S.textMuted }}>{k}</span>
      <span
        style={{
          color: accent ? S.textPrimary : S.textSecondary,
          fontWeight: accent ? 600 : 400,
          fontFamily: "monospace",
        }}
      >
        {v}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        background: S.cardBg,
        border: `1px solid ${S.border}`,
        borderRadius: 10,
        padding: "14px 16px",
        minWidth: 140,
        flex: 1,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 600, color: S.textPrimary }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((c) => (
        <span
          key={c}
          style={{
            fontSize: 11,
            color: S.textSecondary,
            background: S.badgeBg,
            borderRadius: 99,
            padding: "2px 8px",
          }}
        >
          {c.replace(/_/g, " ")}
        </span>
      ))}
    </span>
  );
}

const CHART_GRID = "var(--cg-border-subtle)";
const TT_STYLE = {
  background: "var(--cg-bg-card)",
  border: "1px solid var(--cg-border-strong)",
  borderRadius: 6,
  fontSize: 12,
};

// Area trend over days. `keys` are the series to stack/overlay.
function TrendChart({
  title,
  data,
  keys,
  colors,
}: {
  title: string;
  data: Record<string, unknown>[];
  keys: string[];
  colors: string[];
}) {
  return (
    <Card title={title}>
      {data.length === 0 ? (
        <div style={{ fontSize: 12.5, color: S.textMuted }}>No data yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={data}
            margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "var(--cg-text-muted)" }}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--cg-text-muted)" }}
              tickLine={false}
              width={44}
            />
            <RTooltip contentStyle={TT_STYLE} />
            {keys.map((k, i) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stroke={colors[i]}
                fill={colors[i]}
                fillOpacity={0.18}
                strokeWidth={1.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function LineSeries({
  title,
  data,
  keys,
  colors,
}: {
  title: string;
  data: Record<string, unknown>[];
  keys: string[];
  colors: string[];
}) {
  return (
    <Card title={title}>
      {data.length === 0 ? (
        <div style={{ fontSize: 12.5, color: S.textMuted }}>No data yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={data}
            margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "var(--cg-text-muted)" }}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--cg-text-muted)" }}
              tickLine={false}
              width={44}
            />
            <RTooltip contentStyle={TT_STYLE} />
            {keys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={colors[i]}
                strokeWidth={1.6}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

// Horizontal-ish bar of a key→number record.
function BarBreakdown({
  title,
  data,
  color,
  fmt = num,
}: {
  title: string;
  data: Record<string, unknown> | undefined;
  color: string;
  fmt?: (v: unknown) => string;
}) {
  const rows = Object.entries(data || {}).map(([name, value]) => ({
    name,
    value: typeof value === "number" ? value : Number(value) || 0,
  }));
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: S.textMuted }}>No data yet.</div>
      ) : (
        <ResponsiveContainer
          width="100%"
          height={Math.max(120, rows.length * 38)}
        >
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
          >
            <CartesianGrid stroke={CHART_GRID} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "var(--cg-text-muted)" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--cg-text-nav)" }}
              tickLine={false}
              width={130}
            />
            <RTooltip
              contentStyle={TT_STYLE}
              formatter={(v) => fmt(v as number)}
            />
            <Bar
              dataKey="value"
              fill={color}
              radius={[0, 3, 3, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

const WINDOWS: [string, number][] = [
  ["24h", 86400],
  ["7d", 604800],
  ["30d", 2592000],
  ["90d", 7776000],
];
function WindowSelect({
  win,
  setWin,
}: {
  win: number;
  setWin: (n: number) => void;
}) {
  return (
    <select
      aria-label="Window"
      value={win}
      onChange={(e) => setWin(Number(e.target.value))}
      style={{ ...selectStyle, width: 110, height: 30 }}
    >
      {WINDOWS.map(([l, v]) => (
        <option key={v} value={v} style={optBg}>
          Last {l}
        </option>
      ))}
    </select>
  );
}

// ── Overview ────────────────────────────────────────────────────────────────
function Overview() {
  const { data, isLoading } = useLlmOverview();
  const cfgQ = useLlmConfig();
  const seed = useLlmSeed();
  if (isLoading) return <LiveCardSkeleton lines={4} />;
  if (!data) return null;
  const up = data.scheduled_upgrade as Record<string, unknown> | null;
  const cfg = (cfgQ.data || {}) as Record<string, unknown>;
  const empty = !data.requests;
  return (
    <div>
      {up && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(224,154,45,0.12)",
            border: `1px solid rgba(224,154,45,0.4)`,
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 13,
            color: S.textSecondary,
          }}
        >
          <ArrowUpCircle size={18} color={S.warning} />
          Vendor default advanced to <b>{String(up.to_model)}</b> (
          {String(up.to_version)}). Review and migrate in Models — never applied
          automatically.
        </div>
      )}
      <Card title="Active configuration">
        <KV
          k="Active model"
          v={`${data.active_model} · ${data.model_version}`}
          accent
        />
        <KV k="Fallback model" v={String(data.fallback_model)} />
        <KV k="Inference region" v={String(data.region)} />
      </Card>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Stat label="Requests (30d)" value={num(data.requests)} />
        <Stat
          label="Successful inference"
          value={
            typeof data.success_rate_pct === "number"
              ? `${data.success_rate_pct}%`
              : "—"
          }
        />
        <Stat
          label="P95 latency"
          value={
            typeof data.latency_p95_ms === "number" && data.latency_p95_ms
              ? `${data.latency_p95_ms} ms`
              : "—"
          }
        />
        <Stat label="Input tokens" value={num(data.input_tokens)} />
        <Stat label="Output tokens" value={num(data.output_tokens)} />
        <Stat label="Est. cost (30d)" value={usd(data.estimated_cost_usd)} />
      </div>

      {/* CISO-facing governance posture — what a security buyer must be able to prove */}
      <div style={{ marginTop: 16 }}>
        <Card title="Governance & data">
          <KV
            k="Model control"
            v="Pinned · controlled migration (no silent vendor change)"
            accent
          />
          <KV
            k="Provider · region (residency)"
            v={`${cfg.provider} · ${cfg.region}`}
          />
          <KV
            k="Prompt/response logging"
            v={
              cfg.logging_policy === "content"
                ? "content captured"
                : "metadata only"
            }
          />
          <KV k="Fallback model" v={String(data.fallback_model)} />
          <KV
            k="Inference preset"
            v={`${cfg.preset} (temp ${cfg.temperature})`}
          />
          <KV k="Change control" v="audited — see Models › change history" />
        </Card>
      </div>

      {empty && (
        <Capable cap="remediate">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 4,
              fontSize: 12.5,
              color: S.textMuted,
            }}
          >
            No live inference telemetry yet.
            <button
              type="button"
              disabled={seed.isPending}
              onClick={() => seed.mutate(600)}
              style={{
                height: 32,
                padding: "0 14px",
                borderRadius: 6,
                background: "var(--cg-text-primary)",
                color: "var(--cg-bg-card)",
                border: "none",
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {seed.isPending ? "Loading…" : "Load sample data"}
            </button>
            <span>
              — populates the analytics + charts with synthetic records
              (demo/eval).
            </span>
          </div>
        </Capable>
      )}
      <p style={{ fontSize: 12, color: S.textMuted, marginTop: 14 }}>
        Operational metrics derive from live inference telemetry; they read 0/—
        until the inference pipeline emits for this tenant (or sample data is
        loaded).
      </p>
    </div>
  );
}

// ── Models (config + lifecycle + controlled migration) ───────────────────────
function Models() {
  const cfgQ = useLlmConfig();
  const regQ = useLlmRegistry();
  const migrate = useLlmMigrate();
  const rollback = useLlmRollback();
  const [pick, setPick] = React.useState("");
  if (cfgQ.isLoading || regQ.isLoading) return <LiveCardSkeleton lines={4} />;
  const cfg = (cfgQ.data || {}) as Record<string, unknown>;
  const reg = regQ.data;
  const models = reg?.models || [];
  const active = models.find((m) => m.id === cfg.active_model);
  const history =
    (cfg.version_history as {
      active_model?: string;
      model_version?: string;
      ts?: string;
    }[]) || [];
  const target = models.find((m) => m.id === pick);

  return (
    <div>
      <Card title="Active model">
        <KV k="Model" v={`${cfg.active_model} · ${cfg.model_version}`} accent />
        <KV k="Provider" v={String(cfg.provider)} />
        <KV k="Region" v={String(cfg.region)} />
        <KV k="Fallback" v={String(cfg.fallback_model)} />
        <KV k="Context window" v={num(active?.context_window)} />
        {active && (
          <div style={{ paddingTop: 10 }}>
            <Chips items={active.capabilities} />
          </div>
        )}
      </Card>

      <Card title="Available models">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 120px 1fr 90px 1fr",
            gap: 8,
            padding: "6px 0",
            borderBottom: `1px solid ${S.border}`,
            fontSize: 10,
            fontWeight: 600,
            color: S.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Model</span>
          <span>Context</span>
          <span>Capabilities</span>
          <span>Status</span>
          <span style={{ textAlign: "right" }}>Out $/1M</span>
        </div>
        {models.map((m: CGLlmModel) => (
          <div
            key={m.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 120px 1fr 90px 1fr",
              gap: 8,
              padding: "9px 0",
              borderBottom: "1px solid var(--cg-border-subtle)",
              alignItems: "center",
              fontSize: 12.5,
            }}
          >
            <span style={{ color: S.textPrimary }}>
              {m.label}
              {m.id === cfg.active_model && (
                <span style={{ color: S.success }}> · active</span>
              )}
            </span>
            <span style={{ color: S.textMuted, fontFamily: "monospace" }}>
              {num(m.context_window)}
            </span>
            <span>
              <Chips items={m.capabilities.slice(0, 3)} />
            </span>
            <span
              style={{
                color: m.status === "deprecated" ? S.warning : S.textSecondary,
              }}
            >
              {m.status}
            </span>
            <span
              style={{
                textAlign: "right",
                fontFamily: "monospace",
                color: S.textSecondary,
              }}
            >
              ${m.price.output_per_1m}
            </span>
          </div>
        ))}
      </Card>

      <Capable cap="admin">
        <Card title="Controlled migration">
          <p style={{ fontSize: 12, color: S.textMuted, margin: "0 0 12px" }}>
            Changing the active model is explicit and audited — the prior
            version is kept for one-click rollback.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              style={{ ...selectStyle, width: 280 }}
            >
              <option value="" style={optBg}>
                Select a model to migrate to…
              </option>
              {models
                .filter(
                  (m) => m.id !== cfg.active_model && m.status !== "deprecated",
                )
                .map((m) => (
                  <option key={m.id} value={m.id} style={optBg}>
                    {m.label} ({m.versions[0]})
                  </option>
                ))}
            </select>
            <ConfirmButton
              variant="ghost"
              label="Migrate"
              title={`Migrate to ${target?.label || ""}?`}
              body={`Active model becomes ${target?.label} (${target?.versions[0]}). This is audited and reversible.`}
              confirmLabel="Migrate"
              onConfirm={() =>
                target &&
                migrate.mutate({
                  toModel: target.id,
                  toVersion: target.versions[0],
                })
              }
            />
            {history.length > 0 && (
              <ConfirmButton
                variant="ghost"
                label="Rollback"
                title="Roll back to the previous model?"
                body={`Restores ${history[history.length - 1]?.active_model} · ${history[history.length - 1]?.model_version}.`}
                confirmLabel="Rollback"
                onConfirm={() => rollback.mutate()}
              />
            )}
          </div>
        </Card>
      </Capable>

      <Card title="Model-change history">
        {history.length === 0 ? (
          <div style={{ fontSize: 12.5, color: S.textMuted }}>
            No model changes recorded.
          </div>
        ) : (
          history
            .slice()
            .reverse()
            .map((h, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <KV
                key={i}
                k={String(h.ts || "")}
                v={`${h.active_model} · ${h.model_version}`}
              />
            ))
        )}
      </Card>
    </div>
  );
}

// ── Editable config form (Inference / Routing / Cost budget / Quotas) ─────────
type FieldSpec = {
  key: string;
  label: string;
  type: "number" | "text" | "bool" | "select";
  options?: string[];
};
function ConfigForm({ specs, note }: { specs: FieldSpec[]; note?: string }) {
  const cfgQ = useLlmConfig();
  const save = useSaveLlmConfig();
  const [form, setForm] = React.useState<Record<string, unknown>>({});
  const [dirty, setDirty] = React.useState(false);
  React.useEffect(() => {
    if (cfgQ.data && !dirty) setForm(cfgQ.data as Record<string, unknown>);
  }, [cfgQ.data, dirty]);
  if (cfgQ.isLoading) return <LiveCardSkeleton lines={4} />;
  const set = (k: string, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  const onSave = () => {
    const patch: Record<string, unknown> = {};
    specs.forEach((s) => {
      patch[s.key] = form[s.key];
    });
    save.mutate(patch, { onSuccess: () => setDirty(false) });
  };
  return (
    <Card
      title="Configuration"
      right={
        note ? (
          <span style={{ fontSize: 11.5, color: S.textMuted }}>{note}</span>
        ) : undefined
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {specs.map((s) => (
          <div key={s.key}>
            <div style={{ fontSize: 12, color: S.textMuted, marginBottom: 6 }}>
              {s.label}
            </div>
            {s.type === "bool" ? (
              <button
                type="button"
                onClick={() => set(s.key, !form[s.key])}
                style={{
                  ...fieldStyle,
                  width: "auto",
                  cursor: "pointer",
                  color: form[s.key] ? S.success : S.textMuted,
                }}
              >
                {form[s.key] ? "Enabled" : "Disabled"}
              </button>
            ) : s.type === "select" ? (
              <select
                value={String(form[s.key] ?? "")}
                onChange={(e) => set(s.key, e.target.value)}
                style={selectStyle}
              >
                {(s.options || []).map((o) => (
                  <option key={o} value={o} style={optBg}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={s.type === "number" ? "number" : "text"}
                value={String(form[s.key] ?? "")}
                onChange={(e) =>
                  set(
                    s.key,
                    s.type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                  )
                }
                style={fieldStyle}
              />
            )}
          </div>
        ))}
      </div>
      <Capable cap="admin">
        <div
          style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}
        >
          <button
            type="button"
            disabled={!dirty}
            onClick={onSave}
            style={{
              height: 36,
              padding: "0 18px",
              borderRadius: 6,
              background: dirty ? "var(--cg-text-primary)" : "transparent",
              color: dirty ? "var(--cg-bg-card)" : S.textMuted,
              border: dirty ? "none" : `1px solid ${S.borderStrong}`,
              fontSize: 13,
              fontWeight: 500,
              cursor: dirty ? "pointer" : "default",
            }}
          >
            Save changes
          </button>
        </div>
      </Capable>
    </Card>
  );
}

// ── Analytics sections ────────────────────────────────────────────────────
function AnalyticsView({ section }: { section: string }) {
  const [win, setWin] = React.useState(2592000);
  const { data, isLoading } = useLlmAnalytics(section, { window: win });
  const d = (data || {}) as Record<string, unknown>;
  const stats: Record<string, [string, React.ReactNode][]> = {
    usage: [
      ["Requests", num(d.requests)],
      ["Input tokens", num(d.input_tokens)],
      ["Output tokens", num(d.output_tokens)],
      ["Cached tokens", num(d.cached_input_tokens)],
      ["Avg tokens/req", num(d.avg_tokens_per_request)],
    ],
    performance: [
      ["TTFT", d.ttft_ms ? `${d.ttft_ms} ms` : "—"],
      ["P50", d.latency_p50_ms ? `${d.latency_p50_ms} ms` : "—"],
      ["P95", d.latency_p95_ms ? `${d.latency_p95_ms} ms` : "—"],
      ["P99", d.latency_p99_ms ? `${d.latency_p99_ms} ms` : "—"],
      ["Tokens/sec", num(d.tokens_per_sec)],
      ["Agent run P95", d.agent_run_p95_ms ? `${d.agent_run_p95_ms} ms` : "—"],
    ],
    reliability: [
      ["Success", `${d.success_rate_pct ?? 0}%`],
      ["Error rate", `${d.error_rate_pct ?? 0}%`],
      ["Failed", num(d.failed)],
      ["Fallback rate", `${d.fallback_rate_pct ?? 0}%`],
      ["Retry rate", `${d.retry_rate_pct ?? 0}%`],
    ],
    cost: [
      ["Total", usd(d.total_usd)],
      ["Avg / request", usd(d.avg_cost_per_request_usd)],
    ],
    routing: [
      ["Requests", num(d.requests)],
      ["Fallback rate", `${d.fallback_rate_pct ?? 0}%`],
    ],
  };
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
        }}
      >
        <WindowSelect win={win} setWin={setWin} />
      </div>
      {isLoading ? (
        <LiveCardSkeleton lines={3} />
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {(stats[section] || []).map(([l, v]) => (
              <Stat key={l} label={l} value={v} />
            ))}
          </div>
          {section === "usage" && (
            <>
              <TrendChart
                title="Requests & tokens over time"
                data={(d.over_time as Record<string, unknown>[]) || []}
                keys={["requests", "output_tokens"]}
                colors={[S.accent, "#9b87f5"]}
              />
              <BarBreakdown
                title="Requests by model"
                data={d.by_model as Record<string, unknown>}
                color={S.accent}
              />
              <BarBreakdown
                title="Requests by workflow"
                data={d.by_workflow as Record<string, unknown>}
                color="#9b87f5"
              />
            </>
          )}
          {section === "performance" && (
            <LineSeries
              title="Latency over time (p95 / p50)"
              data={(d.latency_series as Record<string, unknown>[]) || []}
              keys={["p95_ms", "p50_ms"]}
              colors={[S.warning, S.accent]}
            />
          )}
          {section === "reliability" && (
            <BarBreakdown
              title="Errors by category"
              data={d.errors_by_category as Record<string, unknown>}
              color={S.danger}
            />
          )}
          {section === "cost" && (
            <>
              <TrendChart
                title="Cost over time"
                data={(d.over_time as Record<string, unknown>[]) || []}
                keys={["cost"]}
                colors={[S.success]}
              />
              <BarBreakdown
                title="Cost by model"
                data={d.by_model as Record<string, unknown>}
                color={S.success}
                fmt={usd}
              />
              <BarBreakdown
                title="Cost by workflow"
                data={d.by_workflow as Record<string, unknown>}
                color={S.success}
                fmt={usd}
              />
            </>
          )}
          {section === "routing" && (
            <>
              <BarBreakdown
                title="Distribution by model (%)"
                data={d.distribution as Record<string, unknown>}
                color={S.accent}
              />
              <BarBreakdown
                title="Fallback reasons"
                data={d.fallback_reasons as Record<string, unknown>}
                color={S.warning}
              />
            </>
          )}
          <p style={{ fontSize: 12, color: S.textMuted, marginTop: 8 }}>
            Derived from live inference telemetry; empty until the pipeline
            emits for this tenant (no fabricated data).
          </p>
        </>
      )}
    </div>
  );
}

// ── Logs & Traces ─────────────────────────────────────────────────────────
function Logs() {
  const [win, setWin] = React.useState(86400);
  const { data, isLoading } = useLlmLogs({ window: win, limit: 200 });
  const rows = (data?.rows || []) as Record<string, unknown>[];
  const cols: [string, string][] = [
    ["ts", "Time"],
    ["model", "Model"],
    ["workflow", "Workflow"],
    ["input_tokens", "In"],
    ["output_tokens", "Out"],
    ["latency_ms", "Latency"],
    ["finish_reason", "Finish"],
    ["error_code", "Error"],
    ["cost_usd", "Cost"],
    ["trace_id", "Trace"],
  ];
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 12, color: S.textMuted }}>
          Metadata only — prompt/response content is not stored unless the org
          logging policy enables it.
        </span>
        <WindowSelect win={win} setWin={setWin} />
      </div>
      {isLoading ? (
        <LiveCardSkeleton lines={4} />
      ) : (
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
              gridTemplateColumns:
                "150px 1fr 1fr 50px 50px 80px 70px 70px 70px 1fr",
              gap: 8,
              padding: "8px 14px",
              borderBottom: `1px solid ${S.border}`,
              fontSize: 10,
              fontWeight: 600,
              color: S.textMuted,
              textTransform: "uppercase",
            }}
          >
            {cols.map(([, l]) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: S.textMuted }}>
              No inference records in this window yet.
            </div>
          ) : (
            rows.map((r, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "150px 1fr 1fr 50px 50px 80px 70px 70px 70px 1fr",
                  gap: 8,
                  padding: "8px 14px",
                  borderBottom: "1px solid var(--cg-border-subtle)",
                  fontSize: 11.5,
                  fontFamily: "monospace",
                  color: S.textSecondary,
                }}
              >
                {cols.map(([k]) => (
                  <span
                    key={k}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: k === "error_code" && r[k] ? S.danger : undefined,
                    }}
                  >
                    {r[k] == null ? "—" : String(r[k])}
                  </span>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Quality (honest: needs an eval harness) ──────────────────────────────────
function Quality() {
  const metrics = [
    "Task completion rate",
    "Structured-output validity",
    "Tool-selection accuracy",
    "Tool-argument validity",
    "Response acceptance rate",
    "Human escalation rate",
    "Evaluation score by workflow",
  ];
  return (
    <div>
      <Card title="Evaluation status">
        <div style={{ fontSize: 13, color: S.textSecondary }}>
          No evaluation dataset configured. Quality metrics are only shown when
          backed by a defined evaluation dataset and method — never a generic
          accuracy number.
        </div>
      </Card>
      <Card title="Metrics (pending evaluation harness)">
        {metrics.map((m) => (
          <div
            key={m}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid var(--cg-border-subtle)",
              fontSize: 12.5,
            }}
          >
            <span style={{ color: S.textSecondary }}>{m}</span>
            <span style={{ color: S.textMuted }}>
              definition · sample size · method · last evaluated — —
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Quotas (limits config + utilisation) ─────────────────────────────────────
function Quotas() {
  const cfgQ = useLlmConfig();
  if (cfgQ.isLoading) return <LiveCardSkeleton lines={4} />;
  const c = (cfgQ.data || {}) as Record<string, unknown>;
  const limits: [string, unknown][] = [
    ["Requests / minute", c.rpm_limit],
    ["Tokens / minute", c.tpm_limit],
    ["Concurrent requests", c.concurrent_requests],
    ["Daily request limit", c.daily_request_limit],
    ["Monthly token allowance", c.monthly_token_allowance],
    ["Max context size", c.context_token_limit],
    ["Max output size", c.max_output_tokens],
    ["Max agent steps", c.max_agent_steps],
    ["Max execution duration (s)", c.request_timeout_s],
  ];
  return (
    <div>
      <Card title="Operational limits">
        {limits.map(([l, v]) => (
          <KV key={l} k={l} v={`${num(v)}  ·  current —`} />
        ))}
        <p style={{ fontSize: 11.5, color: S.textMuted, marginTop: 10 }}>
          Current utilisation populates from live telemetry. Edit limits in
          Inference / Cost; request an increase below.
        </p>
      </Card>
      <Capable cap="remediate">
        <button
          type="button"
          style={{
            height: 34,
            padding: "0 14px",
            borderRadius: 6,
            background: "transparent",
            border: `1px solid ${S.borderStrong}`,
            color: S.textSecondary,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Request a limit increase
        </button>
      </Capable>
    </div>
  );
}

export default function LlmSettings() {
  const { section } = useParams();
  const title = section
    ? SECTION_TITLE[section] || "Models & Inference"
    : "Overview";
  return (
    <div style={{ padding: "40px 48px", maxWidth: 1100, width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <Brain size={20} color={S.textPrimary} />
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
        Manage the model CloudGuard runs for you and review real inference
        operations. Config is yours to change (audited); analytics derive from
        live telemetry.
      </p>

      {!section && <Overview />}
      {section === "models" && <Models />}
      {section === "inference" && (
        <ConfigForm
          note="Security workflows default to Deterministic/Balanced"
          specs={[
            {
              key: "preset",
              label: "Preset",
              type: "select",
              options: ["deterministic", "balanced", "creative", "custom"],
            },
            { key: "temperature", label: "Temperature", type: "number" },
            {
              key: "max_output_tokens",
              label: "Max output tokens",
              type: "number",
            },
            {
              key: "context_token_limit",
              label: "Context token limit",
              type: "number",
            },
            {
              key: "reasoning_effort",
              label: "Reasoning effort",
              type: "select",
              options: ["low", "medium", "high"],
            },
            {
              key: "response_format",
              label: "Response format",
              type: "select",
              options: ["text", "json"],
            },
            {
              key: "tool_calling_mode",
              label: "Tool-calling mode",
              type: "select",
              options: ["auto", "required", "none"],
            },
            {
              key: "max_tool_calls_per_run",
              label: "Max tool calls / run",
              type: "number",
            },
            {
              key: "max_agent_steps",
              label: "Max agent steps",
              type: "number",
            },
            {
              key: "request_timeout_s",
              label: "Request timeout (s)",
              type: "number",
            },
            { key: "retry_count", label: "Retry count", type: "number" },
            { key: "streaming", label: "Streaming", type: "bool" },
            {
              key: "parallel_tool_calls",
              label: "Parallel tool calls",
              type: "bool",
            },
          ]}
        />
      )}
      {section === "routing" && (
        <>
          <ConfigForm
            specs={[
              {
                key: "routing_policy",
                label: "Default routing policy",
                type: "select",
                options: ["default", "by_workflow", "by_task_type"],
              },
              {
                key: "max_fallback_attempts",
                label: "Max fallback attempts",
                type: "number",
              },
              {
                key: "fallback_on_timeout",
                label: "Fallback on timeout",
                type: "bool",
              },
              {
                key: "fallback_on_capacity",
                label: "Fallback on capacity",
                type: "bool",
              },
              {
                key: "fallback_on_region",
                label: "Fallback on region",
                type: "bool",
              },
            ]}
          />
          <AnalyticsView section="routing" />
        </>
      )}
      {section === "usage" && <AnalyticsView section="usage" />}
      {section === "performance" && <AnalyticsView section="performance" />}
      {section === "reliability" && <AnalyticsView section="reliability" />}
      {section === "quality" && <Quality />}
      {section === "cost" && (
        <>
          <ConfigForm
            note="Budget controls"
            specs={[
              {
                key: "monthly_budget_usd",
                label: "Monthly budget ($)",
                type: "number",
              },
              { key: "budget_warn_pct", label: "Warn at (%)", type: "number" },
              {
                key: "max_cost_per_run_usd",
                label: "Max cost / run ($)",
                type: "number",
              },
              {
                key: "lower_cost_routing",
                label: "Lower-cost routing",
                type: "bool",
              },
            ]}
          />
          <AnalyticsView section="cost" />
        </>
      )}
      {section === "quotas" && <Quotas />}
      {section === "logs" && <Logs />}
    </div>
  );
}

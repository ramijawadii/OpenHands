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
  useLlmQuotaIncrease,
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

type Tone = "ok" | "warn" | "crit" | "none";
const TONE_COLOR: Record<Tone, string> = {
  ok: S.success,
  warn: S.warning,
  crit: S.danger,
  none: S.textPrimary,
};
// higher-is-worse threshold → tone
const toneHi = (v: number, warn: number, crit: number): Tone =>
  v >= crit ? "crit" : v >= warn ? "warn" : "ok";
// higher-is-better threshold → tone
const toneLo = (v: number, warn: number, crit: number): Tone =>
  v <= crit ? "crit" : v <= warn ? "warn" : "ok";

function Stat({
  label,
  value,
  tone = "none",
  sub,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: S.cardBg,
        border: `1px solid ${tone === "none" ? S.border : TONE_COLOR[tone]}`,
        borderRadius: 10,
        padding: "14px 16px",
        minWidth: 140,
        flex: 1,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 600, color: TONE_COLOR[tone] }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: S.textMuted, marginTop: 2 }}>
          {sub}
        </div>
      )}
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

// ── Routing maps (ordered fallback chain + per-workflow model overrides) ─────
function RoutingMaps() {
  const cfgQ = useLlmConfig();
  const regQ = useLlmRegistry();
  const save = useSaveLlmConfig();
  const [order, setOrder] = React.useState<string[]>([]);
  const [map, setMap] = React.useState<Record<string, string>>({});
  const [dirty, setDirty] = React.useState(false);
  const [newWf, setNewWf] = React.useState("");
  React.useEffect(() => {
    if (cfgQ.data && !dirty) {
      const c = cfgQ.data as Record<string, unknown>;
      setOrder([...((c.fallback_order as string[]) || [])]);
      setMap({ ...((c.route_by_workflow as Record<string, string>) || {}) });
    }
  }, [cfgQ.data, dirty]);
  if (cfgQ.isLoading) return <LiveCardSkeleton lines={4} />;
  const models = (regQ.data?.models || []).map((m) => m.id);
  const active = String(
    (cfgQ.data as Record<string, unknown>)?.active_model || "",
  );
  const mut = (fn: () => void) => {
    fn();
    setDirty(true);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    mut(() => {
      const next = [...order];
      [next[i], next[j]] = [next[j], next[i]];
      setOrder(next);
    });
  };
  const onSave = () =>
    save.mutate(
      { fallback_order: order, route_by_workflow: map },
      { onSuccess: () => setDirty(false) },
    );
  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 0",
    borderBottom: "1px solid var(--cg-border-subtle)",
  };
  const miniBtn: React.CSSProperties = {
    height: 26,
    width: 30,
    borderRadius: 5,
    background: "transparent",
    border: `1px solid ${S.borderStrong}`,
    color: S.textSecondary,
    cursor: "pointer",
    fontSize: 13,
  };
  return (
    <Card title="Fallback chain & per-workflow routing">
      <div style={{ fontSize: 12, color: S.textMuted, marginBottom: 8 }}>
        Primary model is{" "}
        <strong style={{ color: S.textPrimary }}>{active}</strong>. Fallbacks
        are tried in order when the primary times out or is throttled.
      </div>
      {order.length === 0 ? (
        <div style={{ fontSize: 12.5, color: S.textMuted }}>
          No fallbacks configured.
        </div>
      ) : (
        order.map((m, i) => (
          <div key={m} style={rowStyle}>
            <span style={{ width: 22, color: S.textMuted, fontSize: 12 }}>
              {i + 1}.
            </span>
            <select
              value={m}
              onChange={(e) =>
                mut(() =>
                  setOrder(order.map((x, k) => (k === i ? e.target.value : x))),
                )
              }
              style={{ ...selectStyle, flex: 1 }}
            >
              {models.map((o) => (
                <option key={o} value={o} style={optBg}>
                  {o}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={miniBtn}
              onClick={() => move(i, -1)}
              disabled={i === 0}
            >
              ↑
            </button>
            <button
              type="button"
              style={miniBtn}
              onClick={() => move(i, 1)}
              disabled={i === order.length - 1}
            >
              ↓
            </button>
            <button
              type="button"
              style={{ ...miniBtn, color: S.danger }}
              onClick={() =>
                mut(() => setOrder(order.filter((_, k) => k !== i)))
              }
            >
              ×
            </button>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={() =>
          mut(() =>
            setOrder([
              ...order,
              models.find((x) => !order.includes(x)) || models[0],
            ]),
          )
        }
        disabled={!models.length}
        style={{
          ...miniBtn,
          width: "auto",
          padding: "0 12px",
          marginTop: 8,
          fontSize: 12.5,
        }}
      >
        + Add fallback
      </button>

      <div style={{ fontSize: 13, color: S.textPrimary, margin: "18px 0 6px" }}>
        Per-workflow model overrides
      </div>
      <div style={{ fontSize: 11.5, color: S.textMuted, marginBottom: 8 }}>
        Pin a specific model for a workflow (e.g. <code>compliance-report</code>{" "}
        on the most capable model). Requires routing policy “by_workflow”.
      </div>
      {Object.entries(map).map(([wf, mdl]) => (
        <div key={wf} style={rowStyle}>
          <span
            style={{
              flex: 1,
              fontSize: 12.5,
              color: S.textSecondary,
              fontFamily: "monospace",
            }}
          >
            {wf}
          </span>
          <select
            value={mdl}
            onChange={(e) =>
              mut(() => setMap({ ...map, [wf]: e.target.value }))
            }
            style={{ ...selectStyle, width: 240 }}
          >
            {models.map((o) => (
              <option key={o} value={o} style={optBg}>
                {o}
              </option>
            ))}
          </select>
          <button
            type="button"
            style={{ ...miniBtn, color: S.danger }}
            onClick={() =>
              mut(() => {
                const next = { ...map };
                delete next[wf];
                setMap(next);
              })
            }
          >
            ×
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          value={newWf}
          onChange={(e) => setNewWf(e.target.value)}
          placeholder="workflow id (e.g. threat-triage)"
          style={{ ...fieldStyle, flex: 1 }}
        />
        <button
          type="button"
          disabled={!newWf.trim() || !models.length}
          onClick={() =>
            mut(() => {
              setMap({ ...map, [newWf.trim()]: models[0] });
              setNewWf("");
            })
          }
          style={{
            ...miniBtn,
            width: "auto",
            padding: "0 12px",
            fontSize: 12.5,
          }}
        >
          + Add
        </button>
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
            Save routing
          </button>
        </div>
      </Capable>
    </Card>
  );
}

// ── Analytics sections ────────────────────────────────────────────────────
// Month-to-date budget gauge with a forecast marker and warn/over coloring.
function BudgetGauge({
  spent,
  forecast,
  budget,
  warnPct,
}: {
  spent: number;
  forecast: number;
  budget: number;
  warnPct: number;
}) {
  const spentPct = budget ? (spent / budget) * 100 : 0;
  const forecastPct = budget ? (forecast / budget) * 100 : 0;
  const tone = toneHi(forecastPct, warnPct, 100);
  const bar = TONE_COLOR[tone];
  return (
    <Card title="Month-to-date budget">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12.5,
          marginBottom: 8,
        }}
      >
        <span style={{ color: S.textSecondary }}>
          Spent <strong style={{ color: S.textPrimary }}>{usd(spent)}</strong>{" "}
          of {usd(budget)} ({spentPct.toFixed(0)}%)
        </span>
        <span style={{ color: bar }}>
          Forecast {usd(forecast)} ({forecastPct.toFixed(0)}%)
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: 12,
          borderRadius: 6,
          background: "var(--cg-bg-badge)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, spentPct)}%`,
            background: bar,
            transition: "width .3s",
          }}
        />
        {/* warn threshold marker */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${Math.min(100, warnPct)}%`,
            width: 2,
            background: S.warning,
            opacity: 0.8,
          }}
        />
        {/* forecast marker */}
        {forecastPct <= 100 && (
          <div
            style={{
              position: "absolute",
              top: -2,
              bottom: -2,
              left: `${Math.min(100, forecastPct)}%`,
              width: 2,
              background: S.textPrimary,
            }}
          />
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10.5,
          color: S.textMuted,
          marginTop: 4,
        }}
      >
        <span>$0</span>
        <span>warn {warnPct}%</span>
        <span>{usd(budget)}</span>
      </div>
      {forecastPct > 100 && (
        <p style={{ fontSize: 12, color: S.danger, marginTop: 8 }}>
          Projected to exceed budget by {usd(forecast - budget)} at the current
          run-rate.
        </p>
      )}
    </Card>
  );
}

// Shared filter bar — wired to the dimensions the analytics endpoints honor.
function FilterBar({
  filters,
  setFilters,
  models,
  workflows,
  workspaces,
}: {
  filters: Record<string, string>;
  setFilters: (f: Record<string, string>) => void;
  models: string[];
  workflows: string[];
  workspaces: string[];
}) {
  const sel = (k: string, label: string, opts: string[]) => (
    <select
      aria-label={label}
      value={filters[k] || ""}
      onChange={(e) =>
        setFilters({ ...filters, [k]: e.target.value || undefined } as Record<
          string,
          string
        >)
      }
      style={{ ...selectStyle, width: 160, height: 30 }}
    >
      <option value="" style={optBg}>
        {label}
      </option>
      {opts.map((o) => (
        <option key={o} value={o} style={optBg}>
          {o}
        </option>
      ))}
    </select>
  );
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {sel("model", "All models", models)}
      {sel("workflow", "All workflows", workflows)}
      {sel("workspace", "All workspaces", workspaces)}
      {Object.values(filters).some(Boolean) && (
        <button
          type="button"
          onClick={() => setFilters({})}
          style={{
            ...fieldStyle,
            width: "auto",
            height: 30,
            border: "none",
            background: "transparent",
            color: S.accent,
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

function AnalyticsView({ section }: { section: string }) {
  const [win, setWin] = React.useState(2592000);
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const cfg = (useLlmConfig().data || {}) as Record<string, unknown>;
  const reg = useLlmRegistry();
  const optsQ = useLlmAnalytics("usage", { window: win }); // unfiltered → filter options
  const { data, isLoading } = useLlmAnalytics(section, {
    window: win,
    ...filters,
  });
  const d = (data || {}) as Record<string, unknown>;
  const models = (reg.data?.models || []).map((m) => m.id);
  const optKeys = (o: unknown) =>
    Object.keys((o as Record<string, unknown>) || {}).filter((x) => x !== "—");
  const workflows = optKeys(
    (optsQ.data as Record<string, unknown>)?.by_workflow,
  );
  const workspaces = optKeys(
    (optsQ.data as Record<string, unknown>)?.by_workspace,
  );

  const slo = Number(cfg.latency_slo_ms) || 8000;
  const successSlo = Number(cfg.success_slo_pct) || 99;
  const budget = Number(cfg.monthly_budget_usd) || 0;
  const warnPct = Number(cfg.budget_warn_pct) || 80;

  const tiles: Record<
    string,
    { l: string; v: React.ReactNode; tone?: Tone }[]
  > = {
    usage: [
      { l: "Requests", v: num(d.requests) },
      { l: "Input tokens", v: num(d.input_tokens) },
      { l: "Output tokens", v: num(d.output_tokens) },
      { l: "Cached tokens", v: num(d.cached_input_tokens) },
      { l: "Avg tokens/req", v: num(d.avg_tokens_per_request) },
    ],
    performance: [
      { l: "TTFT", v: d.ttft_ms ? `${d.ttft_ms} ms` : "—" },
      { l: "P50", v: d.latency_p50_ms ? `${d.latency_p50_ms} ms` : "—" },
      {
        l: `P95 (SLO ${slo}ms)`,
        v: d.latency_p95_ms ? `${d.latency_p95_ms} ms` : "—",
        tone: d.latency_p95_ms
          ? toneHi(Number(d.latency_p95_ms), slo * 0.75, slo)
          : "none",
      },
      { l: "P99", v: d.latency_p99_ms ? `${d.latency_p99_ms} ms` : "—" },
      { l: "Tokens/sec", v: num(d.tokens_per_sec) },
      {
        l: "Agent run P95",
        v: d.agent_run_p95_ms ? `${d.agent_run_p95_ms} ms` : "—",
      },
    ],
    reliability: [
      {
        l: `Success (SLO ${successSlo}%)`,
        v: `${d.success_rate_pct ?? 0}%`,
        tone: toneLo(
          Number(d.success_rate_pct ?? 0),
          successSlo,
          successSlo - 1,
        ),
      },
      {
        l: "Error rate",
        v: `${d.error_rate_pct ?? 0}%`,
        tone: toneHi(Number(d.error_rate_pct ?? 0), 1, 5),
      },
      { l: "Failed", v: num(d.failed) },
      {
        l: "Fallback rate",
        v: `${d.fallback_rate_pct ?? 0}%`,
        tone: toneHi(Number(d.fallback_rate_pct ?? 0), 5, 20),
      },
      { l: "Retry rate", v: `${d.retry_rate_pct ?? 0}%` },
    ],
    cost: [
      {
        l: `Total (budget $${budget})`,
        v: usd(d.total_usd),
        tone: budget
          ? toneHi(Number(d.total_usd ?? 0), (budget * warnPct) / 100, budget)
          : "none",
      },
      { l: "Forecast / month", v: usd(d.forecast_monthly_usd) },
      { l: "Avg / request", v: usd(d.avg_cost_per_request_usd) },
      { l: "Cached savings", v: usd(d.cached_savings_usd) },
      { l: "Fallback cost", v: usd(d.fallback_cost_usd) },
    ],
    routing: [
      { l: "Requests", v: num(d.requests) },
      {
        l: "Fallback rate",
        v: `${d.fallback_rate_pct ?? 0}%`,
        tone: toneHi(Number(d.fallback_rate_pct ?? 0), 5, 20),
      },
    ],
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          models={models}
          workflows={workflows}
          workspaces={workspaces}
        />
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
            {(tiles[section] || []).map((t) => (
              <Stat key={t.l} label={t.l} value={t.v} tone={t.tone} />
            ))}
          </div>
          {section === "usage" && (
            <>
              <TrendChart
                title="Requests over time"
                data={(d.over_time as Record<string, unknown>[]) || []}
                keys={["requests"]}
                colors={[S.accent]}
              />
              <TrendChart
                title="Tokens over time (in / out)"
                data={(d.over_time as Record<string, unknown>[]) || []}
                keys={["input_tokens", "output_tokens"]}
                colors={["#9b87f5", S.accent]}
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
              title={`Latency over time (p95 / p50) — SLO ${slo}ms`}
              data={(d.latency_series as Record<string, unknown>[]) || []}
              keys={["p95_ms", "p50_ms"]}
              colors={[S.warning, S.accent]}
            />
          )}
          {section === "reliability" && (
            <>
              <BarBreakdown
                title="Errors by category"
                data={d.errors_by_category as Record<string, unknown>}
                color={S.danger}
              />
              <Card title="Recent errors (click trace in Logs to investigate)">
                {((d.recent_errors as Record<string, unknown>[]) || [])
                  .length === 0 ? (
                  <div style={{ fontSize: 12.5, color: S.textMuted }}>
                    No recent errors.
                  </div>
                ) : (
                  ((d.recent_errors as Record<string, unknown>[]) || []).map(
                    (e) => (
                      <KV
                        key={String(e.trace_id)}
                        k={`${String(e.ts).replace("T", " ").replace("Z", "")} · ${e.workflow}`}
                        v={`${e.error_code} · ${e.trace_id}`}
                      />
                    ),
                  )
                )}
              </Card>
            </>
          )}
          {section === "cost" && (
            <>
              {budget > 0 && (
                <BudgetGauge
                  spent={Number(d.total_usd ?? 0)}
                  forecast={Number(d.forecast_monthly_usd ?? 0)}
                  budget={budget}
                  warnPct={warnPct}
                />
              )}
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
              <BarBreakdown
                title="Cost by workspace"
                data={d.by_workspace as Record<string, unknown>}
                color="#9b87f5"
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
            emits for this tenant (or sample data is loaded). No fabricated
            data.
          </p>
        </>
      )}
    </div>
  );
}

// ── Logs & Traces ─────────────────────────────────────────────────────────
const LOG_COLS = "150px 1fr 1fr 56px 56px 78px 76px 80px 70px";
function Logs() {
  const [win, setWin] = React.useState(86400);
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [page, setPage] = React.useState(0);
  const [expanded, setExpanded] = React.useState<number | null>(null);
  const PAGE = 50;
  const reg = useLlmRegistry();
  const { data, isLoading } = useLlmLogs({
    window: win,
    limit: 2000,
    ...filters,
  });
  const all = (data?.rows || []) as Record<string, unknown>[];
  React.useEffect(() => {
    setPage(0);
    setExpanded(null);
  }, [win, filters]);
  const models = (reg.data?.models || []).map((m) => m.id);
  const workflows = Array.from(
    new Set(all.map((r) => String(r.workflow || "")).filter(Boolean)),
  );
  const pages = Math.max(1, Math.ceil(all.length / PAGE));
  const rows = all.slice(page * PAGE, page * PAGE + PAGE);
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
  ];
  const exportCsv = () => {
    const keys = cols
      .map(([k]) => k)
      .concat(["trace_id", "agent", "workspace", "route"]);
    const head = keys.join(",");
    const body = all
      .map((r) =>
        keys
          .map((k) => {
            const v = r[k] == null ? "" : String(r[k]);
            return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${head}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inference-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const sel = (k: string, label: string, opts: string[]) => (
    <select
      aria-label={label}
      value={filters[k] || ""}
      onChange={(e) =>
        setFilters({ ...filters, [k]: e.target.value || undefined } as Record<
          string,
          string
        >)
      }
      style={{ ...selectStyle, width: 150, height: 30 }}
    >
      <option value="" style={optBg}>
        {label}
      </option>
      {opts.map((o) => (
        <option key={o} value={o} style={optBg}>
          {o}
        </option>
      ))}
    </select>
  );
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {sel("model", "All models", models)}
          {sel("workflow", "All workflows", workflows)}
          <select
            aria-label="Errors only"
            value={filters.error_code || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                error_code: e.target.value || undefined,
              } as Record<string, string>)
            }
            style={{ ...selectStyle, width: 130, height: 30 }}
          >
            <option value="" style={optBg}>
              All outcomes
            </option>
            <option value="ratelimit" style={optBg}>
              ratelimit
            </option>
            <option value="timeout" style={optBg}>
              timeout
            </option>
            <option value="server_error" style={optBg}>
              server_error
            </option>
          </select>
          {Object.values(filters).some(Boolean) && (
            <button
              type="button"
              onClick={() => setFilters({})}
              style={{
                height: 30,
                border: "none",
                background: "transparent",
                color: S.accent,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={exportCsv}
            disabled={all.length === 0}
            style={{
              height: 30,
              padding: "0 12px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${S.borderStrong}`,
              color: S.textSecondary,
              fontSize: 12.5,
              cursor: all.length ? "pointer" : "not-allowed",
              opacity: all.length ? 1 : 0.5,
            }}
          >
            Export CSV
          </button>
          <WindowSelect win={win} setWin={setWin} />
        </div>
      </div>
      <p style={{ fontSize: 11.5, color: S.textMuted, margin: "0 0 12px" }}>
        Metadata only — prompt/response content is not stored unless the org
        logging policy enables it. Click a row to inspect.
      </p>
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
              gridTemplateColumns: LOG_COLS,
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
              No inference records match these filters.
            </div>
          ) : (
            rows.map((r, i) => {
              const idx = page * PAGE + i;
              const isErr = !!r.error_code;
              return (
                <div key={String(r.trace_id) || idx}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpanded(expanded === idx ? null : idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        setExpanded(expanded === idx ? null : idx);
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: LOG_COLS,
                      gap: 8,
                      padding: "8px 14px",
                      borderBottom: "1px solid var(--cg-border-subtle)",
                      fontSize: 11.5,
                      fontFamily: "monospace",
                      color: S.textSecondary,
                      cursor: "pointer",
                      background:
                        expanded === idx ? "var(--cg-bg-badge)" : undefined,
                    }}
                  >
                    {cols.map(([k]) => (
                      <span
                        key={k}
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color:
                            k === "error_code" && r[k] ? S.danger : undefined,
                        }}
                      >
                        {r[k] == null ? "—" : String(r[k])}
                      </span>
                    ))}
                  </div>
                  {expanded === idx && (
                    <div
                      style={{
                        padding: "10px 16px 14px",
                        borderBottom: "1px solid var(--cg-border-subtle)",
                        background: "var(--cg-bg-badge)",
                        fontSize: 11.5,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(220px, 1fr))",
                          gap: "4px 24px",
                        }}
                      >
                        {Object.entries(r).map(([k, v]) => (
                          <div key={k} style={{ display: "flex", gap: 8 }}>
                            <span style={{ color: S.textMuted, minWidth: 130 }}>
                              {k}
                            </span>
                            <span
                              style={{
                                color:
                                  k === "error_code" && v
                                    ? S.danger
                                    : S.textSecondary,
                                fontFamily: "monospace",
                                wordBreak: "break-all",
                              }}
                            >
                              {v == null ? "—" : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {isErr && (
                        <p style={{ marginTop: 8, color: S.textMuted }}>
                          Use trace_id <code>{String(r.trace_id)}</code> to
                          correlate with conversation and sandbox logs.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
      {all.length > PAGE && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
            fontSize: 12.5,
            color: S.textMuted,
          }}
        >
          <span>
            {page * PAGE + 1}–{Math.min(all.length, (page + 1) * PAGE)} of{" "}
            {num(all.length)}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => {
                setExpanded(null);
                setPage(page - 1);
              }}
              style={pagerBtn(page === 0)}
            >
              Prev
            </button>
            <span style={{ alignSelf: "center" }}>
              {page + 1} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages - 1}
              onClick={() => {
                setExpanded(null);
                setPage(page + 1);
              }}
              style={pagerBtn(page >= pages - 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const pagerBtn = (disabled: boolean): React.CSSProperties => ({
  height: 30,
  padding: "0 14px",
  borderRadius: 6,
  background: "transparent",
  border: `1px solid ${S.borderStrong}`,
  color: S.textSecondary,
  fontSize: 12.5,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
});

// ── Quality (measured signals from telemetry + honest gaps) ──────────────────
function Quality() {
  const [win, setWin] = React.useState(2592000);
  const q = useLlmAnalytics("quality", { window: win });
  const d = (q.data || {}) as Record<string, unknown>;
  const so = d.structured_output_validity_pct as number | null;
  const tp = d.tool_argument_validity_pct as number | null;
  const sample = Number(d.sample_size || 0);
  // Signals we genuinely measure from inference records today.
  const measured: { label: string; v: number | null; method: string }[] = [
    {
      label: "Structured-output validity",
      v: so ?? null,
      method: "share of structured responses that parsed against the schema",
    },
    {
      label: "Tool-argument validity",
      v: tp ?? null,
      method: "share of tool calls whose arguments parsed without error",
    },
  ];
  // Signals that require an evaluation harness — shown as not-yet-measured, never faked.
  const pending = [
    "Task completion rate",
    "Tool-selection accuracy",
    "Response acceptance rate",
    "Human escalation rate",
    "Evaluation score by workflow",
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
          Sample size: {num(sample)} inference records in window.
        </span>
        <WindowSelect win={win} setWin={setWin} />
      </div>
      <Card title="Measured from live telemetry">
        {sample === 0 ? (
          <div style={{ fontSize: 12.5, color: S.textMuted }}>
            No inference records in this window yet.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 4,
            }}
          >
            {measured.map((m) => (
              <Stat
                key={m.label}
                label={m.label}
                value={m.v == null ? "—" : `${m.v}%`}
                tone={m.v == null ? "none" : toneLo(m.v, 98, 90)}
                sub={m.method}
              />
            ))}
          </div>
        )}
      </Card>
      <Card title="Requires evaluation harness (not yet measured)">
        <p style={{ fontSize: 12, color: S.textMuted, margin: "0 0 8px" }}>
          These need a defined evaluation dataset + scoring method. We never
          show a generic accuracy number that is not backed by an eval run.
        </p>
        {pending.map((m) => (
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
            <span style={{ color: S.textMuted }}>not configured</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Quotas (limits config + live utilisation bars + increase request) ────────
function UtilBar({
  label,
  used,
  allowed,
  pct,
  fmt = num,
}: {
  label: string;
  used: number;
  allowed: number;
  pct: number;
  fmt?: (v: unknown) => string;
}) {
  const tone = toneHi(pct, 70, 90);
  const bar = TONE_COLOR[tone];
  return (
    <div
      style={{
        padding: "10px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12.5,
          marginBottom: 6,
        }}
      >
        <span style={{ color: S.textSecondary }}>{label}</span>
        <span style={{ color: bar, fontFamily: "monospace" }}>
          {fmt(used)} / {allowed ? fmt(allowed) : "∞"}
          {allowed ? `  ·  ${pct}%` : ""}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: "var(--cg-bg-badge)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, pct)}%`,
            background: bar,
            transition: "width .3s",
          }}
        />
      </div>
    </div>
  );
}

function Quotas() {
  const [win, setWin] = React.useState(2592000);
  const q = useLlmAnalytics("quotas", { window: win });
  const inc = useLlmQuotaIncrease();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    limit: "rpm",
    requested: "",
    reason: "",
  });
  if (q.isLoading) return <LiveCardSkeleton lines={5} />;
  const d = (q.data || {}) as Record<string, unknown>;
  const util = (d.utilisation || {}) as Record<string, unknown>;
  const limits = (util.limits || {}) as Record<
    string,
    { used: number; allowed: number; pct: number }
  >;
  const c = (d.config || {}) as Record<string, unknown>;
  const rows: [string, keyof typeof limits, (v: unknown) => string][] = [
    ["Requests / minute (peak)", "rpm", num],
    ["Tokens / minute (peak)", "tpm", num],
    ["Daily requests (24h)", "daily_requests", num],
    ["Monthly tokens (30d)", "monthly_tokens", num],
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
          Utilisation is computed from live telemetry; limits are the configured
          ceilings.
        </span>
        <WindowSelect win={win} setWin={setWin} />
      </div>
      <Card title="Utilisation vs limits">
        {rows.map(([label, key, fmt]) => {
          const r = limits[key] || { used: 0, allowed: 0, pct: 0 };
          return (
            <UtilBar
              key={key}
              label={label}
              used={r.used}
              allowed={r.allowed}
              pct={r.pct}
              fmt={fmt}
            />
          );
        })}
        <KV
          k="Throttled (429) in window"
          v={
            <span
              style={{
                color: Number(util.throttled) > 0 ? S.warning : S.textSecondary,
              }}
            >
              {num(util.throttled)}
            </span>
          }
        />
      </Card>
      <Card title="Configured ceilings">
        {(
          [
            ["Requests / minute", c.rpm_limit],
            ["Tokens / minute", c.tpm_limit],
            ["Concurrent requests", c.concurrent_requests],
            ["Daily request limit", c.daily_request_limit],
            ["Monthly token allowance", c.monthly_token_allowance],
            ["Max context size", c.context_token_limit],
            ["Max output size", c.max_output_tokens],
            ["Max agent steps", c.max_agent_steps],
            ["Max execution duration (s)", c.request_timeout_s],
          ] as [string, unknown][]
        ).map(([l, v]) => (
          <KV key={l} k={l} v={num(v)} />
        ))}
        <p style={{ fontSize: 11.5, color: S.textMuted, marginTop: 10 }}>
          Edit ceilings under Inference / Cost. Need more headroom? Request an
          increase below — it is logged to the audit trail.
        </p>
      </Card>
      <Capable cap="remediate">
        {open ? (
          <Card title="Request a limit increase">
            <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
              <label style={{ fontSize: 12, color: S.textMuted }}>
                Limit
                <select
                  value={form.limit}
                  onChange={(e) => setForm({ ...form, limit: e.target.value })}
                  style={{ ...selectStyle, marginTop: 4 }}
                >
                  {[
                    "rpm",
                    "tpm",
                    "daily_requests",
                    "monthly_tokens",
                    "concurrent",
                  ].map((o) => (
                    <option key={o} value={o} style={optBg}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 12, color: S.textMuted }}>
                Requested value
                <input
                  value={form.requested}
                  onChange={(e) =>
                    setForm({ ...form, requested: e.target.value })
                  }
                  placeholder="e.g. 1200"
                  style={{ ...fieldStyle, marginTop: 4 }}
                />
              </label>
              <label style={{ fontSize: 12, color: S.textMuted }}>
                Business justification
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                  style={{
                    ...fieldStyle,
                    marginTop: 4,
                    height: "auto",
                    resize: "vertical",
                  }}
                />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  disabled={inc.isPending || !form.requested}
                  onClick={() =>
                    inc.mutate(form, {
                      onSuccess: () => {
                        setOpen(false);
                        setForm({ limit: "rpm", requested: "", reason: "" });
                      },
                    })
                  }
                  style={{
                    height: 34,
                    padding: "0 16px",
                    borderRadius: 6,
                    background: S.accent,
                    border: "none",
                    color: "#fff",
                    fontSize: 13,
                    cursor: form.requested ? "pointer" : "not-allowed",
                    opacity: form.requested ? 1 : 0.5,
                  }}
                >
                  {inc.isPending ? "Submitting…" : "Submit request"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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
                  Cancel
                </button>
              </div>
              {inc.isSuccess && (
                <span style={{ fontSize: 12, color: S.success }}>
                  Request submitted and recorded in the audit trail.
                </span>
              )}
            </div>
          </Card>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
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
        )}
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
          <RoutingMaps />
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

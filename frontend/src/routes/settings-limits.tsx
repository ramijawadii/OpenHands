/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ConfirmButton,
  ScopeBadge,
  SaveBar,
  useDirty,
  LiveCardSkeleton,
} from "#/components/features/settings/settings-kit";
import {
  useLimits,
  useSettingsDoc,
  useSaveSettingsDoc,
} from "#/hooks/query/use-cloudguard";

// Live effective rate/spend limits from the backend tenant_policy. Additive read card.
function EffectiveLimitsCard() {
  const { data, isError, isLoading } = useLimits();
  if (isLoading) return <LiveCardSkeleton />;
  if (isError || !data) return null;
  const rows: [string, string][] = [
    ["Tokens / run", data.tokens_per_run.toLocaleString()],
    ["Tool calls / run", String(data.tools_per_run)],
    ["Monthly spend cap", `$${data.monthly_spend_cap_usd.toLocaleString()}`],
  ];
  return (
    <div
      style={{
        background: "var(--cg-bg-card)",
        border: `1px solid ${S.border}`,
        borderRadius: 10,
        padding: 16,
        marginBottom: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: S.textPrimary }}>
          Effective limits
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: S.success,
            background: "rgba(76,175,125,0.15)",
            borderRadius: 99,
            padding: "2px 7px",
          }}
        >
          live
        </span>
      </div>
      {rows.map(([k, v]) => (
        <div
          key={k}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: "1px solid var(--cg-border-subtle)",
          }}
        >
          <span style={{ fontSize: 12.5, color: S.textMuted }}>{k}</span>
          <span style={{ fontSize: 12.5, color: S.textPrimary }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

interface CustomLimit {
  id: string;
  name: string;
  type: "Model tokens" | "API requests" | "Sandbox runtime";
  scope: "Workspace" | "User" | "Service account";
  target: string;
  perMin: string;
  perDay: string;
}
const LIMIT_TYPES = [
  "Model tokens",
  "API requests",
  "Sandbox runtime",
] as const;
const LIMIT_SCOPES = ["Workspace", "User", "Service account"] as const;
const SCOPE_TARGETS: Record<string, string[]> = {
  Workspace: [
    "Sentinel Security Workspace",
    "Production Cloud",
    "Sandbox / Dev",
  ],
  User: ["Rami Sentinel", "Jana Doe", "Marc Tarek"],
  "Service account": ["ci-scanner", "terraform-bot", "nightly-audit"],
};
const INITIAL_CUSTOM: CustomLimit[] = [
  {
    id: "c1",
    name: "CI token budget",
    type: "Model tokens",
    scope: "Service account",
    target: "ci-scanner",
    perMin: "50,000",
    perDay: "5,000,000",
  },
  {
    id: "c2",
    name: "Analyst API throttle",
    type: "API requests",
    scope: "User",
    target: "Marc Tarek",
    perMin: "120",
    perDay: "20,000",
  },
  {
    id: "c3",
    name: "Dev sandbox cap",
    type: "Sandbox runtime",
    scope: "Workspace",
    target: "Sandbox / Dev",
    perMin: "—",
    perDay: "40 vCPU-hrs",
  },
];

const S = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  inputBg: "var(--cg-input-bg)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  warning: "#e09a2d",
} as const;

const LS_KEY = "cg_limits";

interface LimitsData {
  rpm: number;
  concurrentScans: number;
  maxAssets: string;
  criticalSla: string;
  highSla: string;
  coverageDrop: boolean;
  coverageDropPct: number;
  scanHistory: string;
  auditLog: string;
  findingHistory: string;
  spendCap: string;
  pauseOnCap: boolean;
}

function load(): LimitsData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as LimitsData;
  } catch {
    /* ignore */
  }
  return {
    rpm: 2000,
    concurrentScans: 5,
    maxAssets: "50000",
    criticalSla: "Alert within 1 hour",
    highSla: "Alert within 24 hours",
    coverageDrop: true,
    coverageDropPct: 80,
    scanHistory: "90 days",
    auditLog: "1 year",
    findingHistory: "1 year",
    spendCap: "5000",
    pauseOnCap: true,
  };
}

function Section({
  title,
  sublabel,
  children,
}: {
  title: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: S.textPrimary,
          paddingBottom: 12,
          borderBottom: `1px solid ${S.border}`,
          marginBottom: sublabel ? 8 : 20,
          marginTop: 0,
        }}
      >
        {title}
      </h2>
      {sublabel && (
        <p
          style={{
            fontSize: 12,
            color: S.textMuted,
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          {sublabel}
        </p>
      )}
      {children}
    </div>
  );
}

function Row({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        minHeight: 44,
        padding: "10px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
        gap: 24,
      }}
    >
      <div style={{ flexShrink: 0, maxWidth: 280 }}>
        <div style={{ fontSize: 14, color: S.textSecondary }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      <div style={{ flex: 1, maxWidth: 360 }}>{children}</div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  height: 36,
  padding: "0 10px",
  background: S.inputBg,
  border: `1px solid ${S.border}`,
  borderRadius: 6,
  color: S.textPrimary,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  appearance: "none",
  cursor: "pointer",
};
const inputStyle: React.CSSProperties = { ...selectStyle, cursor: "text" };

function SliderRow({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div
      style={{
        padding: "12px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 14, color: S.textSecondary }}>{label}</span>
        <span
          style={{
            fontSize: 13,
            color: S.textPrimary,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value.toLocaleString()} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: S.accent, cursor: "pointer" }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 11, color: S.textMuted }}>
          {min.toLocaleString()}
        </span>
        <span style={{ fontSize: 11, color: S.textMuted }}>
          {max.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function Toggle({
  on,
  onChange,
  label,
  sublabel,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        minHeight: 44,
        padding: "10px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
        gap: 24,
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: S.textSecondary }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          background: on ? S.accent : "var(--cg-toggle-off)",
          position: "relative",
          transition: "background 120ms ease",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 14 : 2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: S.textPrimary,
            transition: "left 120ms ease",
          }}
        />
      </button>
    </div>
  );
}

export default function LimitsSettings() {
  const [data, setData] = React.useState<LimitsData>(load);
  const [custom, setCustom] = React.useState<CustomLimit[]>(INITIAL_CUSTOM);
  const [savedAt, setSavedAt] = React.useState(0);
  // Track BOTH the rate-limit fields and the custom-limit list so adding/editing/removing a
  // custom limit makes the form dirty and the Save button appears.
  const { dirty, baseline, reset } = useDirty({ data, custom });
  const upd = (patch: Partial<LimitsData>) =>
    setData((p) => ({ ...p, ...patch }));

  const docQ = useSettingsDoc("limits");
  const saveMut = useSaveSettingsDoc("limits");
  const hydrated = React.useRef(false);
  React.useEffect(() => {
    const d = docQ.data;
    if (!hydrated.current && d && Object.keys(d).length) {
      hydrated.current = true;
      const nextData = (d.data as LimitsData) ?? data;
      const nextCustom = Array.isArray(d.custom)
        ? (d.custom as CustomLimit[])
        : custom;
      if (d.data) setData(nextData);
      if (Array.isArray(d.custom)) setCustom(nextCustom);
      reset({ data: nextData, custom: nextCustom });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docQ.data, reset]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<{
    name: string;
    type: CustomLimit["type"];
    scope: CustomLimit["scope"];
    target: string;
    perMin: string;
    perDay: string;
  }>({
    name: "",
    type: "Model tokens",
    scope: "Workspace",
    target: SCOPE_TARGETS.Workspace[0],
    perMin: "",
    perDay: "",
  });
  const isRuntime = form.type === "Sandbox runtime";

  const handleSave = () => {
    saveMut.mutate({ data, custom } as unknown as Record<string, unknown>, {
      onSuccess: () => {
        reset({ data, custom });
        setSavedAt(Date.now());
      },
    });
  };
  const createLimit = () => {
    if (!form.name.trim()) return;
    setCustom((p) => [
      ...p,
      {
        id: `c${Date.now()}`,
        name: form.name.trim(),
        type: form.type,
        scope: form.scope,
        target: form.target,
        perMin: isRuntime ? "—" : form.perMin || "—",
        perDay: form.perDay || "—",
      },
    ]);
    setForm({
      name: "",
      type: "Model tokens",
      scope: "Workspace",
      target: SCOPE_TARGETS.Workspace[0],
      perMin: "",
      perDay: "",
    });
    setModalOpen(false);
  };
  const removeLimit = (id: string) =>
    setCustom((p) => p.filter((c) => c.id !== id));

  return (
    <div style={{ padding: "40px 48px", maxWidth: 760 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: S.textPrimary,
            margin: 0,
          }}
        >
          Rate Limits
        </h1>
        <ScopeBadge scope="Organization" />
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 32,
          marginTop: 0,
        }}
      >
        Configure rate limits, quotas, and thresholds for your organization.
      </p>

      <EffectiveLimitsCard />

      <Section title="API Rate Limits">
        <SliderRow
          label="Requests per minute (org-wide)"
          value={data.rpm}
          min={100}
          max={10000}
          unit="req/min"
          onChange={(v) => upd({ rpm: v })}
        />
        <SliderRow
          label="Concurrent scans"
          value={data.concurrentScans}
          min={1}
          max={20}
          unit=""
          onChange={(v) => upd({ concurrentScans: v })}
        />
        <Row label="Max assets per scan">
          <input
            type="text"
            inputMode="numeric"
            value={data.maxAssets}
            onChange={(e) =>
              upd({ maxAssets: e.target.value.replace(/[^0-9]/g, "") })
            }
            style={inputStyle}
          />
        </Row>
      </Section>

      <Section title="Alert Thresholds">
        <Row label="Critical finding SLA">
          <select
            value={data.criticalSla}
            onChange={(e) => upd({ criticalSla: e.target.value })}
            style={selectStyle}
          >
            {[
              "Alert within 15 minutes",
              "Alert within 1 hour",
              "Alert within 4 hours",
            ].map((o) => (
              <option
                key={o}
                value={o}
                style={{ background: "var(--cg-bg-card)" }}
              >
                {o}
              </option>
            ))}
          </select>
        </Row>
        <Row label="High finding SLA">
          <select
            value={data.highSla}
            onChange={(e) => upd({ highSla: e.target.value })}
            style={selectStyle}
          >
            {[
              "Alert within 4 hours",
              "Alert within 24 hours",
              "Alert within 72 hours",
            ].map((o) => (
              <option
                key={o}
                value={o}
                style={{ background: "var(--cg-bg-card)" }}
              >
                {o}
              </option>
            ))}
          </select>
        </Row>
        <div
          style={{
            padding: "12px 0",
            borderBottom: "1px solid var(--cg-border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 14, color: S.textSecondary }}>
              Coverage drop alert
            </span>
            <button
              type="button"
              onClick={() => upd({ coverageDrop: !data.coverageDrop })}
              style={{
                width: 32,
                height: 18,
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
                background: data.coverageDrop
                  ? S.accent
                  : "var(--cg-toggle-off)",
                position: "relative",
                transition: "background 120ms ease",
                padding: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: data.coverageDrop ? 14 : 2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: S.textPrimary,
                  transition: "left 120ms ease",
                }}
              />
            </button>
          </div>
          {data.coverageDrop && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: S.textMuted }}>
                Alert if coverage drops below
              </span>
              <input
                type="number"
                value={data.coverageDropPct}
                onChange={(e) =>
                  upd({ coverageDropPct: Number(e.target.value) })
                }
                min={0}
                max={100}
                style={{
                  width: 64,
                  height: 30,
                  padding: "0 8px",
                  background: S.inputBg,
                  border: `1px solid ${S.border}`,
                  borderRadius: 6,
                  color: S.textPrimary,
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <span style={{ fontSize: 13, color: S.textMuted }}>%</span>
            </div>
          )}
        </div>
      </Section>

      <Section title="Data Retention">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            gap: 16,
          }}
        >
          <div style={{ fontSize: 13, color: S.textMuted }}>
            Retention windows (scan history, audit log, findings) are now
            managed under{" "}
            <strong style={{ color: S.textSecondary }}>Data Residency</strong>{" "}
            alongside data-residency &amp; compliance controls.
          </div>
          <a
            href="/settings/data-residency"
            style={{
              fontSize: 12,
              color: S.accent,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Open Data Residency →
          </a>
        </div>
      </Section>

      <Section title="Cost Controls">
        <Row
          label="Monthly spend cap"
          sublabel="Pause scans when cap is reached."
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              height: 36,
              background: S.inputBg,
              border: `1px solid ${S.border}`,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                padding: "0 10px",
                color: S.textMuted,
                fontSize: 14,
                flexShrink: 0,
                borderRight: `1px solid ${S.border}`,
                height: "100%",
                display: "flex",
                alignItems: "center",
              }}
            >
              $
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={data.spendCap}
              onChange={(e) =>
                upd({ spendCap: e.target.value.replace(/[^0-9]/g, "") })
              }
              style={{
                flex: 1,
                height: "100%",
                padding: "0 10px",
                background: "transparent",
                border: "none",
                color: S.textPrimary,
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
        </Row>
        <Toggle
          on={data.pauseOnCap}
          onChange={(v) => upd({ pauseOnCap: v })}
          label="Pause scans when cap is reached"
        />
      </Section>

      <Section title="Custom Limits">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 12.5, color: S.textMuted }}>
            Targeted limits for a specific workspace, user or service account —
            tokens, API requests or sandbox runtime.
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              height: 30,
              padding: "0 12px",
              borderRadius: 6,
              background: "var(--cg-text-primary)",
              color: "var(--cg-bg-card)",
              fontSize: 12.5,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            + Create limit
          </button>
        </div>
        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: `1px solid ${S.border}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1.2fr 1fr 1fr 28px",
              padding: "8px 14px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {["Name", "Type", "Applies to", "Per minute", "Per day", ""].map(
              (h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: S.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {h}
                </span>
              ),
            )}
          </div>
          {custom.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1.2fr 1fr 1fr 28px",
                padding: "10px 14px",
                borderBottom:
                  i < custom.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  color: S.textSecondary,
                  fontWeight: 500,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.name}
              </span>
              <span style={{ fontSize: 12, color: S.textMuted }}>{c.type}</span>
              <span
                style={{
                  fontSize: 12,
                  color: S.textMuted,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.scope}: {c.target}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: S.textSecondary,
                  fontFamily: "monospace",
                }}
              >
                {c.perMin}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: S.textSecondary,
                  fontFamily: "monospace",
                }}
              >
                {c.perDay}
              </span>
              <ConfirmButton
                variant="link"
                label="✕"
                title={`Delete limit "${c.name}"?`}
                body="This targeted limit will no longer apply."
                confirmLabel="Delete limit"
                onConfirm={() => removeLimit(c.id)}
              />
            </div>
          ))}
          {custom.length === 0 && (
            <div style={{ padding: 14, fontSize: 12.5, color: S.textMuted }}>
              No custom limits — only the org-wide rate limits above apply.
            </div>
          )}
        </div>
      </Section>

      <SaveBar
        dirty={dirty}
        savedAt={savedAt}
        onSave={handleSave}
        onDiscard={() => {
          setData(baseline.data);
          setCustom(baseline.custom);
        }}
      />

      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
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
              background: "var(--cg-bg-card)",
              border: `1px solid var(--cg-border-strong)`,
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: S.textPrimary,
                margin: 0,
              }}
            >
              Create custom limit
            </h3>
            <p
              style={{
                fontSize: 13,
                color: S.textMuted,
                marginTop: 6,
                marginBottom: 18,
              }}
            >
              Throttle a specific target. Sandbox-runtime limits are expressed
              per day.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: S.textMuted,
                  marginBottom: 6,
                }}
              >
                Name
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. CI token budget"
                style={inputStyle}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: S.textMuted,
                    marginBottom: 6,
                  }}
                >
                  Limit type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as CustomLimit["type"],
                    }))
                  }
                  style={selectStyle}
                >
                  {LIMIT_TYPES.map((t) => (
                    <option
                      key={t}
                      value={t}
                      style={{ background: "var(--cg-bg-card)" }}
                    >
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: S.textMuted,
                    marginBottom: 6,
                  }}
                >
                  Scope
                </label>
                <select
                  value={form.scope}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      scope: e.target.value as CustomLimit["scope"],
                      target: SCOPE_TARGETS[e.target.value][0],
                    }))
                  }
                  style={selectStyle}
                >
                  {LIMIT_SCOPES.map((sc) => (
                    <option
                      key={sc}
                      value={sc}
                      style={{ background: "var(--cg-bg-card)" }}
                    >
                      {sc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: S.textMuted,
                  marginBottom: 6,
                }}
              >
                Target {form.scope.toLowerCase()}
              </label>
              <select
                value={form.target}
                onChange={(e) =>
                  setForm((f) => ({ ...f, target: e.target.value }))
                }
                style={selectStyle}
              >
                {SCOPE_TARGETS[form.scope].map((t) => (
                  <option
                    key={t}
                    value={t}
                    style={{ background: "var(--cg-bg-card)" }}
                  >
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {!isRuntime && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: S.textMuted,
                      marginBottom: 6,
                    }}
                  >
                    Per minute
                  </label>
                  <input
                    value={form.perMin}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, perMin: e.target.value }))
                    }
                    placeholder={
                      form.type === "Model tokens" ? "50,000 tokens" : "120 req"
                    }
                    style={inputStyle}
                  />
                </div>
              )}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: S.textMuted,
                    marginBottom: 6,
                  }}
                >
                  Per day
                </label>
                <input
                  value={form.perDay}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, perDay: e.target.value }))
                  }
                  placeholder={
                    isRuntime
                      ? "40 vCPU-hrs"
                      : form.type === "Model tokens"
                        ? "5,000,000 tokens"
                        : "20,000 req"
                  }
                  style={inputStyle}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 22,
              }}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  height: 36,
                  padding: "0 16px",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid var(--cg-border-strong)`,
                  color: S.textSecondary,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createLimit}
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
                Create limit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

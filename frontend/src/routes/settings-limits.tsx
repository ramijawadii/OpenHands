/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ScopeBadge,
  SaveBar,
  useDirty,
} from "#/components/features/settings/settings-kit";

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
  const [savedAt, setSavedAt] = React.useState(0);
  const { dirty, baseline, reset } = useDirty(data);
  const upd = (patch: Partial<LimitsData>) =>
    setData((p) => ({ ...p, ...patch }));

  const handleSave = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    reset(data);
    setSavedAt(Date.now());
  };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 700 }}>
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
          Limits
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

      <SaveBar
        dirty={dirty}
        savedAt={savedAt}
        onSave={handleSave}
        onDiscard={() => setData(baseline)}
      />
    </div>
  );
}

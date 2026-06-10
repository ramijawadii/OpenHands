/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ScopeBadge,
  SaveBar,
  useDirty,
} from "#/components/features/settings/settings-kit";

const TIMEZONES = [
  "UTC",
  "UTC-8 — America/Los_Angeles",
  "UTC-5 — America/New_York",
  "UTC+0 — Europe/London",
  "UTC+1 — Europe/Paris",
  "UTC+1 — Africa/Tunis",
  "UTC+3 — Europe/Istanbul",
  "UTC+4 — Asia/Dubai",
  "UTC+5:30 — Asia/Kolkata",
  "UTC+8 — Asia/Singapore",
  "UTC+9 — Asia/Tokyo",
  "UTC+10 — Australia/Sydney",
];

const S = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  inputBg: "var(--cg-input-bg)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  cardBg: "var(--cg-bg-card)",
} as const;

const LS_KEY = "cg_theme_settings";

interface ThemeData {
  theme: "system" | "light" | "dark";
  density: "comfortable" | "default" | "compact";
  fontSize: string;
  language: string;
  dateFormat: string;
  timezone: string;
  numberFormat: string;
  notifyDailyReport: boolean;
  notifyWeeklyReport: boolean;
  notifyRoleUpdates: boolean;
  notifyWorkspaceInvites: boolean;
  notifyQuota: boolean;
  notifyNewMember: boolean;
  notifyChannel: string;
}

function load(): ThemeData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as ThemeData;
  } catch {
    /* ignore */
  }
  return {
    theme: "dark",
    density: "default",
    fontSize: "14px",
    language: "English (US)",
    dateFormat: "MM/DD/YYYY",
    timezone: "UTC+1 — Europe/Paris",
    numberFormat: "1,000.00",
    notifyDailyReport: true,
    notifyWeeklyReport: true,
    notifyRoleUpdates: true,
    notifyWorkspaceInvites: true,
    notifyQuota: true,
    notifyNewMember: false,
    notifyChannel: "In-app",
  };
}

function Section({
  title,
  children,
}: {
  title: string;
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
          marginBottom: 20,
          marginTop: 0,
        }}
      >
        {title}
      </h2>
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

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              height: 36,
              padding: "0 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 400,
              border: `1px solid ${active ? S.borderStrong : S.border}`,
              background: active ? S.cardBg : "transparent",
              color: active ? S.textPrimary : S.textSecondary,
              cursor: "pointer",
              transition: "all 120ms ease",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function ThemeSettings() {
  const [data, setData] = React.useState<ThemeData>(load);
  const [savedAt, setSavedAt] = React.useState(0);
  const { dirty, baseline, reset } = useDirty(data);
  const upd = (patch: Partial<ThemeData>) =>
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
          Theme & Language
        </h1>
        <ScopeBadge scope="You" />
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 32,
          marginTop: 0,
        }}
      >
        Customize the appearance and locale of your dashboard.
      </p>

      <Section title="Appearance">
        <Row label="Appearance">
          <SegmentedControl
            value={data.theme}
            options={["system", "light", "dark"]}
            onChange={(v) => upd({ theme: v as ThemeData["theme"] })}
          />
        </Row>
        <Row label="UI Density">
          <SegmentedControl
            value={data.density}
            options={["comfortable", "default", "compact"]}
            onChange={(v) => upd({ density: v as ThemeData["density"] })}
          />
        </Row>
        <Row label="Console font size">
          <select
            value={data.fontSize}
            onChange={(e) => upd({ fontSize: e.target.value })}
            style={selectStyle}
          >
            {["12px", "13px", "14px", "15px", "16px"].map((s) => (
              <option
                key={s}
                value={s}
                style={{ background: "var(--cg-bg-card)" }}
              >
                {s}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title="Language & Region">
        <Row label="Language">
          <select
            value={data.language}
            onChange={(e) => upd({ language: e.target.value })}
            style={selectStyle}
          >
            {[
              "English (US)",
              "English (UK)",
              "French",
              "Arabic",
              "German",
              "Spanish",
              "Japanese",
            ].map((l) => (
              <option
                key={l}
                value={l}
                style={{ background: "var(--cg-bg-card)" }}
              >
                {l}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Date format">
          <select
            value={data.dateFormat}
            onChange={(e) => upd({ dateFormat: e.target.value })}
            style={selectStyle}
          >
            {["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].map((f) => (
              <option
                key={f}
                value={f}
                style={{ background: "var(--cg-bg-card)" }}
              >
                {f}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Timezone">
          <select
            value={data.timezone}
            onChange={(e) => upd({ timezone: e.target.value })}
            style={selectStyle}
          >
            {TIMEZONES.map((tz) => (
              <option
                key={tz}
                value={tz}
                style={{ background: "var(--cg-bg-card)" }}
              >
                {tz}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Number format">
          <select
            value={data.numberFormat}
            onChange={(e) => upd({ numberFormat: e.target.value })}
            style={selectStyle}
          >
            {["1,000.00", "1.000,00"].map((f) => (
              <option
                key={f}
                value={f}
                style={{ background: "var(--cg-bg-card)" }}
              >
                {f}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title="Notifications">
        <Toggle
          on={data.notifyDailyReport}
          onChange={(v) => upd({ notifyDailyReport: v })}
          label="Daily report"
          sublabel="A morning summary of your security posture."
        />
        <Toggle
          on={data.notifyWeeklyReport}
          onChange={(v) => upd({ notifyWeeklyReport: v })}
          label="Weekly report"
          sublabel="Deeper weekly trends, coverage changes and new risks."
        />
        <Toggle
          on={data.notifyRoleUpdates}
          onChange={(v) => upd({ notifyRoleUpdates: v })}
          label="Role updates"
          sublabel="When your role or permissions change."
        />
        <Toggle
          on={data.notifyWorkspaceInvites}
          onChange={(v) => upd({ notifyWorkspaceInvites: v })}
          label="Workspace invitations"
          sublabel="When you're invited to a workspace."
        />
        <Toggle
          on={data.notifyQuota}
          onChange={(v) => upd({ notifyQuota: v })}
          label="Quota limit updated or reached"
          sublabel="When a usage limit is changed, or you approach/hit it."
        />
        <Toggle
          on={data.notifyNewMember}
          onChange={(v) => upd({ notifyNewMember: v })}
          label="New member joined your workspace"
          sublabel="When someone joins a workspace you belong to."
        />
        <Row
          label="Notification channel"
          sublabel={
            data.notifyChannel === "Slack" || data.notifyChannel === "PagerDuty"
              ? "Delivered via a webhook endpoint."
              : undefined
          }
        >
          <select
            value={data.notifyChannel}
            onChange={(e) => upd({ notifyChannel: e.target.value })}
            style={selectStyle}
          >
            {["In-app", "Email", "Slack", "PagerDuty"].map((c) => (
              <option
                key={c}
                value={c}
                style={{ background: "var(--cg-bg-card)" }}
              >
                {c}
              </option>
            ))}
          </select>
          {(data.notifyChannel === "Slack" ||
            data.notifyChannel === "PagerDuty") && (
            <a
              href="/settings/webhooks"
              style={{
                display: "inline-block",
                marginTop: 8,
                fontSize: 12,
                color: S.accent,
                textDecoration: "none",
              }}
            >
              Configure {data.notifyChannel} endpoint in Webhooks →
            </a>
          )}
        </Row>
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

/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import { ScopeBadge } from "#/components/features/settings/settings-kit";

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
  purple: "var(--cg-accent-purple)",
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

const ALLOWED_GEOS = [
  "Unrestricted",
  "US only",
  "EU only",
  "US + EU",
  "EU + UK",
];
const DEFAULT_GEOS = [
  "Global routing",
  "United States (us)",
  "European Union (eu)",
  "United Kingdom (uk)",
  "Asia-Pacific (apac)",
];
const RETENTION = [
  "30 days",
  "90 days",
  "1 year",
  "3 years",
  "7 years",
  "Indefinite",
];

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: S.textPrimary,
          margin: 0,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontSize: 13,
            color: S.textMuted,
            margin: "6px 0 0",
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}
      <div style={{ marginTop: 16 }}>{children}</div>
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
    <div>
      <div style={{ fontSize: 13, color: S.textSecondary, marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ReadBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: 42,
        padding: "0 14px",
        display: "flex",
        alignItems: "center",
        background: S.inputBg,
        border: `1px solid ${S.border}`,
        borderRadius: 6,
        color: S.textSecondary,
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  height: 42,
  width: "100%",
  padding: "0 12px",
  background: S.inputBg,
  border: `1px solid ${S.border}`,
  borderRadius: 6,
  color: S.textPrimary,
  fontSize: 14,
  outline: "none",
  appearance: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};
const optBg = { background: "var(--cg-bg-card)" } as const;

function GeoSelect({
  value,
  onChange,
  options,
  editing,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  editing: boolean;
}) {
  if (!editing) return <ReadBox>{value}</ReadBox>;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={selectStyle}
    >
      {options.map((o) => (
        <option key={o} value={o} style={optBg}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        flexShrink: 0,
        background: on ? S.accent : "var(--cg-toggle-off)",
        position: "relative",
        padding: 0,
        opacity: disabled ? 0.6 : 1,
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
  );
}

export default function DataResidencySettings() {
  const [editing, setEditing] = React.useState(false);
  const [cfg, setCfg] = React.useState({
    allowedGeo: "Unrestricted",
    defaultGeo: "Global routing",
    zeroRetention: false,
    scanRetention: "1 year",
    transcriptRetention: "90 days",
    findingRetention: "3 years",
    auditRetention: "7 years",
    findingDlp: true,
    piiDetect: true,
  });
  const [snapshot, setSnapshot] = React.useState(cfg);
  const upd = (patch: Partial<typeof cfg>) =>
    setCfg((p) => ({ ...p, ...patch }));

  const startEdit = () => {
    setSnapshot(cfg);
    setEditing(true);
  };
  const cancel = () => {
    setCfg(snapshot);
    setEditing(false);
  };
  const save = () => setEditing(false);

  return (
    <div style={{ padding: "40px 48px", maxWidth: 880 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 400,
              color: S.textPrimary,
              margin: 0,
            }}
          >
            Data Residency
          </h1>
          <ScopeBadge scope="Organization" />
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={startEdit}
            style={{
              height: 34,
              padding: "0 16px",
              borderRadius: 6,
              background: S.inputBg,
              border: `1px solid ${S.borderStrong}`,
              color: S.textPrimary,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Edit
          </button>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={cancel}
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
            <button
              type="button"
              onClick={save}
              style={{
                height: 34,
                padding: "0 16px",
                borderRadius: 6,
                background: S.accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              Save
            </button>
          </div>
        )}
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 32,
          marginTop: 0,
        }}
      >
        Control where your workspace data is processed, stored, and retained to
        meet your compliance requirements.
      </p>

      <Section
        title="Inference Geo"
        subtitle="Control where your API requests are processed. Geo inference keeps requests within the selected geo and is billed at 1.1× the global rate. This setting applies to new models only."
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          <Field label="Allowed inference geos">
            <GeoSelect
              value={cfg.allowedGeo}
              onChange={(v) => upd({ allowedGeo: v })}
              options={ALLOWED_GEOS}
              editing={editing}
            />
          </Field>
          <Field label="Default inference geo">
            <GeoSelect
              value={cfg.defaultGeo}
              onChange={(v) => upd({ defaultGeo: v })}
              options={DEFAULT_GEOS}
              editing={editing}
            />
          </Field>
        </div>
      </Section>

      <div style={{ height: 1, background: S.border, margin: "8px 0 28px" }} />

      <Section
        title="Workspace Geo"
        subtitle="Control where your workspace data — including files, conversation history and workspace artifacts — is stored. This is set at workspace creation and can't be changed."
      >
        <Field label="Workspace geo">
          <ReadBox>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              United States (us){" "}
              <span
                style={{
                  height: 18,
                  padding: "0 7px",
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 600,
                  color: S.textMuted,
                  background: S.badgeBg,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Locked
              </span>
            </span>
          </ReadBox>
        </Field>
      </Section>

      <div style={{ height: 1, background: S.border, margin: "8px 0 28px" }} />

      <Section
        title="Data Retention"
        subtitle="How long CloudGuard keeps each data class before automatic deletion. Set to meet your regulatory obligations."
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 14, color: S.textSecondary }}>
              Zero data retention (model providers)
            </div>
            <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
              Prompts &amp; completions are not retained by the inference
              provider beyond the request.
            </div>
          </div>
          <Toggle
            on={cfg.zeroRetention}
            onChange={(v) => upd({ zeroRetention: v })}
            disabled={!editing}
          />
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          <Field label="Scan history">
            <GeoSelect
              value={cfg.scanRetention}
              onChange={(v) => upd({ scanRetention: v })}
              options={RETENTION}
              editing={editing}
            />
          </Field>
          <Field label="Conversation / transcript">
            <GeoSelect
              value={cfg.transcriptRetention}
              onChange={(v) => upd({ transcriptRetention: v })}
              options={RETENTION}
              editing={editing}
            />
          </Field>
          <Field label="Finding history">
            <GeoSelect
              value={cfg.findingRetention}
              onChange={(v) => upd({ findingRetention: v })}
              options={RETENTION}
              editing={editing}
            />
          </Field>
          <Field label="Audit log">
            <GeoSelect
              value={cfg.auditRetention}
              onChange={(v) => upd({ auditRetention: v })}
              options={RETENTION}
              editing={editing}
            />
          </Field>
        </div>
      </Section>

      <div style={{ height: 1, background: S.border, margin: "8px 0 28px" }} />

      <Section
        title="Encryption"
        subtitle="Data is encrypted at rest (AES-256) and in transit (TLS 1.2+) by default. Enterprise plans can bring their own key."
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 14, color: S.textSecondary }}>
            Encryption at rest
          </div>
          <span
            style={{
              height: 20,
              padding: "0 8px",
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 500,
              color: S.success,
              background: "rgba(76,175,125,0.15)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            AES-256 · Enabled
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            border: `1px solid ${S.border}`,
            borderRadius: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 14, color: S.textSecondary }}>
              Customer-managed key (BYOK / HYOK)
            </div>
            <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
              Hold your own key in your KMS — revoke to cut CloudGuard's access
              instantly.
            </div>
          </div>
          <a
            href="/settings/encryption"
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${S.borderStrong}`,
              color: S.textSecondary,
              fontSize: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            Manage in Encryption & Keys →
          </a>
        </div>
      </Section>

      <div style={{ height: 1, background: S.border, margin: "8px 0 28px" }} />

      <Section
        title="Data handling & DLP"
        subtitle="What CloudGuard ingests and how sensitive data is protected in outputs."
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 14, color: S.textSecondary }}>
              Secret value redaction
            </div>
            <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
              Secret values are never written to the knowledge graph or logs —
              identifiers only.
            </div>
          </div>
          <span
            style={{
              height: 20,
              padding: "0 8px",
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 500,
              color: S.success,
              background: "rgba(76,175,125,0.15)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Enforced
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid var(--cg-border-subtle)",
          }}
        >
          <div>
            <div style={{ fontSize: 14, color: S.textSecondary }}>
              Redact sensitive data in exports
            </div>
            <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
              Mask secrets/PII in report &amp; finding exports (DLP).
            </div>
          </div>
          <Toggle
            on={cfg.findingDlp}
            onChange={(v) => upd({ findingDlp: v })}
            disabled={!editing}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
          }}
        >
          <div>
            <div style={{ fontSize: 14, color: S.textSecondary }}>
              PII detection
            </div>
            <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
              Flag personal data discovered during scans.
            </div>
          </div>
          <Toggle
            on={cfg.piiDetect}
            onChange={(v) => upd({ piiDetect: v })}
            disabled={!editing}
          />
        </div>
      </Section>
    </div>
  );
}

/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ConfirmButton,
  ScopeBadge,
  SaveBar,
  Toggle,
  useDirty,
  LiveCardSkeleton,
} from "#/components/features/settings/settings-kit";
import { useEncryptionKeys } from "#/hooks/query/use-cloudguard";

// Live key-custody + audit-integrity posture from the backend (cloudguard.tenant_crypto /
// tenant_audit). Posture only — no key material. Additive; renders only when reachable.
function KeyPostureCard() {
  const { data, isError, isLoading } = useEncryptionKeys();
  if (isLoading) return <LiveCardSkeleton />;
  if (isError || !data) return null;
  const items: [string, string, boolean][] = [
    ["Key provider", data.custody, true],
    [
      "Per-tenant keys",
      data.per_tenant_keys ? "Yes" : "No",
      data.per_tenant_keys,
    ],
    [
      "Master KEK",
      data.master_kek_configured ? "Configured" : "Not configured",
      data.master_kek_configured,
    ],
    ["Audit integrity", data.audit_integrity, data.audit_hmac_configured],
    [
      "Tenancy",
      data.tenancy.enabled
        ? data.tenancy.strict
          ? "Enabled · strict (fail-closed)"
          : "Enabled"
        : "Off (single-tenant)",
      data.tenancy.strict,
    ],
  ];
  return (
    <div
      style={{
        background: S.cardBg,
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
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: S.textPrimary }}>
          Key custody & integrity
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
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {items.map(([k, v, ok]) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid var(--cg-border-subtle)",
            }}
          >
            <span style={{ fontSize: 12.5, color: S.textMuted }}>{k}</span>
            <span
              style={{
                fontSize: 12.5,
                color: ok ? S.textPrimary : S.warning,
              }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  purple: "var(--cg-accent-purple)",
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

const CUSTODY = [
  {
    id: "CloudGuard-managed",
    desc: "We generate and manage keys in our KMS. Zero setup.",
  },
  {
    id: "BYOK",
    desc: "You provide the key; we wrap data keys with it (envelope encryption).",
  },
  {
    id: "HYOK",
    desc: "Key never leaves your KMS. Revoke to cut our access instantly.",
  },
] as const;
const KMS = ["AWS KMS", "Azure Key Vault", "GCP Cloud KMS", "HashiCorp Vault"];
const ROTATION = ["30 days", "90 days", "365 days", "Manual"];

const selectStyle: React.CSSProperties = {
  height: 34,
  width: "100%",
  padding: "0 26px 0 10px",
  background: S.inputBg,
  border: `1px solid ${S.border}`,
  borderRadius: 6,
  color: S.textPrimary,
  fontSize: 13,
  outline: "none",
  appearance: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
const inputStyle: React.CSSProperties = {
  ...selectStyle,
  appearance: "auto",
  cursor: "text",
  paddingRight: 10,
};
const optBg = { background: "var(--cg-bg-card)" } as const;

function H2({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: S.textPrimary,
          margin: 0,
        }}
      >
        {children}
      </h2>
      {sub && (
        <p
          style={{
            fontSize: 12.5,
            color: S.textMuted,
            margin: "5px 0 0",
            lineHeight: 1.5,
          }}
        >
          {sub}
        </p>
      )}
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
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 44,
        padding: "10px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
        gap: 24,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: S.textSecondary }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}
function StatusBadge({ text }: { text: string }) {
  return (
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
      {text}
    </span>
  );
}

export default function EncryptionSettings() {
  const [cfg, setCfg] = React.useState({
    custody: "HYOK",
    kms: "AWS KMS",
    keyUri: "arn:aws:kms:eu-west-1:1234:key/8c2f-…-0b9c",
    rotation: "90 days",
    fips: true,
  });
  const [savedAt, setSavedAt] = React.useState(0);
  const { dirty, baseline, reset } = useDirty(cfg);
  const upd = (patch: Partial<typeof cfg>) =>
    setCfg((p) => ({ ...p, ...patch }));
  const customerKey = cfg.custody !== "CloudGuard-managed";

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
          Encryption & Keys
        </h1>
        <ScopeBadge scope="Organization" />
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 28,
          marginTop: 0,
        }}
      >
        How your data is encrypted and who controls the keys. Where data is
        stored lives in{" "}
        <a
          href="/settings/data-residency"
          style={{ color: S.accent, textDecoration: "none" }}
        >
          Data Residency
        </a>
        .
      </p>

      <KeyPostureCard />

      <div style={{ marginBottom: 32 }}>
        <H2>Encryption</H2>
        <Row
          label="At rest"
          sublabel="All stored data, backups and the knowledge graph."
        >
          <StatusBadge text="AES-256-GCM" />
        </Row>
        <Row
          label="In transit"
          sublabel="All API, console and sandbox traffic."
        >
          <StatusBadge text="TLS 1.2+" />
        </Row>
        <Row
          label="FIPS 140-2 validated modules"
          sublabel="Use FIPS-validated cryptography end-to-end."
        >
          <Toggle
            on={cfg.fips}
            onChange={(v) => upd({ fips: v })}
            label="fips"
          />
        </Row>
      </div>

      <div style={{ marginBottom: 32 }}>
        <H2 sub="Who holds the key that protects your data-encryption keys (envelope encryption).">
          Key custody
        </H2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: customerKey ? 16 : 0,
          }}
        >
          {CUSTODY.map((c) => {
            const on = cfg.custody === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => upd({ custody: c.id })}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  textAlign: "left",
                  padding: "11px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: `1px solid ${on ? S.accent : S.border}`,
                  background: on ? "rgba(45,134,212,0.07)" : "transparent",
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    flexShrink: 0,
                    marginTop: 1,
                    border: `2px solid ${on ? S.accent : S.borderStrong}`,
                    background: on ? S.accent : "transparent",
                  }}
                />
                <span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 13.5,
                        color: S.textPrimary,
                        fontWeight: 500,
                      }}
                    >
                      {c.id}
                    </span>
                    {c.id === "HYOK" && (
                      <span
                        style={{
                          height: 17,
                          padding: "0 6px",
                          borderRadius: 99,
                          fontSize: 10,
                          fontWeight: 600,
                          color: S.purple,
                          background: "rgba(155,135,245,0.15)",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        strongest
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: S.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {c.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {customerKey && (
          <div
            style={{
              border: `1px solid ${S.border}`,
              borderRadius: 8,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div>
              <div
                style={{ fontSize: 12, color: S.textMuted, marginBottom: 6 }}
              >
                KMS provider
              </div>
              <select
                value={cfg.kms}
                onChange={(e) => upd({ kms: e.target.value })}
                style={selectStyle}
              >
                {KMS.map((k) => (
                  <option key={k} value={k} style={optBg}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div
                style={{ fontSize: 12, color: S.textMuted, marginBottom: 6 }}
              >
                Key ARN / URI
              </div>
              <input
                value={cfg.keyUri}
                onChange={(e) => upd({ keyUri: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <div
                style={{ fontSize: 12, color: S.textMuted, marginBottom: 6 }}
              >
                Rotation period
              </div>
              <select
                value={cfg.rotation}
                onChange={(e) => upd({ rotation: e.target.value })}
                style={selectStyle}
              >
                {ROTATION.map((r) => (
                  <option key={r} value={r} style={optBg}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid ${S.borderStrong}`,
                  color: S.textSecondary,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                Test key access
              </button>
              <StatusBadge text="Reachable ✓" />
            </div>
          </div>
        )}
      </div>

      <div>
        <H2 sub="Cryptographic erasure: destroy the tenant key so all encrypted data becomes permanently unreadable. Produces a signed deletion certificate.">
          Crypto-erasure / Right to be forgotten
        </H2>
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderLeft: `3px solid ${S.danger}`,
            borderRadius: 8,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 13.5, color: S.textSecondary }}>
              Per-tenant data key
            </div>
            <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
              Status: <span style={{ color: S.success }}>Active</span> ·
              destroying it is irreversible.
            </div>
          </div>
          <ConfirmButton
            variant="ghost"
            label="Destroy keys"
            title="Destroy the tenant data key?"
            body="This is cryptographic erasure: every piece of encrypted data for this tenant becomes permanently unreadable, immediately and irreversibly. A signed deletion certificate is issued."
            confirmLabel="Crypto-erase tenant"
            confirmWord="DESTROY"
            onConfirm={() => {}}
          />
        </div>
      </div>

      <SaveBar
        dirty={dirty}
        savedAt={savedAt}
        onSave={() => {
          reset(cfg);
          setSavedAt(Date.now());
        }}
        onDiscard={() => setCfg(baseline)}
      />
    </div>
  );
}

/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ConfirmButton,
  ScopeBadge,
  useDialogA11y,
} from "#/components/features/settings/settings-kit";

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
  cardBg: "var(--cg-bg-card)",
  badgeBg: "var(--cg-bg-badge)",
} as const;

const SESSIONS = [
  {
    device: "Chrome · macOS",
    ip: "185.xxx.x.x",
    location: "Paris, FR",
    last: "Just now",
    current: true,
  },
  {
    device: "Firefox · Ubuntu",
    ip: "82.xxx.x.x",
    location: "London, UK",
    last: "3 hours ago",
    current: false,
  },
  {
    device: "Mobile · iOS",
    ip: "176.xxx.x.x",
    location: "Tunis, TN",
    last: "Yesterday",
    current: false,
  },
];

const TOKENS = [
  {
    name: "cloudguard-cli-dev",
    masked: "cg_sk_••••••••••••••••4f2a",
    created: "Apr 2, 2026",
    lastUsed: "2 hours ago",
    scopes: ["read:findings", "read:coverage"],
  },
];

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
      <div style={{ flex: 1, maxWidth: 400 }}>{children}</div>
    </div>
  );
}

function Badge({
  text,
  color,
  bg,
}: {
  text: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 8px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 500,
        color,
        background: bg,
      }}
    >
      {text}
    </span>
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

const mInput: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  background: S.inputBg,
  border: `1px solid ${S.border}`,
  borderRadius: 6,
  color: S.textPrimary,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const dref = useDialogA11y(true, onClose);
  return (
    <div
      onClick={onClose}
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
        ref={dref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: "92vw",
          maxHeight: "88vh",
          overflowY: "auto",
          background: S.cardBg,
          border: `1px solid ${S.borderStrong}`,
          borderRadius: 12,
          padding: 24,
          outline: "none",
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
          {title}
        </h3>
        {subtitle && (
          <p
            style={{
              fontSize: 13,
              color: S.textMuted,
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            {subtitle}
          </p>
        )}
        <div style={{ marginTop: 18 }}>{children}</div>
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
            onClick={onClose}
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
          {footer}
        </div>
      </div>
    </div>
  );
}

function MField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          color: S.textMuted,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function PrimaryBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 36,
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
      {children}
    </button>
  );
}

export default function SecuritySettings() {
  const [reauth, setReauth] = React.useState(true);
  const [timeout, setTimeout_] = React.useState("1 hour");
  const [modal, setModal] = React.useState<
    null | "password" | "mfa" | "sso" | "token"
  >(null);
  const [sessions, setSessions] = React.useState(SESSIONS);
  const [tokens, setTokens] = React.useState(TOKENS);
  const [newTokenName, setNewTokenName] = React.useState("");
  const [createdToken, setCreatedToken] = React.useState("");
  const revokeSession = (ip: string) =>
    setSessions((p) => p.filter((s) => s.ip !== ip || s.current));
  const revokeOthers = () => setSessions((p) => p.filter((s) => s.current));
  const revokeToken = (name: string) =>
    setTokens((p) => p.filter((t) => t.name !== name));
  const createToken = () => {
    if (!newTokenName.trim()) return;
    const secret = `cg_sk_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    setTokens((p) => [
      ...p,
      {
        name: newTokenName.trim(),
        masked: `cg_sk_••••••••••••••••${secret.slice(-4)}`,
        created: "Just now",
        lastUsed: "never",
        scopes: ["read:findings"],
      },
    ]);
    setCreatedToken(secret);
    setNewTokenName("");
  };
  const [mfaOn, setMfaOn] = React.useState(true);
  const [ssoCfg, setSsoCfg] = React.useState({
    provider: "Okta",
    metadataUrl: "https://sentinel-org.okta.com/app/metadata",
    entityId: "cloudguard-prod",
    enabled: true,
  });

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
          Account Security
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
        Manage authentication, active sessions, and API tokens.
      </p>

      <Section title="Authentication">
        <Row label="Password">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 14, color: S.textMuted }}>
              ••••••••••••
            </span>
            <button
              type="button"
              onClick={() => setModal("password")}
              style={{
                background: "none",
                border: "none",
                color: S.accent,
                fontSize: 13,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Change password
            </button>
          </div>
        </Row>
        <Row
          label="Multi-Factor Authentication"
          sublabel="TOTP authenticator app or hardware key (FIDO2/WebAuthn)."
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge
              text={mfaOn ? "Enabled" : "Disabled"}
              color={mfaOn ? S.success : S.textMuted}
              bg={mfaOn ? "rgba(76,175,125,0.15)" : S.badgeBg}
            />
            <button
              type="button"
              onClick={() => setModal("mfa")}
              style={{
                height: 28,
                padding: "0 10px",
                borderRadius: 6,
                background: "transparent",
                border: `1px solid ${S.borderStrong}`,
                color: S.textSecondary,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Manage MFA
            </button>
          </div>
        </Row>
        <Row
          label="Single Sign-On (SSO)"
          sublabel="SAML 2.0 identity provider for this organization."
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge
              text={
                ssoCfg.enabled
                  ? `Configured · ${ssoCfg.provider}`
                  : "Not configured"
              }
              color={ssoCfg.enabled ? S.success : S.textMuted}
              bg={ssoCfg.enabled ? "rgba(76,175,125,0.15)" : S.badgeBg}
            />
            <button
              type="button"
              onClick={() => setModal("sso")}
              style={{
                height: 28,
                padding: "0 10px",
                borderRadius: 6,
                background: "transparent",
                border: `1px solid ${S.borderStrong}`,
                color: S.textSecondary,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Manage SSO
            </button>
          </div>
        </Row>
      </Section>

      <Section title="Active Sessions">
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
              gridTemplateColumns: "2fr 1.2fr 1fr 1fr 72px",
              padding: "8px 16px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {["Device", "IP Address", "Location", "Last active", ""].map(
              (h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: S.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  {h}
                </span>
              ),
            )}
          </div>
          {sessions.map((s, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr 1fr 1fr 72px",
                padding: "10px 16px",
                borderBottom:
                  i < sessions.length - 1
                    ? `1px solid var(--cg-border-subtle)`
                    : "none",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: S.textSecondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.device}
                </span>
                {s.current && (
                  <Badge
                    text="current"
                    color={S.textSecondary}
                    bg={S.badgeBg}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: S.textMuted,
                  fontFamily: "monospace",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.ip}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: S.textSecondary,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.location}
              </span>
              <span style={{ fontSize: 12, color: S.textMuted, minWidth: 0 }}>
                {s.last}
              </span>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {!s.current && (
                  <button
                    type="button"
                    onClick={() => revokeSession(s.ip)}
                    style={{
                      background: "none",
                      border: "none",
                      color: S.danger,
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}
        >
          <ConfirmButton
            variant="link"
            label="Revoke all other sessions"
            title="Revoke all other sessions?"
            body="Every session except this one will be signed out immediately. They'll need to sign in again."
            confirmLabel="Revoke all"
            onConfirm={revokeOthers}
          />
        </div>
      </Section>

      <Section title="API Tokens (Personal)">
        <p
          style={{
            fontSize: 12,
            color: S.textMuted,
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          Personal API tokens for CLI access and local scripts. For
          service-level keys, see Organization &gt; API Keys.
        </p>
        {tokens.map((tk) => (
          <div
            key={tk.name}
            style={{
              background: S.cardBg,
              border: `1px solid ${S.border}`,
              borderRadius: 8,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: S.textPrimary,
                  }}
                >
                  {tk.name}
                </span>
                <span
                  style={{ fontSize: 12, color: S.textMuted, marginLeft: 16 }}
                >
                  Created {tk.created}
                </span>
              </div>
              <button
                type="button"
                onClick={() => revokeToken(tk.name)}
                style={{
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 4,
                  background: "transparent",
                  border: `1px solid ${S.danger}`,
                  color: S.danger,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Revoke
              </button>
            </div>
            <div
              style={{
                fontSize: 12,
                color: S.textMuted,
                fontFamily: "monospace",
                marginBottom: 8,
              }}
            >
              {tk.masked}
            </div>
            <div style={{ fontSize: 12, color: S.textMuted, marginBottom: 8 }}>
              Last used: {tk.lastUsed}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {tk.scopes.map((sc) => (
                <span
                  key={sc}
                  style={{
                    height: 20,
                    padding: "0 7px",
                    borderRadius: 99,
                    fontSize: 11,
                    background: S.badgeBg,
                    color: S.textSecondary,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {sc}
                </span>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setCreatedToken("");
            setModal("token");
          }}
          style={{
            width: "100%",
            height: 40,
            borderRadius: 6,
            background: "transparent",
            border: `1px dashed ${S.borderStrong}`,
            color: S.textSecondary,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          + Create new token
        </button>
      </Section>

      <Section title="Session Settings">
        <Row label="Auto-logout after inactivity">
          <select
            value={timeout}
            onChange={(e) => setTimeout_(e.target.value)}
            style={{
              height: 36,
              padding: "0 10px",
              background: S.inputBg,
              border: `1px solid ${S.border}`,
              borderRadius: 6,
              color: S.textPrimary,
              fontSize: 14,
              outline: "none",
              appearance: "none",
              width: "100%",
              fontFamily: "inherit",
            }}
          >
            {["15 min", "30 min", "1 hour", "4 hours", "Never"].map((o) => (
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
        <Toggle
          on={reauth}
          onChange={setReauth}
          label="Require re-auth for destructive actions"
          sublabel="Prompt for password before deleting connectors or revoking org-wide API keys."
        />
      </Section>

      {modal === "password" && (
        <Modal
          title="Change password"
          subtitle="Use 12+ characters with a mix of letters, numbers and symbols."
          onClose={() => setModal(null)}
          footer={
            <PrimaryBtn onClick={() => setModal(null)}>
              Update password
            </PrimaryBtn>
          }
        >
          <MField label="Current password">
            <input
              type="password"
              autoComplete="current-password"
              style={mInput}
            />
          </MField>
          <MField label="New password">
            <input type="password" autoComplete="new-password" style={mInput} />
          </MField>
          <MField label="Confirm new password">
            <input type="password" autoComplete="new-password" style={mInput} />
          </MField>
        </Modal>
      )}

      {modal === "mfa" && (
        <Modal
          title="Manage multi-factor authentication"
          subtitle="Add a second factor to protect this account."
          onClose={() => setModal(null)}
          footer={
            <PrimaryBtn onClick={() => setModal(null)}>
              Save MFA settings
            </PrimaryBtn>
          }
        >
          <Toggle
            on={mfaOn}
            onChange={setMfaOn}
            label="Require MFA at sign-in"
            sublabel="Enforce a second factor for this account."
          />
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 16,
              padding: 14,
              border: `1px solid ${S.border}`,
              borderRadius: 8,
              opacity: mfaOn ? 1 : 0.5,
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                flexShrink: 0,
                background: "#fff",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000",
                fontSize: 10,
              }}
            >
              QR code
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  color: S.textSecondary,
                  marginBottom: 6,
                }}
              >
                Authenticator app (TOTP)
              </div>
              <div
                style={{ fontSize: 12, color: S.textMuted, marginBottom: 8 }}
              >
                Scan with Google Authenticator / 1Password, or enter the key:
              </div>
              <code
                style={{
                  fontSize: 12,
                  color: S.textPrimary,
                  background: S.inputBg,
                  padding: "4px 8px",
                  borderRadius: 4,
                  wordBreak: "break-all",
                }}
              >
                JBSWY3DPEHPK3PXP
              </code>
            </div>
          </div>
          <MField label="Verification code">
            <input
              inputMode="numeric"
              placeholder="6-digit code"
              style={{ ...mInput, maxWidth: 160 }}
            />
          </MField>
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: S.accent,
                fontSize: 13,
                cursor: "pointer",
                padding: 0,
              }}
            >
              + Add a hardware security key (FIDO2 / WebAuthn)
            </button>
          </div>
        </Modal>
      )}

      {modal === "sso" && (
        <Modal
          title="Manage SSO (SAML 2.0)"
          subtitle="Connect your identity provider for single sign-on."
          onClose={() => setModal(null)}
          footer={
            <PrimaryBtn onClick={() => setModal(null)}>
              Save SSO configuration
            </PrimaryBtn>
          }
        >
          <Toggle
            on={ssoCfg.enabled}
            onChange={(v) => setSsoCfg((p) => ({ ...p, enabled: v }))}
            label="Enable SSO"
            sublabel="Members sign in through your IdP."
          />
          <MField label="Identity provider">
            <select
              value={ssoCfg.provider}
              onChange={(e) =>
                setSsoCfg((p) => ({ ...p, provider: e.target.value }))
              }
              style={{ ...mInput, appearance: "none", cursor: "pointer" }}
            >
              {[
                "Okta",
                "Azure AD / Entra ID",
                "Google Workspace",
                "OneLogin",
                "Generic SAML 2.0",
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
          </MField>
          <MField label="IdP metadata URL">
            <input
              type="url"
              value={ssoCfg.metadataUrl}
              onChange={(e) =>
                setSsoCfg((p) => ({ ...p, metadataUrl: e.target.value }))
              }
              style={mInput}
            />
          </MField>
          <MField label="Entity ID">
            <input
              type="text"
              value={ssoCfg.entityId}
              onChange={(e) =>
                setSsoCfg((p) => ({ ...p, entityId: e.target.value }))
              }
              style={mInput}
            />
          </MField>
          <MField label="ACS URL (give this to your IdP)">
            <input
              readOnly
              value="https://app.cloudguard.io/auth/saml/acs"
              style={{ ...mInput, color: S.textMuted }}
            />
          </MField>
        </Modal>
      )}

      {modal === "token" && (
        <Modal
          title="Create personal API token"
          subtitle="A personal token acts as you (your role). For automation, use a Service Account instead."
          onClose={() => setModal(null)}
          footer={
            createdToken ? (
              <PrimaryBtn onClick={() => setModal(null)}>Done</PrimaryBtn>
            ) : (
              <PrimaryBtn onClick={createToken}>Create token</PrimaryBtn>
            )
          }
        >
          {!createdToken ? (
            <MField label="Token name">
              <input
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="e.g. cloudguard-cli-laptop"
                style={mInput}
              />
            </MField>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  background: S.inputBg,
                  border: `1px solid ${S.border}`,
                  borderRadius: 6,
                  padding: "10px 12px",
                }}
              >
                <code
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: S.textPrimary,
                    wordBreak: "break-all",
                  }}
                >
                  {createdToken}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(createdToken)}
                  style={{
                    height: 28,
                    padding: "0 10px",
                    borderRadius: 6,
                    background: "transparent",
                    border: `1px solid ${S.borderStrong}`,
                    color: S.textSecondary,
                    fontSize: 12,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Copy
                </button>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: S.warning,
                  marginTop: 12,
                  marginBottom: 0,
                }}
              >
                ⚠ Copy it now — it won't be shown again.
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

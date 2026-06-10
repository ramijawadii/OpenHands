/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ConfirmButton,
  ScopeBadge,
  Toggle,
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
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

const inputStyle: React.CSSProperties = {
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
  ...inputStyle,
  appearance: "none" as const,
  cursor: "pointer",
  paddingRight: 26,
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
      <div>
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

export default function NetworkSettings() {
  const [cidrs, setCidrs] = React.useState([
    "203.0.113.0/24 — HQ office",
    "198.51.100.7/32 — VPN gateway",
  ]);
  const [newCidr, setNewCidr] = React.useState("");
  const [enforceAllowlist, setEnforceAllowlist] = React.useState(false);
  const [enforceSso, setEnforceSso] = React.useState(true);
  const [requireMfa, setRequireMfa] = React.useState(true);
  const [deviceTrust, setDeviceTrust] = React.useState(false);
  const [reauth, setReauth] = React.useState(true);
  const [maxSession, setMaxSession] = React.useState("12 hours");
  const [idle, setIdle] = React.useState("1 hour");
  const [geo, setGeo] = React.useState("Allow all");
  const [ztna, setZtna] = React.useState("Cloudflare Access");
  const [ingress, setIngress] = React.useState("AWS PrivateLink");
  const [domain, setDomain] = React.useState("cloudguard.sentinel-org.io");
  const [mtls, setMtls] = React.useState(true);
  const [waf, setWaf] = React.useState(true);
  const [cae, setCae] = React.useState(true);

  const addCidr = () => {
    if (!newCidr.trim()) return;
    setCidrs((p) => [...p, newCidr.trim()]);
    setNewCidr("");
  };
  const removeCidr = (c: string) => setCidrs((p) => p.filter((x) => x !== c));

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
          Network & Access
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
        Org-wide controls for where and how members can reach CloudGuard.
        Enforced for everyone — overrides personal settings.
      </p>

      <div style={{ marginBottom: 36 }}>
        <H2 sub="Restrict console & API access to known networks. Add /32 for single IPs.">
          IP allowlist
        </H2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={newCidr}
            onChange={(e) => setNewCidr(e.target.value)}
            placeholder="e.g. 203.0.113.0/24 — label"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={addCidr}
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 6,
              background: S.accent,
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          {cidrs.map((c, i) => (
            <div
              key={c}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderBottom:
                  i < cidrs.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: S.textSecondary,
                  fontFamily: "monospace",
                }}
              >
                {c}
              </span>
              <button
                type="button"
                onClick={() => removeCidr(c)}
                style={{
                  background: "none",
                  border: "none",
                  color: S.danger,
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Remove
              </button>
            </div>
          ))}
          {cidrs.length === 0 && (
            <div style={{ padding: 14, fontSize: 12.5, color: S.textMuted }}>
              No ranges — access is open from anywhere.
            </div>
          )}
        </div>
        <Row
          label="Enforce allowlist"
          sublabel="Block all sign-ins and API calls from outside these ranges."
        >
          {enforceAllowlist ? (
            <Toggle
              on={enforceAllowlist}
              onChange={setEnforceAllowlist}
              label="Enforce allowlist"
            />
          ) : (
            <ConfirmButton
              variant="ghost"
              label="Enable enforcement"
              title="Enforce IP allowlist?"
              body="Anyone outside the listed ranges (including you, right now) will be locked out. Make sure your current IP is covered."
              confirmLabel="Enforce"
              confirmWord="ENFORCE"
              onConfirm={() => setEnforceAllowlist(true)}
              style={{ height: 30 }}
            />
          )}
        </Row>
        <Row
          label="Allowed geographies"
          sublabel="Restrict sign-in by country."
        >
          <select
            value={geo}
            onChange={(e) => setGeo(e.target.value)}
            style={selectStyle}
          >
            {[
              "Allow all",
              "US + EU only",
              "EU only",
              "Block high-risk countries",
            ].map((o) => (
              <option key={o} value={o} style={optBg}>
                {o}
              </option>
            ))}
          </select>
        </Row>
      </div>

      <div style={{ marginBottom: 36 }}>
        <H2 sub="Identity requirements applied across the whole organization.">
          Authentication policy
        </H2>
        <Row
          label="Require SSO for all members"
          sublabel="Disable password login; only your IdP can authenticate."
        >
          <Toggle
            on={enforceSso}
            onChange={setEnforceSso}
            label="Require SSO"
          />
        </Row>
        <Row
          label="Require MFA"
          sublabel="Members without a second factor cannot sign in."
        >
          <Toggle
            on={requireMfa}
            onChange={setRequireMfa}
            label="Require MFA"
          />
        </Row>
        <Row
          label="Managed devices only"
          sublabel="Require an MDM-enrolled device certificate."
        >
          <Toggle
            on={deviceTrust}
            onChange={setDeviceTrust}
            label="Device trust"
          />
        </Row>
        <Row
          label="Re-auth for sensitive actions"
          sublabel="Prompt before deleting connectors, rotating keys, changing billing."
        >
          <Toggle on={reauth} onChange={setReauth} label="Re-auth" />
        </Row>
      </div>

      <div>
        <H2 sub="How long sessions live before re-authentication is required.">
          Session policy
        </H2>
        <Row label="Maximum session length">
          <select
            value={maxSession}
            onChange={(e) => setMaxSession(e.target.value)}
            style={selectStyle}
          >
            {["8 hours", "12 hours", "24 hours", "7 days"].map((o) => (
              <option key={o} value={o} style={optBg}>
                {o}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Idle timeout">
          <select
            value={idle}
            onChange={(e) => setIdle(e.target.value)}
            style={selectStyle}
          >
            {["15 min", "30 min", "1 hour", "4 hours"].map((o) => (
              <option key={o} value={o} style={optBg}>
                {o}
              </option>
            ))}
          </select>
        </Row>
      </div>

      <div style={{ marginTop: 36 }}>
        <H2 sub="Front the portal behind your zero-trust edge so it is never reached directly over the public internet.">
          Private Access (Zero Trust)
        </H2>
        <Row
          label="Identity-aware proxy"
          sublabel="Verify identity + device on every request via your ZTNA provider."
        >
          <select
            value={ztna}
            onChange={(e) => setZtna(e.target.value)}
            style={selectStyle}
          >
            {[
              "None (public)",
              "Cloudflare Access",
              "Entra App Proxy",
              "Zscaler ZPA",
              "Tailscale",
              "Google BeyondCorp",
            ].map((o) => (
              <option key={o} value={o} style={optBg}>
                {o}
              </option>
            ))}
          </select>
        </Row>
        {ztna !== "None (public)" && (
          <Row
            label="Proxy service token"
            sublabel="Credential the proxy presents to CloudGuard."
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 12.5,
                  color: S.textMuted,
                  fontFamily: "monospace",
                }}
              >
                svc_••••••••a91b
              </span>
              <button
                type="button"
                style={{
                  height: 26,
                  padding: "0 10px",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid ${S.borderStrong}`,
                  color: S.textSecondary,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Rotate
              </button>
            </div>
          </Row>
        )}
        <Row
          label="Origin connectivity"
          sublabel="How CloudGuard reaches your tenant — private removes public exposure."
        >
          <select
            value={ingress}
            onChange={(e) => setIngress(e.target.value)}
            style={selectStyle}
          >
            {[
              "Public endpoint",
              "AWS PrivateLink",
              "Azure Private Link",
              "WireGuard tunnel",
            ].map((o) => (
              <option key={o} value={o} style={optBg}>
                {o}
              </option>
            ))}
          </select>
        </Row>
        <Row
          label="Custom domain"
          sublabel="Serve the portal on your own hostname."
        >
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="cloudguard.acme.com"
            style={{ ...inputStyle, minWidth: 220 }}
          />
        </Row>
        <Row
          label="Require client certificate (mTLS)"
          sublabel="Mutual TLS — only devices with a valid cert connect."
        >
          <Toggle on={mtls} onChange={setMtls} label="mTLS" />
        </Row>
        <Row
          label="WAF & DDoS protection"
          sublabel="Edge web-application firewall + volumetric protection."
        >
          <Toggle on={waf} onChange={setWaf} label="WAF" />
        </Row>
        <Row
          label="Continuous Access Evaluation"
          sublabel="Re-evaluate session risk mid-session; revoke on posture change."
        >
          <Toggle on={cae} onChange={setCae} label="CAE" />
        </Row>
        <Row
          label="CloudGuard egress IPs"
          sublabel="Allowlist these on your side so only we can reach your origin."
        >
          <span
            style={{
              fontSize: 12.5,
              color: S.textMuted,
              fontFamily: "monospace",
            }}
          >
            34.120.0.0/24, 35.190.0.0/24
          </span>
        </Row>
      </div>
    </div>
  );
}

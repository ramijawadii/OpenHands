import React from "react";

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
  { device: "Chrome · macOS", ip: "185.xxx.x.x", location: "Paris, FR", last: "Just now", current: true },
  { device: "Firefox · Ubuntu", ip: "82.xxx.x.x", location: "London, UK", last: "3 hours ago", current: false },
  { device: "Mobile · iOS", ip: "176.xxx.x.x", location: "Tunis, TN", last: "Yesterday", current: false },
];

const TOKENS = [
  { name: "cloudguard-cli-dev", masked: "cg_sk_••••••••••••••••4f2a", created: "Apr 2, 2026", lastUsed: "2 hours ago", scopes: ["read:findings", "read:coverage"] },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 14, fontWeight: 500, color: S.textPrimary, paddingBottom: 12, borderBottom: `1px solid ${S.border}`, marginBottom: 20, marginTop: 0 }}>{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", minHeight: 44, padding: "10px 0", borderBottom: "1px solid var(--cg-border-subtle)", gap: 24 }}>
      <div style={{ flexShrink: 0, maxWidth: 280 }}>
        <div style={{ fontSize: 14, color: S.textSecondary }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>{sublabel}</div>}
      </div>
      <div style={{ flex: 1, maxWidth: 400 }}>{children}</div>
    </div>
  );
}

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px", borderRadius: 99, fontSize: 11, fontWeight: 500, color, background: bg }}>{text}</span>;
}

function Toggle({ on, onChange, label, sublabel }: { on: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", minHeight: 44, padding: "10px 0", borderBottom: "1px solid var(--cg-border-subtle)", gap: 24 }}>
      <div>
        <div style={{ fontSize: 14, color: S.textSecondary }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>{sublabel}</div>}
      </div>
      <button type="button" onClick={() => onChange(!on)} style={{ width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer", flexShrink: 0, background: on ? S.accent : "var(--cg-toggle-off)", position: "relative", transition: "background 120ms ease", padding: 0 }}>
        <span style={{ position: "absolute", top: 2, left: on ? 14 : 2, width: 14, height: 14, borderRadius: "50%", background: S.textPrimary, transition: "left 120ms ease" }} />
      </button>
    </div>
  );
}

export default function SecuritySettings() {
  const [reauth, setReauth] = React.useState(true);
  const [timeout, setTimeout_] = React.useState("1 hour");

  return (
    <div style={{ padding: "40px 48px", maxWidth: 700 }}>
      <h1 style={{ fontSize: 20, fontWeight: 400, color: S.textPrimary, marginBottom: 4, marginTop: 0 }}>Sessions & Security</h1>
      <p style={{ fontSize: 13, color: S.textMuted, marginBottom: 32, marginTop: 0 }}>Manage authentication, active sessions, and API tokens.</p>

      <Section title="Authentication">
        <Row label="Password">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 14, color: S.textMuted }}>••••••••••••</span>
            <button type="button" style={{ background: "none", border: "none", color: S.accent, fontSize: 13, cursor: "pointer", padding: 0 }}>Change password</button>
          </div>
        </Row>
        <Row label="Multi-Factor Authentication" sublabel="TOTP authenticator app or hardware key (FIDO2/WebAuthn).">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge text="Enabled" color={S.success} bg="rgba(76,175,125,0.15)" />
            <button type="button" style={{ height: 28, padding: "0 10px", borderRadius: 6, background: "transparent", border: `1px solid ${S.borderStrong}`, color: S.textSecondary, fontSize: 12, cursor: "pointer" }}>Manage MFA</button>
          </div>
        </Row>
        <Row label="Single Sign-On (SSO)" sublabel="Managed at the Organization level.">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge text="Configured via SAML 2.0" color={S.success} bg="rgba(76,175,125,0.15)" />
            <button type="button" style={{ background: "none", border: "none", color: S.accent, fontSize: 12, cursor: "pointer", padding: 0 }}>View Org SSO settings →</button>
          </div>
        </Row>
      </Section>

      <Section title="Active Sessions">
        <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 72px", padding: "8px 16px", borderBottom: `1px solid ${S.border}` }}>
            {["Device", "IP Address", "Location", "Last active", ""].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 600, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 0, overflow: "hidden" }}>{h}</span>
            ))}
          </div>
          {SESSIONS.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 72px", padding: "10px 16px", borderBottom: i < SESSIONS.length - 1 ? `1px solid var(--cg-border-subtle)` : "none", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: S.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.device}</span>
                {s.current && <Badge text="current" color={S.textSecondary} bg={S.badgeBg} />}
              </div>
              <span style={{ fontSize: 12, color: S.textMuted, fontFamily: "monospace", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.ip}</span>
              <span style={{ fontSize: 13, color: S.textSecondary, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.location}</span>
              <span style={{ fontSize: 12, color: S.textMuted, minWidth: 0 }}>{s.last}</span>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {!s.current && (
                  <button type="button" style={{ background: "none", border: "none", color: S.danger, fontSize: 12, cursor: "pointer", padding: 0 }}>Revoke</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button type="button" style={{ background: "none", border: "none", color: S.danger, fontSize: 12, cursor: "pointer", padding: 0 }}>Revoke all other sessions</button>
        </div>
      </Section>

      <Section title="API Tokens (Personal)">
        <p style={{ fontSize: 12, color: S.textMuted, marginBottom: 16, marginTop: 0 }}>
          Personal API tokens for CLI access and local scripts. For service-level keys, see Organization &gt; API Keys.
        </p>
        {TOKENS.map(tk => (
          <div key={tk.name} style={{ background: S.cardBg, border: `1px solid ${S.border}`, borderRadius: 8, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 500, color: S.textPrimary }}>{tk.name}</span>
                <span style={{ fontSize: 12, color: S.textMuted, marginLeft: 16 }}>Created {tk.created}</span>
              </div>
              <button type="button" style={{ height: 28, padding: "0 10px", borderRadius: 4, background: "transparent", border: `1px solid ${S.danger}`, color: S.danger, fontSize: 12, cursor: "pointer" }}>Revoke</button>
            </div>
            <div style={{ fontSize: 12, color: S.textMuted, fontFamily: "monospace", marginBottom: 8 }}>{tk.masked}</div>
            <div style={{ fontSize: 12, color: S.textMuted, marginBottom: 8 }}>Last used: {tk.lastUsed}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {tk.scopes.map(sc => (
                <span key={sc} style={{ height: 20, padding: "0 7px", borderRadius: 99, fontSize: 11, background: S.badgeBg, color: S.textSecondary, display: "inline-flex", alignItems: "center" }}>{sc}</span>
              ))}
            </div>
          </div>
        ))}
        <button type="button" style={{ width: "100%", height: 40, borderRadius: 6, background: "transparent", border: `1px dashed ${S.borderStrong}`, color: S.textSecondary, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          + Create new token
        </button>
      </Section>

      <Section title="Session Settings">
        <Row label="Auto-logout after inactivity">
          <select value={timeout} onChange={e => setTimeout_(e.target.value)} style={{ height: 36, padding: "0 10px", background: S.inputBg, border: `1px solid ${S.border}`, borderRadius: 6, color: S.textPrimary, fontSize: 14, outline: "none", appearance: "none", width: "100%", fontFamily: "inherit" }}>
            {["15 min", "30 min", "1 hour", "4 hours", "Never"].map(o => <option key={o} value={o} style={{ background: "var(--cg-bg-card)" }}>{o}</option>)}
          </select>
        </Row>
        <Toggle on={reauth} onChange={setReauth} label="Require re-auth for destructive actions" sublabel="Prompt for password before deleting connectors or revoking org-wide API keys." />
      </Section>
    </div>
  );
}

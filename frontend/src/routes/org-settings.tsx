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
  purple: "var(--cg-accent-purple)",
  badgeBg: "var(--cg-bg-badge)",
} as const;

const MEMBERS = [
  { initials: "RS", name: "Rami Sentinel", email: "rami@sentinel-org.io", role: "Admin", last: "Now", color: S.purple },
  { initials: "JD", name: "Jana Doe", email: "jana@sentinel-org.io", role: "Security Engineer", last: "1h ago", color: S.accent },
  { initials: "MT", name: "Marc T.", email: "marc@sentinel-org.io", role: "Viewer", last: "3d ago", color: "#4caf7d" },
];

const ROLES_TABLE = [
  { role: "Admin", view: true, scan: true, connectors: true, orgAdmin: true, color: S.purple },
  { role: "Security Engineer", view: true, scan: true, connectors: true, orgAdmin: false, color: S.accent },
  { role: "Analyst", view: true, scan: false, connectors: false, orgAdmin: false, color: S.textMuted },
  { role: "Viewer", view: true, scan: false, connectors: false, orgAdmin: false, color: S.textMuted },
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

function RoleBadge({ role }: { role: string }) {
  const color = role === "Admin" ? S.purple : role === "Security Engineer" ? S.accent : S.textMuted;
  const bg = role === "Admin" ? "rgba(155,135,245,0.15)" : role === "Security Engineer" ? "rgba(45,134,212,0.15)" : S.badgeBg;
  return <span style={{ display: "inline-flex", alignItems: "center", width: "fit-content", height: 20, padding: "0 8px", borderRadius: 99, fontSize: 11, fontWeight: 500, color, background: bg, whiteSpace: "nowrap" }}>{role}</span>;
}

function Check({ on }: { on: boolean }) {
  return <span style={{ fontSize: 13, color: on ? S.success : S.textMuted }}>{on ? "✓" : "—"}</span>;
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

export default function OrgSettings() {
  const [sso, setSso] = React.useState(true);
  const [scim, setScim] = React.useState(false);

  return (
    <div style={{ padding: "40px 48px", maxWidth: 760 }}>
      <h1 style={{ fontSize: 20, fontWeight: 400, color: S.textPrimary, marginBottom: 4, marginTop: 0 }}>Organization</h1>
      <p style={{ fontSize: 13, color: S.textMuted, marginBottom: 32, marginTop: 0 }}>Manage your organization's identity, members, and security policies.</p>

      <Section title="Organization Details">
        <Row label="Organization name">
          <span style={{ fontSize: 14, color: S.textSecondary }}>Sentinel Security Corp</span>
        </Row>
        <Row label="Plan">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ height: 20, padding: "0 8px", borderRadius: 99, fontSize: 11, fontWeight: 500, color: S.purple, background: "rgba(155,135,245,0.15)", display: "inline-flex", alignItems: "center" }}>Enterprise</span>
            <button type="button" style={{ background: "none", border: "none", color: S.accent, fontSize: 13, cursor: "pointer", padding: 0 }}>Manage billing →</button>
          </div>
        </Row>
        <Row label="Organization ID">
          <span style={{ fontSize: 12, color: S.textMuted, fontFamily: "monospace" }}>org_8c2f4a1e-9b3d-4e7f-a2c1-5d8e6f3a0b9c</span>
        </Row>
        <Row label="Primary domain">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, color: S.textSecondary }}>sentinel-org.io</span>
            <span style={{ height: 20, padding: "0 8px", borderRadius: 99, fontSize: 11, fontWeight: 500, color: S.success, background: "rgba(76,175,125,0.15)", display: "inline-flex", alignItems: "center" }}>Verified ✓</span>
          </div>
        </Row>
      </Section>

      <Section title="Members">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button type="button" style={{ height: 34, padding: "0 14px", borderRadius: 6, background: S.accent, color: "#fff", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer" }}>
            Invite member
          </button>
        </div>
        <input type="text" placeholder="Search members…" style={{ width: "100%", height: 36, padding: "0 12px", background: S.inputBg, border: `1px solid ${S.border}`, borderRadius: 6, color: S.textPrimary, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit" }} />
        <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 120px 80px 32px", padding: "8px 16px", borderBottom: `1px solid ${S.border}` }}>
            {["", "Name", "Email", "Role", "Last active", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 600, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 0, overflow: "hidden" }}>{h}</span>
            ))}
          </div>
          {MEMBERS.map((m, i) => (
            <div key={m.email} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 120px 80px 32px", padding: "10px 16px", borderBottom: i < MEMBERS.length - 1 ? `1px solid var(--cg-border-subtle)` : "none", alignItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#fff", flexShrink: 0 }}>{m.initials}</div>
              <span style={{ fontSize: 13, color: S.textSecondary, fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
              <span style={{ fontSize: 12, color: S.textMuted, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</span>
              <div style={{ minWidth: 0 }}><RoleBadge role={m.role} /></div>
              <span style={{ fontSize: 12, color: S.textMuted }}>{m.last}</span>
              <button type="button" style={{ background: "none", border: "none", color: S.textMuted, cursor: "pointer", fontSize: 16, padding: 0 }}>···</button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Roles & Permissions">
        <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px repeat(4, 1fr)", padding: "8px 16px", borderBottom: `1px solid ${S.border}` }}>
            {["Role", "Coverage view", "Run scans", "Manage connectors", "Org admin"].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 600, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>
          {ROLES_TABLE.map((r, i) => (
            <div key={r.role} style={{ display: "grid", gridTemplateColumns: "140px repeat(4, 1fr)", padding: "10px 16px", borderBottom: i < ROLES_TABLE.length - 1 ? `1px solid var(--cg-border-subtle)` : "none", alignItems: "center" }}>
              <RoleBadge role={r.role} />
              <Check on={r.view} />
              <Check on={r.scan} />
              <Check on={r.connectors} />
              <Check on={r.orgAdmin} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button type="button" style={{ background: "none", border: "none", color: S.accent, fontSize: 12, cursor: "pointer", padding: 0 }}>Edit roles</button>
        </div>
      </Section>

      <Section title="SSO & Provisioning">
        <Toggle on={sso} onChange={setSso} label="SAML 2.0 SSO" sublabel="Single sign-on via your identity provider." />
        <Toggle on={scim} onChange={setScim} label="SCIM Provisioning" sublabel="Automatic user provisioning. Requires SSO." />
        <Row label="Allowed email domains">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ height: 26, padding: "0 10px", borderRadius: 99, fontSize: 12, background: S.badgeBg, color: S.textSecondary, display: "inline-flex", alignItems: "center", gap: 6 }}>
              sentinel-org.io <button type="button" style={{ background: "none", border: "none", color: S.textMuted, cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
            </span>
            <button type="button" style={{ height: 26, padding: "0 10px", borderRadius: 99, fontSize: 12, background: "transparent", border: `1px dashed ${S.borderStrong}`, color: S.textMuted, cursor: "pointer" }}>+ Add domain</button>
          </div>
        </Row>
        <Row label="Default role for new SSO members">
          <select style={{ height: 36, padding: "0 10px", background: S.inputBg, border: `1px solid ${S.border}`, borderRadius: 6, color: S.textPrimary, fontSize: 14, outline: "none", appearance: "none", width: "100%", fontFamily: "inherit" }}>
            <option style={{ background: "var(--cg-bg-card)" }}>Viewer</option>
            <option style={{ background: "var(--cg-bg-card)" }}>Analyst</option>
            <option style={{ background: "var(--cg-bg-card)" }}>Security Engineer</option>
          </select>
        </Row>
      </Section>

      <Section title="Danger Zone">
        <div style={{ border: `1px solid ${S.border}`, borderLeft: `3px solid ${S.danger}`, borderRadius: 8, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, color: S.textSecondary }}>Transfer workspace ownership</div>
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>Transfer ownership to another admin.</div>
            </div>
            <button type="button" style={{ height: 34, padding: "0 14px", borderRadius: 6, background: "transparent", border: `1px solid rgba(224,82,82,0.4)`, color: S.danger, fontSize: 13, cursor: "pointer" }}>Transfer</button>
          </div>
          <div style={{ height: 1, background: S.border }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, color: S.danger }}>Delete organization</div>
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>Permanently delete the organization and all data. This cannot be undone.</div>
            </div>
            <button type="button" style={{ height: 34, padding: "0 14px", borderRadius: 6, background: "transparent", border: `1px solid rgba(224,82,82,0.4)`, color: S.danger, fontSize: 13, cursor: "pointer" }}>Delete org</button>
          </div>
        </div>
      </Section>
    </div>
  );
}

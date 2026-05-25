import React from "react";

const S = {
  pageBg: "var(--cg-bg-page)",
  cardBg: "var(--cg-bg-card)",
  inputBg: "var(--cg-input-bg)",
  inputBgFocus: "var(--cg-input-bg)",
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  borderFocus: "rgba(45,134,212,0.55)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  purple: "var(--cg-accent-purple)",
} as const;

const LS_KEY = "cg_profile";

interface ProfileData {
  fullName: string;
  displayName: string;
  role: string;
  instructions: string;
}

function load(): ProfileData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as ProfileData;
  } catch { /* ignore */ }
  return { fullName: "Rami Sentinel", displayName: "Rami", role: "", instructions: "" };
}

const ROLES = [
  "Security Engineer",
  "SecOps Analyst",
  "Cloud Architect",
  "CISO / Security Lead",
  "DevSecOps Engineer",
  "Compliance Officer",
  "Platform Engineer",
  "Other",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 14, fontWeight: 500, color: S.textPrimary, paddingBottom: 12, borderBottom: `1px solid ${S.border}`, marginBottom: 20, marginTop: 0 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", minHeight: 44, padding: "10px 0", borderBottom: `1px solid var(--cg-border-subtle)`, gap: 24 }}>
      <div style={{ flexShrink: 0, maxWidth: 280 }}>
        <div style={{ fontSize: 14, color: S.textSecondary }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>{sublabel}</div>}
      </div>
      <div style={{ flex: 1, maxWidth: 360 }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
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
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none" as const,
  cursor: "pointer",
};

export default function ProfileSettings() {
  const [data, setData] = React.useState<ProfileData>(load);
  const [saved, setSaved] = React.useState(false);

  const update = (patch: Partial<ProfileData>) => setData(prev => ({ ...prev, ...patch }));

  const handleSave = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 700 }}>
      <h1 style={{ fontSize: 20, fontWeight: 400, color: S.textPrimary, marginBottom: 4, marginTop: 0 }}>Profile</h1>
      <p style={{ fontSize: 13, color: S.textMuted, marginBottom: 32, marginTop: 0 }}>Manage your personal information and preferences.</p>

      <Section title="Profile">
        <Row label="Avatar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: S.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 500, color: "#fff", flexShrink: 0 }}>
              RS
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" style={{ background: "none", border: "none", color: S.accent, fontSize: 13, cursor: "pointer", padding: 0 }}>Change avatar</button>
              <button type="button" style={{ background: "none", border: "none", color: S.textMuted, fontSize: 13, cursor: "pointer", padding: 0 }}>Remove</button>
            </div>
          </div>
        </Row>

        <Row label="Full name">
          <input
            type="text"
            value={data.fullName}
            onChange={e => update({ fullName: e.target.value })}
            style={inputStyle}
          />
        </Row>

        <Row label="Display name" sublabel="Used in the console, notifications and reports.">
          <input
            type="text"
            value={data.displayName}
            onChange={e => update({ displayName: e.target.value })}
            style={inputStyle}
          />
        </Row>

        <Row label="What best describes your role?">
          <select value={data.role} onChange={e => update({ role: e.target.value })} style={selectStyle}>
            <option value="">Select role…</option>
            {ROLES.map(r => <option key={r} value={r} style={{ background: "var(--cg-bg-card)" }}>{r}</option>)}
          </select>
        </Row>

        <Row label="Email address">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="text"
              value="rami@sentinel-org.io"
              readOnly
              style={{ ...inputStyle, color: S.textMuted, cursor: "default" }}
            />
            <span style={{ display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px", borderRadius: 99, fontSize: 11, fontWeight: 500, background: "rgba(76,175,125,0.15)", color: S.success, flexShrink: 0 }}>
              Verified ✓
            </span>
          </div>
        </Row>

        <Row label="Instructions for CloudGuard" sublabel="CloudGuard will keep these in mind across scans, reports, and coverage analysis.">
          <textarea
            value={data.instructions}
            onChange={e => update({ instructions: e.target.value })}
            placeholder="e.g. always prioritize critical findings first"
            style={{
              ...inputStyle,
              height: 96,
              padding: "8px 10px",
              resize: "vertical",
              lineHeight: 1.5,
            }}
          />
        </Row>
      </Section>

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 }}>
        {saved && <span style={{ fontSize: 12, color: S.success }}>Saved</span>}
        <button
          type="button"
          onClick={handleSave}
          style={{ height: 34, padding: "0 14px", borderRadius: 6, background: S.accent, color: "#fff", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer" }}
        >
          Save changes
        </button>
      </div>
    </div>
  );
}

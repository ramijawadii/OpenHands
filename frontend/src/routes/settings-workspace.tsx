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
  purple: "var(--cg-accent-purple)",
  badgeBg: "var(--cg-bg-badge)",
} as const;

const LS_KEY = "cg_workspace";

interface WorkspaceData {
  name: string;
  slug: string;
  description: string;
  cloudScope: string[];
  compliance: string[];
  scanFreq: string;
  alertThreshold: string;
}

const ALL_CLOUDS = ["AWS", "Azure", "GCP"];
const ALL_COMPLIANCE = ["CIS v8", "PCI-DSS", "NIST CSF", "SOC 2", "ISO 27001"];
const FREQ_OPTIONS = ["Manual", "Daily", "Weekly", "Continuous"];
const ALERT_OPTIONS = ["All findings", "High + Critical only", "Critical only"];

function load(): WorkspaceData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as WorkspaceData;
  } catch { /* ignore */ }
  return { name: "Sentinel Security Workspace", slug: "sentinel-security", description: "", cloudScope: ["AWS", "Azure"], compliance: ["CIS v8", "PCI-DSS"], scanFreq: "Weekly", alertThreshold: "High + Critical only" };
}

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
      <div style={{ flex: 1, maxWidth: 360 }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", height: 36, padding: "0 10px", background: S.inputBg, border: `1px solid ${S.border}`, borderRadius: 6, color: S.textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "none" as const, cursor: "pointer" };

function ChipGroup({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    const next = value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt];
    onChange(next);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(opt => {
        const active = value.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 26, padding: "0 10px", borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${active ? S.accent : S.border}`, background: active ? "rgba(45,134,212,0.12)" : S.badgeBg, color: active ? S.accent : S.textSecondary, transition: "all 120ms ease" }}>
            {active && "✓ "}{opt}
          </button>
        );
      })}
    </div>
  );
}

export default function WorkspaceSettings() {
  const [data, setData] = React.useState<WorkspaceData>(load);
  const [saved, setSaved] = React.useState(false);
  const upd = (patch: Partial<WorkspaceData>) => setData(p => ({ ...p, ...patch }));

  const handleSave = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 700 }}>
      <h1 style={{ fontSize: 20, fontWeight: 400, color: S.textPrimary, marginBottom: 4, marginTop: 0 }}>Workspace</h1>
      <p style={{ fontSize: 13, color: S.textMuted, marginBottom: 32, marginTop: 0 }}>Configure your workspace identity and default scan settings.</p>

      <Section title="Workspace Identity">
        <Row label="Workspace name">
          <input type="text" value={data.name} onChange={e => upd({ name: e.target.value })} style={inputStyle} />
        </Row>
        <Row label="Workspace slug" sublabel="Used in report URLs and API paths.">
          <div style={{ display: "flex", alignItems: "center", gap: 0, ...inputStyle, padding: 0, overflow: "hidden" }}>
            <span style={{ padding: "0 8px", color: S.textMuted, fontSize: 13, flexShrink: 0, borderRight: `1px solid ${S.border}`, height: "100%", display: "flex", alignItems: "center" }}>cloudguard.io/</span>
            <input type="text" value={data.slug} onChange={e => upd({ slug: e.target.value })} style={{ flex: 1, height: "100%", padding: "0 10px", background: "transparent", border: "none", color: S.textPrimary, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
          </div>
        </Row>
        <Row label="Workspace icon">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: S.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 500, color: "#fff" }}>S</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" style={{ height: 28, padding: "0 10px", borderRadius: 6, background: "transparent", border: `1px solid ${S.borderStrong}`, color: S.textSecondary, fontSize: 12, cursor: "pointer" }}>Upload icon</button>
              <button type="button" style={{ background: "none", border: "none", color: S.textMuted, fontSize: 12, cursor: "pointer", padding: 0 }}>Remove</button>
            </div>
          </div>
        </Row>
        <Row label="Description">
          <textarea value={data.description} onChange={e => upd({ description: e.target.value })} placeholder="Describe the scope of this workspace…" style={{ ...inputStyle, height: 80, padding: "8px 10px", resize: "vertical", lineHeight: 1.5 }} />
        </Row>
      </Section>

      <Section title="Default Scan Settings">
        <Row label="Default cloud scope">
          <ChipGroup options={ALL_CLOUDS} value={data.cloudScope} onChange={v => upd({ cloudScope: v })} />
        </Row>
        <Row label="Default compliance frameworks">
          <ChipGroup options={ALL_COMPLIANCE} value={data.compliance} onChange={v => upd({ compliance: v })} />
        </Row>
        <Row label="Scan frequency">
          <select value={data.scanFreq} onChange={e => upd({ scanFreq: e.target.value })} style={selectStyle}>
            {FREQ_OPTIONS.map(o => <option key={o} value={o} style={{ background: "var(--cg-bg-card)" }}>{o}</option>)}
          </select>
        </Row>
        <Row label="Alert threshold">
          <select value={data.alertThreshold} onChange={e => upd({ alertThreshold: e.target.value })} style={selectStyle}>
            {ALERT_OPTIONS.map(o => <option key={o} value={o} style={{ background: "var(--cg-bg-card)" }}>{o}</option>)}
          </select>
        </Row>
      </Section>

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 }}>
        {saved && <span style={{ fontSize: 12, color: S.success }}>Saved</span>}
        <button type="button" onClick={handleSave} style={{ height: 34, padding: "0 14px", borderRadius: 6, background: S.accent, color: "#fff", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer" }}>
          Save changes
        </button>
      </div>
    </div>
  );
}

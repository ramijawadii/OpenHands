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
  notifyScanComplete: boolean;
  notifyCritical: boolean;
  notifyDigest: boolean;
  notifyChannel: string;
}

function load(): ThemeData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as ThemeData;
  } catch { /* ignore */ }
  return {
    theme: "dark", density: "default", fontSize: "14px",
    language: "English (US)", dateFormat: "MM/DD/YYYY",
    timezone: "UTC+1 — Europe/Paris", numberFormat: "1,000.00",
    notifyScanComplete: true, notifyCritical: true, notifyDigest: false,
    notifyChannel: "In-app",
  };
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

function Toggle({ on, onChange, label, sublabel }: { on: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", minHeight: 44, padding: "10px 0", borderBottom: "1px solid var(--cg-border-subtle)", gap: 24 }}>
      <div>
        <div style={{ fontSize: 14, color: S.textSecondary }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>{sublabel}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        style={{
          width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer", flexShrink: 0,
          background: on ? S.accent : "var(--cg-toggle-off)",
          position: "relative", transition: "background 120ms ease", padding: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: on ? 14 : 2,
          width: 14, height: 14, borderRadius: "50%", background: S.textPrimary,
          transition: "left 120ms ease",
        }} />
      </button>
    </div>
  );
}

const selectStyle: React.CSSProperties = { width: "100%", height: 36, padding: "0 10px", background: S.inputBg, border: `1px solid ${S.border}`, borderRadius: 6, color: S.textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", appearance: "none", cursor: "pointer" };

function SegmentedControl({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map(opt => {
        const active = value === opt;
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            style={{ height: 36, padding: "0 14px", borderRadius: 6, fontSize: 13, fontWeight: 400, border: `1px solid ${active ? S.borderStrong : S.border}`, background: active ? S.cardBg : "transparent", color: active ? S.textPrimary : S.textSecondary, cursor: "pointer", transition: "all 120ms ease" }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function ThemeSettings() {
  const [data, setData] = React.useState<ThemeData>(load);
  const [saved, setSaved] = React.useState(false);
  const upd = (patch: Partial<ThemeData>) => setData(p => ({ ...p, ...patch }));

  const handleSave = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 700 }}>
      <h1 style={{ fontSize: 20, fontWeight: 400, color: S.textPrimary, marginBottom: 4, marginTop: 0 }}>Theme & Language</h1>
      <p style={{ fontSize: 13, color: S.textMuted, marginBottom: 32, marginTop: 0 }}>Customize the appearance and locale of your dashboard.</p>

      <Section title="Appearance">
        <Row label="Appearance">
          <SegmentedControl value={data.theme} options={["system", "light", "dark"]} onChange={v => upd({ theme: v as ThemeData["theme"] })} />
        </Row>
        <Row label="UI Density">
          <SegmentedControl value={data.density} options={["comfortable", "default", "compact"]} onChange={v => upd({ density: v as ThemeData["density"] })} />
        </Row>
        <Row label="Console font size">
          <select value={data.fontSize} onChange={e => upd({ fontSize: e.target.value })} style={selectStyle}>
            {["12px", "13px", "14px", "15px", "16px"].map(s => <option key={s} value={s} style={{ background: "var(--cg-bg-card)" }}>{s}</option>)}
          </select>
        </Row>
      </Section>

      <Section title="Language & Region">
        <Row label="Language">
          <select value={data.language} onChange={e => upd({ language: e.target.value })} style={selectStyle}>
            {["English (US)", "English (UK)", "French", "Arabic", "German", "Spanish", "Japanese"].map(l => <option key={l} value={l} style={{ background: "var(--cg-bg-card)" }}>{l}</option>)}
          </select>
        </Row>
        <Row label="Date format">
          <select value={data.dateFormat} onChange={e => upd({ dateFormat: e.target.value })} style={selectStyle}>
            {["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].map(f => <option key={f} value={f} style={{ background: "var(--cg-bg-card)" }}>{f}</option>)}
          </select>
        </Row>
        <Row label="Timezone">
          <input type="text" value={data.timezone} onChange={e => upd({ timezone: e.target.value })} style={{ ...selectStyle, appearance: "none", cursor: "text" }} />
        </Row>
        <Row label="Number format">
          <select value={data.numberFormat} onChange={e => upd({ numberFormat: e.target.value })} style={selectStyle}>
            {["1,000.00", "1.000,00"].map(f => <option key={f} value={f} style={{ background: "var(--cg-bg-card)" }}>{f}</option>)}
          </select>
        </Row>
      </Section>

      <Section title="Notifications">
        <Toggle on={data.notifyScanComplete} onChange={v => upd({ notifyScanComplete: v })} label="Scan completion alerts" sublabel="Notify when a full coverage scan completes." />
        <Toggle on={data.notifyCritical} onChange={v => upd({ notifyCritical: v })} label="Critical finding alerts" sublabel="Immediate alert on CVSS ≥ 9.0 or P0 findings." />
        <Toggle on={data.notifyDigest} onChange={v => upd({ notifyDigest: v })} label="Weekly digest" sublabel="Summary of coverage changes and new risks." />
        <Row label="Notification channel">
          <select value={data.notifyChannel} onChange={e => upd({ notifyChannel: e.target.value })} style={selectStyle}>
            {["In-app", "Email", "Slack", "PagerDuty"].map(c => <option key={c} value={c} style={{ background: "var(--cg-bg-card)" }}>{c}</option>)}
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

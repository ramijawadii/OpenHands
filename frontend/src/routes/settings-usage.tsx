import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const S = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  inputBg: "var(--cg-input-bg)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  danger: "var(--cg-danger)",
  cardBg: "var(--cg-bg-card)",
  badgeBg: "var(--cg-bg-badge)",
} as const;

const STATS = [
  { label: "API Calls", value: "128,440", delta: "+12%", up: true },
  { label: "Scans Run", value: "342", delta: "-3%", up: false },
  { label: "Assets Scanned", value: "24,871", delta: "+8%", up: true },
  { label: "Findings Found", value: "1,203", delta: "147 critical", up: false },
];

const CONNECTOR_USAGE = [
  { name: "AWS Prod", cloud: "AWS", color: "#FF9900", scans: 142, assets: "12,404", findings: 534, calls: "58,211" },
  { name: "Azure EU", cloud: "Az", color: "#0078D4", scans: 98, assets: "8,200", findings: 412, calls: "44,100" },
  { name: "GCP Dev", cloud: "GCP", color: "#34A853", scans: 102, assets: "4,263", findings: 257, calls: "26,129" },
];

const MEMBER_USAGE = [
  { initials: "RS", name: "Rami Sentinel", role: "Admin", color: "#9B87F5", scans: 87, reviewed: 412, tokens: 2 },
  { initials: "JD", name: "Jana Doe", role: "Security Engineer", color: "#2d86d4", scans: 45, reviewed: 210, tokens: 1 },
  { initials: "MT", name: "Marc T.", role: "Viewer", color: "#4caf7d", scans: 0, reviewed: 22, tokens: 0 },
];

const DATE_RANGES = ["7d", "30d", "90d"];

const CHART_DATA_30D = [
  { day: "May 1",  calls: 3200, scans: 8,  findings: 34 },
  { day: "May 3",  calls: 4100, scans: 12, findings: 41 },
  { day: "May 5",  calls: 3800, scans: 10, findings: 28 },
  { day: "May 7",  calls: 5200, scans: 15, findings: 62 },
  { day: "May 9",  calls: 4700, scans: 11, findings: 45 },
  { day: "May 11", calls: 6100, scans: 18, findings: 57 },
  { day: "May 13", calls: 5400, scans: 14, findings: 39 },
  { day: "May 15", calls: 7200, scans: 20, findings: 71 },
  { day: "May 17", calls: 6800, scans: 19, findings: 68 },
  { day: "May 19", calls: 8100, scans: 22, findings: 84 },
  { day: "May 21", calls: 7600, scans: 21, findings: 77 },
  { day: "May 23", calls: 9400, scans: 25, findings: 92 },
  { day: "May 24", calls: 8800, scans: 23, findings: 87 },
];

const CHART_DATA_7D = CHART_DATA_30D.slice(-7);
const CHART_DATA_90D = [
  { day: "Mar 1",  calls: 1800, scans: 5,  findings: 18 },
  { day: "Mar 8",  calls: 2400, scans: 7,  findings: 22 },
  { day: "Mar 15", calls: 3100, scans: 9,  findings: 31 },
  { day: "Mar 22", calls: 2900, scans: 8,  findings: 27 },
  { day: "Apr 1",  calls: 4200, scans: 11, findings: 40 },
  { day: "Apr 8",  calls: 5100, scans: 14, findings: 53 },
  { day: "Apr 15", calls: 4700, scans: 13, findings: 48 },
  { day: "Apr 22", calls: 6300, scans: 17, findings: 61 },
  ...CHART_DATA_30D,
];

const RANGE_DATA: Record<string, typeof CHART_DATA_30D> = {
  "7d": CHART_DATA_7D,
  "30d": CHART_DATA_30D,
  "90d": CHART_DATA_90D,
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--cg-bg-page)", border: "1px solid var(--cg-border-strong)", borderRadius: 6, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "var(--cg-text-muted)", marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <span style={{ color: "var(--cg-text-primary)", fontFamily: "monospace" }}>{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, delta, up }: { label: string; value: string; delta: string; up: boolean }) {
  return (
    <div style={{ background: S.cardBg, border: `1px solid ${S.border}`, borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 12, color: S.textMuted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 500, color: S.textPrimary, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, color: up ? S.success : S.danger }}>{delta}</div>
    </div>
  );
}

function UsageChart({ range }: { range: string }) {
  const data = RANGE_DATA[range] ?? CHART_DATA_30D;
  return (
    <div style={{ background: S.cardBg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "20px 20px 12px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: S.textPrimary }}>Activity Overview</div>
          <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>API calls · scans · findings</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2d86d4" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#2d86d4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gFindings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e05252" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#e05252" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gScans" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4caf7d" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#4caf7d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(222,220,206,0.06)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "#968f85", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#968f85", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(222,220,206,0.12)", strokeWidth: 1 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#968f85", paddingTop: 12 }} />
          <Area type="monotone" dataKey="calls" name="API Calls" stroke="#2d86d4" strokeWidth={1.5} fill="url(#gCalls)" dot={false} />
          <Area type="monotone" dataKey="findings" name="Findings" stroke="#e05252" strokeWidth={1.5} fill="url(#gFindings)" dot={false} />
          <Area type="monotone" dataKey="scans" name="Scans" stroke="#4caf7d" strokeWidth={1.5} fill="url(#gScans)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function UsageSettings() {
  const [range, setRange] = React.useState("30d");

  return (
    <div style={{ padding: "40px 48px", maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 400, color: S.textPrimary, marginBottom: 4, marginTop: 0 }}>Usage</h1>
          <p style={{ fontSize: 13, color: S.textMuted, marginTop: 0, marginBottom: 0 }}>Monitor API usage, scan activity, and finding trends.</p>
        </div>
        <div style={{ display: "flex", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
          {DATE_RANGES.map(r => (
            <button key={r} type="button" onClick={() => setRange(r)}
              style={{ height: 32, padding: "0 14px", background: range === r ? S.inputBg : "transparent", border: "none", borderRight: r !== "90d" ? `1px solid ${S.border}` : "none", color: range === r ? S.textPrimary : S.textMuted, fontSize: 13, cursor: "pointer" }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <UsageChart range={range} />

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 500, color: S.textPrimary, paddingBottom: 12, borderBottom: `1px solid ${S.border}`, marginBottom: 16, marginTop: 0 }}>Usage by Connector</h2>
        <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 80px 80px 80px 100px", padding: "8px 16px", borderBottom: `1px solid ${S.border}` }}>
            {["", "Connector", "Scans", "Assets", "Findings", "API Calls"].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 600, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>
          {CONNECTOR_USAGE.map((c, i) => (
            <div key={c.name} style={{ display: "grid", gridTemplateColumns: "32px 1fr 80px 80px 80px 100px", padding: "10px 16px", borderBottom: i < CONNECTOR_USAGE.length - 1 ? `1px solid var(--cg-border-subtle)` : "none", alignItems: "center" }}>
              <div style={{ width: 24, height: 24, borderRadius: 4, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{c.cloud}</div>
              <span style={{ fontSize: 13, color: S.textSecondary }}>{c.name}</span>
              <span style={{ fontSize: 12, color: S.textMuted }}>{c.scans}</span>
              <span style={{ fontSize: 12, color: S.textMuted }}>{c.assets}</span>
              <span style={{ fontSize: 12, color: S.textMuted }}>{c.findings}</span>
              <span style={{ fontSize: 12, color: S.textMuted, fontFamily: "monospace" }}>{c.calls}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 14, fontWeight: 500, color: S.textPrimary, paddingBottom: 12, borderBottom: `1px solid ${S.border}`, marginBottom: 16, marginTop: 0 }}>Usage by Team Member</h2>
        <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 80px 120px 100px", padding: "8px 16px", borderBottom: `1px solid ${S.border}` }}>
            {["", "Member", "Role", "Scans", "Reviewed", "Tokens"].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 600, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>
          {MEMBER_USAGE.map((m, i) => (
            <div key={m.name} style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 80px 120px 100px", padding: "10px 16px", borderBottom: i < MEMBER_USAGE.length - 1 ? `1px solid var(--cg-border-subtle)` : "none", alignItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#fff" }}>{m.initials}</div>
              <span style={{ fontSize: 13, color: S.textSecondary }}>{m.name}</span>
              <span style={{ fontSize: 12, color: S.textMuted }}>{m.role}</span>
              <span style={{ fontSize: 12, color: S.textMuted }}>{m.scans}</span>
              <span style={{ fontSize: 12, color: S.textMuted }}>{m.reviewed}</span>
              <span style={{ fontSize: 12, color: S.textMuted }}>{m.tokens}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

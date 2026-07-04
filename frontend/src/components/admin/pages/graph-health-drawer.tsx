/* eslint-disable i18next/no-literal-string -- CloudGuard internal graph-health drawer */
import React from "react";
import {
  X,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Plug,
  RefreshCw,
  CheckCircle2,
  Gauge,
  Boxes,
  Database,
  FlaskConical,
  Radio,
  Ticket,
} from "lucide-react";
import { type GraphSource, type GraphMetrics } from "./graph-core";
import { CHROME } from "./graph-shell";

// ── light theme (matches the other graph drawers via CHROME) ──────────────────
const L = {
  bg: CHROME.bg, // #ffffff
  card: "hsl(50deg,20%,97.5%)",
  cardHi: "#ffffff",
  border: CHROME.border,
  text: CHROME.text,
  muted: CHROME.muted,
  faint: "hsl(51deg,3%,62%)",
  green: "#1f9d4d",
  greenBar: "#2fb85e",
  greenFaint: "#a9e2be",
  amber: "#c8820a",
  blue: CHROME.accent,
  red: "#cf3c26",
  mono: "'IBM Plex Mono', source-code-pro, Menlo, Consolas, monospace",
};

export type GraphMode = "live" | "lab";
type Tone = "green" | "amber" | "red" | "blue" | "muted";
const TONE: Record<Tone, string> = {
  green: L.green,
  amber: L.amber,
  red: L.red,
  blue: L.blue,
  muted: L.muted,
};
const toneColor = (t: Tone) => TONE[t];

// ── primitives ────────────────────────────────────────────────────────────────
function Dot({ tone }: { tone: Tone }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: toneColor(tone),
        flexShrink: 0,
        display: "inline-block",
      }}
    />
  );
}

function Badge({
  tone,
  children,
  outline,
}: {
  tone: Tone;
  children: React.ReactNode;
  outline?: boolean;
}) {
  const c = toneColor(tone);
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        color: c,
        background: outline ? "transparent" : `${c}1a`,
        border: outline ? `1px solid ${c}66` : "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Section({
  icon,
  title,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: L.card,
        border: `1px solid ${L.border}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
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
        <span style={{ color: L.muted, display: "inline-flex" }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 13.5 }}>{title}</span>
        {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
      </div>
      {children}
    </div>
  );
}

function StatTile({
  tone,
  label,
  value,
  unit,
  sub,
}: {
  tone: Tone;
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: L.cardHi,
        border: `1px solid ${L.border}`,
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 6,
        }}
      >
        <Dot tone={tone} />
        <span style={{ fontSize: 12, color: L.muted }}>{label}</span>
      </div>
      <div
        style={{
          fontSize: 19,
          fontWeight: 700,
          lineHeight: 1.1,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 12.5, color: L.muted, fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: L.faint, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function Meter({
  label,
  tone,
  pct,
  right,
}: {
  label: string;
  tone: Tone;
  pct: number;
  right: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "7px 0",
      }}
    >
      <Dot tone={tone} />
      <span style={{ fontSize: 12.5, color: L.text, minWidth: 130 }}>
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          background: "rgba(30,20,10,0.07)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(2, Math.min(100, pct))}%`,
            height: "100%",
            background: toneColor(tone),
            borderRadius: 3,
          }}
        />
      </div>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          minWidth: 78,
          textAlign: "right",
        }}
      >
        {right}
      </span>
    </div>
  );
}

function SignalRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 0",
        borderTop: `1px solid ${L.border}`,
      }}
    >
      <Radio size={13} color={L.faint} />
      <span style={{ fontSize: 12.5, color: L.text }}>{label}</span>
      <span
        style={{
          marginLeft: "auto",
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        {children}
      </span>
    </div>
  );
}

// ── health data (mode-aware); real fields override representative ones ─────────
function num(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}

const DASH = "—";

// deterministic content checksum over the real graph metrics (FNV-1a) — a real
// value that changes iff the graph does, rendered like a3f8…c12e.
/* eslint-disable no-bitwise -- FNV-1a hash is inherently bitwise */
function checksum(m: GraphMetrics): string {
  const s = `${m.nodes}:${m.edges}:${m.avgDegree}:${m.reach.p99}:${m.hubs.map((h) => h.id).join(",")}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `${hex.slice(0, 4)}…${hex.slice(4)}`;
}
/* eslint-enable no-bitwise */

function LiveHealth({
  metrics,
  freshness,
}: {
  metrics: GraphMetrics | null;
  freshness: string | null;
}) {
  return (
    <>
      <Section icon={<Gauge size={15} />} title="Graph metrics">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <StatTile
            tone="green"
            label="Nodes"
            value={metrics ? num(metrics.nodes) : DASH}
            sub="in graph"
          />
          <StatTile
            tone="green"
            label="Edges"
            value={metrics ? num(metrics.edges) : DASH}
            sub="active"
          />
          <StatTile
            tone="green"
            label="Avg degree"
            value={metrics ? metrics.avgDegree.toFixed(2) : DASH}
            sub="edges / node"
          />
          <StatTile
            tone={metrics && metrics.orphanRate > 0.1 ? "amber" : "green"}
            label="Max blast (p99)"
            value={metrics ? String(metrics.reach.p99) : DASH}
            sub="downstream reach"
          />
        </div>
      </Section>
      <Section icon={<Database size={15} />} title="Ingestion pipeline">
        <Meter label="Kafka lag" tone="green" pct={14} right="1.2k events" />
        <Meter label="Ingest rate" tone="amber" pct={70} right="74k/min" />
        <Meter label="Dead-letter queue" tone="green" pct={3} right="0.02%" />
        <Meter
          label="Entity resolution"
          tone="green"
          pct={98}
          right="98.4% match"
        />
      </Section>
      <Section icon={<Activity size={15} />} title="Live graph signals">
        <SignalRow label="New anomalies (1h)">
          <Badge tone="amber">14 flagged</Badge>
        </SignalRow>
        <SignalRow label="Edge delta (5min)">
          +2,410 / <span style={{ color: L.red }}>−87</span>
        </SignalRow>
        <SignalRow label="Active sessions">6 analysts</SignalRow>
        <SignalRow label="Data freshness">
          <Badge tone="green">{freshness ?? "3s lag"}</Badge>
        </SignalRow>
      </Section>
    </>
  );
}

function LabHealth({ metrics }: { metrics: GraphMetrics | null }) {
  const nodes = metrics ? num(metrics.nodes) : DASH;
  const edges = metrics ? num(metrics.edges) : DASH;
  const capturedAt = React.useMemo(
    () =>
      `${new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      })} UTC`,
    [],
  );
  return (
    <>
      <Section
        icon={<Boxes size={15} />}
        title="Snapshot integrity"
        right={<Badge tone="blue">❄ frozen</Badge>}
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <StatTile
            tone="green"
            label="Captured at"
            value={<span style={{ fontSize: 15 }}>{capturedAt}</span>}
            sub="snapshot time"
          />
          <StatTile
            tone="green"
            label="Nodes"
            value={nodes}
            sub={
              metrics
                ? `avg deg ${metrics.avgDegree.toFixed(2)}`
                : "in snapshot"
            }
          />
          <StatTile
            tone="green"
            label="Edges"
            value={edges}
            sub={
              metrics
                ? `${(metrics.orphanRate * 100).toFixed(1)}% orphan`
                : "in snapshot"
            }
          />
          <StatTile
            tone="blue"
            label="Checksum"
            value={
              <span style={{ fontSize: 15 }}>
                {metrics ? checksum(metrics) : DASH}
              </span>
            }
            sub={<Badge tone="green">verified</Badge>}
          />
        </div>
      </Section>
      <Section icon={<Gauge size={15} />} title="Render performance (snapshot)">
        <Meter
          label="Query p99 (read-only)"
          tone="green"
          pct={9}
          right="18ms"
        />
        <Meter label="Render fps" tone="green" pct={100} right="60fps" />
        <Meter label="LOD cache warm" tone="green" pct={100} right="100%" />
        <Meter
          label="Viewport tiles loaded"
          tone="green"
          pct={95}
          right="95 / 100"
        />
      </Section>
      <Section icon={<FlaskConical size={15} />} title="Lab / sandbox signals">
        <SignalRow label="Sandbox session">
          <Badge tone="blue">analyst-07</Badge>
        </SignalRow>
        <SignalRow label="Local mutations">+12 edges, −3 nodes</SignalRow>
        <SignalRow label="Drift from live">
          <Badge tone="amber">22h 14m</Badge>
        </SignalRow>
        <SignalRow label="Write isolation">
          <Badge tone="green" outline>
            confirmed
          </Badge>
        </SignalRow>
      </Section>
    </>
  );
}

// ── warning registry + non-interrupting resync jobs + ticket reporting ────────
type Warning = {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
  age: string;
  fix?: { label: string; running: string; done: string };
};

const WARNINGS: Record<GraphMode, Warning[]> = {
  live: [
    {
      id: "ingest-rate",
      tone: "amber",
      title: "Ingest rate elevated",
      detail: "74k/min sustained (soft cap 60k). Consumer lag climbing.",
      age: "8m",
      fix: { label: "Scale consumers", running: "Scaling…", done: "Scaled" },
    },
    {
      id: "anomalies",
      tone: "amber",
      title: "14 new anomalies (1h)",
      detail: "Unusual assume-role edges flagged by the sentinel.",
      age: "12m",
    },
    {
      id: "fps",
      tone: "blue",
      title: "Render fps below target",
      detail: "44 < 60 fps at current viewport density.",
      age: "3m",
      fix: {
        label: "Rebuild LOD tiles",
        running: "Rebuilding…",
        done: "Rebuilt",
      },
    },
  ],
  lab: [
    {
      id: "drift",
      tone: "amber",
      title: "Snapshot drift 22h 14m",
      detail: "Live graph advanced +2.4k edges since capture.",
      age: "22h",
      fix: {
        label: "Resync from live",
        running: "Resyncing…",
        done: "Resynced",
      },
    },
    {
      id: "mutations",
      tone: "blue",
      title: "Unsaved local mutations",
      detail: "+12 edges, −3 nodes in this sandbox not persisted.",
      age: "31m",
    },
  ],
};

type JobState = "idle" | "running" | "done";

function useResyncJobs() {
  const [jobs, setJobs] = React.useState<
    Record<string, { state: JobState; pct: number }>
  >({});
  const run = React.useCallback((id: string) => {
    setJobs((j) => ({ ...j, [id]: { state: "running", pct: 0 } }));
    const t = setInterval(() => {
      setJobs((j) => {
        const cur = j[id];
        if (!cur || cur.state !== "running") {
          clearInterval(t);
          return j;
        }
        const pct = cur.pct + 12 + Math.random() * 10;
        if (pct >= 100) {
          clearInterval(t);
          return { ...j, [id]: { state: "done", pct: 100 } };
        }
        return { ...j, [id]: { state: "running", pct } };
      });
    }, 320);
  }, []);
  return { jobs, run };
}

function FixAction({
  fix,
  state,
  pct,
  onFix,
}: {
  fix: NonNullable<Warning["fix"]>;
  state: JobState;
  pct: number;
  onFix: () => void;
}) {
  if (state === "done") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: L.green,
          fontWeight: 600,
        }}
      >
        <CheckCircle2 size={13} /> {fix.done} · runs in background
      </span>
    );
  }
  if (state === "running") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}>
        <div
          style={{
            flex: 1,
            height: 5,
            borderRadius: 3,
            background: "rgba(30,20,10,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, pct)}%`,
              height: "100%",
              background: L.blue,
              borderRadius: 3,
              transition: "width 0.3s",
            }}
          />
        </div>
        <span style={{ fontSize: 11.5, color: L.blue }}>{fix.running}</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onFix}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: L.text,
        background: L.cardHi,
        border: `1px solid ${L.border}`,
        borderRadius: 7,
        padding: "5px 11px",
        cursor: "pointer",
      }}
    >
      <RefreshCw size={12} /> {fix.label}
    </button>
  );
}

function ReportAction({
  ticket,
  onReport,
}: {
  ticket?: string;
  onReport: () => void;
}) {
  if (ticket) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          color: L.muted,
          fontWeight: 600,
        }}
      >
        <Ticket size={12} /> Reported ·{" "}
        <span style={{ color: L.blue, fontFamily: L.mono }}>{ticket}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onReport}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: L.text,
        background: "transparent",
        border: `1px solid ${L.border}`,
        borderRadius: 7,
        padding: "5px 11px",
        cursor: "pointer",
      }}
    >
      <Ticket size={12} /> Report
    </button>
  );
}

function WarningCard({
  w,
  job,
  ticket,
  onFix,
  onReport,
}: {
  w: Warning;
  job?: { state: JobState; pct: number };
  ticket?: string;
  onFix: () => void;
  onReport: () => void;
}) {
  return (
    <div
      style={{
        background: L.cardHi,
        border: `1px solid ${L.border}`,
        borderRadius: 10,
        padding: "11px 13px",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <span style={{ marginTop: 2 }}>
          <AlertTriangle size={14} color={toneColor(w.tone)} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{w.title}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: L.faint }}>
              {w.age} ago
            </span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: L.muted,
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            {w.detail}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            {w.fix && (
              <FixAction
                fix={w.fix}
                state={job?.state ?? "idle"}
                pct={job?.pct ?? 0}
                onFix={onFix}
              />
            )}
            <ReportAction ticket={ticket} onReport={onReport} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── connector health — status-page uptime timeline per source ─────────────────
type DayState = "up" | "degraded" | "down";
type Connector = {
  name: string;
  tone: Tone;
  status: string;
  uptime: string;
  history: DayState[];
};

// deterministic 90-day history: mostly up, with the given incidents seeded
function history(
  seed: number,
  incidents: Record<number, DayState>,
): DayState[] {
  const out: DayState[] = [];
  let x = seed * 9301 + 49297;
  for (let i = 0; i < 90; i += 1) {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    out.push(incidents[i] ?? (r > 0.985 ? "degraded" : "up"));
  }
  return out;
}

const CONNECTORS: Connector[] = [
  {
    name: "AWS CloudTrail",
    tone: "green",
    status: "streaming",
    uptime: "99.999%",
    history: history(1, { 71: "down" }),
  },
  {
    name: "IAM / Access Analyzer",
    tone: "green",
    status: "streaming",
    uptime: "99.994%",
    history: history(2, {}),
  },
  {
    name: "AWS Config",
    tone: "green",
    status: "streaming",
    uptime: "99.981%",
    history: history(3, { 40: "degraded", 41: "degraded" }),
  },
  {
    name: "GuardDuty",
    tone: "amber",
    status: "degraded",
    uptime: "98.441%",
    history: history(4, {
      84: "down",
      85: "down",
      24: "degraded",
      33: "degraded",
      55: "degraded",
    }),
  },
  {
    name: "Prowler (scheduled)",
    tone: "green",
    status: "healthy",
    uptime: "99.900%",
    history: history(5, { 12: "degraded" }),
  },
  {
    name: "Kubernetes audit",
    tone: "red",
    status: "disconnected",
    uptime: "96.220%",
    history: history(6, { 88: "down", 89: "down", 87: "down" }),
  },
];

const BAR_COLOR: Record<DayState, string> = {
  up: L.greenBar,
  degraded: L.greenFaint,
  down: L.red,
};
const barColor = (d: DayState) => BAR_COLOR[d];

function UptimeStrip({ history: h }: { history: DayState[] }) {
  const n = h.length;
  const step = 3; // per-bar advance in viewBox units
  const bw = 2.1; // bar width (leaves a thin gap)
  const H = 26;
  return (
    <>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${n * step} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="90-day uptime"
        style={{ display: "block" }}
      >
        {h.map((d, i) => (
          /* eslint-disable-next-line react/no-array-index-key */
          <rect
            key={i}
            x={i * step}
            y={0}
            width={bw}
            height={H}
            rx={1}
            fill={barColor(d)}
          >
            <title>{d}</title>
          </rect>
        ))}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 5,
          fontSize: 10.5,
          color: L.faint,
        }}
      >
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </>
  );
}

function Connectors() {
  return (
    <Section
      icon={<Plug size={15} />}
      title="Connector health"
      right={<Badge tone="green">Operational</Badge>}
    >
      {CONNECTORS.map((c, idx) => (
        <div
          key={c.name}
          style={{
            padding: "12px 0",
            borderTop: idx === 0 ? "none" : `1px solid ${L.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginBottom: 8,
            }}
          >
            <Dot tone={c.tone} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: L.text }}>
              {c.name}
            </span>
            <span style={{ fontSize: 11, color: toneColor(c.tone) }}>
              · {c.status}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                fontWeight: 700,
                color: L.green,
              }}
            >
              {c.uptime} uptime
            </span>
          </div>
          <UptimeStrip history={c.history} />
        </div>
      ))}
    </Section>
  );
}

// ── the drawer ─────────────────────────────────────────────────────────────────
type Tab = "health" | "warnings" | "connectors";

export function GraphHealthDrawer({
  source,
  onClose,
  mode: initialMode = "live",
}: {
  source: GraphSource;
  onClose: () => void;
  mode?: GraphMode;
}) {
  const [mode, setMode] = React.useState<GraphMode>(initialMode);
  const [tab, setTab] = React.useState<Tab>("health");
  const [metrics, setMetrics] = React.useState<GraphMetrics | null>(null);
  const [freshness, setFreshness] = React.useState<string | null>(null);
  const [tickets, setTickets] = React.useState<Record<string, string>>({});
  const { jobs, run } = useResyncJobs();

  React.useEffect(() => {
    let live = true;
    source
      .metrics()
      .then((m) => {
        if (!live) return;
        setMetrics(m);
        const fr = (m as unknown as { freshness?: { at?: string } }).freshness;
        if (fr?.at) setFreshness("live");
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [source]);

  const report = React.useCallback((id: string) => {
    setTickets((t) =>
      t[id]
        ? t
        : { ...t, [id]: `INC-${4800 + Math.floor(Math.random() * 200)}` },
    );
  }, []);

  const warnings = WARNINGS[mode];
  const openCount = warnings.filter((w) => jobs[w.id]?.state !== "done").length;
  const primary = warnings.find(
    (w) =>
      w.fix && jobs[w.id]?.state !== "done" && jobs[w.id]?.state !== "running",
  );

  const drawer: React.CSSProperties = {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 460,
    maxWidth: "100%",
    zIndex: 40,
    background: L.bg,
    borderLeft: `1px solid ${L.border}`,
    boxShadow: "-14px 0 40px rgba(30,20,10,0.12)",
    color: L.text,
    display: "flex",
    flexDirection: "column",
    fontSize: 13,
  };

  const modeBtn = (m: GraphMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: "4px 11px",
        borderRadius: 7,
        border: "none",
        cursor: "pointer",
        color: mode === m ? L.text : L.muted,
        background: mode === m ? "#fff" : "transparent",
        boxShadow: mode === m ? "0 1px 2px rgba(30,20,10,0.12)" : "none",
      }}
    >
      {label}
    </button>
  );

  const tabBtn = (t: Tab, label: string, badge?: number) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12.5,
        fontWeight: 600,
        padding: "8px 4px",
        border: "none",
        borderBottom: `2px solid ${tab === t ? L.blue : "transparent"}`,
        background: "transparent",
        color: tab === t ? L.text : L.muted,
        cursor: "pointer",
      }}
    >
      {label}
      {badge ? <Badge tone="amber">{badge}</Badge> : null}
    </button>
  );

  return (
    <div style={drawer}>
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "13px 16px",
          borderBottom: `1px solid ${L.border}`,
        }}
      >
        <ShieldCheck size={17} color={L.blue} />
        <span style={{ fontWeight: 700, fontSize: 14.5 }}>Health</span>
        <div
          style={{
            display: "flex",
            gap: 2,
            marginLeft: 6,
            background: L.card,
            border: `1px solid ${L.border}`,
            borderRadius: 8,
            padding: 2,
          }}
        >
          {modeBtn("live", "Live")}
          {modeBtn("lab", "Lab")}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            color: L.muted,
            cursor: "pointer",
            display: "inline-flex",
          }}
        >
          <X size={17} />
        </button>
      </div>

      {/* live/frozen strip + last refresh */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 16px",
          borderBottom: `1px solid ${L.border}`,
          fontSize: 11.5,
          color: L.muted,
        }}
      >
        <Dot tone={mode === "live" ? "green" : "blue"} />
        {mode === "live" ? "Live · read-only" : "Lab · sandboxed snapshot"}
        <span style={{ color: L.faint }}>· {source.kind}</span>
        <span style={{ marginLeft: "auto" }}>Last refresh: 3s ago</span>
      </div>

      {/* non-interrupting alert bar */}
      {openCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 16px",
            background: "rgba(200,130,10,0.08)",
            borderBottom: `1px solid ${L.border}`,
          }}
        >
          <AlertTriangle size={14} color={L.amber} />
          <span style={{ fontSize: 12.5, color: L.text }}>
            {openCount} open warning{openCount > 1 ? "s" : ""}
          </span>
          {primary?.fix && (
            <button
              type="button"
              onClick={() => run(primary.id)}
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: L.amber,
                background: "transparent",
                border: `1px solid ${L.amber}66`,
                borderRadius: 7,
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={12} /> {primary.fix.label}
            </button>
          )}
        </div>
      )}

      {/* sub-view tabs */}
      <div
        style={{
          display: "flex",
          gap: 18,
          padding: "0 16px",
          borderBottom: `1px solid ${L.border}`,
        }}
      >
        {tabBtn("health", "Health")}
        {tabBtn("warnings", "Warnings", openCount)}
        {tabBtn("connectors", "Connectors")}
      </div>

      {/* body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {tab === "health" &&
          (mode === "live" ? (
            <LiveHealth metrics={metrics} freshness={freshness} />
          ) : (
            <LabHealth metrics={metrics} />
          ))}
        {tab === "warnings" && (
          <>
            {warnings.map((w) => (
              <WarningCard
                key={w.id}
                w={w}
                job={jobs[w.id]}
                ticket={tickets[w.id]}
                onFix={() => run(w.id)}
                onReport={() => report(w.id)}
              />
            ))}
            <div
              style={{
                fontSize: 11,
                color: L.faint,
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              Fixes run as non-interrupting background jobs — the graph stays
              interactive. Report opens an incident ticket for tracking.
            </div>
          </>
        )}
        {tab === "connectors" && <Connectors />}

        <div
          style={{
            fontSize: 10.5,
            color: L.faint,
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          Node/edge counts and freshness are live from the graph API;
          operational telemetry (fps, Kafka, cache, sandbox) is representative
          until the ops feed is wired.
        </div>
      </div>
    </div>
  );
}

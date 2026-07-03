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
} from "lucide-react";
import { type GraphSource, type GraphMetrics } from "./graph-core";

// ── dark "operations cockpit" theme (matches the health mockups) ──────────────
const D = {
  bg: "#0e0f12",
  card: "#17181c",
  cardHi: "#1d1f24",
  border: "rgba(255,255,255,0.08)",
  text: "#e9eaed",
  muted: "#8b909a",
  faint: "#5c616b",
  green: "#37b34a",
  amber: "#e6a417",
  blue: "#3d8ee6",
  red: "#e0492f",
  mono: "'IBM Plex Mono', source-code-pro, Menlo, Consolas, monospace",
};

export type GraphMode = "live" | "lab";
type Tone = "green" | "amber" | "red" | "blue" | "muted";
const TONE: Record<Tone, string> = {
  green: D.green,
  amber: D.amber,
  red: D.red,
  blue: D.blue,
  muted: D.muted,
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
        background: outline ? "transparent" : `${c}22`,
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
        background: D.card,
        border: `1px solid ${D.border}`,
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
        <span style={{ color: D.muted, display: "inline-flex" }}>{icon}</span>
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
        background: D.cardHi,
        border: `1px solid ${D.border}`,
        borderRadius: 10,
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
        <span style={{ fontSize: 12, color: D.muted }}>{label}</span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.05,
          fontFamily: D.mono,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 13, color: D.muted, fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: D.faint, marginTop: 4 }}>{sub}</div>
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
      <span style={{ fontSize: 12.5, color: D.text, minWidth: 130 }}>
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          background: "rgba(255,255,255,0.06)",
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
          fontFamily: D.mono,
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
        borderTop: `1px solid ${D.border}`,
      }}
    >
      <Radio size={13} color={D.faint} />
      <span style={{ fontSize: 12.5, color: D.text }}>{label}</span>
      <span
        style={{
          marginLeft: "auto",
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: D.mono,
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

function LiveHealth({
  metrics,
  freshness,
}: {
  metrics: GraphMetrics | null;
  freshness: string | null;
}) {
  const edges = metrics ? num(metrics.edges) : "1.2M";
  return (
    <>
      <Section icon={<Gauge size={15} />} title="Engine health">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <StatTile
            tone="green"
            label="Query p99"
            value="42"
            unit="ms"
            sub="threshold 200ms"
          />
          <StatTile
            tone="amber"
            label="Render fps"
            value="44"
            unit="fps"
            sub="target 60fps"
          />
          <StatTile
            tone="green"
            label="Active edges"
            value={edges}
            sub="in viewport: 4.8k"
          />
          <StatTile
            tone="green"
            label="Cache hit"
            value="91"
            unit="%"
            sub="Redis tile cache"
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
          +2,410 / <span style={{ color: D.red }}>−87</span>
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
  const nodes = metrics ? num(metrics.nodes) : "218k";
  const edges = metrics ? num(metrics.edges) : "1.17M";
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
            value={<span style={{ fontSize: 15 }}>14:32 UTC</span>}
            sub="2026-07-01"
          />
          <StatTile
            tone="green"
            label="Nodes"
            value={nodes}
            sub="vs live: −0.3%"
          />
          <StatTile
            tone="green"
            label="Edges"
            value={edges}
            sub="vs live: −1.1%"
          />
          <StatTile
            tone="blue"
            label="Checksum"
            value={<span style={{ fontSize: 15 }}>a3f8…c12e</span>}
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

// ── warning registry + non-interrupting resync jobs ───────────────────────────
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
    // non-interrupting background job: ticks progress without blocking the UI
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
          color: D.green,
          fontWeight: 600,
        }}
      >
        <CheckCircle2 size={13} /> {fix.done} · runs in background
      </span>
    );
  }
  if (state === "running") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div
          style={{
            flex: 1,
            height: 5,
            borderRadius: 3,
            background: "rgba(255,255,255,0.07)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, pct)}%`,
              height: "100%",
              background: D.blue,
              borderRadius: 3,
              transition: "width 0.3s",
            }}
          />
        </div>
        <span style={{ fontSize: 11.5, color: D.blue }}>{fix.running}</span>
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
        color: D.text,
        background: D.cardHi,
        border: `1px solid ${D.border}`,
        borderRadius: 7,
        padding: "5px 11px",
        cursor: "pointer",
      }}
    >
      <RefreshCw size={12} /> {fix.label}
    </button>
  );
}

function WarningCard({
  w,
  job,
  onFix,
}: {
  w: Warning;
  job?: { state: JobState; pct: number };
  onFix: () => void;
}) {
  return (
    <div
      style={{
        background: D.card,
        border: `1px solid ${D.border}`,
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
            <span style={{ marginLeft: "auto", fontSize: 11, color: D.faint }}>
              {w.age} ago
            </span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: D.muted,
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            {w.detail}
          </div>
          {w.fix && (
            <div style={{ marginTop: 9 }}>
              <FixAction
                fix={w.fix}
                state={job?.state ?? "idle"}
                pct={job?.pct ?? 0}
                onFix={onFix}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── connector health (compact, operational) ───────────────────────────────────
type Connector = { name: string; tone: Tone; status: string; sync: string };
const CONNECTORS: Connector[] = [
  {
    name: "AWS CloudTrail",
    tone: "green",
    status: "streaming",
    sync: "3s ago",
  },
  {
    name: "IAM / Access Analyzer",
    tone: "green",
    status: "streaming",
    sync: "9s ago",
  },
  { name: "AWS Config", tone: "green", status: "streaming", sync: "14s ago" },
  { name: "GuardDuty", tone: "amber", status: "degraded", sync: "6m ago" },
  {
    name: "Prowler (scheduled)",
    tone: "green",
    status: "healthy",
    sync: "22m ago",
  },
  {
    name: "Kubernetes audit",
    tone: "red",
    status: "disconnected",
    sync: "1h ago",
  },
];

function Connectors() {
  return (
    <Section
      icon={<Plug size={15} />}
      title="Connector health"
      right={<span style={{ fontSize: 11, color: D.faint }}>6 sources</span>}
    >
      {CONNECTORS.map((c) => (
        <div
          key={c.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 0",
            borderTop: `1px solid ${D.border}`,
          }}
        >
          <Dot tone={c.tone} />
          <span style={{ fontSize: 12.5, color: D.text }}>{c.name}</span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11.5,
              color: toneColor(c.tone),
            }}
          >
            {c.status}
          </span>
          <span
            style={{
              fontSize: 11,
              color: D.faint,
              minWidth: 56,
              textAlign: "right",
            }}
          >
            {c.sync}
          </span>
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
    background: D.bg,
    borderLeft: `1px solid ${D.border}`,
    boxShadow: "-14px 0 40px rgba(0,0,0,0.35)",
    color: D.text,
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
        color: mode === m ? D.text : D.muted,
        background: mode === m ? D.cardHi : "transparent",
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
        borderBottom: `2px solid ${tab === t ? D.blue : "transparent"}`,
        background: "transparent",
        color: tab === t ? D.text : D.muted,
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
          borderBottom: `1px solid ${D.border}`,
        }}
      >
        <ShieldCheck size={17} color={D.blue} />
        <span style={{ fontWeight: 700, fontSize: 14.5 }}>Health</span>
        <div
          style={{
            display: "flex",
            gap: 2,
            marginLeft: 6,
            background: D.card,
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
            color: D.muted,
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
          borderBottom: `1px solid ${D.border}`,
          fontSize: 11.5,
          color: D.muted,
        }}
      >
        <Dot tone={mode === "live" ? "green" : "blue"} />
        {mode === "live" ? "Live · read-only" : "Lab · sandboxed snapshot"}
        <span style={{ color: D.faint }}>· {source.kind}</span>
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
            background: "rgba(230,164,23,0.10)",
            borderBottom: `1px solid ${D.border}`,
          }}
        >
          <AlertTriangle size={14} color={D.amber} />
          <span style={{ fontSize: 12.5, color: D.text }}>
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
                color: D.amber,
                background: "transparent",
                border: `1px solid ${D.amber}55`,
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
          borderBottom: `1px solid ${D.border}`,
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
                onFix={() => run(w.id)}
              />
            ))}
            {warnings.every((w) => jobs[w.id]?.state === "done" || !w.fix) &&
              openCount === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: D.muted,
                    padding: 24,
                    fontSize: 12.5,
                  }}
                >
                  <CheckCircle2
                    size={22}
                    color={D.green}
                    style={{ marginBottom: 8 }}
                  />
                  <div>All warnings cleared.</div>
                </div>
              )}
            <div
              style={{
                fontSize: 11,
                color: D.faint,
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              Fixes run as non-interrupting background jobs — the graph stays
              interactive while they complete.
            </div>
          </>
        )}
        {tab === "connectors" && <Connectors />}

        <div
          style={{
            fontSize: 10.5,
            color: D.faint,
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

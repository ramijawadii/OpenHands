/* eslint-disable @typescript-eslint/no-explicit-any, i18next/no-literal-string, no-bitwise, no-nested-ternary -- CloudGuard shared graph chrome (navigator controller + minimap + toolbar). Cloned from the Security Graph so every graph canvas shares the exact same controller UI. */
import React from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Frame,
  Star,
  Plus,
  Minus,
  SlidersHorizontal,
} from "lucide-react";
import watermarkUrl from "./inference-defense-console.svg?url";

// Inference Defense Console wordmark — a faint watermark in the graph background
// (bottom-left, aligned with the navigator). It sits UNDER the transparent
// Cytoscape canvas so nodes/edges render above it. Shows on normal + full screen.
export function GraphWatermark() {
  return (
    <img
      src={watermarkUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{
        position: "absolute",
        bottom: 14,
        left: 14,
        width: 150,
        opacity: 0.45,
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 0,
      }}
    />
  );
}

// ── shared severity + schema primitives (data-agnostic drawer rendering) ──────
export type Severity = "Critical" | "High" | "Medium" | "Low" | "Informational";
export const SEV_ORDER: Severity[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Informational",
];
export const SEV_COLOUR: Record<Severity, string> = {
  Critical: "#e0492f",
  High: "#f0733a",
  Medium: "#d99a00",
  Low: "#3f9bd6",
  Informational: "#8a96a8",
};

export function SevChip({ sev }: { sev: Severity }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "1px 8px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        color: SEV_COLOUR[sev],
        background: `${SEV_COLOUR[sev]}22`,
        border: `1px solid ${SEV_COLOUR[sev]}66`,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: SEV_COLOUR[sev],
        }}
      />
      {sev}
    </span>
  );
}

export function GroupHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--cg-text-muted)",
        margin: "16px 0 6px",
      }}
    >
      {children}
    </div>
  );
}

export function Field({
  k,
  v,
}: {
  k: string;
  v: React.ReactNode | string | number | boolean | undefined | null;
}) {
  const absent =
    v === undefined || v === null || v === "" || v === "—" || v === false;
  let display: React.ReactNode = "—";
  if (!absent) display = v === true ? "Yes" : (v as React.ReactNode);
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "6px 0",
        fontSize: 12.5,
        borderBottom: "1px solid var(--cg-border-subtle)",
      }}
    >
      <span
        style={{ color: "var(--cg-text-muted)", minWidth: 132, flexShrink: 0 }}
      >
        {k}
      </span>
      <span
        style={{
          color: absent ? "var(--cg-text-muted)" : "var(--cg-text-primary)",
          fontStyle: absent ? "italic" : "normal",
          wordBreak: "break-word",
        }}
      >
        {display}
      </span>
    </div>
  );
}

export const DRAWER_W = 420; // wide enough for the multi-view drawers

// The graph drawers are a fixed WHITE panel independent of app theme: we pin the
// CloudGuard CSS vars to their light values on the drawer root so all descendants
// (which use var(--cg-*)) render as dark-on-white regardless of dark/light mode.
export const drawerShell = {
  position: "absolute",
  top: 0,
  right: 0,
  height: "100%",
  width: DRAWER_W,
  display: "flex",
  flexDirection: "column",
  zIndex: 41,
  boxShadow: "-6px 0 18px rgba(0,0,0,0.12)",
  colorScheme: "light",
  background: "#ffffff",
  color: "hsl(0deg,0%,7%)",
  borderLeft: "1px solid rgba(30,20,10,0.12)",
  "--cg-bg-card": "#ffffff",
  "--cg-bg-hover": "hsl(50deg,20.7%,91%)",
  "--cg-text-primary": "hsl(0deg,0%,7%)",
  "--cg-text-muted": "hsl(51deg,3.1%,43.7%)",
  "--cg-text-nav": "hsl(60deg,2.5%,23.3%)",
  "--cg-border": "rgba(30,20,10,0.12)",
  "--cg-border-card": "rgba(30,20,10,0.2)",
  "--cg-border-subtle": "rgba(30,20,10,0.07)",
  "--cg-accent": "hsl(210deg,70.9%,51.6%)",
  "--cg-accent-bg": "rgba(45,134,212,0.08)",
  "--cg-code-bg": "#1a1a19",
} as React.CSSProperties;
export const drawerHead: React.CSSProperties = {
  padding: "16px 16px 14px",
  borderBottom: "1px solid var(--cg-border)",
  fontSize: 14.5,
  fontWeight: 600,
  color: "var(--cg-text-primary)",
  display: "flex",
  alignItems: "center",
  gap: 8,
};
// scrollable sub-view tab strip (Node detail · Finding · Policy · …)
export const drawerTabStrip: React.CSSProperties = {
  display: "flex",
  gap: 2,
  padding: "10px 10px 0",
  borderBottom: "1px solid var(--cg-border)",
  overflowX: "auto",
  flexWrap: "nowrap",
};
export function drawerTab(active: boolean): React.CSSProperties {
  return {
    padding: "6px 9px 9px",
    border: "none",
    background: "transparent",
    color: active ? "var(--cg-text-primary)" : "var(--cg-text-muted)",
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    borderBottom: active
      ? "2px solid var(--cg-accent)"
      : "2px solid transparent",
    marginBottom: -1,
  };
}

// ── shared drawer view building-blocks (remediation · logs · notes · filter) ──
const seedRand = (seed: number) => {
  let s = seed & 0x7fffffff;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
};
const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const isoDaysAgo = (d: number) => {
  const dt = new Date(2026, 6, 1);
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().slice(0, 10);
};

export type RemedItem = {
  date: string;
  actor: string;
  actorType: "agent" | "human";
  action: string;
  status: "Investigation" | "In remediation" | "Resolved" | "Suppressed";
};
export function remediationFor(key: string, hasFinding: boolean): RemedItem[] {
  if (!hasFinding) return [];
  const r = seedRand(hash(key));
  const agents = ["remediation-01", "guardrail-bot", "recon-agent"];
  const people = ["j.cooper", "m.lee", "p.nair", "security-oncall"];
  const steps: [RemedItem["status"], string][] = [
    ["Investigation", "Detected and triaged the finding"],
    ["Investigation", "Correlated blast radius and reachability"],
    ["In remediation", "Proposed remediation — awaiting approval"],
    ["In remediation", "Applied guardrail / policy change"],
    ["Resolved", "Verified fix — finding no longer reachable"],
  ];
  const n = 2 + Math.floor(r() * 3);
  let day = 3 + Math.floor(r() * 20);
  return steps.slice(0, n).map(([status, action]) => {
    const isAgent = r() > 0.45;
    day -= 1 + Math.floor(r() * 5);
    return {
      date: isoDaysAgo(Math.max(0, day)),
      actor: isAgent
        ? agents[Math.floor(r() * agents.length)]
        : people[Math.floor(r() * people.length)],
      actorType: isAgent ? "agent" : "human",
      action,
      status,
    };
  });
}

export type LogItem = {
  ts: string;
  level: "info" | "warn" | "error";
  node: string;
  message: string;
};
export function logsFor(
  entries: { id: string; label: string; hasFinding: boolean }[],
): LogItem[] {
  const msgs = [
    "Authorized request",
    "Config drift detected",
    "Access from new principal",
    "Policy evaluation: allow",
    "Encryption check passed",
    "Public access blocked",
    "Credential rotation due",
    "Unusual data egress volume",
  ];
  const out: LogItem[] = [];
  entries.forEach((e) => {
    const r = seedRand(hash(e.id) ^ 0x9e3779b9);
    const count = 2 + Math.floor(r() * 3);
    for (let i = 0; i < count; i += 1) {
      const bad = e.hasFinding && r() > 0.55;
      const dd = new Date(2026, 6, 1);
      dd.setHours(dd.getHours() - Math.floor(r() * 72));
      out.push({
        ts: dd.toISOString().slice(0, 16).replace("T", " "),
        level: bad ? (r() > 0.5 ? "error" : "warn") : "info",
        node: e.label,
        message: msgs[Math.floor(r() * msgs.length)],
      });
    }
  });
  return out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

export function RemediationTimeline({ items }: { items: RemedItem[] }) {
  const sc: Record<RemedItem["status"], string> = {
    Investigation: "#3f9bd6",
    "In remediation": "#d99a00",
    Resolved: "#39b84e",
    Suppressed: "hsl(51deg,3.1%,43.7%)",
  };
  if (!items.length)
    return (
      <div
        style={{
          fontSize: 12.5,
          color: "var(--cg-text-muted)",
          fontStyle: "italic",
          marginTop: 12,
        }}
      >
        No remediation activity on this resource.
      </div>
    );
  return (
    <div style={{ marginTop: 8 }}>
      {items.map((it, i) => (
        <div
          key={i}
          style={{ display: "flex", gap: 10, padding: "9px 0", minWidth: 0 }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: sc[it.status],
                flexShrink: 0,
                marginTop: 3,
              }}
            />
            {i < items.length - 1 && (
              <span
                style={{
                  width: 2,
                  flex: 1,
                  background: "var(--cg-border)",
                  marginTop: 2,
                }}
              />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--cg-text-primary)",
                }}
              >
                {it.status}
              </span>
              <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
                · {it.date}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--cg-text-primary)",
                marginTop: 2,
              }}
            >
              {it.action}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--cg-text-muted)",
                marginTop: 2,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  padding: "0 6px",
                  borderRadius: 8,
                  fontWeight: 600,
                  color:
                    it.actorType === "agent" ? "#2d86d4" : "var(--cg-text-nav)",
                  background:
                    it.actorType === "agent"
                      ? "rgba(45,134,212,0.1)"
                      : "hsl(50deg,20.7%,91%)",
                }}
              >
                {it.actorType === "agent" ? "🤖 " : "👤 "}
                {it.actor}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LogList({ logs }: { logs: LogItem[] }) {
  const lc: Record<LogItem["level"], string> = {
    info: "hsl(51deg,3.1%,43.7%)",
    warn: "#d99a00",
    error: "#e0492f",
  };
  if (!logs.length)
    return (
      <div
        style={{
          fontSize: 12.5,
          color: "var(--cg-text-muted)",
          fontStyle: "italic",
          marginTop: 12,
        }}
      >
        No recent logs.
      </div>
    );
  return (
    <div style={{ marginTop: 8 }}>
      {logs.map((l, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 8,
            padding: "7px 0",
            borderBottom: "1px solid var(--cg-border-subtle)",
            fontSize: 11.5,
            fontFamily:
              "'IBM Plex Mono', source-code-pro, Menlo, Consolas, monospace",
          }}
        >
          <span style={{ color: "var(--cg-text-muted)", flexShrink: 0 }}>
            {l.ts}
          </span>
          <span
            style={{
              color: lc[l.level],
              fontWeight: 700,
              textTransform: "uppercase",
              flexShrink: 0,
              width: 38,
            }}
          >
            {l.level}
          </span>
          <span style={{ color: "var(--cg-text-primary)", minWidth: 0 }}>
            <b style={{ color: "var(--cg-text-nav)" }}>{l.node}</b> {l.message}
          </span>
        </div>
      ))}
    </div>
  );
}

export type Note = { ts: number; author: string; text: string };
// module-level notes store keyed by node/issue id — survives drawer re-open.
const NOTES: Record<string, Note[]> = {};
export function useNotes(id: string): {
  notes: Note[];
  add: (text: string) => void;
} {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  return {
    notes: NOTES[id] || [],
    add: (text: string) => {
      (NOTES[id] ||= []).push({ ts: Date.now(), author: "operator", text });
      force();
    },
  };
}
export function NotesPanel({
  notes,
  onAdd,
  placeholder,
}: {
  notes: Note[];
  onAdd: (text: string) => void;
  placeholder: string;
}) {
  const [text, setText] = React.useState("");
  return (
    <div style={{ marginTop: 8 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          minHeight: 70,
          resize: "vertical",
          background: "#fff",
          border: "1px solid var(--cg-border-card)",
          borderRadius: 8,
          color: "var(--cg-text-primary)",
          fontSize: 12.5,
          padding: 10,
          fontFamily: "inherit",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <button
        type="button"
        disabled={!text.trim()}
        onClick={() => {
          onAdd(text.trim());
          setText("");
        }}
        style={{
          marginTop: 8,
          height: 32,
          padding: "0 14px",
          borderRadius: 7,
          border: "none",
          background: text.trim()
            ? "var(--cg-accent)"
            : "var(--cg-border-card)",
          color: text.trim() ? "#fff" : "var(--cg-text-muted)",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: text.trim() ? "pointer" : "default",
        }}
      >
        Add note
      </button>
      <div style={{ marginTop: 14 }}>
        {notes.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--cg-text-muted)",
              fontStyle: "italic",
            }}
          >
            No notes yet.
          </div>
        ) : (
          notes
            .slice()
            .sort((a, b) => b.ts - a.ts)
            .map((n, i) => (
              <div
                key={i}
                style={{
                  padding: "9px 0",
                  borderBottom: "1px solid var(--cg-border-subtle)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
                  {n.author} · {new Date(n.ts).toISOString().slice(0, 10)}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--cg-text-primary)",
                    marginTop: 2,
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {n.text}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ── multi-select filter dropdown (status / severity / category / …) ───────────
export function MultiFilter({
  groups,
  selected,
  onToggle,
  onClear,
}: {
  groups: { key: string; label: string; options: string[] }[];
  selected: Set<string>;
  onToggle: (k: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const count = selected.size;
  return (
    <div style={{ position: "relative", padding: "8px 14px 4px" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 28,
          padding: "0 10px",
          borderRadius: 7,
          border: "1px solid var(--cg-border-card)",
          background: count ? "var(--cg-accent-bg)" : "#fff",
          color: "var(--cg-text-primary)",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        <SlidersHorizontal size={13} /> Filter
        {count > 0 && (
          <span
            style={{
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: "var(--cg-accent)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
            }}
          >
            {count}
          </span>
        )}
      </button>
      {count > 0 && (
        <button
          type="button"
          onClick={onClear}
          style={{
            marginLeft: 8,
            background: "transparent",
            border: "none",
            color: "var(--cg-text-muted)",
            fontSize: 11.5,
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      )}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            style={{ position: "fixed", inset: 0, zIndex: 60 }}
          />
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 14,
              zIndex: 61,
              width: 260,
              maxHeight: 340,
              overflowY: "auto",
              background: "#fff",
              border: "1px solid var(--cg-border-card)",
              borderRadius: 10,
              padding: 8,
              boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
            }}
          >
            {groups.map((g) => (
              <div key={g.key} style={{ marginBottom: 6 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--cg-text-muted)",
                    padding: "4px 6px",
                  }}
                >
                  {g.label}
                </div>
                {g.options.map((o) => {
                  const k = `${g.key}:${o}`;
                  const on = selected.has(k);
                  return (
                    <label
                      key={o}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "5px 6px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12.5,
                        color: "var(--cg-text-primary)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => onToggle(k)}
                        style={{ accentColor: "var(--cg-accent)" }}
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// zoom (model) ↔ slider-percent on a log scale
export const MINZ = 0.06;
export const MAXZ = 2.5;
export const zoomToPct = (z: number) =>
  Math.round(
    ((Math.log(z) - Math.log(MINZ)) / (Math.log(MAXZ) - Math.log(MINZ))) * 100,
  );
export const pctToZoom = (p: number) =>
  Math.exp(Math.log(MINZ) + (p / 100) * (Math.log(MAXZ) - Math.log(MINZ)));

// fixed-light chrome palette — the graph chrome is always white on the white
// canvas regardless of the app theme. Values are pinned to the app's LIGHT-mode
// CSS-token values so it looks identical to white mode.
export const CHROME = {
  bg: "#ffffff",
  border: "rgba(30,20,10,0.2)", // --cg-border-card (light)
  text: "hsl(0deg,0%,7%)", // --cg-text-primary (light)
  muted: "hsl(51deg,3.1%,43.7%)", // --cg-text-muted (light)
  hover: "hsl(50deg,20.7%,91%)", // --cg-bg-hover (light)
  accent: "hsl(210deg,70.9%,51.6%)", // --cg-accent (light)
  accentBg: "rgba(45,134,212,0.08)", // --cg-accent-bg (light)
};

// toolbar button — always white (fixed light), compact, sits top-left of canvas
export function graphToolBtn(disabled = false): React.CSSProperties {
  return {
    height: 28,
    padding: "0 9px",
    borderRadius: 7,
    border: `1px solid ${CHROME.border}`,
    background: CHROME.bg,
    color: disabled ? CHROME.muted : CHROME.text,
    fontSize: 11.5,
    cursor: disabled ? "default" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    whiteSpace: "nowrap",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    opacity: disabled ? 0.6 : 1,
  };
}

// ── navigator controller (directional pad + fit + minimap toggle + zoom slider) ──
export function GraphNavigator({
  onPan,
  onZoomIn,
  onZoomOut,
  onFit,
  zoomPct,
  onZoomPct,
  showMini,
  onToggleMini,
  markedCount,
  onOpenMarked,
  extra,
  showZoom = true,
}: {
  onPan: (dx: number, dy: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  zoomPct: number;
  onZoomPct: (p: number) => void;
  showMini: boolean;
  onToggleMini: () => void;
  markedCount?: number;
  onOpenMarked?: () => void;
  extra?: React.ReactNode;
  showZoom?: boolean;
}) {
  const STEP = 70;
  const ring = "rgb(23,23,22)";
  const padBtn: React.CSSProperties = {
    position: "absolute",
    width: 20,
    height: 20,
    border: "none",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };
  const sqBtn = (active = false): React.CSSProperties => ({
    width: 34,
    height: 34,
    borderRadius: 9,
    border: "none",
    background: active ? "rgba(255,255,255,0.18)" : ring,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 14,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 9,
        zIndex: 11,
      }}
    >
      {/* directional pad */}
      <div
        style={{
          position: "relative",
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: ring,
          boxShadow: "0 3px 10px rgba(0,0,0,0.28)",
        }}
      >
        <button
          type="button"
          aria-label="Pan up"
          style={{ ...padBtn, top: 3, left: 22 }}
          onClick={() => onPan(0, STEP)}
        >
          <ChevronUp size={15} />
        </button>
        <button
          type="button"
          aria-label="Pan down"
          style={{ ...padBtn, bottom: 3, left: 22 }}
          onClick={() => onPan(0, -STEP)}
        >
          <ChevronDown size={15} />
        </button>
        <button
          type="button"
          aria-label="Pan left"
          style={{ ...padBtn, left: 3, top: 22 }}
          onClick={() => onPan(STEP, 0)}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          aria-label="Pan right"
          style={{ ...padBtn, right: 3, top: 22 }}
          onClick={() => onPan(-STEP, 0)}
        >
          <ChevronRight size={15} />
        </button>
        <button
          type="button"
          aria-label="Fit to screen"
          onClick={onFit}
          style={{
            position: "absolute",
            left: 20,
            top: 20,
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "none",
            background: "#fff",
            color: ring,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Crosshair size={13} />
        </button>
      </div>

      {/* minimap toggle */}
      <button
        type="button"
        aria-label="Toggle minimap"
        onClick={onToggleMini}
        style={sqBtn(showMini)}
      >
        <Frame size={15} />
      </button>

      {/* extra controls (per-graph, e.g. replay / magnifier) */}
      {extra}

      {/* marked-resources list (optional) */}
      {onOpenMarked && (
        <button
          type="button"
          aria-label="Marked resources"
          onClick={onOpenMarked}
          style={{ ...sqBtn(false), position: "relative" }}
        >
          <Star size={15} color="#f5b301" fill="#f5b301" />
          {(markedCount ?? 0) > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 15,
                height: 15,
                borderRadius: 8,
                background: "#f5b301",
                color: "#3a2a00",
                fontSize: 10,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
              }}
            >
              {markedCount}
            </span>
          )}
        </button>
      )}

      {/* zoom slider */}
      {showZoom && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            background: ring,
            borderRadius: 18,
            padding: "10px 6px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.28)",
          }}
        >
          <button
            type="button"
            aria-label="Zoom in"
            onClick={onZoomIn}
            style={{
              border: "none",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <Plus size={15} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={zoomPct}
            onChange={(e) => onZoomPct(Number(e.target.value))}
            aria-label="Zoom"
            style={{
              writingMode: "vertical-lr" as any,
              direction: "rtl",
              width: 6,
              height: 96,
              accentColor: "#fff",
              cursor: "pointer",
            }}
          />
          <button
            type="button"
            aria-label="Zoom out"
            onClick={onZoomOut}
            style={{
              border: "none",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <Minus size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── frame viewer (minimap) ────────────────────────────────────────────────────
const MINI_DOT: Record<string, string> = {
  error: "#e0492f",
  warning: "#d99a00",
};
const MW = 168;
const MH = 108;

type Dot = { x: number; y: number; a: string };
type MiniFrame = {
  bb: { x: number; y: number; w: number; h: number };
  view: { x: number; y: number; w: number; h: number };
};

const MiniDots = React.memo(
  ({ dots, bb }: { dots: Dot[]; bb: MiniFrame["bb"] }) => {
    const s = Math.min(
      (MW - 20) / Math.max(bb.w, 1),
      (MH - 20) / Math.max(bb.h, 1),
    );
    const ox = (MW - bb.w * s) / 2;
    const oy = (MH - bb.h * s) / 2;
    return (
      <>
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={ox + (d.x - bb.x) * s}
            cy={oy + (d.y - bb.y) * s}
            r={d.a ? 2.6 : 1.9}
            fill={MINI_DOT[d.a] || "#aab6c4"}
          />
        ))}
      </>
    );
  },
);
MiniDots.displayName = "MiniDots";

export function GraphMinimap({
  frame,
  dots,
  onJump,
  rightOffset = 12,
}: {
  frame: MiniFrame;
  dots: Dot[];
  onJump: (gx: number, gy: number) => void;
  rightOffset?: number;
}) {
  const { bb, view } = frame;
  const s = Math.min(
    (MW - 20) / Math.max(bb.w, 1),
    (MH - 20) / Math.max(bb.h, 1),
  );
  const ox = (MW - bb.w * s) / 2;
  const oy = (MH - bb.h * s) / 2;
  const mx = (x: number) => ox + (x - bb.x) * s;
  const my = (y: number) => oy + (y - bb.y) * s;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  const vx = clamp(mx(view.x), 1, MW - 1);
  const vy = clamp(my(view.y), 1, MH - 1);
  const vw = clamp(view.w * s, 3, MW - vx - 1);
  const vh = clamp(view.h * s, 3, MH - vy - 1);
  return (
    <svg
      width={MW}
      height={MH}
      onClick={(e) => {
        const r = (e.target as SVGElement)
          .closest("svg")!
          .getBoundingClientRect();
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        onJump((px - ox) / s + bb.x, (py - oy) / s + bb.y);
      }}
      style={{
        position: "absolute",
        right: rightOffset,
        bottom: 12,
        transition: "right .28s ease",
        zIndex: 9,
        background: "#27313a",
        border: "1px solid #5b9bf0",
        borderRadius: 6,
        boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
        cursor: "pointer",
      }}
    >
      <MiniDots dots={dots} bb={bb} />
      <rect
        x={vx}
        y={vy}
        width={vw}
        height={vh}
        rx={2}
        fill="rgba(91,155,240,0.16)"
        stroke="#5b9bf0"
        strokeWidth={1.3}
      />
    </svg>
  );
}

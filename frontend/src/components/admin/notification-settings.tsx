/* eslint-disable i18next/no-literal-string -- CloudGuard notification settings panel */
import React from "react";
import { T, Toggle } from "./admin-kit";

// Concrete, per-category notification controls — shared by the bell drawer and the
// personal-profile Notifications tab so they always match.
const SETTINGS_SECTIONS: {
  cat: string;
  rows: { k: string; desc: string; on: boolean }[];
  select?: { k: string; options: string[]; value: string };
}[] = [
  {
    cat: "AI Agent Actions",
    rows: [
      {
        k: "Autonomous action alerts",
        desc: "Every action a security agent proposes or executes",
        on: true,
      },
      {
        k: "Require approval (HITL) for high-risk actions",
        desc: "Gate destructive remediations behind a human Approve / Deny",
        on: true,
      },
      {
        k: "Agent telemetry & detections",
        desc: "Threat detections and scan results from agents",
        on: false,
      },
    ],
    select: {
      k: "Auto-escalate unanswered approvals after",
      options: ["15 minutes", "1 hour", "4 hours", "Never"],
      value: "1 hour",
    },
  },
  {
    cat: "Team Activity",
    rows: [
      {
        k: "Mentions & assignments",
        desc: "When a teammate @mentions or assigns you",
        on: true,
      },
      {
        k: "Override & exception requests",
        desc: "Policy override / waiver requests needing review",
        on: true,
      },
      {
        k: "Incident hand-offs",
        desc: "Incidents reassigned to you or your team",
        on: true,
      },
    ],
  },
  {
    cat: "Platform & Posture",
    rows: [
      {
        k: "Scan & benchmark summaries",
        desc: "CIS / posture scan completion digests",
        on: true,
      },
      {
        k: "Connector & credential expiry",
        desc: "Expiring connector tokens, keys and certificates",
        on: true,
      },
      {
        k: "Maintenance & releases",
        desc: "Platform maintenance windows and new features",
        on: false,
      },
    ],
  },
];
const DELIVERY = ["In-app", "Email", "Slack"];
const SUBS = ["AI Agent", "Team", "Platform", "Delivery"];

export function NotificationSettingsPanel() {
  const [sub, setSub] = React.useState(0);
  const [vals, setVals] = React.useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {};
    SETTINGS_SECTIONS.forEach((s) =>
      s.rows.forEach((r) => {
        v[r.k] = r.on;
      }),
    );
    DELIVERY.forEach((d) => {
      v[`ch:${d}`] = d !== "Slack";
    });
    v["Critical alerts bypass quiet hours"] = true;
    return v;
  });
  const flip = (k: string) => setVals((p) => ({ ...p, [k]: !p[k] }));

  const chip = (active: boolean): React.CSSProperties => ({
    height: 28,
    padding: "0 12px",
    borderRadius: 7,
    fontSize: 12.5,
    fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? T.accent : T.border}`,
    background: active ? "var(--cg-accent-bg)" : "transparent",
    color: active ? T.textPrimary : T.textNav,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });
  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "11px 0",
    borderBottom: `1px solid ${T.border}`,
  };
  const rowTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: T.textPrimary,
  };
  const rowDesc: React.CSSProperties = {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  };

  return (
    <div>
      <div
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}
      >
        {SUBS.map((lbl, i) => (
          <button
            key={lbl}
            type="button"
            onClick={() => setSub(i)}
            style={chip(sub === i)}
          >
            {lbl}
          </button>
        ))}
      </div>

      {sub <= 2 ? (
        (() => {
          const s = SETTINGS_SECTIONS[sub];
          return (
            <div>
              {s.rows.map((r) => (
                <div key={r.k} style={row}>
                  <div style={{ minWidth: 0 }}>
                    <div style={rowTitle}>{r.k}</div>
                    <div style={rowDesc}>{r.desc}</div>
                  </div>
                  <Toggle on={!!vals[r.k]} onChange={() => flip(r.k)} />
                </div>
              ))}
              {s.select && (
                <div style={{ ...row, borderBottom: "none" }}>
                  <div style={rowTitle}>{s.select.k}</div>
                  <select
                    defaultValue={s.select.value}
                    style={{
                      height: 30,
                      borderRadius: 6,
                      border: `1px solid ${T.border}`,
                      background: "var(--cg-input-bg, var(--cg-bg-card))",
                      color: T.textPrimary,
                      fontSize: 12.5,
                      padding: "0 8px",
                    }}
                  >
                    {s.select.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <div>
          {DELIVERY.map((d) => (
            <div key={d} style={row}>
              <div style={rowTitle}>{d}</div>
              <Toggle on={!!vals[`ch:${d}`]} onChange={() => flip(`ch:${d}`)} />
            </div>
          ))}
          <div style={{ ...row, borderBottom: "none" }}>
            <div style={{ minWidth: 0 }}>
              <div style={rowTitle}>Critical alerts bypass quiet hours</div>
              <div style={rowDesc}>
                Page on criticals (e.g. HITL approvals) even when muted
              </div>
            </div>
            <Toggle
              on={!!vals["Critical alerts bypass quiet hours"]}
              onChange={() => flip("Critical alerts bypass quiet hours")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import { SettingsSaveBar } from "#/components/features/settings/settings-save-bar";
import {
  ScopeBadge,
  Toggle,
  RelatedLinks,
} from "#/components/features/settings/settings-kit";

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
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

const CHANNELS = ["In-app", "Email", "Slack", "PagerDuty"] as const;
type Channel = (typeof CHANNELS)[number];

interface Rule {
  event: string;
  severity: string;
  channels: Channel[];
  recipients: string;
}

const INITIAL: Rule[] = [
  {
    event: "finding.critical",
    severity: "Critical",
    channels: ["In-app", "Email", "Slack", "PagerDuty"],
    recipients: "Security Engineers + On-call",
  },
  {
    event: "finding.high",
    severity: "High",
    channels: ["In-app", "Slack"],
    recipients: "Security Engineers",
  },
  {
    event: "scan.completed",
    severity: "Info",
    channels: ["In-app"],
    recipients: "Scan owner",
  },
  {
    event: "scan.failed",
    severity: "Warning",
    channels: ["In-app", "Email"],
    recipients: "Scan owner + Admins",
  },
  {
    event: "drift.detected",
    severity: "High",
    channels: ["In-app", "Slack"],
    recipients: "Workspace members",
  },
  {
    event: "coverage.dropped",
    severity: "Warning",
    channels: ["In-app", "Email"],
    recipients: "Admins",
  },
  {
    event: "member.added",
    severity: "Info",
    channels: ["Email"],
    recipients: "Admins",
  },
  {
    event: "billing.invoice",
    severity: "Info",
    channels: ["Email"],
    recipients: "Billing contact",
  },
];

const RECIPIENT_OPTIONS = [
  "Admins",
  "Security Engineers",
  "Security Engineers + On-call",
  "Workspace members",
  "Scan owner",
  "Scan owner + Admins",
  "Billing contact",
];
const sevColor = (s: string) =>
  s === "Critical"
    ? S.danger
    : s === "High"
      ? S.warning
      : s === "Warning"
        ? S.warning
        : S.textMuted;

const selectStyle: React.CSSProperties = {
  height: 28,
  padding: "0 22px 0 8px",
  background: S.inputBg,
  border: `1px solid ${S.border}`,
  borderRadius: 6,
  color: S.textPrimary,
  fontSize: 12,
  outline: "none",
  appearance: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};
const optBg = { background: "var(--cg-bg-card)" } as const;

function Cell({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 22,
        height: 22,
        borderRadius: 5,
        cursor: "pointer",
        border: `1px solid ${on ? S.accent : S.borderStrong}`,
        background: on ? S.accent : "transparent",
        color: "#fff",
        fontSize: 12,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
      }}
    >
      {on ? "✓" : ""}
    </button>
  );
}
function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: S.textPrimary,
        margin: "0 0 14px",
      }}
    >
      {children}
    </h2>
  );
}

export default function NotificationsSettings() {
  const [rules, setRules] = React.useState<Rule[]>(INITIAL);
  const [digest, setDigest] = React.useState(true);
  const [digestDay, setDigestDay] = React.useState("Monday");
  const [escalate, setEscalate] = React.useState(true);
  const [escMins, setEscMins] = React.useState("30");
  const [quiet, setQuiet] = React.useState(false);

  const toggleCh = (ev: string, ch: Channel) =>
    setRules((p) =>
      p.map((r) =>
        r.event === ev
          ? {
              ...r,
              channels: r.channels.includes(ch)
                ? r.channels.filter((c) => c !== ch)
                : [...r.channels, ch],
            }
          : r,
      ),
    );
  const setRecipients = (ev: string, v: string) =>
    setRules((p) =>
      p.map((r) => (r.event === ev ? { ...r, recipients: v } : r)),
    );

  const GRID = "1.5fr 80px repeat(4, 56px) 1.4fr";

  return (
    <div style={{ padding: "40px 48px", maxWidth: 1000 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: S.textPrimary,
            margin: 0,
          }}
        >
          Notifications
        </h1>
        <ScopeBadge scope="Organization" />
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 28,
          marginTop: 0,
        }}
      >
        Org-wide routing: which events go to which channels, and who receives
        them. Channels (Slack / PagerDuty) are configured under{" "}
        <a
          href="/settings/integrations"
          style={{ color: S.accent, textDecoration: "none" }}
        >
          Integrations
        </a>
        .
      </p>

      <div style={{ marginBottom: 24 }}>
        <RelatedLinks
          label="Routes events from"
          items={[
            ["Incidents", "/agent-control-plane/incidents"],
            ["Monitoring · Alerts", "/agent-control-plane/monitoring"],
          ]}
        />
      </div>

      <H2>Event routing</H2>
      <div
        style={{
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${S.border}`,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID,
            padding: "8px 16px",
            borderBottom: `1px solid ${S.border}`,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: S.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Event
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: S.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Severity
          </span>
          {CHANNELS.map((c) => (
            <span
              key={c}
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: S.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                textAlign: "center",
              }}
            >
              {c}
            </span>
          ))}
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: S.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Recipients
          </span>
        </div>
        {rules.map((r, i) => (
          <div
            key={r.event}
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              padding: "9px 16px",
              borderBottom:
                i < rules.length - 1
                  ? "1px solid var(--cg-border-subtle)"
                  : "none",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 12.5,
                color: S.textSecondary,
                fontFamily: "monospace",
              }}
            >
              {r.event}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: sevColor(r.severity),
              }}
            >
              {r.severity}
            </span>
            {CHANNELS.map((c) => (
              <Cell
                key={c}
                on={r.channels.includes(c)}
                onClick={() => toggleCh(r.event, c)}
              />
            ))}
            <select
              value={r.recipients}
              onChange={(e) => setRecipients(r.event, e.target.value)}
              style={selectStyle}
            >
              {[...new Set([r.recipients, ...RECIPIENT_OPTIONS])].map((o) => (
                <option key={o} value={o} style={optBg}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <H2>Digest</H2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: S.textSecondary }}>
                Weekly digest
              </div>
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                Posture changes + new risks summary.
              </div>
            </div>
            <Toggle on={digest} onChange={setDigest} label="Weekly digest" />
          </div>
          {digest && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              <span style={{ fontSize: 12.5, color: S.textMuted }}>
                Sent every
              </span>
              <select
                value={digestDay}
                onChange={(e) => setDigestDay(e.target.value)}
                style={selectStyle}
              >
                {["Monday", "Friday", "Daily"].map((d) => (
                  <option key={d} value={d} style={optBg}>
                    {d}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 12.5, color: S.textMuted }}>
                at 09:00 to Admins
              </span>
            </div>
          )}
        </div>
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <H2>Escalation & quiet hours</H2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: S.textSecondary }}>
                Escalate unacked criticals
              </div>
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                Page on-call if not acknowledged.
              </div>
            </div>
            <Toggle on={escalate} onChange={setEscalate} label="Escalate" />
          </div>
          {escalate && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 12.5, color: S.textMuted }}>After</span>
              <select
                value={escMins}
                onChange={(e) => setEscMins(e.target.value)}
                style={selectStyle}
              >
                {["15", "30", "60"].map((m) => (
                  <option key={m} value={m} style={optBg}>
                    {m} min
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 12.5, color: S.textMuted }}>
                → PagerDuty on-call
              </span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
              borderTop: "1px solid var(--cg-border-subtle)",
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: S.textSecondary }}>
                Quiet hours (non-critical)
              </div>
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                Hold info/warnings 20:00–08:00.
              </div>
            </div>
            <Toggle on={quiet} onChange={setQuiet} label="Quiet hours" />
          </div>
        </div>
      </div>

      <SettingsSaveBar
        tab="notifications"
        doc={{ rules, digest, digestDay, escalate, escMins, quiet }}
        onLoad={(d) => {
          if (Array.isArray(d.rules)) setRules(d.rules as Rule[]);
          if (typeof d.digest === "boolean") setDigest(d.digest);
          if (typeof d.digestDay === "string") setDigestDay(d.digestDay);
          if (typeof d.escalate === "boolean") setEscalate(d.escalate);
          if (typeof d.escMins === "string") setEscMins(d.escMins);
          if (typeof d.quiet === "boolean") setQuiet(d.quiet);
        }}
      />
    </div>
  );
}

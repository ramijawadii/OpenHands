/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix, jsx-a11y/anchor-is-valid -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import { ScopeBadge } from "#/components/features/settings/settings-kit";

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
  purple: "var(--cg-accent-purple)",
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

const SLA = [
  { sev: "Critical (P1)", target: "1 hour", color: S.danger },
  { sev: "High (P2)", target: "4 hours", color: S.warning },
  { sev: "Normal (P3)", target: "1 business day", color: S.accent },
  { sev: "Low (P4)", target: "3 business days", color: S.textMuted },
];
const RESOURCES = [
  { name: "Documentation", desc: "Guides, runbooks, how-tos", href: "#" },
  { name: "API reference", desc: "REST + webhook schemas", href: "#" },
  { name: "Status page", desc: "Live uptime & incidents", href: "#" },
  { name: "Changelog", desc: "What shipped recently", href: "#" },
];
const INITIAL_TICKETS = [
  {
    id: "CG-4821",
    subject: "False positive on S3 public-access check",
    sev: "Normal (P3)",
    status: "Open",
    updated: "2h ago",
  },
  {
    id: "CG-4790",
    subject: "SCIM deprovisioning lag for Okta",
    sev: "High (P2)",
    status: "In progress",
    updated: "1d ago",
  },
  {
    id: "CG-4733",
    subject: "Request: add GCP Org policy connector",
    sev: "Low (P4)",
    status: "Resolved",
    updated: "6d ago",
  },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  background: S.inputBg,
  border: `1px solid ${S.border}`,
  borderRadius: 6,
  color: S.textPrimary,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none" as const,
  cursor: "pointer",
};
const optBg = { background: "var(--cg-bg-card)" } as const;

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

export default function SupportSettings() {
  const [tickets, setTickets] = React.useState(INITIAL_TICKETS);
  const [subject, setSubject] = React.useState("");
  const [sev, setSev] = React.useState("Normal (P3)");
  const [desc, setDesc] = React.useState("");
  const submit = () => {
    if (!subject.trim()) return;
    const id = `CG-${4800 + Math.floor(Math.random() * 200)}`;
    setTickets((p) => [
      { id, subject: subject.trim(), sev, status: "Open", updated: "just now" },
      ...p,
    ]);
    setSubject("");
    setDesc("");
    setSev("Normal (P3)");
  };
  const stColor = (s: string) =>
    s === "Resolved" ? S.success : s === "In progress" ? S.warning : S.accent;

  return (
    <div style={{ padding: "40px 48px", maxWidth: 900 }}>
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
          Support
        </h1>
        <ScopeBadge scope="Organization" />
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 24,
          marginTop: 0,
        }}
      >
        Your support plan, open tickets, and resources.
      </p>

      {/* All systems banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderRadius: 8,
          background: "rgba(76,175,125,0.10)",
          border: `1px solid ${S.border}`,
          marginBottom: 20,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: S.success,
          }}
        />
        <span style={{ fontSize: 13, color: S.textSecondary }}>
          All systems operational
        </span>
        <a
          href="#"
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: S.accent,
            textDecoration: "none",
          }}
        >
          Status page ↗
        </a>
      </div>

      {/* Plan + SLA */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: S.cardBg,
            border: `1px solid ${S.border}`,
            borderRadius: 10,
            padding: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <H2>Support plan</H2>
            <span
              style={{
                height: 22,
                padding: "0 10px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 600,
                color: S.purple,
                background: "rgba(155,135,245,0.15)",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Premium 24/7
            </span>
          </div>
          {SLA.map((s) => (
            <div
              key={s.sev}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "7px 0",
                borderBottom: "1px solid var(--cg-border-subtle)",
              }}
            >
              <span style={{ fontSize: 12.5, color: s.color }}>{s.sev}</span>
              <span style={{ fontSize: 12.5, color: S.textSecondary }}>
                {s.target}
              </span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 14,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: S.accent,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              AC
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: S.textSecondary }}>
                Alex Chen — Customer Success
              </div>
              <div style={{ fontSize: 11.5, color: S.textMuted }}>
                alex.chen@cloudguard.io
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: S.cardBg,
            border: `1px solid ${S.border}`,
            borderRadius: 10,
            padding: 18,
          }}
        >
          <H2>Open a ticket</H2>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <select
            value={sev}
            onChange={(e) => setSev(e.target.value)}
            style={{ ...selectStyle, marginBottom: 10 }}
          >
            {SLA.map((s) => (
              <option key={s.sev} value={s.sev} style={optBg}>
                {s.sev}
              </option>
            ))}
          </select>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Describe the issue…"
            style={{
              ...inputStyle,
              height: 70,
              padding: "8px 10px",
              resize: "vertical",
              lineHeight: 1.5,
              marginBottom: 10,
            }}
          />
          <button
            type="button"
            onClick={submit}
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 6,
              background: S.accent,
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Submit ticket
          </button>
        </div>
      </div>

      {/* Tickets */}
      <div style={{ marginBottom: 24 }}>
        <H2>Your tickets</H2>
        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: `1px solid ${S.border}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr 130px 110px 90px",
              padding: "8px 16px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {["ID", "Subject", "Severity", "Status", "Updated"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: S.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {h}
              </span>
            ))}
          </div>
          {tickets.map((t, i) => (
            <div
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 130px 110px 90px",
                padding: "10px 16px",
                borderBottom:
                  i < tickets.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  color: S.accent,
                  fontFamily: "monospace",
                }}
              >
                {t.id}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: S.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.subject}
              </span>
              <span style={{ fontSize: 12, color: S.textMuted }}>{t.sev}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: stColor(t.status),
                }}
              >
                {t.status}
              </span>
              <span style={{ fontSize: 12, color: S.textMuted }}>
                {t.updated}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div>
        <H2>Resources</H2>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          {RESOURCES.map((r) => (
            <a
              key={r.name}
              href={r.href}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: S.cardBg,
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                padding: "12px 16px",
                textDecoration: "none",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: S.textSecondary,
                    fontWeight: 500,
                  }}
                >
                  {r.name}
                </div>
                <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                  {r.desc}
                </div>
              </div>
              <span style={{ color: S.textMuted, fontSize: 14 }}>↗</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

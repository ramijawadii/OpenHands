/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import { Bell } from "lucide-react";
import {
  ConfirmButton,
  EmptyState,
  ScopeBadge,
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

const ALL_EVENTS = [
  "scan.completed",
  "scan.failed",
  "finding.created",
  "finding.critical",
  "drift.detected",
  "remediation.applied",
  "coverage.dropped",
];

interface Hook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  status: "active" | "failing" | "disabled";
  lastDelivery: string;
}

interface Delivery {
  time: string;
  event: string;
  url: string;
  code: number;
  attempts: number;
}

const INITIAL: Hook[] = [
  {
    id: "1",
    url: "https://siem.sentinel-org.io/ingest/cloudguard",
    events: ["finding.critical", "scan.completed", "drift.detected"],
    secret: "whsec_4f2a…9b1c",
    status: "active",
    lastDelivery: "2 min ago",
  },
  {
    id: "2",
    url: "https://hooks.slack.com/services/T0/B0/xx",
    events: ["finding.critical", "coverage.dropped"],
    secret: "whsec_77de…0a4f",
    status: "active",
    lastDelivery: "18 min ago",
  },
  {
    id: "3",
    url: "https://events.pagerduty.com/v2/enqueue",
    events: ["scan.failed", "finding.critical"],
    secret: "whsec_2c8b…d3e1",
    status: "failing",
    lastDelivery: "1 h ago (HTTP 503)",
  },
];

const DELIVERIES: Delivery[] = [
  {
    time: "12:04:11",
    event: "finding.critical",
    url: "siem.sentinel-org.io",
    code: 200,
    attempts: 1,
  },
  {
    time: "11:46:02",
    event: "finding.critical",
    url: "hooks.slack.com",
    code: 200,
    attempts: 1,
  },
  {
    time: "11:31:55",
    event: "scan.failed",
    url: "events.pagerduty.com",
    code: 503,
    attempts: 3,
  },
  {
    time: "10:58:20",
    event: "scan.completed",
    url: "siem.sentinel-org.io",
    code: 200,
    attempts: 1,
  },
  {
    time: "09:12:47",
    event: "drift.detected",
    url: "siem.sentinel-org.io",
    code: 200,
    attempts: 1,
  },
];

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

function StatusBadge({ status }: { status: Hook["status"] }) {
  const map = {
    active: [S.success, "rgba(76,175,125,0.15)", "Active"],
    failing: [S.danger, "rgba(224,82,82,0.15)", "Failing"],
    disabled: [S.textMuted, S.badgeBg, "Disabled"],
  } as const;
  const [color, bg, text] = map[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 8px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 500,
        color,
        background: bg,
      }}
    >
      {text}
    </span>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 500,
          maxWidth: "92vw",
          maxHeight: "88vh",
          overflowY: "auto",
          background: S.cardBg,
          border: `1px solid ${S.borderStrong}`,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: S.textPrimary,
            margin: 0,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            style={{
              fontSize: 13,
              color: S.textMuted,
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            {subtitle}
          </p>
        )}
        <div style={{ marginTop: 18 }}>{children}</div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 36,
              padding: "0 16px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${S.borderStrong}`,
              color: S.textSecondary,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          {footer}
        </div>
      </div>
    </div>
  );
}

export default function WebhooksSettings() {
  const [hooks, setHooks] = React.useState<Hook[]>(INITIAL);
  const [modal, setModal] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [events, setEvents] = React.useState<string[]>(["finding.critical"]);
  const [toast, setToast] = React.useState("");

  const toggleEvent = (e: string) =>
    setEvents((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]));
  const create = () => {
    if (!url.trim() || events.length === 0) return;
    setHooks((p) => [
      ...p,
      {
        id: String(Date.now()),
        url: url.trim(),
        events,
        secret: `whsec_${Math.random().toString(16).slice(2, 6)}…${Math.random().toString(16).slice(2, 6)}`,
        status: "active",
        lastDelivery: "never",
      },
    ]);
    setUrl("");
    setEvents(["finding.critical"]);
    setModal(false);
  };
  const remove = (id: string) => setHooks((p) => p.filter((h) => h.id !== id));
  const toggle = (id: string) =>
    setHooks((p) =>
      p.map((h) =>
        h.id === id
          ? { ...h, status: h.status === "disabled" ? "active" : "disabled" }
          : h,
      ),
    );
  const test = (h: Hook) => {
    const host = h.url.replace(/^https?:\/\//, "").slice(0, 36);
    const code = h.status === "failing" ? "503 Service Unavailable" : "200 OK";
    setToast(`Test POST → ${host} · ${code}`);
    setTimeout(() => setToast(""), 3200);
  };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 880 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 400,
              color: S.textPrimary,
              margin: 0,
            }}
          >
            Webhooks
          </h1>
          <ScopeBadge scope="Organization" />
        </div>
        <button
          type="button"
          onClick={() => setModal(true)}
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
          + Add endpoint
        </button>
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 28,
          marginTop: 0,
        }}
      >
        Push security events to your SIEM, SOAR, Slack or PagerDuty. Every
        delivery is signed (HMAC-SHA256) with the endpoint secret; verify it
        before trusting the payload.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 36,
        }}
      >
        {hooks.map((h) => (
          <div
            key={h.id}
            style={{
              background: S.cardBg,
              border: `1px solid ${S.border}`,
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: S.textPrimary,
                      fontFamily: "monospace",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h.url}
                  </span>
                  <StatusBadge status={h.status} />
                </div>
                <div style={{ fontSize: 12, color: S.textMuted }}>
                  Secret{" "}
                  <code style={{ color: S.textSecondary }}>{h.secret}</code> ·
                  last delivery {h.lastDelivery}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => test(h)}
                  style={{
                    background: "none",
                    border: "none",
                    color: S.accent,
                    fontSize: 12,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Send test
                </button>
                <button
                  type="button"
                  onClick={() => toggle(h.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: S.textMuted,
                    fontSize: 12,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {h.status === "disabled" ? "Enable" : "Disable"}
                </button>
                <ConfirmButton
                  variant="link"
                  label="Delete"
                  title="Delete this webhook endpoint?"
                  body="Events will stop being delivered to this URL. This cannot be undone."
                  confirmLabel="Delete endpoint"
                  onConfirm={() => remove(h.id)}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {h.events.map((e) => (
                <span
                  key={e}
                  style={{
                    height: 20,
                    padding: "0 8px",
                    borderRadius: 99,
                    fontSize: 11,
                    background: S.badgeBg,
                    color: S.textSecondary,
                    display: "inline-flex",
                    alignItems: "center",
                    fontFamily: "monospace",
                  }}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
        ))}
        {hooks.length === 0 && (
          <EmptyState
            icon={<Bell size={24} />}
            title="No webhook endpoints"
            hint="Add an endpoint to push scan and finding events to your SIEM, SOAR, Slack or PagerDuty."
            cta="Add endpoint"
            onCta={() => setModal(true)}
          />
        )}
      </div>

      <div>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: S.textPrimary,
            paddingBottom: 12,
            borderBottom: `1px solid ${S.border}`,
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          Recent Deliveries
        </h2>
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
              gridTemplateColumns: "90px 1fr 1fr 90px 80px",
              padding: "8px 16px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {["Time", "Event", "Endpoint", "Status", "Attempts"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 11,
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
          {DELIVERIES.map((d, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr 1fr 90px 80px",
                padding: "10px 16px",
                borderBottom:
                  i < DELIVERIES.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: S.textMuted,
                  fontFamily: "monospace",
                }}
              >
                {d.time}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: S.textSecondary,
                  fontFamily: "monospace",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {d.event}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: S.textMuted,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {d.url}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: d.code < 300 ? S.success : S.danger,
                }}
              >
                {d.code}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: d.attempts > 1 ? S.warning : S.textMuted,
                }}
              >
                {d.attempts}×
              </span>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: S.cardBg,
            border: `1px solid ${S.success}`,
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 13,
            color: S.textSecondary,
            zIndex: 1100,
          }}
        >
          {toast}
        </div>
      )}

      {modal && (
        <Modal
          title="Add webhook endpoint"
          subtitle="We'll POST signed JSON to this URL when the selected events fire."
          onClose={() => setModal(false)}
          footer={
            <button
              type="button"
              onClick={create}
              style={{
                height: 36,
                padding: "0 16px",
                borderRadius: 6,
                background: S.accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              Add endpoint
            </button>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: S.textMuted,
                marginBottom: 6,
              }}
            >
              Endpoint URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://siem.example.com/ingest"
              style={inputStyle}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: S.textMuted,
                marginBottom: 8,
              }}
            >
              Events
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ALL_EVENTS.map((e) => {
                const on = events.includes(e);
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => toggleEvent(e)}
                    style={{
                      height: 28,
                      padding: "0 10px",
                      borderRadius: 99,
                      fontSize: 12,
                      fontFamily: "monospace",
                      cursor: "pointer",
                      border: `1px solid ${on ? S.accent : S.border}`,
                      background: on ? "rgba(45,134,212,0.12)" : S.badgeBg,
                      color: on ? S.accent : S.textSecondary,
                    }}
                  >
                    {on && "✓ "}
                    {e}
                  </button>
                );
              })}
            </div>
          </div>
          <p
            style={{
              fontSize: 12,
              color: S.textMuted,
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            A signing secret is generated automatically and shown once after
            creation.
          </p>
        </Modal>
      )}
    </div>
  );
}

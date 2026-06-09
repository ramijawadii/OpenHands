/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- CloudGuard mock settings UI (local-state only) */
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

// Source categories cover the dimensions an enterprise audits across.
type Source =
  | "User"
  | "Service account"
  | "Sandbox compute"
  | "Webhook"
  | "Cloud"
  | "API";

interface LogEntry {
  ts: string;
  actor: string;
  source: Source;
  action: string;
  resource: string;
  workspace: string;
  cloud: string; // AWS | Azure | GCP | —
  status: "ok" | "denied" | "error";
  ip: string;
}

const WORKSPACES = [
  "Sentinel Security Workspace",
  "Production Cloud",
  "Sandbox / Dev",
];
const USERS = ["Rami Sentinel", "Jana Doe", "Marc T."];
const SERVICE_ACCOUNTS = [
  "ci-scanner",
  "terraform-bot",
  "nightly-audit",
  "siem-forwarder",
];
const CLOUDS = ["AWS", "Azure", "GCP"];
const SOURCES: Source[] = [
  "User",
  "Service account",
  "Sandbox compute",
  "Webhook",
  "Cloud",
  "API",
];

const LOGS: LogEntry[] = [
  {
    ts: "2026-06-09 12:04:11",
    actor: "Rami Sentinel",
    source: "User",
    action: "scan.start",
    resource: "AWS Prod / full coverage",
    workspace: "Production Cloud",
    cloud: "AWS",
    status: "ok",
    ip: "185.x.x.10",
  },
  {
    ts: "2026-06-09 12:03:48",
    actor: "ci-scanner",
    source: "Service account",
    action: "assess.submit",
    resource: "job_8c2f",
    workspace: "Production Cloud",
    cloud: "AWS",
    status: "ok",
    ip: "10.0.4.2",
  },
  {
    ts: "2026-06-09 11:58:20",
    actor: "sandbox://prod-cloud/secops",
    source: "Sandbox compute",
    action: "sandbox.provision",
    resource: "8 vCPU / 16 GB",
    workspace: "Production Cloud",
    cloud: "—",
    status: "ok",
    ip: "10.0.9.7",
  },
  {
    ts: "2026-06-09 11:46:02",
    actor: "siem.sentinel-org.io",
    source: "Webhook",
    action: "webhook.delivery",
    resource: "finding.critical",
    workspace: "Sentinel Security Workspace",
    cloud: "—",
    status: "ok",
    ip: "—",
  },
  {
    ts: "2026-06-09 11:31:55",
    actor: "events.pagerduty.com",
    source: "Webhook",
    action: "webhook.delivery",
    resource: "scan.failed",
    workspace: "Production Cloud",
    cloud: "—",
    status: "error",
    ip: "—",
  },
  {
    ts: "2026-06-09 11:20:14",
    actor: "terraform-bot",
    source: "API",
    action: "GET /api/cloudguard/assess",
    resource: "200",
    workspace: "Production Cloud",
    cloud: "AWS",
    status: "ok",
    ip: "10.0.4.9",
  },
  {
    ts: "2026-06-09 10:58:33",
    actor: "Jana Doe",
    source: "User",
    action: "role.update",
    resource: "Analyst → +run scans",
    workspace: "Sentinel Security Workspace",
    cloud: "—",
    status: "ok",
    ip: "82.x.x.4",
  },
  {
    ts: "2026-06-09 10:42:07",
    actor: "nightly-audit",
    source: "Cloud",
    action: "cloud.read",
    resource: "IAM ListRoles (Azure EU)",
    workspace: "Sentinel Security Workspace",
    cloud: "Azure",
    status: "ok",
    ip: "10.0.2.1",
  },
  {
    ts: "2026-06-09 10:15:51",
    actor: "Marc T.",
    source: "User",
    action: "secret.read",
    resource: "AWS_ACCESS_KEY_ID",
    workspace: "Sentinel Security Workspace",
    cloud: "AWS",
    status: "denied",
    ip: "176.x.x.9",
  },
  {
    ts: "2026-06-09 09:51:39",
    actor: "ci-scanner",
    source: "API",
    action: "POST /api/cloudguard/secrets",
    resource: "403",
    workspace: "Sandbox / Dev",
    cloud: "—",
    status: "denied",
    ip: "10.0.4.2",
  },
  {
    ts: "2026-06-09 09:12:47",
    actor: "sandbox://dev/analyst",
    source: "Sandbox compute",
    action: "sandbox.autoscale",
    resource: "4→8 vCPU",
    workspace: "Sandbox / Dev",
    cloud: "GCP",
    status: "ok",
    ip: "10.0.9.20",
  },
  {
    ts: "2026-06-09 08:33:02",
    actor: "nightly-audit",
    source: "Cloud",
    action: "cloud.read",
    resource: "S3 GetBucketPolicy (GCP Dev)",
    workspace: "Sandbox / Dev",
    cloud: "GCP",
    status: "ok",
    ip: "10.0.2.1",
  },
];

const selectStyle: React.CSSProperties = {
  height: 34,
  padding: "0 28px 0 10px",
  background: S.inputBg,
  border: `1px solid ${S.border}`,
  borderRadius: 6,
  color: S.textPrimary,
  fontSize: 13,
  outline: "none",
  appearance: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};
const optBg = { background: "var(--cg-bg-card)" } as const;

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 10,
          fontWeight: 600,
          color: S.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
      >
        <option value="" style={optBg}>
          All
        </option>
        {options.map((o) => (
          <option key={o} value={o} style={optBg}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function SourceBadge({ source }: { source: Source }) {
  const color: Record<Source, string> = {
    User: S.accent,
    "Service account": S.purple,
    "Sandbox compute": S.warning,
    Webhook: "#4caf7d",
    Cloud: S.textSecondary,
    API: S.textMuted,
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 18,
        padding: "0 7px",
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 600,
        color: color[source],
        background: S.badgeBg,
        whiteSpace: "nowrap",
      }}
    >
      {source}
    </span>
  );
}

export default function AuditLogSettings() {
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fActor, setFActor] = React.useState("");
  const [fSource, setFSource] = React.useState("");
  const [fCloud, setFCloud] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [detail, setDetail] = React.useState<LogEntry | null>(null);

  const shown = LOGS.filter((l) => {
    if (fWorkspace && l.workspace !== fWorkspace) return false;
    if (fActor && l.actor !== fActor) return false;
    if (fSource && l.source !== fSource) return false;
    if (fCloud && l.cloud !== fCloud) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${l.actor} ${l.action} ${l.resource}`.toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  const clearAll = () => {
    setFWorkspace("");
    setFActor("");
    setFSource("");
    setFCloud("");
    setSearch("");
  };
  const anyFilter = fWorkspace || fActor || fSource || fCloud || search;

  const th = (h: string) => (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: S.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {h}
    </span>
  );
  const GRID = "150px 1fr 120px 1.3fr 1fr 70px 70px";

  return (
    <div style={{ padding: "40px 48px", maxWidth: 1040 }}>
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
            Audit Log
          </h1>
          <ScopeBadge scope="This workspace" />
        </div>
        <button
          type="button"
          style={{
            height: 34,
            padding: "0 14px",
            borderRadius: 6,
            background: "transparent",
            border: `1px solid ${S.borderStrong}`,
            color: S.textSecondary,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Export CSV
        </button>
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 24,
          marginTop: 0,
        }}
      >
        Tamper-evident activity across users, service accounts, sandboxes,
        webhooks, clouds and the API.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
          marginBottom: 8,
        }}
      >
        <Filter
          label="Workspace"
          value={fWorkspace}
          onChange={setFWorkspace}
          options={WORKSPACES}
        />
        <div>
          <label
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 600,
              color: S.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 5,
            }}
          >
            Actor
          </label>
          <select
            value={fActor}
            onChange={(e) => setFActor(e.target.value)}
            style={selectStyle}
          >
            <option value="" style={optBg}>
              All actors
            </option>
            <optgroup label="Users" style={optBg}>
              {USERS.map((u) => (
                <option key={u} value={u} style={optBg}>
                  {u}
                </option>
              ))}
            </optgroup>
            <optgroup label="Service accounts" style={optBg}>
              {SERVICE_ACCOUNTS.map((s) => (
                <option key={s} value={s} style={optBg}>
                  {s}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <Filter
          label="Source"
          value={fSource}
          onChange={setFSource}
          options={SOURCES}
        />
        <Filter
          label="Cloud"
          value={fCloud}
          onChange={setFCloud}
          options={CLOUDS}
        />
        <div style={{ flex: 1, minWidth: 160 }}>
          <label
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 600,
              color: S.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 5,
            }}
          >
            Search
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="actor, action, resource…"
            style={{
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
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 12, color: S.textMuted }}>
          {shown.length} of {LOGS.length} events
        </span>
        {anyFilter && (
          <button
            type="button"
            onClick={clearAll}
            style={{
              background: "none",
              border: "none",
              color: S.accent,
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Clear filters
          </button>
        )}
      </div>

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
            gridTemplateColumns: GRID,
            padding: "8px 16px",
            borderBottom: `1px solid ${S.border}`,
          }}
        >
          {th("Time")}
          {th("Actor")}
          {th("Source")}
          {th("Action / Resource")}
          {th("Workspace")}
          {th("Cloud")}
          {th("Status")}
        </div>
        {shown.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: S.textMuted }}>
            No events match the current filters.
          </div>
        )}
        {shown.map((l, i) => (
          <div
            key={i}
            onClick={() => setDetail(l)}
            title="View event details"
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              padding: "10px 16px",
              cursor: "pointer",
              borderBottom:
                i < shown.length - 1
                  ? "1px solid var(--cg-border-subtle)"
                  : "none",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: S.textMuted,
                fontFamily: "monospace",
              }}
            >
              {l.ts}
            </span>
            <span
              style={{
                fontSize: 12,
                color: S.textSecondary,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={`${l.actor} · ${l.ip}`}
            >
              {l.actor}
            </span>
            <div>
              <SourceBadge source={l.source} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  color: S.textPrimary,
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {l.action}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: S.textMuted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {l.resource}
              </div>
            </div>
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
              {l.workspace}
            </span>
            <span style={{ fontSize: 12, color: S.textMuted }}>{l.cloud}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color:
                  l.status === "ok"
                    ? S.success
                    : l.status === "denied"
                      ? S.warning
                      : S.danger,
              }}
            >
              {l.status}
            </span>
          </div>
        ))}
      </div>

      {detail && (
        <div
          onClick={() => setDetail(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 1100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 460,
              maxWidth: "92vw",
              height: "100%",
              overflowY: "auto",
              background: S.cardBg,
              borderLeft: `1px solid ${S.borderStrong}`,
              padding: 24,
              boxShadow: "-8px 0 24px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: S.textPrimary,
                  margin: 0,
                }}
              >
                Event detail
              </h3>
              <button
                type="button"
                onClick={() => setDetail(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: S.textMuted,
                  fontSize: 18,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                ["Time", detail.ts],
                ["Actor", detail.actor],
                ["Source", detail.source],
                ["Action", detail.action],
                ["Resource", detail.resource],
                ["Workspace", detail.workspace],
                ["Cloud", detail.cloud],
                ["Status", detail.status],
                ["Source IP", detail.ip],
                [
                  "Event ID",
                  `evt_${detail.ts.replace(/[^0-9]/g, "").slice(-10)}`,
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--cg-border-subtle)",
                  }}
                >
                  <span style={{ fontSize: 12, color: S.textMuted }}>{k}</span>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: S.textSecondary,
                      fontFamily: "monospace",
                      textAlign: "right",
                      wordBreak: "break-all",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 11, color: S.textMuted }}>
              Signed entry — integrity verified against the tamper-evident chain
              (tenant_audit). Raw JSON:
            </div>
            <pre
              style={{
                marginTop: 8,
                padding: 12,
                background: S.inputBg,
                border: `1px solid ${S.border}`,
                borderRadius: 6,
                fontSize: 11,
                color: S.textSecondary,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(detail, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

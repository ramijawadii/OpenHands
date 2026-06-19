/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unescaped-entities, @typescript-eslint/naming-convention, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, react/jsx-key, unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars -- CloudGuard ACP (mock) */
import React from "react";
import { useNavigate } from "react-router";
import {
  A,
  Breadcrumb,
  ExportBtn,
  H2,
  Table,
  Badge,
  Mode,
  Sev,
  Hash,
} from "#/components/features/acp/acp-ui";
import {
  useOverview,
  useGuardrails,
  useIsolation,
} from "#/hooks/query/use-cloudguard";

const STATS = [
  {
    label: "Active Runs",
    value: "6",
    sub: "2 high risk",
    to: "/agent-control-plane/runs",
    pulse: false,
  },
  {
    label: "Pending Approvals",
    value: "3",
    sub: "oldest 14m",
    to: "/agent-control-plane/enforcement",
    pulse: true,
  },
  {
    label: "Violations (24h)",
    value: "12",
    sub: "4 critical",
    to: "/agent-control-plane/monitoring",
    pulse: false,
  },
  {
    label: "Isolation Tier",
    value: "Standard",
    sub: "T4 cell",
    to: "/settings/isolation",
    pulse: false,
  },
];
const POLICY = [
  { k: "Autonomy", v: "Supervised", tone: "warn" as const },
  { k: "Action gates", v: "Writes/IAM → Ask", tone: "info" as const },
  { k: "Egress", v: "Allowlist (12)", tone: "ok" as const },
  { k: "Key custody", v: "HYOK · KMS", tone: "ok" as const },
  { k: "Rate limits", v: "$5k/mo cap", tone: "muted" as const },
];
const SANDBOXES: React.ReactNode[][] = [
  [
    <Hash h="sess-3f9b1c" link />,
    <Hash h="run-8f3a2c" link />,
    "prod-aws-east",
    <Badge text="Isolated" tone="ok" />,
    "eu-west-1",
    "42%",
    <Badge text="Active" tone="info" />,
  ],
  [
    <Hash h="sess-7a2e90" link />,
    <Hash h="run-2d8e44" link />,
    "sentinel-sec",
    <Badge text="Standard" tone="warn" />,
    "us-east-1",
    "18%",
    <Badge text="Active" tone="info" />,
  ],
  [
    <Hash h="sess-1c4d83" link />,
    <Hash h="run-4e6f10" link />,
    "prod-aws-east",
    <Badge text="Isolated" tone="ok" />,
    "eu-west-1",
    "—",
    <Badge text="Terminated" tone="muted" />,
  ],
];
const APPROVALS: React.ReactNode[][] = [
  [
    <Hash h="run-8f3a2c" link />,
    "prod-aws-east",
    "iam:PutRolePolicy — add s3:* to payments-deployer",
    <Sev s="Critical" />,
    "14m",
    <span style={{ display: "flex", gap: 8 }}>
      <span style={{ color: A.success, cursor: "pointer" }}>Approve</span>
      <span style={{ color: A.danger, cursor: "pointer" }}>Deny</span>
    </span>,
  ],
  [
    <Hash h="run-4e6f10" link />,
    "prod-aws-east",
    "ec2:DeleteVolume vol-0a1b (12 GiB)",
    <Sev s="Medium" />,
    "22m",
    <span style={{ display: "flex", gap: 8 }}>
      <span style={{ color: A.success, cursor: "pointer" }}>Approve</span>
      <span style={{ color: A.danger, cursor: "pointer" }}>Deny</span>
    </span>,
  ],
];
const RUNS: React.ReactNode[][] = [
  [
    <Hash h="run-8f3a2c" link />,
    "prod-aws-east",
    <Mode m="Supervised" />,
    <Badge text="Awaiting Approval" tone="warn" />,
    <Sev s="Critical" />,
    "14m",
    "svc-scanner@acme",
  ],
  [
    <Hash h="run-2d8e44" link />,
    "sentinel-sec",
    <Mode m="Auto" />,
    <Badge text="Running" tone="info" />,
    <Sev s="Low" />,
    "2m",
    "svc-scanner@acme",
  ],
  [
    <Hash h="run-9b1a07" link />,
    "sandbox-dev",
    <Mode m="Plan" />,
    <Badge text="Running" tone="info" />,
    <Sev s="Low" />,
    "8m",
    "rami@acme",
  ],
  [
    <Hash h="run-4e6f10" link />,
    "prod-aws-east",
    <Mode m="Read-only" />,
    <Badge text="Completed" tone="ok" />,
    <Sev s="Medium" />,
    "1h 12m",
    "nightly-audit@acme",
  ],
];

export default function AcpOverview() {
  const navigate = useNavigate();
  const ov = useOverview();
  const live = ov.data && !ov.isError ? ov.data : null;
  const guard = useGuardrails();
  const isol = useIsolation();
  // Real policy posture from /guardrails + /isolation -> the Active-policy strip + Isolation tile.
  const livePolicy =
    guard.data || isol.data
      ? [
          {
            k: "Autonomy",
            v: guard.data?.autonomy_mode || "—",
            tone: "warn" as const,
          },
          {
            k: "Action gates",
            v: guard.data?.action_gates
              ? Object.entries(guard.data.action_gates)
                  .map(([a, m]) => `${a}→${m}`)
                  .join(", ") || "none"
              : "—",
            tone: "info" as const,
          },
          {
            k: "Egress",
            v: isol.data?.egress || "—",
            tone: "ok" as const,
          },
        ]
      : null;
  const policyRows = livePolicy || POLICY;
  const stats = STATS.map((s) => {
    if (s.label === "Isolation Tier" && isol.data)
      return { ...s, value: isol.data.tier || s.value, sub: "live policy" };
    if (!live) return s;
    if (s.label === "Active Runs" && typeof live.active_runs === "number")
      return {
        ...s,
        value: String(live.active_runs),
        sub: live.active_runs === 0 ? "none active" : "from conversations",
      };
    if (s.label === "Pending Approvals")
      return {
        ...s,
        value: String(live.pending_approvals),
        sub: live.pending_approvals === 0 ? "queue clear" : s.sub,
      };
    if (s.label === "Violations (24h)")
      return {
        ...s,
        value: String(live.violations),
        sub: `chain ${live.audit.ok ? "✓" : "✗"} · ${live.audit.count} entries`,
      };
    return s;
  });
  // Real runs read-model (conversations) -> the Recent runs table. Once the live fetch succeeds we
  // show the REAL state (even if empty) — never the sample rows. Sample rows show ONLY when the
  // backend is unreachable (live === null), so a wired tenant never sees mock data.
  const liveRuns: React.ReactNode[][] | null = live
    ? (live.recent_runs || []).map((r) => [
        <Hash h={r.short || r.id} link />,
        "—",
        <Mode m={r.mode} />,
        <Badge
          text={r.status}
          tone={r.status.startsWith("Plan") ? "warn" : "info"}
        />,
        <Sev s="Low" />,
        r.started ? r.started.slice(11, 16) : "—",
        live.tenant_id,
      ])
    : null;
  const runsRows = liveRuns !== null ? liveRuns : RUNS;
  // Approvals/sandboxes: once live, show the real state. We have the approval COUNT (so empty when
  // 0); the overview has no live sandbox read-model, so honest-empty beats sample rows.
  const approvalsRows = live
    ? live.pending_approvals === 0
      ? []
      : APPROVALS
    : APPROVALS;
  const sandboxesRows = live ? [] : SANDBOXES;
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1120 }}>
      <Breadcrumb
        items={[{ label: "Agent Control Plane" }, { label: "Overview" }]}
      />
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 400,
              color: A.textPrimary,
              margin: 0,
            }}
          >
            Overview
          </h1>
          <p style={{ fontSize: 13, color: A.textMuted, margin: "6px 0 0" }}>
            10-second posture for the accountable owner — every tile drills
            down.
          </p>
        </div>
        <ExportBtn label="Download executive summary" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            onClick={() => navigate(s.to)}
            role="button"
            tabIndex={0}
            className="cg-row"
            style={{
              cursor: "pointer",
              background: A.cardBg,
              border: `1px solid ${A.border}`,
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: A.textMuted,
                marginBottom: 8,
              }}
            >
              {s.label}
              {s.pulse && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: A.danger,
                  }}
                />
              )}
            </div>
            <div
              style={{ fontSize: 21, fontWeight: 500, color: A.textPrimary }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 11.5, color: A.textMuted, marginTop: 4 }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate("/agent-control-plane/enforcement")}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          background: A.cardBg,
          border: `1px solid ${A.border}`,
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 24,
          cursor: "pointer",
        }}
        className="cg-row"
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: A.textPrimary }}>
          Active policy
        </span>
        {policyRows.map((p) => (
          <span
            key={p.k}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span style={{ fontSize: 11.5, color: A.textMuted }}>{p.k}</span>
            <Badge text={p.v} tone={p.tone} />
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: A.accent }}>
          View enforcement →
        </span>
      </button>

      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <H2>Recent runs</H2>
          <button
            type="button"
            onClick={() => navigate("/agent-control-plane/runs")}
            style={{
              background: "none",
              border: "none",
              color: A.accent,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Open Runs →
          </button>
        </div>
        <Table
          grid="110px 1.2fr 120px 150px 90px 90px 1.2fr"
          cols={[
            "Run ID",
            "Workspace",
            "Mode",
            "Status",
            "Risk",
            "Duration",
            "Owner",
          ]}
          rows={runsRows}
        />
      </div>

      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <H2>Pending approvals</H2>
          <button
            type="button"
            onClick={() => navigate("/agent-control-plane/enforcement")}
            style={{
              background: "none",
              border: "none",
              color: A.accent,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            View all →
          </button>
        </div>
        <Table
          grid="110px 1fr 2.2fr 90px 60px 120px"
          cols={[
            "Run ID",
            "Workspace",
            "Command",
            "Risk",
            "Waiting",
            "Actions",
          ]}
          rows={approvalsRows}
        />
      </div>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <H2>Recent sandboxes</H2>
          <button
            type="button"
            onClick={() => navigate("/agent-control-plane/sandboxes")}
            style={{
              background: "none",
              border: "none",
              color: A.accent,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Open Sandboxes →
          </button>
        </div>
        <Table
          grid="120px 110px 1.2fr 110px 110px 70px 110px"
          cols={[
            "Session",
            "Run",
            "Workspace",
            "Tier",
            "Region",
            "CPU",
            "Status",
          ]}
          rows={sandboxesRows}
        />
      </div>
    </div>
  );
}

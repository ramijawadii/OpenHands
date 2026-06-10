/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unescaped-entities, @typescript-eslint/naming-convention, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, react/jsx-key, unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars -- CloudGuard ACP (mock) */
import React from "react";
import { useNavigate } from "react-router";
import {
  A,
  PageHeader,
  H2,
  Card,
  Table,
  Badge,
  Sev,
  Decision,
} from "#/components/features/acp/acp-ui";

const STATS = [
  { label: "Live runs", value: "3", tone: "info" as const },
  { label: "Pending approvals", value: "2", tone: "warn" as const },
  { label: "Open incidents", value: "1", tone: "danger" as const },
  { label: "Policy blocks (24h)", value: "12", tone: "ok" as const },
  { label: "Anomalies (24h)", value: "2", tone: "warn" as const },
  { label: "Spend MTD", value: "$4,250 / $5,000", tone: "muted" as const },
];

const RISKS: React.ReactNode[][] = [
  [
    <Sev s="Critical" />,
    "Agent attempted IAM policy widening on prod-payments",
    "Production Cloud",
    "Agent run",
    "blocked",
    "4m ago",
  ],
  [
    <Sev s="High" />,
    "Public S3 bucket created outside change window",
    "Production Cloud",
    "Cloud drift",
    "open",
    "1h ago",
  ],
  [
    <Sev s="High" />,
    "Sandbox egress to unrecognized host (blocked)",
    "Sandbox / Dev",
    "Sandbox",
    "contained",
    "2h ago",
  ],
  [
    <Sev s="Medium" />,
    "Service account ci-scanner approached token limit",
    "Production Cloud",
    "Quota",
    "open",
    "5h ago",
  ],
];

const RUNS: React.ReactNode[][] = [
  [
    <span style={{ fontFamily: "monospace" }}>run_8c2f</span>,
    <Badge text="Ask-first" tone="info" />,
    "Production Cloud",
    <Badge text="Awaiting approval" tone="warn" />,
    <Sev s="Critical" />,
    "now",
  ],
  [
    <span style={{ fontFamily: "monospace" }}>run_2d8e</span>,
    <Badge text="Autonomous" tone="purple" />,
    "Sentinel Security Workspace",
    <Badge text="Running" tone="info" />,
    <Sev s="Low" />,
    "2m ago",
  ],
  [
    <span style={{ fontFamily: "monospace" }}>run_9b1a</span>,
    <Badge text="Plan-only" tone="muted" />,
    "Sandbox / Dev",
    <Badge text="Running" tone="info" />,
    <Sev s="Low" />,
    "8m ago",
  ],
  [
    <span style={{ fontFamily: "monospace" }}>run_4e6f</span>,
    <Badge text="Ask-first" tone="info" />,
    "Production Cloud",
    <Badge text="Completed" tone="ok" />,
    <Sev s="Medium" />,
    "1h ago",
  ],
];

const APPROVALS: React.ReactNode[][] = [
  [
    "Widen IAM policy on role `payments-deployer`",
    <span style={{ fontFamily: "monospace" }}>run_8c2f</span>,
    "ci-scanner",
    <Decision d="Ask" />,
    "4m",
  ],
  [
    "Delete unattached EBS volume vol-0a1b (12 GiB)",
    <span style={{ fontFamily: "monospace" }}>run_4e6f</span>,
    "Rami Sentinel",
    <Decision d="Ask" />,
    "22m",
  ],
];

export default function AcpOverview() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1080 }}>
      <PageHeader
        title="Overview"
        sub="Live posture of the agent across your organization — what's running, what's waiting on you, and what needs attention."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {STATS.map((s) => (
          <Card key={s.label}>
            <div style={{ fontSize: 12, color: A.textMuted, marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{ fontSize: 24, fontWeight: 500, color: A.textPrimary }}
              >
                {s.value}
              </span>
              <Badge text="live" tone={s.tone} />
            </div>
          </Card>
        ))}
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
          <H2>Active risks</H2>
          <button
            type="button"
            onClick={() => navigate("/agent-control-plane/monitoring")}
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
          grid="90px 2.2fr 1.3fr 0.9fr 0.8fr 70px"
          cols={["Severity", "Risk", "Workspace", "Source", "Status", "Age"]}
          rows={RISKS}
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
          <H2>Recent agent runs</H2>
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
          grid="100px 130px 1.6fr 150px 90px 70px"
          cols={["Run", "Mode", "Workspace", "Status", "Risk", "Started"]}
          rows={RUNS}
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
            Review in Enforcement →
          </button>
        </div>
        <Table
          grid="2.4fr 100px 1fr 80px 60px"
          cols={["Action", "Run", "Requested by", "Decision", "Age"]}
          rows={APPROVALS}
        />
      </div>
    </div>
  );
}

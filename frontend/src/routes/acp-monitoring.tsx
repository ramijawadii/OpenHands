/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unescaped-entities, @typescript-eslint/naming-convention, react/jsx-key, unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars -- CloudGuard ACP (mock) */
import React from "react";
import {
  A,
  PageHeader,
  SubTabs,
  Table,
  Badge,
  Sev,
  Decision,
  mono,
} from "#/components/features/acp/acp-ui";

const HEALTH = [
  { sub: "Agent orchestrator", state: "Operational" },
  { sub: "Sandbox runtime (cells)", state: "Operational" },
  { sub: "Knowledge graph (Neo4j)", state: "Operational" },
  { sub: "Approval service", state: "Operational" },
  { sub: "Audit chain", state: "Operational" },
  { sub: "Egress proxy", state: "Degraded" },
  { sub: "Model inference (Vertex)", state: "Operational" },
  { sub: "Cloud connectors", state: "Operational" },
];
const VIOLATIONS: React.ReactNode[][] = [
  [
    "12:04:24",
    "IAM widening on payments-deployer",
    <span style={mono}>run_8c2f</span>,
    "Cloud guardrail: IAM writes need approval",
    <Decision d="Blocked" />,
  ],
  [
    "12:04:23",
    "Sandbox egress to pastebin.com",
    <span style={mono}>sbx_7f3c</span>,
    "Egress default-deny",
    <Decision d="Blocked" />,
  ],
  [
    "11:31:55",
    "Delete S3 bucket outside change window",
    <span style={mono}>run_4e6f</span>,
    "Change window: business hours only",
    <Decision d="Blocked" />,
  ],
  [
    "09:51:39",
    "Service account write via API",
    <span style={mono}>ci-scanner</span>,
    "Role: read-only",
    <Decision d="Deny" />,
  ],
];
const ANOMALIES: React.ReactNode[][] = [
  [
    <Sev s="High" />,
    "Impossible travel",
    "Sign-in from Paris then Singapore in 9 min",
    "Marc Tarek",
    "open",
  ],
  [
    <Sev s="Medium" />,
    "Abnormal API volume",
    "ci-scanner 4× normal call rate",
    "ci-scanner",
    "watching",
  ],
];
const DRIFT: React.ReactNode[][] = [
  [
    <Sev s="High" />,
    "S3 bucket made public",
    "prod-payments-exports",
    "Outside CloudGuard (console)",
    "1h ago",
  ],
  [
    <Sev s="Medium" />,
    "Security group opened 0.0.0.0/0:22",
    "sg-0a1b (bastion)",
    "Terraform pipeline",
    "3h ago",
  ],
  [
    <Sev s="Low" />,
    "New IAM role created",
    "data-export-readonly",
    "CloudGuard remediation",
    "1h ago",
  ],
];
const ALERTS: React.ReactNode[][] = [
  [
    "12:04:24",
    <Sev s="Critical" />,
    "finding.critical → Slack #soc-alerts, PagerDuty",
    <Badge text="Delivered" tone="ok" />,
  ],
  [
    "11:31:55",
    <Sev s="High" />,
    "scan.failed → Email Admins",
    <Badge text="Delivered" tone="ok" />,
  ],
  [
    "11:30:02",
    <Sev s="High" />,
    "drift.detected → PagerDuty",
    <Badge text="Retrying (503)" tone="warn" />,
  ],
];

export default function AcpMonitoring() {
  const [tab, setTab] = React.useState("Health");
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1080 }}>
      <PageHeader
        title="Monitoring"
        sub="Real-time health, policy enforcement in action, anomalies, and cloud drift — across the agent and your environment."
      />
      <SubTabs
        tabs={[
          "Health",
          "Policy violations",
          "Anomalies",
          "Cloud change monitor",
          "Alerts",
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Health" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          {HEALTH.map((h) => (
            <div
              key={h.sub}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: A.cardBg,
                border: `1px solid ${A.border}`,
                borderRadius: 8,
                padding: "12px 14px",
              }}
            >
              <span style={{ fontSize: 13, color: A.textSecondary }}>
                {h.sub}
              </span>
              <Badge
                text={h.state}
                tone={h.state === "Operational" ? "ok" : "warn"}
              />
            </div>
          ))}
        </div>
      )}
      {tab === "Policy violations" && (
        <>
          <div style={{ marginBottom: 12, fontSize: 12, color: A.textMuted }}>
            A blocked action is a{" "}
            <strong style={{ color: A.success }}>good</strong> signal — the
            guardrails worked. 12 blocks in the last 24h.
          </div>
          <Table
            grid="90px 2fr 110px 1.8fr 90px"
            cols={[
              "Time",
              "Attempted action",
              "Actor",
              "Why blocked",
              "Decision",
            ]}
            rows={VIOLATIONS}
          />
        </>
      )}
      {tab === "Anomalies" && (
        <Table
          grid="80px 1.2fr 2fr 1fr 80px"
          cols={["Severity", "Type", "Detail", "Subject", "Status"]}
          rows={ANOMALIES}
        />
      )}
      {tab === "Cloud change monitor" && (
        <Table
          grid="80px 1.6fr 1.4fr 1.6fr 80px"
          cols={["Severity", "Change", "Resource", "Source", "Age"]}
          rows={DRIFT}
        />
      )}
      {tab === "Alerts" && (
        <Table
          grid="90px 90px 2fr 130px"
          cols={["Time", "Severity", "Route", "Delivery"]}
          rows={ALERTS}
        />
      )}
    </div>
  );
}

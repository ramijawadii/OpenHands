/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unescaped-entities, @typescript-eslint/naming-convention, react/jsx-key, unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars -- CloudGuard ACP (mock) */
import React from "react";
import {
  A,
  Breadcrumb,
  FilterBar,
  FSelect,
  ExportBtn,
  SubTabs,
  Table,
  Badge,
  Sev,
  Decision,
  Hash,
  mono,
} from "#/components/features/acp/acp-ui";
import { useViolations } from "#/hooks/query/use-cloudguard";
import type { CGViolation } from "#/api/cloudguard-service";

const vToRow = (v: CGViolation): React.ReactNode[] => [
  <span style={{ ...mono, fontSize: 11 }}>{v.ts}</span>,
  <span style={mono}>{v.rule}</span>,
  v.workspace || "—",
  v.actor,
  <span style={mono}>{v.rule}</span>,
  v.resource || "—",
  <Sev s={v.severity} />,
  <Decision
    d={v.decision ? v.decision[0].toUpperCase() + v.decision.slice(1) : ""}
  />,
  <Hash h={`#${v.seq}`} />,
];

const HEALTH = [
  {
    sub: "Agent Loop",
    a: "p50 1.2s · p99 4.8s",
    b: "Error rate 0.3%",
    st: "Healthy",
  },
  {
    sub: "Approval Service",
    a: "Queue depth 3",
    b: "p50 approval 6m",
    st: "Healthy",
  },
  {
    sub: "Write Broker",
    a: "Staged edits 2",
    b: "p50 commit 240ms",
    st: "Healthy",
  },
  {
    sub: "Audit Service",
    a: "Chain verified 2m ago",
    b: "Write 8ms",
    st: "Healthy",
  },
  {
    sub: "Sandbox Runtime",
    a: "Active sessions 3",
    b: "Eviction 0/h",
    st: "Degraded",
  },
  {
    sub: "KG / Env Intel",
    a: "Staleness 6m",
    b: "Last sync 02:08Z",
    st: "Healthy",
  },
];
const VIOLATIONS: React.ReactNode[][] = [
  [
    "02:14:24Z",
    <Hash h="rule-iam-write" link />,
    "prod-aws-east",
    <Hash h="run-8f3a2c" link />,
    "Add s3:* to payments-deployer",
    "aws:iam · …/payments-deployer",
    <Sev s="Critical" />,
    <Decision d="Blocked" />,
    <Hash h="seq-48291" link />,
  ],
  [
    "02:14:23Z",
    <Hash h="rule-egress" link />,
    "prod-aws-east",
    <Hash h="sess-3f9b1c" link />,
    "Egress to pastebin.com:443",
    "network · pastebin.com",
    <Sev s="High" />,
    <Decision d="Blocked" />,
    <Hash h="seq-48289" link />,
  ],
  [
    "11:31:55Z",
    <Hash h="rule-window" link />,
    "prod-aws-east",
    <Hash h="run-4e6f10" link />,
    "Delete S3 bucket outside window",
    "aws:s3 · audit-logs-eu",
    <Sev s="Medium" />,
    <Badge text="Rate-limited" tone="warn" />,
    <Hash h="seq-48201" link />,
  ],
];
const ANOMALIES: React.ReactNode[][] = [
  [
    "02:11:02Z",
    <Badge text="Abnormal API Volume" tone="warn" />,
    "run-8f3a2c made 847 IAM calls in 3 min",
    <Hash h="run-8f3a2c" link />,
    "12/hr",
    "847/3m",
    <Sev s="High" />,
    <Badge text="Investigating" tone="warn" />,
  ],
  [
    "09:40:11Z",
    <Badge text="Impossible Travel" tone="warn" />,
    "Sign-in Paris then Singapore in 9 min",
    "marc@acme",
    "—",
    "9 min gap",
    <Sev s="High" />,
    <Badge text="New" tone="info" />,
  ],
];
const CHANGES: React.ReactNode[][] = [
  [
    "01:01:10Z",
    "4044…1029",
    "s3",
    <span style={mono}>prod-payments-exports</span>,
    <Badge text="Policy Change" tone="warn" />,
    "External: user/alice",
    <Sev s="High" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>View diff →</span>,
    <Badge text="⚠ Drift from IaC" tone="danger" />,
  ],
  [
    "11:46:30Z",
    "4044…1029",
    "iam",
    <span style={mono}>payments-deployer</span>,
    <Badge text="Modify" tone="info" />,
    <Hash h="run-4e6f10" link />,
    <Sev s="Low" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>View diff →</span>,
    "—",
  ],
];
const ALERT_RULES: React.ReactNode[][] = [
  [
    "Critical finding",
    "severity = critical",
    <Sev s="Critical" />,
    "Slack #soc-alerts, PagerDuty",
    <Badge text="Enabled" tone="ok" />,
  ],
  [
    "Scan failure",
    "event = scan.failed",
    <Sev s="High" />,
    "Email Admins",
    <Badge text="Enabled" tone="ok" />,
  ],
];
const FIRED: React.ReactNode[][] = [
  [
    "02:14:24Z",
    "Critical finding",
    "finding.critical",
    <Sev s="Critical" />,
    "Slack, PagerDuty",
    <Badge text="Delivered" tone="ok" />,
  ],
  [
    "11:30:02Z",
    "Drift detected",
    "drift.detected",
    <Sev s="High" />,
    "PagerDuty",
    <Badge text="Retrying (503)" tone="warn" />,
  ],
];

export default function AcpMonitoring() {
  const [tab, setTab] = React.useState("Health");
  const [q, setQ] = React.useState("");
  const violationsQ = useViolations();
  const usingRealViol = !!violationsQ.data && !violationsQ.isError;
  const vrows = usingRealViol
    ? violationsQ.data.violations.map(vToRow)
    : VIOLATIONS;
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1120 }}>
      <Breadcrumb
        items={[{ label: "Agent Control Plane" }, { label: "Monitoring" }]}
      />
      <h1
        style={{
          fontSize: 20,
          fontWeight: 400,
          color: A.textPrimary,
          margin: "0 0 14px",
        }}
      >
        Monitoring
      </h1>
      <SubTabs
        tabs={["Health", "Violations", "Anomalies", "Cloud Changes", "Alerts"]}
        value={tab}
        onChange={setTab}
      />

      {tab === "Health" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          {HEALTH.map((h) => (
            <div
              key={h.sub}
              style={{
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
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13.5,
                    color: A.textPrimary,
                    fontWeight: 500,
                  }}
                >
                  {h.sub}
                </span>
                <Badge
                  text={h.st === "Healthy" ? "● Healthy" : "⚠ Degraded"}
                  tone={h.st === "Healthy" ? "ok" : "warn"}
                />
              </div>
              <div style={{ fontSize: 12, color: A.textMuted }}>{h.a}</div>
              <div style={{ fontSize: 12, color: A.textMuted, marginTop: 2 }}>
                {h.b}
              </div>
              {h.st !== "Healthy" && (
                <a
                  href="/agent-control-plane/incidents"
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    fontSize: 12,
                    color: A.accent,
                    textDecoration: "none",
                  }}
                >
                  View incident →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
      {tab === "Violations" && (
        <>
          <FilterBar
            placeholder="Search by rule ID, workspace, actor…"
            search={q}
            onSearch={setQ}
            right={<ExportBtn />}
          >
            <FSelect
              value=""
              onChange={() => {}}
              all="All Severity"
              options={["Critical", "High", "Medium", "Low"]}
            />
            <FSelect
              value=""
              onChange={() => {}}
              all="All Policy"
              options={[
                "Action",
                "Egress",
                "Data",
                "Rate Limit",
                "Authentication",
              ]}
            />
          </FilterBar>
          <div style={{ marginBottom: 10, fontSize: 12, color: A.textMuted }}>
            A blocked action is a{" "}
            <strong style={{ color: A.success }}>good</strong> signal — the
            policy worked.
          </div>
          <Table
            grid="90px 120px 1fr 110px 1.6fr 1.4fr 80px 100px 90px"
            cols={[
              "Time",
              "Rule",
              "Workspace",
              "Actor",
              "Attempted action",
              "Service · Resource",
              "Severity",
              "Decision",
              "Audit",
            ]}
            rows={vrows}
          />
        </>
      )}
      {tab === "Anomalies" && (
        <>
          <FilterBar
            placeholder="Search anomalies…"
            search={q}
            onSearch={setQ}
            right={<ExportBtn />}
          >
            <FSelect
              value=""
              onChange={() => {}}
              all="All Types"
              options={[
                "Impossible Travel",
                "Abnormal API Volume",
                "Off-hours Change",
                "Credential Reuse",
                "Data Volume",
              ]}
            />
            <FSelect
              value=""
              onChange={() => {}}
              all="All Status"
              options={["New", "Investigating", "Dismissed"]}
            />
          </FilterBar>
          <Table
            grid="90px 160px 1.8fr 130px 90px 100px 80px 110px"
            cols={[
              "Time",
              "Type",
              "Description",
              "Affected",
              "Baseline",
              "Observed",
              "Severity",
              "Status",
            ]}
            rows={ANOMALIES}
          />
        </>
      )}
      {tab === "Cloud Changes" && (
        <>
          <FilterBar
            placeholder="Search by resource ID, account…"
            search={q}
            onSearch={setQ}
            right={<ExportBtn />}
          >
            <FSelect
              value=""
              onChange={() => {}}
              all="All Sources"
              options={["Agent (by run)", "External"]}
            />
            <FSelect
              value=""
              onChange={() => {}}
              all="All Changes"
              options={[
                "Create",
                "Modify",
                "Delete",
                "Policy Change",
                "Permission Escalation",
              ]}
            />
          </FilterBar>
          <Table
            grid="90px 100px 60px 1.4fr 120px 1.3fr 80px 100px 130px"
            cols={[
              "Time",
              "Account",
              "Svc",
              "Resource",
              "Change",
              "Source",
              "Risk",
              "Diff",
              "Drift",
            ]}
            rows={CHANGES}
          />
        </>
      )}
      {tab === "Alerts" && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: A.textPrimary,
                margin: 0,
              }}
            >
              Configured alert rules
            </h2>
            <a
              href="/settings/notifications"
              style={{ fontSize: 12, color: A.accent, textDecoration: "none" }}
            >
              Manage alert rules →
            </a>
          </div>
          <Table
            grid="1.3fr 1.4fr 90px 1.6fr 100px"
            cols={["Rule", "Condition", "Severity", "Destinations", "Status"]}
            rows={ALERT_RULES}
          />
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: A.textPrimary,
              margin: "24px 0 12px",
            }}
          >
            Recent fired alerts
          </h2>
          <Table
            grid="90px 1.3fr 1.2fr 90px 1.4fr 120px"
            cols={[
              "Fired at",
              "Rule",
              "Condition met",
              "Severity",
              "Delivered to",
              "Status",
            ]}
            rows={FIRED}
          />
        </>
      )}
    </div>
  );
}

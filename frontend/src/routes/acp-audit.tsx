/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unescaped-entities, @typescript-eslint/naming-convention, react/jsx-key, unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars -- CloudGuard ACP (mock) */
import React from "react";
import {
  A,
  PageHeader,
  SubTabs,
  Table,
  Badge,
  Decision,
  mono,
} from "#/components/features/acp/acp-ui";

type Facet = "All" | "Actions" | "Approvals" | "Policy decisions";
const LEDGER = [
  {
    seq: 1042,
    ts: "12:04:24",
    actor: "ci-scanner",
    kind: "Policy decision",
    entry: "iam:PutRolePolicy → Ask (held)",
    dec: "Ask",
  },
  {
    seq: 1041,
    ts: "12:04:21",
    actor: "ci-scanner",
    kind: "Action",
    entry: "iam:GetRole payments-deployer",
    dec: "Allow",
  },
  {
    seq: 1040,
    ts: "12:03:48",
    actor: "ci-scanner",
    kind: "Action",
    entry: "assess.submit job_8c2f",
    dec: "Allow",
  },
  {
    seq: 1039,
    ts: "11:46:02",
    actor: "Rami Sentinel",
    kind: "Approval",
    entry: "Approved: rotate access key AKIA…7E",
    dec: "Allow",
  },
  {
    seq: 1038,
    ts: "11:31:55",
    actor: "nightly-audit",
    kind: "Policy decision",
    entry: "s3:DeleteBucket → Deny (change window)",
    dec: "Deny",
  },
  {
    seq: 1037,
    ts: "10:58:33",
    actor: "Jana Doe",
    kind: "Action",
    entry: "role.update Analyst +run-scans",
    dec: "Allow",
  },
  {
    seq: 1036,
    ts: "10:15:51",
    actor: "Marc Tarek",
    kind: "Policy decision",
    entry: "secret.read AWS_ACCESS_KEY_ID → Deny",
    dec: "Deny",
  },
];
const CHANGES: React.ReactNode[][] = [
  [
    "12:01:10",
    "iam:DetachRolePolicy",
    "payments-deployer",
    "ec2:* (unused)",
    "removed",
    <span style={{ color: A.accent, cursor: "pointer" }}>Before/after</span>,
  ],
  [
    "11:46:30",
    "iam:UpdateAccessKey",
    "AKIA…7E",
    "active",
    "rotated",
    <span style={{ color: A.accent, cursor: "pointer" }}>Before/after</span>,
  ],
  [
    "09:20:00",
    "s3:PutBucketPolicy",
    "audit-logs-eu",
    "private",
    "kept private",
    <span style={{ color: A.accent, cursor: "pointer" }}>Before/after</span>,
  ],
];
const ACCESS: React.ReactNode[][] = [
  [
    "ci-scanner",
    "IAM roles & policies (read)",
    "Production Cloud",
    "842 objects",
    "12:04:21",
  ],
  [
    "nightly-audit",
    "S3 bucket policies (read)",
    "Sandbox / Dev",
    "37 objects",
    "08:33:02",
  ],
  [
    "Marc Tarek",
    "Finding snapshots (read)",
    "Sentinel Security Workspace",
    "1,203 objects",
    "yesterday",
  ],
];
const REPORTS: React.ReactNode[][] = [
  [
    "SOC 2 — agent action evidence",
    "Q2 2026",
    <Badge text="Ready" tone="ok" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>Export</span>,
  ],
  [
    "ISO 27001 — access & approvals",
    "Q2 2026",
    <Badge text="Ready" tone="ok" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>Export</span>,
  ],
  [
    "Change management evidence",
    "Last 30 days",
    <Badge text="Ready" tone="ok" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>Export</span>,
  ],
];

export default function AcpAudit() {
  const [tab, setTab] = React.useState("Audit ledger");
  const [facet, setFacet] = React.useState<Facet>("All");
  const rows = LEDGER.filter(
    (l) => facet === "All" || l.kind === facet.replace(/s$/, ""),
  );
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1080 }}>
      <PageHeader
        title="Audit"
        sub="Tamper-evident record of everything the agent did and every decision made — hash-chained, so gaps and edits are detectable."
        right={<Badge text="Chain verified ✓" tone="ok" />}
      />
      <SubTabs
        tabs={[
          "Audit ledger",
          "Cloud change evidence",
          "Access evidence",
          "Compliance reports",
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "Audit ledger" && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {(
                ["All", "Actions", "Approvals", "Policy decisions"] as Facet[]
              ).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFacet(f)}
                  style={{
                    height: 28,
                    padding: "0 10px",
                    borderRadius: 99,
                    fontSize: 12,
                    cursor: "pointer",
                    border: `1px solid ${facet === f ? A.accent : A.border}`,
                    background:
                      facet === f ? "rgba(45,134,212,0.12)" : "transparent",
                    color: facet === f ? A.accent : A.textMuted,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                style={{
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid ${A.borderStrong}`,
                  color: A.textSecondary,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Verify integrity
              </button>
              <button
                type="button"
                style={{
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid ${A.borderStrong}`,
                  color: A.textSecondary,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Export
              </button>
            </div>
          </div>
          <Table
            grid="70px 90px 1.2fr 130px 2fr 80px"
            cols={["Seq", "Time", "Actor", "Type", "Entry", "Decision"]}
            rows={rows.map((l) => [
              <span style={{ ...mono, color: A.textMuted }}>#{l.seq}</span>,
              <span style={mono}>{l.ts}</span>,
              l.actor,
              <Badge
                text={l.kind}
                tone={
                  l.kind === "Approval"
                    ? "purple"
                    : l.kind === "Policy decision"
                      ? "info"
                      : "muted"
                }
              />,
              l.entry,
              <Decision d={l.dec} />,
            ])}
          />
        </>
      )}
      {tab === "Cloud change evidence" && (
        <Table
          grid="90px 1.4fr 1.3fr 1.2fr 90px 110px"
          cols={["Time", "Action", "Resource", "From → intent", "Result", ""]}
          rows={CHANGES}
        />
      )}
      {tab === "Access evidence" && (
        <Table
          grid="1.2fr 1.8fr 1.4fr 1fr 90px"
          cols={["Principal", "Data accessed", "Workspace", "Volume", "Time"]}
          rows={ACCESS}
        />
      )}
      {tab === "Compliance reports" && (
        <Table
          grid="2fr 1fr 90px 90px"
          cols={["Report", "Period", "Status", ""]}
          rows={REPORTS}
        />
      )}
    </div>
  );
}

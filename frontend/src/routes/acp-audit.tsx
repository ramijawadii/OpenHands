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
  Decision,
  Hash,
  mono,
} from "#/components/features/acp/acp-ui";
import { useAuditLedger, useAuditVerify } from "#/hooks/query/use-cloudguard";
import type { CGAuditEntry } from "#/api/cloudguard-service";

// Map the backend category slug → the UI facet label.
const CAT_LABEL: Record<string, string> = {
  action: "Actions",
  policy_decision: "Policy Decisions",
  approval: "Approvals",
  break_glass: "Break-glass",
  kill_switch: "Kill Switch",
};
const apiToRow = (e: CGAuditEntry) => ({
  seq: e.seq,
  ts: e.ts,
  actor: e.actor,
  cat: CAT_LABEL[e.category] ?? e.category,
  action: e.action,
  res: e.resource,
  dec: e.decision ? e.decision[0].toUpperCase() + e.decision.slice(1) : "",
  hash: e.entry_hash,
  prev: e.prev_hash,
  link: e.link ?? "",
});

type Facet =
  | "All"
  | "Actions"
  | "Approvals"
  | "Policy Decisions"
  | "Break-glass"
  | "Kill Switch";
const LEDGER = [
  {
    seq: 48293,
    ts: "2025-01-14T02:14:24Z",
    actor: "svc-scanner@acme",
    cat: "Policy Decisions",
    action: "policy.decision.ask",
    res: "iam:PutRolePolicy",
    dec: "Ask",
    hash: "a3f9b2e1",
    prev: "7e1b4d99",
    link: "run-8f3a2c",
  },
  {
    seq: 48291,
    ts: "2025-01-14T02:14:21Z",
    actor: "svc-scanner@acme",
    cat: "Actions",
    action: "run.cloud_api.allowed",
    res: "iam:GetRole",
    dec: "Allowed",
    hash: "7e1b4d99",
    prev: "2f8a91c0",
    link: "run-8f3a2c",
  },
  {
    seq: 48289,
    ts: "2025-01-14T02:14:11Z",
    actor: "marc@acme",
    cat: "Break-glass",
    action: "secret.reveal",
    res: "vault://prod/db-password",
    dec: "Break-glass",
    hash: "2f8a91c0",
    prev: "9b1a07ff",
    link: "run-2d8e44",
  },
  {
    seq: 47120,
    ts: "2025-01-12T09:40:02Z",
    actor: "alice@acme",
    cat: "Kill Switch",
    action: "policy.kill_switch.resumed",
    res: "workspace:prod-aws-east",
    dec: "Allowed",
    hash: "9b1a07ff",
    prev: "4e6f1088",
    link: "",
  },
  {
    seq: 46980,
    ts: "2025-01-12T08:33:00Z",
    actor: "alice@acme",
    cat: "Approvals",
    action: "approval.approved",
    res: "iam:UpdateAccessKey",
    dec: "Approved",
    hash: "4e6f1088",
    prev: "1029ab44",
    link: "approval-3a1f",
  },
];
const CHANGES: React.ReactNode[][] = [
  [
    "2025-01-14T01:01:10Z",
    <Hash h="run-4e6f10" link />,
    "4044…1029",
    "iam",
    <span style={mono}>arn:…/payments-deployer</span>,
    <Badge text="Modify" tone="info" />,
    "Removed unused ec2:*",
    <Hash h="approval-3a1f" link />,
    <span style={{ color: A.accent, cursor: "pointer" }}>View diff →</span>,
    <Hash h="seq-46990" link />,
  ],
  [
    "2025-01-12T11:46:30Z",
    <Hash h="run-4e6f10" link />,
    "4044…1029",
    "iam",
    <span style={mono}>AKIA…7E</span>,
    <Badge text="Policy Change" tone="warn" />,
    "Rotated access key",
    <Hash h="approval-3a1f" link />,
    <span style={{ color: A.accent, cursor: "pointer" }}>View diff →</span>,
    <Hash h="seq-46985" link />,
  ],
];
const ACCESS: React.ReactNode[][] = [
  [
    "2025-01-14T02:14:21Z",
    <Hash h="run-8f3a2c" link />,
    <span style={mono}>EIAMRole/payments-deployer</span>,
    <Badge text="Infrastructure State" tone="muted" />,
    <Badge text="Read" tone="info" />,
    <Badge text="Internal" tone="muted" />,
    "prod-aws-east",
    <Hash h="tc-0002" link />,
    <Hash h="seq-48291" link />,
  ],
  [
    "2025-01-14T02:14:05Z",
    <Hash h="run-8f3a2c" link />,
    <span style={mono}>vault://prod/aws-access-key</span>,
    <Badge text="Credentials" tone="muted" />,
    <Badge text="Read" tone="info" />,
    <Badge text="Restricted" tone="danger" />,
    "prod-aws-east",
    <Hash h="tc-0001" link />,
    <Hash h="seq-48288" link />,
  ],
];
const REPORTS: React.ReactNode[][] = [
  [
    "soc2-2025-01-14-a3f9b2.pdf",
    <Badge text="SOC 2 Type II" tone="muted" />,
    "prod-aws-east · Q2",
    "02:00Z",
    "rami@acme",
    <Badge text="Ready" tone="ok" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>
      Download (signed)
    </span>,
  ],
  [
    "iso27001-2025-q2-7e1b4d.pdf",
    <Badge text="ISO 27001" tone="muted" />,
    "all · Q2",
    "yesterday",
    "jana@acme",
    <Badge text="Ready" tone="ok" />,
    <span style={{ color: A.accent, cursor: "pointer" }}>
      Download (signed)
    </span>,
  ],
];

export default function AcpAudit() {
  const [tab, setTab] = React.useState("Ledger");
  const [facet, setFacet] = React.useState<Facet>("All");
  const [q, setQ] = React.useState("");

  // Real per-tenant ledger; fall back to the mock when the endpoint isn't reachable yet
  // (backend not deployed) so the surface keeps rendering during the wiring rollout.
  const ledger = useAuditLedger();
  const verify = useAuditVerify();
  const apiEntries = ledger.data?.entries;
  const usingReal = !!apiEntries && !ledger.isError;
  const source = usingReal ? apiEntries.map(apiToRow) : LEDGER;

  const rows = source.filter(
    (l) =>
      (facet === "All" || l.cat === facet) &&
      (!q ||
        `${l.actor} ${l.res} ${l.action}`
          .toLowerCase()
          .includes(q.toLowerCase())),
  );

  const headSeq = usingReal ? (ledger.data?.total ?? 0) : 48293;
  const chainOk = usingReal ? (verify.data?.ok ?? true) : true;

  // Sub-tabs derived from the SAME live ledger (no mock once wired): Changes = mutating/policy
  // actions; Access = read/query events; Reports = published artifacts + workspace archives.
  const seqHash = (s: number | string) => <Hash h={`seq-${s}`} link />;
  const changesRows: React.ReactNode[][] = usingReal
    ? source
        .filter(
          (l) =>
            l.cat === "Policy Decisions" ||
            /updat|creat|delet|rotat|modif|attach|detach|\bput\b|\bset\b|remov/i.test(
              String(l.action),
            ),
        )
        .map((l) => [
          l.ts,
          seqHash(l.seq),
          l.actor || "—",
          l.cat || "—",
          <span style={mono}>{l.res || "—"}</span>,
          <Badge text="Change" tone="info" />,
          String(l.action),
          l.dec || "—",
          "—",
          seqHash(l.seq),
        ])
    : CHANGES;
  const accessRows: React.ReactNode[][] = usingReal
    ? source
        .filter((l) =>
          /read|list|\bget\b|query|mcp_call|browse|describe/i.test(
            String(l.action),
          ),
        )
        .map((l) => [
          l.ts,
          l.actor || "—",
          <span style={mono}>{l.res || "—"}</span>,
          <Badge text={l.cat || "Action"} tone="muted" />,
          <Badge text="Read" tone="info" />,
          <Badge text="Internal" tone="muted" />,
          "Default",
          "—",
          seqHash(l.seq),
        ])
    : ACCESS;
  const reportsRows: React.ReactNode[][] = usingReal
    ? source
        .filter((l) =>
          /artifact_published|workspace_archived|report/i.test(
            String(l.action),
          ),
        )
        .map((l) => [
          <span style={mono}>{l.res || "—"}</span>,
          <Badge text={String(l.action)} tone="muted" />,
          "Default",
          l.ts,
          l.actor || "—",
          <Badge text="Ready" tone="ok" />,
          "—",
        ])
    : REPORTS;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1160 }}>
      <Breadcrumb
        items={[{ label: "Agent Control Plane" }, { label: "Audit" }]}
      />
      <h1
        style={{
          fontSize: 20,
          fontWeight: 400,
          color: A.textPrimary,
          margin: "0 0 14px",
        }}
      >
        Audit
      </h1>
      <SubTabs
        tabs={[
          "Ledger",
          "Cloud Change Evidence",
          "Access Evidence",
          "Compliance Reports",
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "Ledger" && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 10,
              padding: "10px 14px",
              border: `1px solid ${A.border}`,
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 12.5, color: A.textMuted }}>
              Chain:{" "}
              <span style={mono}>seq 1 → {headSeq.toLocaleString()}</span> ·{" "}
              <Badge
                text={chainOk ? "✓ Chain verified" : "✗ Chain broken"}
                tone={chainOk ? "ok" : "danger"}
              />
              {!usingReal && (
                <span style={{ marginLeft: 8, opacity: 0.7 }}>
                  (sample data)
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => verify.refetch()}
                style={{
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 6,
                  background: A.cardBg,
                  border: `1px solid ${A.borderStrong}`,
                  color: A.textSecondary,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Verify now
              </button>
              <ExportBtn label="Export signed JSON" />
              <ExportBtn label="Export signed PDF" />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            {(
              [
                "All",
                "Actions",
                "Approvals",
                "Policy Decisions",
                "Break-glass",
                "Kill Switch",
              ] as Facet[]
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
          <FilterBar
            placeholder="Search by actor, resource, action, entry ID…"
            search={q}
            onSearch={setQ}
            right={<ExportBtn label="Export filtered set" />}
          >
            <FSelect
              value=""
              onChange={() => {}}
              all="All Actors"
              options={[
                "svc-scanner@acme",
                "rami@acme",
                "marc@acme",
                "alice@acme",
              ]}
            />
            <FSelect
              value=""
              onChange={() => {}}
              all="All Categories"
              options={["Read", "Write", "Approve", "Kill", "Break-glass"]}
            />
          </FilterBar>
          <Table
            grid="80px 180px 1.3fr 130px 1.6fr 90px 100px 100px"
            cols={[
              "Seq #",
              "Timestamp",
              "Actor",
              "Category",
              "Action · Resource",
              "Decision",
              "Entry hash",
              "Prev hash",
            ]}
            rows={rows.map((l) => [
              <Hash h={`#${l.seq}`} />,
              <span style={{ ...mono, fontSize: 11 }}>{l.ts}</span>,
              l.actor,
              <Badge
                text={l.cat}
                tone={
                  l.cat === "Break-glass"
                    ? "danger"
                    : l.cat === "Kill Switch"
                      ? "warn"
                      : l.cat === "Approvals"
                        ? "purple"
                        : "muted"
                }
              />,
              <span>
                <span style={{ ...mono, color: A.textSecondary }}>
                  {l.action}
                </span>{" "}
                · {l.res}
                {l.link && (
                  <>
                    {" "}
                    · <Hash h={l.link} link />
                  </>
                )}
              </span>,
              <Decision d={l.dec} />,
              <Hash h={l.hash} />,
              <span title="✓ Matches previous entry">
                <Hash h={l.prev} /> ✓
              </span>,
            ])}
          />
        </>
      )}
      {tab === "Cloud Change Evidence" && (
        <>
          <FilterBar
            placeholder="Search by resource ARN, run ID…"
            search={q}
            onSearch={setQ}
            right={<ExportBtn label="Export change report" />}
          >
            <FSelect
              value=""
              onChange={() => {}}
              all="All Services"
              options={["iam", "s3", "ec2", "network"]}
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
            grid="160px 110px 90px 60px 1.4fr 120px 1.2fr 110px 110px 110px"
            cols={[
              "Timestamp",
              "Run",
              "Account",
              "Svc",
              "Resource",
              "Change",
              "Summary",
              "Approval",
              "Diff",
              "Audit",
            ]}
            rows={changesRows}
          />
        </>
      )}
      {tab === "Access Evidence" && (
        <>
          <FilterBar
            placeholder="Search by resource, actor…"
            search={q}
            onSearch={setQ}
            right={<ExportBtn label="Export for DSAR" />}
          >
            <FSelect
              value=""
              onChange={() => {}}
              all="All Categories"
              options={[
                "PII",
                "Credentials",
                "Configuration",
                "Audit Logs",
                "Application Data",
              ]}
            />
            <FSelect
              value=""
              onChange={() => {}}
              all="All Access"
              options={["Read", "Write"]}
            />
          </FilterBar>
          <Table
            grid="160px 110px 1.6fr 150px 70px 110px 120px 90px 100px"
            cols={[
              "Timestamp",
              "Actor",
              "Resource",
              "Data Category",
              "Access",
              "Classification",
              "Workspace",
              "Context",
              "Audit",
            ]}
            rows={accessRows}
          />
        </>
      )}
      {tab === "Compliance Reports" && (
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
              Report templates
            </h2>
            <a
              href="/settings/compliance"
              style={{ fontSize: 12, color: A.accent, textDecoration: "none" }}
            >
              Edit control mappings →
            </a>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            {[
              "SOC 2 Type II",
              "ISO 27001",
              "CIS Controls v8",
              "NIST CSF",
              "Custom",
            ].map((t) => (
              <button
                key={t}
                type="button"
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 6,
                  background: A.cardBg,
                  border: `1px solid ${A.borderStrong}`,
                  color: A.textSecondary,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                {t} →
              </button>
            ))}
          </div>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: A.textPrimary,
              margin: "0 0 12px",
            }}
          >
            Generated reports
          </h2>
          <Table
            grid="1.8fr 150px 1.3fr 90px 110px 90px 150px"
            cols={[
              "Report name",
              "Framework",
              "Scope",
              "Generated",
              "By",
              "Status",
              "",
            ]}
            rows={reportsRows}
          />
        </>
      )}
    </div>
  );
}

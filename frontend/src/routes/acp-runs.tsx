/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unescaped-entities, @typescript-eslint/naming-convention, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, @typescript-eslint/no-unused-vars, react/jsx-key, unused-imports/no-unused-imports, jsx-a11y/label-has-associated-control, radix -- CloudGuard ACP (mock) */
import React from "react";
import {
  A,
  Breadcrumb,
  FilterBar,
  FSelect,
  ExportBtn,
  SubTabs,
  Card,
  H2,
  Badge,
  Mode,
  Sev,
  Decision,
  Hash,
  Table,
  mono,
  Icon,
  primaryBtn,
} from "#/components/features/acp/acp-ui";
import { ConfirmButton } from "#/components/features/settings/settings-kit";

const CHECKPOINTS = [
  {
    id: "ckpt-04",
    step: "Step 4 · before iam:PutRolePolicy",
    t: "02:14:24Z",
    state: "Pending — blocked at approval gate",
    current: true,
  },
  {
    id: "ckpt-03",
    step: "Step 3 · after iam:GetRole",
    t: "02:14:21Z",
    state: "Restorable",
    current: false,
  },
  {
    id: "ckpt-02",
    step: "Step 2 · after env_intel.query",
    t: "02:14:11Z",
    state: "Restorable",
    current: false,
  },
  {
    id: "ckpt-01",
    step: "Step 1 · initial context snapshot",
    t: "02:14:02Z",
    state: "Restorable",
    current: false,
  },
];

interface Run {
  id: string;
  mode: string;
  workspace: string;
  status: string;
  risk: string;
  step: string;
  dur: string;
  cost: string;
  owner: string;
  started: string;
}
const RUNS: Run[] = [
  {
    id: "run-8f3a2c",
    mode: "Supervised",
    workspace: "prod-aws-east",
    status: "Awaiting Approval",
    risk: "Critical",
    step: "Remediate: widen IAM policy",
    dur: "14m 23s",
    cost: "$0.42",
    owner: "svc-scanner@acme",
    started: "14m ago",
  },
  {
    id: "run-2d8e44",
    mode: "Auto",
    workspace: "sentinel-sec",
    status: "Running",
    risk: "Low",
    step: "Scan: CIS benchmark",
    dur: "2m 04s",
    cost: "$0.11",
    owner: "svc-scanner@acme",
    started: "2m ago",
  },
  {
    id: "run-9b1a07",
    mode: "Plan",
    workspace: "sandbox-dev",
    status: "Running",
    risk: "Low",
    step: "Plan: S3 exposure review",
    dur: "8m 41s",
    cost: "$0.06",
    owner: "rami@acme",
    started: "8m ago",
  },
  {
    id: "run-4e6f10",
    mode: "Read-only",
    workspace: "prod-aws-east",
    status: "Completed",
    risk: "Medium",
    step: "Done · 3 changes applied",
    dur: "1h 12m",
    cost: "$0.88",
    owner: "nightly-audit@acme",
    started: "1h ago",
  },
];

const TIMELINE = [
  {
    n: 1,
    t: "2025-01-14T02:14:02Z",
    type: "Model call",
    d: "Plan synthesis from IAM context",
    st: "completed",
    dur: "2.1s",
    rd: "",
  },
  {
    n: 2,
    t: "2025-01-14T02:14:11Z",
    type: "Tool call",
    d: "env_intel.query(scope=iam)",
    st: "completed",
    dur: "120ms",
    rd: "",
  },
  {
    n: 3,
    t: "2025-01-14T02:14:21Z",
    type: "Cloud API",
    d: "aws:iam:GetRole on payments-deployer",
    st: "completed",
    dur: "90ms",
    rd: "",
  },
  {
    n: 4,
    t: "2025-01-14T02:14:24Z",
    type: "Approval gate",
    d: "aws:iam:PutRolePolicy — blocked, needs approval",
    st: "awaiting_approval",
    dur: "—",
    rd: "medium → high ↑",
  },
];
const TRACE = [
  {
    id: "sp-0001",
    name: "agent.loop",
    type: "Internal",
    lat: "—",
    tok: "—",
    cost: "—",
    st: "ok",
    d: 0,
  },
  {
    id: "sp-0002",
    name: "model: plan synthesis",
    type: "Model Call",
    lat: "2.1s",
    tok: "6.2k/1.1k",
    cost: "$0.08",
    st: "ok",
    d: 1,
  },
  {
    id: "sp-0003",
    name: "tool: env_intel.query",
    type: "Tool Call",
    lat: "120ms",
    tok: "—",
    cost: "—",
    st: "ok",
    d: 1,
  },
  {
    id: "sp-0004",
    name: "cloud: iam:GetRole",
    type: "Cloud API",
    lat: "90ms",
    tok: "—",
    cost: "—",
    st: "ok",
    d: 1,
  },
  {
    id: "sp-0005",
    name: "cloud: iam:PutRolePolicy",
    type: "Cloud API",
    lat: "blocked",
    tok: "—",
    cost: "—",
    st: "error",
    d: 1,
  },
];
const latColor = (l: string) =>
  l.includes("ms") && parseInt(l) < 500
    ? A.success
    : l.includes("s") || l === "blocked"
      ? A.warning
      : A.textMuted;
const TOOLS: React.ReactNode[][] = [
  [
    "1",
    <span style={mono}>env_intel.query</span>,
    "{scope:'iam', account:'4044…1029'}",
    "200 · 1 row set",
    <Decision d="Allow" />,
    "120ms",
  ],
  [
    "2",
    <span style={mono}>iam.analyze</span>,
    "{role:'payments-deployer'}",
    "4 findings",
    <Decision d="Allow" />,
    "340ms",
  ],
  [
    "3",
    <span style={mono}>aws_iam_update</span>,
    "{policy_arn:'arn:aws:…', effect:'[REDACTED]'}",
    "held for approval",
    <Decision d="Ask" />,
    "—",
  ],
];
const CLOUD: React.ReactNode[][] = [
  [
    "1",
    "4044…1029",
    "iam",
    "aws:iam:GetRole",
    <span title="arn:aws:iam::4044:role/payments-deployer" style={mono}>
      arn:…/payments-deployer
    </span>,
    <Decision d="Allow" />,
    "—",
    <span style={{ color: A.accent, cursor: "pointer" }}>View diff →</span>,
  ],
  [
    "2",
    "4044…1029",
    "iam",
    "aws:iam:PutRolePolicy",
    <span style={mono}>arn:…/payments-deployer</span>,
    <Decision d="Ask" />,
    <Hash h="approval-7e1b4d" link />,
    <span style={{ color: A.accent, cursor: "pointer" }}>View diff →</span>,
  ],
];
const DATA: React.ReactNode[][] = [
  [
    <span style={mono}>EIAMRole/payments-deployer</span>,
    <Badge text="Knowledge Graph" tone="muted" />,
    <Badge text="Read" tone="info" />,
    "02:14:21Z",
    <Hash h="tc-0002" link />,
  ],
  [
    <span style={mono}>vault://prod/aws-access-key</span>,
    <Badge text="Secret Reference" tone="muted" />,
    <Badge text="Read" tone="info" />,
    "02:14:05Z",
    <Hash h="tc-0001" link />,
  ],
  [
    <span style={mono}>findings/run-8f3a2c.json</span>,
    <Badge text="File" tone="muted" />,
    <Badge text="Write" tone="warn" />,
    "02:14:30Z",
    <Hash h="tc-0004" link />,
  ],
];

export default function AcpRuns() {
  const [sel, setSel] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("Timeline");
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [modeF, setModeF] = React.useState("");
  const run = RUNS.find((r) => r.id === sel);

  if (!run) {
    const rows = RUNS.filter(
      (r) =>
        (!q ||
          `${r.id} ${r.workspace} ${r.owner}`
            .toLowerCase()
            .includes(q.toLowerCase())) &&
        (!status || r.status === status) &&
        (!modeF || r.mode === modeF),
    );
    return (
      <div style={{ padding: "32px 40px", maxWidth: 1120 }}>
        <Breadcrumb
          items={[{ label: "Agent Control Plane" }, { label: "Runs" }]}
        />
        <h1
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: A.textPrimary,
            margin: "0 0 14px",
          }}
        >
          Runs
        </h1>
        <FilterBar
          placeholder="Search by run ID, workspace, owner…"
          search={q}
          onSearch={setQ}
          right={<ExportBtn />}
        >
          <FSelect
            value={status}
            onChange={setStatus}
            all="All Status"
            options={[
              "Running",
              "Paused",
              "Awaiting Approval",
              "Completed",
              "Failed",
            ]}
          />
          <FSelect
            value={modeF}
            onChange={setModeF}
            all="All Modes"
            options={["Auto", "Supervised", "Plan", "Read-only"]}
          />
          <FSelect
            value=""
            onChange={() => {}}
            all="Last 24h"
            options={["6h", "7d", "30d", "Custom"]}
          />
        </FilterBar>
        <div
          className="cg-tablewrap"
          style={{ borderRadius: 8, border: `1px solid ${A.border}` }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "110px 1.1fr 120px 1.5fr 80px 90px 70px 1.1fr 90px 70px",
              padding: "8px 16px",
              borderBottom: `1px solid ${A.border}`,
            }}
          >
            {[
              "Run ID",
              "Workspace",
              "Mode",
              "Current Step / Status",
              "Risk",
              "Duration",
              "Cost",
              "Owner",
              "Started",
              "",
            ].map((c) => (
              <span
                key={c}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: A.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {c}
              </span>
            ))}
          </div>
          {rows.map((r, i) => (
            <div
              key={r.id}
              className="cg-row"
              onClick={() => {
                setSel(r.id);
                setTab("Timeline");
              }}
              title="Open run detail"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "110px 1.1fr 120px 1.5fr 80px 90px 70px 1.1fr 90px 70px",
                padding: "11px 16px",
                borderBottom:
                  i < rows.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <Hash h={r.id} link />
              <span
                style={{
                  fontSize: 12.5,
                  color: A.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.workspace}
              </span>
              <Mode m={r.mode} />
              {r.status === "Running" || r.status === "Awaiting Approval" ? (
                <span
                  style={{
                    fontSize: 12,
                    color: A.textMuted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.step}
                </span>
              ) : (
                <Badge
                  text={r.status}
                  tone={r.status === "Completed" ? "ok" : "danger"}
                />
              )}
              <Sev s={r.risk} />
              <span style={{ fontSize: 12, color: A.textMuted }}>{r.dur}</span>
              <span style={{ fontSize: 12, color: A.textMuted }}>{r.cost}</span>
              <span
                style={{
                  fontSize: 12,
                  color: A.textMuted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.owner}
              </span>
              <span
                title={r.started}
                style={{ fontSize: 12, color: A.textMuted }}
              >
                {r.started}
              </span>
              <span style={{ justifySelf: "end" }}>
                {r.status === "Running" || r.status === "Awaiting Approval" ? (
                  <ConfirmButton
                    variant="link"
                    label="Stop"
                    title={`Stop ${r.id}?`}
                    body="Graceful stop. The agent halts after the current step."
                    confirmLabel="Stop run"
                    onConfirm={() => {}}
                  />
                ) : (
                  <span style={{ fontSize: 12, color: A.textMuted }}>—</span>
                )}
              </span>
            </div>
          ))}
          {rows.length === 0 && (
            <div style={{ padding: 16, fontSize: 12.5, color: A.textMuted }}>
              No runs match these filters. Adjust filters or widen the time
              range.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1120 }}>
      <Breadcrumb
        items={[
          { label: "Agent Control Plane" },
          { label: "Runs", onClick: () => setSel(null) },
          { label: run.id },
        ]}
        status={
          <Badge
            text={`${run.status} · ${run.risk.toLowerCase()} risk`}
            tone={run.status === "Awaiting Approval" ? "warn" : "info"}
          />
        }
      />
      <div
        style={{
          background: A.cardBg,
          border: `1px solid ${A.border}`,
          borderRadius: 10,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Hash h={run.id} />
            <Badge
              text={run.status}
              tone={run.status === "Awaiting Approval" ? "warn" : "info"}
            />
            <Sev s={run.risk} />
            <Mode m={run.mode} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <ExportBtn label="Export Run Evidence" />
            <button
              type="button"
              onClick={() => setTab("Replay")}
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
              View in Audit →
            </button>
            <ConfirmButton
              variant="ghost"
              label="Stop"
              title={`Stop ${run.id}?`}
              body="Graceful stop after the current step."
              confirmLabel="Stop run"
              onConfirm={() => {}}
            />
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: A.textMuted, marginTop: 8 }}>
          Workspace: {run.workspace} · Owner: {run.owner} · Started:{" "}
          {run.started} · Cost: {run.cost} · Steps: 4 / est. 12
        </div>
      </div>

      <SubTabs
        tabs={[
          "Timeline",
          "Trace",
          "Agent Plan",
          "Tool Calls",
          "Cloud API Activity",
          "Prompt & Context",
          "Data Access",
          "Artifacts",
          "Replay",
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "Timeline" && (
        <Table
          grid="40px 180px 110px 2fr 130px 70px 110px"
          cols={[
            "#",
            "Timestamp",
            "Type",
            "Description",
            "Status",
            "Dur",
            "Risk Δ",
          ]}
          rows={TIMELINE.map((e) => [
            String(e.n),
            <span style={{ ...mono, fontSize: 11 }}>{e.t}</span>,
            e.type,
            e.d,
            <Badge text={e.st} tone={e.st === "completed" ? "ok" : "warn"} />,
            e.dur,
            e.rd ? <span style={{ color: A.warning }}>{e.rd}</span> : "—",
          ])}
        />
      )}
      {tab === "Trace" && (
        <Table
          grid="90px 1.8fr 100px 90px 100px 80px 70px"
          cols={[
            "Span ID",
            "Name",
            "Type",
            "Latency",
            "Tokens",
            "Cost",
            "Status",
          ]}
          rows={TRACE.map((s) => [
            <Hash h={s.id} />,
            <span
              style={{
                paddingLeft: s.d * 16,
                color: s.d ? A.textMuted : A.textPrimary,
                ...mono,
              }}
            >
              {s.name}
            </span>,
            <Badge
              text={s.type}
              tone={
                s.type === "Cloud API"
                  ? "info"
                  : s.type === "Model Call"
                    ? "purple"
                    : "muted"
              }
            />,
            <span style={{ color: latColor(s.lat) }}>{s.lat}</span>,
            s.tok,
            s.cost,
            <Badge text={s.st} tone={s.st === "ok" ? "ok" : "danger"} />,
          ])}
        />
      )}
      {tab === "Agent Plan" && (
        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <Badge text="v1 (original)" tone="muted" />
            <span style={{ fontSize: 12.5, color: A.textMuted }}>
              Pending approval · <Hash h="approval-7e1b4d" link />
            </span>
          </div>
          <ol
            style={{
              margin: 0,
              paddingLeft: 18,
              color: A.textSecondary,
              fontSize: 13,
              lineHeight: 1.9,
            }}
          >
            <li>
              Remove unused <span style={mono}>ec2:*</span> from
              payments-deployer · risk low · approval: no —{" "}
              <Decision d="Allow" />
            </li>
            <li>
              Rotate stale access key (90d) · risk medium · approval: yes —{" "}
              <Decision d="Ask" />
            </li>
            <li>
              Add <span style={mono}>s3:*</span> to payments-deployer · risk
              high · approval: yes — <Decision d="Ask" />{" "}
              <span style={{ color: A.danger }}>(blocked)</span>
            </li>
          </ol>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <ConfirmButton
              variant="danger"
              label="Approve Plan"
              title="Approve this plan?"
              body="The agent executes the approved steps; the decision is signed into the audit ledger."
              confirmLabel="Approve & sign"
              onConfirm={() => {}}
              style={primaryBtn}
            />
            <ConfirmButton
              variant="ghost"
              label="Deny Plan"
              title="Deny this plan?"
              body="The run continues with these steps skipped."
              confirmLabel="Deny"
              onConfirm={() => {}}
            />
          </div>
        </Card>
      )}
      {tab === "Tool Calls" && (
        <Table
          grid="50px 1.2fr 1.8fr 1fr 110px 80px"
          cols={["Seq", "Tool", "Args (redacted)", "Result", "Decision", "Dur"]}
          rows={TOOLS}
        />
      )}
      {tab === "Cloud API Activity" && (
        <Table
          grid="40px 100px 70px 1.4fr 1.4fr 90px 120px 100px"
          cols={[
            "Seq",
            "Account",
            "Svc",
            "Action",
            "Resource",
            "Decision",
            "Approval",
            "Diff",
          ]}
          rows={CLOUD}
        />
      )}
      {tab === "Prompt & Context" && (
        <Card>
          <H2 sub="System · User · Injected Context · Full window. Secrets redacted; reveal is Admin break-glass (reason-logged).">
            Context window · 18,412 tokens
          </H2>
          <pre
            style={{
              margin: 0,
              padding: 14,
              background: A.inputBg,
              border: `1px solid ${A.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: A.textSecondary,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >{`[System] CloudGuard remediation agent · mode=Supervised
[User] reduce IAM over-privilege on payments-deployer
[Context] account=4044…1029 region=eu-west-1 resources=842
[Secret] AWS_ACCESS_KEY_ID = [REDACTED: vault://prod/aws-access-key]`}</pre>
          <button
            type="button"
            style={{
              marginTop: 12,
              background: "none",
              border: "none",
              color: A.accent,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Reveal secrets (break-glass) →
          </button>
        </Card>
      )}
      {tab === "Data Access" && (
        <Table
          grid="2fr 150px 80px 120px 90px"
          cols={["Resource", "Data Type", "Access", "Timestamp", "Context"]}
          rows={DATA}
        />
      )}
      {tab === "Artifacts" && (
        <Table
          grid="2fr 90px 80px 120px 130px 90px"
          cols={["Name", "Type", "Size", "Created", "SHA-256", "Storage"]}
          rows={[
            [
              "iam-overprivilege-report.pdf",
              <Badge text="report" tone="muted" />,
              "1.2 MB",
              "02:14:30Z",
              <Hash h="a3f9b2e1c4" />,
              <span style={{ color: A.accent, cursor: "pointer" }}>
                Signed URL
              </span>,
            ],
            [
              "changeset.json",
              <Badge text="diff" tone="muted" />,
              "3 KB",
              "02:14:24Z",
              <Hash h="7e1b4d99af" />,
              <span style={{ color: A.accent, cursor: "pointer" }}>
                Signed URL
              </span>,
            ],
          ]}
        />
      )}
      {tab === "Replay" && (
        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 6,
              background: "rgba(224,154,45,0.1)",
              border: "1px solid rgba(224,154,45,0.3)",
              marginBottom: 14,
              fontSize: 12.5,
              color: A.textSecondary,
            }}
          >
            <Icon name="warn" size={15} color={A.warning} />
            REPLAY MODE — read-only, no side effects · Original
            2025-01-14T02:14Z
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { ic: "skipBack", t: "Jump to start" },
                { ic: "stepBack", t: "Step back" },
                { ic: "stepFwd", t: "Step forward" },
                { ic: "skipFwd", t: "Jump to end" },
              ].map((b) => (
                <button
                  key={b.ic}
                  type="button"
                  title={b.t}
                  aria-label={b.t}
                  style={{
                    height: 32,
                    width: 36,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    background: A.cardBg,
                    border: `1px solid ${A.borderStrong}`,
                    color: A.textSecondary,
                    cursor: "pointer",
                  }}
                >
                  <Icon name={b.ic} size={15} />
                </button>
              ))}
            </div>
            <FSelect
              value="1×"
              onChange={() => {}}
              all="1×"
              options={["2×", "5×"]}
            />
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                color: A.success,
              }}
            >
              <Icon name="check" size={13} color={A.success} />
              Event chain verified
            </span>
          </div>

          <div
            style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: `1px solid ${A.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <Icon name="rollback" size={15} color={A.textSecondary} />
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: A.textPrimary,
                  margin: 0,
                }}
              >
                Rollback checkpoints
              </h3>
            </div>
            <p
              style={{
                fontSize: 12,
                color: A.textMuted,
                margin: "0 0 12px",
                lineHeight: 1.5,
              }}
            >
              Per-step state snapshots. Restoring rewinds the run to a
              checkpoint; the action is reason-logged to the audit ledger.
            </p>
            <div style={{ position: "relative" }}>
              {CHECKPOINTS.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "9px 0",
                    borderBottom:
                      i < CHECKPOINTS.length - 1
                        ? "1px solid var(--cg-border-subtle)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: c.current ? A.warning : A.success,
                    }}
                  />
                  <Hash h={c.id} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: A.textSecondary }}>
                      {c.step}
                    </div>
                    <div style={{ fontSize: 11.5, color: A.textMuted }}>
                      <span style={{ ...mono }}>{c.t}</span> · {c.state}
                    </div>
                  </div>
                  {c.current ? (
                    <Badge text="Current" tone="warn" />
                  ) : (
                    <ConfirmButton
                      variant="ghost"
                      label="Restore"
                      title={`Restore to ${c.id}?`}
                      body={`Rewinds the run to "${c.step}". A reason is required and the rollback is signed into the audit ledger.`}
                      confirmLabel="Restore checkpoint"
                      onConfirm={() => {}}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

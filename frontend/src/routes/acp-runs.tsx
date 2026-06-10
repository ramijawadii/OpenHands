/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unescaped-entities, @typescript-eslint/naming-convention, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, @typescript-eslint/no-unused-vars, react/jsx-key, unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars -- CloudGuard ACP (mock) */
import React from "react";
import {
  A,
  PageHeader,
  SubTabs,
  Card,
  H2,
  Badge,
  Sev,
  Decision,
  Table,
  mono,
} from "#/components/features/acp/acp-ui";
import { ConfirmButton } from "#/components/features/settings/settings-kit";

interface Run {
  id: string;
  mode: string;
  workspace: string;
  status: string;
  risk: string;
  step: string;
  started: string;
}
const RUNS: Run[] = [
  {
    id: "run_8c2f",
    mode: "Ask-first",
    workspace: "Production Cloud",
    status: "Awaiting approval",
    risk: "Critical",
    step: "Remediate: widen IAM policy",
    started: "now",
  },
  {
    id: "run_2d8e",
    mode: "Autonomous",
    workspace: "Sentinel Security Workspace",
    status: "Running",
    risk: "Low",
    step: "Scan: CIS benchmark",
    started: "2m ago",
  },
  {
    id: "run_9b1a",
    mode: "Plan-only",
    workspace: "Sandbox / Dev",
    status: "Running",
    risk: "Low",
    step: "Plan: S3 exposure review",
    started: "8m ago",
  },
  {
    id: "run_4e6f",
    mode: "Ask-first",
    workspace: "Production Cloud",
    status: "Completed",
    risk: "Medium",
    step: "Done · 3 changes applied",
    started: "1h ago",
  },
];

const TIMELINE = [
  {
    t: "12:04:02",
    step: "Run started · Ask-first · actor ci-scanner",
    state: "ok",
  },
  {
    t: "12:04:05",
    step: "Loaded context: AWS Prod (842 resources)",
    state: "ok",
  },
  { t: "12:04:11", step: "Scan: IAM over-privilege — 4 findings", state: "ok" },
  { t: "12:04:19", step: "Proposed plan: 3 remediations", state: "ok" },
  { t: "12:04:21", step: "Tool: iam:GetRole payments-deployer", state: "ok" },
  {
    t: "12:04:24",
    step: "Tool: iam:PutRolePolicy — BLOCKED, needs approval",
    state: "warn",
  },
  { t: "12:04:24", step: "Paused — awaiting human approval", state: "pause" },
];
const TRACE = [
  { span: "agent.loop", kind: "model", lat: "—", tok: "18.4k", cost: "$0.21" },
  {
    span: "↳ tool: env_intel.query",
    kind: "tool",
    lat: "120ms",
    tok: "—",
    cost: "—",
  },
  {
    span: "↳ tool: iam.analyze",
    kind: "tool",
    lat: "340ms",
    tok: "—",
    cost: "—",
  },
  {
    span: "↳ model: plan synthesis",
    kind: "model",
    lat: "2.1s",
    tok: "6.2k",
    cost: "$0.08",
  },
  {
    span: "↳ cloud: iam:GetRole",
    kind: "cloud",
    lat: "90ms",
    tok: "—",
    cost: "—",
  },
  {
    span: "↳ cloud: iam:PutRolePolicy",
    kind: "cloud",
    lat: "blocked",
    tok: "—",
    cost: "—",
  },
];
const TOOLS: React.ReactNode[][] = [
  [
    <span style={mono}>env_intel.query</span>,
    "list IAM roles in 842-resource account",
    <Decision d="Allow" />,
    "200 · 1 row set",
  ],
  [
    <span style={mono}>iam.analyze</span>,
    "score over-privilege on payments-deployer",
    <Decision d="Allow" />,
    "4 findings",
  ],
  [
    <span style={mono}>cloud.iam.PutRolePolicy</span>,
    "add s3:* to payments-deployer",
    <Decision d="Ask" />,
    "held for approval",
  ],
];
const CLOUD: React.ReactNode[][] = [
  ["AWS · 4044…1029", "iam:GetRole", <Decision d="Allow" />, "read-only", "—"],
  [
    "AWS · 4044…1029",
    "iam:ListAttachedRolePolicies",
    <Decision d="Allow" />,
    "read-only",
    "—",
  ],
  [
    "AWS · 4044…1029",
    "iam:PutRolePolicy",
    <Decision d="Ask" />,
    "WRITE",
    "+ s3:* on payments-deployer",
  ],
];
const DATA: React.ReactNode[][] = [
  [
    "Knowledge graph",
    "EAccount, EIAMRole, EIAMPolicy (read)",
    <Decision d="Allow" />,
  ],
  [
    "Secret reference",
    "AWS_ACCESS_KEY_ID (by-ref, never materialized)",
    <Decision d="Allow" />,
  ],
  [
    "Findings store",
    "wrote 4 finding snapshots (encrypted)",
    <Decision d="Allow" />,
  ],
];

export default function AcpRuns() {
  const [sel, setSel] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("Timeline");
  const run = RUNS.find((r) => r.id === sel);

  if (!run) {
    return (
      <div style={{ padding: "32px 40px", maxWidth: 1080 }}>
        <PageHeader
          title="Runs"
          sub="Every agent run, live and historical. Click a run to inspect its full trace, the actions it took, and replay it."
          right={
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: A.textMuted,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: A.success,
                }}
              />{" "}
              streaming · updated 2s ago
            </span>
          }
        />
        <div
          style={{ borderRadius: 8, border: `1px solid ${A.border}` }}
          className="cg-tablewrap"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 120px 1.5fr 1.6fr 130px 80px 90px",
              padding: "8px 16px",
              borderBottom: `1px solid ${A.border}`,
            }}
          >
            {[
              "Run",
              "Mode",
              "Workspace",
              "Current step",
              "Status",
              "Risk",
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
          {RUNS.map((r, i) => (
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
                gridTemplateColumns: "100px 120px 1.5fr 1.6fr 130px 80px 90px",
                padding: "11px 16px",
                borderBottom:
                  i < RUNS.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <span style={{ ...mono, fontSize: 12.5, color: A.accent }}>
                {r.id}
              </span>
              <Badge
                text={r.mode}
                tone={
                  r.mode === "Autonomous"
                    ? "purple"
                    : r.mode === "Plan-only"
                      ? "muted"
                      : "info"
                }
              />
              <span
                style={{
                  fontSize: 13,
                  color: A.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.workspace}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  color: A.textMuted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.step}
              </span>
              <Badge
                text={r.status}
                tone={
                  r.status === "Awaiting approval"
                    ? "warn"
                    : r.status === "Completed"
                      ? "ok"
                      : "info"
                }
              />
              <Sev s={r.risk} />
              <span style={{ justifySelf: "end" }}>
                {r.status === "Running" || r.status === "Awaiting approval" ? (
                  <ConfirmButton
                    variant="link"
                    label="Stop"
                    title={`Stop ${r.id}?`}
                    body="The agent halts immediately and its sandbox session is revoked."
                    confirmLabel="Stop run"
                    onConfirm={() => {}}
                  />
                ) : (
                  <span style={{ fontSize: 12, color: A.textMuted }}>—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1080 }}>
      <button
        type="button"
        onClick={() => setSel(null)}
        style={{
          background: "none",
          border: "none",
          color: A.textMuted,
          fontSize: 12,
          cursor: "pointer",
          padding: 0,
          marginBottom: 12,
        }}
      >
        ← All runs
      </button>
      <PageHeader
        title={run.id}
        sub={`${run.mode} · ${run.workspace} · started ${run.started}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 6,
                background: "transparent",
                border: `1px solid ${A.borderStrong}`,
                color: A.textSecondary,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              Export evidence
            </button>
            <ConfirmButton
              variant="ghost"
              label="Stop run"
              title={`Stop ${run.id}?`}
              body="The agent halts immediately and its sandbox session is revoked."
              confirmLabel="Stop run"
              onConfirm={() => {}}
            />
          </div>
        }
      />
      <div
        style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
      >
        <Badge
          text={`Status: ${run.status}`}
          tone={run.status === "Awaiting approval" ? "warn" : "info"}
        />
        <Badge
          text={`Risk: ${run.risk}`}
          tone={run.risk === "Critical" ? "danger" : "muted"}
        />
        <Badge text="18.4k tokens · $0.29" tone="muted" />
      </div>

      <SubTabs
        tabs={[
          "Timeline",
          "Trace",
          "Agent Plan",
          "Tool Calls",
          "Cloud Activity",
          "Prompt & Context",
          "Data Access",
          "Artifacts",
          "Replay",
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "Timeline" && (
        <div
          style={{
            borderLeft: `2px solid ${A.border}`,
            marginLeft: 6,
            paddingLeft: 18,
          }}
        >
          {TIMELINE.map((e, i) => (
            <div key={i} style={{ position: "relative", paddingBottom: 16 }}>
              <span
                style={{
                  position: "absolute",
                  left: -25,
                  top: 3,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background:
                    e.state === "warn"
                      ? A.warning
                      : e.state === "pause"
                        ? A.danger
                        : A.success,
                }}
              />
              <div style={{ fontSize: 11, color: A.textMuted, ...mono }}>
                {e.t}
              </div>
              <div
                style={{ fontSize: 13, color: A.textSecondary, marginTop: 1 }}
              >
                {e.step}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "Trace" && (
        <Table
          grid="2.2fr 80px 90px 80px 80px"
          cols={["Span", "Kind", "Latency", "Tokens", "Cost"]}
          rows={TRACE.map((s) => [
            <span
              style={{
                ...mono,
                color: s.span.startsWith("↳") ? A.textMuted : A.textPrimary,
              }}
            >
              {s.span}
            </span>,
            <Badge
              text={s.kind}
              tone={
                s.kind === "cloud"
                  ? "info"
                  : s.kind === "model"
                    ? "purple"
                    : "muted"
              }
            />,
            s.lat,
            s.tok,
            s.cost,
          ])}
        />
      )}
      {tab === "Agent Plan" && (
        <Card>
          <H2 sub="The plan the agent proposed. In Ask-first mode it does not execute writes until approved.">
            Proposed plan · 3 steps
          </H2>
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
              Tighten <span style={mono}>payments-deployer</span>: remove unused{" "}
              <span style={mono}>ec2:*</span> (read-only, auto) —{" "}
              <Decision d="Allow" />
            </li>
            <li>
              Rotate stale access key <span style={mono}>AKIA…7E</span> (90d
              old) — <Decision d="Ask" />
            </li>
            <li>
              Add <span style={mono}>s3:*</span> to{" "}
              <span style={mono}>payments-deployer</span> — <Decision d="Ask" />{" "}
              <span style={{ color: A.danger }}>
                (blocked: IAM widening gate)
              </span>
            </li>
          </ol>
        </Card>
      )}
      {tab === "Tool Calls" && (
        <Table
          grid="1.4fr 2fr 110px 1fr"
          cols={["Tool", "Arguments", "Decision", "Result"]}
          rows={TOOLS}
        />
      )}
      {tab === "Cloud Activity" && (
        <Table
          grid="1.3fr 1.4fr 90px 80px 1.6fr"
          cols={["Account", "Action", "Decision", "Type", "Diff"]}
          rows={CLOUD}
        />
      )}
      {tab === "Prompt & Context" && (
        <Card>
          <H2 sub="Secret values are redacted at source; reveal is break-glass (reason-logged).">
            Context window
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
          >{`system: You are CloudGuard's remediation agent. Mode=Ask-first.
context: account=4044…1029 region=eu-west-1 resources=842
secrets: AWS_ACCESS_KEY_ID=••••••••(redacted) [by-reference]
task: reduce IAM over-privilege on payments-deployer`}</pre>
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
            Reveal redacted values (break-glass) →
          </button>
        </Card>
      )}
      {tab === "Data Access" && (
        <Table
          grid="1.2fr 2fr 110px"
          cols={["Source", "What was accessed", "Decision"]}
          rows={DATA}
        />
      )}
      {tab === "Artifacts" && (
        <Table
          grid="2fr 1fr 1fr 90px"
          cols={["Artifact", "Type", "Stored", ""]}
          rows={[
            [
              "IAM over-privilege report",
              "PDF",
              "Encrypted (tenant key)",
              <span style={{ color: A.accent, cursor: "pointer" }}>
                Download
              </span>,
            ],
            [
              "Proposed change set (diff)",
              "JSON",
              "Encrypted (tenant key)",
              <span style={{ color: A.accent, cursor: "pointer" }}>
                Download
              </span>,
            ],
          ]}
        />
      )}
      {tab === "Replay" && (
        <Card>
          <H2 sub="Deterministically re-walk this run from its signed event stream. Read-only — no tools execute, nothing changes.">
            Replay
          </H2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              style={{
                height: 34,
                padding: "0 16px",
                borderRadius: 6,
                background: A.accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              ▶ Start replay
            </button>
            <Badge text="Event chain verified ✓" tone="ok" />
          </div>
        </Card>
      )}
    </div>
  );
}

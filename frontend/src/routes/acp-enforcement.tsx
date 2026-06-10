/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unescaped-entities, @typescript-eslint/naming-convention, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, @typescript-eslint/no-unused-vars, react/jsx-key, unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars -- CloudGuard ACP (mock) */
import React from "react";
import {
  A,
  PageHeader,
  SubTabs,
  Card,
  H2,
  Badge,
  Decision,
  Table,
  mono,
  acpSelect,
  acpOpt,
} from "#/components/features/acp/acp-ui";
import { ConfirmButton } from "#/components/features/settings/settings-kit";

const POLICY = [
  { k: "Default autonomy", v: "Ask-first", link: "/settings/agent-guardrails" },
  {
    k: "Writes require approval",
    v: "Yes",
    link: "/settings/agent-guardrails",
  },
  {
    k: "IAM / delete / cross-account",
    v: "Approval required",
    link: "/settings/agent-guardrails",
  },
  {
    k: "Sandbox egress",
    v: "Allowlist only · metadata blocked",
    link: "/settings/isolation",
  },
  { k: "Key custody", v: "HYOK (AWS KMS)", link: "/settings/encryption" },
  {
    k: "Change window",
    v: "Business hours only",
    link: "/settings/agent-guardrails",
  },
  { k: "Spend gate", v: "$100 / run", link: "/settings/agent-guardrails" },
];

export default function AcpEnforcement() {
  const [tab, setTab] = React.useState("Active policy");
  const [queue, setQueue] = React.useState([
    {
      id: "ap1",
      action: "Add s3:* to role payments-deployer",
      run: "run_8c2f",
      who: "ci-scanner",
      risk: "Critical",
      age: "4m",
    },
    {
      id: "ap2",
      action: "Delete unattached EBS volume vol-0a1b (12 GiB)",
      run: "run_4e6f",
      who: "Rami Sentinel",
      risk: "Medium",
      age: "22m",
    },
  ]);
  const [exceptions] = React.useState([
    {
      rule: "Allow IAM writes for migration",
      scope: "Production Cloud",
      owner: "Jana Doe",
      expires: "in 2 days",
      just: "Q3 IAM consolidation",
    },
  ]);
  const [simRole, setSimRole] = React.useState("Analyst");
  const decide = (id: string) => setQueue((p) => p.filter((q) => q.id !== id));

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1080 }}>
      <PageHeader
        title="Enforcement"
        sub="Operate the policy authored in Settings: see what's in force, clear the approvals queue, simulate changes, grant time-boxed exceptions — and stop the agent."
      />
      <SubTabs
        tabs={[
          "Active policy",
          "Approvals queue",
          "Kill switch",
          "Policy simulation",
          "Exceptions",
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "Active policy" && (
        <>
          <div style={{ marginBottom: 14, fontSize: 12, color: A.textMuted }}>
            Effective policy (org default + overrides). Authoring lives in
            Settings.
          </div>
          <div
            style={{
              border: `1px solid ${A.border}`,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {POLICY.map((p, i) => (
              <div
                key={p.k}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.4fr 150px",
                  padding: "11px 16px",
                  borderBottom:
                    i < POLICY.length - 1
                      ? "1px solid var(--cg-border-subtle)"
                      : "none",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13, color: A.textSecondary }}>
                  {p.k}
                </span>
                <span style={{ fontSize: 13, color: A.textPrimary }}>
                  {p.v}
                </span>
                <a
                  href={p.link}
                  style={{
                    fontSize: 12,
                    color: A.accent,
                    textDecoration: "none",
                    justifySelf: "end",
                  }}
                >
                  Edit in Settings →
                </a>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "Approvals queue" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {queue.map((q) => (
            <Card key={q.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Badge
                      text={q.risk}
                      tone={q.risk === "Critical" ? "danger" : "info"}
                    />
                    <span
                      style={{
                        fontSize: 13.5,
                        color: A.textPrimary,
                        fontWeight: 500,
                      }}
                    >
                      {q.action}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: A.textMuted }}>
                    Run{" "}
                    <span style={{ ...mono, color: A.accent }}>{q.run}</span> ·
                    requested by {q.who} · {q.age} ago
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <ConfirmButton
                    variant="ghost"
                    label="Deny"
                    title="Deny this action?"
                    body="The agent will not perform it and the run continues with the action skipped."
                    confirmLabel="Deny"
                    onConfirm={() => decide(q.id)}
                  />
                  <ConfirmButton
                    variant="danger"
                    label="Approve"
                    title="Approve this action?"
                    body={`The agent will execute: ${q.action}. The decision is signed and recorded in the audit ledger.`}
                    confirmLabel="Approve & sign"
                    onConfirm={() => decide(q.id)}
                    style={{ background: A.accent }}
                  />
                </div>
              </div>
            </Card>
          ))}
          {queue.length === 0 && (
            <div
              style={{
                fontSize: 13,
                color: A.textMuted,
                padding: 16,
                border: `1px dashed ${A.borderStrong}`,
                borderRadius: 8,
                textAlign: "center",
              }}
            >
              Approvals queue is clear.
            </div>
          )}
        </div>
      )}

      {tab === "Kill switch" && (
        <Card style={{ borderLeft: `3px solid ${A.danger}`, maxWidth: 620 }}>
          <H2 sub="Fail-closed: pausing hard-stops the agent and revokes its sandbox sessions & credentials immediately. Use in an emergency.">
            Kill switch
          </H2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--cg-border-subtle)",
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, color: A.textSecondary }}>
                  Pause this run only
                </div>
                <div style={{ fontSize: 12, color: A.textMuted }}>run_8c2f</div>
              </div>
              <ConfirmButton
                variant="ghost"
                label="Stop run"
                title="Stop run_8c2f?"
                body="The run halts and its sandbox is revoked immediately."
                confirmLabel="Stop run"
                onConfirm={() => {}}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--cg-border-subtle)",
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, color: A.textSecondary }}>
                  Freeze workspace
                </div>
                <div style={{ fontSize: 12, color: A.textMuted }}>
                  Production Cloud — no new agent actions
                </div>
              </div>
              <ConfirmButton
                variant="ghost"
                label="Freeze"
                title="Freeze Production Cloud?"
                body="All in-flight runs in this workspace stop; no new runs start until unfrozen."
                confirmLabel="Freeze workspace"
                confirmWord="FREEZE"
                onConfirm={() => {}}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
              }}
            >
              <div>
                <div
                  style={{ fontSize: 13.5, color: A.danger, fontWeight: 600 }}
                >
                  Org-wide kill switch
                </div>
                <div style={{ fontSize: 12, color: A.textMuted }}>
                  Halt every agent run across the organization (two-person
                  rule).
                </div>
              </div>
              <ConfirmButton
                variant="danger"
                label="KILL ALL"
                title="Org-wide kill switch?"
                body="Every agent run across the organization stops immediately and all sandbox credentials are revoked. Requires a second approver to lift."
                confirmLabel="Activate kill switch"
                confirmWord="STOP"
                onConfirm={() => {}}
              />
            </div>
          </div>
        </Card>
      )}

      {tab === "Policy simulation" && (
        <Card style={{ maxWidth: 720 }}>
          <H2 sub="Dry-run a policy change against the last 7 days of runs before you apply it.">
            Simulate a policy change
          </H2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 13, color: A.textMuted }}>If</span>
            <select
              value={simRole}
              onChange={(e) => setSimRole(e.target.value)}
              style={acpSelect}
            >
              {["Analyst", "Security Engineer", "Workspace Admin"].map((r) => (
                <option key={r} value={r} style={acpOpt}>
                  {r}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 13, color: A.textMuted }}>
              were set to{" "}
              <strong style={{ color: A.textSecondary }}>
                Plan-only + deny IAM writes
              </strong>
            </span>
          </div>
          <div
            style={{
              border: `1px solid ${A.border}`,
              borderRadius: 8,
              padding: 14,
              fontSize: 13,
              color: A.textSecondary,
              lineHeight: 1.8,
            }}
          >
            Impact over last 7 days for <strong>{simRole}</strong>:
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              <li>34 runs would have been unaffected (read-only).</li>
              <li>
                <span style={{ color: A.warning }}>6 remediations</span> would
                have been blocked (now plan-only).
              </li>
              <li>
                <span style={{ color: A.danger }}>2 IAM changes</span> would
                have been denied.
              </li>
              <li>No scans or inventory reads affected.</li>
            </ul>
          </div>
          <button
            type="button"
            style={{
              marginTop: 14,
              height: 34,
              padding: "0 14px",
              borderRadius: 6,
              background: A.accent,
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Apply in Settings →
          </button>
        </Card>
      )}

      {tab === "Exceptions" && (
        <>
          <div style={{ marginBottom: 12, fontSize: 12, color: A.textMuted }}>
            Time-boxed, justified, auto-expiring policy exceptions. Every
            exception is logged.
          </div>
          <Table
            grid="1.8fr 1.3fr 1fr 110px 1.4fr"
            cols={["Exception", "Scope", "Owner", "Expires", "Justification"]}
            rows={exceptions.map((e) => [
              e.rule,
              e.scope,
              e.owner,
              <Badge text={e.expires} tone="warn" />,
              e.just,
            ])}
          />
        </>
      )}
    </div>
  );
}

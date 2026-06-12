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
  Sev,
  Decision,
  Hash,
  Table,
  mono,
  acpInput,
  primaryBtn,
} from "#/components/features/acp/acp-ui";
import {
  ConfirmButton,
  Toggle,
} from "#/components/features/settings/settings-kit";
import {
  useApprovals,
  useDecideApproval,
  useKillSwitch,
  useKillActivate,
  useKillResume,
  useGuardrails,
  useIsolation,
  useLimits,
  useOverrides,
  useCreateOverride,
  useRevokeOverride,
} from "#/hooks/query/use-cloudguard";
import type { CGApproval, CGOverride } from "#/api/cloudguard-service";

// UI scope label → backend kill-switch scope.
const KILL_SCOPE: Record<string, string> = {
  "Org-wide": "org",
  Workspace: "workspace:default",
  Run: "run:default",
};

// Map a live approval record → the row shape the queue renders (context is free-form).
const mapApproval = (a: CGApproval) => ({
  id: a.id,
  action: a.command,
  run: String(a.context?.conversation_id ?? a.context?.run ?? "—"),
  ws: String(a.context?.workspace ?? a.context?.ws ?? "—"),
  who: String(a.context?.actor ?? a.context?.owner ?? "—"),
  risk: String(a.context?.risk ?? "Medium"),
  wait: a.created_at ? new Date(a.created_at).toLocaleTimeString() : "—",
});

const POLICY = [
  {
    k: "Autonomy Mode",
    v: "Supervised (prod) · Auto (sandbox)",
    src: "Workspace override",
    link: "/settings/agent-guardrails",
  },
  {
    k: "Action Gates",
    v: "Writes/Delete/IAM/Cross-account → Ask",
    src: "Org default",
    link: "/settings/agent-guardrails",
  },
  {
    k: "Egress Policy",
    v: "Allowlist (12) · metadata blocked",
    src: "Org default",
    link: "/settings/isolation",
  },
  {
    k: "Key Custody",
    v: "HYOK · AWS KMS · 90d rotation",
    src: "Org default",
    link: "/settings/encryption",
  },
  {
    k: "Rate Limits",
    v: "50k tok/run · 100 tools/run · org cap $5k/mo",
    src: "Org default",
    link: "/settings/limits",
  },
  {
    k: "Data Access",
    v: "Secrets by-ref only · KG read+write",
    src: "Org default",
    link: "/settings/data-residency",
  },
];
const OVERRIDES: React.ReactNode[][] = [
  [
    <Hash h="ovr-1a2b" />,
    <span>
      Run <Hash h="run-8f3a2c" link />
    </span>,
    <Badge text="Tighten Mode" tone="info" />,
    "Supervised → Plan-only",
    "jana@acme",
    "End of run",
    <Badge text="Active" tone="ok" />,
    <span style={{ color: A.danger, cursor: "pointer", fontSize: 12 }}>
      Revoke
    </span>,
  ],
  [
    <Hash h="ovr-3c4d" />,
    <span>Workspace prod-aws-east</span>,
    <Badge text="Block Specific Action" tone="info" />,
    "iam:* → deny",
    "rami@acme",
    "in 2 days",
    <Badge text="Active" tone="ok" />,
    <span style={{ color: A.danger, cursor: "pointer", fontSize: 12 }}>
      Revoke
    </span>,
  ],
];

export default function AcpEnforcement() {
  const [tab, setTab] = React.useState("Active Policy");
  const [q, setQ] = React.useState("");
  const [twoPerson, setTwoPerson] = React.useState(false);
  const [killScope, setKillScope] = React.useState("Org-wide");
  const [killReason, setKillReason] = React.useState("");
  const [queue, setQueue] = React.useState([
    {
      id: "approval-7e1b4d",
      action: "iam:PutRolePolicy — add s3:* to payments-deployer",
      run: "run-8f3a2c",
      ws: "prod-aws-east",
      who: "svc-scanner@acme",
      risk: "Critical",
      wait: "14m 32s",
    },
    {
      id: "approval-2f8a91",
      action: "ec2:DeleteVolume vol-0a1b (12 GiB)",
      run: "run-4e6f10",
      ws: "prod-aws-east",
      who: "rami@acme",
      risk: "Medium",
      wait: "22m 04s",
    },
  ]);
  const decideMock = (id: string) =>
    setQueue((p) => p.filter((x) => x.id !== id));

  // Live pending approvals; fall back to the mock queue when the endpoint isn't reachable.
  const approvalsQ = useApprovals();
  const decideMut = useDecideApproval();
  const killQ = useKillSwitch();
  const killActivate = useKillActivate();
  const killResume = useKillResume();
  const killActive = killQ.data?.any_active ?? false;

  // Live effective policy (reads work for any role) → the Active Policy cards.
  const gr = useGuardrails();
  const iso = useIsolation();
  const lim = useLimits();

  const overridesQ = useOverrides();
  const createOverride = useCreateOverride();
  const revokeOverride = useRevokeOverride();
  const overrideRows: React.ReactNode[][] = (overridesQ.data ?? []).map(
    (o: CGOverride) => [
      <Hash h={o.id} />,
      <span>{o.scope}</span>,
      <Badge text={o.type.replace(/_/g, " ")} tone="info" />,
      `${o.original} → ${o.overridden}`,
      o.created_by,
      o.expires,
      <Badge text={o.status} tone="ok" />,
      <span
        onClick={() => revokeOverride.mutate(o.id)}
        style={{ color: A.danger, cursor: "pointer", fontSize: 12 }}
      >
        Revoke
      </span>,
    ],
  );
  const overridesSource =
    overridesQ.data && !overridesQ.isError ? overrideRows : OVERRIDES;
  const livePolicy =
    gr.data && iso.data && lim.data
      ? [
          {
            k: "Autonomy Mode",
            v: gr.data.autonomy_mode,
            src: "Tenant policy",
            link: "/settings/agent-guardrails",
          },
          {
            k: "Action Gates",
            v: Object.entries(gr.data.action_gates)
              .map(([a, d]) => `${a}→${d}`)
              .join(" · "),
            src: "Tenant policy",
            link: "/settings/agent-guardrails",
          },
          {
            k: "Isolation Tier",
            v: iso.data.tier,
            src: "Tenant policy",
            link: "/settings/isolation",
          },
          {
            k: "Egress Policy",
            v: iso.data.egress,
            src: "Tenant policy",
            link: "/settings/isolation",
          },
          {
            k: "Rate Limits",
            v: `${lim.data.tokens_per_run.toLocaleString()} tok/run · ${lim.data.tools_per_run} tools/run · $${lim.data.monthly_spend_cap_usd.toLocaleString()}/mo`,
            src: "Tenant policy",
            link: "/settings/limits",
          },
        ]
      : null;
  const policyCards = livePolicy ?? POLICY;
  const usingRealApprovals = !!approvalsQ.data && !approvalsQ.isError;
  const rows = usingRealApprovals ? approvalsQ.data.map(mapApproval) : queue;
  const onDecide = (id: string, approved: boolean) => {
    if (usingRealApprovals) decideMut.mutate({ id, approved });
    else decideMock(id);
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1120 }}>
      <Breadcrumb
        items={[{ label: "Agent Control Plane" }, { label: "Enforcement" }]}
      />
      <h1
        style={{
          fontSize: 20,
          fontWeight: 400,
          color: A.textPrimary,
          margin: "0 0 14px",
        }}
      >
        Enforcement
      </h1>
      <SubTabs
        tabs={[
          "Active Policy",
          "Per-run Overrides",
          "Approvals",
          "Kill Switch",
          "Simulation",
          "Exceptions",
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "Active Policy" && (
        <>
          <div style={{ marginBottom: 12, fontSize: 12, color: A.textMuted }}>
            Effective policy (org default + overrides). Editing happens only in
            Settings.
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {policyCards.map((p) => (
              <div
                key={p.k}
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
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13.5,
                      color: A.textPrimary,
                      fontWeight: 500,
                    }}
                  >
                    {p.k}
                  </span>
                  <a
                    href={p.link}
                    style={{
                      fontSize: 11.5,
                      color: A.accent,
                      textDecoration: "none",
                    }}
                  >
                    Edit in Settings →
                  </a>
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: A.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  {p.v}
                </div>
                <Badge
                  text={p.src}
                  tone={p.src.includes("override") ? "purple" : "muted"}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "Per-run Overrides" && (
        <>
          <FilterBar
            placeholder="Search by run ID, workspace…"
            search={q}
            onSearch={setQ}
            right={
              <button
                type="button"
                style={primaryBtn}
                onClick={() =>
                  createOverride.mutate({
                    scope: "run:current",
                    type: "tighten_mode",
                    original: "autonomous",
                    overridden: "ask",
                  })
                }
              >
                + New Override
              </button>
            }
          >
            <FSelect
              value=""
              onChange={() => {}}
              all="All Types"
              options={[
                "Tighten Mode",
                "Block Specific Action",
                "Restrict Egress",
                "Reduce Rate Limit",
              ]}
            />
            <FSelect
              value=""
              onChange={() => {}}
              all="All Status"
              options={["Active", "Expired", "Revoked"]}
            />
          </FilterBar>
          <div style={{ marginBottom: 10, fontSize: 12, color: A.textMuted }}>
            Overrides can only <strong>tighten</strong> policy, never loosen it.
          </div>
          <Table
            grid="90px 1.4fr 150px 1.6fr 1fr 110px 90px 80px"
            cols={[
              "Override",
              "Scope",
              "Type",
              "Original → Overridden",
              "Created by",
              "Expires",
              "Status",
              "",
            ]}
            rows={overridesSource}
          />
        </>
      )}

      {tab === "Approvals" && (
        <>
          <FilterBar
            placeholder="Search by approval ID, run ID, command…"
            search={q}
            onSearch={setQ}
            right={<ExportBtn />}
          >
            <FSelect
              value="Pending"
              onChange={() => {}}
              all="Pending"
              options={["Approved", "Denied", "Expired", "Auto-approved"]}
            />
            <FSelect
              value=""
              onChange={() => {}}
              all="All Risk"
              options={["Critical", "High", "Medium", "Low"]}
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
                  "120px 110px 1fr 2fr 80px 90px 100px 120px",
                padding: "8px 16px",
                borderBottom: `1px solid ${A.border}`,
              }}
            >
              {[
                "Approval ID",
                "Run ID",
                "Workspace",
                "Command",
                "Risk",
                "Waiting",
                "HMAC",
                "Actions",
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
            {rows.map((x, i) => (
              <div
                key={x.id}
                className="cg-row"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "120px 110px 1fr 2fr 80px 90px 100px 120px",
                  padding: "11px 16px",
                  borderBottom:
                    i < rows.length - 1
                      ? "1px solid var(--cg-border-subtle)"
                      : "none",
                  alignItems: "center",
                }}
              >
                <Hash h={x.id} />
                <Hash h={x.run} link />
                <span
                  style={{
                    fontSize: 12.5,
                    color: A.textSecondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {x.ws}
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    color: A.textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {x.action}
                </span>
                <Sev s={x.risk} />
                <span style={{ fontSize: 12, color: A.danger }}>{x.wait}</span>
                <Badge text="✓ Verified" tone="ok" />
                <span style={{ display: "flex", gap: 8, justifySelf: "end" }}>
                  <ConfirmButton
                    variant="link"
                    label="Approve"
                    title="Approve this action?"
                    body={`The agent executes: ${x.action}. Signed into the audit ledger.`}
                    confirmLabel="Approve & sign"
                    onConfirm={() => onDecide(x.id, true)}
                    style={{ color: A.success }}
                  />
                  <ConfirmButton
                    variant="link"
                    label="Deny"
                    title="Deny this action?"
                    body="The run continues with the action skipped. Reason required."
                    confirmLabel="Deny"
                    onConfirm={() => onDecide(x.id, false)}
                  />
                </span>
              </div>
            ))}
            {rows.length === 0 && (
              <div style={{ padding: 16, fontSize: 12.5, color: A.textMuted }}>
                No pending approvals. The queue is clear.
              </div>
            )}
          </div>
        </>
      )}

      {tab === "Kill Switch" && (
        <>
          <div
            style={{
              border: `1px solid ${A.border}`,
              borderRadius: 10,
              padding: 20,
              maxWidth: 760,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: killActive ? A.danger : A.success,
                }}
              />
              <span
                style={{ fontSize: 14, color: A.textPrimary, fontWeight: 600 }}
              >
                {killActive ? "KILL SWITCH ACTIVE" : "AGENT RUNNING"}
              </span>
              <span style={{ fontSize: 12.5, color: A.textMuted }}>
                {killActive
                  ? `— ${killQ.data?.active.map((k) => k.scope).join(", ")} halted.`
                  : "— all activity within configured policy."}
              </span>
            </div>
            {killActive && (
              <div style={{ marginBottom: 14 }}>
                {killQ.data?.active.map((k) => (
                  <div
                    key={k.scope}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--cg-border-subtle)",
                    }}
                  >
                    <span style={{ fontSize: 12.5, color: A.textSecondary }}>
                      <strong>{k.scope}</strong> · {k.reason} —{" "}
                      <span style={{ color: A.textMuted }}>{k.actor}</span>
                    </span>
                    <ConfirmButton
                      variant="ghost"
                      label="Resume"
                      title={`Resume ${k.scope}?`}
                      body="Lifts the halt for this scope. A reason is required and logged to the audit ledger."
                      confirmLabel="Resume"
                      onConfirm={() =>
                        killResume.mutate({
                          scope: k.scope,
                          reason: "resumed from console",
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{ fontSize: 12, color: A.textMuted, marginBottom: 6 }}
              >
                Scope
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["Org-wide", "Workspace", "Run"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setKillScope(s)}
                    style={{
                      height: 32,
                      padding: "0 14px",
                      borderRadius: 6,
                      fontSize: 12.5,
                      cursor: "pointer",
                      border: `1px solid ${killScope === s ? A.accent : A.border}`,
                      background:
                        killScope === s
                          ? "rgba(45,134,212,0.12)"
                          : "transparent",
                      color: killScope === s ? A.accent : A.textMuted,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div
                style={{ fontSize: 12, color: A.textMuted, marginBottom: 6 }}
              >
                Reason (required)
              </div>
              <input
                value={killReason}
                onChange={(e) => setKillReason(e.target.value)}
                placeholder="Why are you activating the kill switch?"
                style={{ ...acpInput, width: "100%", height: 36 }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <ConfirmButton
                variant="danger"
                label="⛔ ACTIVATE KILL SWITCH"
                title={`Activate ${killScope} kill switch?`}
                body="The agent loop hard-stops at the current step, sandbox credentials are revoked, and pending approvals are expired. Logged to the audit ledger."
                confirmLabel="Activate"
                confirmWord="STOP"
                disabled={!killReason.trim()}
                disabledReason="Enter a reason first"
                onConfirm={() =>
                  killActivate.mutate({
                    scope: KILL_SCOPE[killScope] ?? "org",
                    reason: killReason,
                  })
                }
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5,
                  color: A.textSecondary,
                }}
              >
                Two-person rule{" "}
                <Toggle
                  on={twoPerson}
                  onChange={setTwoPerson}
                  label="two-person"
                />
              </label>
            </div>
          </div>
          <H2>Kill switch history</H2>
          <Table
            grid="100px 110px 1fr 1.4fr 90px 110px 90px"
            cols={[
              "Event",
              "Scope",
              "Actor",
              "Reason",
              "Duration",
              "Timestamp",
              "Audit",
            ]}
            rows={[
              [
                "Resumed",
                "Workspace",
                "alice@acme",
                "False alarm — anomaly cleared",
                "12m",
                "Jan 12 09:40",
                <Hash h="seq-47120" link />,
              ],
            ]}
          />
        </>
      )}

      {tab === "Simulation" && (
        <Card style={{ maxWidth: 760 }}>
          <H2 sub="Dry-run a policy change against recent runs. No side effects.">
            Policy simulation
          </H2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <FSelect
              value="Analyst"
              onChange={() => {}}
              all="Analyst"
              options={["Security Engineer", "Workspace Admin"]}
            />
            <span style={{ fontSize: 13, color: A.textMuted }}>
              → Plan-only + deny IAM, against
            </span>
            <FSelect
              value="Last 50 runs"
              onChange={() => {}}
              all="Last 50 runs"
              options={["Last 10 runs", "Last 7 days"]}
            />
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 6,
              background: "rgba(45,134,212,0.08)",
              border: `1px solid ${A.border}`,
              fontSize: 12.5,
              color: A.textSecondary,
              marginBottom: 12,
            }}
          >
            47 runs analyzed · 12 affected ·{" "}
            <span style={{ color: A.danger }}>8 newly blocked</span> ·{" "}
            <span style={{ color: A.success }}>4 newly allowed</span>
          </div>
          <Table
            grid="110px 1fr 130px 130px 120px 1fr"
            cols={[
              "Run ID",
              "Workspace",
              "Current",
              "Simulated",
              "Δ Change",
              "Affected step",
            ]}
            rows={[
              [
                <Hash h="run-8f3a2c" link />,
                "prod-aws-east",
                <Decision d="Ask" />,
                <Decision d="Deny" />,
                <Badge text="Now blocked" tone="danger" />,
                "step 4: iam write",
              ],
              [
                <Hash h="run-9b1a07" link />,
                "sandbox-dev",
                <Decision d="Deny" />,
                <Decision d="Allow" />,
                <Badge text="⚠ Now allowed" tone="warn" />,
                "step 2: s3 read",
              ],
            ]}
          />
        </Card>
      )}

      {tab === "Exceptions" && (
        <>
          <FilterBar
            placeholder="Search by exception ID, rule…"
            search={q}
            onSearch={setQ}
            right={
              <button type="button" style={primaryBtn}>
                + New Exception
              </button>
            }
          >
            <FSelect
              value=""
              onChange={() => {}}
              all="All Status"
              options={["Active", "Expiring Soon", "Expired", "Revoked"]}
            />
          </FilterBar>
          <Table
            grid="100px 1.4fr 1.6fr 1fr 1fr 140px 90px"
            cols={[
              "Exception",
              "Rule / Capability",
              "Justification",
              "Owner",
              "Approved by",
              "Valid until",
              "Status",
            ]}
            rows={[
              [
                <Hash h="exc-9a1f" />,
                <Hash h="rule-iam-write" link />,
                "Q3 IAM consolidation migration",
                "Platform",
                "rami@acme",
                <Badge text="Expires in 6h 14m" tone="warn" />,
                <Badge text="Active" tone="ok" />,
              ],
            ]}
          />
        </>
      )}
    </div>
  );
}

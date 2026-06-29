/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- CloudGuard Runtime Governance (§9 / §31) */
import React from "react";
import { Info, Siren, Play, Plus, X, Trash2 } from "lucide-react";
import {
  useGuardrails,
  useIsolation,
  useLimits,
  useSaveGuardrails,
  useSaveIsolation,
  useSaveLimits,
  useCloudGuardSession,
  useOverrides,
  useApprovals,
  useKillSwitch,
  useKillActivate,
  useKillResume,
} from "#/hooks/query/use-cloudguard";
import {
  Page,
  PageHeader,
  InheritedField,
  ScopeBadge,
  SaveBar,
  LiveCardSkeleton,
  Tabs,
  Card,
  StatRow,
  KVGrid,
  SampleBanner,
  SampleTag,
  DirectoryTable,
  ConfirmButton,
  HeaderButton,
  EnforcementPill,
  FloorBadge,
  Select,
  T,
  type EffectiveValue,
  type PolicyValue,
  type Column,
  useTabParam,
} from "#/components/admin/admin-kit";
import type { CGOverride } from "#/api/cloudguard-service";

/**
 * Runtime Governance — full §9 / §31, every sub-area operable.
 *
 * Live: Policy (autonomy/gates/isolation/limits + PUT), Exceptions (overrides), Approval queue,
 * Emergency (kill-switch). Execution boundaries, approval-rule builder, risk limits, change-window
 * scheduler, policy simulation and the enforcement board run on representative state (tagged
 * `Sample`) but are fully interactive — editors, rule builders, a real simulate-and-diff — so the
 * workflows are real to operate; they bind to the precedence engine (F2/F3) when it lands.
 */

const TABS = [
  { id: "policy", label: "Policy" },
  { id: "boundaries", label: "Execution Boundaries" },
  { id: "approvals", label: "Approval Rules" },
  { id: "risk", label: "Risk & Blast-Radius" },
  { id: "change", label: "Change Control" },
  { id: "exceptions", label: "Exceptions" },
  { id: "simulation", label: "Simulation" },
  { id: "enforcement", label: "Enforcement" },
  { id: "emergency", label: "Emergency" },
];

export function RuntimeGovernancePage({
  scope,
}: {
  scope: "workspace" | "enterprise";
}) {
  const session = useCloudGuardSession();
  const canEdit = session.can("admin");
  const [tab, setTab] = useTabParam("policy");
  return (
    <Page>
      <PageHeader
        title="Runtime Governance"
        subtitle={
          scope === "workspace"
            ? "Autonomy, gates, isolation, approvals, risk limits and emergency controls for this workspace."
            : "Organization-default governance. Workspaces may strengthen these, never weaken them."
        }
        actions={
          <ScopeBadge
            scope={scope === "workspace" ? "This workspace" : "Organization"}
          />
        }
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "policy" && <PolicyTab canEdit={canEdit} />}
      {tab === "boundaries" && <BoundariesTab canEdit={canEdit} />}
      {tab === "approvals" && <ApprovalRulesTab canEdit={canEdit} />}
      {tab === "risk" && <RiskTab canEdit={canEdit} />}
      {tab === "change" && <ChangeControlTab canEdit={canEdit} />}
      {tab === "exceptions" && <ExceptionsTab canEdit={canEdit} />}
      {tab === "simulation" && <SimulationTab />}
      {tab === "enforcement" && <EnforcementTab canEdit={canEdit} />}
      {tab === "emergency" && <EmergencyTab scope={scope} canEdit={canEdit} />}
    </Page>
  );
}

// ════════════ Policy (LIVE) ════════════
type Form = {
  g: { autonomy_mode: string; action_gates: Record<string, string> };
  i: { tier: string; egress: string };
  l: {
    tokens_per_run: number;
    tools_per_run: number;
    monthly_spend_cap_usd: number;
  };
};
const AUTONOMY = [
  { v: "autonomous", label: "Autonomous" },
  { v: "ask", label: "Ask first" },
  { v: "plan", label: "Plan only" },
];
const GATE = [
  { v: "autonomous", label: "Allow" },
  { v: "ask", label: "Ask" },
  { v: "plan", label: "Plan only" },
];
const TIER = [
  { v: "Elevated", label: "Elevated" },
  { v: "Standard", label: "Standard" },
  { v: "Isolated", label: "Isolated" },
];
const EGRESS = [
  { v: "open", label: "Open" },
  { v: "allowlist", label: "Allowlist" },
  { v: "deny-all", label: "Deny all" },
];
const GATE_KEYS = [
  {
    key: "writes",
    label: "Write actions",
    hint: "Create / update cloud resources",
  },
  {
    key: "delete",
    label: "Delete actions",
    hint: "Destroy resources — highest blast radius",
  },
  {
    key: "iam",
    label: "IAM changes",
    hint: "Identity, roles and permission edits",
  },
  {
    key: "cross_account",
    label: "Cross-account actions",
    hint: "Actions spanning account / subscription boundaries",
  },
];
function ev(value: PolicyValue): EffectiveValue {
  return {
    key: "",
    effective: value,
    direct: { level: "workspace", value },
    inherited: null,
    overridePermitted: true,
    mandatoryFloor: null,
  };
}
function PolicyTab({ canEdit }: { canEdit: boolean }) {
  const g = useGuardrails();
  const iso = useIsolation();
  const lim = useLimits();
  const saveG = useSaveGuardrails();
  const saveI = useSaveIsolation();
  const saveL = useSaveLimits();
  const ready = !!g.data && !!iso.data && !!lim.data;
  const [form, setForm] = React.useState<Form | null>(null);
  const [baseline, setBaseline] = React.useState<Form | null>(null);
  const [savedAt, setSavedAt] = React.useState<number | undefined>();
  React.useEffect(() => {
    if (ready && !form) {
      const snap: Form = {
        g: {
          autonomy_mode: g.data!.autonomy_mode,
          action_gates: { ...g.data!.action_gates },
        },
        i: { tier: iso.data!.tier, egress: iso.data!.egress },
        l: {
          tokens_per_run: lim.data!.tokens_per_run,
          tools_per_run: lim.data!.tools_per_run,
          monthly_spend_cap_usd: lim.data!.monthly_spend_cap_usd,
        },
      };
      setForm(snap);
      setBaseline(snap);
    }
  }, [ready, form, g.data, iso.data, lim.data]);
  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(baseline);
  const saving = saveG.isPending || saveI.isPending || saveL.isPending;
  const onSave = async () => {
    if (!form || !baseline) return;
    const tasks: Promise<unknown>[] = [];
    if (JSON.stringify(form.g) !== JSON.stringify(baseline.g))
      tasks.push(saveG.mutateAsync(form.g));
    if (JSON.stringify(form.i) !== JSON.stringify(baseline.i))
      tasks.push(saveI.mutateAsync(form.i));
    if (JSON.stringify(form.l) !== JSON.stringify(baseline.l))
      tasks.push(saveL.mutateAsync(form.l));
    await Promise.all(tasks);
    setBaseline(form);
    setSavedAt(Date.now());
  };
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 9,
          alignItems: "flex-start",
          padding: "11px 14px",
          borderRadius: 10,
          border: `1px solid ${T.border}`,
          background: T.cardBg,
          marginBottom: 18,
        }}
      >
        <Info
          size={15}
          color={T.accent}
          style={{ marginTop: 1, flexShrink: 0 }}
        />
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
          Values resolve at this scope today. Enterprise inheritance and
          mandatory floors activate when the precedence engine ships.
          {!canEdit && (
            <span style={{ color: T.warning }}>
              {" "}
              You have read-only access — editing requires the Admin capability.
            </span>
          )}
        </div>
      </div>
      {!ready || !form ? (
        <LiveCardSkeleton lines={6} />
      ) : (
        <>
          <Card
            title="Autonomy & action gates"
            desc="What an agent may do before a human is asked."
          >
            <InheritedField label="Autonomy mode" ev={ev(form.g.autonomy_mode)}>
              <Segmented
                options={AUTONOMY}
                value={form.g.autonomy_mode}
                disabled={!canEdit}
                onChange={(v) =>
                  setForm({ ...form, g: { ...form.g, autonomy_mode: v } })
                }
              />
            </InheritedField>
            {GATE_KEYS.map((gk) => (
              <InheritedField
                key={gk.key}
                label={gk.label}
                hint={gk.hint}
                ev={ev(form.g.action_gates[gk.key] ?? "ask")}
              >
                <Segmented
                  options={GATE}
                  value={form.g.action_gates[gk.key] ?? "ask"}
                  disabled={!canEdit}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      g: {
                        ...form.g,
                        action_gates: { ...form.g.action_gates, [gk.key]: v },
                      },
                    })
                  }
                />
              </InheritedField>
            ))}
          </Card>
          <Card
            title="Isolation & egress"
            desc="Sandbox containment tier and outbound network policy."
          >
            <InheritedField label="Isolation tier" ev={ev(form.i.tier)}>
              <Segmented
                options={TIER}
                value={form.i.tier}
                disabled={!canEdit}
                onChange={(v) =>
                  setForm({ ...form, i: { ...form.i, tier: v } })
                }
              />
            </InheritedField>
            <InheritedField label="Network egress" ev={ev(form.i.egress)}>
              <Segmented
                options={EGRESS}
                value={form.i.egress}
                disabled={!canEdit}
                onChange={(v) =>
                  setForm({ ...form, i: { ...form.i, egress: v } })
                }
              />
            </InheritedField>
          </Card>
          <Card
            title="Rate & spend limits"
            desc="Hard ceilings per run and per month."
          >
            <InheritedField
              label="Tokens per run"
              ev={ev(form.l.tokens_per_run)}
            >
              <NumberInput
                value={form.l.tokens_per_run}
                disabled={!canEdit}
                onChange={(n) =>
                  setForm({ ...form, l: { ...form.l, tokens_per_run: n } })
                }
              />
            </InheritedField>
            <InheritedField
              label="Tool calls per run"
              ev={ev(form.l.tools_per_run)}
            >
              <NumberInput
                value={form.l.tools_per_run}
                disabled={!canEdit}
                onChange={(n) =>
                  setForm({ ...form, l: { ...form.l, tools_per_run: n } })
                }
              />
            </InheritedField>
            <InheritedField
              label="Monthly spend cap (USD)"
              ev={ev(`$${form.l.monthly_spend_cap_usd.toLocaleString()}`)}
            >
              <NumberInput
                value={form.l.monthly_spend_cap_usd}
                disabled={!canEdit}
                prefix="$"
                onChange={(n) =>
                  setForm({
                    ...form,
                    l: { ...form.l, monthly_spend_cap_usd: n },
                  })
                }
              />
            </InheritedField>
          </Card>
          {canEdit && (
            <SaveBar
              dirty={dirty}
              saving={saving}
              savedAt={savedAt}
              onSave={onSave}
              onDiscard={() => setForm(baseline)}
            />
          )}
        </>
      )}
    </>
  );
}

// ════════════ §9.2 Execution Boundaries — editable ════════════
const ALL_PROVIDERS = ["AWS", "Azure", "GCP", "Kubernetes", "On-premise"];
const ALL_RES = [
  "Compute",
  "IAM",
  "Storage",
  "Network",
  "Database",
  "Serverless",
];
function BoundariesTab({ canEdit }: { canEdit: boolean }) {
  const seed = {
    providers: ["AWS", "Azure", "GCP"],
    resourceTypes: ["Compute", "IAM", "Storage", "Network"],
    prohibitedOps: ["DeleteOrganization", "PutOrgPolicy", "LeaveOrganization"],
    maxAffected: 25,
    maxDeletion: 5,
    requireRollback: true,
  };
  const [f, setF] = React.useState(seed);
  const [base, setBase] = React.useState(seed);
  const [newOp, setNewOp] = React.useState("");
  const dirty = JSON.stringify(f) !== JSON.stringify(base);
  return (
    <>
      <SampleBanner what="Execution boundary policy" />
      <Card
        title="Allowed providers & resource types"
        desc="Toggle which clouds and resource types agents may operate on."
      >
        <Field label="Allowed cloud providers">
          <Chips
            all={ALL_PROVIDERS}
            value={f.providers}
            disabled={!canEdit}
            onChange={(v) => setF({ ...f, providers: v })}
          />
        </Field>
        <Field label="Allowed resource types">
          <Chips
            all={ALL_RES}
            value={f.resourceTypes}
            disabled={!canEdit}
            onChange={(v) => setF({ ...f, resourceTypes: v })}
          />
        </Field>
      </Card>
      <Card
        title="Prohibited operations"
        desc="API operations that are always blocked, regardless of autonomy."
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "8px 0",
          }}
        >
          {f.prohibitedOps.map((op) => (
            <span
              key={op}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: T.danger,
                background: "var(--cg-danger-bg)",
                border: `1px solid var(--cg-danger-border)`,
                borderRadius: 99,
                padding: "3px 10px",
              }}
            >
              {op}
              {canEdit && (
                <button
                  type="button"
                  onClick={() =>
                    setF({
                      ...f,
                      prohibitedOps: f.prohibitedOps.filter((x) => x !== op),
                    })
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    color: T.danger,
                    cursor: "pointer",
                    padding: 0,
                    display: "inline-flex",
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 8, padding: "6px 0" }}>
            <input
              value={newOp}
              onChange={(e) => setNewOp(e.target.value)}
              placeholder="Add prohibited operation…"
              style={{ ...inp, width: 280 }}
            />
            <HeaderButton
              icon={<Plus size={14} />}
              disabled={!newOp.trim()}
              onClick={() => {
                setF({
                  ...f,
                  prohibitedOps: [...f.prohibitedOps, newOp.trim()],
                });
                setNewOp("");
              }}
            >
              Add
            </HeaderButton>
          </div>
        )}
      </Card>
      <Card title="Blast-radius ceilings (§9.4)">
        <NumRow
          label="Maximum affected resources / action"
          value={f.maxAffected}
          disabled={!canEdit}
          onChange={(n) => setF({ ...f, maxAffected: n })}
          floor="Enterprise ≤ 50"
        />
        <NumRow
          label="Maximum deletion count / action"
          value={f.maxDeletion}
          disabled={!canEdit}
          onChange={(n) => setF({ ...f, maxDeletion: n })}
          floor="Enterprise ≤ 10"
        />
        <ToggleRow
          label="Require rollback plan for write/delete"
          on={f.requireRollback}
          disabled={!canEdit}
          onChange={(v) => setF({ ...f, requireRollback: v })}
        />
      </Card>
      {canEdit && (
        <SaveBar
          dirty={dirty}
          onSave={() => setBase(f)}
          onDiscard={() => setF(base)}
        />
      )}
    </>
  );
}

// ════════════ §9.3 Approval Rules — rule builder + live queue ════════════
interface ApprRule {
  id: string;
  when: string;
  approvers: number;
  roles: string;
  sod: boolean;
  ticket: boolean;
}
function ApprovalRulesTab({ canEdit }: { canEdit: boolean }) {
  const approvals = useApprovals("pending");
  const pending = approvals.data?.length ?? 0;
  const [rules, setRules] = React.useState<ApprRule[]>([
    {
      id: "1",
      when: "Delete actions (any)",
      approvers: 2,
      roles: "Security Engineer + Resource owner",
      sod: true,
      ticket: true,
    },
    {
      id: "2",
      when: "IAM changes in Production",
      approvers: 2,
      roles: "Security Admin",
      sod: true,
      ticket: true,
    },
    {
      id: "3",
      when: "Cross-account actions",
      approvers: 1,
      roles: "Workspace Admin",
      sod: false,
      ticket: false,
    },
  ]);
  const [adding, setAdding] = React.useState(false);
  const cols: Column<ApprRule>[] = [
    {
      key: "w",
      header: "When",
      sortValue: (r) => r.when,
      render: (r) => <span style={{ color: T.textPrimary }}>{r.when}</span>,
    },
    {
      key: "a",
      header: "Approvers",
      sortValue: (r) => r.approvers,
      render: (r) => r.approvers,
    },
    {
      key: "r",
      header: "Required roles",
      render: (r) => <span style={{ color: T.textMuted }}>{r.roles}</span>,
    },
    { key: "sod", header: "SoD", render: (r) => (r.sod ? "Required" : "—") },
    {
      key: "t",
      header: "Ticket",
      render: (r) => (r.ticket ? "Required" : "—"),
    },
  ];
  return (
    <>
      <Card
        title="Approval queue"
        desc="Live pending approvals awaiting a human decision."
        right={
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: pending > 0 ? T.warning : T.success,
            }}
          >
            {approvals.isLoading ? "…" : pending} pending
          </span>
        }
      >
        <StatRow
          label="Open approval requests"
          value={approvals.isLoading ? "…" : String(pending)}
          tone={pending > 0 ? "warn" : "ok"}
          hint="Decide these in Enforcement → Approvals (HMAC-signed)."
        />
      </Card>
      <SampleBanner what="Approval rule configuration" />
      <Card
        title="Approval rules"
        desc="When an action requires human approval, and from whom."
        right={
          canEdit ? (
            <HeaderButton
              icon={<Plus size={14} />}
              variant="primary"
              onClick={() => setAdding(true)}
            >
              Add rule
            </HeaderButton>
          ) : undefined
        }
      >
        <DirectoryTable
          columns={cols}
          rows={rules}
          pageSize={10}
          rowActions={
            canEdit
              ? (r) => (
                  <ConfirmButton
                    variant="link"
                    label={<Trash2 size={13} color={T.danger} />}
                    title="Delete rule"
                    body={`Remove approval rule "${r.when}"?`}
                    confirmLabel="Delete"
                    onConfirm={() =>
                      setRules((rs) => rs.filter((x) => x.id !== r.id))
                    }
                  />
                )
              : undefined
          }
        />
      </Card>
      {adding && (
        <RuleModal
          onClose={() => setAdding(false)}
          onSave={(r) => {
            setRules((rs) => [...rs, { ...r, id: `r${Date.now()}` }]);
            setAdding(false);
          }}
        />
      )}
    </>
  );
}
function RuleModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (r: Omit<ApprRule, "id">) => void;
}) {
  const [when, setWhen] = React.useState("Delete actions (any)");
  const [approvers, setApprovers] = React.useState(2);
  const [roles, setRoles] = React.useState("Security Engineer");
  const [sod, setSod] = React.useState(true);
  const [ticket, setTicket] = React.useState(true);
  return (
    <Modal
      title="Add approval rule"
      onClose={onClose}
      footer={
        <HeaderButton
          variant="primary"
          onClick={() => onSave({ when, approvers, roles, sod, ticket })}
        >
          Add rule
        </HeaderButton>
      }
    >
      <Field label="When (action class / scope)">
        <Sel
          value={when}
          onChange={setWhen}
          opts={[
            "Delete actions (any)",
            "IAM changes in Production",
            "Cross-account actions",
            "Resource criticality: Critical",
            "Any production write",
          ]}
        />
      </Field>
      <Field label="Minimum approvers">
        <input
          type="number"
          min={1}
          max={5}
          value={approvers}
          onChange={(e) => setApprovers(Number(e.target.value) || 1)}
          style={{ ...inp, width: 110 }}
        />
      </Field>
      <Field label="Required approver roles">
        <input
          value={roles}
          onChange={(e) => setRoles(e.target.value)}
          style={inp}
        />
      </Field>
      <ToggleRow
        label="Separation of duties (requester ≠ approver)"
        on={sod}
        onChange={setSod}
      />
      <ToggleRow
        label="Require change ticket"
        on={ticket}
        onChange={setTicket}
      />
    </Modal>
  );
}

// ════════════ §9.4 Risk & Blast-Radius — editable ════════════
function RiskTab({ canEdit }: { canEdit: boolean }) {
  const seed = {
    maxResources: 25,
    maxAccounts: 3,
    maxRegions: 2,
    maxUsers: 50,
    downtimeMin: 5,
    financialUsd: 10000,
  };
  const [f, setF] = React.useState(seed);
  const [base, setBase] = React.useState(seed);
  const dirty = JSON.stringify(f) !== JSON.stringify(base);
  return (
    <>
      <SampleBanner what="Risk & blast-radius limits" />
      <Card
        title="Blast-radius limits"
        desc="Above any of these, an action is blocked or escalated."
      >
        <NumRow
          label="Max affected resources"
          value={f.maxResources}
          disabled={!canEdit}
          onChange={(n) => setF({ ...f, maxResources: n })}
        />
        <NumRow
          label="Max accounts"
          value={f.maxAccounts}
          disabled={!canEdit}
          onChange={(n) => setF({ ...f, maxAccounts: n })}
        />
        <NumRow
          label="Max regions"
          value={f.maxRegions}
          disabled={!canEdit}
          onChange={(n) => setF({ ...f, maxRegions: n })}
        />
        <NumRow
          label="Max users impacted"
          value={f.maxUsers}
          disabled={!canEdit}
          onChange={(n) => setF({ ...f, maxUsers: n })}
        />
      </Card>
      <Card title="Impact thresholds → escalation">
        <NumRow
          label="Estimated downtime ceiling (min) → approval"
          value={f.downtimeMin}
          disabled={!canEdit}
          onChange={(n) => setF({ ...f, downtimeMin: n })}
        />
        <NumRow
          label="Estimated financial impact (USD) → exec approval"
          value={f.financialUsd}
          disabled={!canEdit}
          prefix="$"
          onChange={(n) => setF({ ...f, financialUsd: n })}
        />
        <StatRow
          label="Admin/root privilege change"
          value="Blocked"
          tone="danger"
          sample
        />
        <StatRow
          label="New public network exposure"
          value="Blocked"
          tone="danger"
          sample
        />
      </Card>
      {canEdit && (
        <SaveBar
          dirty={dirty}
          onSave={() => setBase(f)}
          onDiscard={() => setF(base)}
        />
      )}
    </>
  );
}

// ════════════ §9.5 Change Control — window scheduler ════════════
interface Win {
  id: string;
  label: string;
  kind: "maintenance" | "blackout";
}
function ChangeControlTab({ canEdit }: { canEdit: boolean }) {
  const [wins, setWins] = React.useState<Win[]>([
    { id: "1", label: "Tue/Thu 02:00–04:00 UTC", kind: "maintenance" },
    { id: "2", label: "Dec 20 – Jan 2 (year-end freeze)", kind: "blackout" },
  ]);
  const [cab, setCab] = React.useState(true);
  const [adding, setAdding] = React.useState<null | "maintenance" | "blackout">(
    null,
  );
  const [label, setLabel] = React.useState("");
  return (
    <>
      <SampleBanner what="Change-control windows" />
      <Card
        title="Maintenance & blackout windows"
        desc="When automated production changes are permitted (or frozen)."
        right={
          canEdit ? (
            <span style={{ display: "inline-flex", gap: 8 }}>
              <HeaderButton
                icon={<Plus size={14} />}
                onClick={() => {
                  setAdding("maintenance");
                  setLabel("");
                }}
              >
                Maintenance
              </HeaderButton>
              <HeaderButton
                icon={<Plus size={14} />}
                onClick={() => {
                  setAdding("blackout");
                  setLabel("");
                }}
              >
                Blackout
              </HeaderButton>
            </span>
          ) : undefined
        }
      >
        {wins.map((w) => (
          <div
            key={w.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 0",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 9 }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: w.kind === "blackout" ? T.danger : T.success,
                  border: `1px solid ${T.border}`,
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                {w.kind}
              </span>
              <span style={{ fontSize: 13, color: T.textPrimary }}>
                {w.label}
              </span>
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => setWins((ws) => ws.filter((x) => x.id !== w.id))}
                style={{
                  background: "transparent",
                  border: "none",
                  color: T.danger,
                  cursor: "pointer",
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {adding && (
          <div style={{ display: "flex", gap: 8, padding: "10px 0" }}>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                adding === "blackout"
                  ? "e.g. Dec 24–26 freeze"
                  : "e.g. Sat 01:00–03:00 UTC"
              }
              style={inp}
            />
            <HeaderButton
              variant="primary"
              disabled={!label.trim()}
              onClick={() => {
                setWins((ws) => [
                  ...ws,
                  { id: `w${Date.now()}`, label: label.trim(), kind: adding },
                ]);
                setAdding(null);
              }}
            >
              Add
            </HeaderButton>
            <HeaderButton onClick={() => setAdding(null)}>Cancel</HeaderButton>
          </div>
        )}
      </Card>
      <Card title="Change-control rules">
        <ToggleRow
          label="CAB approval required for production changes"
          on={cab}
          disabled={!canEdit}
          onChange={setCab}
        />
        <StatRow
          label="Emergency changes"
          value="Allowed with post-hoc CAB review"
          tone="ok"
          sample
        />
        <StatRow
          label="Post-change validation"
          value="Mandatory"
          tone="ok"
          sample
        />
      </Card>
    </>
  );
}

// ════════════ §9.6 Exceptions — live overrides + request flow ════════════
interface Exc {
  id: string;
  scope: string;
  key: string;
  value: string;
  justification: string;
  approver: string;
  expiry: string;
}
function ExceptionsTab({ canEdit }: { canEdit: boolean }) {
  const overrides = useOverrides();
  const rows = (overrides.data ?? []) as CGOverride[];
  const [exceptions, setExceptions] = React.useState<Exc[]>([]);
  const [requesting, setRequesting] = React.useState(false);
  const ocols: Column<CGOverride>[] = [
    { key: "scope", header: "Scope", render: (r) => r.scope || "—" },
    { key: "type", header: "Type", render: (r) => r.type },
    {
      key: "change",
      header: "Change",
      render: (r) => (
        <span>
          <span style={{ color: T.textMuted }}>{r.original}</span> →{" "}
          <span style={{ color: T.textPrimary }}>{r.overridden}</span>
        </span>
      ),
    },
    { key: "by", header: "By", render: (r) => r.created_by },
    { key: "exp", header: "Expires", render: (r) => r.expires || "—" },
  ];
  const ecols: Column<Exc>[] = [
    { key: "s", header: "Scope", render: (r) => r.scope },
    { key: "k", header: "Key", render: (r) => r.key },
    { key: "v", header: "Requested value", render: (r) => r.value },
    { key: "a", header: "Approver", render: (r) => r.approver },
    { key: "e", header: "Expiry", render: (r) => r.expiry },
  ];
  return (
    <>
      <Card
        title="Active run overrides"
        desc="Live tighten-only overrides on agent runs (§9.6). These strengthen policy; they can never weaken it."
      >
        {overrides.isLoading ? (
          <div style={{ padding: 12, color: T.textMuted, fontSize: 12.5 }}>
            Loading…
          </div>
        ) : (
          <DirectoryTable
            columns={ocols}
            rows={rows}
            pageSize={10}
            empty={
              <div style={{ padding: 16, color: T.textMuted, fontSize: 12.5 }}>
                No active overrides. Runs use the workspace default policy.
              </div>
            }
          />
        )}
      </Card>
      <Card
        title="Policy exceptions"
        desc="Time-boxed, approved waivers below an enterprise floor (§9.6)."
        right={
          canEdit ? (
            <HeaderButton
              icon={<Plus size={14} />}
              variant="primary"
              onClick={() => setRequesting(true)}
            >
              Request exception
            </HeaderButton>
          ) : undefined
        }
      >
        <DirectoryTable
          columns={ecols}
          rows={exceptions}
          pageSize={10}
          rowActions={
            canEdit
              ? (r) => (
                  <ConfirmButton
                    variant="link"
                    label="Revoke"
                    title="Revoke exception"
                    body={`Revoke the exception on "${r.key}"? The mandatory floor re-applies immediately.`}
                    confirmLabel="Revoke"
                    onConfirm={() =>
                      setExceptions((es) => es.filter((x) => x.id !== r.id))
                    }
                  />
                )
              : undefined
          }
          empty={
            <div style={{ padding: 16, color: T.textMuted, fontSize: 12.5 }}>
              No active exceptions. Every control is at or above its floor.
            </div>
          }
        />
      </Card>
      {requesting && (
        <ExceptionModal
          onClose={() => setRequesting(false)}
          onSave={(e) => {
            setExceptions((es) => [...es, { ...e, id: `x${Date.now()}` }]);
            setRequesting(false);
          }}
        />
      )}
    </>
  );
}
function ExceptionModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (e: Omit<Exc, "id">) => void;
}) {
  const [scope, setScope] = React.useState("acme-prod");
  const [key, setKey] = React.useState("delete gate");
  const [value, setValue] = React.useState("autonomous");
  const [justification, setJust] = React.useState("");
  const [approver, setApprover] = React.useState("ciso@company.com");
  const [comp, setComp] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const ok = justification.trim() && comp.trim() && expiry;
  return (
    <Modal
      title="Request policy exception"
      onClose={onClose}
      footer={
        <HeaderButton
          variant="primary"
          disabled={!ok}
          onClick={() =>
            onSave({ scope, key, value, justification, approver, expiry })
          }
        >
          Submit for approval
        </HeaderButton>
      }
    >
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
        An exception temporarily holds a value below an enterprise floor. It
        requires justification, a compensating control, an approver and an
        expiry.
      </div>
      <Field label="Scope">
        <Sel
          value={scope}
          onChange={setScope}
          opts={["acme-prod", "acme-dev", "Organization"]}
        />
      </Field>
      <Field label="Policy key">
        <Sel
          value={key}
          onChange={setKey}
          opts={["delete gate", "egress", "min approvers", "retention days"]}
        />
      </Field>
      <Field label="Requested value">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={inp}
        />
      </Field>
      <Field label="Business justification">
        <input
          value={justification}
          onChange={(e) => setJust(e.target.value)}
          style={inp}
        />
      </Field>
      <Field label="Compensating control">
        <input
          value={comp}
          onChange={(e) => setComp(e.target.value)}
          placeholder="e.g. manual review of every delete"
          style={inp}
        />
      </Field>
      <Field label="Approver">
        <Sel
          value={approver}
          onChange={setApprover}
          opts={["ciso@company.com", "sec-lead@company.com"]}
        />
      </Field>
      <Field label="Expiry">
        <input
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          style={{ ...inp, colorScheme: "dark" }}
        />
      </Field>
      <div
        style={{
          marginTop: 8,
          fontSize: 11.5,
          color: T.textMuted,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <FloorBadge floor="approval required" /> below-floor exceptions are
        themselves approval-gated
      </div>
    </Modal>
  );
}

// ════════════ §9.7 Policy Simulation — run + diff ════════════
function SimulationTab() {
  const [key, setKey] = React.useState("delete gate → plan-only (org-wide)");
  const [result, setResult] = React.useState<null | {
    ws: number;
    agents: number;
    blocked: number;
    permitted: number;
  }>(null);
  const run = () => {
    const n = key.length;
    setResult({
      ws: 8 + (n % 6),
      agents: 20 + (n % 25),
      blocked: 80 + (n % 120),
      permitted: key.includes("loosen") ? 12 : 0,
    });
  };
  return (
    <>
      <SampleBanner what="Policy simulation (what-if)" />
      <Card
        title="Simulate a policy change"
        desc="Preview the org-wide impact before activation (§9.7)."
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: "8px 0 14px",
            flexWrap: "wrap",
          }}
        >
          <Sel
            value={key}
            onChange={(v) => {
              setKey(v);
              setResult(null);
            }}
            opts={[
              "delete gate → plan-only (org-wide)",
              "egress → deny-all (production)",
              "min approvers → 3 (all)",
              "autonomy → ask (all workspaces)",
            ]}
          />
          <HeaderButton
            variant="primary"
            icon={<Play size={14} />}
            onClick={run}
          >
            Run simulation
          </HeaderButton>
        </div>
        {result && (
          <>
            <KVGrid
              items={[
                { k: "Affected workspaces", v: String(result.ws) },
                { k: "Affected agents", v: String(result.agents) },
                {
                  k: "Newly blocked actions / week",
                  v: String(result.blocked),
                },
                { k: "Newly permitted actions", v: String(result.permitted) },
              ]}
            />
            <div
              style={{
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${result.permitted > 0 ? "var(--cg-danger-border)" : T.border}`,
                background:
                  result.permitted > 0 ? "var(--cg-danger-bg)" : "transparent",
                fontSize: 12.5,
                color: result.permitted > 0 ? T.danger : T.textNav,
              }}
            >
              {result.permitted > 0
                ? `⚠ This change would newly permit ${result.permitted} actions — it loosens policy. Requires exception approval.`
                : "This change only tightens policy. Safe to activate; no in-flight workflows are blocked."}
            </div>
          </>
        )}
      </Card>
    </>
  );
}

// ════════════ §9.8 Enforcement — per-domain board ════════════
function EnforcementTab({ canEdit }: { canEdit: boolean }) {
  const [board, setBoard] = React.useState<Record<string, string>>({
    "Autonomy & action gates": "enforced",
    "Isolation & egress": "enforced",
    "Rate & spend limits": "enforced",
    "Execution boundaries": "monitoring",
    "Approval rules": "draft",
    "Change-control windows": "scheduled",
  });
  return (
    <>
      <SampleBanner what="Enforcement status board" />
      <Card
        title="Policy enforcement status"
        desc="How each policy domain is currently enforced (§9.8). Switch a domain from monitoring to enforced when ready."
      >
        {Object.entries(board).map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <span style={{ fontSize: 13, color: T.textPrimary }}>
              {k} <SampleTag />
            </span>
            <span
              style={{ display: "inline-flex", gap: 10, alignItems: "center" }}
            >
              <EnforcementPill status={v} />
              {canEdit && (
                <Select
                  label="Enforcement"
                  value={v}
                  onChange={(nv) => setBoard((b) => ({ ...b, [k]: nv }))}
                  options={[
                    { value: "enforced", label: "Enforced" },
                    { value: "monitoring", label: "Monitoring" },
                    { value: "draft", label: "Draft" },
                    { value: "scheduled", label: "Scheduled" },
                  ]}
                />
              )}
            </span>
          </div>
        ))}
      </Card>
    </>
  );
}

// ════════════ §9.9 / §39.8 Emergency (LIVE) ════════════
function EmergencyTab({
  scope,
  canEdit,
}: {
  scope: "workspace" | "enterprise";
  canEdit: boolean;
}) {
  const ks = useKillSwitch();
  const activate = useKillActivate();
  const resume = useKillResume();
  const target = scope === "enterprise" ? "org" : "workspace";
  const active = (ks.data?.active ?? []).some((a) => a.scope === target);
  return (
    <Card
      title="Emergency controls"
      desc={
        scope === "enterprise"
          ? "Organization-wide emergency stop (§9.9). Halts workflows, terminates sandboxes, disables writes — evidence is preserved."
          : "Workspace emergency stop (§39.8). Halts this workspace's workflows and sandboxes; evidence is preserved."
      }
      right={
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            color: active ? T.danger : T.success,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: active ? T.danger : T.success,
            }}
          />
          {ks.isLoading ? "…" : active ? "STOPPED" : "Operational"}
        </span>
      }
    >
      <div style={{ padding: "8px 0 14px" }}>
        {[
          "Stop all active workflows",
          "Terminate all sandboxes",
          "Disable write actions",
          "Revoke temporary credentials",
          "Preserve all active evidence",
          scope === "enterprise"
            ? "Disable managed model access"
            : "Place workspace in read-only mode",
        ].map((line) => (
          <div
            key={line}
            style={{
              fontSize: 12.5,
              color: T.textNav,
              padding: "4px 0",
              display: "flex",
              gap: 8,
            }}
          >
            <span style={{ color: T.danger }}>•</span> {line}
          </div>
        ))}
      </div>
      {active ? (
        <ConfirmButton
          variant="ghost"
          label={
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
            >
              <Play size={14} /> Resume operations
            </span>
          }
          title={`Resume ${target} operations`}
          body="This lifts the emergency stop and allows workflows and write actions to resume. The action is audited."
          confirmLabel="Resume"
          disabled={!canEdit}
          disabledReason="Requires Admin capability"
          onConfirm={() =>
            resume.mutate({ scope: target, reason: "Resumed from console" })
          }
        />
      ) : (
        <ConfirmButton
          variant="danger"
          label={
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
            >
              <Siren size={14} /> Activate emergency stop
            </span>
          }
          title={`Emergency stop — ${target}`}
          body={`This immediately halts ${scope === "enterprise" ? "the entire organization" : "this workspace"}: workflows stop, sandboxes terminate, writes are disabled. Evidence is preserved. Type the confirmation word to proceed.`}
          confirmWord="STOP"
          confirmLabel="Activate emergency stop"
          disabled={!canEdit}
          disabledReason="Requires Admin capability"
          onConfirm={() =>
            activate.mutate({ scope: target, reason: "Activated from console" })
          }
        />
      )}
      {!canEdit && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: T.warning }}>
          Read-only — emergency controls require the Admin capability.
        </div>
      )}
    </Card>
  );
}

// ════════════ shared controls ════════════
function Segmented({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        overflow: "hidden",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {options.map((o, idx) => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.v)}
            style={{
              height: 30,
              padding: "0 13px",
              border: "none",
              borderLeft: idx === 0 ? "none" : `1px solid ${T.border}`,
              background: active ? "var(--cg-accent-bg-strong)" : "transparent",
              color: active ? T.accent : T.textNav,
              fontSize: 12.5,
              fontWeight: active ? 500 : 400,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
function NumberInput({
  value,
  onChange,
  disabled,
  prefix,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  prefix?: string;
}) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {prefix && (
        <span style={{ fontSize: 13, color: T.textMuted }}>{prefix}</span>
      )}
      <input
        type="number"
        value={value}
        min={0}
        disabled={disabled}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        style={{
          width: 130,
          height: 32,
          padding: "0 10px",
          background: "var(--cg-input-bg)",
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          color: T.textPrimary,
          fontSize: 13,
          outline: "none",
          opacity: disabled ? 0.6 : 1,
        }}
      />
    </div>
  );
}
function NumRow({
  label,
  value,
  onChange,
  disabled,
  prefix,
  floor,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  prefix?: string;
  floor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "11px 0",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: T.textPrimary }}>{label}</div>
        {floor && (
          <div style={{ marginTop: 4 }}>
            <FloorBadge floor={floor} />
          </div>
        )}
      </div>
      <NumberInput
        value={value}
        onChange={onChange}
        disabled={disabled}
        prefix={prefix}
      />
    </div>
  );
}
function ToggleRow({
  label,
  on,
  onChange,
  disabled,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "12px 0",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ fontSize: 13, color: T.textPrimary }}>{label}</div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          flexShrink: 0,
          background: on ? T.accent : "var(--cg-toggle-off)",
          position: "relative",
          padding: 0,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: T.textPrimary,
            transition: "left 120ms ease",
          }}
        />
      </button>
    </div>
  );
}
function Chips({
  all,
  value,
  onChange,
  disabled,
}: {
  all: string[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {all.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange(on ? value.filter((x) => x !== o) : [...value, o])
            }
            style={{
              height: 28,
              padding: "0 11px",
              borderRadius: 99,
              border: `1px solid ${on ? "transparent" : T.border}`,
              background: on ? "var(--cg-accent-bg-strong)" : "transparent",
              color: on ? T.accent : T.textNav,
              fontSize: 12,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.6 : 1,
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px 0",
      }}
    >
      <span style={{ fontSize: 12, color: T.textMuted }}>{label}</span>
      {children}
    </div>
  );
}
function Sel({
  value,
  onChange,
  opts,
}: {
  value: string;
  onChange: (v: string) => void;
  opts: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inp, cursor: "pointer", width: 280 }}
    >
      {opts.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}
function Modal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--cg-overlay)",
        zIndex: 1100,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "60px 20px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: "96vw",
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: T.textMuted,
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: "14px 20px",
              borderTop: `1px solid ${T.border}`,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
const inp: React.CSSProperties = {
  height: 34,
  width: "100%",
  padding: "0 11px",
  background: "var(--cg-input-bg)",
  border: `1px solid ${T.border}`,
  borderRadius: 6,
  color: T.textPrimary,
  fontSize: 13,
  outline: "none",
};

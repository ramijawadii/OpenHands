/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Capacity & Quotas → Quota Policies */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Pencil,
  Copy,
  Power,
  Trash2,
  Download,
  ClipboardCheck,
  FlaskConical,
  GitCompare,
  FileText,
  RefreshCcw,
  Upload,
  LayoutGrid,
  Layers,
  ListChecks,
  SlidersHorizontal,
  Scaling,
  FilePlus2,
  Play,
  History,
  ShieldCheck,
  Scale,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
  StatRow,
  KVGrid,
  DirectoryTable,
  HeaderButton,
  Select,
  EmptyState,
  SampleTag,
  SideRailDrawer,
  RowMenu,
  ScopeBadge,
  PostureCard,
  PostureGrid,
  EnforcementPill,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { ColumnChooser } from "#/components/admin/settings-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";

/**
 * Quota Policies — the authoritative governance engine for enterprise quota management: rules controlling
 * how workspace quotas are allocated, modified, inherited, enforced and reviewed (allocation, approval,
 * inheritance, auto-scaling, exceptions, lifecycle). Distinct from Resource Limits (ceilings), Workspace
 * Quotas (allocation), Consumption (usage) and Utilization (efficiency). Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/05_ Capacity & Quotas/quota_policies.md.
 *
 * Enterprise-Governance UX pattern (Banner · KPI · Toolbar · Filters · Search · Datatable · Bulk/Row
 * actions · 9-tab Policy Detail Drawer with rule builder + scaling + simulation). No backend → sample.
 */

type PolicyType =
  | "Allocation"
  | "Scaling"
  | "Approval"
  | "Exception"
  | "Enforcement";
type Scope =
  | "Organization"
  | "Business Unit"
  | "Workspace"
  | "Environment"
  | "Cloud Provider"
  | "Workspace Type";
type Priority = "Critical" | "High" | "Medium" | "Low";
type Enforcement =
  | "enforced"
  | "monitoring"
  | "draft"
  | "scheduled"
  | "partially-enforced";
type Status = "Active" | "Draft" | "Disabled";

const SCOPES: Scope[] = [
  "Organization",
  "Business Unit",
  "Workspace",
  "Environment",
  "Cloud Provider",
  "Workspace Type",
];
const WORKSPACES = [
  "Global",
  "Payments",
  "Data Lake",
  "Retail Web",
  "Analytics",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const OWNERS = [
  "Capacity Admin",
  "Governance Admin",
  "Platform Team",
  "FinOps",
];

const PRIORITY_TONE: Record<Priority, string> = {
  Critical: T.danger,
  High: T.warning,
  Medium: T.accent,
  Low: T.textMuted,
};
const PRIORITY_ORDER: Record<Priority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};
const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Draft: T.textMuted,
  Disabled: T.warning,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Policy {
  id: string;
  name: string;
  type: PolicyType;
  scope: Scope;
  enforcement: Enforcement;
  priority: Priority;
  status: Status;
  workspace: string;
  businessUnit: string;
  environment: string;
  owner: string;
  version: string;
  created: string;
  description: string;
  assignedWorkspaces: number;
  quotaAssignments: number;
  violations: number;
  exceptions: number;
  simulations: number;
  reviews: number;
}

const POLICY_NAMES: { name: string; type: PolicyType }[] = [
  { name: "Enterprise Production Policy", type: "Allocation" },
  { name: "AI Platform Policy", type: "Allocation" },
  { name: "Automatic Growth Policy", type: "Scaling" },
  { name: "Predictive Scaling Policy", type: "Scaling" },
  { name: "Manager Approval Policy", type: "Approval" },
  { name: "Finance Approval Policy", type: "Approval" },
  { name: "Migration Window Policy", type: "Exception" },
  { name: "Disaster Recovery Policy", type: "Exception" },
  { name: "Production Enforcement Policy", type: "Enforcement" },
  { name: "Development Policy", type: "Allocation" },
  { name: "Sandbox Policy", type: "Allocation" },
  { name: "Demand Scaling Policy", type: "Scaling" },
  { name: "Executive Override Policy", type: "Exception" },
  { name: "Reserved Capacity Policy", type: "Allocation" },
];

const SAMPLE_POLICIES: Policy[] = POLICY_NAMES.map(({ name, type }, i) => {
  const id = `QP-${(10000 + i * 37).toString()}`;
  const n = hashId(id + name);
  const status = pick<Status>(
    ["Active", "Active", "Active", "Draft", "Disabled"],
    n,
  );
  const enforcement: Enforcement =
    status === "Active"
      ? pick<Enforcement>(
          ["enforced", "enforced", "monitoring", "partially-enforced"],
          n,
        )
      : status === "Draft"
        ? "draft"
        : "scheduled";
  return {
    id,
    name,
    type,
    scope: pick(SCOPES, n >> 1),
    enforcement,
    priority: pick<Priority>(["Critical", "High", "High", "Medium", "Low"], n),
    status,
    workspace: pick(WORKSPACES, n >> 2),
    businessUnit: pick(BUSINESS_UNITS, n >> 3),
    environment: pick(ENVIRONMENTS, n),
    owner: pick(OWNERS, n),
    version: `v${1 + (n % 8)}`,
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    description: `Governs ${type.toLowerCase()} behavior for workspace quotas across the enterprise.`,
    assignedWorkspaces: 1 + (n % 20),
    quotaAssignments: 2 + (n % 40),
    violations: n % 6,
    exceptions: n % 5,
    simulations: n % 8,
    reviews: n % 4,
  };
});

function PriorityBadge({ priority }: { priority: Priority }) {
  const c = PRIORITY_TONE[priority];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: c }}
      />
      {priority}
    </span>
  );
}
function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_TONE[status];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: c }}
      />
      {status}
    </span>
  );
}

export function QuotaPoliciesView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fPriority, setFPriority] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_POLICIES;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)) &&
      (!fType || r.type === fType) &&
      (!fWs || r.workspace === fWs) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fEnv || r.environment === fEnv) &&
      (!fStatus || r.status === fStatus) &&
      (!fPriority || r.priority === fPriority)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFWs("");
    setFBu("");
    setFEnv("");
    setFStatus("");
    setFPriority("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const active = records.filter((r) => r.status === "Active").length;
  const protectedWorkspaces = records.reduce(
    (a, r) => a + r.assignedWorkspaces,
    0,
  );
  const violations = records.reduce((a, r) => a + r.violations, 0);
  const exceptions = records.reduce((a, r) => a + r.exceptions, 0);
  const autoScaling = records.filter((r) => r.type === "Scaling").length;
  const approvalRequests = records
    .filter((r) => r.type === "Approval")
    .reduce((a, r) => a + r.quotaAssignments, 0);
  const coverage = Math.round((active / records.length) * 100);
  const policyHealth = 100 - Math.min(30, violations * 2);

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Policy",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=capacity"),
    },
    {
      key: "edit",
      label: "Edit Policy",
      icon: <Pencil size={15} />,
      disabled: true,
    },
    {
      key: "clone",
      label: "Clone Policy",
      icon: <Copy size={15} />,
      disabled: true,
    },
    {
      key: "disable",
      label: "Disable Policy",
      icon: <Power size={15} />,
      disabled: true,
    },
    {
      key: "delete",
      label: "Delete Policy",
      icon: <Trash2 size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Policy",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "simulate",
      label: "Simulate Policy",
      icon: <FlaskConical size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Policies",
      icon: <GitCompare size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "refresh",
      label: "Refresh",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "import",
      label: "Import Policies",
      icon: <Upload size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Policy>[] = [
    {
      key: "name",
      header: "Policy",
      sortValue: (r) => r.name,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Scale size={13} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortValue: (r) => r.type,
      render: (r) => r.type,
    },
    {
      key: "scope",
      header: "Scope",
      sortValue: (r) => r.scope,
      render: (r) => r.scope,
    },
    {
      key: "enforcement",
      header: "Enforcement",
      sortValue: (r) => r.enforcement,
      render: (r) => <EnforcementPill status={r.enforcement} />,
    },
    {
      key: "priority",
      header: "Priority",
      sortValue: (r) => PRIORITY_ORDER[r.priority],
      render: (r) => <PriorityBadge priority={r.priority} />,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard
          title="Active Policies"
          value={active}
          tone="ok"
          sub={
            <>
              Governing quotas <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Protected Workspaces"
          value={protectedWorkspaces}
          tone="ok"
          sub={
            <>
              Under quota policy <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Quota Violations"
          value={violations}
          tone={violations > 0 ? "warn" : "ok"}
          sub={
            <>
              Policy breaches <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Policy Exceptions"
          value={exceptions}
          tone={exceptions > 0 ? "warn" : "ok"}
          sub={
            <>
              Approved deviations <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Auto Scaling Policies"
          value={autoScaling}
          tone="ok"
          sub={
            <>
              Elastic quotas <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Approval Requests"
          value={approvalRequests}
          tone="ok"
          sub={
            <>
              Awaiting decision <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Compliance Coverage"
          value={`${coverage}%`}
          tone={coverage >= 80 ? "ok" : "warn"}
          sub={
            <>
              Workspaces governed <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Policy Health"
          value={`${policyHealth}%`}
          tone={policyHealth >= 85 ? "ok" : "warn"}
          sub={
            <>
              Enforcement posture <SampleTag />
            </>
          }
        />
      </PostureGrid>

      <DiscoveryListView
        title="Quota policies"
        desc="Create and enforce enterprise policies governing workspace quota allocation, scaling, approvals, exceptions and enforcement — the authoritative governance engine for quota management."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search quota policies — policy name, workspace, business unit, description, owner, tags…"
        count={rows.length}
        pills={[
          {
            key: "policyType",
            label: "Policy Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.type)),
          },
          {
            key: "workspace",
            label: "Workspace",
            value: fWs,
            onChange: setFWs,
            options: facet(records.map((r) => r.workspace)),
          },
          {
            key: "businessUnit",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
          {
            key: "priority",
            label: "Priority",
            value: fPriority,
            onChange: setFPriority,
            options: facet(records.map((r) => r.priority)),
          },
        ]}
        presets={[{ label: "All quota policies", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "priority", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Power size={13} />} onClick={clear}>
              Enable ({ids.length})
            </HeaderButton>
            <HeaderButton onClick={clear}>Disable</HeaderButton>
            <HeaderButton icon={<Download size={13} />} onClick={clear}>
              Export
            </HeaderButton>
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "View", onClick: () => setSelId(r.id) },
              { label: "Edit", onClick: () => setSelId(r.id) },
              { label: "Clone", onClick: () => {} },
              { label: "Disable", onClick: () => {} },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Scale size={20} />}
            title="No quota policies have been configured."
            hint="Create a quota policy to govern how workspace quotas are allocated, scaled, approved and enforced."
            cta="Create Quota Policy"
            onCta={() => navigate("/admin/workspace-governance?tab=capacity")}
          />
        }
      />

      {sel && <PolicyDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function QuotaPoliciesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Quota Policies"
        subtitle="Create and enforce enterprise policies governing workspace quota allocation, scaling, approvals, exceptions, and enforcement."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() =>
                navigate("/admin/workspace-governance?tab=capacity")
              }
            >
              Create Policy
            </HeaderButton>
          </>
        }
      />
      <QuotaPoliciesView />
    </Page>
  );
}

function Section({
  title,
  children,
  sample,
}: {
  title: string;
  children: React.ReactNode;
  sample?: boolean;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: T.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {title}
        {sample && <SampleTag />}
      </div>
      {children}
    </div>
  );
}

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "scope", label: "Scope", icon: <Layers size={13} /> },
  { id: "rules", label: "Rules", icon: <ListChecks size={13} /> },
  {
    id: "allocation",
    label: "Allocation",
    icon: <SlidersHorizontal size={13} />,
  },
  { id: "scaling", label: "Scaling", icon: <Scaling size={13} /> },
  { id: "exceptions", label: "Exceptions", icon: <FilePlus2 size={13} /> },
  { id: "simulation", label: "Simulation", icon: <FlaskConical size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function PolicyDrawer({ rec, onClose }: { rec: Policy; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.type} · ${rec.scope} · ${rec.status} · ${rec.version}`}
      width={840}
      onClose={onClose}
      footer={
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <HeaderButton icon={<FlaskConical size={13} />}>
            Simulate
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "scope" && <ScopeTab rec={rec} />}
      {tab === "rules" && <RulesTab />}
      {tab === "allocation" && <AllocationTab />}
      {tab === "scaling" && <ScalingTab />}
      {tab === "exceptions" && <ExceptionsTab rec={rec} />}
      {tab === "simulation" && <SimulationTab />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Policy }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Policy Name", v: rec.name },
              { k: "Policy ID", v: rec.id },
              { k: "Policy Type", v: rec.type },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Priority", v: rec.priority },
              { k: "Status", v: rec.status },
              { k: "Version", v: rec.version },
              { k: "Created Date", v: rec.created, sample: true },
            ]}
          />
          <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
            {rec.description}
          </div>
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              {
                k: "Assigned Workspaces",
                v: rec.assignedWorkspaces,
                sample: true,
              },
              { k: "Quota Assignments", v: rec.quotaAssignments, sample: true },
              { k: "Violations", v: rec.violations, sample: true },
              { k: "Exceptions", v: rec.exceptions, sample: true },
              { k: "Simulations", v: rec.simulations, sample: true },
              { k: "Reviews", v: rec.reviews, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function ScopeTab({ rec }: { rec: Policy }) {
  return (
    <Section title="Scope — where the quota policy applies" sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
        Organization → Business Unit → Workspace → Quota Policy.
      </div>
      {SCOPES.map((s) => (
        <StatRow
          key={s}
          label={s}
          value={s === rec.scope ? "Applied here" : "—"}
          tone={s === rec.scope ? "ok" : undefined}
          sample
        />
      ))}
    </Section>
  );
}

function RulesTab() {
  const rules = [
    "Default Quota",
    "Maximum Quota",
    "Minimum Quota",
    "Quota Increase Limits",
    "Quota Decrease Limits",
    "Auto Scaling Allowed",
    "Approval Required",
    "Temporary Quotas",
    "Expiration Required",
    "Reserved Capacity Required",
    "Business Hours Restrictions",
  ];
  const operators = [
    "Equals",
    "Not Equals",
    "Greater Than",
    "Less Than",
    "Contains",
    "In",
  ];
  const actions = [
    "Allow",
    "Deny",
    "Require Approval",
    "Auto Increase",
    "Auto Decrease",
    "Notify",
    "Block",
  ];
  return (
    <Section
      title="Rules — quota governance behavior (Condition · Operator · Value · Action)"
      sample
    >
      <div
        style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}
      >
        <Select
          label="Condition"
          value="Maximum Quota"
          onChange={() => {}}
          options={rules.map((r) => ({ value: r, label: r }))}
        />
        <Select
          label="Operator"
          value="Greater Than"
          onChange={() => {}}
          options={operators.map((o) => ({ value: o, label: o }))}
        />
        <Select
          label="Value"
          value="500 units"
          onChange={() => {}}
          options={[{ value: "500 units", label: "500 units" }]}
        />
        <Select
          label="Action"
          value="Require Approval"
          onChange={() => {}}
          options={actions.map((a) => ({ value: a, label: a }))}
        />
        <HeaderButton icon={<Plus size={13} />}>Add Rule</HeaderButton>
      </div>
      <Section title="Supported rules">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {rules.map((r) => (
            <span
              key={r}
              style={{
                fontSize: 12,
                color: T.textNav,
                border: `1px solid ${T.border}`,
                borderRadius: 99,
                padding: "4px 10px",
              }}
            >
              {r}
            </span>
          ))}
        </div>
      </Section>
    </Section>
  );
}

function AllocationTab() {
  const strategies = [
    "Fixed Allocation",
    "Dynamic Allocation",
    "Reserved Allocation",
    "Shared Capacity",
    "Department Allocation",
    "Environment Allocation",
  ];
  return (
    <Section title="Allocation — quota allocation behavior" sample>
      <StatRow
        label="Allocation Strategy"
        value="Dynamic Allocation"
        tone="ok"
        sample
      />
      <StatRow label="Maximum Capacity" value="500 units" sample />
      <StatRow label="Minimum Capacity" value="50 units" sample />
      <StatRow label="Growth Buffer" value="15%" sample />
      <Section title="Supported strategies">
        {strategies.map((s, i) => (
          <StatRow
            key={s}
            label={s}
            value={i === 1 ? "Selected" : "Available"}
            tone={i === 1 ? "ok" : undefined}
            sample
          />
        ))}
      </Section>
    </Section>
  );
}

function ScalingTab() {
  const modes = [
    "Disabled",
    "Manual",
    "Scheduled",
    "Automatic",
    "Demand-Based",
    "Predictive",
  ];
  return (
    <Section title="Scaling — automatic quota scaling" sample>
      <StatRow label="Scale Threshold" value="85% utilization" sample />
      <StatRow label="Maximum Growth" value="+50% per event" sample />
      <StatRow label="Cooldown Period" value="30 minutes" sample />
      <StatRow label="Approval Required" value="Above +25%" sample />
      <Section title="Supported modes">
        {modes.map((m, i) => (
          <StatRow
            key={m}
            label={m}
            value={i === 3 ? "Selected" : "Available"}
            tone={i === 3 ? "ok" : undefined}
            sample
          />
        ))}
      </Section>
    </Section>
  );
}

function ExceptionsTab({ rec }: { rec: Policy }) {
  const list = Array.from({ length: rec.exceptions }, (_, i) => {
    const m = hashId(`${rec.id}-e-${i}`);
    return {
      id: `${rec.id}-e-${i}`,
      exception: pick(
        [
          "Temporary Increase",
          "Emergency Capacity",
          "Executive Override",
          "Disaster Recovery",
          "Migration Window",
          "Testing Exception",
        ],
        m,
      ),
      workspace: pick(WORKSPACES, m),
      expiration: `2026-0${1 + (m % 8)}-${(1 + (m % 27)).toString().padStart(2, "0")}`,
      status: pick(["Active", "Pending", "Expired"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "exception", header: "Exception", render: (r) => r.exception },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "expiration", header: "Expiration", render: (r) => r.expiration },
    { key: "status", header: "Status", render: (r) => r.status },
  ];
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <HeaderButton icon={<FilePlus2 size={13} />}>
          Create Exception
        </HeaderButton>
        <HeaderButton icon={<ClipboardCheck size={13} />}>Approve</HeaderButton>
        <SampleTag />
      </div>
      {list.length ? (
        <DirectoryTable columns={cols} rows={list} />
      ) : (
        <EmptyState
          icon={<FilePlus2 size={18} />}
          title="No exceptions"
          hint="No temporary quota exceptions under this policy."
        />
      )}
    </>
  );
}

function SimulationTab() {
  const [ran, setRan] = React.useState(false);
  return (
    <Section title="Simulation — test policy behavior before deployment" sample>
      <div
        style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}
      >
        <Select
          label="Workspace"
          value="Payments"
          onChange={() => {}}
          options={WORKSPACES.map((w) => ({ value: w, label: w }))}
        />
        <Select
          label="Current Quota"
          value="200 units"
          onChange={() => {}}
          options={[{ value: "200 units", label: "200 units" }]}
        />
        <Select
          label="Requested Quota"
          value="320 units"
          onChange={() => {}}
          options={[{ value: "320 units", label: "320 units" }]}
        />
        <Select
          label="Growth Rate"
          value="+12%/mo"
          onChange={() => {}}
          options={[{ value: "+12%/mo", label: "+12%/mo" }]}
        />
        <HeaderButton
          variant="primary"
          icon={<Play size={13} />}
          onClick={() => setRan(true)}
        >
          Run Simulation
        </HeaderButton>
      </div>
      {ran ? (
        <>
          <StatRow
            label="Result"
            value="Approval Required"
            tone="warn"
            sample
          />
          <StatRow
            label="Reason"
            value="Increase exceeds +25% auto-scale threshold"
            sample
          />
          <StatRow
            label="Recommendation"
            value="Route to Finance Approval"
            sample
          />
        </>
      ) : (
        <div style={{ fontSize: 12.5, color: T.textMuted }}>
          Configure inputs and run a simulation to preview Allowed / Denied /
          Approval Required outcomes.
        </div>
      )}
    </Section>
  );
}

function ActivityTab({ rec }: { rec: Policy }) {
  const events = [
    "Policy Created",
    "Policy Updated",
    "Policy Assigned",
    "Simulation Executed",
    "Exception Approved",
    "Policy Disabled",
  ];
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <Select
          label="Actor"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Actor: All" },
            ...OWNERS.map((o) => ({ value: o, label: o })),
          ]}
        />
        <Select
          label="Action"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Action: All" },
            ...events.map((e) => ({ value: e, label: e })),
          ]}
        />
        <SampleTag />
      </div>
      {events.map((e, i) => (
        <div
          key={e}
          style={{
            display: "flex",
            gap: 12,
            padding: "10px 0",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: T.accent,
              marginTop: 5,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>
              {pick(OWNERS, hashId(rec.id) + i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function AuditTab() {
  const events = [
    "Policy Created",
    "Policy Modified",
    "Policy Assigned",
    "Policy Removed",
    "Simulation Executed",
    "Exception Approved",
    "Policy Disabled",
  ];
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: T.textMuted,
          marginBottom: 12,
        }}
      >
        <ShieldCheck size={14} /> Read-only immutable log <SampleTag />
      </div>
      {events.map((e, i) => (
        <StatRow
          key={e}
          label={e}
          value={`${pick(OWNERS, i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

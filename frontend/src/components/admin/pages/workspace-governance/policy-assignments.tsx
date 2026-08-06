/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Workspace Policies → Policy Assignments */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Layers,
  Move,
  Trash2,
  Copy,
  Download,
  RefreshCcw,
  Eye,
  ClipboardCheck,
  GitMerge,
  Gauge,
  History,
  LayoutGrid,
  Network,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  Activity as ActivityIcon,
  UserCheck,
  Target,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Card,
  Tabs,
  StatRow,
  KVGrid,
  DirectoryTable,
  FilterBar,
  CommandBar,
  HeaderButton,
  Select,
  EmptyState,
  SampleTag,
  SideRailDrawer,
  RowMenu,
  ScopeBadge,
  PostureCard,
  PostureGrid,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";

/**
 * Policy Assignments — the central policy-orchestration layer: how governance policies attach to
 * organizations, business units and workspaces, and how inheritance, precedence, overrides and
 * conflicts resolve into the Effective Policy Set consumed by the Policy Engine. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/01_Workspace Policies/policy_assignments.md.
 *
 * Same Enterprise-Governance UX (Banner · Toolbar · Filters · Search · Datatable · Bulk/Row actions ·
 * 9-tab Assignment Detail Drawer). No assignment backend yet → deterministic representative sample data
 * (tagged `Sample`); swap SAMPLE_ASSIGNMENTS for the live query when the policy engine lands.
 */

type PolicyType =
  | "Creation Policy"
  | "Operational Policy"
  | "Metadata Policy"
  | "Default Configuration"
  | "Compliance Assignment"
  | "Security Policy"
  | "Resource Policy"
  | "Lifecycle Policy"
  | "Cost Policy"
  | "Automation Policy"
  | "AI Policy";
type Scope =
  | "Organization"
  | "Business Unit"
  | "Workspace"
  | "Workspace Template"
  | "Environment";
type Priority = "Critical" | "High" | "Medium" | "Low";
type Status = "Active" | "Pending" | "Overridden" | "Disabled";

const POLICY_TYPES: PolicyType[] = [
  "Creation Policy",
  "Operational Policy",
  "Metadata Policy",
  "Default Configuration",
  "Compliance Assignment",
  "Security Policy",
  "Resource Policy",
  "Lifecycle Policy",
  "Cost Policy",
  "Automation Policy",
  "AI Policy",
];
const SCOPES: Scope[] = [
  "Organization",
  "Business Unit",
  "Workspace",
  "Workspace Template",
  "Environment",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const OWNERS = [
  "Governance Admin",
  "Aisha Khan",
  "David Chen",
  "Marco Rossi",
  "Priya Nair",
];

const PRIORITY_TONE: Record<Priority, string> = {
  Critical: T.danger,
  High: T.warning,
  Medium: T.accent,
  Low: T.textMuted,
};
const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Pending: T.warning,
  Overridden: T.accent,
  Disabled: T.textMuted,
};
const PRIORITY_ORDER: Record<Priority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

interface Assignment {
  id: string;
  policy: string;
  type: PolicyType;
  scope: Scope;
  inherited: boolean;
  priority: Priority;
  status: Status;
  version: string;
  businessUnit: string;
  workspace: string;
  owner: string;
  created: string;
  modified: string;
  description: string;
  // Statistics
  assignedPolicies: number;
  inheritedPolicies: number;
  overrides: number;
  conflicts: number;
  complianceScore: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

const POLICY_NAMES = [
  "Enterprise Security Baseline",
  "Production Operational Guardrails",
  "Workspace Metadata Standard",
  "Default Workspace Configuration",
  "SOC 2 Compliance Assignment",
  "Data Residency — EU",
  "Cloud Resource Policy",
  "Lifecycle Retention Policy",
  "Cost Control Policy",
  "Automation Approval Policy",
  "AI Runtime Guardrails",
  "PCI DSS Compliance Assignment",
  "Regional Networking Policy",
  "Backup & Recovery Policy",
];

const SAMPLE_ASSIGNMENTS: Assignment[] = POLICY_NAMES.map((policy, i) => {
  const id = `PA-${(1000 + i * 5).toString().padStart(5, "0")}`;
  const n = hashId(id + policy);
  return {
    id,
    policy,
    type: pick(POLICY_TYPES, n),
    scope: pick(SCOPES, n >> 2),
    inherited: n % 2 === 0,
    priority: pick<Priority>(
      ["Critical", "Critical", "High", "Medium", "Low"],
      n,
    ),
    status: pick<Status>(
      ["Active", "Active", "Active", "Pending", "Overridden", "Disabled"],
      n,
    ),
    version: `v${1 + (n % 6)}`,
    businessUnit: pick(BUSINESS_UNITS, n >> 1),
    workspace: `${pick(BUSINESS_UNITS, n >> 3)} Production`,
    owner: pick(OWNERS, n),
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + ((n + 3) % 27)).toString().padStart(2, "0")}`,
    modified: `2026-0${1 + (n % 7)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    description: `${policy} assigned at the ${pick(SCOPES, n >> 2).toLowerCase()} scope, resolved into the effective policy set.`,
    assignedPolicies: 2 + (n % 12),
    inheritedPolicies: 3 + (n % 16),
    overrides: n % 5,
    conflicts: n % 3,
    complianceScore: 74 + (n % 26),
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

export function PolicyAssignmentsView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fScope, setFScope] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fInherit, setFInherit] = React.useState("");
  const [fPriority, setFPriority] = React.useState("");
  const [fVersion, setFVersion] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_ASSIGNMENTS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.policy.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q)) &&
      (!fType || r.type === fType) &&
      (!fScope || r.scope === fScope) &&
      (!fStatus || r.status === fStatus) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fInherit || (fInherit === "inherited") === r.inherited) &&
      (!fPriority || r.priority === fPriority) &&
      (!fVersion || r.version === fVersion)
    );
  });
  const hasFilters = !!(
    search ||
    fType ||
    fScope ||
    fStatus ||
    fBu ||
    fInherit ||
    fPriority ||
    fVersion
  );
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFScope("");
    setFStatus("");
    setFBu("");
    setFInherit("");
    setFPriority("");
    setFVersion("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Operational Dashboard (spec §Operational Dashboard).
  const activeAssignments = records.filter((r) => r.status === "Active").length;
  const inheritedAssignments = records.filter((r) => r.inherited).length;
  const overrides = records.reduce((a, r) => a + r.overrides, 0);
  const conflicts = records.reduce((a, r) => a + r.conflicts, 0);
  const exceptions = records.reduce((a, r) => a + (r.overrides > 0 ? 1 : 0), 0);
  const effective = records.reduce(
    (a, r) => a + r.assignedPolicies + r.inheritedPolicies,
    0,
  );
  const coverage = Math.round((activeAssignments / records.length) * 100);

  const toolbar: CommandItem[] = [
    {
      key: "assign",
      label: "Assign Policy",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=policies"),
    },
    {
      key: "bulk",
      label: "Bulk Assign",
      icon: <Layers size={15} />,
      disabled: true,
    },
    {
      key: "move",
      label: "Move Assignment",
      icon: <Move size={15} />,
      disabled: true,
    },
    {
      key: "remove",
      label: "Remove Assignment",
      icon: <Trash2 size={15} />,
      disabled: true,
    },
    {
      key: "duplicate",
      label: "Duplicate Assignment",
      icon: <Copy size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
    {
      key: "refresh",
      label: "Refresh",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "preview",
      label: "Preview Effective Policies",
      icon: <Eye size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Assignments",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "resolve",
      label: "Resolve Conflicts",
      icon: <GitMerge size={15} />,
      disabled: true,
    },
    {
      key: "evaluate",
      label: "Run Evaluation",
      icon: <Gauge size={15} />,
      disabled: true,
    },
    {
      key: "history",
      label: "Assignment History",
      icon: <History size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Assignment>[] = [
    {
      key: "policy",
      header: "Policy",
      sortValue: (r) => r.policy,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ListChecks size={14} color={T.textMuted} />
          {r.policy}
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
      header: "Assignment Scope",
      sortValue: (r) => r.scope,
      render: (r) => r.scope,
    },
    {
      key: "inherited",
      header: "Inherited",
      sortValue: (r) => (r.inherited ? 1 : 0),
      render: (r) => (r.inherited ? "Yes" : "No"),
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
          title="Active Assignments"
          value={activeAssignments}
          tone="ok"
          sub={
            <>
              Currently enforced <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Inherited Assignments"
          value={inheritedAssignments}
          sub={
            <>
              From ancestor scopes <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Workspace Overrides"
          value={overrides}
          tone={overrides > 0 ? "warn" : "ok"}
          sub={
            <>
              Local deviations <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Policy Conflicts"
          value={conflicts}
          tone={conflicts > 0 ? "danger" : "ok"}
          sub={
            <>
              Awaiting resolution <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Exceptions"
          value={exceptions}
          tone={exceptions > 0 ? "warn" : "ok"}
          sub={
            <>
              Approved deviations <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Effective Policies"
          value={effective}
          tone="ok"
          sub={
            <>
              Resolved across estate <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Coverage"
          value={`${coverage}%`}
          tone={coverage >= 80 ? "ok" : "warn"}
          sub={
            <>
              Scopes with assignment <SampleTag />
            </>
          }
        />
      </PostureGrid>

      <Card
        title="Policy assignments"
        desc="Policy Assignments bind governance policies to organizational entities and resolve inheritance, precedence, overrides and exceptions into the effective policy set the Policy Engine enforces."
      >
        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search policy assignments — policy, workspace, business unit, assignment, policy type, tags…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select
            label="Policy Type"
            value={fType}
            onChange={setFType}
            options={facet(records.map((r) => r.type))}
          />
          <Select
            label="Assignment Scope"
            value={fScope}
            onChange={setFScope}
            options={facet(records.map((r) => r.scope))}
          />
          <Select
            label="Status"
            value={fStatus}
            onChange={setFStatus}
            options={facet(records.map((r) => r.status))}
          />
          <Select
            label="Business Unit"
            value={fBu}
            onChange={setFBu}
            options={facet(records.map((r) => r.businessUnit))}
          />
          <Select
            label="Inheritance"
            value={fInherit}
            onChange={setFInherit}
            options={[
              { value: "", label: "All" },
              { value: "inherited", label: "Inherited" },
              { value: "direct", label: "Direct" },
            ]}
          />
          <Select
            label="Priority"
            value={fPriority}
            onChange={setFPriority}
            options={facet(records.map((r) => r.priority))}
          />
          <Select
            label="Version"
            value={fVersion}
            onChange={setFVersion}
            options={facet(records.map((r) => r.version))}
          />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "priority", dir: "asc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<Plus size={13} />} onClick={clear}>
                Assign ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<Trash2 size={13} />} onClick={clear}>
                Remove
              </HeaderButton>
              <HeaderButton icon={<Move size={13} />} onClick={clear}>
                Move
              </HeaderButton>
              <HeaderButton icon={<ClipboardCheck size={13} />} onClick={clear}>
                Validate
              </HeaderButton>
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
                { label: "Reassign", onClick: () => setSelId(r.id) },
                {
                  label: "Preview Effective Policy",
                  onClick: () => setSelId(r.id),
                },
                { label: "View Inheritance", onClick: () => setSelId(r.id) },
                { label: "Export", onClick: () => {} },
                {
                  label: "Remove",
                  onClick: () => setSelId(r.id),
                  danger: true,
                },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<ListChecks size={20} />}
              title="No policy assignments found."
              hint="Assign a governance policy to an organization, business unit or workspace to begin building the effective policy set."
              cta="Assign Policy"
              onCta={() => navigate("/admin/workspace-governance?tab=policies")}
            />
          }
        />
      </Card>

      {sel && <AssignmentDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function PolicyAssignmentsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Policy Assignments"
        subtitle="Assign governance policies to organizations, business units and workspaces while managing inheritance, precedence, overrides and effective policy evaluation."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() =>
                navigate("/admin/workspace-governance?tab=policies")
              }
            >
              Assign Policy
            </HeaderButton>
          </>
        }
      />
      <PolicyAssignmentsView />
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

function FlowChain({ steps }: { steps: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 12.5,
              color: T.textNav,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background:
                i === steps.length - 1
                  ? "var(--cg-accent-bg-strong)"
                  : "transparent",
            }}
          >
            <span
              style={{
                color: T.textMuted,
                fontFamily: "monospace",
                fontSize: 11,
              }}
            >
              {(i + 1).toString().padStart(2, "0")}
            </span>
            {s}
          </div>
          {i < steps.length - 1 && (
            <span
              style={{ color: T.textMuted, textAlign: "center", fontSize: 12 }}
            >
              ↓
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ════════════ Assignment Detail Drawer — 9 sub-tabs (spec §Assignment Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "scope", label: "Assignment Scope", icon: <Target size={13} /> },
  {
    id: "assigned",
    label: "Assigned Policies",
    icon: <ListChecks size={13} />,
  },
  { id: "inheritance", label: "Inheritance", icon: <Network size={13} /> },
  {
    id: "effective",
    label: "Effective Policies",
    icon: <ShieldCheck size={13} />,
  },
  {
    id: "conflicts",
    label: "Conflict Resolution",
    icon: <ShieldAlert size={13} />,
  },
  { id: "exceptions", label: "Exceptions", icon: <UserCheck size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function AssignmentDrawer({
  rec,
  onClose,
}: {
  rec: Assignment;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.policy}
      subtitle={`${rec.type} · ${rec.scope} · ${rec.priority} · ${rec.status}`}
      width={860}
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
          <HeaderButton icon={<Eye size={13} />}>Preview</HeaderButton>
          <HeaderButton icon={<Plus size={13} />}>Assign Policy</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "scope" && <ScopeTab rec={rec} />}
      {tab === "assigned" && <AssignedTab rec={rec} />}
      {tab === "inheritance" && <InheritanceTab />}
      {tab === "effective" && <EffectiveTab rec={rec} />}
      {tab === "conflicts" && <ConflictsTab rec={rec} />}
      {tab === "exceptions" && <ExceptionsTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Assignment }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Assignment Name", v: rec.policy },
              { k: "Assignment Scope", v: rec.scope },
              { k: "Status", v: rec.status },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Created Date", v: rec.created, sample: true },
              { k: "Modified Date", v: rec.modified, sample: true },
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
              { k: "Assigned Policies", v: rec.assignedPolicies, sample: true },
              {
                k: "Inherited Policies",
                v: rec.inheritedPolicies,
                sample: true,
              },
              { k: "Overrides", v: rec.overrides, sample: true },
              { k: "Conflicts", v: rec.conflicts, sample: true },
              {
                k: "Compliance Score",
                v: `${rec.complianceScore}%`,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function ScopeTab({ rec }: { rec: Assignment }) {
  const list = SCOPES.map((s, i) => ({
    id: s,
    scope: s,
    inherited: i > 0 ? "Inherited" : "Direct",
    priority: pick<Priority>(
      ["Critical", "High", "Medium"],
      hashId(rec.id + s),
    ),
    status: pick<Status>(["Active", "Active", "Disabled"], hashId(rec.id + s)),
  }));
  const cols: Column<(typeof list)[number]>[] = [
    { key: "scope", header: "Scope", render: (r) => r.scope },
    { key: "inherited", header: "Inherited", render: (r) => r.inherited },
    {
      key: "priority",
      header: "Priority",
      render: (r) => <PriorityBadge priority={r.priority} />,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];
  return (
    <>
      <Section title="Assignment hierarchy" sample>
        <FlowChain steps={["Organization", "Business Unit", "Workspace"]} />
      </Section>
      <Section title="Supported scopes" sample>
        <DirectoryTable columns={cols} rows={list} />
      </Section>
    </>
  );
}

function AssignedTab({ rec }: { rec: Assignment }) {
  const n = hashId(rec.id);
  const list = Array.from({ length: 3 + (n % 5) }, (_, i) => {
    const m = hashId(`${rec.id}-p-${i}`);
    return {
      id: `${rec.id}-p-${i}`,
      policy: `${pick(POLICY_TYPES, m)} ${i + 1}`,
      type: pick(POLICY_TYPES, m),
      version: `v${1 + (m % 5)}`,
      priority: pick<Priority>(["Critical", "High", "Medium", "Low"], m),
      assignment: pick(SCOPES, m),
      status: pick<Status>(["Active", "Active", "Overridden"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "policy", header: "Policy", render: (r) => r.policy },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "version", header: "Version", render: (r) => r.version },
    {
      key: "priority",
      header: "Priority",
      render: (r) => <PriorityBadge priority={r.priority} />,
    },
    { key: "assignment", header: "Assignment", render: (r) => r.assignment },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
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
        <HeaderButton icon={<Plus size={13} />}>Assign</HeaderButton>
        <HeaderButton variant="danger" icon={<Trash2 size={13} />}>
          Remove
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function InheritanceTab() {
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
        <HeaderButton icon={<Network size={13} />}>View Tree</HeaderButton>
        <HeaderButton>Expand</HeaderButton>
        <HeaderButton>Collapse</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Inheritance visualization" sample>
        <FlowChain steps={["Organization", "Business Unit", "Workspace"]} />
      </Section>
      <Section title="Inheritance detail" sample>
        <StatRow
          label="Inherited Policies"
          value="12 from ancestors"
          tone="ok"
          sample
        />
        <StatRow label="Overrides" value="2 at this scope" sample />
        <StatRow
          label="Locked Policies"
          value="4 mandatory floors"
          tone="warn"
          sample
        />
        <StatRow
          label="Effective Source"
          value="Organization → Business Unit"
          sample
        />
      </Section>
    </>
  );
}

function EffectiveTab({ rec }: { rec: Assignment }) {
  const n = hashId(rec.id);
  const list = Array.from({ length: 4 + (n % 4) }, (_, i) => {
    const m = hashId(`${rec.id}-e-${i}`);
    return {
      id: `${rec.id}-e-${i}`,
      policy: `${pick(POLICY_TYPES, m)} ${i + 1}`,
      source: pick(SCOPES, m),
      priority: pick<Priority>(["Critical", "High", "Medium", "Low"], m),
      inherited: m % 2 === 0 ? "Yes" : "No",
      effective: "Yes",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "policy", header: "Policy", render: (r) => r.policy },
    { key: "source", header: "Source", render: (r) => r.source },
    {
      key: "priority",
      header: "Priority",
      render: (r) => <PriorityBadge priority={r.priority} />,
    },
    { key: "inherited", header: "Inherited", render: (r) => r.inherited },
    { key: "effective", header: "Effective", render: (r) => r.effective },
  ];
  return (
    <>
      <Section title="Effective policy resolution" sample>
        <FlowChain
          steps={[
            "Assigned Policies",
            "Inherited Policies",
            "Overrides",
            "Exceptions",
            "Effective Policy Set",
          ]}
        />
      </Section>
      <Section title="Final policy set enforced within the workspace" sample>
        <DirectoryTable columns={cols} rows={list} />
      </Section>
    </>
  );
}

function ConflictsTab({ rec }: { rec: Assignment }) {
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
        <HeaderButton icon={<GitMerge size={13} />}>Resolve</HeaderButton>
        <HeaderButton icon={<Eye size={13} />}>Preview</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Resolution order (precedence)" sample>
        <FlowChain
          steps={[
            "Locked Policy",
            "Organization",
            "Business Unit",
            "Workspace",
            "Exception",
          ]}
        />
      </Section>
      <Section title="Conflicting policies" sample>
        {rec.conflicts === 0 ? (
          <StatRow
            label="No conflicts"
            value="All assignments resolve cleanly"
            tone="ok"
            sample
          />
        ) : (
          Array.from({ length: rec.conflicts }, (_, i) => (
            <StatRow
              key={`c-${i}`}
              label={`${pick(POLICY_TYPES, hashId(rec.id) + i)} conflict`}
              value={`Winner: ${pick(SCOPES, hashId(rec.id) + i)} · higher priority`}
              tone="warn"
              sample
            />
          ))
        )}
      </Section>
    </>
  );
}

function ExceptionsTab({ rec }: { rec: Assignment }) {
  const list = [
    "Temporary Override",
    "Migration Exception",
    "Customer Requirement",
    "Emergency Change",
  ]
    .slice(0, 1 + (hashId(rec.id) % 4))
    .map((reason, i) => ({
      id: `${rec.id}-x-${i}`,
      policy: pick(POLICY_TYPES, hashId(rec.id) + i),
      reason,
      approvedBy: pick(OWNERS, hashId(rec.id) + i),
      expiration: `2026-0${1 + ((hashId(rec.id) + i) % 8)}-15`,
      status: pick<Status>(["Active", "Pending"], hashId(rec.id) + i),
    }));
  const cols: Column<(typeof list)[number]>[] = [
    { key: "policy", header: "Policy", render: (r) => r.policy },
    { key: "reason", header: "Reason", render: (r) => r.reason },
    { key: "approvedBy", header: "Approved By", render: (r) => r.approvedBy },
    { key: "expiration", header: "Expiration", render: (r) => r.expiration },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
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
        <HeaderButton icon={<Plus size={13} />}>Create Exception</HeaderButton>
        <HeaderButton icon={<ClipboardCheck size={13} />}>Approve</HeaderButton>
        <HeaderButton variant="danger">Reject</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ActivityTab({ rec }: { rec: Assignment }) {
  const events = [
    "Policy Assigned",
    "Policy Removed",
    "Assignment Updated",
    "Override Applied",
    "Conflict Resolved",
    "Evaluation Executed",
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
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Date: Any" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
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
    "Assignment Created",
    "Policy Assigned",
    "Policy Removed",
    "Assignment Modified",
    "Override Approved",
    "Conflict Resolved",
    "Assignment Deleted",
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

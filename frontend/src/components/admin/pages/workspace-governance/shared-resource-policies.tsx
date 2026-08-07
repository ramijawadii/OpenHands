/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Cross-Workspace Governance → Shared Resource Policies */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Pencil,
  Copy,
  Power,
  Trash2,
  Download,
  UserCheck,
  ClipboardCheck,
  FlaskConical,
  ScanLine,
  FileText,
  RefreshCcw,
  Upload,
  LayoutGrid,
  Layers,
  ListChecks,
  Boxes,
  ShieldCheck,
  BadgeCheck,
  FilePlus2,
  Play,
  History,
  FileCheck2,
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
  EnforcementPill,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";

/**
 * Shared Resource Policies — the authoritative policy engine for enterprise-wide resource sharing:
 * governance rules controlling who may share/consume resources, under which conditions, with which
 * permissions, approvals, compliance, security and isolation. Unlike Shared Assets (the actual
 * resources), this defines the policies that govern their usage. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/04_Cross-Workspace Governance/shared_resource_policies.md.
 *
 * Enterprise-Governance UX pattern (Banner · KPI · Toolbar · Filters · Search · Datatable · Bulk/Row
 * actions · 10-tab Policy Detail Drawer with rule builder + simulation). No policy backend → sample.
 */

type PolicyType = "Security" | "Approval" | "Compliance" | "Global" | "Workspace" | "Resource";
type Scope = "Organization" | "Business Unit" | "Workspace" | "Environment" | "Resource Type";
type Enforcement = "enforced" | "monitoring" | "draft" | "scheduled" | "partially-enforced";
type Status = "Active" | "Draft" | "Disabled";

const POLICY_TYPES: PolicyType[] = ["Security", "Approval", "Compliance", "Global", "Workspace", "Resource"];
const SCOPES: Scope[] = ["Organization", "Business Unit", "Workspace", "Environment", "Resource Type"];
const WORKSPACES = ["Global", "Payments", "Shared Services", "Data Lake", "Retail Web"];
const PROVIDERS = ["AWS", "Azure", "GCP", "Kubernetes", "Multi-cloud"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Shared"];
const OWNERS = ["Policy Admin", "Security Team", "Governance Admin", "Platform Team"];
const FRAMEWORKS = ["ISO 27001", "SOC 2", "NIST CSF", "NIST 800-53", "PCI DSS", "HIPAA", "CSA CCM", "CIS Controls"];

const STATUS_TONE: Record<Status, string> = { Active: T.success, Draft: T.textMuted, Disabled: T.warning };

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
  assignedResources: number;
  enforcement: Enforcement;
  status: Status;
  workspace: string;
  provider: string;
  environment: string;
  owner: string;
  version: string;
  created: string;
  description: string;
  workspaces: number;
  exceptions: number;
  violations: number;
  complianceControls: number;
  dependencies: number;
}

const POLICY_NAMES: { name: string; type: PolicyType }[] = [
  { name: "Enterprise Shared Database Policy", type: "Security" },
  { name: "Enterprise Secrets Policy", type: "Global" },
  { name: "Two-Level Approval Policy", type: "Approval" },
  { name: "PCI Resource Sharing", type: "Compliance" },
  { name: "Shared Kubernetes Cluster Policy", type: "Resource" },
  { name: "MFA Required for Sharing", type: "Security" },
  { name: "Enterprise Data Sharing", type: "Global" },
  { name: "Private Network Only", type: "Security" },
  { name: "Executive Approval Policy", type: "Approval" },
  { name: "HIPAA Resource Policy", type: "Compliance" },
  { name: "Shared API Gateway Policy", type: "Resource" },
  { name: "Payments Sharing Policy", type: "Workspace" },
  { name: "Zero Trust Sharing", type: "Security" },
  { name: "Enterprise AI Policy", type: "Global" },
];

const SAMPLE_POLICIES: Policy[] = POLICY_NAMES.map(({ name, type }, i) => {
  const id = `SP-${(10000 + i * 37).toString()}`;
  const n = hashId(id + name);
  const status = pick<Status>(["Active", "Active", "Active", "Draft", "Disabled"], n);
  const enforcement: Enforcement = status === "Active" ? pick<Enforcement>(["enforced", "enforced", "monitoring", "partially-enforced"], n) : status === "Draft" ? "draft" : "scheduled";
  return {
    id,
    name,
    type,
    scope: pick(SCOPES, n >> 1),
    assignedResources: 1 + (n % 40),
    enforcement,
    status,
    workspace: pick(WORKSPACES, n >> 2),
    provider: pick(PROVIDERS, n >> 3),
    environment: pick(ENVIRONMENTS, n),
    owner: pick(OWNERS, n),
    version: `v${1 + (n % 8)}`,
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    description: `Governs how ${name.toLowerCase()} resources are securely shared across workspaces.`,
    workspaces: 1 + (n % 20),
    exceptions: n % 5,
    violations: n % 6,
    complianceControls: 2 + (n % 14),
    dependencies: n % 8,
  };
});

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_TONE[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
      {status}
    </span>
  );
}

export function SharedResourcePoliciesView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_POLICIES;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.name.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)) &&
      (!fType || r.type === fType) &&
      (!fWs || r.workspace === fWs) &&
      (!fProvider || r.provider === fProvider) &&
      (!fStatus || r.status === fStatus) &&
      (!fEnv || r.environment === fEnv) &&
      (!fOwner || r.owner === fOwner)
    );
  });
  const hasFilters = !!(search || fType || fWs || fProvider || fStatus || fEnv || fOwner);
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFWs("");
    setFProvider("");
    setFStatus("");
    setFEnv("");
    setFOwner("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [{ value: "", label: "All" }, ...Array.from(new Set(vals)).sort().map((v) => ({ value: v, label: v }))];

  const active = records.filter((r) => r.status === "Active").length;
  const protectedResources = records.reduce((a, r) => a + r.assignedResources, 0);
  const sharedResources = new Set(records.map((r) => r.provider)).size * 6;
  const violations = records.reduce((a, r) => a + r.violations, 0);
  const exceptions = records.reduce((a, r) => a + r.exceptions, 0);
  const coverage = Math.round((records.filter((r) => r.complianceControls > 0).length / records.length) * 100);
  const securityScore = 100 - Math.min(40, violations * 2);

  const toolbar: CommandItem[] = [
    { key: "create", label: "Create Policy", icon: <Plus size={15} />, onClick: () => navigate("/admin/workspace-governance?tab=cross") },
    { key: "edit", label: "Edit Policy", icon: <Pencil size={15} />, disabled: true },
    { key: "duplicate", label: "Duplicate", icon: <Copy size={15} />, disabled: true },
    { key: "disable", label: "Disable Policy", icon: <Power size={15} />, disabled: true },
    { key: "delete", label: "Delete", icon: <Trash2 size={15} />, disabled: true },
    { key: "assign", label: "Assign Policy", icon: <UserCheck size={15} />, disabled: true },
    { key: "validate", label: "Validate Policy", icon: <ClipboardCheck size={15} />, disabled: true },
    { key: "simulate", label: "Simulate Policy", icon: <FlaskConical size={15} />, disabled: true },
    { key: "scan", label: "Run Compliance Scan", icon: <ScanLine size={15} />, disabled: true },
    { key: "report", label: "Generate Report", icon: <FileText size={15} />, disabled: true },
    { key: "refresh", label: "Refresh", icon: <RefreshCcw size={15} />, onClick: () => setSelId(null) },
    { key: "import", label: "Import Policies", icon: <Upload size={15} />, disabled: true },
  ];

  const cols: Column<Policy>[] = [
    {
      key: "name",
      header: "Policy",
      sortValue: (r) => r.name,
      render: (r) => (
        <span style={{ color: T.textPrimary, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <FileCheck2 size={13} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    { key: "type", header: "Type", sortValue: (r) => r.type, render: (r) => r.type },
    { key: "scope", header: "Scope", sortValue: (r) => r.scope, render: (r) => r.scope },
    { key: "assignedResources", header: "Assigned Resources", sortValue: (r) => r.assignedResources, render: (r) => r.assignedResources },
    { key: "enforcement", header: "Enforcement", sortValue: (r) => r.enforcement, render: (r) => <EnforcementPill status={r.enforcement} /> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: "workspace", header: "Workspace", sortValue: (r) => r.workspace, render: (r) => r.workspace },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard title="Active Policies" value={active} tone="ok" sub={<>Enforced enterprise-wide <SampleTag /></>} />
        <PostureCard title="Protected Resources" value={protectedResources} tone="ok" sub={<>Governed by policy <SampleTag /></>} />
        <PostureCard title="Shared Resources" value={sharedResources} tone="ok" sub={<>Under sharing policy <SampleTag /></>} />
        <PostureCard title="Policy Violations" value={violations} tone={violations > 0 ? "warn" : "ok"} sub={<>Failing enforcement <SampleTag /></>} />
        <PostureCard title="Exceptions" value={exceptions} tone={exceptions > 0 ? "warn" : "ok"} sub={<>Approved deviations <SampleTag /></>} />
        <PostureCard title="Compliance Coverage" value={`${coverage}%`} tone={coverage >= 80 ? "ok" : "warn"} sub={<>Mapped to controls <SampleTag /></>} />
        <PostureCard title="Security Score" value={`${securityScore}%`} tone={securityScore >= 85 ? "ok" : "warn"} sub={<>Sharing posture <SampleTag /></>} />
        <PostureCard title="Policy Drift" value={records.filter((r) => r.violations > 3).length} tone="ok" sub={<>Off enterprise standard <SampleTag /></>} />
      </PostureGrid>

      <Card
        title="Shared resource policies"
        desc="Define and enforce enterprise policies governing how resources are securely shared across workspaces — who may share, who may consume, and under which security, compliance and approval conditions."
      >
        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search shared resource policies — policy name, policy ID, workspace, resource, description, owner, tags…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select label="Policy Type" value={fType} onChange={setFType} options={facet(records.map((r) => r.type))} />
          <Select label="Workspace" value={fWs} onChange={setFWs} options={facet(records.map((r) => r.workspace))} />
          <Select label="Cloud Provider" value={fProvider} onChange={setFProvider} options={facet(records.map((r) => r.provider))} />
          <Select label="Status" value={fStatus} onChange={setFStatus} options={facet(records.map((r) => r.status))} />
          <Select label="Environment" value={fEnv} onChange={setFEnv} options={facet(records.map((r) => r.environment))} />
          <Select label="Owner" value={fOwner} onChange={setFOwner} options={facet(records.map((r) => r.owner))} />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "type", dir: "asc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<UserCheck size={13} />} onClick={clear}>Assign ({ids.length})</HeaderButton>
              <HeaderButton icon={<Power size={13} />} onClick={clear}>Enable</HeaderButton>
              <HeaderButton onClick={clear}>Disable</HeaderButton>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>Export</HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View", onClick: () => setSelId(r.id) },
                { label: "Edit", onClick: () => setSelId(r.id) },
                { label: "Assign", onClick: () => setSelId(r.id) },
                { label: "Clone", onClick: () => {} },
                { label: "Disable", onClick: () => {} },
                { label: "Export", onClick: () => {} },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<FileCheck2 size={20} />}
              title="No shared resource policies have been configured."
              hint="Create a shared resource policy to govern how enterprise resources are securely shared across workspaces."
              cta="Create Shared Resource Policy"
              onCta={() => navigate("/admin/workspace-governance?tab=cross")}
            />
          }
        />
      </Card>

      {sel && <PolicyDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function SharedResourcePoliciesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Shared Resource Policies"
        subtitle="Define and enforce enterprise policies governing how resources are securely shared across workspaces."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton variant="primary" icon={<Plus size={14} />} onClick={() => navigate("/admin/workspace-governance?tab=cross")}>
              Create Policy
            </HeaderButton>
          </>
        }
      />
      <SharedResourcePoliciesView />
    </Page>
  );
}

function Section({ title, children, sample }: { title: string; children: React.ReactNode; sample?: boolean }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
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
  { id: "assignments", label: "Resource Assignments", icon: <Boxes size={13} /> },
  { id: "security", label: "Security Controls", icon: <ShieldCheck size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
          <HeaderButton icon={<FlaskConical size={13} />}>Simulate</HeaderButton>
          <HeaderButton icon={<UserCheck size={13} />}>Assign</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>Export</HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "scope" && <ScopeTab rec={rec} />}
      {tab === "rules" && <RulesTab />}
      {tab === "assignments" && <AssignmentsTab rec={rec} />}
      {tab === "security" && <SecurityTab />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
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
              { k: "Enforcement Mode", v: <EnforcementPill status={rec.enforcement} /> },
              { k: "Status", v: rec.status },
              { k: "Version", v: rec.version },
              { k: "Created Date", v: rec.created, sample: true },
            ]}
          />
          <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>{rec.description}</div>
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Assigned Resources", v: rec.assignedResources, sample: true },
              { k: "Workspaces", v: rec.workspaces, sample: true },
              { k: "Exceptions", v: rec.exceptions, sample: true },
              { k: "Violations", v: rec.violations, sample: true },
              { k: "Compliance Controls", v: rec.complianceControls, sample: true },
              { k: "Dependencies", v: rec.dependencies, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function ScopeTab({ rec }: { rec: Policy }) {
  return (
    <Section title="Scope — where the policy applies" sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>Organization → Workspace → Resource → Policy.</div>
      {SCOPES.map((s) => (
        <StatRow key={s} label={s} value={s === rec.scope ? "Applied here" : "—"} tone={s === rec.scope ? "ok" : undefined} sample />
      ))}
    </Section>
  );
}

function RulesTab() {
  const rules = ["Allowed Consumers", "Allowed Providers", "Allowed Permissions", "Allowed Environments", "Required Approval", "Maximum Duration", "Expiration Required", "Conditional Access", "Time Restrictions", "Network Restrictions", "Identity Restrictions", "Classification Restrictions"];
  const operators = ["Equals", "Not Equals", "Contains", "In", "Greater Than", "Less Than", "Starts With", "Ends With"];
  const actions = ["Allow", "Deny", "Require Approval", "Require MFA", "Require Review", "Block"];
  return (
    <Section title="Rules — policy logic (Condition · Operator · Value · Action)" sample>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Select label="Condition" value="Allowed Consumers" onChange={() => {}} options={rules.map((r) => ({ value: r, label: r }))} />
        <Select label="Operator" value="In" onChange={() => {}} options={operators.map((o) => ({ value: o, label: o }))} />
        <Select label="Value" value="Approved Workspaces" onChange={() => {}} options={[{ value: "Approved Workspaces", label: "Approved Workspaces" }]} />
        <Select label="Action" value="Allow" onChange={() => {}} options={actions.map((a) => ({ value: a, label: a }))} />
        <HeaderButton icon={<Plus size={13} />}>Add Rule</HeaderButton>
      </div>
      <Section title="Supported rules">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {rules.map((r) => (
            <span key={r} style={{ fontSize: 12, color: T.textNav, border: `1px solid ${T.border}`, borderRadius: 99, padding: "4px 10px" }}>{r}</span>
          ))}
        </div>
      </Section>
    </Section>
  );
}

function AssignmentsTab({ rec }: { rec: Policy }) {
  const list = Array.from({ length: Math.min(8, rec.assignedResources) }, (_, i) => {
    const m = hashId(`${rec.id}-a-${i}`);
    return {
      id: `${rec.id}-a-${i}`,
      resource: pick(["Shared Database", "Central Secrets", "Shared VPC", "AI Gateway", "Image Registry", "Logging Cluster"], m),
      workspace: pick(WORKSPACES, m),
      provider: pick(PROVIDERS, m),
      classification: pick(["Internal", "Confidential", "Restricted"], m),
      status: pick(["Protected", "Protected", "Pending"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "provider", header: "Provider", render: (r) => r.provider },
    { key: "classification", header: "Classification", render: (r) => r.classification },
    { key: "status", header: "Status", render: (r) => r.status },
  ];
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <HeaderButton icon={<Plus size={13} />}>Assign Resource</HeaderButton>
        <HeaderButton variant="danger" icon={<Trash2 size={13} />}>Remove Resource</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function SecurityTab() {
  const controls = ["Encryption", "MFA", "Conditional Access", "Network Isolation", "Zero Trust", "Secrets Validation", "Identity Validation", "Session Restrictions", "Continuous Monitoring", "Audit Logging"];
  const list = controls.map((c) => {
    const m = hashId(c + "src");
    return { id: c, control: c, required: m % 3 === 0 ? "Optional" : "Required", status: pick(["Enforced", "Enforced", "Partial"], m) };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "control", header: "Control", render: (r) => r.control },
    { key: "required", header: "Required", render: (r) => r.required },
    { key: "status", header: "Status", render: (r) => <span style={{ color: r.status === "Enforced" ? T.success : T.warning }}>{r.status}</span> },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Mandatory security requirements for shared resources. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ComplianceTab({ rec }: { rec: Policy }) {
  const list = FRAMEWORKS.map((f) => {
    const m = hashId(rec.id + f);
    return { id: f, framework: f, control: `${f.split(" ")[0]}-${1 + (m % 12)}`, status: pick(["Compliant", "Compliant", "Gap"], m) };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "framework", header: "Framework", render: (r) => r.framework },
    { key: "control", header: "Control", render: (r) => r.control },
    { key: "status", header: "Status", render: (r) => <span style={{ color: r.status === "Compliant" ? T.success : T.warning }}>{r.status}</span> },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Frameworks and controls mapped to this policy. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ExceptionsTab({ rec }: { rec: Policy }) {
  const list = Array.from({ length: rec.exceptions }, (_, i) => {
    const m = hashId(`${rec.id}-e-${i}`);
    return {
      id: `${rec.id}-e-${i}`,
      exception: `EX-${1000 + (m % 9000)}`,
      workspace: pick(WORKSPACES, m),
      resource: pick(["Shared DB", "Secrets", "AI Gateway"], m),
      reason: pick(["Migration", "Legacy Support", "Customer Requirement"], m),
      approvedBy: pick(OWNERS, m),
      expiration: `2026-0${1 + (m % 8)}-${(1 + (m % 27)).toString().padStart(2, "0")}`,
      status: pick(["Active", "Pending", "Expired"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "exception", header: "Exception", render: (r) => r.exception },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "reason", header: "Reason", render: (r) => r.reason },
    { key: "approvedBy", header: "Approved By", render: (r) => r.approvedBy },
    { key: "status", header: "Status", render: (r) => r.status },
  ];
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <HeaderButton icon={<FilePlus2 size={13} />}>Create Exception</HeaderButton>
        <HeaderButton icon={<ClipboardCheck size={13} />}>Approve</HeaderButton>
        <SampleTag />
      </div>
      {list.length ? <DirectoryTable columns={cols} rows={list} /> : <EmptyState icon={<FilePlus2 size={18} />} title="No exceptions" hint="No approved exceptions to this policy." />}
    </>
  );
}

function SimulationTab() {
  const [ran, setRan] = React.useState(false);
  return (
    <Section title="Simulation — test policy impact before deployment" sample>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Select label="Workspace" value="Payments" onChange={() => {}} options={WORKSPACES.map((w) => ({ value: w, label: w }))} />
        <Select label="Identity" value="Payments API" onChange={() => {}} options={[{ value: "Payments API", label: "Payments API" }]} />
        <Select label="Resource" value="Central Secrets" onChange={() => {}} options={[{ value: "Central Secrets", label: "Central Secrets" }]} />
        <Select label="Permission" value="Read" onChange={() => {}} options={["Read", "Write", "Admin"].map((p) => ({ value: p, label: p }))} />
        <HeaderButton variant="primary" icon={<Play size={13} />} onClick={() => setRan(true)}>Run Simulation</HeaderButton>
      </div>
      {ran ? (
        <>
          <StatRow label="Result" value="Approval Required" tone="warn" sample />
          <StatRow label="Security Check" value="Passed" tone="ok" sample />
          <StatRow label="Compliance Check" value="Passed" tone="ok" sample />
          <StatRow label="Decision" value="Route to Workspace Owner + Security" sample />
        </>
      ) : (
        <div style={{ fontSize: 12.5, color: T.textMuted }}>Configure inputs and run a simulation to preview Allowed / Denied / Approval Required outcomes.</div>
      )}
    </Section>
  );
}

function ActivityTab({ rec }: { rec: Policy }) {
  const events = ["Policy Created", "Policy Updated", "Policy Assigned", "Simulation Executed", "Exception Approved", "Policy Disabled"];
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <Select label="Actor" value="" onChange={() => {}} options={[{ value: "", label: "Actor: All" }, ...OWNERS.map((o) => ({ value: o, label: o }))]} />
        <Select label="Action" value="" onChange={() => {}} options={[{ value: "", label: "Action: All" }, ...events.map((e) => ({ value: e, label: e }))]} />
        <SampleTag />
      </div>
      {events.map((e, i) => (
        <div key={e} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, marginTop: 5, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>{pick(OWNERS, hashId(rec.id) + i)} · {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago</div>
          </div>
        </div>
      ))}
    </>
  );
}

function AuditTab() {
  const events = ["Policy Created", "Policy Updated", "Policy Assigned", "Policy Removed", "Exception Approved", "Simulation Executed", "Compliance Scan", "Security Scan"];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
        <ShieldCheck size={14} /> Read-only immutable log <SampleTag />
      </div>
      {events.map((e, i) => (
        <StatRow key={e} label={e} value={`${pick(OWNERS, i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`} tone="ok" sample />
      ))}
    </>
  );
}

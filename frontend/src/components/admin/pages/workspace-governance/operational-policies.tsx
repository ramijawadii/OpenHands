/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Workspace Policies → Operational Policies */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Upload,
  Copy,
  Download,
  RefreshCcw,
  UserCheck,
  ClipboardCheck,
  Eye,
  Send,
  Archive,
  GitBranch,
  History,
  LayoutGrid,
  ShieldCheck,
  SlidersHorizontal,
  Filter as FilterIcon,
  Gauge,
  Activity as ActivityIcon,
  Scale,
  Trash2,
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
  EnforcementPill,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";

/**
 * Operational Policies — the enterprise operational guardrails that govern how workspaces function
 * once ACTIVE (unlike Creation Policies, which decide whether a workspace can be created). Continuously
 * evaluated across the lifecycle. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/01_Workspace Policies/operational_policies.md.
 *
 * Reuses the Enterprise-Governance UX pattern shared with Organization Hierarchy / Workspace Requests
 * (Banner · Toolbar · Filters · Search · Datatable · Bulk/Row actions · 8-tab Policy Detail Drawer).
 * There is no operational-policy backend yet, so the policy set is deterministic representative sample
 * data (tagged `Sample`); swap SAMPLE_POLICIES for the live query when the policy engine lands — the
 * component API stays identical.
 */

type Category =
  | "Security"
  | "Compliance"
  | "AI"
  | "Cloud"
  | "Automation"
  | "Monitoring"
  | "Cost"
  | "Data";
type Priority = "Critical" | "High" | "Medium" | "Low";
type Status = "Active" | "Draft" | "Archived" | "Disabled";
type Assignment = "Organization" | "Business Unit" | "Workspace";
type Enforcement =
  | "enforced"
  | "monitoring"
  | "draft"
  | "scheduled"
  | "partially-enforced";

const CATEGORIES: Category[] = [
  "Security",
  "Compliance",
  "AI",
  "Cloud",
  "Automation",
  "Monitoring",
  "Cost",
  "Data",
];
const ASSIGNMENTS: Assignment[] = [
  "Organization",
  "Business Unit",
  "Workspace",
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
  Draft: T.textMuted,
  Archived: T.textMuted,
  Disabled: T.warning,
};
const PRIORITY_ORDER: Record<Priority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

interface Policy {
  id: string;
  name: string;
  category: Category;
  priority: Priority;
  assignment: Assignment;
  status: Status;
  version: string;
  modified: string;
  created: string;
  owner: string;
  businessUnit: string;
  environment: string;
  inherited: boolean;
  enforcement: Enforcement;
  description: string;
  // Statistics
  assignments: number;
  evaluations: number;
  violations: number;
  exceptions: number;
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
  "Production Security Baseline",
  "Enterprise MFA Enforcement",
  "Data Residency — EU",
  "AI Autonomous Execution Guardrails",
  "Cloud Cost Controls",
  "Continuous Compliance — SOC 2",
  "Maintenance Window Standard",
  "Secrets Management Baseline",
  "Automation Approval Requirements",
  "Monitoring & Audit Collection",
  "DLP Enforcement",
  "Approved Regions Policy",
  "Backup & Recovery Standard",
  "Model Allow-List",
  "Network Egress Policy",
];

const SAMPLE_POLICIES: Policy[] = POLICY_NAMES.map((name, i) => {
  const id = `OP-${(1000 + i * 7).toString().padStart(5, "0")}`;
  const n = hashId(id + name);
  const priority = pick<Priority>(
    ["Critical", "Critical", "High", "Medium", "Low"],
    n,
  );
  const status = pick<Status>(
    ["Active", "Active", "Active", "Draft", "Disabled", "Archived"],
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
    category: pick(CATEGORIES, n),
    priority,
    assignment: pick(ASSIGNMENTS, n >> 2),
    status,
    version: `v${1 + (n % 8)}`,
    modified: `2026-0${1 + (n % 7)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + ((n + 5) % 27)).toString().padStart(2, "0")}`,
    owner: pick(OWNERS, n),
    businessUnit: pick(BUSINESS_UNITS, n >> 1),
    environment: pick(ENVIRONMENTS, n >> 3),
    inherited: n % 3 === 0,
    enforcement,
    description: `Enterprise operational guardrail governing ${name.toLowerCase()} across active workspaces.`,
    assignments: 3 + (n % 120),
    evaluations: 400 + (n % 5000),
    violations: n % 40,
    exceptions: n % 6,
    complianceScore: 70 + (n % 30),
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

/**
 * Embeddable body — operational dashboard + policy directory + 8-tab detail drawer, WITHOUT the outer
 * <Page> / banner. Rendered as the standalone route and as a leaf of the Workspace Governance console.
 */
export function OperationalPoliciesView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fCat, setFCat] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fPriority, setFPriority] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fInherit, setFInherit] = React.useState("");
  const [fVersion, setFVersion] = React.useState("");
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
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q)) &&
      (!fCat || r.category === fCat) &&
      (!fStatus || r.status === fStatus) &&
      (!fPriority || r.priority === fPriority) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fEnv || r.environment === fEnv) &&
      (!fInherit || (fInherit === "inherited") === r.inherited) &&
      (!fVersion || r.version === fVersion)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFCat("");
    setFStatus("");
    setFPriority("");
    setFBu("");
    setFEnv("");
    setFInherit("");
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
  const active = records.filter((r) => r.status === "Active").length;
  const violations = records.reduce((a, r) => a + r.violations, 0);
  const critViolations = records
    .filter((r) => r.priority === "Critical")
    .reduce((a, r) => a + r.violations, 0);
  const pendingExceptions = records.reduce((a, r) => a + r.exceptions, 0);
  const avgScore = Math.round(
    records.reduce((a, r) => a + r.complianceScore, 0) / records.length,
  );
  const coverage = Math.round((active / records.length) * 100);

  // Toolbar (spec §Toolbar → Policy / Governance / Version Actions).
  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Policy",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=policies"),
    },
    {
      key: "import",
      label: "Import",
      icon: <Upload size={15} />,
      disabled: true,
    },
    {
      key: "duplicate",
      label: "Duplicate",
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
      key: "assign",
      label: "Assign Policy",
      icon: <UserCheck size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Policy",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "preview",
      label: "Preview Evaluation",
      icon: <Eye size={15} />,
      disabled: true,
    },
    {
      key: "publish",
      label: "Publish",
      icon: <Send size={15} />,
      disabled: true,
    },
    {
      key: "archive",
      label: "Archive",
      icon: <Archive size={15} />,
      disabled: true,
    },
    {
      key: "version",
      label: "Create Version",
      icon: <GitBranch size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Versions",
      icon: <History size={15} />,
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
          <ShieldCheck size={14} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortValue: (r) => r.category,
      render: (r) => r.category,
    },
    {
      key: "priority",
      header: "Priority",
      sortValue: (r) => PRIORITY_ORDER[r.priority],
      render: (r) => <PriorityBadge priority={r.priority} />,
    },
    {
      key: "assignment",
      header: "Assignment",
      sortValue: (r) => r.assignment,
      render: (r) => r.assignment,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "version",
      header: "Version",
      sortValue: (r) => r.version,
      render: (r) => r.version,
    },
    {
      key: "modified",
      header: "Last Modified",
      sortValue: (r) => r.modified,
      render: (r) => r.modified,
    },
  ];

  return (
    <>
      {/* Operational Dashboard (spec §Operational Dashboard) */}
      <StatStripPlain
        items={[
          { label: "Active Policies", value: active, tone: "ok" },
          {
            label: "Policy Coverage",
            value: `${coverage}%`,
            tone: coverage >= 80 ? "ok" : "warn",
          },
          {
            label: "Workspace Compliance",
            value: `${avgScore}%`,
            tone: avgScore >= 85 ? "ok" : "warn",
          },
          {
            label: "Policy Violations",
            value: violations,
            tone: violations > 0 ? "warn" : "ok",
          },
          {
            label: "Critical Violations",
            value: critViolations,
            tone: critViolations > 0 ? "danger" : "ok",
          },
          {
            label: "Pending Exceptions",
            value: pendingExceptions,
            tone: pendingExceptions > 0 ? "warn" : "ok",
          },
          {
            label: "Avg Compliance Score",
            value: `${avgScore}%`,
            tone: avgScore >= 85 ? "ok" : "warn",
          },
        ]}
      />

      {/* Policy directory (spec §Table + §Toolbar + §Filters + §Search + §Row/Bulk Actions) */}
      <DiscoveryListView
        title="Operational policies"
        desc="Operational Policies continuously enforce security, governance, compliance, AI, cloud and cost standards throughout every workspace's lifecycle."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search operational policies — name, description, workspace, category, business unit, tags…"
        count={rows.length}
        pills={[
          {
            key: "category",
            label: "Category",
            value: fCat,
            onChange: setFCat,
            options: facet(records.map((r) => r.category)),
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
            key: "inheritance",
            label: "Inheritance",
            value: fInherit,
            onChange: setFInherit,
            options: [
              { value: "", label: "All" },
              { value: "inherited", label: "Inherited" },
              { value: "direct", label: "Direct" },
            ],
          },
          {
            key: "version",
            label: "Version",
            value: fVersion,
            onChange: setFVersion,
            options: facet(records.map((r) => r.version)),
          },
        ]}
        presets={[{ label: "All operational policies", onApply: clearFilters }]}
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
            <HeaderButton icon={<UserCheck size={13} />} onClick={clear}>
              Assign ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<ClipboardCheck size={13} />} onClick={clear}>
              Enable
            </HeaderButton>
            <HeaderButton onClick={clear}>Disable</HeaderButton>
            <HeaderButton icon={<Download size={13} />} onClick={clear}>
              Export
            </HeaderButton>
            <HeaderButton icon={<Archive size={13} />} onClick={clear}>
              Archive
            </HeaderButton>
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "View", onClick: () => setSelId(r.id) },
              { label: "Edit", onClick: () => setSelId(r.id) },
              { label: "Assign", onClick: () => setSelId(r.id) },
              { label: "Duplicate", onClick: () => {} },
              { label: "Preview Evaluation", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
              { label: "Archive", onClick: () => setSelId(r.id) },
              {
                label: "Delete",
                onClick: () => setSelId(r.id),
                danger: true,
              },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Scale size={20} />}
            title="No operational policies found."
            hint="Create an operational policy to enforce security, governance, compliance and operational standards across active workspaces."
            cta="Create Operational Policy"
            onCta={() => navigate("/admin/workspace-governance?tab=policies")}
          />
        }
      />

      {sel && <PolicyDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function OperationalPoliciesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Operational Policies"
        subtitle="Define the operational standards, governance controls, security requirements and runtime behavior for enterprise workspaces."
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
              Create Policy
            </HeaderButton>
          </>
        }
      />
      <OperationalPoliciesView />
    </Page>
  );
}

// ── Shared drawer section helper ────────────────────────────────────────────────────────────────────
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

// A labelled group of "settings" (the Operational Controls sub-groups). Text-only controls (the
// operational-policy backend is not wired), each rendered as a StatRow so the group reads as a
// configured baseline.
function ControlGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title} sample>
      {items.map((it) => (
        <StatRow key={it} label={it} value="Configured" tone="ok" sample />
      ))}
    </Section>
  );
}

// ════════════ Policy Detail Drawer — 8 sub-tabs (spec §Policy Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "controls",
    label: "Operational Controls",
    icon: <SlidersHorizontal size={13} />,
  },
  { id: "conditions", label: "Conditions", icon: <FilterIcon size={13} /> },
  { id: "enforcement", label: "Enforcement", icon: <ShieldCheck size={13} /> },
  { id: "assignments", label: "Assignments", icon: <UserCheck size={13} /> },
  { id: "evaluation", label: "Evaluation", icon: <Gauge size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
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
      subtitle={`${rec.category} · ${rec.priority} · ${rec.status} · ${rec.version} · ${rec.assignment}`}
      width={820}
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
          <HeaderButton icon={<UserCheck size={13} />}>Assign</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "controls" && <ControlsTab />}
      {tab === "conditions" && <ConditionsTab />}
      {tab === "enforcement" && <EnforcementTab rec={rec} />}
      {tab === "assignments" && <AssignmentsTab rec={rec} />}
      {tab === "evaluation" && <EvaluationTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

// ── Overview (General · Scope · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "scope", label: "Scope" },
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
              { k: "Category", v: rec.category },
              { k: "Priority", v: rec.priority },
              { k: "Status", v: rec.status },
              { k: "Version", v: rec.version },
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
      {sub === "scope" && (
        <Section title="Scope" sample>
          <StatRow label="Organization" value="Contoso Enterprise" sample />
          <StatRow label="Business Unit" value={rec.businessUnit} sample />
          <StatRow
            label="Workspace"
            value={rec.assignment === "Workspace" ? "3 workspaces" : "—"}
            sample
          />
          <StatRow
            label="Inherited Scope"
            value={
              rec.inherited
                ? "Inherited from Organization"
                : "Direct assignment"
            }
            tone={rec.inherited ? "ok" : undefined}
            sample
          />
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Assignments", v: rec.assignments, sample: true },
              {
                k: "Evaluations",
                v: rec.evaluations.toLocaleString(),
                sample: true,
              },
              { k: "Violations", v: rec.violations, sample: true },
              { k: "Exceptions", v: rec.exceptions, sample: true },
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

// ── Operational Controls (10 sub-groups, spec §Operational Controls) ──
const CONTROL_SUBS = [
  { id: "workspace", label: "Workspace" },
  { id: "cloud", label: "Cloud" },
  { id: "ai", label: "AI" },
  { id: "integration", label: "Integration" },
  { id: "automation", label: "Automation" },
  { id: "security", label: "Security" },
  { id: "compliance", label: "Compliance" },
  { id: "monitoring", label: "Monitoring" },
  { id: "cost", label: "Cost" },
  { id: "data", label: "Data" },
];
function ControlsTab() {
  const [sub, setSub] = React.useState("workspace");
  const GROUPS: Record<string, { title: string; items: string[] }> = {
    workspace: {
      title: "Workspace Operations",
      items: [
        "Workspace Availability",
        "Maintenance Windows",
        "Lifecycle Restrictions",
        "Operational Hours",
        "Business Calendar",
        "Workspace Lockdown",
      ],
    },
    cloud: {
      title: "Cloud Operations",
      items: [
        "Allowed Cloud Providers",
        "Approved Regions",
        "Resource Provisioning",
        "Resource Deletion",
        "Resource Limits",
        "Cloud Tagging",
        "Cloud Cost Controls",
      ],
    },
    ai: {
      title: "AI Operations",
      items: [
        "Allowed AI Providers",
        "Approved Models",
        "Prompt Restrictions",
        "Knowledge Sources",
        "Context Policies",
        "AI Guardrails",
        "Autonomous Execution",
        "Human Approval",
      ],
    },
    integration: {
      title: "Integration Operations",
      items: [
        "Allowed Integrations",
        "MCP Servers",
        "Connector Policies",
        "API Restrictions",
        "Webhook Policies",
        "Credential Policies",
      ],
    },
    automation: {
      title: "Automation Operations",
      items: [
        "Allowed Automation",
        "Scheduling",
        "Approval Requirements",
        "Execution Windows",
        "Rollback Policies",
        "Retry Policies",
      ],
    },
    security: {
      title: "Security Operations",
      items: [
        "Authentication Requirements",
        "MFA Enforcement",
        "Conditional Access",
        "Encryption",
        "Secret Management",
        "Network Policies",
        "DLP",
        "Session Policies",
      ],
    },
    compliance: {
      title: "Compliance Operations",
      items: [
        "Required Frameworks",
        "Continuous Monitoring",
        "Evidence Collection",
        "Compliance Scans",
        "Control Enforcement",
        "Risk Thresholds",
      ],
    },
    monitoring: {
      title: "Monitoring Operations",
      items: [
        "Logging",
        "Alerting",
        "Metrics Collection",
        "Health Monitoring",
        "Availability Monitoring",
        "Performance Monitoring",
        "Audit Collection",
      ],
    },
    cost: {
      title: "Cost Controls",
      items: [
        "Budget Limits",
        "Resource Quotas",
        "Cost Alerts",
        "Resource Optimization",
        "Chargeback Policies",
      ],
    },
    data: {
      title: "Data Governance",
      items: [
        "Classification",
        "Retention",
        "Data Residency",
        "Backup Policies",
        "Recovery Policies",
        "Deletion Policies",
      ],
    },
  };
  const g = GROUPS[sub];
  return (
    <>
      <Tabs tabs={CONTROL_SUBS} active={sub} onChange={setSub} />
      <ControlGroup title={g.title} items={g.items} />
    </>
  );
}

// ── Conditions (rule builder, spec §Conditions) ──
function ConditionsTab() {
  const attrs = [
    "Environment",
    "Workspace Type",
    "Business Unit",
    "Cloud Provider",
    "Region",
    "Compliance Program",
    "Risk Level",
    "Classification",
    "Business Criticality",
    "Workspace Tags",
  ];
  const operators = [
    "Equals",
    "Contains",
    "Starts With",
    "Ends With",
    "Greater Than",
    "Less Than",
    "In",
    "Not In",
  ];
  return (
    <Section title="Conditions — when this policy applies" sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Rule builder:{" "}
        <strong style={{ color: T.textNav }}>
          Attribute · Operator · Value
        </strong>
        . All rules must match for the policy to apply.
      </div>
      <div
        style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}
      >
        <Select
          label="Attribute"
          value="Environment"
          onChange={() => {}}
          options={attrs.map((a) => ({ value: a, label: a }))}
        />
        <Select
          label="Operator"
          value="Equals"
          onChange={() => {}}
          options={operators.map((o) => ({ value: o, label: o }))}
        />
        <Select
          label="Value"
          value="Production"
          onChange={() => {}}
          options={ENVIRONMENTS.map((e) => ({ value: e, label: e }))}
        />
        <HeaderButton icon={<Plus size={13} />}>Add Rule</HeaderButton>
      </div>
      <Section title="Supported Conditions">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {attrs.map((a) => (
            <span
              key={a}
              style={{
                fontSize: 12,
                color: T.textNav,
                border: `1px solid ${T.border}`,
                borderRadius: 99,
                padding: "4px 10px",
              }}
            >
              {a}
            </span>
          ))}
        </div>
      </Section>
    </Section>
  );
}

// ── Enforcement (modes / violation actions, spec §Enforcement) ──
function EnforcementTab({ rec }: { rec: Policy }) {
  const modes = [
    "Monitor Only",
    "Warn",
    "Block",
    "Require Approval",
    "Automatic Remediation",
  ];
  const actions = [
    "Generate Alert",
    "Create Incident",
    "Open Support Case",
    "Run Automation",
    "Notify Owner",
    "Escalate",
  ];
  return (
    <>
      <Section title="Current enforcement" sample>
        <StatRow
          label="Enforcement Status"
          value={<EnforcementPill status={rec.enforcement} />}
          sample
        />
        <StatRow
          label="Priority"
          value={<PriorityBadge priority={rec.priority} />}
          sample
        />
      </Section>
      <Section title="Enforcement modes" sample>
        {modes.map((m, i) => (
          <StatRow
            key={m}
            label={m}
            value={i === 2 ? "Selected" : "Available"}
            tone={i === 2 ? "ok" : undefined}
            sample
          />
        ))}
      </Section>
      <Section title="Violation actions" sample>
        {actions.map((a) => (
          <StatRow key={a} label={a} value="Enabled" tone="ok" sample />
        ))}
      </Section>
    </>
  );
}

// ── Assignments (spec §Assignments) ──
function AssignmentsTab({ rec }: { rec: Policy }) {
  const n = hashId(rec.id);
  const list = Array.from({ length: 2 + (n % 4) }, (_, i) => {
    const m = hashId(`${rec.id}-a-${i}`);
    return {
      id: `${rec.id}-a-${i}`,
      assignment: `${pick(BUSINESS_UNITS, m)} ${pick(ENVIRONMENTS, m)}`,
      scope: pick(ASSIGNMENTS, m),
      inherited: m % 2 === 0 ? "Inherited" : "Direct",
      status: pick<Status>(["Active", "Active", "Disabled"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "assignment", header: "Assignment", render: (r) => r.assignment },
    { key: "scope", header: "Scope", render: (r) => r.scope },
    { key: "inherited", header: "Inherited", render: (r) => r.inherited },
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
        <HeaderButton icon={<UserCheck size={13} />}>Assign</HeaderButton>
        <HeaderButton variant="danger" icon={<Trash2 size={13} />}>
          Remove Assignment
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
        Where this operational policy is enforced.
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

// ── Evaluation (spec §Evaluation) ──
function EvaluationTab({ rec }: { rec: Policy }) {
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
        <HeaderButton icon={<Gauge size={13} />}>Run Evaluation</HeaderButton>
        <HeaderButton icon={<Eye size={13} />}>View Violations</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>
          Generate Report
        </HeaderButton>
        <SampleTag />
      </div>
      <Section title="Current operational compliance state" sample>
        <StatRow
          label="Policy Compliance"
          value={`${rec.complianceScore}%`}
          tone={rec.complianceScore >= 85 ? "ok" : "warn"}
          sample
        />
        <StatRow
          label="Violations"
          value={rec.violations}
          tone={rec.violations > 0 ? "warn" : "ok"}
          sample
        />
        <StatRow
          label="Warnings"
          value={rec.violations + (hashId(rec.id) % 5)}
          sample
        />
        <StatRow label="Effective Policy" value={rec.version} sample />
        <StatRow
          label="Inherited Policies"
          value={rec.inherited ? "1 from Organization" : "None"}
          sample
        />
        <StatRow
          label="Overrides"
          value={`${hashId(rec.id) % 3} at this scope`}
          sample
        />
      </Section>
    </>
  );
}

// ── Activity timeline (spec §Activity) ──
function ActivityTab({ rec }: { rec: Policy }) {
  const events = [
    "Policy Created",
    "Policy Updated",
    "Policy Assigned",
    "Evaluation Executed",
    "Violation Detected",
    "Policy Published",
    "Exception Granted",
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

// ── Audit History (immutable, read-only — spec §Audit History) ──
function AuditTab() {
  const events = [
    "Policy Created",
    "Policy Modified",
    "Assignment Changed",
    "Version Published",
    "Violation Recorded",
    "Policy Disabled",
    "Exception Approved",
    "Policy Deleted",
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

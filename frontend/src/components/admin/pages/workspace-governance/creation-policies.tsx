/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Workspace Policies → Creation Policies */
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
  DoorOpen,
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
 * Creation Policies — the platform's ADMISSION GATE: the enterprise guardrails that decide whether,
 * how, and under what conditions a workspace may be created. Evaluated BEFORE a workspace exists
 * (Request · Validation · Approval · Provisioning), unlike Operational Policies which continuously
 * enforce standards once a workspace is Active. A workspace that fails Creation Policy evaluation is
 * never provisioned. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/01_Workspace Policies/creation_policies.md.
 *
 * Reuses the Enterprise-Governance UX pattern shared with the other policy leaves (Banner · Toolbar ·
 * Filters · Search · Datatable · Bulk/Row actions · 8-tab Policy Detail Drawer). There is no
 * creation-policy backend yet, so the policy set is deterministic representative sample data (tagged
 * `Sample`); swap SAMPLE_POLICIES for the live query when the policy engine lands — the component API
 * stays identical.
 */

type Category =
  | "Provisioning"
  | "Eligibility"
  | "Template"
  | "Metadata"
  | "Placement"
  | "Quota"
  | "Security"
  | "Compliance";
type Priority = "Critical" | "High" | "Medium" | "Low";
type Status = "Active" | "Draft" | "Archived" | "Disabled";
type Assignment = "Organization" | "Business Unit" | "Workspace Type";
type Enforcement =
  | "enforced"
  | "monitoring"
  | "draft"
  | "scheduled"
  | "partially-enforced";

const CATEGORIES: Category[] = [
  "Provisioning",
  "Eligibility",
  "Template",
  "Metadata",
  "Placement",
  "Quota",
  "Security",
  "Compliance",
];
const ASSIGNMENTS: Assignment[] = [
  "Organization",
  "Business Unit",
  "Workspace Type",
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
  // Statistics (spec §Statistics — creation-time counters)
  assignments: number;
  requests: number;
  approved: number;
  rejected: number;
  pendingApprovals: number;
  exceptions: number;
  approvalHours: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

const POLICY_NAMES = [
  "Production Workspace Admission",
  "Approved Template Enforcement",
  "Naming Convention Standard",
  "Required Metadata Gate",
  "EU Placement Restriction",
  "Creation Quota — Business Unit",
  "Self-Service Eligibility",
  "Security Baseline at Creation",
  "Compliance Framework Requirement",
  "Provisioning Window Control",
  "Cost Center Requirement",
  "Blocked Template List",
  "Isolation Requirement",
  "Owner Delegation Rules",
  "Sandbox Auto-Approval",
];

const SAMPLE_POLICIES: Policy[] = POLICY_NAMES.map((name, i) => {
  const id = `CP-${(1000 + i * 7).toString().padStart(5, "0")}`;
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
  const requests = 20 + (n % 260);
  const rejected = n % 24;
  const pendingApprovals = n % 9;
  const approved = Math.max(0, requests - rejected - pendingApprovals);
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
    description: `Creation-time admission control governing ${name.toLowerCase()} before a workspace is provisioned.`,
    assignments: 3 + (n % 120),
    requests,
    approved,
    rejected,
    pendingApprovals,
    exceptions: n % 6,
    approvalHours: 1 + (n % 47),
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
 * Embeddable body — creation dashboard + policy directory + 8-tab detail drawer, WITHOUT the outer
 * <Page> / banner. Rendered as the standalone route and as a leaf of the Workspace Governance console.
 */
export function CreationPoliciesView() {
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

  // Creation Dashboard (spec §Creation Dashboard).
  const active = records.filter((r) => r.status === "Active").length;
  const requests = records.reduce((a, r) => a + r.requests, 0);
  const approved = records.reduce((a, r) => a + r.approved, 0);
  const rejected = records.reduce((a, r) => a + r.rejected, 0);
  const pendingApprovals = records.reduce((a, r) => a + r.pendingApprovals, 0);
  const pendingExceptions = records.reduce((a, r) => a + r.exceptions, 0);
  const avgApprovalTime = Math.round(
    records.reduce((a, r) => a + r.approvalHours, 0) / records.length,
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
          <DoorOpen size={14} color={T.textMuted} />
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
      {/* Creation Dashboard (spec §Creation Dashboard) */}
      <PostureGrid>
        <PostureCard
          title="Active Policies"
          value={active}
          tone="ok"
          sub={
            <>
              Enforced at creation <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Policy Coverage"
          value={`${coverage}%`}
          tone={coverage >= 80 ? "ok" : "warn"}
          sub={
            <>
              Workspace types gated <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Creation Requests"
          value={requests.toLocaleString()}
          tone="ok"
          sub={
            <>
              Submitted this period <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Approved Creations"
          value={approved.toLocaleString()}
          tone="ok"
          sub={
            <>
              Passed admission gate <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Rejected Requests"
          value={rejected}
          tone={rejected > 0 ? "warn" : "ok"}
          sub={
            <>
              Blocked by policy <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Pending Approvals"
          value={pendingApprovals}
          tone={pendingApprovals > 0 ? "warn" : "ok"}
          sub={
            <>
              Awaiting decision <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Pending Exceptions"
          value={pendingExceptions}
          tone={pendingExceptions > 0 ? "warn" : "ok"}
          sub={
            <>
              Awaiting review <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Avg Approval Time"
          value={`${avgApprovalTime}h`}
          tone={avgApprovalTime <= 24 ? "ok" : "warn"}
          sub={
            <>
              Request to provision <SampleTag />
            </>
          }
        />
      </PostureGrid>

      {/* Policy directory (spec §Table + §Toolbar + §Filters + §Search + §Row/Bulk Actions) */}
      <DiscoveryListView
        title="Creation policies"
        desc="Creation Policies are the admission gate — they decide whether a workspace can be created, through which template and request, under which approvals, quotas and provisioning constraints. Evaluated across Request · Validation · Approval · Provisioning."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search creation policies — name, description, workspace type, category, business unit, tags…"
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
        presets={[{ label: "All creation policies", onApply: clearFilters }]}
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
            title="No creation policies found."
            hint="Create a creation policy to govern who may create workspaces, through which templates and requests, under which approvals, quotas and provisioning constraints."
            cta="Create Creation Policy"
            onCta={() => navigate("/admin/workspace-governance?tab=policies")}
          />
        }
      />

      {sel && <PolicyDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function CreationPoliciesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Creation Policies"
        subtitle="Define who may create workspaces, through which templates and requests, under which approvals, quotas and provisioning constraints."
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
      <CreationPoliciesView />
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

// A labelled group of "settings" (the Creation Controls sub-groups). Text-only controls (the
// creation-policy backend is not wired), each rendered as a StatRow so the group reads as a
// configured admission rule set.
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
    label: "Creation Controls",
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
            label="Workspace Type"
            value={rec.assignment === "Workspace Type" ? "3 types" : "—"}
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
                k: "Creation Requests",
                v: rec.requests.toLocaleString(),
                sample: true,
              },
              { k: "Approved Creations", v: rec.approved, sample: true },
              { k: "Rejected Requests", v: rec.rejected, sample: true },
              { k: "Pending Approvals", v: rec.pendingApprovals, sample: true },
              { k: "Exceptions", v: rec.exceptions, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Creation Controls (8 sub-groups, spec §Creation Controls) ──
const CONTROL_SUBS = [
  { id: "eligibility", label: "Eligibility" },
  { id: "templates", label: "Templates" },
  { id: "naming", label: "Naming" },
  { id: "metadata", label: "Metadata" },
  { id: "placement", label: "Placement" },
  { id: "config", label: "Initial Config" },
  { id: "quota", label: "Quota" },
  { id: "provisioning", label: "Provisioning" },
];
function ControlsTab() {
  const [sub, setSub] = React.useState("eligibility");
  const GROUPS: Record<string, { title: string; items: string[] }> = {
    eligibility: {
      title: "Eligibility",
      items: [
        "Allowed Requesters",
        "Allowed Roles",
        "Allowed Business Units",
        "Allowed Owners",
        "Delegation Rules",
        "Self-Service Eligibility",
      ],
    },
    templates: {
      title: "Allowed Templates",
      items: [
        "Approved Templates",
        "Mandatory Template",
        "Template Version Constraints",
        "Blueprint Restrictions",
        "Blocked Templates",
        "Template Parameter Constraints",
      ],
    },
    naming: {
      title: "Naming & Identity",
      items: [
        "Naming Convention",
        "Prefix Rules",
        "Suffix Rules",
        "Reserved Names",
        "Uniqueness Requirements",
        "Slug Format",
      ],
    },
    metadata: {
      title: "Required Metadata",
      items: [
        "Owner",
        "Business Unit",
        "Cost Center",
        "Environment",
        "Data Classification",
        "Business Criticality",
        "Required Tags",
        "Description",
      ],
    },
    placement: {
      title: "Placement Constraints",
      items: [
        "Allowed Environments",
        "Allowed Cloud Providers",
        "Approved Regions",
        "Allowed Organizational Units",
        "Parent Workspace Rules",
        "Isolation Requirements",
      ],
    },
    config: {
      title: "Initial Configuration",
      items: [
        "Default Configuration Profile",
        "Mandatory Security Baseline",
        "Required Integrations",
        "Required Compliance Frameworks",
        "Encryption Requirements",
        "Network Defaults",
      ],
    },
    quota: {
      title: "Quota & Capacity",
      items: [
        "Workspace Count Limits",
        "Per-Owner Limits",
        "Per-Business-Unit Limits",
        "Resource Quotas at Creation",
        "Budget Allocation",
        "Capacity Availability Check",
      ],
    },
    provisioning: {
      title: "Provisioning Constraints",
      items: [
        "Provisioning Method",
        "Provisioning Windows",
        "Region Availability",
        "Dependency Prerequisites",
        "Post-Creation Actions",
        "Rollback on Failure",
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
    "Requested Tags",
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
    "Auto-Correct",
  ];
  const actions = [
    "Reject Request",
    "Generate Alert",
    "Create Incident",
    "Require Approval",
    "Notify Requester",
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
        <div style={{ fontSize: 12, color: T.textMuted, paddingTop: 6 }}>
          A blocking Creation Policy prevents provisioning until the violation
          is resolved or an approved exception is granted.
        </div>
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
        Where this creation policy is enforced.
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

// ── Evaluation (spec §Evaluation) ──
function EvaluationTab({ rec }: { rec: Policy }) {
  const compliance = Math.round(
    (rec.approved / Math.max(1, rec.requests)) * 100,
  );
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
      <Section title="Current creation-time compliance state" sample>
        <StatRow
          label="Request Compliance"
          value={`${compliance}%`}
          tone={compliance >= 85 ? "ok" : "warn"}
          sample
        />
        <StatRow
          label="Blocking Violations"
          value={rec.rejected}
          tone={rec.rejected > 0 ? "warn" : "ok"}
          sample
        />
        <StatRow
          label="Warnings"
          value={rec.pendingApprovals + (hashId(rec.id) % 5)}
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
    "Request Evaluated",
    "Request Rejected",
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
    "Request Blocked",
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

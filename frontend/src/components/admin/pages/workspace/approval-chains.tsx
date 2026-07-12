/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Ownership & Administration → Approval Chains */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Copy,
  Upload,
  Download,
  RefreshCcw,
  Send,
  PowerOff,
  Archive,
  CheckCircle2,
  PlayCircle,
  GitCompare,
  Link2,
  Check,
  X,
  GitBranch,
  LayoutGrid,
  Zap,
  ListChecks,
  Inbox,
  Activity as ActivityIcon,
  BarChart3,
  History,
  ShieldCheck,
  Clock,
  Workflow,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Card,
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
 * Approval Chains — reusable, policy-driven approval workflows required before administrative,
 * governance, security, compliance, operational, or financial actions run inside a workspace.
 * Authoritative spec: docs/workspace/workspace_module/…/Workspace Administration/
 * 02_Ownership & Administration/approval_chains.md.
 *
 * Chains enforce separation of duties, delegated authority, regulatory requirements and business
 * accountability. They are referenced across the platform (Workspace Requests, Provisioning Queue,
 * Compliance Center, Commercial Center, Identity & Access, Agent Security Control Plane…) rather
 * than duplicated. Every approval decision is fully audited, traceable and reusable.
 *
 * Reuses the Enterprise-Administration UX pattern shared with the Users module (Banner · Toolbar ·
 * Filters · Search · Data Table · Bulk/Row actions · Approval Chain Detail Drawer with 8 sub-tabs).
 *
 * There is no approval-chain backend yet, so the chain set is representative sample data (tagged
 * `Sample` in the UI). When the policy/approval engine lands, swap SAMPLE_CHAINS for the live query —
 * the component API stays identical.
 */

// ── Domain vocabulary (verbatim from the spec) ────────────────────────────────────────────────────
type Status = "Active" | "Draft" | "Disabled" | "Archived";

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Draft: T.textMuted,
  Disabled: T.warning,
  Archived: T.textMuted,
};

// Approval Types → Supported Categories (spec §Approval Types).
const CATEGORIES = [
  "Workspace Administration",
  "Governance",
  "Compliance",
  "Security",
  "Cloud Resources",
  "Identity & Access",
  "Financial",
  "AI Governance",
  "Operations",
  "Platform Configuration",
];

// Workflow Stages → Supported Approval Rules (spec §Workflow Stages).
const APPROVAL_RULES = [
  "Single Approval",
  "Majority",
  "All Approvers",
  "Any Approver",
  "Sequential",
  "Parallel",
  "Conditional",
];

// Stage → Approver Type pool.
const APPROVER_TYPES = [
  "Manager",
  "Business Owner",
  "Workspace Owner",
  "Security Officer",
  "Compliance Officer",
  "Organization Administrator",
  "Governance Administrator",
];

// Triggers → Supported Triggers (spec §Triggers).
const TRIGGERS = [
  "Workspace Creation",
  "Workspace Deletion",
  "Workspace Archive",
  "Production Promotion",
  "Cloud Account Connection",
  "Identity Changes",
  "Role Assignment",
  "Compliance Exception",
  "Policy Override",
  "Budget Increase",
  "AI Agent Deployment",
  "Integration Installation",
  "Cross-Workspace Access",
];

// Escalation Policies (spec §Escalation Policies).
const ESCALATION_POLICIES = [
  "Manager Escalation",
  "Business Owner",
  "Workspace Owner",
  "Organization Administrator",
  "Compliance Officer",
  "Security Officer",
  "Time-Based Escalation",
  "Automatic Approval",
  "Automatic Rejection",
];

// Notifications (spec §Notifications).
const NOTIFICATIONS = [
  "Email",
  "Microsoft Teams",
  "Slack",
  "Mobile Push",
  "Webhook",
  "ServiceNow",
];

// Workflow Builder → Supported Components (spec §Workflow Builder).
const BUILDER_COMPONENTS = [
  "Approvals",
  "Conditions",
  "Parallel Branches",
  "Timers",
  "Escalations",
  "Notifications",
  "Webhooks",
  "Automation",
];

const OWNERS = [
  "Platform Governance",
  "Security Office",
  "Compliance Office",
  "Cloud Operations",
  "Finance Governance",
  "AI Governance Board",
];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const WORKSPACES = [
  "Payments Production",
  "Platform Core",
  "Security Operations",
  "Data Lakehouse",
  "Retail Storefront",
  "Fraud Analytics",
];
const REQUESTERS = [
  "John Smith",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
  "David Chen",
  "Aisha Khan",
];
const TIMEOUTS = ["4h", "24h", "48h", "72h"];
const STAGE_NAME_POOL = [
  "Initial Review",
  "Manager Approval",
  "Security Review",
  "Compliance Review",
  "Business Approval",
  "Operations Approval",
  "Final Approval",
];

// The 14 canonical chains (spec Purpose examples + the platform's high-impact operations).
const CHAIN_NAMES = [
  "Production Workspace Approval",
  "Workspace Creation Approval",
  "Cloud Account Onboarding",
  "Compliance Exception Approval",
  "AI Agent Deployment Approval",
  "Privileged Access Approval",
  "Budget Increase Approval",
  "Workspace Decommissioning",
  "Production Promotion Gate",
  "Cross-Workspace Access Approval",
  "Policy Override Approval",
  "Role Assignment Approval",
  "Integration Installation Approval",
  "Identity Change Approval",
];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface StageDef {
  name: string;
  approverType: string;
  requiredApprovers: number;
  approvalRule: string;
  timeout: string;
  escalation: string;
}

interface ChainRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  approvalType: string; // execution mode: Sequential / Parallel / Conditional / rule
  owner: string;
  version: string;
  status: Status;
  builtIn: boolean;
  isTemplate: boolean;
  workspace: string;
  businessUnit: string;
  environment: string;
  stageCount: number;
  assignedWorkspaces: number;
  created: string;
  modified: string;
  // Statistics / Metrics
  approvalRequests: number;
  avgApprovalTimeH: number;
  pendingRequests: number;
  rejectedRequests: number;
  escalations: number;
  successRate: number;
  timeouts: number;
  slaCompliance: number;
  currentStageIdx: number;
  // Config
  stages: StageDef[];
  triggers: string[];
  escalationPolicy: string;
  expirationPolicy: string;
  notifications: string[];
  tags: string[];
}

const SAMPLE_CHAINS: ChainRecord[] = CHAIN_NAMES.map((name, i) => {
  const id = `ACH-${(1001 + i * 3).toString().padStart(5, "0")}`;
  const n = hashId(id + name);
  const builtIn = i < 5;
  const isTemplate = i >= 11; // last few double as reusable templates
  const status: Status = isTemplate
    ? "Draft"
    : i === 7
      ? "Archived"
      : i === 9
        ? "Disabled"
        : "Active";
  const stageCount = 2 + (n % 5); // 2..6
  const stages: StageDef[] = Array.from({ length: stageCount }, (_, s) => ({
    name: STAGE_NAME_POOL[Math.min(s, STAGE_NAME_POOL.length - 1)],
    approverType: pick(APPROVER_TYPES, n + s),
    requiredApprovers: 1 + ((n + s) % 3),
    approvalRule: pick(APPROVAL_RULES, n + s * 2),
    timeout: pick(TIMEOUTS, n + s),
    escalation: pick(ESCALATION_POLICIES, n + s + 1),
  }));
  const triggerCount = 2 + (n % 4);
  const triggers = Array.from(
    { length: triggerCount },
    (_, t) => TRIGGERS[(n + t * 3) % TRIGGERS.length],
  ).filter((v, idx, a) => a.indexOf(v) === idx);
  const notifCount = 2 + (n % 3);
  const notifications = Array.from(
    { length: notifCount },
    (_, t) => NOTIFICATIONS[(n + t) % NOTIFICATIONS.length],
  ).filter((v, idx, a) => a.indexOf(v) === idx);
  return {
    id,
    name,
    description: `${name} — enforces separation of duties for ${pick(CATEGORIES, n).toLowerCase()} actions across enterprise workspaces.`,
    category: pick(CATEGORIES, n),
    approvalType: pick(
      ["Sequential", "Parallel", "Conditional", "Majority", "All Approvers"],
      n >> 1,
    ),
    owner: pick(OWNERS, n),
    version: `v${1 + (n % 3)}.${n % 5}`,
    status,
    builtIn,
    isTemplate,
    workspace: pick(WORKSPACES, n),
    businessUnit: pick(BUSINESS_UNITS, n >> 2),
    environment: pick(ENVIRONMENTS, n >> 3),
    stageCount,
    assignedWorkspaces: isTemplate ? 0 : 2 + (n % 40),
    created: `2026-0${1 + (n % 6)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    modified: `2026-0${6 + (n % 2)}-${(1 + ((n + 5) % 27)).toString().padStart(2, "0")}`,
    approvalRequests: 40 + (n % 900),
    avgApprovalTimeH: 2 + (n % 46),
    pendingRequests: n % 12,
    rejectedRequests: n % 30,
    escalations: n % 18,
    successRate: 80 + (n % 20),
    timeouts: n % 9,
    slaCompliance: 85 + (n % 15),
    currentStageIdx: Math.min(1 + (n % stageCount), stageCount - 1),
    stages,
    triggers,
    escalationPolicy: pick(ESCALATION_POLICIES, n),
    expirationPolicy: pick(
      ["30 days", "60 days", "90 days", "No expiration"],
      n,
    ),
    notifications,
    tags: [
      pick(["governance", "security", "finance", "operations"], n),
      pick(["critical", "standard", "regulated"], n >> 1),
      pick(BUSINESS_UNITS, n >> 2).toLowerCase(),
    ],
  };
});

// ── Second-level sub-navigation (spec §Navigation) ────────────────────────────────────────────────
const VIEW_OPTIONS = [
  { id: "active", label: "Active Chains" },
  { id: "builtin", label: "Built-in Chains" },
  { id: "custom", label: "Custom Chains" },
  { id: "pending", label: "Pending Approvals" },
  { id: "history", label: "Approval History" },
  { id: "archived", label: "Archived" },
  { id: "templates", label: "Templates" },
];

function matchesView(r: ChainRecord, view: string): boolean {
  switch (view) {
    case "active":
      return r.status === "Active";
    case "builtin":
      return r.builtIn && !r.isTemplate;
    case "custom":
      return !r.builtIn && !r.isTemplate;
    case "pending":
      return r.pendingRequests > 0;
    case "history":
      return r.approvalRequests > 0;
    case "archived":
      return r.status === "Archived";
    case "templates":
      return r.isTemplate;
    default:
      return true;
  }
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
 * Embeddable body — Operational Dashboard + sub-navigation + directory + Approval Chain detail
 * drawer, WITHOUT the outer <Page> or the page banner. Rendered both as the standalone route and as
 * a tab of the Workspace Administration console. Uses local state for the view sub-nav so it never
 * collides with a host page's `?tab=`.
 */
export function ApprovalChainsView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("active");

  const [search, setSearch] = React.useState("");
  const [fCategory, setFCategory] = React.useState("");
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fApprovalType, setFApprovalType] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fStageCount, setFStageCount] = React.useState("");
  const [fVersion, setFVersion] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_CHAINS;

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      matchesView(r, view) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.triggers.join(" ").toLowerCase().includes(q)) &&
      (!fCategory || r.category === fCategory) &&
      (!fWorkspace || r.workspace === fWorkspace) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fStatus || r.status === fStatus) &&
      (!fApprovalType || r.approvalType === fApprovalType) &&
      (!fOwner || r.owner === fOwner) &&
      (!fStageCount || String(r.stageCount) === fStageCount) &&
      (!fVersion || r.version === fVersion)
    );
  });
  const hasFilters = !!(
    search ||
    fCategory ||
    fWorkspace ||
    fBu ||
    fStatus ||
    fApprovalType ||
    fOwner ||
    fStageCount ||
    fVersion
  );
  const clearFilters = () => {
    setSearch("");
    setFCategory("");
    setFWorkspace("");
    setFBu("");
    setFStatus("");
    setFApprovalType("");
    setFOwner("");
    setFStageCount("");
    setFVersion("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational Dashboard (spec §Operational Dashboard) ──
  const totalChains = records.length;
  const totalPending = records.reduce((a, r) => a + r.pendingRequests, 0);
  const avgApproval = Math.round(
    records.reduce((a, r) => a + r.avgApprovalTimeH, 0) / records.length,
  );
  const totalRejected = records.reduce((a, r) => a + r.rejectedRequests, 0);
  const totalEscalations = records.reduce((a, r) => a + r.escalations, 0);
  const mostUsed = [...records].sort(
    (a, b) => b.approvalRequests - a.approvalRequests,
  )[0];

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Approval Chain",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=approval-chains"),
    },
    { key: "clone", label: "Clone", icon: <Copy size={15} />, disabled: true },
    {
      key: "publish",
      label: "Publish",
      icon: <Send size={15} />,
      disabled: true,
    },
    {
      key: "disable",
      label: "Disable",
      icon: <PowerOff size={15} />,
      disabled: true,
    },
    {
      key: "archive",
      label: "Archive",
      icon: <Archive size={15} />,
      disabled: true,
    },
    {
      key: "import",
      label: "Import",
      icon: <Upload size={15} />,
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
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Workflow",
      icon: <CheckCircle2 size={15} />,
      disabled: true,
    },
    {
      key: "simulate",
      label: "Simulate Approval",
      icon: <PlayCircle size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Versions",
      icon: <GitCompare size={15} />,
      disabled: true,
    },
    {
      key: "assign",
      label: "Assign Chain",
      icon: <Link2 size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<ChainRecord>[] = [
    {
      key: "name",
      header: "Approval Chain",
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
          <GitBranch size={14} color={T.textMuted} />
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
      key: "stages",
      header: "Stages",
      sortValue: (r) => r.stageCount,
      render: (r) => r.stageCount,
    },
    {
      key: "assigned",
      header: "Assigned Workspaces",
      sortValue: (r) => r.assignedWorkspaces,
      render: (r) => r.assignedWorkspaces,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
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
      render: (r) => (
        <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>
          {r.version}
        </span>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <PostureGrid>
          <PostureCard
            title="Approval Chains"
            value={totalChains}
            sub={<SampleTag />}
            tone="ok"
          />
          <PostureCard
            title="Pending Requests"
            value={totalPending}
            sub={<SampleTag />}
            tone={totalPending > 0 ? "warn" : "ok"}
          />
          <PostureCard
            title="Average Approval Time"
            value={`${avgApproval}h`}
            sub={<SampleTag />}
          />
          <PostureCard
            title="Rejected Requests"
            value={totalRejected}
            sub={<SampleTag />}
            tone={totalRejected > 0 ? "danger" : "ok"}
          />
          <PostureCard
            title="Escalations"
            value={totalEscalations}
            sub={<SampleTag />}
            tone={totalEscalations > 0 ? "warn" : "ok"}
          />
          <PostureCard
            title="Most Used Chains"
            value={mostUsed.name}
            sub={
              <>
                {mostUsed.approvalRequests} requests <SampleTag />
              </>
            }
          />
        </PostureGrid>
      </div>

      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={view}
          onChange={setView}
          options={VIEW_OPTIONS.map((v) => ({ value: v.id, label: v.label }))}
        />
      </div>

      <Card
        title="Approval chain library"
        desc="Configure reusable approval workflows governing administrative, operational, security, compliance, AI, and business actions across enterprise workspaces. Chains are referenced across the platform rather than duplicated."
      >
        <CommandBar items={toolbar} />

        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search approval chains — name, description, workspace, business unit, approver, trigger…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select
            label="Category"
            value={fCategory}
            onChange={setFCategory}
            options={facet(records.map((r) => r.category))}
          />
          <Select
            label="Workspace"
            value={fWorkspace}
            onChange={setFWorkspace}
            options={facet(records.map((r) => r.workspace))}
          />
          <Select
            label="Business Unit"
            value={fBu}
            onChange={setFBu}
            options={facet(records.map((r) => r.businessUnit))}
          />
          <Select
            label="Status"
            value={fStatus}
            onChange={setFStatus}
            options={facet(records.map((r) => r.status))}
          />
          <Select
            label="Approval Type"
            value={fApprovalType}
            onChange={setFApprovalType}
            options={facet(records.map((r) => r.approvalType))}
          />
          <Select
            label="Owner"
            value={fOwner}
            onChange={setFOwner}
            options={facet(records.map((r) => r.owner))}
          />
          <Select
            label="Stage Count"
            value={fStageCount}
            onChange={setFStageCount}
            options={facet(records.map((r) => String(r.stageCount)))}
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
          pageSize={15}
          initialSort={{ key: "name", dir: "asc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<Send size={13} />} onClick={clear}>
                Publish ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<PowerOff size={13} />} onClick={clear}>
                Disable
              </HeaderButton>
              <HeaderButton icon={<Archive size={13} />} onClick={clear}>
                Archive
              </HeaderButton>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>
                Export
              </HeaderButton>
              <HeaderButton icon={<Link2 size={13} />} onClick={clear}>
                Assign
              </HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View", onClick: () => setSelId(r.id) },
                { label: "Edit", onClick: () => setSelId(r.id) },
                { label: "Clone", onClick: () => setSelId(r.id) },
                { label: "Publish", onClick: () => setSelId(r.id) },
                { label: "Disable", onClick: () => setSelId(r.id) },
                {
                  label: "Archive",
                  onClick: () => setSelId(r.id),
                  danger: true,
                },
                { label: "Export", onClick: () => {} },
                { label: "Simulate", onClick: () => setSelId(r.id) },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<GitBranch size={20} />}
              title="No approval chains configured."
              hint="Adjust filters, or create / import an approval workflow to get started."
              cta="Create Approval Chain"
              onCta={() => navigate("/admin/workspaces?tab=approval-chains")}
            />
          }
        />
      </Card>

      {sel && <ChainDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function ApprovalChainsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Approval Chains"
        subtitle="Configure reusable approval workflows governing administrative, operational, security, compliance, AI, and business actions across enterprise workspaces."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=approval-chains")}
            >
              Create Approval Chain
            </HeaderButton>
          </>
        }
      />
      <ApprovalChainsView />
    </Page>
  );
}

// ════════════ Approval Chain Detail Drawer — 8 sub-tabs (spec §Approval Chain Detail Drawer) ════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "workflow", label: "Workflow", icon: <GitBranch size={13} /> },
  { id: "triggers", label: "Triggers", icon: <Zap size={13} /> },
  { id: "assignments", label: "Assignments", icon: <ListChecks size={13} /> },
  { id: "pending", label: "Pending Requests", icon: <Inbox size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "metrics", label: "Metrics", icon: <BarChart3 size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function ChainDetailDrawer({
  rec,
  onClose,
}: {
  rec: ChainRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.name}`}
      // Drawer header displays: Approval Chain · Category · Status · Stages · Assigned Workspaces
      subtitle={`${rec.category} · ${rec.status} · ${rec.stageCount} stages · ${rec.assignedWorkspaces} assigned workspaces · ${rec.version}`}
      width={760}
      onClose={onClose}
      footer={
        // Quick Actions: Edit · Simulate · Assign · Export
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton icon={<Link2 size={13} />}>Assign</HeaderButton>
          <HeaderButton icon={<PlayCircle size={13} />}>Simulate</HeaderButton>
          <HeaderButton variant="primary" icon={<Workflow size={13} />}>
            Edit
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "workflow" && <WorkflowTab rec={rec} />}
      {tab === "triggers" && <TriggersTab rec={rec} />}
      {tab === "assignments" && <AssignmentsTab rec={rec} />}
      {tab === "pending" && <PendingTab rec={rec} />}
      {tab === "activity" && <ActivityTab />}
      {tab === "metrics" && <MetricsTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
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
          marginBottom: 4,
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

// Reusable chip-list for enumerated capability sets (triggers, notifications, builder components).
function ChipList({ items, active }: { items: string[]; active?: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 6 }}>
      {items.map((it) => {
        const on = !active || active.includes(it);
        return (
          <span
            key={it}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 26,
              padding: "0 10px",
              borderRadius: 99,
              fontSize: 12,
              color: on ? T.textPrimary : T.textMuted,
              background: on ? "var(--cg-accent-bg)" : "transparent",
              border: `1px solid ${on ? "var(--cg-accent)" : T.border}`,
            }}
          >
            {on ? <Check size={12} color={T.accent} /> : null}
            {it}
          </span>
        );
      })}
    </div>
  );
}

// ── Overview (General · Statistics · Escalation · Expiration · Notifications · Tags) ──
function OverviewTab({ rec }: { rec: ChainRecord }) {
  return (
    <>
      <Section title="General">
        <KVGrid
          items={[
            { k: "Name", v: rec.name },
            { k: "Category", v: rec.category },
            { k: "Owner", v: rec.owner, sample: true },
            { k: "Version", v: rec.version },
            { k: "Status", v: <StatusBadge status={rec.status} /> },
            { k: "Created", v: rec.created, sample: true },
            { k: "Modified", v: rec.modified, sample: true },
            { k: "Approval Type", v: rec.approvalType, sample: true },
          ]}
        />
        <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
          {rec.description}
        </div>
      </Section>

      <Section title="Statistics" sample>
        <KVGrid
          cols={3}
          items={[
            {
              k: "Approval Requests",
              v: rec.approvalRequests,
              sample: true,
            },
            {
              k: "Average Approval Time",
              v: `${rec.avgApprovalTimeH}h`,
              sample: true,
            },
            { k: "Pending Requests", v: rec.pendingRequests, sample: true },
            { k: "Rejected Requests", v: rec.rejectedRequests, sample: true },
            {
              k: "Assigned Workspaces",
              v: rec.assignedWorkspaces,
              sample: true,
            },
          ]}
        />
      </Section>

      <Section title="Escalation & expiration policy" sample>
        <StatRow
          label="Escalation Policy"
          value={rec.escalationPolicy}
          sample
        />
        <StatRow
          label="Expiration Policy"
          value={rec.expirationPolicy}
          sample
        />
      </Section>

      <Section title="Notifications" sample>
        <ChipList items={NOTIFICATIONS} active={rec.notifications} />
      </Section>

      <Section title="Tags" sample>
        <ChipList items={rec.tags} />
      </Section>
    </>
  );
}

// ── Workflow (staged approval pipeline) — spec §Workflow / §Workflow Stages / §Workflow Builder ──
function WorkflowTab({ rec }: { rec: ChainRecord }) {
  return (
    <>
      <Section title="Approval workflow" sample>
        <div
          style={{
            fontSize: 12.5,
            color: T.textMuted,
            marginBottom: 10,
          }}
        >
          Defines the approval process. Each stage carries its approver type,
          required approvers, approval rule, timeout and escalation.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Request entry node */}
          <PipelineNode
            index={0}
            label="Request"
            tone={T.textPrimary}
            state="Submitted"
            done
          />
          {rec.stages.map((stage, i) => {
            const done = i < rec.currentStageIdx || rec.status === "Archived";
            const active = i === rec.currentStageIdx && rec.status === "Active";
            const tone = done ? T.success : active ? T.accent : T.textMuted;
            return (
              <div
                key={stage.name + i}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom:
                    i < rec.stages.length - 1
                      ? `1px solid ${T.border}`
                      : "none",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      done || active
                        ? "var(--cg-accent-bg-strong)"
                        : "transparent",
                    border: `1px solid ${done || active ? "transparent" : T.border}`,
                    color: tone,
                    fontSize: 11,
                  }}
                >
                  {done ? <Check size={12} /> : i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: T.textPrimary,
                      fontWeight: active ? 600 : 400,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {stage.name}
                    <span style={{ color: tone, fontSize: 11.5 }}>
                      {done ? "Approved" : active ? "In review" : "Pending"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: T.textMuted,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      marginTop: 3,
                    }}
                  >
                    <span>Approver Type: {stage.approverType}</span>
                    <span>·</span>
                    <span>Required Approvers: {stage.requiredApprovers}</span>
                    <span>·</span>
                    <span>Rule: {stage.approvalRule}</span>
                    <span>·</span>
                    <span>Timeout: {stage.timeout}</span>
                    <span>·</span>
                    <span>Escalation: {stage.escalation}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Supported approval rules">
        <ChipList
          items={APPROVAL_RULES}
          active={rec.stages.map((s) => s.approvalRule)}
        />
      </Section>

      <Section title="Workflow builder — supported components" sample>
        <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 4 }}>
          Visual designer: Trigger → Conditions → Approval Stage → Conditional
          Branch → Approval Stage → Completion.
        </div>
        <ChipList items={BUILDER_COMPONENTS} />
      </Section>

      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
      >
        <HeaderButton variant="primary" icon={<Workflow size={13} />}>
          Open Builder
        </HeaderButton>
        <HeaderButton icon={<CheckCircle2 size={13} />}>
          Validate Workflow
        </HeaderButton>
        <HeaderButton icon={<PlayCircle size={13} />}>
          Simulate Approval
        </HeaderButton>
        <HeaderButton icon={<GitCompare size={13} />}>
          Compare Versions
        </HeaderButton>
      </div>
    </>
  );
}

function PipelineNode({
  index,
  label,
  tone,
  state,
  done,
}: {
  index: number;
  label: string;
  tone: string;
  state: string;
  done?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 0",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--cg-accent-bg-strong)",
          color: tone,
          fontSize: 11,
        }}
      >
        {done ? <Check size={12} /> : index + 1}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: T.textPrimary, fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
          {state}
        </div>
      </div>
    </div>
  );
}

// ── Triggers (when the chain is invoked) — spec §Triggers ──
function TriggersTab({ rec }: { rec: ChainRecord }) {
  return (
    <>
      <div
        style={{
          fontSize: 12.5,
          color: T.textMuted,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Defines when the approval chain is invoked. Enabled triggers are
        highlighted. <SampleTag />
      </div>
      <ChipList items={TRIGGERS} active={rec.triggers} />
    </>
  );
}

// ── Assignments (where this chain is applied) — spec §Assignments ──
function AssignmentsTab({ rec }: { rec: ChainRecord }) {
  const n = hashId(rec.id);
  const count = Math.min(rec.assignedWorkspaces, 8) || 0;
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `${rec.id}-asg-${i}`,
    workspace: pick(WORKSPACES, n + i),
    businessUnit: pick(BUSINESS_UNITS, n + i),
    environment: pick(ENVIRONMENTS, n + i),
    policySource: pick(
      ["Enterprise", "Business Unit", "Workspace", "Direct Assignment"],
      n + i,
    ),
    effectiveDate: `2026-0${1 + ((n + i) % 6)}-${(1 + ((n + i) % 27)).toString().padStart(2, "0")}`,
  }));
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "bu", header: "Business Unit", render: (r) => r.businessUnit },
    { key: "env", header: "Environment", render: (r) => r.environment },
    { key: "src", header: "Policy Source", render: (r) => r.policySource },
    { key: "date", header: "Effective Date", render: (r) => r.effectiveDate },
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
        <HeaderButton icon={<Link2 size={13} />}>Assign</HeaderButton>
        <HeaderButton variant="danger" icon={<X size={13} />}>
          Remove
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable
        columns={cols}
        rows={rows}
        empty={
          <EmptyState
            icon={<Link2 size={20} />}
            title="Not assigned to any workspace yet."
            hint="Assign this approval chain to workspaces, business units or the enterprise scope."
          />
        }
      />
    </>
  );
}

// ── Pending Requests (active requests on this workflow) — spec §Pending Requests ──
function PendingTab({ rec }: { rec: ChainRecord }) {
  const n = hashId(rec.id);
  const count = Math.min(rec.pendingRequests, 8);
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `${rec.id}-req-${i}`,
    request: `REQ-${(4200 + ((n + i) % 900)).toString()}`,
    requester: pick(REQUESTERS, n + i),
    currentStage: rec.stages[(n + i) % rec.stages.length].name,
    assignedApprover: pick(REQUESTERS, n + i + 2),
    submitted: `2026-07-${(1 + ((n + i) % 9)).toString().padStart(2, "0")}`,
    status: pick(["In Review", "Escalated", "Awaiting Approver"], n + i),
  }));
  const cols: Column<(typeof rows)[number]>[] = [
    {
      key: "request",
      header: "Request",
      render: (r) => (
        <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>
          {r.request}
        </span>
      ),
    },
    { key: "requester", header: "Requester", render: (r) => r.requester },
    { key: "stage", header: "Current Stage", render: (r) => r.currentStage },
    {
      key: "approver",
      header: "Assigned Approver",
      render: (r) => r.assignedApprover,
    },
    { key: "submitted", header: "Submitted", render: (r) => r.submitted },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span style={{ color: T.warning }}>
          <Clock
            size={11}
            style={{ marginRight: 5, verticalAlign: "middle" }}
          />
          {r.status}
        </span>
      ),
    },
  ];
  return (
    <>
      <div
        style={{
          fontSize: 12.5,
          color: T.textMuted,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Active approval requests currently using this workflow. <SampleTag />
      </div>
      <DirectoryTable
        columns={cols}
        rows={rows}
        rowActions={() => (
          <RowMenu
            items={[
              { label: "Open", onClick: () => {} },
              { label: "Approve", onClick: () => {} },
              { label: "Reject", onClick: () => {}, danger: true },
              { label: "Reassign", onClick: () => {} },
              { label: "Escalate", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Inbox size={20} />}
            title="No pending requests."
            hint="Requests routed through this chain will appear here while awaiting a decision."
          />
        }
      />
    </>
  );
}

// ── Activity timeline — spec §Activity ──
function ActivityTab() {
  const events = [
    "Workflow Created",
    "Stage Modified",
    "Approval Completed",
    "Approval Rejected",
    "Workflow Assigned",
    "Workflow Disabled",
  ];
  const [fActor, setFActor] = React.useState("");
  const [fAction, setFAction] = React.useState("");
  const [fDate, setFDate] = React.useState("");
  return (
    <>
      <FilterBar>
        <Select
          label="Actor"
          value={fActor}
          onChange={setFActor}
          options={[
            { value: "", label: "All actors" },
            ...REQUESTERS.map((r) => ({ value: r, label: r })),
          ]}
        />
        <Select
          label="Action"
          value={fAction}
          onChange={setFAction}
          options={[
            { value: "", label: "All actions" },
            ...events.map((e) => ({ value: e, label: e })),
          ]}
        />
        <Select
          label="Date"
          value={fDate}
          onChange={setFDate}
          options={[
            { value: "", label: "Any date" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
            { value: "90d", label: "Last 90 days" },
          ]}
        />
      </FilterBar>
      <div
        style={{
          fontSize: 12.5,
          color: T.textMuted,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Approval chain activity timeline <SampleTag />
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
              {pick(REQUESTERS, i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Metrics (KPIs + charts) — spec §Metrics ──
function MetricsTab({ rec }: { rec: ChainRecord }) {
  return (
    <>
      <Section title="Approval metrics" sample>
        <StatRow
          label="Approval Success Rate"
          value={`${rec.successRate}%`}
          tone={rec.successRate >= 90 ? "ok" : "warn"}
          sample
        />
        <StatRow
          label="Average Approval Time"
          value={`${rec.avgApprovalTimeH}h`}
          sample
        />
        <StatRow
          label="Escalations"
          value={rec.escalations}
          tone={rec.escalations > 0 ? "warn" : "ok"}
          sample
        />
        <StatRow
          label="Rejected Requests"
          value={rec.rejectedRequests}
          tone={rec.rejectedRequests > 0 ? "danger" : "ok"}
          sample
        />
        <StatRow
          label="Timeouts"
          value={rec.timeouts}
          tone={rec.timeouts > 0 ? "warn" : "ok"}
          sample
        />
        <StatRow
          label="SLA Compliance"
          value={`${rec.slaCompliance}%`}
          tone={rec.slaCompliance >= 90 ? "ok" : "warn"}
          sample
        />
      </Section>

      <Section title="Charts" sample>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
          }}
        >
          <MiniChart title="Approval Volume" rec={rec} kind="volume" />
          <MiniChart title="Approval Duration" rec={rec} kind="duration" />
          <MiniChart title="Approval Outcomes" rec={rec} kind="outcomes" />
          <MiniChart title="Stage Bottlenecks" rec={rec} kind="bottleneck" />
        </div>
      </Section>
    </>
  );
}

function MiniChart({
  title,
  rec,
  kind,
}: {
  title: string;
  rec: ChainRecord;
  kind: "volume" | "duration" | "outcomes" | "bottleneck";
}) {
  const n = hashId(rec.id + kind);
  const bars =
    kind === "bottleneck"
      ? rec.stages.map((s, i) => ({
          label: s.name,
          v: 20 + ((n + i * 7) % 80),
        }))
      : Array.from({ length: 6 }, (_, i) => ({
          label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i],
          v: 15 + ((n + i * 13) % 85),
        }));
  const max = Math.max(...bars.map((b) => b.v));
  const color =
    kind === "outcomes" ? T.danger : kind === "duration" ? T.warning : T.accent;
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "10px 12px",
        background: T.cardBg,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: T.textNav,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <BarChart3 size={13} color={T.textMuted} />
        {title}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 5,
          height: 66,
        }}
      >
        {bars.map((b) => (
          <div
            key={b.label}
            title={`${b.label}: ${b.v}`}
            style={{
              flex: 1,
              height: `${(b.v / max) * 100}%`,
              minHeight: 3,
              background: color,
              borderRadius: "3px 3px 0 0",
              opacity: 0.85,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 9.5,
          color: T.textMuted,
          marginTop: 4,
        }}
      >
        <span>{bars[0].label}</span>
        <span>{bars[bars.length - 1].label}</span>
      </div>
    </div>
  );
}

// ── Audit History (immutable, read-only) — spec §Audit History ──
function AuditTab() {
  const events = [
    "Workflow Created",
    "Workflow Updated",
    "Stage Added",
    "Stage Removed",
    "Assignment Changed",
    "Approval Granted",
    "Approval Rejected",
    "Workflow Disabled",
    "Workflow Archived",
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
          value={`${pick(REQUESTERS, i)} · 2026-07-${(1 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

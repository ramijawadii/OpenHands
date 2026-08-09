/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Lifecycle → Requested */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Download,
  RefreshCcw,
  Check,
  X,
  Ban,
  UserCheck,
  MessageSquare,
  ShieldCheck,
  FileText,
  LayoutGrid,
  GitBranch,
  ClipboardCheck,
  Boxes,
  Activity as ActivityIcon,
  History,
  AlertTriangle,
  Calculator,
  Eye,
  GitCompare,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
  StatRow,
  KVGrid,
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
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Workspace Administration → Lifecycle → Requested — the controlled intake phase of the workspace
 * lifecycle. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/04_Lifecycle/requested.md.
 *
 * A Requested workspace exists ONLY as a governance object — no cloud resources, AI services,
 * integrations, identities, or platform resources have been created yet. This stage lets the
 * organization perform governance, compliance, financial, security, and operational validation
 * before any infrastructure is provisioned. An approved request flows into the Provisioning Queue.
 *
 * There is no lifecycle backend yet, so the request set is representative sample data (tagged
 * `Sample` in the UI). When the workspace lifecycle engine lands, swap SAMPLE_REQUESTS for the live
 * query — the component API stays identical. Reuses the Enterprise-Administration UX pattern shared
 * with the Users module (Banner · Toolbar · Filters · Search · Data Table · Bulk/Row actions ·
 * Workspace Request Detail Drawer with 7 sub-tabs).
 */

const ME = "You (current admin)";

// ── Request Status model (drives the View sub-navigation; spec §Request Status) ────────────────────
type Status =
  | "Pending Review"
  | "Awaiting Approval"
  | "Approved"
  | "Rejected"
  | "Cancelled"
  | "Expired";

const STATUS_TONE: Record<Status, string> = {
  "Pending Review": T.warning,
  "Awaiting Approval": T.warning,
  Approved: T.success,
  Rejected: T.danger,
  Cancelled: T.textMuted,
  Expired: T.textMuted,
};

// View sub-navigation — a FilterBar dropdown, NOT pills (spec §Navigation tree).
const VIEW_TABS = [
  { id: "all", label: "All Requests" },
  { id: "pending", label: "Pending Review" },
  { id: "awaiting", label: "Awaiting Approval" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "cancelled", label: "Cancelled" },
  { id: "expired", label: "Expired" },
];

// map View id → status filter.
const VIEW_STATUS: Record<string, Status | null> = {
  all: null,
  pending: "Pending Review",
  awaiting: "Awaiting Approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  expired: "Expired",
};

const BUSINESS_UNITS = ["Finance", "Payments", "Platform", "Security", "Data"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const WS_TYPES = ["Enterprise", "Department", "Project", "Shared Service"];
const TEMPLATES = [
  "Production Template",
  "Regulated Workload Template",
  "Sandbox Template",
  "Data Platform Template",
];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const COMPLIANCE_PROFILES = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
];
const GOVERNANCE_PROFILES = ["Strict", "Balanced", "Relaxed"];
const REQUESTERS = [
  ME,
  "John Smith",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
];
const REVIEWERS = ["David Chen", "Aisha Khan", "Tomás Silva", "Unassigned"];

// Approval chain stages (spec §Approval Workflow visualization).
const STAGES = [
  "Submitted",
  "Manager Approval",
  "Business Owner",
  "Security Review",
  "Compliance Review",
  "Approved",
];

interface RequestRecord {
  id: string;
  workspace: string;
  description: string;
  requester: string;
  mine: boolean;
  businessUnit: string;
  workspaceType: string;
  environment: string;
  template: string;
  priority: string;
  status: Status;
  approvalState: string;
  currentStage: string;
  reviewer: string;
  pendingApprovers: string[];
  requestedDate: string;
  submittedDate: string;
  expectedCompletion: string;
  daysWaiting: number;
  pendingApprovals: number;
  completedApprovals: number;
  complianceProfile: string;
  governanceProfile: string;
  estMonthlyCost: number;
  owner: string;
  delegatedAdmins: string[];
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative request set (~15 records).
const SAMPLE_REQUESTS: RequestRecord[] = Array.from({ length: 15 }, (_, i) => {
  const id = `REQ-${(10482 + i * 13).toString()}`;
  const n = hashId(id);
  const status = pick<Status>(
    [
      "Pending Review",
      "Awaiting Approval",
      "Awaiting Approval",
      "Approved",
      "Rejected",
      "Cancelled",
      "Expired",
    ],
    n,
  );
  const requester = pick(REQUESTERS, n);
  const stageIdx =
    status === "Approved"
      ? 5
      : status === "Pending Review"
        ? 1
        : status === "Rejected" || status === "Cancelled"
          ? Math.max(1, n % 4)
          : status === "Expired"
            ? 2
            : 2 + (n % 3);
  const approvalState =
    status === "Approved"
      ? "Approved"
      : status === "Rejected"
        ? "Rejected"
        : status === "Pending Review"
          ? "Not Started"
          : status === "Cancelled" || status === "Expired"
            ? "Not Started"
            : "In Progress";
  return {
    id,
    workspace: `${pick(BUSINESS_UNITS, n)} ${pick(ENVIRONMENTS, n >> 2)}`,
    description: `New workspace request for the ${pick(BUSINESS_UNITS, n)} business unit in the ${pick(ENVIRONMENTS, n >> 2)} environment.`,
    requester,
    mine: requester === ME,
    businessUnit: pick(BUSINESS_UNITS, n),
    workspaceType: pick(WS_TYPES, n >> 3),
    environment: pick(ENVIRONMENTS, n >> 2),
    template: pick(TEMPLATES, n),
    priority: pick(PRIORITIES, n >> 1),
    status,
    approvalState,
    currentStage: STAGES[Math.min(stageIdx, STAGES.length - 1)],
    reviewer: pick(REVIEWERS, n),
    pendingApprovers: [pick(REVIEWERS, n + 1), pick(REVIEWERS, n + 2)],
    requestedDate: `2026-07-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    submittedDate: `2026-07-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    expectedCompletion: `2026-07-${(1 + ((n + 6) % 27)).toString().padStart(2, "0")}`,
    daysWaiting: 1 + (n % 21),
    pendingApprovals: Math.max(0, 5 - stageIdx),
    completedApprovals: Math.min(stageIdx, 5),
    complianceProfile: pick(COMPLIANCE_PROFILES, n),
    governanceProfile: pick(GOVERNANCE_PROFILES, n),
    estMonthlyCost: 800 + (n % 40) * 125,
    owner: pick(REQUESTERS.slice(1), n),
    delegatedAdmins: [pick(REVIEWERS, n + 1), pick(REVIEWERS, n + 2)],
  };
});

const PRIORITY_TONE: Record<string, string> = {
  Critical: T.danger,
  High: T.warning,
  Medium: T.textNav,
  Low: T.textMuted,
};

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

const money = (v: number) => `$${v.toLocaleString()}`;

/**
 * Embeddable body — View sub-navigation + operational dashboard + directory + request detail drawer,
 * WITHOUT the outer <Page> or the page banner. Rendered both as the standalone route and as a tab of
 * the Workspace Administration console. Uses local state for the View sub-nav so it never collides
 * with a host page's `?tab=`.
 */
export function LifecycleRequestedView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("all");

  const [search, setSearch] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fRequester, setFRequester] = React.useState("");
  const [fWsType, setFWsType] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fPriority, setFPriority] = React.useState("");
  const [fApproval, setFApproval] = React.useState("");
  const [fRequested, setFRequested] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_REQUESTS;
  const viewStatus = VIEW_STATUS[view];

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!viewStatus || r.status === viewStatus) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.requester.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.environment.toLowerCase().includes(q) ||
        r.template.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)) &&
      (!fStatus || r.status === fStatus) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fRequester || r.requester === fRequester) &&
      (!fWsType || r.workspaceType === fWsType) &&
      (!fEnv || r.environment === fEnv) &&
      (!fPriority || r.priority === fPriority) &&
      (!fApproval || r.approvalState === fApproval) &&
      (!fRequested || r.requestedDate === fRequested)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFStatus("");
    setFBu("");
    setFRequester("");
    setFWsType("");
    setFEnv("");
    setFPriority("");
    setFApproval("");
    setFRequested("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational Dashboard KPIs (spec §Operational Dashboard) ──
  const pendingRequests = records.filter(
    (r) => r.status === "Pending Review" || r.status === "Awaiting Approval",
  ).length;
  const rejectedRequests = records.filter(
    (r) => r.status === "Rejected",
  ).length;
  const expiringRequests = records.filter(
    (r) => r.status !== "Approved" && r.daysWaiting >= 14,
  ).length;
  const highPriority = records.filter(
    (r) => r.priority === "High" || r.priority === "Critical",
  ).length;
  const backlog = records.filter(
    (r) => r.status === "Awaiting Approval",
  ).length;
  const avgApproval = Math.round(
    records.reduce((s, r) => s + r.daysWaiting, 0) / records.length,
  );

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Request",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=requests"),
    },
    {
      key: "approve",
      label: "Approve",
      icon: <Check size={15} />,
      disabled: true,
    },
    { key: "reject", label: "Reject", icon: <X size={15} />, disabled: true },
    { key: "cancel", label: "Cancel", icon: <Ban size={15} />, disabled: true },
    {
      key: "assign",
      label: "Assign Reviewer",
      icon: <UserCheck size={15} />,
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
      onClick: () => {},
    },
    // Governance Actions (spec §Toolbar → Governance Actions)
    {
      key: "validate",
      label: "Validate Request",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "compliance",
      label: "Run Compliance Check",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "naming",
      label: "Run Naming Validation",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "cost",
      label: "Estimate Cost",
      icon: <Calculator size={15} />,
      disabled: true,
    },
    {
      key: "preview",
      label: "Preview Configuration",
      icon: <Eye size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<RequestRecord>[] = [
    {
      key: "workspace",
      header: "Workspace",
      sortValue: (r) => r.workspace,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <LayoutGrid size={14} color={T.textMuted} />
          {r.workspace}
        </span>
      ),
    },
    {
      key: "id",
      header: "Request ID",
      sortValue: (r) => r.id,
      render: (r) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 11.5,
            color: T.textPrimary,
          }}
        >
          {r.id}
        </span>
      ),
    },
    {
      key: "requester",
      header: "Requester",
      sortValue: (r) => r.requester,
      render: (r) => r.requester,
    },
    {
      key: "bu",
      header: "Business Unit",
      sortValue: (r) => r.businessUnit,
      render: (r) => r.businessUnit,
    },
    {
      key: "template",
      header: "Template",
      sortValue: (r) => r.template,
      render: (r) => r.template,
    },
    {
      key: "requested",
      header: "Requested",
      sortValue: (r) => r.requestedDate,
      render: (r) => r.requestedDate,
    },
    {
      key: "approval",
      header: "Approval Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "priority",
      header: "Priority",
      sortValue: (r) => PRIORITIES.indexOf(r.priority),
      render: (r) => (
        <span style={{ color: PRIORITY_TONE[r.priority] }}>{r.priority}</span>
      ),
    },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard
          title="Pending Requests"
          value={pendingRequests}
          sub={<SampleTag />}
          tone="warn"
        />
        <PostureCard
          title="Average Approval Time"
          value={`${avgApproval} days`}
          sub={<SampleTag />}
        />
        <PostureCard
          title="Approval Backlog"
          value={backlog}
          sub={<SampleTag />}
          tone={backlog > 3 ? "warn" : "muted"}
        />
        <PostureCard
          title="Rejected Requests"
          value={rejectedRequests}
          sub={<SampleTag />}
          tone={rejectedRequests > 0 ? "danger" : "muted"}
        />
        <PostureCard
          title="Expiring Requests"
          value={expiringRequests}
          sub={<SampleTag />}
          tone={expiringRequests > 0 ? "warn" : "muted"}
        />
        <PostureCard
          title="High Priority Requests"
          value={highPriority}
          sub={<SampleTag />}
          tone={highPriority > 0 ? "danger" : "muted"}
        />
      </PostureGrid>

      <div style={{ height: 14 }} />

      <DiscoveryListView
        title="Requested Workspaces"
        commands={toolbar}
        pills={[
          {
            key: "view",
            label: "View",
            value: view,
            onChange: setView,
            options: VIEW_TABS.map((t) => ({ value: t.id, label: t.label })),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
          {
            key: "bu",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "requester",
            label: "Requester",
            value: fRequester,
            onChange: setFRequester,
            options: facet(records.map((r) => r.requester)),
          },
          {
            key: "wsType",
            label: "Workspace Type",
            value: fWsType,
            onChange: setFWsType,
            options: facet(records.map((r) => r.workspaceType)),
          },
          {
            key: "env",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "priority",
            label: "Priority",
            value: fPriority,
            onChange: setFPriority,
            options: facet(records.map((r) => r.priority)),
          },
          {
            key: "approval",
            label: "Approval Status",
            value: fApproval,
            onChange: setFApproval,
            options: facet(records.map((r) => r.approvalState)),
          },
          {
            key: "requested",
            label: "Requested Date",
            value: fRequested,
            onChange: setFRequested,
            options: facet(records.map((r) => r.requestedDate)),
          },
        ]}
        presets={[{ label: "All requested", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search requested workspaces — name, requester, business unit, environment, template, request ID…"
        count={rows.length}
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "requested", dir: "desc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Check size={13} />} onClick={clear}>
              Approve ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<X size={13} />} onClick={clear}>
              Reject
            </HeaderButton>
            <HeaderButton icon={<UserCheck size={13} />} onClick={clear}>
              Assign Reviewer
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
              { label: "Approve", onClick: () => setSelId(r.id) },
              {
                label: "Reject",
                onClick: () => setSelId(r.id),
                danger: true,
              },
              { label: "Assign Reviewer", onClick: () => setSelId(r.id) },
              {
                label: "Preview Configuration",
                onClick: () => setSelId(r.id),
              },
              { label: "Export", onClick: () => {} },
              {
                label: "Cancel",
                onClick: () => setSelId(r.id),
                danger: true,
              },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Plus size={20} />}
            title="No workspace requests found."
            hint="Adjust filters, or create a workspace request to get started."
            cta="Create Workspace Request"
            onCta={() => navigate("/admin/workspaces?tab=requests")}
          />
        }
      />

      {sel && <RequestDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function LifecycleRequestedPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Requested Workspaces"
        subtitle="Review, approve, reject, and manage workspace creation requests before provisioning begins. The controlled intake phase of the workspace lifecycle."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=requests")}
            >
              Create Request
            </HeaderButton>
          </>
        }
      />
      <LifecycleRequestedView />
    </Page>
  );
}

// ════════════ Workspace Request Detail Drawer — 7 sub-tabs (spec §Workspace Request Detail Drawer) ══
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "config",
    label: "Requested Configuration",
    icon: <FileText size={13} />,
  },
  {
    id: "governance",
    label: "Governance Validation",
    icon: <ClipboardCheck size={13} />,
  },
  { id: "approval", label: "Approval Workflow", icon: <GitBranch size={13} /> },
  { id: "resources", label: "Estimated Resources", icon: <Boxes size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function RequestDetailDrawer({
  rec,
  onClose,
}: {
  rec: RequestRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.id} · ${rec.workspace}`}
      subtitle={`${rec.status} · ${rec.requester} · ${rec.priority} priority · Stage: ${rec.currentStage}`}
      width={760}
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
          <HeaderButton icon={<UserCheck size={13} />}>
            Assign Reviewer
          </HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton variant="danger" icon={<X size={13} />}>
            Reject
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Check size={13} />}>
            Approve
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "config" && <ConfigTab rec={rec} />}
      {tab === "governance" && <GovernanceTab rec={rec} />}
      {tab === "approval" && <ApprovalTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "activity" && <ActivityTab />}
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

// ── Overview (General · Statistics; spec §Overview) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: RequestRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Workspace Name", v: rec.workspace },
              { k: "Request ID", v: rec.id },
              { k: "Requester", v: rec.requester },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Workspace Type", v: rec.workspaceType },
              { k: "Environment", v: rec.environment },
              { k: "Priority", v: rec.priority },
              { k: "Status", v: rec.status },
              { k: "Submitted Date", v: rec.submittedDate },
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
            cols={2}
            items={[
              { k: "Days Waiting", v: `${rec.daysWaiting} days`, sample: true },
              {
                k: "Pending Approvals",
                v: rec.pendingApprovals,
                sample: true,
              },
              {
                k: "Validation Results",
                v: "8 passed · 1 warning · 1 error",
                sample: true,
              },
              {
                k: "Estimated Monthly Cost",
                v: money(rec.estMonthlyCost),
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Requested Configuration (spec §Requested Configuration — 11 sections + compare toolbar) ──
const CONFIG_SUBS = [
  { id: "workspace-metadata", label: "Workspace Metadata" },
  { id: "workspace-template", label: "Workspace Template" },
  { id: "cloud-resources", label: "Cloud Resources" },
  { id: "compliance-programs", label: "Compliance Programs" },
  { id: "security-policies", label: "Security Policies" },
  { id: "workspace-owners", label: "Workspace Owners" },
  { id: "delegated-administrators", label: "Delegated Administrators" },
  { id: "integrations", label: "Integrations" },
  { id: "ai-configuration", label: "AI Configuration" },
  { id: "resource-quotas", label: "Resource Quotas" },
  { id: "tags", label: "Tags" },
];
function ConfigTab({ rec }: { rec: RequestRecord }) {
  const [sub, setSub] = React.useState("workspace-metadata");
  return (
    <>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
      >
        <HeaderButton icon={<GitCompare size={13} />}>
          Compare Template
        </HeaderButton>
        <HeaderButton icon={<Eye size={13} />}>
          Preview Final Configuration
        </HeaderButton>
        <SampleTag />
      </div>

      <Tabs tabs={CONFIG_SUBS} active={sub} onChange={setSub} />
      {sub === "workspace-metadata" && (
        <Section title="Workspace Metadata" sample>
          <StatRow
            label="Legal Entity"
            value="Acme Financial Services Ltd."
            sample
          />
          <StatRow label="Data Residency" value={rec.environment} sample />
          <StatRow
            label="Cost Centre"
            value={`CC-${rec.businessUnit.toUpperCase()}`}
            sample
          />
          <StatRow label="Support Tier" value="Enterprise 24×7" sample />
        </Section>
      )}

      {sub === "workspace-template" && (
        <Section title="Workspace Template" sample>
          <StatRow label="Template" value={rec.template} sample />
          <StatRow
            label="Governance Profile"
            value={rec.governanceProfile}
            sample
          />
          <StatRow
            label="Baseline"
            value={`${rec.workspaceType} baseline`}
            sample
          />
        </Section>
      )}

      {sub === "cloud-resources" && (
        <Section title="Cloud Resources" sample>
          <StatRow label="Primary Provider" value="AWS (us-east-1)" sample />
          <StatRow label="Secondary Provider" value="Azure (eastus)" sample />
          <StatRow label="Estimated Resources" value="24 resources" sample />
        </Section>
      )}

      {sub === "compliance-programs" && (
        <Section title="Compliance Programs" sample>
          <StatRow
            label="Primary Profile"
            value={rec.complianceProfile}
            sample
          />
          <StatRow label="Additional" value="SOC 2, ISO 27001" sample />
        </Section>
      )}

      {sub === "security-policies" && (
        <Section title="Security Policies" sample>
          <StatRow label="Encryption" value="CMEK / HYOK required" sample />
          <StatRow
            label="Network Isolation"
            value="Private-only egress"
            sample
          />
          <StatRow label="MFA Enforcement" value="Mandatory" sample />
        </Section>
      )}

      {sub === "workspace-owners" && (
        <Section title="Workspace Owners" sample>
          <StatRow label="Workspace Owner" value={rec.owner} sample />
          <StatRow
            label="Business Owner"
            value={pick(REQUESTERS.slice(1), hashId(rec.id) + 2)}
            sample
          />
          <StatRow
            label="Technical Owner"
            value={pick(REVIEWERS, hashId(rec.id) + 3)}
            sample
          />
        </Section>
      )}

      {sub === "delegated-administrators" && (
        <Section title="Delegated Administrators" sample>
          <StatRow
            label="Delegated Admins"
            value={rec.delegatedAdmins.join(", ")}
            sample
          />
        </Section>
      )}

      {sub === "integrations" && (
        <Section title="Integrations" sample>
          <StatRow label="Identity Provider" value="Okta (SAML)" sample />
          <StatRow label="Ticketing" value="ServiceNow" sample />
          <StatRow label="Observability" value="Datadog" sample />
        </Section>
      )}

      {sub === "ai-configuration" && (
        <Section title="AI Configuration" sample>
          <StatRow
            label="AI Providers"
            value="Anthropic, Azure OpenAI"
            sample
          />
          <StatRow label="Default Model" value="claude-opus-4-8" sample />
          <StatRow label="Guardrails" value="Enterprise policy pack" sample />
        </Section>
      )}

      {sub === "resource-quotas" && (
        <Section title="Resource Quotas" sample>
          <StatRow label="Compute" value="128 vCPU / 512 GB" sample />
          <StatRow label="Storage" value="10 TB" sample />
          <StatRow label="Concurrent Agents" value="50" sample />
        </Section>
      )}

      {sub === "tags" && (
        <Section title="Tags" sample>
          <StatRow
            label="Applied Tags"
            value="env, business-unit, cost-centre, data-classification"
            sample
          />
        </Section>
      )}
    </>
  );
}

// ── Governance Validation (spec §Governance Validation — 10 checks + Passed/Warnings/Errors) ──
const GOVERNANCE_SUBS = [
  { id: "validation-summary", label: "Validation summary" },
  { id: "governance-validation-checks", label: "Governance validation checks" },
];
function GovernanceTab({ rec }: { rec: RequestRecord }) {
  const [sub, setSub] = React.useState("validation-summary");
  const n = hashId(rec.id);
  const checks = [
    "Naming Standards",
    "Policy Compliance",
    "Quota Availability",
    "Compliance Requirements",
    "Security Policies",
    "Budget Approval",
    "Cloud Availability",
    "Ownership Validation",
    "Template Validation",
    "Duplicate Detection",
  ].map((label, i) => {
    const state =
      (n + i) % 7 === 0 ? "Failed" : (n + i) % 4 === 0 ? "Warning" : "Passed";
    return { label, state };
  });
  const passed = checks.filter((c) => c.state === "Passed").length;
  const warnings = checks.filter((c) => c.state === "Warning").length;
  const errors = checks.filter((c) => c.state === "Failed").length;
  return (
    <>
      <Tabs tabs={GOVERNANCE_SUBS} active={sub} onChange={setSub} />
      {sub === "validation-summary" && (
        <Section title="Validation summary" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Passed", v: passed, sample: true },
              { k: "Warnings", v: warnings, sample: true },
              { k: "Errors", v: errors, sample: true },
            ]}
          />
        </Section>
      )}

      {sub === "governance-validation-checks" && (
        <Section title="Governance validation checks" sample>
          {checks.map((c) => (
            <StatRow
              key={c.label}
              label={c.label}
              value={c.state}
              tone={
                c.state === "Passed"
                  ? "ok"
                  : c.state === "Warning"
                    ? "warn"
                    : "danger"
              }
              sample
            />
          ))}
        </Section>
      )}

      {errors > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid var(--cg-danger-border)`,
            background: "var(--cg-danger-bg)",
            color: T.danger,
            fontSize: 12.5,
          }}
        >
          <AlertTriangle size={15} /> Errors block approval until resolved or an
          authorized override exists.
        </div>
      )}
    </>
  );
}

// ── Approval Workflow (spec §Approval Workflow — displays + staged pipeline visualization) ──
const APPROVAL_SUBS = [
  { id: "approval-status", label: "Approval status" },
  { id: "approval-timeline", label: "Approval timeline" },
];
function ApprovalTab({ rec }: { rec: RequestRecord }) {
  const [sub, setSub] = React.useState("approval-status");
  const currentIdx = STAGES.indexOf(rec.currentStage);
  return (
    <>
      <Tabs tabs={APPROVAL_SUBS} active={sub} onChange={setSub} />
      {sub === "approval-status" && (
        <Section title="Approval status" sample>
          <KVGrid
            cols={2}
            items={[
              { k: "Current Stage", v: rec.currentStage, sample: true },
              {
                k: "Pending Approvers",
                v: rec.pendingApprovers.join(", "),
                sample: true,
              },
              {
                k: "Completed Approvals",
                v: `${rec.completedApprovals} of ${STAGES.length - 1}`,
                sample: true,
              },
              {
                k: "Expected Completion",
                v: rec.expectedCompletion,
                sample: true,
              },
            ]}
          />
        </Section>
      )}

      {sub === "approval-timeline" && (
        <Section title="Approval timeline" sample>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {STAGES.map((stage, i) => {
              const done = i < currentIdx || rec.status === "Approved";
              const active = i === currentIdx && rec.status !== "Approved";
              const rejected = rec.status === "Rejected" && i === currentIdx;
              const tone = rejected
                ? T.danger
                : done
                  ? T.success
                  : active
                    ? T.accent
                    : T.textMuted;
              return (
                <div
                  key={stage}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom:
                      i < STAGES.length - 1 ? `1px solid ${T.border}` : "none",
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
                    {rejected ? (
                      <X size={12} />
                    ) : done ? (
                      <Check size={12} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: T.textPrimary,
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {stage}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: T.textMuted,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                        marginTop: 2,
                      }}
                    >
                      <span>
                        Approver: {i === 0 ? rec.requester : rec.reviewer}
                      </span>
                      <span>·</span>
                      <span style={{ color: tone }}>
                        {rejected
                          ? "Rejected"
                          : done
                            ? "Approved"
                            : active
                              ? "In review"
                              : "Pending"}
                      </span>
                      {done && (
                        <>
                          <span>·</span>
                          <span>Completed {rec.submittedDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
      >
        <HeaderButton variant="primary" icon={<Check size={13} />}>
          Approve
        </HeaderButton>
        <HeaderButton variant="danger" icon={<X size={13} />}>
          Reject
        </HeaderButton>
        <HeaderButton icon={<MessageSquare size={13} />}>
          Request Changes
        </HeaderButton>
        <HeaderButton icon={<UserCheck size={13} />}>Delegate</HeaderButton>
        <HeaderButton icon={<AlertTriangle size={13} />}>Escalate</HeaderButton>
      </div>
    </>
  );
}

// ── Estimated Resources (spec §Estimated Resources — projected allocation categories) ──
const RESOURCES_SUBS = [
  {
    id: "projected-resource-allocation",
    label: "Projected resource allocation",
  },
  { id: "cost-projection", label: "Cost projection" },
];
function ResourcesTab({ rec }: { rec: RequestRecord }) {
  const [sub, setSub] = React.useState("projected-resource-allocation");
  const n = hashId(rec.id);
  return (
    <>
      <Tabs tabs={RESOURCES_SUBS} active={sub} onChange={setSub} />
      {sub === "projected-resource-allocation" && (
        <Section title="Projected resource allocation" sample>
          <StatRow label="AWS Accounts" value={1 + (n % 3)} sample />
          <StatRow label="Azure Subscriptions" value={n % 2} sample />
          <StatRow label="GCP Projects" value={n % 2} sample />
          <StatRow label="Kubernetes Clusters" value={1 + (n % 2)} sample />
          <StatRow label="Storage" value={`${2 + (n % 8)} TB`} sample />
          <StatRow label="Compute" value={`${32 + (n % 4) * 32} vCPU`} sample />
          <StatRow label="Integrations" value={2 + (n % 4)} sample />
          <StatRow label="AI Providers" value={1 + (n % 3)} sample />
          <StatRow label="Licenses" value={10 + (n % 40)} sample />
        </Section>
      )}

      {sub === "cost-projection" && (
        <Section title="Cost projection" sample>
          <StatRow
            label="Estimated Monthly Cost"
            value={money(rec.estMonthlyCost)}
            tone="ok"
            sample
          />
        </Section>
      )}
    </>
  );
}

// ── Activity (spec §Activity — timeline + Actor/Action/Date filters) ──
function ActivityTab() {
  const [fActor, setFActor] = React.useState("");
  const [fAction, setFAction] = React.useState("");
  const [fDate, setFDate] = React.useState("");
  const events = [
    "Request Submitted",
    "Validation Completed",
    "Approval Assigned",
    "Approval Completed",
    "Reviewer Changed",
    "Comments Added",
  ].map((action, i) => ({
    action,
    actor: pick(REVIEWERS, i),
    date: `2026-07-${(9 + i).toString().padStart(2, "0")}`,
  }));
  const rows = events.filter(
    (e) =>
      (!fActor || e.actor === fActor) &&
      (!fAction || e.action === fAction) &&
      (!fDate || e.date === fDate),
  );
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals)).map((v) => ({ value: v, label: v })),
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
          value={fActor}
          onChange={setFActor}
          options={facet(events.map((e) => e.actor))}
        />
        <Select
          label="Action"
          value={fAction}
          onChange={setFAction}
          options={facet(events.map((e) => e.action))}
        />
        <Select
          label="Date"
          value={fDate}
          onChange={setFDate}
          options={facet(events.map((e) => e.date))}
        />
        <SampleTag />
      </div>
      {rows.map((e) => (
        <div
          key={e.action}
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
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e.action}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>
              {e.actor} · {e.date}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Audit History (spec §Audit History — immutable, read-only) ──
function AuditTab() {
  const events = [
    "Request Created",
    "Validation Completed",
    "Approval Requested",
    "Approval Granted",
    "Approval Rejected",
    "Request Cancelled",
    "Configuration Modified",
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
          value={`${pick(REVIEWERS, i)} · 2026-07-${(9 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspaces → Workspace Requests */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Download,
  Upload,
  Check,
  X,
  MessageSquare,
  UserCheck,
  RefreshCcw,
  FileText,
  LayoutGrid,
  GitBranch,
  ShieldCheck,
  ClipboardCheck,
  ListOrdered,
  Activity as ActivityIcon,
  Paperclip,
  History,
  AlertTriangle,
  Inbox,
  Clock,
  Hourglass,
  CheckCheck,
  Ban,
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
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";

/**
 * Workspace Requests — the intake + governance workflow for creating / modifying / sharing /
 * decommissioning workspaces. Authoritative spec:
 * docs/workspace/workspace_module/…/00_Workspaces/worspace_request.md.
 *
 * Every request follows an auditable, staged approval process (Submission → Business → Security →
 * Compliance → Operations → Provisioning) before operational actions run; an approved request
 * automatically creates a Provisioning Queue job. Reuses the Enterprise-Administration UX pattern
 * shared with the Users module (Banner · Toolbar · Filters · Search · Data Table · Bulk/Row actions
 * · Request Detail Drawer with 8 sub-tabs).
 *
 * There is no request backend yet, so the request set is representative sample data (tagged `Sample`
 * in the UI). When admin/org_model.py + the approval engine land, swap SAMPLE_REQUESTS for the live
 * query — the component API stays identical.
 */

const ME = "You (current admin)";

// ── Status model (drives the sub-navigation) ──────────────────────────────────────────────────────
type Status =
  | "Pending"
  | "Waiting for Approval"
  | "Approved"
  | "Rejected"
  | "Provisioning"
  | "Completed"
  | "Cancelled";

const STATUS_TONE: Record<Status, string> = {
  Pending: T.warning,
  "Waiting for Approval": T.warning,
  Approved: T.success,
  Rejected: T.danger,
  Provisioning: T.accent,
  Completed: T.success,
  Cancelled: T.textMuted,
};

const TYPE_TABS = [
  { id: "all", label: "All", Icon: Inbox },
  { id: "pending", label: "Pending", Icon: Clock },
  { id: "mine", label: "My Requests", Icon: UserCheck },
  { id: "waiting", label: "Waiting for Approval", Icon: Hourglass },
  { id: "approved", label: "Approved", Icon: Check },
  { id: "rejected", label: "Rejected", Icon: X },
  { id: "provisioning", label: "Provisioning", Icon: RefreshCcw },
  { id: "completed", label: "Completed", Icon: CheckCheck },
  { id: "cancelled", label: "Cancelled", Icon: Ban },
];

// map sub-nav id → status filter (mine is handled separately)
const TAB_STATUS: Record<string, Status | null> = {
  all: null,
  pending: "Pending",
  mine: null,
  waiting: "Waiting for Approval",
  approved: "Approved",
  rejected: "Rejected",
  provisioning: "Provisioning",
  completed: "Completed",
  cancelled: "Cancelled",
};

const REQUEST_TYPES = [
  "Create Workspace",
  "Clone Workspace",
  "Modify Workspace",
  "Transfer Ownership",
  "Enable Shared Workspace",
  "Archive Workspace",
  "Restore Workspace",
  "Delete Workspace",
];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const WS_TYPES = ["Enterprise", "Department", "Project", "Shared Service"];
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

// Approval pipeline stages (spec §Approval Workflow).
const STAGES = [
  "Submission",
  "Business Approval",
  "Security Review",
  "Compliance Review",
  "Operations Approval",
  "Provisioning",
];

interface RequestRecord {
  id: string;
  workspace: string;
  description: string;
  requestType: string;
  requester: string;
  mine: boolean;
  businessUnit: string;
  environment: string;
  workspaceType: string;
  priority: string;
  complianceProfile: string;
  governanceProfile: string;
  status: Status;
  currentStage: string;
  reviewer: string;
  submitted: string;
  dueDate: string;
  requiredDate: string;
  owner: string;
  delegatedAdmins: string[];
  businessOwner: string;
  technicalOwner: string;
  approvalsCompleted: number;
  approvalsRemaining: number;
  affectedResources: number;
  estProvisioningMin: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative request set.
const SAMPLE_REQUESTS: RequestRecord[] = Array.from({ length: 16 }, (_, i) => {
  const id = `REQ-${(482 + i * 7).toString().padStart(6, "0")}`;
  const n = hashId(id);
  const status = pick<Status>(
    [
      "Pending",
      "Waiting for Approval",
      "Waiting for Approval",
      "Approved",
      "Rejected",
      "Provisioning",
      "Completed",
      "Cancelled",
    ],
    n,
  );
  const requester = pick(REQUESTERS, n);
  const stageIdx =
    status === "Completed" || status === "Provisioning"
      ? 5
      : status === "Approved"
        ? 4
        : status === "Rejected" || status === "Cancelled"
          ? Math.max(1, n % 4)
          : 1 + (n % 4);
  return {
    id,
    workspace: `${pick(BUSINESS_UNITS, n)} ${pick(ENVIRONMENTS, n >> 2)}`,
    description: `${pick(REQUEST_TYPES, n)} for the ${pick(BUSINESS_UNITS, n)} business unit.`,
    requestType: pick(REQUEST_TYPES, n),
    requester,
    mine: requester === ME,
    businessUnit: pick(BUSINESS_UNITS, n),
    environment: pick(ENVIRONMENTS, n >> 2),
    workspaceType: pick(WS_TYPES, n >> 3),
    priority: pick(PRIORITIES, n >> 1),
    complianceProfile: pick(COMPLIANCE_PROFILES, n),
    governanceProfile: pick(GOVERNANCE_PROFILES, n),
    status,
    currentStage: STAGES[Math.min(stageIdx, STAGES.length - 1)],
    reviewer: pick(REVIEWERS, n),
    submitted: `2026-08-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    dueDate: `2026-08-${(1 + ((n + 5) % 27)).toString().padStart(2, "0")}`,
    requiredDate: `2026-09-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    owner: pick(REQUESTERS.slice(1), n),
    delegatedAdmins: [pick(REVIEWERS, n + 1), pick(REVIEWERS, n + 2)],
    businessOwner: pick(REQUESTERS.slice(1), n + 2),
    technicalOwner: pick(REVIEWERS, n + 3),
    approvalsCompleted: Math.min(stageIdx, 4),
    approvalsRemaining: Math.max(0, 4 - stageIdx),
    affectedResources: 3 + (n % 40),
    estProvisioningMin: 5 + (n % 25),
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

/**
 * Embeddable body — sub-navigation + directory + request detail drawer, WITHOUT the outer <Page> or
 * the page banner. Rendered both as the standalone route and as a tab of the Workspace Management
 * console. Uses local state for the status sub-nav so it never collides with a host page's `?tab=`.
 */
export function WorkspaceRequestsView() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("all");

  const [search, setSearch] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fRequester, setFRequester] = React.useState("");
  const [fPriority, setFPriority] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_REQUESTS;
  const tabStatus = TAB_STATUS[tab];

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (tab === "mine" ? r.mine : !tabStatus || r.status === tabStatus) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.requester.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)) &&
      (!fStatus || r.status === fStatus) &&
      (!fType || r.requestType === fType) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fRequester || r.requester === fRequester) &&
      (!fPriority || r.priority === fPriority) &&
      (!fEnv || r.environment === fEnv)
    );
  });
  const hasFilters = !!(
    search ||
    fStatus ||
    fType ||
    fBu ||
    fRequester ||
    fPriority ||
    fEnv
  );
  const clearFilters = () => {
    setSearch("");
    setFStatus("");
    setFType("");
    setFBu("");
    setFRequester("");
    setFPriority("");
    setFEnv("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const toolbar: CommandItem[] = [
    {
      key: "new",
      label: "New Workspace Request",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=requests"),
    },
    {
      key: "import",
      label: "Import Request",
      icon: <Upload size={15} />,
      disabled: true,
    },
    {
      key: "approve",
      label: "Approve",
      icon: <Check size={15} />,
      disabled: true,
    },
    { key: "reject", label: "Reject", icon: <X size={15} />, disabled: true },
    { key: "cancel", label: "Cancel", icon: <X size={15} />, disabled: true },
    {
      key: "assign",
      label: "Assign Reviewer",
      icon: <UserCheck size={15} />,
      disabled: true,
    },
    {
      key: "reassign",
      label: "Reassign",
      icon: <RefreshCcw size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<RequestRecord>[] = [
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
      key: "type",
      header: "Request Type",
      sortValue: (r) => r.requestType,
      render: (r) => r.requestType,
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
      key: "priority",
      header: "Priority",
      sortValue: (r) => PRIORITIES.indexOf(r.priority),
      render: (r) => (
        <span style={{ color: PRIORITY_TONE[r.priority] }}>{r.priority}</span>
      ),
    },
    {
      key: "stage",
      header: "Current Stage",
      sortValue: (r) => r.currentStage,
      render: (r) => r.currentStage,
    },
    {
      key: "submitted",
      header: "Submitted",
      sortValue: (r) => r.submitted,
      render: (r) => r.submitted,
    },
    {
      key: "due",
      header: "Due Date",
      sortValue: (r) => r.dueDate,
      render: (r) => r.dueDate,
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
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={tab}
          onChange={setTab}
          options={TYPE_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      <Card
        title="Workspace request queue"
        desc="Every request follows an auditable, staged approval process before operational actions run. An approved request automatically creates a Provisioning Queue job."
      >
        <CommandBar items={toolbar} />

        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search workspace requests — name, ID, requester, business unit, owner…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select
            label="Status"
            value={fStatus}
            onChange={setFStatus}
            options={facet(records.map((r) => r.status))}
          />
          <Select
            label="Request Type"
            value={fType}
            onChange={setFType}
            options={facet(records.map((r) => r.requestType))}
          />
          <Select
            label="Business Unit"
            value={fBu}
            onChange={setFBu}
            options={facet(records.map((r) => r.businessUnit))}
          />
          <Select
            label="Requester"
            value={fRequester}
            onChange={setFRequester}
            options={facet(records.map((r) => r.requester))}
          />
          <Select
            label="Priority"
            value={fPriority}
            onChange={setFPriority}
            options={facet(records.map((r) => r.priority))}
          />
          <Select
            label="Environment"
            value={fEnv}
            onChange={setFEnv}
            options={facet(records.map((r) => r.environment))}
          />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={15}
          initialSort={{ key: "submitted", dir: "desc" }}
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
                { label: "Request Changes", onClick: () => setSelId(r.id) },
                { label: "Assign Reviewer", onClick: () => setSelId(r.id) },
                { label: "Cancel", onClick: () => setSelId(r.id) },
                { label: "Export", onClick: () => {} },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Plus size={20} />}
              title="No workspace requests found."
              hint="Adjust filters, or create / import a workspace request to get started."
              cta="Create Workspace Request"
              onCta={() => navigate("/admin/workspaces?tab=requests")}
            />
          }
        />
      </Card>

      {sel && <RequestDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function WorkspaceRequestsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Workspace Requests"
        subtitle="Manage workspace creation, modification, sharing, archival and lifecycle requests across the organization."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=requests")}
            >
              New Workspace Request
            </HeaderButton>
          </>
        }
      />
      <WorkspaceRequestsView />
    </Page>
  );
}

// ════════════ Request Detail Drawer — 8 sub-tabs (spec §Request Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "config",
    label: "Requested Configuration",
    icon: <FileText size={13} />,
  },
  { id: "approval", label: "Approval Workflow", icon: <GitBranch size={13} /> },
  { id: "validation", label: "Validation", icon: <ClipboardCheck size={13} /> },
  { id: "plan", label: "Provisioning Plan", icon: <ListOrdered size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "attachments", label: "Attachments", icon: <Paperclip size={13} /> },
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
          <HeaderButton icon={<MessageSquare size={13} />}>
            Request Changes
          </HeaderButton>
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
      {tab === "approval" && <ApprovalTab rec={rec} />}
      {tab === "validation" && <ValidationTab rec={rec} />}
      {tab === "plan" && <PlanTab rec={rec} />}
      {tab === "activity" && <ActivityTab />}
      {tab === "attachments" && <AttachmentsTab rec={rec} />}
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

// ── Overview (General · Ownership · Statistics) ──
function OverviewTab({ rec }: { rec: RequestRecord }) {
  return (
    <>
      <Section title="General">
        <KVGrid
          items={[
            { k: "Request ID", v: rec.id },
            { k: "Workspace Name", v: rec.workspace },
            { k: "Request Type", v: rec.requestType },
            { k: "Business Unit", v: rec.businessUnit },
            { k: "Environment", v: rec.environment },
            { k: "Priority", v: rec.priority },
            { k: "Status", v: rec.status },
            { k: "Submitted Date", v: rec.submitted },
            { k: "Required Date", v: rec.requiredDate },
          ]}
        />
        <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
          {rec.description}
        </div>
      </Section>

      <Section title="Ownership" sample>
        <KVGrid
          items={[
            { k: "Requester", v: rec.requester },
            { k: "Workspace Owner", v: rec.owner, sample: true },
            {
              k: "Delegated Administrators",
              v: rec.delegatedAdmins.join(", "),
              sample: true,
            },
            { k: "Business Owner", v: rec.businessOwner, sample: true },
            { k: "Technical Owner", v: rec.technicalOwner, sample: true },
          ]}
        />
      </Section>

      <Section title="Statistics" sample>
        <KVGrid
          cols={3}
          items={[
            {
              k: "Approvals Completed",
              v: rec.approvalsCompleted,
              sample: true,
            },
            {
              k: "Approvals Remaining",
              v: rec.approvalsRemaining,
              sample: true,
            },
            { k: "Validation Checks", v: "8 total", sample: true },
            {
              k: "Est. Provisioning Time",
              v: `${rec.estProvisioningMin} min`,
              sample: true,
            },
            { k: "Affected Resources", v: rec.affectedResources, sample: true },
          ]}
        />
      </Section>
    </>
  );
}

// ── Requested Configuration + comparison view ──
function ConfigTab({ rec }: { rec: RequestRecord }) {
  return (
    <>
      <Section title="Requested workspace configuration" sample>
        <StatRow
          label="Workspace Template"
          value={`${rec.workspaceType} baseline`}
          sample
        />
        <StatRow
          label="Governance Profile"
          value={rec.governanceProfile}
          sample
        />
        <StatRow
          label="Compliance Profile"
          value={rec.complianceProfile}
          sample
        />
        <StatRow
          label="Cloud Resources"
          value={`${rec.affectedResources} resources`}
          sample
        />
        <StatRow label="Tags" value="env, business-unit, cost-centre" sample />
        <StatRow
          label="Metadata"
          value="Legal entity, residency, support tier"
          sample
        />
      </Section>

      <Section title="Comparison" sample>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <ConfigBlock title="Current Configuration" muted>
            <StatRow label="Governance Profile" value="—" />
            <StatRow label="Compliance Profile" value="—" />
            <StatRow label="Environment" value="—" />
          </ConfigBlock>
          <span
            style={{ color: T.textMuted, textAlign: "center", fontSize: 13 }}
          >
            ↓
          </span>
          <ConfigBlock title="Requested Configuration">
            <StatRow
              label="Governance Profile"
              value={rec.governanceProfile}
              tone="ok"
            />
            <StatRow
              label="Compliance Profile"
              value={rec.complianceProfile}
              tone="ok"
            />
            <StatRow label="Environment" value={rec.environment} tone="ok" />
          </ConfigBlock>
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 8 }}>
          Differences are highlighted; a new workspace has no current
          configuration to compare against.
        </div>
      </Section>
    </>
  );
}

function ConfigBlock({
  title,
  muted,
  children,
}: {
  title: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        background: muted ? "transparent" : "var(--cg-accent-bg-strong)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: T.textNav,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Approval Workflow (staged pipeline) ──
function ApprovalTab({ rec }: { rec: RequestRecord }) {
  const currentIdx = STAGES.indexOf(rec.currentStage);
  return (
    <>
      <Section title="Approval workflow" sample>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {STAGES.map((stage, i) => {
            const done = i < currentIdx || rec.status === "Completed";
            const active = i === currentIdx && rec.status !== "Completed";
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
                      Reviewer: {i === 0 ? rec.requester : rec.reviewer}
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
                        <span>Completed {rec.submitted}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
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

// ── Validation (policy checks) ──
function ValidationTab({ rec }: { rec: RequestRecord }) {
  const n = hashId(rec.id);
  const checks = [
    "Naming Policy",
    "Ownership Policy",
    "Template Validation",
    "Compliance Validation",
    "Capacity Check",
    "Cloud Resource Validation",
    "Quota Validation",
    "Governance Policy",
  ].map((label, i) => {
    const state =
      (n + i) % 6 === 0 ? "Failed" : (n + i) % 3 === 0 ? "Warning" : "Passed";
    return { label, state };
  });
  const failed = checks.some((c) => c.state === "Failed");
  return (
    <>
      <Section title="Automatic policy validation" sample>
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
      {failed && (
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
          <AlertTriangle size={15} /> Failed validations block approval unless
          an authorized override exists.
        </div>
      )}
    </>
  );
}

// ── Provisioning Plan ──
function PlanTab({ rec }: { rec: RequestRecord }) {
  const steps = [
    "Create Workspace",
    "Assign Owner",
    "Apply Governance Profile",
    "Assign Compliance Profile",
    "Provision Cloud Resources",
    "Enable Integrations",
    "Activate Workspace",
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
        Actions executed after approval <SampleTag />
      </div>
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
                style={{
                  color: T.textMuted,
                  textAlign: "center",
                  fontSize: 12,
                }}
              >
                ↓
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
      <StatRow
        label="Estimated execution time"
        value={`${rec.estProvisioningMin} minutes`}
        tone="ok"
        sample
      />
    </>
  );
}

// ── Activity timeline ──
function ActivityTab() {
  const events = [
    "Request Submitted",
    "Validation Completed",
    "Reviewer Assigned",
    "Approval Granted",
    "Comments Added",
    "Provisioning Started",
    "Provisioning Completed",
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
        Request activity timeline <SampleTag />
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
              {pick(REVIEWERS, i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Attachments ──
function AttachmentsTab({ rec }: { rec: RequestRecord }) {
  const n = hashId(rec.id);
  const docs = [
    "Architecture Diagram",
    "Business Justification",
    "Compliance Documentation",
    "Exception Approval",
    "Supporting Evidence",
  ]
    .slice(0, 2 + (n % 4))
    .map((name, i) => ({
      id: `${rec.id}-doc-${i}`,
      document: `${name}.pdf`,
      type: name,
      uploadedBy: pick(REQUESTERS, n + i),
      date: `2026-08-${(1 + ((n + i) % 27)).toString().padStart(2, "0")}`,
    }));
  const cols: Column<(typeof docs)[number]>[] = [
    { key: "document", header: "Document", render: (r) => r.document },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "by", header: "Uploaded By", render: (r) => r.uploadedBy },
    { key: "date", header: "Date", render: (r) => r.date },
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
        <HeaderButton icon={<Upload size={13} />}>Upload</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Download</HeaderButton>
        <HeaderButton>Replace</HeaderButton>
        <HeaderButton variant="danger">Delete</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={docs} />
    </>
  );
}

// ── Audit History (immutable) ──
function AuditTab() {
  const events = [
    "Request Created",
    "Configuration Modified",
    "Validation Executed",
    "Reviewer Assigned",
    "Approval Granted",
    "Approval Delegated",
    "Provisioning Started",
    "Provisioning Completed",
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
          value={`${pick(REVIEWERS, i)} · 2026-08-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

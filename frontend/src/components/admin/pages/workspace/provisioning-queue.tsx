/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspaces → Provisioning Queue */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Download,
  Upload,
  Play,
  Pause,
  RefreshCcw,
  RotateCcw,
  X,
  ListOrdered,
  Server,
  Star,
  Wrench,
  LayoutGrid,
  Activity as ActivityIcon,
  History,
  ClipboardCheck,
  GitBranch,
  Boxes,
  Gauge,
  ScrollText,
  ShieldCheck,
  AlertTriangle,
  Filter as FilterIcon,
  Clock,
  CalendarClock,
  CheckCheck,
  Ban,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
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
  Drawer,
  RowMenu,
  ScopeBadge,
  PostureGrid,
  PostureCard,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";

/**
 * Provisioning Queue — the operational execution center that orchestrates, monitors and manages all
 * workspace provisioning and lifecycle operations. Authoritative spec:
 * docs/workspace/workspace_module/…/00_Workspaces/provisioning_queue.md.
 *
 * Every approved workspace request is transformed into one or more provisioning jobs executed through
 * this queue. The console provides operational visibility into execution progress, dependencies,
 * failures, retries, approvals and rollback operations, and reuses the Enterprise-Administration UX
 * pattern shared with the Users module (Banner · Toolbar · Filters · Search · Data Table ·
 * Bulk/Row actions · Job Detail Drawer with 9 sub-tabs) plus an operational dashboard + queue
 * visualization.
 *
 * There is no provisioning backend yet, so the job set is representative sample data (tagged `Sample`
 * in the UI). When the provisioning engine + admin/provisioning.py land, swap SAMPLE_JOBS for the
 * live query — the component API stays identical.
 */

const ME = "You (current admin)";

// ── Status model (drives the sub-navigation) ──────────────────────────────────────────────────────
type Status =
  | "Pending"
  | "Scheduled"
  | "Running"
  | "Waiting for Approval"
  | "Waiting for Dependency"
  | "Completed"
  | "Failed"
  | "Cancelled"
  | "Rollback";

const STATUS_TONE: Record<Status, string> = {
  Pending: T.warning,
  Scheduled: T.accent,
  Running: T.accent,
  "Waiting for Approval": T.warning,
  "Waiting for Dependency": T.warning,
  Completed: T.success,
  Failed: T.danger,
  Cancelled: T.textMuted,
  Rollback: T.purple,
};

// Sub-navigation (spec §Navigation): All + every queue status.
const TYPE_TABS = [
  { id: "all", label: "All", Icon: LayoutGrid },
  { id: "pending", label: "Pending", Icon: Clock },
  { id: "scheduled", label: "Scheduled", Icon: CalendarClock },
  { id: "running", label: "Running", Icon: Play },
  {
    id: "waiting-approval",
    label: "Waiting for Approval",
    Icon: ClipboardCheck,
  },
  {
    id: "waiting-dependency",
    label: "Waiting for Dependency",
    Icon: GitBranch,
  },
  { id: "completed", label: "Completed", Icon: CheckCheck },
  { id: "failed", label: "Failed", Icon: AlertTriangle },
  { id: "cancelled", label: "Cancelled", Icon: Ban },
  { id: "rollback", label: "Rollback", Icon: RotateCcw },
];

const TAB_STATUS: Record<string, Status | null> = {
  all: null,
  pending: "Pending",
  scheduled: "Scheduled",
  running: "Running",
  "waiting-approval": "Waiting for Approval",
  "waiting-dependency": "Waiting for Dependency",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  rollback: "Rollback",
};

// Supported operations (spec §Toolbar → New Provisioning Job).
const OPERATIONS = [
  "Provision Workspace",
  "Clone Workspace",
  "Re-Provision",
  "Synchronize Configuration",
  "Apply Governance",
  "Apply Compliance",
  "Refresh Resources",
  "Archive Workspace",
  "Restore Workspace",
  "Delete Workspace",
];

// Rollback is available only for supported operations (spec §Row Actions).
const ROLLBACK_OPS = new Set([
  "Provision Workspace",
  "Clone Workspace",
  "Apply Governance",
  "Apply Compliance",
  "Archive Workspace",
  "Delete Workspace",
]);

const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const EXECUTION_NODES = ["Node-01", "Node-02", "Node-03", "Node-04", "Node-05"];
const CLOUD_PROVIDERS = ["AWS", "Azure", "GCP", "Multi-Cloud"];
const OWNERS = ["John Smith", "Priya Nair", "Marco Rossi", "Sara Ahmed"];
const SUBMITTERS = [ME, "John Smith", "Priya Nair", "Automation Engine"];
const EXEC_TIME_BUCKETS = ["< 5 min", "5–15 min", "15–30 min", "> 30 min"];

// Execution-plan stages (spec §Execution Plan).
const PLAN_STAGES = [
  "Queue",
  "Initialize Workspace",
  "Validate Configuration",
  "Allocate Resources",
  "Apply Governance",
  "Apply Compliance",
  "Configure Integrations",
  "Synchronize Assets",
  "Validate Health",
  "Activate Workspace",
  "Complete",
];

const PRIORITY_TONE: Record<string, string> = {
  Critical: T.danger,
  High: T.warning,
  Medium: T.textNav,
  Low: T.textMuted,
};

interface JobRecord {
  id: string;
  workspace: string;
  operation: string;
  environment: string;
  businessUnit: string;
  priority: string;
  status: Status;
  currentStage: string;
  progress: number;
  executionNode: string;
  cloudProvider: string;
  owner: string;
  submittedBy: string;
  mine: boolean;
  executionTimeBucket: string;
  queuePosition: number;
  submitted: string;
  started: string;
  completed: string;
  durationMin: number;
  // Request Information
  requestId: string;
  requester: string;
  businessOwner: string;
  workspaceOwner: string;
  approvalWorkflow: string;
  // Statistics
  executionSteps: number;
  completedSteps: number;
  pendingSteps: number;
  warnings: number;
  errors: number;
  retries: number;
  rollbackAvailable: boolean;
  // Progress detail
  currentStep: string;
  estRemaining: string;
  currentWorker: string;
  currentResource: string;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative provisioning-job set covering every status/stage.
const SAMPLE_JOBS: JobRecord[] = Array.from({ length: 14 }, (_, i) => {
  const id = `JOB-${(3801 + i * 11).toString().padStart(6, "0")}`;
  const n = hashId(id);
  const status = pick<Status>(
    [
      "Pending",
      "Scheduled",
      "Running",
      "Running",
      "Waiting for Approval",
      "Waiting for Dependency",
      "Completed",
      "Completed",
      "Failed",
      "Cancelled",
      "Rollback",
    ],
    n,
  );
  const operation = pick(OPERATIONS, n);
  const stageIdx =
    status === "Completed"
      ? PLAN_STAGES.length - 1
      : status === "Pending" || status === "Scheduled"
        ? 0
        : status === "Failed" || status === "Rollback"
          ? 3 + (n % 4)
          : 1 + (n % 7);
  const progress =
    status === "Completed"
      ? 100
      : status === "Pending" || status === "Scheduled"
        ? 0
        : status === "Cancelled"
          ? 20 + (n % 30)
          : Math.round((stageIdx / (PLAN_STAGES.length - 1)) * 100);
  const executionSteps = PLAN_STAGES.length - 1; // exclude the terminal "Complete" node
  const completedSteps = Math.round((progress / 100) * executionSteps);
  const submittedBy = pick(SUBMITTERS, n);
  return {
    id,
    workspace: `${pick(BUSINESS_UNITS, n)} ${pick(ENVIRONMENTS, n >> 2)}`,
    operation,
    environment: pick(ENVIRONMENTS, n >> 2),
    businessUnit: pick(BUSINESS_UNITS, n),
    priority: pick(PRIORITIES, n >> 1),
    status,
    currentStage:
      PLAN_STAGES[Math.min(Math.max(stageIdx, 1), PLAN_STAGES.length - 1)],
    progress,
    executionNode: pick(EXECUTION_NODES, n),
    cloudProvider: pick(CLOUD_PROVIDERS, n >> 1),
    owner: pick(OWNERS, n),
    submittedBy,
    mine: submittedBy === ME,
    executionTimeBucket: pick(EXEC_TIME_BUCKETS, n >> 2),
    queuePosition: 1 + (n % 12),
    submitted: `2026-08-${(1 + (n % 27)).toString().padStart(2, "0")} 0${1 + (n % 8)}:${(10 + (n % 49)).toString().padStart(2, "0")} UTC`,
    started: `0${2 + (n % 7)}:${(10 + (n % 49)).toString().padStart(2, "0")} UTC`,
    completed:
      status === "Completed"
        ? `0${3 + (n % 6)}:${(15 + (n % 44)).toString().padStart(2, "0")} UTC`
        : "—",
    durationMin: 3 + (n % 40),
    requestId: `REQ-${(482 + n * 3).toString().padStart(6, "0")}`,
    requester: pick(SUBMITTERS, n + 1),
    businessOwner: pick(OWNERS, n + 2),
    workspaceOwner: pick(OWNERS, n + 3),
    approvalWorkflow: pick(
      [
        "Standard (4-stage)",
        "Fast-track (2-stage)",
        "Security-gated (5-stage)",
      ],
      n,
    ),
    executionSteps,
    completedSteps,
    pendingSteps: executionSteps - completedSteps,
    warnings: n % 3,
    errors: status === "Failed" ? 1 + (n % 2) : 0,
    retries: status === "Failed" || status === "Rollback" ? 1 + (n % 3) : 0,
    rollbackAvailable: ROLLBACK_OPS.has(operation),
    currentStep:
      PLAN_STAGES[Math.min(Math.max(stageIdx, 1), PLAN_STAGES.length - 1)],
    estRemaining:
      status === "Completed" || status === "Cancelled"
        ? "—"
        : `${2 + (n % 18)} min`,
    currentWorker: `worker-${pick(EXECUTION_NODES, n).toLowerCase()}-${1 + (n % 6)}`,
    currentResource: pick(
      [
        "AWS account 4821-…",
        "Azure subscription prod-02",
        "GCP project ws-payments",
        "EKS cluster edge-a",
        "VPC net-core-01",
      ],
      n,
    ),
  };
});

// Progress bar cell/detail visual.
function ProgressBar({
  value,
  status,
  width = 96,
}: {
  value: number;
  status?: Status;
  width?: number;
}) {
  const color =
    status === "Failed"
      ? T.danger
      : status === "Rollback"
        ? T.purple
        : status === "Completed"
          ? T.success
          : T.accent;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width,
          height: 6,
          borderRadius: 99,
          background: "var(--cg-border)",
          overflow: "hidden",
          display: "inline-block",
        }}
      >
        <span
          style={{
            display: "block",
            width: `${value}%`,
            height: "100%",
            background: color,
          }}
        />
      </span>
      <span style={{ fontSize: 11.5, color: T.textMuted, minWidth: 30 }}>
        {value}%
      </span>
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
 * Embeddable body — operational dashboard + queue visualization + sub-navigation + directory + job
 * detail drawer, WITHOUT the outer <Page> or the page banner. Rendered both as the standalone route
 * and as a tab of the Workspace Management console. Uses local state for the status sub-nav so it
 * never collides with a host page's `?tab=`.
 */
export function ProvisioningQueueView() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("all");

  const [search, setSearch] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fOperation, setFOperation] = React.useState("");
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fNode, setFNode] = React.useState("");
  const [fPriority, setFPriority] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fSubmitter, setFSubmitter] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fExecTime, setFExecTime] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_JOBS;
  const tabStatus = TAB_STATUS[tab];

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!tabStatus || r.status === tabStatus) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.operation.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.executionNode.toLowerCase().includes(q)) &&
      (!fStatus || r.status === fStatus) &&
      (!fOperation || r.operation === fOperation) &&
      (!fWorkspace || r.workspace === fWorkspace) &&
      (!fEnv || r.environment === fEnv) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fNode || r.executionNode === fNode) &&
      (!fPriority || r.priority === fPriority) &&
      (!fOwner || r.owner === fOwner) &&
      (!fSubmitter || r.submittedBy === fSubmitter) &&
      (!fProvider || r.cloudProvider === fProvider) &&
      (!fExecTime || r.executionTimeBucket === fExecTime)
    );
  });
  const hasFilters = !!(
    search ||
    fStatus ||
    fOperation ||
    fWorkspace ||
    fEnv ||
    fBu ||
    fNode ||
    fPriority ||
    fOwner ||
    fSubmitter ||
    fProvider ||
    fExecTime
  );
  const clearFilters = () => {
    setSearch("");
    setFStatus("");
    setFOperation("");
    setFWorkspace("");
    setFEnv("");
    setFBu("");
    setFNode("");
    setFPriority("");
    setFOwner("");
    setFSubmitter("");
    setFProvider("");
    setFExecTime("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Operational dashboard metrics (spec §Operational Dashboard).
  const runningJobs = records.filter((r) => r.status === "Running").length;
  const pendingJobs = records.filter(
    (r) => r.status === "Pending" || r.status === "Scheduled",
  ).length;
  const completedToday = records.filter((r) => r.status === "Completed").length;
  const failedJobs = records.filter((r) => r.status === "Failed").length;
  const rollbackCount = records.filter((r) => r.status === "Rollback").length;
  const avgProvisioning = Math.round(
    records.reduce((a, r) => a + r.durationMin, 0) / records.length,
  );
  const successRate = Math.round(
    (completedToday / (completedToday + failedJobs || 1)) * 100,
  );

  // Queue visualization counts (spec §Queue Visualization).
  const qScheduled = records.filter((r) => r.status === "Scheduled").length;

  const toolbar: CommandItem[] = [
    {
      key: "new",
      label: "New Provisioning Job",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=requests"),
    },
    // Queue Actions
    {
      key: "pause-queue",
      label: "Pause Queue",
      icon: <Pause size={15} />,
      disabled: true,
    },
    {
      key: "resume-queue",
      label: "Resume Queue",
      icon: <Play size={15} />,
      disabled: true,
    },
    {
      key: "retry-failed",
      label: "Retry Failed",
      icon: <RefreshCcw size={15} />,
      disabled: true,
    },
    {
      key: "cancel-jobs",
      label: "Cancel Jobs",
      icon: <X size={15} />,
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
      icon: <RotateCcw size={15} />,
      disabled: true,
    },
    // Administrative Actions
    {
      key: "reorder",
      label: "Reorder Queue",
      icon: <ListOrdered size={15} />,
      disabled: true,
    },
    {
      key: "assign-node",
      label: "Assign Execution Node",
      icon: <Server size={15} />,
      disabled: true,
    },
    {
      key: "prioritize",
      label: "Prioritize Job",
      icon: <Star size={15} />,
      disabled: true,
    },
    {
      key: "maintenance",
      label: "Move to Maintenance",
      icon: <Wrench size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<JobRecord>[] = [
    {
      key: "id",
      header: "Job ID",
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
      key: "operation",
      header: "Operation",
      sortValue: (r) => r.operation,
      render: (r) => r.operation,
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
      key: "progress",
      header: "Progress",
      sortValue: (r) => r.progress,
      render: (r) => <ProgressBar value={r.progress} status={r.status} />,
    },
    {
      key: "node",
      header: "Execution Node",
      sortValue: (r) => r.executionNode,
      render: (r) => r.executionNode,
    },
    {
      key: "started",
      header: "Started",
      sortValue: (r) => r.started,
      render: (r) => r.started,
    },
    {
      key: "duration",
      header: "Duration",
      sortValue: (r) => r.durationMin,
      render: (r) => `${r.durationMin} min`,
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
      {/* Operational Dashboard (spec §Operational Dashboard) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
          color: T.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          marginBottom: 10,
        }}
      >
        Operational dashboard <SampleTag />
      </div>
      <div style={{ marginBottom: 18 }}>
        <PostureGrid>
          <PostureCard
            title="Running Jobs"
            value={runningJobs}
            sub="Active executions"
            tone="ok"
          />
          <PostureCard
            title="Pending Jobs"
            value={pendingJobs}
            sub="Awaiting execution"
            tone="warn"
          />
          <PostureCard
            title="Completed Today"
            value={completedToday}
            sub="Finished successfully"
            tone="ok"
          />
          <PostureCard
            title="Failed Jobs"
            value={failedJobs}
            sub="Require intervention"
            tone={failedJobs ? "danger" : "muted"}
          />
          <PostureCard
            title="Average Provisioning Time"
            value={`${avgProvisioning} min`}
            sub="Across all operations"
            tone="muted"
          />
          <PostureCard
            title="Success Rate"
            value={`${successRate}%`}
            sub="Completed vs failed"
            tone={successRate >= 90 ? "ok" : "warn"}
          />
          <PostureCard
            title="Rollback Count"
            value={rollbackCount}
            sub="In-flight rollbacks"
            tone={rollbackCount ? "warn" : "muted"}
          />
          <PostureCard
            title="Execution Capacity"
            value={`${EXECUTION_NODES.length} nodes`}
            sub="72% utilized"
            tone="ok"
          />
        </PostureGrid>
      </div>

      {/* Queue Visualization (spec §Queue Visualization) */}
      <Card
        title="Queue visualization"
        desc="Real-time operational visibility of queue throughput."
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <QueueStage
            label="Pending"
            count={pendingJobs - qScheduled}
            tone={T.warning}
          />
          <Arrow />
          <QueueStage label="Scheduled" count={qScheduled} tone={T.accent} />
          <Arrow />
          <QueueStage label="Running" count={runningJobs} tone={T.accent} />
          <Arrow />
          <QueueStage
            label="Completed"
            count={completedToday}
            tone={T.success}
          />
          <SampleTag />
        </div>
      </Card>

      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={tab}
          onChange={setTab}
          options={TYPE_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      <Card
        title="Provisioning queue"
        desc="Every approved workspace request is transformed into one or more provisioning jobs executed through the queue. Monitor, control and troubleshoot execution across the organization."
      >
        <CommandBar items={toolbar} />

        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search provisioning jobs — workspace, job ID, operation, owner, business unit, execution node…"
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
            label="Operation"
            value={fOperation}
            onChange={setFOperation}
            options={facet(records.map((r) => r.operation))}
          />
          <Select
            label="Workspace"
            value={fWorkspace}
            onChange={setFWorkspace}
            options={facet(records.map((r) => r.workspace))}
          />
          <Select
            label="Environment"
            value={fEnv}
            onChange={setFEnv}
            options={facet(records.map((r) => r.environment))}
          />
          <Select
            label="Business Unit"
            value={fBu}
            onChange={setFBu}
            options={facet(records.map((r) => r.businessUnit))}
          />
          <Select
            label="Execution Node"
            value={fNode}
            onChange={setFNode}
            options={facet(records.map((r) => r.executionNode))}
          />
          <Select
            label="Priority"
            value={fPriority}
            onChange={setFPriority}
            options={facet(records.map((r) => r.priority))}
          />
          <Select
            label="Owner"
            value={fOwner}
            onChange={setFOwner}
            options={facet(records.map((r) => r.owner))}
          />
          <Select
            label="Submitted By"
            value={fSubmitter}
            onChange={setFSubmitter}
            options={facet(records.map((r) => r.submittedBy))}
          />
          <Select
            label="Cloud Provider"
            value={fProvider}
            onChange={setFProvider}
            options={facet(records.map((r) => r.cloudProvider))}
          />
          <Select
            label="Execution Time"
            value={fExecTime}
            onChange={setFExecTime}
            options={facet(records.map((r) => r.executionTimeBucket))}
          />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "started", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<Pause size={13} />} onClick={clear}>
                Pause ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<Play size={13} />} onClick={clear}>
                Resume
              </HeaderButton>
              <HeaderButton icon={<RefreshCcw size={13} />} onClick={clear}>
                Retry
              </HeaderButton>
              <HeaderButton icon={<X size={13} />} onClick={clear}>
                Cancel
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
                { label: "Retry", onClick: () => setSelId(r.id) },
                { label: "Pause", onClick: () => setSelId(r.id) },
                { label: "Resume", onClick: () => setSelId(r.id) },
                {
                  label: "Cancel",
                  onClick: () => setSelId(r.id),
                  danger: true,
                },
                {
                  label: "Rollback",
                  onClick: () => setSelId(r.id),
                  danger: true,
                  disabled: !r.rollbackAvailable,
                },
                { label: "Export", onClick: () => {} },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Plus size={20} />}
              title="No provisioning jobs in the queue."
              hint="Adjust filters, or create a provisioning job / refresh the queue to get started."
              cta="Create Provisioning Job"
              onCta={() => navigate("/admin/workspaces?tab=requests")}
            />
          }
        />
      </Card>

      {sel && <JobDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function ProvisioningQueuePage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Provisioning Queue"
        subtitle="Monitor, control and troubleshoot workspace provisioning operations across the organization."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=requests")}
            >
              New Provisioning Job
            </HeaderButton>
          </>
        }
      />
      <ProvisioningQueueView />
    </Page>
  );
}

// ── Queue-visualization helpers ───────────────────────────────────────────────────────────────────
function QueueStage({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "9px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: T.cardBg,
      }}
    >
      <span style={{ fontSize: 12.5, color: T.textNav }}>{label}</span>
      <span
        style={{
          minWidth: 22,
          height: 20,
          padding: "0 7px",
          borderRadius: 99,
          fontSize: 11.5,
          fontWeight: 600,
          color: tone,
          background: "var(--cg-bg-badge)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {Math.max(0, count)}
      </span>
    </div>
  );
}
function Arrow() {
  return <span style={{ color: T.textMuted, fontSize: 14 }}>→</span>;
}

// ════════════ Provisioning Job Detail Drawer — 9 sub-tabs (spec §Provisioning Job Detail Drawer) ════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "plan", label: "Execution Plan", icon: <ListOrdered size={13} /> },
  { id: "progress", label: "Progress", icon: <Gauge size={13} /> },
  { id: "resources", label: "Resources", icon: <Boxes size={13} /> },
  { id: "dependencies", label: "Dependencies", icon: <GitBranch size={13} /> },
  { id: "validation", label: "Validation", icon: <ClipboardCheck size={13} /> },
  { id: "logs", label: "Logs", icon: <ScrollText size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function JobDetailDrawer({
  rec,
  onClose,
}: {
  rec: JobRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <Drawer
      // Drawer Header — Job ID · Workspace · Operation · Status · Priority · Progress (spec §Drawer Header)
      title={`${rec.id} · ${rec.workspace}`}
      subtitle={`${rec.operation} · ${rec.status} · ${rec.priority} priority · ${rec.progress}% complete`}
      width={760}
      onClose={onClose}
      footer={
        // Quick Actions — Pause · Resume · Retry · Cancel · Rollback · Export (spec §Drawer Header)
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <HeaderButton icon={<Pause size={13} />}>Pause</HeaderButton>
          <HeaderButton icon={<Play size={13} />}>Resume</HeaderButton>
          <HeaderButton icon={<RefreshCcw size={13} />}>Retry</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton
            variant="danger"
            icon={<RotateCcw size={13} />}
            disabled={!rec.rollbackAvailable}
            title={
              rec.rollbackAvailable
                ? undefined
                : "Rollback is available only for supported operations"
            }
          >
            Rollback
          </HeaderButton>
          <HeaderButton variant="danger" icon={<X size={13} />}>
            Cancel
          </HeaderButton>
        </div>
      }
    >
      <Tabs tabs={DRAWER_TABS} active={tab} onChange={setTab} />
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "plan" && <ExecutionPlanTab rec={rec} />}
      {tab === "progress" && <ProgressTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "dependencies" && <DependenciesTab rec={rec} />}
      {tab === "validation" && <ValidationTab rec={rec} />}
      {tab === "logs" && <LogsTab rec={rec} />}
      {tab === "activity" && <ActivityTab />}
      {tab === "audit" && <AuditTab />}
    </Drawer>
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

// ── Overview (General · Request Information · Statistics) ──
function OverviewTab({ rec }: { rec: JobRecord }) {
  return (
    <>
      <Section title="General">
        <KVGrid
          items={[
            { k: "Job ID", v: rec.id },
            { k: "Workspace", v: rec.workspace },
            { k: "Operation", v: rec.operation },
            { k: "Environment", v: rec.environment },
            { k: "Priority", v: rec.priority },
            { k: "Status", v: <StatusBadge status={rec.status} /> },
            { k: "Execution Node", v: rec.executionNode, sample: true },
            { k: "Queue Position", v: `#${rec.queuePosition}`, sample: true },
            { k: "Submitted", v: rec.submitted, sample: true },
            { k: "Started", v: rec.started, sample: true },
            { k: "Completed", v: rec.completed, sample: true },
            { k: "Duration", v: `${rec.durationMin} min`, sample: true },
          ]}
        />
      </Section>

      <Section title="Request Information" sample>
        <KVGrid
          items={[
            { k: "Request ID", v: rec.requestId, sample: true },
            { k: "Requester", v: rec.requester, sample: true },
            { k: "Business Owner", v: rec.businessOwner, sample: true },
            { k: "Workspace Owner", v: rec.workspaceOwner, sample: true },
            { k: "Approval Workflow", v: rec.approvalWorkflow, sample: true },
          ]}
        />
      </Section>

      <Section title="Statistics" sample>
        <KVGrid
          cols={3}
          items={[
            { k: "Execution Steps", v: rec.executionSteps, sample: true },
            { k: "Completed Steps", v: rec.completedSteps, sample: true },
            { k: "Pending Steps", v: rec.pendingSteps, sample: true },
            { k: "Warnings", v: rec.warnings, sample: true },
            { k: "Errors", v: rec.errors, sample: true },
            { k: "Retries", v: rec.retries, sample: true },
            {
              k: "Rollback Available",
              v: rec.rollbackAvailable ? "Yes" : "No",
              sample: true,
            },
          ]}
        />
      </Section>
    </>
  );
}

// ── Execution Plan — staged pipeline with Status / Duration / Owner / Logs per stage ──
function ExecutionPlanTab({ rec }: { rec: JobRecord }) {
  const n = hashId(rec.id);
  const currentIdx = PLAN_STAGES.indexOf(rec.currentStage);
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
        Execution workflow before and during provisioning. Each stage displays
        Status, Duration, Owner and Logs. <SampleTag />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {PLAN_STAGES.map((stage, i) => {
          const done =
            i < currentIdx ||
            rec.status === "Completed" ||
            rec.progress === 100;
          const active =
            i === currentIdx &&
            rec.status !== "Completed" &&
            rec.progress !== 100;
          const failed =
            (rec.status === "Failed" || rec.status === "Rollback") &&
            i === currentIdx;
          const tone = failed
            ? T.danger
            : done
              ? T.success
              : active
                ? T.accent
                : T.textMuted;
          const state = failed
            ? "Failed"
            : done
              ? "Completed"
              : active
                ? "In progress"
                : "Pending";
          return (
            <div
              key={stage}
              style={{
                display: "flex",
                gap: 12,
                padding: "12px 0",
                borderBottom:
                  i < PLAN_STAGES.length - 1 ? `1px solid ${T.border}` : "none",
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
                {failed ? "✕" : done ? "✓" : i + 1}
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
                  <span style={{ color: tone }}>Status: {state}</span>
                  <span>·</span>
                  <span>
                    Duration:{" "}
                    {done || active ? `${1 + ((n + i) % 6)} min` : "—"}
                  </span>
                  <span>·</span>
                  <span>Owner: {pick(EXECUTION_NODES, n + i)}</span>
                  <span>·</span>
                  <button
                    type="button"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: T.accent,
                      fontSize: 11.5,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    View Logs
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Progress — real-time execution visibility ──
function ProgressTab({ rec }: { rec: JobRecord }) {
  return (
    <>
      <Section title="Real-time execution visibility" sample>
        <StatRow label="Overall Progress" value={`${rec.progress}%`} sample />
        <StatRow label="Current Step" value={rec.currentStep} sample />
        <StatRow
          label="Estimated Remaining Time"
          value={rec.estRemaining}
          sample
        />
        <StatRow label="Current Worker" value={rec.currentWorker} sample />
        <StatRow label="Current Resource" value={rec.currentResource} sample />
      </Section>
      <Section title="Progress" sample>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 0",
          }}
        >
          <ProgressBar value={rec.progress} status={rec.status} width={280} />
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted }}>
          {rec.completedSteps} of {rec.executionSteps} execution steps complete.
        </div>
      </Section>
    </>
  );
}

// ── Resources — created / modified during provisioning ──
const RESOURCE_CATEGORIES = [
  "AWS Accounts",
  "Azure Subscriptions",
  "Google Projects",
  "Kubernetes Clusters",
  "Repositories",
  "Storage",
  "Networking",
  "Identity",
  "Integrations",
];
function ResourcesTab({ rec }: { rec: JobRecord }) {
  const n = hashId(rec.id);
  const resources = RESOURCE_CATEGORIES.slice(0, 4 + (n % 5)).map((cat, i) => ({
    id: `${rec.id}-res-${i}`,
    resource: `${cat.replace(/s$/, "")} ${pick(["prod", "core", "edge", "shared"], n + i)}-0${1 + (i % 6)}`,
    category: cat,
    provider: pick(["AWS", "Azure", "GCP", "Kubernetes", "GitHub"], n + i),
    operation: pick(["Create", "Modify", "Attach", "Configure"], n + i),
    state:
      (n + i) % 5 === 0
        ? "Failed"
        : (n + i) % 3 === 0
          ? "In progress"
          : "Completed",
    duration: `${1 + ((n + i) % 8)} min`,
  }));
  const cols: Column<(typeof resources)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "provider", header: "Provider", render: (r) => r.provider },
    { key: "operation", header: "Operation", render: (r) => r.operation },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{
            color:
              r.state === "Completed"
                ? T.success
                : r.state === "Failed"
                  ? T.danger
                  : T.accent,
          }}
        >
          {r.state}
        </span>
      ),
    },
    { key: "duration", header: "Duration", render: (r) => r.duration },
  ];
  return (
    <>
      <div
        style={{
          fontSize: 12.5,
          color: T.textMuted,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Resources created or modified during provisioning <SampleTag />
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 14,
        }}
      >
        {RESOURCE_CATEGORIES.map((c) => (
          <span
            key={c}
            style={{
              fontSize: 11,
              color: T.textNav,
              padding: "3px 9px",
              borderRadius: 99,
              border: `1px solid ${T.border}`,
              background: "var(--cg-bg-badge)",
            }}
          >
            {c}
          </span>
        ))}
      </div>
      <DirectoryTable columns={cols} rows={resources} />
    </>
  );
}

// ── Dependencies — execution dependencies + gating ──
function DependenciesTab({ rec }: { rec: JobRecord }) {
  const n = hashId(rec.id);
  const deps = [
    "Approval Required",
    "Cloud Account Ready",
    "Quota Available",
    "Network Provisioned",
    "Identity Available",
  ].map((label, i) => {
    const blocked =
      rec.status === "Waiting for Dependency" && (n + i) % 3 === 0 && i > 0;
    return {
      label,
      blocked,
      reason: blocked
        ? pick(
            [
              "Awaiting quota increase approval",
              "Cloud account not yet linked",
              "Network peering pending",
            ],
            n + i,
          )
        : null,
    };
  });
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
        Execution dependencies — blocked dependencies display the blocking
        reason. <SampleTag />
      </div>
      {deps.map((d) => (
        <StatRow
          key={d.label}
          label={d.label}
          value={d.blocked ? "Blocked" : "Satisfied"}
          tone={d.blocked ? "danger" : "ok"}
          hint={d.reason ?? undefined}
          sample
        />
      ))}
      <div style={{ marginTop: 16 }}>
        <Section title="Dependency flow" sample>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <QueueStage
              label="Dependency"
              count={deps.length}
              tone={T.accent}
            />
            <Arrow />
            <QueueStage
              label="Satisfied"
              count={deps.filter((d) => !d.blocked).length}
              tone={T.success}
            />
            <Arrow />
            <QueueStage
              label="Execution Continues"
              count={rec.progress}
              tone={T.accent}
            />
          </div>
        </Section>
      </div>
    </>
  );
}

// ── Validation — automated validation results ──
function ValidationTab({ rec }: { rec: JobRecord }) {
  const n = hashId(rec.id);
  const checks = [
    "Naming Policy",
    "Governance Policy",
    "Compliance Assignment",
    "Quota Validation",
    "Cloud Connectivity",
    "Identity Validation",
    "Configuration Validation",
    "Template Validation",
  ].map((label, i) => {
    const state =
      (n + i) % 6 === 0 ? "Failed" : (n + i) % 3 === 0 ? "Warning" : "Passed";
    return { label, state };
  });
  const failed = checks.some((c) => c.state === "Failed");
  return (
    <>
      <Section title="Automated validation results" sample>
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
          <AlertTriangle size={15} /> Failures stop execution unless an approved
          override exists.
        </div>
      )}
    </>
  );
}

// ── Logs — operational execution logs ──
function LogsTab({ rec }: { rec: JobRecord }) {
  const n = hashId(rec.id);
  const SEVERITIES = ["Information", "Warning", "Error", "Critical"];
  const logs = Array.from({ length: 8 }, (_, i) => {
    const sev = SEVERITIES[(n + i) % (i > 5 ? 4 : 2)];
    return {
      id: `${rec.id}-log-${i}`,
      timestamp: `08:${(10 + i * 3).toString().padStart(2, "0")}:${(5 + ((n + i) % 50)).toString().padStart(2, "0")} UTC`,
      step: pick(PLAN_STAGES, n + i),
      component: pick(
        [
          "orchestrator",
          "resource-manager",
          "policy-engine",
          "identity",
          "network",
        ],
        n + i,
      ),
      severity: sev,
      message: pick(
        [
          "Stage started",
          "Resource allocation succeeded",
          "Policy applied successfully",
          "Retryable error — retrying",
          "Dependency wait cleared",
        ],
        n + i,
      ),
    };
  });
  const sevTone = (s: string) =>
    s === "Information"
      ? T.textNav
      : s === "Warning"
        ? T.warning
        : s === "Error"
          ? T.danger
          : T.purple;
  const cols: Column<(typeof logs)[number]>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (r) => (
        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
          {r.timestamp}
        </span>
      ),
    },
    { key: "step", header: "Step", render: (r) => r.step },
    { key: "component", header: "Component", render: (r) => r.component },
    {
      key: "severity",
      header: "Severity",
      render: (r) => (
        <span style={{ color: sevTone(r.severity) }}>{r.severity}</span>
      ),
    },
    { key: "message", header: "Message", render: (r) => r.message },
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
        <HeaderButton icon={<RotateCcw size={13} />}>Refresh</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Download</HeaderButton>
        <HeaderButton icon={<FilterIcon size={13} />}>Filter</HeaderButton>
        <HeaderButton icon={<Upload size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={logs} pageSize={8} />
    </>
  );
}

// ── Activity — timeline (Actor · Date · Severity filters) ──
function ActivityTab() {
  const events = [
    "Job Created",
    "Execution Started",
    "Validation Passed",
    "Step Completed",
    "Retry Executed",
    "Approval Received",
    "Provisioning Completed",
    "Rollback Started",
    "Rollback Completed",
  ];
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <Select
          label="Actor"
          value=""
          onChange={() => {}}
          options={[{ value: "", label: "Actor" }]}
        />
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[{ value: "", label: "Date" }]}
        />
        <Select
          label="Severity"
          value=""
          onChange={() => {}}
          options={[{ value: "", label: "Severity" }]}
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
              {pick(EXECUTION_NODES, i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Audit History — immutable, read-only ──
function AuditTab() {
  const events = [
    "Job Created",
    "Queue Priority Changed",
    "Execution Started",
    "Execution Paused",
    "Execution Resumed",
    "Retry Initiated",
    "Rollback Executed",
    "Configuration Changed",
    "Job Cancelled",
    "Job Completed",
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
        <ShieldCheck size={14} /> Immutable read-only log <SampleTag />
      </div>
      {events.map((e, i) => (
        <StatRow
          key={e}
          label={e}
          value={`${pick(EXECUTION_NODES, i)} · 2026-08-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

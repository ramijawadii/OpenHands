/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Lifecycle → Provisioning */
import React from "react";
import { useNavigate } from "react-router";
import {
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Download,
  RefreshCcw,
  Eye,
  X,
  CheckCircle,
  ShieldCheck,
  ClipboardCheck,
  Activity as ActivityIcon,
  History,
  GitBranch,
  Network,
  ScrollText,
  LayoutGrid,
  AlertTriangle,
  Server,
  Boxes,
  Zap,
  HeartPulse,
  Search as SearchIcon,
  Inbox,
} from "lucide-react";
import {
  Page,
  Tabs,
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
  ConfirmButton,
  PostureCard,
  PostureGrid,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";

/**
 * Provisioning — the Workspace Administration → Lifecycle state for workspaces that have passed
 * governance and approval and are actively being deployed by the platform's provisioning engine.
 * Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/04_Lifecycle/provisioning.md.
 *
 * Provisioning orchestrates every component required to create a fully operational workspace —
 * platform configuration, cloud resources, identity, security, compliance, AI, integrations,
 * monitoring, and operational services — fully automated while providing complete operational
 * visibility. Reuses the shared Enterprise-Administration UX pattern (Banner · Action Toolbar ·
 * Filters · Search · Datatable · Bulk/Row actions · Provisioning Detail Drawer with 8 sub-tabs).
 *
 * There is no provisioning-engine backend yet, so the job set is representative sample data (tagged
 * `Sample` in the UI). When the provisioning orchestrator lands, swap SAMPLE_JOBS for the live query —
 * the component API stays identical.
 */

// ── Provisioning status model (spec §Provisioning Status) ─────────────────────────────────────────
type State =
  | "Queued"
  | "Running"
  | "Waiting"
  | "Paused"
  | "Retrying"
  | "Completed"
  | "Failed"
  | "Cancelled"
  | "Rolled Back";

const STATES: State[] = [
  "Queued",
  "Running",
  "Waiting",
  "Paused",
  "Retrying",
  "Completed",
  "Failed",
  "Cancelled",
  "Rolled Back",
];

const STATE_TONE: Record<State, string> = {
  Queued: T.textMuted,
  Running: T.accent,
  Waiting: T.warning,
  Paused: T.warning,
  Retrying: T.accent,
  Completed: T.success,
  Failed: T.danger,
  Cancelled: T.textMuted,
  "Rolled Back": T.purple,
};

// ── Second-level sub-navigation (spec §Navigation) — a FilterBar "View" dropdown, not pills ───────
const VIEW_TABS = [
  { id: "active", label: "Active Provisioning", Icon: Play },
  { id: "waiting", label: "Waiting Dependencies", Icon: Network },
  { id: "approvals", label: "Pending Approvals", Icon: ClipboardCheck },
  { id: "failures", label: "Provisioning Failures", Icon: AlertTriangle },
  { id: "rollback", label: "Rollback Queue", Icon: Undo2 },
  { id: "completed", label: "Completed", Icon: CheckCircle },
  { id: "cancelled", label: "Cancelled", Icon: X },
];

// ── Provisioning pipeline stages (spec §Provisioning Pipeline) ────────────────────────────────────
const PIPELINE = [
  "Request Approved",
  "Workspace Created",
  "Identity Configuration",
  "Security Baseline",
  "Compliance Configuration",
  "Cloud Resources",
  "AI Platform",
  "Integrations",
  "Monitoring",
  "Validation",
  "Workspace Ready",
];

// ── Lifecycle flow (spec §Lifecycle Flow) — the end-to-end deployment chain ───────────────────────
const LIFECYCLE_FLOW = [
  "Approved Request",
  "Provisioning Queue",
  "Provisioning Engine",
  "Infrastructure Deployment",
  "Configuration",
  "Validation",
  "Workspace Ready",
  "Active Workspace",
];

const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const WS_TYPES = ["Enterprise", "Department", "Project", "Shared Service"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const ENGINES = [
  "Provisioning Engine v3",
  "Automation Pipeline",
  "Terraform Runner",
  "Multi-Cloud Orchestrator",
];
const TEMPLATES = [
  "Enterprise baseline",
  "Department baseline",
  "Project baseline",
  "Shared Service baseline",
];
const REQUESTERS = ["John Smith", "Priya Nair", "Marco Rossi", "Sara Ahmed"];
const EXECUTORS = [
  "Provisioning Engine",
  "Automation Worker",
  "Cloud Orchestrator",
  "Identity Service",
];

// Which provisioning states belong to each navigation view.
const VIEW_STATES: Record<string, State[]> = {
  active: ["Running", "Queued", "Retrying", "Paused"],
  waiting: ["Waiting"],
  approvals: ["Queued"],
  failures: ["Failed"],
  rollback: ["Rolled Back"],
  completed: ["Completed"],
  cancelled: ["Cancelled"],
};

interface JobRecord {
  id: string;
  workspace: string;
  requester: string;
  template: string;
  environment: string;
  workspaceType: string;
  priority: string;
  businessUnit: string;
  engine: string;
  currentStage: string;
  progress: number;
  status: State;
  bucket: string;
  started: string;
  startedDate: string;
  completed: string;
  durationMin: number;
  completedTasks: number;
  remainingTasks: number;
  resourcesCreated: number;
  warnings: number;
  errors: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative provisioning-job set.
const SAMPLE_JOBS: JobRecord[] = Array.from({ length: 15 }, (_, i) => {
  const id = `PRV-${(10291 + i * 13).toString()}`;
  const n = hashId(id);
  const bucket = VIEW_TABS[n % VIEW_TABS.length].id;
  const status = pick(VIEW_STATES[bucket], n);
  const stageIdx =
    status === "Completed"
      ? PIPELINE.length - 1
      : status === "Failed"
        ? 3 + (n % 5)
        : status === "Rolled Back"
          ? 4 + (n % 4)
          : status === "Queued"
            ? 0
            : 1 + (n % (PIPELINE.length - 2));
  const progress =
    status === "Completed"
      ? 100
      : status === "Queued"
        ? 0
        : status === "Cancelled"
          ? 20 + (n % 40)
          : Math.round((stageIdx / (PIPELINE.length - 1)) * 100);
  const wsType = pick(WS_TYPES, n >> 3);
  const durationMin = 3 + (n % 44);
  return {
    id,
    workspace: `${pick(BUSINESS_UNITS, n)} ${pick(ENVIRONMENTS, n >> 2)}`,
    requester: pick(REQUESTERS, n),
    template: TEMPLATES[WS_TYPES.indexOf(wsType)],
    environment: pick(ENVIRONMENTS, n >> 2),
    workspaceType: wsType,
    priority: pick(PRIORITIES, n >> 1),
    businessUnit: pick(BUSINESS_UNITS, n),
    engine: pick(ENGINES, n >> 2),
    currentStage: PIPELINE[Math.min(stageIdx, PIPELINE.length - 1)],
    progress,
    status,
    bucket,
    started: `${(7 + (n % 15)).toString().padStart(2, "0")}:${(n % 60)
      .toString()
      .padStart(2, "0")} UTC`,
    startedDate: `2026-09-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    completed:
      status === "Completed"
        ? `2026-09-${(1 + ((n + 1) % 27)).toString().padStart(2, "0")}`
        : "—",
    durationMin,
    completedTasks: Math.min(stageIdx, PIPELINE.length - 1),
    remainingTasks: Math.max(0, PIPELINE.length - 1 - stageIdx),
    resourcesCreated: 4 + (n % 60),
    warnings: n % 4,
    errors: status === "Failed" ? 1 + (n % 3) : 0,
  };
});

function StatusBadge({ status }: { status: State }) {
  const c = STATE_TONE[status];
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

function ProgressCell({ value, tone }: { value: number; tone: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 72,
          height: 6,
          borderRadius: 99,
          background: "var(--cg-bg-badge)",
          overflow: "hidden",
          display: "inline-block",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "block",
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: "100%",
            background: tone,
          }}
        />
      </span>
      <span
        style={{ fontFamily: "monospace", fontSize: 11.5, color: T.textNav }}
      >
        {value}%
      </span>
    </span>
  );
}

/**
 * Embeddable body — operational dashboard + lifecycle flow + sub-navigation + provisioning-job
 * directory + detail drawer, WITHOUT the outer <Page> or page banner. Rendered both as the standalone
 * route and as a tab of the Workspace Management console. Uses local state for the View sub-nav so it
 * never collides with a host page's `?tab=`.
 */
export function LifecycleProvisioningView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("active");

  const [search, setSearch] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fPriority, setFPriority] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fStage, setFStage] = React.useState("");
  const [fEngine, setFEngine] = React.useState("");
  const [fStarted, setFStarted] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_JOBS;
  const viewStates = VIEW_STATES[view];

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      viewStates.includes(r.status) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.requester.toLowerCase().includes(q) ||
        r.template.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.currentStage.toLowerCase().includes(q)) &&
      (!fStatus || r.status === fStatus) &&
      (!fEnv || r.environment === fEnv) &&
      (!fType || r.workspaceType === fType) &&
      (!fPriority || r.priority === fPriority) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fStage || r.currentStage === fStage) &&
      (!fEngine || r.engine === fEngine) &&
      (!fStarted || r.startedDate === fStarted)
    );
  });
  const hasFilters = !!(
    search ||
    fStatus ||
    fEnv ||
    fType ||
    fPriority ||
    fBu ||
    fStage ||
    fEngine ||
    fStarted
  );
  const clearFilters = () => {
    setSearch("");
    setFStatus("");
    setFEnv("");
    setFType("");
    setFPriority("");
    setFBu("");
    setFStage("");
    setFEngine("");
    setFStarted("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational dashboard (spec §Operational Dashboard) ──
  const running = records.filter((r) => r.status === "Running").length;
  const queued = records.filter((r) => r.status === "Queued").length;
  const success = records.filter((r) => r.status === "Completed").length;
  const failed = records.filter((r) => r.status === "Failed").length;
  const blocked = records.filter((r) => r.status === "Waiting").length;
  const rolledBack = records.filter((r) => r.status === "Rolled Back").length;
  const avgDeploy = Math.round(
    records.reduce((a, r) => a + r.durationMin, 0) / records.length,
  );

  const toolbar: CommandItem[] = [
    {
      key: "progress",
      label: "View Progress",
      icon: <Eye size={15} />,
      disabled: true,
    },
    { key: "pause", label: "Pause", icon: <Pause size={15} />, disabled: true },
    {
      key: "resume",
      label: "Resume",
      icon: <Play size={15} />,
      disabled: true,
    },
    {
      key: "retry",
      label: "Retry",
      icon: <RotateCcw size={15} />,
      disabled: true,
    },
    { key: "cancel", label: "Cancel", icon: <X size={15} />, disabled: true },
    {
      key: "rollback",
      label: "Rollback",
      icon: <Undo2 size={15} />,
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
      label: "Validate Configuration",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "health",
      label: "Run Health Check",
      icon: <HeartPulse size={15} />,
      disabled: true,
    },
    {
      key: "logs",
      label: "View Logs",
      icon: <ScrollText size={15} />,
      disabled: true,
    },
    {
      key: "preview",
      label: "Preview Resources",
      icon: <Boxes size={15} />,
      disabled: true,
    },
    {
      key: "pipeline",
      label: "Open Automation Pipeline",
      icon: <Zap size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<JobRecord>[] = [
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
      header: "Provisioning ID",
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
      key: "stage",
      header: "Current Stage",
      sortValue: (r) => r.currentStage,
      render: (r) => r.currentStage,
    },
    {
      key: "progress",
      header: "Progress",
      sortValue: (r) => r.progress,
      render: (r) => (
        <ProgressCell value={r.progress} tone={STATE_TONE[r.status]} />
      ),
    },
    {
      key: "started",
      header: "Started",
      sortValue: (r) => `${r.startedDate} ${r.started}`,
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
      <Card
        title="Provisioning operations"
        desc="Live throughput across the provisioning engine — running, queued, blocked and rollback jobs at a glance."
        right={<SampleTag />}
      >
        <PostureGrid>
          <PostureCard title="Running Jobs" value={running} tone="ok" />
          <PostureCard title="Queued Jobs" value={queued} tone="muted" />
          <PostureCard
            title="Successful Provisioning"
            value={success}
            tone="ok"
          />
          <PostureCard
            title="Failed Provisioning"
            value={failed}
            tone={failed ? "danger" : "muted"}
          />
          <PostureCard
            title="Average Deployment Time"
            value={`${avgDeploy} min`}
            tone="muted"
          />
          <PostureCard
            title="Current Throughput"
            value={`${running + queued}/h`}
            tone="muted"
          />
          <PostureCard
            title="Blocked Jobs"
            value={blocked}
            tone={blocked ? "warn" : "muted"}
          />
          <PostureCard
            title="Rollback Jobs"
            value={rolledBack}
            tone={rolledBack ? "warn" : "muted"}
          />
        </PostureGrid>
      </Card>

      <Card
        title="Lifecycle flow"
        desc="The enterprise deployment chain every workspace follows from an approved request to an active workspace."
        right={<SampleTag />}
      >
        <FlowChain nodes={LIFECYCLE_FLOW} />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <span style={{ fontSize: 11.5, color: T.textMuted }}>
            Provisioning states:
          </span>
          {STATES.map((s) => (
            <span
              key={s}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11.5,
                color: T.textNav,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: STATE_TONE[s],
                }}
              />
              {s}
            </span>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={view}
          onChange={setView}
          options={VIEW_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      <Card
        title="Provisioning jobs"
        desc="Monitor and manage workspace deployments as they progress through automated provisioning, validation, configuration, and readiness checks."
      >
        <CommandBar items={toolbar} />

        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search provisioning jobs — workspace, provisioning ID, requester, template, business unit, stage…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select
            label="Provisioning Status"
            value={fStatus}
            onChange={setFStatus}
            options={facet(records.map((r) => r.status))}
          />
          <Select
            label="Environment"
            value={fEnv}
            onChange={setFEnv}
            options={facet(records.map((r) => r.environment))}
          />
          <Select
            label="Workspace Type"
            value={fType}
            onChange={setFType}
            options={facet(records.map((r) => r.workspaceType))}
          />
          <Select
            label="Priority"
            value={fPriority}
            onChange={setFPriority}
            options={facet(records.map((r) => r.priority))}
          />
          <Select
            label="Business Unit"
            value={fBu}
            onChange={setFBu}
            options={facet(records.map((r) => r.businessUnit))}
          />
          <Select
            label="Current Stage"
            value={fStage}
            onChange={setFStage}
            options={facet(records.map((r) => r.currentStage))}
          />
          <Select
            label="Provisioning Engine"
            value={fEngine}
            onChange={setFEngine}
            options={facet(records.map((r) => r.engine))}
          />
          <Select
            label="Started Date"
            value={fStarted}
            onChange={setFStarted}
            options={facet(records.map((r) => r.startedDate))}
          />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={15}
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
              <HeaderButton icon={<RotateCcw size={13} />} onClick={clear}>
                Retry
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
                { label: "Pause", onClick: () => setSelId(r.id) },
                { label: "Resume", onClick: () => setSelId(r.id) },
                { label: "Retry", onClick: () => setSelId(r.id) },
                {
                  label: "Rollback",
                  onClick: () => setSelId(r.id),
                  danger: true,
                },
                { label: "View Logs", onClick: () => setSelId(r.id) },
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
              icon={<Inbox size={20} />}
              title="No workspaces are currently being provisioned."
              hint="Approved workspace requests appear here as provisioning jobs. Adjust filters, or review pending requests."
              cta="View Workspace Requests"
              onCta={() => navigate("/admin/workspaces?tab=requests")}
            />
          }
        />
      </Card>

      {sel && (
        <ProvisioningDetailDrawer rec={sel} onClose={() => setSelId(null)} />
      )}

      <RelationshipsCard />
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function LifecycleProvisioningPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Provisioning"
        subtitle="Monitor and manage workspace deployments as they progress through automated provisioning, validation, configuration, and readiness checks."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<RefreshCcw size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=requests")}
            >
              View Workspace Requests
            </HeaderButton>
          </>
        }
      />
      <LifecycleProvisioningView />
    </Page>
  );
}

// ── FlowChain — ASCII / node→node deployment chain, no graph library ──────────────────────────────
function FlowChain({ nodes }: { nodes: string[] }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
      }}
    >
      {nodes.map((node, i) => (
        <React.Fragment key={node}>
          <span
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 12.5,
              color: T.textNav,
              background: "var(--cg-bg-badge)",
              whiteSpace: "nowrap",
            }}
          >
            {node}
          </span>
          {i < nodes.length - 1 && (
            <span style={{ color: T.textMuted, fontSize: 13 }}>→</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── RelationshipsCard — spec §Operational Relationships + §Permissions ────────────────────────────
function RelationshipsCard() {
  const integrates = [
    "Workspace Requests",
    "Workspace Templates",
    "Commercial Center",
    "Identity & Access",
    "Platform Security",
    "Compliance Center",
    "Integration Manager",
    "Cloud Management",
    "AI Runtime Platform",
    "Automation Engine",
    "Notification Center",
    "Logs Center",
    "Monitoring Center",
    "Support Center",
  ];
  const feeds = [
    "Active Workspaces",
    "Audit Logs",
    "Operations Dashboard",
    "Capacity Planning",
    "Billing",
    "Analytics",
  ];
  const permissions = [
    "Organization Administrator",
    "Platform Administrator",
    "Cloud Administrator",
    "Operations Administrator",
  ];
  function Chips({ items }: { items: string[] }) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((it) => (
          <span
            key={it}
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              padding: "4px 9px",
              fontSize: 12,
              color: T.textNav,
              background: "var(--cg-bg-badge)",
            }}
          >
            {it}
          </span>
        ))}
      </div>
    );
  }
  return (
    <Card title="Operational relationships & permissions">
      <Section title="Provisioning integrates with">
        <Chips items={integrates} />
      </Section>
      <Section title="Provisioning feeds">
        <Chips items={feeds} />
      </Section>
      <Section title="Requires one of">
        <Chips items={permissions} />
        <div
          style={{
            fontSize: 11.5,
            color: T.textMuted,
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ShieldCheck size={14} /> Only authorized administrators may pause,
          retry, or rollback provisioning jobs.
        </div>
      </Section>
    </Card>
  );
}

// ════════════ Provisioning Detail Drawer — 8 sub-tabs (spec §Provisioning Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "pipeline",
    label: "Provisioning Pipeline",
    icon: <GitBranch size={13} />,
  },
  { id: "resources", label: "Resources", icon: <Server size={13} /> },
  { id: "validation", label: "Validation", icon: <ClipboardCheck size={13} /> },
  { id: "dependencies", label: "Dependencies", icon: <Network size={13} /> },
  { id: "logs", label: "Logs", icon: <ScrollText size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function ProvisioningDetailDrawer({
  rec,
  onClose,
}: {
  rec: JobRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.id} · ${rec.workspace}`}
      subtitle={`${rec.status} · ${rec.progress}% · Stage: ${rec.currentStage}`}
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
          <HeaderButton icon={<Pause size={13} />}>Pause</HeaderButton>
          <HeaderButton icon={<Play size={13} />}>Resume</HeaderButton>
          <HeaderButton icon={<RotateCcw size={13} />}>Retry</HeaderButton>
          <ConfirmButton
            label={
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
              >
                <Undo2 size={13} /> Rollback
              </span>
            }
            title="Roll back provisioning?"
            body={`Rollback restores workspace ${rec.workspace} (${rec.id}) — cloud resources, identity, policies, integrations, AI configuration and monitoring will be reverted. This cannot be undone.`}
            confirmLabel="Roll back"
            onConfirm={() => {}}
          />
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {/* Drawer header quick-read (spec §Drawer Header) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          padding: "0 0 14px",
          marginBottom: 6,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <HeaderStat label="Workspace" value={rec.workspace} />
        <HeaderStat label="Provisioning ID" value={rec.id} mono />
        <HeaderStat label="Current Stage" value={rec.currentStage} />
        <HeaderStat label="Progress" value={`${rec.progress}%`} />
        <HeaderStat
          label="Status"
          value={<StatusBadge status={rec.status} />}
        />
      </div>

      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "pipeline" && <PipelineTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "validation" && <ValidationTab rec={rec} />}
      {tab === "dependencies" && <DependenciesTab rec={rec} />}
      {tab === "logs" && <LogsTab rec={rec} />}
      {tab === "activity" && <ActivityTab />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

function HeaderStat({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: T.textMuted }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          color: T.textPrimary,
          fontFamily: mono ? "monospace" : undefined,
        }}
      >
        {value}
      </span>
    </div>
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

// ── Overview (General · Statistics · Failure Analysis when failed) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: JobRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Workspace", v: rec.workspace },
              { k: "Provisioning ID", v: rec.id },
              { k: "Template", v: rec.template, sample: true },
              { k: "Environment", v: rec.environment },
              { k: "Provisioning Engine", v: rec.engine, sample: true },
              { k: "Started", v: `${rec.startedDate} ${rec.started}` },
              { k: "Completed", v: rec.completed },
              { k: "Duration", v: `${rec.durationMin} min` },
              { k: "Status", v: rec.status },
            ]}
          />
        </Section>
      )}

      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Completed Tasks", v: rec.completedTasks, sample: true },
              { k: "Remaining Tasks", v: rec.remainingTasks, sample: true },
              { k: "Resources Created", v: rec.resourcesCreated, sample: true },
              { k: "Warnings", v: rec.warnings, sample: true },
              { k: "Errors", v: rec.errors, sample: true },
              { k: "Overall Progress", v: `${rec.progress}%`, sample: true },
            ]}
          />
        </Section>
      )}

      {rec.status === "Failed" && <FailureAnalysis rec={rec} />}
    </>
  );
}

// ── Failure Analysis (spec §Failure Analysis) ──
function FailureAnalysis({ rec }: { rec: JobRecord }) {
  return (
    <Section title="Failure analysis" sample>
      <StatRow
        label="Failed Stage"
        value={rec.currentStage}
        tone="danger"
        sample
      />
      <StatRow
        label="Failure Reason"
        value="Cloud provider API returned a quota-exceeded error"
        tone="danger"
        sample
      />
      <StatRow
        label="Root Cause"
        value="Regional vCPU quota reached for the target subscription"
        sample
      />
      <StatRow
        label="Recommended Action"
        value="Request a quota increase, then retry the failed step"
        sample
      />
      <StatRow label="Retry Availability" value="Available" tone="ok" sample />
      <StatRow
        label="Rollback Availability"
        value="Available"
        tone="ok"
        sample
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <HeaderButton icon={<RotateCcw size={13} />}>
          Retry Failed Step
        </HeaderButton>
        <HeaderButton icon={<RotateCcw size={13} />}>
          Retry Pipeline
        </HeaderButton>
        <HeaderButton variant="danger" icon={<Undo2 size={13} />}>
          Rollback
        </HeaderButton>
        <HeaderButton icon={<ScrollText size={13} />}>Open Logs</HeaderButton>
      </div>
    </Section>
  );
}

// ── Provisioning Pipeline (spec §Provisioning Pipeline) — every stage + per-stage fields ──
function PipelineTab({ rec }: { rec: JobRecord }) {
  const curIdx = PIPELINE.indexOf(rec.currentStage);
  const n = hashId(rec.id);
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
        Every provisioning stage <SampleTag />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {PIPELINE.map((stage, i) => {
          const failedHere = rec.status === "Failed" && i === curIdx;
          const done = i < curIdx || rec.status === "Completed";
          const active =
            i === curIdx && !failedHere && rec.status !== "Completed";
          const tone = failedHere
            ? T.danger
            : done
              ? T.success
              : active
                ? T.accent
                : T.textMuted;
          const stateLabel = failedHere
            ? "Failed"
            : done
              ? "Completed"
              : active
                ? "Running"
                : "Pending";
          const retries = failedHere
            ? 1 + ((n + i) % 3)
            : done
              ? (n + i) % 2
              : 0;
          return (
            <div
              key={stage}
              style={{
                display: "flex",
                gap: 12,
                padding: "12px 0",
                borderBottom:
                  i < PIPELINE.length - 1 ? `1px solid ${T.border}` : "none",
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
                {failedHere ? (
                  <X size={12} />
                ) : done ? (
                  <CheckCircle size={12} />
                ) : (
                  i + 1
                )}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: T.textPrimary,
                    fontWeight: active || failedHere ? 600 : 400,
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
                    marginTop: 3,
                  }}
                >
                  <span style={{ color: tone }}>{stateLabel}</span>
                  <span>·</span>
                  <span>
                    Duration:{" "}
                    {done || active ? `${1 + ((n + i) % 9)} min` : "—"}
                  </span>
                  <span>·</span>
                  <span>Executor: {pick(EXECUTORS, n + i)}</span>
                  <span>·</span>
                  <span>Started: {done || active ? rec.started : "—"}</span>
                  <span>·</span>
                  <span>Completed: {done ? rec.startedDate : "—"}</span>
                  <span>·</span>
                  <span>Retry Count: {retries}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Resources (spec §Resources) — every resource created + Rollback restore set ──
const RESOURCE_CATEGORIES = [
  "Workspace",
  "AWS Accounts",
  "Azure Subscriptions",
  "GCP Projects",
  "Kubernetes Clusters",
  "Networking",
  "Storage",
  "Secrets",
  "Identity",
  "Roles",
  "Groups",
  "Compliance Profiles",
  "Policies",
  "Integrations",
  "Knowledge Sources",
  "AI Providers",
  "LLM Models",
  "Monitoring",
  "Logging",
  "Alerts",
];
const PROVIDERS = ["AWS", "Azure", "GCP", "Kubernetes", "Platform"];
const RES_STATES = ["Created", "Provisioning", "Pending", "Failed"];

function ResourcesTab({ rec }: { rec: JobRecord }) {
  const n = hashId(rec.id);
  const resources = RESOURCE_CATEGORIES.map((cat, i) => {
    const state = pick(RES_STATES, n + i * 3);
    return {
      id: `${rec.id}-res-${i}`,
      resource: `${cat.replace(/s$/, "")}-${(100 + ((n + i) % 800)).toString()}`,
      type: cat,
      provider: pick(PROVIDERS, n + i),
      status: state,
      created: `2026-09-${(1 + ((n + i) % 27)).toString().padStart(2, "0")}`,
    };
  });
  const cols: Column<(typeof resources)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "provider", header: "Provider", render: (r) => r.provider },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{
            color:
              r.status === "Created"
                ? T.success
                : r.status === "Failed"
                  ? T.danger
                  : r.status === "Provisioning"
                    ? T.accent
                    : T.textMuted,
          }}
        >
          {r.status}
        </span>
      ),
    },
    { key: "created", header: "Created", render: (r) => r.created },
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
        Every resource created during provisioning <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={resources} pageSize={10} />

      <div style={{ marginTop: 20 }}>
        <Section title="Rollback" sample>
          <div style={{ fontSize: 12.5, color: T.textNav, marginBottom: 8 }}>
            Supported modes:
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 12,
            }}
          >
            {[
              "Automatic Rollback",
              "Manual Rollback",
              "Partial Rollback",
              "Full Rollback",
            ].map((m) => (
              <span
                key={m}
                style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  padding: "4px 9px",
                  fontSize: 12,
                  color: T.textNav,
                  background: "var(--cg-bg-badge)",
                }}
              >
                {m}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: T.textNav, marginBottom: 8 }}>
            Rollback restores:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              "Workspace",
              "Cloud Resources",
              "Identity",
              "Policies",
              "Integrations",
              "AI Configuration",
              "Monitoring",
            ].map((m) => (
              <span
                key={m}
                style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  padding: "4px 9px",
                  fontSize: 12,
                  color: T.textNav,
                  background: "var(--cg-bg-badge)",
                }}
              >
                {m}
              </span>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

// ── Validation (spec §Validation) — 10 checks, Passed / Warning / Failed ──
function ValidationTab({ rec }: { rec: JobRecord }) {
  const n = hashId(rec.id);
  const checks = [
    "Identity Validation",
    "Security Validation",
    "Compliance Validation",
    "Cloud Connectivity",
    "Network Validation",
    "Integration Validation",
    "AI Runtime Validation",
    "Monitoring Validation",
    "Logging Validation",
    "Backup Validation",
  ].map((label, i) => {
    const state =
      (n + i) % 6 === 0 ? "Failed" : (n + i) % 3 === 0 ? "Warning" : "Passed";
    return { label, state };
  });
  const failed = checks.some((c) => c.state === "Failed");
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
        Ensures the workspace is operational before activation <SampleTag />
      </div>
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
      {failed && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid var(--cg-danger-border)`,
            background: "var(--cg-danger-bg)",
            color: T.danger,
            fontSize: 12.5,
          }}
        >
          <AlertTriangle size={15} /> Failed validations block workspace
          activation until resolved or overridden.
        </div>
      )}
    </>
  );
}

// ── Dependencies (spec §Dependencies) — blocking resources / services ──
const DEPENDENCY_CATEGORIES = [
  "Approval Waiting",
  "Cloud Provider",
  "Shared Services",
  "Identity",
  "Networking",
  "Integration",
  "Secrets",
  "External APIs",
  "Capacity",
  "Licensing",
];

function DependenciesTab({ rec }: { rec: JobRecord }) {
  const n = hashId(rec.id);
  const deps = DEPENDENCY_CATEGORIES.map((cat, i) => {
    const blocked = (n + i) % 3 === 0;
    return {
      id: `${rec.id}-dep-${i}`,
      category: cat,
      resource: `${cat} · ${pick(PROVIDERS, n + i)}`,
      status: blocked ? "Blocked" : "Ready",
    };
  });
  const cols: Column<(typeof deps)[number]>[] = [
    { key: "category", header: "Category", render: (r) => r.category },
    {
      key: "resource",
      header: "Resource / Service",
      render: (r) => r.resource,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span style={{ color: r.status === "Blocked" ? T.warning : T.success }}>
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
        Resources or services blocking provisioning <SampleTag />
      </div>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
      >
        <HeaderButton icon={<RotateCcw size={13} />}>Retry</HeaderButton>
        <HeaderButton icon={<RefreshCcw size={13} />}>Refresh</HeaderButton>
        <HeaderButton icon={<Network size={13} />}>
          Open Dependency
        </HeaderButton>
      </div>
      <DirectoryTable columns={cols} rows={deps} pageSize={10} />
    </>
  );
}

// ── Logs (spec §Logs) — real-time provisioning logs by category ──
const LOG_CATEGORIES = [
  "Provisioning Engine",
  "Automation",
  "Cloud APIs",
  "Identity",
  "Compliance",
  "Security",
  "Integrations",
  "AI Runtime",
  "Validation",
];
const LOG_LEVELS = ["INFO", "WARN", "ERROR", "DEBUG"];

function LogsTab({ rec }: { rec: JobRecord }) {
  const n = hashId(rec.id);
  const [cat, setCat] = React.useState("");
  const [q, setQ] = React.useState("");
  const lines = Array.from({ length: 14 }, (_, i) => {
    const category = pick(LOG_CATEGORIES, n + i);
    const level = pick(LOG_LEVELS, n + i * 2);
    return {
      id: i,
      ts: `${rec.startedDate} ${(7 + i).toString().padStart(2, "0")}:${(
        (n + i) %
        60
      )
        .toString()
        .padStart(2, "0")}:0${i % 10}`,
      category,
      level,
      message: `${category}: ${pick(
        [
          "stage handler dispatched",
          "resource reconciled",
          "cloud API call succeeded",
          "policy applied",
          "validation probe returned",
          "waiting on upstream dependency",
        ],
        n + i,
      )}`,
    };
  }).filter(
    (l) =>
      (!cat || l.category === cat) &&
      (!q || l.message.toLowerCase().includes(q.toLowerCase())),
  );
  const levelColor = (lvl: string) =>
    lvl === "ERROR"
      ? T.danger
      : lvl === "WARN"
        ? T.warning
        : lvl === "DEBUG"
          ? T.textMuted
          : T.accent;
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Select
          label="Log Category"
          value={cat}
          onChange={setCat}
          options={[
            { value: "", label: "All categories" },
            ...LOG_CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
        />
        <div style={{ position: "relative", minWidth: 200 }}>
          <span
            style={{
              position: "absolute",
              left: 9,
              top: 8,
              color: T.textMuted,
            }}
          >
            <SearchIcon size={13} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search logs…"
            aria-label="Search logs"
            style={{
              height: 32,
              width: "100%",
              padding: "0 10px 0 28px",
              background: "var(--cg-input-bg)",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              color: T.textPrimary,
              fontSize: 12.5,
              outline: "none",
            }}
          />
        </div>
        <div style={{ flex: 1 }} />
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Download</HeaderButton>
        <SampleTag />
      </div>
      <div
        style={{
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          background: "var(--cg-bg-badge)",
          padding: "10px 12px",
          fontFamily: "monospace",
          fontSize: 11.5,
          maxHeight: 340,
          overflowY: "auto",
        }}
      >
        {lines.length === 0 ? (
          <div style={{ color: T.textMuted }}>
            No log lines match the filter.
          </div>
        ) : (
          lines.map((l) => (
            <div
              key={l.id}
              style={{ display: "flex", gap: 10, padding: "3px 0" }}
            >
              <span style={{ color: T.textMuted, flexShrink: 0 }}>{l.ts}</span>
              <span
                style={{
                  color: levelColor(l.level),
                  flexShrink: 0,
                  width: 44,
                }}
              >
                {l.level}
              </span>
              <span style={{ color: T.textNav }}>{l.message}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ── Activity (spec §Activity) — timeline + Actor / System / Date filters ──
function ActivityTab() {
  const [actor, setActor] = React.useState("");
  const events = [
    "Provisioning Started",
    "Cloud Resources Created",
    "Identity Configured",
    "Compliance Applied",
    "Integrations Connected",
    "Validation Completed",
    "Provisioning Finished",
  ].map((label, i) => ({
    label,
    actor: pick(EXECUTORS, i),
    when: `2026-09-${(10 + i).toString().padStart(2, "0")}`,
  }));
  const shown = events.filter((e) => !actor || e.actor === actor);
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <Select
          label="Actor"
          value={actor}
          onChange={setActor}
          options={[
            { value: "", label: "All actors" },
            ...EXECUTORS.map((e) => ({ value: e, label: e })),
          ]}
        />
        <Select
          label="System"
          value=""
          onChange={() => {}}
          options={[{ value: "", label: "All systems" }]}
        />
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[{ value: "", label: "All dates" }]}
        />
        <div style={{ flex: 1 }} />
        <SampleTag />
      </div>
      {shown.map((e) => (
        <div
          key={e.label}
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
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e.label}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>
              {e.actor} · {e.when}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Audit History (spec §Audit History) — immutable, read-only ──
function AuditTab() {
  const events = [
    "Provisioning Started",
    "Provisioning Paused",
    "Provisioning Resumed",
    "Provisioning Retried",
    "Provisioning Failed",
    "Rollback Executed",
    "Workspace Activated",
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
          value={`${pick(EXECUTORS, i)} · 2026-09-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

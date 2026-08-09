/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Lifecycle → Maintenance */
import React from "react";
import { useNavigate } from "react-router";
import {
  Wrench,
  CalendarClock,
  Play,
  Pause,
  PlayCircle,
  CheckCircle,
  Ban,
  Clock,
  RefreshCcw,
  Download,
  FileText,
  LayoutGrid,
  ClipboardList,
  Activity as ActivityIcon,
  History,
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  Bell,
  Gauge,
  Server,
  ListOrdered,
  HeartPulse,
  Zap,
  Megaphone,
  CheckCheck,
} from "lucide-react";
import {
  Page,
  Tabs,
  PageHeader,
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
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Lifecycle → Maintenance — the workspaces temporarily placed into a controlled maintenance mode to
 * perform planned administrative, operational, infrastructure, security, or platform changes.
 * Authoritative spec: docs/workspace/workspace_module/…/Workspace Administration/04_Lifecycle/maintenance.md.
 *
 * Unlike Suspended (triggered by security / compliance / financial / operational issues), Maintenance
 * is a PLANNED operational state that minimizes risk during changes while preserving service integrity.
 * Reuses the Enterprise-Administration UX pattern shared with the Users module (Banner · Toolbar ·
 * Filters · Search · Datatable · Bulk/Row actions · Maintenance Detail Drawer with 7 sub-sections).
 *
 * There is no maintenance backend yet, so the record set is representative sample data (tagged `Sample`
 * in the UI). When the lifecycle / change-management engine lands, swap SAMPLE_MAINTENANCE for the live
 * query — the component API stays identical.
 */

// ── Status model (drives the sub-navigation) ──────────────────────────────────────────────────────
type Status =
  | "Scheduled"
  | "In Progress"
  | "Pending Approval"
  | "Waiting Dependencies"
  | "Completed"
  | "Cancelled";

const STATUS_TONE: Record<Status, string> = {
  Scheduled: T.accent,
  "In Progress": T.warning,
  "Pending Approval": T.warning,
  "Waiting Dependencies": T.textMuted,
  Completed: T.success,
  Cancelled: T.textMuted,
};

// Second-level sub-nav (spec § Navigation) — rendered as the first FilterBar facet Select.
const VIEW_TABS = [
  { id: "all", label: "All" },
  { id: "scheduled", label: "Scheduled Maintenance" },
  { id: "active", label: "Active Maintenance" },
  { id: "pending", label: "Pending Approval" },
  { id: "waiting", label: "Waiting Dependencies" },
  { id: "history", label: "Maintenance History" },
  { id: "emergency", label: "Emergency Maintenance" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

// map sub-nav id → status filter (history shows all, emergency is handled by the isEmergency flag)
const VIEW_STATUS: Record<string, Status | null> = {
  all: null,
  scheduled: "Scheduled",
  active: "In Progress",
  pending: "Pending Approval",
  waiting: "Waiting Dependencies",
  history: null,
  emergency: null,
  completed: "Completed",
  cancelled: "Cancelled",
};

// spec § Maintenance Types
const MAINTENANCE_TYPES = [
  "Platform Upgrade",
  "Security Patching",
  "Compliance Update",
  "Cloud Migration",
  "Infrastructure Upgrade",
  "Configuration Change",
  "AI Model Upgrade",
  "Integration Maintenance",
  "Database Maintenance",
  "Network Maintenance",
  "Emergency Maintenance",
];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const OWNERS = [
  "Platform Team",
  "Security Team",
  "Data Team",
  "Cloud Operations",
  "SRE Team",
];
const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];
const APPROVAL_STATUSES = ["Approved", "Pending", "Rejected", "Not Required"];
const WINDOWS = [
  "02:00–04:00 UTC",
  "22:00–00:00 UTC",
  "01:00–03:00 UTC",
  "18:00–20:00 UTC",
  "Weekend 00:00–06:00 UTC",
];
const TIMEZONES = ["UTC", "UTC+1 (CET)", "UTC-5 (EST)", "UTC+5:30 (IST)"];
const STAKEHOLDERS = [
  "Platform Team",
  "Security Team",
  "Compliance Office",
  "Business Owner",
  "Support Center",
];

// spec § Change Execution — the maintenance execution pipeline (drives Current Stage).
const PIPELINE = [
  "Pre-Checks",
  "Enter Maintenance Mode",
  "Execute Changes",
  "Infrastructure Updates",
  "Configuration Changes",
  "Validation",
  "Health Checks",
  "Exit Maintenance Mode",
];

interface MaintenanceRecord {
  id: string;
  maintenanceId: string;
  workspace: string;
  description: string;
  maintenanceType: string;
  isEmergency: boolean;
  businessUnit: string;
  environment: string;
  owner: string;
  status: Status;
  currentStage: string;
  window: string;
  timezone: string;
  riskLevel: string;
  approvalStatus: string;
  changeRequest: string;
  progress: number;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string;
  actualEnd: string;
  duration: string;
  completedTasks: number;
  remainingTasks: number;
  automationJobs: number;
  affectedUsers: number;
  estimatedDowntime: string;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative maintenance set.
const SAMPLE_MAINTENANCE: MaintenanceRecord[] = Array.from(
  { length: 15 },
  (_, i) => {
    const id = `MNT-${(482 + i * 7).toString().padStart(4, "0")}`;
    const n = hashId(id);
    const status = pick<Status>(
      [
        "Scheduled",
        "In Progress",
        "In Progress",
        "Pending Approval",
        "Waiting Dependencies",
        "Completed",
        "Completed",
        "Cancelled",
      ],
      n,
    );
    const maintenanceType = pick(MAINTENANCE_TYPES, n);
    const isEmergency = maintenanceType === "Emergency Maintenance";
    const stageIdx =
      status === "Completed"
        ? PIPELINE.length - 1
        : status === "In Progress"
          ? 1 + (n % 6)
          : status === "Cancelled"
            ? n % 4
            : 0;
    const progress =
      status === "Completed"
        ? 100
        : status === "In Progress"
          ? 20 + (n % 70)
          : status === "Cancelled"
            ? 10 + (n % 40)
            : status === "Waiting Dependencies"
              ? n % 30
              : 0;
    const startDay = 1 + (n % 20);
    const endDay = startDay + 1 + (n % 3);
    return {
      id,
      maintenanceId: `MNT-2026-${(1000 + n).toString().slice(-6)}`,
      workspace: `${pick(BUSINESS_UNITS, n)} ${pick(ENVIRONMENTS, n >> 2)}`,
      description: `${maintenanceType} for the ${pick(BUSINESS_UNITS, n)} business unit workspace.`,
      maintenanceType,
      isEmergency,
      businessUnit: pick(BUSINESS_UNITS, n),
      environment: pick(ENVIRONMENTS, n >> 2),
      owner: pick(OWNERS, n),
      status,
      currentStage: PIPELINE[Math.min(stageIdx, PIPELINE.length - 1)],
      window: isEmergency ? "Immediate (Emergency)" : pick(WINDOWS, n >> 1),
      timezone: pick(TIMEZONES, n),
      riskLevel: isEmergency ? "Critical" : pick(RISK_LEVELS, n >> 1),
      approvalStatus: isEmergency ? "Not Required" : pick(APPROVAL_STATUSES, n),
      changeRequest: `CHG-${(100000 + n).toString().slice(-6)}`,
      progress,
      scheduledStart: `2026-08-${startDay.toString().padStart(2, "0")} ${pick(["02:00", "22:00", "01:00", "18:00"], n)}`,
      scheduledEnd: `2026-08-${endDay.toString().padStart(2, "0")} ${pick(["04:00", "00:00", "03:00", "20:00"], n)}`,
      actualStart:
        status === "Scheduled" || status === "Pending Approval"
          ? "—"
          : `2026-08-${startDay.toString().padStart(2, "0")} ${pick(["02:03", "22:07", "01:11", "18:02"], n)}`,
      actualEnd:
        status === "Completed"
          ? `2026-08-${endDay.toString().padStart(2, "0")} ${pick(["03:41", "23:52", "02:48", "19:37"], n)}`
          : "—",
      duration: `${1 + (n % 4)}h ${(n % 6) * 10}m`,
      completedTasks: Math.min(stageIdx * 3, 24),
      remainingTasks: Math.max(0, 24 - stageIdx * 3),
      automationJobs: 2 + (n % 8),
      affectedUsers: 40 + (n % 400),
      estimatedDowntime: `${(n % 3) * 15 + 15} min`,
    };
  },
);

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

function ProgressBar({ pct }: { pct: number }) {
  const tone = pct >= 100 ? T.success : pct > 0 ? T.warning : T.textMuted;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 80,
          height: 6,
          borderRadius: 99,
          background: "var(--cg-bg-badge)",
          overflow: "hidden",
          display: "inline-block",
        }}
      >
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: tone,
          }}
        />
      </span>
      <span style={{ fontSize: 11.5, color: T.textMuted }}>{pct}%</span>
    </span>
  );
}

/**
 * Embeddable body — operational dashboard + sub-navigation + directory + maintenance detail drawer,
 * WITHOUT the outer <Page> or the page banner. Rendered both as the standalone route and as a tab of
 * the Workspace Management console. Uses local state for the view sub-nav so it never collides with a
 * host page's `?tab=`.
 */
export function LifecycleMaintenanceView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("all");

  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fWindow, setFWindow] = React.useState("");
  const [fRisk, setFRisk] = React.useState("");
  const [fApproval, setFApproval] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_MAINTENANCE;
  const viewStatus = VIEW_STATUS[view];

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (view === "emergency"
        ? r.isEmergency
        : !viewStatus || r.status === viewStatus) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.maintenanceId.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.maintenanceType.toLowerCase().includes(q) ||
        r.changeRequest.toLowerCase().includes(q)) &&
      (!fType || r.maintenanceType === fType) &&
      (!fStatus || r.status === fStatus) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fEnv || r.environment === fEnv) &&
      (!fOwner || r.owner === fOwner) &&
      (!fWindow || r.window === fWindow) &&
      (!fRisk || r.riskLevel === fRisk) &&
      (!fApproval || r.approvalStatus === fApproval)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFStatus("");
    setFBu("");
    setFEnv("");
    setFOwner("");
    setFWindow("");
    setFRisk("");
    setFApproval("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // spec § Operational Dashboard
  const activeCount = records.filter((r) => r.status === "In Progress").length;
  const upcomingCount = records.filter(
    (r) => r.status === "Scheduled" || r.status === "Pending Approval",
  ).length;
  const completedCount = records.filter((r) => r.status === "Completed").length;
  const delayedCount = records.filter(
    (r) => r.status === "Waiting Dependencies",
  ).length;

  const toolbar: CommandItem[] = [
    {
      key: "start",
      label: "Start Maintenance",
      icon: <Play size={15} />,
      disabled: true,
    },
    {
      key: "schedule",
      label: "Schedule Maintenance",
      icon: <CalendarClock size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=lifecycle"),
    },
    {
      key: "pause",
      label: "Pause Maintenance",
      icon: <Pause size={15} />,
      disabled: true,
    },
    {
      key: "resume",
      label: "Resume Maintenance",
      icon: <PlayCircle size={15} />,
      disabled: true,
    },
    {
      key: "complete",
      label: "Complete Maintenance",
      icon: <CheckCircle size={15} />,
      disabled: true,
    },
    {
      key: "cancel",
      label: "Cancel Maintenance",
      icon: <Ban size={15} />,
      disabled: true,
    },
    {
      key: "extend",
      label: "Extend Window",
      icon: <Clock size={15} />,
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
      key: "prechecks",
      label: "Run Pre-Checks",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "healthcheck",
      label: "Run Health Check",
      icon: <HeartPulse size={15} />,
      disabled: true,
    },
    {
      key: "logs",
      label: "View Logs",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "automation",
      label: "Open Automation",
      icon: <Zap size={15} />,
      disabled: true,
    },
    {
      key: "changeplan",
      label: "View Change Plan",
      icon: <ListOrdered size={15} />,
      disabled: true,
    },
    {
      key: "approve",
      label: "Approve Maintenance",
      icon: <CheckCheck size={15} />,
      disabled: true,
    },
    {
      key: "notify",
      label: "Notify Stakeholders",
      icon: <Megaphone size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Readiness",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<MaintenanceRecord>[] = [
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
          <Wrench size={14} color={T.textMuted} />
          {r.workspace}
        </span>
      ),
    },
    {
      key: "type",
      header: "Maintenance Type",
      sortValue: (r) => r.maintenanceType,
      render: (r) => r.maintenanceType,
    },
    {
      key: "stage",
      header: "Current Stage",
      sortValue: (r) => r.currentStage,
      render: (r) => r.currentStage,
    },
    {
      key: "window",
      header: "Window",
      sortValue: (r) => r.window,
      render: (r) => r.window,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "progress",
      header: "Progress",
      sortValue: (r) => r.progress,
      render: (r) => <ProgressBar pct={r.progress} />,
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
      {/* spec § Operational Dashboard */}
      <StatStripPlain
        items={[
          {
            label: "Active Maintenance",
            value: activeCount,
            tone: activeCount > 0 ? "warn" : "muted",
          },
          {
            label: "Upcoming Maintenance",
            value: upcomingCount,
            tone: "muted",
          },
          { label: "Completed Maintenance", value: completedCount, tone: "ok" },
          {
            label: "Delayed Maintenance",
            value: delayedCount,
            tone: delayedCount > 0 ? "danger" : "muted",
          },
          { label: "Average Duration", value: "2h 41m", tone: "muted" },
          { label: "Maintenance Success Rate", value: "97.4%", tone: "ok" },
          {
            label: "Upcoming Maintenance Windows",
            value: upcomingCount,
            tone: "muted",
          },
        ]}
      />

      <div style={{ height: 18 }} />

      <DiscoveryListView
        title="Maintenance Workspaces"
        desc="Manage workspaces undergoing planned maintenance, monitor operational progress, coordinate maintenance windows, and safely return workspaces to production."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search maintenance workspaces — workspace, maintenance ID, owner, business unit, type, change request…"
        count={rows.length}
        pills={[
          {
            key: "view",
            label: "View",
            value: view,
            onChange: setView,
            options: VIEW_TABS.map((t) => ({ value: t.id, label: t.label })),
          },
          {
            key: "maintenanceType",
            label: "Maintenance Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.maintenanceType)),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
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
            key: "owner",
            label: "Owner",
            value: fOwner,
            onChange: setFOwner,
            options: facet(records.map((r) => r.owner)),
          },
          {
            key: "window",
            label: "Maintenance Window",
            value: fWindow,
            onChange: setFWindow,
            options: facet(records.map((r) => r.window)),
          },
          {
            key: "riskLevel",
            label: "Risk Level",
            value: fRisk,
            onChange: setFRisk,
            options: facet(records.map((r) => r.riskLevel)),
          },
          {
            key: "approvalStatus",
            label: "Approval Status",
            value: fApproval,
            onChange: setFApproval,
            options: facet(records.map((r) => r.approvalStatus)),
          },
        ]}
        presets={[
          { label: "All maintenance workspaces", onApply: clearFilters },
        ]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={15}
        initialSort={{ key: "window", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Play size={13} />} onClick={clear}>
              Start ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<Pause size={13} />} onClick={clear}>
              Pause
            </HeaderButton>
            <HeaderButton icon={<PlayCircle size={13} />} onClick={clear}>
              Resume
            </HeaderButton>
            <HeaderButton icon={<Download size={13} />} onClick={clear}>
              Export
            </HeaderButton>
            <HeaderButton icon={<Bell size={13} />} onClick={clear}>
              Notify Owners
            </HeaderButton>
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "View", onClick: () => setSelId(r.id) },
              { label: "Start", onClick: () => setSelId(r.id) },
              { label: "Pause", onClick: () => setSelId(r.id) },
              { label: "Resume", onClick: () => setSelId(r.id) },
              { label: "Complete", onClick: () => setSelId(r.id) },
              {
                label: "Cancel",
                onClick: () => setSelId(r.id),
                danger: true,
              },
              { label: "View Logs", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Wrench size={20} />}
            title="No workspaces are currently in maintenance."
            hint="Schedule a maintenance window to plan upgrades, migrations, patching, or infrastructure changes."
            cta="Schedule Maintenance"
            onCta={() => navigate("/admin/workspaces?tab=lifecycle")}
          />
        }
      />

      {/* spec § Lifecycle Flow — ASCII node→node flow-chain (no graph library) */}

      {sel && (
        <MaintenanceDetailDrawer rec={sel} onClose={() => setSelId(null)} />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function LifecycleMaintenancePage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Maintenance Workspaces"
        subtitle="Manage workspaces undergoing planned maintenance, monitor operational progress, coordinate maintenance windows, and safely return workspaces to production."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<CalendarClock size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=lifecycle")}
            >
              Schedule Maintenance
            </HeaderButton>
          </>
        }
      />
      <LifecycleMaintenanceView />
    </Page>
  );
}

// ════════════ Maintenance Detail Drawer — 7 sub-sections (spec § Maintenance Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "plan", label: "Maintenance Plan", icon: <ClipboardList size={13} /> },
  {
    id: "execution",
    label: "Change Execution",
    icon: <ListOrdered size={13} />,
  },
  { id: "impact", label: "Operational Impact", icon: <Gauge size={13} /> },
  { id: "validation", label: "Validation", icon: <ClipboardCheck size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function MaintenanceDetailDrawer({
  rec,
  onClose,
}: {
  rec: MaintenanceRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.maintenanceId} · ${rec.workspace}`}
      subtitle={`${rec.maintenanceType} · Stage: ${rec.currentStage} · ${rec.window} · ${rec.status}`}
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
          <HeaderButton icon={<PlayCircle size={13} />}>Resume</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton variant="primary" icon={<CheckCircle size={13} />}>
            Complete
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "plan" && <PlanTab rec={rec} />}
      {tab === "execution" && <ExecutionTab rec={rec} />}
      {tab === "impact" && <ImpactTab rec={rec} />}
      {tab === "validation" && <ValidationTab rec={rec} />}
      {tab === "activity" && <ActivityTab />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

function Section({
  title,
  children,
  sample,
  right,
}: {
  title: string;
  children: React.ReactNode;
  sample?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: T.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {title}
          {sample && <SampleTag />}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ── Overview (General · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: MaintenanceRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Workspace", v: rec.workspace },
              { k: "Maintenance ID", v: rec.maintenanceId },
              { k: "Environment", v: rec.environment },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Maintenance Type", v: rec.maintenanceType },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Status", v: rec.status },
              { k: "Scheduled Window", v: rec.window, sample: true },
              { k: "Started", v: rec.actualStart, sample: true },
              { k: "Completed", v: rec.actualEnd, sample: true },
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
              { k: "Completed Tasks", v: rec.completedTasks, sample: true },
              { k: "Remaining Tasks", v: rec.remainingTasks, sample: true },
              { k: "Automation Jobs", v: rec.automationJobs, sample: true },
              { k: "Affected Users", v: rec.affectedUsers, sample: true },
              {
                k: "Estimated Downtime",
                v: rec.estimatedDowntime,
                sample: true,
              },
              { k: "Overall Progress", v: `${rec.progress}%`, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Maintenance Plan (approved plan · windows · rollback) ──
const PLAN_SUBS = [
  { id: "plan", label: "Approved Maintenance Plan" },
  { id: "window", label: "Maintenance Window" },
  { id: "rollback", label: "Rollback" },
];
function PlanTab({ rec }: { rec: MaintenanceRecord }) {
  const n = hashId(rec.id);
  const [sub, setSub] = React.useState("plan");
  return (
    <>
      <Tabs tabs={PLAN_SUBS} active={sub} onChange={setSub} />
      {sub === "plan" && (
        <Section
          title="Approved maintenance plan"
          sample
          right={
            <div style={{ display: "flex", gap: 6 }}>
              <HeaderButton icon={<FileText size={12} />}>
                Edit Plan
              </HeaderButton>
              <HeaderButton icon={<CheckCheck size={12} />}>
                View Approvals
              </HeaderButton>
              <HeaderButton icon={<Download size={12} />}>Export</HeaderButton>
            </div>
          }
        >
          <StatRow
            label="Business Justification"
            value={`${rec.maintenanceType} to remediate risk and maintain compliance`}
            sample
          />
          <StatRow label="Maintenance Window" value={rec.window} sample />
          <StatRow
            label="Change Plan"
            value={`${8 + (n % 6)} change steps`}
            sample
          />
          <StatRow
            label="Rollback Plan"
            value="Automatic + manual rollback defined"
            sample
          />
          <StatRow
            label="Risk Assessment"
            value={rec.riskLevel}
            tone={
              rec.riskLevel === "Critical" || rec.riskLevel === "High"
                ? "warn"
                : "ok"
            }
            sample
          />
          <StatRow
            label="Approval Chain"
            value="Change Management → Platform → Security"
            sample
          />
          <StatRow
            label="Affected Systems"
            value={`${3 + (n % 8)} systems`}
            sample
          />
          <StatRow
            label="Stakeholders"
            value={[pick(STAKEHOLDERS, n), pick(STAKEHOLDERS, n + 1)].join(
              ", ",
            )}
            sample
          />
          <StatRow
            label="Communication Plan"
            value="Email + status page + in-app notice"
            sample
          />
        </Section>
      )}
      {sub === "window" && (
        <Section title="Maintenance window" sample>
          <KVGrid
            items={[
              { k: "Scheduled Start", v: rec.scheduledStart, sample: true },
              { k: "Scheduled End", v: rec.scheduledEnd, sample: true },
              { k: "Actual Start", v: rec.actualStart, sample: true },
              { k: "Actual End", v: rec.actualEnd, sample: true },
              { k: "Duration", v: rec.duration, sample: true },
              { k: "Timezone", v: rec.timezone, sample: true },
              { k: "Maintenance Owner", v: rec.owner, sample: true },
            ]}
          />
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              paddingTop: 8,
              fontSize: 11.5,
              color: T.textMuted,
            }}
          >
            <span>Supports:</span>
            <span>Recurring Windows</span>
            <span>·</span>
            <span>Blackout Periods</span>
            <span>·</span>
            <span>Business Calendar Integration</span>
          </div>
        </Section>
      )}
      {sub === "rollback" && (
        <Section title="Rollback" sample>
          <div style={{ fontSize: 12.5, color: T.textNav, marginBottom: 8 }}>
            Restores the workspace if maintenance cannot be completed
            successfully.
          </div>
          <StatRow
            label="Automatic Rollback"
            value="Enabled"
            tone="ok"
            sample
          />
          <StatRow label="Manual Rollback" value="Available" sample />
          <StatRow label="Partial Rollback" value="Supported" sample />
          <StatRow label="Full Rollback" value="Supported" sample />
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              paddingTop: 8,
              fontSize: 11.5,
              color: T.textMuted,
            }}
          >
            <span>Rollback restores:</span>
            <span>Configuration</span>
            <span>·</span>
            <span>Infrastructure</span>
            <span>·</span>
            <span>Policies</span>
            <span>·</span>
            <span>AI Configuration</span>
            <span>·</span>
            <span>Integrations</span>
            <span>·</span>
            <span>Automation</span>
          </div>
        </Section>
      )}
    </>
  );
}

// ── Change Execution (spec § Change Execution) — pipeline node→node flow-chain, no graph library ──
function ExecutionTab({ rec }: { rec: MaintenanceRecord }) {
  const currentIdx = PIPELINE.indexOf(rec.currentStage);
  const n = hashId(rec.id);
  return (
    <Section title="Change execution pipeline" sample>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {PIPELINE.map((step, i) => {
          const done = i < currentIdx || rec.status === "Completed";
          const active = i === currentIdx && rec.status !== "Completed";
          const tone = done ? T.success : active ? T.accent : T.textMuted;
          const state = done ? "Completed" : active ? "In Progress" : "Pending";
          return (
            <React.Fragment key={step}>
              <div
                style={{
                  border: `1px solid ${active ? T.accent : T.border}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                      color: T.textPrimary,
                      fontWeight: active ? 600 : 400,
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
                    {step}
                  </span>
                  <span style={{ color: tone, fontSize: 12 }}>{state}</span>
                </div>
                {/* Each step displays: Status · Executor · Started · Completed · Duration */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginTop: 6,
                    fontSize: 11.5,
                    color: T.textMuted,
                  }}
                >
                  <span>Status: {state}</span>
                  <span>·</span>
                  <span>Executor: {pick(OWNERS, n + i)}</span>
                  <span>·</span>
                  <span>Started: {done || active ? rec.actualStart : "—"}</span>
                  <span>·</span>
                  <span>Completed: {done ? rec.actualEnd : "—"}</span>
                  <span>·</span>
                  <span>
                    Duration: {done ? `${10 + ((i * 7) % 40)}m` : "—"}
                  </span>
                </div>
              </div>
              {i < PIPELINE.length - 1 && (
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
          );
        })}
      </div>
    </Section>
  );
}

// ── Operational Impact (spec § Operational Impact) ──
const IMPACT_DIMENSIONS = [
  "User Access",
  "API Availability",
  "Automation",
  "AI Runtime",
  "Cloud Resources",
  "Integrations",
  "Monitoring",
  "Scheduled Jobs",
];
const OPERATIONAL_MODES = ["Read/Write", "Read Only", "Restricted", "Offline"];
const MODE_TONE: Record<string, "ok" | "warn" | "danger" | "muted"> = {
  "Read/Write": "ok",
  "Read Only": "warn",
  Restricted: "warn",
  Offline: "danger",
};

const IMPACT_SUBS = [
  { id: "impact", label: "Operational Impact" },
  { id: "behavior", label: "Maintenance Behavior" },
];
function ImpactTab({ rec }: { rec: MaintenanceRecord }) {
  const n = hashId(rec.id);
  const [sub, setSub] = React.useState("impact");
  return (
    <>
      <Tabs tabs={IMPACT_SUBS} active={sub} onChange={setSub} />
      {sub === "impact" && (
        <Section title="Operational impact during maintenance" sample>
          {IMPACT_DIMENSIONS.map((dim, i) => {
            const mode = pick(OPERATIONAL_MODES, n + i);
            return (
              <StatRow
                key={dim}
                label={dim}
                value={mode}
                tone={MODE_TONE[mode]}
                sample
              />
            );
          })}
        </Section>
      )}
      {sub === "behavior" && (
        <Section title="Maintenance behavior">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              "Configuration changes are permitted",
              "Infrastructure updates are permitted",
              "Security and compliance updates can be applied",
              "Audit logging remains active",
              "Monitoring continues",
              "Backup and recovery remain available",
              "Administrators retain full access",
              "Maintenance events are fully audited",
            ].map((b) => (
              <div
                key={b}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5,
                  color: T.textNav,
                }}
              >
                <CheckCircle size={14} color={T.success} />
                {b}
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              margin: "14px 0 6px",
            }}
          >
            Optional (configurable)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              "Users switched to Read-Only mode",
              "API access restricted",
              "Automation paused",
              "AI execution paused",
              "Scheduled jobs deferred",
              "Integrations temporarily disabled",
            ].map((b) => (
              <div
                key={b}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5,
                  color: T.textMuted,
                }}
              >
                <Server size={13} color={T.textMuted} />
                {b}
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

// ── Validation (spec § Validation) — confirms readiness before returning to Active ──
function ValidationTab({ rec }: { rec: MaintenanceRecord }) {
  const n = hashId(rec.id);
  const checks = [
    "Infrastructure Validation",
    "Security Validation",
    "Compliance Validation",
    "Configuration Drift",
    "Cloud Connectivity",
    "Identity Validation",
    "Integration Validation",
    "AI Runtime Validation",
    "Monitoring Validation",
    "Performance Validation",
  ].map((label, i) => {
    const state =
      (n + i) % 6 === 0 ? "Failed" : (n + i) % 3 === 0 ? "Warnings" : "Passed";
    return { label, state };
  });
  const passed = checks.filter((c) => c.state === "Passed").length;
  const warnings = checks.filter((c) => c.state === "Warnings").length;
  const failed = checks.filter((c) => c.state === "Failed").length;
  return (
    <>
      <Section
        title="Readiness validation"
        sample
        right={
          <div style={{ display: "flex", gap: 6 }}>
            <HeaderButton icon={<ClipboardCheck size={12} />}>
              Run Validation
            </HeaderButton>
            <HeaderButton icon={<FileText size={12} />}>
              Generate Validation Report
            </HeaderButton>
          </div>
        }
      >
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <PostureCard title="Passed" value={passed} tone="ok" />
          <PostureCard title="Warnings" value={warnings} tone="warn" />
          <PostureCard title="Failed" value={failed} tone="danger" />
        </div>
        {checks.map((c) => (
          <StatRow
            key={c.label}
            label={c.label}
            value={c.state}
            tone={
              c.state === "Passed"
                ? "ok"
                : c.state === "Warnings"
                  ? "warn"
                  : "danger"
            }
            sample
          />
        ))}
      </Section>
      {failed > 0 && (
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
          <AlertTriangle size={15} /> Failed validations block the workspace
          from returning to Active until resolved or overridden.
        </div>
      )}
    </>
  );
}

// ── Activity timeline (spec § Activity) ──
function ActivityTab() {
  const events = [
    "Maintenance Scheduled",
    "Maintenance Started",
    "Pre-Checks Completed",
    "Infrastructure Updated",
    "Validation Completed",
    "Maintenance Finished",
    "Workspace Restored",
  ];
  return (
    <Section title="Activity timeline" sample>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 10,
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
            { value: "24h", label: "Last 24 hours" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
          ]}
        />
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
              {pick(OWNERS, i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </Section>
  );
}

// ── Audit History (spec § Audit History) — immutable, read-only ──
function AuditTab() {
  const events = [
    "Maintenance Scheduled",
    "Maintenance Approved",
    "Maintenance Started",
    "Configuration Changed",
    "Maintenance Extended",
    "Rollback Executed",
    "Maintenance Completed",
    "Workspace Restored",
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
          value={`${pick(OWNERS, i)} · 2026-08-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

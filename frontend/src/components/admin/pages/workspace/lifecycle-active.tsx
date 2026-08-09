/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Lifecycle → Active */
import React from "react";
import { useNavigate } from "react-router";
import {
  LayoutGrid,
  Play,
  Pencil,
  PauseCircle,
  Wrench,
  Copy,
  Archive,
  Trash2,
  RefreshCcw,
  ShieldCheck,
  ClipboardCheck,
  Activity as ActivityIcon,
  HeartPulse,
  FileText,
  Download,
  Boxes,
  GitBranch,
  Cpu,
  History,
  CheckCheck,
  Camera,
  DatabaseBackup,
  AlertTriangle,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  Page,
  Tabs,
  PageHeader,
  StatRow,
  KVGrid,
  DirectoryTable,
  FilterBar,
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
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Lifecycle → Active — the steady-state operational view of fully provisioned workspaces.
 * Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/04_Lifecycle/active.md.
 *
 * The Active state represents fully provisioned workspaces that have completed provisioning,
 * validation, governance checks, compliance configuration, security hardening, and operational
 * readiness — the primary operational phase where administrators manage a workspace throughout its
 * lifecycle. Reuses the Enterprise-Administration UX pattern shared with the Users / Workspace
 * Requests modules (Banner · Toolbar · Filters · Search · Datatable · Bulk/Row actions · Workspace
 * Detail Drawer with 11 sub-tabs · Operational Dashboard · Lifecycle flow).
 *
 * There is no live workspace backend yet, so the workspace set is representative sample data (tagged
 * `Sample` in the UI). When admin/org_model.py + the lifecycle engine land, swap SAMPLE_WORKSPACES for
 * the live query — the component API stays identical.
 */

// ── Navigation subtree — drives the "View" sub-navigation (spec §Navigation) ───────────────────────
const VIEW_TABS = [
  { id: "all", label: "Active" },
  { id: "production", label: "Production" },
  { id: "development", label: "Development" },
  { id: "testing", label: "Testing" },
  { id: "sandbox", label: "Sandbox" },
  { id: "shared", label: "Shared Services" },
  { id: "critical", label: "Business Critical" },
  { id: "ha", label: "High Availability" },
  { id: "recent", label: "Recently Activated" },
];

const ENVIRONMENTS = ["Production", "Development", "Testing", "Sandbox"];
const WS_TYPES = ["Enterprise", "Department", "Project", "Shared Service"];
const BUSINESS_UNITS = [
  "Finance",
  "Payments",
  "Platform",
  "Security",
  "Data",
  "Retail",
];
const OWNERS = [
  "Platform Team",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
  "David Chen",
  "Aisha Khan",
];
const CLOUDS = ["AWS", "Azure", "GCP"];
const REGIONS = ["us-east-1", "eu-west-1", "ap-south-1", "us-west-2"];
const HEALTH_STATES = ["Healthy", "Warning", "Degraded", "Critical"];
const COMPLIANCE_STATES = ["Compliant", "Partial", "Non-Compliant"];
const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];
const COMPLIANCE_PROGRAMS = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
];

type Health = (typeof HEALTH_STATES)[number];

const HEALTH_TONE: Record<string, string> = {
  Healthy: T.success,
  Warning: T.warning,
  Degraded: T.warning,
  Critical: T.danger,
};
const COMPLIANCE_TONE: Record<string, string> = {
  Compliant: T.success,
  Partial: T.warning,
  "Non-Compliant": T.danger,
};
interface WorkspaceRecord {
  id: string;
  workspace: string;
  environment: string;
  businessUnit: string;
  owner: string;
  workspaceType: string;
  health: Health;
  compliance: string;
  complianceCoverage: number;
  cloud: string;
  region: string;
  status: string;
  riskLevel: string;
  riskScore: number;
  securityScore: number;
  cloudAccount: string;
  tags: string[];
  businessCritical: boolean;
  highAvailability: boolean;
  recentlyActivated: boolean;
  created: string;
  activated: string;
  // Statistics
  users: number;
  agents: number;
  cloudResources: number;
  integrations: number;
  aiModels: number;
  compliancePrograms: number;
  monthlyCost: number;
  resourceUtilization: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative workspace set.
const SAMPLE_WORKSPACES: WorkspaceRecord[] = Array.from(
  { length: 14 },
  (_, i) => {
    const id = `WS-${(1042 + i * 13).toString().padStart(6, "0")}`;
    const n = hashId(id);
    const environment = pick(ENVIRONMENTS, n);
    const businessUnit = pick(BUSINESS_UNITS, n >> 1);
    const workspaceType =
      n % 5 === 0 ? "Shared Service" : pick(WS_TYPES, n >> 2);
    const health = pick<Health>(
      ["Healthy", "Healthy", "Healthy", "Warning", "Degraded", "Critical"],
      n,
    );
    const compliance = pick(COMPLIANCE_STATES, n >> 3);
    const riskLevel = pick(RISK_LEVELS, n >> 2);
    return {
      id,
      workspace: `${businessUnit} ${environment}`,
      environment,
      businessUnit,
      owner: pick(OWNERS, n),
      workspaceType,
      health,
      compliance,
      complianceCoverage: 72 + (n % 28),
      cloud: pick(CLOUDS, n),
      region: pick(REGIONS, n >> 1),
      status: "Active",
      riskLevel,
      riskScore: 8 + (n % 80),
      securityScore: 68 + (n % 32),
      cloudAccount: `acct-${(100000 + (n % 900000)).toString()}`,
      tags: [
        `env:${environment.toLowerCase()}`,
        `bu:${businessUnit.toLowerCase()}`,
        "tier:gold",
      ],
      businessCritical: n % 3 === 0,
      highAvailability: n % 4 === 0,
      recentlyActivated: i >= 11,
      created: `2025-${(1 + (n % 11)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      activated: `2026-0${1 + (n % 8)}-${(1 + ((n + 3) % 27)).toString().padStart(2, "0")}`,
      users: 12 + (n % 340),
      agents: 2 + (n % 40),
      cloudResources: 24 + (n % 480),
      integrations: 3 + (n % 22),
      aiModels: 1 + (n % 9),
      compliancePrograms: 1 + (n % 5),
      monthlyCost: 2400 + (n % 60) * 180,
      resourceUtilization: 41 + (n % 55),
    };
  },
);

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: T.success,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: T.success,
        }}
      />
      {status}
    </span>
  );
}

function HealthBadge({ health }: { health: string }) {
  const c = HEALTH_TONE[health] ?? T.textMuted;
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: c }}
      />
      {health}
    </span>
  );
}

// Matches a record against the "View" sub-navigation.
function matchView(r: WorkspaceRecord, view: string): boolean {
  switch (view) {
    case "production":
      return r.environment === "Production";
    case "development":
      return r.environment === "Development";
    case "testing":
      return r.environment === "Testing";
    case "sandbox":
      return r.environment === "Sandbox";
    case "shared":
      return r.workspaceType === "Shared Service";
    case "critical":
      return r.businessCritical;
    case "ha":
      return r.highAvailability;
    case "recent":
      return r.recentlyActivated;
    default:
      return true;
  }
}

/**
 * Embeddable body — sub-navigation + operational dashboard + directory + workspace detail drawer +
 * lifecycle flow, WITHOUT the outer <Page> or the page banner. Rendered both as the standalone route
 * and as a tab of the Workspace Management console. Uses local state for the View sub-nav so it never
 * collides with a host page's `?tab=`.
 */
export function LifecycleActiveView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("all");

  const [search, setSearch] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [fRisk, setFRisk] = React.useState("");
  const [fHealth, setFHealth] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fCloud, setFCloud] = React.useState("");
  const [fRegion, setFRegion] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_WORKSPACES;

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      matchView(r, view) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.environment.toLowerCase().includes(q) ||
        r.cloudAccount.toLowerCase().includes(q) ||
        r.tags.join(" ").toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)) &&
      (!fEnv || r.environment === fEnv) &&
      (!fType || r.workspaceType === fType) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fOwner || r.owner === fOwner) &&
      (!fCompliance || r.compliance === fCompliance) &&
      (!fRisk || r.riskLevel === fRisk) &&
      (!fHealth || r.health === fHealth) &&
      (!fStatus || r.status === fStatus) &&
      (!fCloud || r.cloud === fCloud) &&
      (!fRegion || r.region === fRegion)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFEnv("");
    setFType("");
    setFBu("");
    setFOwner("");
    setFCompliance("");
    setFRisk("");
    setFHealth("");
    setFStatus("");
    setFCloud("");
    setFRegion("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Operational Dashboard (spec §Operational Dashboard) — computed over the active set.
  const totalActive = records.length;
  const healthy = records.filter((r) => r.health === "Healthy").length;
  const avgCompliance = Math.round(
    records.reduce((a, r) => a + r.complianceCoverage, 0) / totalActive,
  );
  const avgSecurity = Math.round(
    records.reduce((a, r) => a + r.securityScore, 0) / totalActive,
  );
  const avgUtil = Math.round(
    records.reduce((a, r) => a + r.resourceUtilization, 0) / totalActive,
  );
  const totalCost = records.reduce((a, r) => a + r.monthlyCost, 0);
  const alerts = records.filter(
    (r) => r.health === "Degraded" || r.health === "Critical",
  ).length;
  const cloudDist = CLOUDS.map(
    (c) => `${c} ${records.filter((r) => r.cloud === c).length}`,
  ).join(" · ");

  const toolbar: CommandItem[] = [
    // Workspace Actions
    {
      key: "open",
      label: "Open Workspace",
      icon: <Play size={15} />,
      onClick: () => navigate("/admin/workspaces"),
    },
    {
      key: "edit",
      label: "Edit Configuration",
      icon: <Pencil size={15} />,
      disabled: true,
    },
    {
      key: "suspend",
      label: "Suspend",
      icon: <PauseCircle size={15} />,
      disabled: true,
    },
    {
      key: "maint",
      label: "Maintenance Mode",
      icon: <Wrench size={15} />,
      disabled: true,
    },
    { key: "clone", label: "Clone", icon: <Copy size={15} />, disabled: true },
    {
      key: "archive",
      label: "Archive",
      icon: <Archive size={15} />,
      disabled: true,
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Trash2 size={15} />,
      disabled: true,
    },
    { key: "refresh", label: "Refresh", icon: <RefreshCcw size={15} /> },
    // Governance Actions
    {
      key: "assign",
      label: "Assign Policies",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "review",
      label: "Review Compliance",
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
      key: "validate",
      label: "Validate Configuration",
      icon: <CheckCheck size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
    // Operations
    {
      key: "monitoring",
      label: "Open Monitoring",
      icon: <ActivityIcon size={15} />,
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
      label: "Run Automation",
      icon: <Play size={15} />,
      disabled: true,
    },
    {
      key: "snapshot",
      label: "Create Snapshot",
      icon: <Camera size={15} />,
      disabled: true,
    },
    {
      key: "backup",
      label: "Backup",
      icon: <DatabaseBackup size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<WorkspaceRecord>[] = [
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
      key: "environment",
      header: "Environment",
      sortValue: (r) => r.environment,
      render: (r) => r.environment,
    },
    {
      key: "bu",
      header: "Business Unit",
      sortValue: (r) => r.businessUnit,
      render: (r) => r.businessUnit,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "health",
      header: "Health",
      sortValue: (r) => HEALTH_STATES.indexOf(r.health),
      render: (r) => <HealthBadge health={r.health} />,
    },
    {
      key: "compliance",
      header: "Compliance",
      sortValue: (r) => r.compliance,
      render: (r) => (
        <span style={{ color: COMPLIANCE_TONE[r.compliance] }}>
          {r.compliance}
        </span>
      ),
    },
    {
      key: "cloud",
      header: "Cloud",
      sortValue: (r) => r.cloud,
      render: (r) => r.cloud,
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
          value={view}
          onChange={setView}
          options={VIEW_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {/* Operational Dashboard (spec §Operational Dashboard) */}
      <div style={{ marginBottom: 18 }}>
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
          Operational Dashboard <SampleTag />
        </div>
        <StatStripPlain
          items={[
            { label: "Total Active Workspaces", value: totalActive },
            {
              label: "Healthy Workspaces",
              value: `${healthy} / ${totalActive}`,
              tone: healthy === totalActive ? "ok" : "warn",
            },
            {
              label: "Compliance Coverage",
              value: `${avgCompliance}%`,
              tone: avgCompliance >= 90 ? "ok" : "warn",
            },
            {
              label: "Security Score",
              value: avgSecurity,
              tone: avgSecurity >= 80 ? "ok" : "warn",
            },
            { label: "Resource Utilization", value: `${avgUtil}%` },
            { label: "Cloud Distribution", value: cloudDist },
            { label: "Monthly Cost", value: `$${totalCost.toLocaleString()}` },
            {
              label: "Operational Alerts",
              value: alerts,
              tone: alerts === 0 ? "ok" : "danger",
            },
          ]}
        />
      </div>

      <DiscoveryListView
        title="Active workspaces"
        desc="Fully provisioned workspaces that are operational and available for enterprise use — continuously governed, secured, compliant, and monitored. Manage operational workspaces, monitor health, govern lifecycle, and administer enterprise configurations."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search active workspaces — workspace, business unit, owner, environment, cloud account, tags, workspace ID…"
        count={rows.length}
        pills={[
          {
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "workspaceType",
            label: "Workspace Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.workspaceType)),
          },
          {
            key: "businessUnit",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "owner",
            label: "Owner",
            value: fOwner,
            onChange: setFOwner,
            options: facet(records.map((r) => r.owner)),
          },
          {
            key: "compliance",
            label: "Compliance",
            value: fCompliance,
            onChange: setFCompliance,
            options: facet(records.map((r) => r.compliance)),
          },
          {
            key: "riskLevel",
            label: "Risk Level",
            value: fRisk,
            onChange: setFRisk,
            options: facet(records.map((r) => r.riskLevel)),
          },
          {
            key: "health",
            label: "Health",
            value: fHealth,
            onChange: setFHealth,
            options: facet(records.map((r) => r.health)),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
          {
            key: "cloud",
            label: "Cloud Provider",
            value: fCloud,
            onChange: setFCloud,
            options: facet(records.map((r) => r.cloud)),
          },
          {
            key: "region",
            label: "Region",
            value: fRegion,
            onChange: setFRegion,
            options: facet(records.map((r) => r.region)),
          },
        ]}
        presets={[{ label: "All active workspaces", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={15}
        initialSort={{ key: "workspace", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<ShieldCheck size={13} />} onClick={clear}>
              Assign Policies ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<HeartPulse size={13} />} onClick={clear}>
              Run Health Check
            </HeaderButton>
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
              {
                label: "Open Workspace",
                onClick: () => navigate("/admin/workspaces"),
              },
              { label: "View", onClick: () => setSelId(r.id) },
              { label: "Edit", onClick: () => setSelId(r.id) },
              { label: "Run Health Check", onClick: () => setSelId(r.id) },
              { label: "Maintenance Mode", onClick: () => setSelId(r.id) },
              { label: "Clone", onClick: () => setSelId(r.id) },
              {
                label: "Archive",
                onClick: () => setSelId(r.id),
                danger: true,
              },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<LayoutGrid size={20} />}
            title="No active workspaces found."
            hint="Adjust filters, review the provisioning queue, or create a workspace to get started."
            cta="Create Workspace"
            onCta={() => navigate("/admin/workspaces?tab=requests")}
          />
        }
      />

      {/* Lifecycle Flow (spec §Lifecycle Flow) — ASCII node→node flow-chain, Active highlighted. */}

      {sel && (
        <WorkspaceDetailDrawer rec={sel} onClose={() => setSelId(null)} />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function LifecycleActivePage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Active Workspaces"
        subtitle="Manage operational workspaces, monitor health, govern lifecycle, and administer enterprise configurations."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=requests")}
            >
              Create Workspace
            </HeaderButton>
          </>
        }
      />
      <LifecycleActiveView />
    </Page>
  );
}

// ════════════ Workspace Detail Drawer — 11 sub-tabs (spec §Workspace Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "config", label: "Configuration", icon: <FileText size={13} /> },
  { id: "resources", label: "Resources", icon: <Boxes size={13} /> },
  { id: "governance", label: "Governance", icon: <GitBranch size={13} /> },
  { id: "security", label: "Security", icon: <ShieldCheck size={13} /> },
  { id: "compliance", label: "Compliance", icon: <ClipboardCheck size={13} /> },
  { id: "ai", label: "AI", icon: <Sparkles size={13} /> },
  { id: "operations", label: "Operations", icon: <Cpu size={13} /> },
  { id: "health", label: "Health", icon: <HeartPulse size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function WorkspaceDetailDrawer({
  rec,
  onClose,
}: {
  rec: WorkspaceRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.workspace} · ${rec.id}`}
      subtitle={`${rec.environment} · ${rec.businessUnit} · Owner: ${rec.owner} · Health: ${rec.health} · ${rec.status}`}
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
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton icon={<HeartPulse size={13} />}>
            Run Health Check
          </HeaderButton>
          <HeaderButton icon={<Pencil size={13} />}>Edit</HeaderButton>
          <HeaderButton variant="primary" icon={<Play size={13} />}>
            Open Workspace
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "config" && <ConfigurationTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "governance" && <GovernanceTab rec={rec} />}
      {tab === "security" && <SecurityTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "ai" && <AITab rec={rec} />}
      {tab === "operations" && <OperationsTab rec={rec} />}
      {tab === "health" && <HealthTab rec={rec} />}
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

function DrawerToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}
    >
      {children}
    </div>
  );
}

// ── Overview (General · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: WorkspaceRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Workspace Name", v: rec.workspace },
              { k: "Workspace ID", v: rec.id },
              { k: "Environment", v: rec.environment },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Workspace Type", v: rec.workspaceType },
              { k: "Owner", v: rec.owner },
              { k: "Status", v: rec.status },
              { k: "Created", v: rec.created },
              { k: "Activated", v: rec.activated },
            ]}
          />
        </Section>
      )}

      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={4}
            items={[
              { k: "Users", v: rec.users, sample: true },
              { k: "Agents", v: rec.agents, sample: true },
              { k: "Cloud Resources", v: rec.cloudResources, sample: true },
              { k: "Integrations", v: rec.integrations, sample: true },
              { k: "AI Models", v: rec.aiModels, sample: true },
              {
                k: "Compliance Programs",
                v: rec.compliancePrograms,
                sample: true,
              },
              {
                k: "Monthly Cost",
                v: `$${rec.monthlyCost.toLocaleString()}`,
                sample: true,
              },
              { k: "Risk Score", v: rec.riskScore, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Configuration (current operational configuration) ──
function ConfigurationTab({ rec }: { rec: WorkspaceRecord }) {
  return (
    <>
      <DrawerToolbar>
        <HeaderButton icon={<Pencil size={13} />}>
          Edit Configuration
        </HeaderButton>
        <HeaderButton icon={<GitBranch size={13} />}>
          Compare Baseline
        </HeaderButton>
        <HeaderButton icon={<AlertTriangle size={13} />}>
          View Drift
        </HeaderButton>
      </DrawerToolbar>
      <Section title="Current operational configuration" sample>
        <StatRow
          label="Workspace Settings"
          value={`${rec.workspaceType} · ${rec.environment}`}
          sample
        />
        <StatRow
          label="Templates"
          value={`${rec.workspaceType} baseline v3`}
          sample
        />
        <StatRow
          label="Identity"
          value="SSO (SAML) · SCIM provisioning"
          sample
        />
        <StatRow
          label="Security"
          value={`Baseline · Score ${rec.securityScore}`}
          sample
        />
        <StatRow label="Compliance" value={rec.compliance} sample />
        <StatRow label="Automation" value="12 enabled workflows" sample />
        <StatRow
          label="Notifications"
          value="Email · Slack · PagerDuty"
          sample
        />
        <StatRow label="Tags" value={rec.tags.join(", ")} sample />
        <StatRow
          label="Metadata"
          value={`Cloud account ${rec.cloudAccount} · ${rec.region}`}
          sample
        />
      </Section>
    </>
  );
}

// ── Resources (managed enterprise resources) ──
function ResourcesTab({ rec }: { rec: WorkspaceRecord }) {
  const n = hashId(rec.id);
  const categories = [
    "AWS Accounts",
    "Azure Subscriptions",
    "GCP Projects",
    "Kubernetes Clusters",
    "Networking",
    "Storage",
    "Databases",
    "Secrets",
    "Integrations",
    "Knowledge Bases",
    "AI Providers",
    "Monitoring",
  ];
  const PROVIDERS = ["AWS", "Azure", "GCP", "Shared"];
  const STATES = ["Active", "Degraded", "Provisioning"];
  const resources = categories.map((cat, i) => ({
    id: `${rec.id}-res-${i}`,
    resource: `${cat.replace(/s$/, "")} ${(1 + ((n + i) % 9)).toString()}`,
    type: cat,
    provider: pick(PROVIDERS, n + i),
    status: pick(STATES, n + i * 2),
  }));
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
              r.status === "Active"
                ? T.success
                : r.status === "Degraded"
                  ? T.warning
                  : T.accent,
          }}
        >
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
        Managed enterprise resources across all categories <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={resources} />
    </>
  );
}

// ── Governance (applied governance) ──
const GOVERNANCE_SUBS = [
  { id: "policies", label: "Policies" },
  { id: "inheritance", label: "Inheritance" },
  { id: "overrides", label: "Overrides" },
  { id: "ownership", label: "Ownership" },
  { id: "approval-chains", label: "Approval Chains" },
  { id: "delegated-administration", label: "Delegated Administration" },
  { id: "business-ownership", label: "Business Ownership" },
];
function GovernanceTab({ rec }: { rec: WorkspaceRecord }) {
  const [sub, setSub] = React.useState("policies");
  return (
    <>
      <Tabs tabs={GOVERNANCE_SUBS} active={sub} onChange={setSub} />
      {sub === "policies" && (
        <Section title="Policies" sample>
          <StatRow
            label="Applied Policies"
            value="18 policies"
            tone="ok"
            sample
          />
          <StatRow label="Governance Profile" value="Balanced" sample />
        </Section>
      )}
      {sub === "inheritance" && (
        <Section title="Inheritance" sample>
          <StatRow
            label="Inherited From"
            value={`Enterprise → ${rec.businessUnit} BU`}
            sample
          />
        </Section>
      )}
      {sub === "overrides" && (
        <Section title="Overrides" sample>
          <StatRow
            label="Workspace Overrides"
            value="2 active"
            tone="warn"
            sample
          />
        </Section>
      )}
      {sub === "ownership" && (
        <Section title="Ownership" sample>
          <StatRow label="Workspace Owner" value={rec.owner} sample />
        </Section>
      )}
      {sub === "approval-chains" && (
        <Section title="Approval Chains" sample>
          <StatRow
            label="Change Approval"
            value="Business → Security → Operations"
            sample
          />
        </Section>
      )}
      {sub === "delegated-administration" && (
        <Section title="Delegated Administration" sample>
          <StatRow
            label="Delegated Administrators"
            value="Aisha Khan, Tomás Silva"
            sample
          />
        </Section>
      )}
      {sub === "business-ownership" && (
        <Section title="Business Ownership" sample>
          <StatRow
            label="Business Owner"
            value={`${rec.businessUnit} Lead`}
            sample
          />
        </Section>
      )}
    </>
  );
}

// ── Security ──
function SecurityTab({ rec }: { rec: WorkspaceRecord }) {
  return (
    <>
      <DrawerToolbar>
        <HeaderButton icon={<ShieldCheck size={13} />}>
          Run Security Assessment
        </HeaderButton>
      </DrawerToolbar>
      <Section title="Security posture" sample>
        <StatRow
          label="Security Baseline"
          value="CIS Level 1 · CloudGuard baseline"
          sample
        />
        <StatRow label="Identity" value="SSO · MFA enforced" tone="ok" sample />
        <StatRow
          label="Access Policies"
          value="Least-privilege · 24 role bindings"
          sample
        />
        <StatRow
          label="Encryption"
          value="At-rest (CMEK) · In-transit (TLS 1.3)"
          tone="ok"
          sample
        />
        <StatRow
          label="Network Policies"
          value="Private egress · deny-by-default"
          sample
        />
        <StatRow label="Guardrails" value="9 active guardrails" sample />
        <StatRow
          label="Security Score"
          value={rec.securityScore}
          tone={rec.securityScore >= 80 ? "ok" : "warn"}
          sample
        />
      </Section>
    </>
  );
}

// ── Compliance ──
function ComplianceTab({ rec }: { rec: WorkspaceRecord }) {
  return (
    <>
      <DrawerToolbar>
        <HeaderButton icon={<ClipboardCheck size={13} />}>
          Run Compliance Assessment
        </HeaderButton>
        <HeaderButton icon={<FileText size={13} />}>
          Generate Evidence
        </HeaderButton>
      </DrawerToolbar>
      <Section title="Compliance posture" sample>
        <StatRow
          label="Compliance Programs"
          value={COMPLIANCE_PROGRAMS.slice(0, rec.compliancePrograms).join(
            ", ",
          )}
          sample
        />
        <StatRow label="Frameworks" value="ISO 27001, SOC 2, NIST CSF" sample />
        <StatRow label="Evidence" value="142 evidence items collected" sample />
        <StatRow
          label="Findings"
          value={rec.compliance === "Compliant" ? "0 open" : "6 open"}
          tone={rec.compliance === "Compliant" ? "ok" : "warn"}
          sample
        />
        <StatRow
          label="Control Coverage"
          value={`${rec.complianceCoverage}%`}
          tone={rec.complianceCoverage >= 90 ? "ok" : "warn"}
          sample
        />
        <StatRow
          label="Risk"
          value={rec.riskLevel}
          tone={
            rec.riskLevel === "Low"
              ? "ok"
              : rec.riskLevel === "Critical"
                ? "danger"
                : "warn"
          }
          sample
        />
      </Section>
    </>
  );
}

// ── AI ──
function AITab({ rec }: { rec: WorkspaceRecord }) {
  return (
    <Section title="AI runtime & governance" sample>
      <StatRow
        label="AI Providers"
        value="Anthropic, Bedrock, Vertex AI"
        sample
      />
      <StatRow
        label="LLM Models"
        value={`${rec.aiModels} models registered`}
        sample
      />
      <StatRow
        label="Knowledge Sources"
        value="7 connected knowledge bases"
        sample
      />
      <StatRow label="Prompt Libraries" value="3 curated libraries" sample />
      <StatRow
        label="AI Policies"
        value="Data-residency · PII redaction"
        tone="ok"
        sample
      />
      <StatRow
        label="AI Governance"
        value="Human-in-the-loop for high-risk actions"
        sample
      />
      <StatRow label="Usage" value="1.2M tokens (30d)" sample />
    </Section>
  );
}

// ── Operations ──
function OperationsTab({ rec }: { rec: WorkspaceRecord }) {
  return (
    <>
      <DrawerToolbar>
        <HeaderButton icon={<DatabaseBackup size={13} />}>Backup</HeaderButton>
        <HeaderButton icon={<Camera size={13} />}>Snapshot</HeaderButton>
        <HeaderButton icon={<Wrench size={13} />}>
          Maintenance Mode
        </HeaderButton>
      </DrawerToolbar>
      <Section title="Operations" sample>
        <StatRow
          label="Provisioning History"
          value={`Activated ${rec.activated} · 3 change events`}
          sample
        />
        <StatRow label="Automation" value="12 workflows · 4 scheduled" sample />
        <StatRow
          label="Maintenance"
          value="No active maintenance window"
          sample
        />
        <StatRow
          label="Incidents"
          value={rec.health === "Healthy" ? "0 open" : "1 open"}
          tone={rec.health === "Healthy" ? "ok" : "warn"}
          sample
        />
        <StatRow label="Backups" value="Daily · last 2h ago" tone="ok" sample />
        <StatRow label="Snapshots" value="6 retained" sample />
        <StatRow
          label="Recovery"
          value="RPO 1h · RTO 4h · DR region eu-west-1"
          sample
        />
      </Section>
    </>
  );
}

// ── Health (operational health widgets) ──
function HealthTab({ rec }: { rec: WorkspaceRecord }) {
  const n = hashId(rec.id);
  const widgets = [
    "Availability",
    "Performance",
    "Capacity",
    "Security",
    "Compliance",
    "Cloud Connectivity",
    "AI Runtime",
    "Integrations",
  ].map((label, i) => ({
    label,
    state: pick(HEALTH_STATES, n + i * 3),
  }));
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
        Operational health — states: Healthy · Warning · Degraded · Critical{" "}
        <SampleTag />
      </div>
      <StatStripPlain
        items={widgets.map((w) => ({
          label: w.label,
          value: w.state,
          tone:
            w.state === "Healthy"
              ? "ok"
              : w.state === "Critical"
                ? "danger"
                : "warn",
        }))}
      />
    </>
  );
}

// ── Activity timeline ──
function ActivityTab() {
  const [fActor, setFActor] = React.useState("");
  const [fAction, setFAction] = React.useState("");
  const events = [
    "Workspace Activated",
    "Policy Updated",
    "Configuration Changed",
    "Automation Executed",
    "Cloud Resource Added",
    "Integration Connected",
  ].map((action, i) => ({
    action,
    actor: pick(OWNERS, i),
    date: `2026-07-${(1 + i * 2).toString().padStart(2, "0")}`,
  }));
  const rows = events.filter(
    (e) =>
      (!fActor || e.actor === fActor) && (!fAction || e.action === fAction),
  );
  return (
    <>
      <FilterBar>
        <Select
          label="Actor"
          value={fActor}
          onChange={setFActor}
          options={[
            { value: "", label: "All actors" },
            ...Array.from(new Set(events.map((e) => e.actor))).map((v) => ({
              value: v,
              label: v,
            })),
          ]}
        />
        <Select
          label="Action"
          value={fAction}
          onChange={setFAction}
          options={[
            { value: "", label: "All actions" },
            ...events.map((e) => ({ value: e.action, label: e.action })),
          ]}
        />
        <span
          style={{
            fontSize: 11.5,
            color: T.textMuted,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Filter by date <SampleTag />
        </span>
      </FilterBar>
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

// ── Audit History (immutable, read-only) ──
function AuditTab() {
  const events = [
    "Workspace Activated",
    "Configuration Changed",
    "Policy Assigned",
    "Security Updated",
    "Compliance Updated",
    "Automation Executed",
    "Workspace Archived",
    "Workspace Suspended",
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
        <ShieldCheck size={14} /> Immutable · read-only log <SampleTag />
      </div>
      {events.map((e, i) => (
        <StatRow
          key={e}
          label={e}
          value={`${pick(OWNERS, i)} · 2026-07-${(1 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

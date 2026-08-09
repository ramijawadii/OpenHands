/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Workspace Templates → Operational Templates */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Download,
  Upload,
  Copy,
  Archive,
  RefreshCcw,
  FileText,
  Star,
  Send,
  Ban,
  ClipboardCheck,
  GitCompare,
  Eye,
  LayoutGrid,
  CircleDot,
  FileEdit,
  CheckCheck,
  AlertTriangle,
  GitBranch,
  Boxes,
  Bot,
  History,
  ShieldCheck,
  Activity as ActivityIcon,
  Gauge,
  CalendarClock,
  Repeat,
  DatabaseBackup,
  Bell,
  Workflow,
  RotateCcw,
} from "lucide-react";
import {
  Page,
  Tabs,
  PageHeader,
  Card,
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
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Operational Templates — reusable operational blueprints that define how a workspace *operates after
 * it is provisioned* (automation, monitoring, alerting, scheduling, capacity, backup, lifecycle, AI
 * operations, incident management, maintenance). Distinct from Enterprise (blueprint), Environment
 * (env-specific config) and Compliance (regulatory) templates.
 *
 * Authoritative spec: docs/workspace/workspace_module/…/Workspace Administration/01_Workspace
 * Templates/operational_templates.md. Reuses the Enterprise-Administration UX pattern shared with the
 * Users / Active-Workspaces modules: Banner · Toolbar · Filters · Search · Data Table · Bulk/Row
 * actions · Operational-Template Detail Drawer (12 sub-tabs) · Operational Dashboard.
 *
 * There is no template backend yet, so the template set is deterministic representative sample data —
 * every enriched value is tagged `Sample` in the UI so nothing reads as a live signal when it is not.
 * When admin/org_model.py ships the live template registry, swap SAMPLE_TEMPLATES for the live query;
 * the component API stays identical.
 */

// ── Status model (drives the sub-navigation + Status column) ───────────────────────────────────────
type Status = "Active" | "Draft" | "Published" | "Deprecated" | "Archived";

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Published: T.success,
  Draft: T.warning,
  Deprecated: T.warning,
  Archived: T.textMuted,
};

// spec §Navigation tree — Active Templates · Draft Templates · Published · Deprecated · Archived · Versions
const NAV_TABS = [
  { id: "all", label: "All", Icon: LayoutGrid },
  { id: "active", label: "Active Templates", Icon: CircleDot },
  { id: "draft", label: "Draft Templates", Icon: FileEdit },
  { id: "published", label: "Published", Icon: CheckCheck },
  { id: "deprecated", label: "Deprecated", Icon: AlertTriangle },
  { id: "archived", label: "Archived", Icon: Archive },
  { id: "versions", label: "Versions", Icon: GitBranch },
];

// map sub-nav id → status filter (all / versions handled separately)
const TAB_STATUS: Record<string, Status | null> = {
  all: null,
  active: "Active",
  draft: "Draft",
  published: "Published",
  deprecated: "Deprecated",
  archived: "Archived",
  versions: null,
};

const CATEGORIES = [
  "Production",
  "Non-Production",
  "Shared Services",
  "Development",
  "Data Platform",
];
const TIERS = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const AUTOMATION_PROFILES = [
  "Full Automation",
  "Guarded Automation",
  "Manual-Approval",
];
const MONITORING_PROFILES = ["Standard", "Enhanced", "Intensive"];
const LIFECYCLE_PROFILES = ["Long-Lived", "Project", "Ephemeral"];
const MAINTENANCE_PROFILES = ["Weekly Window", "Monthly Window", "On-Demand"];
const AI_OPS_PROFILES = ["Governed Runtime", "Restricted Runtime", "Sandbox"];
const AUTHORS = [
  "Alice Smith",
  "David Chen",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
];
const RUNTIMES = [
  "cloudguard-runtime:latest",
  "cloudguard-runtime:0.59",
  "cloudguard-runtime:stable",
];
const FREQUENCIES = ["30 seconds", "1 minute", "5 minutes", "15 minutes"];
const RETENTIONS = ["30 days", "90 days", "180 days", "1 year"];

interface TemplateRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  businessUnit: string;
  version: string;
  isDefault: boolean;
  status: Status;
  automationProfile: string;
  monitoringProfile: string;
  lifecycleProfile: string;
  maintenanceProfile: string;
  aiOpsProfile: string;
  tags: string[];
  created: string;
  modified: string;
  updatedLabel: string;
  author: string;
  // statistics (spec §Overview → Statistics)
  assignedWorkspaces: number;
  automationRules: number;
  scheduledJobs: number;
  monitoringPolicies: number;
  alertRules: number;
  maintenancePolicies: number;
  // monitoring displays
  collectionFrequency: string;
  retention: string;
  alertThresholds: string;
  // capacity displays
  maxResources: number;
  warningThreshold: string;
  criticalThreshold: string;
  // AI ops displays
  approvedRuntime: string;
  aiMonitoringFrequency: string;
  usageThresholds: string;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

const TEMPLATE_NAMES = [
  "Enterprise Production Operations",
  "Regulated Payments Operations",
  "Platform Shared-Service Operations",
  "Data Platform Operations",
  "Non-Production Standard Operations",
  "Development Sandbox Operations",
  "Security Operations Baseline",
  "Retail Edge Operations",
  "High-Availability Production Operations",
  "Cost-Optimized Operations",
  "AI Runtime Operations",
  "Disaster-Recovery Operations",
  "Batch & Analytics Operations",
  "Ephemeral Preview Operations",
];

// Deterministic representative operational-template set.
const SAMPLE_TEMPLATES: TemplateRecord[] = TEMPLATE_NAMES.map((name, i) => {
  const id = `OPT-${(1042 + i * 13).toString().padStart(5, "0")}`;
  const n = hashId(id);
  const status = pick<Status>(
    [
      "Published",
      "Published",
      "Published",
      "Active",
      "Draft",
      "Deprecated",
      "Archived",
    ],
    n,
  );
  const major = 1 + (n % 4);
  const minor = n % 8;
  return {
    id,
    name,
    description: `Standardizes ${pick(CATEGORIES, n).toLowerCase()} operational behavior — automation, monitoring, scheduling, lifecycle and maintenance — for ${pick(BUSINESS_UNITS, n)} workspaces.`,
    category: pick(CATEGORIES, n),
    tier: pick(TIERS, n >> 1),
    businessUnit: pick(BUSINESS_UNITS, n >> 2),
    version: `v${major}.${minor}`,
    isDefault: n % 4 === 0,
    status,
    automationProfile: pick(AUTOMATION_PROFILES, n),
    monitoringProfile: pick(MONITORING_PROFILES, n >> 1),
    lifecycleProfile: pick(LIFECYCLE_PROFILES, n >> 2),
    maintenanceProfile: pick(MAINTENANCE_PROFILES, n >> 3),
    aiOpsProfile: pick(AI_OPS_PROFILES, n),
    tags: [
      pick(["gold", "silver", "bronze"], n),
      pick(BUSINESS_UNITS, n).toLowerCase(),
      pick(["24x7", "business-hours", "batch"], n >> 1),
    ],
    created: `2025-${(1 + (n % 9)).toString().padStart(2, "0")}-14`,
    modified: `2026-06-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    updatedLabel: pick(
      ["Yesterday", "2 days ago", "Last week", "3 hours ago", "Today"],
      n,
    ),
    author: pick(AUTHORS, n),
    assignedWorkspaces: status === "Draft" ? 0 : 3 + (n % 60),
    automationRules: 6 + (n % 24),
    scheduledJobs: 4 + (n % 18),
    monitoringPolicies: 5 + (n % 14),
    alertRules: 8 + (n % 40),
    maintenancePolicies: 1 + (n % 6),
    collectionFrequency: pick(FREQUENCIES, n),
    retention: pick(RETENTIONS, n >> 1),
    alertThresholds: `${70 + (n % 20)}% warn · ${90 + (n % 8)}% critical`,
    maxResources: 100 + (n % 900),
    warningThreshold: `${70 + (n % 15)}%`,
    criticalThreshold: `${88 + (n % 10)}%`,
    approvedRuntime: pick(RUNTIMES, n),
    aiMonitoringFrequency: pick(FREQUENCIES, n >> 2),
    usageThresholds: `${5 + (n % 20)}k tokens/day · $${50 + (n % 200)}/day`,
  };
});

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

function DefaultCell({ isDefault }: { isDefault: boolean }) {
  return isDefault ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        color: T.accent,
      }}
    >
      <Star size={12} fill="currentColor" /> Yes
    </span>
  ) : (
    <span style={{ color: T.textMuted }}>No</span>
  );
}

/**
 * Embeddable body — Operational Dashboard + sub-navigation + directory + detail drawer, WITHOUT the
 * outer <Page> or the page banner. Rendered both as the standalone route (via
 * OperationalTemplatesPage) and as a tab of the Workspace Management console. Uses local state for the
 * status sub-nav so it never collides with a host page's `?tab=` param.
 */
export function OperationalTemplatesView() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("all");

  // Filters (spec §Filters: Category · Operational Tier · Business Unit · Status · Version · Default)
  const [search, setSearch] = React.useState("");
  const [fCategory, setFCategory] = React.useState("");
  const [fTier, setFTier] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fVersion, setFVersion] = React.useState("");
  const [fDefault, setFDefault] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_TEMPLATES;
  const tabStatus = TAB_STATUS[tab];

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!tabStatus || r.status === tabStatus) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.version.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))) &&
      (!fCategory || r.category === fCategory) &&
      (!fTier || r.tier === fTier) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fStatus || r.status === fStatus) &&
      (!fVersion || r.version === fVersion) &&
      (!fDefault || (fDefault === "Yes" ? r.isDefault : !r.isDefault))
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFCategory("");
    setFTier("");
    setFBu("");
    setFStatus("");
    setFVersion("");
    setFDefault("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Toolbar (spec §Toolbar: Create · Administrative Actions · Validation Actions) ──
  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Operational Template",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=templates"),
    },
    {
      key: "clone",
      label: "Clone",
      icon: <Copy size={15} />,
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
      key: "deprecate",
      label: "Deprecate",
      icon: <Ban size={15} />,
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
      onClick: () => clearFilters(),
    },
    {
      key: "validate",
      label: "Validate Template",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Versions",
      icon: <GitCompare size={15} />,
      disabled: true,
    },
    {
      key: "assign-default",
      label: "Assign Default",
      icon: <Star size={15} />,
      disabled: true,
    },
    {
      key: "preview",
      label: "Preview Configuration",
      icon: <Eye size={15} />,
      disabled: true,
    },
  ];

  // ── Table columns (spec §Table: Template · Category · Operational Tier · Version · Default · Status · Updated) ──
  const cols: Column<TemplateRecord>[] = [
    {
      key: "name",
      header: "Template",
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
          <FileText size={14} color={T.textMuted} />
          <span>
            {r.name}
            <span
              style={{
                display: "block",
                fontFamily: "monospace",
                fontSize: 10.5,
                color: T.textMuted,
              }}
            >
              {r.id}
            </span>
          </span>
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
      key: "tier",
      header: "Operational Tier",
      sortValue: (r) => r.tier,
      render: (r) => r.tier,
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
    {
      key: "default",
      header: "Default",
      sortValue: (r) => (r.isDefault ? 0 : 1),
      render: (r) => <DefaultCell isDefault={r.isDefault} />,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "updated",
      header: "Updated",
      sortValue: (r) => r.modified,
      render: (r) => (
        <span style={{ color: T.textMuted }}>{r.updatedLabel}</span>
      ),
    },
  ];

  // ── Operational Dashboard (spec §Operational Dashboard) ──
  const published = records.filter((r) => r.status === "Published").length;
  const assignedWorkspaces = records.reduce(
    (s, r) => s + r.assignedWorkspaces,
    0,
  );
  const automationRules = records.reduce((s, r) => s + r.automationRules, 0);
  const scheduledJobs = records.reduce((s, r) => s + r.scheduledJobs, 0);
  const monitoringProfiles = new Set(records.map((r) => r.monitoringProfile))
    .size;
  const backupPolicies = records.length;
  const maintenancePolicies = records.reduce(
    (s, r) => s + r.maintenancePolicies,
    0,
  );

  return (
    <>
      {/* ── Operational Dashboard ── */}
      <StatStripPlain
        items={[
          { label: "Published Templates", value: published, tone: "ok" },
          {
            label: "Assigned Workspaces",
            value: assignedWorkspaces,
            tone: "muted",
          },
          { label: "Automation Rules", value: automationRules, tone: "muted" },
          { label: "Scheduled Jobs", value: scheduledJobs, tone: "muted" },
          {
            label: "Monitoring Profiles",
            value: monitoringProfiles,
            tone: "muted",
          },
          { label: "Backup Policies", value: backupPolicies, tone: "muted" },
          {
            label: "Maintenance Policies",
            value: maintenancePolicies,
            tone: "muted",
          },
        ]}
      />
      <div style={{ height: 18 }} />

      {/* ── Status sub-navigation ── */}
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={tab}
          onChange={setTab}
          options={NAV_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {tab === "versions" ? (
        <VersionsView records={records} />
      ) : (
        <DiscoveryListView
          title="Operational template library"
          commands={toolbar}
          pills={[
            {
              key: "category",
              label: "Category",
              value: fCategory,
              onChange: setFCategory,
              options: facet(records.map((r) => r.category)),
            },
            {
              key: "tier",
              label: "Operational Tier",
              value: fTier,
              onChange: setFTier,
              options: facet(records.map((r) => r.tier)),
            },
            {
              key: "bu",
              label: "Business Unit",
              value: fBu,
              onChange: setFBu,
              options: facet(records.map((r) => r.businessUnit)),
            },
            {
              key: "status",
              label: "Status",
              value: fStatus,
              onChange: setFStatus,
              options: facet(records.map((r) => r.status)),
            },
            {
              key: "version",
              label: "Version",
              value: fVersion,
              onChange: setFVersion,
              options: facet(records.map((r) => r.version)),
            },
            {
              key: "default",
              label: "Default",
              value: fDefault,
              onChange: setFDefault,
              options: [
                { value: "", label: "All" },
                { value: "Yes", label: "Default only" },
                { value: "No", label: "Non-default" },
              ],
            },
          ]}
          presets={[{ label: "All templates", onApply: clearFilters }]}
          filterRightSlot={
            <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
          }
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search operational templates — name, category, description, business unit, tags, version…"
          count={rows.length}
          columns={cols.filter((c) => !hidden.has(c.key))}
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
              <HeaderButton icon={<Archive size={13} />} onClick={clear}>
                Archive
              </HeaderButton>
              <HeaderButton icon={<Star size={13} />} onClick={clear}>
                Assign Default
              </HeaderButton>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>
                Export
              </HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "Open", onClick: () => setSelId(r.id) },
                { label: "Edit", onClick: () => setSelId(r.id) },
                { label: "Clone", onClick: () => {} },
                { label: "Publish", onClick: () => {} },
                { label: "Archive", onClick: () => {} },
                { label: "Export", onClick: () => {} },
                { label: "Compare Versions", onClick: () => setSelId(r.id) },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Plus size={20} />}
              title="No operational templates available."
              hint="Create an operational template, or import one to get started."
              cta="Create Operational Template"
              onCta={() => navigate("/admin/workspaces?tab=templates")}
            />
          }
        />
      )}

      {/* ── Operational Coverage + Template Relationships (spec §Operational Coverage / §Template Relationships) ── */}
      <Card
        title="Operational lifecycle & relationships"
        desc="The complete operational lifecycle managed by the template, and where the Operational Template sits in the governance hierarchy."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        />
      </Card>

      {sel && (
        <OperationalTemplateDrawer rec={sel} onClose={() => setSelId(null)} />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function OperationalTemplatesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Operational Templates"
        subtitle="Manage reusable operational blueprints that define monitoring, automation, lifecycle management, scheduling, maintenance, and operational policies for enterprise workspaces."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=templates")}
            >
              Create Operational Template
            </HeaderButton>
          </>
        }
      />
      <OperationalTemplatesView />
    </Page>
  );
}

// ════════════ Versions sub-view (spec §Navigation → Versions · §Version History) ════════════
interface VersionRow {
  id: string;
  version: string;
  template: string;
  published: string;
  publishedBy: string;
  status: string;
  notes: string;
}

function VersionsView({ records }: { records: TemplateRecord[] }) {
  const versions: VersionRow[] = React.useMemo(
    () =>
      records.flatMap((r) => {
        const n = hashId(r.id);
        const major = parseInt(r.version.slice(1), 10) || 1;
        return Array.from({ length: 3 }, (_, k) => {
          const isCurrent = k === 0;
          return {
            id: `${r.id}-v${k}`,
            version: isCurrent
              ? r.version
              : `v${Math.max(1, major - k)}.${(n + k) % 8}`,
            template: r.name,
            published: `2026-0${1 + ((n + k) % 6)}-${(1 + ((n + k) % 27)).toString().padStart(2, "0")}`,
            publishedBy: pick(AUTHORS, n + k),
            status: isCurrent ? r.status : k === 1 ? "Superseded" : "Archived",
            notes: pick(
              [
                "Monitoring thresholds tightened",
                "Added remediation runbook",
                "Backup retention extended",
                "AI runtime pinned",
                "Maintenance window rescheduled",
              ],
              n + k,
            ),
          };
        });
      }),
    [records],
  );
  const cols: Column<VersionRow>[] = [
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
    {
      key: "template",
      header: "Template",
      sortValue: (r) => r.template,
      render: (r) => r.template,
    },
    {
      key: "published",
      header: "Published",
      sortValue: (r) => r.published,
      render: (r) => r.published,
    },
    {
      key: "by",
      header: "Published By",
      sortValue: (r) => r.publishedBy,
      render: (r) => r.publishedBy,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => (
        <span
          style={{
            color: r.status === "Published" ? T.success : T.textMuted,
          }}
        >
          {r.status}
        </span>
      ),
    },
    { key: "notes", header: "Notes", render: (r) => r.notes },
  ];
  return (
    <Card
      title="Template versions"
      desc="Every published version across all operational templates. Compare or restore a prior version from the template detail drawer."
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <HeaderButton icon={<GitCompare size={13} />}>Compare</HeaderButton>
        <HeaderButton icon={<RotateCcw size={13} />}>Restore</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable
        columns={cols}
        rows={versions}
        pageSize={15}
        initialSort={{ key: "published", dir: "desc" }}
      />
    </Card>
  );
}

// ════════════ Operational Template Detail Drawer — 12 sub-tabs (spec §Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "automation", label: "Automation", icon: <Workflow size={13} /> },
  { id: "monitoring", label: "Monitoring", icon: <Gauge size={13} /> },
  { id: "scheduling", label: "Scheduling", icon: <CalendarClock size={13} /> },
  { id: "lifecycle", label: "Lifecycle", icon: <Repeat size={13} /> },
  { id: "capacity", label: "Capacity Management", icon: <Boxes size={13} /> },
  {
    id: "backup",
    label: "Backup & Recovery",
    icon: <DatabaseBackup size={13} />,
  },
  { id: "ai", label: "AI Operations", icon: <Bot size={13} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={13} /> },
  { id: "versions", label: "Version History", icon: <GitBranch size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function OperationalTemplateDrawer({
  rec,
  onClose,
}: {
  rec: TemplateRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      // Drawer Header displays: Template Name · Version · Operational Tier · Status · Default
      subtitle={`${rec.version} · ${rec.tier} · ${rec.status} · ${rec.isDefault ? "Default" : "Non-default"}`}
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
          {/* Quick Actions: Edit · Clone · Publish · Export */}
          <HeaderButton icon={<FileEdit size={13} />}>Edit</HeaderButton>
          <HeaderButton icon={<Copy size={13} />}>Clone</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton variant="primary" icon={<Send size={13} />}>
            Publish
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "automation" && <AutomationTab rec={rec} />}
      {tab === "monitoring" && <MonitoringTab rec={rec} />}
      {tab === "scheduling" && <SchedulingTab rec={rec} />}
      {tab === "lifecycle" && <LifecycleTab rec={rec} />}
      {tab === "capacity" && <CapacityTab rec={rec} />}
      {tab === "backup" && <BackupTab rec={rec} />}
      {tab === "ai" && <AiOperationsTab rec={rec} />}
      {tab === "notifications" && <NotificationsTab rec={rec} />}
      {tab === "versions" && <VersionHistoryTab rec={rec} />}
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

// ── Shared: a disabled-until-wired action toolbar row (used by drawer sub-tabs) ──
function ToolbarRow({
  buttons,
  sample,
}: {
  buttons: string[];
  sample?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 14,
        alignItems: "center",
      }}
    >
      {buttons.map((b) => (
        <HeaderButton key={b}>{b}</HeaderButton>
      ))}
      {sample && <SampleTag />}
    </div>
  );
}

// ── Shared: a labelled configuration section list (name → status), reused by config sub-tabs ──
function ConfigList({ items }: { items: { label: string; value: string }[] }) {
  return (
    <>
      {items.map((it) => (
        <StatRow key={it.label} label={it.label} value={it.value} sample />
      ))}
    </>
  );
}

// ── Overview (General · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "applied-profiles", label: "Applied profiles" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Template Name", v: rec.name },
              { k: "Template ID", v: rec.id },
              { k: "Category", v: rec.category },
              { k: "Operational Tier", v: rec.tier },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Version", v: rec.version },
              { k: "Status", v: rec.status },
              { k: "Default", v: rec.isDefault ? "Yes" : "No" },
              { k: "Created", v: rec.created },
              { k: "Modified", v: rec.modified },
            ]}
          />
          <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
            {rec.description}
          </div>
          <div style={{ paddingTop: 10 }}>
            <span style={{ fontSize: 11, color: T.textMuted, marginRight: 8 }}>
              Tags
            </span>
            {rec.tags.map((t) => (
              <span
                key={t}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 20,
                  padding: "0 8px",
                  marginRight: 6,
                  borderRadius: 99,
                  fontSize: 11,
                  color: T.textNav,
                  background: T.badgeBg,
                }}
              >
                {t}
              </span>
            ))}
            <SampleTag />
          </div>
        </Section>
      )}

      {sub === "applied-profiles" && (
        <Section title="Applied profiles" sample>
          <KVGrid
            items={[
              {
                k: "Automation Profile",
                v: rec.automationProfile,
                sample: true,
              },
              {
                k: "Monitoring Profile",
                v: rec.monitoringProfile,
                sample: true,
              },
              { k: "Lifecycle Profile", v: rec.lifecycleProfile, sample: true },
              {
                k: "Maintenance Profile",
                v: rec.maintenanceProfile,
                sample: true,
              },
              { k: "AI Operations Profile", v: rec.aiOpsProfile, sample: true },
            ]}
          />
        </Section>
      )}

      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              {
                k: "Assigned Workspaces",
                v: rec.assignedWorkspaces,
                sample: true,
              },
              { k: "Automation Rules", v: rec.automationRules, sample: true },
              { k: "Scheduled Jobs", v: rec.scheduledJobs, sample: true },
              {
                k: "Monitoring Policies",
                v: rec.monitoringPolicies,
                sample: true,
              },
              { k: "Alert Rules", v: rec.alertRules, sample: true },
              {
                k: "Maintenance Policies",
                v: rec.maintenancePolicies,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Automation (spec §Automation) ──
function AutomationTab({ rec }: { rec: TemplateRecord }) {
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Defines operational automation applied to workspaces.
      </div>
      <ToolbarRow
        buttons={["Add Automation", "Remove Automation", "Preview Workflow"]}
        sample
      />
      <Section title="Automation sections" sample>
        <ConfigList
          items={[
            {
              label: "Provisioning Automation",
              value: `${rec.automationProfile} · 6 rules`,
            },
            {
              label: "Remediation Automation",
              value: "Auto-remediate · 8 rules",
            },
            {
              label: "Compliance Automation",
              value: "Evidence + drift · 5 rules",
            },
            {
              label: "Scheduling",
              value: `${rec.scheduledJobs} scheduled jobs`,
            },
            { label: "Runbooks", value: "4 runbooks linked" },
            { label: "Approval Automation", value: "2-of-3 approvers" },
            { label: "Maintenance Automation", value: rec.maintenanceProfile },
          ]}
        />
      </Section>
    </>
  );
}

// ── Monitoring (spec §Monitoring) ──
const MONITORING_SUBS = [
  { id: "monitoring-configuration", label: "Monitoring configuration" },
  { id: "monitoring-sections", label: "Monitoring sections" },
];
function MonitoringTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("monitoring-configuration");
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Defines operational monitoring behavior.
      </div>
      <Tabs tabs={MONITORING_SUBS} active={sub} onChange={setSub} />
      {sub === "monitoring-configuration" && (
        <Section title="Monitoring configuration" sample>
          <StatRow
            label="Monitoring Profile"
            value={rec.monitoringProfile}
            sample
          />
          <StatRow
            label="Collection Frequency"
            value={rec.collectionFrequency}
            sample
          />
          <StatRow label="Retention" value={rec.retention} sample />
          <StatRow
            label="Alert Thresholds"
            value={rec.alertThresholds}
            sample
          />
        </Section>
      )}
      {sub === "monitoring-sections" && (
        <Section title="Monitoring sections" sample>
          <ConfigList
            items={[
              { label: "Health Monitoring", value: "Enabled · 30s" },
              { label: "Performance Monitoring", value: "Enabled · 1m" },
              { label: "Resource Monitoring", value: "Enabled · 5m" },
              { label: "Compliance Monitoring", value: "Enabled · hourly" },
              {
                label: "AI Monitoring",
                value: `Enabled · ${rec.aiMonitoringFrequency}`,
              },
              { label: "Integration Monitoring", value: "Enabled · 5m" },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Scheduling (spec §Scheduling) ──
function SchedulingTab({ rec }: { rec: TemplateRecord }) {
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Centralizes scheduled operational activities.
      </div>
      <ToolbarRow buttons={["Create Schedule", "Pause", "Resume"]} sample />
      <Section title="Scheduling sections" sample>
        <ConfigList
          items={[
            {
              label: "Maintenance Windows",
              value: rec.maintenanceProfile,
            },
            { label: "Assessment Schedule", value: "Weekly · Sunday 02:00" },
            {
              label: "Automation Schedule",
              value: `${rec.scheduledJobs} jobs`,
            },
            { label: "Synchronization Schedule", value: "Every 15 minutes" },
            { label: "Report Generation", value: "Monthly · 1st 06:00" },
            { label: "Cleanup Jobs", value: "Daily · 03:00" },
          ]}
        />
      </Section>
    </>
  );
}

// ── Lifecycle (spec §Lifecycle) ──
const LIFECYCLE_SUBS = [
  { id: "lifecycle-sections", label: "Lifecycle sections" },
  { id: "lifecycle-stages", label: "Lifecycle stages" },
];
function LifecycleTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("lifecycle-sections");
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Defines operational lifecycle policies.
      </div>
      <Tabs tabs={LIFECYCLE_SUBS} active={sub} onChange={setSub} />
      {sub === "lifecycle-sections" && (
        <Section title="Lifecycle sections" sample>
          <ConfigList
            items={[
              { label: "Workspace Lifecycle", value: rec.lifecycleProfile },
              { label: "Resource Lifecycle", value: "Tag-driven expiry" },
              { label: "Sandbox Lifecycle", value: "Auto-expire · 7 days" },
              { label: "Archive Policies", value: "After 90 days idle" },
              { label: "Retention Policies", value: rec.retention },
              {
                label: "Cleanup Policies",
                value: "Orphaned resources · daily",
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Capacity Management (spec §Capacity Management) ──
const CAPACITY_SUBS = [
  { id: "capacity-thresholds", label: "Capacity thresholds" },
  { id: "capacity-sections", label: "Capacity sections" },
];
function CapacityTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("capacity-thresholds");
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Defines operational capacity controls.
      </div>
      <Tabs tabs={CAPACITY_SUBS} active={sub} onChange={setSub} />
      {sub === "capacity-thresholds" && (
        <Section title="Capacity thresholds" sample>
          <StatRow
            label="Maximum Resources"
            value={rec.maxResources.toLocaleString()}
            sample
          />
          <StatRow
            label="Warning Threshold"
            value={rec.warningThreshold}
            tone="warn"
            sample
          />
          <StatRow
            label="Critical Threshold"
            value={rec.criticalThreshold}
            tone="danger"
            sample
          />
        </Section>
      )}
      {sub === "capacity-sections" && (
        <Section title="Capacity sections" sample>
          <ConfigList
            items={[
              {
                label: "Workspace Quotas",
                value: `${rec.maxResources.toLocaleString()} resources`,
              },
              { label: "Resource Limits", value: "Per-service caps enforced" },
              { label: "Growth Policies", value: "Auto-expand · +20%" },
              { label: "Reservations", value: "Reserved capacity pool" },
              { label: "Scaling Policies", value: "Horizontal · target 70%" },
              {
                label: "Consumption Monitoring",
                value: rec.collectionFrequency,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Backup & Recovery (spec §Backup & Recovery) ──
function BackupTab({ rec }: { rec: TemplateRecord }) {
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Defines operational resilience.
      </div>
      <ToolbarRow
        buttons={["Run Backup", "Validate Recovery", "Export Policy"]}
        sample
      />
      <Section title="Backup & recovery sections" sample>
        <ConfigList
          items={[
            { label: "Backup Schedule", value: "Daily · 01:00" },
            { label: "Recovery Policy", value: "RTO 4h · RPO 1h" },
            { label: "Retention", value: rec.retention },
            { label: "Disaster Recovery", value: "Cross-region replica" },
            { label: "Validation", value: "Checksum + restore probe" },
            { label: "Recovery Testing", value: "Quarterly DR drill" },
          ]}
        />
      </Section>
    </>
  );
}

// ── AI Operations (spec §AI Operations) ──
const AI_OPERATIONS_SUBS = [
  { id: "ai-operations-displays", label: "AI operations displays" },
  { id: "ai-operations-sections", label: "AI operations sections" },
];
function AiOperationsTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("ai-operations-displays");
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Defines operational behavior of AI services.
      </div>
      <Tabs tabs={AI_OPERATIONS_SUBS} active={sub} onChange={setSub} />
      {sub === "ai-operations-displays" && (
        <Section title="AI operations displays" sample>
          <StatRow
            label="Approved Runtime"
            value={
              <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>
                {rec.approvedRuntime}
              </span>
            }
            sample
          />
          <StatRow
            label="Monitoring Frequency"
            value={rec.aiMonitoringFrequency}
            sample
          />
          <StatRow
            label="Usage Thresholds"
            value={rec.usageThresholds}
            sample
          />
        </Section>
      )}
      {sub === "ai-operations-sections" && (
        <Section title="AI operations sections" sample>
          <ConfigList
            items={[
              { label: "Agent Scheduling", value: "Business hours · queued" },
              {
                label: "Runtime Monitoring",
                value: `${rec.aiMonitoringFrequency} interval`,
              },
              { label: "Prompt Versioning", value: "Pinned · reviewed" },
              { label: "Knowledge Synchronization", value: "Every 6 hours" },
              { label: "Model Updates", value: "Staged · approval gated" },
              { label: "Usage Policies", value: rec.aiOpsProfile },
              { label: "Cost Controls", value: rec.usageThresholds },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Notifications (spec §Notifications) ──
const NOTIFICATION_CATEGORIES = [
  "Provisioning",
  "Monitoring",
  "Compliance",
  "Capacity",
  "Maintenance",
  "Failures",
  "Recovery",
  "Approvals",
];
const DELIVERY_CHANNELS = [
  "Email",
  "Teams",
  "Slack",
  "Webhook",
  "ServiceNow",
  "PagerDuty",
];

const NOTIFICATIONS_SUBS = [
  { id: "categories", label: "Categories" },
  { id: "delivery-channels", label: "Delivery channels" },
];
function NotificationsTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("categories");
  const n = hashId(rec.id);
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Defines operational notifications.
      </div>
      <Tabs tabs={NOTIFICATIONS_SUBS} active={sub} onChange={setSub} />
      {sub === "categories" && (
        <Section title="Categories" sample>
          {NOTIFICATION_CATEGORIES.map((c, i) => (
            <StatRow
              key={c}
              label={c}
              value={(n + i) % 5 === 0 ? "Disabled" : "Enabled"}
              tone={(n + i) % 5 === 0 ? "muted" : "ok"}
              sample
            />
          ))}
        </Section>
      )}
      {sub === "delivery-channels" && (
        <Section title="Delivery channels" sample>
          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}
          >
            {DELIVERY_CHANNELS.map((d, i) => {
              const on = (n + i) % 3 !== 0;
              return (
                <span
                  key={d}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 26,
                    padding: "0 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    color: on ? T.textPrimary : T.textMuted,
                    border: `1px solid ${on ? "var(--cg-accent)" : T.border}`,
                    background: on ? "var(--cg-accent-bg)" : "transparent",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: on ? T.success : T.textMuted,
                    }}
                  />
                  {d}
                </span>
              );
            })}
          </div>
        </Section>
      )}
    </>
  );
}

// ── Version History (spec §Version History) ──
function VersionHistoryTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
  const major = parseInt(rec.version.slice(1), 10) || 1;
  const rows = Array.from({ length: 4 }, (_, k) => ({
    id: `${rec.id}-vh${k}`,
    version:
      k === 0 ? rec.version : `v${Math.max(1, major - k)}.${(n + k) % 8}`,
    published: `2026-0${1 + ((n + k) % 6)}-${(1 + ((n + k) % 27)).toString().padStart(2, "0")}`,
    publishedBy: pick(AUTHORS, n + k),
    status: k === 0 ? rec.status : k === 1 ? "Superseded" : "Archived",
    notes: pick(
      [
        "Monitoring thresholds tightened",
        "Added remediation runbook",
        "Backup retention extended",
        "AI runtime pinned",
        "Maintenance window rescheduled",
      ],
      n + k,
    ),
  }));
  const cols: Column<(typeof rows)[number]>[] = [
    {
      key: "version",
      header: "Version",
      render: (r) => (
        <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>
          {r.version}
        </span>
      ),
    },
    { key: "published", header: "Published", render: (r) => r.published },
    { key: "by", header: "Published By", render: (r) => r.publishedBy },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Published" ? T.success : T.textMuted }}
        >
          {r.status}
        </span>
      ),
    },
    { key: "notes", header: "Notes", render: (r) => r.notes },
  ];
  return (
    <>
      <ToolbarRow buttons={["Compare", "Restore", "Export"]} sample />
      <DirectoryTable columns={cols} rows={rows} />
      <Section title="Comparison" sample>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12.5,
              color: T.textNav,
            }}
          >
            Version {Math.max(1, major - 1)}.0
          </div>
          <span
            style={{ color: T.textMuted, textAlign: "center", fontSize: 12 }}
          >
            ↓ Configuration Changes ↓
          </span>
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12.5,
              color: T.textPrimary,
              fontWeight: 600,
              background: "var(--cg-accent-bg-strong)",
            }}
          >
            Version {major}.0 ({rec.version})
          </div>
        </div>
      </Section>
    </>
  );
}

// ── Activity (timeline · spec §Activity) ──
function ActivityTab() {
  const events = [
    "Template Created",
    "Monitoring Updated",
    "Automation Added",
    "Policy Updated",
    "Version Published",
    "Assigned",
    "Archived",
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
        Template activity timeline <SampleTag />
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 11.5, color: T.textMuted }}>Filters:</span>
        <HeaderButton>Actor</HeaderButton>
        <HeaderButton>Category</HeaderButton>
        <HeaderButton>Date</HeaderButton>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
                {pick(AUTHORS, i)} ·{" "}
                {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Audit History (read-only immutable log · spec §Audit History) ──
function AuditTab() {
  const events = [
    "Template Created",
    "Automation Modified",
    "Monitoring Updated",
    "Lifecycle Changed",
    "Backup Policy Updated",
    "Notification Updated",
    "Version Published",
    "Assigned",
    "Archived",
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
          value={`${pick(AUTHORS, i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Hierarchy & Relationships → Dependencies */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  RefreshCcw,
  ShieldCheck,
  Waypoints,
  GitBranch,
  FileText,
  LayoutGrid,
  HeartPulse,
  Gauge,
  Wrench,
  History,
  Activity as ActivityIcon,
  AlertTriangle,
  Network,
  Server,
  BellRing,
  PlayCircle,
  Link2,
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
  ConfirmButton,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Workspace Dependencies — the enterprise operational dependency map for the entire workspace
 * ecosystem. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/03_Hierarchy & Relationships/dependencies.md.
 *
 * Unlike Parent / Child Workspaces (which model hierarchical ownership), Dependencies model runtime
 * operational reliance — one workspace relying on another for services, infrastructure, data, APIs, AI
 * capabilities, integrations or shared resources. The module makes every service relationship explicit,
 * monitored and auditable so administrators can reason about failure propagation, change risk, upgrade
 * sequencing, disaster recovery and business continuity.
 *
 * Reuses the Enterprise-Administration UX pattern shared with the Users / Workspace-Requests modules
 * (Banner · Toolbar · Filters · Search · Operational Dashboard · Dependency Graph · Data Table ·
 * Bulk/Row actions · Dependency Detail Drawer with 8 sub-tabs). The second-level navigation (Dependency
 * Catalog / Incoming / Outgoing / Critical / External / Service / Resource / AI / Cloud / Dependency
 * Graph / Impact Analysis / Dependency History) is a `View` filter dropdown, matching the current
 * Workspace-Requests convention.
 *
 * There is no dependency backend yet, so the dependency set is representative sample data (tagged
 * `Sample` in the UI). When the dependency-graph engine lands, swap SAMPLE_DEPENDENCIES for the live
 * query — the component API stays identical.
 */

// ── Dependency Types (spec §Dependency Types) ─────────────────────────────────────────────────────
const DEPENDENCY_TYPES = [
  "Shared Service",
  "API",
  "Database",
  "Storage",
  "Cloud Account",
  "Kubernetes Cluster",
  "AI Runtime",
  "LLM Provider",
  "Knowledge Base",
  "Integration",
  "Identity",
  "Networking",
  "Secrets",
  "Logging",
  "Monitoring",
];

// View → type groupings (Service / Resource / AI / Cloud sub-views).
const SERVICE_TYPE_SET = new Set([
  "Shared Service",
  "API",
  "Integration",
  "Identity",
  "Networking",
  "Secrets",
  "Logging",
  "Monitoring",
]);
const RESOURCE_TYPE_SET = new Set(["Database", "Storage", "Knowledge Base"]);
const AI_TYPE_SET = new Set(["AI Runtime", "LLM Provider", "Knowledge Base"]);
const CLOUD_TYPE_SET = new Set(["Cloud Account", "Kubernetes Cluster"]);

// ── Criticality (spec §Dependency Criticality) ────────────────────────────────────────────────────
const CRITICALITIES = ["Critical", "High", "Medium", "Low"];
const CRITICALITY_TONE: Record<string, string> = {
  Critical: T.danger,
  High: T.warning,
  Medium: T.textNav,
  Low: T.textMuted,
};

// ── Health states (spec §Health) ──────────────────────────────────────────────────────────────────
type Health = "Healthy" | "Warning" | "Degraded" | "Critical" | "Offline";
const HEALTH_STATES: Health[] = [
  "Healthy",
  "Warning",
  "Degraded",
  "Critical",
  "Offline",
];
const HEALTH_TONE: Record<Health, string> = {
  Healthy: T.success,
  Warning: T.warning,
  Degraded: T.warning,
  Critical: T.danger,
  Offline: T.textMuted,
};

// ── Status ────────────────────────────────────────────────────────────────────────────────────────
type Status = "Active" | "Pending" | "Suspended" | "Deprecated";
const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Pending: T.warning,
  Suspended: T.danger,
  Deprecated: T.textMuted,
};

// ── Relationship types (spec §Relationship) ───────────────────────────────────────────────────────
const RELATIONSHIP_TYPES = [
  "One-to-One",
  "One-to-Many",
  "Many-to-One",
  "Many-to-Many",
];
const SERVICE_LEVELS = ["Platinum", "Gold", "Silver", "Bronze"];
const RECOVERY_PRIORITIES = ["P1", "P2", "P3", "P4"];
const DIRECTIONS = ["Incoming", "Outgoing"] as const;

const WORKSPACES = [
  "Shared Identity",
  "Payments",
  "Fraud",
  "Reporting",
  "Platform Core",
  "Data Lake",
  "Retail Web",
  "AI Runtime Platform",
  "Networking Hub",
  "Observability",
];
const SERVICES = [
  "Authentication",
  "OIDC Broker",
  "Payments API",
  "Fraud Scoring",
  "Ledger DB",
  "Object Store",
  "Prod Cluster",
  "Inference Gateway",
  "GPT Endpoint",
  "Policy KB",
  "Event Bus",
  "Secrets Vault",
  "Log Pipeline",
  "Metrics Feed",
];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const OWNERS = [
  "David Chen",
  "Aisha Khan",
  "Tomás Silva",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
];

// ── Deterministic helpers ─────────────────────────────────────────────────────────────────────────
function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface DependencyRecord {
  id: string;
  name: string;
  provider: string;
  consumer: string;
  type: string;
  service: string;
  criticality: string;
  health: Health;
  status: Status;
  direction: (typeof DIRECTIONS)[number];
  external: boolean;
  businessUnit: string;
  owner: string;
  relationshipType: string;
  serviceLevel: string;
  cloudAccount: string;
  cluster: string;
  integration: string;
  created: string;
  modified: string;
  // Statistics
  dependentWorkspaces: number;
  upstreamServices: number;
  downstreamServices: number;
  availability: number;
  incidentCount: number;
  // Health metrics
  latencyMs: number;
  responseTimeMs: number;
  failures: number;
  retries: number;
  sla: string;
  // Impact analysis
  affectedWorkspaces: number;
  affectedUsers: number;
  affectedServices: number;
  complianceImpact: string;
  securityImpact: string;
  businessImpact: string;
  estDowntimeMin: number;
  recoveryPriority: string;
  // Monitoring
  monitoringFrequency: string;
}

// Deterministic representative dependency set (14 records).
const SAMPLE_DEPENDENCIES: DependencyRecord[] = Array.from(
  { length: 14 },
  (_, i) => {
    const id = `DEP-${(1040 + i * 13).toString().padStart(5, "0")}`;
    const n = hashId(id);
    const type = pick(DEPENDENCY_TYPES, n);
    const provider = pick(WORKSPACES, n);
    const consumer = pick(WORKSPACES.slice(1), n >> 2);
    const health = pick<Health>(HEALTH_STATES, n >> 1);
    const criticality = pick(CRITICALITIES, n >> 3);
    return {
      id,
      name: `${provider} → ${consumer} (${type})`,
      provider,
      consumer,
      type,
      service: pick(SERVICES, n),
      criticality,
      health,
      status: pick<Status>(
        ["Active", "Active", "Active", "Pending", "Suspended", "Deprecated"],
        n,
      ),
      direction: pick([...DIRECTIONS], n),
      external: n % 4 === 0,
      businessUnit: pick(BUSINESS_UNITS, n >> 2),
      owner: pick(OWNERS, n),
      relationshipType: pick(RELATIONSHIP_TYPES, n >> 1),
      serviceLevel: pick(SERVICE_LEVELS, n >> 2),
      cloudAccount: `acct-${(4000 + (n % 900)).toString()}`,
      cluster: `cluster-${pick(["prod", "stage", "dr"], n)}-${n % 9}`,
      integration: pick(
        ["Slack", "ServiceNow", "PagerDuty", "Jira", "Datadog"],
        n,
      ),
      created: `2026-0${1 + (n % 6)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      modified: `2026-0${1 + ((n + 3) % 6)}-${(1 + ((n + 5) % 27)).toString().padStart(2, "0")}`,
      dependentWorkspaces: 1 + (n % 9),
      upstreamServices: 1 + (n % 6),
      downstreamServices: 1 + ((n >> 2) % 8),
      availability: 100 - (n % 5) * 0.37,
      incidentCount: n % 7,
      latencyMs: 12 + (n % 180),
      responseTimeMs: 40 + (n % 260),
      failures: n % 12,
      retries: n % 20,
      sla: pick(["99.99%", "99.95%", "99.9%", "99.5%"], n),
      affectedWorkspaces: 2 + (n % 12),
      affectedUsers: 120 + (n % 40) * 55,
      affectedServices: 3 + (n % 14),
      complianceImpact: pick(["None", "Low", "Moderate", "High"], n),
      securityImpact: pick(["None", "Low", "Moderate", "High"], n >> 1),
      businessImpact: pick(["Minor", "Moderate", "Major", "Severe"], n >> 2),
      estDowntimeMin: 5 + (n % 55),
      recoveryPriority: pick(RECOVERY_PRIORITIES, n >> 1),
      monitoringFrequency: pick(["30s", "1m", "5m", "15m"], n),
    };
  },
);

// Second-level navigation → the View filter dropdown (spec §Navigation).
const VIEW_OPTIONS = [
  { value: "catalog", label: "Dependency Catalog" },
  { value: "incoming", label: "Incoming Dependencies" },
  { value: "outgoing", label: "Outgoing Dependencies" },
  { value: "critical", label: "Critical Dependencies" },
  { value: "external", label: "External Dependencies" },
  { value: "service", label: "Service Dependencies" },
  { value: "resource", label: "Resource Dependencies" },
  { value: "ai", label: "AI Dependencies" },
  { value: "cloud", label: "Cloud Dependencies" },
  { value: "graph", label: "Dependency Graph" },
  { value: "impact", label: "Impact Analysis" },
  { value: "history", label: "Dependency History" },
];

function viewMatches(view: string, r: DependencyRecord): boolean {
  switch (view) {
    case "incoming":
      return r.direction === "Incoming";
    case "outgoing":
      return r.direction === "Outgoing";
    case "critical":
      return r.criticality === "Critical";
    case "external":
      return r.external;
    case "service":
      return SERVICE_TYPE_SET.has(r.type);
    case "resource":
      return RESOURCE_TYPE_SET.has(r.type);
    case "ai":
      return AI_TYPE_SET.has(r.type);
    case "cloud":
      return CLOUD_TYPE_SET.has(r.type);
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

function HealthBadge({ health }: { health: Health }) {
  const c = HEALTH_TONE[health];
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

/** A simple vertical node → node flow-chain rendered inside a Card (no graph library, per spec). */
function FlowChain({ nodes }: { nodes: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {nodes.map((node, i) => (
        <React.Fragment key={`${node}-${i}`}>
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
              background: "var(--cg-bg-badge)",
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
            {node}
          </div>
          {i < nodes.length - 1 && (
            <span
              style={{ color: T.textMuted, textAlign: "center", fontSize: 13 }}
            >
              ↓
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Embeddable body — sub-navigation + operational dashboard + directory + dependency graph + dependency
 * detail drawer, WITHOUT the outer <Page> or the page banner. Rendered both as the standalone route and
 * as a tab of the Workspace Management console. Uses local state for the View sub-nav so it never
 * collides with a host page's `?tab=`.
 */
export function WorkspaceDependenciesView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("catalog");

  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fCriticality, setFCriticality] = React.useState("");
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fConsumer, setFConsumer] = React.useState("");
  const [fHealth, setFHealth] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_DEPENDENCIES;

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      viewMatches(view, r) &&
      (!q ||
        r.provider.toLowerCase().includes(q) ||
        r.consumer.toLowerCase().includes(q) ||
        r.service.toLowerCase().includes(q) ||
        r.cloudAccount.toLowerCase().includes(q) ||
        r.cluster.toLowerCase().includes(q) ||
        r.integration.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)) &&
      (!fType || r.type === fType) &&
      (!fCriticality || r.criticality === fCriticality) &&
      (!fWorkspace || r.provider === fWorkspace || r.consumer === fWorkspace) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fOwner || r.owner === fOwner) &&
      (!fProvider || r.provider === fProvider) &&
      (!fConsumer || r.consumer === fConsumer) &&
      (!fHealth || r.health === fHealth) &&
      (!fStatus || r.status === fStatus)
    );
  });

  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFCriticality("");
    setFWorkspace("");
    setFBu("");
    setFOwner("");
    setFProvider("");
    setFConsumer("");
    setFHealth("");
    setFStatus("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational Dashboard (spec §Operational Dashboard) ──
  const totalDeps = records.length;
  const criticalDeps = records.filter(
    (r) => r.criticality === "Critical",
  ).length;
  const healthyDeps = records.filter((r) => r.health === "Healthy").length;
  const degradedDeps = records.filter(
    (r) => r.health === "Degraded" || r.health === "Warning",
  ).length;
  const violations = records.filter(
    (r) => r.health === "Critical" || r.health === "Offline",
  ).length;
  const recentChanges = records.filter(
    (r) => r.modified >= "2026-05-01",
  ).length;

  // ── Toolbar (Create · Administrative · Governance actions) ──
  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Dependency",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=dependencies"),
    },
    { key: "edit", label: "Edit", icon: <Pencil size={15} />, disabled: true },
    {
      key: "remove",
      label: "Remove",
      icon: <Trash2 size={15} />,
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
    { key: "refresh", label: "Refresh", icon: <RefreshCcw size={15} /> },
    {
      key: "validate",
      label: "Validate Dependencies",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "impact",
      label: "Run Impact Analysis",
      icon: <Waypoints size={15} />,
      onClick: () => setView("impact"),
    },
    {
      key: "cycles",
      label: "Detect Circular Dependencies",
      icon: <GitBranch size={15} />,
      onClick: () => setView("graph"),
    },
    {
      key: "report",
      label: "Generate Dependency Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<DependencyRecord>[] = [
    {
      key: "provider",
      header: "Provider",
      sortValue: (r) => r.provider,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Server size={14} color={T.textMuted} />
          {r.provider}
        </span>
      ),
    },
    {
      key: "consumer",
      header: "Consumer",
      sortValue: (r) => r.consumer,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Network size={14} color={T.textMuted} />
          {r.consumer}
        </span>
      ),
    },
    {
      key: "type",
      header: "Dependency Type",
      sortValue: (r) => r.type,
      render: (r) => r.type,
    },
    {
      key: "service",
      header: "Service",
      sortValue: (r) => r.service,
      render: (r) => r.service,
    },
    {
      key: "criticality",
      header: "Criticality",
      sortValue: (r) => CRITICALITIES.indexOf(r.criticality),
      render: (r) => (
        <span style={{ color: CRITICALITY_TONE[r.criticality] }}>
          {r.criticality}
        </span>
      ),
    },
    {
      key: "health",
      header: "Health",
      sortValue: (r) => r.health,
      render: (r) => <HealthBadge health={r.health} />,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  const showCatalog = !["graph", "impact", "history"].includes(view);

  return (
    <>
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={view}
          onChange={setView}
          options={VIEW_OPTIONS}
        />
      </div>

      {/* Operational Dashboard — always visible (spec §Operational Dashboard). */}
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
        <StatStripPlain
          items={[
            { label: "Total Dependencies", value: totalDeps, tone: "muted" },
            {
              label: "Critical Dependencies",
              value: criticalDeps,
              tone: "danger",
            },
            { label: "Healthy Services", value: healthyDeps, tone: "ok" },
            { label: "Degraded Services", value: degradedDeps, tone: "warn" },
            {
              label: "Dependency Violations",
              value: violations,
              tone: violations > 0 ? "danger" : "ok",
            },
            { label: "Recent Changes", value: recentChanges, tone: "muted" },
            {
              label: "Impact Assessments",
              value: records.reduce(
                (a, r) => a + (r.incidentCount > 0 ? 1 : 0),
                0,
              ),
              tone: "muted",
            },
          ]}
        />
      </div>

      {showCatalog && (
        <DiscoveryListView
          title="Dependency catalog"
          commands={toolbar}
          pills={[
            {
              key: "type",
              label: "Dependency Type",
              value: fType,
              onChange: setFType,
              options: facet(records.map((r) => r.type)),
            },
            {
              key: "criticality",
              label: "Criticality",
              value: fCriticality,
              onChange: setFCriticality,
              options: facet(records.map((r) => r.criticality)),
            },
            {
              key: "workspace",
              label: "Workspace",
              value: fWorkspace,
              onChange: setFWorkspace,
              options: facet(records.flatMap((r) => [r.provider, r.consumer])),
            },
            {
              key: "bu",
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
              key: "provider",
              label: "Provider",
              value: fProvider,
              onChange: setFProvider,
              options: facet(records.map((r) => r.provider)),
            },
            {
              key: "consumer",
              label: "Consumer",
              value: fConsumer,
              onChange: setFConsumer,
              options: facet(records.map((r) => r.consumer)),
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
          ]}
          presets={[{ label: "All dependencies", onApply: clearFilters }]}
          filterRightSlot={
            <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
          }
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search dependencies — workspace, service, cloud account, cluster, integration, provider, consumer, owner…"
          count={rows.length}
          columns={cols.filter((c) => !hidden.has(c.key))}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "criticality", dir: "asc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>
                Export ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<ShieldCheck size={13} />} onClick={clear}>
                Validate
              </HeaderButton>
              <HeaderButton icon={<HeartPulse size={13} />} onClick={clear}>
                Run Health Check
              </HeaderButton>
              <HeaderButton icon={<FileText size={13} />} onClick={clear}>
                Generate Report
              </HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View", onClick: () => setSelId(r.id) },
                { label: "Edit", onClick: () => setSelId(r.id) },
                { label: "Impact Analysis", onClick: () => setSelId(r.id) },
                {
                  label: "Show Dependency Graph",
                  onClick: () => setView("graph"),
                },
                { label: "Export", onClick: () => {} },
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
              icon={<Link2 size={20} />}
              title="No workspace dependencies configured."
              hint="Create a dependency, or import an existing dependency map to get started."
              cta="Create Dependency"
              onCta={() => navigate("/admin/workspaces?tab=dependencies")}
            />
          }
        />
      )}

      {view === "graph" && <DependencyGraphView rows={rows} />}
      {view === "impact" && <ImpactAnalysisView records={records} />}
      {view === "history" && <DependencyHistoryView records={records} />}

      {/* Enterprise Dependency Model — the canonical flow-chain (spec §Enterprise Dependency Model). */}
      <Card
        title="Enterprise dependency model"
        desc="Dependencies provide the enterprise operational map of how workspaces rely on one another — explicit, monitored and auditable across the platform."
        right={<SampleTag />}
      >
        <FlowChain
          nodes={[
            "Provider Workspace",
            "Shared Service",
            "Dependency",
            "Consumer Workspace",
            "Monitoring",
            "Impact Analysis",
            "Incident Response",
            "Audit",
          ]}
        />
      </Card>

      {sel && (
        <DependencyDetailDrawer rec={sel} onClose={() => setSelId(null)} />
      )}
    </>
  );
}

// ── Dependency Graph view (spec §Dependency Graph + §Circular Dependency Detection) ────────────────
function DependencyGraphView({ rows }: { rows: DependencyRecord[] }) {
  const chain =
    rows.length > 0
      ? [
          rows[0].provider,
          rows[0].service,
          rows[0].consumer,
          ...rows.slice(1, 4).map((r) => r.consumer),
        ]
      : [
          "Identity Workspace",
          "Authentication",
          "Payments Workspace",
          "Fraud Workspace",
          "Reporting Workspace",
        ];
  return (
    <>
      <Card
        title="Dependency graph"
        desc="Interactive visualization of the workspace dependency chain."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <SampleTag />
          </div>
        }
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <HeaderButton>Expand</HeaderButton>
          <HeaderButton>Collapse</HeaderButton>
          <HeaderButton>Filter</HeaderButton>
          <HeaderButton>Zoom</HeaderButton>
          <HeaderButton icon={<AlertTriangle size={13} />}>
            Highlight Critical Paths
          </HeaderButton>
          <HeaderButton icon={<PlayCircle size={13} />}>
            Failure Simulation
          </HeaderButton>
        </div>
        <FlowChain nodes={chain} />
      </Card>

      <Card
        title="Circular dependency detection"
        desc="Automatically scans the dependency graph for structural faults."
        right={<SampleTag />}
      >
        <StatRow
          label="Circular References"
          value="0 detected"
          tone="ok"
          sample
        />
        <StatRow
          label="Recursive Dependencies"
          value="0 detected"
          tone="ok"
          sample
        />
        <StatRow
          label="Invalid Relationships"
          value="1 detected"
          tone="warn"
          sample
        />
        <StatRow label="Broken Links" value="0 detected" tone="ok" sample />
        <StatRow
          label="Unreachable Services"
          value="1 detected"
          tone="warn"
          sample
        />
      </Card>
    </>
  );
}

// ── Impact Analysis view (org-wide roll-up of the §Impact Analysis surface) ────────────────────────
function ImpactAnalysisView({ records }: { records: DependencyRecord[] }) {
  const affectedWorkspaces = records.reduce(
    (a, r) => a + r.affectedWorkspaces,
    0,
  );
  const affectedUsers = records.reduce((a, r) => a + r.affectedUsers, 0);
  const affectedServices = records.reduce((a, r) => a + r.affectedServices, 0);
  return (
    <Card
      title="Impact analysis"
      desc="Predicts operational impact if a dependency changes or becomes unavailable."
      right={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <HeaderButton icon={<Waypoints size={13} />}>
            Run Analysis
          </HeaderButton>
          <HeaderButton icon={<Download size={13} />}>
            Export Report
          </HeaderButton>
          <SampleTag />
        </div>
      }
    >
      <StatStripPlain
        items={[
          {
            label: "Affected Workspaces",
            value: affectedWorkspaces,
            tone: "warn",
          },
          { label: "Affected Users", value: affectedUsers, tone: "warn" },
          { label: "Affected Services", value: affectedServices, tone: "warn" },
          {
            label: "Critical Path Deps",
            value: records.filter((r) => r.criticality === "Critical").length,
            tone: "danger",
          },
        ]}
      />
      <div style={{ marginTop: 12 }}>
        <FlowChain
          nodes={[
            "Dependency Failure",
            "Affected Workspace",
            "Affected Services",
            "Business Impact",
          ]}
        />
      </div>
    </Card>
  );
}

// ── Dependency History view (spec §Dependency History) ─────────────────────────────────────────────
function DependencyHistoryView({ records }: { records: DependencyRecord[] }) {
  const actions = [
    "Dependency Created",
    "Dependency Updated",
    "Health Changed",
    "Incident Triggered",
    "Maintenance Scheduled",
    "Dependency Removed",
  ];
  const events = records.slice(0, 12).map((r, i) => {
    const n = hashId(r.id);
    return {
      id: `${r.id}-hist-${i}`,
      dependency: r.name,
      action: pick(actions, n + i),
      actor: pick(OWNERS, n + i),
      date: `2026-06-${(1 + ((n + i) % 27)).toString().padStart(2, "0")}`,
    };
  });
  const cols: Column<(typeof events)[number]>[] = [
    { key: "dependency", header: "Dependency", render: (r) => r.dependency },
    { key: "action", header: "Action", render: (r) => r.action },
    { key: "actor", header: "Actor", render: (r) => r.actor },
    { key: "date", header: "Date", render: (r) => r.date },
  ];
  return (
    <Card
      title="Dependency history"
      desc="Chronological record of every change affecting workspace dependencies."
      right={<SampleTag />}
    >
      <DirectoryTable columns={cols} rows={events} pageSize={12} />
    </Card>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function WorkspaceDependenciesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Dependencies"
        subtitle="Manage operational dependencies between workspaces, shared services, cloud resources, AI platforms, integrations, and enterprise services."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=dependencies")}
            >
              Create Dependency
            </HeaderButton>
          </>
        }
      />
      <WorkspaceDependenciesView />
    </Page>
  );
}

// ════════════ Dependency Detail Drawer — 8 sub-tabs (spec §Dependency Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "relationship", label: "Relationship", icon: <GitBranch size={13} /> },
  { id: "impact", label: "Impact Analysis", icon: <Waypoints size={13} /> },
  { id: "health", label: "Health", icon: <HeartPulse size={13} /> },
  { id: "monitoring", label: "Monitoring", icon: <Gauge size={13} /> },
  { id: "change", label: "Change Management", icon: <Wrench size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function DependencyDetailDrawer({
  rec,
  onClose,
}: {
  rec: DependencyRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.provider} → ${rec.consumer}`}
      subtitle={`${rec.type} · ${rec.criticality} criticality · ${rec.health}`}
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
          <ConfirmButton
            label="Delete"
            title="Delete dependency"
            body={`Remove the dependency ${rec.provider} → ${rec.consumer}? Consumers relying on this relationship may be impacted. This action is destructive.`}
            confirmLabel="Delete Dependency"
            onConfirm={onClose}
          />
          <HeaderButton icon={<Waypoints size={13} />}>
            Impact Analysis
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Pencil size={13} />}>
            Edit
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "relationship" && <RelationshipTab rec={rec} />}
      {tab === "impact" && <ImpactTab rec={rec} />}
      {tab === "health" && <HealthTab rec={rec} />}
      {tab === "monitoring" && <MonitoringTab rec={rec} />}
      {tab === "change" && <ChangeTab rec={rec} />}
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

// ── Overview (General · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: DependencyRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Dependency Name", v: rec.name },
              { k: "Provider Workspace", v: rec.provider },
              { k: "Consumer Workspace", v: rec.consumer },
              { k: "Dependency Type", v: rec.type },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Criticality", v: rec.criticality },
              { k: "Status", v: rec.status },
              { k: "Created", v: rec.created, sample: true },
              { k: "Modified", v: rec.modified, sample: true },
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
                k: "Dependent Workspaces",
                v: rec.dependentWorkspaces,
                sample: true,
              },
              { k: "Upstream Services", v: rec.upstreamServices, sample: true },
              {
                k: "Downstream Services",
                v: rec.downstreamServices,
                sample: true,
              },
              {
                k: "Availability",
                v: `${rec.availability.toFixed(2)}%`,
                sample: true,
              },
              { k: "Incident Count", v: rec.incidentCount, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Relationship (spec §Relationship) ──
const RELATIONSHIP_SUBS = [
  {
    id: "how-the-dependency-is-established",
    label: "How the dependency is established",
  },
  { id: "relationship-details", label: "Relationship details" },
  { id: "supported-relationship-types", label: "Supported relationship types" },
];
function RelationshipTab({ rec }: { rec: DependencyRecord }) {
  const [sub, setSub] = React.useState("how-the-dependency-is-established");
  return (
    <>
      <Tabs tabs={RELATIONSHIP_SUBS} active={sub} onChange={setSub} />
      {sub === "how-the-dependency-is-established" && (
        <Section title="How the dependency is established" sample>
          <FlowChain nodes={[rec.provider, rec.service, rec.consumer]} />
        </Section>
      )}

      {sub === "relationship-details" && (
        <Section title="Relationship details" sample>
          <StatRow label="Provider" value={rec.provider} sample />
          <StatRow label="Consumer" value={rec.consumer} sample />
          <StatRow
            label="Relationship Type"
            value={rec.relationshipType}
            sample
          />
          <StatRow label="Service Level" value={rec.serviceLevel} sample />
        </Section>
      )}

      {sub === "supported-relationship-types" && (
        <Section title="Supported relationship types">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {RELATIONSHIP_TYPES.map((rt) => (
              <span
                key={rt}
                style={{
                  fontSize: 11.5,
                  padding: "4px 10px",
                  borderRadius: 99,
                  border: `1px solid ${T.border}`,
                  color: rt === rec.relationshipType ? T.accent : T.textMuted,
                  background:
                    rt === rec.relationshipType
                      ? "var(--cg-accent-bg-strong)"
                      : "transparent",
                }}
              >
                {rt}
              </span>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

// ── Impact Analysis (spec §Impact Analysis) ──
const IMPACT_SUBS = [
  { id: "predicted-operational-impact", label: "Predicted operational impact" },
  { id: "impact-propagation", label: "Impact propagation" },
];
function ImpactTab({ rec }: { rec: DependencyRecord }) {
  const [sub, setSub] = React.useState("predicted-operational-impact");
  const impactTone = (v: string) =>
    v === "High" || v === "Severe" || v === "Major"
      ? "danger"
      : v === "Moderate"
        ? "warn"
        : "ok";
  return (
    <>
      <Tabs tabs={IMPACT_SUBS} active={sub} onChange={setSub} />
      {sub === "predicted-operational-impact" && (
        <Section title="Predicted operational impact" sample>
          <StatRow
            label="Affected Workspaces"
            value={rec.affectedWorkspaces}
            sample
          />
          <StatRow
            label="Affected Users"
            value={rec.affectedUsers.toLocaleString()}
            sample
          />
          <StatRow
            label="Affected Services"
            value={rec.affectedServices}
            sample
          />
          <StatRow
            label="Compliance Impact"
            value={rec.complianceImpact}
            tone={impactTone(rec.complianceImpact)}
            sample
          />
          <StatRow
            label="Security Impact"
            value={rec.securityImpact}
            tone={impactTone(rec.securityImpact)}
            sample
          />
          <StatRow
            label="Business Impact"
            value={rec.businessImpact}
            tone={impactTone(rec.businessImpact)}
            sample
          />
          <StatRow
            label="Estimated Downtime"
            value={`${rec.estDowntimeMin} min`}
            sample
          />
          <StatRow
            label="Recovery Priority"
            value={rec.recoveryPriority}
            tone={rec.recoveryPriority === "P1" ? "danger" : "warn"}
            sample
          />
        </Section>
      )}

      {sub === "impact-propagation" && (
        <Section title="Impact propagation" sample>
          <FlowChain
            nodes={[
              "Dependency Failure",
              `Affected Workspace (${rec.consumer})`,
              "Affected Services",
              `Business Impact (${rec.businessImpact})`,
            ]}
          />
        </Section>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <HeaderButton variant="primary" icon={<Waypoints size={13} />}>
          Run Analysis
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export Report</HeaderButton>
      </div>
    </>
  );
}

// ── Health (spec §Health) ──
const HEALTH_SUBS = [
  { id: "operational-health", label: "Operational health" },
  { id: "health-states", label: "Health states" },
];
function HealthTab({ rec }: { rec: DependencyRecord }) {
  const [sub, setSub] = React.useState("operational-health");
  return (
    <>
      <Tabs tabs={HEALTH_SUBS} active={sub} onChange={setSub} />
      {sub === "operational-health" && (
        <Section title="Operational health" sample>
          <StatRow
            label="Availability"
            value={`${rec.availability.toFixed(2)}%`}
            tone={rec.availability >= 99.9 ? "ok" : "warn"}
            sample
          />
          <StatRow label="Latency" value={`${rec.latencyMs} ms`} sample />
          <StatRow
            label="Response Time"
            value={`${rec.responseTimeMs} ms`}
            sample
          />
          <StatRow
            label="Failures"
            value={rec.failures}
            tone={
              rec.failures > 6 ? "danger" : rec.failures > 0 ? "warn" : "ok"
            }
            sample
          />
          <StatRow label="Retries" value={rec.retries} sample />
          <StatRow label="SLA" value={rec.sla} sample />
          <StatRow
            label="Current Status"
            value={<HealthBadge health={rec.health} />}
            sample
          />
        </Section>
      )}

      {sub === "health-states" && (
        <Section title="Health states">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {HEALTH_STATES.map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 11.5,
                  padding: "4px 10px",
                  borderRadius: 99,
                  border: `1px solid ${h === rec.health ? HEALTH_TONE[h] : T.border}`,
                  color: HEALTH_TONE[h],
                  fontWeight: h === rec.health ? 600 : 400,
                }}
              >
                {h}
              </span>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

// ── Monitoring (spec §Monitoring) ──
function MonitoringTab({ rec }: { rec: DependencyRecord }) {
  return (
    <>
      <Section title="Monitoring configuration" sample>
        <StatRow
          label="Health Checks"
          value="HTTP probe · TCP probe · Synthetic"
          sample
        />
        <StatRow
          label="Monitoring Frequency"
          value={`Every ${rec.monitoringFrequency}`}
          sample
        />
        <StatRow
          label="Alert Thresholds"
          value="Latency > 250 ms · Failures > 5/min"
          sample
        />
        <StatRow
          label="Notification Policies"
          value="Email · Slack · PagerDuty"
          sample
        />
        <StatRow
          label="Escalation Policy"
          value={`${rec.recoveryPriority} · On-call rotation`}
          sample
        />
      </Section>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <HeaderButton icon={<Gauge size={13} />}>
          Configure Monitoring
        </HeaderButton>
        <HeaderButton icon={<BellRing size={13} />}>
          Test Health Check
        </HeaderButton>
      </div>
    </>
  );
}

// ── Change Management (spec §Change Management) ──
function ChangeTab({ rec }: { rec: DependencyRecord }) {
  const n = hashId(rec.id);
  return (
    <>
      <Section title="Change management" sample>
        <StatRow
          label="Maintenance Windows"
          value={`Sun 02:00–04:00 UTC · ${1 + (n % 3)} scheduled`}
          sample
        />
        <StatRow
          label="Version Changes"
          value={`v${1 + (n % 4)}.${n % 9} → v${1 + (n % 4)}.${(n % 9) + 1}`}
          sample
        />
        <StatRow
          label="Migration Plans"
          value={n % 2 === 0 ? "1 active" : "None"}
          sample
        />
        <StatRow label="Upcoming Changes" value={`${n % 3} planned`} sample />
        <StatRow
          label="Approval History"
          value={`${2 + (n % 5)} approvals`}
          sample
        />
      </Section>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <HeaderButton icon={<Wrench size={13} />}>Schedule Change</HeaderButton>
        <HeaderButton icon={<BellRing size={13} />}>
          Notify Consumers
        </HeaderButton>
      </div>
    </>
  );
}

// ── Activity timeline (spec §Activity) ──
function ActivityTab() {
  const events = [
    "Dependency Created",
    "Dependency Updated",
    "Health Changed",
    "Incident Triggered",
    "Maintenance Scheduled",
    "Dependency Removed",
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
            { value: "", label: "All actors" },
            ...OWNERS.map((o) => ({ value: o, label: o })),
          ]}
        />
        <Select
          label="Action"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "All actions" },
            ...events.map((e) => ({ value: e, label: e })),
          ]}
        />
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "All time" },
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
              {pick(OWNERS, i)} ·{" "}
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
    "Dependency Created",
    "Dependency Modified",
    "Impact Analysis Executed",
    "Health Policy Updated",
    "Monitoring Updated",
    "Dependency Removed",
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

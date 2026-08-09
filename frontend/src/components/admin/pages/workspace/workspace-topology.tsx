/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Hierarchy & Relationships → Workspace Topology */
import React from "react";
import { useNavigate } from "react-router";
import {
  Network,
  Download,
  LayoutGrid,
  ShieldCheck,
  Boxes,
  Activity as ActivityIcon,
  History,
  Route,
  Share2,
  HeartPulse,
  Scale,
  Maximize2,
  Minimize2,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Map as MapIcon,
  RotateCcw,
  Wand2,
  Search as SearchIcon,
  Target,
  ClipboardCheck,
  Camera,
  ExternalLink,
  Link2,
} from "lucide-react";
import {
  Page,
  Tabs,
  PageHeader,
  StatRow,
  KVGrid,
  HeaderButton,
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
 * Workspace Topology — the enterprise operational map of every workspace and its relationships
 * across the platform. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/03_Hierarchy & Relationships/workspace_topology.md.
 *
 * Answers "How is this workspace connected to the rest of the enterprise?" by consolidating
 * organizational structure, operational dependencies, cloud infrastructure, AI services, governance,
 * compliance and shared services into a single interactive model. The module is read-mostly:
 * relationships are managed in their respective modules (Organization Hierarchy, Parent/Child,
 * Dependencies, Workspace Relationships, Shared Service Workspaces) and only VISUALIZED here.
 *
 * Reuses the Enterprise-Administration UX pattern shared with the Users module (Banner · Topology
 * Toolbar · Filters · Search · Interactive Graph · Node Inspector · Bulk Operations · Export). The
 * eleven topology views are the second-level sub-navigation, rendered as the first FilterBar facet
 * (`Select label="View"`). Topology/graph is drawn as an indented tree + node→node flow inside a
 * Card (no graph library).
 *
 * There is no topology backend yet, so the node set is representative sample data (tagged `Sample`
 * in the UI). When the graph aggregation service lands, swap SAMPLE_NODES for the live query — the
 * component API stays identical.
 */

const ME = "You (current admin)";

// ── Faceted domains (spec §Filters) ────────────────────────────────────────────────────────────────
const BUSINESS_UNITS = ["Finance", "Platform", "Operations", "Retail", "Data"];
const DEPARTMENTS = [
  "Payments",
  "Treasury",
  "Fraud",
  "Identity",
  "Security",
  "SOC",
  "Monitoring",
  "Logging",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const REGIONS = [
  "us-east-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
  "ap-south-1",
];
const CLOUD_PROVIDERS = ["AWS", "Azure", "GCP", "Multi-cloud"];
const WS_TYPES = ["Enterprise", "Department", "Project", "Shared Service"];
const RELATIONSHIP_TYPES = [
  "Hierarchy",
  "Dependency",
  "Shared Service",
  "Operational",
  "Business",
  "Security",
  "Compliance",
  "AI",
  "Cloud",
  "Integration",
];
const COMPLIANCE_PROGRAMS = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
];
const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];
const HEALTH_STATES = ["Healthy", "Warning", "Degraded", "Critical", "Offline"];

const SHARED_SERVICE_TYPES = [
  "Identity",
  "Logging",
  "Monitoring",
  "AI Platform",
  "Knowledge",
  "Storage",
  "Security",
  "Networking",
  "Secrets",
];
const OWNERS = [ME, "John Smith", "Priya Nair", "Marco Rossi", "Sara Ahmed"];
const EXECS = [
  "CFO — R. Alvarez",
  "CTO — L. Zhang",
  "CISO — M. Osei",
  "COO — D. Novak",
];
const LIFECYCLES = ["Active", "Provisioning", "Maintenance", "Archived"];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

type HealthState = (typeof HEALTH_STATES)[number];

interface TopologyNode {
  id: string;
  workspace: string;
  businessUnit: string;
  department: string;
  environment: string;
  region: string;
  cloudProvider: string;
  workspaceType: string;
  relationshipType: string;
  complianceProgram: string;
  riskLevel: string;
  healthStatus: HealthState;
  owner: string;
  businessOwner: string;
  executiveOwner: string;
  lifecycle: string;
  parent: string;
  children: string[];
  businessLinks: string[];
  crossLinks: string[];
  externalConnections: string[];
  sharedServices: string[];
  depsIncoming: number;
  depsOutgoing: number;
  depsCritical: number;
  depsExternal: number;
  connections: number;
  awsAccounts: number;
  azureSubs: number;
  gcpProjects: number;
  clusters: number;
  aiProviders: number;
  knowledgeBases: number;
  integrations: number;
  secrets: number;
  topologyScore: number;
  incidents: number;
  maintenance: number;
}

// ── Deterministic representative topology (spec example: Enterprise → BU → workspaces) ─────────────
const SAMPLE_NODES: TopologyNode[] = Array.from({ length: 14 }, (_, i) => {
  const id = `WS-${(1000 + i * 11).toString().padStart(5, "0")}`;
  const n = hashId(id);
  const bu = pick(BUSINESS_UNITS, n);
  const dept = pick(DEPARTMENTS, n >> 1);
  const children =
    n % 3 === 0
      ? [
          pick(DEPARTMENTS, n + 1),
          pick(DEPARTMENTS, n + 2),
          pick(DEPARTMENTS, n + 3),
        ]
      : n % 3 === 1
        ? [pick(DEPARTMENTS, n + 1), pick(DEPARTMENTS, n + 2)]
        : [];
  return {
    id,
    workspace: `${bu} · ${dept}`,
    businessUnit: bu,
    department: dept,
    environment: pick(ENVIRONMENTS, n >> 2),
    region: pick(REGIONS, n >> 3),
    cloudProvider: pick(CLOUD_PROVIDERS, n),
    workspaceType: pick(WS_TYPES, n >> 1),
    relationshipType: pick(RELATIONSHIP_TYPES, n),
    complianceProgram: pick(COMPLIANCE_PROGRAMS, n),
    riskLevel: pick(RISK_LEVELS, n >> 2),
    healthStatus: pick<HealthState>(HEALTH_STATES, n),
    owner: pick(OWNERS, n),
    businessOwner: pick(OWNERS.slice(1), n + 1),
    executiveOwner: pick(EXECS, n),
    lifecycle: pick(LIFECYCLES, n >> 1),
    parent: `Enterprise · ${bu}`,
    children,
    businessLinks: [pick(BUSINESS_UNITS, n + 1), pick(BUSINESS_UNITS, n + 2)],
    crossLinks: [pick(DEPARTMENTS, n + 4), pick(DEPARTMENTS, n + 5)],
    externalConnections: [
      pick(["Stripe", "Okta", "Datadog", "Snowflake", "PagerDuty"], n),
      pick(["Stripe", "Okta", "Datadog", "Snowflake", "PagerDuty"], n + 2),
    ],
    sharedServices: Array.from(
      new Set([
        pick(SHARED_SERVICE_TYPES, n),
        pick(SHARED_SERVICE_TYPES, n + 1),
        pick(SHARED_SERVICE_TYPES, n + 2),
        pick(SHARED_SERVICE_TYPES, n + 3),
      ]),
    ),
    depsIncoming: 1 + (n % 9),
    depsOutgoing: 1 + ((n >> 1) % 8),
    depsCritical: n % 4,
    depsExternal: n % 5,
    connections: 4 + (n % 22),
    awsAccounts: n % 4,
    azureSubs: (n >> 1) % 3,
    gcpProjects: (n >> 2) % 3,
    clusters: 1 + (n % 5),
    aiProviders: n % 3,
    knowledgeBases: n % 4,
    integrations: 2 + (n % 7),
    secrets: 3 + (n % 20),
    topologyScore: 62 + (n % 38),
    incidents: n % 3,
    maintenance: n % 2,
  };
});

const RISK_TONE: Record<string, string> = {
  Critical: T.danger,
  High: T.warning,
  Medium: T.textNav,
  Low: T.textMuted,
};
const HEALTH_TONE: Record<HealthState, string> = {
  Healthy: T.success,
  Warning: T.warning,
  Degraded: T.warning,
  Critical: T.danger,
  Offline: T.textMuted,
};

function StatusBadge({ status }: { status: HealthState }) {
  const c = HEALTH_TONE[status];
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

// ── Chips — legend rows for node types / relationship types / shared services ─────────────────────
function ChipRow({ items, sample }: { items: string[]; sample?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        padding: "8px 0",
      }}
    >
      {items.map((it) => (
        <span
          key={it}
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 24,
            padding: "0 10px",
            borderRadius: 99,
            border: `1px solid ${T.border}`,
            background: "var(--cg-bg-badge)",
            color: T.textNav,
            fontSize: 12,
          }}
        >
          {it}
        </span>
      ))}
      {sample && <SampleTag />}
    </div>
  );
}

/**
 * Embeddable body — View sub-navigation + operational dashboard + view-specific topology
 * visualization + node directory + node inspector drawer, WITHOUT the outer <Page> / banner.
 * Rendered both as the standalone route and as a tab of the Workspace Management console. Uses local
 * state for the View sub-nav so it never collides with a host page's `?tab=`.
 */
export function WorkspaceTopologyView() {
  const navigate = useNavigate();

  const [search, setSearch] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fRegion, setFRegion] = React.useState("");
  const [fCloud, setFCloud] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fRel, setFRel] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [fRisk, setFRisk] = React.useState("");
  const [fHealth, setFHealth] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_NODES;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.complianceProgram.toLowerCase().includes(q) ||
        r.sharedServices.join(" ").toLowerCase().includes(q)) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fEnv || r.environment === fEnv) &&
      (!fRegion || r.region === fRegion) &&
      (!fCloud || r.cloudProvider === fCloud) &&
      (!fType || r.workspaceType === fType) &&
      (!fRel || r.relationshipType === fRel) &&
      (!fCompliance || r.complianceProgram === fCompliance) &&
      (!fRisk || r.riskLevel === fRisk) &&
      (!fHealth || r.healthStatus === fHealth)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFBu("");
    setFEnv("");
    setFRegion("");
    setFCloud("");
    setFType("");
    setFRel("");
    setFCompliance("");
    setFRisk("");
    setFHealth("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Topology Toolbar (spec §Toolbar: View Controls · Visualization · Analysis) ──
  const toolbar: CommandItem[] = [
    {
      key: "expand",
      label: "Expand All",
      icon: <Maximize2 size={15} />,
      disabled: true,
    },
    {
      key: "collapse",
      label: "Collapse All",
      icon: <Minimize2 size={15} />,
      disabled: true,
    },
    {
      key: "center",
      label: "Center View",
      icon: <Crosshair size={15} />,
      disabled: true,
    },
    {
      key: "zoomin",
      label: "Zoom In",
      icon: <ZoomIn size={15} />,
      disabled: true,
    },
    {
      key: "zoomout",
      label: "Zoom Out",
      icon: <ZoomOut size={15} />,
      disabled: true,
    },
    {
      key: "minimap",
      label: "Mini Map",
      icon: <MapIcon size={15} />,
      disabled: true,
    },
    {
      key: "reset",
      label: "Reset Layout",
      icon: <RotateCcw size={15} />,
      disabled: true,
    },
    {
      key: "auto",
      label: "Auto Layout",
      icon: <Wand2 size={15} />,
      disabled: true,
    },
    {
      key: "impact",
      label: "Impact Analysis",
      icon: <Target size={15} />,
      disabled: true,
    },
    {
      key: "depanalysis",
      label: "Dependency Analysis",
      icon: <Route size={15} />,
      disabled: true,
    },
    {
      key: "pathfinder",
      label: "Path Finder",
      icon: <SearchIcon size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Topology Validation",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "exportdiagram",
      label: "Export Diagram",
      icon: <Download size={15} />,
      disabled: true,
    },
    {
      key: "snapshot",
      label: "Snapshot",
      icon: <Camera size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<TopologyNode>[] = [
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
      key: "bu",
      header: "Business Unit",
      sortValue: (r) => r.businessUnit,
      render: (r) => r.businessUnit,
    },
    {
      key: "env",
      header: "Environment",
      sortValue: (r) => r.environment,
      render: (r) => r.environment,
    },
    {
      key: "region",
      header: "Region",
      sortValue: (r) => r.region,
      render: (r) => r.region,
    },
    {
      key: "cloud",
      header: "Cloud Provider",
      sortValue: (r) => r.cloudProvider,
      render: (r) => r.cloudProvider,
    },
    {
      key: "type",
      header: "Workspace Type",
      sortValue: (r) => r.workspaceType,
      render: (r) => r.workspaceType,
    },
    {
      key: "rel",
      header: "Relationship Type",
      sortValue: (r) => r.relationshipType,
      render: (r) => r.relationshipType,
    },
    {
      key: "connections",
      header: "Connections",
      sortValue: (r) => r.connections,
      render: (r) => r.connections,
    },
    {
      key: "deps",
      header: "Dependencies",
      sortValue: (r) => r.depsIncoming + r.depsOutgoing,
      render: (r) => `${r.depsIncoming} in / ${r.depsOutgoing} out`,
    },
    {
      key: "compliance",
      header: "Compliance",
      sortValue: (r) => r.complianceProgram,
      render: (r) => r.complianceProgram,
    },
    {
      key: "risk",
      header: "Risk Level",
      sortValue: (r) => RISK_LEVELS.indexOf(r.riskLevel),
      render: (r) => (
        <span style={{ color: RISK_TONE[r.riskLevel] }}>{r.riskLevel}</span>
      ),
    },
    {
      key: "health",
      header: "Health Status",
      sortValue: (r) => HEALTH_STATES.indexOf(r.healthStatus),
      render: (r) => <StatusBadge status={r.healthStatus} />,
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
        Operational Dashboard <SampleTag />
      </div>
      <StatStripPlain
        items={[
          { label: "Total Workspaces", value: records.length, tone: "ok" },
          {
            label: "Business Units",
            value: new Set(records.map((r) => r.businessUnit)).size,
          },
          {
            label: "Shared Services",
            value: new Set(records.flatMap((r) => r.sharedServices)).size,
          },
          {
            label: "Dependencies",
            value: records.reduce(
              (a, r) => a + r.depsIncoming + r.depsOutgoing,
              0,
            ),
          },
          {
            label: "Cloud Resources",
            value: records.reduce(
              (a, r) =>
                a + r.awsAccounts + r.azureSubs + r.gcpProjects + r.clusters,
              0,
            ),
          },
          {
            label: "Connected AI Platforms",
            value: records.reduce((a, r) => a + r.aiProviders, 0),
          },
          {
            label: "Compliance Coverage",
            value: `${Math.round(
              (records.filter((r) => r.complianceProgram).length /
                records.length) *
                100,
            )}%`,
            tone: "ok",
          },
          {
            label: "Critical Paths",
            value: records.reduce((a, r) => a + r.depsCritical, 0),
            tone: "warn",
          },
          {
            label: "Topology Health",
            value: `${Math.round(records.reduce((a, r) => a + r.topologyScore, 0) / records.length)}%`,
            tone: "ok",
          },
        ]}
      />

      <DiscoveryListView
        title="Topology nodes"
        commands={toolbar}
        pills={[
          {
            key: "bu",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "env",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "region",
            label: "Region",
            value: fRegion,
            onChange: setFRegion,
            options: facet(records.map((r) => r.region)),
          },
          {
            key: "cloud",
            label: "Cloud Provider",
            value: fCloud,
            onChange: setFCloud,
            options: facet(records.map((r) => r.cloudProvider)),
          },
          {
            key: "type",
            label: "Workspace Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.workspaceType)),
          },
          {
            key: "rel",
            label: "Relationship Type",
            value: fRel,
            onChange: setFRel,
            options: facet(records.map((r) => r.relationshipType)),
          },
          {
            key: "compliance",
            label: "Compliance Program",
            value: fCompliance,
            onChange: setFCompliance,
            options: facet(records.map((r) => r.complianceProgram)),
          },
          {
            key: "risk",
            label: "Risk Level",
            value: fRisk,
            onChange: setFRisk,
            options: facet(records.map((r) => r.riskLevel)),
          },
          {
            key: "health",
            label: "Health Status",
            value: fHealth,
            onChange: setFHealth,
            options: facet(records.map((r) => r.healthStatus)),
          },
        ]}
        presets={[{ label: "All nodes", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search workspace topology — workspace, business unit, cloud account, cluster, shared service, AI runtime, compliance program, owner…"
        count={rows.length}
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={14}
        initialSort={{ key: "workspace", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Target size={13} />} onClick={clear}>
              Impact Analysis ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<Route size={13} />} onClick={clear}>
              Dependency Analysis
            </HeaderButton>
            <HeaderButton icon={<Camera size={13} />} onClick={clear}>
              Snapshot
            </HeaderButton>
            <HeaderButton icon={<Download size={13} />} onClick={clear}>
              Export Diagram
            </HeaderButton>
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "Open Node Inspector", onClick: () => setSelId(r.id) },
              {
                label: "Open Workspace",
                onClick: () => navigate("/admin/workspaces"),
              },
              { label: "Run Impact Analysis", onClick: () => setSelId(r.id) },
              { label: "View Relationships", onClick: () => setSelId(r.id) },
              { label: "Dependency Path", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Network size={20} />}
            title="No workspace topology available."
            hint="Import an organization, create a workspace, or build relationships to populate the enterprise topology."
            cta="Create Workspace"
            onCta={() => navigate("/admin/workspaces")}
          />
        }
      />

      {sel && <NodeInspectorDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function WorkspaceTopologyPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Workspace Topology"
        subtitle="Visualize how enterprise workspaces, shared services, cloud resources, AI platforms, governance domains, and operational dependencies connect across the organization."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton icon={<Download size={14} />}>
              Export Diagram
            </HeaderButton>
            <HeaderButton
              variant="primary"
              icon={<Camera size={14} />}
              onClick={() => navigate("/admin/workspaces")}
            >
              Snapshot
            </HeaderButton>
          </>
        }
      />
      <WorkspaceTopologyView />
    </Page>
  );
}

// ════════════ Node Inspector Drawer — 9 sub-tabs (spec §Node Inspector) ════════════════════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "connections", label: "Connections", icon: <Link2 size={13} /> },
  { id: "dependencies", label: "Dependencies", icon: <Route size={13} /> },
  { id: "services", label: "Shared Services", icon: <Share2 size={13} /> },
  { id: "governance", label: "Governance", icon: <Scale size={13} /> },
  { id: "resources", label: "Resources", icon: <Boxes size={13} /> },
  { id: "health", label: "Health", icon: <HeartPulse size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit", icon: <History size={13} /> },
];

function NodeInspectorDrawer({
  rec,
  onClose,
}: {
  rec: TopologyNode;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.id} · ${rec.workspace}`}
      subtitle={`${rec.environment} · ${rec.businessUnit} · Owner: ${rec.owner} · ${rec.lifecycle} · ${rec.healthStatus}`}
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
          <HeaderButton
            icon={<ExternalLink size={13} />}
            onClick={() => navigate("/admin/workspaces")}
          >
            Open Workspace
          </HeaderButton>
          <HeaderButton icon={<Route size={13} />}>
            View Relationships
          </HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton variant="primary" icon={<Target size={13} />}>
            Run Impact Analysis
          </HeaderButton>
        </div>
      }
    >
      {/* Drawer Header quick summary (spec §Drawer Header) */}
      <KVGrid
        cols={3}
        items={[
          { k: "Workspace", v: rec.workspace },
          { k: "Environment", v: rec.environment },
          { k: "Business Unit", v: rec.businessUnit },
          { k: "Owner", v: rec.owner, sample: true },
          { k: "Status", v: rec.lifecycle, sample: true },
          {
            k: "Health",
            v: <StatusBadge status={rec.healthStatus} />,
            sample: true,
          },
        ]}
      />
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "connections" && <ConnectionsTab rec={rec} />}
      {tab === "dependencies" && <DependenciesTab rec={rec} />}
      {tab === "services" && <ServicesTab rec={rec} />}
      {tab === "governance" && <GovernanceTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
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

// ── Overview (spec §Overview) ──
function OverviewTab({ rec }: { rec: TopologyNode }) {
  return (
    <Section title="Overview" sample>
      <KVGrid
        items={[
          { k: "Workspace", v: rec.workspace },
          { k: "Business Unit", v: rec.businessUnit },
          { k: "Environment", v: rec.environment },
          { k: "Owner", v: rec.owner, sample: true },
          {
            k: "Cloud Scope",
            v: `${rec.cloudProvider} · ${rec.region}`,
            sample: true,
          },
          { k: "Compliance Programs", v: rec.complianceProgram, sample: true },
          {
            k: "Risk Level",
            v: (
              <span style={{ color: RISK_TONE[rec.riskLevel] }}>
                {rec.riskLevel}
              </span>
            ),
            sample: true,
          },
          { k: "Lifecycle", v: rec.lifecycle, sample: true },
        ]}
      />
    </Section>
  );
}

// ── Connections (spec §Connections) ──
const CONNECTIONS_SUBS = [
  { id: "relationship-map", label: "Relationship map" },
  { id: "parent", label: "Parent" },
  { id: "children", label: "Children" },
  { id: "business-relationships", label: "Business Relationships" },
  { id: "dependencies", label: "Dependencies" },
  { id: "shared-services", label: "Shared Services" },
  { id: "cross-workspace-links", label: "Cross Workspace Links" },
  { id: "external-connections", label: "External Connections" },
];
function ConnectionsTab({ rec }: { rec: TopologyNode }) {
  const [sub, setSub] = React.useState("relationship-map");
  return (
    <>
      <Tabs tabs={CONNECTIONS_SUBS} active={sub} onChange={setSub} />

      {sub === "parent" && (
        <Section title="Parent" sample>
          <StatRow label="Parent" value={rec.parent} sample />
        </Section>
      )}

      {sub === "business-relationships" && (
        <Section title="Business Relationships" sample>
          <ChipRow items={rec.businessLinks} />
        </Section>
      )}
      {sub === "dependencies" && (
        <Section title="Dependencies" sample>
          <StatRow
            label="Total dependencies"
            value={rec.depsIncoming + rec.depsOutgoing}
            sample
          />
        </Section>
      )}
      {sub === "shared-services" && (
        <Section title="Shared Services" sample>
          <ChipRow items={rec.sharedServices} />
        </Section>
      )}
      {sub === "cross-workspace-links" && (
        <Section title="Cross Workspace Links" sample>
          <ChipRow items={rec.crossLinks} />
        </Section>
      )}
      {sub === "external-connections" && (
        <Section title="External Connections" sample>
          <ChipRow items={rec.externalConnections} />
        </Section>
      )}
    </>
  );
}

// ── Dependencies (spec §Dependencies) ──
const DEPENDENCIES_SUBS = [
  { id: "dependency-inventory", label: "Dependency inventory" },
  { id: "critical-path", label: "Critical path" },
  { id: "supports", label: "Supports" },
];
function DependenciesTab({ rec }: { rec: TopologyNode }) {
  const [sub, setSub] = React.useState("dependency-inventory");
  return (
    <>
      <Tabs tabs={DEPENDENCIES_SUBS} active={sub} onChange={setSub} />
      {sub === "dependency-inventory" && (
        <Section title="Dependency inventory" sample>
          <StatRow label="Incoming" value={rec.depsIncoming} sample />
          <StatRow label="Outgoing" value={rec.depsOutgoing} sample />
          <StatRow
            label="Critical"
            value={rec.depsCritical}
            tone={rec.depsCritical ? "warn" : "ok"}
            sample
          />
          <StatRow label="External" value={rec.depsExternal} sample />
          <StatRow
            label="Runtime"
            value={Math.max(0, rec.depsOutgoing - rec.depsExternal)}
            sample
          />
          <StatRow
            label="Infrastructure"
            value={rec.clusters + rec.awsAccounts}
            sample
          />
        </Section>
      )}

      {sub === "supports" && (
        <Section title="Supports" sample>
          <ChipRow
            items={["Failure Simulation", "Dependency Path", "Critical Path"]}
          />
        </Section>
      )}
    </>
  );
}

// ── Shared Services (spec §Shared Services) ──
function ServicesTab({ rec }: { rec: TopologyNode }) {
  return (
    <Section title="Consumed shared services" sample>
      {SHARED_SERVICE_TYPES.map((s) => (
        <StatRow
          key={s}
          label={s}
          value={rec.sharedServices.includes(s) ? "Connected" : "Not connected"}
          tone={rec.sharedServices.includes(s) ? "ok" : "muted"}
          sample
        />
      ))}
    </Section>
  );
}

// ── Governance (spec §Governance) ──
function GovernanceTab({ rec }: { rec: TopologyNode }) {
  return (
    <Section title="Governance" sample>
      <StatRow label="Inherited Policies" value={`From ${rec.parent}`} sample />
      <StatRow
        label="Overrides"
        value={`${hashId(rec.id) % 4} at this scope`}
        sample
      />
      <StatRow
        label="Compliance"
        value={rec.complianceProgram}
        tone="ok"
        sample
      />
      <StatRow label="Business Ownership" value={rec.businessOwner} sample />
      <StatRow
        label="Approval Chains"
        value="Business → Security → Compliance → Operations"
        sample
      />
      <StatRow
        label="Security Policies"
        value={`${rec.relationshipType} zone`}
        sample
      />
      <StatRow
        label="Administrative Scope"
        value={`${rec.businessUnit} delegated admins`}
        sample
      />
    </Section>
  );
}

// ── Resources (spec §Resources) ──
function ResourcesTab({ rec }: { rec: TopologyNode }) {
  return (
    <Section title="Cloud & platform resources" sample>
      <StatRow label="AWS Accounts" value={rec.awsAccounts} sample />
      <StatRow label="Azure Subscriptions" value={rec.azureSubs} sample />
      <StatRow label="GCP Projects" value={rec.gcpProjects} sample />
      <StatRow label="Kubernetes Clusters" value={rec.clusters} sample />
      <StatRow
        label="Storage"
        value={`${1 + (hashId(rec.id) % 12)} buckets`}
        sample
      />
      <StatRow label="Databases" value={`${hashId(rec.id) % 8}`} sample />
      <StatRow label="AI Providers" value={rec.aiProviders} sample />
      <StatRow label="Integrations" value={rec.integrations} sample />
      <StatRow label="Secrets" value={rec.secrets} sample />
    </Section>
  );
}

// ── Health (spec §Health) ──
const HEALTH_SUBS = [
  { id: "health", label: "Health" },
  { id: "health-states", label: "Health states" },
];
function HealthTab({ rec }: { rec: TopologyNode }) {
  const [sub, setSub] = React.useState("health");
  return (
    <>
      <Tabs tabs={HEALTH_SUBS} active={sub} onChange={setSub} />
      {sub === "health" && (
        <Section title="Health" sample>
          <StatRow
            label="Overall Health"
            value={<StatusBadge status={rec.healthStatus} />}
            sample
          />
          <StatRow
            label="Connected Services"
            value={`${rec.sharedServices.length} services`}
            tone="ok"
            sample
          />
          <StatRow
            label="Dependency Health"
            value={rec.depsCritical ? "At risk" : "Nominal"}
            tone={rec.depsCritical ? "warn" : "ok"}
            sample
          />
          <StatRow label="Operational Status" value={rec.lifecycle} sample />
          <StatRow
            label="Incidents"
            value={rec.incidents}
            tone={rec.incidents ? "danger" : "ok"}
            sample
          />
          <StatRow
            label="Maintenance"
            value={rec.maintenance ? "Scheduled" : "None"}
            sample
          />
        </Section>
      )}
      {sub === "health-states" && (
        <Section title="Health states" sample>
          <ChipRow items={HEALTH_STATES} />
        </Section>
      )}
    </>
  );
}

// ── Activity (spec §Activity) ──
function ActivityTab() {
  const events = [
    "Workspace Created",
    "Relationship Added",
    "Dependency Changed",
    "Shared Service Added",
    "Governance Updated",
    "Cloud Resources Added",
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
        Workspace activity timeline <SampleTag />
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
              {pick(OWNERS.slice(1), i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Audit (spec §Audit — immutable) ──
function AuditTab() {
  const events = [
    "Topology Modified",
    "Workspace Moved",
    "Relationship Updated",
    "Dependency Updated",
    "Service Connected",
    "Hierarchy Changed",
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
          value={`${pick(OWNERS.slice(1), i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

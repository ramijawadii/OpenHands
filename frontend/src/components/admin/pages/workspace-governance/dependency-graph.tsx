/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Cross-Workspace Governance → Dependency Graph */
import React from "react";
import {
  Boxes,
  Cog,
  Database,
  Server,
  Cloud,
  Fingerprint,
  Bot,
  AppWindow,
  ExternalLink,
  RefreshCcw,
  Radar,
  AlertTriangle,
  Repeat,
  Download,
  LayoutGrid,
  ArrowDownToLine,
  ArrowUpFromLine,
  HeartPulse,
  UserSquare,
  ListChecks,
  History,
  ShieldCheck,
  Waypoints,
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
  ScopeBadge,
  PostureCard,
  PostureGrid,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";

/**
 * Dependency Graph — the authoritative operational relationship map of every dependency between
 * workspaces, cloud resources, shared assets, identities, applications, AI services, automation,
 * networking and enterprise services. Unlike Workspace Topology (structure), this visualizes operational
 * dependencies and blast radius: change/failure impact, discovery, risk and service mapping.
 * Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/04_Cross-Workspace Governance/dependency_graph.md.
 *
 * Enterprise Graph-Explorer UX pattern: KPI dashboard · layer controls · node directory (graph canvas
 * surrogate) · 8-tab side inspector. No graph backend yet → deterministic sample.
 */

type NodeType = "Workspace" | "Application" | "API" | "Database" | "Cluster" | "Cloud Account" | "Identity" | "AI Model" | "Automation" | "External System";
type DepType = "Operational" | "Network" | "Application" | "Identity" | "Storage" | "Security" | "Infrastructure" | "Data" | "AI";
type Health = "Healthy" | "Warning" | "Critical" | "Unknown";
type Criticality = "Critical" | "High" | "Medium" | "Low";

const NODE_ICON: Record<NodeType, React.ReactNode> = {
  Workspace: <Boxes size={14} />,
  Application: <AppWindow size={14} />,
  API: <Waypoints size={14} />,
  Database: <Database size={14} />,
  Cluster: <Server size={14} />,
  "Cloud Account": <Cloud size={14} />,
  Identity: <Fingerprint size={14} />,
  "AI Model": <Bot size={14} />,
  Automation: <Cog size={14} />,
  "External System": <ExternalLink size={14} />,
};
const NODE_TYPES = Object.keys(NODE_ICON) as NodeType[];
const DEP_TYPES: DepType[] = ["Operational", "Network", "Application", "Identity", "Storage", "Security", "Infrastructure", "Data", "AI"];
const PROVIDERS = ["AWS", "Azure", "GCP", "Kubernetes", "External"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Shared"];
const WORKSPACES = ["Payments", "Shared Services", "Retail Web", "Data Lake", "Identity", "Analytics"];
const BUSINESS_UNITS = ["Finance", "Engineering", "Operations", "Retail", "Corporate"];
const OWNERS = ["Platform Team", "Cloud Team", "Data Team", "Security Team", "SRE Team"];

const HEALTH_TONE: Record<Health, string> = { Healthy: T.success, Warning: T.warning, Critical: T.danger, Unknown: T.textMuted };
const CRIT_TONE: Record<Criticality, string> = { Critical: T.danger, High: T.warning, Medium: T.accent, Low: T.textMuted };
const CRIT_ORDER: Record<Criticality, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Node {
  id: string;
  name: string;
  type: NodeType;
  workspace: string;
  owner: string;
  environment: string;
  provider: string;
  depType: DepType;
  criticality: Criticality;
  health: Health;
  businessUnit: string;
  dependencies: number;
  dependents: number;
  availability: number;
  latency: number;
  errors: number;
  incidents: number;
  riskScore: number;
  circular: boolean;
}

const NODE_SEED: { name: string; type: NodeType }[] = [
  { name: "Payments Workspace", type: "Workspace" },
  { name: "Payments API", type: "API" },
  { name: "Orders Database", type: "Database" },
  { name: "Retail EKS Cluster", type: "Cluster" },
  { name: "Prod AWS Account", type: "Cloud Account" },
  { name: "Central Identity", type: "Identity" },
  { name: "Fraud Model", type: "AI Model" },
  { name: "ETL Pipeline", type: "Automation" },
  { name: "Checkout App", type: "Application" },
  { name: "Stripe", type: "External System" },
  { name: "Shared Services WS", type: "Workspace" },
  { name: "GraphQL Gateway", type: "API" },
  { name: "Analytics Warehouse", type: "Database" },
  { name: "Datadog", type: "External System" },
  { name: "Notification Service", type: "Application" },
];

const SAMPLE_NODES: Node[] = NODE_SEED.map(({ name, type }, i) => {
  const id = `ND-${(10000 + i * 37).toString()}`;
  const n = hashId(id + name);
  const criticality = pick<Criticality>(["Critical", "High", "High", "Medium", "Low"], n);
  const health = pick<Health>(["Healthy", "Healthy", "Healthy", "Warning", "Critical", "Unknown"], n);
  return {
    id,
    name,
    type,
    workspace: pick(WORKSPACES, n >> 1),
    owner: pick(OWNERS, n),
    environment: pick(ENVIRONMENTS, n >> 2),
    provider: pick(PROVIDERS, n >> 3),
    depType: pick(DEP_TYPES, n),
    criticality,
    health,
    businessUnit: pick(BUSINESS_UNITS, n),
    dependencies: 1 + (n % 12),
    dependents: n % 18,
    availability: 95 + (n % 5),
    latency: 5 + (n % 120),
    errors: n % 8,
    incidents: n % 4,
    riskScore: (criticality === "Critical" ? 40 : 10) + (n % 50),
    circular: n % 11 === 0,
  };
});

const LAYERS = ["Workspaces", "Applications", "Cloud Resources", "Kubernetes", "Networking", "Identity", "Databases", "AI", "Automation", "External"];

function HealthBadge({ health }: { health: Health }) {
  const c = HEALTH_TONE[health];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
      {health}
    </span>
  );
}
function CritBadge({ criticality }: { criticality: Criticality }) {
  const c = CRIT_TONE[criticality];
  return <span style={{ fontSize: 11.5, color: c }}>{criticality}</span>;
}

export function DependencyGraphView() {
  const [search, setSearch] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fDep, setFDep] = React.useState("");
  const [fCrit, setFCrit] = React.useState("");
  const [fHealth, setFHealth] = React.useState("");
  const [layers, setLayers] = React.useState<Set<string>>(new Set(LAYERS));
  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_NODES;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.name.toLowerCase().includes(q) || r.workspace.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)) &&
      (!fWs || r.workspace === fWs) &&
      (!fProvider || r.provider === fProvider) &&
      (!fType || r.type === fType) &&
      (!fDep || r.depType === fDep) &&
      (!fCrit || r.criticality === fCrit) &&
      (!fHealth || r.health === fHealth)
    );
  });
  const hasFilters = !!(search || fWs || fProvider || fType || fDep || fCrit || fHealth);
  const clearFilters = () => {
    setSearch("");
    setFWs("");
    setFProvider("");
    setFType("");
    setFDep("");
    setFCrit("");
    setFHealth("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [{ value: "", label: "All" }, ...Array.from(new Set(vals)).sort().map((v) => ({ value: v, label: v }))];
  const toggleLayer = (l: string) =>
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });

  const dependencies = records.reduce((a, r) => a + r.dependencies, 0);
  const connectedWorkspaces = new Set(records.map((r) => r.workspace)).size;
  const critical = records.filter((r) => r.criticality === "Critical").length;
  const circular = records.filter((r) => r.circular).length;
  const broken = records.filter((r) => r.health === "Critical").length;
  const healthy = records.filter((r) => r.health === "Healthy").length;
  const changes = records.reduce((a, r) => a + r.incidents, 0);
  const riskScore = Math.round(records.reduce((a, r) => a + r.riskScore, 0) / records.length);

  const toolbar: CommandItem[] = [
    { key: "refresh", label: "Refresh Graph", icon: <RefreshCcw size={15} />, onClick: () => setSelId(null) },
    { key: "impact", label: "Impact Analysis", icon: <Radar size={15} />, disabled: true },
    { key: "rootcause", label: "Root Cause Analysis", icon: <Radar size={15} />, disabled: true },
    { key: "validate", label: "Dependency Validation", icon: <ListChecks size={15} />, disabled: true },
    { key: "cycles", label: "Detect Cycles", icon: <Repeat size={15} />, onClick: () => setFCrit("") },
    { key: "blast", label: "Blast Radius", icon: <Radar size={15} />, disabled: true },
    { key: "health", label: "Health Check", icon: <HeartPulse size={15} />, disabled: true },
    { key: "export", label: "Export Graph", icon: <Download size={15} />, disabled: true },
  ];

  const cols: Column<Node>[] = [
    {
      key: "name",
      header: "Node",
      sortValue: (r) => r.name,
      render: (r) => (
        <span style={{ color: T.textPrimary, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: T.textMuted, display: "inline-flex" }}>{NODE_ICON[r.type]}</span>
          {r.name}
          {r.circular && <span style={{ fontSize: 10, color: T.danger, border: `1px solid ${T.danger}55`, borderRadius: 99, padding: "1px 6px" }}>cycle</span>}
        </span>
      ),
    },
    { key: "type", header: "Type", sortValue: (r) => r.type, render: (r) => r.type },
    { key: "workspace", header: "Workspace", sortValue: (r) => r.workspace, render: (r) => r.workspace },
    { key: "depType", header: "Dependency Type", sortValue: (r) => r.depType, render: (r) => r.depType },
    { key: "criticality", header: "Criticality", sortValue: (r) => CRIT_ORDER[r.criticality], render: (r) => <CritBadge criticality={r.criticality} /> },
    { key: "dependents", header: "Dependents", sortValue: (r) => r.dependents, render: (r) => r.dependents },
    { key: "health", header: "Health", sortValue: (r) => r.health, render: (r) => <HealthBadge health={r.health} /> },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard title="Dependencies" value={dependencies} tone="ok" sub={<>Mapped enterprise-wide <SampleTag /></>} />
        <PostureCard title="Connected Workspaces" value={connectedWorkspaces} tone="ok" sub={<>In the graph <SampleTag /></>} />
        <PostureCard title="Critical Dependencies" value={critical} tone={critical > 0 ? "warn" : "ok"} sub={<>On critical paths <SampleTag /></>} />
        <PostureCard title="Circular Dependencies" value={circular} tone={circular > 0 ? "danger" : "ok"} sub={<>Cycles detected <SampleTag /></>} />
        <PostureCard title="Broken Dependencies" value={broken} tone={broken > 0 ? "danger" : "ok"} sub={<>Failing edges <SampleTag /></>} />
        <PostureCard title="Healthy Dependencies" value={healthy} tone="ok" sub={<>Of {records.length} nodes <SampleTag /></>} />
        <PostureCard title="Dependency Changes" value={changes} tone="ok" sub={<>Recent changes <SampleTag /></>} />
        <PostureCard title="Risk Score" value={`${riskScore}/100`} tone={riskScore < 40 ? "ok" : "warn"} sub={<>Blast-radius risk <SampleTag /></>} />
      </PostureGrid>

      <Card
        title="Dependency graph"
        desc="Visualize and analyze operational dependencies between workspaces, cloud resources, enterprise services, applications, identities, AI systems and shared infrastructure — the authoritative graph for blast-radius and impact analysis."
        right={
          <span style={{ fontSize: 11.5, color: T.textMuted, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Waypoints size={13} /> {rows.length} nodes · {dependencies} edges
          </span>
        }
      >
        {/* Layer controls (graph-explorer layer toggles) */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 4px 12px" }}>
          {LAYERS.map((l) => {
            const on = layers.has(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => toggleLayer(l)}
                style={{
                  fontSize: 11.5,
                  color: on ? T.textPrimary : T.textMuted,
                  background: on ? T.badgeBg : "transparent",
                  border: `1px solid ${on ? T.borderStrong : T.border}`,
                  borderRadius: 99,
                  padding: "3px 10px",
                  cursor: "pointer",
                }}
              >
                {l}
              </button>
            );
          })}
        </div>

        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search graph — workspace, application, cloud resource, identity, API, database, cluster, service, shared asset, tag…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select label="Workspace" value={fWs} onChange={setFWs} options={facet(records.map((r) => r.workspace))} />
          <Select label="Cloud Provider" value={fProvider} onChange={setFProvider} options={facet(records.map((r) => r.provider))} />
          <Select label="Node Type" value={fType} onChange={setFType} options={facet(records.map((r) => r.type))} />
          <Select label="Dependency Type" value={fDep} onChange={setFDep} options={facet(records.map((r) => r.depType))} />
          <Select label="Criticality" value={fCrit} onChange={setFCrit} options={facet(records.map((r) => r.criticality))} />
          <Select label="Health" value={fHealth} onChange={setFHealth} options={facet(records.map((r) => r.health))} />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "criticality", dir: "asc" }}
          onRowClick={(r) => setSelId(r.id)}
          empty={
            <EmptyState
              icon={<Waypoints size={20} />}
              title="No dependencies have been discovered."
              hint="Run discovery to map operational dependencies between workspaces, resources and enterprise services."
              cta="Discover Dependencies"
              onCta={() => setSelId(null)}
            />
          }
        />
      </Card>

      {sel && <NodeDrawer node={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function DependencyGraphPage() {
  return (
    <Page>
      <PageHeader
        title="Dependency Graph"
        subtitle="Visualize and analyze operational dependencies between workspaces, cloud resources, enterprise services, applications, identities, AI systems, and shared infrastructure."
        actions={<ScopeBadge scope="Organization" />}
      />
      <DependencyGraphView />
    </Page>
  );
}

function Section({ title, children, sample }: { title: string; children: React.ReactNode; sample?: boolean }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
        {title}
        {sample && <SampleTag />}
      </div>
      {children}
    </div>
  );
}

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "dependencies", label: "Dependencies", icon: <ArrowDownToLine size={13} /> },
  { id: "dependents", label: "Dependents", icon: <ArrowUpFromLine size={13} /> },
  { id: "health", label: "Health", icon: <HeartPulse size={13} /> },
  { id: "ownership", label: "Ownership", icon: <UserSquare size={13} /> },
  { id: "policies", label: "Policies", icon: <ListChecks size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit", icon: <History size={13} /> },
];

function NodeDrawer({ node, onClose }: { node: Node; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={node.name}
      subtitle={`${node.type} · ${node.workspace} · ${node.criticality} · ${node.health}`}
      width={840}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
          <HeaderButton icon={<Radar size={13} />}>Impact Analysis</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>Export</HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab node={node} />}
      {tab === "dependencies" && <DependenciesTab node={node} />}
      {tab === "dependents" && <DependentsTab node={node} />}
      {tab === "health" && <HealthTab node={node} />}
      {tab === "ownership" && <OwnershipTab node={node} />}
      {tab === "policies" && <PoliciesTab />}
      {tab === "activity" && <ActivityTab node={node} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

function OverviewTab({ node }: { node: Node }) {
  return (
    <Section title="Node overview">
      <KVGrid
        items={[
          { k: "Name", v: node.name },
          { k: "Type", v: node.type },
          { k: "Workspace", v: node.workspace, sample: true },
          { k: "Owner", v: node.owner, sample: true },
          { k: "Environment", v: node.environment, sample: true },
          { k: "Provider", v: node.provider, sample: true },
          { k: "Status", v: node.health === "Healthy" ? "Operational" : "Attention" },
          { k: "Health", v: node.health },
          { k: "Criticality", v: node.criticality },
        ]}
      />
      {node.circular && (
        <div style={{ fontSize: 12.5, color: T.danger, paddingTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={14} /> Part of a circular dependency — review to break the cycle.
        </div>
      )}
    </Section>
  );
}

function DependenciesTab({ node }: { node: Node }) {
  const list = Array.from({ length: node.dependencies }, (_, i) => {
    const m = hashId(`${node.id}-dep-${i}`);
    return {
      id: `${node.id}-dep-${i}`,
      dependency: pick(NODE_SEED.map((s) => s.name), m),
      type: pick(DEP_TYPES, m),
      workspace: pick(WORKSPACES, m),
      criticality: pick<Criticality>(["Critical", "High", "Medium", "Low"], m),
      health: pick<Health>(["Healthy", "Healthy", "Warning", "Critical"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "dependency", header: "Dependency", render: (r) => r.dependency },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "criticality", header: "Criticality", render: (r) => <CritBadge criticality={r.criticality} /> },
    { key: "health", header: "Health", render: (r) => <HealthBadge health={r.health} /> },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Everything this node depends on. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function DependentsTab({ node }: { node: Node }) {
  if (!node.dependents) {
    return <EmptyState icon={<ArrowUpFromLine size={18} />} title="No dependents" hint="Nothing else in the graph depends on this node." />;
  }
  const list = Array.from({ length: node.dependents }, (_, i) => {
    const m = hashId(`${node.id}-dpt-${i}`);
    return {
      id: `${node.id}-dpt-${i}`,
      dependent: pick(NODE_SEED.map((s) => s.name), m),
      workspace: pick(WORKSPACES, m),
      type: pick(NODE_TYPES, m),
      criticality: pick<Criticality>(["Critical", "High", "Medium", "Low"], m),
      health: pick<Health>(["Healthy", "Healthy", "Warning"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "dependent", header: "Dependent", render: (r) => r.dependent },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "criticality", header: "Criticality", render: (r) => <CritBadge criticality={r.criticality} /> },
    { key: "health", header: "Health", render: (r) => <HealthBadge health={r.health} /> },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Resources depending on this node — its blast radius. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function HealthTab({ node }: { node: Node }) {
  return (
    <Section title="Health & operational status" sample>
      <StatRow label="Operational Status" value={<HealthBadge health={node.health} />} sample />
      <StatRow label="Availability" value={`${node.availability}%`} tone={node.availability >= 99 ? "ok" : "warn"} sample />
      <StatRow label="Latency" value={`${node.latency} ms`} sample />
      <StatRow label="Errors" value={node.errors} tone={node.errors > 0 ? "warn" : "ok"} sample />
      <StatRow label="Incidents" value={node.incidents} tone={node.incidents > 0 ? "warn" : "ok"} sample />
      <StatRow label="Risk Score" value={`${node.riskScore}/100`} tone={node.riskScore < 40 ? "ok" : "warn"} sample />
    </Section>
  );
}

function OwnershipTab({ node }: { node: Node }) {
  return (
    <Section title="Ownership" sample>
      <StatRow label="Business Owner" value={pick(["Payments Director", "Retail VP", "Data Lead"], hashId(node.id))} sample />
      <StatRow label="Technical Owner" value={node.owner} sample />
      <StatRow label="Workspace Owner" value={`${node.workspace} Owner`} sample />
      <StatRow label="Platform Owner" value="Platform Team" sample />
    </Section>
  );
}

function PoliciesTab() {
  return (
    <Section title="Policies" sample>
      <StatRow label="Applied Policies" value="Security Baseline, Network Policy" sample />
      <StatRow label="Inherited Policies" value="Org Defaults" sample />
      <StatRow label="Compliance Policies" value="SOC 2, ISO 27001" sample />
      <StatRow label="Security Policies" value="Zero Trust, Encryption" sample />
    </Section>
  );
}

function ActivityTab({ node }: { node: Node }) {
  const events = ["Dependency Created", "Dependency Removed", "Dependency Updated", "Health Changed", "Policy Updated", "Ownership Changed"];
  return (
    <>
      {events.map((e, i) => (
        <div key={e} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, marginTop: 5, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>{pick(OWNERS, hashId(node.id) + i)} · {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago</div>
          </div>
        </div>
      ))}
    </>
  );
}

function AuditTab() {
  const events = ["Dependency Added", "Dependency Removed", "Dependency Updated", "Relationship Modified", "Health Updated", "Impact Analysis Executed", "Graph Exported"];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
        <ShieldCheck size={14} /> Read-only immutable log <SampleTag />
      </div>
      {events.map((e, i) => (
        <StatRow key={e} label={e} value={`${pick(OWNERS, i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`} tone="ok" sample />
      ))}
    </>
  );
}

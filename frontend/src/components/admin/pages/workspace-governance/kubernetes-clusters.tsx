/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Inheritance & Overrides → Kubernetes Clusters */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Inbox,
  Upload,
  RefreshCcw,
  Download,
  UserCheck,
  Move,
  Unplug,
  ClipboardCheck,
  ShieldCheck,
  Boxes,
  Search as SearchIcon,
  Server,
  LayoutGrid,
  Users,
  Cpu,
  FolderTree,
  Layers,
  Waypoints,
  Database,
  BadgeCheck,
  GitBranch,
  HeartPulse,
  Activity as ActivityIcon,
  History,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Card,
  Tabs,
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
  PostureCard,
  PostureGrid,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";

/**
 * Kubernetes Clusters — the container-orchestration boundary assigned to a workspace: an isolated
 * runtime for workloads, networking, storage and policies. Centralized lifecycle + governance across
 * cloud and on-prem distributions, integrating security posture, compliance, GitOps and DevSecOps.
 * Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/02_Inheritance & Overrides/kubernetes_clusters.md.
 *
 * Cloud Resource Management UX (Banner · KPI dashboard · Toolbar · Filters · Search · Datatable ·
 * Bulk/Row actions · 12-tab Cluster Detail Drawer). Deterministic representative sample data (tagged
 * `Sample`); swap SAMPLE_CLUSTERS for the live inventory when the cluster connectors land.
 */

type Environment = "Production" | "Staging" | "Development" | "Sandbox";
type ClusterType = "Production" | "Non-Production" | "Shared" | "Dedicated";
type Status = "Healthy" | "Degraded" | "Pending Onboarding" | "Archived";

const PROVIDERS = [
  "Amazon EKS",
  "Azure Kubernetes Service (AKS)",
  "Google Kubernetes Engine (GKE)",
  "Red Hat OpenShift",
  "Rancher",
  "VMware Tanzu",
  "On-Premises Kubernetes",
  "RKE2",
];
const ENVIRONMENTS: Environment[] = [
  "Production",
  "Staging",
  "Development",
  "Sandbox",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const REGIONS = ["us-east-1", "westeurope", "us-central1", "on-prem-dc1"];
const VERSIONS = ["1.33", "1.32", "1.31", "1.30"];
const OWNERS = [
  "Platform Team",
  "Aisha Khan",
  "David Chen",
  "Marco Rossi",
  "Priya Nair",
];
const COMPLIANCE = ["Compliant", "Warnings", "Non-Compliant"];

const STATUS_TONE: Record<Status, string> = {
  Healthy: T.success,
  Degraded: T.warning,
  "Pending Onboarding": T.warning,
  Archived: T.textMuted,
};

interface Cluster {
  id: string;
  name: string;
  provider: string;
  workspace: string;
  environment: Environment;
  clusterType: ClusterType;
  version: string;
  nodes: number;
  namespaces: number;
  status: Status;
  businessUnit: string;
  region: string;
  compliance: string;
  workloads: number;
  securityFindings: number;
  complianceScore: number;
  owner: string;
  created: string;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

const CLUSTER_NAMES = [
  "payments-prod",
  "treasury-analytics",
  "retail-store",
  "platform-core",
  "cloud-foundations",
  "data-lake",
  "billing-engine",
  "customer-trust",
  "research-sandbox",
  "shared-mesh",
  "dr-secondary",
  "sandbox-play",
];

const SAMPLE_CLUSTERS: Cluster[] = CLUSTER_NAMES.map((name, i) => {
  const id = `K8S-${(1000 + i * 3).toString().padStart(5, "0")}`;
  const n = hashId(id + name);
  const env = pick(ENVIRONMENTS, n);
  return {
    id,
    name,
    provider: pick(PROVIDERS, n),
    workspace: name.split("-")[0],
    environment: env,
    clusterType:
      env === "Production"
        ? n % 2
          ? "Production"
          : "Dedicated"
        : n % 3 === 0
          ? "Shared"
          : "Non-Production",
    version: pick(VERSIONS, n),
    nodes: 3 + (n % 120),
    namespaces: 4 + (n % 60),
    status: pick<Status>(
      [
        "Healthy",
        "Healthy",
        "Healthy",
        "Degraded",
        "Pending Onboarding",
        "Archived",
      ],
      n,
    ),
    businessUnit: pick(BUSINESS_UNITS, n >> 1),
    region: pick(REGIONS, n >> 2),
    compliance: pick(COMPLIANCE, n),
    workloads: 20 + (n % 900),
    securityFindings: n % 36,
    complianceScore: 70 + (n % 30),
    owner: pick(OWNERS, n),
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + ((n + 3) % 27)).toString().padStart(2, "0")}`,
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

export function KubernetesClustersView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fRegion, setFRegion] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fVersion, setFVersion] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_CLUSTERS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q)) &&
      (!fWorkspace || r.workspace === fWorkspace) &&
      (!fEnv || r.environment === fEnv) &&
      (!fType || r.clusterType === fType) &&
      (!fProvider || r.provider === fProvider) &&
      (!fRegion || r.region === fRegion) &&
      (!fStatus || r.status === fStatus) &&
      (!fVersion || r.version === fVersion)
    );
  });
  const hasFilters = !!(
    search ||
    fWorkspace ||
    fEnv ||
    fType ||
    fProvider ||
    fRegion ||
    fStatus ||
    fVersion
  );
  const clearFilters = () => {
    setSearch("");
    setFWorkspace("");
    setFEnv("");
    setFType("");
    setFProvider("");
    setFRegion("");
    setFStatus("");
    setFVersion("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const connected = records.length;
  const production = records.filter(
    (r) => r.clusterType === "Production",
  ).length;
  const development = records.filter(
    (r) => r.environment === "Development",
  ).length;
  const shared = records.filter((r) => r.clusterType === "Shared").length;
  const dedicated = records.filter((r) => r.clusterType === "Dedicated").length;
  const namespaces = records.reduce((a, r) => a + r.namespaces, 0);
  const workloads = records.reduce((a, r) => a + r.workloads, 0);
  const nodes = records.reduce((a, r) => a + r.nodes, 0);
  const findings = records.reduce((a, r) => a + r.securityFindings, 0);
  const avgScore = Math.round(
    records.reduce((a, r) => a + r.complianceScore, 0) / records.length,
  );

  const toolbar: CommandItem[] = [
    {
      key: "connect",
      label: "Connect Cluster",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=inheritance"),
    },
    {
      key: "request",
      label: "Request Cluster",
      icon: <Inbox size={15} />,
      disabled: true,
    },
    {
      key: "import",
      label: "Import Clusters",
      icon: <Upload size={15} />,
      disabled: true,
    },
    {
      key: "refresh",
      label: "Refresh Inventory",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
    {
      key: "assign",
      label: "Assign Workspace",
      icon: <UserCheck size={15} />,
      disabled: true,
    },
    {
      key: "move",
      label: "Move Workspace",
      icon: <Move size={15} />,
      disabled: true,
    },
    {
      key: "detach",
      label: "Detach Workspace",
      icon: <Unplug size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Configuration",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "compliance",
      label: "Run Compliance Scan",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "sync",
      label: "Synchronize",
      icon: <RefreshCcw size={15} />,
      disabled: true,
    },
    {
      key: "health",
      label: "Health Check",
      icon: <HeartPulse size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Cluster>[] = [
    {
      key: "name",
      header: "Cluster",
      sortValue: (r) => r.name,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "monospace",
          }}
        >
          <Server size={14} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      sortValue: (r) => r.provider,
      render: (r) => r.provider,
    },
    {
      key: "workspace",
      header: "Workspace",
      sortValue: (r) => r.workspace,
      render: (r) => r.workspace,
    },
    {
      key: "environment",
      header: "Environment",
      sortValue: (r) => r.environment,
      render: (r) => r.environment,
    },
    {
      key: "version",
      header: "Version",
      sortValue: (r) => r.version,
      render: (r) => r.version,
    },
    {
      key: "nodes",
      header: "Nodes",
      sortValue: (r) => r.nodes,
      render: (r) => r.nodes,
    },
    {
      key: "namespaces",
      header: "Namespaces",
      sortValue: (r) => r.namespaces,
      render: (r) => r.namespaces,
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
      <PostureGrid>
        <PostureCard
          title="Connected Clusters"
          value={connected}
          tone="ok"
          sub={
            <>
              Actively governed <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Production"
          value={production}
          sub={
            <>
              Production clusters <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Development"
          value={development}
          sub={
            <>
              Dev clusters <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Shared / Dedicated"
          value={`${shared} / ${dedicated}`}
          sub={
            <>
              Tenancy model <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Namespaces"
          value={namespaces}
          sub={
            <>
              Across clusters <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Running Workloads"
          value={workloads.toLocaleString()}
          tone="ok"
          sub={
            <>
              Pods / deployments <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Nodes"
          value={nodes}
          sub={
            <>
              Total compute <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Compliance Score"
          value={`${avgScore}%`}
          tone={avgScore >= 85 ? "ok" : "warn"}
          sub={
            <>
              Estate average <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Security Findings"
          value={findings}
          tone={findings > 0 ? "warn" : "ok"}
          sub={
            <>
              Across clusters <SampleTag />
            </>
          }
        />
      </PostureGrid>

      <Card
        title="Kubernetes clusters"
        desc="The authoritative Kubernetes inventory — each cluster is a container-orchestration boundary a workspace is authorized to operate within, governed for security posture, compliance, workload isolation and GitOps across all supported distributions."
      >
        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search Kubernetes clusters — cluster name, workspace, cloud provider, region, owner, environment, labels…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
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
            label="Cluster Type"
            value={fType}
            onChange={setFType}
            options={facet(records.map((r) => r.clusterType))}
          />
          <Select
            label="Cloud Provider"
            value={fProvider}
            onChange={setFProvider}
            options={facet(records.map((r) => r.provider))}
          />
          <Select
            label="Region"
            value={fRegion}
            onChange={setFRegion}
            options={facet(records.map((r) => r.region))}
          />
          <Select
            label="Status"
            value={fStatus}
            onChange={setFStatus}
            options={facet(records.map((r) => r.status))}
          />
          <Select
            label="Version"
            value={fVersion}
            onChange={setFVersion}
            options={facet(records.map((r) => r.version))}
          />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "nodes", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<RefreshCcw size={13} />} onClick={clear}>
                Synchronize ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<Boxes size={13} />} onClick={clear}>
                Inventory
              </HeaderButton>
              <HeaderButton icon={<ShieldCheck size={13} />} onClick={clear}>
                Compliance Scan
              </HeaderButton>
              <HeaderButton icon={<HeartPulse size={13} />} onClick={clear}>
                Health Check
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
                { label: "Edit", onClick: () => setSelId(r.id) },
                { label: "Assign Workspace", onClick: () => setSelId(r.id) },
                { label: "Discover Resources", onClick: () => setSelId(r.id) },
                { label: "Health Check", onClick: () => setSelId(r.id) },
                { label: "Compliance", onClick: () => setSelId(r.id) },
                { label: "Security Findings", onClick: () => setSelId(r.id) },
                { label: "Export", onClick: () => {} },
                {
                  label: "Disconnect",
                  onClick: () => setSelId(r.id),
                  danger: true,
                },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Server size={20} />}
              title="No Kubernetes clusters have been connected."
              hint="Connect a Kubernetes cluster to bring its workloads under enterprise governance and authorize workspaces to operate within it."
              cta="Connect Kubernetes Cluster"
              onCta={() =>
                navigate("/admin/workspace-governance?tab=inheritance")
              }
            />
          }
        />
      </Card>

      {sel && <ClusterDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function KubernetesClustersPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Kubernetes Clusters"
        subtitle="Manage Kubernetes clusters assigned to workspaces while enforcing enterprise governance, security, compliance, operational policies and workload isolation."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() =>
                navigate("/admin/workspace-governance?tab=inheritance")
              }
            >
              Connect Cluster
            </HeaderButton>
          </>
        }
      />
      <KubernetesClustersView />
    </Page>
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
          marginBottom: 6,
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

function FlowChain({ steps }: { steps: string[] }) {
  return (
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
              background:
                i === steps.length - 1
                  ? "var(--cg-accent-bg-strong)"
                  : "transparent",
            }}
          >
            {s}
          </div>
          {i < steps.length - 1 && (
            <span
              style={{ color: T.textMuted, textAlign: "center", fontSize: 12 }}
            >
              ↓
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function MiniTable<R extends { id: string }>({
  rows,
  cols,
}: {
  rows: R[];
  cols: Column<R>[];
}) {
  return <DirectoryTable columns={cols} rows={rows} pageSize={8} />;
}

// ════════════ Kubernetes Cluster Detail Drawer — 12 sub-tabs (spec §Cluster Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "assignments",
    label: "Workspace Assignments",
    icon: <Users size={13} />,
  },
  { id: "nodes", label: "Nodes", icon: <Cpu size={13} /> },
  { id: "namespaces", label: "Namespaces", icon: <FolderTree size={13} /> },
  { id: "workloads", label: "Workloads", icon: <Layers size={13} /> },
  { id: "networking", label: "Networking", icon: <Waypoints size={13} /> },
  { id: "storage", label: "Storage", icon: <Database size={13} /> },
  { id: "security", label: "Security", icon: <ShieldCheck size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "gitops", label: "GitOps", icon: <GitBranch size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function ClusterDrawer({
  rec,
  onClose,
}: {
  rec: Cluster;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.provider} · ${rec.workspace} · ${rec.environment} · ${rec.status}`}
      width={900}
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
          <HeaderButton icon={<RefreshCcw size={13} />}>
            Synchronize
          </HeaderButton>
          <HeaderButton icon={<HeartPulse size={13} />}>
            Health Check
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "assignments" && <AssignmentsTab rec={rec} />}
      {tab === "nodes" && <NodesTab rec={rec} />}
      {tab === "namespaces" && <NamespacesTab rec={rec} />}
      {tab === "workloads" && <WorkloadsTab rec={rec} />}
      {tab === "networking" && <NetworkingTab />}
      {tab === "storage" && <StorageTab />}
      {tab === "security" && <SecurityTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "gitops" && <GitOpsTab />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Cluster }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Cluster Name", v: rec.name },
              { k: "Provider", v: rec.provider },
              {
                k: "Distribution",
                v: rec.provider.includes("OpenShift")
                  ? "OpenShift"
                  : "Upstream",
                sample: true,
              },
              { k: "Workspace", v: rec.workspace },
              { k: "Environment", v: rec.environment },
              { k: "Region", v: rec.region },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Version", v: rec.version },
              { k: "Status", v: rec.status },
              { k: "Created Date", v: rec.created, sample: true },
            ]}
          />
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Nodes", v: rec.nodes, sample: true },
              { k: "Namespaces", v: rec.namespaces, sample: true },
              { k: "Pods", v: rec.workloads, sample: true },
              {
                k: "Deployments",
                v: Math.round(rec.workloads * 0.4),
                sample: true,
              },
              { k: "StatefulSets", v: hashId(rec.id) % 12, sample: true },
              { k: "DaemonSets", v: 2 + (hashId(rec.id) % 6), sample: true },
              {
                k: "Services",
                v: Math.round(rec.workloads * 0.3),
                sample: true,
              },
              { k: "Ingresses", v: hashId(rec.id) % 20, sample: true },
              { k: "Persistent Volumes", v: hashId(rec.id) % 40, sample: true },
              { k: "Running Workloads", v: rec.workloads, sample: true },
              {
                k: "Compliance Score",
                v: `${rec.complianceScore}%`,
                sample: true,
              },
              { k: "Security Findings", v: rec.securityFindings, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function AssignmentsTab({ rec }: { rec: Cluster }) {
  const list = [
    {
      id: "1",
      workspace: rec.workspace,
      ownership: "Owner",
      access: "Full",
      environment: rec.environment,
      status: "Active",
    },
  ];
  const cols: Column<(typeof list)[number]>[] = [
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "ownership", header: "Ownership", render: (r) => r.ownership },
    { key: "access", header: "Access Level", render: (r) => r.access },
    { key: "environment", header: "Environment", render: (r) => r.environment },
    { key: "status", header: "Status", render: (r) => r.status },
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
        <HeaderButton icon={<UserCheck size={13} />}>Assign</HeaderButton>
        <HeaderButton variant="danger" icon={<Unplug size={13} />}>
          Remove
        </HeaderButton>
        <HeaderButton icon={<Move size={13} />}>
          Transfer Ownership
        </HeaderButton>
        <SampleTag />
      </div>
      <MiniTable rows={list} cols={cols} />
    </>
  );
}

function NodesTab({ rec }: { rec: Cluster }) {
  const list = Array.from({ length: Math.min(8, rec.nodes) }, (_, i) => {
    const m = hashId(`${rec.id}-node-${i}`);
    return {
      id: `${rec.id}-node-${i}`,
      node: `ip-10-0-${m % 255}-${(m >> 4) % 255}`,
      role: i === 0 ? "control-plane" : "worker",
      os: pick(["Amazon Linux 2", "Ubuntu 22.04", "Bottlerocket"], m),
      version: rec.version,
      cpu: `${pick(["4", "8", "16", "32"], m)} vCPU`,
      memory: `${pick(["16", "32", "64", "128"], m)} Gi`,
      status: m % 8 === 0 ? "NotReady" : "Ready",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    {
      key: "node",
      header: "Node",
      render: (r) => <span style={{ fontFamily: "monospace" }}>{r.node}</span>,
    },
    { key: "role", header: "Role", render: (r) => r.role },
    { key: "os", header: "Operating System", render: (r) => r.os },
    { key: "version", header: "K8s Version", render: (r) => r.version },
    { key: "cpu", header: "CPU", render: (r) => r.cpu },
    { key: "memory", header: "Memory", render: (r) => r.memory },
    { key: "status", header: "Status", render: (r) => r.status },
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
        <HeaderButton icon={<RefreshCcw size={13} />}>Refresh</HeaderButton>
        <HeaderButton>Drain</HeaderButton>
        <HeaderButton>Cordon</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <MiniTable rows={list} cols={cols} />
    </>
  );
}

function NamespacesTab({ rec }: { rec: Cluster }) {
  const list = Array.from({ length: Math.min(8, rec.namespaces) }, (_, i) => {
    const m = hashId(`${rec.id}-ns-${i}`);
    return {
      id: `${rec.id}-ns-${i}`,
      namespace: pick(
        [
          "default",
          "kube-system",
          "payments",
          "ingress-nginx",
          "monitoring",
          "argocd",
          "data",
          "team-a",
        ],
        i,
      ),
      owner: pick(OWNERS, m),
      workloads: 1 + (m % 40),
      quotas: m % 2 ? "Enforced" : "None",
      status: "Active",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    {
      key: "namespace",
      header: "Namespace",
      render: (r) => (
        <span style={{ fontFamily: "monospace" }}>{r.namespace}</span>
      ),
    },
    { key: "owner", header: "Owner", render: (r) => r.owner },
    { key: "workloads", header: "Workloads", render: (r) => r.workloads },
    { key: "quotas", header: "Resource Quotas", render: (r) => r.quotas },
    { key: "status", header: "Status", render: (r) => r.status },
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
        <HeaderButton icon={<Plus size={13} />}>Create</HeaderButton>
        <HeaderButton variant="danger">Delete</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <MiniTable rows={list} cols={cols} />
    </>
  );
}

function WorkloadsTab({ rec }: { rec: Cluster }) {
  const kinds = [
    "Deployment",
    "StatefulSet",
    "DaemonSet",
    "Job",
    "CronJob",
    "Service",
    "Ingress",
  ];
  const list = Array.from({ length: 8 }, (_, i) => {
    const m = hashId(`${rec.id}-wl-${i}`);
    return {
      id: `${rec.id}-wl-${i}`,
      workload: `${pick(["api", "web", "worker", "gateway", "db-proxy"], m)}-${m % 100}`,
      namespace: pick(["payments", "default", "data", "monitoring"], m),
      kind: pick(kinds, m),
      replicas: 1 + (m % 12),
      status: m % 7 === 0 ? "Progressing" : "Running",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    {
      key: "workload",
      header: "Workload",
      render: (r) => (
        <span style={{ fontFamily: "monospace" }}>{r.workload}</span>
      ),
    },
    { key: "namespace", header: "Namespace", render: (r) => r.namespace },
    { key: "kind", header: "Kind", render: (r) => r.kind },
    { key: "replicas", header: "Replicas", render: (r) => r.replicas },
    { key: "status", header: "Status", render: (r) => r.status },
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
        <HeaderButton icon={<SearchIcon size={13} />}>Discover</HeaderButton>
        <HeaderButton icon={<RefreshCcw size={13} />}>Refresh</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <MiniTable rows={list} cols={cols} />
    </>
  );
}

function NetworkingTab() {
  return (
    <>
      <Section title="Network topology" sample>
        <FlowChain steps={["Cluster", "Namespaces", "Services", "Pods"]} />
      </Section>
      <Section title="Networking" sample>
        <StatRow label="CNI" value="Cilium" sample />
        <StatRow
          label="Network Policies"
          value="Enforced (default-deny)"
          tone="ok"
          sample
        />
        <StatRow label="Ingress Controllers" value="ingress-nginx" sample />
        <StatRow label="Load Balancers" value="3 provisioned" sample />
        <StatRow label="Service Mesh" value="Istio" sample />
        <StatRow label="DNS" value="CoreDNS" sample />
        <StatRow label="Gateway API" value="Enabled" tone="ok" sample />
      </Section>
    </>
  );
}

function StorageTab() {
  return (
    <Section title="Storage" sample>
      <StatRow label="Storage Classes" value="gp3 (default), io2" sample />
      <StatRow label="Persistent Volumes" value="24 bound" sample />
      <StatRow label="Persistent Volume Claims" value="24 claims" sample />
      <StatRow label="CSI Drivers" value="EBS CSI, EFS CSI" sample />
      <StatRow label="Snapshots" value="Enabled (daily)" tone="ok" sample />
    </Section>
  );
}

function SecurityTab({ rec }: { rec: Cluster }) {
  const controls = [
    "RBAC",
    "Pod Security Admission",
    "Network Policies",
    "Admission Controllers",
    "OPA / Gatekeeper",
    "Kyverno",
    "Image Scanning",
    "Runtime Security",
    "Secrets Management",
  ];
  const list = controls.map((control) => {
    const m = hashId(`${rec.id}-${control}`);
    return {
      id: control,
      control,
      status: m % 5 === 0 ? "Not Enforced" : "Enforced",
      findings: m % 16,
      severity: pick(["Low", "Medium", "High", "Critical"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "control", header: "Control", render: (r) => r.control },
    { key: "status", header: "Status", render: (r) => r.status },
    { key: "findings", header: "Findings", render: (r) => r.findings },
    { key: "severity", header: "Severity", render: (r) => r.severity },
  ];
  return (
    <Section
      title={`Security posture — ${100 - Math.min(60, rec.securityFindings * 2)}/100`}
      sample
    >
      <MiniTable rows={list} cols={cols} />
    </Section>
  );
}

function ComplianceTab({ rec }: { rec: Cluster }) {
  const frameworks = [
    "CIS Kubernetes Benchmark",
    "NSA Kubernetes Hardening Guide",
    "NIST",
    "ISO 27001",
    "SOC 2",
    "PCI DSS",
    "HIPAA",
    "CSA CCM",
  ];
  const list = frameworks.map((framework) => {
    const m = hashId(`${rec.id}-${framework}`);
    const passed = 40 + (m % 120);
    const failed = m % 20;
    return {
      id: framework,
      framework,
      score: `${Math.round((passed / (passed + failed)) * 100)}%`,
      passed,
      failed,
      status: failed === 0 ? "Passing" : "Warnings",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "framework", header: "Framework", render: (r) => r.framework },
    { key: "score", header: "Score", render: (r) => r.score },
    { key: "passed", header: "Controls Passed", render: (r) => r.passed },
    { key: "failed", header: "Controls Failed", render: (r) => r.failed },
    { key: "status", header: "Status", render: (r) => r.status },
  ];
  return <MiniTable rows={list} cols={cols} />;
}

function GitOpsTab() {
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
        <HeaderButton icon={<RefreshCcw size={13} />}>Synchronize</HeaderButton>
        <HeaderButton icon={<GitBranch size={13} />}>
          View Repository
        </HeaderButton>
        <HeaderButton icon={<RefreshCcw size={13} />}>Refresh</HeaderButton>
        <SampleTag />
      </div>
      <Section title="GitOps" sample>
        <StatRow label="Argo CD" value="Installed" tone="ok" sample />
        <StatRow label="Flux" value="Not installed" sample />
        <StatRow label="Repositories" value="3 connected" sample />
        <StatRow label="Applications" value="12 apps" sample />
        <StatRow label="Sync Status" value="Synced" tone="ok" sample />
        <StatRow label="Last Deployment" value="2 h ago" sample />
      </Section>
    </>
  );
}

function ActivityTab({ rec }: { rec: Cluster }) {
  const events = [
    "Cluster Connected",
    "Inventory Updated",
    "Workspace Assigned",
    "Compliance Scan",
    "Security Scan",
    "Configuration Updated",
    "Upgrade Performed",
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
              {pick(OWNERS, hashId(rec.id) + i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function AuditTab() {
  const events = [
    "Cluster Connected",
    "Cluster Updated",
    "Workspace Assigned",
    "Inventory Completed",
    "Compliance Scan",
    "Security Findings Imported",
    "Cluster Disconnected",
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

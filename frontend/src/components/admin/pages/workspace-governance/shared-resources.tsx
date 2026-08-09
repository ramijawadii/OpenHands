/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Resource Boundaries → Shared Resources */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Send,
  Upload,
  Download,
  RefreshCcw,
  Users,
  UserPlus,
  UserMinus,
  ClipboardCheck,
  ScanLine,
  HeartPulse,
  FileText,
  Search as SearchIcon,
  LayoutGrid,
  KeyRound,
  Network,
  ShieldCheck,
  BadgeCheck,
  Activity as ActivityIcon,
  History,
  Share2,
  Server,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
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
  PostureCard,
  PostureGrid,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { ColumnChooser } from "#/components/admin/settings-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";

/**
 * Shared Resources — the governance layer for enterprise resources intentionally shared across multiple
 * workspaces while remaining centrally owned, policy-enforced and access-controlled (logging platforms,
 * shared clusters, networks, databases, identity, AI gateways…). Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/02_Inheritance & Overrides/shared_resources.md
 * (filed under Resource Boundaries; surfaced in the Inheritance & Overrides console for this release).
 *
 * Cloud-Resource-Management UX pattern (Banner · KPI Dashboard · Toolbar · Filters · Search · Datatable ·
 * Bulk/Row actions · 10-tab Shared Resource Detail Drawer). No inventory backend yet → deterministic sample.
 */

type ResType =
  | "OpenSearch"
  | "Kubernetes Cluster"
  | "VPC"
  | "Database"
  | "Redis"
  | "Kafka"
  | "Vault"
  | "Container Registry"
  | "API Gateway"
  | "Identity Provider"
  | "AI Gateway"
  | "Cloud Account";
type Platform = "AWS" | "Azure" | "GCP" | "Kubernetes" | "On-Premises";
type Health = "Healthy" | "Degraded" | "Down";
type Status = "Active" | "Maintenance" | "Archived";
type Environment = "Production" | "Pre-production" | "Development" | "Shared";

const PLATFORMS: Platform[] = [
  "AWS",
  "Azure",
  "GCP",
  "Kubernetes",
  "On-Premises",
];
const ENVIRONMENTS: Environment[] = [
  "Production",
  "Pre-production",
  "Development",
  "Shared",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const WORKSPACES = [
  "Payments",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Mobile API",
  "Billing",
  "Support",
];
const OWNERS = [
  "Platform Team",
  "Cloud Team",
  "Security Team",
  "Data Team",
  "SRE Team",
];
const FRAMEWORKS = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST",
  "CSA CCM",
  "CIS Benchmarks",
];

const HEALTH_TONE: Record<Health, string> = {
  Healthy: T.success,
  Degraded: T.warning,
  Down: T.danger,
};
const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Maintenance: T.warning,
  Archived: T.textMuted,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Shared {
  id: string;
  name: string;
  type: ResType;
  owner: string;
  consumers: number;
  platform: Platform;
  environment: Environment;
  health: Health;
  status: Status;
  businessUnit: string;
  created: string;
  connectedWorkspaces: number;
  dependencies: number;
  availability: number;
  complianceScore: number;
  securityFindings: number;
  incidents: number;
}

const RES_SEED: { name: string; type: ResType }[] = [
  { name: "Enterprise Logging", type: "OpenSearch" },
  { name: "Shared Platform Cluster", type: "Kubernetes Cluster" },
  { name: "Core Network", type: "VPC" },
  { name: "Customer Data Store", type: "Database" },
  { name: "Session Cache", type: "Redis" },
  { name: "Event Backbone", type: "Kafka" },
  { name: "Secrets Platform", type: "Vault" },
  { name: "Image Registry", type: "Container Registry" },
  { name: "Enterprise API Gateway", type: "API Gateway" },
  { name: "Corporate Identity", type: "Identity Provider" },
  { name: "Shared AI Gateway", type: "AI Gateway" },
  { name: "Shared Sandbox Account", type: "Cloud Account" },
  { name: "Metrics Platform", type: "OpenSearch" },
  { name: "Message Queue", type: "Kafka" },
];

const SAMPLE_SHARED: Shared[] = RES_SEED.map(({ name, type }, i) => {
  const id = `SH-${(1000 + i * 7).toString().padStart(5, "0")}`;
  const n = hashId(id + name);
  const health = pick<Health>(
    ["Healthy", "Healthy", "Healthy", "Degraded", "Down"],
    n,
  );
  const status = pick<Status>(
    ["Active", "Active", "Active", "Maintenance", "Archived"],
    n,
  );
  return {
    id,
    name,
    type,
    owner: pick(OWNERS, n),
    consumers: 2 + (n % 40),
    platform: pick(PLATFORMS, n >> 1),
    environment: pick(ENVIRONMENTS, n >> 2),
    health,
    status,
    businessUnit: pick(BUSINESS_UNITS, n >> 3),
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    connectedWorkspaces: 3 + (n % 20),
    dependencies: n % 12,
    availability: 95 + (n % 5),
    complianceScore: 78 + (n % 22),
    securityFindings: n % 10,
    incidents: n % 5,
  };
});

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

export function SharedResourcesView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fPlatform, setFPlatform] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
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

  const records = SAMPLE_SHARED;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.platform.toLowerCase().includes(q)) &&
      (!fType || r.type === fType) &&
      (!fWs || r.businessUnit === fWs) &&
      (!fOwner || r.owner === fOwner) &&
      (!fEnv || r.environment === fEnv) &&
      (!fPlatform || r.platform === fPlatform) &&
      (!fStatus || r.status === fStatus) &&
      (!fHealth || r.health === fHealth)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFWs("");
    setFOwner("");
    setFEnv("");
    setFPlatform("");
    setFStatus("");
    setFHealth("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // KPI Summary (spec §KPI Summary).
  const sharedCount = records.length;
  const connectedWorkspaces = records.reduce(
    (a, r) => Math.max(a, r.connectedWorkspaces),
    0,
  );
  const consumers = records.reduce((a, r) => a + r.consumers, 0);
  const sharedPlatforms = new Set(records.map((r) => r.platform)).size;
  const sharedNetworks = records.filter((r) => r.type === "VPC").length;
  const securityFindings = records.reduce((a, r) => a + r.securityFindings, 0);
  const complianceScore = Math.round(
    records.reduce((a, r) => a + r.complianceScore, 0) / records.length,
  );
  const healthy = Math.round(
    (records.filter((r) => r.health === "Healthy").length / records.length) *
      100,
  );

  const toolbar: CommandItem[] = [
    {
      key: "register",
      label: "Register Resource",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=inheritance"),
    },
    {
      key: "request",
      label: "Request Shared Resource",
      icon: <Send size={15} />,
      disabled: true,
    },
    {
      key: "import",
      label: "Import",
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
      key: "consumers",
      label: "Assign Consumers",
      icon: <UserPlus size={15} />,
      disabled: true,
    },
    {
      key: "owner",
      label: "Assign Owner",
      icon: <Users size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Policies",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "scan",
      label: "Run Compliance Scan",
      icon: <ScanLine size={15} />,
      disabled: true,
    },
    {
      key: "health",
      label: "Health Check",
      icon: <HeartPulse size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "discover",
      label: "Discover Resources",
      icon: <SearchIcon size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Shared>[] = [
    {
      key: "name",
      header: "Resource",
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
          <Share2 size={13} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortValue: (r) => r.type,
      render: (r) => r.type,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "consumers",
      header: "Consumers",
      sortValue: (r) => r.consumers,
      render: (r) => r.consumers,
    },
    {
      key: "platform",
      header: "Platform",
      sortValue: (r) => r.platform,
      render: (r) => r.platform,
    },
    {
      key: "environment",
      header: "Environment",
      sortValue: (r) => r.environment,
      render: (r) => r.environment,
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

  return (
    <>
      <PostureGrid>
        <PostureCard
          title="Shared Resources"
          value={sharedCount}
          tone="ok"
          sub={
            <>
              Registered enterprise-wide <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Connected Workspaces"
          value={connectedWorkspaces}
          tone="ok"
          sub={
            <>
              Consuming a resource <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Consumers"
          value={consumers}
          tone="ok"
          sub={
            <>
              Total consumer bindings <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Shared Platforms"
          value={sharedPlatforms}
          tone="ok"
          sub={
            <>
              Provider platforms <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Shared Networks"
          value={sharedNetworks}
          tone="ok"
          sub={
            <>
              Shared VPCs/networks <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Security Findings"
          value={securityFindings}
          tone={securityFindings > 0 ? "warn" : "ok"}
          sub={
            <>
              Across shared assets <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Compliance Score"
          value={`${complianceScore}%`}
          tone={complianceScore >= 85 ? "ok" : "warn"}
          sub={
            <>
              Average across resources <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Resource Health"
          value={`${healthy}%`}
          tone={healthy >= 90 ? "ok" : "warn"}
          sub={
            <>
              Healthy resources <SampleTag />
            </>
          }
        />
      </PostureGrid>

      <DiscoveryListView
        title="Shared resources"
        desc="Manage enterprise resources shared across multiple workspaces while enforcing ownership, governance, security, compliance and operational boundaries."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search shared resources — name, resource ID, owner, workspace, platform, tags, environment…"
        count={rows.length}
        pills={[
          {
            key: "resourceType",
            label: "Resource Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.type)),
          },
          {
            key: "businessUnit",
            label: "Business Unit",
            value: fWs,
            onChange: setFWs,
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
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "platform",
            label: "Platform",
            value: fPlatform,
            onChange: setFPlatform,
            options: facet(records.map((r) => r.platform)),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
          {
            key: "health",
            label: "Health",
            value: fHealth,
            onChange: setFHealth,
            options: facet(records.map((r) => r.health)),
          },
        ]}
        presets={[{ label: "All shared resources", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "consumers", dir: "desc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Users size={13} />} onClick={clear}>
              Assign Owner ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<RefreshCcw size={13} />} onClick={clear}>
              Synchronize
            </HeaderButton>
            <HeaderButton icon={<HeartPulse size={13} />} onClick={clear}>
              Health Check
            </HeaderButton>
            <HeaderButton icon={<ScanLine size={13} />} onClick={clear}>
              Compliance Scan
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
              { label: "Assign Consumers", onClick: () => setSelId(r.id) },
              { label: "View Dependencies", onClick: () => setSelId(r.id) },
              { label: "Health Check", onClick: () => setSelId(r.id) },
              { label: "Compliance", onClick: () => setSelId(r.id) },
              { label: "Security Findings", onClick: () => setSelId(r.id) },
              { label: "Archive", onClick: () => {} },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Share2 size={20} />}
            title="No shared resources have been registered."
            hint="Register a shared resource to govern enterprise assets consumed across multiple workspaces with centralized ownership and access control."
            cta="Register Shared Resource"
            onCta={() =>
              navigate("/admin/workspace-governance?tab=inheritance")
            }
          />
        }
      />

      {sel && <SharedDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function SharedResourcesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Shared Resources"
        subtitle="Manage enterprise resources that are shared across multiple workspaces while enforcing ownership, governance, security, compliance, and operational boundaries."
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
              Register Resource
            </HeaderButton>
          </>
        }
      />
      <SharedResourcesView />
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

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "consumers", label: "Consumers", icon: <Users size={13} /> },
  { id: "details", label: "Resource Details", icon: <Server size={13} /> },
  { id: "access", label: "Access Control", icon: <KeyRound size={13} /> },
  { id: "deps", label: "Dependencies", icon: <Network size={13} /> },
  { id: "security", label: "Security", icon: <ShieldCheck size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "monitoring", label: "Monitoring", icon: <ActivityIcon size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function SharedDrawer({ rec, onClose }: { rec: Shared; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.type} · ${rec.owner} · ${rec.platform} · ${rec.status}`}
      width={840}
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
          <HeaderButton icon={<UserPlus size={13} />}>
            Assign Consumers
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
      {tab === "consumers" && <ConsumersTab rec={rec} />}
      {tab === "details" && <DetailsTab rec={rec} />}
      {tab === "access" && <AccessTab rec={rec} />}
      {tab === "deps" && <DepsTab rec={rec} />}
      {tab === "security" && <SecurityTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "monitoring" && <MonitoringTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Shared }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Resource Name", v: rec.name },
              { k: "Resource ID", v: rec.id },
              { k: "Type", v: rec.type },
              { k: "Platform", v: rec.platform, sample: true },
              { k: "Environment", v: rec.environment, sample: true },
              { k: "Business Unit", v: rec.businessUnit, sample: true },
              { k: "Owner", v: rec.owner, sample: true },
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
              { k: "Consumers", v: rec.consumers, sample: true },
              {
                k: "Connected Workspaces",
                v: rec.connectedWorkspaces,
                sample: true,
              },
              { k: "Dependencies", v: rec.dependencies, sample: true },
              { k: "Availability", v: `${rec.availability}%`, sample: true },
              {
                k: "Compliance Score",
                v: `${rec.complianceScore}%`,
                sample: true,
              },
              { k: "Security Findings", v: rec.securityFindings, sample: true },
              { k: "Incidents", v: rec.incidents, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function ConsumersTab({ rec }: { rec: Shared }) {
  const list = Array.from(
    { length: Math.min(8, rec.connectedWorkspaces) },
    (_, i) => {
      const m = hashId(`${rec.id}-c-${i}`);
      return {
        id: `${rec.id}-c-${i}`,
        workspace: pick(WORKSPACES, m),
        businessUnit: pick(BUSINESS_UNITS, m),
        accessLevel: pick(["Read", "Read/Write", "Admin"], m),
        purpose: pick(
          ["Logging", "Storage", "Compute", "Messaging", "Identity"],
          m,
        ),
        status: pick(["Active", "Active", "Suspended"], m),
      };
    },
  );
  const cols: Column<(typeof list)[number]>[] = [
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    {
      key: "businessUnit",
      header: "Business Unit",
      render: (r) => r.businessUnit,
    },
    {
      key: "accessLevel",
      header: "Access Level",
      render: (r) => r.accessLevel,
    },
    { key: "purpose", header: "Purpose", render: (r) => r.purpose },
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
        <HeaderButton icon={<UserPlus size={13} />}>Add Consumer</HeaderButton>
        <HeaderButton variant="danger" icon={<UserMinus size={13} />}>
          Remove Consumer
        </HeaderButton>
        <HeaderButton icon={<Users size={13} />}>
          Transfer Ownership
        </HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function DetailsTab({ rec }: { rec: Shared }) {
  return (
    <Section title="Resource details" sample>
      <KVGrid
        items={[
          { k: "Configuration", v: `${rec.type} cluster`, sample: true },
          {
            k: "Capacity",
            v: `${20 + (hashId(rec.id) % 80)} nodes`,
            sample: true,
          },
          {
            k: "Version",
            v: `v${1 + (hashId(rec.id) % 9)}.${hashId(rec.id) % 9}`,
            sample: true,
          },
          { k: "Provider", v: rec.platform, sample: true },
          {
            k: "Location",
            v: pick(
              ["eu-west-1", "us-east-1", "eu-central-1", "westeurope"],
              hashId(rec.id),
            ),
            sample: true,
          },
        ]}
      />
    </Section>
  );
}

function AccessTab({ rec }: { rec: Shared }) {
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
        <HeaderButton icon={<KeyRound size={13} />}>Grant Access</HeaderButton>
        <HeaderButton variant="danger" icon={<UserMinus size={13} />}>
          Revoke Access
        </HeaderButton>
        <HeaderButton icon={<ClipboardCheck size={13} />}>
          Review Access
        </HeaderButton>
        <SampleTag />
      </div>
      <Section title="Access control" sample>
        <StatRow
          label="Authorized Workspaces"
          value={rec.connectedWorkspaces}
          sample
        />
        <StatRow label="Groups" value={2 + (hashId(rec.id) % 6)} sample />
        <StatRow label="Roles" value={3 + (hashId(rec.id) % 5)} sample />
        <StatRow label="Policies" value={1 + (hashId(rec.id) % 4)} sample />
        <StatRow
          label="Approval Requirements"
          value={rec.environment === "Production" ? "Required" : "Optional"}
          sample
        />
        <StatRow
          label="Inherited Access"
          value={hashId(rec.id) % 2 === 0 ? "Yes" : "No"}
          sample
        />
      </Section>
    </>
  );
}

function DepsTab({ rec }: { rec: Shared }) {
  const list = Array.from({ length: 2 + (hashId(rec.id) % 5) }, (_, i) => {
    const m = hashId(`${rec.id}-d-${i}`);
    return {
      id: `${rec.id}-d-${i}`,
      dep: pick(
        [
          "Payments API",
          "Auth Service",
          "Data Pipeline",
          "Billing Job",
          "Search Index",
        ],
        m,
      ),
      rel: pick(["Consumed by", "Depends on", "Feeds"], m),
      workspace: pick(WORKSPACES, m),
      status: pick(["Active", "Active", "Degraded"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "dep", header: "Dependent Resource", render: (r) => r.dep },
    { key: "rel", header: "Relationship", render: (r) => r.rel },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "status", header: "Status", render: (r) => r.status },
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
        Upstream and downstream resource relationships. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function SecurityTab({ rec }: { rec: Shared }) {
  const controls = ["Encryption", "IAM", "Network Policies", "Audit Logging"];
  const list = controls.map((c) => {
    const m = hashId(rec.id + c);
    return {
      id: c,
      control: c,
      status: pick(["Enabled", "Enabled", "Partial"], m),
      findings: m % 4,
      severity: pick(["Low", "Medium", "High"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "control", header: "Control", render: (r) => r.control },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span style={{ color: r.status === "Enabled" ? T.success : T.warning }}>
          {r.status}
        </span>
      ),
    },
    { key: "findings", header: "Findings", render: (r) => r.findings },
    { key: "severity", header: "Severity", render: (r) => r.severity },
  ];
  return (
    <>
      <Section title="Security posture" sample>
        <StatRow
          label="Security Score"
          value={`${100 - rec.securityFindings * 5}%`}
          tone={rec.securityFindings > 3 ? "warn" : "ok"}
          sample
        />
        <StatRow
          label="Security Findings"
          value={rec.securityFindings}
          tone={rec.securityFindings > 0 ? "warn" : "ok"}
          sample
        />
      </Section>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ComplianceTab({ rec }: { rec: Shared }) {
  const list = FRAMEWORKS.map((f) => {
    const m = hashId(rec.id + f);
    const passed = 5 + (m % 20);
    const failed = m % 5;
    return {
      id: f,
      framework: f,
      score: `${Math.round((passed / (passed + failed)) * 100)}%`,
      passed,
      failed,
      status: failed === 0 ? "Compliant" : "Gaps",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "framework", header: "Framework", render: (r) => r.framework },
    { key: "score", header: "Score", render: (r) => r.score },
    { key: "passed", header: "Passed Controls", render: (r) => r.passed },
    { key: "failed", header: "Failed Controls", render: (r) => r.failed },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Compliant" ? T.success : T.warning }}
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
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Compliance posture across frameworks. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function MonitoringTab({ rec }: { rec: Shared }) {
  return (
    <Section title="Monitoring & health" sample>
      <StatRow
        label="Health"
        value={<HealthBadge health={rec.health} />}
        sample
      />
      <StatRow
        label="Availability"
        value={`${rec.availability}%`}
        tone={rec.availability >= 99 ? "ok" : "warn"}
        sample
      />
      <StatRow
        label="Latency"
        value={`${10 + (hashId(rec.id) % 90)} ms`}
        sample
      />
      <StatRow
        label="Capacity"
        value={`${40 + (hashId(rec.id) % 55)}% used`}
        sample
      />
      <StatRow
        label="Performance"
        value={pick(["Nominal", "Nominal", "Degraded"], hashId(rec.id))}
        sample
      />
      <StatRow
        label="Alerts"
        value={rec.incidents}
        tone={rec.incidents > 0 ? "warn" : "ok"}
        sample
      />
      <StatRow
        label="Maintenance Windows"
        value={
          rec.status === "Maintenance" ? "In progress" : "Scheduled Sun 02:00"
        }
        sample
      />
    </Section>
  );
}

function ActivityTab({ rec }: { rec: Shared }) {
  const events = [
    "Resource Registered",
    "Consumer Added",
    "Consumer Removed",
    "Owner Changed",
    "Policy Updated",
    "Compliance Scan",
    "Health Check",
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
    "Resource Registered",
    "Configuration Updated",
    "Consumer Assigned",
    "Consumer Removed",
    "Compliance Scan",
    "Security Scan",
    "Ownership Changed",
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
          value={`${pick(OWNERS, i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

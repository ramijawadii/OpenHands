/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Cross-Workspace Governance → Shared Assets */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Upload,
  UploadCloud,
  Send,
  Download,
  Users,
  ClipboardCheck,
  ScanLine,
  FileText,
  RefreshCcw,
  HeartPulse,
  UserPlus,
  UserMinus,
  LayoutGrid,
  KeyRound,
  Network,
  ShieldCheck,
  BadgeCheck,
  GitBranch,
  History,
  Package,
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
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";

/**
 * Shared Assets — enterprise assets intentionally shared across multiple workspaces while remaining
 * centrally governed, secured, monitored and audited (applications, APIs, data assets, AI assets,
 * security assets, platform/infrastructure assets, docs, secrets, certificates). Unlike Shared Resource
 * Policies (the rules), this is the actual asset inventory. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/04_Cross-Workspace Governance/shared_assets.md.
 *
 * Enterprise-Governance UX pattern (Banner · KPI · Toolbar · Filters · Search · Datatable · Bulk/Row
 * actions · 9-tab Asset Detail Drawer). No asset inventory backend yet → deterministic sample.
 */

type AssetType =
  | "Application"
  | "API"
  | "Data Asset"
  | "AI Asset"
  | "Security Asset"
  | "Platform Service"
  | "Infrastructure"
  | "Documentation"
  | "Shared Secret"
  | "Certificate";
type Classification = "Public" | "Internal" | "Confidential" | "Restricted";
type Status = "Published" | "Draft" | "Unpublished" | "Retired";

const CLASSIFICATIONS: Classification[] = [
  "Public",
  "Internal",
  "Confidential",
  "Restricted",
];
const WORKSPACES = [
  "Shared Services",
  "Payments",
  "Data Lake",
  "Identity",
  "Analytics",
  "Platform",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const PLATFORMS = ["AWS", "Azure", "GCP", "Kubernetes", "SaaS"];
const ENVIRONMENTS = ["Production", "Pre-production", "Shared"];
const OWNERS = [
  "Platform Team",
  "Security Team",
  "Data Team",
  "API Team",
  "Governance Admin",
];
const FRAMEWORKS = [
  "ISO 27001",
  "SOC 2",
  "NIST",
  "PCI DSS",
  "HIPAA",
  "CSA CCM",
];

const STATUS_TONE: Record<Status, string> = {
  Published: T.success,
  Draft: T.textMuted,
  Unpublished: T.warning,
  Retired: T.textMuted,
};
const CLASS_TONE: Record<Classification, string> = {
  Public: T.textMuted,
  Internal: T.accent,
  Confidential: T.warning,
  Restricted: T.danger,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Asset {
  id: string;
  name: string;
  type: AssetType;
  owner: string;
  consumers: number;
  workspace: string;
  classification: Classification;
  status: Status;
  businessUnit: string;
  platform: string;
  environment: string;
  version: string;
  created: string;
  dependencies: number;
  versions: number;
  securityFindings: number;
  complianceScore: number;
  availability: number;
}

const ASSET_SEED: { name: string; type: AssetType }[] = [
  { name: "Enterprise API Gateway", type: "Platform Service" },
  { name: "Customer Dataset", type: "Data Asset" },
  { name: "Fraud Detection Model", type: "AI Asset" },
  { name: "Central Identity Provider", type: "Security Asset" },
  { name: "Payments REST API", type: "API" },
  { name: "Enterprise Portal", type: "Application" },
  { name: "Shared TLS Certificate", type: "Certificate" },
  { name: "Central Secrets Store", type: "Shared Secret" },
  { name: "Data Lake Warehouse", type: "Data Asset" },
  { name: "Prompt Library", type: "AI Asset" },
  { name: "Logging Platform", type: "Platform Service" },
  { name: "Shared Kubernetes Cluster", type: "Infrastructure" },
  { name: "Architecture Runbooks", type: "Documentation" },
  { name: "GraphQL Federation API", type: "API" },
];

const SAMPLE_ASSETS: Asset[] = ASSET_SEED.map(({ name, type }, i) => {
  const id = `SA-${(10000 + i * 37).toString()}`;
  const n = hashId(id + name);
  const status = pick<Status>(
    ["Published", "Published", "Published", "Draft", "Unpublished", "Retired"],
    n,
  );
  return {
    id,
    name,
    type,
    owner: pick(OWNERS, n),
    consumers: 2 + (n % 40),
    workspace: pick(WORKSPACES, n >> 1),
    classification: pick(CLASSIFICATIONS, n >> 2),
    status,
    businessUnit: pick(BUSINESS_UNITS, n >> 3),
    platform: pick(PLATFORMS, n),
    environment: pick(ENVIRONMENTS, n >> 2),
    version: `v${1 + (n % 9)}.${n % 9}`,
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    dependencies: n % 10,
    versions: 1 + (n % 8),
    securityFindings: n % 6,
    complianceScore: 78 + (n % 22),
    availability: 95 + (n % 5),
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
function ClassBadge({ classification }: { classification: Classification }) {
  const c = CLASS_TONE[classification];
  return <span style={{ fontSize: 11.5, color: c }}>{classification}</span>;
}

export function SharedAssetsView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fPlatform, setFPlatform] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fClass, setFClass] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_ASSETS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)) &&
      (!fType || r.type === fType) &&
      (!fWs || r.workspace === fWs) &&
      (!fOwner || r.owner === fOwner) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fPlatform || r.platform === fPlatform) &&
      (!fStatus || r.status === fStatus) &&
      (!fClass || r.classification === fClass)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFWs("");
    setFOwner("");
    setFBu("");
    setFPlatform("");
    setFStatus("");
    setFClass("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const sharedAssets = records.length;
  const consumingWorkspaces = new Set(records.map((r) => r.workspace)).size;
  const published = records.filter((r) => r.status === "Published").length;
  const pendingRequests = records.filter((r) => r.status === "Draft").length;
  const securityFindings = records.reduce((a, r) => a + r.securityFindings, 0);
  const complianceScore = Math.round(
    records.reduce((a, r) => a + r.complianceScore, 0) / records.length,
  );
  const health = Math.round(
    records.reduce((a, r) => a + r.availability, 0) / records.length,
  );
  const ownershipCoverage = 100;

  const toolbar: CommandItem[] = [
    {
      key: "register",
      label: "Register Asset",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=cross"),
    },
    {
      key: "publish",
      label: "Publish Asset",
      icon: <UploadCloud size={15} />,
      disabled: true,
    },
    {
      key: "unpublish",
      label: "Unpublish Asset",
      icon: <Download size={15} />,
      disabled: true,
    },
    {
      key: "request",
      label: "Request Access",
      icon: <Send size={15} />,
      disabled: true,
    },
    {
      key: "owner",
      label: "Assign Owner",
      icon: <UserPlus size={15} />,
      disabled: true,
    },
    {
      key: "review",
      label: "Review Sharing",
      icon: <ClipboardCheck size={15} />,
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
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "refresh",
      label: "Refresh Inventory",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "health",
      label: "Health Check",
      icon: <HeartPulse size={15} />,
      disabled: true,
    },
    {
      key: "import",
      label: "Import",
      icon: <Upload size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Asset>[] = [
    {
      key: "name",
      header: "Asset",
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
          <Package size={13} color={T.textMuted} />
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
      key: "workspace",
      header: "Workspace",
      sortValue: (r) => r.workspace,
      render: (r) => r.workspace,
    },
    {
      key: "classification",
      header: "Classification",
      sortValue: (r) => r.classification,
      render: (r) => <ClassBadge classification={r.classification} />,
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
      <StatStripPlain
        items={[
          { label: "Shared Assets", value: sharedAssets, tone: "ok" },
          {
            label: "Consuming Workspaces",
            value: consumingWorkspaces,
            tone: "ok",
          },
          { label: "Published Assets", value: published, tone: "ok" },
          {
            label: "Pending Requests",
            value: pendingRequests,
            tone: pendingRequests > 0 ? "warn" : "ok",
          },
          {
            label: "Security Findings",
            value: securityFindings,
            tone: securityFindings > 0 ? "warn" : "ok",
          },
          {
            label: "Compliance Score",
            value: `${complianceScore}%`,
            tone: complianceScore >= 85 ? "ok" : "warn",
          },
          {
            label: "Asset Health",
            value: `${health}%`,
            tone: health >= 95 ? "ok" : "warn",
          },
          {
            label: "Ownership Coverage",
            value: `${ownershipCoverage}%`,
            tone: "ok",
          },
        ]}
      />

      <DiscoveryListView
        title="Shared assets"
        desc="Manage enterprise assets that are securely shared between workspaces while maintaining centralized governance, ownership, compliance and lifecycle management."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search shared assets — asset name, asset ID, workspace, owner, consumer, tags, description…"
        count={rows.length}
        pills={[
          {
            key: "assetType",
            label: "Asset Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.type)),
          },
          {
            key: "workspace",
            label: "Workspace",
            value: fWs,
            onChange: setFWs,
            options: facet(records.map((r) => r.workspace)),
          },
          {
            key: "owner",
            label: "Owner",
            value: fOwner,
            onChange: setFOwner,
            options: facet(records.map((r) => r.owner)),
          },
          {
            key: "businessUnit",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
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
            key: "classification",
            label: "Classification",
            value: fClass,
            onChange: setFClass,
            options: facet(records.map((r) => r.classification)),
          },
        ]}
        presets={[{ label: "All shared assets", onApply: clearFilters }]}
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
            <HeaderButton icon={<UploadCloud size={13} />} onClick={clear}>
              Publish ({ids.length})
            </HeaderButton>
            <HeaderButton onClick={clear}>Unpublish</HeaderButton>
            <HeaderButton icon={<UserPlus size={13} />} onClick={clear}>
              Assign Owner
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
              {
                label: r.status === "Published" ? "Unpublish" : "Publish",
                onClick: () => {},
              },
              { label: "Assign Owner", onClick: () => setSelId(r.id) },
              { label: "View Consumers", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Package size={20} />}
            title="No shared assets have been registered."
            hint="Register a shared asset to publish a reusable enterprise capability consumed across multiple workspaces under governance."
            cta="Register Shared Asset"
            onCta={() => navigate("/admin/workspace-governance?tab=cross")}
          />
        }
      />

      {sel && <AssetDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function SharedAssetsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Shared Assets"
        subtitle="Manage enterprise assets that are securely shared between workspaces while maintaining centralized governance, ownership, compliance, and lifecycle management."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspace-governance?tab=cross")}
            >
              Register Asset
            </HeaderButton>
          </>
        }
      />
      <SharedAssetsView />
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
  { id: "access", label: "Access Control", icon: <KeyRound size={13} /> },
  { id: "deps", label: "Dependencies", icon: <Network size={13} /> },
  { id: "security", label: "Security", icon: <ShieldCheck size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "versions", label: "Versions", icon: <GitBranch size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function AssetDrawer({ rec, onClose }: { rec: Asset; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.type} · ${rec.classification} · ${rec.status} · ${rec.version}`}
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
          <HeaderButton icon={<UploadCloud size={13} />}>
            {rec.status === "Published" ? "Unpublish" : "Publish"}
          </HeaderButton>
          <HeaderButton icon={<UserPlus size={13} />}>
            Assign Owner
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "consumers" && <ConsumersTab rec={rec} />}
      {tab === "access" && <AccessTab rec={rec} />}
      {tab === "deps" && <DepsTab rec={rec} />}
      {tab === "security" && <SecurityTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "versions" && <VersionsTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Asset }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Asset Name", v: rec.name },
              { k: "Asset ID", v: rec.id },
              { k: "Type", v: rec.type },
              { k: "Category", v: rec.type, sample: true },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Classification", v: rec.classification },
              { k: "Status", v: rec.status },
              { k: "Version", v: rec.version },
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
              { k: "Dependencies", v: rec.dependencies, sample: true },
              { k: "Versions", v: rec.versions, sample: true },
              { k: "Security Findings", v: rec.securityFindings, sample: true },
              {
                k: "Compliance Score",
                v: `${rec.complianceScore}%`,
                sample: true,
              },
              { k: "Availability", v: `${rec.availability}%`, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function ConsumersTab({ rec }: { rec: Asset }) {
  const list = Array.from({ length: Math.min(8, rec.consumers) }, (_, i) => {
    const m = hashId(`${rec.id}-c-${i}`);
    return {
      id: `${rec.id}-c-${i}`,
      workspace: pick(WORKSPACES, m),
      environment: pick(ENVIRONMENTS, m),
      accessLevel: pick(["Read", "Read/Write", "Admin"], m),
      approvedBy: pick(OWNERS, m),
      status: pick(["Active", "Active", "Suspended"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "environment", header: "Environment", render: (r) => r.environment },
    {
      key: "accessLevel",
      header: "Access Level",
      render: (r) => r.accessLevel,
    },
    { key: "approvedBy", header: "Approved By", render: (r) => r.approvedBy },
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
        <HeaderButton icon={<KeyRound size={13} />}>Grant Access</HeaderButton>
        <HeaderButton variant="danger" icon={<UserMinus size={13} />}>
          Revoke Access
        </HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function AccessTab({ rec }: { rec: Asset }) {
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
        <StatRow label="Authorized Workspaces" value={rec.consumers} sample />
        <StatRow label="Roles" value={3 + (hashId(rec.id) % 5)} sample />
        <StatRow label="Groups" value={2 + (hashId(rec.id) % 6)} sample />
        <StatRow
          label="Approval Policies"
          value={rec.classification === "Restricted" ? "Required" : "Standard"}
          sample
        />
        <StatRow
          label="Inheritance"
          value={hashId(rec.id) % 2 === 0 ? "Enabled" : "Disabled"}
          sample
        />
        <StatRow label="Restrictions" value={rec.classification} sample />
      </Section>
    </>
  );
}

function DepsTab({ rec }: { rec: Asset }) {
  const list = Array.from({ length: 2 + rec.dependencies }, (_, i) => {
    const m = hashId(`${rec.id}-d-${i}`);
    return {
      id: `${rec.id}-d-${i}`,
      dependency: pick(
        [
          "Identity Provider",
          "Shared VPC",
          "Central Secrets",
          "Logging Platform",
          "API Gateway",
        ],
        m,
      ),
      type: pick(["Security", "Network", "Secrets", "Platform", "API"], m),
      workspace: pick(WORKSPACES, m),
      status: pick(["Active", "Active", "Degraded"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "dependency", header: "Dependency", render: (r) => r.dependency },
    { key: "type", header: "Type", render: (r) => r.type },
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
        Asset relationships — dependent assets and consumers. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function SecurityTab({ rec }: { rec: Asset }) {
  const controls = [
    "Encryption",
    "Authentication",
    "Authorization",
    "Secrets",
    "Audit Logging",
  ];
  const list = controls.map((c) => {
    const m = hashId(rec.id + c);
    return {
      id: c,
      control: c,
      status: pick(["Enabled", "Enabled", "Partial"], m),
      severity: pick(["Low", "Medium", "High"], m),
      recommendation: pick(["Maintain", "Rotate", "Review"], m),
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
    { key: "severity", header: "Severity", render: (r) => r.severity },
    {
      key: "recommendation",
      header: "Recommendation",
      render: (r) => r.recommendation,
    },
  ];
  return (
    <>
      <Section title="Security posture" sample>
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

function ComplianceTab({ rec }: { rec: Asset }) {
  const list = FRAMEWORKS.map((f) => {
    const m = hashId(rec.id + f);
    const passed = 4 + (m % 16);
    const failed = m % 4;
    return {
      id: f,
      framework: f,
      status: failed === 0 ? "Compliant" : "Gaps",
      passed,
      failed,
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "framework", header: "Framework", render: (r) => r.framework },
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
    { key: "passed", header: "Controls Passed", render: (r) => r.passed },
    { key: "failed", header: "Controls Failed", render: (r) => r.failed },
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
        Compliance posture for this shared asset. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function VersionsTab({ rec }: { rec: Asset }) {
  const list = Array.from({ length: rec.versions }, (_, i) => {
    const m = hashId(`${rec.id}-v-${i}`);
    return {
      id: `${rec.id}-v-${i}`,
      version: `v${rec.versions - i}.${m % 9}`,
      releaseDate: `2026-0${1 + (m % 8)}-${(1 + (m % 27)).toString().padStart(2, "0")}`,
      publisher: pick(OWNERS, m),
      status:
        i === 0 ? "Current" : i === rec.versions - 1 ? "Retired" : "Superseded",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "version", header: "Version", render: (r) => r.version },
    {
      key: "releaseDate",
      header: "Release Date",
      render: (r) => r.releaseDate,
    },
    { key: "publisher", header: "Publisher", render: (r) => r.publisher },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Current" ? T.success : T.textMuted }}
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
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <HeaderButton icon={<UploadCloud size={13} />}>
          Publish Version
        </HeaderButton>
        <HeaderButton icon={<History size={13} />}>Rollback</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ActivityTab({ rec }: { rec: Asset }) {
  const events = [
    "Asset Registered",
    "Asset Published",
    "Access Granted",
    "Access Revoked",
    "Version Published",
    "Owner Changed",
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
    "Asset Created",
    "Asset Updated",
    "Asset Published",
    "Access Granted",
    "Access Revoked",
    "Owner Changed",
    "Compliance Scan",
    "Security Scan",
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

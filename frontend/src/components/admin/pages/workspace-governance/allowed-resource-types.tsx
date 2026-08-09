/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Resource Boundaries → Allowed Resource Types */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Ban,
  Upload,
  Download,
  RefreshCcw,
  UserCheck,
  ClipboardCheck,
  FileText,
  RefreshCw,
  GitCompare,
  RotateCcw,
  LayoutGrid,
  Cloud,
  ShieldCheck,
  Layers,
  BadgeCheck,
  Network,
  FilePlus2,
  History,
  Boxes,
  Check,
  X,
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
 * Allowed Resource Types — the authoritative governance layer defining which categories of
 * infrastructure, cloud services, platforms and enterprise assets may exist within a workspace. It
 * establishes the workspace resource catalog and prevents unauthorized resource types from being
 * provisioned, imported or managed. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/02_Inheritance & Overrides/allowed_resource_types.md
 * (filed under Resource Boundaries; surfaced in the Inheritance & Overrides console for this release).
 *
 * Enterprise-Governance UX pattern (Banner · KPI Dashboard · Toolbar · Filters · Search · Datatable ·
 * Bulk/Row actions · 9-tab Resource Type Detail Drawer). No catalog backend yet → deterministic sample.
 */

type Category =
  | "Cloud"
  | "Compute"
  | "Containers"
  | "Networking"
  | "Storage"
  | "Databases"
  | "Identity"
  | "Security"
  | "AI & ML"
  | "SaaS"
  | "Custom";
type Provider =
  | "AWS"
  | "Azure"
  | "GCP"
  | "Kubernetes"
  | "Docker"
  | "VMware"
  | "On-Premises"
  | "SaaS";
type Status = "Allowed" | "Restricted";

const PROVIDERS: Provider[] = [
  "AWS",
  "Azure",
  "GCP",
  "Kubernetes",
  "Docker",
  "VMware",
  "On-Premises",
  "SaaS",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const WORKSPACES = [
  "Payments",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Mobile API",
];
const POLICIES = [
  "Enterprise Cloud Policy",
  "Data Platform Standard",
  "AI Governance Policy",
  "Network Baseline",
  "Security Services Policy",
];
const FRAMEWORKS = [
  "ISO 27001",
  "SOC 2",
  "NIST",
  "PCI DSS",
  "HIPAA",
  "CSA CCM",
  "CIS Benchmarks",
];
const OWNERS = [
  "Enterprise Architect",
  "Cloud Team",
  "Platform Team",
  "Security Team",
  "Governance Admin",
];

const STATUS_TONE: Record<Status, string> = {
  Allowed: T.success,
  Restricted: T.danger,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface ResType {
  id: string;
  name: string;
  category: Category;
  provider: Provider;
  status: Status;
  inherited: boolean;
  custom: boolean;
  policy: string;
  workspace: string;
  environment: string;
  owner: string;
  created: string;
  description: string;
  usingWorkspaces: number;
  policies: number;
  exceptions: number;
  complianceControls: number;
  dependencies: number;
}

const RES_SEED: { name: string; cat: Category; prov: Provider }[] = [
  { name: "Amazon S3", cat: "Storage", prov: "AWS" },
  { name: "Amazon EC2", cat: "Compute", prov: "AWS" },
  { name: "Azure Blob Storage", cat: "Storage", prov: "Azure" },
  { name: "Google Compute Engine", cat: "Compute", prov: "GCP" },
  { name: "Kubernetes Cluster", cat: "Containers", prov: "Kubernetes" },
  { name: "Container Registry", cat: "Containers", prov: "Kubernetes" },
  { name: "VPC", cat: "Networking", prov: "AWS" },
  { name: "Load Balancer", cat: "Networking", prov: "Azure" },
  { name: "PostgreSQL", cat: "Databases", prov: "AWS" },
  { name: "Cosmos DB", cat: "Databases", prov: "Azure" },
  { name: "AWS IAM", cat: "Identity", prov: "AWS" },
  { name: "Key Management", cat: "Security", prov: "AWS" },
  { name: "Vector Database", cat: "AI & ML", prov: "GCP" },
  { name: "LLM Gateway", cat: "AI & ML", prov: "SaaS" },
  { name: "GitHub", cat: "SaaS", prov: "SaaS" },
  { name: "Bare Metal Node", cat: "Compute", prov: "On-Premises" },
];

const SAMPLE_TYPES: ResType[] = RES_SEED.map(({ name, cat, prov }, i) => {
  const id = `RT-${(1000 + i * 7).toString().padStart(5, "0")}`;
  const n = hashId(id + name);
  const status = pick<Status>(
    ["Allowed", "Allowed", "Allowed", "Restricted"],
    n,
  );
  return {
    id,
    name,
    category: cat,
    provider: prov,
    status,
    inherited: n % 3 !== 0,
    custom: cat === "Custom",
    policy: pick(POLICIES, n),
    workspace: pick(WORKSPACES, n >> 1),
    environment: pick(ENVIRONMENTS, n >> 2),
    owner: pick(OWNERS, n),
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    description: `${name} (${cat}) provisioning governed by ${pick(POLICIES, n)} across approved workspaces.`,
    usingWorkspaces: 1 + (n % 60),
    policies: 1 + (n % 6),
    exceptions: n % 4,
    complianceControls: 2 + (n % 14),
    dependencies: n % 6,
  };
});

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_TONE[status];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      {status === "Allowed" ? <Check size={12} /> : <Ban size={12} />}
      {status}
    </span>
  );
}

export function AllowedResourceTypesView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fCat, setFCat] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fPolicy, setFPolicy] = React.useState("");
  const [fInherit, setFInherit] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_TYPES;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.policy.toLowerCase().includes(q)) &&
      (!fCat || r.category === fCat) &&
      (!fProvider || r.provider === fProvider) &&
      (!fWs || r.workspace === fWs) &&
      (!fEnv || r.environment === fEnv) &&
      (!fStatus || r.status === fStatus) &&
      (!fPolicy || r.policy === fPolicy) &&
      (!fInherit || (fInherit === "inherited") === r.inherited)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFCat("");
    setFProvider("");
    setFWs("");
    setFEnv("");
    setFStatus("");
    setFPolicy("");
    setFInherit("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // KPI Summary (spec §KPI Summary).
  const allowed = records.filter((r) => r.status === "Allowed").length;
  const restricted = records.filter((r) => r.status === "Restricted").length;
  const custom = records.filter((r) => r.custom).length;
  const inherited = records.filter((r) => r.inherited).length;
  const overrides = records.filter((r) => !r.inherited).length;
  const exceptions = records.reduce((a, r) => a + r.exceptions, 0);
  const coverage = Math.round(
    (records.filter((r) => r.complianceControls > 0).length / records.length) *
      100,
  );

  const toolbar: CommandItem[] = [
    {
      key: "allow",
      label: "Allow Resource Type",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=inheritance"),
    },
    {
      key: "restrict",
      label: "Restrict Resource Type",
      icon: <Ban size={15} />,
      disabled: true,
    },
    {
      key: "import",
      label: "Import Catalog",
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
      onClick: () => setSelId(null),
    },
    {
      key: "assign",
      label: "Assign Policy",
      icon: <UserCheck size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Policies",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "sync",
      label: "Synchronize",
      icon: <RefreshCw size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Org Defaults",
      icon: <GitCompare size={15} />,
      disabled: true,
    },
    {
      key: "restore",
      label: "Restore Defaults",
      icon: <RotateCcw size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<ResType>[] = [
    {
      key: "name",
      header: "Resource Type",
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
          <Boxes size={13} color={T.textMuted} />
          {r.name}
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
      key: "provider",
      header: "Provider",
      sortValue: (r) => r.provider,
      render: (r) => r.provider,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "inherited",
      header: "Inherited",
      sortValue: (r) => (r.inherited ? 1 : 0),
      render: (r) => (r.inherited ? "Yes" : "No"),
    },
    {
      key: "policy",
      header: "Policy",
      sortValue: (r) => r.policy,
      render: (r) => r.policy,
    },
    {
      key: "workspace",
      header: "Workspace",
      sortValue: (r) => r.workspace,
      render: (r) => r.workspace,
    },
  ];

  return (
    <>
      <StatStripPlain
        items={[
          { label: "Allowed Types", value: allowed, tone: "ok" },
          {
            label: "Restricted Types",
            value: restricted,
            tone: restricted > 0 ? "warn" : "ok",
          },
          { label: "Custom Types", value: custom, tone: "ok" },
          { label: "Inherited Types", value: inherited, tone: "ok" },
          {
            label: "Workspace Overrides",
            value: overrides,
            tone: overrides > 0 ? "warn" : "ok",
          },
          { label: "Policy Violations", value: 0, tone: "ok" },
          {
            label: "Exception Requests",
            value: exceptions,
            tone: exceptions > 0 ? "warn" : "ok",
          },
          {
            label: "Compliance Coverage",
            value: `${coverage}%`,
            tone: coverage >= 80 ? "ok" : "warn",
          },
        ]}
      />

      <DiscoveryListView
        title="Allowed resource types"
        desc="Control which resource types may be provisioned, imported and managed within each workspace — aligning every workspace with enterprise architecture, security standards and compliance requirements."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search resource types — resource type, provider, category, policy, workspace, description…"
        count={rows.length}
        pills={[
          {
            key: "category",
            label: "Category",
            value: fCat,
            onChange: setFCat,
            options: facet(records.map((r) => r.category)),
          },
          {
            key: "provider",
            label: "Provider",
            value: fProvider,
            onChange: setFProvider,
            options: facet(records.map((r) => r.provider)),
          },
          {
            key: "workspace",
            label: "Workspace",
            value: fWs,
            onChange: setFWs,
            options: facet(records.map((r) => r.workspace)),
          },
          {
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
          {
            key: "policy",
            label: "Policy",
            value: fPolicy,
            onChange: setFPolicy,
            options: facet(records.map((r) => r.policy)),
          },
          {
            key: "inheritance",
            label: "Inheritance",
            value: fInherit,
            onChange: setFInherit,
            options: [
              { value: "", label: "All" },
              { value: "inherited", label: "Inherited" },
              { value: "direct", label: "Direct" },
            ],
          },
        ]}
        presets={[
          { label: "All allowed resource types", onApply: clearFilters },
        ]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "category", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Check size={13} />} onClick={clear}>
              Allow ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<Ban size={13} />} onClick={clear}>
              Restrict
            </HeaderButton>
            <HeaderButton icon={<UserCheck size={13} />} onClick={clear}>
              Assign Policy
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
                label: r.status === "Allowed" ? "Restrict" : "Allow",
                onClick: () => {},
              },
              { label: "Assign Policy", onClick: () => setSelId(r.id) },
              { label: "Create Exception", onClick: () => setSelId(r.id) },
              { label: "View Dependencies", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Boxes size={20} />}
            title="No resource types have been configured."
            hint="Import the enterprise resource catalog to define which resource types may exist within each workspace."
            cta="Import Enterprise Resource Catalog"
            onCta={() =>
              navigate("/admin/workspace-governance?tab=inheritance")
            }
          />
        }
      />

      {sel && <ResDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function AllowedResourceTypesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Allowed Resource Types"
        subtitle="Control which resource types may be provisioned, imported, and managed within each workspace."
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
              Allow Resource Type
            </HeaderButton>
          </>
        }
      />
      <AllowedResourceTypesView />
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
  { id: "providers", label: "Supported Providers", icon: <Cloud size={13} /> },
  { id: "policy", label: "Policy Assignment", icon: <ShieldCheck size={13} /> },
  { id: "scope", label: "Workspace Scope", icon: <Layers size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "deps", label: "Dependencies", icon: <Network size={13} /> },
  { id: "exceptions", label: "Exceptions", icon: <FilePlus2 size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function ResDrawer({ rec, onClose }: { rec: ResType; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.category} · ${rec.provider} · ${rec.status}`}
      width={820}
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
            icon={
              rec.status === "Allowed" ? <Ban size={13} /> : <Check size={13} />
            }
          >
            {rec.status === "Allowed" ? "Restrict" : "Allow"}
          </HeaderButton>
          <HeaderButton icon={<UserCheck size={13} />}>
            Assign Policy
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "providers" && <ProvidersTab rec={rec} />}
      {tab === "policy" && <PolicyTab rec={rec} />}
      {tab === "scope" && <ScopeTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "deps" && <DepsTab rec={rec} />}
      {tab === "exceptions" && <ExceptionsTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: ResType }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Resource Type", v: rec.name },
              { k: "Category", v: rec.category },
              { k: "Provider", v: rec.provider },
              { k: "Status", v: rec.status },
              { k: "Inherited", v: rec.inherited ? "Yes" : "No" },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Created Date", v: rec.created, sample: true },
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
              { k: "Using Workspaces", v: rec.usingWorkspaces, sample: true },
              { k: "Policies", v: rec.policies, sample: true },
              { k: "Exceptions", v: rec.exceptions, sample: true },
              {
                k: "Compliance Controls",
                v: rec.complianceControls,
                sample: true,
              },
              { k: "Dependencies", v: rec.dependencies, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function ProvidersTab({ rec }: { rec: ResType }) {
  const list = PROVIDERS.map((p) => {
    const m = hashId(rec.id + p);
    const supported = p === rec.provider || m % 2 === 0;
    return {
      id: p,
      provider: p,
      supported: supported ? "Yes" : "No",
      version: supported ? `v${1 + (m % 5)}` : "—",
      status: supported
        ? p === rec.provider
          ? "Primary"
          : "Supported"
        : "Unsupported",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "provider", header: "Provider", render: (r) => r.provider },
    { key: "supported", header: "Supported", render: (r) => r.supported },
    { key: "version", header: "Version", render: (r) => r.version },
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
        Providers on which this resource type is supported. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function PolicyTab({ rec }: { rec: ResType }) {
  const list = Array.from({ length: rec.policies }, (_, i) => {
    const m = hashId(`${rec.id}-p-${i}`);
    return {
      id: `${rec.id}-p-${i}`,
      policy: i === 0 ? rec.policy : pick(POLICIES, m),
      scope: pick(["Organization", "Business Unit", "Workspace"], m),
      enforcement: pick(["Enforced", "Monitoring", "Required Approval"], m),
      status: pick(["Active", "Active", "Draft"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "policy", header: "Policy", render: (r) => r.policy },
    { key: "scope", header: "Assignment Scope", render: (r) => r.scope },
    { key: "enforcement", header: "Enforcement", render: (r) => r.enforcement },
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
        <HeaderButton variant="danger" icon={<X size={13} />}>
          Remove
        </HeaderButton>
        <HeaderButton icon={<ShieldCheck size={13} />}>
          View Policy
        </HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ScopeTab({ rec }: { rec: ResType }) {
  const list = WORKSPACES.map((w) => {
    const m = hashId(rec.id + w);
    return {
      id: w,
      workspace: w,
      environment: pick(ENVIRONMENTS, m),
      allowed: m % 4 === 0 ? "Restricted" : "Allowed",
      inherited: m % 3 === 0 ? "Inherited" : "Direct",
      override: m % 5 === 0 ? "Yes" : "No",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "environment", header: "Environment", render: (r) => r.environment },
    {
      key: "allowed",
      header: "Allowed",
      render: (r) => (
        <span style={{ color: r.allowed === "Allowed" ? T.success : T.danger }}>
          {r.allowed}
        </span>
      ),
    },
    { key: "inherited", header: "Inherited", render: (r) => r.inherited },
    { key: "override", header: "Override", render: (r) => r.override },
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
        Where this resource type is permitted. Organization → Workspace →
        Allowed Resource Type. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ComplianceTab({ rec }: { rec: ResType }) {
  const list = FRAMEWORKS.map((f) => {
    const m = hashId(rec.id + f);
    return {
      id: f,
      framework: f,
      required: m % 2 === 0 ? "Required" : "Optional",
      status: pick(["Compliant", "Compliant", "Gap"], m),
      controls: 1 + (m % 8),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "framework", header: "Framework", render: (r) => r.framework },
    { key: "required", header: "Required", render: (r) => r.required },
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
    { key: "controls", header: "Controls", render: (r) => r.controls },
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
        Compliance frameworks mapped to this resource type. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function DepsTab({ rec }: { rec: ResType }) {
  const list = Array.from({ length: 2 + (hashId(rec.id) % 4) }, (_, i) => {
    const m = hashId(`${rec.id}-d-${i}`);
    return {
      id: `${rec.id}-d-${i}`,
      dep: pick(
        [
          "IAM Role",
          "VPC",
          "Key Management",
          "Container Registry",
          "Storage Bucket",
        ],
        m,
      ),
      rel: pick(["Requires", "Consumes", "Depends on"], m),
      required: m % 2 === 0 ? "Yes" : "No",
      status: pick(["Active", "Active", "Pending"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "dep", header: "Dependency", render: (r) => r.dep },
    { key: "rel", header: "Relationship", render: (r) => r.rel },
    { key: "required", header: "Required", render: (r) => r.required },
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
        Prerequisite resource types and dependent services. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ExceptionsTab({ rec }: { rec: ResType }) {
  const list = Array.from({ length: rec.exceptions }, (_, i) => {
    const m = hashId(`${rec.id}-e-${i}`);
    return {
      id: `${rec.id}-e-${i}`,
      exception: `EX-${1000 + (m % 9000)}`,
      workspace: pick(WORKSPACES, m),
      reason: pick(
        [
          "Migration",
          "Proof of Concept",
          "Legacy Support",
          "Customer Requirement",
        ],
        m,
      ),
      approvedBy: pick(OWNERS, m),
      expiration: `2026-0${1 + (m % 8)}-${(1 + (m % 27)).toString().padStart(2, "0")}`,
      status: pick(["Active", "Pending", "Expired"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "exception", header: "Exception", render: (r) => r.exception },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "reason", header: "Reason", render: (r) => r.reason },
    { key: "approvedBy", header: "Approved By", render: (r) => r.approvedBy },
    { key: "expiration", header: "Expiration", render: (r) => r.expiration },
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
        <HeaderButton icon={<FilePlus2 size={13} />}>
          Create Exception
        </HeaderButton>
        <HeaderButton icon={<Check size={13} />}>Approve</HeaderButton>
        <HeaderButton variant="danger" icon={<X size={13} />}>
          Reject
        </HeaderButton>
        <SampleTag />
      </div>
      {list.length ? (
        <DirectoryTable columns={cols} rows={list} />
      ) : (
        <EmptyState
          icon={<FilePlus2 size={18} />}
          title="No exceptions"
          hint="No temporary governance exceptions exist for this resource type."
        />
      )}
    </>
  );
}

function ActivityTab({ rec }: { rec: ResType }) {
  const events = [
    "Resource Allowed",
    "Resource Restricted",
    "Policy Assigned",
    "Exception Created",
    "Exception Approved",
    "Configuration Updated",
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
    "Resource Type Created",
    "Policy Assigned",
    "Policy Removed",
    "Workspace Override",
    "Exception Approved",
    "Restriction Applied",
    "Allowed Resource Updated",
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

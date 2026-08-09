/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Resource Boundaries → Resource Ownership */
import React from "react";
import { useNavigate } from "react-router";
import {
  UserPlus,
  ArrowLeftRight,
  UserMinus,
  Users,
  Download,
  ClipboardCheck,
  ScanSearch,
  FileText,
  RefreshCcw,
  Upload,
  LayoutGrid,
  UserSquare,
  ShieldCheck,
  Network,
  BadgeCheck,
  History,
  AlertTriangle,
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
 * Resource Ownership — authoritative accountability for every managed resource. Every asset must carry
 * a Business Owner and a Technical Owner responsible for governance, operations, security, compliance,
 * lifecycle, approvals and business accountability; ownership is the foundation for automation, incident
 * routing, approvals, compliance evidence and chargeback. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/02_Inheritance & Overrides/resource_ownership.md
 * (filed under Resource Boundaries; surfaced in the Inheritance & Overrides console for this release).
 *
 * Enterprise-Governance UX pattern (Banner · KPI Dashboard · Toolbar · Filters · Search · Datatable ·
 * Bulk/Row actions · 7-tab Ownership Detail Drawer). No inventory backend yet → deterministic sample.
 */

type ResourceType =
  | "Application"
  | "Database"
  | "Cloud Account"
  | "Kubernetes"
  | "Network"
  | "Storage"
  | "AI Service"
  | "SaaS";
type OwnershipStatus =
  | "Owned"
  | "Orphaned"
  | "Under Review"
  | "Pending Transfer";
type Environment = "Production" | "Pre-production" | "Development" | "Sandbox";

const ENVIRONMENTS: Environment[] = [
  "Production",
  "Pre-production",
  "Development",
  "Sandbox",
];
const PROVIDERS = ["AWS", "Azure", "GCP", "Kubernetes", "On-Premises"];
const WORKSPACES = [
  "Payments",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Mobile API",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const DEPARTMENTS = ["Platform", "Cloud", "Security", "Data", "Applications"];
const BUSINESS_OWNERS = [
  "Payments Director",
  "Retail VP",
  "Data Lead",
  "Identity Owner",
  "Analytics Lead",
];
const TECH_OWNERS = [
  "Platform Team",
  "Cloud Team",
  "Data Team",
  "Security Team",
  "App Team",
];
const OWNER_TYPES = [
  "Business Owner",
  "Technical Owner",
  "Security Owner",
  "Compliance Owner",
  "Service Owner",
  "Custodian",
];

const STATUS_TONE: Record<OwnershipStatus, string> = {
  Owned: T.success,
  Orphaned: T.danger,
  "Under Review": T.warning,
  "Pending Transfer": T.accent,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  businessOwner: string;
  technicalOwner: string;
  workspace: string;
  environment: Environment;
  status: OwnershipStatus;
  businessUnit: string;
  department: string;
  provider: string;
  created: string;
  daysWithoutOwner: number;
  owners: number;
  consumers: number;
  dependencies: number;
  policies: number;
  complianceControls: number;
  reviews: number;
}

const RES_SEED: { name: string; type: ResourceType }[] = [
  { name: "Payments API", type: "Application" },
  { name: "Orders Database", type: "Database" },
  { name: "Prod AWS Account", type: "Cloud Account" },
  { name: "Retail EKS Cluster", type: "Kubernetes" },
  { name: "Core VPC", type: "Network" },
  { name: "Data Lake Bucket", type: "Storage" },
  { name: "LLM Gateway", type: "AI Service" },
  { name: "Salesforce Org", type: "SaaS" },
  { name: "Identity Service", type: "Application" },
  { name: "Analytics Warehouse", type: "Database" },
  { name: "Sandbox Subscription", type: "Cloud Account" },
  { name: "Mobile API", type: "Application" },
  { name: "Shared Redis", type: "Database" },
  { name: "Legacy File Share", type: "Storage" },
];

const SAMPLE_RESOURCES: Resource[] = RES_SEED.map(({ name, type }, i) => {
  const id = `RS-${(1000 + i * 7).toString().padStart(5, "0")}`;
  const n = hashId(id + name);
  const status = pick<OwnershipStatus>(
    ["Owned", "Owned", "Owned", "Under Review", "Pending Transfer", "Orphaned"],
    n,
  );
  const orphaned = status === "Orphaned";
  return {
    id,
    name,
    type,
    businessOwner: orphaned ? "—" : pick(BUSINESS_OWNERS, n),
    technicalOwner: orphaned ? "—" : pick(TECH_OWNERS, n >> 1),
    workspace: pick(WORKSPACES, n >> 2),
    environment: pick(ENVIRONMENTS, n >> 3),
    status,
    businessUnit: pick(BUSINESS_UNITS, n),
    department: pick(DEPARTMENTS, n >> 1),
    provider: pick(PROVIDERS, n >> 2),
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    daysWithoutOwner: orphaned ? 5 + (n % 120) : 0,
    owners: orphaned ? 0 : 2 + (n % 4),
    consumers: n % 30,
    dependencies: n % 8,
    policies: 1 + (n % 6),
    complianceControls: 2 + (n % 12),
    reviews: n % 4,
  };
});

function StatusBadge({ status }: { status: OwnershipStatus }) {
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

export function ResourceOwnershipView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fDept, setFDept] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_RESOURCES;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.businessOwner.toLowerCase().includes(q) ||
        r.technicalOwner.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q)) &&
      (!fType || r.type === fType) &&
      (!fProvider || r.provider === fProvider) &&
      (!fWs || r.workspace === fWs) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fEnv || r.environment === fEnv) &&
      (!fStatus || r.status === fStatus) &&
      (!fDept || r.department === fDept)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFProvider("");
    setFWs("");
    setFBu("");
    setFEnv("");
    setFStatus("");
    setFDept("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // KPI Summary (spec §KPI Summary).
  const owned = records.filter((r) => r.status !== "Orphaned").length;
  const orphaned = records.filter((r) => r.status === "Orphaned").length;
  const businessOwners = new Set(
    records.filter((r) => r.businessOwner !== "—").map((r) => r.businessOwner),
  ).size;
  const technicalOwners = new Set(
    records
      .filter((r) => r.technicalOwner !== "—")
      .map((r) => r.technicalOwner),
  ).size;
  const reviews = records.filter((r) => r.status === "Under Review").length;
  const pendingRequests = records.filter(
    (r) => r.status === "Pending Transfer",
  ).length;
  const coverage = Math.round((owned / records.length) * 100);

  const toolbar: CommandItem[] = [
    {
      key: "assign",
      label: "Assign Owner",
      icon: <UserPlus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=inheritance"),
    },
    {
      key: "transfer",
      label: "Transfer Ownership",
      icon: <ArrowLeftRight size={15} />,
      disabled: true,
    },
    {
      key: "remove",
      label: "Remove Owner",
      icon: <UserMinus size={15} />,
      disabled: true,
    },
    {
      key: "bulk",
      label: "Bulk Assignment",
      icon: <Users size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
    {
      key: "review",
      label: "Launch Ownership Review",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "orphan",
      label: "Detect Orphaned",
      icon: <ScanSearch size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Ownership",
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
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "import",
      label: "Import Ownership",
      icon: <Upload size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Resource>[] = [
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
          <UserSquare size={13} color={T.textMuted} />
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
      key: "businessOwner",
      header: "Business Owner",
      sortValue: (r) => r.businessOwner,
      render: (r) => r.businessOwner,
    },
    {
      key: "technicalOwner",
      header: "Technical Owner",
      sortValue: (r) => r.technicalOwner,
      render: (r) => r.technicalOwner,
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
      key: "status",
      header: "Ownership Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard
          title="Owned Resources"
          value={owned}
          tone="ok"
          sub={
            <>
              With valid ownership <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Orphaned Resources"
          value={orphaned}
          tone={orphaned > 0 ? "danger" : "ok"}
          sub={
            <>
              No valid owner <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Business Owners"
          value={businessOwners}
          tone="ok"
          sub={
            <>
              Accountable leaders <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Technical Owners"
          value={technicalOwners}
          tone="ok"
          sub={
            <>
              Operational teams <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Ownership Reviews"
          value={reviews}
          tone={reviews > 0 ? "warn" : "ok"}
          sub={
            <>
              Certification due <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Pending Requests"
          value={pendingRequests}
          tone={pendingRequests > 0 ? "warn" : "ok"}
          sub={
            <>
              Transfers awaiting <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Ownership Violations"
          value={orphaned}
          tone={orphaned > 0 ? "warn" : "ok"}
          sub={
            <>
              Failing governance rules <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Ownership Coverage"
          value={`${coverage}%`}
          tone={coverage >= 90 ? "ok" : "warn"}
          sub={
            <>
              Resources with owners <SampleTag />
            </>
          }
        />
      </PostureGrid>

      <DiscoveryListView
        title="Resource ownership"
        desc="Manage ownership, accountability, governance and stewardship for enterprise resources across all workspaces. Every managed resource must carry a Business Owner and a Technical Owner."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search resources or owners — resource, owner, business unit, workspace, resource ID, application, tags…"
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
            key: "cloudProvider",
            label: "Cloud Provider",
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
            key: "businessUnit",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "department",
            label: "Department",
            value: fDept,
            onChange: setFDept,
            options: facet(records.map((r) => r.department)),
          },
          {
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "ownershipState",
            label: "Ownership State",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
        ]}
        presets={[{ label: "All resource ownership", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "status", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<UserPlus size={13} />} onClick={clear}>
              Assign Owner ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<ArrowLeftRight size={13} />} onClick={clear}>
              Transfer
            </HeaderButton>
            <HeaderButton icon={<ClipboardCheck size={13} />} onClick={clear}>
              Launch Review
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
              { label: "Edit Ownership", onClick: () => setSelId(r.id) },
              { label: "Transfer Ownership", onClick: () => setSelId(r.id) },
              { label: "Launch Review", onClick: () => {} },
              { label: "View Dependencies", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<UserSquare size={20} />}
            title="No ownership assignments exist."
            hint="Assign a Business Owner and Technical Owner to every managed resource to satisfy enterprise governance requirements."
            cta="Assign Resource Owner"
            onCta={() =>
              navigate("/admin/workspace-governance?tab=inheritance")
            }
          />
        }
      />

      {sel && <OwnershipDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function ResourceOwnershipPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Resource Ownership"
        subtitle="Manage ownership, accountability, governance, and stewardship for enterprise resources across all workspaces."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<UserPlus size={14} />}
              onClick={() =>
                navigate("/admin/workspace-governance?tab=inheritance")
              }
            >
              Assign Owner
            </HeaderButton>
          </>
        }
      />
      <ResourceOwnershipView />
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
  { id: "ownership", label: "Ownership", icon: <Users size={13} /> },
  { id: "governance", label: "Governance", icon: <ShieldCheck size={13} /> },
  { id: "deps", label: "Dependencies", icon: <Network size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function OwnershipDrawer({
  rec,
  onClose,
}: {
  rec: Resource;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.type} · ${rec.workspace} · ${rec.status}`}
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
          <HeaderButton icon={<UserPlus size={13} />}>
            Assign Owner
          </HeaderButton>
          <HeaderButton icon={<ArrowLeftRight size={13} />}>
            Transfer
          </HeaderButton>
          <HeaderButton variant="primary" icon={<ClipboardCheck size={13} />}>
            Launch Review
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "ownership" && <OwnershipTab rec={rec} />}
      {tab === "governance" && <GovernanceTab />}
      {tab === "deps" && <DepsTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Resource }) {
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
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Environment", v: rec.environment, sample: true },
              { k: "Cloud Provider", v: rec.provider, sample: true },
              { k: "Status", v: rec.status },
              { k: "Created Date", v: rec.created, sample: true },
            ]}
          />
          {rec.status === "Orphaned" && (
            <div
              style={{
                fontSize: 12.5,
                color: T.danger,
                paddingTop: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertTriangle size={14} /> Orphaned {rec.daysWithoutOwner} days —
              governance violation.
            </div>
          )}
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Owners", v: rec.owners, sample: true },
              { k: "Consumers", v: rec.consumers, sample: true },
              { k: "Dependencies", v: rec.dependencies, sample: true },
              { k: "Policies", v: rec.policies, sample: true },
              {
                k: "Compliance Controls",
                v: rec.complianceControls,
                sample: true,
              },
              { k: "Reviews", v: rec.reviews, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function OwnershipTab({ rec }: { rec: Resource }) {
  const list =
    rec.status === "Orphaned"
      ? []
      : OWNER_TYPES.slice(0, 2 + (hashId(rec.id) % 4)).map((otype, i) => {
          const m = hashId(`${rec.id}-o-${i}`);
          return {
            id: `${rec.id}-o-${i}`,
            owner:
              otype === "Business Owner"
                ? rec.businessOwner
                : otype === "Technical Owner"
                  ? rec.technicalOwner
                  : pick(TECH_OWNERS, m),
            ownershipType: otype,
            department: pick(DEPARTMENTS, m),
            businessUnit: pick(BUSINESS_UNITS, m),
            assigned: `2025-${(1 + (m % 12)).toString().padStart(2, "0")}-${(1 + (m % 27)).toString().padStart(2, "0")}`,
            status: "Active",
          };
        });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "owner", header: "Owner", render: (r) => r.owner },
    {
      key: "ownershipType",
      header: "Ownership Type",
      render: (r) => r.ownershipType,
    },
    { key: "department", header: "Department", render: (r) => r.department },
    {
      key: "businessUnit",
      header: "Business Unit",
      render: (r) => r.businessUnit,
    },
    { key: "assigned", header: "Assigned Date", render: (r) => r.assigned },
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
        <HeaderButton icon={<UserPlus size={13} />}>Assign Owner</HeaderButton>
        <HeaderButton icon={<ArrowLeftRight size={13} />}>
          Transfer Ownership
        </HeaderButton>
        <HeaderButton variant="danger" icon={<UserMinus size={13} />}>
          Remove Owner
        </HeaderButton>
        <SampleTag />
      </div>
      {list.length ? (
        <DirectoryTable columns={cols} rows={list} />
      ) : (
        <EmptyState
          icon={<AlertTriangle size={18} />}
          title="Orphaned resource"
          hint="No valid ownership assigned. Assign a Business Owner and Technical Owner to remediate."
        />
      )}
    </>
  );
}

function GovernanceTab() {
  const items = [
    "Approval Authority",
    "Incident Escalation",
    "Operational Responsibility",
    "Security Responsibility",
    "Compliance Responsibility",
    "Financial Responsibility",
    "Lifecycle Responsibility",
  ];
  return (
    <Section title="Governance responsibilities" sample>
      {items.map((it) => (
        <StatRow key={it} label={it} value="Assigned" tone="ok" sample />
      ))}
    </Section>
  );
}

function DepsTab({ rec }: { rec: Resource }) {
  const list = Array.from({ length: 2 + (hashId(rec.id) % 4) }, (_, i) => {
    const m = hashId(`${rec.id}-d-${i}`);
    return {
      id: `${rec.id}-d-${i}`,
      dep: pick(
        [
          "Payments DB",
          "IAM Role",
          "Shared VPC",
          "Redis Cache",
          "Auth Service",
        ],
        m,
      ),
      rel: pick(["Depends on", "Consumed by", "Connects to"], m),
      owner: pick(TECH_OWNERS, m),
      workspace: pick(WORKSPACES, m),
      status: pick(["Active", "Active", "Pending"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "dep", header: "Dependent Resource", render: (r) => r.dep },
    { key: "rel", header: "Relationship", render: (r) => r.rel },
    { key: "owner", header: "Owner", render: (r) => r.owner },
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
        Relationships between owned resources. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ComplianceTab({ rec }: { rec: Resource }) {
  const frameworks = [
    "ISO 27001",
    "SOC 2",
    "NIST",
    "PCI DSS",
    "HIPAA",
    "CSA CCM",
  ];
  const list = frameworks.map((f) => {
    const m = hashId(rec.id + f);
    return {
      id: f,
      framework: f,
      required: m % 2 === 0 ? "Required" : "Optional",
      review: pick(["Current", "Due", "Overdue"], m),
      status: pick(["Compliant", "Compliant", "Gap"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "framework", header: "Framework", render: (r) => r.framework },
    {
      key: "required",
      header: "Ownership Required",
      render: (r) => r.required,
    },
    { key: "review", header: "Review Status", render: (r) => r.review },
    {
      key: "status",
      header: "Compliance Status",
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
        Ownership accountability mapped to compliance frameworks. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ActivityTab({ rec }: { rec: Resource }) {
  const events = [
    "Owner Assigned",
    "Owner Removed",
    "Ownership Transferred",
    "Ownership Review",
    "Governance Updated",
    "Policy Updated",
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
            ...TECH_OWNERS.map((o) => ({ value: o, label: o })),
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
              {pick(TECH_OWNERS, hashId(rec.id) + i)} ·{" "}
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
    "Ownership Assigned",
    "Ownership Updated",
    "Ownership Removed",
    "Ownership Transferred",
    "Ownership Review Completed",
    "Orphaned Resource Detected",
    "Ownership Restored",
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
          value={`${pick(TECH_OWNERS, i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Inheritance & Overrides → AWS Accounts */
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
  Cloud,
  LayoutGrid,
  Network,
  Users,
  BadgeCheck,
  KeyRound,
  Waypoints,
  CircleDollarSign,
  Activity as ActivityIcon,
  History,
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
 * AWS Accounts — the authoritative inventory and governance layer for AWS tenancy: the AWS accounts a
 * workspace may discover, provision, govern and operate within (the AWS account is the primary security
 * + billing boundary). Enforces org guardrails; integrates AWS Organizations, security services,
 * compliance, IAM, networking and cost. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/02_Inheritance & Overrides/aws_accounts.md.
 *
 * Cloud Resource Management UX (Banner · KPI dashboard · Toolbar · Filters · Search · Datatable ·
 * Bulk/Row actions · 11-tab Account Detail Drawer). No cloud-connector backend here → deterministic
 * representative sample data (tagged `Sample`); swap SAMPLE_ACCOUNTS for the live inventory when the
 * cloud connectors land.
 */

type Environment =
  | "Production"
  | "Staging"
  | "Development"
  | "Sandbox"
  | "Shared Services";
type AccountType = "Production" | "Non-Production" | "Shared";
type Status = "Connected" | "Pending Onboarding" | "Suspended" | "Archived";

const ENVIRONMENTS: Environment[] = [
  "Production",
  "Staging",
  "Development",
  "Sandbox",
  "Shared Services",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const REGIONS = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"];
const OWNERS = [
  "Cloud Team",
  "Aisha Khan",
  "David Chen",
  "Marco Rossi",
  "Priya Nair",
];
const COMPLIANCE = ["Compliant", "Warnings", "Non-Compliant"];

const STATUS_TONE: Record<Status, string> = {
  Connected: T.success,
  "Pending Onboarding": T.warning,
  Suspended: T.warning,
  Archived: T.textMuted,
};

interface Account {
  id: string;
  name: string;
  accountId: string;
  workspace: string;
  environment: Environment;
  accountType: AccountType;
  owner: string;
  regionCount: number;
  resources: number;
  status: Status;
  businessUnit: string;
  region: string;
  compliance: string;
  securityFindings: number;
  monthlyCost: number;
  complianceScore: number;
  created: string;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

const ACCOUNT_NAMES = [
  "Payments Production",
  "Treasury Analytics",
  "Retail Storefront",
  "Platform Core",
  "Cloud Foundations",
  "Data Lake",
  "Billing Engine",
  "Customer Trust",
  "Research Sandbox",
  "Shared Networking",
  "DR Secondary",
  "Sandbox Playground",
];

const SAMPLE_ACCOUNTS: Account[] = ACCOUNT_NAMES.map((name, i) => {
  const id = `AWS-${(1000 + i * 3).toString().padStart(5, "0")}`;
  const n = hashId(id + name);
  const env = pick(ENVIRONMENTS, n);
  return {
    id,
    name,
    accountId: (100000000000 + (hashId(name) % 899999999999)).toString(),
    workspace: name.split(" ")[0],
    environment: env,
    accountType:
      env === "Production"
        ? "Production"
        : env === "Shared Services"
          ? "Shared"
          : "Non-Production",
    owner: pick(OWNERS, n),
    regionCount: 1 + (n % 8),
    resources: 40 + (n % 2000),
    status: pick<Status>(
      [
        "Connected",
        "Connected",
        "Connected",
        "Pending Onboarding",
        "Suspended",
        "Archived",
      ],
      n,
    ),
    businessUnit: pick(BUSINESS_UNITS, n >> 1),
    region: pick(REGIONS, n >> 2),
    compliance: pick(COMPLIANCE, n),
    securityFindings: n % 40,
    monthlyCost: 4 + (n % 220),
    complianceScore: 70 + (n % 30),
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

export function AwsAccountsView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fRegion, setFRegion] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_ACCOUNTS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.accountId.includes(q) ||
        r.workspace.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q)) &&
      (!fWorkspace || r.workspace === fWorkspace) &&
      (!fEnv || r.environment === fEnv) &&
      (!fType || r.accountType === fType) &&
      (!fStatus || r.status === fStatus) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fRegion || r.region === fRegion) &&
      (!fCompliance || r.compliance === fCompliance)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFWorkspace("");
    setFEnv("");
    setFType("");
    setFStatus("");
    setFBu("");
    setFRegion("");
    setFCompliance("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // KPI / Operational Dashboard (spec §KPI Summary + §Operational Dashboard).
  const connected = records.filter((r) => r.status === "Connected").length;
  const production = records.filter(
    (r) => r.accountType === "Production",
  ).length;
  const nonProd = records.filter(
    (r) => r.accountType === "Non-Production",
  ).length;
  const shared = records.filter((r) => r.accountType === "Shared").length;
  const pending = records.filter(
    (r) => r.status === "Pending Onboarding",
  ).length;
  const findings = records.reduce((a, r) => a + r.securityFindings, 0);
  const cost = records.reduce((a, r) => a + r.monthlyCost, 0);
  const avgScore = Math.round(
    records.reduce((a, r) => a + r.complianceScore, 0) / records.length,
  );

  const toolbar: CommandItem[] = [
    {
      key: "connect",
      label: "Connect AWS Account",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=inheritance"),
    },
    {
      key: "request",
      label: "Request Account",
      icon: <Inbox size={15} />,
      disabled: true,
    },
    {
      key: "import",
      label: "Import Accounts",
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
      key: "discover",
      label: "Discover Resources",
      icon: <SearchIcon size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Account>[] = [
    {
      key: "name",
      header: "Account",
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
          <Cloud size={14} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    {
      key: "accountId",
      header: "AWS Account ID",
      sortValue: (r) => r.accountId,
      render: (r) => (
        <span style={{ fontFamily: "monospace" }}>{r.accountId}</span>
      ),
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
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "regionCount",
      header: "Region Count",
      sortValue: (r) => r.regionCount,
      render: (r) => r.regionCount,
    },
    {
      key: "resources",
      header: "Resources",
      sortValue: (r) => r.resources,
      render: (r) => r.resources.toLocaleString(),
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
          { label: "Connected Accounts", value: connected, tone: "ok" },
          { label: "Production Accounts", value: production },
          { label: "Non-Production Accounts", value: nonProd },
          { label: "Shared Accounts", value: shared },
          {
            label: "Pending Onboarding",
            value: pending,
            tone: pending > 0 ? "warn" : "ok",
          },
          {
            label: "Compliance Score",
            value: `${avgScore}%`,
            tone: avgScore >= 85 ? "ok" : "warn",
          },
          {
            label: "Security Findings",
            value: findings,
            tone: findings > 0 ? "warn" : "ok",
          },
          { label: "Monthly Cost", value: `$${cost}k` },
        ]}
      />

      <DiscoveryListView
        title="AWS accounts"
        desc="The authoritative AWS tenancy inventory — each account is a security and billing boundary a workspace is authorized to operate within, under enterprise governance guardrails."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search AWS accounts — account name, account ID, workspace, business unit, environment, owner, tags…"
        count={rows.length}
        pills={[
          {
            key: "workspace",
            label: "Workspace",
            value: fWorkspace,
            onChange: setFWorkspace,
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
            key: "accountType",
            label: "Account Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.accountType)),
          },
          {
            key: "accountStatus",
            label: "Account Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
          {
            key: "businessUnit",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "region",
            label: "Region",
            value: fRegion,
            onChange: setFRegion,
            options: facet(records.map((r) => r.region)),
          },
          {
            key: "compliance",
            label: "Compliance",
            value: fCompliance,
            onChange: setFCompliance,
            options: facet(records.map((r) => r.compliance)),
          },
        ]}
        presets={[{ label: "All aws accounts", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "resources", dir: "desc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<UserCheck size={13} />} onClick={clear}>
              Assign ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<RefreshCcw size={13} />} onClick={clear}>
              Synchronize
            </HeaderButton>
            <HeaderButton icon={<Boxes size={13} />} onClick={clear}>
              Inventory
            </HeaderButton>
            <HeaderButton icon={<ShieldCheck size={13} />} onClick={clear}>
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
              { label: "Assign Workspace", onClick: () => setSelId(r.id) },
              { label: "View Resources", onClick: () => setSelId(r.id) },
              { label: "Run Inventory", onClick: () => setSelId(r.id) },
              { label: "Compliance", onClick: () => setSelId(r.id) },
              { label: "Security Findings", onClick: () => setSelId(r.id) },
              { label: "Cost Analysis", onClick: () => setSelId(r.id) },
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
            icon={<Cloud size={20} />}
            title="No AWS accounts have been connected."
            hint="Connect an AWS account to bring its tenancy under enterprise governance and authorize workspaces to operate within it."
            cta="Connect AWS Account"
            onCta={() =>
              navigate("/admin/workspace-governance?tab=inheritance")
            }
          />
        }
      />

      {sel && <AccountDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function AwsAccountsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="AWS Accounts"
        subtitle="Manage AWS accounts assigned to workspaces, enforce governance boundaries, and control cloud resource access."
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
              Connect AWS Account
            </HeaderButton>
          </>
        }
      />
      <AwsAccountsView />
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

function MiniTable<R extends { id: string }>({
  rows,
  cols,
}: {
  rows: R[];
  cols: Column<R>[];
}) {
  return <DirectoryTable columns={cols} rows={rows} />;
}

// ════════════ AWS Account Detail Drawer — 11 sub-tabs (spec §AWS Account Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "organization", label: "Organization", icon: <Network size={13} /> },
  {
    id: "assignments",
    label: "Workspace Assignments",
    icon: <Users size={13} />,
  },
  { id: "resources", label: "Resources", icon: <Boxes size={13} /> },
  { id: "security", label: "Security", icon: <ShieldCheck size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "iam", label: "IAM Integration", icon: <KeyRound size={13} /> },
  { id: "networking", label: "Networking", icon: <Waypoints size={13} /> },
  {
    id: "cost",
    label: "Cost Management",
    icon: <CircleDollarSign size={13} />,
  },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function AccountDrawer({
  rec,
  onClose,
}: {
  rec: Account;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.accountId} · ${rec.workspace} · ${rec.environment} · ${rec.status}`}
      width={880}
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
          <HeaderButton icon={<Boxes size={13} />}>Run Inventory</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "organization" && <OrganizationTab rec={rec} />}
      {tab === "assignments" && <AssignmentsTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "security" && <SecurityTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "iam" && <IamTab />}
      {tab === "networking" && <NetworkingTab rec={rec} />}
      {tab === "cost" && <CostTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Account }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Account Name", v: rec.name },
              { k: "AWS Account ID", v: rec.accountId },
              { k: "AWS Organization", v: "o-contoso", sample: true },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Workspace", v: rec.workspace },
              { k: "Environment", v: rec.environment },
              { k: "Status", v: rec.status },
              { k: "Owner", v: rec.owner, sample: true },
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
              {
                k: "Resources",
                v: rec.resources.toLocaleString(),
                sample: true,
              },
              { k: "Regions", v: rec.regionCount, sample: true },
              { k: "IAM Roles", v: 8 + (hashId(rec.id) % 40), sample: true },
              { k: "VPCs", v: 1 + (hashId(rec.id) % 6), sample: true },
              { k: "Clusters", v: hashId(rec.id) % 5, sample: true },
              {
                k: "Compliance Score",
                v: `${rec.complianceScore}%`,
                sample: true,
              },
              { k: "Security Findings", v: rec.securityFindings, sample: true },
              { k: "Monthly Spend", v: `$${rec.monthlyCost}k`, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function OrganizationTab({ rec }: { rec: Account }) {
  return (
    <Section title="Organization detail" sample>
      <KVGrid
        items={[
          { k: "Organization", v: "o-contoso", sample: true },
          {
            k: "Organizational Unit",
            v: `OU-${rec.businessUnit}`,
            sample: true,
          },
          { k: "Management Account", v: "111122223333", sample: true },
          {
            k: "Inherited SCPs",
            v: "3 service control policies",
            sample: true,
          },
          { k: "Account Tags", v: "cost-center, owner, env", sample: true },
        ]}
      />
    </Section>
  );
}

function AssignmentsTab({ rec }: { rec: Account }) {
  const list = [
    {
      id: "1",
      workspace: rec.workspace,
      environment: rec.environment,
      ownership: "Owner",
      access: "Full",
      status: "Active",
    },
  ];
  const cols: Column<(typeof list)[number]>[] = [
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "environment", header: "Environment", render: (r) => r.environment },
    { key: "ownership", header: "Ownership", render: (r) => r.ownership },
    { key: "access", header: "Access Level", render: (r) => r.access },
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

function ResourcesTab({ rec }: { rec: Account }) {
  const services = [
    "EC2",
    "S3",
    "RDS",
    "Lambda",
    "VPC",
    "IAM",
    "EKS",
    "DynamoDB",
    "CloudFront",
    "KMS",
    "Secrets Manager",
    "CloudTrail",
  ];
  const list = services.map((service) => {
    const m = hashId(`${rec.id}-${service}`);
    return {
      id: service,
      service,
      count: 1 + (m % 400),
      region: pick(REGIONS, m),
      status: m % 6 === 0 ? "Warning" : "Healthy",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "service", header: "Resource", render: (r) => r.service },
    { key: "count", header: "Count", render: (r) => r.count },
    { key: "region", header: "Region", render: (r) => r.region },
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

function SecurityTab({ rec }: { rec: Account }) {
  const services = [
    "AWS Security Hub",
    "GuardDuty",
    "IAM Analyzer",
    "Inspector",
    "Macie",
    "CloudTrail",
    "AWS Config",
  ];
  const list = services.map((service) => {
    const m = hashId(`${rec.id}-${service}`);
    return {
      id: service,
      service,
      status: m % 5 === 0 ? "Not Enabled" : "Enabled",
      findings: m % 20,
      severity: pick(["Low", "Medium", "High", "Critical"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "service", header: "Service", render: (r) => r.service },
    { key: "status", header: "Status", render: (r) => r.status },
    { key: "findings", header: "Findings", render: (r) => r.findings },
    { key: "severity", header: "Severity", render: (r) => r.severity },
  ];
  return (
    <Section
      title={`Security score — ${100 - Math.min(60, rec.securityFindings * 2)}/100`}
      sample
    >
      <MiniTable rows={list} cols={cols} />
    </Section>
  );
}

function ComplianceTab({ rec }: { rec: Account }) {
  const frameworks = [
    "AWS Foundational Security Best Practices",
    "CIS AWS Foundations",
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

function IamTab() {
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
        <HeaderButton icon={<KeyRound size={13} />}>View Roles</HeaderButton>
        <HeaderButton icon={<ShieldCheck size={13} />}>
          Validate Trust
        </HeaderButton>
        <SampleTag />
      </div>
      <Section title="IAM integration" sample>
        <StatRow label="IAM Roles" value="42 roles" sample />
        <StatRow
          label="Cross-Account Roles"
          value="6 trusted"
          tone="ok"
          sample
        />
        <StatRow label="OIDC Providers" value="2 (GitHub, EKS)" sample />
        <StatRow label="IAM Identity Center" value="Enabled" tone="ok" sample />
        <StatRow label="Federation" value="Entra ID SAML" sample />
        <StatRow
          label="Permission Boundaries"
          value="Enforced"
          tone="ok"
          sample
        />
      </Section>
    </>
  );
}

function NetworkingTab({ rec }: { rec: Account }) {
  return (
    <Section title="Networking detail" sample>
      <KVGrid
        items={[
          { k: "Regions", v: rec.regionCount, sample: true },
          { k: "Availability Zones", v: rec.regionCount * 3, sample: true },
          { k: "VPCs", v: 1 + (hashId(rec.id) % 6), sample: true },
          { k: "Transit Gateway", v: "Attached", sample: true },
          {
            k: "VPN",
            v: hashId(rec.id) % 2 ? "Site-to-Site" : "None",
            sample: true,
          },
          {
            k: "Direct Connect",
            v: hashId(rec.id) % 3 ? "Provisioned" : "None",
            sample: true,
          },
          { k: "PrivateLink", v: "Enabled", sample: true },
          { k: "Route Tables", v: 4 + (hashId(rec.id) % 12), sample: true },
        ]}
      />
    </Section>
  );
}

function CostTab({ rec }: { rec: Account }) {
  return (
    <Section title="Cost management" sample>
      <KVGrid
        items={[
          { k: "Monthly Spend", v: `$${rec.monthlyCost}k`, sample: true },
          {
            k: "Forecast",
            v: `$${Math.round(rec.monthlyCost * 1.08)}k`,
            sample: true,
          },
          {
            k: "Budget",
            v: `$${Math.round(rec.monthlyCost * 1.2)}k`,
            sample: true,
          },
          { k: "Chargeback", v: "Enabled", sample: true },
          {
            k: "Cost Center",
            v: `CC-${4000 + (hashId(rec.id) % 900)}`,
            sample: true,
          },
          {
            k: "Cost Allocation Tags",
            v: "cost-center, owner, env",
            sample: true,
          },
        ]}
      />
    </Section>
  );
}

function ActivityTab({ rec }: { rec: Account }) {
  const events = [
    "Account Connected",
    "Inventory Updated",
    "Workspace Assigned",
    "Compliance Scan",
    "Security Scan",
    "Configuration Changed",
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
    "Account Connected",
    "Account Updated",
    "Workspace Assigned",
    "Inventory Completed",
    "Compliance Scan",
    "Security Findings Imported",
    "Account Disconnected",
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

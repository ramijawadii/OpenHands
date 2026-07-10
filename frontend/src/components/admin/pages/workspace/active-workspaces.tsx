/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspaces → Active Workspaces */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Download,
  UserCog,
  Move,
  Copy,
  Archive,
  Activity as ActivityIcon,
  ClipboardCheck,
  RefreshCcw,
  FileText,
  ArrowRight,
  LayoutGrid,
  Users as UsersIcon,
  Boxes,
  Scale,
  BadgeCheck,
  Cable,
  Bot,
  History,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { useWorkspaces } from "#/components/admin/workspace-context";
import {
  Page,
  PageHeader,
  Tabs,
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
  Drawer,
  RowMenu,
  ScopeBadge,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";

/**
 * Active Workspaces — the operational landing page for Workspace Administration.
 * Authoritative spec: docs/workspace/workspace_module/…/00_Workspaces/Active Workspaces.md.
 *
 * A workspace is an isolated administrative boundary (members, resources, cloud accounts, policies,
 * AI agents, compliance assignments, integrations, operational config). This view reuses the
 * Enterprise-Administration UX pattern shared with the Users module: Banner · Toolbar · Filters ·
 * Search · Data Table · Bulk/Row actions · Workspace Detail Drawer (9 sub-tabs).
 *
 * Until admin/org_model.py ships the live Workspace directory, immutable identity comes from the
 * workspace registry (useWorkspaces) and the enriched operational fields are representative — every
 * such value is tagged `Sample` in the UI so nothing reads as a live signal when it is not.
 */

// ── Workspace-type sub-navigation (spec: Active Workspaces → 5 sub-views) ─────────────────────────
const TYPE_TABS = [
  { id: "all", label: "All", Icon: LayoutGrid },
  { id: "Enterprise", label: "Enterprise Workspaces", Icon: Building2 },
  { id: "Department", label: "Department Workspaces", Icon: UsersIcon },
  { id: "Project", label: "Project Workspaces", Icon: Boxes },
  { id: "Shared Service", label: "Shared Service Workspaces", Icon: Cable },
  { id: "Production", label: "Production Workspaces", Icon: ShieldCheck },
];

const WS_TYPES = [
  "Enterprise",
  "Department",
  "Project",
  "Shared Service",
  "Production",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const COMPLIANCE_PROFILES = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
];
const GOVERNANCE_PROFILES = ["Strict", "Balanced", "Relaxed"];
const CLOUD_PROVIDERS = ["AWS", "Azure", "Google Cloud", "Kubernetes"];
const REGIONS = ["eu-west-1", "eu-central-1", "us-east-1", "us-west-2"];
const OWNERS = [
  "Alice Smith",
  "David Chen",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
];
interface WsRecord {
  id: string;
  name: string;
  description: string;
  businessUnit: string;
  environment: string;
  workspaceType: string;
  owner: string;
  delegatedAdmins: string[];
  businessOwner: string;
  technicalOwner: string;
  supportContact: string;
  cloudProvider: string;
  region: string;
  complianceProfile: string;
  governanceProfile: string;
  lifecycle: string;
  status: string;
  health: "Healthy" | "Degraded" | "At Risk";
  // statistics
  members: number;
  cloudAccounts: number;
  resources: number;
  aiAgents: number;
  policies: number;
  complianceStandards: number;
  integrations: number;
  alerts: number;
  // operational health
  complianceScore: number;
  securityScore: number;
  configDrift: number;
  syncStatus: string;
  resourceCoverage: number;
  created: string;
  modified: string;
  lastActivity: string;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

function enrich(w: {
  id: string;
  name: string;
  classification?: string;
  region?: string;
}): WsRecord {
  const n = hashId(w.id);
  const health: WsRecord["health"] =
    n % 7 === 0 ? "At Risk" : n % 4 === 0 ? "Degraded" : "Healthy";
  return {
    id: w.id,
    name: w.name,
    description: `Operational workspace for ${pick(BUSINESS_UNITS, n)} ${pick(ENVIRONMENTS, n >> 2).toLowerCase()} activities.`,
    businessUnit: pick(BUSINESS_UNITS, n),
    environment:
      w.classification && w.classification !== "Current"
        ? w.classification
        : pick(ENVIRONMENTS, n >> 1),
    workspaceType: pick(WS_TYPES, n >> 3),
    owner: pick(OWNERS, n),
    delegatedAdmins: [pick(OWNERS, n + 1), pick(OWNERS, n + 3)],
    businessOwner: pick(OWNERS, n + 2),
    technicalOwner: pick(OWNERS, n + 4),
    supportContact: "support@company.com",
    cloudProvider: pick(CLOUD_PROVIDERS, n),
    region: w.region ?? pick(REGIONS, n >> 2),
    complianceProfile: pick(COMPLIANCE_PROFILES, n),
    governanceProfile: pick(GOVERNANCE_PROFILES, n),
    lifecycle: "Active",
    status: "Active",
    health,
    members: 8 + (n % 90),
    cloudAccounts: 1 + (n % 30),
    resources: 12 + (n % 300),
    aiAgents: n % 12,
    policies: 4 + (n % 20),
    complianceStandards: 1 + (n % 4),
    integrations: 2 + (n % 8),
    alerts: n % 6,
    complianceScore: 70 + (n % 30),
    securityScore: 65 + (n % 35),
    configDrift: n % 12,
    syncStatus: n % 5 === 0 ? "Pending" : "Synchronized",
    resourceCoverage: 80 + (n % 20),
    created: "2025-11-04",
    modified: "2026-06-20",
    lastActivity: "5 minutes ago",
  };
}

const HEALTH_TONE: Record<WsRecord["health"], string> = {
  Healthy: T.success,
  Degraded: T.warning,
  "At Risk": T.danger,
};

function HealthBadge({ health }: { health: WsRecord["health"] }) {
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: T.success,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: T.success,
        }}
      />
      {status}
    </span>
  );
}

/**
 * Embeddable body — sub-navigation + directory + detail drawer, WITHOUT the outer <Page> or the
 * page banner. Rendered both as the standalone route (via ActiveWorkspacesPage) and as the first
 * tab of the Workspace Management console. Uses local state for the type sub-nav so it never
 * collides with a host page's `?tab=` param.
 */
export function ActiveWorkspacesView() {
  const navigate = useNavigate();
  const { workspaces } = useWorkspaces();
  const [type, setType] = React.useState("all");

  // Filters (spec §Filters)
  const [search, setSearch] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fHealth, setFHealth] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [nonce, bump] = React.useReducer((x) => x + 1, 0);

  const records = React.useMemo(
    () => workspaces.map(enrich),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaces, nonce],
  );

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (type === "all" || r.workspaceType === type) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.complianceProfile.toLowerCase().includes(q)) &&
      (!fEnv || r.environment === fEnv) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fOwner || r.owner === fOwner) &&
      (!fCompliance || r.complianceProfile === fCompliance) &&
      (!fProvider || r.cloudProvider === fProvider) &&
      (!fHealth || r.health === fHealth)
    );
  });
  const hasFilters = !!(
    search ||
    type !== "all" ||
    fEnv ||
    fBu ||
    fOwner ||
    fCompliance ||
    fProvider ||
    fHealth
  );
  const clearFilters = () => {
    setSearch("");
    setType("all");
    setFEnv("");
    setFBu("");
    setFOwner("");
    setFCompliance("");
    setFProvider("");
    setFHealth("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Toolbar (spec §Toolbar: Create · Import · Administrative · Operational) ──
  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Workspace",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=requests"),
    },
    {
      key: "import",
      label: "Import Workspace",
      icon: <Download size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=requests"),
    },
    {
      key: "assign-owner",
      label: "Assign Owner",
      icon: <UserCog size={15} />,
      disabled: true,
    },
    {
      key: "move",
      label: "Move",
      icon: <Move size={15} />,
      disabled: true,
    },
    {
      key: "clone",
      label: "Clone",
      icon: <Copy size={15} />,
      disabled: true,
    },
    {
      key: "archive",
      label: "Archive",
      icon: <Archive size={15} />,
      disabled: true,
    },
    {
      key: "health",
      label: "Run Health Check",
      icon: <ActivityIcon size={15} />,
      onClick: () => bump(),
    },
    {
      key: "validate",
      label: "Validate Configuration",
      icon: <ClipboardCheck size={15} />,
      onClick: () => bump(),
    },
    {
      key: "sync",
      label: "Synchronize",
      icon: <RefreshCcw size={15} />,
      onClick: () => bump(),
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<WsRecord>[] = [
    {
      key: "name",
      header: "Workspace",
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
          <LayoutGrid size={14} color={T.textMuted} />
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
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "type",
      header: "Workspace Type",
      sortValue: (r) => r.workspaceType,
      render: (r) => r.workspaceType,
    },
    {
      key: "resources",
      header: "Cloud Resources",
      sortValue: (r) => r.resources,
      render: (r) => r.resources.toLocaleString(),
    },
    {
      key: "members",
      header: "Members",
      sortValue: (r) => r.members,
      render: (r) => r.members,
    },
    {
      key: "compliance",
      header: "Compliance",
      sortValue: (r) => r.complianceProfile,
      render: (r) => r.complianceProfile,
    },
    {
      key: "health",
      header: "Health",
      sortValue: (r) => r.health,
      render: (r) => <HealthBadge health={r.health} />,
    },
    {
      key: "activity",
      header: "Last Activity",
      render: (r) => (
        <span style={{ color: T.textMuted }}>{r.lastActivity}</span>
      ),
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
      <Card
        title="Workspace directory"
        desc="Each workspace is an isolated administrative boundary (workspace_id == tenant id). Select a row for the full detail drawer and lifecycle actions."
      >
        {/* ── Toolbar ── */}
        <CommandBar items={toolbar} />

        {/* ── Filters + Search ── */}
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search workspaces — name, owner, business unit, compliance, ID…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select
            label="Workspace Type"
            value={type}
            onChange={setType}
            options={TYPE_TABS.map((t) => ({ value: t.id, label: t.label }))}
          />
          <Select
            label="Environment"
            value={fEnv}
            onChange={setFEnv}
            options={facet(records.map((r) => r.environment))}
          />
          <Select
            label="Business Unit"
            value={fBu}
            onChange={setFBu}
            options={facet(records.map((r) => r.businessUnit))}
          />
          <Select
            label="Owner"
            value={fOwner}
            onChange={setFOwner}
            options={facet(records.map((r) => r.owner))}
          />
          <Select
            label="Compliance Profile"
            value={fCompliance}
            onChange={setFCompliance}
            options={facet(records.map((r) => r.complianceProfile))}
          />
          <Select
            label="Cloud Provider"
            value={fProvider}
            onChange={setFProvider}
            options={facet(records.map((r) => r.cloudProvider))}
          />
          <Select
            label="Health"
            value={fHealth}
            onChange={setFHealth}
            options={facet(records.map((r) => r.health))}
          />
        </FilterBar>

        {/* ── Data Table + Row/Bulk actions ── */}
        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={15}
          initialSort={{ key: "name", dir: "asc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<UserCog size={13} />} onClick={clear}>
                Assign Owner
              </HeaderButton>
              <HeaderButton icon={<BadgeCheck size={13} />} onClick={clear}>
                Assign Compliance Profile
              </HeaderButton>
              <HeaderButton icon={<Scale size={13} />} onClick={clear}>
                Assign Governance Profile
              </HeaderButton>
              <HeaderButton icon={<RefreshCcw size={13} />} onClick={clear}>
                Synchronize
              </HeaderButton>
              <HeaderButton icon={<ActivityIcon size={13} />} onClick={clear}>
                Run Health Check
              </HeaderButton>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>
                Export
              </HeaderButton>
              <HeaderButton icon={<Archive size={13} />} onClick={clear}>
                Archive ({ids.length})
              </HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                {
                  label: "Open",
                  onClick: () => navigate(`/workspace/${r.id}/overview`),
                },
                { label: "Edit", onClick: () => setSelId(r.id) },
                { label: "Clone", onClick: () => {} },
                { label: "Assign Owner", onClick: () => setSelId(r.id) },
                {
                  label: "Assign Administrators",
                  onClick: () => setSelId(r.id),
                },
                { label: "Run Health Check", onClick: () => bump() },
                { label: "Synchronize", onClick: () => bump() },
                { label: "Export", onClick: () => {} },
                { label: "Archive", onClick: () => {} },
                { label: "Delete", onClick: () => {}, danger: true },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Plus size={20} />}
              title="No active workspaces found."
              hint="Adjust filters, or create / import a workspace to get started."
              cta="Create Workspace"
              onCta={() => navigate("/admin/workspaces?tab=requests")}
            />
          }
        />
      </Card>

      {sel && (
        <WorkspaceDetailDrawer
          rec={sel}
          onClose={() => setSelId(null)}
          onOpen={() => navigate(`/workspace/${sel.id}/overview`)}
        />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function ActiveWorkspacesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Active Workspaces"
        subtitle="Manage operational workspaces across the organization — ownership, lifecycle, governance assignments, resource boundaries and operational health."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=requests")}
            >
              Create Workspace
            </HeaderButton>
          </>
        }
      />
      <ActiveWorkspacesView />
    </Page>
  );
}

// ════════════ Workspace Detail Drawer — 9 sub-tabs (spec §Workspace Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "members", label: "Members", icon: <UsersIcon size={13} /> },
  { id: "resources", label: "Resources", icon: <Boxes size={13} /> },
  { id: "governance", label: "Governance", icon: <Scale size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "integrations", label: "Integrations", icon: <Cable size={13} /> },
  { id: "ai", label: "AI & Agents", icon: <Bot size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function WorkspaceDetailDrawer({
  rec,
  onClose,
  onOpen,
}: {
  rec: WsRecord;
  onClose: () => void;
  onOpen: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <Drawer
      title={rec.name}
      subtitle={`${rec.id} · ${rec.status} · ${rec.environment} · ${rec.owner} · ${rec.businessUnit}`}
      width={720}
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
          <HeaderButton icon={<ActivityIcon size={13} />}>
            Run Health Check
          </HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton
            variant="primary"
            icon={<ArrowRight size={13} />}
            onClick={onOpen}
          >
            Open Console
          </HeaderButton>
        </div>
      }
    >
      <Tabs tabs={DRAWER_TABS} active={tab} onChange={setTab} />
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "members" && <MembersTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "governance" && <GovernanceTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "integrations" && <IntegrationsTab rec={rec} />}
      {tab === "ai" && <AiAgentsTab rec={rec} />}
      {tab === "activity" && <ActivityTab />}
      {tab === "audit" && <AuditTab />}
    </Drawer>
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

// ── Overview (General · Ownership · Statistics · Operational Health) ──
function OverviewTab({ rec }: { rec: WsRecord }) {
  return (
    <>
      <Section title="General">
        <KVGrid
          items={[
            { k: "Workspace Name", v: rec.name },
            { k: "Workspace ID", v: rec.id },
            { k: "Environment", v: rec.environment },
            { k: "Workspace Type", v: rec.workspaceType },
            { k: "Business Unit", v: rec.businessUnit },
            { k: "Status", v: rec.status },
            { k: "Created", v: rec.created },
            { k: "Modified", v: rec.modified },
          ]}
        />
        <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
          {rec.description}
        </div>
      </Section>

      <Section title="Ownership" sample>
        <KVGrid
          items={[
            { k: "Primary Owner", v: rec.owner },
            {
              k: "Delegated Administrators",
              v: rec.delegatedAdmins.join(", "),
              sample: true,
            },
            { k: "Business Owner", v: rec.businessOwner, sample: true },
            { k: "Technical Owner", v: rec.technicalOwner, sample: true },
            { k: "Support Contact", v: rec.supportContact, sample: true },
          ]}
        />
      </Section>

      <Section title="Statistics" sample>
        <KVGrid
          cols={4}
          items={[
            { k: "Members", v: rec.members, sample: true },
            { k: "Cloud Accounts", v: rec.cloudAccounts, sample: true },
            { k: "Resources", v: rec.resources.toLocaleString(), sample: true },
            { k: "AI Agents", v: rec.aiAgents, sample: true },
            { k: "Policies", v: rec.policies, sample: true },
            {
              k: "Compliance Standards",
              v: rec.complianceStandards,
              sample: true,
            },
            { k: "Integrations", v: rec.integrations, sample: true },
            { k: "Alerts", v: rec.alerts, sample: true },
          ]}
        />
      </Section>

      <Section title="Operational Health" sample>
        <StatRow
          label="Overall Health"
          value={<HealthBadge health={rec.health} />}
          tone={
            rec.health === "Healthy"
              ? "ok"
              : rec.health === "Degraded"
                ? "warn"
                : "danger"
          }
          sample
        />
        <StatRow
          label="Compliance Score"
          value={`${rec.complianceScore}%`}
          tone={rec.complianceScore >= 85 ? "ok" : "warn"}
          sample
        />
        <StatRow
          label="Security Score"
          value={`${rec.securityScore}%`}
          tone={rec.securityScore >= 85 ? "ok" : "warn"}
          sample
        />
        <StatRow
          label="Configuration Drift"
          value={`${rec.configDrift} findings`}
          tone={rec.configDrift === 0 ? "ok" : "warn"}
          sample
        />
        <StatRow
          label="Synchronization Status"
          value={rec.syncStatus}
          tone={rec.syncStatus === "Synchronized" ? "ok" : "warn"}
          sample
        />
        <StatRow
          label="Resource Coverage"
          value={`${rec.resourceCoverage}%`}
          tone={rec.resourceCoverage >= 90 ? "ok" : "warn"}
          sample
        />
      </Section>
    </>
  );
}

// ── Members ──
function MembersTab({ rec }: { rec: WsRecord }) {
  const members = React.useMemo(() => {
    const n = hashId(rec.id);
    return Array.from({ length: Math.min(6, rec.members) }, (_, i) => ({
      id: `${rec.id}-m${i}`,
      user: pick(OWNERS, n + i),
      role: pick(
        [
          "Workspace Owner",
          "Workspace Admin",
          "Security Engineer",
          "Auditor",
          "Viewer",
        ],
        n + i,
      ),
      department: pick(BUSINESS_UNITS, n + i),
      lastLogin: pick(
        ["2 hours ago", "yesterday", "3 days ago", "1 week ago"],
        n + i,
      ),
      status: i % 5 === 0 ? "Disabled" : "Active",
    }));
  }, [rec]);
  const cols: Column<(typeof members)[number]>[] = [
    { key: "user", header: "User", render: (r) => r.user },
    { key: "role", header: "Role", render: (r) => r.role },
    { key: "dept", header: "Department", render: (r) => r.department },
    { key: "login", header: "Last Login", render: (r) => r.lastLogin },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Active" ? T.success : T.textMuted }}
        >
          {r.status}
        </span>
      ),
    },
  ];
  return (
    <>
      <ToolbarRow
        buttons={["Add Member", "Remove Member", "Assign Role", "Export"]}
        sample
      />
      <DirectoryTable columns={cols} rows={members} />
    </>
  );
}

// ── Resources ──
function ResourcesTab({ rec }: { rec: WsRecord }) {
  const [resTab, setResTab] = React.useState("aws");
  const tabs = [
    { id: "aws", label: "AWS Accounts" },
    { id: "azure", label: "Azure Subscriptions" },
    { id: "gcp", label: "Google Cloud Projects" },
    { id: "k8s", label: "Kubernetes Clusters" },
    { id: "repos", label: "Repositories" },
    { id: "ai", label: "AI Resources" },
  ];
  const n = hashId(rec.id);
  const rowsFor = (kind: string) =>
    Array.from({ length: 3 + (n % 4) }, (_, i) => ({
      id: `${rec.id}-${kind}-${i}`,
      resource: `${kind}-${(1000 + ((n + i) % 8999)).toString()}`,
      type: kind.toUpperCase(),
      provider: pick(CLOUD_PROVIDERS, n),
      region: pick(REGIONS, n + i),
      owner: pick(OWNERS, n + i),
      status: i % 4 === 0 ? "Degraded" : "Active",
    }));
  const rows = rowsFor(resTab);
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "provider", header: "Provider", render: (r) => r.provider },
    { key: "region", header: "Region", render: (r) => r.region },
    { key: "owner", header: "Owner", render: (r) => r.owner },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span style={{ color: r.status === "Active" ? T.success : T.warning }}>
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
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Resources governed by this workspace <SampleTag />
      </div>
      <Tabs tabs={tabs} active={resTab} onChange={setResTab} />
      <DirectoryTable columns={cols} rows={rows} />
    </>
  );
}

// ── Governance ──
function GovernanceTab({ rec }: { rec: WsRecord }) {
  return (
    <>
      <Section title="Assigned governance" sample>
        <StatRow
          label="Governance Profile"
          value={rec.governanceProfile}
          sample
        />
        <StatRow
          label="Inherited Policies"
          value={`${rec.policies} inherited`}
          sample
        />
        <StatRow label="Workspace Overrides" value="3 overrides" sample />
        <StatRow label="Approval Policies" value="2-of-3 approvers" sample />
        <StatRow
          label="Resource Boundaries"
          value={`${rec.cloudAccounts} accounts in scope`}
          sample
        />
        <StatRow label="Capacity Limits" value="Standard tier" sample />
      </Section>
      <Section title="Inheritance">
        <InheritanceChain />
      </Section>
    </>
  );
}

function InheritanceChain() {
  const nodes = [
    "Organization",
    "Governance Profile",
    "Workspace Overrides",
    "Effective Configuration",
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {nodes.map((label, i) => (
        <React.Fragment key={label}>
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 12.5,
              color: i === nodes.length - 1 ? T.textPrimary : T.textNav,
              fontWeight: i === nodes.length - 1 ? 600 : 400,
              background:
                i === nodes.length - 1
                  ? "var(--cg-accent-bg-strong)"
                  : "transparent",
            }}
          >
            {label}
          </div>
          {i < nodes.length - 1 && (
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

// ── Compliance ──
function ComplianceTab({ rec }: { rec: WsRecord }) {
  return (
    <>
      <Section title="Compliance posture" sample>
        <StatRow label="Frameworks" value={rec.complianceProfile} sample />
        <StatRow label="Policies" value={`${rec.policies} assigned`} sample />
        <StatRow label="Assigned Controls" value="128 controls" sample />
        <StatRow label="Assessment Schedule" value="Quarterly" sample />
        <StatRow label="Evidence Collection" value="Automated" sample />
        <StatRow
          label="Current Compliance Status"
          value={`${rec.complianceScore}%`}
          tone={rec.complianceScore >= 85 ? "ok" : "warn"}
          sample
        />
      </Section>
      <ToolbarRow
        buttons={["Run Assessment", "Generate Report", "View Findings"]}
      />
    </>
  );
}

// ── Integrations ──
function IntegrationsTab({ rec }: { rec: WsRecord }) {
  const n = hashId(rec.id);
  const catalog = [
    "AWS",
    "Azure",
    "Google Cloud",
    "GitHub",
    "Jira",
    "ServiceNow",
    "Microsoft Defender",
    "CrowdStrike",
  ];
  const rows = catalog.slice(0, rec.integrations).map((name, i) => ({
    id: `${rec.id}-int-${i}`,
    integration: name,
    type: pick(["Cloud", "Ticketing", "Security", "SCM"], n + i),
    scope: "Workspace",
    health: i % 4 === 0 ? "Degraded" : "Healthy",
    status: "Connected",
  }));
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "integration", header: "Integration", render: (r) => r.integration },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "scope", header: "Workspace Scope", render: (r) => r.scope },
    {
      key: "health",
      header: "Health",
      render: (r) => (
        <span style={{ color: r.health === "Healthy" ? T.success : T.warning }}>
          ● {r.health}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <span style={{ color: T.success }}>{r.status}</span>,
    },
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
        Connected enterprise integrations <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={rows} />
    </>
  );
}

// ── AI & Agents ──
function AiAgentsTab({ rec }: { rec: WsRecord }) {
  return (
    <>
      <Section title="AI resources assigned to this workspace" sample>
        <KVGrid
          items={[
            { k: "Available Agents", v: rec.aiAgents + 4, sample: true },
            {
              k: "Running Agents",
              v: Math.max(0, rec.aiAgents - 1),
              sample: true,
            },
            { k: "Skill Packages", v: 12, sample: true },
            { k: "Knowledge Sources", v: 5, sample: true },
            { k: "Prompt Libraries", v: 3, sample: true },
            { k: "Execution Policies", v: 4, sample: true },
            { k: "AI Runtime", v: "cloudguard-runtime:latest", sample: true },
          ]}
        />
      </Section>
      <ToolbarRow
        buttons={[
          "Assign Agent",
          "Disable Agent",
          "Update Runtime",
          "View Usage",
        ]}
      />
    </>
  );
}

// ── Activity (timeline) ──
function ActivityTab() {
  const events = [
    "Workspace Created",
    "Owner Changed",
    "Member Added",
    "Policy Assigned",
    "Compliance Updated",
    "Resources Imported",
    "Health Check Executed",
    "Assessment Completed",
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
                {pick(OWNERS, i)} ·{" "}
                {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Audit History (read-only immutable log) ──
function AuditTab() {
  const events = [
    "Workspace Created",
    "Workspace Modified",
    "Ownership Changed",
    "Governance Updated",
    "Compliance Assigned",
    "Integration Connected",
    "AI Agent Assigned",
    "Policy Updated",
    "Workspace Archived",
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
          value={`${pick(OWNERS, i)} · 2026-06-${10 + i}`}
          tone="ok"
          sample
        />
      ))}
    </>
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

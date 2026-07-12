/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Ownership & Administration → Delegated Administrators */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Download,
  RefreshCcw,
  Pencil,
  CalendarClock,
  Ban,
  ArrowLeftRight,
  UserCheck,
  ShieldCheck,
  ClipboardCheck,
  FileText,
  LayoutGrid,
  Layers,
  KeyRound,
  Activity as ActivityIcon,
  History,
  Trash2,
  GitCompare,
  Eye,
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
  RowMenu,
  ScopeBadge,
  PostureCard,
  PostureGrid,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";

/**
 * Delegated Administrators — users granted administrative responsibility for one or more workspaces
 * on behalf of the Workspace Owner. Authoritative spec:
 * docs/workspace/workspace_module/…/02_Ownership & Administration/delegated_administrators.md.
 *
 * Delegated administration separates business accountability from operational management while
 * supporting least-privilege administration: a delegated administrator inherits only the
 * administrative capabilities explicitly assigned through administrative profiles and organizational
 * policies, never becomes the Workspace Owner, and expires automatically per delegation policy.
 *
 * Reuses the Enterprise-Administration UX pattern shared with the Users / Workspace-Requests modules
 * (Banner · Toolbar · Filters · Search · Data Table · Bulk/Row actions · Detail Drawer with 7
 * sub-tabs · Operational Dashboard). There is no delegation backend yet, so the delegation set is
 * representative sample data (tagged `Sample` in the UI). When admin/org_model.py + the delegation
 * engine land, swap SAMPLE_DELEGATIONS for the live query — the component API stays identical.
 */

const ME = "You (current admin)";

// ── Status model (drives the sub-navigation, spec §Navigation) ────────────────────────────────────
type Status =
  | "Active"
  | "Pending Approval"
  | "Expiring Soon"
  | "Expired"
  | "Revoked";

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  "Pending Approval": T.warning,
  "Expiring Soon": T.warning,
  Expired: T.textMuted,
  Revoked: T.danger,
};

// spec §Navigation — Active Delegations · Pending Approvals · Temporary Delegations · Expiring Soon ·
// Expired · Revoked. Sub-nav is a FilterBar "View" dropdown, not a pill strip.
const VIEW_TABS = [
  { id: "active", label: "Active Delegations" },
  { id: "pending", label: "Pending Approvals" },
  { id: "temporary", label: "Temporary Delegations" },
  { id: "expiring", label: "Expiring Soon" },
  { id: "expired", label: "Expired" },
  { id: "revoked", label: "Revoked" },
];

// map sub-nav id → status filter (temporary is a delegation-type filter, handled separately)
const VIEW_STATUS: Record<string, Status | null> = {
  active: "Active",
  pending: "Pending Approval",
  temporary: null,
  expiring: "Expiring Soon",
  expired: "Expired",
  revoked: "Revoked",
};

// spec §Administrative Profiles — Supported Profiles.
const ADMIN_PROFILES = [
  "Workspace Administrator",
  "Security Administrator",
  "Compliance Administrator",
  "Operations Administrator",
  "Platform Administrator",
  "Read-Only Administrator",
  "Custom Administrative Profile",
];

// spec §Administrative Scope — Examples (delegation scope).
const DELEGATION_SCOPES = [
  "Workspace Administration",
  "Compliance Administration",
  "Security Administration",
  "Operations Administration",
  "Read-Only Administration",
];

const RESOURCE_SCOPES = [
  "All workspace resources",
  "Compute & networking",
  "Identity & policy objects",
  "Compliance & audit records",
  "Read-only (no mutations)",
];

const DELEGATION_TYPES = ["Permanent", "Temporary"];
const APPROVAL_STATES = ["Approved", "Pending", "Auto-approved"];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const DEPARTMENTS = [
  "Cloud Operations",
  "Security Operations",
  "Platform Engineering",
  "Compliance",
  "DevOps",
  "SOC",
];
const ADMINISTRATORS = [
  "John Smith",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
  "David Chen",
  "Aisha Khan",
  "Tomás Silva",
  "Elena Petrova",
  "Kenji Watanabe",
  "Fatima Al-Sayed",
];
const ASSIGNERS = [
  ME,
  "Org Administrator",
  "Platform Administrator",
  "Workspace Owner — Priya Nair",
];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// spec §Delegation Lifecycle — Requested → Approval → Assigned → Active → Extended → Expired → Revoked.
const LIFECYCLE = [
  "Requested",
  "Approval",
  "Assigned",
  "Active",
  "Extended",
  "Expired",
  "Revoked",
];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

const fmtDate = (n: number, year: number): string => {
  const m = pick(MONTHS, n);
  const d = 1 + (n % 27);
  return `${m} ${d.toString().padStart(2, "0")}, ${year}`;
};

interface DelegationRecord {
  id: string;
  administrator: string;
  email: string;
  department: string;
  businessUnit: string;
  workspace: string;
  environment: string;
  adminProfile: string;
  delegationScope: string;
  resourceScope: string;
  delegationType: string;
  status: Status;
  approvalStatus: string;
  effectiveDate: string;
  expiration: string;
  assignedBy: string;
  created: string;
  approvalRequirements: string;
  assignedWorkspaces: number;
  adminRoles: number;
  approvals: number;
  policyExceptions: number;
  recentActivity: number;
}

// Deterministic representative delegation set.
const SAMPLE_DELEGATIONS: DelegationRecord[] = Array.from(
  { length: 14 },
  (_, i) => {
    const id = `DEL-${(1043 + i * 11).toString().padStart(6, "0")}`;
    const n = hashId(id);
    const status = pick<Status>(
      [
        "Active",
        "Active",
        "Active",
        "Pending Approval",
        "Expiring Soon",
        "Expiring Soon",
        "Expired",
        "Revoked",
      ],
      n,
    );
    const delegationType = pick(DELEGATION_TYPES, n >> 1);
    const expYear = status === "Expired" || status === "Revoked" ? 2025 : 2026;
    const expiration =
      status === "Revoked" ? "—" : fmtDate((n >> 2) + 6, expYear);
    return {
      id,
      administrator: pick(ADMINISTRATORS, n),
      email: `${pick(ADMINISTRATORS, n)
        .toLowerCase()
        .replace(/[^a-z]/g, ".")}@corp.example.com`,
      department: pick(DEPARTMENTS, n >> 2),
      businessUnit: pick(BUSINESS_UNITS, n),
      workspace: `${pick(BUSINESS_UNITS, n)} ${pick(ENVIRONMENTS, n >> 2)}`,
      environment: pick(ENVIRONMENTS, n >> 2),
      adminProfile: pick(ADMIN_PROFILES, n),
      delegationScope: pick(DELEGATION_SCOPES, n),
      resourceScope: pick(RESOURCE_SCOPES, n >> 1),
      delegationType,
      status,
      approvalStatus:
        status === "Pending Approval" ? "Pending" : pick(APPROVAL_STATES, n),
      effectiveDate: fmtDate(n, 2026),
      expiration,
      assignedBy: pick(ASSIGNERS, n),
      created: fmtDate(n + 3, 2026),
      approvalRequirements:
        delegationType === "Temporary"
          ? "Owner + Security review"
          : "Organization Administrator approval",
      assignedWorkspaces: 1 + (n % 6),
      adminRoles: 1 + (n % 3),
      approvals: n % 9,
      policyExceptions: n % 3,
      recentActivity: 4 + (n % 40),
    };
  },
);

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

/**
 * Embeddable body — sub-navigation + operational dashboard + directory + delegation detail drawer,
 * WITHOUT the outer <Page> or the page banner. Rendered both as the standalone route and as a tab of
 * the Workspace Administration console. Uses local state for the status sub-nav so it never collides
 * with a host page's `?tab=`.
 */
export function DelegatedAdministratorsView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("active");

  const [search, setSearch] = React.useState("");
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fAdmin, setFAdmin] = React.useState("");
  const [fProfile, setFProfile] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fExpiration, setFExpiration] = React.useState("");
  const [fApproval, setFApproval] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_DELEGATIONS;
  const viewStatus = VIEW_STATUS[view];

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (view === "temporary"
        ? r.delegationType === "Temporary"
        : !viewStatus || r.status === viewStatus) &&
      (!q ||
        r.administrator.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.adminProfile.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)) &&
      (!fWorkspace || r.workspace === fWorkspace) &&
      (!fAdmin || r.administrator === fAdmin) &&
      (!fProfile || r.adminProfile === fProfile) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fType || r.delegationType === fType) &&
      (!fStatus || r.status === fStatus) &&
      (!fExpiration || r.expiration === fExpiration) &&
      (!fApproval || r.approvalStatus === fApproval)
    );
  });
  const hasFilters = !!(
    search ||
    fWorkspace ||
    fAdmin ||
    fProfile ||
    fBu ||
    fType ||
    fStatus ||
    fExpiration ||
    fApproval
  );
  const clearFilters = () => {
    setSearch("");
    setFWorkspace("");
    setFAdmin("");
    setFProfile("");
    setFBu("");
    setFType("");
    setFStatus("");
    setFExpiration("");
    setFApproval("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // spec §Operational Dashboard — Active · Pending · Expiring Soon · Expired · Revoked · Most Active.
  const count = (s: Status) => records.filter((r) => r.status === s).length;
  const mostActive = [...records].sort(
    (a, b) => b.recentActivity - a.recentActivity,
  )[0];

  // spec §Toolbar — Assign Administrator (Delegation Wizard) · Administrative Actions · Governance.
  const toolbar: CommandItem[] = [
    {
      key: "assign",
      label: "Assign Administrator",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=delegated-administrators"),
    },
    {
      key: "modify",
      label: "Modify Delegation",
      icon: <Pencil size={15} />,
      disabled: true,
    },
    {
      key: "extend",
      label: "Extend Delegation",
      icon: <CalendarClock size={15} />,
      disabled: true,
    },
    {
      key: "revoke",
      label: "Revoke Delegation",
      icon: <Ban size={15} />,
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
      disabled: true,
    },
    {
      key: "review",
      label: "Review Delegations",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Permissions",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Export Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
  ];

  // spec §Table — Administrator · Workspace · Administrative Profile · Delegation Scope · Effective
  // Date · Expiration · Status.
  const cols: Column<DelegationRecord>[] = [
    {
      key: "administrator",
      header: "Administrator",
      sortValue: (r) => r.administrator,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <UserCheck size={14} color={T.textMuted} />
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span>{r.administrator}</span>
            <span style={{ fontSize: 11, color: T.textMuted }}>{r.email}</span>
          </span>
        </span>
      ),
    },
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
      key: "profile",
      header: "Administrative Profile",
      sortValue: (r) => r.adminProfile,
      render: (r) => r.adminProfile,
    },
    {
      key: "scope",
      header: "Delegation Scope",
      sortValue: (r) => r.delegationScope,
      render: (r) => r.delegationScope,
    },
    {
      key: "effective",
      header: "Effective Date",
      sortValue: (r) => r.effectiveDate,
      render: (r) => r.effectiveDate,
    },
    {
      key: "expiration",
      header: "Expiration",
      sortValue: (r) => r.expiration,
      render: (r) => (
        <span
          style={{
            color: r.status === "Expiring Soon" ? T.warning : T.textNav,
          }}
        >
          {r.expiration}
        </span>
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
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={view}
          onChange={setView}
          options={VIEW_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {/* spec §Operational Dashboard */}
      <div style={{ marginBottom: 18 }}>
        <PostureGrid>
          <PostureCard
            title="Active Delegations"
            value={count("Active")}
            sub={<SampleTag />}
            tone="ok"
          />
          <PostureCard
            title="Pending Approvals"
            value={count("Pending Approval")}
            sub={<SampleTag />}
            tone="warn"
          />
          <PostureCard
            title="Expiring Soon"
            value={count("Expiring Soon")}
            sub={<SampleTag />}
            tone="warn"
          />
          <PostureCard
            title="Expired"
            value={count("Expired")}
            sub={<SampleTag />}
            tone="muted"
          />
          <PostureCard
            title="Revoked"
            value={count("Revoked")}
            sub={<SampleTag />}
            tone="danger"
          />
          <PostureCard
            title="Most Active Administrator"
            value={mostActive.administrator}
            sub={
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {mostActive.recentActivity} actions <SampleTag />
              </span>
            }
            tone="muted"
          />
        </PostureGrid>
      </div>

      <Card
        title="Delegated administrators"
        desc="Assign and manage delegated administrators responsible for workspace operations while maintaining business ownership separation. Delegated administrators inherit only the capabilities assigned through administrative profiles and expire automatically per delegation policy."
      >
        <CommandBar items={toolbar} />

        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search delegated administrators — administrator, workspace, business unit, department, profile, email…"
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
            label="Administrator"
            value={fAdmin}
            onChange={setFAdmin}
            options={facet(records.map((r) => r.administrator))}
          />
          <Select
            label="Administrative Profile"
            value={fProfile}
            onChange={setFProfile}
            options={facet(records.map((r) => r.adminProfile))}
          />
          <Select
            label="Business Unit"
            value={fBu}
            onChange={setFBu}
            options={facet(records.map((r) => r.businessUnit))}
          />
          <Select
            label="Delegation Type"
            value={fType}
            onChange={setFType}
            options={facet(records.map((r) => r.delegationType))}
          />
          <Select
            label="Status"
            value={fStatus}
            onChange={setFStatus}
            options={facet(records.map((r) => r.status))}
          />
          <Select
            label="Expiration"
            value={fExpiration}
            onChange={setFExpiration}
            options={facet(records.map((r) => r.expiration))}
          />
          <Select
            label="Approval Status"
            value={fApproval}
            onChange={setFApproval}
            options={facet(records.map((r) => r.approvalStatus))}
          />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={15}
          initialSort={{ key: "effective", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<Plus size={13} />} onClick={clear}>
                Assign ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<CalendarClock size={13} />} onClick={clear}>
                Extend
              </HeaderButton>
              <HeaderButton icon={<Ban size={13} />} onClick={clear}>
                Revoke
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
                { label: "Modify", onClick: () => setSelId(r.id) },
                { label: "Extend", onClick: () => setSelId(r.id) },
                { label: "Transfer", onClick: () => setSelId(r.id) },
                {
                  label: "Revoke",
                  onClick: () => setSelId(r.id),
                  danger: true,
                },
                {
                  label: "View Workspace",
                  onClick: () =>
                    navigate("/admin/workspaces?tab=active-workspaces"),
                },
                { label: "Export", onClick: () => {} },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<UserCheck size={20} />}
              title="No delegated administrators found."
              hint="Adjust filters, or assign a delegated administrator to a workspace to get started."
              cta="Assign Administrator"
              onCta={() =>
                navigate("/admin/workspaces?tab=delegated-administrators")
              }
            />
          }
        />
      </Card>

      {sel && (
        <DelegationDetailDrawer rec={sel} onClose={() => setSelId(null)} />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function DelegatedAdministratorsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Delegated Administrators"
        subtitle="Assign and manage delegated administrators responsible for workspace operations while maintaining business ownership separation."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() =>
                navigate("/admin/workspaces?tab=delegated-administrators")
              }
            >
              Assign Administrator
            </HeaderButton>
          </>
        }
      />
      <DelegatedAdministratorsView />
    </Page>
  );
}

// ════════════ Delegated Administrator Detail Drawer — 7 sub-tabs (spec §Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "scope",
    label: "Administrative Scope",
    icon: <ShieldCheck size={13} />,
  },
  {
    id: "workspaces",
    label: "Assigned Workspaces",
    icon: <Layers size={13} />,
  },
  {
    id: "permissions",
    label: "Effective Permissions",
    icon: <KeyRound size={13} />,
  },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  {
    id: "history",
    label: "Delegation History",
    icon: <ArrowLeftRight size={13} />,
  },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function DelegationDetailDrawer({
  rec,
  onClose,
}: {
  rec: DelegationRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.administrator} · ${rec.adminProfile}`}
      subtitle={`${rec.status} · ${rec.assignedWorkspaces} assigned workspaces · Expires ${rec.expiration}`}
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
          {/* spec §Drawer Header — Quick Actions: Modify · Extend · Revoke · Export */}
          <HeaderButton icon={<Pencil size={13} />}>Modify</HeaderButton>
          <HeaderButton icon={<CalendarClock size={13} />}>Extend</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton variant="danger" icon={<Ban size={13} />}>
            Revoke
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "scope" && <ScopeTab rec={rec} />}
      {tab === "workspaces" && <WorkspacesTab rec={rec} />}
      {tab === "permissions" && <PermissionsTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "history" && <HistoryTab rec={rec} />}
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

// ── Overview (General · Statistics) — spec §Overview ──
function OverviewTab({ rec }: { rec: DelegationRecord }) {
  return (
    <>
      <Section title="General" sample>
        <KVGrid
          items={[
            { k: "Administrator", v: rec.administrator },
            { k: "Department", v: rec.department, sample: true },
            { k: "Business Unit", v: rec.businessUnit },
            { k: "Email", v: rec.email, sample: true },
            { k: "Administrative Profile", v: rec.adminProfile },
            { k: "Status", v: <StatusBadge status={rec.status} /> },
            { k: "Assigned By", v: rec.assignedBy, sample: true },
            { k: "Created", v: rec.created, sample: true },
          ]}
        />
      </Section>

      <Section title="Statistics" sample>
        <KVGrid
          cols={3}
          items={[
            {
              k: "Assigned Workspaces",
              v: rec.assignedWorkspaces,
              sample: true,
            },
            { k: "Administrative Roles", v: rec.adminRoles, sample: true },
            { k: "Approvals", v: rec.approvals, sample: true },
            { k: "Policy Exceptions", v: rec.policyExceptions, sample: true },
            {
              k: "Recent Activity",
              v: `${rec.recentActivity} actions`,
              sample: true,
            },
          ]}
        />
      </Section>
    </>
  );
}

// ── Administrative Scope — defines what this administrator can manage. spec §Administrative Scope ──
function ScopeTab({ rec }: { rec: DelegationRecord }) {
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Defines what this administrator can manage.
      </div>
      <Section title="Delegated scope" sample>
        <StatRow label="Workspace Scope" value={rec.workspace} sample />
        <StatRow
          label="Administrative Profile"
          value={rec.adminProfile}
          sample
        />
        <StatRow label="Resource Scope" value={rec.resourceScope} sample />
        <StatRow label="Delegation Type" value={rec.delegationType} sample />
        <StatRow
          label="Approval Requirements"
          value={rec.approvalRequirements}
          sample
        />
        <StatRow
          label="Expiration"
          value={rec.expiration}
          tone={rec.status === "Expiring Soon" ? "warn" : "muted"}
          sample
        />
      </Section>
      <Section title="Administration examples">
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}
        >
          {DELEGATION_SCOPES.map((s) => (
            <span
              key={s}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${T.border}`,
                color: s === rec.delegationScope ? T.accent : T.textNav,
                background:
                  s === rec.delegationScope
                    ? "var(--cg-accent-bg-strong)"
                    : "transparent",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </Section>
    </>
  );
}

// ── Assigned Workspaces — every workspace delegated to the administrator. spec §Assigned Workspaces ──
function WorkspacesTab({ rec }: { rec: DelegationRecord }) {
  const n = hashId(rec.id);
  const wss = Array.from({ length: rec.assignedWorkspaces }, (_, i) => {
    const m = n + i * 13;
    return {
      id: `${rec.id}-ws-${i}`,
      workspace: `${pick(BUSINESS_UNITS, m)} ${pick(ENVIRONMENTS, m >> 2)}`,
      businessUnit: pick(BUSINESS_UNITS, m),
      environment: pick(ENVIRONMENTS, m >> 2),
      role: pick(ADMIN_PROFILES, m),
      status: pick(["Active", "Active", "Suspended", "Archived"], m),
    };
  });
  const cols: Column<(typeof wss)[number]>[] = [
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
          <LayoutGrid size={13} color={T.textMuted} />
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
      key: "role",
      header: "Role",
      sortValue: (r) => r.role,
      render: (r) => r.role,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => r.status,
    },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Shows every workspace delegated to the administrator.
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <HeaderButton icon={<Plus size={13} />}>Assign Workspace</HeaderButton>
        <HeaderButton icon={<Trash2 size={13} />}>
          Remove Assignment
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={wss} />
    </>
  );
}

// ── Effective Permissions — permissions resulting from delegated administration. spec §Effective ──
const PERM_CATEGORIES = [
  "Workspace Management",
  "Users",
  "Resources",
  "Compliance",
  "Automation",
  "AI",
  "Integrations",
  "Monitoring",
  "Reporting",
];
const PERM_INHERITANCE = [
  "Organization Policy",
  "Administrative Profile",
  "Workspace Assignment",
  "Effective Permissions",
];

function PermissionsTab({ rec }: { rec: DelegationRecord }) {
  const n = hashId(rec.id);
  const levelFor = (i: number) =>
    pick(["Full", "Manage", "Read", "None"], n + i);
  const toneFor = (lvl: string) =>
    lvl === "Full"
      ? "ok"
      : lvl === "Manage"
        ? "warn"
        : lvl === "None"
          ? "danger"
          : "muted";
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Shows the permissions resulting from delegated administration.
      </div>

      {/* spec §Effective Permissions — inheritance visualization */}
      <Section title="Resolution">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {PERM_INHERITANCE.map((step, i) => (
            <React.Fragment key={step}>
              <div
                style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 12.5,
                  color:
                    i === PERM_INHERITANCE.length - 1 ? T.accent : T.textNav,
                  background:
                    i === PERM_INHERITANCE.length - 1
                      ? "var(--cg-accent-bg-strong)"
                      : "transparent",
                }}
              >
                {step}
              </div>
              {i < PERM_INHERITANCE.length - 1 && (
                <span
                  style={{
                    color: T.textMuted,
                    textAlign: "center",
                    fontSize: 12,
                  }}
                >
                  ↓
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </Section>

      <Section title="Permission categories" sample>
        {PERM_CATEGORIES.map((cat, i) => {
          const lvl = levelFor(i);
          return (
            <StatRow
              key={cat}
              label={cat}
              value={lvl}
              tone={toneFor(lvl)}
              sample
            />
          );
        })}
      </Section>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <HeaderButton icon={<Eye size={13} />}>
          Show Effective Access
        </HeaderButton>
        <HeaderButton icon={<GitCompare size={13} />}>
          Compare Permissions
        </HeaderButton>
      </div>
    </>
  );
}

// ── Activity timeline — spec §Activity (Actor · Action · Date filters) ──
const ACTIVITY_EVENTS = [
  "Delegation Assigned",
  "Permissions Updated",
  "Workspace Modified",
  "Approval Granted",
  "Delegation Extended",
  "Delegation Revoked",
];

function ActivityTab({ rec }: { rec: DelegationRecord }) {
  const n = hashId(rec.id);
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
            { value: "", label: "All" },
            ...ADMINISTRATORS.map((a) => ({ value: a, label: a })),
          ]}
        />
        <Select
          label="Action"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "All" },
            ...ACTIVITY_EVENTS.map((a) => ({ value: a, label: a })),
          ]}
        />
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "All" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
            { value: "90d", label: "Last 90 days" },
          ]}
        />
        <SampleTag />
      </div>
      {ACTIVITY_EVENTS.map((e, i) => (
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
              {pick(ADMINISTRATORS, n + i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], n + i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Delegation History — tracks every change to the delegation. spec §Delegation History ──
function HistoryTab({ rec }: { rec: DelegationRecord }) {
  const n = hashId(rec.id);
  const currentIdx = LIFECYCLE.indexOf(
    rec.status === "Active"
      ? "Active"
      : rec.status === "Expiring Soon"
        ? "Active"
        : rec.status === "Pending Approval"
          ? "Approval"
          : rec.status === "Expired"
            ? "Expired"
            : "Revoked",
  );
  const actions = [
    "Assigned",
    "Extended",
    "Modified",
    "Transferred",
    "Revoked",
  ];
  const rows = actions.slice(0, 2 + (n % 4)).map((action, i) => ({
    id: `${rec.id}-hist-${i}`,
    action,
    performedBy: pick(ASSIGNERS, n + i),
    date: fmtDate(n + i * 5, 2026),
    reason: pick(
      [
        "Initial delegation assignment",
        "Extended per operational request",
        "Scope adjusted to least-privilege",
        "Ownership transfer approved",
        "Revoked — administrator offboarded",
      ],
      n + i,
    ),
  }));
  const cols: Column<(typeof rows)[number]>[] = [
    {
      key: "action",
      header: "Action",
      sortValue: (r) => r.action,
      render: (r) => r.action,
    },
    {
      key: "by",
      header: "Performed By",
      sortValue: (r) => r.performedBy,
      render: (r) => r.performedBy,
    },
    {
      key: "date",
      header: "Date",
      sortValue: (r) => r.date,
      render: (r) => r.date,
    },
    {
      key: "reason",
      header: "Reason",
      sortValue: (r) => r.reason,
      render: (r) => r.reason,
    },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Tracks every change made to the delegation.
      </div>

      {/* spec §Delegation Lifecycle */}
      <Section title="Delegation lifecycle" sample>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {LIFECYCLE.map((stage, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            const tone = done ? T.success : active ? T.accent : T.textMuted;
            return (
              <React.Fragment key={stage}>
                <span
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: `1px solid ${done || active ? "transparent" : T.border}`,
                    color: tone,
                    fontWeight: active ? 600 : 400,
                    background:
                      done || active
                        ? "var(--cg-accent-bg-strong)"
                        : "transparent",
                  }}
                >
                  {stage}
                </span>
                {i < LIFECYCLE.length - 1 && (
                  <span style={{ color: T.textMuted, alignSelf: "center" }}>
                    →
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Section>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: T.textMuted,
          marginBottom: 8,
        }}
      >
        <History size={14} /> Change log <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={rows} />
    </>
  );
}

// ── Audit History (immutable, read-only) — spec §Audit History ──
function AuditTab() {
  const events = [
    "Delegation Created",
    "Delegation Modified",
    "Permission Updated",
    "Assignment Changed",
    "Delegation Extended",
    "Delegation Revoked",
    "Approval Completed",
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
          value={`${pick(ASSIGNERS, i)} · ${fmtDate(i * 7 + 3, 2026)}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

// Referenced for parity with the spec §Operational Relationships surface (Identity & Access,
// Workspace Owners, Approval Chains…). Rendered inline where the console links out.
export const RELATIONSHIP_SURFACES = [
  "Workspace Owners",
  "Business Ownership",
  "Approval Chains",
  "Administrative Delegation",
  "Identity & Access",
  "Workspace Governance",
  "Compliance Center",
  "Platform Security",
  "Integration Manager",
  "Logs Center",
  "Support Center",
];

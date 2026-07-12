/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Ownership & Administration → Workspace Owners */
import React from "react";
import { useNavigate } from "react-router";
import {
  UserPlus,
  ArrowLeftRight,
  RefreshCcw,
  UserMinus,
  Download,
  Users,
  Users2,
  LayoutGrid,
  Building2,
  ShieldCheck,
  ClipboardList,
  Activity as ActivityIcon,
  History,
  Crown,
  Briefcase,
  UserCog,
  Star,
  Inbox,
  Layers,
  UserX,
  ClipboardCheck,
} from "lucide-react";
import {
  Page,
  Tabs,
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
 * Workspace Owners — the business + operational ownership register for enterprise workspaces.
 * Authoritative spec:
 * docs/workspace/workspace_module/…/02_Ownership & Administration/workspace_owners.md.
 *
 * Workspace Owners are the primary business and operational owners of a workspace, ultimately
 * accountable for it across its lifecycle (governance, security, compliance, operations, cost,
 * AI governance, business ownership). Every workspace must have at least one Workspace Owner.
 * Ownership is organizational metadata, NOT an access role — access is governed through IAM.
 *
 * Reuses the Enterprise-Administration UX pattern shared with the Users module (Banner · Toolbar ·
 * Filters · Search · Data Table · Bulk/Row actions · Owner Detail Drawer with 6 sub-tabs), plus the
 * spec's Ownership Dashboard (posture grid) and Ownership Model visualization.
 *
 * There is no ownership backend yet, so the register is representative sample data (tagged `Sample`
 * in the UI). When the ownership registry lands, swap SAMPLE_OWNERS for the live query — the
 * component API stays identical.
 */

const ME = "You (current admin)";

// ── Status model ──────────────────────────────────────────────────────────────────────────────────
type Status =
  | "Active"
  | "Requested"
  | "Transfer Pending"
  | "Unassigned"
  | "Former"
  | "Expired";

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Requested: T.warning,
  "Transfer Pending": T.accent,
  Unassigned: T.danger,
  Former: T.textMuted,
  Expired: T.textMuted,
};

// ── Leaf sub-navigation (spec §Navigation) — rendered as a "View" Select facet, not pills ──────────
const VIEW_TABS = [
  { id: "active", label: "Active Owners", Icon: UserCog },
  { id: "multiple", label: "Multiple Owners", Icon: Users2 },
  { id: "requests", label: "Ownership Requests", Icon: Inbox },
  { id: "transfers", label: "Ownership Transfers", Icon: ArrowLeftRight },
  { id: "unassigned", label: "Unassigned Workspaces", Icon: UserX },
  { id: "former", label: "Former Owners", Icon: History },
];

// ── Ownership types (spec §Ownership → Ownership Types) ─────────────────────────────────────────────
const OWNERSHIP_TYPES = [
  "Primary Owner",
  "Business Owner",
  "Technical Owner",
  "Executive Sponsor",
];
const OWNERSHIP_TYPE_ICON: Record<string, React.ReactNode> = {
  "Primary Owner": <Crown size={13} color={T.textMuted} />,
  "Business Owner": <Briefcase size={13} color={T.textMuted} />,
  "Technical Owner": <UserCog size={13} color={T.textMuted} />,
  "Executive Sponsor": <Star size={13} color={T.textMuted} />,
};

const BUSINESS_UNITS = [
  "Finance",
  "Payments",
  "Platform",
  "Security",
  "Retail",
];
const DEPARTMENTS = [
  "Finance Operations",
  "Payments Engineering",
  "Platform Engineering",
  "Security & Risk",
  "Retail Technology",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const COMPLIANCE_PROFILES = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
];
const OWNERS = [
  "Alice Smith",
  "John Carter",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
  "David Chen",
  "Aisha Khan",
  "Tomás Silva",
];
const ASSIGNERS = [ME, "Org Administrator", "Platform Administrator"];

// Responsibilities (spec §Responsibilities → Examples).
const RESPONSIBILITIES = [
  "Business Accountability",
  "Workspace Approval",
  "Budget Ownership",
  "Compliance Accountability",
  "Risk Acceptance",
  "Operational Oversight",
];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface OwnerRecord {
  id: string;
  workspace: string;
  environment: string;
  primaryOwner: string;
  ownerEmail: string;
  employeeId: string;
  department: string;
  businessUnit: string;
  ownershipType: string;
  assignedDate: string;
  effectiveDate: string;
  expiration: string;
  assignedBy: string;
  status: Status;
  multipleOwners: boolean;
  additionalOwners: string[];
  complianceProfile: string;
  complianceScore: number;
  ownedWorkspaces: number;
  productionCount: number;
  developmentCount: number;
  archivedCount: number;
}

// Deterministic representative ownership register.
const SAMPLE_OWNERS: OwnerRecord[] = Array.from({ length: 16 }, (_, i) => {
  const id = `WSO-${(1042 + i * 3).toString().padStart(6, "0")}`;
  const n = hashId(id);
  const status = pick<Status>(
    [
      "Active",
      "Active",
      "Active",
      "Requested",
      "Transfer Pending",
      "Unassigned",
      "Former",
      "Expired",
    ],
    n,
  );
  const bu = pick(BUSINESS_UNITS, n);
  const owner = status === "Unassigned" ? "Unassigned" : pick(OWNERS, n);
  const first = owner.split(" ")[0].toLowerCase();
  const multipleOwners = status === "Active" && n % 3 === 0;
  const owned = 1 + (n % 6);
  const prod = Math.min(owned, 1 + (n % 3));
  const dev = Math.max(0, Math.min(owned - prod, n % 3));
  return {
    id,
    workspace: `${bu} ${pick(ENVIRONMENTS, n >> 2)}`,
    environment: pick(ENVIRONMENTS, n >> 2),
    primaryOwner: owner,
    ownerEmail:
      owner === "Unassigned"
        ? "—"
        : `${first}.${bu.toLowerCase()}@enterprise.io`,
    employeeId: `EMP-${(10000 + (n % 8999)).toString()}`,
    department: pick(DEPARTMENTS, n),
    businessUnit: bu,
    ownershipType: pick(OWNERSHIP_TYPES, n >> 1),
    assignedDate: `2025-0${1 + (n % 8)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    effectiveDate: `2025-0${1 + (n % 8)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    expiration: n % 4 === 0 ? `2026-12-31` : "No expiration",
    assignedBy: pick(ASSIGNERS, n),
    status,
    multipleOwners,
    additionalOwners: multipleOwners
      ? [pick(OWNERS, n + 1), pick(OWNERS, n + 2)]
      : [],
    complianceProfile: pick(COMPLIANCE_PROFILES, n),
    complianceScore: 72 + (n % 27),
    ownedWorkspaces: owned,
    productionCount: prod,
    developmentCount: dev,
    archivedCount: n % 2,
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

/**
 * Embeddable body — Ownership Dashboard + sub-navigation + directory + owner detail drawer, WITHOUT
 * the outer <Page> or the page banner. Rendered both as the standalone route and as a tab of the
 * Workspace Management console. Uses local state for the View sub-nav so it never collides with a
 * host page's `?tab=`.
 */
export function WorkspaceOwnersView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("active");

  const [search, setSearch] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fDept, setFDept] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_OWNERS;

  const matchesView = (r: OwnerRecord) => {
    switch (view) {
      case "active":
        return r.status === "Active";
      case "multiple":
        return r.multipleOwners;
      case "requests":
        return r.status === "Requested";
      case "transfers":
        return r.status === "Transfer Pending";
      case "unassigned":
        return r.status === "Unassigned";
      case "former":
        return r.status === "Former" || r.status === "Expired";
      default:
        return true;
    }
  };

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      matchesView(r) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.primaryOwner.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.ownerEmail.toLowerCase().includes(q)) &&
      (!fOwner || r.primaryOwner === fOwner) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fWorkspace || r.workspace === fWorkspace) &&
      (!fType || r.ownershipType === fType) &&
      (!fStatus || r.status === fStatus) &&
      (!fDept || r.department === fDept) &&
      (!fEnv || r.environment === fEnv)
    );
  });

  const hasFilters = !!(
    search ||
    fOwner ||
    fBu ||
    fWorkspace ||
    fType ||
    fStatus ||
    fDept ||
    fEnv
  );
  const clearFilters = () => {
    setSearch("");
    setFOwner("");
    setFBu("");
    setFWorkspace("");
    setFType("");
    setFStatus("");
    setFDept("");
    setFEnv("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Ownership Dashboard metrics (spec §Ownership Dashboard) ──
  const totalOwners = new Set(
    records
      .filter((r) => r.primaryOwner !== "Unassigned")
      .map((r) => r.primaryOwner),
  ).size;
  const unassignedCount = records.filter(
    (r) => r.status === "Unassigned",
  ).length;
  const multipleCount = records.filter((r) => r.multipleOwners).length;
  const requestCount = records.filter((r) => r.status === "Requested").length;
  const pendingTransfers = records.filter(
    (r) => r.status === "Transfer Pending",
  ).length;

  const toolbar: CommandItem[] = [
    {
      key: "assign",
      label: "Assign Owner",
      icon: <UserPlus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=owners"),
    },
    {
      key: "transfer",
      label: "Transfer Ownership",
      icon: <ArrowLeftRight size={15} />,
      disabled: true,
    },
    {
      key: "reassign",
      label: "Reassign Owner",
      icon: <RefreshCcw size={15} />,
      disabled: true,
    },
    {
      key: "remove",
      label: "Remove Owner",
      icon: <UserMinus size={15} />,
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
  ];

  const cols: Column<OwnerRecord>[] = [
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
      key: "owner",
      header: "Primary Owner",
      sortValue: (r) => r.primaryOwner,
      render: (r) =>
        r.primaryOwner === "Unassigned" ? (
          <span style={{ color: T.danger }}>Unassigned</span>
        ) : (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            {r.primaryOwner}
            {r.multipleOwners && (
              <span
                title={`+${r.additionalOwners.length} additional owner(s)`}
                style={{ color: T.textMuted, display: "inline-flex" }}
              >
                <Users2 size={13} />
              </span>
            )}
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
      key: "type",
      header: "Ownership Type",
      sortValue: (r) => r.ownershipType,
      render: (r) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          {OWNERSHIP_TYPE_ICON[r.ownershipType]}
          {r.ownershipType}
        </span>
      ),
    },
    {
      key: "assigned",
      header: "Assigned Date",
      sortValue: (r) => r.assignedDate,
      render: (r) => r.assignedDate,
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
      {/* Ownership Dashboard (spec §Ownership Dashboard) */}
      <PostureGrid>
        <PostureCard
          title="Total Owners"
          value={totalOwners}
          sub={<SampleTag />}
          tone="ok"
        />
        <PostureCard
          title="Unassigned Workspaces"
          value={unassignedCount}
          sub={<SampleTag />}
          tone={unassignedCount ? "danger" : "muted"}
        />
        <PostureCard
          title="Multiple Owners"
          value={multipleCount}
          sub={<SampleTag />}
          tone="muted"
        />
        <PostureCard
          title="Ownership Requests"
          value={requestCount}
          sub={<SampleTag />}
          tone={requestCount ? "warn" : "muted"}
        />
        <PostureCard
          title="Pending Transfers"
          value={pendingTransfers}
          sub={<SampleTag />}
          tone={pendingTransfers ? "warn" : "muted"}
        />
      </PostureGrid>

      <div style={{ display: "flex", marginBottom: 14, marginTop: 18 }} />

      <Card
        title="Workspace ownership register"
        desc="Manage business ownership and accountability for enterprise workspaces. Ownership is organizational metadata, not an access role — access permissions are managed through Identity & Access Management."
      >
        <CommandBar items={toolbar} />

        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search workspace owners — workspace, owner, department, business unit, email…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select
            label="View"
            value={view}
            onChange={setView}
            options={VIEW_TABS.map((t) => ({ value: t.id, label: t.label }))}
          />
          <Select
            label="Owner"
            value={fOwner}
            onChange={setFOwner}
            options={facet(records.map((r) => r.primaryOwner))}
          />
          <Select
            label="Business Unit"
            value={fBu}
            onChange={setFBu}
            options={facet(records.map((r) => r.businessUnit))}
          />
          <Select
            label="Workspace"
            value={fWorkspace}
            onChange={setFWorkspace}
            options={facet(records.map((r) => r.workspace))}
          />
          <Select
            label="Ownership Type"
            value={fType}
            onChange={setFType}
            options={facet(records.map((r) => r.ownershipType))}
          />
          <Select
            label="Status"
            value={fStatus}
            onChange={setFStatus}
            options={facet(records.map((r) => r.status))}
          />
          <Select
            label="Department"
            value={fDept}
            onChange={setFDept}
            options={facet(records.map((r) => r.department))}
          />
          <Select
            label="Environment"
            value={fEnv}
            onChange={setFEnv}
            options={facet(records.map((r) => r.environment))}
          />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={15}
          initialSort={{ key: "assigned", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<UserPlus size={13} />} onClick={clear}>
                Assign Owner ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<ArrowLeftRight size={13} />} onClick={clear}>
                Transfer Ownership
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
                { label: "Transfer Ownership", onClick: () => setSelId(r.id) },
                {
                  label: "Assign Additional Owner",
                  onClick: () => setSelId(r.id),
                },
                {
                  label: "Remove Owner",
                  onClick: () => setSelId(r.id),
                  danger: true,
                },
                {
                  label: "View Workspace",
                  onClick: () => navigate("/admin/workspaces"),
                },
                { label: "Export", onClick: () => {} },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<UserPlus size={20} />}
              title="No workspace owners found."
              hint="Adjust filters, or assign a workspace owner to establish business accountability."
              cta="Assign Workspace Owner"
              onCta={() => navigate("/admin/workspaces?tab=owners")}
            />
          }
        />
      </Card>

      {/* Ownership Model (spec §Ownership Model → Visualization) */}
      <Card
        title="Ownership model"
        desc="How business accountability flows from the organization down to a workspace and its delegated administrators."
      >
        <OwnershipModel />
      </Card>

      {sel && <OwnerDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function WorkspaceOwnersPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Workspace Owners"
        subtitle="Manage business ownership and accountability for enterprise workspaces."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<UserPlus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=owners")}
            >
              Assign Owner
            </HeaderButton>
          </>
        }
      />
      <WorkspaceOwnersView />
    </Page>
  );
}

// ── Ownership Model visualization (ASCII flow) ──
function OwnershipModel() {
  const nodes = [
    { label: "Organization", Icon: Building2 },
    { label: "Business Unit", Icon: Layers },
    { label: "Workspace", Icon: LayoutGrid },
    { label: "Primary Owner", Icon: Crown },
    { label: "Delegated Administrators", Icon: Users },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "center",
        paddingTop: 6,
      }}
    >
      {nodes.map((node, i) => (
        <React.Fragment key={node.label}>
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 12.5,
              color: T.textNav,
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              minWidth: 240,
              justifyContent: "center",
              background:
                i === 3 ? "var(--cg-accent-bg-strong)" : "transparent",
            }}
          >
            <node.Icon size={14} color={T.textMuted} />
            {node.label}
          </div>
          {i < nodes.length - 1 && (
            <span style={{ color: T.textMuted, fontSize: 13 }}>│</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ════════════ Workspace Owner Detail Drawer — 6 sub-tabs (spec §Workspace Owner Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "ownership", label: "Ownership", icon: <Crown size={13} /> },
  {
    id: "responsibilities",
    label: "Responsibilities",
    icon: <ClipboardCheck size={13} />,
  },
  {
    id: "workspaces",
    label: "Assigned Workspaces",
    icon: <ClipboardList size={13} />,
  },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function OwnerDetailDrawer({
  rec,
  onClose,
}: {
  rec: OwnerRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={
        rec.primaryOwner === "Unassigned" ? rec.workspace : rec.primaryOwner
      }
      // Drawer header: Owner Name · Department · Business Unit · Owned Workspaces · Status
      subtitle={`${rec.department} · ${rec.businessUnit} · ${rec.ownedWorkspaces} owned workspaces · ${rec.status}`}
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
          {/* Quick Actions: Transfer Ownership · Assign Workspace · Export */}
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton icon={<LayoutGrid size={13} />}>
            Assign Workspace
          </HeaderButton>
          <HeaderButton variant="primary" icon={<ArrowLeftRight size={13} />}>
            Transfer Ownership
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "ownership" && <OwnershipTab rec={rec} />}
      {tab === "responsibilities" && <ResponsibilitiesTab rec={rec} />}
      {tab === "workspaces" && <AssignedWorkspacesTab rec={rec} />}
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

// ── Overview (General · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: OwnerRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Owner", v: rec.primaryOwner },
              { k: "Employee ID", v: rec.employeeId, sample: true },
              { k: "Department", v: rec.department },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Email", v: rec.ownerEmail, sample: true },
              { k: "Status", v: <StatusBadge status={rec.status} /> },
            ]}
          />
        </Section>
      )}

      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Owned Workspaces", v: rec.ownedWorkspaces, sample: true },
              { k: "Production", v: rec.productionCount, sample: true },
              { k: "Development", v: rec.developmentCount, sample: true },
              { k: "Archived", v: rec.archivedCount, sample: true },
              {
                k: "Compliance Score",
                v: `${rec.complianceScore}%`,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Ownership (assignments) ──
function OwnershipTab({ rec }: { rec: OwnerRecord }) {
  const assignments = [
    { type: rec.ownershipType, workspace: rec.workspace },
    ...rec.additionalOwners.map((_, i) => ({
      type: OWNERSHIP_TYPES[(i + 1) % OWNERSHIP_TYPES.length],
      workspace: rec.workspace,
    })),
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
        Ownership assignments <SampleTag />
      </div>

      {assignments.map((a, i) => (
        <Section
          key={`${a.type}-${i}`}
          title={a.type}
          sample={i > 0 || undefined}
        >
          <KVGrid
            items={[
              { k: "Workspace", v: a.workspace },
              { k: "Ownership Type", v: a.type },
              { k: "Assigned Date", v: rec.assignedDate, sample: true },
              { k: "Effective Date", v: rec.effectiveDate, sample: true },
              { k: "Expiration", v: rec.expiration, sample: true },
              { k: "Assigned By", v: rec.assignedBy, sample: true },
            ]}
          />
        </Section>
      ))}

      <Section title="Ownership types" sample>
        {OWNERSHIP_TYPES.map((t) => (
          <StatRow
            key={t}
            label={t}
            value={t === rec.ownershipType ? "Held" : "—"}
            tone={t === rec.ownershipType ? "ok" : "muted"}
            sample
          />
        ))}
      </Section>
    </>
  );
}

// ── Responsibilities (organizational accountability) ──
function ResponsibilitiesTab({ rec }: { rec: OwnerRecord }) {
  const n = hashId(rec.id);
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
        Organizational responsibilities <SampleTag />
      </div>
      {RESPONSIBILITIES.map((r, i) => (
        <StatRow
          key={r}
          label={r}
          value={(n + i) % 5 === 0 ? "Delegated" : "Accountable"}
          tone={(n + i) % 5 === 0 ? "warn" : "ok"}
          sample
        />
      ))}
      <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 10 }}>
        Workspace ownership provides business accountability but does not
        automatically grant administrative permissions. Administrative access
        remains governed through Identity & Access Management and organizational
        policies.
      </div>
    </>
  );
}

// ── Assigned Workspaces (every workspace owned) ──
function AssignedWorkspacesTab({ rec }: { rec: OwnerRecord }) {
  const n = hashId(rec.id);
  const workspaces = Array.from({ length: rec.ownedWorkspaces }, (_, i) => {
    const bu = pick(BUSINESS_UNITS, n + i);
    return {
      id: `${rec.id}-ws-${i}`,
      workspace: `${bu} ${pick(ENVIRONMENTS, n + i)}`,
      environment: pick(ENVIRONMENTS, n + i),
      businessUnit: bu,
      compliance: pick(COMPLIANCE_PROFILES, n + i),
      status: pick(["Active", "Active", "Archived"], n + i),
    };
  });
  const cols: Column<(typeof workspaces)[number]>[] = [
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "environment", header: "Environment", render: (r) => r.environment },
    { key: "bu", header: "Business Unit", render: (r) => r.businessUnit },
    { key: "compliance", header: "Compliance", render: (r) => r.compliance },
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
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        {/* Toolbar: Assign Workspace · Remove Assignment · Export */}
        <HeaderButton icon={<LayoutGrid size={13} />}>
          Assign Workspace
        </HeaderButton>
        <HeaderButton icon={<UserMinus size={13} />}>
          Remove Assignment
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={workspaces} />
    </>
  );
}

// ── Activity timeline (Actor · Date · Action filters) ──
function ActivityTab() {
  const [fActor, setFActor] = React.useState("");
  const [fAction, setFAction] = React.useState("");
  const [fDate, setFDate] = React.useState("");

  const events = [
    "Ownership Assigned",
    "Ownership Transferred",
    "Workspace Created",
    "Workspace Archived",
    "Workspace Deleted",
  ].map((action, i) => ({
    action,
    actor: pick(OWNERS, i),
    date: `2026-06-${(10 + i).toString().padStart(2, "0")}`,
  }));

  const shown = events.filter(
    (e) =>
      (!fActor || e.actor === fActor) &&
      (!fAction || e.action === fAction) &&
      (!fDate || e.date === fDate),
  );

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals)).map((v) => ({ value: v, label: v })),
  ];

  return (
    <>
      <FilterBar>
        <Select
          label="Actor"
          value={fActor}
          onChange={setFActor}
          options={facet(events.map((e) => e.actor))}
        />
        <Select
          label="Action"
          value={fAction}
          onChange={setFAction}
          options={facet(events.map((e) => e.action))}
        />
        <Select
          label="Date"
          value={fDate}
          onChange={setFDate}
          options={facet(events.map((e) => e.date))}
        />
      </FilterBar>
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
        Ownership activity timeline <SampleTag />
      </div>
      {shown.map((e) => (
        <div
          key={e.action}
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
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e.action}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>
              {e.actor} · {e.date}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Audit History (immutable, read-only) ──
function AuditTab() {
  const events = [
    "Owner Assigned",
    "Owner Changed",
    "Ownership Removed",
    "Ownership Accepted",
    "Ownership Transferred",
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

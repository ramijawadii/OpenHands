/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Administration → Ownership & Administration → Administrative Delegation */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Download,
  Upload,
  RefreshCcw,
  Copy,
  Pencil,
  Ban,
  PauseCircle,
  Eye,
  ShieldCheck,
  ShieldAlert,
  GitBranch,
  LayoutGrid,
  FileText,
  ListOrdered,
  Activity as ActivityIcon,
  History,
  Check,
  X,
  UserCheck,
  KeyRound,
  Clock,
  Hourglass,
  Zap,
  ClipboardCheck,
  CheckCheck,
} from "lucide-react";
import {
  Page,
  Tabs,
  PageHeader,
  Card,
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
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Administrative Delegation — the governance engine behind delegated administration. Authoritative
 * spec: docs/workspace/workspace_module/…/02_Ownership & Administration/administrative_delegation.md.
 *
 * Where "Delegated Administrators" answers "who is an administrator?", Administrative Delegation
 * answers what authority can be delegated, by whom, under what conditions, for how long, whether it
 * can be re-delegated, what approvals are required, and how it is audited. It separates GOVERNANCE
 * from ASSIGNMENT so delegated administration stays least-privilege, time-bounded, approved,
 * revocable, inherited-and-constrained, and fully auditable. Reuses the Enterprise-Administration UX
 * pattern shared with the Users module (Banner · Toolbar · Filters · Search · Data Table · Bulk/Row
 * actions · Administrative Delegation Detail Drawer with 8 sub-tabs).
 *
 * There is no delegation backend yet, so the delegation set is representative sample data (tagged
 * `Sample` in the UI). When the delegation/approval engine lands, swap SAMPLE_DELEGATIONS for the
 * live query — the component API stays identical.
 */

const ME = "You (current admin)";

// ── Lifecycle status model (drives status badge + operational dashboard) ──────────────────────────
type Status = "Active" | "Pending" | "Suspended" | "Revoked" | "Expired";

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Pending: T.warning,
  Suspended: T.warning,
  Revoked: T.danger,
  Expired: T.textMuted,
};

// ── Navigation views (spec §Navigation) — first FilterBar facet, local state ──────────────────────
const VIEW_TABS = [
  { id: "active", label: "Active Delegations", Icon: ShieldCheck },
  { id: "pending", label: "Pending Delegations", Icon: Hourglass },
  { id: "temporary", label: "Temporary Delegations", Icon: Clock },
  { id: "history", label: "Delegation History", Icon: History },
  { id: "revoked", label: "Revoked Delegations", Icon: Ban },
  { id: "expired", label: "Expired Delegations", Icon: X },
  { id: "policies", label: "Delegation Policies", Icon: FileText },
  { id: "templates", label: "Delegation Templates", Icon: Copy },
  { id: "workflows", label: "Approval Workflows", Icon: GitBranch },
];

// ── Reference domains (spec §Toolbar wizard + §Delegation Scope + §Templates + §Policies) ─────────
const DELEGATION_TYPES = [
  "Standard",
  "Temporary",
  "Break Glass",
  "Managed Service",
  "Regional",
  "Read Only",
  "Emergency",
];
const ADMIN_PROFILES = [
  "Security Administrator",
  "Operations Administrator",
  "Cloud Administrator",
  "Compliance Administrator",
  "SOC Administrator",
  "AI Administrator",
];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const APPROVAL_STATUSES = ["Approved", "Pending", "Rejected"];
const DELEGATES = [
  "John Smith",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
  "Aisha Khan",
  "Tomás Silva",
  "David Chen",
  ME,
];
const APPROVERS = [
  "David Chen",
  "Aisha Khan",
  "Tomás Silva",
  "Organization Administrator",
];

// Supported delegation scopes (spec §Delegation Scope).
const SUPPORTED_SCOPES = [
  "Workspace Administration",
  "User Administration",
  "Identity",
  "Cloud Resources",
  "Compliance",
  "Platform Configuration",
  "AI Administration",
  "Automation",
  "Monitoring",
  "Integrations",
  "Billing (Read Only)",
  "Support",
];

// Effective-permission categories (spec §Effective Permissions).
const PERM_CATEGORIES = [
  "Workspace",
  "Users",
  "Cloud",
  "Security",
  "Compliance",
  "AI",
  "Automation",
  "Monitoring",
  "Support",
  "Reporting",
];

// Supported restrictions (spec §Restrictions).
const SUPPORTED_RESTRICTIONS = [
  "Cannot Delete Workspace",
  "Cannot Change Owners",
  "Cannot Modify Organization Policies",
  "Cannot Assign Administrators",
  "Cannot Create Delegations",
  "Cannot Modify Billing",
  "Cannot Disable Logging",
  "Cannot Disable Compliance",
  "Cannot Change Security Policies",
  "Read Only",
  "Time Restricted",
  "IP Restricted",
  "Region Restricted",
];

// Reusable governance policies (spec §Delegation Policies).
const DELEGATION_POLICIES = [
  "Temporary Administration",
  "Production Administration",
  "Break Glass",
  "Regional Operations",
  "Managed Service Provider",
  "Read Only Administration",
  "Emergency Operations",
  "Compliance Administration",
];

// Reusable delegation configurations (spec §Delegation Templates).
const DELEGATION_TEMPLATES = ADMIN_PROFILES;

// Named approval workflows (spec §Approval Workflow / §Approval Workflows nav).
const APPROVAL_WORKFLOWS = [
  "Standard Delegation Approval",
  "Production Delegation Approval",
  "Break Glass Emergency Approval",
  "Managed Service Approval",
  "Read Only Fast-Track",
  "Compliance Delegation Approval",
];

// Spec chains (vertical inheritance / lifecycle visualizations).
const SCOPE_CHAIN = [
  "Organization Policy",
  "Administrative Profile",
  "Delegation Policy",
  "Workspace Scope",
  "Effective Administration",
];
const EFFECTIVE_CHAIN = [
  "Organization Policies",
  "Workspace Policies",
  "Administrative Profile",
  "Delegation Rules",
  "Effective Permissions",
];
const APPROVAL_CHAIN = [
  "Request",
  "Manager Approval",
  "Workspace Owner",
  "Organization Administrator",
  "Approved",
];
const TIMELINE_CHAIN = [
  "Requested",
  "Approved",
  "Active",
  "Extended",
  "Expired",
];
const ENTERPRISE_MODEL = [
  "Organization Policy",
  "Administrative Delegation Policy",
  "Approval Chain",
  "Delegated Administrator",
  "Workspace Scope",
  "Effective Permissions",
  "Audit Logs",
];

// Break Glass Administration capabilities (spec §Break Glass Administration).
const BREAK_GLASS_CAPS = [
  "Emergency Approval",
  "Time Limited",
  "Immediate Activation",
  "Executive Notification",
  "Mandatory Audit",
  "Automatic Revocation",
];

// Temporary Delegation supports (spec §Temporary Delegation).
const TEMPORARY_SUPPORTS = [
  "Start Date",
  "End Date",
  "Automatic Expiration",
  "Automatic Revocation",
  "Renewal Approval",
];

const NOW = new Date("2026-07-10T00:00:00Z");
const NO_EXPIRY = "—";

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

function expiryBucket(expiration: string): string {
  if (expiration === NO_EXPIRY) return "No expiration";
  const days = Math.ceil(
    (new Date(expiration).getTime() - NOW.getTime()) / 86400000,
  );
  if (days < 0) return "Expired";
  if (days <= 7) return "≤ 7 days";
  if (days <= 30) return "≤ 30 days";
  return "> 30 days";
}

interface DelegationRecord {
  id: string;
  delegate: string;
  mine: boolean;
  workspace: string;
  adminProfile: string;
  delegationType: string;
  status: Status;
  approvalStatus: string;
  businessUnit: string;
  effectiveDate: string;
  expirationDate: string;
  createdBy: string;
  approvedBy: string;
  delegationPolicy: string;
  delegationTemplate: string;
  approvalWorkflow: string;
  reDelegatable: boolean;
  scopes: string[];
  restrictions: string[];
  managedWorkspaces: number;
  effectivePermissions: number;
  policyRestrictions: number;
  approvalCount: number;
  recentActivity: number;
  daysToExpiry: number;
}

// Deterministic representative delegation set (spec §Table example: John Smith · Production PCI ·
// Security Administrator · Temporary · Jul 15 → Jul 30 · Active).
const SAMPLE_DELEGATIONS: DelegationRecord[] = Array.from(
  { length: 15 },
  (_, i) => {
    const id = `DEL-${(482 + i * 9).toString().padStart(6, "0")}`;
    const n = hashId(id);
    const status = pick<Status>(
      [
        "Active",
        "Active",
        "Active",
        "Pending",
        "Suspended",
        "Revoked",
        "Expired",
      ],
      n,
    );
    const delegationType = pick(DELEGATION_TYPES, n >> 1);
    const delegate = pick(DELEGATES, n);
    const effDay = 1 + (n % 15);
    const effectiveDate = `2026-07-${effDay.toString().padStart(2, "0")}`;
    // Permanent (Standard) delegations have no expiry; terminal/temporary ones do.
    const permanent = delegationType === "Standard" && status === "Active";
    const expirationDate = permanent
      ? NO_EXPIRY
      : status === "Expired"
        ? `2026-06-${(1 + (n % 27)).toString().padStart(2, "0")}`
        : `2026-07-${(16 + (n % 14)).toString().padStart(2, "0")}`;
    const daysToExpiry =
      expirationDate === NO_EXPIRY
        ? 9999
        : Math.ceil(
            (new Date(expirationDate).getTime() - NOW.getTime()) / 86400000,
          );
    const scopeCount = 3 + (n % 6);
    const restrictionCount = 2 + (n % 6);
    return {
      id,
      delegate,
      mine: delegate === ME,
      workspace: `${pick(BUSINESS_UNITS, n)} ${pick(["Production PCI", "Pre-production", "Development", "SOC", "Data Lake"], n >> 2)}`,
      adminProfile: pick(ADMIN_PROFILES, n >> 2),
      delegationType,
      status,
      approvalStatus:
        status === "Pending"
          ? "Pending"
          : status === "Revoked"
            ? "Rejected"
            : "Approved",
      businessUnit: pick(BUSINESS_UNITS, n),
      effectiveDate,
      expirationDate,
      createdBy: pick(APPROVERS, n + 1),
      approvedBy: status === "Pending" ? "—" : pick(APPROVERS, n),
      delegationPolicy: pick(DELEGATION_POLICIES, n),
      delegationTemplate: pick(DELEGATION_TEMPLATES, n >> 2),
      approvalWorkflow: pick(APPROVAL_WORKFLOWS, n),
      reDelegatable: n % 5 === 0,
      scopes: SUPPORTED_SCOPES.slice(0, scopeCount),
      restrictions: SUPPORTED_RESTRICTIONS.slice(0, restrictionCount),
      managedWorkspaces: 1 + (n % 6),
      effectivePermissions: 12 + (n % 40),
      policyRestrictions: restrictionCount,
      approvalCount: 1 + (n % 3),
      recentActivity: 2 + (n % 12),
      daysToExpiry,
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

// ── Chain — vertical inheritance / lifecycle visualization (│ connectors, spec ASCII) ─────────────
function Chain({
  steps,
  highlightLast,
}: {
  steps: string[];
  highlightLast?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {steps.map((s, i) => {
        const last = highlightLast && i === steps.length - 1;
        return (
          <React.Fragment key={s}>
            <div
              style={{
                border: `1px solid ${last ? "transparent" : T.border}`,
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12.5,
                color: last ? T.textPrimary : T.textNav,
                background: last ? "var(--cg-accent-bg-strong)" : "transparent",
                fontWeight: last ? 600 : 400,
                textAlign: "center",
              }}
            >
              {s}
            </div>
            {i < steps.length - 1 && (
              <span
                style={{
                  color: T.textMuted,
                  textAlign: "center",
                  fontSize: 13,
                }}
              >
                │
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Section — labelled block with optional Sample tag (mirrors reference) ─────────────────────────
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

/**
 * Embeddable body — sub-navigation + operational dashboard + directory + delegation detail drawer,
 * WITHOUT the outer <Page> or the page banner. Uses local state for the view sub-nav so it never
 * collides with a host page's `?tab=`.
 */
export function AdministrativeDelegationView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("active");

  const [search, setSearch] = React.useState("");
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fDelegate, setFDelegate] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fProfile, setFProfile] = React.useState("");
  const [fApproval, setFApproval] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fExpiry, setFExpiry] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_DELEGATIONS;

  // Operational Dashboard counts (spec §Operational Dashboard).
  const dash = {
    active: records.filter((r) => r.status === "Active").length,
    pending: records.filter((r) => r.status === "Pending").length,
    temporary: records.filter((r) => r.delegationType === "Temporary").length,
    expiring: records.filter(
      (r) =>
        r.status === "Active" && r.daysToExpiry >= 0 && r.daysToExpiry <= 7,
    ).length,
    breakGlass: records.filter(
      (r) =>
        r.delegationType === "Break Glass" || r.delegationType === "Emergency",
    ).length,
    revoked: records.filter((r) => r.status === "Revoked").length,
    violations: records.filter(
      (r) => r.status === "Suspended" || r.approvalStatus === "Rejected",
    ).length,
  };

  // Map view → lifecycle predicate over the delegation directory (config views render below).
  const viewPredicate = (r: DelegationRecord): boolean => {
    switch (view) {
      case "active":
        return r.status === "Active";
      case "pending":
        return r.status === "Pending";
      case "temporary":
        return r.delegationType === "Temporary";
      case "revoked":
        return r.status === "Revoked";
      case "expired":
        return r.status === "Expired";
      case "history":
      default:
        return true;
    }
  };
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      viewPredicate(r) &&
      (!q ||
        r.delegate.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q) ||
        r.adminProfile.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.approvedBy.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q)) &&
      (!fWorkspace || r.workspace === fWorkspace) &&
      (!fDelegate || r.delegate === fDelegate) &&
      (!fType || r.delegationType === fType) &&
      (!fProfile || r.adminProfile === fProfile) &&
      (!fApproval || r.approvalStatus === fApproval) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fExpiry || expiryBucket(r.expirationDate) === fExpiry) &&
      (!fStatus || r.status === fStatus)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFWorkspace("");
    setFDelegate("");
    setFType("");
    setFProfile("");
    setFApproval("");
    setFBu("");
    setFExpiry("");
    setFStatus("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Toolbar — Create Delegation (wizard) + Administrative Actions + Governance Actions (spec §Toolbar).
  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Delegation",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=delegation"),
    },
    {
      key: "modify",
      label: "Modify",
      icon: <Pencil size={15} />,
      disabled: true,
    },
    {
      key: "extend",
      label: "Extend",
      icon: <Clock size={15} />,
      disabled: true,
    },
    { key: "revoke", label: "Revoke", icon: <Ban size={15} />, disabled: true },
    { key: "clone", label: "Clone", icon: <Copy size={15} />, disabled: true },
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
      key: "validate",
      label: "Validate Delegation",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "simulate",
      label: "Simulate Effective Permissions",
      icon: <GitBranch size={15} />,
      disabled: true,
    },
    {
      key: "review",
      label: "Review Delegations",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Export Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<DelegationRecord>[] = [
    {
      key: "delegate",
      header: "Delegate",
      sortValue: (r) => r.delegate,
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
          {r.delegate}
        </span>
      ),
    },
    {
      key: "workspace",
      header: "Workspace",
      sortValue: (r) => r.workspace,
      render: (r) => r.workspace,
    },
    {
      key: "profile",
      header: "Administrative Profile",
      sortValue: (r) => r.adminProfile,
      render: (r) => r.adminProfile,
    },
    {
      key: "type",
      header: "Delegation Type",
      sortValue: (r) => r.delegationType,
      render: (r) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: T.textNav,
          }}
        >
          {(r.delegationType === "Break Glass" ||
            r.delegationType === "Emergency") && (
            <Zap size={13} color={T.warning} />
          )}
          {r.delegationType}
        </span>
      ),
    },
    {
      key: "effective",
      header: "Effective",
      sortValue: (r) => r.effectiveDate,
      render: (r) => r.effectiveDate,
    },
    {
      key: "expiration",
      header: "Expiration",
      sortValue: (r) => r.expirationDate,
      render: (r) => (
        <span
          style={{
            color:
              r.status === "Active" &&
              r.daysToExpiry >= 0 &&
              r.daysToExpiry <= 7
                ? T.warning
                : T.textNav,
          }}
        >
          {r.expirationDate}
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
      {/* Operational Dashboard (spec §Operational Dashboard) */}
      <PostureGrid>
        <PostureCard title="Active Delegations" value={dash.active} tone="ok" />
        <PostureCard
          title="Pending Requests"
          value={dash.pending}
          tone={dash.pending ? "warn" : "muted"}
        />
        <PostureCard title="Temporary Delegations" value={dash.temporary} />
        <PostureCard
          title="Expiring Soon"
          value={dash.expiring}
          sub="≤ 7 days"
          tone={dash.expiring ? "warn" : "muted"}
        />
        <PostureCard
          title="Break Glass Sessions"
          value={dash.breakGlass}
          tone={dash.breakGlass ? "danger" : "muted"}
        />
        <PostureCard title="Revoked Delegations" value={dash.revoked} />
        <PostureCard
          title="Delegation Violations"
          value={dash.violations}
          tone={dash.violations ? "danger" : "ok"}
        />
      </PostureGrid>

      <div style={{ display: "flex", marginTop: 14, marginBottom: 14 }}>
        <Select
          label="View"
          value={view}
          onChange={setView}
          options={VIEW_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {view === "policies" ? (
        <DelegationPoliciesCard />
      ) : view === "templates" ? (
        <DelegationTemplatesCard />
      ) : view === "workflows" ? (
        <ApprovalWorkflowsCard />
      ) : (
        <DiscoveryListView
          title="Administrative delegations"
          commands={toolbar}
          pills={[
            {
              key: "workspace",
              label: "Workspace",
              value: fWorkspace,
              onChange: setFWorkspace,
              options: facet(records.map((r) => r.workspace)),
            },
            {
              key: "delegate",
              label: "Delegate",
              value: fDelegate,
              onChange: setFDelegate,
              options: facet(records.map((r) => r.delegate)),
            },
            {
              key: "type",
              label: "Delegation Type",
              value: fType,
              onChange: setFType,
              options: facet(records.map((r) => r.delegationType)),
            },
            {
              key: "profile",
              label: "Administrative Profile",
              value: fProfile,
              onChange: setFProfile,
              options: facet(records.map((r) => r.adminProfile)),
            },
            {
              key: "approval",
              label: "Approval Status",
              value: fApproval,
              onChange: setFApproval,
              options: facet(APPROVAL_STATUSES),
            },
            {
              key: "bu",
              label: "Business Unit",
              value: fBu,
              onChange: setFBu,
              options: facet(records.map((r) => r.businessUnit)),
            },
            {
              key: "expiry",
              label: "Expiration",
              value: fExpiry,
              onChange: setFExpiry,
              options: facet(
                records.map((r) => expiryBucket(r.expirationDate)),
              ),
            },
            {
              key: "status",
              label: "Status",
              value: fStatus,
              onChange: setFStatus,
              options: facet(records.map((r) => r.status)),
            },
          ]}
          presets={[{ label: "All delegations", onApply: clearFilters }]}
          filterRightSlot={
            <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
          }
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search administrative delegations — delegate, workspace, profile, delegation ID, approver, business unit…"
          count={rows.length}
          columns={cols.filter((c) => !hidden.has(c.key))}
          rows={rows}
          pageSize={15}
          initialSort={{ key: "effective", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<Clock size={13} />} onClick={clear}>
                Extend ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<PauseCircle size={13} />} onClick={clear}>
                Suspend
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
                { label: "Suspend", onClick: () => setSelId(r.id) },
                {
                  label: "Revoke",
                  onClick: () => setSelId(r.id),
                  danger: true,
                },
                {
                  label: "Show Effective Permissions",
                  onClick: () => setSelId(r.id),
                },
                { label: "Export", onClick: () => {} },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<KeyRound size={20} />}
              title="No administrative delegations configured."
              hint="Adjust filters, or create / import a delegation to get started."
              cta="Create Delegation"
              onCta={() => navigate("/admin/workspaces?tab=delegation")}
            />
          }
        />
      )}

      {/* Enterprise Delegation Model (spec §Enterprise Delegation Model) */}
      <div style={{ marginTop: 16 }}>
        <Card
          title="Enterprise delegation model"
          desc="Administrative Delegation is the enterprise governance layer controlling how administrative authority is granted, constrained, inherited, approved, and revoked — separating governance from assignment."
        >
          <div style={{ maxWidth: 420, margin: "6px auto" }}>
            <Chain steps={ENTERPRISE_MODEL} highlightLast />
          </div>
        </Card>
      </div>

      {sel && (
        <DelegationDetailDrawer rec={sel} onClose={() => setSelId(null)} />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function AdministrativeDelegationPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Administrative Delegation"
        subtitle="Define how administrative authority is delegated, approved, inherited, constrained, and audited across enterprise workspaces."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=delegation")}
            >
              Create Delegation
            </HeaderButton>
          </>
        }
      />
      <AdministrativeDelegationView />
    </Page>
  );
}

// ════════════ Delegation Policies view (spec §Delegation Policies + §Break Glass) ════════════
interface PolicyRow {
  id: string;
  name: string;
  scopeSummary: string;
  restrictions: number;
  requiresApproval: string;
  status: string;
}
function DelegationPoliciesCard() {
  const policies: PolicyRow[] = DELEGATION_POLICIES.map((name, i) => {
    const n = hashId(name);
    return {
      id: `POL-${(100 + i).toString()}`,
      name,
      scopeSummary: `${3 + (n % 6)} scopes`,
      restrictions: 2 + (n % 6),
      requiresApproval: n % 3 === 0 ? "Executive" : "Standard chain",
      status: n % 4 === 0 ? "Draft" : "Published",
    };
  });
  const cols: Column<PolicyRow>[] = [
    { key: "name", header: "Policy", render: (r) => r.name },
    { key: "scope", header: "Scope", render: (r) => r.scopeSummary },
    {
      key: "restrictions",
      header: "Restrictions",
      render: (r) => `${r.restrictions}`,
    },
    { key: "approval", header: "Approval", render: (r) => r.requiresApproval },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Published" ? T.success : T.textMuted }}
        >
          {r.status}
        </span>
      ),
    },
  ];
  return (
    <>
      <Card
        title="Delegation policies"
        desc="Reusable governance policies controlling delegation. Only Organization Administrators may define delegation policies."
      >
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
          <HeaderButton icon={<Copy size={13} />}>Clone</HeaderButton>
          <HeaderButton icon={<Upload size={13} />}>Publish</HeaderButton>
          <SampleTag />
        </div>
        <DirectoryTable columns={cols} rows={policies} />
      </Card>

      <div style={{ marginTop: 16 }}>
        <Card
          title="Break glass administration"
          desc="Supports emergency delegation — immediate, time-limited, executively-notified, mandatorily-audited, and automatically revoked."
        >
          <Section title="Capabilities" sample>
            {BREAK_GLASS_CAPS.map((c) => (
              <StatRow key={c} label={c} value="Supported" tone="warn" sample />
            ))}
          </Section>
        </Card>
      </div>
    </>
  );
}

// ════════════ Delegation Templates view (spec §Delegation Templates) ════════════
interface TemplateRow {
  id: string;
  name: string;
  scopes: string;
  restrictions: number;
  status: string;
}
function DelegationTemplatesCard() {
  const templates: TemplateRow[] = DELEGATION_TEMPLATES.map((name, i) => {
    const n = hashId(name);
    return {
      id: `TPL-${(200 + i).toString()}`,
      name,
      scopes: `${3 + (n % 6)} scopes`,
      restrictions: 2 + (n % 5),
      status: n % 5 === 0 ? "Draft" : "Published",
    };
  });
  const cols: Column<TemplateRow>[] = [
    { key: "name", header: "Template", render: (r) => r.name },
    { key: "scopes", header: "Scopes", render: (r) => r.scopes },
    {
      key: "restrictions",
      header: "Restrictions",
      render: (r) => `${r.restrictions}`,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Published" ? T.success : T.textMuted }}
        >
          {r.status}
        </span>
      ),
    },
  ];
  return (
    <>
      <Card
        title="Delegation templates"
        desc="Reusable delegation configurations. Create, clone, and publish administrative profiles for repeatable least-privilege delegation."
      >
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
          <HeaderButton icon={<Copy size={13} />}>Clone</HeaderButton>
          <HeaderButton icon={<Upload size={13} />}>Publish</HeaderButton>
          <SampleTag />
        </div>
        <DirectoryTable columns={cols} rows={templates} />
      </Card>

      <div style={{ marginTop: 16 }}>
        <Card
          title="Temporary delegation"
          desc="Time-bounded administration with automatic lifecycle management."
        >
          <Section title="Supports" sample>
            {TEMPORARY_SUPPORTS.map((s) => (
              <StatRow key={s} label={s} value="Supported" tone="ok" sample />
            ))}
          </Section>
        </Card>
      </div>
    </>
  );
}

// ════════════ Approval Workflows view (spec §Approval Workflows nav) ════════════
interface WorkflowRow {
  id: string;
  name: string;
  steps: string;
  approvers: string;
  status: string;
}
function ApprovalWorkflowsCard() {
  const flows: WorkflowRow[] = APPROVAL_WORKFLOWS.map((name, i) => {
    const n = hashId(name);
    return {
      id: `WF-${(300 + i).toString()}`,
      name,
      steps: `${2 + (n % 3)} steps`,
      approvers: APPROVAL_CHAIN.slice(1, 2 + (n % 3)).join(" → "),
      status: n % 4 === 0 ? "Draft" : "Active",
    };
  });
  const cols: Column<WorkflowRow>[] = [
    { key: "name", header: "Workflow", render: (r) => r.name },
    { key: "steps", header: "Steps", render: (r) => r.steps },
    { key: "approvers", header: "Approver Chain", render: (r) => r.approvers },
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
    <Card
      title="Approval workflows"
      desc="Named approval chains that govern how delegations are requested and approved before activation."
    >
      <Section title="Standard approval chain" sample>
        <div style={{ maxWidth: 380, margin: "4px auto" }}>
          <Chain steps={APPROVAL_CHAIN} highlightLast />
        </div>
      </Section>
      <DirectoryTable columns={cols} rows={flows} />
    </Card>
  );
}

// ════════════ Administrative Delegation Detail Drawer — 8 sub-tabs (spec §Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "scope", label: "Delegation Scope", icon: <GitBranch size={13} /> },
  {
    id: "permissions",
    label: "Effective Permissions",
    icon: <ShieldCheck size={13} />,
  },
  {
    id: "restrictions",
    label: "Restrictions",
    icon: <ShieldAlert size={13} />,
  },
  {
    id: "approval",
    label: "Approval Workflow",
    icon: <ClipboardCheck size={13} />,
  },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  {
    id: "timeline",
    label: "Delegation Timeline",
    icon: <ListOrdered size={13} />,
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
      title={`${rec.delegate} · ${rec.adminProfile}`}
      subtitle={`${rec.workspace} · ${rec.status} · Expires ${rec.expirationDate}`}
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
          <HeaderButton icon={<Pencil size={13} />}>Modify</HeaderButton>
          <HeaderButton icon={<Clock size={13} />}>Extend</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton variant="danger" icon={<Ban size={13} />}>
            Revoke
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "scope" && <ScopeTab rec={rec} />}
      {tab === "permissions" && <PermissionsTab rec={rec} />}
      {tab === "restrictions" && <RestrictionsTab rec={rec} />}
      {tab === "approval" && <ApprovalTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "timeline" && <TimelineTab rec={rec} />}
      {tab === "audit" && <AuditTab rec={rec} />}
    </SideRailDrawer>
  );
}

// ── Overview (General · Statistics) — spec §Overview ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: DelegationRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Delegation ID", v: rec.id },
              { k: "Workspace", v: rec.workspace },
              { k: "Delegate", v: rec.delegate },
              { k: "Administrative Profile", v: rec.adminProfile },
              { k: "Delegation Type", v: rec.delegationType },
              { k: "Status", v: rec.status },
              { k: "Effective Date", v: rec.effectiveDate },
              { k: "Expiration Date", v: rec.expirationDate },
              { k: "Created By", v: rec.createdBy, sample: true },
              { k: "Approved By", v: rec.approvedBy, sample: true },
            ]}
          />
          <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
            {`Governed by the "${rec.delegationPolicy}" policy via the "${rec.delegationTemplate}" template. Re-delegation ${rec.reDelegatable ? "permitted" : "not permitted"}.`}
          </div>
        </Section>
      )}

      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              {
                k: "Managed Workspaces",
                v: rec.managedWorkspaces,
                sample: true,
              },
              {
                k: "Effective Permissions",
                v: rec.effectivePermissions,
                sample: true,
              },
              {
                k: "Policy Restrictions",
                v: rec.policyRestrictions,
                sample: true,
              },
              { k: "Approval Count", v: rec.approvalCount, sample: true },
              {
                k: "Recent Activity",
                v: `${rec.recentActivity} events`,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Delegation Scope (Supported Scopes · Scope Boundaries · visualization) — spec §Delegation Scope ──
const SCOPE_SUBS = [
  { id: "supported-scopes", label: "Supported scopes" },
  { id: "scope-boundaries", label: "Scope boundaries" },
  { id: "scope-inheritance", label: "Scope inheritance" },
];
function ScopeTab({ rec }: { rec: DelegationRecord }) {
  const [sub, setSub] = React.useState("supported-scopes");
  return (
    <>
      <Tabs tabs={SCOPE_SUBS} active={sub} onChange={setSub} />
      {sub === "supported-scopes" && (
        <Section title="Supported scopes" sample>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>
            Defines exactly what authority is delegated.
          </div>
          {SUPPORTED_SCOPES.map((s) => {
            const granted = rec.scopes.includes(s);
            return (
              <StatRow
                key={s}
                label={s}
                value={granted ? "Delegated" : "Not delegated"}
                tone={granted ? "ok" : "muted"}
                sample
              />
            );
          })}
        </Section>
      )}

      {sub === "scope-boundaries" && (
        <Section title="Scope boundaries" sample>
          <KVGrid
            items={[
              {
                k: "Allowed Actions",
                v: `${rec.scopes.length} scope groups`,
                sample: true,
              },
              {
                k: "Restricted Actions",
                v: `${rec.restrictions.length} restrictions`,
                sample: true,
              },
              {
                k: "Inherited Permissions",
                v: "From Administrative Profile",
                sample: true,
              },
              {
                k: "Workspace Restrictions",
                v: rec.workspace,
                sample: true,
              },
              {
                k: "Cross-Workspace Access",
                v: rec.reDelegatable ? "Allowed" : "Denied",
                sample: true,
              },
            ]}
          />
        </Section>
      )}

      {sub === "scope-inheritance" && (
        <Section title="Scope inheritance" sample>
          <div style={{ maxWidth: 380, margin: "4px auto" }}>
            <Chain steps={SCOPE_CHAIN} highlightLast />
          </div>
        </Section>
      )}
    </>
  );
}

// ── Effective Permissions (visualization · categories · toolbar) — spec §Effective Permissions ──
const PERMISSIONS_SUBS = [
  { id: "permission-resolution", label: "Permission resolution" },
  {
    id: "effective-permissions-by-category",
    label: "Effective permissions by category",
  },
];
function PermissionsTab({ rec }: { rec: DelegationRecord }) {
  const [sub, setSub] = React.useState("permission-resolution");
  const n = hashId(rec.id);
  const levels = ["Full", "Manage", "Read/Write", "Read Only", "None"];
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <HeaderButton icon={<GitBranch size={13} />}>Compare</HeaderButton>
        <HeaderButton icon={<Eye size={13} />}>Preview</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>

      <Tabs tabs={PERMISSIONS_SUBS} active={sub} onChange={setSub} />
      {sub === "permission-resolution" && (
        <Section title="Permission resolution" sample>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>
            The administrator&apos;s real permissions after evaluating every
            policy.
          </div>
          <div style={{ maxWidth: 380, margin: "4px auto" }}>
            <Chain steps={EFFECTIVE_CHAIN} highlightLast />
          </div>
        </Section>
      )}

      {sub === "effective-permissions-by-category" && (
        <Section title="Effective permissions by category" sample>
          {PERM_CATEGORIES.map((c, i) => {
            const lvl = pick(levels, n + i);
            return (
              <StatRow
                key={c}
                label={c}
                value={lvl}
                tone={
                  lvl === "None" ? "muted" : lvl === "Read Only" ? "warn" : "ok"
                }
                sample
              />
            );
          })}
        </Section>
      )}
    </>
  );
}

// ── Restrictions (supported restrictions, active/inactive) — spec §Restrictions ──
function RestrictionsTab({ rec }: { rec: DelegationRecord }) {
  return (
    <>
      <Section title="Restrictions" sample>
        <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>
          Defines what the delegated administrator cannot perform.
        </div>
        {SUPPORTED_RESTRICTIONS.map((r) => {
          const active = rec.restrictions.includes(r);
          return (
            <StatRow
              key={r}
              label={r}
              value={active ? "Enforced" : "Inactive"}
              tone={active ? "danger" : "muted"}
              sample
            />
          );
        })}
      </Section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: 8,
          border: `1px solid var(--cg-danger-border)`,
          background: "var(--cg-danger-bg)",
          color: T.danger,
          fontSize: 12.5,
        }}
      >
        <ShieldAlert size={15} /> Restrictions are non-overridable guardrails
        enforced above the administrative profile.
      </div>
    </>
  );
}

// ── Approval Workflow (visualization · workflow / approvers / dates / status) — spec §Approval Workflow ──
const APPROVAL_SUBS = [
  { id: "approval-workflow", label: "Approval workflow" },
  { id: "approval-summary", label: "Approval summary" },
];
function ApprovalTab({ rec }: { rec: DelegationRecord }) {
  const [sub, setSub] = React.useState("approval-workflow");
  const n = hashId(rec.id);
  const currentIdx =
    rec.status === "Pending"
      ? 1 + (n % 3)
      : rec.status === "Revoked"
        ? Math.max(1, n % 4)
        : APPROVAL_CHAIN.length - 1;
  return (
    <>
      <Tabs tabs={APPROVAL_SUBS} active={sub} onChange={setSub} />
      {sub === "approval-workflow" && (
        <Section title="Approval workflow" sample>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>
            Workflow: {rec.approvalWorkflow}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {APPROVAL_CHAIN.map((stage, i) => {
              const done = i < currentIdx || rec.status === "Active";
              const active = i === currentIdx && rec.status === "Pending";
              const rejected = rec.status === "Revoked" && i === currentIdx;
              const tone = rejected
                ? T.danger
                : done
                  ? T.success
                  : active
                    ? T.accent
                    : T.textMuted;
              return (
                <div
                  key={stage}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom:
                      i < APPROVAL_CHAIN.length - 1
                        ? `1px solid ${T.border}`
                        : "none",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        done || active
                          ? "var(--cg-accent-bg-strong)"
                          : "transparent",
                      border: `1px solid ${done || active ? "transparent" : T.border}`,
                      color: tone,
                      fontSize: 11,
                    }}
                  >
                    {rejected ? (
                      <X size={12} />
                    ) : done ? (
                      <Check size={12} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: T.textPrimary,
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {stage}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: T.textMuted,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                        marginTop: 2,
                      }}
                    >
                      <span>
                        Approver:{" "}
                        {i === 0 ? rec.delegate : pick(APPROVERS, n + i)}
                      </span>
                      <span>·</span>
                      <span style={{ color: tone }}>
                        {rejected
                          ? "Rejected"
                          : done
                            ? "Approved"
                            : active
                              ? "In review"
                              : "Pending"}
                      </span>
                      {done && (
                        <>
                          <span>·</span>
                          <span>{rec.effectiveDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {sub === "approval-summary" && (
        <Section title="Approval summary" sample>
          <KVGrid
            items={[
              { k: "Workflow", v: rec.approvalWorkflow, sample: true },
              { k: "Approvers", v: rec.approvalCount, sample: true },
              {
                k: "Approval Dates",
                v: rec.status === "Pending" ? "—" : rec.effectiveDate,
                sample: true,
              },
              { k: "Current Status", v: rec.approvalStatus, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Activity (timeline + Actor/Action/Date filters) — spec §Activity ──
function ActivityTab({ rec }: { rec: DelegationRecord }) {
  const n = hashId(rec.id);
  const events = [
    "Delegation Created",
    "Approved",
    "Activated",
    "Modified",
    "Extended",
    "Suspended",
    "Revoked",
    "Expired",
  ];
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <Select
          label="Actor"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "All" },
            ...APPROVERS.map((a) => ({ value: a, label: a })),
          ]}
        />
        <Select
          label="Action"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "All" },
            ...events.map((e) => ({ value: e, label: e })),
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
              {pick(APPROVERS, n + i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], n + i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Delegation Timeline (lifecycle visualization) — spec §Delegation Timeline ──
function TimelineTab({ rec }: { rec: DelegationRecord }) {
  const reached =
    rec.status === "Expired"
      ? TIMELINE_CHAIN.length
      : rec.status === "Pending"
        ? 1
        : rec.status === "Active"
          ? 3
          : rec.status === "Revoked"
            ? 3
            : 4;
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
        The complete delegation lifecycle <SampleTag />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {TIMELINE_CHAIN.map((stage, i) => {
          const done = i < reached;
          return (
            <React.Fragment key={stage}>
              <div
                style={{
                  border: `1px solid ${done ? "transparent" : T.border}`,
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 12.5,
                  color: done ? T.textPrimary : T.textMuted,
                  background: done
                    ? "var(--cg-accent-bg-strong)"
                    : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {done ? (
                  <CheckCheck size={14} color={T.success} />
                ) : (
                  <Clock size={14} color={T.textMuted} />
                )}
                {stage}
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: T.textMuted,
                  }}
                >
                  {i === 0
                    ? rec.effectiveDate
                    : i === TIMELINE_CHAIN.length - 1
                      ? rec.expirationDate
                      : ""}
                </span>
              </div>
              {i < TIMELINE_CHAIN.length - 1 && (
                <span
                  style={{
                    color: T.textMuted,
                    textAlign: "center",
                    fontSize: 12,
                  }}
                >
                  │
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}

// ── Audit History (immutable, read-only) — spec §Audit History ──
function AuditTab({ rec }: { rec: DelegationRecord }) {
  const n = hashId(rec.id);
  const events = [
    "Delegation Requested",
    "Delegation Approved",
    "Delegation Activated",
    "Delegation Modified",
    "Delegation Suspended",
    "Delegation Revoked",
    "Delegation Expired",
    "Permissions Changed",
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
          value={`${pick(APPROVERS, n + i)} · 2026-07-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

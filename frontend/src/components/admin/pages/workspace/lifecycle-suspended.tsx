/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Lifecycle → Suspended */
import React from "react";
import { useNavigate } from "react-router";
import {
  Download,
  RefreshCcw,
  Check,
  X,
  Ban,
  Play,
  Clock,
  PlayCircle,
  Pencil,
  Bell,
  FileText,
  ClipboardCheck,
  ShieldCheck,
  ShieldAlert,
  Scale,
  Wallet,
  Settings,
  Wrench,
  UserCheck,
  LayoutGrid,
  Layers,
  Activity as ActivityIcon,
  History,
  GitBranch,
  ListOrdered,
  AlertTriangle,
  Inbox,
  PauseCircle,
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
 * Suspended Workspaces — the Lifecycle sub-module for workspaces that have been temporarily disabled
 * from normal operations while preserving all configurations, resources, metadata and historical
 * records. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/04_Lifecycle/suspended.md.
 *
 * A suspended workspace remains part of the organization but is restricted from regular user, agent
 * and automation activity until it is reactivated. Unlike Archived workspaces, suspended workspaces
 * are expected to return to service. Reuses the Enterprise-Administration UX pattern shared with the
 * Users module (Banner · Toolbar · Filters · Search · Data Table · Bulk/Row actions · Workspace
 * Detail Drawer with 7 sub-tabs).
 *
 * There is no suspension backend yet, so the record set is representative sample data (tagged
 * `Sample` in the UI). When the workspace lifecycle engine + reactivation approval workflow land,
 * swap SAMPLE_SUSPENDED for the live query — the component API stays identical.
 */

// ── Status model ──────────────────────────────────────────────────────────────────────────────────
type Status = "Suspended" | "Reactivating";

const STATUS_TONE: Record<Status, string> = {
  Suspended: T.warning,
  Reactivating: T.accent,
};

// ── Suspension types (spec §Suspension Types) ─────────────────────────────────────────────────────
const SUSPENSION_TYPES = [
  "Security",
  "Compliance",
  "Administrative",
  "Financial",
  "Legal Hold",
  "Operational",
  "Maintenance",
  "Business Requested",
];

// ── Reactivation status ───────────────────────────────────────────────────────────────────────────
type Reactivation =
  | "Not Requested"
  | "Requested"
  | "Pending Review"
  | "Ready"
  | "Blocked"
  | "Approved";

const REACTIVATION_STATES: Reactivation[] = [
  "Not Requested",
  "Requested",
  "Pending Review",
  "Ready",
  "Blocked",
  "Approved",
];

const REACTIVATION_TONE: Record<Reactivation, string> = {
  "Not Requested": T.textMuted,
  Requested: T.accent,
  "Pending Review": T.warning,
  Ready: T.success,
  Blocked: T.danger,
  Approved: T.success,
};

// ── Second-level sub-navigation (spec §Navigation tree) ───────────────────────────────────────────
const VIEW_TABS = [
  { id: "all", label: "All Suspended", Icon: Inbox },
  { id: "security", label: "Security Suspension", Icon: ShieldAlert },
  { id: "compliance", label: "Compliance Suspension", Icon: ShieldCheck },
  { id: "administrative", label: "Administrative Suspension", Icon: Settings },
  { id: "financial", label: "Financial Suspension", Icon: Wallet },
  { id: "legal", label: "Legal Hold", Icon: Scale },
  { id: "user", label: "User Requested", Icon: UserCheck },
  { id: "scheduled", label: "Scheduled Suspension", Icon: Clock },
  { id: "pending", label: "Pending Reactivation", Icon: PlayCircle },
];

const TYPE_ICON: Record<
  string,
  React.ComponentType<{ size?: number; color?: string }>
> = {
  Security: ShieldAlert,
  Compliance: ShieldCheck,
  Administrative: Settings,
  Financial: Wallet,
  "Legal Hold": Scale,
  Operational: Wrench,
  Maintenance: Wrench,
  "Business Requested": UserCheck,
};

const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const OWNERS = [
  "Platform Team",
  "John Smith",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
];
const APPROVERS = ["David Chen", "Aisha Khan", "Tomás Silva", "Unassigned"];
const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];
const COMPLIANCE_STATES = [
  "Compliant",
  "Non-Compliant",
  "Under Review",
  "Exempt",
];
const REASONS = [
  "Credential Compromise",
  "Compliance Violation",
  "Billing Dispute",
  "Operational Investigation",
  "Business Freeze",
  "Temporary Project Pause",
  "Legal Hold",
  "Risk Containment",
  "Security Incident",
  "Contract Issue",
];

// Reactivation approval pipeline (spec §Reactivation Workflow).
const REACTIVATION_STAGES = [
  "Suspended",
  "Reactivation Requested",
  "Security Review",
  "Compliance Review",
  "Operational Validation",
  "Approval",
  "Active",
];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface SuspendedRecord {
  id: string;
  workspace: string;
  workspaceId: string;
  environment: string;
  businessUnit: string;
  owner: string;
  suspensionType: string;
  reason: string;
  description: string;
  requestedBy: string;
  approvedBy: string;
  incidentRef: string;
  caseRef: string;
  businessJustification: string;
  suspendedDate: string;
  expectedReactivation: string;
  reactivation: Reactivation;
  reactivationStage: string;
  status: Status;
  riskLevel: string;
  complianceStatus: string;
  daysSuspended: number;
  blockedUsers: number;
  blockedAgents: number;
  affectedResources: number;
  openIncidents: number;
  pendingApprovals: number;
}

// Deterministic representative suspended-workspace set.
const SAMPLE_SUSPENDED: SuspendedRecord[] = Array.from(
  { length: 15 },
  (_, i) => {
    const id = `SUSP-${(1000 + i * 13).toString().padStart(6, "0")}`;
    const n = hashId(id);
    const suspensionType = pick(SUSPENSION_TYPES, n);
    const reactivation = pick(REACTIVATION_STATES, n >> 1);
    const days = 1 + (n % 120);
    const stageIdx =
      reactivation === "Not Requested"
        ? 0
        : reactivation === "Requested"
          ? 1
          : reactivation === "Pending Review"
            ? 2 + (n % 3)
            : reactivation === "Ready"
              ? 4
              : reactivation === "Approved"
                ? 5
                : 2 + (n % 2);
    return {
      id,
      workspace: `${pick(BUSINESS_UNITS, n)} ${pick(ENVIRONMENTS, n >> 2)}`,
      workspaceId: `WS-${(4200 + n) % 9000}`,
      environment: pick(ENVIRONMENTS, n >> 2),
      businessUnit: pick(BUSINESS_UNITS, n),
      owner: pick(OWNERS, n),
      suspensionType,
      reason: pick(REASONS, n),
      description: `${suspensionType} suspension raised for the ${pick(BUSINESS_UNITS, n)} business unit following ${pick(REASONS, n).toLowerCase()}.`,
      requestedBy: pick(OWNERS.slice(1), n + 1),
      approvedBy: pick(APPROVERS, n + 2),
      incidentRef: `INC-${(2200 + (n % 700)).toString()}`,
      caseRef: `CASE-${(880 + (n % 400)).toString()}`,
      businessJustification: `Containment required until ${pick(REASONS, n).toLowerCase()} is resolved and validated.`,
      suspendedDate: `2026-${pick(["07", "08", "09"], n)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      expectedReactivation: `2026-${pick(["08", "09", "10"], n >> 2)}-${(1 + ((n + 9) % 27)).toString().padStart(2, "0")}`,
      reactivation,
      reactivationStage:
        REACTIVATION_STAGES[Math.min(stageIdx, REACTIVATION_STAGES.length - 1)],
      status: reactivation === "Approved" ? "Reactivating" : "Suspended",
      riskLevel: pick(RISK_LEVELS, n >> 1),
      complianceStatus: pick(COMPLIANCE_STATES, n >> 3),
      daysSuspended: days,
      blockedUsers: 4 + (n % 90),
      blockedAgents: 1 + (n % 24),
      affectedResources: 6 + (n % 55),
      openIncidents: n % 4,
      pendingApprovals: reactivation === "Not Requested" ? 0 : 1 + (n % 3),
    };
  },
);

const RISK_TONE: Record<string, string> = {
  Critical: T.danger,
  High: T.warning,
  Medium: T.textNav,
  Low: T.textMuted,
};

// Duration buckets for the Duration facet.
function durationBucket(days: number): string {
  if (days < 7) return "< 7 days";
  if (days < 30) return "7–30 days";
  if (days < 90) return "30–90 days";
  return "> 90 days";
}
const DURATION_BUCKETS = ["< 7 days", "7–30 days", "30–90 days", "> 90 days"];

// map sub-nav id → predicate
const VIEW_PREDICATE: Record<string, (r: SuspendedRecord) => boolean> = {
  all: () => true,
  security: (r) => r.suspensionType === "Security",
  compliance: (r) => r.suspensionType === "Compliance",
  administrative: (r) => r.suspensionType === "Administrative",
  financial: (r) => r.suspensionType === "Financial",
  legal: (r) => r.suspensionType === "Legal Hold",
  user: (r) => r.suspensionType === "Business Requested",
  scheduled: (r) =>
    r.suspensionType === "Maintenance" || r.suspensionType === "Operational",
  pending: (r) =>
    r.reactivation === "Requested" ||
    r.reactivation === "Pending Review" ||
    r.reactivation === "Ready" ||
    r.reactivation === "Approved",
};

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

function ReactivationBadge({ state }: { state: Reactivation }) {
  const c = REACTIVATION_TONE[state];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: c }}
      />
      {state}
    </span>
  );
}

/**
 * Embeddable body — operational dashboard + sub-navigation + directory + reactivation-workflow
 * visualization + suspended-workspace detail drawer, WITHOUT the outer <Page> or the page banner.
 * Rendered both as the standalone route and as a tab of the Workspace Management console. Uses local
 * state for the view sub-nav so it never collides with a host page's `?tab=`.
 */
export function LifecycleSuspendedView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("all");

  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fReason, setFReason] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fDuration, setFDuration] = React.useState("");
  const [fRisk, setFRisk] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [fReactivation, setFReactivation] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_SUSPENDED;
  const viewPred = VIEW_PREDICATE[view];

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      viewPred(r) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.workspaceId.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)) &&
      (!fType || r.suspensionType === fType) &&
      (!fReason || r.reason === fReason) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fOwner || r.owner === fOwner) &&
      (!fDuration || durationBucket(r.daysSuspended) === fDuration) &&
      (!fRisk || r.riskLevel === fRisk) &&
      (!fCompliance || r.complianceStatus === fCompliance) &&
      (!fReactivation || r.reactivation === fReactivation)
    );
  });
  const hasFilters = !!(
    search ||
    fType ||
    fReason ||
    fBu ||
    fOwner ||
    fDuration ||
    fRisk ||
    fCompliance ||
    fReactivation
  );
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFReason("");
    setFBu("");
    setFOwner("");
    setFDuration("");
    setFRisk("");
    setFCompliance("");
    setFReactivation("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational Dashboard (spec §Operational Dashboard) ──
  const totalSuspended = records.length;
  const pendingReactivation = records.filter((r) =>
    VIEW_PREDICATE.pending(r),
  ).length;
  const securitySuspensions = records.filter(
    (r) => r.suspensionType === "Security",
  ).length;
  const complianceSuspensions = records.filter(
    (r) => r.suspensionType === "Compliance",
  ).length;
  const avgDuration = Math.round(
    records.reduce((s, r) => s + r.daysSuspended, 0) / records.length,
  );
  const blockedOperations = records.reduce(
    (s, r) => s + r.blockedUsers + r.blockedAgents,
    0,
  );
  const upcomingReactivations = records.filter(
    (r) => r.reactivation === "Ready" || r.reactivation === "Approved",
  ).length;

  const toolbar: CommandItem[] = [
    {
      key: "suspend",
      label: "Suspend Workspace",
      icon: <Ban size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=active"),
    },
    {
      key: "reactivate",
      label: "Reactivate",
      icon: <Play size={15} />,
      disabled: true,
    },
    {
      key: "extend",
      label: "Extend Suspension",
      icon: <Clock size={15} />,
      disabled: true,
    },
    {
      key: "modify",
      label: "Modify Suspension",
      icon: <Pencil size={15} />,
      disabled: true,
    },
    {
      key: "review",
      label: "Review Suspension",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "approve",
      label: "Approve Reactivation",
      icon: <Check size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Run Validation",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "notify",
      label: "Notify Owners",
      icon: <Bell size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "logs",
      label: "View Logs",
      icon: <ListOrdered size={15} />,
      disabled: true,
    },
    {
      key: "audit",
      label: "View Audit",
      icon: <History size={15} />,
      disabled: true,
    },
    {
      key: "timeline",
      label: "Open Timeline",
      icon: <ActivityIcon size={15} />,
      disabled: true,
    },
    {
      key: "health",
      label: "Run Health Validation",
      icon: <ShieldAlert size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<SuspendedRecord>[] = [
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
          <PauseCircle size={14} color={T.textMuted} />
          {r.workspace}
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: T.textMuted,
            }}
          >
            {r.workspaceId}
          </span>
        </span>
      ),
    },
    {
      key: "type",
      header: "Suspension Type",
      sortValue: (r) => r.suspensionType,
      render: (r) => {
        const Icon = TYPE_ICON[r.suspensionType] ?? Ban;
        return (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            <Icon size={13} color={T.textMuted} />
            {r.suspensionType}
          </span>
        );
      },
    },
    {
      key: "reason",
      header: "Reason",
      sortValue: (r) => r.reason,
      render: (r) => r.reason,
    },
    {
      key: "since",
      header: "Suspended Since",
      sortValue: (r) => r.suspendedDate,
      render: (r) => r.suspendedDate,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "risk",
      header: "Risk Level",
      sortValue: (r) => RISK_LEVELS.indexOf(r.riskLevel),
      render: (r) => (
        <span style={{ color: RISK_TONE[r.riskLevel] }}>{r.riskLevel}</span>
      ),
    },
    {
      key: "reactivation",
      header: "Reactivation Status",
      sortValue: (r) => r.reactivation,
      render: (r) => <ReactivationBadge state={r.reactivation} />,
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
      {/* ── Operational Dashboard (spec §Operational Dashboard) ── */}
      <PostureGrid>
        <PostureCard
          title="Total Suspended"
          value={totalSuspended}
          tone="warn"
        />
        <PostureCard
          title="Pending Reactivation"
          value={pendingReactivation}
          tone="ok"
        />
        <PostureCard
          title="Security Suspensions"
          value={securitySuspensions}
          tone="danger"
        />
        <PostureCard
          title="Compliance Suspensions"
          value={complianceSuspensions}
          tone="warn"
        />
        <PostureCard
          title="Average Suspension Duration"
          value={`${avgDuration} d`}
          sub={<SampleTag />}
        />
        <PostureCard
          title="Blocked Operations"
          value={blockedOperations}
          tone="danger"
          sub={<SampleTag />}
        />
        <PostureCard
          title="Upcoming Reactivations"
          value={upcomingReactivations}
          tone="ok"
        />
      </PostureGrid>

      <div style={{ height: 14 }} />

      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={view}
          onChange={setView}
          options={VIEW_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      <Card
        title="Suspended workspace directory"
        desc="Temporarily disabled workspaces retain all configuration, resources, metadata and audit history and are expected to return to service once reactivation is approved."
      >
        <CommandBar items={toolbar} />

        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search suspended workspaces — workspace, ID, owner, business unit, suspension reason, request ID…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select
            label="Suspension Type"
            value={fType}
            onChange={setFType}
            options={facet(records.map((r) => r.suspensionType))}
          />
          <Select
            label="Reason"
            value={fReason}
            onChange={setFReason}
            options={facet(records.map((r) => r.reason))}
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
            label="Duration"
            value={fDuration}
            onChange={setFDuration}
            options={[
              { value: "", label: "All" },
              ...DURATION_BUCKETS.map((v) => ({ value: v, label: v })),
            ]}
          />
          <Select
            label="Risk Level"
            value={fRisk}
            onChange={setFRisk}
            options={facet(records.map((r) => r.riskLevel))}
          />
          <Select
            label="Compliance Status"
            value={fCompliance}
            onChange={setFCompliance}
            options={facet(records.map((r) => r.complianceStatus))}
          />
          <Select
            label="Reactivation Status"
            value={fReactivation}
            onChange={setFReactivation}
            options={facet(records.map((r) => r.reactivation))}
          />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "since", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<Play size={13} />} onClick={clear}>
                Reactivate ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>
                Export
              </HeaderButton>
              <HeaderButton icon={<Bell size={13} />} onClick={clear}>
                Notify Owners
              </HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View", onClick: () => setSelId(r.id) },
                { label: "Reactivate", onClick: () => setSelId(r.id) },
                { label: "Extend Suspension", onClick: () => setSelId(r.id) },
                { label: "Edit Reason", onClick: () => setSelId(r.id) },
                { label: "View Timeline", onClick: () => setSelId(r.id) },
                { label: "Export", onClick: () => {} },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<PauseCircle size={20} />}
              title="No suspended workspaces found."
              hint="No workspaces are currently suspended for this view. Review active workspaces to manage the estate."
              cta="View Active Workspaces"
              onCta={() => navigate("/admin/workspaces?tab=active")}
            />
          }
        />
      </Card>

      {/* ── Reactivation Workflow (spec §Reactivation Workflow) ── */}
      <Card
        title="Reactivation workflow"
        desc="A suspended workspace returns to service through a staged, auditable restoration pipeline."
      >
        <FlowChain steps={REACTIVATION_STAGES} sample />
      </Card>

      {/* ── Lifecycle Flow + Suspension Behavior (spec §Lifecycle Flow / §Suspension Behavior) ── */}
      <Card title="Lifecycle & suspension behavior">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          <div>
            <Section title="Lifecycle flow">
              <FlowChain
                steps={[
                  "Active",
                  "Suspended",
                  "Investigation",
                  "Validation",
                  "Approval",
                  "Reactivated",
                  "Active",
                ]}
              />
              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 8 }}>
                Alternatively, Active → Suspended → Archived if the workspace is
                no longer intended to return to service.
              </div>
            </Section>
          </div>
          <div>
            <Section title="Suspension behavior">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SUSPENSION_BEHAVIOR.map((b) => (
                  <div
                    key={b.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12.5,
                      color: b.allowed ? T.textNav : T.textMuted,
                    }}
                  >
                    <span style={{ color: b.allowed ? T.success : T.danger }}>
                      {b.allowed ? "✓" : "✗"}
                    </span>
                    {b.label}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </Card>

      {sel && (
        <SuspendedDetailDrawer rec={sel} onClose={() => setSelId(null)} />
      )}
    </>
  );
}

const SUSPENSION_BEHAVIOR = [
  { label: "Configuration is preserved", allowed: true },
  {
    label: "Cloud resources remain intact (unless explicitly deallocated)",
    allowed: true,
  },
  { label: "Audit logs continue to be retained", allowed: true },
  { label: "Compliance evidence is preserved", allowed: true },
  { label: "Billing policies remain configurable", allowed: true },
  { label: "Ownership is maintained", allowed: true },
  { label: "Workspace metadata remains searchable", allowed: true },
  { label: "Users cannot access the workspace", allowed: false },
  { label: "Agents cannot execute", allowed: false },
  { label: "Scheduled automation is paused", allowed: false },
  { label: "Integrations are disabled (configurable)", allowed: false },
  { label: "API access is blocked (configurable)", allowed: false },
];

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function LifecycleSuspendedPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Suspended Workspaces"
        subtitle="Manage temporarily disabled workspaces, review suspension reasons, monitor operational impact, and restore workspaces when approved."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Play size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=active")}
            >
              Reactivate Workspace
            </HeaderButton>
          </>
        }
      />
      <LifecycleSuspendedView />
    </Page>
  );
}

// ── FlowChain — ASCII / node→node vertical flow (reused for both workflow visualizations) ──────────
function FlowChain({ steps, sample }: { steps: string[]; sample?: boolean }) {
  return (
    <>
      {sample && (
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
          Staged restoration pipeline <SampleTag />
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map((s, i) => (
          <React.Fragment key={`${s}-${i}`}>
            <div
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: 12.5,
                color: T.textNav,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  color: T.textMuted,
                  fontFamily: "monospace",
                  fontSize: 11,
                }}
              >
                {(i + 1).toString().padStart(2, "0")}
              </span>
              {s}
            </div>
            {i < steps.length - 1 && (
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
    </>
  );
}

// ════════════ Suspended Workspace Detail Drawer — 7 sub-tabs (spec §Workspace Detail Drawer) ════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "details", label: "Suspension Details", icon: <FileText size={13} /> },
  {
    id: "impact",
    label: "Operational Impact",
    icon: <AlertTriangle size={13} />,
  },
  { id: "resources", label: "Resources", icon: <Layers size={13} /> },
  { id: "reactivation", label: "Reactivation", icon: <GitBranch size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function SuspendedDetailDrawer({
  rec,
  onClose,
}: {
  rec: SuspendedRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.workspace} · ${rec.workspaceId}`}
      subtitle={`${rec.suspensionType} suspension · Suspended ${rec.suspendedDate} · ${rec.owner} · ${rec.status}`}
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
          <HeaderButton icon={<ListOrdered size={13} />}>
            View Logs
          </HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton variant="primary" icon={<Play size={13} />}>
            Reactivate
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "details" && <DetailsTab rec={rec} />}
      {tab === "impact" && <ImpactTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "reactivation" && <ReactivationTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
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
function OverviewTab({ rec }: { rec: SuspendedRecord }) {
  return (
    <>
      <Section title="General">
        <KVGrid
          items={[
            { k: "Workspace Name", v: rec.workspace },
            { k: "Workspace ID", v: rec.workspaceId },
            { k: "Environment", v: rec.environment },
            { k: "Business Unit", v: rec.businessUnit },
            { k: "Owner", v: rec.owner },
            { k: "Status", v: rec.status },
            { k: "Suspension Type", v: rec.suspensionType },
            { k: "Suspended Date", v: rec.suspendedDate },
            {
              k: "Expected Reactivation",
              v: rec.expectedReactivation,
              sample: true,
            },
          ]}
        />
        <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
          {rec.description}
        </div>
      </Section>

      <Section title="Statistics" sample>
        <KVGrid
          cols={3}
          items={[
            { k: "Days Suspended", v: rec.daysSuspended, sample: true },
            { k: "Blocked Users", v: rec.blockedUsers, sample: true },
            { k: "Blocked Agents", v: rec.blockedAgents, sample: true },
            {
              k: "Affected Resources",
              v: rec.affectedResources,
              sample: true,
            },
            { k: "Open Incidents", v: rec.openIncidents, sample: true },
            { k: "Pending Approvals", v: rec.pendingApprovals, sample: true },
          ]}
        />
      </Section>
    </>
  );
}

// ── Suspension Details (spec §Suspension Details) ──
function DetailsTab({ rec }: { rec: SuspendedRecord }) {
  return (
    <Section title="Suspension details" sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
        Documents why the workspace was suspended.
      </div>
      <KVGrid
        items={[
          { k: "Suspension Type", v: rec.suspensionType },
          { k: "Reason", v: rec.reason },
          { k: "Requested By", v: rec.requestedBy, sample: true },
          { k: "Approved By", v: rec.approvedBy, sample: true },
          { k: "Incident Reference", v: rec.incidentRef, sample: true },
          { k: "Case Reference", v: rec.caseRef, sample: true },
        ]}
      />
      <StatRow label="Description" value={rec.description} sample />
      <StatRow
        label="Business Justification"
        value={rec.businessJustification}
        sample
      />
    </Section>
  );
}

// ── Operational Impact (spec §Operational Impact) ──
const IMPACT_ITEMS = [
  "User Access",
  "Agent Execution",
  "Automation",
  "Integrations",
  "AI Runtime",
  "API Access",
  "Scheduled Jobs",
  "Cross Workspace Access",
];
type ImpactState = "Allowed" | "Restricted" | "Blocked";
function ImpactTab({ rec }: { rec: SuspendedRecord }) {
  const n = hashId(rec.id);
  const items = IMPACT_ITEMS.map((label, i) => {
    const state: ImpactState =
      (n + i) % 5 === 0
        ? "Allowed"
        : (n + i) % 3 === 0
          ? "Restricted"
          : "Blocked";
    return { label, state };
  });
  return (
    <Section title="Operational impact" sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
        Shows what has been disabled while the workspace is suspended.
      </div>
      {items.map((it) => (
        <StatRow
          key={it.label}
          label={it.label}
          value={it.state}
          tone={
            it.state === "Allowed"
              ? "ok"
              : it.state === "Restricted"
                ? "warn"
                : "danger"
          }
          sample
        />
      ))}
    </Section>
  );
}

// ── Resources (spec §Resources) ──
const RESOURCE_CATEGORIES = [
  "Cloud Resources",
  "Identity",
  "Policies",
  "Compliance",
  "Knowledge Bases",
  "AI Models",
  "Integrations",
  "Storage",
  "Secrets",
  "Automation",
];
const RESOURCE_STATES = ["Preserved", "Intact", "Paused", "Disabled"];
const RESOURCE_PROTECTION = ["Protected", "Locked", "Read-only", "Encrypted"];
function ResourcesTab({ rec }: { rec: SuspendedRecord }) {
  const n = hashId(rec.id);
  const resources = RESOURCE_CATEGORIES.map((type, i) => ({
    id: `${rec.id}-res-${i}`,
    resource: `${type} — ${rec.workspaceId}`,
    type,
    state: pick(RESOURCE_STATES, n + i),
    protection: pick(RESOURCE_PROTECTION, n + i * 2),
  }));
  const cols: Column<(typeof resources)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "type", header: "Type", render: (r) => r.type },
    {
      key: "state",
      header: "State",
      render: (r) => (
        <span
          style={{
            color:
              r.state === "Disabled"
                ? T.textMuted
                : r.state === "Paused"
                  ? T.warning
                  : T.success,
          }}
        >
          {r.state}
        </span>
      ),
    },
    { key: "protection", header: "Protection", render: (r) => r.protection },
  ];
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12.5,
          color: T.textMuted,
          marginBottom: 12,
        }}
      >
        Preserved workspace resources — configuration and cloud resources remain
        intact during suspension. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={resources} />
    </>
  );
}

// ── Reactivation (spec §Reactivation) ──
const VALIDATION_CHECKS = [
  "Security Validation",
  "Compliance Validation",
  "Identity Validation",
  "Configuration Drift",
  "Resource Health",
  "Integration Health",
  "AI Runtime Validation",
];
type CheckState = "Ready" | "Pending" | "Blocked";
function ReactivationTab({ rec }: { rec: SuspendedRecord }) {
  const n = hashId(rec.id);
  const checks = VALIDATION_CHECKS.map((label, i) => {
    const state: CheckState =
      (n + i) % 6 === 0 ? "Blocked" : (n + i) % 3 === 0 ? "Pending" : "Ready";
    return { label, state };
  });
  const blocked = checks.some((c) => c.state === "Blocked");
  const currentIdx = REACTIVATION_STAGES.indexOf(rec.reactivationStage);
  return (
    <>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
      >
        <HeaderButton icon={<PlayCircle size={13} />}>
          Request Reactivation
        </HeaderButton>
        <HeaderButton variant="primary" icon={<Check size={13} />}>
          Approve
        </HeaderButton>
        <HeaderButton variant="danger" icon={<X size={13} />}>
          Reject
        </HeaderButton>
        <HeaderButton icon={<ShieldCheck size={13} />}>
          Run Validation
        </HeaderButton>
        <HeaderButton icon={<RefreshCcw size={13} />}>
          Restore Operations
        </HeaderButton>
      </div>

      <Section title="Reactivation pipeline" sample>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {REACTIVATION_STAGES.map((stage, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            const tone = done ? T.success : active ? T.accent : T.textMuted;
            return (
              <div
                key={stage}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom:
                    i < REACTIVATION_STAGES.length - 1
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
                  {done ? <Check size={12} /> : i + 1}
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
                      color: tone,
                      marginTop: 2,
                    }}
                  >
                    {done ? "Completed" : active ? "In progress" : "Pending"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Validation checks" sample>
        {checks.map((c) => (
          <StatRow
            key={c.label}
            label={c.label}
            value={c.state}
            tone={
              c.state === "Ready"
                ? "ok"
                : c.state === "Pending"
                  ? "warn"
                  : "danger"
            }
            sample
          />
        ))}
      </Section>

      {blocked && (
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
          <AlertTriangle size={15} /> Blocked validations must be cleared before
          reactivation can be approved.
        </div>
      )}
    </>
  );
}

// ── Activity (spec §Activity) ──
const ACTIVITY_EVENTS = [
  "Workspace Suspended",
  "Reason Updated",
  "Approval Granted",
  "Validation Executed",
  "Reactivation Requested",
  "Reactivated",
];
function ActivityTab({ rec }: { rec: SuspendedRecord }) {
  const [fActor, setFActor] = React.useState("");
  const [fAction, setFAction] = React.useState("");
  const [fDate, setFDate] = React.useState("");
  const n = hashId(rec.id);
  const events = ACTIVITY_EVENTS.map((action, i) => ({
    action,
    actor: pick([...APPROVERS, ...OWNERS], n + i),
    date: `2026-08-${(3 + i * 2).toString().padStart(2, "0")}`,
  }));
  const rows = events.filter(
    (e) =>
      (!fActor || e.actor === fActor) &&
      (!fAction || e.action === fAction) &&
      (!fDate || e.date === fDate),
  );
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
          value={fActor}
          onChange={setFActor}
          options={[
            { value: "", label: "All actors" },
            ...Array.from(new Set(events.map((e) => e.actor))).map((v) => ({
              value: v,
              label: v,
            })),
          ]}
        />
        <Select
          label="Action"
          value={fAction}
          onChange={setFAction}
          options={[
            { value: "", label: "All actions" },
            ...ACTIVITY_EVENTS.map((v) => ({ value: v, label: v })),
          ]}
        />
        <Select
          label="Date"
          value={fDate}
          onChange={setFDate}
          options={[
            { value: "", label: "All dates" },
            ...Array.from(new Set(events.map((e) => e.date))).map((v) => ({
              value: v,
              label: v,
            })),
          ]}
        />
        <SampleTag />
      </div>
      {rows.map((e) => (
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

// ── Audit History (spec §Audit History) — immutable, read-only ──
function AuditTab() {
  const events = [
    "Workspace Suspended",
    "Suspension Modified",
    "Reactivation Requested",
    "Approval Granted",
    "Validation Completed",
    "Workspace Reactivated",
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
          value={`${pick(APPROVERS, i)} · 2026-08-${(9 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

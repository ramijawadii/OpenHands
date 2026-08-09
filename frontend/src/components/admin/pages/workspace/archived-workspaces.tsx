/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspaces → Archived Workspaces */
import React from "react";
import { useNavigate } from "react-router";
import {
  Archive,
  RotateCcw,
  Download,
  RefreshCcw,
  Gavel,
  ShieldAlert,
  CalendarClock,
  Timer,
  Ban,
  LayoutGrid,
  FileText,
  BadgeCheck,
  History,
  Activity as ActivityIcon,
  Clock,
  Tag,
  ShieldCheck,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
  StatRow,
  KVGrid,
  DirectoryTable,
  FilterBar,
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
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Archived Workspaces — the long-term retention register for workspaces retired from active
 * operations. Authoritative spec:
 * docs/workspace/workspace_module/…/00_Workspaces/archived_workspaces.md.
 *
 * Archived workspaces preserve configuration, governance, compliance evidence, audit history and
 * operational metadata for governance, regulatory compliance, forensic investigation and historical
 * reporting. They remain searchable and reportable but cannot be modified or used for operational
 * activity; they may transition to Restored → Active Workspace, or be Deleted after retention
 * expires. Deletion is never performed directly from this surface — it follows the organizational
 * retention policy. Reuses the Enterprise-Administration UX pattern shared with the Users module
 * (Banner · Toolbar · Filters · Search · Data Table · Bulk/Row actions · Archived Workspace Detail
 * Drawer with 8 sub-tabs), plus the spec's Operational Dashboard and Retention Timeline summaries.
 *
 * There is no archive backend yet, so the archive set is representative sample data (tagged `Sample`
 * in the UI). When admin/org_model.py + the retention engine land, swap SAMPLE_ARCHIVES for the live
 * query — the component API stays identical.
 */

// ── Archive status model (drives the Status column tone) ──────────────────────────────────────────
type ArchiveStatus =
  | "Archived"
  | "Long-Term Retention"
  | "Scheduled for Deletion"
  | "Restorable";

const STATUS_TONE: Record<ArchiveStatus, string> = {
  Archived: T.textNav,
  "Long-Term Retention": T.accent,
  "Scheduled for Deletion": T.danger,
  Restorable: T.success,
};

// ── Sub-navigation (spec §Navigation: 6 archive views + All) ──────────────────────────────────────
const TYPE_TABS = [
  { id: "all", label: "All", Icon: LayoutGrid },
  { id: "recent", label: "Recently Archived", Icon: Clock },
  { id: "long-term", label: "Long-Term Retention", Icon: CalendarClock },
  { id: "compliance-hold", label: "Compliance Hold", Icon: BadgeCheck },
  { id: "legal-hold", label: "Legal Hold", Icon: Gavel },
  { id: "scheduled", label: "Scheduled for Deletion", Icon: Timer },
  { id: "restorable", label: "Restorable", Icon: RotateCcw },
];

const ARCHIVE_REASONS = [
  "Project Completed",
  "Business Unit Dissolved",
  "Regulatory Requirement",
  "Cost Optimization",
  "Cloud Migration",
  "Security Decommission",
  "End of Life",
];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const WS_TYPES = ["Enterprise", "Department", "Project", "Shared Service"];
const RETENTION_POLICIES = [
  "1 Year",
  "3 Years",
  "7 Years",
  "10 Years",
  "Indefinite",
];
const COMPLIANCE_PROFILES = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
];
const GOVERNANCE_PROFILES = ["Strict", "Balanced", "Relaxed"];
const OWNERS = [
  "Alice Smith",
  "David Chen",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
];
const APPROVERS = ["Aisha Khan", "Tomás Silva", "John Smith", "Laura Weiss"];
const TAGS = ["env", "business-unit", "cost-centre", "legacy", "residency"];

// Retention years used to derive expiration + long-term classification.
const RETENTION_YEARS: Record<string, number> = {
  "1 Year": 1,
  "3 Years": 3,
  "7 Years": 7,
  "10 Years": 10,
  Indefinite: 99,
};

interface ArchiveRecord {
  id: string;
  name: string;
  description: string;
  businessUnit: string;
  environment: string;
  workspaceType: string;
  status: ArchiveStatus;
  // ownership
  owner: string;
  businessOwner: string;
  delegatedAdmins: string[];
  // archive information
  archiveReason: string;
  requestedBy: string;
  approvedBy: string;
  archived: string;
  created: string;
  archivePolicy: string;
  notes: string;
  // retention
  retentionPolicy: string;
  retentionExpiration: string;
  legalHold: boolean;
  complianceHold: boolean;
  scheduledDeletion: string | null;
  restorable: boolean;
  recentlyArchived: boolean;
  longTerm: boolean;
  // historical configuration
  governanceProfile: string;
  complianceProfile: string;
  tags: string[];
  // statistics
  members: number;
  cloudResources: number;
  policies: number;
  complianceFrameworks: number;
  auditEvents: number;
  evidenceFiles: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

const RECENT_CUTOFF = "2026-04-01"; // within ~90 days of "today" → Recently Archived

// Deterministic representative archive set (~14 records covering every spec sub-view / state).
const SAMPLE_ARCHIVES: ArchiveRecord[] = Array.from({ length: 14 }, (_, i) => {
  const id = `WS-ARC-${(3100 + i * 13).toString().padStart(5, "0")}`;
  const n = hashId(id);
  const businessUnit = pick(BUSINESS_UNITS, n);
  const environment = pick(ENVIRONMENTS, n >> 2);
  const workspaceType = pick(WS_TYPES, n >> 3);
  const retentionPolicy = pick(RETENTION_POLICIES, n);
  const years = RETENTION_YEARS[retentionPolicy];
  const legalHold = i % 5 === 0;
  const complianceHold = i % 4 === 0;
  const scheduledDeletion =
    i % 6 === 2
      ? `2027-0${1 + (n % 8)}-${(1 + (n % 27)).toString().padStart(2, "0")}`
      : null;
  const restorable =
    !legalHold && !complianceHold && !scheduledDeletion && i % 3 === 0;
  const longTerm = years >= 7;

  // Archive date spread across 2024 → 2026 (some recent).
  const aYear = 2024 + (n % 3);
  const aMonth = (1 + (n % 12)).toString().padStart(2, "0");
  const aDay = (1 + (n % 27)).toString().padStart(2, "0");
  const archived = `${aYear}-${aMonth}-${aDay}`;
  const recentlyArchived = archived >= RECENT_CUTOFF;

  const status: ArchiveStatus = scheduledDeletion
    ? "Scheduled for Deletion"
    : restorable
      ? "Restorable"
      : longTerm
        ? "Long-Term Retention"
        : "Archived";

  const owner = pick(OWNERS, n);
  const archiveReason = pick(ARCHIVE_REASONS, n);
  return {
    id,
    name: `${businessUnit} ${environment} (Legacy ${1000 + (n % 900)})`,
    description: `Retired ${workspaceType.toLowerCase()} workspace for ${businessUnit} ${environment.toLowerCase()} — preserved for governance, audit and historical reporting.`,
    businessUnit,
    environment,
    workspaceType,
    status,
    owner,
    businessOwner: pick(OWNERS, n + 2),
    delegatedAdmins: [pick(OWNERS, n + 1), pick(OWNERS, n + 3)],
    archiveReason,
    requestedBy: pick(OWNERS, n + 4),
    approvedBy: pick(APPROVERS, n),
    archived,
    created: `${aYear - 2}-${aMonth}-${aDay}`,
    archivePolicy: `${retentionPolicy} standard retention`,
    notes: `${archiveReason}; owning team confirmed no further operational need. Evidence preserved.`,
    retentionPolicy,
    retentionExpiration:
      years >= 99 ? "Indefinite" : `${aYear + years}-${aMonth}-${aDay}`,
    legalHold,
    complianceHold,
    scheduledDeletion,
    restorable,
    recentlyArchived,
    longTerm,
    governanceProfile: pick(GOVERNANCE_PROFILES, n),
    complianceProfile: pick(COMPLIANCE_PROFILES, n),
    tags: [pick(TAGS, n), pick(TAGS, n + 2), pick(TAGS, n + 4)],
    members: 4 + (n % 60),
    cloudResources: 8 + (n % 220),
    policies: 3 + (n % 18),
    complianceFrameworks: 1 + (n % 4),
    auditEvents: 40 + (n % 800),
    evidenceFiles: 2 + (n % 30),
  };
});

function YesNo({ on, tone }: { on: boolean; tone?: "warn" | "danger" }) {
  const color = on ? (tone === "danger" ? T.danger : T.warning) : T.textMuted;
  return <span style={{ color }}>{on ? "Yes" : "No"}</span>;
}

function StatusBadge({ status }: { status: ArchiveStatus }) {
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
 * Embeddable body — Operational Dashboard + Retention Timeline summaries, archive sub-navigation,
 * directory and archived-workspace detail drawer, WITHOUT the outer <Page> or the page banner.
 * Rendered both as the standalone route (via ArchivedWorkspacesPage) and as a tab of the Workspace
 * Management console. Uses local state for the sub-nav so it never collides with a host page's
 * `?tab=` param.
 */
export function ArchivedWorkspacesView() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("all");

  // Filters (spec §Filters)
  const [search, setSearch] = React.useState("");
  const [fReason, setFReason] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fRetention, setFRetention] = React.useState("");
  const [fLegal, setFLegal] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [fArchiveYear, setFArchiveYear] = React.useState("");
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

  const records = SAMPLE_ARCHIVES;

  const inTab = (r: ArchiveRecord) => {
    switch (tab) {
      case "recent":
        return r.recentlyArchived;
      case "long-term":
        return r.longTerm;
      case "compliance-hold":
        return r.complianceHold;
      case "legal-hold":
        return r.legalHold;
      case "scheduled":
        return !!r.scheduledDeletion;
      case "restorable":
        return r.restorable;
      default:
        return true;
    }
  };

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      inTab(r) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.archiveReason.toLowerCase().includes(q) ||
        r.tags.join(" ").toLowerCase().includes(q)) &&
      (!fReason || r.archiveReason === fReason) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fType || r.workspaceType === fType) &&
      (!fOwner || r.owner === fOwner) &&
      (!fRetention || r.retentionPolicy === fRetention) &&
      (!fLegal || (fLegal === "Yes" ? r.legalHold : !r.legalHold)) &&
      (!fCompliance ||
        (fCompliance === "Yes" ? r.complianceHold : !r.complianceHold)) &&
      (!fArchiveYear || r.archived.startsWith(fArchiveYear)) &&
      (!fStatus || r.status === fStatus)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFReason("");
    setFBu("");
    setFType("");
    setFOwner("");
    setFRetention("");
    setFLegal("");
    setFCompliance("");
    setFArchiveYear("");
    setFStatus("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];
  const yesNo = [
    { value: "", label: "All" },
    { value: "Yes", label: "Yes" },
    { value: "No", label: "No" },
  ];

  // ── Toolbar (spec §Toolbar: Archive Workspace wizard · Administrative Actions · Retention Actions) ──
  const toolbar: CommandItem[] = [
    {
      key: "archive",
      label: "Archive Workspace",
      icon: <Archive size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=active"),
    },
    {
      key: "restore",
      label: "Restore",
      icon: <RotateCcw size={15} />,
      disabled: true,
    },
    {
      key: "extend",
      label: "Extend Retention",
      icon: <Timer size={15} />,
      disabled: true,
    },
    {
      key: "legal-hold",
      label: "Apply Legal Hold",
      icon: <Gavel size={15} />,
      disabled: true,
    },
    {
      key: "compliance-hold",
      label: "Apply Compliance Hold",
      icon: <ShieldAlert size={15} />,
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
      onClick: () => clearFilters(),
    },
    {
      key: "schedule-deletion",
      label: "Schedule Deletion",
      icon: <CalendarClock size={15} />,
      disabled: true,
    },
    {
      key: "cancel-deletion",
      label: "Cancel Scheduled Deletion",
      icon: <Ban size={15} />,
      disabled: true,
    },
    {
      key: "update-retention",
      label: "Update Retention",
      icon: <Clock size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<ArchiveRecord>[] = [
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
          <Archive size={14} color={T.textMuted} />
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
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "archived",
      header: "Archived",
      sortValue: (r) => r.archived,
      render: (r) => r.archived,
    },
    {
      key: "retention",
      header: "Retention",
      sortValue: (r) => RETENTION_YEARS[r.retentionPolicy],
      render: (r) => r.retentionPolicy,
    },
    {
      key: "legal",
      header: "Legal Hold",
      sortValue: (r) => (r.legalHold ? 1 : 0),
      render: (r) => <YesNo on={r.legalHold} tone="danger" />,
    },
    {
      key: "compliance",
      header: "Compliance Hold",
      sortValue: (r) => (r.complianceHold ? 1 : 0),
      render: (r) => <YesNo on={r.complianceHold} />,
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
      <OperationalDashboard records={records} />

      {/* ── Archive sub-navigation ── */}
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={tab}
          onChange={setTab}
          options={TYPE_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      <DiscoveryListView
        title="Archived workspace register"
        commands={toolbar}
        pills={[
          {
            key: "reason",
            label: "Archive Reason",
            value: fReason,
            onChange: setFReason,
            options: facet(records.map((r) => r.archiveReason)),
          },
          {
            key: "bu",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "type",
            label: "Workspace Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.workspaceType)),
          },
          {
            key: "owner",
            label: "Owner",
            value: fOwner,
            onChange: setFOwner,
            options: facet(records.map((r) => r.owner)),
          },
          {
            key: "retention",
            label: "Retention Policy",
            value: fRetention,
            onChange: setFRetention,
            options: facet(records.map((r) => r.retentionPolicy)),
          },
          {
            key: "legal",
            label: "Legal Hold",
            value: fLegal,
            onChange: setFLegal,
            options: yesNo,
          },
          {
            key: "compliance",
            label: "Compliance Hold",
            value: fCompliance,
            onChange: setFCompliance,
            options: yesNo,
          },
          {
            key: "year",
            label: "Archive Date",
            value: fArchiveYear,
            onChange: setFArchiveYear,
            options: facet(records.map((r) => r.archived.slice(0, 4))),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
        ]}
        presets={[{ label: "All archived", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search archived workspaces — name, ID, business unit, owner, archive reason, tags…"
        count={rows.length}
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={15}
        initialSort={{ key: "archived", dir: "desc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<RotateCcw size={13} />} onClick={clear}>
              Restore ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<Download size={13} />} onClick={clear}>
              Export
            </HeaderButton>
            <HeaderButton icon={<Clock size={13} />} onClick={clear}>
              Update Retention
            </HeaderButton>
            <HeaderButton icon={<Gavel size={13} />} onClick={clear}>
              Apply Hold
            </HeaderButton>
            <HeaderButton icon={<CalendarClock size={13} />} onClick={clear}>
              Schedule Deletion
            </HeaderButton>
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "View", onClick: () => setSelId(r.id) },
              { label: "Restore", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
              { label: "Extend Retention", onClick: () => setSelId(r.id) },
              { label: "Apply Hold", onClick: () => setSelId(r.id) },
              { label: "Schedule Deletion", onClick: () => setSelId(r.id) },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Archive size={20} />}
            title="No archived workspaces found."
            hint="Adjust filters, or view active workspaces to archive one."
            cta="View Active Workspaces"
            onCta={() => navigate("/admin/workspaces?tab=active")}
          />
        }
      />

      {sel && (
        <ArchivedWorkspaceDetailDrawer
          rec={sel}
          onClose={() => setSelId(null)}
        />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function ArchivedWorkspacesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Archived Workspaces"
        subtitle="View and manage archived workspaces retained for governance, audit, compliance, legal retention and historical reporting."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Archive size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=active")}
            >
              Archive Workspace
            </HeaderButton>
          </>
        }
      />
      <ArchivedWorkspacesView />
    </Page>
  );
}

// ════════════ Operational Dashboard (spec §Operational Dashboard) ════════════
function OperationalDashboard({ records }: { records: ArchiveRecord[] }) {
  const nonIndef = records.filter((r) => r.retentionPolicy !== "Indefinite");
  const avgYears = nonIndef.length
    ? (
        nonIndef.reduce((a, r) => a + RETENTION_YEARS[r.retentionPolicy], 0) /
        nonIndef.length
      ).toFixed(1)
    : "—";
  return (
    <StatStripPlain
      items={[
        { label: "Archived Workspaces", value: records.length },
        {
          label: "Legal Holds",
          value: records.filter((r) => r.legalHold).length,
          tone: "danger",
        },
        {
          label: "Compliance Holds",
          value: records.filter((r) => r.complianceHold).length,
          tone: "warn",
        },
        {
          label: "Restorable",
          value: records.filter((r) => r.restorable).length,
          tone: "ok",
        },
        {
          label: "Scheduled for Deletion",
          value: records.filter((r) => r.scheduledDeletion).length,
          tone: "danger",
        },
        { label: "Average Retention", value: `${avgYears} yrs` },
      ]}
    />
  );
}

// ════════════ Archived Workspace Detail Drawer — 8 sub-tabs (spec §Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "archive", label: "Archive Information", icon: <Archive size={13} /> },
  {
    id: "config",
    label: "Historical Configuration",
    icon: <FileText size={13} />,
  },
  {
    id: "evidence",
    label: "Compliance Evidence",
    icon: <BadgeCheck size={13} />,
  },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
  {
    id: "activity",
    label: "Activity Timeline",
    icon: <ActivityIcon size={13} />,
  },
  { id: "retention", label: "Retention", icon: <Clock size={13} /> },
  { id: "restoration", label: "Restoration", icon: <RotateCcw size={13} /> },
];

function ArchivedWorkspaceDetailDrawer({
  rec,
  onClose,
}: {
  rec: ArchiveRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      // Drawer header (spec §Drawer Header): Workspace Name · ID · Archive Status · Retention · Archive Date · Owner
      subtitle={`${rec.id} · ${rec.status} · ${rec.retentionPolicy} · Archived ${rec.archived} · ${rec.owner}`}
      width={760}
      onClose={onClose}
      footer={
        // Quick Actions (spec §Drawer Header): Restore · Export · Extend Retention
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton icon={<Timer size={13} />}>
            Extend Retention
          </HeaderButton>
          <HeaderButton variant="primary" icon={<RotateCcw size={13} />}>
            Restore
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "archive" && <ArchiveInfoTab rec={rec} />}
      {tab === "config" && <HistoricalConfigTab rec={rec} />}
      {tab === "evidence" && <ComplianceEvidenceTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
      {tab === "activity" && <ActivityTab />}
      {tab === "retention" && <RetentionTab rec={rec} />}
      {tab === "restoration" && <RestorationTab rec={rec} />}
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

// ── Overview (General · Ownership · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "ownership", label: "Ownership" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: ArchiveRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Workspace Name", v: rec.name },
              { k: "Description", v: rec.description },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Environment", v: rec.environment },
              { k: "Workspace Type", v: rec.workspaceType },
              { k: "Status", v: <StatusBadge status={rec.status} /> },
              { k: "Created", v: rec.created },
              { k: "Archived", v: rec.archived },
            ]}
          />
        </Section>
      )}
      {sub === "ownership" && (
        <Section title="Ownership" sample>
          <KVGrid
            items={[
              { k: "Business Owner", v: rec.businessOwner, sample: true },
              { k: "Workspace Owner", v: rec.owner, sample: true },
              {
                k: "Delegated Administrators",
                v: rec.delegatedAdmins.join(", "),
                sample: true,
              },
            ]}
          />
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Members", v: rec.members, sample: true },
              {
                k: "Cloud Resources",
                v: rec.cloudResources.toLocaleString(),
                sample: true,
              },
              { k: "Policies", v: rec.policies, sample: true },
              {
                k: "Compliance Frameworks",
                v: rec.complianceFrameworks,
                sample: true,
              },
              {
                k: "Audit Events",
                v: rec.auditEvents.toLocaleString(),
                sample: true,
              },
              { k: "Evidence Files", v: rec.evidenceFiles, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Archive Information (why the workspace was archived) ──
function ArchiveInfoTab({ rec }: { rec: ArchiveRecord }) {
  return (
    <Section title="Archive information" sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 6 }}>
        Explains why the workspace was archived.
      </div>
      <StatRow label="Archive Reason" value={rec.archiveReason} sample />
      <StatRow label="Requested By" value={rec.requestedBy} sample />
      <StatRow label="Approved By" value={rec.approvedBy} sample />
      <StatRow label="Archive Date" value={rec.archived} sample />
      <StatRow label="Archive Policy" value={rec.archivePolicy} sample />
      <StatRow label="Notes" value={rec.notes} sample />
    </Section>
  );
}

// ── Historical Configuration (final config at time of archival — read-only) ──
const HISTORICAL_SUBS = [
  { id: "config", label: "Workspace Configuration" },
  { id: "governance", label: "Governance Profile" },
  { id: "compliance", label: "Compliance Profile" },
  { id: "inventory", label: "Resource Inventory" },
  { id: "ai", label: "AI Configuration" },
  { id: "integrations", label: "Integrations" },
  { id: "policies", label: "Policies" },
  { id: "tags", label: "Tags" },
];
function HistoricalConfigTab({ rec }: { rec: ArchiveRecord }) {
  const [sub, setSub] = React.useState("config");
  const n = hashId(rec.id);
  const inventory = [
    { id: `${rec.id}-inv-0`, resource: "AWS Accounts", count: 1 + (n % 12) },
    {
      id: `${rec.id}-inv-1`,
      resource: "Azure Subscriptions",
      count: n % 6,
    },
    { id: `${rec.id}-inv-2`, resource: "GCP Projects", count: n % 4 },
    {
      id: `${rec.id}-inv-3`,
      resource: "Kubernetes Clusters",
      count: n % 3,
    },
    { id: `${rec.id}-inv-4`, resource: "Repositories", count: 2 + (n % 20) },
  ];
  const invCols: Column<(typeof inventory)[number]>[] = [
    { key: "resource", header: "Resource Class", render: (r) => r.resource },
    { key: "count", header: "Count", render: (r) => r.count },
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
        Final configuration at the time of archival — everything is read-only.
        <SampleTag />
      </div>
      <Tabs tabs={HISTORICAL_SUBS} active={sub} onChange={setSub} />
      {sub === "config" && (
        <Section title="Workspace Configuration" sample>
          <StatRow label="Environment" value={rec.environment} sample />
          <StatRow label="Workspace Type" value={rec.workspaceType} sample />
          <StatRow label="Business Unit" value={rec.businessUnit} sample />
          <StatRow label="Support Tier" value="Standard" sample />
        </Section>
      )}
      {sub === "governance" && (
        <Section title="Governance Profile" sample>
          <StatRow
            label="Governance Profile"
            value={rec.governanceProfile}
            sample
          />
          <StatRow
            label="Inherited Policies"
            value={`${rec.policies}`}
            sample
          />
          <StatRow label="Approval Policy" value="2-of-3 approvers" sample />
        </Section>
      )}
      {sub === "compliance" && (
        <Section title="Compliance Profile" sample>
          <StatRow
            label="Compliance Profile"
            value={rec.complianceProfile}
            sample
          />
          <StatRow
            label="Frameworks"
            value={`${rec.complianceFrameworks} assigned`}
            sample
          />
        </Section>
      )}
      {sub === "inventory" && (
        <Section title="Resource Inventory" sample>
          <DirectoryTable columns={invCols} rows={inventory} />
        </Section>
      )}
      {sub === "ai" && (
        <Section title="AI Configuration" sample>
          <StatRow
            label="AI Runtime"
            value="cloudguard-runtime:latest"
            sample
          />
          <StatRow label="Assigned Agents" value={`${n % 8}`} sample />
          <StatRow
            label="Execution Policies"
            value="Frozen at archival"
            sample
          />
        </Section>
      )}
      {sub === "integrations" && (
        <Section title="Integrations" sample>
          <StatRow
            label="Connected Integrations"
            value={`${2 + (n % 6)}`}
            sample
          />
          <StatRow label="State" value="Disconnected on archival" sample />
        </Section>
      )}
      {sub === "policies" && (
        <Section title="Policies" sample>
          <StatRow label="Assigned Policies" value={`${rec.policies}`} sample />
          <StatRow label="Workspace Overrides" value={`${n % 4}`} sample />
        </Section>
      )}
      {sub === "tags" && (
        <Section title="Tags" sample>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {rec.tags.map((t) => (
              <span
                key={t}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  height: 24,
                  padding: "0 10px",
                  borderRadius: 99,
                  border: `1px solid ${T.border}`,
                  background: "var(--cg-bg-badge)",
                  color: T.textNav,
                  fontSize: 12,
                }}
              >
                <Tag size={11} />
                {t}
              </span>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

// ── Compliance Evidence (artifacts preserved before archival) ──
function ComplianceEvidenceTab({ rec }: { rec: ArchiveRecord }) {
  const n = hashId(rec.id);
  const rows = COMPLIANCE_PROFILES.slice(0, 1 + rec.complianceFrameworks).map(
    (framework, i) => ({
      id: `${rec.id}-ev-${i}`,
      framework,
      assessment: `2025-${(1 + ((n + i) % 12)).toString().padStart(2, "0")}-${(1 + ((n + i) % 27)).toString().padStart(2, "0")}`,
      evidence: `${3 + ((n + i) % 20)} files`,
      reports: `${1 + ((n + i) % 5)} reports`,
      exceptions: (n + i) % 3,
    }),
  );
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "framework", header: "Framework", render: (r) => r.framework },
    {
      key: "assessment",
      header: "Assessment Date",
      render: (r) => r.assessment,
    },
    { key: "evidence", header: "Evidence", render: (r) => r.evidence },
    { key: "reports", header: "Reports", render: (r) => r.reports },
    {
      key: "exceptions",
      header: "Exceptions",
      render: (r) => (
        <span style={{ color: r.exceptions ? T.warning : T.textMuted }}>
          {r.exceptions}
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
        <HeaderButton icon={<Download size={13} />}>
          Download Evidence
        </HeaderButton>
        <HeaderButton icon={<FileText size={13} />}>Export Report</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={rows} />
    </>
  );
}

// ── Audit History (immutable) ──
function AuditTab() {
  const events = [
    "Administrative Changes",
    "Policy Changes",
    "Configuration Changes",
    "Ownership Changes",
    "Compliance Events",
    "Security Events",
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
          value={`${pick(APPROVERS, i)} · ${10 + i} entries · 2025-${(3 + i).toString().padStart(2, "0")}-1${i}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

// ── Activity Timeline (Actor · Category · Date filters) ──
function ActivityTab() {
  const [fActor, setFActor] = React.useState("");
  const [fCategory, setFCategory] = React.useState("");
  const [fDate, setFDate] = React.useState("");
  const events = [
    { label: "Workspace Created", category: "Lifecycle" },
    { label: "Resources Added", category: "Configuration" },
    { label: "Compliance Executed", category: "Compliance" },
    { label: "Ownership Changed", category: "Ownership" },
    { label: "Workspace Archived", category: "Lifecycle" },
  ].map((e, i) => ({
    ...e,
    id: `act-${i}`,
    actor: pick(OWNERS, i),
    date: `2025-${(2 + i).toString().padStart(2, "0")}-1${i}`,
  }));
  const filtered = events.filter(
    (e) =>
      (!fActor || e.actor === fActor) &&
      (!fCategory || e.category === fCategory) &&
      (!fDate || e.date.startsWith(fDate)),
  );
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
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
      <FilterBar count={filtered.length} total={events.length}>
        <Select
          label="Actor"
          value={fActor}
          onChange={setFActor}
          options={facet(events.map((e) => e.actor))}
        />
        <Select
          label="Category"
          value={fCategory}
          onChange={setFCategory}
          options={facet(events.map((e) => e.category))}
        />
        <Select
          label="Date"
          value={fDate}
          onChange={setFDate}
          options={facet(events.map((e) => e.date.slice(0, 7)))}
        />
      </FilterBar>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {filtered.map((e) => (
          <div
            key={e.id}
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
              <div style={{ fontSize: 13, color: T.textPrimary }}>
                {e.label}
              </div>
              <div style={{ fontSize: 11.5, color: T.textMuted }}>
                {e.actor} · {e.category} · {e.date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Retention (policy · expiration · holds · scheduled deletion) ──
function RetentionTab({ rec }: { rec: ArchiveRecord }) {
  return (
    <>
      <Section title="Retention" sample>
        <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 6 }}>
          Manages archival retention.
        </div>
        <StatRow label="Retention Policy" value={rec.retentionPolicy} sample />
        <StatRow
          label="Retention Expiration"
          value={rec.retentionExpiration}
          tone={rec.retentionExpiration === "Indefinite" ? "muted" : "ok"}
          sample
        />
        <StatRow
          label="Legal Hold"
          value={<YesNo on={rec.legalHold} tone="danger" />}
          tone={rec.legalHold ? "danger" : "ok"}
          sample
        />
        <StatRow
          label="Compliance Hold"
          value={<YesNo on={rec.complianceHold} />}
          tone={rec.complianceHold ? "warn" : "ok"}
          sample
        />
        <StatRow
          label="Scheduled Deletion"
          value={rec.scheduledDeletion ?? "Not scheduled"}
          tone={rec.scheduledDeletion ? "danger" : "muted"}
          sample
        />
      </Section>
      {(rec.legalHold || rec.complianceHold) && (
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
            marginBottom: 14,
          }}
        >
          <AlertTriangle size={15} /> An active hold suspends deletion until the
          hold is removed.
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <HeaderButton icon={<Timer size={13} />}>Extend Retention</HeaderButton>
        <HeaderButton icon={<Gavel size={13} />}>Remove Hold</HeaderButton>
        <HeaderButton icon={<Ban size={13} />}>Cancel Deletion</HeaderButton>
      </div>
    </>
  );
}

// ── Restoration (wizard + validation checks) ──
function RestorationTab({ rec }: { rec: ArchiveRecord }) {
  const n = hashId(rec.id);
  const steps = [
    { label: "Target Environment", detail: rec.environment },
    { label: "Restore Resources", detail: `${rec.cloudResources} resources` },
    { label: "Restore Integrations", detail: `${2 + (n % 6)} integrations` },
    { label: "Restore Policies", detail: `${rec.policies} policies` },
    { label: "Restore Members", detail: `${rec.members} members` },
    { label: "Validation", detail: "4 pre-flight checks" },
    { label: "Confirmation", detail: "Owner + approver sign-off" },
  ];
  const checks = [
    "Naming Conflicts",
    "Resource Availability",
    "Policy Compatibility",
    "Compliance Compatibility",
  ].map((label, i) => {
    const state =
      (n + i) % 6 === 0 ? "Failed" : (n + i) % 3 === 0 ? "Warning" : "Passed";
    return { label, state };
  });
  const blocked =
    rec.legalHold ||
    rec.complianceHold ||
    checks.some((c) => c.state === "Failed");
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
        Restoration wizard — restores an archived workspace to an active state.
        <SampleTag />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <div
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: 12.5,
                color: T.textNav,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
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
                {s.label}
              </span>
              <span style={{ color: T.textMuted, fontSize: 11.5 }}>
                {s.detail}
              </span>
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

      <Section title="Validation checks" sample>
        {checks.map((c) => (
          <StatRow
            key={c.label}
            label={c.label}
            value={c.state}
            tone={
              c.state === "Passed"
                ? "ok"
                : c.state === "Warning"
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
            marginBottom: 12,
          }}
        >
          <AlertTriangle size={15} /> Restoration is blocked by an active hold
          or a failed validation. Restoration may also require an approval
          workflow.
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <HeaderButton icon={<ClipboardCheck size={13} />}>
          Run Validation
        </HeaderButton>
        <HeaderButton
          variant="primary"
          icon={<RotateCcw size={13} />}
          disabled={blocked}
        >
          Restore Workspace
        </HeaderButton>
      </div>
    </>
  );
}

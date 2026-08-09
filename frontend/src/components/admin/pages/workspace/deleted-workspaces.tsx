/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspaces → Deleted Workspaces */
import React from "react";
import { useNavigate } from "react-router";
import {
  Download,
  RefreshCcw,
  FileSearch,
  ShieldAlert,
  ShieldOff,
  CalendarClock,
  Trash2,
  Ban,
  CheckCircle2,
  LayoutGrid,
  FileText,
  FileCheck2,
  Database,
  History,
  Activity as ActivityIcon,
  Timer,
  Flame,
  ShieldCheck,
  AlertTriangle,
  Archive,
  Fingerprint,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
  StatRow,
  KVGrid,
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
import { ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Deleted Workspaces — the terminal forensic record of workspaces that have completed the
 * organizational decommissioning process and been permanently removed from operational use.
 * Authoritative spec: docs/workspace/workspace_module/…/00_Workspaces/deleted_workspaces.md.
 *
 * Unlike Archived Workspaces, a Deleted Workspace holds no active resources, members, integrations
 * or operational configuration — only minimal metadata, immutable audit records and compliance-
 * required deletion evidence (deletion certificate, execution report, cleanup reports). The module
 * exists for transparency, forensic traceability and regulatory evidence of workspace destruction.
 * Deletion cannot be reversed and Restore is not supported; records persist through a retention
 * window and are ultimately destroyed by a dual-authorized, fully-audited Permanent Purge.
 *
 * This view reuses the Enterprise-Administration UX pattern shared with the Users module (Banner ·
 * Toolbar · Filters · Search · Data Table · Bulk/Row actions · Deleted Workspace Detail Drawer with
 * 8 sub-tabs). There is no live deletion-evidence store yet, so the record set is representative
 * sample data (tagged `Sample` in the UI). When admin/org_model.py + the deletion-evidence service
 * land, swap SAMPLE_DELETED for the live query — the component API stays identical.
 */

// ── Sub-navigation (spec §Navigation) ─────────────────────────────────────────────────────────────
const NAV_TABS = [
  { id: "recent", label: "Recently Deleted", Icon: Trash2 },
  { id: "pending", label: "Pending Permanent Purge", Icon: Timer },
  { id: "retention", label: "Compliance Retention", Icon: ShieldCheck },
  { id: "legal", label: "Legal Hold", Icon: ShieldAlert },
  { id: "evidence", label: "Deletion Evidence", Icon: FileCheck2 },
  { id: "purged", label: "Purged History", Icon: Flame },
];

// ── Domain vocab ──────────────────────────────────────────────────────────────────────────────────
type DeletionStatus = "Deleted" | "Purged";
type PurgeStatus =
  | "Retained"
  | "Scheduled"
  | "Pending Purge"
  | "Purged"
  | "Cancelled";
type RetentionStatus =
  | "Retained"
  | "Expiring"
  | "Expired"
  | "Legal Hold"
  | "Compliance Hold";
type EvidenceStatus = "Available" | "Generating" | "Unavailable";

const PURGE_TONE: Record<PurgeStatus, string> = {
  Retained: T.success,
  Scheduled: T.accent,
  "Pending Purge": T.warning,
  Purged: T.textMuted,
  Cancelled: T.textMuted,
};
const RETENTION_TONE: Record<RetentionStatus, string> = {
  Retained: T.success,
  Expiring: T.warning,
  Expired: T.danger,
  "Legal Hold": T.purple,
  "Compliance Hold": T.accent,
};
const EVIDENCE_TONE: Record<EvidenceStatus, string> = {
  Available: T.success,
  Generating: T.warning,
  Unavailable: T.danger,
};

const DELETION_REASONS = [
  "Business Decommission",
  "Project Completed",
  "Security Remediation",
  "Cost Optimization",
  "Regulatory Requirement",
  "Duplicate Consolidation",
  "Contract Termination",
];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const WS_TYPES = ["Enterprise", "Department", "Project", "Shared Service"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const DELETED_BY = [
  "Alice Smith",
  "David Chen",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
];
const APPROVERS = ["Aisha Khan", "Tomás Silva", "Helen Park", "Omar Haddad"];
const DELETION_METHODS = [
  "Standard Destruction",
  "Crypto-Erasure",
  "Secure Wipe (NIST 800-88)",
];
const DELETION_POLICIES = [
  "Enterprise Deletion Policy v3",
  "Regulated-Data Deletion Policy",
  "Standard Workspace Deletion Policy",
];
const PURGE_METHODS = [
  "Crypto-Shred (key destruction)",
  "Secure Overwrite (3-pass)",
  "Physical Media Destruction",
];
const RETENTION_POLICIES = [
  "7 Years — Financial Records",
  "3 Years — Standard",
  "10 Years — Regulated",
  "1 Year — Development",
];
const COMPLIANCE_PROFILES = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
];
const GOVERNANCE_PROFILES = ["Strict", "Balanced", "Relaxed"];
const RETENTION_WINDOWS = ["7 Years", "3 Years", "10 Years", "1 Year"];

interface DeletedRecord {
  id: string;
  workspace: string;
  workspaceId: string;
  businessUnit: string;
  workspaceType: string;
  environment: string;
  owner: string;
  deletedBy: string;
  approvedBy: string;
  deletedDate: string;
  createdDate: string;
  status: DeletionStatus;
  deletionReason: string;
  deletionTicket: string;
  deletionRequest: string;
  deletionMethod: string;
  deletionPolicy: string;
  changeTicket: string;
  retentionWindow: string;
  retentionPolicy: string;
  retentionStatus: RetentionStatus;
  retentionExpiration: string;
  legalHold: boolean;
  complianceHold: boolean;
  scheduledPurge: string;
  purgeStatus: PurgeStatus;
  purgeDate: string;
  purgeMethod: string;
  purgeExecutedBy: string;
  verificationStatus: string;
  purgeCertificate: string;
  deletionCertificate: string;
  evidence: EvidenceStatus;
  complianceProfile: string;
  governanceProfile: string;
  tags: string[];
  resourcesDestroyed: number;
  integrationsRemoved: number;
  membersRemoved: number;
  policiesRemoved: number;
  evidenceFiles: number;
  auditEvents: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative deleted-workspace set — covers every retention / purge / evidence
// state (Retained, Expiring, Expired, Legal Hold, Compliance Hold; Scheduled / Pending / Purged).
const SAMPLE_DELETED: DeletedRecord[] = Array.from({ length: 14 }, (_, i) => {
  const wsId = `WS-${(1042 + i * 13).toString().padStart(6, "0")}`;
  const n = hashId(wsId);
  const purgeStatus = pick<PurgeStatus>(
    [
      "Retained",
      "Retained",
      "Scheduled",
      "Pending Purge",
      "Purged",
      "Cancelled",
    ],
    n,
  );
  const status: DeletionStatus =
    purgeStatus === "Purged" ? "Purged" : "Deleted";
  const legalHold = n % 5 === 0;
  const complianceHold = n % 4 === 0;
  const retentionStatus: RetentionStatus = legalHold
    ? "Legal Hold"
    : complianceHold
      ? "Compliance Hold"
      : pick<RetentionStatus>(
          ["Retained", "Retained", "Expiring", "Expired"],
          n,
        );
  const evidence = pick<EvidenceStatus>(
    ["Available", "Available", "Available", "Generating", "Unavailable"],
    n,
  );
  const retentionWindow = pick(RETENTION_WINDOWS, n);
  return {
    id: wsId,
    workspace: `${pick(BUSINESS_UNITS, n)} ${pick(ENVIRONMENTS, n >> 2)} ${pick(["SOC", "Ledger", "Data Lake", "Portal", "Gateway"], n >> 3)}`,
    workspaceId: wsId,
    businessUnit: pick(BUSINESS_UNITS, n),
    workspaceType: pick(WS_TYPES, n >> 3),
    environment: pick(ENVIRONMENTS, n >> 2),
    owner: pick(DELETED_BY, n + 1),
    deletedBy: pick(DELETED_BY, n),
    approvedBy: pick(APPROVERS, n),
    deletedDate: `2026-0${1 + (n % 6)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    createdDate: `2023-0${1 + (n % 9)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    status,
    deletionReason: pick(DELETION_REASONS, n),
    deletionTicket: `DEL-${(3100 + n * 3).toString().slice(-5)}`,
    deletionRequest: `REQ-${(700 + (n % 300)).toString().padStart(6, "0")}`,
    deletionMethod: pick(DELETION_METHODS, n),
    deletionPolicy: pick(DELETION_POLICIES, n),
    changeTicket: `CHG-${(48000 + n * 7).toString().slice(-6)}`,
    retentionWindow,
    retentionPolicy: pick(RETENTION_POLICIES, n),
    retentionStatus,
    retentionExpiration: `20${30 + (n % 6)}-${(1 + (n % 12)).toString().padStart(2, "0")}-15`,
    legalHold,
    complianceHold,
    scheduledPurge:
      purgeStatus === "Scheduled" || purgeStatus === "Pending Purge"
        ? `20${28 + (n % 3)}-${(1 + (n % 12)).toString().padStart(2, "0")}-01`
        : "—",
    purgeStatus,
    purgeDate:
      purgeStatus === "Purged"
        ? `2026-0${1 + (n % 6)}-${(2 + (n % 26)).toString().padStart(2, "0")}`
        : "—",
    purgeMethod: pick(PURGE_METHODS, n),
    purgeExecutedBy: purgeStatus === "Purged" ? pick(APPROVERS, n + 2) : "—",
    verificationStatus:
      purgeStatus === "Purged"
        ? "Verified"
        : purgeStatus === "Pending Purge"
          ? "Pending Verification"
          : "Not Applicable",
    purgeCertificate:
      purgeStatus === "Purged" ? `PURGE-CERT-${wsId.slice(-4)}` : "—",
    deletionCertificate: `DEL-CERT-${wsId.slice(-4)}`,
    evidence,
    complianceProfile: pick(COMPLIANCE_PROFILES, n),
    governanceProfile: pick(GOVERNANCE_PROFILES, n),
    tags: [
      pick(["env:prod", "env:dev", "env:sandbox"], n),
      pick(["bu:payments", "bu:platform", "bu:security"], n >> 1),
      pick(["cost-centre:CC-201", "cost-centre:CC-914"], n >> 2),
    ],
    resourcesDestroyed: 12 + (n % 240),
    integrationsRemoved: n % 14,
    membersRemoved: 3 + (n % 60),
    policiesRemoved: 2 + (n % 22),
    evidenceFiles: evidence === "Unavailable" ? 0 : 4 + (n % 9),
    auditEvents: 18 + (n % 120),
  };
});

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: color }}
      />
      {label}
    </span>
  );
}
function PurgeBadge({ status }: { status: PurgeStatus }) {
  return <StatusDot color={PURGE_TONE[status]} label={status} />;
}
function RetentionBadge({ status }: { status: RetentionStatus }) {
  return <StatusDot color={RETENTION_TONE[status]} label={status} />;
}
function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  return <StatusDot color={EVIDENCE_TONE[status]} label={status} />;
}

/**
 * Embeddable body — sub-navigation + directory + deleted-workspace detail drawer, WITHOUT the outer
 * <Page> or the page banner. Rendered both as the standalone route and as a tab of the Workspace
 * Management console. Uses local state for the sub-nav so it never collides with a host page's `?tab=`.
 */
export function DeletedWorkspacesView() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("recent");

  const [search, setSearch] = React.useState("");
  const [fReason, setFReason] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fDeletedBy, setFDeletedBy] = React.useState("");
  const [fRetention, setFRetention] = React.useState("");
  const [fLegal, setFLegal] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [fPurge, setFPurge] = React.useState("");
  const [fDate, setFDate] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_DELETED;

  // Sub-nav constrains the base set (spec §Navigation).
  const inTab = (r: DeletedRecord): boolean => {
    switch (tab) {
      case "pending":
        return (
          r.purgeStatus === "Pending Purge" || r.purgeStatus === "Scheduled"
        );
      case "retention":
        return r.complianceHold || r.retentionStatus === "Compliance Hold";
      case "legal":
        return r.legalHold;
      case "evidence":
        return r.evidence === "Available";
      case "purged":
        return r.purgeStatus === "Purged";
      case "recent":
      default:
        return true;
    }
  };

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      inTab(r) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.workspaceId.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.deletedBy.toLowerCase().includes(q) ||
        r.deletionTicket.toLowerCase().includes(q)) &&
      (!fReason || r.deletionReason === fReason) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fType || r.workspaceType === fType) &&
      (!fDeletedBy || r.deletedBy === fDeletedBy) &&
      (!fRetention || r.retentionStatus === fRetention) &&
      (!fLegal || (fLegal === "Applied" ? r.legalHold : !r.legalHold)) &&
      (!fCompliance ||
        (fCompliance === "Applied" ? r.complianceHold : !r.complianceHold)) &&
      (!fPurge || r.purgeStatus === fPurge) &&
      (!fDate || r.deletedDate === fDate)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFReason("");
    setFBu("");
    setFType("");
    setFDeletedBy("");
    setFRetention("");
    setFLegal("");
    setFCompliance("");
    setFPurge("");
    setFDate("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];
  const holdFacet = [
    { value: "", label: "All" },
    { value: "Applied", label: "Applied" },
    { value: "None", label: "None" },
  ];

  // Operational-dashboard counters (spec §Operational Dashboard).
  const dash = {
    deleted: records.length,
    pendingPurge: records.filter(
      (r) => r.purgeStatus === "Pending Purge" || r.purgeStatus === "Scheduled",
    ).length,
    retentionHolds: records.filter((r) => r.legalHold).length,
    complianceHolds: records.filter((r) => r.complianceHold).length,
    deletionRequests: new Set(records.map((r) => r.deletionRequest)).size,
    evidenceAvailable: records.filter((r) => r.evidence === "Available").length,
  };

  // ── Toolbar — Administrative · Retention · Purge action groups (spec §Toolbar) ──
  const toolbar: CommandItem[] = [
    {
      key: "view-evidence",
      label: "View Evidence",
      icon: <FileSearch size={15} />,
      onClick: () => rows[0] && setSelId(rows[0].id),
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
      key: "apply-hold",
      label: "Apply Legal Hold",
      icon: <ShieldAlert size={15} />,
      disabled: true,
    },
    {
      key: "remove-hold",
      label: "Remove Legal Hold",
      icon: <ShieldOff size={15} />,
      disabled: true,
    },
    {
      key: "extend",
      label: "Extend Retention",
      icon: <CalendarClock size={15} />,
      disabled: true,
    },
    {
      key: "purge",
      label: "Execute Permanent Purge",
      icon: <Trash2 size={15} />,
      disabled: true,
    },
    {
      key: "cancel-purge",
      label: "Cancel Scheduled Purge",
      icon: <Ban size={15} />,
      disabled: true,
    },
    {
      key: "validate-purge",
      label: "Validate Purge",
      icon: <CheckCircle2 size={15} />,
      disabled: true,
    },
  ];

  // ── Table columns (spec §Table) ──
  const cols: Column<DeletedRecord>[] = [
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
          <span>
            {r.workspace}
            <span
              style={{
                display: "block",
                fontFamily: "monospace",
                fontSize: 11,
                color: T.textMuted,
              }}
            >
              {r.workspaceId}
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
      key: "deletedBy",
      header: "Deleted By",
      sortValue: (r) => r.deletedBy,
      render: (r) => r.deletedBy,
    },
    {
      key: "deletedDate",
      header: "Deleted Date",
      sortValue: (r) => r.deletedDate,
      render: (r) => r.deletedDate,
    },
    {
      key: "retention",
      header: "Retention",
      sortValue: (r) => r.retentionWindow,
      render: (r) => (
        <span style={{ display: "inline-flex", flexDirection: "column" }}>
          <span style={{ color: T.textNav }}>{r.retentionWindow}</span>
          <RetentionBadge status={r.retentionStatus} />
        </span>
      ),
    },
    {
      key: "purge",
      header: "Purge Status",
      sortValue: (r) => r.purgeStatus,
      render: (r) => <PurgeBadge status={r.purgeStatus} />,
    },
    {
      key: "evidence",
      header: "Evidence",
      sortValue: (r) => r.evidence,
      render: (r) => <EvidenceBadge status={r.evidence} />,
    },
  ];

  return (
    <>
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={tab}
          onChange={setTab}
          options={NAV_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {/* Operational dashboard counters (spec §Operational Dashboard) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <DashTile
          label="Deleted Workspaces"
          value={dash.deleted}
          tone="muted"
        />
        <DashTile label="Pending Purge" value={dash.pendingPurge} tone="warn" />
        <DashTile
          label="Retention Holds"
          value={dash.retentionHolds}
          tone="ok"
        />
        <DashTile
          label="Compliance Holds"
          value={dash.complianceHolds}
          tone="ok"
        />
        <DashTile
          label="Deletion Requests"
          value={dash.deletionRequests}
          tone="muted"
        />
        <DashTile
          label="Deletion Evidence Available"
          value={dash.evidenceAvailable}
          tone="ok"
        />
      </div>

      <DiscoveryListView
        title="Deleted workspace register"
        commands={toolbar}
        pills={[
          {
            key: "reason",
            label: "Deletion Reason",
            value: fReason,
            onChange: setFReason,
            options: facet(records.map((r) => r.deletionReason)),
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
            key: "deletedBy",
            label: "Deleted By",
            value: fDeletedBy,
            onChange: setFDeletedBy,
            options: facet(records.map((r) => r.deletedBy)),
          },
          {
            key: "retention",
            label: "Retention Status",
            value: fRetention,
            onChange: setFRetention,
            options: facet(records.map((r) => r.retentionStatus)),
          },
          {
            key: "legal",
            label: "Legal Hold",
            value: fLegal,
            onChange: setFLegal,
            options: holdFacet,
          },
          {
            key: "compliance",
            label: "Compliance Hold",
            value: fCompliance,
            onChange: setFCompliance,
            options: holdFacet,
          },
          {
            key: "purge",
            label: "Purge Status",
            value: fPurge,
            onChange: setFPurge,
            options: facet(records.map((r) => r.purgeStatus)),
          },
          {
            key: "date",
            label: "Deleted Date",
            value: fDate,
            onChange: setFDate,
            options: facet(records.map((r) => r.deletedDate)),
          },
        ]}
        presets={[{ label: "All deleted", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search deleted workspaces — name, ID, business unit, owner, deleted by, deletion ticket…"
        count={rows.length}
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "deletedDate", dir: "desc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Download size={13} />} onClick={clear}>
              Export ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<ShieldAlert size={13} />} onClick={clear}>
              Apply Hold
            </HeaderButton>
            <HeaderButton icon={<CalendarClock size={13} />} onClick={clear}>
              Extend Retention
            </HeaderButton>
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "View", onClick: () => setSelId(r.id) },
              { label: "View Evidence", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
              { label: "View Audit History", onClick: () => setSelId(r.id) },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Trash2 size={20} />}
            title="No deleted workspaces found."
            hint="Deleted workspaces originate from the archival lifecycle. Review archived workspaces to see candidates awaiting deletion."
            cta="View Archived Workspaces"
            onCta={() => navigate("/admin/workspaces?tab=archived")}
          />
        }
      />

      {sel && <DeletedDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function DeletedWorkspacesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Deleted Workspaces"
        subtitle="View permanently deleted workspaces, deletion evidence, retention status, and audit records."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              icon={<Archive size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=archived")}
            >
              View Archived Workspaces
            </HeaderButton>
          </>
        }
      />
      <DeletedWorkspacesView />
    </Page>
  );
}

// ── DashTile — a compact operational-dashboard counter ──
function DashTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "danger" | "muted";
}) {
  const dot =
    tone === "ok"
      ? T.success
      : tone === "warn"
        ? T.warning
        : tone === "danger"
          ? T.danger
          : T.textMuted;
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        background: T.cardBg,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: T.textMuted,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {label}
        <SampleTag />
      </span>
      <span
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: T.textPrimary,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{ width: 8, height: 8, borderRadius: "50%", background: dot }}
        />
        {value}
      </span>
    </div>
  );
}

// ════════════ Deleted Workspace Detail Drawer — 8 sub-tabs (spec §Deleted Workspace Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "summary", label: "Deletion Summary", icon: <FileText size={13} /> },
  {
    id: "evidence",
    label: "Deletion Evidence",
    icon: <FileCheck2 size={13} />,
  },
  {
    id: "metadata",
    label: "Historical Metadata",
    icon: <Database size={13} />,
  },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
  {
    id: "activity",
    label: "Activity Timeline",
    icon: <ActivityIcon size={13} />,
  },
  { id: "retention", label: "Retention", icon: <Timer size={13} /> },
  { id: "purge", label: "Purge Information", icon: <Flame size={13} /> },
];

function DeletedDetailDrawer({
  rec,
  onClose,
}: {
  rec: DeletedRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.workspace}`}
      subtitle={`${rec.workspaceId} · ${rec.status} · Deleted ${rec.deletedDate} · Retention: ${rec.retentionStatus}`}
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
          {/* Drawer header quick actions (spec §Drawer Header → Quick Actions) */}
          <HeaderButton icon={<FileSearch size={13} />}>
            View Evidence
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {/* Drawer header fields (spec §Drawer Header) */}
      <KVGrid
        cols={3}
        items={[
          { k: "Workspace Name", v: rec.workspace },
          { k: "Workspace ID", v: rec.workspaceId },
          { k: "Deletion Status", v: rec.status },
          { k: "Deleted Date", v: rec.deletedDate },
          { k: "Retention Status", v: rec.retentionStatus, sample: true },
        ]}
      />
      <div
        style={{
          fontSize: 11.5,
          color: T.textMuted,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 0 14px",
        }}
      >
        <ShieldOff size={13} /> Deletion cannot be reversed — restore is not
        supported.
      </div>

      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "summary" && <SummaryTab rec={rec} />}
      {tab === "evidence" && <EvidenceTab rec={rec} />}
      {tab === "metadata" && <MetadataTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
      {tab === "activity" && <ActivityTab />}
      {tab === "retention" && <RetentionTab rec={rec} />}
      {tab === "purge" && <PurgeTab rec={rec} />}
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
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: DeletedRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Workspace Name", v: rec.workspace },
              { k: "Workspace ID", v: rec.workspaceId },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Workspace Type", v: rec.workspaceType },
              { k: "Environment", v: rec.environment },
              { k: "Deleted Date", v: rec.deletedDate },
              { k: "Deleted By", v: rec.deletedBy },
              { k: "Status", v: rec.status },
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
                k: "Resources Destroyed",
                v: rec.resourcesDestroyed,
                sample: true,
              },
              {
                k: "Integrations Removed",
                v: rec.integrationsRemoved,
                sample: true,
              },
              { k: "Members Removed", v: rec.membersRemoved, sample: true },
              { k: "Policies Removed", v: rec.policiesRemoved, sample: true },
              { k: "Evidence Files", v: rec.evidenceFiles, sample: true },
              { k: "Audit Events", v: rec.auditEvents, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Deletion Summary — the administrative record of deletion (spec §Deletion Summary) ──
function SummaryTab({ rec }: { rec: DeletedRecord }) {
  return (
    <Section title="Deletion summary" sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, margin: "2px 0 8px" }}>
        Provides the administrative record of deletion.
      </div>
      <KVGrid
        items={[
          { k: "Deletion Reason", v: rec.deletionReason, sample: true },
          { k: "Deletion Request", v: rec.deletionRequest, sample: true },
          { k: "Approved By", v: rec.approvedBy, sample: true },
          { k: "Deleted By", v: rec.deletedBy },
          { k: "Deletion Method", v: rec.deletionMethod, sample: true },
          { k: "Deletion Policy", v: rec.deletionPolicy, sample: true },
          { k: "Change Ticket", v: rec.changeTicket, sample: true },
        ]}
      />
    </Section>
  );
}

// ── Deletion Evidence — proof that deletion occurred (spec §Deletion Evidence) ──
function EvidenceTab({ rec }: { rec: DeletedRecord }) {
  const sections = [
    {
      name: "Deletion Certificate",
      ref: rec.deletionCertificate,
      desc: "Signed attestation that the workspace was destroyed.",
    },
    {
      name: "Execution Report",
      ref: `EXEC-${rec.workspaceId.slice(-4)}`,
      desc: "Ordered record of every destruction step executed.",
    },
    {
      name: "Resource Cleanup Report",
      ref: `RES-${rec.workspaceId.slice(-4)}`,
      desc: `${rec.resourcesDestroyed} cloud resources torn down and verified.`,
    },
    {
      name: "Identity Cleanup",
      ref: `IDN-${rec.workspaceId.slice(-4)}`,
      desc: `${rec.membersRemoved} members and service identities revoked.`,
    },
    {
      name: "Storage Cleanup",
      ref: `STG-${rec.workspaceId.slice(-4)}`,
      desc: "Object / block storage crypto-erased; keys destroyed.",
    },
    {
      name: "Compliance Evidence",
      ref: `CMP-${rec.workspaceId.slice(-4)}`,
      desc: `Retention & regulatory evidence for ${rec.complianceProfile}.`,
    },
  ];
  return (
    <>
      {/* Deletion Evidence toolbar (spec §Deletion Evidence → Toolbar) */}
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
        <HeaderButton icon={<Download size={13} />}>Export Bundle</HeaderButton>
        <HeaderButton icon={<Fingerprint size={13} />}>
          Verify Integrity
        </HeaderButton>
        <SampleTag />
      </div>
      <Section
        title="Evidence maintained proving that deletion occurred"
        sample
      >
        {rec.evidence === "Unavailable" ? (
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
            <AlertTriangle size={15} /> Evidence bundle is not yet available for
            this record.
          </div>
        ) : (
          sections.map((s) => (
            <StatRow
              key={s.name}
              label={s.name}
              hint={s.desc}
              value={s.ref}
              tone={rec.evidence === "Available" ? "ok" : "warn"}
              sample
            />
          ))
        )}
      </Section>
    </>
  );
}

// ── Historical Metadata — minimal governance metadata (spec §Historical Metadata) ──
function MetadataTab({ rec }: { rec: DeletedRecord }) {
  return (
    <Section title="Historical metadata" sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, margin: "2px 0 8px" }}>
        Preserves minimal metadata required for governance. No operational
        configuration is retained.
      </div>
      <KVGrid
        items={[
          { k: "Workspace Name", v: rec.workspace },
          { k: "Business Unit", v: rec.businessUnit },
          { k: "Owner", v: rec.owner, sample: true },
          { k: "Created", v: rec.createdDate, sample: true },
          { k: "Deleted", v: rec.deletedDate },
          {
            k: "Compliance Profile",
            v: rec.complianceProfile,
            sample: true,
          },
          {
            k: "Governance Profile",
            v: rec.governanceProfile,
            sample: true,
          },
          { k: "Tags", v: rec.tags.join(", "), sample: true },
        ]}
      />
    </Section>
  );
}

// ── Audit History — immutable, read-only (spec §Audit History) ──
function AuditTab() {
  const events = [
    "Deletion Requested",
    "Deletion Approved",
    "Deletion Started",
    "Resources Destroyed",
    "Identity Removed",
    "Integrations Removed",
    "Evidence Generated",
    "Deletion Completed",
    "Retention Updated",
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
        <ShieldCheck size={14} /> Immutable · read-only log <SampleTag />
      </div>
      {events.map((e, i) => (
        <StatRow
          key={e}
          label={e}
          value={`${pick(APPROVERS.concat(DELETED_BY), i)} · 2026-0${1 + (i % 6)}-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

// ── Activity Timeline — spec §Activity Timeline (with Actor / Category / Date filters) ──
function ActivityTab() {
  const events = [
    "Workspace Archived",
    "Deletion Requested",
    "Approval Completed",
    "Resources Destroyed",
    "Evidence Generated",
    "Deletion Completed",
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
            ...DELETED_BY.map((v) => ({ value: v, label: v })),
          ]}
        />
        <Select
          label="Category"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Category: All" },
            { value: "deletion", label: "Deletion" },
            { value: "approval", label: "Approval" },
            { value: "evidence", label: "Evidence" },
            { value: "retention", label: "Retention" },
          ]}
        />
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Date: All" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
            { value: "90d", label: "Last 90 days" },
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
              background: i === events.length - 1 ? T.textMuted : T.accent,
              marginTop: 5,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>
              {pick(APPROVERS.concat(DELETED_BY), i)} ·{" "}
              {pick(
                [
                  "2 months",
                  "6 weeks",
                  "5 weeks",
                  "1 month",
                  "3 weeks",
                  "2 weeks",
                ],
                i,
              )}{" "}
              ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Retention — post-deletion retention requirements (spec §Retention) ──
function RetentionTab({ rec }: { rec: DeletedRecord }) {
  return (
    <>
      {/* Retention toolbar (spec §Retention → Toolbar) */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <HeaderButton icon={<CalendarClock size={13} />}>
          Extend Retention
        </HeaderButton>
        <HeaderButton icon={<ShieldAlert size={13} />}>Apply Hold</HeaderButton>
        <HeaderButton icon={<ShieldOff size={13} />} variant="danger">
          Remove Hold
        </HeaderButton>
      </div>
      <Section title="Post-deletion retention requirements" sample>
        <StatRow
          label="Retention Policy"
          value={rec.retentionPolicy}
          tone="ok"
          sample
        />
        <StatRow
          label="Legal Hold"
          value={rec.legalHold ? "Applied" : "None"}
          tone={rec.legalHold ? "warn" : "muted"}
          sample
        />
        <StatRow
          label="Compliance Hold"
          value={rec.complianceHold ? "Applied" : "None"}
          tone={rec.complianceHold ? "warn" : "muted"}
          sample
        />
        <StatRow
          label="Retention Expiration"
          value={rec.retentionExpiration}
          sample
        />
        <StatRow
          label="Scheduled Purge"
          value={rec.scheduledPurge}
          tone={rec.scheduledPurge === "—" ? "muted" : "warn"}
          sample
        />
      </Section>
    </>
  );
}

// ── Purge Information — permanent destruction (spec §Purge Information) ──
const PURGE_SUBS = [
  { id: "destruction", label: "Permanent Destruction" },
  { id: "lifecycle", label: "Destruction Lifecycle" },
];
function PurgeTab({ rec }: { rec: DeletedRecord }) {
  const stages = ["Deleted", "Retention", "Permanent Purge"];
  const activeIdx =
    rec.purgeStatus === "Purged"
      ? 2
      : rec.purgeStatus === "Pending Purge" || rec.purgeStatus === "Scheduled"
        ? 1
        : 0;
  const [sub, setSub] = React.useState("destruction");
  return (
    <>
      <Tabs tabs={PURGE_SUBS} active={sub} onChange={setSub} />
      {sub === "destruction" && (
        <Section title="Permanent destruction information" sample>
          <KVGrid
            items={[
              { k: "Purge Status", v: rec.purgeStatus, sample: true },
              { k: "Purge Date", v: rec.purgeDate, sample: true },
              { k: "Purge Method", v: rec.purgeMethod, sample: true },
              { k: "Executed By", v: rec.purgeExecutedBy, sample: true },
              {
                k: "Verification Status",
                v: rec.verificationStatus,
                sample: true,
              },
              { k: "Certificate", v: rec.purgeCertificate, sample: true },
            ]}
          />
        </Section>
      )}

      {/* Deleted → Retention → Permanent Purge visualization (spec §Purge Information → Visualization) */}
      {sub === "lifecycle" && (
        <Section title="Destruction lifecycle" sample>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stages.map((s, i) => {
              const done = i < activeIdx;
              const active = i === activeIdx;
              const tone = done ? T.success : active ? T.accent : T.textMuted;
              return (
                <React.Fragment key={s}>
                  <div
                    style={{
                      border: `1px solid ${active ? "transparent" : T.border}`,
                      background:
                        done || active
                          ? "var(--cg-accent-bg-strong)"
                          : "transparent",
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
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: tone,
                      }}
                    />
                    <span style={{ fontWeight: active ? 600 : 400 }}>{s}</span>
                    {done && (
                      <span style={{ color: T.success, fontSize: 11 }}>
                        · done
                      </span>
                    )}
                    {active && (
                      <span style={{ color: T.accent, fontSize: 11 }}>
                        · current
                      </span>
                    )}
                  </div>
                  {i < stages.length - 1 && (
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
              );
            })}
          </div>
        </Section>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: "var(--cg-accent-bg-strong)",
          color: T.textNav,
          fontSize: 12.5,
        }}
      >
        <ShieldCheck size={15} /> Permanent purge requires dual authorization
        and is fully audited.
      </div>
    </>
  );
}

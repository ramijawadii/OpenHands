/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Lifecycle → Archived (state view) */
import React from "react";
import { useNavigate } from "react-router";
import {
  Archive,
  ArchiveRestore,
  Trash2,
  Download,
  RefreshCcw,
  Clock,
  CalendarClock,
  Gavel,
  FileCheck2,
  ShieldCheck,
  FileText,
  ListChecks,
  Boxes,
  LayoutGrid,
  Activity as ActivityIcon,
  History,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Lock,
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
  ConfirmButton,
  PostureCard,
  PostureGrid,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";

/**
 * Lifecycle → Archived — the STATE view for workspaces that are no longer actively used but must be
 * retained for historical, compliance, legal, operational, or business purposes. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/04_Lifecycle/archived.md.
 *
 * Unlike Suspended, archived workspaces are not expected to return to daily operations (though they
 * may be restored if policy permits). Unlike Deleted, they remain fully preserved with metadata,
 * audit history, configuration, evidence, and operational history intact. Archiving provides
 * long-term retention while minimizing operational cost and administrative overhead.
 *
 * Reuses the Enterprise-Administration UX pattern shared with the Users module (Banner · Toolbar ·
 * Filters · Search · Datatable · Bulk/Row Actions · Workspace Detail Drawer with 7 sub-tabs). This
 * is the Lifecycle→Archived state page (lifecycle-archived.tsx) — distinct from archived-workspaces.
 *
 * There is no archive backend yet, so the record set is representative sample data (tagged `Sample`
 * in the UI). When the lifecycle/archive engine lands, swap SAMPLE_ARCHIVES for the live query — the
 * component API stays identical.
 */

// ── Archive Types (spec §Archive Types) ───────────────────────────────────────────────────────────
const ARCHIVE_TYPES = [
  "Business Archive",
  "Project Archive",
  "Compliance Archive",
  "Legal Archive",
  "Historical Archive",
  "Customer Archive",
  "Operational Archive",
  "Migration Archive",
];

// ── Retention Policies (spec §Retention Policies) ─────────────────────────────────────────────────
const RETENTION_POLICIES = [
  "1 Year",
  "3 Years",
  "5 Years",
  "7 Years",
  "10 Years",
  "Permanent",
  "Custom",
];

// Retention may be extended automatically by:
const RETENTION_EXTENDERS = [
  "Legal Hold",
  "Compliance Requirements",
  "Contractual Obligations",
  "Business Policies",
];

const BUSINESS_UNITS = [
  "IT Operations",
  "Payments",
  "Platform",
  "Security",
  "Retail",
  "Legal",
  "Customer Success",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const OWNERS = [
  "IT Operations",
  "John Smith",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
  "David Chen",
  "Aisha Khan",
];
const COMPLIANCE_PROGRAMS = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
  "GDPR",
];
const ARCHIVE_REASONS = [
  "Project completed and no longer active",
  "Business unit dissolved",
  "Regulatory retention obligation",
  "Legal discovery hold",
  "Customer account offboarded",
  "System decommissioned",
  "Migration completed",
];
const APPROVERS = ["David Chen", "Aisha Khan", "Tomás Silva", "Records Board"];

// ── Status model (drives part of the sub-navigation) ──────────────────────────────────────────────
type Status = "Archived" | "Pending Deletion" | "Restoring";

const STATUS_TONE: Record<Status, string> = {
  Archived: T.textNav,
  "Pending Deletion": T.danger,
  Restoring: T.accent,
};

// ── Second-level sub-navigation (spec §Navigation) — rendered as the first FilterBar facet ────────
const VIEWS = [
  { id: "all", label: "All Archives" },
  { id: "Business Archive", label: "Business Archive" },
  { id: "Compliance Archive", label: "Compliance Archive" },
  { id: "Legal Archive", label: "Legal Archive" },
  { id: "Historical Archive", label: "Historical Archive" },
  { id: "Project Archive", label: "Project Archive" },
  { id: "Customer Archive", label: "Customer Archive" },
  { id: "pending-deletion", label: "Pending Deletion" },
  { id: "restorable", label: "Restorable" },
];

interface ArchiveRecord {
  id: string;
  workspace: string;
  environment: string;
  businessUnit: string;
  owner: string;
  archiveType: string;
  archiveReason: string;
  businessJustification: string;
  approvedBy: string;
  archivePolicy: string;
  retentionSchedule: string;
  archivedDate: string;
  retentionPolicy: string;
  retentionStart: string;
  retentionEnd: string;
  retentionRemaining: string;
  legalHold: boolean;
  restorable: boolean;
  status: Status;
  complianceProgram: string;
  compliancePrograms: number;
  preservedResources: number;
  evidencePackages: number;
  auditRecords: number;
  storageGb: number;
  tags: string[];
  deletionEligibility: string;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative archive set (~14 records).
const SAMPLE_ARCHIVES: ArchiveRecord[] = Array.from({ length: 14 }, (_, i) => {
  const id = `WS-A${(1040 + i * 13).toString().padStart(5, "0")}`;
  const n = hashId(id);
  const archiveType = pick(ARCHIVE_TYPES, n);
  const status = pick<Status>(
    [
      "Archived",
      "Archived",
      "Archived",
      "Archived",
      "Pending Deletion",
      "Restoring",
    ],
    n,
  );
  const retentionPolicy = pick(RETENTION_POLICIES, n >> 1);
  const legalHold = n % 4 === 0;
  const restorable = status !== "Pending Deletion" && n % 3 !== 0;
  const startYear = 2019 + (n % 5);
  const years =
    retentionPolicy === "Permanent"
      ? 99
      : retentionPolicy === "Custom"
        ? 4
        : parseInt(retentionPolicy, 10) || 5;
  return {
    id,
    workspace: `${pick(
      [
        "Legacy CRM",
        "Q3 Migration",
        "Retail POS",
        "Payments Ledger",
        "HR Records",
        "Data Lake v1",
        "Support Portal",
        "Compliance Vault",
      ],
      n,
    )} ${pick(["Prod", "EU", "US", "APAC"], n >> 2)}`,
    environment: pick(ENVIRONMENTS, n >> 2),
    businessUnit: pick(BUSINESS_UNITS, n),
    owner: pick(OWNERS, n),
    archiveType,
    archiveReason: pick(ARCHIVE_REASONS, n),
    businessJustification: `Retained per ${pick(
      RETENTION_EXTENDERS,
      n,
    )} following ${pick(ARCHIVE_REASONS, n).toLowerCase()}.`,
    approvedBy: pick(APPROVERS, n),
    archivePolicy: `${archiveType} Policy v${1 + (n % 3)}.0`,
    retentionSchedule: `${retentionPolicy} from archival date`,
    archivedDate: `${startYear}-${(1 + (n % 12)).toString().padStart(2, "0")}-${(
      1 +
      (n % 27)
    )
      .toString()
      .padStart(2, "0")}`,
    retentionPolicy,
    retentionStart: `${startYear}-${(1 + (n % 12))
      .toString()
      .padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    retentionEnd:
      retentionPolicy === "Permanent"
        ? "No end (Permanent)"
        : `${startYear + years}-${(1 + (n % 12))
            .toString()
            .padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    retentionRemaining:
      retentionPolicy === "Permanent"
        ? "Permanent"
        : `${Math.max(0, startYear + years - 2026)} yr ${1 + (n % 11)} mo`,
    legalHold,
    restorable,
    status,
    complianceProgram: pick(COMPLIANCE_PROGRAMS, n),
    compliancePrograms: 1 + (n % 4),
    preservedResources: 42 + (n % 260),
    evidencePackages: 2 + (n % 9),
    auditRecords: 320 + (n % 4000),
    storageGb: 12 + (n % 480),
    tags: [pick(["env:prod", "env:eu", "env:us"], n), "archived", "retained"],
    deletionEligibility: legalHold
      ? "Blocked — active legal hold"
      : status === "Pending Deletion"
        ? "Eligible — retention expired"
        : "Not yet eligible",
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

function YesNo({ on, danger }: { on: boolean; danger?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: on ? (danger ? T.danger : T.warning) : T.textMuted,
      }}
    >
      {on && (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: danger ? T.danger : T.warning,
          }}
        />
      )}
      {on ? "Yes" : "No"}
    </span>
  );
}

/**
 * Embeddable body — sub-navigation + operational dashboard + archive directory + workspace detail
 * drawer + lifecycle/restoration flow references, WITHOUT the outer <Page> or the page banner. Uses
 * local state for the state sub-nav so it never collides with a host page's `?tab=`.
 */
export function LifecycleArchivedView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("all");

  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fPolicy, setFPolicy] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fDate, setFDate] = React.useState("");
  const [fHold, setFHold] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [fRestorable, setFRestorable] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_ARCHIVES;

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    const matchesView =
      view === "all"
        ? true
        : view === "pending-deletion"
          ? r.status === "Pending Deletion"
          : view === "restorable"
            ? r.restorable
            : r.archiveType === view;
    return (
      matchesView &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.archiveReason.toLowerCase().includes(q) ||
        r.tags.some((tg) => tg.toLowerCase().includes(q))) &&
      (!fType || r.archiveType === fType) &&
      (!fPolicy || r.retentionPolicy === fPolicy) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fOwner || r.owner === fOwner) &&
      (!fDate || r.archivedDate === fDate) &&
      (!fHold || (fHold === "Yes") === r.legalHold) &&
      (!fCompliance || r.complianceProgram === fCompliance) &&
      (!fRestorable || (fRestorable === "Yes") === r.restorable)
    );
  });

  const hasFilters = !!(
    search ||
    fType ||
    fPolicy ||
    fBu ||
    fOwner ||
    fDate ||
    fHold ||
    fCompliance ||
    fRestorable
  );
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFPolicy("");
    setFBu("");
    setFOwner("");
    setFDate("");
    setFHold("");
    setFCompliance("");
    setFRestorable("");
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

  // ── Operational Dashboard (spec §Operational Dashboard) ──
  const archivedCount = records.length;
  const pendingRestorations = records.filter(
    (r) => r.status === "Restoring",
  ).length;
  const retentionExpiring = records.filter((r) =>
    r.retentionRemaining.startsWith("0 "),
  ).length;
  const legalHolds = records.filter((r) => r.legalHold).length;
  const complianceArchives = records.filter(
    (r) => r.archiveType === "Compliance Archive",
  ).length;
  const restorableCount = records.filter((r) => r.restorable).length;
  const storageTb = (
    records.reduce((a, r) => a + r.storageGb, 0) / 1024
  ).toFixed(2);

  // ── Toolbar (spec §Toolbar — Administrative · Governance · Operations) ──
  const toolbar: CommandItem[] = [
    {
      key: "archive",
      label: "Archive Workspace",
      icon: <Archive size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=requests"),
    },
    {
      key: "restore",
      label: "Restore",
      icon: <ArchiveRestore size={15} />,
      disabled: true,
    },
    {
      key: "delete",
      label: "Move to Deletion",
      icon: <Trash2 size={15} />,
      disabled: true,
    },
    {
      key: "extend",
      label: "Extend Retention",
      icon: <CalendarClock size={15} />,
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
      onClick: () => {},
    },
    // Governance Actions
    {
      key: "review-retention",
      label: "Review Retention",
      icon: <Clock size={15} />,
      disabled: true,
    },
    {
      key: "generate-evidence",
      label: "Generate Evidence",
      icon: <FileCheck2 size={15} />,
      disabled: true,
    },
    {
      key: "validate-archive",
      label: "Validate Archive",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "legal-hold",
      label: "Legal Hold",
      icon: <Gavel size={15} />,
      disabled: true,
    },
    // Operations
    {
      key: "view-config",
      label: "View Configuration",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "view-timeline",
      label: "View Timeline",
      icon: <ActivityIcon size={15} />,
      disabled: true,
    },
    {
      key: "view-logs",
      label: "View Logs",
      icon: <History size={15} />,
      disabled: true,
    },
    {
      key: "download-metadata",
      label: "Download Metadata",
      icon: <Download size={15} />,
      disabled: true,
    },
  ];

  // ── Table (spec §Table) ──
  const cols: Column<ArchiveRecord>[] = [
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
          <Archive size={14} color={T.textMuted} />
          <span style={{ display: "inline-flex", flexDirection: "column" }}>
            <span>{r.workspace}</span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 11,
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
      key: "type",
      header: "Archive Type",
      sortValue: (r) => r.archiveType,
      render: (r) => r.archiveType,
    },
    {
      key: "archivedDate",
      header: "Archived Date",
      sortValue: (r) => r.archivedDate,
      render: (r) => r.archivedDate,
    },
    {
      key: "policy",
      header: "Retention Policy",
      sortValue: (r) => r.retentionPolicy,
      render: (r) => r.retentionPolicy,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "legalHold",
      header: "Legal Hold",
      sortValue: (r) => (r.legalHold ? 1 : 0),
      render: (r) => <YesNo on={r.legalHold} danger />,
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
          options={VIEWS.map((v) => ({ value: v.id, label: v.label }))}
        />
      </div>

      {/* Operational Dashboard */}
      <div style={{ marginBottom: 18 }}>
        <PostureGrid>
          <PostureCard
            title="Archived Workspaces"
            value={archivedCount}
            sub={<SampleTag />}
            tone="muted"
          />
          <PostureCard
            title="Pending Restorations"
            value={pendingRestorations}
            sub={<SampleTag />}
            tone={pendingRestorations ? "warn" : "muted"}
          />
          <PostureCard
            title="Retention Expiring"
            value={retentionExpiring}
            sub={<SampleTag />}
            tone={retentionExpiring ? "warn" : "muted"}
          />
          <PostureCard
            title="Legal Holds"
            value={legalHolds}
            sub={<SampleTag />}
            tone={legalHolds ? "danger" : "muted"}
          />
          <PostureCard
            title="Compliance Archives"
            value={complianceArchives}
            sub={<SampleTag />}
            tone="muted"
          />
          <PostureCard
            title="Restorable Workspaces"
            value={restorableCount}
            sub={<SampleTag />}
            tone="ok"
          />
          <PostureCard
            title="Storage Consumption"
            value={`${storageTb} TB`}
            sub={<SampleTag />}
            tone="muted"
          />
        </PostureGrid>
      </div>

      <Card
        title="Archived workspaces"
        desc="Manage archived workspaces retained for historical reference, regulatory compliance, legal obligations, disaster recovery, and future restoration. Workspaces are preserved but inaccessible: users cannot access them, agents cannot execute, automation and integrations are disabled."
      >
        <CommandBar items={toolbar} />

        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search archived workspaces — workspace, ID, business unit, owner, tags, archive reason…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select
            label="Archive Type"
            value={fType}
            onChange={setFType}
            options={facet(records.map((r) => r.archiveType))}
          />
          <Select
            label="Retention Policy"
            value={fPolicy}
            onChange={setFPolicy}
            options={facet(records.map((r) => r.retentionPolicy))}
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
            label="Archive Date"
            value={fDate}
            onChange={setFDate}
            options={facet(records.map((r) => r.archivedDate))}
          />
          <Select
            label="Legal Hold"
            value={fHold}
            onChange={setFHold}
            options={yesNo}
          />
          <Select
            label="Compliance Program"
            value={fCompliance}
            onChange={setFCompliance}
            options={facet(records.map((r) => r.complianceProgram))}
          />
          <Select
            label="Restorable"
            value={fRestorable}
            onChange={setFRestorable}
            options={yesNo}
          />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={14}
          initialSort={{ key: "archivedDate", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<ArchiveRestore size={13} />} onClick={clear}>
                Restore ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>
                Export
              </HeaderButton>
              <HeaderButton icon={<CalendarClock size={13} />} onClick={clear}>
                Extend Retention
              </HeaderButton>
              <HeaderButton icon={<Gavel size={13} />} onClick={clear}>
                Apply Legal Hold
              </HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View", onClick: () => setSelId(r.id) },
                { label: "Restore", onClick: () => setSelId(r.id) },
                { label: "Extend Retention", onClick: () => setSelId(r.id) },
                { label: "Export", onClick: () => {} },
                { label: "Legal Hold", onClick: () => setSelId(r.id) },
                {
                  label: "Move to Deletion",
                  onClick: () => setSelId(r.id),
                  danger: true,
                },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Archive size={20} />}
              title="No archived workspaces found."
              hint="Adjust filters, or view the active workspaces to archive one."
              cta="View Active Workspaces"
              onCta={() => navigate("/admin/workspaces")}
            />
          }
        />
      </Card>

      {/* Lifecycle & restoration reference flows + policy catalogs (spec §Lifecycle Flow, §Restoration
          Workflow, §Archive Types, §Retention Policies, §Archive Behavior, §Archive vs Suspension,
          §Operational Relationships, §Permissions) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18,
        }}
      >
        <Card
          title="Lifecycle flow"
          desc="How a workspace reaches — and leaves — the Archived state."
        >
          <LifecycleFlow />
        </Card>

        <Card
          title="Restoration workflow"
          desc="Stages an archived workspace passes through when restored."
        >
          <FlowChain
            steps={[
              "Archived",
              "Restore Request",
              "Validation",
              "Approval",
              "Provisioning",
              "Active",
            ]}
          />
        </Card>

        <Card title="Archive types" desc="Supported archive classifications.">
          <ChipList items={ARCHIVE_TYPES} />
        </Card>

        <Card
          title="Retention policies"
          desc="Supported retention schedules; retention may extend automatically."
        >
          <ChipList items={RETENTION_POLICIES} />
          <div
            style={{ fontSize: 11.5, color: T.textMuted, margin: "10px 0 6px" }}
          >
            Retention may be extended automatically by:
          </div>
          <ChipList items={RETENTION_EXTENDERS} muted />
        </Card>

        <Card
          title="Archive behavior"
          desc="What is preserved versus restricted while a workspace is archived."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              "Workspace configuration is preserved",
              "Audit history remains immutable",
              "Compliance evidence is retained",
              "Business metadata remains searchable",
              "Logs remain accessible per retention policies",
              "AI configuration is preserved",
              "Cloud inventory is retained as historical records",
              "Ownership and governance information remain available",
              "Export remains supported",
            ].map((t) => (
              <BehaviorRow key={t} label={t} ok />
            ))}
            {[
              "Users cannot access the workspace",
              "Agents cannot execute",
              "Automation is disabled",
              "Integrations are inactive",
              "Scheduled jobs do not run",
              "Resource modifications are prohibited",
            ].map((t) => (
              <BehaviorRow key={t} label={t} />
            ))}
          </div>
        </Card>

        <Card
          title="Archive vs Suspension"
          desc="How the Archived state differs from Suspended."
        >
          <CompareTable />
        </Card>

        <Card
          title="Operational relationships & permissions"
          desc="Systems archived workspaces integrate with, references, and required roles."
        >
          <div
            style={{
              fontSize: 11,
              color: T.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              marginBottom: 6,
            }}
          >
            Integrates with
          </div>
          <ChipList
            items={[
              "Compliance Center",
              "Commercial Center",
              "Support Center",
              "Logs Center",
              "Identity & Access",
              "Platform Security",
              "Automation Engine",
              "Backup & Recovery",
              "Business Continuity",
              "Records Management",
            ]}
            muted
          />
          <div
            style={{
              fontSize: 11,
              color: T.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              margin: "12px 0 6px",
            }}
          >
            Referenced by
          </div>
          <ChipList
            items={[
              "Audit Reports",
              "Compliance Reviews",
              "Legal Discovery",
              "Executive Reporting",
              "Historical Analytics",
            ]}
            muted
          />
          <div
            style={{
              fontSize: 11,
              color: T.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              margin: "12px 0 6px",
            }}
          >
            Requires one of
          </div>
          <ChipList
            items={[
              "Organization Administrator",
              "Platform Administrator",
              "Compliance Administrator",
              "Records Administrator",
            ]}
          />
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 10 }}>
            Restoration may require multi-stage approval.
          </div>
        </Card>
      </div>

      {sel && <ArchiveDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function LifecycleArchivedPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Archived Workspaces"
        subtitle="Manage archived workspaces retained for historical reference, regulatory compliance, legal obligations, disaster recovery, and future restoration."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Archive size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=requests")}
            >
              Archive Workspace
            </HeaderButton>
          </>
        }
      />
      <LifecycleArchivedView />
    </Page>
  );
}

// ════════════ Reusable flow / chip / behavior helpers ════════════

function FlowChain({ steps }: { steps: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
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

// Active → Archive Request → Approval → Archive → Retention → { Restore→Active | Delete→Deleted }
function LifecycleFlow() {
  const node = (label: string, tone?: string) => (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12.5,
        color: tone ?? T.textNav,
        textAlign: "center",
      }}
    >
      {label}
    </div>
  );
  const arrow = (
    <span style={{ color: T.textMuted, textAlign: "center", fontSize: 12 }}>
      ↓
    </span>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {node("Active")}
      {arrow}
      {node("Archive Request")}
      {arrow}
      {node("Approval")}
      {arrow}
      {node("Archive", T.accent)}
      {arrow}
      {node("Retention")}
      {arrow}
      <div style={{ display: "flex", gap: 12 }}>
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}
        >
          {node("Restore", T.success)}
          {arrow}
          {node("Active", T.success)}
        </div>
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}
        >
          {node("Delete", T.danger)}
          {arrow}
          {node("Deleted", T.danger)}
        </div>
      </div>
    </div>
  );
}

function ChipList({ items, muted }: { items: string[]; muted?: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((it) => (
        <span
          key={it}
          style={{
            fontSize: 11.5,
            padding: "3px 9px",
            borderRadius: 20,
            border: `1px solid ${T.border}`,
            color: muted ? T.textMuted : T.textNav,
            background: muted ? "transparent" : "var(--cg-accent-bg-strong)",
          }}
        >
          {it}
        </span>
      ))}
    </div>
  );
}

function BehaviorRow({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12.5,
        color: T.textNav,
      }}
    >
      {ok ? (
        <CheckCircle2 size={14} color={T.success} />
      ) : (
        <XCircle size={14} color={T.danger} />
      )}
      {label}
    </div>
  );
}

const COMPARE_ROWS = [
  ["Long-term retention", "Temporary operational pause"],
  ["Normally inactive permanently", "Expected to return to service"],
  ["Optimized for retention", "Optimized for recovery"],
  ["Supports historical reporting", "Supports operational recovery"],
  [
    "Focused on compliance and records",
    "Focused on incident and operational management",
  ],
];

function CompareTable() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: "8px 0",
          borderBottom: `1px solid ${T.border}`,
          fontSize: 11,
          fontWeight: 600,
          color: T.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        <span>Archived</span>
        <span>Suspended</span>
      </div>
      {COMPARE_ROWS.map(([a, b]) => (
        <div
          key={a}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "9px 0",
            borderBottom: `1px solid ${T.border}`,
            fontSize: 12.5,
            color: T.textNav,
          }}
        >
          <span>{a}</span>
          <span style={{ color: T.textMuted }}>{b}</span>
        </div>
      ))}
    </div>
  );
}

// ════════════ Workspace Detail Drawer — 7 sub-tabs (spec §Workspace Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "archive-info",
    label: "Archive Information",
    icon: <Archive size={13} />,
  },
  { id: "preserved", label: "Preserved Resources", icon: <Boxes size={13} /> },
  { id: "retention", label: "Retention", icon: <CalendarClock size={13} /> },
  { id: "restoration", label: "Restoration", icon: <RotateCcw size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function ArchiveDetailDrawer({
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
      // Drawer header (spec §Drawer Header): Workspace · Archive Type · Archived Date · Retention Status
      title={`${rec.workspace} · ${rec.id}`}
      subtitle={`${rec.archiveType} · Archived ${rec.archivedDate} · Retention: ${rec.retentionRemaining}${
        rec.legalHold ? " · Legal Hold" : ""
      }`}
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
          <ConfirmButton
            variant="ghost"
            label="Move to Deletion"
            title="Move workspace to deletion"
            body={`This moves ${rec.workspace} (${rec.id}) into the deletion pipeline. The archive and its preserved resources will be scheduled for permanent removal after final approval. This cannot be undone.`}
            confirmLabel="Move to Deletion"
            confirmWord="DELETE"
            onConfirm={onClose}
            disabled={rec.legalHold}
            disabledReason="Blocked by active legal hold"
          />
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton icon={<Gavel size={13} />}>Legal Hold</HeaderButton>
          <HeaderButton variant="primary" icon={<ArchiveRestore size={13} />}>
            Restore
          </HeaderButton>
        </div>
      }
    >
      {/* Drawer header quick actions (spec §Drawer Header — Quick Actions: Restore · Export · Legal Hold) */}
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
      >
        <HeaderButton icon={<ArchiveRestore size={13} />}>Restore</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <HeaderButton icon={<Gavel size={13} />}>Legal Hold</HeaderButton>
      </div>

      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "archive-info" && <ArchiveInfoTab rec={rec} />}
      {tab === "preserved" && <PreservedTab rec={rec} />}
      {tab === "retention" && <RetentionTab rec={rec} />}
      {tab === "restoration" && <RestorationTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab rec={rec} />}
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
function OverviewTab({ rec }: { rec: ArchiveRecord }) {
  return (
    <>
      <Section title="General">
        <KVGrid
          items={[
            { k: "Workspace Name", v: rec.workspace },
            { k: "Workspace ID", v: rec.id },
            { k: "Environment", v: rec.environment },
            { k: "Business Unit", v: rec.businessUnit },
            { k: "Owner", v: rec.owner, sample: true },
            { k: "Archive Type", v: rec.archiveType },
            { k: "Archive Reason", v: rec.archiveReason, sample: true },
            { k: "Archived Date", v: rec.archivedDate },
            { k: "Status", v: <StatusBadge status={rec.status} /> },
          ]}
        />
      </Section>

      <Section title="Statistics" sample>
        <KVGrid
          cols={3}
          items={[
            {
              k: "Retention Remaining",
              v: rec.retentionRemaining,
              sample: true,
            },
            {
              k: "Preserved Resources",
              v: rec.preservedResources,
              sample: true,
            },
            {
              k: "Compliance Programs",
              v: rec.compliancePrograms,
              sample: true,
            },
            { k: "Evidence Packages", v: rec.evidencePackages, sample: true },
            {
              k: "Audit Records",
              v: rec.auditRecords.toLocaleString(),
              sample: true,
            },
          ]}
        />
      </Section>
    </>
  );
}

// ── Archive Information (spec §Archive Information) ──
function ArchiveInfoTab({ rec }: { rec: ArchiveRecord }) {
  return (
    <Section title="Documents why and how the workspace was archived" sample>
      <StatRow label="Archive Type" value={rec.archiveType} />
      <StatRow label="Reason" value={rec.archiveReason} sample />
      <StatRow
        label="Business Justification"
        value={rec.businessJustification}
        sample
      />
      <StatRow label="Approved By" value={rec.approvedBy} sample />
      <StatRow label="Archive Policy" value={rec.archivePolicy} sample />
      <StatRow
        label="Retention Schedule"
        value={rec.retentionSchedule}
        sample
      />
      <StatRow
        label="Legal Hold"
        value={rec.legalHold ? "Active" : "None"}
        tone={rec.legalHold ? "danger" : "ok"}
        sample
      />
    </Section>
  );
}

// ── Preserved Resources (spec §Preserved Resources) ──
const PRESERVED_CATEGORIES = [
  "Workspace Metadata",
  "Configuration",
  "Policies",
  "Users",
  "Roles",
  "Groups",
  "Cloud Inventory",
  "Integrations",
  "Knowledge Sources",
  "AI Configuration",
  "Compliance Evidence",
  "Logs",
  "Audit History",
  "Automation",
  "Reports",
];

function PreservedTab({ rec }: { rec: ArchiveRecord }) {
  const n = hashId(rec.id);
  const resources = PRESERVED_CATEGORIES.map((category, i) => {
    const protectedFlag = (n + i) % 3 === 0 || rec.legalHold;
    return {
      id: `${rec.id}-res-${i}`,
      resource: `${category} snapshot`,
      category,
      retentionStatus:
        (n + i) % 5 === 0
          ? "Expiring"
          : (n + i) % 7 === 0
            ? "Under Legal Hold"
            : "Retained",
      protected: protectedFlag,
    };
  });
  const cols: Column<(typeof resources)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "category", header: "Category", render: (r) => r.category },
    {
      key: "retention",
      header: "Retention Status",
      render: (r) => (
        <span
          style={{
            color:
              r.retentionStatus === "Retained"
                ? T.success
                : r.retentionStatus === "Expiring"
                  ? T.warning
                  : T.accent,
          }}
        >
          {r.retentionStatus}
        </span>
      ),
    },
    {
      key: "protected",
      header: "Protected",
      render: (r) =>
        r.protected ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: T.textNav,
            }}
          >
            <Lock size={13} /> Yes
          </span>
        ) : (
          <span style={{ color: T.textMuted }}>No</span>
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
        Everything retained in the archive <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={resources} pageSize={15} />
    </>
  );
}

// ── Retention (spec §Retention) ──
function RetentionTab({ rec }: { rec: ArchiveRecord }) {
  return (
    <>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
      >
        <HeaderButton icon={<CalendarClock size={13} />}>
          Extend Retention
        </HeaderButton>
        <HeaderButton icon={<Gavel size={13} />}>Apply Legal Hold</HeaderButton>
        <HeaderButton icon={<ListChecks size={13} />}>
          Review Policy
        </HeaderButton>
      </div>
      <Section title="Archive retention policy" sample>
        <StatRow label="Retention Policy" value={rec.retentionPolicy} sample />
        <StatRow label="Retention Start" value={rec.retentionStart} sample />
        <StatRow label="Retention End" value={rec.retentionEnd} sample />
        <StatRow
          label="Legal Hold"
          value={rec.legalHold ? "Active" : "None"}
          tone={rec.legalHold ? "danger" : "ok"}
          sample
        />
        <StatRow
          label="Compliance Requirements"
          value={rec.complianceProgram}
          sample
        />
        <StatRow
          label="Deletion Eligibility"
          value={rec.deletionEligibility}
          tone={
            rec.deletionEligibility.startsWith("Eligible")
              ? "warn"
              : rec.deletionEligibility.startsWith("Blocked")
                ? "danger"
                : "ok"
          }
          sample
        />
      </Section>
    </>
  );
}

// ── Restoration (spec §Restoration + §Restoration Workflow) ──
const RESTORE_VALIDATION = [
  "Configuration Compatibility",
  "Policy Compatibility",
  "Cloud Availability",
  "Identity Validation",
  "Integration Validation",
  "AI Runtime Validation",
];
const RESTORE_OPTIONS = [
  "Restore In Place",
  "Restore as New Workspace",
  "Restore from Snapshot",
];

function RestorationTab({ rec }: { rec: ArchiveRecord }) {
  const n = hashId(rec.id);
  return (
    <>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
      >
        <HeaderButton variant="primary" icon={<ArchiveRestore size={13} />}>
          Restore Workspace
        </HeaderButton>
        <HeaderButton icon={<RotateCcw size={13} />}>
          Preview Restore
        </HeaderButton>
        <HeaderButton icon={<ShieldCheck size={13} />}>
          Run Validation
        </HeaderButton>
      </div>

      <Section title="Validation checks" sample>
        {RESTORE_VALIDATION.map((label, i) => {
          const state =
            (n + i) % 6 === 0
              ? "Failed"
              : (n + i) % 4 === 0
                ? "Warning"
                : "Passed";
          return (
            <StatRow
              key={label}
              label={label}
              value={state}
              tone={
                state === "Passed"
                  ? "ok"
                  : state === "Warning"
                    ? "warn"
                    : "danger"
              }
              sample
            />
          );
        })}
      </Section>

      <Section title="Restoration options" sample>
        {RESTORE_OPTIONS.map((o) => (
          <StatRow key={o} label={o} value="Available" tone="ok" sample />
        ))}
      </Section>

      <Section title="Restoration workflow">
        <FlowChain
          steps={[
            "Archived",
            "Restore Request",
            "Validation",
            "Approval",
            "Provisioning",
            "Active",
          ]}
        />
      </Section>
    </>
  );
}

// ── Activity timeline (spec §Activity) ──
const ACTIVITY_EVENTS = [
  "Workspace Archived",
  "Retention Updated",
  "Legal Hold Applied",
  "Evidence Exported",
  "Restoration Requested",
  "Workspace Restored",
];

function ActivityTab({ rec }: { rec: ArchiveRecord }) {
  const [fActor, setFActor] = React.useState("");
  const [fAction, setFAction] = React.useState("");
  const [fDate, setFDate] = React.useState("");
  const n = hashId(rec.id);
  const events = ACTIVITY_EVENTS.map((action, i) => ({
    action,
    actor: pick(APPROVERS, n + i),
    date: `2026-0${1 + (i % 6)}-${(10 + i).toString().padStart(2, "0")}`,
  }));
  const filtered = events.filter(
    (e) =>
      (!fActor || e.actor === fActor) &&
      (!fAction || e.action === fAction) &&
      (!fDate || e.date === fDate),
  );
  const facetOf = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals)).map((v) => ({ value: v, label: v })),
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
          value={fActor}
          onChange={setFActor}
          options={facetOf(events.map((e) => e.actor))}
        />
        <Select
          label="Action"
          value={fAction}
          onChange={setFAction}
          options={facetOf(events.map((e) => e.action))}
        />
        <Select
          label="Date"
          value={fDate}
          onChange={setFDate}
          options={facetOf(events.map((e) => e.date))}
        />
        <SampleTag />
      </div>
      {filtered.map((e) => (
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

// ── Audit History (immutable, read-only — spec §Audit History) ──
const AUDIT_EVENTS = [
  "Workspace Archived",
  "Retention Updated",
  "Legal Hold Applied",
  "Archive Exported",
  "Restoration Requested",
  "Workspace Restored",
  "Deletion Approved",
];

function AuditTab({ rec }: { rec: ArchiveRecord }) {
  const n = hashId(rec.id);
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
      {AUDIT_EVENTS.map((e, i) => (
        <StatRow
          key={e}
          label={e}
          value={`${pick(APPROVERS, n + i)} · 2026-0${1 + (i % 7)}-${(10 + i)
            .toString()
            .padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

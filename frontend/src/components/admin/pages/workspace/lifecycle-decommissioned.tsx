/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Lifecycle → Decommissioned */
import React from "react";
import { useNavigate } from "react-router";
import {
  Download,
  FileText,
  RefreshCcw,
  ShieldCheck,
  ClipboardCheck,
  History,
  Activity as ActivityIcon,
  LayoutGrid,
  Trash2,
  Boxes,
  Server,
  ScrollText,
  Scale,
  Package,
  ListChecks,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Archive,
  Gavel,
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
 * Decommissioned Workspaces — the FINAL operational lifecycle stage of a workspace. Authoritative
 * spec: docs/workspace/workspace_module/…/Workspace Administration/04_Lifecycle/decommissioned.md.
 *
 * A decommissioned workspace has been permanently retired from service following an approved
 * decommissioning process: all operations have ceased, cloud resources removed or transferred,
 * integrations disconnected, AI runtimes terminated, identity revoked. Unlike Archived, it is NOT
 * intended to be restored — it exists solely as a historical governance record until its retention
 * period expires. Deletion is not available from this module (physical deletion follows enterprise
 * retention policies). Reuses the Enterprise-Administration UX pattern shared with the Users module
 * (Banner · Toolbar · Filters · Search · Data Table · Bulk/Row actions · Workspace Detail Drawer with
 * 7 sub-tabs), plus the Decommission Checklist and Operational Dashboard.
 *
 * There is no decommission backend yet, so the record set is representative sample data (tagged
 * `Sample` in the UI). When admin/org_model.py + the retirement engine land, swap SAMPLE_RECORDS for
 * the live query — the component API stays identical.
 */

// ── Status model (drives the row badge, the Status filter, and part of the View sub-nav) ───────────
type Status =
  | "Pending Finalization"
  | "Decommissioned"
  | "Legal Hold"
  | "Compliance Retention";

const STATUS_TONE: Record<Status, string> = {
  "Pending Finalization": T.warning,
  Decommissioned: T.success,
  "Legal Hold": T.danger,
  "Compliance Retention": T.accent,
};

// ── View sub-navigation (spec §Navigation) — a FilterBar Select, NOT a pill strip ─────────────────
const VIEW_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending Finalization" },
  { id: "completed", label: "Completed" },
  { id: "legalhold", label: "Legal Hold" },
  { id: "compliance", label: "Compliance Retention" },
  { id: "disposal", label: "Resource Disposal" },
  { id: "evidence", label: "Evidence Packages" },
  { id: "reports", label: "Decommission Reports" },
  { id: "historical", label: "Historical Records" },
];

const BUSINESS_UNITS = [
  "Finance",
  "Payments",
  "Platform",
  "Security",
  "Data",
  "Retail",
  "Legal",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const OWNERS = [
  "John Smith",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
  "David Chen",
  "Aisha Khan",
];
const CLOUD_PROVIDERS = ["AWS", "Azure", "GCP", "Multi-Cloud"];
const RETENTIONS = ["1 Year", "3 Years", "5 Years", "7 Years", "10 Years"];
const RETENTION_POLICIES = [
  "Standard (3y)",
  "Financial (7y)",
  "Regulatory (10y)",
  "GDPR (5y)",
  "Legal Hold (indefinite)",
];
const EVIDENCE_STATES = ["Complete", "Generating", "Pending"];
const NAME_SUFFIX = ["Legacy", "Sunset", "Retired", "V1 Stack", "Legacy Core"];
const APPROVERS = ["David Chen", "Aisha Khan", "Tomás Silva", "Sara Ahmed"];
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

const EVIDENCE_TONE: Record<string, "ok" | "warn" | "muted"> = {
  Complete: "ok",
  Generating: "warn",
  Pending: "muted",
};

interface DecomRecord {
  id: string; // Workspace ID
  decommissionId: string;
  workspace: string;
  businessUnit: string;
  environment: string;
  owner: string; // Business Owner
  cloudProvider: string;
  decommissionDate: string;
  decommissionSort: number;
  retention: string;
  retentionPolicy: string;
  retentionRemaining: string;
  legalHold: boolean;
  evidence: string;
  evidenceGenerated: boolean;
  cleanupVerified: boolean;
  status: Status;
  tags: string;
  resourcesRemoved: number;
  resourcesTransferred: number;
  evidencePackages: number;
  auditRecords: number;
  replacementWorkspace: string;
  decommissionOwner: string;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative record set.
const SAMPLE_RECORDS: DecomRecord[] = Array.from({ length: 15 }, (_, i) => {
  const id = `WS-${(74010 + i * 13).toString().padStart(6, "0")}`;
  const n = hashId(id);
  const status = pick<Status>(
    [
      "Decommissioned",
      "Decommissioned",
      "Pending Finalization",
      "Compliance Retention",
      "Legal Hold",
      "Decommissioned",
    ],
    n,
  );
  const bu = pick(BUSINESS_UNITS, n);
  const evidence =
    status === "Pending Finalization" ? pick(EVIDENCE_STATES, n) : "Complete";
  const m = n % 12;
  const d = 1 + (n % 27);
  const retention = pick(RETENTIONS, n >> 1);
  return {
    id,
    decommissionId: `DEC-${(3100 + i * 7).toString().padStart(5, "0")}`,
    workspace: `${bu} ${pick(NAME_SUFFIX, n >> 2)}`,
    businessUnit: bu,
    environment: pick(ENVIRONMENTS, n >> 2),
    owner: pick(OWNERS, n),
    cloudProvider: pick(CLOUD_PROVIDERS, n >> 3),
    decommissionDate: `${MONTHS[m]} ${d}, 2026`,
    decommissionSort: m * 100 + d,
    retention,
    retentionPolicy: pick(RETENTION_POLICIES, n),
    retentionRemaining: `${1 + (n % 9)}y ${1 + (n % 11)}m`,
    legalHold: status === "Legal Hold" || n % 5 === 0,
    evidence,
    evidenceGenerated: evidence === "Complete",
    cleanupVerified: status === "Decommissioned",
    status,
    tags: `env:${pick(ENVIRONMENTS, n >> 2).toLowerCase()}, bu:${bu.toLowerCase()}, cost-centre`,
    resourcesRemoved: 18 + (n % 120),
    resourcesTransferred: 2 + (n % 14),
    evidencePackages: 3 + (n % 6),
    auditRecords: 40 + (n % 260),
    replacementWorkspace:
      n % 3 === 0 ? "—" : `${pick(BUSINESS_UNITS, n + 1)} Platform`,
    decommissionOwner: pick(OWNERS, n + 2),
  };
});

// ── View sub-nav predicates ───────────────────────────────────────────────────────────────────────
const VIEW_PREDICATE: Record<string, (r: DecomRecord) => boolean> = {
  all: () => true,
  pending: (r) => r.status === "Pending Finalization",
  completed: (r) => r.status === "Decommissioned",
  legalhold: (r) => r.legalHold,
  compliance: (r) => r.status === "Compliance Retention",
  disposal: (r) => !r.cleanupVerified,
  evidence: (r) => r.evidenceGenerated,
  reports: () => true,
  historical: () => true,
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

/**
 * Embeddable body — Operational Dashboard + View sub-nav + directory + Decommission Checklist +
 * lifecycle/teardown flow-chains + workspace detail drawer, WITHOUT the outer <Page> or the page
 * banner. Rendered both as the standalone route and as a tab of the Workspace Management console.
 * Uses local state for the View sub-nav so it never collides with a host page's `?tab=`.
 */
export function LifecycleDecommissionedView() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("all");

  const [search, setSearch] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fDate, setFDate] = React.useState("");
  const [fRetention, setFRetention] = React.useState("");
  const [fLegalHold, setFLegalHold] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_RECORDS;
  const inView = VIEW_PREDICATE[tab] ?? (() => true);

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      inView(r) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.decommissionId.toLowerCase().includes(q) ||
        r.tags.toLowerCase().includes(q)) &&
      (!fStatus || r.status === fStatus) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fEnv || r.environment === fEnv) &&
      (!fOwner || r.owner === fOwner) &&
      (!fDate || r.decommissionDate.startsWith(fDate)) &&
      (!fRetention || r.retentionPolicy === fRetention) &&
      (!fLegalHold || (fLegalHold === "Yes" ? r.legalHold : !r.legalHold)) &&
      (!fProvider || r.cloudProvider === fProvider)
    );
  });
  const hasFilters = !!(
    search ||
    fStatus ||
    fBu ||
    fEnv ||
    fOwner ||
    fDate ||
    fRetention ||
    fLegalHold ||
    fProvider
  );
  const clearFilters = () => {
    setSearch("");
    setFStatus("");
    setFBu("");
    setFEnv("");
    setFOwner("");
    setFDate("");
    setFRetention("");
    setFLegalHold("");
    setFProvider("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Operational Dashboard (spec §Operational Dashboard).
  const totalDecommissioned = records.length;
  const pendingFinalization = records.filter(
    (r) => r.status === "Pending Finalization",
  ).length;
  const pendingCleanup = records.filter((r) => !r.cleanupVerified).length;
  const evidenceGenerated = records.filter((r) => r.evidenceGenerated).length;
  const resourcesRemoved = records.reduce((a, r) => a + r.resourcesRemoved, 0);
  const retentionExpiring = records.filter((r) =>
    r.retentionRemaining.startsWith("1y"),
  ).length;
  const legalHolds = records.filter((r) => r.legalHold).length;

  // Toolbar (spec §Toolbar — Administrative · Governance · Operations).
  const toolbar: CommandItem[] = [
    {
      key: "finalize",
      label: "Finalize Decommission",
      icon: <CheckCircle2 size={15} />,
      onClick: () => selId && setSelId(selId),
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
    { key: "export", label: "Export", icon: <Download size={15} /> },
    { key: "refresh", label: "Refresh", icon: <RefreshCcw size={15} /> },
    {
      key: "verify-cleanup",
      label: "Verify Resource Cleanup",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "verify-compliance",
      label: "Verify Compliance",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "gen-evidence",
      label: "Generate Evidence",
      icon: <Package size={15} />,
      disabled: true,
    },
    {
      key: "validate-retention",
      label: "Validate Retention",
      icon: <Scale size={15} />,
      disabled: true,
    },
    {
      key: "timeline",
      label: "View Timeline",
      icon: <Clock size={15} />,
      disabled: true,
    },
    {
      key: "logs",
      label: "View Logs",
      icon: <ScrollText size={15} />,
      disabled: true,
    },
    {
      key: "disposal-report",
      label: "View Disposal Report",
      icon: <Trash2 size={15} />,
      disabled: true,
    },
    {
      key: "download-evidence",
      label: "Download Evidence Package",
      icon: <Download size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<DecomRecord>[] = [
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
          {r.workspace}
          {r.legalHold && <Gavel size={12} color={T.danger} />}
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
      key: "date",
      header: "Decommission Date",
      sortValue: (r) => r.decommissionSort,
      render: (r) => r.decommissionDate,
    },
    {
      key: "retention",
      header: "Retention",
      sortValue: (r) => r.retention,
      render: (r) => r.retention,
    },
    {
      key: "evidence",
      header: "Evidence",
      sortValue: (r) => r.evidence,
      render: (r) => (
        <InlineValue value={r.evidence} tone={EVIDENCE_TONE[r.evidence]} />
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
      <PostureGrid>
        <PostureCard
          title="Total Decommissioned"
          value={totalDecommissioned}
          sub={<SampleTag />}
        />
        <PostureCard
          title="Pending Finalization"
          value={pendingFinalization}
          tone={pendingFinalization ? "warn" : "muted"}
          sub={<SampleTag />}
        />
        <PostureCard
          title="Pending Cleanup"
          value={pendingCleanup}
          tone={pendingCleanup ? "warn" : "ok"}
          sub={<SampleTag />}
        />
        <PostureCard
          title="Evidence Generated"
          value={evidenceGenerated}
          tone="ok"
          sub={<SampleTag />}
        />
        <PostureCard
          title="Resources Removed"
          value={resourcesRemoved.toLocaleString()}
          sub={<SampleTag />}
        />
        <PostureCard
          title="Retention Expiring"
          value={retentionExpiring}
          tone={retentionExpiring ? "warn" : "muted"}
          sub={<SampleTag />}
        />
        <PostureCard
          title="Legal Holds"
          value={legalHolds}
          tone={legalHolds ? "danger" : "muted"}
          sub={<SampleTag />}
        />
      </PostureGrid>

      <div style={{ height: 18 }} />

      <Card
        title="Decommissioned workspaces"
        desc="Review permanently retired workspaces, verify resource disposal, preserve compliance evidence, and maintain historical operational records. Decommissioned workspaces are not recoverable."
      >
        <CommandBar items={toolbar} />

        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search decommissioned workspaces — workspace, ID, business unit, owner, decommission ID, tags…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select
            label="View"
            value={tab}
            onChange={setTab}
            options={VIEW_TABS.map((t) => ({ value: t.id, label: t.label }))}
          />
          <Select
            label="Status"
            value={fStatus}
            onChange={setFStatus}
            options={facet(records.map((r) => r.status))}
          />
          <Select
            label="Business Unit"
            value={fBu}
            onChange={setFBu}
            options={facet(records.map((r) => r.businessUnit))}
          />
          <Select
            label="Environment"
            value={fEnv}
            onChange={setFEnv}
            options={facet(records.map((r) => r.environment))}
          />
          <Select
            label="Owner"
            value={fOwner}
            onChange={setFOwner}
            options={facet(records.map((r) => r.owner))}
          />
          <Select
            label="Decommission Date"
            value={fDate}
            onChange={setFDate}
            options={facet(
              records.map((r) => r.decommissionDate.split(" ")[0]),
            )}
          />
          <Select
            label="Retention Policy"
            value={fRetention}
            onChange={setFRetention}
            options={facet(records.map((r) => r.retentionPolicy))}
          />
          <Select
            label="Legal Hold"
            value={fLegalHold}
            onChange={setFLegalHold}
            options={[
              { value: "", label: "All" },
              { value: "Yes", label: "Yes" },
              { value: "No", label: "No" },
            ]}
          />
          <Select
            label="Cloud Provider"
            value={fProvider}
            onChange={setFProvider}
            options={facet(records.map((r) => r.cloudProvider))}
          />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={15}
          initialSort={{ key: "date", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>
                Export ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<FileText size={13} />} onClick={clear}>
                Generate Reports
              </HeaderButton>
              <HeaderButton icon={<Package size={13} />} onClick={clear}>
                Download Evidence
              </HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View", onClick: () => setSelId(r.id) },
                { label: "Export", onClick: () => setSelId(r.id) },
                { label: "Generate Report", onClick: () => setSelId(r.id) },
                { label: "Download Evidence", onClick: () => setSelId(r.id) },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Archive size={20} />}
              title="No decommissioned workspaces found."
              hint="Adjust the View, filters or search. Workspaces appear here only after an approved decommissioning process completes."
              cta="Clear filters"
              onCta={clearFilters}
            />
          }
        />
      </Card>

      <DecommissionChecklistCard />
      <LifecycleFlowCard />
      <EnterpriseModelCard />
      <DecommissionBehaviorCard />
      <LifecycleComparisonCard />

      {sel && (
        <DecomDetailDrawer
          rec={sel}
          onClose={() => setSelId(null)}
          navigate={navigate}
        />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function LifecycleDecommissionedPage() {
  return (
    <Page>
      <PageHeader
        title="Decommissioned Workspaces"
        subtitle="Review permanently retired workspaces, verify resource disposal, preserve compliance evidence, and maintain historical operational records."
        actions={<ScopeBadge scope="Organization" />}
      />
      <LifecycleDecommissionedView />
    </Page>
  );
}

// InlineValue — a compact tone-dotted value used inside a table cell.
type InlineTone = "ok" | "warn" | "danger" | "muted";
function InlineValue({
  value,
  tone,
}: {
  value: React.ReactNode;
  tone?: InlineTone;
}) {
  const dot =
    tone === "ok"
      ? T.success
      : tone === "warn"
        ? T.warning
        : tone === "danger"
          ? T.danger
          : null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      {dot && (
        <span
          style={{ width: 7, height: 7, borderRadius: "50%", background: dot }}
        />
      )}
      {value}
    </span>
  );
}

// ════════════ Section helper (drawer sub-section header) ════════════
function Section({
  title,
  children,
  sample,
  right,
}: {
  title: string;
  children: React.ReactNode;
  sample?: boolean;
  right?: React.ReactNode;
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
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {title}
          {sample && <SampleTag />}
        </span>
        {right}
      </div>
      {children}
    </div>
  );
}

// ════════════ Flow-chain visualization (ASCII node→node, NO graph library) ════════════
function FlowChain({
  steps,
  optionalIdx,
}: {
  steps: string[];
  optionalIdx?: number[];
}) {
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
              background:
                i === steps.length - 1
                  ? "var(--cg-accent-bg-strong)"
                  : "transparent",
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
            {optionalIdx?.includes(i) && (
              <span style={{ fontSize: 11, color: T.textMuted }}>
                (optional)
              </span>
            )}
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

// ── Lifecycle Flow (spec §Lifecycle Flow) ──
function LifecycleFlowCard() {
  return (
    <Card
      title="Lifecycle flow"
      desc="The governed end-of-life path a workspace follows into permanent retirement."
    >
      <FlowChain
        steps={[
          "Active",
          "Archive (optional)",
          "Decommission Request",
          "Approval",
          "Resource Cleanup",
          "Evidence Generation",
          "Retention Applied",
          "Decommissioned",
          "Retention Expired",
          "Permanent Deletion",
        ]}
        optionalIdx={[1]}
      />
    </Card>
  );
}

// ── Enterprise Decommission Model (spec §Enterprise Decommission Model) ──
function EnterpriseModelCard() {
  return (
    <Card
      title="Enterprise decommission model"
      desc="The authoritative retirement sequence that preserves regulatory evidence, audit history, business context and historical records."
    >
      <FlowChain
        steps={[
          "Business Approval",
          "Migration",
          "Resource Cleanup",
          "Identity Revocation",
          "Integration Removal",
          "Compliance Evidence",
          "Retention",
          "Historical Record",
          "Decommissioned",
        ]}
      />
    </Card>
  );
}

// ── Decommission Behavior (spec §Decommission Behavior) ──
function DecommissionBehaviorCard() {
  const allowed = [
    "Workspace becomes permanently read-only",
    "All cloud resources are removed or transferred",
    "AI runtimes are terminated",
    "Integrations are disconnected",
    "Identity assignments are revoked",
    "Policies are detached",
    "Compliance evidence is preserved",
    "Audit history remains immutable",
    "Historical metadata remains searchable",
    "Business records are retained",
    "Reports remain exportable",
  ];
  const blocked = [
    "Users cannot access the workspace",
    "Administrators cannot modify configuration",
    "Automation is disabled",
    "Agents cannot execute",
    "APIs are unavailable",
    "Provisioning cannot resume",
  ];
  return (
    <Card
      title="Decommission behavior"
      desc="What is guaranteed to remain, and what becomes permanently unavailable, once a workspace is decommissioned."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 18,
          paddingTop: 6,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: T.success,
              marginBottom: 8,
            }}
          >
            Preserved
          </div>
          {allowed.map((a) => (
            <div
              key={a}
              style={{
                display: "flex",
                gap: 8,
                fontSize: 12.5,
                color: T.textNav,
                padding: "5px 0",
              }}
            >
              <span style={{ color: T.success }}>✓</span>
              {a}
            </div>
          ))}
        </div>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: T.danger,
              marginBottom: 8,
            }}
          >
            Blocked
          </div>
          {blocked.map((b) => (
            <div
              key={b}
              style={{
                display: "flex",
                gap: 8,
                fontSize: 12.5,
                color: T.textNav,
                padding: "5px 0",
              }}
            >
              <span style={{ color: T.danger }}>✗</span>
              {b}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Lifecycle Comparison (spec §Lifecycle Comparison) ──
function LifecycleComparisonCard() {
  const rows = [
    ["Active", "Operational workspace", "Yes"],
    ["Suspended", "Temporary operational stop", "Yes"],
    ["Maintenance", "Planned operational changes", "Yes"],
    ["Archived", "Long-term inactive retention", "Yes"],
    ["Decommissioned", "Permanent retirement", "No"],
  ];
  return (
    <Card
      title="Lifecycle comparison"
      desc="Decommissioned is the only lifecycle state that is not recoverable."
    >
      <div style={{ overflowX: "auto", paddingTop: 6 }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}
        >
          <thead>
            <tr>
              {["State", "Purpose", "Recoverable"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.textMuted,
                    borderBottom: `2px solid var(--cg-border-card)`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([state, purpose, rec]) => {
              const isDecom = state === "Decommissioned";
              return (
                <tr key={state}>
                  <td
                    style={{
                      padding: "11px 14px",
                      borderBottom: `1px solid ${T.border}`,
                      color: isDecom ? T.textPrimary : T.textNav,
                      fontWeight: isDecom ? 600 : 400,
                    }}
                  >
                    {state}
                  </td>
                  <td
                    style={{
                      padding: "11px 14px",
                      borderBottom: `1px solid ${T.border}`,
                      color: T.textNav,
                    }}
                  >
                    {purpose}
                  </td>
                  <td
                    style={{
                      padding: "11px 14px",
                      borderBottom: `1px solid ${T.border}`,
                      color: rec === "No" ? T.danger : T.success,
                      fontWeight: rec === "No" ? 600 : 400,
                    }}
                  >
                    {rec}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Decommission Checklist (spec §Decommission Checklist) ──
const CHECKLIST_CATEGORIES = [
  "Identity Removed",
  "Access Revoked",
  "Cloud Resources Removed",
  "Integrations Removed",
  "Secrets Revoked",
  "Policies Detached",
  "Automation Disabled",
  "AI Services Removed",
  "Monitoring Removed",
  "Logs Archived",
  "Evidence Generated",
  "Retention Applied",
];

function DecommissionChecklistCard() {
  const items = CHECKLIST_CATEGORIES.map((label, i) => {
    const n = hashId(label) + i;
    const state = n % 7 === 0 ? "In Progress" : "Complete";
    return {
      id: `chk-${i}`,
      category: label,
      status: state,
      owner: pick(OWNERS, n),
      completed:
        state === "Complete" ? `${MONTHS[n % 12]} ${1 + (n % 27)}, 2026` : "—",
    };
  });
  const cols: Column<(typeof items)[number]>[] = [
    {
      key: "category",
      header: "Validation Category",
      render: (r) => r.category,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <InlineValue
          value={r.status}
          tone={r.status === "Complete" ? "ok" : "warn"}
        />
      ),
    },
    { key: "owner", header: "Owner", render: (r) => r.owner },
    { key: "completed", header: "Completed Date", render: (r) => r.completed },
  ];
  return (
    <Card
      title="Decommission checklist"
      desc="Every validation category that must be satisfied before a decommission is finalized."
      right={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <ListChecks size={15} color={T.textMuted} />
          <SampleTag />
        </span>
      }
    >
      <DirectoryTable columns={cols} rows={items} />
    </Card>
  );
}

// ════════════ Workspace Detail Drawer — 7 sub-tabs (spec §Workspace Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "plan", label: "Decommission Plan", icon: <FileText size={13} /> },
  { id: "disposal", label: "Resource Disposal", icon: <Trash2 size={13} /> },
  {
    id: "evidence",
    label: "Compliance Evidence",
    icon: <ShieldCheck size={13} />,
  },
  { id: "historical", label: "Historical Records", icon: <Boxes size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function DecomDetailDrawer({
  rec,
  onClose,
  navigate,
}: {
  rec: DecomRecord;
  onClose: () => void;
  navigate: (to: string) => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.workspace} · ${rec.id}`}
      subtitle={`${rec.status} · Decommissioned ${rec.decommissionDate} · Retention ${rec.retention}`}
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
          <HeaderButton
            icon={<Download size={13} />}
            onClick={() => navigate("/admin/workspaces?tab=decommissioned")}
          >
            Export
          </HeaderButton>
          <HeaderButton icon={<FileText size={13} />}>
            Generate Report
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Package size={13} />}>
            Download Evidence
          </HeaderButton>
        </div>
      }
    >
      {/* Drawer header (spec §Drawer Header) — Workspace · Decommission Date · Retention · Status */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          padding: "0 0 14px",
          marginBottom: 14,
          borderBottom: `1px solid ${T.border}`,
          fontSize: 12,
          color: T.textMuted,
        }}
      >
        <span>
          Workspace:{" "}
          <strong style={{ color: T.textPrimary }}>{rec.workspace}</strong>
        </span>
        <span>
          Decommission Date:{" "}
          <strong style={{ color: T.textPrimary }}>
            {rec.decommissionDate}
          </strong>
        </span>
        <span>
          Retention:{" "}
          <strong style={{ color: T.textPrimary }}>{rec.retention}</strong>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Status: <StatusBadge status={rec.status} />
        </span>
      </div>

      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "plan" && <PlanTab rec={rec} />}
      {tab === "disposal" && <DisposalTab rec={rec} />}
      {tab === "evidence" && <EvidenceTab rec={rec} />}
      {tab === "historical" && <HistoricalTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab rec={rec} />}
    </SideRailDrawer>
  );
}

// ── Overview (General · Statistics) ──
function OverviewTab({ rec }: { rec: DecomRecord }) {
  return (
    <>
      <Section title="General">
        <KVGrid
          items={[
            { k: "Workspace Name", v: rec.workspace },
            { k: "Workspace ID", v: rec.id },
            { k: "Environment", v: rec.environment },
            { k: "Business Unit", v: rec.businessUnit },
            { k: "Business Owner", v: rec.owner, sample: true },
            { k: "Decommission Date", v: rec.decommissionDate, sample: true },
            { k: "Status", v: rec.status },
            { k: "Retention Policy", v: rec.retentionPolicy, sample: true },
          ]}
        />
      </Section>

      <Section title="Statistics" sample>
        <KVGrid
          cols={3}
          items={[
            { k: "Resources Removed", v: rec.resourcesRemoved, sample: true },
            {
              k: "Resources Transferred",
              v: rec.resourcesTransferred,
              sample: true,
            },
            { k: "Evidence Packages", v: rec.evidencePackages, sample: true },
            { k: "Audit Records", v: rec.auditRecords, sample: true },
            {
              k: "Retention Remaining",
              v: rec.retentionRemaining,
              sample: true,
            },
          ]}
        />
      </Section>
    </>
  );
}

// ── Decommission Plan (spec §Decommission Plan) ──
function PlanTab({ rec }: { rec: DecomRecord }) {
  const n = hashId(rec.id);
  return (
    <Section title="Approved retirement process" sample>
      <StatRow
        label="Business Justification"
        value={`End-of-life of the ${rec.businessUnit} ${rec.environment.toLowerCase()} platform following consolidation.`}
        sample
      />
      <StatRow
        label="Approval Chain"
        value={`${pick(APPROVERS, n)} → ${pick(APPROVERS, n + 1)} → ${pick(APPROVERS, n + 2)}`}
        sample
      />
      <StatRow
        label="Decommission Owner"
        value={rec.decommissionOwner}
        sample
      />
      <StatRow
        label="Execution Window"
        value={`${rec.decommissionDate} · 02:00–06:00 UTC`}
        sample
      />
      <StatRow
        label="Risk Assessment"
        value={n % 4 === 0 ? "Elevated" : "Low"}
        tone={n % 4 === 0 ? "warn" : "ok"}
        sample
      />
      <StatRow
        label="Migration Reference"
        value={`MIG-${(4200 + (n % 900)).toString()}`}
        sample
      />
      <StatRow
        label="Replacement Workspace"
        value={rec.replacementWorkspace}
        sample
      />
      <StatRow
        label="Business Notes"
        value="Workload migrated; historical records retained for audit and financial reporting."
        sample
      />
    </Section>
  );
}

// ── Resource Disposal (spec §Resource Disposal) ──
const DISPOSAL_CATEGORIES: { resource: string; type: string }[] = [
  { resource: "Workspace", type: "Platform" },
  { resource: "AWS Accounts", type: "Cloud Account" },
  { resource: "Azure Subscriptions", type: "Cloud Account" },
  { resource: "GCP Projects", type: "Cloud Account" },
  { resource: "Kubernetes Clusters", type: "Compute" },
  { resource: "Storage", type: "Storage" },
  { resource: "Databases", type: "Database" },
  { resource: "Networking", type: "Network" },
  { resource: "Secrets", type: "Security" },
  { resource: "Certificates", type: "Security" },
  { resource: "Identity", type: "Identity" },
  { resource: "Groups", type: "Identity" },
  { resource: "Roles", type: "Identity" },
  { resource: "Policies", type: "Governance" },
  { resource: "Integrations", type: "Integration" },
  { resource: "Knowledge Bases", type: "AI/ML" },
  { resource: "AI Providers", type: "AI/ML" },
  { resource: "LLM Models", type: "AI/ML" },
  { resource: "Automation", type: "Automation" },
  { resource: "Monitoring", type: "Observability" },
  { resource: "Logging", type: "Observability" },
];
const DISPOSITIONS = [
  "Deleted",
  "Transferred",
  "Archived",
  "Retained",
  "Revoked",
];

function DisposalTab({ rec }: { rec: DecomRecord }) {
  const items = DISPOSAL_CATEGORIES.map((c, i) => {
    const n = hashId(rec.id + c.resource) + i;
    const disposition = pick(DISPOSITIONS, n);
    const verified = n % 6 !== 0;
    return {
      id: `disp-${i}`,
      resource: c.resource,
      type: c.type,
      disposition,
      completed: verified ? `${MONTHS[n % 12]} ${1 + (n % 27)}, 2026` : "—",
      verified: verified ? "Yes" : "Pending",
    };
  });
  const cols: Column<(typeof items)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "type", header: "Type", render: (r) => r.type },
    {
      key: "disposition",
      header: "Disposition",
      render: (r) => (
        <InlineValue
          value={r.disposition}
          tone={
            r.disposition === "Deleted" || r.disposition === "Revoked"
              ? "ok"
              : r.disposition === "Retained"
                ? "warn"
                : "muted"
          }
        />
      ),
    },
    { key: "completed", header: "Completed", render: (r) => r.completed },
    {
      key: "verified",
      header: "Verified",
      render: (r) => (
        <InlineValue
          value={r.verified}
          tone={r.verified === "Yes" ? "ok" : "warn"}
        />
      ),
    },
  ];
  return (
    <Section
      title="Resource disposal"
      sample
      right={<Server size={14} color={T.textMuted} />}
    >
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
        Evidence that every managed resource has been retired correctly.
      </div>
      <DirectoryTable columns={cols} rows={items} pageSize={12} />
    </Section>
  );
}

// ── Compliance Evidence (spec §Compliance Evidence) ──
function EvidenceTab({ rec }: { rec: DecomRecord }) {
  const includes = [
    "Approval Records",
    "Decommission Checklist",
    "Evidence Bundle",
    "Compliance Reports",
    "Security Reports",
    "Risk Assessment",
    "Asset Inventory",
    "Final Configuration",
    "Audit Logs",
  ];
  return (
    <>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
      >
        <HeaderButton icon={<Package size={13} />}>
          Download Package
        </HeaderButton>
        <HeaderButton icon={<FileText size={13} />}>
          Generate Report
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Permanent compliance package" sample>
        {includes.map((c) => (
          <StatRow
            key={c}
            label={c}
            value={hashId(rec.id + c) % 5 === 0 ? "Generating" : "Available"}
            tone={hashId(rec.id + c) % 5 === 0 ? "warn" : "ok"}
            sample
          />
        ))}
      </Section>
    </>
  );
}

// ── Historical Records (spec §Historical Records) — read-only ──
function HistoricalTab({ rec }: { rec: DecomRecord }) {
  return (
    <Section
      title="Permanent historical record"
      sample
      right={<ShieldCheck size={14} color={T.textMuted} />}
    >
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
        Read-only. Preserved for audit, compliance, financial and historical
        reporting.
      </div>
      <KVGrid
        items={[
          {
            k: "Configuration Snapshot",
            v: `${rec.id}-final.json`,
            sample: true,
          },
          {
            k: "Cloud Inventory",
            v: `${rec.resourcesRemoved + rec.resourcesTransferred} resources`,
            sample: true,
          },
          { k: "Security Baseline", v: "CIS · captured", sample: true },
          { k: "Compliance Status", v: "Attested", sample: true },
          { k: "Workspace Metadata", v: rec.tags, sample: true },
          { k: "Ownership", v: rec.owner, sample: true },
          {
            k: "Business Context",
            v: `${rec.businessUnit} · ${rec.environment}`,
            sample: true,
          },
          {
            k: "Lifecycle Timeline",
            v: `Active → Decommissioned (${rec.decommissionDate})`,
            sample: true,
          },
        ]}
      />
    </Section>
  );
}

// ── Activity (spec §Activity) — timeline + Actor/Action/Date filters ──
function ActivityTab({ rec }: { rec: DecomRecord }) {
  const [fActor, setFActor] = React.useState("");
  const [fAction, setFAction] = React.useState("");
  const [fDate, setFDate] = React.useState("");
  const n = hashId(rec.id);
  const events = [
    "Decommission Requested",
    "Approved",
    "Migration Completed",
    "Resources Removed",
    "Evidence Generated",
    "Decommission Finalized",
  ].map((action, i) => ({
    action,
    actor: pick(OWNERS, n + i),
    date: `${MONTHS[(n + i) % 12]} ${1 + ((n + i) % 27)}, 2026`,
  }));
  const rows = events.filter(
    (e) =>
      (!fActor || e.actor === fActor) &&
      (!fAction || e.action === fAction) &&
      (!fDate || e.date.startsWith(fDate)),
  );
  return (
    <>
      <FilterBar>
        <Select
          label="Actor"
          value={fActor}
          onChange={setFActor}
          options={[
            { value: "", label: "All actors" },
            ...Array.from(new Set(events.map((e) => e.actor))).map((a) => ({
              value: a,
              label: a,
            })),
          ]}
        />
        <Select
          label="Action"
          value={fAction}
          onChange={setFAction}
          options={[
            { value: "", label: "All actions" },
            ...events.map((e) => ({ value: e.action, label: e.action })),
          ]}
        />
        <Select
          label="Date"
          value={fDate}
          onChange={setFDate}
          options={[
            { value: "", label: "All dates" },
            ...Array.from(new Set(events.map((e) => e.date.split(" ")[0]))).map(
              (m) => ({ value: m, label: m }),
            ),
          ]}
        />
      </FilterBar>
      <div
        style={{
          fontSize: 12.5,
          color: T.textMuted,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Decommission activity timeline <SampleTag />
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
function AuditTab({ rec }: { rec: DecomRecord }) {
  const n = hashId(rec.id);
  const events = [
    "Decommission Requested",
    "Approval Completed",
    "Resources Deleted",
    "Resources Transferred",
    "Evidence Generated",
    "Retention Applied",
    "Legal Hold Applied",
    "Decommission Completed",
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
          value={`${pick(OWNERS, n + i)} · ${MONTHS[(n + i) % 12]} ${1 + ((n + i) % 27)}, 2026`}
          tone="ok"
          sample
        />
      ))}
      {rec.legalHold && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            marginTop: 8,
            borderRadius: 8,
            border: `1px solid var(--cg-danger-border)`,
            background: "var(--cg-danger-bg)",
            color: T.danger,
            fontSize: 12.5,
          }}
        >
          <AlertTriangle size={15} /> A legal hold is active — retention cannot
          expire and physical deletion is blocked until it is released.
        </div>
      )}
    </>
  );
}

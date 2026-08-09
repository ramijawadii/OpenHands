/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Hierarchy & Relationships → Workspace Relationships */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Pencil,
  Copy,
  Ban,
  Archive,
  Upload,
  Download,
  RefreshCcw,
  ShieldCheck,
  ClipboardCheck,
  BarChart3,
  FileText,
  LayoutGrid,
  GitBranch,
  Network,
  Boxes,
  Cpu,
  Database,
  Link2,
  Share2,
  Users,
  KeyRound,
  Workflow,
  Gauge,
  HardDrive,
  Server,
  Activity as ActivityIcon,
  History,
  Eye,
  Trash2,
  GitCompare,
  Play,
  ShieldAlert,
  ScrollText,
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
  Drawer,
  SideRailDrawer,
  RowMenu,
  ScopeBadge,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { StatStripPlain } from "#/components/admin/settings-kit";

/**
 * Workspace Relationships — the enterprise collaboration layer between workspaces. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/03_Hierarchy & Relationships/
 * workspace_relationships.md.
 *
 * Unlike Parent/Child (structural hierarchy), Dependencies (runtime operational reliance) or Shared
 * Service workspaces (centralized providers), Workspace Relationships describe *why* workspaces are
 * connected — business partnership, shared compliance scope, shared data, shared cloud accounts,
 * shared AI knowledge, shared operations, joint incident response, shared support and multi-team
 * collaboration — providing context for governance, security, compliance, AI collaboration, data
 * sharing, operational boundaries, reporting and lifecycle coordination.
 *
 * Reuses the Enterprise-Administration UX pattern shared with the Users module (Banner · Toolbar ·
 * Filters · Search · Relationship Graph · Data Table · Bulk/Row actions · Relationship Detail Drawer
 * with 7 sub-tabs). There is no relationship backend yet, so the set is representative sample data
 * (tagged `Sample` in the UI). When the relationship model + governance engine land, swap
 * SAMPLE_RELATIONSHIPS for the live query — the component API stays identical.
 */

// ── Reference vocabularies (spec §Relationship Types / §Relationship Categories / §Directions) ──────
const REL_TYPES = [
  "Business Collaboration",
  "Operational Collaboration",
  "Shared Governance",
  "Shared Compliance",
  "Shared Security",
  "Shared Data",
  "Shared AI",
  "Shared Resources",
  "Shared Support",
  "Shared Operations",
  "Disaster Recovery",
  "Business Continuity",
  "Environment Pairing",
  "Migration",
  "Testing",
  "Reference Workspace",
  "External Partner",
];

const CATEGORIES = [
  "Business",
  "Operations",
  "Security",
  "Compliance",
  "AI",
  "Cloud",
  "Platform",
  "Support",
];

// Maps each relationship type onto its primary governance category.
const TYPE_CATEGORY: Record<string, string> = {
  "Business Collaboration": "Business",
  "Operational Collaboration": "Operations",
  "Shared Governance": "Compliance",
  "Shared Compliance": "Compliance",
  "Shared Security": "Security",
  "Shared Data": "Cloud",
  "Shared AI": "AI",
  "Shared Resources": "Cloud",
  "Shared Support": "Support",
  "Shared Operations": "Operations",
  "Disaster Recovery": "Operations",
  "Business Continuity": "Operations",
  "Environment Pairing": "Platform",
  Migration: "Platform",
  Testing: "Platform",
  "Reference Workspace": "Platform",
  "External Partner": "Business",
};

const DIRECTIONS = ["Bidirectional", "Source → Target", "Target → Source"];

const WORKSPACES = [
  "Payments",
  "Fraud Detection",
  "Risk Analytics",
  "Platform Core",
  "Data Lake",
  "Retail Ops",
  "Identity Hub",
  "Compliance Center",
  "Support Desk",
  "ML Platform",
  "Trading Engine",
  "Customer 360",
];
const BUSINESS_UNITS = [
  "Finance",
  "Platform",
  "Security",
  "Data",
  "Retail",
  "Risk",
];
const OWNERS = [
  "David Chen",
  "Aisha Khan",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
  "Tomás Silva",
];
const REVIEW_FREQ = ["Quarterly", "Semi-Annual", "Annual"];
const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];

// ── Status models ──────────────────────────────────────────────────────────────────────────────────
type Status = "Active" | "Pending" | "Disabled" | "Archived" | "Expired";
const STATUSES: Status[] = [
  "Active",
  "Active",
  "Active",
  "Pending",
  "Disabled",
  "Archived",
  "Expired",
];
const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Pending: T.warning,
  Disabled: T.textMuted,
  Archived: T.textMuted,
  Expired: T.danger,
};

type ReviewStatus = "Reviewed" | "Due" | "Overdue" | "Pending";
const REVIEW_STATUSES: ReviewStatus[] = [
  "Reviewed",
  "Reviewed",
  "Due",
  "Overdue",
  "Pending",
];
const RISK_TONE: Record<string, string> = {
  Critical: T.danger,
  High: T.warning,
  Medium: T.textNav,
  Low: T.textMuted,
};

// ── Second-level sub-navigation (spec §Navigation) — a FILTER dropdown, not pills ─────────────────
const VIEW_OPTIONS = [
  { value: "catalog", label: "Relationship Catalog" },
  { value: "business", label: "Business Relationships" },
  { value: "operational", label: "Operational Relationships" },
  { value: "governance", label: "Governance Relationships" },
  { value: "ai", label: "AI Relationships" },
  { value: "data", label: "Data Relationships" },
  { value: "security", label: "Security Relationships" },
  { value: "external", label: "External Relationships" },
  { value: "graph", label: "Relationship Graph" },
  { value: "history", label: "Relationship History" },
  { value: "validation", label: "Validation" },
];
const LIST_VIEWS = new Set([
  "catalog",
  "business",
  "operational",
  "governance",
  "ai",
  "data",
  "security",
  "external",
]);

interface RelationshipRecord {
  id: string;
  name: string;
  source: string;
  target: string;
  relationshipType: string;
  category: string;
  direction: string;
  owner: string;
  businessUnit: string;
  status: Status;
  reviewStatus: ReviewStatus;
  businessPurpose: string;
  operationalPurpose: string;
  reviewFrequency: string;
  expiration: string;
  riskLevel: string;
  created: string;
  modified: string;
  connectedResources: number;
  sharedPolicies: number;
  sharedUsers: number;
  sharedServices: number;
  relationshipAgeDays: number;
  lastReview: string;
  nextReview: string;
  reviewer: string;
  reviewOutcome: string;
  tags: string[];
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative relationship set — cycles the type by index so every category is
// covered by the sub-navigation views.
const SAMPLE_RELATIONSHIPS: RelationshipRecord[] = Array.from(
  { length: 14 },
  (_, i) => {
    const id = `WSR-${(1042 + i * 13).toString().padStart(5, "0")}`;
    const n = hashId(id);
    const relationshipType = REL_TYPES[i % REL_TYPES.length];
    const category = TYPE_CATEGORY[relationshipType];
    const srcIdx = n % WORKSPACES.length;
    const tgtIdx =
      (srcIdx + 1 + (n % (WORKSPACES.length - 1))) % WORKSPACES.length;
    const source = WORKSPACES[srcIdx];
    const target = WORKSPACES[tgtIdx];
    const status = pick(STATUSES, n);
    const age = 45 + (n % 900);
    return {
      id,
      name: `${source} ↔ ${target} — ${relationshipType}`,
      source,
      target,
      relationshipType,
      category,
      direction: pick(DIRECTIONS, n >> 1),
      owner: pick(OWNERS, n),
      businessUnit: pick(BUSINESS_UNITS, n >> 2),
      status,
      reviewStatus: pick(REVIEW_STATUSES, n >> 3),
      businessPurpose: `Coordinate ${category.toLowerCase()} collaboration between ${source} and ${target}.`,
      operationalPurpose: `Share ${relationshipType.toLowerCase()} capabilities and boundaries across both workspaces.`,
      reviewFrequency: pick(REVIEW_FREQ, n),
      expiration:
        n % 4 === 0
          ? "No expiry"
          : `2027-${(1 + (n % 11)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      riskLevel: pick(RISK_LEVELS, n >> 1),
      created: `2025-${(1 + (n % 11)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      modified: `2026-0${1 + (n % 6)}-${(1 + ((n + 4) % 27)).toString().padStart(2, "0")}`,
      connectedResources: 4 + (n % 28),
      sharedPolicies: 2 + (n % 12),
      sharedUsers: 6 + (n % 60),
      sharedServices: 1 + (n % 9),
      relationshipAgeDays: age,
      lastReview: `2026-0${1 + (n % 5)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      nextReview: `2026-${(7 + (n % 5)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      reviewer: pick(OWNERS, n >> 4),
      reviewOutcome: pick(
        ["Approved", "Approved with conditions", "Needs update", "Pending"],
        n,
      ),
      tags: [
        category.toLowerCase(),
        pick(BUSINESS_UNITS, n).toLowerCase(),
        "cross-workspace",
      ],
    };
  },
);

function viewMatch(view: string, r: RelationshipRecord): boolean {
  switch (view) {
    case "business":
      return r.category === "Business";
    case "operational":
      return r.category === "Operations";
    case "governance":
      return r.category === "Compliance";
    case "ai":
      return r.category === "AI";
    case "data":
      return r.relationshipType === "Shared Data" || r.category === "Cloud";
    case "security":
      return r.category === "Security";
    case "external":
      return r.relationshipType === "External Partner";
    default:
      return true;
  }
}

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
 * Embeddable body — sub-navigation + operational dashboard + directory + relationship graph + detail
 * drawer, WITHOUT the outer <Page> or the page banner. Rendered both as the standalone route and as a
 * tab of the Workspace Management console. Uses local state for the view sub-nav so it never collides
 * with a host page's `?tab=`.
 */
export function WorkspaceRelationshipsView() {
  const [view, setView] = React.useState("catalog");

  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fWorkspace, setFWorkspace] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fDirection, setFDirection] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fReview, setFReview] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = React.useState(false);

  const records = SAMPLE_RELATIONSHIPS;
  const isListView = LIST_VIEWS.has(view);

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      viewMatch(view, r) &&
      (!q ||
        r.source.toLowerCase().includes(q) ||
        r.target.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.relationshipType.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.tags.join(" ").toLowerCase().includes(q)) &&
      (!fType || r.relationshipType === fType) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fWorkspace || r.source === fWorkspace || r.target === fWorkspace) &&
      (!fOwner || r.owner === fOwner) &&
      (!fDirection || r.direction === fDirection) &&
      (!fStatus || r.status === fStatus) &&
      (!fReview || r.reviewStatus === fReview)
    );
  });
  const hasFilters = !!(
    search ||
    fType ||
    fBu ||
    fWorkspace ||
    fOwner ||
    fDirection ||
    fStatus ||
    fReview
  );
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFBu("");
    setFWorkspace("");
    setFOwner("");
    setFDirection("");
    setFStatus("");
    setFReview("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const confirmRec = records.find((r) => r.id === confirmId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational Dashboard (spec §Operational Dashboard) ──
  const total = records.length;
  const nBusiness = records.filter((r) => r.category === "Business").length;
  const nOps = records.filter((r) => r.category === "Operations").length;
  const nSec = records.filter((r) => r.category === "Security").length;
  const nCompliance = records.filter((r) => r.category === "Compliance").length;
  const pendingReviews = records.filter(
    (r) =>
      r.reviewStatus === "Due" ||
      r.reviewStatus === "Overdue" ||
      r.reviewStatus === "Pending",
  ).length;
  const expired = records.filter((r) => r.status === "Expired").length;
  const health = Math.round(
    (records.filter(
      (r) => r.status === "Active" && r.reviewStatus === "Reviewed",
    ).length /
      total) *
      100,
  );

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Relationship",
      icon: <Plus size={15} />,
      onClick: () => setWizardOpen(true),
    },
    { key: "edit", label: "Edit", icon: <Pencil size={15} />, disabled: true },
    { key: "clone", label: "Clone", icon: <Copy size={15} />, disabled: true },
    {
      key: "disable",
      label: "Disable",
      icon: <Ban size={15} />,
      disabled: true,
    },
    {
      key: "archive",
      label: "Archive",
      icon: <Archive size={15} />,
      disabled: true,
    },
    {
      key: "import",
      label: "Import",
      icon: <Upload size={15} />,
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
      onClick: clearFilters,
    },
    {
      key: "validate",
      label: "Validate Relationships",
      icon: <ShieldCheck size={15} />,
      onClick: () => setView("validation"),
    },
    {
      key: "review",
      label: "Review Relationships",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "analysis",
      label: "Relationship Analysis",
      icon: <BarChart3 size={15} />,
      onClick: () => setView("graph"),
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<RelationshipRecord>[] = [
    {
      key: "source",
      header: "Source Workspace",
      sortValue: (r) => r.source,
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
          {r.source}
        </span>
      ),
    },
    {
      key: "target",
      header: "Target Workspace",
      sortValue: (r) => r.target,
      render: (r) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Link2 size={13} color={T.textMuted} />
          {r.target}
        </span>
      ),
    },
    {
      key: "type",
      header: "Relationship Type",
      sortValue: (r) => r.relationshipType,
      render: (r) => r.relationshipType,
    },
    {
      key: "category",
      header: "Category",
      sortValue: (r) => r.category,
      render: (r) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 20,
            padding: "0 8px",
            borderRadius: 99,
            fontSize: 11,
            color: T.textNav,
            background: T.badgeBg,
          }}
        >
          {r.category}
        </span>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
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
      {/* Operational Dashboard */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
          color: T.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          marginBottom: 10,
        }}
      >
        Operational Dashboard <SampleTag />
      </div>
      <div style={{ marginBottom: 20 }}>
        <StatStripPlain
          items={[
            { label: "Total Relationships", value: total },
            { label: "Business Relationships", value: nBusiness, tone: "ok" },
            { label: "Operational Relationships", value: nOps, tone: "ok" },
            { label: "Security Relationships", value: nSec, tone: "warn" },
            {
              label: "Compliance Relationships",
              value: nCompliance,
              tone: "ok",
            },
            {
              label: "Pending Reviews",
              value: pendingReviews,
              tone: pendingReviews ? "warn" : "ok",
            },
            {
              label: "Expired Relationships",
              value: expired,
              tone: expired ? "danger" : "ok",
            },
            {
              label: "Relationship Health",
              value: `${health}%`,
              tone: health >= 70 ? "ok" : health >= 40 ? "warn" : "danger",
            },
          ]}
        />
      </div>

      <Card
        title="Workspace relationships"
        desc="Manage logical relationships between enterprise workspaces for governance, collaboration, AI, security, compliance and operational coordination. They capture why workspaces are connected — not merely how."
      >
        <CommandBar items={toolbar} />

        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search workspace relationships — workspace, relationship, business unit, owner, category, tags…"
          count={isListView ? rows.length : undefined}
          total={isListView ? records.length : undefined}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select
            label="View"
            value={view}
            onChange={setView}
            options={VIEW_OPTIONS}
          />
          <Select
            label="Relationship Type"
            value={fType}
            onChange={setFType}
            options={facet(records.map((r) => r.relationshipType))}
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
            options={facet([
              ...records.map((r) => r.source),
              ...records.map((r) => r.target),
            ])}
          />
          <Select
            label="Owner"
            value={fOwner}
            onChange={setFOwner}
            options={facet(records.map((r) => r.owner))}
          />
          <Select
            label="Direction"
            value={fDirection}
            onChange={setFDirection}
            options={facet(records.map((r) => r.direction))}
          />
          <Select
            label="Status"
            value={fStatus}
            onChange={setFStatus}
            options={facet(records.map((r) => r.status))}
          />
          <Select
            label="Review Status"
            value={fReview}
            onChange={setFReview}
            options={facet(records.map((r) => r.reviewStatus))}
          />
        </FilterBar>

        {isListView ? (
          <DirectoryTable
            columns={cols}
            rows={rows}
            pageSize={12}
            initialSort={{ key: "source", dir: "asc" }}
            onRowClick={(r) => setSelId(r.id)}
            selectable
            bulkActions={(ids, clear) => (
              <>
                <HeaderButton
                  icon={<ClipboardCheck size={13} />}
                  onClick={clear}
                >
                  Review ({ids.length})
                </HeaderButton>
                <HeaderButton icon={<Archive size={13} />} onClick={clear}>
                  Archive
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
                  { label: "Show Graph", onClick: () => setView("graph") },
                  { label: "Review", onClick: () => setSelId(r.id) },
                  { label: "Export", onClick: () => {} },
                  { label: "Archive", onClick: () => setSelId(r.id) },
                  {
                    label: "Delete",
                    onClick: () => setConfirmId(r.id),
                    danger: true,
                  },
                ]}
              />
            )}
            empty={
              <EmptyState
                icon={<Network size={20} />}
                title="No workspace relationships configured."
                hint="Create a relationship, or import a relationship map to get started."
                cta="Create Relationship"
                onCta={() => setWizardOpen(true)}
              />
            }
          />
        ) : view === "graph" ? (
          <RelationshipGraphPanel />
        ) : view === "history" ? (
          <RelationshipHistoryPanel />
        ) : (
          <RelationshipValidationPanel />
        )}
      </Card>

      {/* Persistent spec sections shown alongside the list views (hidden when a dedicated panel view
          already renders that content, to avoid duplication). */}
      {isListView && (
        <>
          <Card
            title="Relationship Graph"
            desc="Interactive visualization of how workspaces collaborate across the enterprise."
            right={<SampleTag />}
          >
            <RelationshipGraphFlow />
            <GraphControls />
          </Card>

          <Card
            title="Relationship Validation"
            desc="Automatically checks relationship integrity across the enterprise model."
            right={<SampleTag />}
          >
            <ValidationChecks />
          </Card>

          <Card
            title="Relationship Review"
            desc="Supports periodic governance reviews of enterprise relationships."
            right={<SampleTag />}
          >
            <ReviewPanel />
          </Card>

          <ReferenceCard />
        </>
      )}

      {sel && (
        <RelationshipDetailDrawer
          rec={sel}
          onClose={() => setSelId(null)}
          onDelete={() => {
            setSelId(null);
            setConfirmId(sel.id);
          }}
        />
      )}
      {wizardOpen && (
        <RelationshipWizard onClose={() => setWizardOpen(false)} />
      )}
      {confirmRec && (
        <ConfirmDeleteDrawer
          rec={confirmRec}
          onClose={() => setConfirmId(null)}
        />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function WorkspaceRelationshipsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Workspace Relationships"
        subtitle="Manage logical relationships between enterprise workspaces for governance, collaboration, AI, security, compliance and operational coordination."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=relationships")}
            >
              Create Relationship
            </HeaderButton>
          </>
        }
      />
      <WorkspaceRelationshipsView />
    </Page>
  );
}

// ════════════ Section helper ════════════
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

// ── FlowChain — ASCII node→node visualization (no graph library), reused by the graph + impact views ─
function FlowChain({
  nodes,
}: {
  nodes: { label: string; kind?: "workspace" | "relationship" | "service" }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {nodes.map((node, i) => {
        const accent = node.kind === "relationship";
        const service = node.kind === "service";
        return (
          <React.Fragment key={`${node.label}-${i}`}>
            <div
              style={{
                border: `1px solid ${accent ? "transparent" : T.border}`,
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 12.5,
                textAlign: "center",
                color: accent
                  ? T.accent
                  : service
                    ? T.textMuted
                    : T.textPrimary,
                fontWeight: accent ? 600 : 400,
                background: accent
                  ? "var(--cg-accent-bg-strong)"
                  : service
                    ? "transparent"
                    : T.cardBg,
                fontStyle: service ? "italic" : "normal",
              }}
            >
              {node.label}
            </div>
            {i < nodes.length - 1 && (
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

function RelationshipGraphFlow() {
  return (
    <FlowChain
      nodes={[
        { label: "Payments", kind: "workspace" },
        { label: "Business Collaboration", kind: "relationship" },
        { label: "Fraud Detection", kind: "workspace" },
        { label: "Shared AI", kind: "relationship" },
        { label: "Risk Analytics", kind: "workspace" },
      ]}
    />
  );
}

// Graph interaction affordances (spec §Relationship Graph → Supports).
function GraphControls() {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
      <HeaderButton icon={<Plus size={13} />}>Expand</HeaderButton>
      <HeaderButton icon={<Ban size={13} />}>Collapse</HeaderButton>
      <HeaderButton icon={<GitBranch size={13} />}>Filter</HeaderButton>
      <HeaderButton icon={<LayoutGrid size={13} />}>
        Highlight Categories
      </HeaderButton>
      <HeaderButton icon={<Boxes size={13} />}>
        Show Business Units
      </HeaderButton>
      <HeaderButton icon={<Users size={13} />}>Show Ownership</HeaderButton>
    </div>
  );
}

// ── Graph view panel (main card body when the "Relationship Graph" view is active) ──
function RelationshipGraphPanel() {
  return (
    <>
      <div
        style={{
          fontSize: 12.5,
          color: T.textMuted,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Interactive cross-workspace relationship visualization <SampleTag />
      </div>
      <RelationshipGraphFlow />
      <GraphControls />
      <div style={{ marginTop: 18 }}>
        <Section title="Highlight Categories">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => (
              <span
                key={c}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 22,
                  padding: "0 10px",
                  borderRadius: 99,
                  fontSize: 11.5,
                  color: T.textNav,
                  background: T.badgeBg,
                  border: `1px solid ${T.border}`,
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

// ── History view panel (spec §Relationship History / §Activity) ──
function RelationshipHistoryPanel() {
  const events = [
    "Relationship Created",
    "Relationship Updated",
    "Governance Modified",
    "Resources Shared",
    "Review Completed",
    "Relationship Archived",
  ];
  return (
    <>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
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
              background: T.accent,
              marginTop: 5,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>
              {pick(OWNERS, i)} · 2026-06-{(10 + i).toString().padStart(2, "0")}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Validation view panel (spec §Relationship Validation + §Relationship Review) ──
function RelationshipValidationPanel() {
  return (
    <>
      <ValidationChecks />
      <div style={{ height: 18 }} />
      <Section title="Relationship Review" sample>
        <ReviewPanel />
      </Section>
    </>
  );
}

// Automated integrity checks (spec §Relationship Validation).
function ValidationChecks() {
  const checks: {
    label: string;
    count: number;
    tone: "ok" | "warn" | "danger";
  }[] = [
    { label: "Duplicate Relationships", count: 0, tone: "ok" },
    { label: "Conflicting Relationships", count: 1, tone: "warn" },
    { label: "Expired Relationships", count: 2, tone: "danger" },
    { label: "Missing Reviews", count: 3, tone: "warn" },
    { label: "Orphan Relationships", count: 0, tone: "ok" },
    { label: "Policy Conflicts", count: 1, tone: "danger" },
  ];
  return (
    <>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}
      >
        <HeaderButton variant="primary" icon={<Play size={13} />}>
          Run Validation
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export Report</HeaderButton>
      </div>
      {checks.map((c) => (
        <StatRow
          key={c.label}
          label={c.label}
          value={c.count === 0 ? "None" : `${c.count} found`}
          tone={c.count === 0 ? "ok" : c.tone}
          sample
        />
      ))}
    </>
  );
}

// Periodic governance review (spec §Relationship Review).
function ReviewPanel() {
  return (
    <>
      <KVGrid
        items={[
          { k: "Last Review", v: "2026-05-14", sample: true },
          { k: "Next Review", v: "2026-08-14", sample: true },
          { k: "Reviewer", v: "David Chen", sample: true },
          { k: "Status", v: "Due", sample: true },
          { k: "Outcome", v: "Approved with conditions", sample: true },
        ]}
        cols={3}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <HeaderButton variant="primary" icon={<ClipboardCheck size={13} />}>
          Approve
        </HeaderButton>
        <HeaderButton icon={<Pencil size={13} />}>Update</HeaderButton>
        <HeaderButton icon={<Archive size={13} />}>Archive</HeaderButton>
      </div>
    </>
  );
}

// Static reference of supported relationship types + categories (spec §Relationship Types /
// §Relationship Categories).
function ReferenceCard() {
  return (
    <Card
      title="Relationship Types & Categories"
      desc="The supported relationship vocabulary used across the enterprise collaboration model."
    >
      <Section title="Relationship Types">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {REL_TYPES.map((t) => (
            <span
              key={t}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 24,
                padding: "0 11px",
                borderRadius: 99,
                fontSize: 11.5,
                color: T.textNav,
                background: T.badgeBg,
                border: `1px solid ${T.border}`,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </Section>
      <Section title="Relationship Categories">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <span
              key={c}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 24,
                padding: "0 11px",
                borderRadius: 99,
                fontSize: 11.5,
                color: T.accent,
                background: "var(--cg-accent-bg-strong)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </Section>
    </Card>
  );
}

// ════════════ Relationship Detail Drawer — 7 sub-tabs (spec §Workspace Relationship Detail Drawer) ══
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "details",
    label: "Relationship Details",
    icon: <GitBranch size={13} />,
  },
  { id: "governance", label: "Governance", icon: <ShieldCheck size={13} /> },
  { id: "resources", label: "Connected Resources", icon: <Boxes size={13} /> },
  { id: "impact", label: "Impact Analysis", icon: <BarChart3 size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function RelationshipDetailDrawer({
  rec,
  onClose,
  onDelete,
}: {
  rec: RelationshipRecord;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      title={`${rec.source} ↔ ${rec.target}`}
      subtitle={`${rec.relationshipType} · ${rec.status} · Owner: ${rec.owner}`}
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
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
            variant="danger"
            icon={<Trash2 size={13} />}
            onClick={onDelete}
          >
            Delete
          </HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton icon={<ClipboardCheck size={13} />}>
            Review
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Pencil size={13} />}>
            Edit
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "details" && <DetailsTab rec={rec} />}
      {tab === "governance" && <GovernanceTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "impact" && <ImpactTab rec={rec} />}
      {tab === "activity" && <ActivityTab />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

// ── Overview (General · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: RelationshipRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Relationship Name", v: rec.name },
              { k: "Relationship Type", v: rec.relationshipType },
              { k: "Category", v: rec.category },
              { k: "Source Workspace", v: rec.source },
              { k: "Target Workspace", v: rec.target },
              { k: "Direction", v: rec.direction },
              { k: "Business Owner", v: rec.owner, sample: true },
              { k: "Status", v: rec.status },
              { k: "Created", v: rec.created, sample: true },
              { k: "Modified", v: rec.modified, sample: true },
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
                k: "Connected Resources",
                v: rec.connectedResources,
                sample: true,
              },
              { k: "Shared Policies", v: rec.sharedPolicies, sample: true },
              { k: "Shared Users", v: rec.sharedUsers, sample: true },
              { k: "Shared Services", v: rec.sharedServices, sample: true },
              {
                k: "Relationship Age",
                v: `${Math.round(rec.relationshipAgeDays / 30)} months`,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Relationship Details (characteristics + directions) ──
const DETAILS_SUBS = [
  { id: "relationship-characteristics", label: "Relationship characteristics" },
  { id: "relationship-directions", label: "Relationship Directions" },
];
function DetailsTab({ rec }: { rec: RelationshipRecord }) {
  const [sub, setSub] = React.useState("relationship-characteristics");
  return (
    <>
      <Tabs tabs={DETAILS_SUBS} active={sub} onChange={setSub} />
      {sub === "relationship-characteristics" && (
        <Section title="Relationship characteristics" sample>
          <StatRow
            label="Relationship Type"
            value={rec.relationshipType}
            sample
          />
          <StatRow label="Direction" value={rec.direction} sample />
          <StatRow
            label="Business Purpose"
            value={rec.businessPurpose}
            sample
          />
          <StatRow
            label="Operational Purpose"
            value={rec.operationalPurpose}
            sample
          />
          <StatRow
            label="Review Frequency"
            value={rec.reviewFrequency}
            sample
          />
          <StatRow label="Expiration" value={rec.expiration} sample />
          <StatRow
            label="Risk Level"
            value={
              <span style={{ color: RISK_TONE[rec.riskLevel] }}>
                {rec.riskLevel}
              </span>
            }
            sample
          />
        </Section>
      )}
      {sub === "relationship-directions" && (
        <Section title="Relationship Directions">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {DIRECTIONS.map((d) => {
              const on = d === rec.direction;
              return (
                <div
                  key={d}
                  style={{
                    border: `1px solid ${on ? "transparent" : T.border}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: on ? T.accent : T.textNav,
                    fontWeight: on ? 600 : 400,
                    background: on
                      ? "var(--cg-accent-bg-strong)"
                      : "transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Share2 size={13} />
                  {d}
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </>
  );
}

// ── Governance (implications) ──
function GovernanceTab({ rec }: { rec: RelationshipRecord }) {
  return (
    <Section
      title="Governance implications"
      sample
      right={
        <div style={{ display: "flex", gap: 8 }}>
          <HeaderButton icon={<ClipboardCheck size={13} />}>
            Review Governance
          </HeaderButton>
          <HeaderButton icon={<GitCompare size={13} />}>
            Compare Policies
          </HeaderButton>
        </div>
      }
    >
      <StatRow
        label="Shared Policies"
        value={`${rec.sharedPolicies} policies`}
        tone="ok"
        sample
      />
      <StatRow
        label="Compliance Scope"
        value="ISO 27001, SOC 2, PCI DSS"
        sample
      />
      <StatRow
        label="Security Policies"
        value="Network isolation, data classification, access review"
        sample
      />
      <StatRow
        label="Approval Chains"
        value="Business → Security → Compliance"
        sample
      />
      <StatRow label="Risk Ownership" value={rec.owner} sample />
      <StatRow label="Business Ownership" value={rec.businessUnit} sample />
    </Section>
  );
}

// ── Connected Resources (shared enterprise resources) ──
const RESOURCE_CATEGORIES = [
  { name: "Cloud Accounts", Icon: Boxes },
  { name: "AI Models", Icon: Cpu },
  { name: "Knowledge Bases", Icon: Database },
  { name: "Integrations", Icon: Link2 },
  { name: "Secrets", Icon: KeyRound },
  { name: "Automation", Icon: Workflow },
  { name: "Dashboards", Icon: Gauge },
  { name: "Storage", Icon: HardDrive },
  { name: "Data Sources", Icon: Database },
  { name: "Shared Services", Icon: Server },
];
const PERMISSIONS = ["Read", "Read/Write", "Admin", "Shared"];

function ResourcesTab({ rec }: { rec: RelationshipRecord }) {
  const n = hashId(rec.id);
  const resources = RESOURCE_CATEGORIES.slice(0, 4 + (n % 6)).map((c, i) => ({
    id: `${rec.id}-res-${i}`,
    resource: `${c.name.replace(/s$/, "")} ${1 + ((n + i) % 6)}`,
    category: c.name,
    owner: pick(OWNERS, n + i),
    permission: pick(PERMISSIONS, n + i),
    Icon: c.Icon,
  }));
  const cols: Column<(typeof resources)[number]>[] = [
    {
      key: "resource",
      header: "Resource",
      render: (r) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <r.Icon size={13} color={T.textMuted} />
          {r.resource}
        </span>
      ),
    },
    { key: "category", header: "Category", render: (r) => r.category },
    { key: "owner", header: "Owner", render: (r) => r.owner },
    { key: "permission", header: "Permission", render: (r) => r.permission },
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
        Shared enterprise resources between {rec.source} and {rec.target}{" "}
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={resources} />
    </>
  );
}

// ── Impact Analysis (operational impact of changing / removing the relationship) ──
function ImpactTab({ rec }: { rec: RelationshipRecord }) {
  return (
    <>
      <Section
        title="Impact of changing or removing this relationship"
        sample
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <HeaderButton icon={<Play size={13} />}>Run Analysis</HeaderButton>
            <HeaderButton icon={<Download size={13} />}>
              Export Report
            </HeaderButton>
          </div>
        }
      >
        <StatRow
          label="Affected Workspaces"
          value={`${2 + (hashId(rec.id) % 5)} workspaces`}
          tone="warn"
          sample
        />
        <StatRow
          label="Compliance Impact"
          value="Shared compliance scope breaks"
          tone="danger"
          sample
        />
        <StatRow
          label="Operational Impact"
          value="Reduced cross-team coordination"
          tone="warn"
          sample
        />
        <StatRow
          label="Security Impact"
          value="Shared security policies decouple"
          tone="warn"
          sample
        />
        <StatRow
          label="Business Impact"
          value="Partnership continuity affected"
          tone="warn"
          sample
        />
        <StatRow
          label="AI Impact"
          value="Shared knowledge no longer available"
          tone="warn"
          sample
        />
      </Section>
      <Section title="Impact visualization">
        <FlowChain
          nodes={[
            { label: rec.source, kind: "workspace" },
            { label: rec.relationshipType, kind: "relationship" },
            { label: rec.target, kind: "workspace" },
            { label: "Affected Services", kind: "service" },
          ]}
        />
      </Section>
    </>
  );
}

// ── Activity timeline (spec §Activity) ──
function ActivityTab() {
  const events = [
    "Relationship Created",
    "Relationship Updated",
    "Governance Modified",
    "Resources Shared",
    "Review Completed",
    "Relationship Archived",
  ];
  return (
    <>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
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
              {pick(OWNERS, i)} ·{" "}
              {pick(["2 h", "yesterday", "3 days", "1 week"], i)} ago
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
    "Relationship Created",
    "Relationship Updated",
    "Relationship Reviewed",
    "Relationship Approved",
    "Governance Changed",
    "Relationship Disabled",
    "Relationship Archived",
    "Relationship Deleted",
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
        <ScrollText size={14} /> Read-only immutable log <SampleTag />
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

// ════════════ Create Relationship Wizard (spec §Toolbar → Create Relationship) ════════════
function RelationshipWizard({ onClose }: { onClose: () => void }) {
  const [source, setSource] = React.useState(WORKSPACES[0]);
  const [target, setTarget] = React.useState(WORKSPACES[1]);
  const [type, setType] = React.useState(REL_TYPES[0]);
  const [direction, setDirection] = React.useState(DIRECTIONS[0]);
  const [justification, setJustification] = React.useState("");
  const [owner, setOwner] = React.useState(OWNERS[0]);
  const [frequency, setFrequency] = React.useState(REVIEW_FREQ[0]);
  const [expiration, setExpiration] = React.useState("");
  const [tags, setTags] = React.useState("");

  const opts = (vals: string[]) => vals.map((v) => ({ value: v, label: v }));
  const field = (label: string, control: React.ReactNode) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        marginBottom: 14,
      }}
    >
      <span style={{ fontSize: 12, color: T.textMuted }}>{label}</span>
      {control}
    </div>
  );
  const inputStyle: React.CSSProperties = {
    height: 32,
    padding: "0 10px",
    background: "var(--cg-input-bg)",
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    color: T.textPrimary,
    fontSize: 12.5,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <Drawer
      title="Create Relationship"
      subtitle="Define a logical relationship between two enterprise workspaces."
      width={720}
      onClose={onClose}
      footer={
        <>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
          <HeaderButton
            variant="primary"
            icon={<Plus size={13} />}
            onClick={onClose}
          >
            Create Relationship
          </HeaderButton>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: T.textMuted,
          marginBottom: 16,
        }}
      >
        Relationship Wizard <SampleTag />
      </div>
      {field(
        "Source Workspace",
        <Select
          label="Source Workspace"
          value={source}
          onChange={setSource}
          options={opts(WORKSPACES)}
        />,
      )}
      {field(
        "Target Workspace",
        <Select
          label="Target Workspace"
          value={target}
          onChange={setTarget}
          options={opts(WORKSPACES)}
        />,
      )}
      {field(
        "Relationship Type",
        <Select
          label="Relationship Type"
          value={type}
          onChange={setType}
          options={opts(REL_TYPES)}
        />,
      )}
      {field(
        "Direction",
        <Select
          label="Direction"
          value={direction}
          onChange={setDirection}
          options={opts(DIRECTIONS)}
        />,
      )}
      {field(
        "Business Justification",
        <textarea
          aria-label="Business Justification"
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Explain why these workspaces should be connected…"
          rows={3}
          style={{
            ...inputStyle,
            height: "auto",
            padding: "8px 10px",
            resize: "vertical",
          }}
        />,
      )}
      {field(
        "Business Owner",
        <Select
          label="Business Owner"
          value={owner}
          onChange={setOwner}
          options={opts(OWNERS)}
        />,
      )}
      {field(
        "Review Frequency",
        <Select
          label="Review Frequency"
          value={frequency}
          onChange={setFrequency}
          options={opts(REVIEW_FREQ)}
        />,
      )}
      {field(
        "Expiration",
        <input
          aria-label="Expiration"
          type="date"
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
          style={inputStyle}
        />,
      )}
      {field(
        "Tags",
        <input
          aria-label="Tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="env, business-unit, cost-centre"
          style={inputStyle}
        />,
      )}
    </Drawer>
  );
}

// ════════════ Delete confirmation (spec §Row Actions → Delete is destructive, requires confirm) ════
function ConfirmDeleteDrawer({
  rec,
  onClose,
}: {
  rec: RelationshipRecord;
  onClose: () => void;
}) {
  return (
    <Drawer
      title="Delete relationship"
      subtitle={`${rec.source} ↔ ${rec.target}`}
      width={440}
      onClose={onClose}
      footer={
        <>
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
          <HeaderButton
            variant="danger"
            icon={<Trash2 size={13} />}
            onClick={onClose}
          >
            Delete relationship
          </HeaderButton>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 8,
          border: `1px solid var(--cg-danger-border)`,
          background: "var(--cg-danger-bg)",
          color: T.danger,
          fontSize: 12.5,
        }}
      >
        <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          Deleting <strong>{rec.name}</strong> permanently removes this logical
          relationship, its shared governance context and connected-resource
          links. This is a destructive action and cannot be undone. Consider
          <em> Archive</em> instead to preserve audit history.
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <KVGrid
          items={[
            { k: "Relationship Type", v: rec.relationshipType },
            { k: "Category", v: rec.category },
            { k: "Owner", v: rec.owner },
            { k: "Status", v: rec.status },
          ]}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
          fontSize: 11.5,
          color: T.textMuted,
        }}
      >
        <Eye size={13} /> This deletion will be written to the immutable audit
        log.
      </div>
    </Drawer>
  );
}

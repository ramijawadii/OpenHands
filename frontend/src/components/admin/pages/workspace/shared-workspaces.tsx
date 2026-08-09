/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspaces → Shared Workspaces */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Share2,
  Download,
  RefreshCcw,
  UserCog,
  Handshake,
  FileText,
  ShieldCheck,
  ClipboardCheck,
  Scale,
  Archive,
  LayoutGrid,
  Boxes,
  Network,
  KeyRound,
  BadgeCheck,
  Activity as ActivityIcon,
  History,
  Building2,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
  Card,
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
 * Shared Workspaces — the enterprise collaboration surface for Workspace Administration.
 * Authoritative spec:
 * docs/workspace/workspace_module/…/00_Workspaces/shared_workspaces.md.
 *
 * A Shared Workspace lets multiple workspaces, business units, or enterprise teams consume common
 * resources (shared SecOps, central compliance, platform engineering, shared cloud infra / AI
 * services / knowledge bases, enterprise integrations) while keeping governance boundaries. Every
 * share is governed through explicit trust relationships, resource-sharing policies and access
 * controls. This view reuses the Enterprise-Administration UX pattern shared with the Users module:
 * Banner · Toolbar · Filters · Search · Data Table · Bulk/Row actions · Shared Workspace Detail
 * Drawer (9 sub-tabs) — plus the spec's Operational Dashboard and Resource Dependency Graph.
 *
 * There is no shared-workspace backend yet, so the set is representative sample data (tagged
 * `Sample` in the UI). When admin/org_model.py + the sharing/trust engine land, swap
 * SAMPLE_SHARES for the live query — the component API stays identical.
 */

// ── Sub-navigation (spec §Navigation: 6 sub-views) ─────────────────────────────────────────────────
const TYPE_TABS = [
  { id: "all", label: "All", Icon: LayoutGrid },
  { id: "enterprise", label: "Enterprise Shared", Icon: Building2 },
  { id: "department", label: "Department Shared", Icon: UserCog },
  { id: "cross", label: "Cross-Workspace", Icon: Network },
  { id: "services", label: "Shared Services", Icon: Boxes },
  { id: "external", label: "External Collaboration", Icon: Handshake },
  { id: "archived", label: "Archived Shares", Icon: Archive },
];

// map sub-nav id → the share-type it filters (archived is handled separately by lifecycle).
const TAB_TYPE: Record<string, string | null> = {
  all: null,
  enterprise: "Enterprise Shared",
  department: "Department Shared",
  cross: "Cross-Workspace",
  services: "Shared Services",
  external: "External Collaboration",
  archived: null,
};

const SHARE_TYPES = [
  "Enterprise Shared",
  "Department Shared",
  "Cross-Workspace",
  "Shared Services",
  "External Collaboration",
];
const SHARING_SCOPES = [
  "Organization",
  "Business Unit",
  "Cross-Workspace",
  "External",
];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const COMPLIANCE_PROFILES = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
];
const GOVERNANCE_PROFILES = ["Strict", "Balanced", "Relaxed"];
const OWNERS = [
  "Security Team",
  "Alice Smith",
  "David Chen",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
];
const SUPPORT_TEAMS = [
  "Platform SRE",
  "SecOps On-call",
  "Cloud CoE",
  "Compliance Desk",
];

type TrustStatus = "Trusted" | "Pending" | "Untrusted" | "Revoked";
type Health = "Healthy" | "Degraded" | "At Risk";
type Status = "Active" | "Suspended" | "Archived";

const TRUST_STATUSES: TrustStatus[] = [
  "Trusted",
  "Pending",
  "Untrusted",
  "Revoked",
];

const RESOURCE_CATEGORIES = [
  "AWS Accounts",
  "Azure Subscriptions",
  "Google Cloud Projects",
  "Kubernetes Clusters",
  "Repositories",
  "Knowledge Bases",
  "AI Agents",
  "Prompt Libraries",
  "MCP Servers",
  "Storage",
  "Integrations",
];

interface SharedWsRecord {
  id: string;
  name: string;
  description: string;
  shareType: string;
  businessUnit: string;
  environment: string;
  sharingScope: string;
  owner: string;
  businessOwner: string;
  technicalOwner: string;
  delegatedAdmins: string[];
  supportTeam: string;
  complianceProfile: string;
  governanceProfile: string;
  trustStatus: TrustStatus;
  health: Health;
  status: Status;
  tags: string[];
  // statistics
  connectedWorkspaces: number;
  sharedResources: number;
  members: number;
  policies: number;
  integrations: number;
  complianceStandards: number;
  trustRelationships: number;
  // operational dashboard
  policyViolations: number;
  complianceScore: number;
  syncStatus: string;
  healthScore: number;
  created: string;
  modified: string;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative shared-workspace set (spec Example seeds row 0 = Enterprise SOC).
const SAMPLE_SHARES: SharedWsRecord[] = Array.from({ length: 15 }, (_, i) => {
  const id = `SHR-${(310 + i * 6).toString().padStart(5, "0")}`;
  const n = hashId(id);
  const archived = i % 6 === 5;
  const status: Status = archived
    ? "Archived"
    : n % 9 === 0
      ? "Suspended"
      : "Active";
  const shareType = pick(SHARE_TYPES, i);
  const health: Health =
    n % 7 === 0 ? "At Risk" : n % 4 === 0 ? "Degraded" : "Healthy";
  const trustStatus = pick(TRUST_STATUSES, n);
  const bu = pick(BUSINESS_UNITS, n);
  const owner = pick(OWNERS, n);
  const first = i === 0;
  return {
    id,
    name: first ? "Enterprise SOC" : `${bu} ${shareType.split(" ")[0]} Hub`,
    description: first
      ? "Shared Security Operations workspace consumed by every business unit for central detection, response and evidence."
      : `${shareType} workspace providing common resources to the ${bu} business unit and connected teams.`,
    shareType: first ? "Shared Services" : shareType,
    businessUnit: first ? "Security" : bu,
    environment: pick(ENVIRONMENTS, n >> 2),
    sharingScope: pick(SHARING_SCOPES, n >> 1),
    owner: first ? "Security Team" : owner,
    businessOwner: pick(OWNERS.slice(1), n + 1),
    technicalOwner: pick(OWNERS.slice(1), n + 2),
    delegatedAdmins: [
      pick(OWNERS.slice(1), n + 3),
      pick(OWNERS.slice(1), n + 4),
    ],
    supportTeam: pick(SUPPORT_TEAMS, n),
    complianceProfile: pick(COMPLIANCE_PROFILES, n),
    governanceProfile: pick(GOVERNANCE_PROFILES, n),
    trustStatus: first ? "Trusted" : trustStatus,
    health: first ? "Healthy" : health,
    status,
    tags: ["shared", shareType.split(" ")[0].toLowerCase(), bu.toLowerCase()],
    connectedWorkspaces: first ? 14 : 2 + (n % 26),
    sharedResources: first ? 128 : 6 + (n % 180),
    members: 6 + (n % 80),
    policies: 4 + (n % 22),
    integrations: 2 + (n % 9),
    complianceStandards: 1 + (n % 4),
    trustRelationships: 1 + (n % 18),
    policyViolations: n % 5,
    complianceScore: 70 + (n % 30),
    syncStatus: n % 5 === 0 ? "Pending" : "Synchronized",
    healthScore: 72 + (n % 28),
    created: "2025-10-12",
    modified: "2026-06-24",
  };
});

const TRUST_TONE: Record<TrustStatus, string> = {
  Trusted: T.success,
  Pending: T.warning,
  Untrusted: T.textMuted,
  Revoked: T.danger,
};
const HEALTH_TONE: Record<Health, string> = {
  Healthy: T.success,
  Degraded: T.warning,
  "At Risk": T.danger,
};
const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Suspended: T.warning,
  Archived: T.textMuted,
};

function Dot({ color, label }: { color: string; label: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color,
      }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: color }}
      />
      {label}
    </span>
  );
}
function TrustBadge({ status }: { status: TrustStatus }) {
  return <Dot color={TRUST_TONE[status]} label={status} />;
}
function HealthBadge({ health }: { health: Health }) {
  return <Dot color={HEALTH_TONE[health]} label={health} />;
}
function StatusBadge({ status }: { status: Status }) {
  return <Dot color={STATUS_TONE[status]} label={status} />;
}

/**
 * Embeddable body — sub-navigation + operational dashboard + directory + resource dependency graph +
 * detail drawer, WITHOUT the outer <Page> or the page banner. Rendered both as the standalone route
 * (via SharedWorkspacesPage) and as a tab of the Workspace Management console. Uses local state for
 * the type sub-nav so it never collides with a host page's `?tab=` param.
 */
export function SharedWorkspacesView() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("all");

  // Filters (spec §Filters)
  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fScope, setFScope] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fTrust, setFTrust] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fHealth, setFHealth] = React.useState("");
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

  const records = SAMPLE_SHARES;
  const tabType = TAB_TYPE[tab];

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (tab === "archived"
        ? r.status === "Archived"
        : (!tabType || r.shareType === tabType) && r.status !== "Archived") &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.shareType.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))) &&
      (!fType || r.shareType === fType) &&
      (!fScope || r.sharingScope === fScope) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fOwner || r.owner === fOwner) &&
      (!fTrust || r.trustStatus === fTrust) &&
      (!fCompliance || r.complianceProfile === fCompliance) &&
      (!fEnv || r.environment === fEnv) &&
      (!fHealth || r.health === fHealth) &&
      (!fStatus || r.status === fStatus)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFScope("");
    setFBu("");
    setFOwner("");
    setFTrust("");
    setFCompliance("");
    setFEnv("");
    setFHealth("");
    setFStatus("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational Dashboard aggregates (spec §Operational Dashboard) ──
  const active = records.filter((r) => r.status !== "Archived");
  const totalConnected = active.reduce((s, r) => s + r.connectedWorkspaces, 0);
  const totalResources = active.reduce((s, r) => s + r.sharedResources, 0);
  const totalTrusts = active.reduce((s, r) => s + r.trustRelationships, 0);
  const totalViolations = active.reduce((s, r) => s + r.policyViolations, 0);
  const avgCompliance = active.length
    ? Math.round(
        active.reduce((s, r) => s + r.complianceScore, 0) / active.length,
      )
    : 0;
  const syncedPct = active.length
    ? Math.round(
        (active.filter((r) => r.syncStatus === "Synchronized").length /
          active.length) *
          100,
      )
    : 0;
  const avgHealth = active.length
    ? Math.round(active.reduce((s, r) => s + r.healthScore, 0) / active.length)
    : 0;

  // ── Toolbar (spec §Toolbar: Create · Share · Administrative · Governance) ──
  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Shared Workspace",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=requests"),
    },
    {
      key: "share",
      label: "Share Existing Workspace",
      icon: <Share2 size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=requests"),
    },
    {
      key: "trust",
      label: "Manage Trust Relationships",
      icon: <Handshake size={15} />,
      disabled: true,
    },
    {
      key: "owners",
      label: "Assign Owners",
      icon: <UserCog size={15} />,
      disabled: true,
    },
    {
      key: "sync",
      label: "Synchronize",
      icon: <RefreshCcw size={15} />,
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
      key: "review-access",
      label: "Review Access",
      icon: <KeyRound size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Sharing",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<SharedWsRecord>[] = [
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
          <Share2 size={14} color={T.textMuted} />
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
      key: "type",
      header: "Type",
      sortValue: (r) => r.shareType,
      render: (r) => r.shareType,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "connected",
      header: "Connected Workspaces",
      sortValue: (r) => r.connectedWorkspaces,
      render: (r) => r.connectedWorkspaces,
    },
    {
      key: "resources",
      header: "Shared Resources",
      sortValue: (r) => r.sharedResources,
      render: (r) => r.sharedResources.toLocaleString(),
    },
    {
      key: "trust",
      header: "Trust Status",
      sortValue: (r) => r.trustStatus,
      render: (r) => <TrustBadge status={r.trustStatus} />,
    },
    {
      key: "health",
      header: "Health",
      sortValue: (r) => r.health,
      render: (r) => <HealthBadge health={r.health} />,
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
      {/* ── Sub-navigation ── */}
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={tab}
          onChange={setTab}
          options={TYPE_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {/* ── Operational Dashboard (spec §Operational Dashboard) ── */}
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
        Operational dashboard <SampleTag />
      </div>
      <div style={{ marginBottom: 18 }}>
        <StatStripPlain
          items={[
            {
              label: "Connected Workspaces",
              value: totalConnected.toLocaleString(),
              tone: "ok",
            },
            {
              label: "Shared Resources",
              value: totalResources.toLocaleString(),
              tone: "ok",
            },
            {
              label: "Trust Relationships",
              value: totalTrusts.toLocaleString(),
              tone: "ok",
            },
            {
              label: "Policy Violations",
              value: totalViolations,
              tone: totalViolations === 0 ? "ok" : "warn",
            },
            {
              label: "Compliance Score",
              value: `${avgCompliance}%`,
              tone: avgCompliance >= 85 ? "ok" : "warn",
            },
            {
              label: "Synchronization Status",
              value: `${syncedPct}%`,
              tone: syncedPct >= 90 ? "ok" : "warn",
            },
            {
              label: "Health Score",
              value: `${avgHealth}%`,
              tone: avgHealth >= 85 ? "ok" : "warn",
            },
          ]}
        />
      </div>

      <DiscoveryListView
        title="Shared workspace directory"
        commands={toolbar}
        pills={[
          {
            key: "type",
            label: "Workspace Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.shareType)),
          },
          {
            key: "scope",
            label: "Sharing Scope",
            value: fScope,
            onChange: setFScope,
            options: facet(records.map((r) => r.sharingScope)),
          },
          {
            key: "bu",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "owner",
            label: "Owner",
            value: fOwner,
            onChange: setFOwner,
            options: facet(records.map((r) => r.owner)),
          },
          {
            key: "trust",
            label: "Trust Status",
            value: fTrust,
            onChange: setFTrust,
            options: facet(records.map((r) => r.trustStatus)),
          },
          {
            key: "compliance",
            label: "Compliance Profile",
            value: fCompliance,
            onChange: setFCompliance,
            options: facet(records.map((r) => r.complianceProfile)),
          },
          {
            key: "env",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "health",
            label: "Health",
            value: fHealth,
            onChange: setFHealth,
            options: facet(records.map((r) => r.health)),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
        ]}
        presets={[{ label: "All shared", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search shared workspaces — name, business unit, owner, shared resources, connected workspaces, tags…"
        count={rows.length}
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={15}
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Scale size={13} />} onClick={clear}>
              Assign Governance
            </HeaderButton>
            <HeaderButton icon={<RefreshCcw size={13} />} onClick={clear}>
              Synchronize
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
              { label: "Open", onClick: () => setSelId(r.id) },
              { label: "Edit", onClick: () => setSelId(r.id) },
              { label: "Manage Sharing", onClick: () => setSelId(r.id) },
              { label: "Manage Trust", onClick: () => setSelId(r.id) },
              { label: "Synchronize", onClick: () => {} },
              { label: "Export", onClick: () => {} },
              { label: "Archive", onClick: () => {} },
              { label: "Delete", onClick: () => {}, danger: true },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Share2 size={20} />}
            title="No shared workspaces found."
            hint="Adjust filters, create a shared workspace, or share an existing workspace to get started."
            cta="Create Shared Workspace"
            onCta={() => navigate("/admin/workspaces?tab=requests")}
          />
        }
      />

      {/* ── Resource Dependency Graph (spec §Resource Dependency Graph) ── */}
      <Card
        title="Resource dependency graph"
        desc="End-to-end visibility of shared-resource usage — from the shared workspace, through each shared resource, to the consuming workspaces and their consumers."
        right={<SampleTag />}
      >
        <Viz
          lines={[
            "Shared Workspace",
            "        │",
            " ├───────────────┐",
            " │               │",
            "Shared Resource  Shared Resource",
            " │               │",
            "Workspace A    Workspace B",
            " │               │",
            "Consumers      Consumers",
          ]}
        />
      </Card>

      {sel && (
        <SharedWorkspaceDetailDrawer rec={sel} onClose={() => setSelId(null)} />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function SharedWorkspacesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Shared Workspaces"
        subtitle="Manage enterprise shared workspaces, trust relationships, shared resources, and cross-workspace collaboration."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              icon={<Share2 size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=requests")}
            >
              Share Existing Workspace
            </HeaderButton>
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=requests")}
            >
              Create Shared Workspace
            </HeaderButton>
          </>
        }
      />
      <SharedWorkspacesView />
    </Page>
  );
}

// ── Shared visualization block — renders the spec's ASCII trust/dependency diagrams ────────────────
function Viz({ lines }: { lines: string[] }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: "14px 16px",
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        background: "var(--cg-accent-bg-strong)",
        color: T.textNav,
        fontFamily: "monospace",
        fontSize: 12,
        lineHeight: 1.6,
        overflowX: "auto",
        whiteSpace: "pre",
      }}
    >
      {lines.join("\n")}
    </pre>
  );
}

// ════════════ Shared Workspace Detail Drawer — 9 sub-tabs (spec §Shared Workspace Detail Drawer) ════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "resources", label: "Shared Resources", icon: <Boxes size={13} /> },
  {
    id: "connected",
    label: "Connected Workspaces",
    icon: <Network size={13} />,
  },
  { id: "trust", label: "Trust Relationships", icon: <Handshake size={13} /> },
  { id: "access", label: "Access Policies", icon: <KeyRound size={13} /> },
  { id: "governance", label: "Governance", icon: <Scale size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function SharedWorkspaceDetailDrawer({
  rec,
  onClose,
}: {
  rec: SharedWsRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.shareType} · ${rec.status} · ${rec.owner} · ${rec.connectedWorkspaces} connected · ${rec.sharedResources.toLocaleString()} shared resources`}
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
          <HeaderButton icon={<Share2 size={13} />}>
            Manage Sharing
          </HeaderButton>
          <HeaderButton icon={<RefreshCcw size={13} />}>
            Synchronize
          </HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton variant="primary" icon={<FileText size={13} />}>
            Edit
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "resources" && <SharedResourcesTab rec={rec} />}
      {tab === "connected" && <ConnectedWorkspacesTab rec={rec} />}
      {tab === "trust" && <TrustRelationshipsTab rec={rec} />}
      {tab === "access" && <AccessPoliciesTab rec={rec} />}
      {tab === "governance" && <GovernanceTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
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

// ── Overview (General · Ownership · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "ownership", label: "Ownership" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: SharedWsRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Workspace Name", v: rec.name },
              { k: "Workspace Type", v: rec.shareType },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Sharing Scope", v: rec.sharingScope },
              { k: "Status", v: <StatusBadge status={rec.status} /> },
              { k: "Created", v: rec.created },
              { k: "Modified", v: rec.modified },
              { k: "Trust Status", v: <TrustBadge status={rec.trustStatus} /> },
            ]}
          />
          <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
            {rec.description}
          </div>
        </Section>
      )}

      {sub === "ownership" && (
        <Section title="Ownership" sample>
          <KVGrid
            items={[
              { k: "Business Owner", v: rec.businessOwner, sample: true },
              { k: "Technical Owner", v: rec.technicalOwner, sample: true },
              {
                k: "Delegated Administrators",
                v: rec.delegatedAdmins.join(", "),
                sample: true,
              },
              { k: "Support Team", v: rec.supportTeam, sample: true },
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
                k: "Connected Workspaces",
                v: rec.connectedWorkspaces,
                sample: true,
              },
              { k: "Shared Resources", v: rec.sharedResources, sample: true },
              { k: "Members", v: rec.members, sample: true },
              { k: "Policies", v: rec.policies, sample: true },
              { k: "Integrations", v: rec.integrations, sample: true },
              {
                k: "Compliance Standards",
                v: rec.complianceStandards,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Shared Resources (spec §Shared Resources) ──
function SharedResourcesTab({ rec }: { rec: SharedWsRecord }) {
  const n = hashId(rec.id);
  const PERMISSIONS = ["Read", "Read/Write", "Admin", "Consume"];
  const rows = Array.from({ length: 8 }, (_, i) => {
    const category = pick(RESOURCE_CATEGORIES, n + i);
    return {
      id: `${rec.id}-res-${i}`,
      resource: `${category.split(" ")[0].toLowerCase()}-${(1000 + ((n + i) % 8999)).toString()}`,
      category,
      permission: pick(PERMISSIONS, n + i),
      sharedWith: `${1 + ((n + i) % 8)} workspace${1 + ((n + i) % 8) === 1 ? "" : "s"}`,
      inherited: (n + i) % 3 === 0 ? "Inherited" : "Direct",
      status: i % 5 === 0 ? "Restricted" : "Shared",
    };
  });
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "category", header: "Category", render: (r) => r.category },
    { key: "permission", header: "Permission", render: (r) => r.permission },
    { key: "with", header: "Shared With", render: (r) => r.sharedWith },
    {
      key: "inherited",
      header: "Inherited",
      render: (r) => (
        <span
          style={{ color: r.inherited === "Direct" ? T.textNav : T.textMuted }}
        >
          {r.inherited}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span style={{ color: r.status === "Shared" ? T.success : T.warning }}>
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
        Every resource shared by this workspace <SampleTag />
      </div>
      <Section title="Shared resource categories">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {RESOURCE_CATEGORIES.map((c) => (
            <span
              key={c}
              style={{
                fontSize: 11.5,
                color: T.textNav,
                border: `1px solid ${T.border}`,
                borderRadius: 99,
                padding: "3px 10px",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </Section>
      <ToolbarRow
        buttons={["Share Resource", "Remove Resource", "Export"]}
        sample
      />
      <DirectoryTable columns={cols} rows={rows} pageSize={8} />
    </>
  );
}

// ── Connected Workspaces (spec §Connected Workspaces) ──
function ConnectedWorkspacesTab({ rec }: { rec: SharedWsRecord }) {
  const n = hashId(rec.id);
  const PERMISSION_LEVELS = ["Consumer", "Contributor", "Delegated Admin"];
  const rows = Array.from(
    { length: Math.min(8, rec.connectedWorkspaces) },
    (_, i) => ({
      id: `${rec.id}-cw-${i}`,
      workspace: `${pick(BUSINESS_UNITS, n + i)} ${pick(ENVIRONMENTS, n + i).split("-")[0]}`,
      businessUnit: pick(BUSINESS_UNITS, n + i),
      environment: pick(ENVIRONMENTS, n + i),
      permission: pick(PERMISSION_LEVELS, n + i),
      since: `2026-0${1 + ((n + i) % 6)}-${(1 + ((n + i) % 27)).toString().padStart(2, "0")}`,
      status: i % 6 === 0 ? "Suspended" : "Connected",
    }),
  );
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "bu", header: "Business Unit", render: (r) => r.businessUnit },
    { key: "env", header: "Environment", render: (r) => r.environment },
    {
      key: "permission",
      header: "Permission Level",
      render: (r) => r.permission,
    },
    { key: "since", header: "Connected Since", render: (r) => r.since },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Connected" ? T.success : T.warning }}
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
          fontSize: 12.5,
          color: T.textMuted,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Every workspace consuming shared resources <SampleTag />
      </div>
      <ToolbarRow
        buttons={["Connect Workspace", "Disconnect Workspace", "Export"]}
        sample
      />
      <DirectoryTable columns={cols} rows={rows} pageSize={8} />
      <Section title="Connectivity">
        <Viz
          lines={[
            "Shared Workspace",
            "        │",
            " ├──────────────┐",
            " │              │",
            "Workspace A   Workspace B",
            " │              │",
            "Workspace C   Workspace D",
          ]}
        />
      </Section>
    </>
  );
}

// ── Trust Relationships (spec §Trust Relationships) ──
function TrustRelationshipsTab({ rec }: { rec: SharedWsRecord }) {
  const n = hashId(rec.id);
  const TRUST_TYPES = ["Explicit", "Federated", "Inherited", "Conditional"];
  const DIRECTIONS = ["Inbound", "Outbound", "Bidirectional"];
  const rows = Array.from(
    { length: Math.min(8, rec.trustRelationships) },
    (_, i) => ({
      id: `${rec.id}-trust-${i}`,
      workspace: `${pick(BUSINESS_UNITS, n + i)} ${pick(ENVIRONMENTS, n + i).split("-")[0]}`,
      trustType: pick(TRUST_TYPES, n + i),
      direction: pick(DIRECTIONS, n + i),
      established: `2026-0${1 + ((n + i) % 6)}-${(1 + ((n + i) % 27)).toString().padStart(2, "0")}`,
      status: pick(TRUST_STATUSES, n + i),
    }),
  );
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "type", header: "Trust Type", render: (r) => r.trustType },
    { key: "direction", header: "Direction", render: (r) => r.direction },
    { key: "established", header: "Established", render: (r) => r.established },
    {
      key: "status",
      header: "Status",
      render: (r) => <TrustBadge status={r.status} />,
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
        Which workspaces are allowed to consume shared resources <SampleTag />
      </div>
      <ToolbarRow
        buttons={["Create Trust", "Remove Trust", "Validate Trust", "Export"]}
        sample
      />
      <DirectoryTable columns={cols} rows={rows} pageSize={8} />
      <Section title="Trust flow">
        <Viz
          lines={[
            "Workspace A",
            "      │",
            "      ▼",
            "Trust Policy",
            "      │",
            "      ▼",
            "Shared Workspace",
          ]}
        />
      </Section>
    </>
  );
}

// ── Access Policies (spec §Access Policies) ──
const ACCESS_SUBS = [
  { id: "permission-profiles", label: "Permission Profiles" },
  { id: "resource-permissions", label: "Resource Permissions" },
  { id: "approval-policies", label: "Approval Policies" },
  { id: "conditional-access", label: "Conditional Access" },
  { id: "expiration-policies", label: "Expiration Policies" },
];
function AccessPoliciesTab({ rec }: { rec: SharedWsRecord }) {
  const [sub, setSub] = React.useState("permission-profiles");
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
        How consumers access shared assets <SampleTag />
      </div>
      <Tabs tabs={ACCESS_SUBS} active={sub} onChange={setSub} />
      {sub === "permission-profiles" && (
        <Section title="Permission Profiles" sample>
          <StatRow
            label="Default Permission Profile"
            value="Consumer (read-only)"
            sample
          />
          <StatRow label="Elevated Profile" value="Contributor" sample />
          <StatRow
            label="Administrative Profile"
            value="Delegated Admin"
            sample
          />
        </Section>
      )}
      {sub === "resource-permissions" && (
        <Section title="Resource Permissions" sample>
          <StatRow
            label="Cloud Resources"
            value={`${rec.sharedResources.toLocaleString()} scoped`}
            sample
          />
          <StatRow label="Knowledge Bases" value="Read" sample />
          <StatRow label="AI Agents" value="Consume" sample />
          <StatRow label="Integrations" value="Read/Write" sample />
        </Section>
      )}
      {sub === "approval-policies" && (
        <Section title="Approval Policies" sample>
          <StatRow label="Access Requests" value="2-of-3 approvers" sample />
          <StatRow
            label="Resource Sharing"
            value="Owner approval required"
            sample
          />
        </Section>
      )}
      {sub === "conditional-access" && (
        <Section title="Conditional Access" sample>
          <StatRow
            label="Trusted Networks Only"
            value="Enabled"
            tone="ok"
            sample
          />
          <StatRow label="MFA Required" value="Enabled" tone="ok" sample />
          <StatRow
            label="Device Compliance"
            value="Required"
            tone="ok"
            sample
          />
        </Section>
      )}
      {sub === "expiration-policies" && (
        <Section title="Expiration Policies" sample>
          <StatRow label="Access Expiration" value="90 days" sample />
          <StatRow label="Trust Expiration" value="365 days" sample />
          <StatRow label="Auto-revoke on Inactivity" value="30 days" sample />
        </Section>
      )}
      <ToolbarRow
        buttons={["Assign Policy", "Remove Policy", "Validate Policy"]}
      />
    </>
  );
}

// ── Governance (spec §Governance) ──
const GOVERNANCE_SUBS = [
  { id: "governance", label: "Governance" },
  { id: "inheritance", label: "Policy Inheritance" },
];
function GovernanceTab({ rec }: { rec: SharedWsRecord }) {
  const [sub, setSub] = React.useState("governance");
  return (
    <>
      <Tabs tabs={GOVERNANCE_SUBS} active={sub} onChange={setSub} />
      {sub === "governance" && (
        <Section title="Governance" sample>
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
          <StatRow
            label="Sharing Policies"
            value="Resource-scoped sharing enforced"
            sample
          />
          <StatRow label="Capacity Limits" value="Standard tier" sample />
          <StatRow label="Approval Policies" value="2-of-3 approvers" sample />
        </Section>
      )}
      {sub === "inheritance" && (
        <Section title="Policy inheritance">
          <Viz
            lines={[
              "Organization Policy",
              "        │",
              "Shared Workspace Policy",
              "        │",
              "Effective Configuration",
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Compliance (spec §Compliance) ──
function ComplianceTab({ rec }: { rec: SharedWsRecord }) {
  return (
    <>
      <Section title="Compliance" sample>
        <StatRow
          label="Compliance Frameworks"
          value={rec.complianceProfile}
          sample
        />
        <StatRow label="Assigned Controls" value="128 controls" sample />
        <StatRow label="Assessment Schedule" value="Quarterly" sample />
        <StatRow label="Evidence Collection" value="Automated" sample />
        <StatRow
          label="Compliance Status"
          value={`${rec.complianceScore}%`}
          tone={rec.complianceScore >= 85 ? "ok" : "warn"}
          sample
        />
      </Section>
      <ToolbarRow buttons={["Run Assessment", "Generate Report"]} />
    </>
  );
}

// ── Activity (timeline + filters) ──
function ActivityTab() {
  const events = [
    "Workspace Shared",
    "Workspace Connected",
    "Workspace Disconnected",
    "Resource Shared",
    "Resource Removed",
    "Trust Created",
    "Trust Revoked",
    "Policy Updated",
  ];
  const CATEGORIES = ["Sharing", "Trust", "Policy", "Connectivity"];
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
        Shared workspace activity timeline <SampleTag />
      </div>
      {/* Activity filters (spec: Actor · Date · Category) */}
      <FilterBar searchPlaceholder="Filter activity…">
        <Select
          label="Actor"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "All actors" },
            ...OWNERS.map((o) => ({ value: o, label: o })),
          ]}
        />
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "All dates" },
            { value: "24h", label: "Last 24 hours" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
          ]}
        />
        <Select
          label="Category"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "All categories" },
            ...CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
        />
      </FilterBar>
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
                {pick(OWNERS, i)} · {pick(CATEGORIES, i)} ·{" "}
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
    "Shared Workspace Created",
    "Sharing Policy Updated",
    "Workspace Connected",
    "Workspace Removed",
    "Trust Created",
    "Trust Removed",
    "Permission Updated",
    "Compliance Assigned",
    "Workspace Archived",
    "Workspace Deleted",
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

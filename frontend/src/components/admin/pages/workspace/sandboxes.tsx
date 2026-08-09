/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspaces → Sandboxes */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Copy,
  Download,
  RefreshCcw,
  RotateCcw,
  Clock,
  PauseCircle,
  PlayCircle,
  Archive,
  Trash2,
  ShieldCheck,
  ClipboardCheck,
  LayoutGrid,
  Boxes,
  Bot,
  Scale,
  BadgeCheck,
  Cable,
  History,
  Activity as ActivityIcon,
  FlaskConical,
  Cloud,
  Cpu,
  Layers,
  Timer,
  FileText,
  ArrowRight,
  Ban,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
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
  ConfirmButton,
  PostureCard,
  PostureGrid,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Sandboxes — isolated, temporary, or experimental workspaces used to safely evaluate cloud
 * configurations, AI agents, compliance policies, integrations, and operational changes without
 * impacting production. Authoritative spec:
 * docs/workspace/workspace_module/…/00_Workspaces/sandboxes.md.
 *
 * Every sandbox is governed by organizational security policies, resource quotas, lifecycle policies
 * and expiration rules; sandboxes inherit organizational governance/compliance/AI-security/resource
 * policies while enforcing stricter quotas and lifecycle controls. This view reuses the
 * Enterprise-Administration UX pattern shared with the Users module: Banner · Toolbar · Filters ·
 * Search · Data Table · Bulk/Row actions · Sandbox Detail Drawer (8 sub-tabs) — plus the spec's
 * Operational Dashboard, Resource Consumption and Expiration Timeline surfaces.
 *
 * There is no sandbox backend yet, so the set is representative sample data (tagged `Sample` in the
 * UI). When admin/org_model.py + the sandbox lifecycle engine land, swap SAMPLE_SANDBOXES for the
 * live query — the component API stays identical.
 */

const ME = "You (current admin)";

// ── Status model (drives the sub-navigation) ──────────────────────────────────────────────────────
type Status =
  | "Active"
  | "Scheduled"
  | "Suspended"
  | "Expired"
  | "Archived"
  | "Template";

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Scheduled: T.accent,
  Suspended: T.warning,
  Expired: T.danger,
  Archived: T.textMuted,
  Template: T.purple,
};

type Health = "Healthy" | "Degraded" | "Unhealthy" | "Unknown";
const HEALTH_TONE: Record<Health, string> = {
  Healthy: T.success,
  Degraded: T.warning,
  Unhealthy: T.danger,
  Unknown: T.textMuted,
};

// Sub-navigation (spec § Navigation) — All prepended for operability.
const NAV_TABS = [
  { id: "all", label: "All", Icon: LayoutGrid },
  { id: "active", label: "Active", Icon: PlayCircle },
  { id: "scheduled", label: "Scheduled", Icon: Clock },
  { id: "expiring", label: "Expiring Soon", Icon: Timer },
  { id: "suspended", label: "Suspended", Icon: PauseCircle },
  { id: "expired", label: "Expired", Icon: Ban },
  { id: "templates", label: "Templates", Icon: Copy },
  { id: "archived", label: "Archived", Icon: Archive },
];

// ── Facet vocabularies (spec § Toolbar wizard / § Filters) ────────────────────────────────────────
const PURPOSES = [
  "Proof of Concept",
  "AI Agent Testing",
  "Compliance Validation",
  "Security Validation",
  "Cloud Architecture Experiment",
  "Integration Development",
  "Training & Education",
  "Customer Demonstration",
];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const ENVIRONMENTS = ["Sandbox", "Development", "Pre-production", "Isolated"];
const CLOUD_PROVIDERS = ["AWS", "Azure", "Google Cloud", "Multi-Cloud"];
const REGIONS = ["us-east-1", "eu-west-1", "ap-south-1", "us-west-2"];
const COMPLIANCE_PROFILES = [
  "CIS Benchmark",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
  "ISO 27001",
];
const GOVERNANCE_PROFILES = ["Strict", "Balanced", "Relaxed"];
const AI_RUNTIMES = ["Isolated Runtime", "Shared Runtime", "GPU Runtime"];
const WS_TEMPLATES = [
  "Compliance Lab baseline",
  "AI Agent Lab baseline",
  "Security Lab baseline",
  "Cloud Architecture baseline",
  "Integration Lab baseline",
];
const OWNERS = [ME, "Security Team", "Priya Nair", "Marco Rossi", "Sara Ahmed"];
const RETENTION_POLICIES = ["7-day retain", "30-day retain", "90-day retain"];
const ORIGINS = [
  "Workspace Templates",
  "Active Workspaces",
  "Workspace Requests",
  "Automation Jobs",
];

interface SandboxRecord {
  id: string;
  name: string;
  description: string;
  purpose: string;
  environment: string;
  businessUnit: string;
  owner: string;
  cloudProvider: string;
  region: string;
  complianceProfile: string;
  governanceProfile: string;
  aiRuntime: string;
  workspaceTemplate: string;
  tags: string[];
  created: string; // absolute date
  createdAgo: string; // relative label
  expirationDate: string; // absolute date (or "—")
  remainingDays: number | null; // null = no expiration (Template/Archived)
  autoCleanup: boolean;
  retentionPolicy: string;
  originatedFrom: string;
  lastModified: string;
  resources: number;
  aiAgents: number;
  integrations: number;
  policies: number;
  cloudAccounts: number;
  complianceStandards: number;
  runningJobs: number;
  compute: number; // % quota utilisation
  storage: number;
  network: number;
  budget: number;
  health: Health;
  status: Status;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative sandbox set covering every spec state.
const STATUS_CYCLE: Status[] = [
  "Active",
  "Active",
  "Scheduled",
  "Suspended",
  "Expired",
  "Archived",
  "Template",
  "Active",
  "Suspended",
  "Template",
  "Archived",
  "Scheduled",
  "Expired",
  "Active",
  "Active",
];

const SAMPLE_SANDBOXES: SandboxRecord[] = Array.from({ length: 15 }, (_, i) => {
  const id = `WS-SBX-${(1040 + i * 3).toString().padStart(4, "0")}`;
  const n = hashId(id);
  const status = STATUS_CYCLE[i];
  const remainingDays =
    status === "Template" || status === "Archived"
      ? null
      : status === "Expired"
        ? -(1 + (n % 20))
        : status === "Scheduled"
          ? 18 + (n % 20)
          : pick([2, 4, 6, 9, 14, 21, 45], n); // Active / Suspended
  const createdDay = 1 + (n % 27);
  const expDay = 1 + ((n + 12) % 27);
  return {
    id,
    name: `${pick(["AWS", "Azure", "GCP", "Multi"], n)} ${pick(["CIS", "SOC2", "PCI", "Agent", "Arch"], n >> 2)} ${pick(["Validation", "Lab", "Trial", "Demo", "Sandbox"], n >> 3)}`,
    description: `Isolated ${pick(PURPOSES, n).toLowerCase()} sandbox for the ${pick(BUSINESS_UNITS, n)} team.`,
    purpose: pick(PURPOSES, n),
    environment: pick(ENVIRONMENTS, n >> 1),
    businessUnit: pick(BUSINESS_UNITS, n),
    owner: pick(OWNERS, n),
    cloudProvider: pick(CLOUD_PROVIDERS, n >> 2),
    region: pick(REGIONS, n >> 3),
    complianceProfile: pick(COMPLIANCE_PROFILES, n),
    governanceProfile: pick(GOVERNANCE_PROFILES, n),
    aiRuntime: pick(AI_RUNTIMES, n),
    workspaceTemplate: pick(WS_TEMPLATES, n),
    tags: [
      pick(["env:sandbox", "env:dev"], n),
      `bu:${pick(BUSINESS_UNITS, n).toLowerCase()}`,
      `cost:${1000 + (n % 900)}`,
    ],
    created: `2026-06-${createdDay.toString().padStart(2, "0")}`,
    createdAgo: pick(
      ["3 Days Ago", "1 Week Ago", "12 Days Ago", "Yesterday", "5 Days Ago"],
      n,
    ),
    expirationDate:
      remainingDays == null
        ? "—"
        : `2026-07-${expDay.toString().padStart(2, "0")}`,
    remainingDays,
    autoCleanup: n % 3 !== 0,
    retentionPolicy: pick(RETENTION_POLICIES, n),
    originatedFrom: pick(ORIGINS, n),
    lastModified: `2026-07-${(1 + (n % 9)).toString().padStart(2, "0")}`,
    resources: 3 + (n % 22),
    aiAgents: n % 5,
    integrations: n % 6,
    policies: 4 + (n % 10),
    cloudAccounts: 1 + (n % 3),
    complianceStandards: 1 + (n % 4),
    runningJobs: n % 4,
    compute: 30 + (n % 65),
    storage: 20 + (n % 70),
    network: 15 + (n % 60),
    budget: 25 + (n % 70),
    health: pick<Health>(
      ["Healthy", "Healthy", "Degraded", "Unhealthy", "Unknown"],
      n,
    ),
    status,
  };
});

const expiringSoon = (r: SandboxRecord) =>
  (r.status === "Active" || r.status === "Suspended") &&
  r.remainingDays != null &&
  r.remainingDays >= 0 &&
  r.remainingDays <= 7;

function expirationLabel(r: SandboxRecord): { text: string; tone?: Health } {
  if (r.remainingDays == null) return { text: "No expiration" };
  if (r.remainingDays < 0)
    return {
      text: `Expired ${Math.abs(r.remainingDays)} days ago`,
      tone: "Unhealthy",
    };
  if (r.remainingDays <= 7)
    return { text: `${r.remainingDays} Days Remaining`, tone: "Degraded" };
  return { text: `${r.remainingDays} Days Remaining` };
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

function HealthBadge({ health }: { health: Health }) {
  const c = HEALTH_TONE[health];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: c }}
      />
      {health}
    </span>
  );
}

// ── Meter — quota utilisation bar (spec § Resource Consumption) ───────────────────────────────────
function Meter({ label, pct }: { label: string; pct: number }) {
  const tone = pct >= 85 ? T.danger : pct >= 65 ? T.warning : T.success;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: T.textNav,
        }}
      >
        <span>{label}</span>
        <span style={{ color: T.textMuted }}>{pct}%</span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 99,
          background: "var(--cg-bg-badge)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, pct)}%`,
            height: "100%",
            background: tone,
            borderRadius: 99,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Embeddable body — Operational Dashboard + Resource Consumption + Expiration Timeline + sub-nav +
 * directory + sandbox detail drawer, WITHOUT the outer <Page> or the page banner. Rendered both as
 * the standalone route and as a tab of the Workspace Management console. Uses local state for the
 * status sub-nav so it never collides with a host page's `?tab=`.
 */
export function SandboxesView() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("active");

  const [search, setSearch] = React.useState("");
  const [fPurpose, setFPurpose] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [fExpiration, setFExpiration] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fHealth, setFHealth] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_SANDBOXES;

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    const inTab =
      tab === "all"
        ? true
        : tab === "active"
          ? r.status === "Active"
          : tab === "scheduled"
            ? r.status === "Scheduled"
            : tab === "expiring"
              ? expiringSoon(r)
              : tab === "suspended"
                ? r.status === "Suspended"
                : tab === "expired"
                  ? r.status === "Expired"
                  : tab === "templates"
                    ? r.status === "Template"
                    : tab === "archived"
                      ? r.status === "Archived"
                      : true;
    const expBucket =
      r.remainingDays == null
        ? "None"
        : r.remainingDays < 0
          ? "Expired"
          : r.remainingDays <= 7
            ? "≤ 7 days"
            : r.remainingDays <= 14
              ? "≤ 14 days"
              : "> 14 days";
    return (
      inTab &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q) ||
        r.workspaceTemplate.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))) &&
      (!fPurpose || r.purpose === fPurpose) &&
      (!fEnv || r.environment === fEnv) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fOwner || r.owner === fOwner) &&
      (!fProvider || r.cloudProvider === fProvider) &&
      (!fCompliance || r.complianceProfile === fCompliance) &&
      (!fExpiration || expBucket === fExpiration) &&
      (!fStatus || r.status === fStatus) &&
      (!fHealth || r.health === fHealth)
    );
  });

  const clearFilters = () => {
    setSearch("");
    setFPurpose("");
    setFEnv("");
    setFBu("");
    setFOwner("");
    setFProvider("");
    setFCompliance("");
    setFExpiration("");
    setFStatus("");
    setFHealth("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Operational Dashboard aggregates (spec § Operational Dashboard).
  const activeCount = records.filter((r) => r.status === "Active").length;
  const expiringCount = records.filter(expiringSoon).length;
  const expiredCount = records.filter((r) => r.status === "Expired").length;
  const suspendedCount = records.filter((r) => r.status === "Suspended").length;
  const avgLifetime = Math.round(
    records.reduce((a, r) => a + (r.remainingDays ?? 30), 0) / records.length,
  );

  // Toolbar — Create/Clone + Administrative Actions + Operational Actions (spec § Toolbar).
  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Sandbox",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=sandboxes"),
    },
    {
      key: "clone",
      label: "Clone Existing Workspace",
      icon: <Copy size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=requests"),
    },
    {
      key: "extend",
      label: "Extend Expiration",
      icon: <Clock size={15} />,
      disabled: true,
    },
    {
      key: "suspend",
      label: "Suspend",
      icon: <PauseCircle size={15} />,
      disabled: true,
    },
    {
      key: "resume",
      label: "Resume",
      icon: <PlayCircle size={15} />,
      disabled: true,
    },
    {
      key: "archive",
      label: "Archive",
      icon: <Archive size={15} />,
      disabled: true,
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Trash2 size={15} />,
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
    {
      key: "sync",
      label: "Synchronize",
      icon: <Cable size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Configuration",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "assess",
      label: "Run Compliance Assessment",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "reset",
      label: "Reset Sandbox",
      icon: <RotateCcw size={15} />,
      disabled: true,
    },
  ];

  // Table columns — EXACTLY per spec § Table.
  const cols: Column<SandboxRecord>[] = [
    {
      key: "name",
      header: "Sandbox",
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
          <FlaskConical size={14} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    {
      key: "purpose",
      header: "Purpose",
      sortValue: (r) => r.purpose,
      render: (r) => r.purpose,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "provider",
      header: "Cloud Provider",
      sortValue: (r) => r.cloudProvider,
      render: (r) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Cloud size={13} color={T.textMuted} />
          {r.cloudProvider}
        </span>
      ),
    },
    {
      key: "created",
      header: "Created",
      sortValue: (r) => r.created,
      render: (r) => r.createdAgo,
    },
    {
      key: "expiration",
      header: "Expiration",
      sortValue: (r) => r.remainingDays ?? 9999,
      render: (r) => {
        const e = expirationLabel(r);
        return (
          <span style={{ color: e.tone ? HEALTH_TONE[e.tone] : T.textNav }}>
            {e.text}
          </span>
        );
      },
    },
    {
      key: "resources",
      header: "Resources",
      sortValue: (r) => r.resources,
      render: (r) => r.resources,
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
      {/* Operational Dashboard (spec § Operational Dashboard) */}
      <PostureGrid>
        <PostureCard
          title="Active Sandboxes"
          value={activeCount}
          sub={<>Currently running · Sample</>}
          tone="ok"
        />
        <PostureCard
          title="Expiring Soon"
          value={expiringCount}
          sub={<>Within 7 days · Sample</>}
          tone="warn"
        />
        <PostureCard
          title="Expired"
          value={expiredCount}
          sub={<>Awaiting cleanup · Sample</>}
          tone="danger"
        />
        <PostureCard
          title="Suspended"
          value={suspendedCount}
          sub={<>Paused environments · Sample</>}
          tone="warn"
        />
        <PostureCard
          title="Average Lifetime"
          value={`${avgLifetime} d`}
          sub={<>Across sandboxes · Sample</>}
          tone="muted"
        />
        <PostureCard
          title="Policy Violations"
          value={2}
          sub={<>Open across sandboxes · Sample</>}
          tone="danger"
        />
        <PostureCard
          title="Compliance Status"
          value="86%"
          sub={<>Controls passing · Sample</>}
          tone="ok"
        />
        <PostureCard
          title="Resource Consumption"
          value="61%"
          sub={<>Aggregate quota · Sample</>}
          tone="warn"
        />
      </PostureGrid>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          margin: "16px 0 4px",
        }}
      >
        <Card title="Resource consumption" desc="Current quota utilisation">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: T.textMuted,
              }}
            >
              Aggregate across all sandboxes <SampleTag />
            </div>
            <Meter label="Compute" pct={80} />
            <Meter label="Storage" pct={40} />
            <Meter label="Network" pct={30} />
            <Meter label="Budget" pct={60} />
          </div>
        </Card>

        <Card
          title="Expiration timeline"
          desc="Proactively manage expiring environments"
        >
          <ExpirationTimeline records={records} onSelect={setSelId} />
        </Card>
      </div>

      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={tab}
          onChange={setTab}
          options={NAV_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      <DiscoveryListView
        title="Sandbox workspaces"
        commands={toolbar}
        pills={[
          {
            key: "purpose",
            label: "Purpose",
            value: fPurpose,
            onChange: setFPurpose,
            options: facet(records.map((r) => r.purpose)),
          },
          {
            key: "env",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
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
            key: "provider",
            label: "Cloud Provider",
            value: fProvider,
            onChange: setFProvider,
            options: facet(records.map((r) => r.cloudProvider)),
          },
          {
            key: "compliance",
            label: "Compliance Profile",
            value: fCompliance,
            onChange: setFCompliance,
            options: facet(records.map((r) => r.complianceProfile)),
          },
          {
            key: "expiration",
            label: "Expiration",
            value: fExpiration,
            onChange: setFExpiration,
            options: [
              { value: "", label: "All" },
              { value: "Expired", label: "Expired" },
              { value: "≤ 7 days", label: "≤ 7 days" },
              { value: "≤ 14 days", label: "≤ 14 days" },
              { value: "> 14 days", label: "> 14 days" },
              { value: "None", label: "No expiration" },
            ],
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
          {
            key: "health",
            label: "Health",
            value: fHealth,
            onChange: setFHealth,
            options: facet(records.map((r) => r.health)),
          },
        ]}
        presets={[{ label: "All sandboxes", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search sandbox workspaces — name, owner, business unit, purpose, template, ID, tags…"
        count={rows.length}
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "created", dir: "desc" }}
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
            <HeaderButton icon={<PlayCircle size={13} />} onClick={clear}>
              Resume
            </HeaderButton>
            <HeaderButton icon={<Archive size={13} />} onClick={clear}>
              Archive
            </HeaderButton>
            <HeaderButton
              variant="danger"
              icon={<Trash2 size={13} />}
              onClick={clear}
            >
              Delete
            </HeaderButton>
            <HeaderButton icon={<Download size={13} />} onClick={clear}>
              Export
            </HeaderButton>
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "Open", onClick: () => setSelId(r.id) },
              { label: "Edit", onClick: () => setSelId(r.id) },
              { label: "Clone", onClick: () => setSelId(r.id) },
              { label: "Reset", onClick: () => setSelId(r.id) },
              { label: "Extend", onClick: () => setSelId(r.id) },
              { label: "Suspend", onClick: () => setSelId(r.id) },
              { label: "Archive", onClick: () => setSelId(r.id) },
              {
                label: "Delete",
                onClick: () => setSelId(r.id),
                danger: true,
              },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<FlaskConical size={20} />}
            title="No sandbox workspaces found."
            hint="Adjust filters, or create a sandbox / clone an existing workspace to get started."
            cta="Create Sandbox"
            onCta={() => navigate("/admin/workspaces?tab=sandboxes")}
          />
        }
      />

      {sel && <SandboxDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function SandboxesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Sandbox Workspaces"
        subtitle="Manage temporary, isolated workspaces used for testing, experimentation, validation, and development activities."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              icon={<Copy size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=requests")}
            >
              Clone Existing Workspace
            </HeaderButton>
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=sandboxes")}
            >
              Create Sandbox
            </HeaderButton>
          </>
        }
      />
      <SandboxesView />
    </Page>
  );
}

// ── Expiration timeline (spec § Expiration Timeline) ──────────────────────────────────────────────
function ExpirationTimeline({
  records,
  onSelect,
}: {
  records: SandboxRecord[];
  onSelect: (id: string) => void;
}) {
  const upcoming = records
    .filter((r) => r.remainingDays != null && r.remainingDays >= 0)
    .sort((a, b) => (a.remainingDays ?? 0) - (b.remainingDays ?? 0))
    .slice(0, 6);
  const marks = [0, 3, 7, 14, 21];
  const maxDay = 21;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: T.textMuted,
        }}
      >
        Sandboxes approaching expiration <SampleTag />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: T.textMuted,
          borderBottom: `1px solid ${T.border}`,
          paddingBottom: 6,
        }}
      >
        {marks.map((m) => (
          <span key={m}>{m === 0 ? "Today" : `${m}d`}</span>
        ))}
      </div>
      {upcoming.map((r) => {
        const pct = Math.min(100, ((r.remainingDays ?? 0) / maxDay) * 100);
        const tone = expiringSoon(r) ? T.warning : T.accent;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "2px 0",
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: T.textNav,
              }}
            >
              <span>{r.name}</span>
              <span style={{ color: tone }}>{r.remainingDays}d</span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 99,
                background: "var(--cg-bg-badge)",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: tone,
                  borderRadius: 99,
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ════════════ Sandbox Detail Drawer — 8 sub-tabs (spec § Sandbox Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "resources", label: "Resources", icon: <Boxes size={13} /> },
  { id: "ai", label: "AI Configuration", icon: <Bot size={13} /> },
  { id: "governance", label: "Governance", icon: <Scale size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "lifecycle", label: "Lifecycle", icon: <Timer size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function SandboxDetailDrawer({
  rec,
  onClose,
}: {
  rec: SandboxRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  const exp = expirationLabel(rec);
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.name}`}
      subtitle={`${rec.status} · ${rec.purpose} · ${rec.owner} · ${exp.text} · ${rec.health}`}
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
          {/* Drawer header Quick Actions (spec § Drawer Header) */}
          <HeaderButton icon={<FileText size={13} />}>Edit</HeaderButton>
          <HeaderButton icon={<Clock size={13} />}>Extend</HeaderButton>
          <HeaderButton icon={<RotateCcw size={13} />}>Reset</HeaderButton>
          <HeaderButton icon={<PauseCircle size={13} />}>Suspend</HeaderButton>
          <HeaderButton icon={<Archive size={13} />}>Archive</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <ConfirmButton
            label="Delete"
            title="Delete sandbox"
            body={`Permanently delete "${rec.name}" and clean up all provisioned resources? This cannot be undone.`}
            confirmLabel="Delete sandbox"
            confirmWord="DELETE"
            onConfirm={onClose}
          />
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "ai" && <AITab rec={rec} />}
      {tab === "governance" && <GovernanceTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "lifecycle" && <LifecycleTab rec={rec} />}
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

function QuickActions({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: 14,
      }}
    >
      {children}
      <SampleTag />
    </div>
  );
}

// ── Overview (General · Lifecycle · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: SandboxRecord }) {
  const exp = expirationLabel(rec);
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Sandbox Name", v: rec.name },
              { k: "Purpose", v: rec.purpose },
              { k: "Environment", v: rec.environment },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Owner", v: rec.owner },
              { k: "Status", v: rec.status },
              { k: "Created", v: rec.created },
              { k: "Last Modified", v: rec.lastModified, sample: true },
            ]}
          />
          <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
            {rec.description}
          </div>
        </Section>
      )}
      {sub === "lifecycle" && (
        <Section title="Lifecycle" sample>
          <KVGrid
            items={[
              { k: "Created", v: rec.created },
              { k: "Expiration Date", v: rec.expirationDate, sample: true },
              { k: "Remaining Lifetime", v: exp.text, sample: true },
              {
                k: "Auto Cleanup",
                v: rec.autoCleanup ? "Enabled" : "Disabled",
                sample: true,
              },
              { k: "Retention Policy", v: rec.retentionPolicy, sample: true },
            ]}
          />
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Resources", v: rec.resources, sample: true },
              { k: "AI Agents", v: rec.aiAgents, sample: true },
              { k: "Integrations", v: rec.integrations, sample: true },
              { k: "Policies", v: rec.policies, sample: true },
              { k: "Cloud Accounts", v: rec.cloudAccounts, sample: true },
              {
                k: "Compliance Standards",
                v: rec.complianceStandards,
                sample: true,
              },
              { k: "Running Jobs", v: rec.runningJobs, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Resources (categories + toolbar + table) ──
function ResourcesTab({ rec }: { rec: SandboxRecord }) {
  const n = hashId(rec.id);
  const CATEGORIES = [
    "AWS Accounts",
    "Azure Subscriptions",
    "Google Cloud Projects",
    "Kubernetes Clusters",
    "Storage",
    "Networking",
    "Repositories",
    "AI Resources",
  ];
  const TYPES = [
    "Account",
    "Subscription",
    "Project",
    "Cluster",
    "Bucket",
    "VPC",
    "Repository",
    "Model Endpoint",
  ];
  const resources = Array.from({ length: 4 + (n % 4) }, (_, i) => {
    const idx = (n + i) % CATEGORIES.length;
    return {
      id: `${rec.id}-res-${i}`,
      resource: `${CATEGORIES[idx].replace(/s$/, "")} ${(1000 + ((n + i) % 900)).toString()}`,
      type: TYPES[idx],
      provider: pick(CLOUD_PROVIDERS, n + i),
      region: pick(REGIONS, n + i),
      status: pick(["Provisioned", "Provisioning", "Degraded"], n + i),
    };
  });
  const cols: Column<(typeof resources)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "provider", header: "Provider", render: (r) => r.provider },
    { key: "region", header: "Region", render: (r) => r.region },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{
            color:
              r.status === "Provisioned"
                ? T.success
                : r.status === "Provisioning"
                  ? T.accent
                  : T.warning,
          }}
        >
          {r.status}
        </span>
      ),
    },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Every resource provisioned inside the sandbox, across all categories.
      </div>
      <Section title="Categories" sample>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((c) => (
            <span
              key={c}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 26,
                padding: "0 10px",
                borderRadius: 99,
                fontSize: 12,
                color: T.textNav,
                border: `1px solid ${T.border}`,
                background: "var(--cg-bg-badge)",
              }}
            >
              <Layers size={12} color={T.textMuted} />
              {c}
            </span>
          ))}
        </div>
      </Section>
      <QuickActions>
        <HeaderButton icon={<Plus size={13} />}>
          Provision Resource
        </HeaderButton>
        <HeaderButton variant="danger" icon={<Trash2 size={13} />}>
          Remove Resource
        </HeaderButton>
        <HeaderButton icon={<Cable size={13} />}>Synchronize</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
      </QuickActions>
      <DirectoryTable columns={cols} rows={resources} />
    </>
  );
}

// ── AI Configuration ──
const AI_SUBS = [
  { id: "agents", label: "Assigned AI Agents" },
  { id: "skills", label: "Skills" },
  { id: "knowledge", label: "Knowledge Sources" },
  { id: "prompts", label: "Prompt Libraries" },
  { id: "execution", label: "Execution Policies" },
  { id: "runtime", label: "AI Runtime" },
];
function AITab({ rec }: { rec: SandboxRecord }) {
  const [sub, setSub] = React.useState("agents");
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        AI resources available inside the sandbox.
      </div>
      <QuickActions>
        <HeaderButton icon={<Plus size={13} />}>Assign Agent</HeaderButton>
        <HeaderButton variant="danger" icon={<Trash2 size={13} />}>
          Remove Agent
        </HeaderButton>
        <HeaderButton icon={<Cpu size={13} />}>Update Runtime</HeaderButton>
        <HeaderButton icon={<RotateCcw size={13} />}>
          Reset AI Configuration
        </HeaderButton>
      </QuickActions>
      <Tabs tabs={AI_SUBS} active={sub} onChange={setSub} />
      {sub === "agents" && (
        <Section title="Assigned AI Agents" sample>
          <StatRow
            label="Compliance Auditor Agent"
            value="Active"
            tone="ok"
            sample
          />
          <StatRow
            label="Security Reviewer Agent"
            value="Active"
            tone="ok"
            sample
          />
          <StatRow
            label="Cloud Architect Agent"
            value="Idle"
            tone="muted"
            sample
          />
        </Section>
      )}
      {sub === "skills" && (
        <Section title="Skills" sample>
          <StatRow
            label="Assigned Skills"
            value={`${12 + rec.aiAgents} skills`}
            sample
          />
          <StatRow
            label="Provider Namespaces"
            value="aws · azure · gcp · shared"
            sample
          />
        </Section>
      )}
      {sub === "knowledge" && (
        <Section title="Knowledge Sources" sample>
          <StatRow
            label="Compliance Knowledge Base"
            value="Connected"
            tone="ok"
            sample
          />
          <StatRow
            label="Architecture Docs"
            value="Connected"
            tone="ok"
            sample
          />
        </Section>
      )}
      {sub === "prompts" && (
        <Section title="Prompt Libraries" sample>
          <StatRow
            label="Assigned Libraries"
            value="Compliance · Security"
            sample
          />
        </Section>
      )}
      {sub === "execution" && (
        <Section title="Execution Policies" sample>
          <StatRow label="Autonomy Mode" value="Ask" sample />
          <StatRow
            label="Tool Restrictions"
            value="Read-only cloud APIs"
            tone="warn"
            sample
          />
        </Section>
      )}
      {sub === "runtime" && (
        <Section title="AI Runtime" sample>
          <StatRow label="Runtime" value={rec.aiRuntime} sample />
          <StatRow
            label="Isolation"
            value="Per-sandbox sandboxed"
            tone="ok"
            sample
          />
        </Section>
      )}
    </>
  );
}

// ── Governance (profile + inheritance visualization) ──
const GOVERNANCE_SUBS = [
  { id: "governance", label: "Governance" },
  { id: "resolution", label: "Policy Resolution" },
];
function GovernanceTab({ rec }: { rec: SandboxRecord }) {
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
            value="18 from Organization"
            sample
          />
          <StatRow
            label="Sandbox Overrides"
            value="3 overrides"
            tone="warn"
            sample
          />
          <StatRow
            label="Resource Limits"
            value="Stricter than production"
            tone="ok"
            sample
          />
          <StatRow
            label="Execution Policies"
            value="Ask-mode enforced"
            sample
          />
          <StatRow
            label="Security Restrictions"
            value="Egress blocked, secrets masked"
            tone="ok"
            sample
          />
        </Section>
      )}
      {sub === "resolution" && (
        <Section title="Policy resolution" sample>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <PolicyBlock title="Organization Policy" muted>
              <StatRow label="Governance Profile" value="Balanced" />
              <StatRow label="Resource Limits" value="Standard" />
            </PolicyBlock>
            <span
              style={{ color: T.textMuted, textAlign: "center", fontSize: 13 }}
            >
              ↓
            </span>
            <PolicyBlock title="Sandbox Policy">
              <StatRow
                label="Governance Profile"
                value={rec.governanceProfile}
                tone="ok"
              />
              <StatRow
                label="Resource Limits"
                value="Stricter quotas"
                tone="ok"
              />
            </PolicyBlock>
            <span
              style={{ color: T.textMuted, textAlign: "center", fontSize: 13 }}
            >
              ↓
            </span>
            <PolicyBlock title="Effective Configuration">
              <StatRow
                label="Governance Profile"
                value={rec.governanceProfile}
                tone="ok"
              />
              <StatRow
                label="Resource Limits"
                value="Most-restrictive wins"
                tone="ok"
              />
            </PolicyBlock>
          </div>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 8 }}>
            Sandboxes inherit organizational governance while enforcing stricter
            resource quotas and lifecycle controls; the effective configuration
            resolves to the most-restrictive value.
          </div>
        </Section>
      )}
    </>
  );
}

function PolicyBlock({
  title,
  muted,
  children,
}: {
  title: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        background: muted ? "transparent" : "var(--cg-accent-bg-strong)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: T.textNav,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Compliance ──
const COMPLIANCE_SUBS = [
  { id: "frameworks", label: "Compliance Frameworks" },
  { id: "controls", label: "Assigned Controls" },
  { id: "validation", label: "Validation Policies" },
  { id: "schedule", label: "Assessment Schedule" },
  { id: "status", label: "Compliance Status" },
];
function ComplianceTab({ rec }: { rec: SandboxRecord }) {
  const [sub, setSub] = React.useState("frameworks");
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Compliance configuration used within the sandbox.
      </div>
      <QuickActions>
        <HeaderButton icon={<ShieldCheck size={13} />}>
          Run Assessment
        </HeaderButton>
        <HeaderButton icon={<FileText size={13} />}>
          Generate Report
        </HeaderButton>
        <HeaderButton icon={<ArrowRight size={13} />}>
          Compare with Production
        </HeaderButton>
      </QuickActions>
      <Tabs tabs={COMPLIANCE_SUBS} active={sub} onChange={setSub} />
      {sub === "frameworks" && (
        <Section title="Compliance Frameworks" sample>
          <StatRow
            label={rec.complianceProfile}
            value="Assigned"
            tone="ok"
            sample
          />
          <StatRow label="ISO 27001" value="Assigned" tone="ok" sample />
        </Section>
      )}
      {sub === "controls" && (
        <Section title="Assigned Controls" sample>
          <StatRow label="Total Controls" value="112" sample />
          <StatRow label="Passing" value="96" tone="ok" sample />
          <StatRow label="Failing" value="16" tone="danger" sample />
        </Section>
      )}
      {sub === "validation" && (
        <Section title="Validation Policies" sample>
          <StatRow label="Naming Policy" value="Passed" tone="ok" sample />
          <StatRow label="Encryption Policy" value="Passed" tone="ok" sample />
          <StatRow
            label="Public Access Policy"
            value="Warning"
            tone="warn"
            sample
          />
        </Section>
      )}
      {sub === "schedule" && (
        <Section title="Assessment Schedule" sample>
          <StatRow label="Frequency" value="Daily at 02:00 UTC" sample />
          <StatRow label="Last Run" value={rec.lastModified} sample />
          <StatRow label="Next Run" value="2026-07-11" sample />
        </Section>
      )}
      {sub === "status" && (
        <Section title="Compliance Status" sample>
          <StatRow
            label="Overall Status"
            value="86% passing"
            tone="warn"
            sample
          />
        </Section>
      )}
    </>
  );
}

// ── Lifecycle (states + toolbar + expiration policies) ──
const LIFECYCLE_STATES: string[] = [
  "Requested",
  "Provisioning",
  "Active",
  "Suspended",
  "Expired",
  "Archived",
  "Deleted",
];

const LIFECYCLE_SUBS = [
  { id: "state", label: "Lifecycle State" },
  { id: "expiration", label: "Expiration Policies" },
];

function LifecycleTab({ rec }: { rec: SandboxRecord }) {
  const currentIdx = LIFECYCLE_STATES.indexOf(
    rec.status === "Template" || rec.status === "Scheduled"
      ? "Requested"
      : rec.status,
  );
  const exp = expirationLabel(rec);
  const [sub, setSub] = React.useState("state");
  return (
    <>
      <Tabs tabs={LIFECYCLE_SUBS} active={sub} onChange={setSub} />
      {sub === "state" && (
        <>
          <Section title="Lifecycle state" sample>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {LIFECYCLE_STATES.map((state, i) => {
                const done = currentIdx >= 0 && i < currentIdx;
                const active = i === currentIdx;
                const tone = active ? T.accent : done ? T.success : T.textMuted;
                return (
                  <div
                    key={state}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom:
                        i < LIFECYCLE_STATES.length - 1
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
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: T.textPrimary,
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        {state}
                      </div>
                      <div
                        style={{ fontSize: 11.5, color: tone, marginTop: 2 }}
                      >
                        {active
                          ? "Current state"
                          : done
                            ? "Completed"
                            : "Not yet reached"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <StatRow label="Remaining Lifetime" value={exp.text} sample />

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              margin: "8px 0 16px",
            }}
          >
            <HeaderButton icon={<Clock size={13} />}>
              Extend Lifetime
            </HeaderButton>
            <HeaderButton icon={<RotateCcw size={13} />}>
              Reset Environment
            </HeaderButton>
            <HeaderButton icon={<PauseCircle size={13} />}>
              Suspend
            </HeaderButton>
            <HeaderButton icon={<PlayCircle size={13} />}>Resume</HeaderButton>
            <HeaderButton icon={<Archive size={13} />}>Archive</HeaderButton>
            <HeaderButton variant="danger" icon={<Trash2 size={13} />}>
              Delete
            </HeaderButton>
          </div>
        </>
      )}
      {sub === "expiration" && (
        <Section title="Expiration policies" sample>
          <StatRow
            label="Auto Suspend"
            value={rec.autoCleanup ? "Enabled" : "Disabled"}
            tone={rec.autoCleanup ? "ok" : "muted"}
            sample
          />
          <StatRow label="Auto Archive" value="Enabled" tone="ok" sample />
          <StatRow
            label="Auto Delete"
            value={rec.autoCleanup ? "After retention" : "Disabled"}
            tone={rec.autoCleanup ? "warn" : "muted"}
            sample
          />
          <StatRow label="Notify Owner" value="Enabled" tone="ok" sample />
          <StatRow
            label="Notify Administrator"
            value="Enabled"
            tone="ok"
            sample
          />
        </Section>
      )}
    </>
  );
}

// ── Activity timeline (events + filters) ──
function ActivityTab() {
  const events = [
    "Sandbox Created",
    "Provisioning Completed",
    "Resources Added",
    "Agent Assigned",
    "Compliance Assessment Executed",
    "Configuration Reset",
    "Expiration Extended",
    "Sandbox Suspended",
    "Sandbox Archived",
  ];
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
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
          label="Date"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Date: All" },
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
            { value: "", label: "Category: All" },
            { value: "lifecycle", label: "Lifecycle" },
            { value: "resources", label: "Resources" },
            { value: "ai", label: "AI" },
            { value: "compliance", label: "Compliance" },
          ]}
        />
        <Select
          label="Severity"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Severity: All" },
            { value: "info", label: "Info" },
            { value: "warning", label: "Warning" },
            { value: "critical", label: "Critical" },
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
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Audit History (immutable) ──
function AuditTab() {
  const events = [
    "Sandbox Created",
    "Sandbox Modified",
    "Resources Added",
    "Resources Removed",
    "Policy Updated",
    "AI Configuration Updated",
    "Compliance Executed",
    "Expiration Changed",
    "Sandbox Reset",
    "Sandbox Archived",
    "Sandbox Deleted",
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
          value={`${pick(OWNERS, i)} · 2026-07-${(1 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

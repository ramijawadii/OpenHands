/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Hierarchy & Relationships → Shared Service Workspaces */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Download,
  Copy,
  Send,
  PauseCircle,
  Archive,
  RefreshCcw,
  Pencil,
  Users,
  ShieldCheck,
  GitBranch,
  Share2,
  LayoutGrid,
  FileText,
  Boxes,
  ScrollText,
  Network,
  Gauge,
  HeartPulse,
  Activity as ActivityIcon,
  History,
  Trash2,
  CheckCircle2,
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
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Shared Service Workspaces — centralized enterprise workspaces that PROVIDE reusable platform,
 * security, compliance, AI, infrastructure and operational services consumed by many other
 * workspaces. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/03_Hierarchy & Relationships/shared_service_workspaces.md.
 *
 * Unlike Parent / Child Workspaces, Shared Service Workspaces are *providers*, not owners: they host
 * reusable services while remaining independently managed. Reuses the Enterprise-Administration UX
 * pattern shared with the Users / Workspace-Requests modules (Banner · Toolbar · Filters · Search ·
 * Data Table · Service Dependency Graph · Bulk / Row actions · Detail Drawer with 9 sub-tabs).
 *
 * There is no shared-service backend yet, so the service set is representative sample data (tagged
 * `Sample` in the UI). When admin/org_model.py + the service-catalog engine land, swap SAMPLE_SERVICES
 * for the live query — the component API stays identical.
 */

// ── Status model ──────────────────────────────────────────────────────────────────────────────────
type Status = "Active" | "Published" | "Draft" | "Suspended" | "Retired";

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Published: T.accent,
  Draft: T.textMuted,
  Suspended: T.warning,
  Retired: T.danger,
};

// ── Second-level sub-navigation (spec §Navigation) → a lens over the same service directory ────────
const VIEW_TABS = [
  { id: "catalog", label: "Service Catalog" },
  { id: "active", label: "Active Services" },
  { id: "consumers", label: "Consumer Workspaces" },
  { id: "relationships", label: "Service Relationships" },
  { id: "policies", label: "Access Policies" },
  { id: "capacity", label: "Capacity & Usage" },
  { id: "health", label: "Service Health" },
  { id: "change", label: "Change Management" },
  { id: "retirement", label: "Service Retirement" },
];

// map view id → status lens (null = all)
const VIEW_STATUS: Record<string, Status | null> = {
  catalog: null,
  active: "Active",
  consumers: null,
  relationships: null,
  policies: null,
  capacity: null,
  health: null,
  change: null,
  retirement: "Retired",
};

// ── Reference domains (spec §Service Categories, §Services, §Toolbar wizard) ───────────────────────
const CATEGORIES = [
  "Identity",
  "Security",
  "Compliance",
  "Platform",
  "AI",
  "Knowledge",
  "Networking",
  "Monitoring",
  "Logging",
  "Integrations",
  "Storage",
  "Databases",
  "DevOps",
  "CI/CD",
  "Kubernetes",
  "Container Platform",
];
const SERVICE_TIERS = ["Platinum", "Gold", "Silver", "Bronze"];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const AVAILABILITY = ["99.99%", "99.95%", "99.90%", "99.50%", "98.70%"];
const CAPABILITIES = [
  "Identity",
  "Authentication",
  "Logging",
  "Monitoring",
  "Knowledge",
  "AI Runtime",
  "Secrets",
  "Integrations",
  "Shared Storage",
  "Networking",
  "Kubernetes Platform",
  "Container Registry",
];
const POLICY_TYPES = [
  "Organization-wide",
  "Business Unit",
  "Department",
  "Workspace List",
  "Role Based",
  "Tag Based",
  "Approval Required",
];
const RELATIONSHIPS = [
  "Direct",
  "Business Unit",
  "Department",
  "Federated",
  "Delegated",
];
const PERMISSIONS = ["Read", "Read / Write", "Consume", "Admin", "Full"];
const CONSUMER_WORKSPACES = [
  "Payments Production",
  "Retail Web",
  "Data Lakehouse",
  "Fraud Analytics",
  "Mobile Banking",
  "Partner Portal",
  "Internal Tools",
  "ML Feature Store",
  "Billing Engine",
  "Support Desk",
];
const ACTORS = ["David Chen", "Aisha Khan", "Tomás Silva", "Priya Nair", "You"];

// Provider workspaces + their headline service + category + owning team (spec §Purpose).
const SERVICE_DEFS: {
  workspace: string;
  service: string;
  category: string;
  team: string;
}[] = [
  {
    workspace: "Enterprise Identity",
    service: "Identity Services",
    category: "Identity",
    team: "Identity Team",
  },
  {
    workspace: "Security Operations",
    service: "Security Operations (SOC)",
    category: "Security",
    team: "SecOps Team",
  },
  {
    workspace: "Compliance Center",
    service: "Compliance",
    category: "Compliance",
    team: "Compliance Team",
  },
  {
    workspace: "AI Platform",
    service: "AI Platform",
    category: "AI",
    team: "AI Team",
  },
  {
    workspace: "Knowledge Hub",
    service: "Shared Knowledge",
    category: "Knowledge",
    team: "Knowledge Team",
  },
  {
    workspace: "Platform Engineering",
    service: "Platform Engineering",
    category: "Platform",
    team: "Platform Team",
  },
  {
    workspace: "Central Logging",
    service: "Logging",
    category: "Logging",
    team: "SRE Team",
  },
  {
    workspace: "Observability",
    service: "Monitoring",
    category: "Monitoring",
    team: "SRE Team",
  },
  {
    workspace: "Integration Hub",
    service: "Integration Hub",
    category: "Integrations",
    team: "Platform Team",
  },
  {
    workspace: "Delivery Pipeline",
    service: "CI/CD",
    category: "CI/CD",
    team: "DevOps Team",
  },
  {
    workspace: "Shared Kubernetes",
    service: "Shared Kubernetes Platform",
    category: "Kubernetes",
    team: "Platform Team",
  },
  {
    workspace: "Container Registry",
    service: "Container Registry",
    category: "Container Platform",
    team: "DevOps Team",
  },
  {
    workspace: "Secrets Vault",
    service: "Secrets Management",
    category: "Security",
    team: "SecOps Team",
  },
  {
    workspace: "Shared Storage",
    service: "Shared Storage",
    category: "Storage",
    team: "Platform Team",
  },
  {
    workspace: "Data Services",
    service: "Databases",
    category: "Databases",
    team: "Data Team",
  },
  {
    workspace: "Network Fabric",
    service: "Networking",
    category: "Networking",
    team: "Platform Team",
  },
];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface ServiceRecord {
  id: string;
  workspace: string;
  service: string;
  category: string;
  businessUnit: string;
  owner: string;
  status: Status;
  serviceTier: string;
  availability: string;
  consumers: number;
  sharedResources: number;
  monthlyRequests: string;
  capacityUtil: number;
  created: string;
  modified: string;
  latencyMs: number;
  errorRate: string;
  sla: string;
  criticalDeps: number;
  externalDeps: number;
}

// Deterministic representative shared-service set.
const SAMPLE_SERVICES: ServiceRecord[] = SERVICE_DEFS.map((d, i) => {
  const id = `SVC-${(1040 + i * 3).toString().padStart(4, "0")}`;
  const n = hashId(id);
  const status = pick<Status>(
    [
      "Active",
      "Active",
      "Active",
      "Published",
      "Draft",
      "Suspended",
      "Retired",
    ],
    n,
  );
  const consumers = status === "Retired" ? 0 : 12 + (n % 190);
  return {
    id,
    workspace: d.workspace,
    service: d.service,
    category: d.category,
    businessUnit: pick(BUSINESS_UNITS, n >> 2),
    owner: d.team,
    status,
    serviceTier: pick(SERVICE_TIERS, n >> 1),
    availability: pick(AVAILABILITY, n),
    consumers,
    sharedResources: 4 + (n % 48),
    monthlyRequests: `${(1 + (n % 90)) * 1.1 > 40 ? 2 + (n % 90) : 1 + (n % 40)}.${n % 9}M`,
    capacityUtil: 28 + (n % 68),
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    modified: `2026-0${1 + (n % 7)}-${(1 + ((n + 3) % 27)).toString().padStart(2, "0")}`,
    latencyMs: 12 + (n % 180),
    errorRate: `0.${(n % 90).toString().padStart(2, "0")}%`,
    sla: pick(["99.99%", "99.95%", "99.90%", "99.50%"], n >> 3),
    criticalDeps: 1 + (n % 5),
    externalDeps: n % 4,
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

// ── Bar — tiny inline usage bar for capacity / chart rows (styled div, no chart lib) ───────────────
function Bar({ pct, tone }: { pct: number; tone?: string }) {
  const c = tone ?? T.accent;
  return (
    <div
      style={{
        width: 120,
        height: 7,
        borderRadius: 99,
        background: "var(--cg-bg-badge)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(3, Math.min(100, pct))}%`,
          height: "100%",
          background: c,
        }}
      />
    </div>
  );
}

/**
 * Embeddable body — operational dashboard + sub-navigation lens + service directory + dependency /
 * enterprise-model visualizations + shared-service detail drawer, WITHOUT the outer <Page> or the
 * page banner. Rendered both as a standalone route and as a tab of the Workspace Management console.
 */
export function SharedServiceWorkspacesView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("catalog");

  const [search, setSearch] = React.useState("");
  const [fCategory, setFCategory] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fConsumers, setFConsumers] = React.useState("");
  const [fAvailability, setFAvailability] = React.useState("");
  const [fTier, setFTier] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fBu, setFBu] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_SERVICES;
  const viewStatus = VIEW_STATUS[view];

  const consumerBand = (c: number) =>
    c >= 100 ? "100+" : c >= 50 ? "50–99" : c >= 10 ? "10–49" : "0–9";

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!viewStatus || r.status === viewStatus) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.service.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)) &&
      (!fCategory || r.category === fCategory) &&
      (!fOwner || r.owner === fOwner) &&
      (!fConsumers || consumerBand(r.consumers) === fConsumers) &&
      (!fAvailability || r.availability === fAvailability) &&
      (!fTier || r.serviceTier === fTier) &&
      (!fStatus || r.status === fStatus) &&
      (!fBu || r.businessUnit === fBu)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFCategory("");
    setFOwner("");
    setFConsumers("");
    setFAvailability("");
    setFTier("");
    setFStatus("");
    setFBu("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Operational dashboard aggregates (spec §Operational Dashboard).
  const totalConsumers = records.reduce((s, r) => s + r.consumers, 0);
  const avgCapacity = Math.round(
    records.reduce((s, r) => s + r.capacityUtil, 0) / records.length,
  );
  const healthy = records.filter((r) => r.status === "Active").length;
  const degraded = records.filter((r) => r.status === "Suspended").length;
  const criticalDeps = records.reduce((s, r) => s + r.criticalDeps, 0);

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Shared Service",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=shared-services"),
    },
    { key: "edit", label: "Edit", icon: <Pencil size={15} />, disabled: true },
    { key: "clone", label: "Clone", icon: <Copy size={15} />, disabled: true },
    {
      key: "publish",
      label: "Publish",
      icon: <Send size={15} />,
      disabled: true,
    },
    {
      key: "suspend",
      label: "Suspend",
      icon: <PauseCircle size={15} />,
      disabled: true,
    },
    {
      key: "retire",
      label: "Retire",
      icon: <Archive size={15} />,
      disabled: true,
    },
    { key: "refresh", label: "Refresh", icon: <RefreshCcw size={15} /> },
    {
      key: "assign",
      label: "Assign Consumers",
      icon: <Users size={15} />,
      disabled: true,
    },
    {
      key: "policies",
      label: "Configure Policies",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Dependencies",
      icon: <GitBranch size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<ServiceRecord>[] = [
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
          <Share2 size={14} color={T.textMuted} />
          {r.workspace}
        </span>
      ),
    },
    {
      key: "service",
      header: "Service",
      sortValue: (r) => r.service,
      render: (r) => r.service,
    },
    {
      key: "category",
      header: "Category",
      sortValue: (r) => r.category,
      render: (r) => r.category,
    },
    {
      key: "consumers",
      header: "Consumers",
      sortValue: (r) => r.consumers,
      render: (r) => (
        <span style={{ fontFamily: "monospace", color: T.textPrimary }}>
          {r.consumers}
        </span>
      ),
    },
    {
      key: "availability",
      header: "Availability",
      sortValue: (r) => r.availability,
      render: (r) => r.availability,
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
      {/* Operational Dashboard (spec §Operational Dashboard) */}
      <StatStripPlain
        items={[
          { label: "Shared Services", value: records.length },
          { label: "Connected Workspaces", value: totalConsumers },
          { label: "Consumer Growth", value: "+18%", tone: "ok" },
          {
            label: "Capacity Utilization",
            value: `${avgCapacity}%`,
            tone: avgCapacity > 80 ? "warn" : "ok",
          },
          {
            label: "Health Status",
            value: `${healthy} healthy · ${degraded} degraded`,
            tone: degraded > 0 ? "warn" : "ok",
          },
          { label: "Availability", value: "99.96%", tone: "ok" },
          { label: "Critical Dependencies", value: criticalDeps, tone: "warn" },
        ]}
      />

      <div style={{ display: "flex", marginTop: 16, marginBottom: 14 }}>
        <Select
          label="View"
          value={view}
          onChange={setView}
          options={VIEW_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      <DiscoveryListView
        title="Shared service catalog"
        commands={toolbar}
        pills={[
          {
            key: "category",
            label: "Service Category",
            value: fCategory,
            onChange: setFCategory,
            options: facet(records.map((r) => r.category)),
          },
          {
            key: "owner",
            label: "Owner",
            value: fOwner,
            onChange: setFOwner,
            options: facet(records.map((r) => r.owner)),
          },
          {
            key: "consumers",
            label: "Consumer Count",
            value: fConsumers,
            onChange: setFConsumers,
            options: [
              { value: "", label: "All" },
              { value: "0–9", label: "0–9" },
              { value: "10–49", label: "10–49" },
              { value: "50–99", label: "50–99" },
              { value: "100+", label: "100+" },
            ],
          },
          {
            key: "availability",
            label: "Availability",
            value: fAvailability,
            onChange: setFAvailability,
            options: facet(records.map((r) => r.availability)),
          },
          {
            key: "tier",
            label: "Service Tier",
            value: fTier,
            onChange: setFTier,
            options: facet(records.map((r) => r.serviceTier)),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
          {
            key: "bu",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
        ]}
        presets={[{ label: "All services", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search shared service workspaces — workspace, service, owner, consumer, category, business unit…"
        count={rows.length}
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "consumers", dir: "desc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Users size={13} />} onClick={clear}>
              Assign Consumers ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<PauseCircle size={13} />} onClick={clear}>
              Suspend
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
              { label: "Manage Consumers", onClick: () => setSelId(r.id) },
              { label: "View Dependencies", onClick: () => setSelId(r.id) },
              { label: "Suspend", onClick: () => setSelId(r.id) },
              {
                label: "Retire",
                onClick: () => setSelId(r.id),
                danger: true,
              },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Plus size={20} />}
            title="No shared service workspaces configured."
            hint="Create a shared service workspace to centralize reusable enterprise capabilities."
            cta="Create Shared Service Workspace"
            onCta={() => navigate("/admin/workspaces?tab=shared-services")}
          />
        }
      />

      {/* Operational Relationships (spec §Operational Relationships) */}
      <Card title="Operational relationships" right={<SampleTag />}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <Section title="Integrates with">
              <ChipList
                items={[
                  "Organization Hierarchy",
                  "Parent / Child Workspaces",
                  "Workspace Governance",
                  "Integration Manager",
                  "Identity & Access",
                  "Platform Security",
                  "Compliance Center",
                  "Commercial Center",
                  "Support Center",
                  "Logs Center",
                  "Automation Engine",
                  "Monitoring Center",
                ]}
              />
            </Section>
          </div>
          <div>
            <Section title="Referenced by">
              <ChipList
                items={[
                  "Provisioning",
                  "Workspace Templates",
                  "Cross-Workspace Governance",
                  "Capacity Planning",
                  "Business Continuity",
                  "Disaster Recovery",
                  "Reporting",
                  "Analytics",
                ]}
              />
            </Section>
          </div>
        </div>
      </Card>

      {sel && <ServiceDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function SharedServiceWorkspacesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Shared Service Workspaces"
        subtitle="Manage centralized enterprise workspaces that provide reusable platform, security, compliance, AI, infrastructure, and operational services to other workspaces."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=shared-services")}
            >
              Create Shared Service
            </HeaderButton>
          </>
        }
      />
      <SharedServiceWorkspacesView />
    </Page>
  );
}

// ── Shared building blocks ────────────────────────────────────────────────────────────────────────
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

function ChipList({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((it) => (
        <span
          key={it}
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 24,
            padding: "0 10px",
            borderRadius: 99,
            fontSize: 11.5,
            color: T.textNav,
            background: "var(--cg-bg-badge)",
            border: `1px solid ${T.border}`,
          }}
        >
          {it}
        </span>
      ))}
    </div>
  );
}

// ════════════ Shared Service Detail Drawer — 9 sub-tabs (spec §Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "consumers", label: "Consumers", icon: <Users size={13} /> },
  { id: "services", label: "Services", icon: <Boxes size={13} /> },
  { id: "policies", label: "Access Policies", icon: <ScrollText size={13} /> },
  { id: "dependencies", label: "Dependencies", icon: <Network size={13} /> },
  { id: "capacity", label: "Capacity", icon: <Gauge size={13} /> },
  { id: "health", label: "Health", icon: <HeartPulse size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function ServiceDetailDrawer({
  rec,
  onClose,
}: {
  rec: ServiceRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.workspace} · ${rec.service}`}
      subtitle={`${rec.status} · ${rec.owner} · ${rec.consumers} consumers · ${rec.category}`}
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
          <HeaderButton icon={<Pencil size={13} />}>Edit</HeaderButton>
          <HeaderButton icon={<Users size={13} />}>
            Manage Consumers
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {/* Drawer header display (spec §Drawer Header) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
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
          Service:{" "}
          <strong style={{ color: T.textPrimary }}>{rec.service}</strong>
        </span>
        <span>
          Owner: <strong style={{ color: T.textPrimary }}>{rec.owner}</strong>
        </span>
        <span>
          Consumers:{" "}
          <strong style={{ color: T.textPrimary }}>{rec.consumers}</strong>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Status: <StatusBadge status={rec.status} />
        </span>
      </div>

      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "consumers" && <ConsumersTab rec={rec} />}
      {tab === "services" && <ServicesTab rec={rec} />}
      {tab === "policies" && <PoliciesTab rec={rec} />}
      {tab === "dependencies" && <DependenciesTab rec={rec} />}
      {tab === "capacity" && <CapacityTab rec={rec} />}
      {tab === "health" && <HealthTab rec={rec} />}
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
function OverviewTab({ rec }: { rec: ServiceRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Workspace", v: rec.workspace },
              { k: "Service Name", v: rec.service },
              { k: "Category", v: rec.category },
              { k: "Business Unit", v: rec.businessUnit, sample: true },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Status", v: <StatusBadge status={rec.status} /> },
              { k: "Service Tier", v: rec.serviceTier, sample: true },
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
              { k: "Consumer Workspaces", v: rec.consumers, sample: true },
              { k: "Shared Resources", v: rec.sharedResources, sample: true },
              { k: "Availability", v: rec.availability, sample: true },
              { k: "Monthly Requests", v: rec.monthlyRequests, sample: true },
              {
                k: "Capacity Utilization",
                v: `${rec.capacityUtil}%`,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Consumers (spec §Consumers) ──
function ConsumersTab({ rec }: { rec: ServiceRecord }) {
  const n = hashId(rec.id);
  const consumers = Array.from({ length: 2 + (n % 6) }, (_, i) => {
    const m = n + i * 17;
    return {
      id: `${rec.id}-c${i}`,
      workspace: pick(CONSUMER_WORKSPACES, m),
      relationship: pick(RELATIONSHIPS, m),
      permission: pick(PERMISSIONS, m >> 1),
      since: `2025-${(1 + (m % 12)).toString().padStart(2, "0")}-${(1 + (m % 27)).toString().padStart(2, "0")}`,
      status: pick<Status>(["Active", "Active", "Suspended"], m),
    };
  });
  const cols: Column<(typeof consumers)[number]>[] = [
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    {
      key: "relationship",
      header: "Relationship",
      render: (r) => r.relationship,
    },
    { key: "permission", header: "Permission", render: (r) => r.permission },
    { key: "since", header: "Connected Since", render: (r) => r.since },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
        Every workspace consuming this shared service.
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <HeaderButton icon={<Plus size={13} />}>Assign Consumer</HeaderButton>
        <HeaderButton variant="danger" icon={<Trash2 size={13} />}>
          Remove Consumer
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable
        columns={cols}
        rows={consumers}
        rowActions={() => (
          <RowMenu
            items={[
              { label: "View Workspace", onClick: () => {} },
              { label: "Change Permissions", onClick: () => {} },
              { label: "Remove", onClick: () => {}, danger: true },
            ]}
          />
        )}
      />
    </>
  );
}

// ── Services / exposed capabilities (spec §Services) ──
function ServicesTab({ rec }: { rec: ServiceRecord }) {
  const n = hashId(rec.id);
  const services = Array.from({ length: 2 + (n % 4) }, (_, i) => {
    const m = n + i * 13;
    return {
      id: `${rec.id}-s${i}`,
      service: pick(CAPABILITIES, m),
      category: pick(CATEGORIES, m >> 1),
      version: `v${1 + (m % 4)}.${m % 9}`,
      availability: pick(AVAILABILITY, m),
      consumers: 5 + (m % 120),
    };
  });
  const cols: Column<(typeof services)[number]>[] = [
    { key: "service", header: "Service", render: (r) => r.service },
    { key: "category", header: "Category", render: (r) => r.category },
    { key: "version", header: "Version", render: (r) => r.version },
    {
      key: "availability",
      header: "Availability",
      render: (r) => r.availability,
    },
    {
      key: "consumers",
      header: "Consumers",
      render: (r) => (
        <span style={{ fontFamily: "monospace" }}>{r.consumers}</span>
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
        Capabilities exposed by this shared service. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={services} />
    </>
  );
}

// ── Access Policies (spec §Access Policies) ──
function PoliciesTab({ rec }: { rec: ServiceRecord }) {
  const n = hashId(rec.id);
  const policies = Array.from({ length: 2 + (n % 4) }, (_, i) => {
    const m = n + i * 19;
    const type = pick(POLICY_TYPES, m);
    return {
      id: `${rec.id}-p${i}`,
      policy: type,
      scope:
        type === "Organization-wide"
          ? "All workspaces"
          : type === "Business Unit"
            ? pick(BUSINESS_UNITS, m)
            : type === "Workspace List"
              ? `${1 + (m % 8)} workspaces`
              : type === "Role Based"
                ? "Workspace Administrators"
                : type === "Tag Based"
                  ? "tag: shared-consumer"
                  : "Selected departments",
      approval: type === "Approval Required" || m % 3 === 0 ? "Yes" : "No",
      restrictions:
        m % 2 === 0 ? "Read-only, no export" : "Rate-limited, region-locked",
    };
  });
  const cols: Column<(typeof policies)[number]>[] = [
    { key: "policy", header: "Policy", render: (r) => r.policy },
    { key: "scope", header: "Consumer Scope", render: (r) => r.scope },
    {
      key: "approval",
      header: "Approval Required",
      render: (r) => (
        <span style={{ color: r.approval === "Yes" ? T.warning : T.textMuted }}>
          {r.approval}
        </span>
      ),
    },
    {
      key: "restrictions",
      header: "Restrictions",
      render: (r) => r.restrictions,
    },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
        Controls which workspaces may consume this service.
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <HeaderButton icon={<Plus size={13} />}>Assign Policy</HeaderButton>
        <HeaderButton icon={<Pencil size={13} />}>Modify</HeaderButton>
        <HeaderButton variant="danger" icon={<Trash2 size={13} />}>
          Remove
        </HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={policies} />
      <Section title="Policy types">
        <ChipList items={POLICY_TYPES} />
      </Section>
    </>
  );
}

// ── Dependencies (spec §Dependencies) ──
const DEPENDENCIES_SUBS = [
  {
    id: "upstream-downstream-relationships",
    label: "Upstream ↓ downstream relationships",
  },
  { id: "relationship-summary", label: "Relationship summary" },
];
function DependenciesTab({ rec }: { rec: ServiceRecord }) {
  const [sub, setSub] = React.useState("upstream-downstream-relationships");
  return (
    <>
      <Tabs tabs={DEPENDENCIES_SUBS} active={sub} onChange={setSub} />

      {sub === "relationship-summary" && (
        <Section title="Relationship summary" sample>
          <StatRow
            label="Provides"
            value={`${rec.service} capabilities`}
            sample
          />
          <StatRow
            label="Consumes"
            value="Identity, Logging, Platform"
            sample
          />
          <StatRow
            label="Critical Dependencies"
            value={rec.criticalDeps}
            tone="warn"
            sample
          />
          <StatRow
            label="External Dependencies"
            value={rec.externalDeps}
            tone={rec.externalDeps > 0 ? "warn" : "ok"}
            sample
          />
        </Section>
      )}
    </>
  );
}

// ── Capacity (spec §Capacity) ──
const CAPACITY_SUBS = [
  { id: "shared-resource-utilization", label: "Shared resource utilization" },
  { id: "charts", label: "Charts" },
];
function CapacityTab({ rec }: { rec: ServiceRecord }) {
  const [sub, setSub] = React.useState("shared-resource-utilization");
  const n = hashId(rec.id);
  return (
    <>
      <Tabs tabs={CAPACITY_SUBS} active={sub} onChange={setSub} />
      {sub === "shared-resource-utilization" && (
        <Section title="Shared resource utilization" sample>
          <KVGrid
            cols={2}
            items={[
              { k: "Consumer Count", v: rec.consumers, sample: true },
              {
                k: "API Requests",
                v: `${rec.monthlyRequests} / mo`,
                sample: true,
              },
              { k: "Storage", v: `${2 + (n % 40)} TB`, sample: true },
              { k: "Compute", v: `${8 + (n % 120)} vCPU`, sample: true },
              { k: "Bandwidth", v: `${1 + (n % 12)} Gbps`, sample: true },
              {
                k: "AI Tokens",
                v: `${1 + (n % 9)}.${n % 9}B / mo`,
                sample: true,
              },
              { k: "Quota Usage", v: `${rec.capacityUtil}%`, sample: true },
            ]}
          />
        </Section>
      )}
      {sub === "charts" && (
        <Section title="Charts" sample>
          {[
            { label: "Usage", pct: rec.capacityUtil },
            { label: "Growth", pct: 20 + (n % 60) },
            { label: "Capacity Trend", pct: 40 + (n % 55) },
            { label: "Peak Consumption", pct: 60 + (n % 40) },
          ].map((c) => (
            <StatRow
              key={c.label}
              label={c.label}
              value={
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Bar pct={c.pct} tone={c.pct > 80 ? T.warning : T.accent} />
                  {c.pct}%
                </span>
              }
              sample
            />
          ))}
        </Section>
      )}
    </>
  );
}

// ── Health (spec §Health) ──
const HEALTH_SUBS = [
  { id: "health-widgets", label: "Health widgets" },
  { id: "operational-detail", label: "Operational detail" },
];
function HealthTab({ rec }: { rec: ServiceRecord }) {
  const [sub, setSub] = React.useState("health-widgets");
  const n = hashId(rec.id);
  const incidents = 1 + (n % 3);
  return (
    <>
      <Tabs tabs={HEALTH_SUBS} active={sub} onChange={setSub} />
      {sub === "health-widgets" && (
        <Section title="Health widgets" sample>
          <StatStripPlain
            items={[
              { label: "Availability", value: rec.availability, tone: "ok" },
              {
                label: "Latency",
                value: `${rec.latencyMs} ms`,
                tone: rec.latencyMs > 120 ? "warn" : "ok",
              },
              { label: "Errors", value: rec.errorRate, tone: "ok" },
              {
                label: "Active Incidents",
                value: rec.status === "Suspended" ? incidents : 0,
                tone: rec.status === "Suspended" ? "danger" : "ok",
              },
              {
                label: "Maintenance",
                value: n % 2 === 0 ? "Scheduled" : "None",
              },
              { label: "Service Level", value: rec.serviceTier },
            ]}
          />
        </Section>
      )}
      {sub === "operational-detail" && (
        <Section title="Operational detail" sample>
          <StatRow
            label="Current Status"
            value={
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <CheckCircle2 size={14} color={T.success} />
                {rec.status === "Suspended" ? "Degraded" : "Operational"}
              </span>
            }
            tone={rec.status === "Suspended" ? "warn" : "ok"}
            sample
          />
          <StatRow
            label="Recent Incidents"
            value={`${incidents} in last 30 days`}
            tone={incidents > 1 ? "warn" : "ok"}
            sample
          />
          <StatRow label="SLA" value={rec.sla} tone="ok" sample />
          <StatRow
            label="Upcoming Maintenance"
            value={
              n % 2 === 0 ? `${rec.modified} · 02:00 UTC` : "None scheduled"
            }
            sample
          />
        </Section>
      )}
    </>
  );
}

// ── Activity timeline (spec §Activity) ──
function ActivityTab() {
  const events = [
    "Consumer Added",
    "Consumer Removed",
    "Policy Updated",
    "Capacity Increased",
    "Maintenance Started",
    "Version Updated",
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
            { value: "", label: "All actors" },
            ...ACTORS.map((a) => ({ value: a, label: a })),
          ]}
        />
        <Select
          label="Action"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "All actions" },
            ...events.map((e) => ({ value: e, label: e })),
          ]}
        />
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Any time" },
            { value: "24h", label: "Last 24h" },
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
              {pick(ACTORS, i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Audit History (immutable, spec §Audit History) ──
function AuditTab() {
  const events = [
    "Service Created",
    "Service Updated",
    "Consumer Added",
    "Consumer Removed",
    "Policy Modified",
    "Capacity Changed",
    "Maintenance Scheduled",
    "Service Suspended",
    "Service Retired",
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
          value={`${pick(ACTORS, i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11.5,
          color: T.textMuted,
          marginTop: 12,
        }}
      >
        <FileText size={13} /> Immutable audit stream — exportable, retained per
        compliance policy.
      </div>
    </>
  );
}

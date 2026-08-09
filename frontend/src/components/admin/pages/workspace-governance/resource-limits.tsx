/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Capacity & Quotas → Resource Limits */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Pencil,
  UserCheck,
  Copy,
  Trash2,
  Download,
  ClipboardCheck,
  Gauge,
  FileText,
  GitCompare,
  RefreshCcw,
  Upload,
  LayoutGrid,
  Activity as ActivityIcon,
  SlidersHorizontal,
  ShieldCheck,
  TrendingUp,
  History,
  SlidersVertical,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
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
  EnforcementPill,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { UsageBar } from "#/components/admin/pages/workspace-governance/workspace-quotas";

/**
 * Resource Limits — the authoritative system for defining, monitoring, enforcing and auditing the
 * maximum infrastructure/platform/AI/storage/network capacity a workspace may consume, per resource
 * type. Prevents uncontrolled growth, protects shared infrastructure and optimizes cloud spend. Unlike
 * Workspace Quotas (overall entitlement), Resource Limits are per-resource-type ceilings. Authoritative
 * spec: docs/workspace/workspace_module/…/Workspace Governance/05_ Capacity & Quotas/resource_limits.md.
 *
 * Enterprise-Governance UX pattern (Banner · KPI · Toolbar · Filters · Search · Datatable · Bulk/Row
 * actions · 7-tab Resource Limit Detail Drawer with thresholds + enforcement). No backend → sample.
 */

type LimitType =
  | "Compute"
  | "Storage"
  | "Network"
  | "Kubernetes"
  | "Database"
  | "AI"
  | "Platform Service"
  | "Custom";
type Enforcement =
  | "enforced"
  | "monitoring"
  | "scheduled"
  | "partially-enforced";
type Status = "Healthy" | "Warning" | "Exceeded";

const WORKSPACES = [
  "Payments",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Mobile API",
];
const PROVIDERS = ["AWS", "Azure", "GCP", "Kubernetes", "Private Cloud"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const OWNERS = [
  "Capacity Admin",
  "Platform Team",
  "Cloud Team",
  "Workspace Admin",
];
const ENFORCE_MODES = [
  "Monitor Only",
  "Warn",
  "Block Provisioning",
  "Auto Scale",
  "Require Approval",
  "Hard Limit",
];

const STATUS_TONE: Record<Status, string> = {
  Healthy: T.success,
  Warning: T.warning,
  Exceeded: T.danger,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Limit {
  id: string;
  resource: string;
  limitType: LimitType;
  workspace: string;
  current: number;
  limit: number;
  unit: string;
  enforcement: Enforcement;
  status: Status;
  provider: string;
  environment: string;
  businessUnit: string;
  owner: string;
  created: string;
  peak: number;
  average: number;
  growthRate: number;
  daysRemaining: number;
}

const LIMIT_SEED: { resource: string; type: LimitType; unit: string }[] = [
  { resource: "CPU Cores", type: "Compute", unit: "vCPU" },
  { resource: "Memory", type: "Compute", unit: "GiB" },
  { resource: "GPU", type: "AI", unit: "GPU" },
  { resource: "Object Storage", type: "Storage", unit: "TB" },
  { resource: "Block Storage", type: "Storage", unit: "TB" },
  { resource: "Bandwidth", type: "Network", unit: "Gbps" },
  { resource: "Kubernetes Pods", type: "Kubernetes", unit: "pods" },
  { resource: "K8s Nodes", type: "Kubernetes", unit: "nodes" },
  { resource: "Database Instances", type: "Database", unit: "instances" },
  { resource: "DB Connections", type: "Database", unit: "conns" },
  { resource: "Inference Requests", type: "AI", unit: "req/s" },
  { resource: "AI Tokens", type: "AI", unit: "M tok" },
  { resource: "Secrets", type: "Platform Service", unit: "secrets" },
  { resource: "Automation Jobs", type: "Platform Service", unit: "jobs" },
  { resource: "Load Balancers", type: "Network", unit: "LBs" },
  { resource: "Max AI Agents", type: "Custom", unit: "agents" },
];

const SAMPLE_LIMITS: Limit[] = LIMIT_SEED.flatMap(
  ({ resource, type, unit }, i) =>
    [WORKSPACES[i % WORKSPACES.length]].map((workspace) => {
      const id = `RL-${(10000 + i * 37).toString()}`;
      const n = hashId(id + resource + workspace);
      const limit = 100 + (n % 400);
      const current = Math.round(limit * (0.4 + (n % 65) / 100));
      const util = current / limit;
      const status: Status =
        util >= 1 ? "Exceeded" : util >= 0.85 ? "Warning" : "Healthy";
      const enforcement: Enforcement =
        status === "Exceeded"
          ? "enforced"
          : pick<Enforcement>(
              ["enforced", "monitoring", "partially-enforced", "scheduled"],
              n,
            );
      return {
        id,
        resource,
        limitType: type,
        workspace,
        current: Math.min(current, Math.round(limit * 1.05)),
        limit,
        unit,
        enforcement,
        status,
        provider: pick(PROVIDERS, n),
        environment: pick(ENVIRONMENTS, n >> 1),
        businessUnit: pick(BUSINESS_UNITS, n >> 2),
        owner: pick(OWNERS, n),
        created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
        peak: Math.round(limit * (0.7 + (n % 30) / 100)),
        average: Math.round(limit * (0.4 + (n % 40) / 100)),
        growthRate: 2 + (n % 16),
        daysRemaining: 30 + (n % 260),
      };
    }),
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

export function ResourceLimitsView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fType, setFType] = React.useState("");
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

  const records = SAMPLE_LIMITS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.resource.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q)) &&
      (!fWs || r.workspace === fWs) &&
      (!fProvider || r.provider === fProvider) &&
      (!fEnv || r.environment === fEnv) &&
      (!fType || r.limitType === fType) &&
      (!fStatus || r.status === fStatus) &&
      (!fBu || r.businessUnit === fBu)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFWs("");
    setFProvider("");
    setFEnv("");
    setFType("");
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

  const configured = records.length;
  const monitored = records.length;
  const exceeded = records.filter((r) => r.status === "Exceeded").length;
  const warnings = records.filter((r) => r.status === "Warning").length;
  const healthyWorkspaces = new Set(
    records.filter((r) => r.status === "Healthy").map((r) => r.workspace),
  ).size;
  const utilization = Math.round(
    (records.reduce((a, r) => a + r.current / r.limit, 0) / records.length) *
      100,
  );
  const capacityScore =
    100 - Math.round((exceeded / configured) * 100) - warnings;

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Limit",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=capacity"),
    },
    {
      key: "edit",
      label: "Edit Limit",
      icon: <Pencil size={15} />,
      disabled: true,
    },
    {
      key: "assign",
      label: "Assign Limit",
      icon: <UserCheck size={15} />,
      disabled: true,
    },
    {
      key: "clone",
      label: "Clone Limit",
      icon: <Copy size={15} />,
      disabled: true,
    },
    {
      key: "delete",
      label: "Delete Limit",
      icon: <Trash2 size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Limits",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "review",
      label: "Run Capacity Review",
      icon: <Gauge size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Limits",
      icon: <GitCompare size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "refresh",
      label: "Refresh Usage",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "import",
      label: "Import",
      icon: <Upload size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Limit>[] = [
    {
      key: "resource",
      header: "Resource",
      sortValue: (r) => r.resource,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <SlidersVertical size={13} color={T.textMuted} />
          {r.resource}
          <span style={{ fontSize: 10.5, color: T.textMuted }}>
            · {r.limitType}
          </span>
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
      key: "current",
      header: "Current Usage",
      sortValue: (r) => r.current,
      render: (r) => `${r.current} ${r.unit}`,
    },
    {
      key: "limit",
      header: "Limit",
      sortValue: (r) => r.limit,
      render: (r) => `${r.limit} ${r.unit}`,
    },
    {
      key: "utilization",
      header: "Utilization",
      sortValue: (r) => r.current / r.limit,
      render: (r) => <UsageBar pct={(r.current / r.limit) * 100} />,
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
      <StatStripPlain
        items={[
          { label: "Configured Limits", value: configured, tone: "ok" },
          { label: "Resources Monitored", value: monitored, tone: "ok" },
          {
            label: "Exceeded Limits",
            value: exceeded,
            tone: exceeded > 0 ? "danger" : "ok",
          },
          {
            label: "Warning Thresholds",
            value: warnings,
            tone: warnings > 0 ? "warn" : "ok",
          },
          { label: "Healthy Workspaces", value: healthyWorkspaces, tone: "ok" },
          {
            label: "Quota Utilization",
            value: `${utilization}%`,
            tone: utilization >= 85 ? "warn" : "ok",
          },
          {
            label: "Cloud Spend",
            value: `$${120 + (hashId("spend") % 80)}k`,
            tone: "ok",
          },
          {
            label: "Capacity Score",
            value: `${Math.max(0, capacityScore)}%`,
            tone: capacityScore >= 80 ? "ok" : "warn",
          },
        ]}
      />

      <DiscoveryListView
        title="Resource limits"
        desc="Define and enforce the maximum infrastructure and platform resources each workspace may consume — preventing uncontrolled growth, protecting shared infrastructure and optimizing cloud spend."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search resource limits — workspace, limit name, cloud account, cluster, resource type, owner…"
        count={rows.length}
        pills={[
          {
            key: "workspace",
            label: "Workspace",
            value: fWs,
            onChange: setFWs,
            options: facet(records.map((r) => r.workspace)),
          },
          {
            key: "cloudProvider",
            label: "Cloud Provider",
            value: fProvider,
            onChange: setFProvider,
            options: facet(records.map((r) => r.provider)),
          },
          {
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "limitType",
            label: "Limit Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.limitType)),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
          {
            key: "businessUnit",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
        ]}
        presets={[{ label: "All resource limits", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "utilization", dir: "desc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<UserCheck size={13} />} onClick={clear}>
              Assign ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<Pencil size={13} />} onClick={clear}>
              Edit
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
              { label: "Increase Limit", onClick: () => {} },
              { label: "Decrease Limit", onClick: () => {} },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<SlidersVertical size={20} />}
            title="No resource limits have been configured."
            hint="Create a resource limit to cap infrastructure and platform consumption for a workspace."
            cta="Create Resource Limit"
            onCta={() => navigate("/admin/workspace-governance?tab=capacity")}
          />
        }
      />

      {sel && <LimitDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function ResourceLimitsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Resource Limits"
        subtitle="Define and enforce the maximum infrastructure and platform resources that each workspace may consume."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() =>
                navigate("/admin/workspace-governance?tab=capacity")
              }
            >
              Create Limit
            </HeaderButton>
          </>
        }
      />
      <ResourceLimitsView />
    </Page>
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
          marginBottom: 6,
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

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "usage", label: "Usage", icon: <ActivityIcon size={13} /> },
  {
    id: "thresholds",
    label: "Thresholds",
    icon: <SlidersHorizontal size={13} />,
  },
  { id: "enforcement", label: "Enforcement", icon: <ShieldCheck size={13} /> },
  { id: "forecast", label: "Forecast", icon: <TrendingUp size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function LimitDrawer({ rec, onClose }: { rec: Limit; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.resource} — ${rec.workspace}`}
      subtitle={`${rec.limitType} · ${rec.current}/${rec.limit} ${rec.unit} · ${rec.status}`}
      width={820}
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
          <HeaderButton icon={<Pencil size={13} />}>Increase</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "usage" && <UsageTab rec={rec} />}
      {tab === "thresholds" && <ThresholdsTab />}
      {tab === "enforcement" && <EnforcementTab rec={rec} />}
      {tab === "forecast" && <ForecastTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Limit }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Limit Name", v: `${rec.resource} Limit` },
              { k: "Resource Type", v: rec.limitType },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Environment", v: rec.environment, sample: true },
              { k: "Cloud Provider", v: rec.provider, sample: true },
              { k: "Limit Value", v: `${rec.limit} ${rec.unit}` },
              { k: "Unit", v: rec.unit },
              { k: "Status", v: rec.status },
              { k: "Created Date", v: rec.created, sample: true },
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
                k: "Current Usage",
                v: `${rec.current} ${rec.unit}`,
                sample: true,
              },
              {
                k: "Maximum Limit",
                v: `${rec.limit} ${rec.unit}`,
                sample: true,
              },
              { k: "Peak Usage", v: `${rec.peak} ${rec.unit}`, sample: true },
              {
                k: "Average Usage",
                v: `${rec.average} ${rec.unit}`,
                sample: true,
              },
              {
                k: "Remaining Capacity",
                v: `${Math.max(0, rec.limit - rec.current)} ${rec.unit}`,
                sample: true,
              },
              { k: "Forecast", v: `${rec.daysRemaining}d`, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function UsageTab({ rec }: { rec: Limit }) {
  const list = [
    {
      id: "current",
      metric: "Current",
      current: rec.current,
      limit: rec.limit,
      remaining: Math.max(0, rec.limit - rec.current),
      util: (rec.current / rec.limit) * 100,
    },
    {
      id: "peak",
      metric: "Peak",
      current: rec.peak,
      limit: rec.limit,
      remaining: Math.max(0, rec.limit - rec.peak),
      util: (rec.peak / rec.limit) * 100,
    },
    {
      id: "avg",
      metric: "Average",
      current: rec.average,
      limit: rec.limit,
      remaining: Math.max(0, rec.limit - rec.average),
      util: (rec.average / rec.limit) * 100,
    },
  ];
  const cols: Column<(typeof list)[number]>[] = [
    { key: "metric", header: "Metric", render: (r) => r.metric },
    {
      key: "current",
      header: "Value",
      render: (r) => `${r.current} ${rec.unit}`,
    },
    { key: "limit", header: "Limit", render: (r) => `${r.limit} ${rec.unit}` },
    {
      key: "remaining",
      header: "Remaining",
      render: (r) => `${r.remaining} ${rec.unit}`,
    },
    {
      key: "util",
      header: "Utilization",
      render: (r) => <UsageBar pct={r.util} />,
    },
  ];
  return (
    <>
      <Section title="Current resource consumption" sample>
        <StatRow
          label={rec.resource}
          value={<UsageBar pct={(rec.current / rec.limit) * 100} />}
          sample
        />
      </Section>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ThresholdsTab() {
  const thresholds = [70, 80, 90, 95, 100];
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
        <HeaderButton icon={<Plus size={13} />}>Add Threshold</HeaderButton>
        <HeaderButton variant="danger" icon={<Trash2 size={13} />}>
          Remove Threshold
        </HeaderButton>
        <HeaderButton icon={<RefreshCcw size={13} />}>
          Reset Defaults
        </HeaderButton>
        <SampleTag />
      </div>
      <Section title="Warning & enforcement thresholds" sample>
        {thresholds.map((t) => (
          <StatRow
            key={t}
            label={`${t}%`}
            value={
              t >= 100
                ? "Block provisioning"
                : t >= 90
                  ? "Alert + require approval"
                  : t >= 80
                    ? "Warn owner"
                    : "Notify"
            }
            tone={t >= 100 ? "danger" : t >= 90 ? "warn" : undefined}
            sample
          />
        ))}
      </Section>
    </>
  );
}

function EnforcementTab({ rec }: { rec: Limit }) {
  return (
    <>
      <Section title="Current enforcement" sample>
        <StatRow
          label="Enforcement Mode"
          value={<EnforcementPill status={rec.enforcement} />}
          sample
        />
        <StatRow
          label="Automatic Actions"
          value={
            rec.enforcement === "enforced"
              ? "Block over-limit provisioning"
              : "Alert only"
          }
          sample
        />
        <StatRow label="Notifications" value="Owner + Capacity Admin" sample />
      </Section>
      <Section title="Supported enforcement modes" sample>
        {ENFORCE_MODES.map((m, i) => (
          <StatRow
            key={m}
            label={m}
            value={i === 2 ? "Selected" : "Available"}
            tone={i === 2 ? "ok" : undefined}
            sample
          />
        ))}
      </Section>
    </>
  );
}

function ForecastTab({ rec }: { rec: Limit }) {
  const [ran, setRan] = React.useState(false);
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
        <HeaderButton
          variant="primary"
          icon={<TrendingUp size={13} />}
          onClick={() => setRan(true)}
        >
          Run Forecast
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Resource usage forecast" sample>
        <StatRow
          label="Growth Rate"
          value={`+${rec.growthRate}% / month`}
          sample
        />
        <StatRow
          label="Days Remaining"
          value={ran ? `${rec.daysRemaining}` : "Run forecast"}
          tone={rec.daysRemaining < 60 ? "warn" : "ok"}
          sample
        />
        <StatRow
          label="Estimated Exhaustion"
          value={ran ? `~${rec.daysRemaining} days` : "—"}
          sample
        />
        <StatRow
          label="Recommended Capacity"
          value={ran ? `${Math.round(rec.limit * 1.3)} ${rec.unit}` : "—"}
          sample
        />
      </Section>
    </>
  );
}

function ActivityTab({ rec }: { rec: Limit }) {
  const events = [
    "Limit Created",
    "Limit Updated",
    "Threshold Triggered",
    "Limit Exceeded",
    "Limit Increased",
    "Forecast Generated",
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
              {pick(OWNERS, hashId(rec.id) + i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function AuditTab() {
  const events = [
    "Limit Created",
    "Limit Modified",
    "Threshold Changed",
    "Limit Exceeded",
    "Limit Increased",
    "Forecast Executed",
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

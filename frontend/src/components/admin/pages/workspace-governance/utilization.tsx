/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Capacity & Quotas → Utilization */
import React from "react";
import {
  RefreshCcw,
  FileText,
  Download,
  GitCompare,
  Sparkles,
  TrendingUp,
  Trash2,
  Gauge,
  LayoutGrid,
  Activity as ActivityIcon,
  BarChart3,
  LineChart,
  Lightbulb,
  History,
  ShieldCheck,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Card,
  Tabs,
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
import { UsageBar } from "#/components/admin/pages/workspace-governance/workspace-quotas";

/**
 * Utilization — the authoritative operational dashboard for enterprise resource efficiency and capacity
 * optimization: how effectively allocated resources are consumed, surfacing idle resources,
 * overprovisioning, underutilization, bottlenecks and optimization opportunities. Distinct from
 * Consumption (actual usage), Workspace Quotas (allocated) and Resource Limits (max). Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/05_ Capacity & Quotas/utilization.md.
 *
 * Enterprise-Operations UX pattern (Banner · KPI · Toolbar · Filters · Search · Datatable · Bulk/Row
 * actions · 8-tab Utilization Detail Drawer with capacity analysis + optimization). No backend → sample.
 */

type ResType = "Compute" | "Storage" | "Networking" | "Databases" | "Kubernetes" | "AI" | "Automation" | "Platform Services";
type Efficiency = "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
type Status = "Healthy" | "Underutilized" | "Overutilized";

const WORKSPACES = ["Payments", "Retail Web", "Data Lake", "Identity", "Analytics", "Mobile API"];
const PROVIDERS = ["AWS", "Azure", "GCP", "Private Cloud"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const BUSINESS_UNITS = ["Finance", "Engineering", "Operations", "Retail", "Corporate"];
const OWNERS = ["Capacity Admin", "FinOps", "Cloud Team", "Platform Team"];

const STATUS_TONE: Record<Status, string> = { Healthy: T.success, Underutilized: T.warning, Overutilized: T.danger };
const EFF_TONE: Record<Efficiency, string> = { Excellent: T.success, Good: T.success, Fair: T.warning, Poor: T.danger, Critical: T.danger };

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Util {
  id: string;
  resource: string;
  resType: ResType;
  workspace: string;
  allocated: number;
  used: number;
  unit: string;
  status: Status;
  efficiency: Efficiency;
  provider: string;
  environment: string;
  businessUnit: string;
  owner: string;
  average: number;
  peak: number;
  idle: number;
  savings: number;
}

const UTIL_SEED: { resource: string; type: ResType; unit: string }[] = [
  { resource: "Kubernetes Cluster", type: "Kubernetes", unit: "vCPU" },
  { resource: "EC2 Fleet", type: "Compute", unit: "vCPU" },
  { resource: "Object Storage", type: "Storage", unit: "TB" },
  { resource: "PostgreSQL", type: "Databases", unit: "conns" },
  { resource: "GPU Cluster", type: "AI", unit: "GPU" },
  { resource: "Load Balancers", type: "Networking", unit: "LBs" },
  { resource: "Automation Runners", type: "Automation", unit: "runners" },
  { resource: "Secrets Store", type: "Platform Services", unit: "secrets" },
  { resource: "Redis Cache", type: "Databases", unit: "GiB" },
  { resource: "Data Lake Storage", type: "Storage", unit: "TB" },
  { resource: "Inference Endpoints", type: "AI", unit: "req/s" },
  { resource: "VM Scale Set", type: "Compute", unit: "vCPU" },
  { resource: "Message Queues", type: "Platform Services", unit: "queues" },
  { resource: "Bandwidth", type: "Networking", unit: "Gbps" },
];

const SAMPLE_UTIL: Util[] = UTIL_SEED.map(({ resource, type, unit }, i) => {
  const id = `UT-${(10000 + i * 37).toString()}`;
  const n = hashId(id + resource);
  const allocated = 100 + (n % 300);
  const used = Math.round(allocated * (0.15 + (n % 80) / 100));
  const util = used / allocated;
  const status: Status = util >= 0.9 ? "Overutilized" : util <= 0.35 ? "Underutilized" : "Healthy";
  const efficiency: Efficiency = util >= 0.65 && util <= 0.85 ? "Excellent" : util >= 0.5 ? "Good" : util >= 0.35 ? "Fair" : util < 0.2 ? "Critical" : "Poor";
  return {
    id,
    resource,
    resType: type,
    workspace: pick(WORKSPACES, n >> 1),
    allocated,
    used: Math.min(used, allocated),
    unit,
    status,
    efficiency,
    provider: pick(PROVIDERS, n),
    environment: pick(ENVIRONMENTS, n >> 2),
    businessUnit: pick(BUSINESS_UNITS, n >> 3),
    owner: pick(OWNERS, n),
    average: Math.round(allocated * (0.3 + (n % 40) / 100)),
    peak: Math.round(allocated * (0.7 + (n % 30) / 100)),
    idle: Math.max(0, allocated - used),
    savings: status === "Underutilized" ? 2 + (n % 18) : 0,
  };
});

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_TONE[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
      {status}
    </span>
  );
}
function EffBadge({ efficiency }: { efficiency: Efficiency }) {
  const c = EFF_TONE[efficiency];
  return <span style={{ fontSize: 11.5, color: c }}>{efficiency}</span>;
}

export function UtilizationView() {
  const [search, setSearch] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_UTIL;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.resource.toLowerCase().includes(q) || r.workspace.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q)) &&
      (!fWs || r.workspace === fWs) &&
      (!fProvider || r.provider === fProvider) &&
      (!fEnv || r.environment === fEnv) &&
      (!fType || r.resType === fType) &&
      (!fStatus || r.status === fStatus) &&
      (!fBu || r.businessUnit === fBu)
    );
  });
  const hasFilters = !!(search || fWs || fProvider || fEnv || fType || fStatus || fBu);
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
  const facet = (vals: string[]) => [{ value: "", label: "All" }, ...Array.from(new Set(vals)).sort().map((v) => ({ value: v, label: v }))];

  const overall = Math.round((records.reduce((a, r) => a + r.used / r.allocated, 0) / records.length) * 100);
  const idle = records.reduce((a, r) => a + r.idle, 0);
  const over = records.filter((r) => r.status === "Overutilized").length;
  const under = records.filter((r) => r.status === "Underutilized").length;
  const effScore = Math.round((records.filter((r) => r.efficiency === "Excellent" || r.efficiency === "Good").length / records.length) * 100);
  const savings = records.reduce((a, r) => a + r.savings, 0);

  const toolbar: CommandItem[] = [
    { key: "refresh", label: "Refresh", icon: <RefreshCcw size={15} />, onClick: () => setSelId(null) },
    { key: "report", label: "Generate Report", icon: <FileText size={15} />, disabled: true },
    { key: "export", label: "Export", icon: <Download size={15} />, disabled: true },
    { key: "compare", label: "Compare Periods", icon: <GitCompare size={15} />, disabled: true },
    { key: "optimize", label: "Run Optimization", icon: <Sparkles size={15} />, disabled: true },
    { key: "forecast", label: "Forecast Utilization", icon: <TrendingUp size={15} />, disabled: true },
    { key: "waste", label: "Detect Waste", icon: <Trash2 size={15} />, onClick: () => setFStatus("Underutilized") },
    { key: "capacity", label: "Capacity Analysis", icon: <Gauge size={15} />, disabled: true },
  ];

  const cols: Column<Util>[] = [
    {
      key: "resource",
      header: "Resource",
      sortValue: (r) => r.resource,
      render: (r) => (
        <span style={{ color: T.textPrimary, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Gauge size={13} color={T.textMuted} />
          {r.resource}
          <span style={{ fontSize: 10.5, color: T.textMuted }}>· {r.resType}</span>
        </span>
      ),
    },
    { key: "workspace", header: "Workspace", sortValue: (r) => r.workspace, render: (r) => r.workspace },
    { key: "allocated", header: "Allocated", sortValue: (r) => r.allocated, render: (r) => `${r.allocated} ${r.unit}` },
    { key: "used", header: "Used", sortValue: (r) => r.used, render: (r) => `${r.used} ${r.unit}` },
    { key: "utilization", header: "Utilization", sortValue: (r) => r.used / r.allocated, render: (r) => <UsageBar pct={(r.used / r.allocated) * 100} tone={r.used / r.allocated <= 0.35 ? T.warning : undefined} /> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard title="Overall Utilization" value={`${overall}%`} tone={overall >= 60 ? "ok" : "warn"} sub={<>Enterprise average <SampleTag /></>} />
        <PostureCard title="Idle Capacity" value={`${idle}u`} tone={idle > 0 ? "warn" : "ok"} sub={<>Unused allocation <SampleTag /></>} />
        <PostureCard title="Overutilized Resources" value={over} tone={over > 0 ? "danger" : "ok"} sub={<>Near saturation <SampleTag /></>} />
        <PostureCard title="Underutilized Resources" value={under} tone={under > 0 ? "warn" : "ok"} sub={<>Optimization targets <SampleTag /></>} />
        <PostureCard title="Efficiency Score" value={`${effScore}%`} tone={effScore >= 70 ? "ok" : "warn"} sub={<>Good/Excellent share <SampleTag /></>} />
        <PostureCard title="Optimization Savings" value={`$${savings}k`} tone="ok" sub={<>Estimated monthly <SampleTag /></>} />
        <PostureCard title="Average Utilization" value={`${overall}%`} tone={overall >= 60 ? "ok" : "warn"} sub={<>Across resources <SampleTag /></>} />
        <PostureCard title="Capacity Health" value={`${100 - over * 6}%`} tone={over === 0 ? "ok" : "warn"} sub={<>Saturation posture <SampleTag /></>} />
      </PostureGrid>

      <Card
        title="Utilization"
        desc="Measure resource efficiency, identify underutilized capacity, optimize infrastructure allocation and improve enterprise resource utilization across cloud, Kubernetes, AI, storage and databases."
      >
        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search utilization — workspace, application, cloud resource, cluster, database, storage, service, owner…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select label="Workspace" value={fWs} onChange={setFWs} options={facet(records.map((r) => r.workspace))} />
          <Select label="Cloud Provider" value={fProvider} onChange={setFProvider} options={facet(records.map((r) => r.provider))} />
          <Select label="Environment" value={fEnv} onChange={setFEnv} options={facet(records.map((r) => r.environment))} />
          <Select label="Resource Type" value={fType} onChange={setFType} options={facet(records.map((r) => r.resType))} />
          <Select label="Utilization Status" value={fStatus} onChange={setFStatus} options={facet(records.map((r) => r.status))} />
          <Select label="Business Unit" value={fBu} onChange={setFBu} options={facet(records.map((r) => r.businessUnit))} />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "utilization", dir: "asc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<Sparkles size={13} />} onClick={clear}>Optimize ({ids.length})</HeaderButton>
              <HeaderButton icon={<FileText size={13} />} onClick={clear}>Generate Report</HeaderButton>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>Export</HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View", onClick: () => setSelId(r.id) },
                { label: "Analyze", onClick: () => setSelId(r.id) },
                { label: "Optimize", onClick: () => setSelId(r.id) },
                { label: "Forecast", onClick: () => setSelId(r.id) },
                { label: "Export", onClick: () => {} },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Gauge size={20} />}
              title="No utilization metrics are available."
              hint="Refresh metrics to measure how efficiently allocated resources are being consumed."
              cta="Refresh Metrics"
              onCta={() => setSelId(null)}
            />
          }
        />
      </Card>

      {sel && <UtilDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function UtilizationPage() {
  return (
    <Page>
      <PageHeader
        title="Utilization"
        subtitle="Measure resource efficiency, identify underutilized capacity, optimize infrastructure allocation, and improve enterprise resource utilization."
        actions={<ScopeBadge scope="Organization" />}
      />
      <UtilizationView />
    </Page>
  );
}

function Section({ title, children, sample }: { title: string; children: React.ReactNode; sample?: boolean }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
        {title}
        {sample && <SampleTag />}
      </div>
      {children}
    </div>
  );
}

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "metrics", label: "Metrics", icon: <ActivityIcon size={13} /> },
  { id: "capacity", label: "Capacity Analysis", icon: <BarChart3 size={13} /> },
  { id: "trends", label: "Trends", icon: <LineChart size={13} /> },
  { id: "optimization", label: "Optimization", icon: <Lightbulb size={13} /> },
  { id: "forecast", label: "Forecast", icon: <TrendingUp size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function UtilDrawer({ rec, onClose }: { rec: Util; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.resource} — ${rec.workspace}`}
      subtitle={`${rec.resType} · ${rec.used}/${rec.allocated} ${rec.unit} · ${rec.status}`}
      width={840}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
          <HeaderButton icon={<Sparkles size={13} />}>Optimize</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>Export</HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "metrics" && <MetricsTab rec={rec} />}
      {tab === "capacity" && <CapacityTab rec={rec} />}
      {tab === "trends" && <TrendsTab />}
      {tab === "optimization" && <OptimizationTab rec={rec} />}
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
function OverviewTab({ rec }: { rec: Util }) {
  const [sub, setSub] = React.useState("general");
  const util = Math.round((rec.used / rec.allocated) * 100);
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Resource", v: rec.resource },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Provider", v: rec.provider, sample: true },
              { k: "Environment", v: rec.environment, sample: true },
              { k: "Allocated Capacity", v: `${rec.allocated} ${rec.unit}` },
              { k: "Used Capacity", v: `${rec.used} ${rec.unit}` },
              { k: "Utilization", v: `${util}%` },
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
              { k: "Current Utilization", v: `${util}%`, sample: true },
              { k: "Average Utilization", v: `${Math.round((rec.average / rec.allocated) * 100)}%`, sample: true },
              { k: "Peak Utilization", v: `${Math.round((rec.peak / rec.allocated) * 100)}%`, sample: true },
              { k: "Idle Capacity", v: `${rec.idle} ${rec.unit}`, sample: true },
              { k: "Available Capacity", v: `${Math.max(0, rec.allocated - rec.used)} ${rec.unit}`, sample: true },
              { k: "Efficiency Score", v: <EffBadge efficiency={rec.efficiency} />, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function MetricsTab({ rec }: { rec: Util }) {
  const metrics = ["CPU", "Memory", "Storage", "Network", "GPU", "Database"];
  const list = metrics.map((m) => {
    const s = hashId(rec.id + m);
    const alloc = 50 + (s % 100);
    const used = Math.round(alloc * (0.2 + (s % 70) / 100));
    return { id: m, metric: m, allocated: alloc, used: Math.min(used, alloc), util: (Math.min(used, alloc) / alloc) * 100, health: used / alloc >= 0.9 ? "Overutilized" : used / alloc <= 0.35 ? "Idle" : "Healthy" };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "metric", header: "Metric", render: (r) => r.metric },
    { key: "allocated", header: "Allocated", render: (r) => r.allocated },
    { key: "used", header: "Used", render: (r) => r.used },
    { key: "util", header: "Utilization", render: (r) => <UsageBar pct={r.util} /> },
    { key: "health", header: "Health", render: (r) => <span style={{ color: r.health === "Healthy" ? T.success : T.warning }}>{r.health}</span> },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Utilization metrics. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function CapacityTab({ rec }: { rec: Util }) {
  const util = (rec.used / rec.allocated) * 100;
  return (
    <Section title="Capacity analysis — resource efficiency" sample>
      <StatRow label="Allocated Capacity" value={`${rec.allocated} ${rec.unit}`} sample />
      <StatRow label="Consumed Capacity" value={`${rec.used} ${rec.unit}`} sample />
      <StatRow label="Unused Capacity" value={`${rec.idle} ${rec.unit}`} tone={rec.idle > 0 ? "warn" : "ok"} sample />
      <StatRow label="Waste" value={rec.status === "Underutilized" ? `~$${rec.savings}k/mo` : "Minimal"} tone={rec.status === "Underutilized" ? "warn" : "ok"} sample />
      <StatRow label="Utilization" value={<UsageBar pct={util} tone={util <= 0.35 ? T.warning : undefined} />} sample />
      <StatRow label="Recommended Allocation" value={rec.status === "Underutilized" ? `${Math.round(rec.allocated * 0.7)} ${rec.unit}` : `${rec.allocated} ${rec.unit}`} sample />
    </Section>
  );
}

function TrendsTab() {
  const [view, setView] = React.useState("Monthly");
  const bars = [42, 55, 48, 63, 70, 58, 66, 72, 61, 68, 74, 69];
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <Select label="View" value={view} onChange={setView} options={["Hourly", "Daily", "Weekly", "Monthly", "Quarterly", "Yearly"].map((v) => ({ value: v, label: v }))} />
        <SampleTag />
      </div>
      <Section title={`Utilization over time (${view})`} sample>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, padding: "8px 0" }}>
          {bars.map((b, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", height: `${b}%`, background: b >= 85 ? T.danger : b <= 40 ? T.warning : T.accent, borderRadius: "3px 3px 0 0" }} />
              <span style={{ fontSize: 9, color: T.textMuted }}>{i + 1}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function OptimizationTab({ rec }: { rec: Util }) {
  const opts = ["Downsize Compute", "Resize Cluster", "Archive Storage", "Remove Idle Resources", "Consolidate Workloads", "Optimize AI Usage", "Reduce Reserved Capacity", "Merge Kubernetes Nodes"];
  const list = opts.map((o, i) => {
    const m = hashId(rec.id + o);
    return { id: o, recommendation: o, savings: `$${1 + (m % 12)}k/mo`, priority: pick(["High", "Medium", "Low"], m), impact: pick(["Low", "Medium"], m), risk: pick(["Low", "Low", "Medium"], m) };
  }).slice(0, rec.status === "Underutilized" ? 8 : 3);
  const cols: Column<(typeof list)[number]>[] = [
    { key: "recommendation", header: "Recommendation", render: (r) => r.recommendation },
    { key: "savings", header: "Potential Savings", render: (r) => <span style={{ color: T.success }}>{r.savings}</span> },
    { key: "priority", header: "Priority", render: (r) => r.priority },
    { key: "impact", header: "Impact", render: (r) => r.impact },
    { key: "risk", header: "Risk", render: (r) => r.risk },
  ];
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <HeaderButton variant="primary" icon={<Sparkles size={13} />}>Run Optimization</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ForecastTab({ rec }: { rec: Util }) {
  const [ran, setRan] = React.useState(false);
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <HeaderButton variant="primary" icon={<TrendingUp size={13} />} onClick={() => setRan(true)}>Generate Forecast</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export Forecast</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Utilization forecast" sample>
        <StatRow label="Growth Trend" value={ran ? "+8% / month" : "Run forecast"} sample />
        <StatRow label="Projected Utilization" value={ran ? `${Math.min(100, Math.round((rec.used / rec.allocated) * 100) + 20)}% in 90d` : "—"} sample />
        <StatRow label="Capacity Exhaustion" value={ran ? (rec.status === "Overutilized" ? "~40 days" : "Not projected") : "—"} tone={rec.status === "Overutilized" ? "warn" : "ok"} sample />
        <StatRow label="Recommended Capacity" value={ran ? `${Math.round(rec.allocated * 1.2)} ${rec.unit}` : "—"} sample />
        <StatRow label="Forecast Confidence" value={ran ? "80%" : "—"} sample />
      </Section>
    </>
  );
}

function ActivityTab({ rec }: { rec: Util }) {
  const events = ["Utilization Updated", "Optimization Suggested", "Forecast Generated", "Capacity Increased", "Capacity Reduced", "Efficiency Improved"];
  return (
    <>
      {events.map((e, i) => (
        <div key={e} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, marginTop: 5, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>{pick(OWNERS, hashId(rec.id) + i)} · {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago</div>
          </div>
        </div>
      ))}
    </>
  );
}

function AuditTab() {
  const events = ["Utilization Recorded", "Forecast Generated", "Optimization Executed", "Efficiency Calculated", "Report Exported"];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
        <ShieldCheck size={14} /> Read-only immutable log <SampleTag />
      </div>
      {events.map((e, i) => (
        <StatRow key={e} label={e} value={`${pick(OWNERS, i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`} tone="ok" sample />
      ))}
    </>
  );
}

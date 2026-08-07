/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Capacity & Quotas → Consumption */
import React from "react";
import {
  RefreshCcw,
  FileText,
  Download,
  CalendarClock,
  GitCompare,
  TrendingUp,
  DollarSign,
  Receipt,
  AlertTriangle,
  LayoutGrid,
  Activity as ActivityIcon,
  LineChart,
  Lightbulb,
  History,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
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

/**
 * Consumption — the authoritative source for enterprise resource usage: real-time and historical
 * visibility into how workspaces consume resources across cloud, Kubernetes, platform services, AI,
 * networking, storage, databases and shared services — for capacity planning, cost governance,
 * operational monitoring and chargeback/showback. Distinct from Workspace Quotas (allocated) and
 * Resource Limits (max). Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/05_ Capacity & Quotas/consumption.md.
 *
 * Enterprise-Operations UX pattern (Banner · KPI · Toolbar · Filters · Search · Datatable · Bulk/Row
 * actions · 8-tab Consumption Detail Drawer with cost + recommendations). No backend → sample.
 */

type ResType = "Compute" | "Storage" | "Networking" | "Databases" | "Kubernetes" | "AI" | "Automation" | "Platform Services";
type Status = "Healthy" | "Rising" | "Spiking";

const WORKSPACES = ["Payments", "Retail Web", "Data Lake", "Identity", "Analytics", "Mobile API"];
const PROVIDERS = ["AWS", "Azure", "GCP", "Private Cloud"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const BUSINESS_UNITS = ["Finance", "Engineering", "Operations", "Retail", "Corporate"];
const OWNERS = ["Capacity Admin", "FinOps", "Cloud Team", "Platform Team"];
const COST_CENTERS = ["CC-1001", "CC-1002", "CC-2001", "CC-3001"];

const STATUS_TONE: Record<Status, string> = { Healthy: T.success, Rising: T.warning, Spiking: T.danger };

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Consumption {
  id: string;
  resource: string;
  resType: ResType;
  workspace: string;
  current: number;
  average: number;
  peak: number;
  unit: string;
  growth: number;
  status: Status;
  provider: string;
  environment: string;
  businessUnit: string;
  owner: string;
  costCenter: string;
  monthlyCost: number;
  available: number;
}

const CONS_SEED: { resource: string; type: ResType; unit: string }[] = [
  { resource: "CPU", type: "Compute", unit: "vCPU" },
  { resource: "Memory", type: "Compute", unit: "GiB" },
  { resource: "Object Storage", type: "Storage", unit: "TB" },
  { resource: "Bandwidth", type: "Networking", unit: "Gbps" },
  { resource: "PostgreSQL", type: "Databases", unit: "conns" },
  { resource: "Kubernetes Pods", type: "Kubernetes", unit: "pods" },
  { resource: "GPU Hours", type: "AI", unit: "GPU-h" },
  { resource: "AI Tokens", type: "AI", unit: "M tok" },
  { resource: "API Requests", type: "Platform Services", unit: "req/s" },
  { resource: "Automation Jobs", type: "Automation", unit: "jobs" },
  { resource: "Block Storage", type: "Storage", unit: "TB" },
  { resource: "Load Balancers", type: "Networking", unit: "LBs" },
  { resource: "Inference", type: "AI", unit: "req/s" },
  { resource: "Message Queues", type: "Platform Services", unit: "queues" },
];

const SAMPLE_CONSUMPTION: Consumption[] = CONS_SEED.map(({ resource, type, unit }, i) => {
  const id = `CN-${(10000 + i * 37).toString()}`;
  const n = hashId(id + resource);
  const current = 40 + (n % 120);
  const growth = -8 + (n % 32);
  const status: Status = growth >= 20 ? "Spiking" : growth >= 8 ? "Rising" : "Healthy";
  return {
    id,
    resource,
    resType: type,
    workspace: pick(WORKSPACES, n >> 1),
    current,
    average: Math.round(current * (0.7 + (n % 20) / 100)),
    peak: Math.round(current * (1.1 + (n % 30) / 100)),
    unit,
    growth,
    status,
    provider: pick(PROVIDERS, n),
    environment: pick(ENVIRONMENTS, n >> 2),
    businessUnit: pick(BUSINESS_UNITS, n >> 3),
    owner: pick(OWNERS, n),
    costCenter: pick(COST_CENTERS, n),
    monthlyCost: 2 + (n % 40),
    available: 20 + (n % 80),
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
function GrowthBadge({ growth }: { growth: number }) {
  const up = growth >= 0;
  const c = growth >= 20 ? T.danger : growth >= 8 ? T.warning : up ? T.textNav : T.success;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: c, fontSize: 12 }}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {up ? "+" : ""}{growth}%
    </span>
  );
}

export function ConsumptionView() {
  const [search, setSearch] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fCost, setFCost] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_CONSUMPTION;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.resource.toLowerCase().includes(q) || r.workspace.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q)) &&
      (!fWs || r.workspace === fWs) &&
      (!fProvider || r.provider === fProvider) &&
      (!fEnv || r.environment === fEnv) &&
      (!fType || r.resType === fType) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fCost || r.costCenter === fCost)
    );
  });
  const hasFilters = !!(search || fWs || fProvider || fEnv || fType || fBu || fCost);
  const clearFilters = () => {
    setSearch("");
    setFWs("");
    setFProvider("");
    setFEnv("");
    setFType("");
    setFBu("");
    setFCost("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [{ value: "", label: "All" }, ...Array.from(new Set(vals)).sort().map((v) => ({ value: v, label: v }))];

  const current = records.reduce((a, r) => a + r.current, 0);
  const peak = records.reduce((a, r) => a + r.peak, 0);
  const avgUtil = Math.round((records.reduce((a, r) => a + r.average, 0) / current) * 100);
  const available = records.reduce((a, r) => a + r.available, 0);
  const growth = Math.round(records.reduce((a, r) => a + r.growth, 0) / records.length);
  const cloudCost = records.reduce((a, r) => a + r.monthlyCost, 0);
  const topConsumer = [...records].sort((a, b) => b.current - a.current)[0]?.workspace ?? "—";

  const toolbar: CommandItem[] = [
    { key: "refresh", label: "Refresh", icon: <RefreshCcw size={15} />, onClick: () => setSelId(null) },
    { key: "report", label: "Generate Report", icon: <FileText size={15} />, disabled: true },
    { key: "export", label: "Export", icon: <Download size={15} />, disabled: true },
    { key: "schedule", label: "Schedule Report", icon: <CalendarClock size={15} />, disabled: true },
    { key: "compare", label: "Compare Periods", icon: <GitCompare size={15} />, disabled: true },
    { key: "forecast", label: "Forecast Usage", icon: <TrendingUp size={15} />, disabled: true },
    { key: "cost", label: "Cost Analysis", icon: <DollarSign size={15} />, disabled: true },
    { key: "chargeback", label: "Show Chargeback", icon: <Receipt size={15} />, disabled: true },
    { key: "anomalies", label: "Detect Anomalies", icon: <AlertTriangle size={15} />, onClick: () => setFType("") },
  ];

  const cols: Column<Consumption>[] = [
    {
      key: "resource",
      header: "Resource",
      sortValue: (r) => r.resource,
      render: (r) => (
        <span style={{ color: T.textPrimary, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Receipt size={13} color={T.textMuted} />
          {r.resource}
          <span style={{ fontSize: 10.5, color: T.textMuted }}>· {r.resType}</span>
        </span>
      ),
    },
    { key: "workspace", header: "Workspace", sortValue: (r) => r.workspace, render: (r) => r.workspace },
    { key: "current", header: "Current Usage", sortValue: (r) => r.current, render: (r) => `${r.current} ${r.unit}` },
    { key: "average", header: "Average Usage", sortValue: (r) => r.average, render: (r) => `${r.average} ${r.unit}` },
    { key: "peak", header: "Peak Usage", sortValue: (r) => r.peak, render: (r) => `${r.peak} ${r.unit}` },
    { key: "growth", header: "Growth", sortValue: (r) => r.growth, render: (r) => <GrowthBadge growth={r.growth} /> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard title="Current Consumption" value={`${current}u`} tone="ok" sub={<>Live enterprise usage <SampleTag /></>} />
        <PostureCard title="Peak Consumption" value={`${peak}u`} tone="ok" sub={<>Highest observed <SampleTag /></>} />
        <PostureCard title="Average Utilization" value={`${avgUtil}%`} tone={avgUtil >= 60 ? "ok" : "warn"} sub={<>Of current usage <SampleTag /></>} />
        <PostureCard title="Available Capacity" value={`${available}u`} tone="ok" sub={<>Remaining headroom <SampleTag /></>} />
        <PostureCard title="Monthly Growth" value={`${growth >= 0 ? "+" : ""}${growth}%`} tone={growth >= 15 ? "warn" : "ok"} sub={<>Across resources <SampleTag /></>} />
        <PostureCard title="Cloud Cost" value={`$${cloudCost}k`} tone="ok" sub={<>Current month <SampleTag /></>} />
        <PostureCard title="Top Consumer" value={topConsumer} tone="ok" sub={<>Highest usage <SampleTag /></>} />
        <PostureCard title="Forecast Accuracy" value={`${85 + (hashId("acc") % 12)}%`} tone="ok" sub={<>Model reliability <SampleTag /></>} />
      </PostureGrid>

      <Card
        title="Consumption"
        desc="Monitor real-time and historical resource consumption across all enterprise workspaces, cloud providers, Kubernetes clusters, AI services and shared infrastructure — for capacity, cost governance and chargeback."
      >
        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search consumption — workspace, cloud account, cluster, application, database, storage, resource, owner…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select label="Workspace" value={fWs} onChange={setFWs} options={facet(records.map((r) => r.workspace))} />
          <Select label="Cloud Provider" value={fProvider} onChange={setFProvider} options={facet(records.map((r) => r.provider))} />
          <Select label="Environment" value={fEnv} onChange={setFEnv} options={facet(records.map((r) => r.environment))} />
          <Select label="Resource Type" value={fType} onChange={setFType} options={facet(records.map((r) => r.resType))} />
          <Select label="Business Unit" value={fBu} onChange={setFBu} options={facet(records.map((r) => r.businessUnit))} />
          <Select label="Cost Center" value={fCost} onChange={setFCost} options={facet(records.map((r) => r.costCenter))} />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "current", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<GitCompare size={13} />} onClick={clear}>Compare ({ids.length})</HeaderButton>
              <HeaderButton icon={<TrendingUp size={13} />} onClick={clear}>Forecast</HeaderButton>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>Export</HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View", onClick: () => setSelId(r.id) },
                { label: "Analyze", onClick: () => setSelId(r.id) },
                { label: "Compare", onClick: () => setSelId(r.id) },
                { label: "Forecast", onClick: () => setSelId(r.id) },
                { label: "Export", onClick: () => {} },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Receipt size={20} />}
              title="No consumption data is available."
              hint="Refresh consumption data to see real-time resource usage across workspaces."
              cta="Refresh Consumption Data"
              onCta={() => setSelId(null)}
            />
          }
        />
      </Card>

      {sel && <ConsumptionDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function ConsumptionPage() {
  return (
    <Page>
      <PageHeader
        title="Consumption"
        subtitle="Monitor real-time and historical resource consumption across all enterprise workspaces, cloud providers, Kubernetes clusters, AI services, and shared infrastructure."
        actions={<ScopeBadge scope="Organization" />}
      />
      <ConsumptionView />
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
  { id: "trends", label: "Trends", icon: <LineChart size={13} /> },
  { id: "cost", label: "Cost", icon: <DollarSign size={13} /> },
  { id: "forecast", label: "Forecast", icon: <TrendingUp size={13} /> },
  { id: "recommendations", label: "Recommendations", icon: <Lightbulb size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function ConsumptionDrawer({ rec, onClose }: { rec: Consumption; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.resource} — ${rec.workspace}`}
      subtitle={`${rec.resType} · ${rec.current} ${rec.unit} · ${rec.growth >= 0 ? "+" : ""}${rec.growth}% · ${rec.status}`}
      width={840}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
          <HeaderButton icon={<TrendingUp size={13} />}>Forecast</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>Export</HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "metrics" && <MetricsTab rec={rec} />}
      {tab === "trends" && <TrendsTab />}
      {tab === "cost" && <CostTab rec={rec} />}
      {tab === "forecast" && <ForecastTab rec={rec} />}
      {tab === "recommendations" && <RecommendationsTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Consumption }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Resource", v: rec.resource },
              { k: "Provider", v: rec.provider, sample: true },
              { k: "Environment", v: rec.environment, sample: true },
              { k: "Current Usage", v: `${rec.current} ${rec.unit}` },
              { k: "Peak Usage", v: `${rec.peak} ${rec.unit}` },
              { k: "Average Usage", v: `${rec.average} ${rec.unit}` },
              { k: "Growth Rate", v: `${rec.growth >= 0 ? "+" : ""}${rec.growth}%` },
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
              { k: "Current Usage", v: `${rec.current} ${rec.unit}`, sample: true },
              { k: "Average Usage", v: `${rec.average} ${rec.unit}`, sample: true },
              { k: "Peak Usage", v: `${rec.peak} ${rec.unit}`, sample: true },
              { k: "Available Capacity", v: `${rec.available} ${rec.unit}`, sample: true },
              { k: "Forecast", v: `${Math.round(rec.current * (1 + rec.growth / 100))} ${rec.unit}`, sample: true },
              { k: "Monthly Growth", v: `${rec.growth >= 0 ? "+" : ""}${rec.growth}%`, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function MetricsTab({ rec }: { rec: Consumption }) {
  const metrics = ["CPU", "Memory", "Storage", "Bandwidth", "Database", "GPU"];
  const list = metrics.map((m) => {
    const s = hashId(rec.id + m);
    return { id: m, metric: m, current: 20 + (s % 80), average: 15 + (s % 60), peak: 40 + (s % 90), unit: pick(["vCPU", "GiB", "TB", "Gbps"], s) };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "metric", header: "Metric", render: (r) => r.metric },
    { key: "current", header: "Current", render: (r) => r.current },
    { key: "average", header: "Average", render: (r) => r.average },
    { key: "peak", header: "Peak", render: (r) => r.peak },
    { key: "unit", header: "Unit", render: (r) => r.unit },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Detailed usage metrics. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function TrendsTab() {
  const [view, setView] = React.useState("Monthly");
  const bars = [40, 45, 52, 48, 60, 66, 58, 70, 64, 72, 78, 74];
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <Select label="View" value={view} onChange={setView} options={["Hourly", "Daily", "Weekly", "Monthly", "Quarterly", "Yearly"].map((v) => ({ value: v, label: v }))} />
        <SampleTag />
      </div>
      <Section title={`Historical usage (${view})`} sample>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, padding: "8px 0" }}>
          {bars.map((b, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", height: `${b}%`, background: T.accent, borderRadius: "3px 3px 0 0" }} />
              <span style={{ fontSize: 9, color: T.textMuted }}>{i + 1}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function CostTab({ rec }: { rec: Consumption }) {
  return (
    <Section title="Consumption cost" sample>
      <KVGrid
        items={[
          { k: "Current Cost", v: `$${rec.monthlyCost}k`, sample: true },
          { k: "Projected Cost", v: `$${Math.round(rec.monthlyCost * (1 + rec.growth / 100))}k`, sample: true },
          { k: "Monthly Cost", v: `$${rec.monthlyCost}k`, sample: true },
          { k: "Yearly Cost", v: `$${rec.monthlyCost * 12}k`, sample: true },
          { k: "Cost per Workspace", v: `$${rec.monthlyCost}k`, sample: true },
          { k: "Cost Center", v: rec.costCenter, sample: true },
        ]}
      />
    </Section>
  );
}

function ForecastTab({ rec }: { rec: Consumption }) {
  const [ran, setRan] = React.useState(false);
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <HeaderButton variant="primary" icon={<TrendingUp size={13} />} onClick={() => setRan(true)}>Generate Forecast</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Consumption forecast" sample>
        <StatRow label="Growth Trend" value={`${rec.growth >= 0 ? "+" : ""}${rec.growth}% / month`} sample />
        <StatRow label="Projected Usage" value={ran ? `${Math.round(rec.current * (1 + (rec.growth * 3) / 100))} ${rec.unit} in 90d` : "Run forecast"} sample />
        <StatRow label="Capacity Exhaustion" value={ran ? (rec.status === "Spiking" ? "~50 days" : "Not projected") : "—"} tone={rec.status === "Spiking" ? "warn" : "ok"} sample />
        <StatRow label="Recommended Capacity" value={ran ? `${Math.round(rec.current * 1.4)} ${rec.unit}` : "—"} sample />
        <StatRow label="Confidence Score" value={ran ? "84%" : "—"} sample />
      </Section>
    </>
  );
}

function RecommendationsTab({ rec }: { rec: Consumption }) {
  const recs = ["Reduce Idle Resources", "Resize Compute", "Archive Storage", "Optimize Kubernetes", "Reduce AI Costs", "Consolidate Services", "Increase Reserved Capacity"];
  const list = recs.map((r) => {
    const m = hashId(rec.id + r);
    return { id: r, recommendation: r, savings: `$${1 + (m % 10)}k/mo`, priority: pick(["High", "Medium", "Low"], m), impact: pick(["Low", "Medium"], m) };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "recommendation", header: "Recommendation", render: (r) => r.recommendation },
    { key: "savings", header: "Savings", render: (r) => <span style={{ color: T.success }}>{r.savings}</span> },
    { key: "priority", header: "Priority", render: (r) => r.priority },
    { key: "impact", header: "Impact", render: (r) => r.impact },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Optimization recommendations. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ActivityTab({ rec }: { rec: Consumption }) {
  const events = ["Usage Increased", "Usage Decreased", "Threshold Reached", "Forecast Generated", "Optimization Applied", "Report Exported"];
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
  const events = ["Consumption Recorded", "Forecast Generated", "Report Exported", "Cost Calculated", "Chargeback Generated", "Recommendation Accepted"];
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

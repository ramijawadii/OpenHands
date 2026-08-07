/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Capacity & Quotas → Growth Forecasting */
import React from "react";
import {
  TrendingUp,
  RefreshCcw,
  Layers,
  GitCompare,
  FileText,
  Download,
  Gauge,
  ShieldAlert,
  DollarSign,
  Upload,
  LayoutGrid,
  LineChart,
  Sparkles,
  Boxes,
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

/**
 * Growth Forecasting — the authoritative forecasting engine for enterprise capacity planning: predicts
 * future infrastructure demand, workspace expansion, cloud/AI/storage/network growth and cost using
 * historical patterns and predictive analytics. Answers what capacity we'll need, when capacity will be
 * exhausted, which workspaces grow fastest and what future cloud costs will be. Distinct from Consumption
 * (usage), Utilization (efficiency), Quotas (allocated) and Reservations (reserved). Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/05_ Capacity & Quotas/growth_forecasting.md.
 *
 * Enterprise-Analytics UX pattern (Banner · KPI · Toolbar · Filters · Search · Datatable · Bulk/Row
 * actions · 8-tab Forecast Detail Drawer with prediction + scenarios). No backend → sample.
 */

type ResType = "Compute" | "Storage" | "Networking" | "Databases" | "Kubernetes" | "AI" | "Automation" | "Platform Services";
type Risk = "Critical" | "High" | "Medium" | "Low";
type Trend = "Rapid" | "Steady" | "Flat" | "Declining";

const WORKSPACES = ["Payments", "Retail Web", "Data Lake", "Identity", "Analytics", "Mobile API", "AI Platform"];
const PROVIDERS = ["AWS", "Azure", "GCP", "Private Cloud"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const BUSINESS_UNITS = ["Finance", "Engineering", "Operations", "Retail", "Corporate"];
const HORIZONS = ["30 Days", "90 Days", "180 Days", "1 Year"];
const OWNERS = ["Capacity Admin", "FinOps", "Cloud Team", "Executive"];

const RISK_TONE: Record<Risk, string> = { Critical: T.danger, High: T.warning, Medium: T.accent, Low: T.textMuted };
const RISK_ORDER: Record<Risk, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Forecast {
  id: string;
  resource: string;
  resType: ResType;
  workspace: string;
  current: number;
  predicted: number;
  unit: string;
  growth: number;
  forecastDate: string;
  risk: Risk;
  trend: Trend;
  provider: string;
  environment: string;
  businessUnit: string;
  owner: string;
  confidence: number;
  predictedCost: number;
  daysToExhaustion: number;
}

const FC_SEED: { resource: string; type: ResType; unit: string }[] = [
  { resource: "Kubernetes Cluster", type: "Kubernetes", unit: "vCPU" },
  { resource: "EC2 Fleet", type: "Compute", unit: "vCPU" },
  { resource: "Object Storage", type: "Storage", unit: "TB" },
  { resource: "GPU Cluster", type: "AI", unit: "GPU" },
  { resource: "PostgreSQL", type: "Databases", unit: "conns" },
  { resource: "Bandwidth", type: "Networking", unit: "Gbps" },
  { resource: "Inference Endpoints", type: "AI", unit: "req/s" },
  { resource: "Data Lake Storage", type: "Storage", unit: "TB" },
  { resource: "Automation Runners", type: "Automation", unit: "runners" },
  { resource: "Analytics Warehouse", type: "Databases", unit: "vCPU" },
  { resource: "Message Queues", type: "Platform Services", unit: "queues" },
  { resource: "VM Scale Set", type: "Compute", unit: "vCPU" },
  { resource: "AI Tokens", type: "AI", unit: "M tok" },
  { resource: "Load Balancers", type: "Networking", unit: "LBs" },
];

const SAMPLE_FORECASTS: Forecast[] = FC_SEED.map(({ resource, type, unit }, i) => {
  const id = `GF-${(10000 + i * 37).toString()}`;
  const n = hashId(id + resource);
  const current = 80 + (n % 160);
  const growth = 5 + (n % 70);
  const predicted = Math.round(current * (1 + growth / 100));
  const risk = pick<Risk>(growth >= 50 ? ["Critical", "High", "High", "Medium"] : ["High", "Medium", "Medium", "Low"], n);
  return {
    id,
    resource,
    resType: type,
    workspace: pick(WORKSPACES, n >> 1),
    current,
    predicted,
    unit,
    growth,
    forecastDate: pick(HORIZONS, n),
    risk,
    trend: growth >= 40 ? "Rapid" : growth >= 15 ? "Steady" : growth <= 0 ? "Declining" : "Flat",
    provider: pick(PROVIDERS, n),
    environment: pick(ENVIRONMENTS, n >> 2),
    businessUnit: pick(BUSINESS_UNITS, n >> 3),
    owner: pick(OWNERS, n),
    confidence: 70 + (n % 28),
    predictedCost: 5 + (n % 60),
    daysToExhaustion: growth >= 40 ? 20 + (n % 60) : 90 + (n % 200),
  };
});

function RiskBadge({ risk }: { risk: Risk }) {
  const c = RISK_TONE[risk];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
      {risk}
    </span>
  );
}

export function GrowthForecastingView() {
  const [search, setSearch] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fHorizon, setFHorizon] = React.useState("");
  const [fRisk, setFRisk] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_FORECASTS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.resource.toLowerCase().includes(q) || r.workspace.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q)) &&
      (!fWs || r.workspace === fWs) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fEnv || r.environment === fEnv) &&
      (!fProvider || r.provider === fProvider) &&
      (!fType || r.resType === fType) &&
      (!fHorizon || r.forecastDate === fHorizon) &&
      (!fRisk || r.risk === fRisk)
    );
  });
  const hasFilters = !!(search || fWs || fBu || fEnv || fProvider || fType || fHorizon || fRisk);
  const clearFilters = () => {
    setSearch("");
    setFWs("");
    setFBu("");
    setFEnv("");
    setFProvider("");
    setFType("");
    setFHorizon("");
    setFRisk("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [{ value: "", label: "All" }, ...Array.from(new Set(vals)).sort().map((v) => ({ value: v, label: v }))];

  const predictedGrowth = Math.round(records.reduce((a, r) => a + r.growth, 0) / records.length);
  const accuracy = Math.round(records.reduce((a, r) => a + r.confidence, 0) / records.length);
  const exhaustion = records.filter((r) => r.daysToExhaustion < 60).length;
  const costProjection = records.reduce((a, r) => a + r.predictedCost, 0);
  const fastest = [...records].sort((a, b) => b.growth - a.growth)[0]?.workspace ?? "—";
  const bottlenecks = records.filter((r) => r.risk === "Critical" || r.risk === "High").length;
  const infraRisk = Math.round((bottlenecks / records.length) * 100);
  const optOpportunities = records.filter((r) => r.trend === "Declining" || r.trend === "Flat").length;

  const toolbar: CommandItem[] = [
    { key: "generate", label: "Generate Forecast", icon: <TrendingUp size={15} />, onClick: () => setSelId(null) },
    { key: "refresh", label: "Refresh Forecast", icon: <RefreshCcw size={15} />, onClick: () => setSelId(null) },
    { key: "scenario", label: "Create Scenario", icon: <Layers size={15} />, disabled: true },
    { key: "compare", label: "Compare Forecasts", icon: <GitCompare size={15} />, disabled: true },
    { key: "report", label: "Export Report", icon: <FileText size={15} />, disabled: true },
    { key: "planning", label: "Capacity Planning", icon: <Gauge size={15} />, disabled: true },
    { key: "risk", label: "Risk Analysis", icon: <ShieldAlert size={15} />, onClick: () => setFRisk("Critical") },
    { key: "cost", label: "Cost Projection", icon: <DollarSign size={15} />, disabled: true },
    { key: "import", label: "Import Forecast", icon: <Upload size={15} />, disabled: true },
  ];

  const cols: Column<Forecast>[] = [
    {
      key: "resource",
      header: "Resource",
      sortValue: (r) => r.resource,
      render: (r) => (
        <span style={{ color: T.textPrimary, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={13} color={T.textMuted} />
          {r.resource}
          <span style={{ fontSize: 10.5, color: T.textMuted }}>· {r.resType}</span>
        </span>
      ),
    },
    { key: "workspace", header: "Workspace", sortValue: (r) => r.workspace, render: (r) => r.workspace },
    { key: "current", header: "Current Usage", sortValue: (r) => r.current, render: (r) => `${r.current} ${r.unit}` },
    { key: "predicted", header: "Predicted Usage", sortValue: (r) => r.predicted, render: (r) => (
      <span style={{ color: T.warning }}>{r.predicted} {r.unit}</span>
    ) },
    { key: "growth", header: "Growth Rate", sortValue: (r) => r.growth, render: (r) => <span style={{ color: r.growth >= 40 ? T.danger : T.textNav }}>+{r.growth}%</span> },
    { key: "forecastDate", header: "Forecast", sortValue: (r) => r.forecastDate, render: (r) => r.forecastDate },
    { key: "risk", header: "Risk", sortValue: (r) => RISK_ORDER[r.risk], render: (r) => <RiskBadge risk={r.risk} /> },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard title="Predicted Growth" value={`+${predictedGrowth}%`} tone={predictedGrowth >= 40 ? "warn" : "ok"} sub={<>Enterprise average <SampleTag /></>} />
        <PostureCard title="Forecast Accuracy" value={`${accuracy}%`} tone={accuracy >= 80 ? "ok" : "warn"} sub={<>Model confidence <SampleTag /></>} />
        <PostureCard title="Capacity Exhaustion" value={exhaustion} tone={exhaustion > 0 ? "danger" : "ok"} sub={<>Resources under 60d <SampleTag /></>} />
        <PostureCard title="Cloud Cost Projection" value={`$${costProjection}k`} tone="ok" sub={<>Projected monthly <SampleTag /></>} />
        <PostureCard title="Fastest Growing" value={fastest} tone="ok" sub={<>Top-growth workspace <SampleTag /></>} />
        <PostureCard title="Predicted Bottlenecks" value={bottlenecks} tone={bottlenecks > 0 ? "warn" : "ok"} sub={<>High/Critical risk <SampleTag /></>} />
        <PostureCard title="Infrastructure Risk" value={`${infraRisk}%`} tone={infraRisk < 30 ? "ok" : "warn"} sub={<>Of forecasts at risk <SampleTag /></>} />
        <PostureCard title="Optimization Opportunities" value={optOpportunities} tone="ok" sub={<>Flat/declining trends <SampleTag /></>} />
      </PostureGrid>

      <Card
        title="Growth forecasting"
        desc="Predict future enterprise capacity requirements, resource growth, infrastructure demand, cloud spend and scaling requirements using historical usage patterns and predictive analytics."
      >
        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search forecasts — workspace, cloud account, cluster, application, business unit, resource, forecast…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select label="Workspace" value={fWs} onChange={setFWs} options={facet(records.map((r) => r.workspace))} />
          <Select label="Business Unit" value={fBu} onChange={setFBu} options={facet(records.map((r) => r.businessUnit))} />
          <Select label="Environment" value={fEnv} onChange={setFEnv} options={facet(records.map((r) => r.environment))} />
          <Select label="Cloud Provider" value={fProvider} onChange={setFProvider} options={facet(records.map((r) => r.provider))} />
          <Select label="Resource Type" value={fType} onChange={setFType} options={facet(records.map((r) => r.resType))} />
          <Select label="Forecast Horizon" value={fHorizon} onChange={setFHorizon} options={facet(records.map((r) => r.forecastDate))} />
          <Select label="Risk Level" value={fRisk} onChange={setFRisk} options={facet(records.map((r) => r.risk))} />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "risk", dir: "asc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<GitCompare size={13} />} onClick={clear}>Compare ({ids.length})</HeaderButton>
              <HeaderButton icon={<FileText size={13} />} onClick={clear}>Generate Reports</HeaderButton>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>Export</HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View", onClick: () => setSelId(r.id) },
                { label: "Forecast Details", onClick: () => setSelId(r.id) },
                { label: "Compare", onClick: () => setSelId(r.id) },
                { label: "Create Scenario", onClick: () => setSelId(r.id) },
                { label: "Export", onClick: () => {} },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<TrendingUp size={20} />}
              title="No forecasts have been generated."
              hint="Generate a growth forecast to predict future capacity requirements and cloud spend."
              cta="Generate Growth Forecast"
              onCta={() => setSelId(null)}
            />
          }
        />
      </Card>

      {sel && <ForecastDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function GrowthForecastingPage() {
  return (
    <Page>
      <PageHeader
        title="Growth Forecasting"
        subtitle="Predict future enterprise capacity requirements, resource growth, infrastructure demand, cloud spend, and scaling requirements."
        actions={<ScopeBadge scope="Organization" />}
      />
      <GrowthForecastingView />
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
  { id: "historical", label: "Historical Trends", icon: <LineChart size={13} /> },
  { id: "prediction", label: "Prediction", icon: <Sparkles size={13} /> },
  { id: "capacity", label: "Capacity Planning", icon: <Boxes size={13} /> },
  { id: "cost", label: "Cost Projection", icon: <DollarSign size={13} /> },
  { id: "recommendations", label: "Recommendations", icon: <Lightbulb size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function ForecastDrawer({ rec, onClose }: { rec: Forecast; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.resource} — ${rec.workspace}`}
      subtitle={`${rec.resType} · +${rec.growth}% · ${rec.forecastDate} · ${rec.risk} risk`}
      width={840}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
          <HeaderButton icon={<GitCompare size={13} />}>Compare</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>Export</HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "historical" && <HistoricalTab />}
      {tab === "prediction" && <PredictionTab rec={rec} />}
      {tab === "capacity" && <CapacityTab rec={rec} />}
      {tab === "cost" && <CostTab rec={rec} />}
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
function OverviewTab({ rec }: { rec: Forecast }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Forecast Name", v: `${rec.resource} — ${rec.forecastDate}` },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Forecast Type", v: rec.resType },
              { k: "Forecast Horizon", v: rec.forecastDate },
              { k: "Forecast Model", v: "Predictive (seasonal + trend)", sample: true },
              { k: "Confidence", v: `${rec.confidence}%` },
              { k: "Generated By", v: rec.owner, sample: true },
              { k: "Generated Date", v: "2026-06-15", sample: true },
            ]}
          />
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Growth Rate", v: `+${rec.growth}%`, sample: true },
              { k: "Projected Usage", v: `${rec.predicted} ${rec.unit}`, sample: true },
              { k: "Capacity Remaining", v: `${Math.max(0, rec.predicted - rec.current)} ${rec.unit} gap`, sample: true },
              { k: "Forecast Confidence", v: `${rec.confidence}%`, sample: true },
              { k: "Predicted Cost", v: `$${rec.predictedCost}k`, sample: true },
              { k: "Risk Score", v: <RiskBadge risk={rec.risk} />, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function HistoricalTab() {
  const [view, setView] = React.useState("Monthly");
  const bars = [30, 34, 40, 38, 46, 52, 50, 58, 62, 66, 70, 76];
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <Select label="View" value={view} onChange={setView} options={["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"].map((v) => ({ value: v, label: v }))} />
        <SampleTag />
      </div>
      <Section title={`Historical usage (${view}) — forecast baseline`} sample>
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

function PredictionTab({ rec }: { rec: Forecast }) {
  const currentPct = Math.round((rec.current / rec.predicted) * 100);
  return (
    <Section title="Prediction — future predicted growth" sample>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 4 }}>Current capacity</div>
        <div style={{ position: "relative", height: 10, borderRadius: 99, background: T.border, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${currentPct}%`, background: T.accent, borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 4 }}>Predicted capacity ({rec.forecastDate})</div>
        <div style={{ position: "relative", height: 10, borderRadius: 99, background: T.border, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "100%", background: rec.growth >= 40 ? T.danger : T.warning, borderRadius: 99 }} />
        </div>
      </div>
      <KVGrid
        items={[
          { k: "Projected Usage", v: `${rec.predicted} ${rec.unit}`, sample: true },
          { k: "Expected Growth", v: `+${rec.growth}%`, sample: true },
          { k: "Capacity Exhaustion", v: `~${rec.daysToExhaustion} days`, sample: true },
          { k: "Expansion Date", v: rec.forecastDate, sample: true },
          { k: "Confidence Interval", v: `±${100 - rec.confidence}%`, sample: true },
        ]}
      />
    </Section>
  );
}

function CapacityTab({ rec }: { rec: Forecast }) {
  const cats = ["Compute", "Memory", "Storage", "Networking", "Databases", "Kubernetes", "AI"];
  const list = cats.map((c) => {
    const m = hashId(rec.id + c);
    const cur = 40 + (m % 100);
    const pred = Math.round(cur * (1 + (10 + (m % 60)) / 100));
    return { id: c, resource: c, current: cur, predicted: pred, required: Math.round(pred * 1.1), gap: Math.round(pred * 1.1 - cur) };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "current", header: "Current", render: (r) => r.current },
    { key: "predicted", header: "Predicted", render: (r) => r.predicted },
    { key: "required", header: "Required", render: (r) => r.required },
    { key: "gap", header: "Gap", render: (r) => <span style={{ color: T.warning }}>+{r.gap}</span> },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Predicted infrastructure requirements. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function CostTab({ rec }: { rec: Forecast }) {
  return (
    <Section title="Cost projection — future cloud costs" sample>
      <KVGrid
        items={[
          { k: "Monthly Cost", v: `$${rec.predictedCost}k`, sample: true },
          { k: "Quarterly Cost", v: `$${rec.predictedCost * 3}k`, sample: true },
          { k: "Annual Cost", v: `$${rec.predictedCost * 12}k`, sample: true },
          { k: "Growth %", v: `+${rec.growth}%`, sample: true },
          { k: "Projected Budget", v: `$${Math.round(rec.predictedCost * 12 * 1.1)}k`, sample: true },
          { k: "Cost Per Workspace", v: `$${rec.predictedCost}k`, sample: true },
        ]}
      />
    </Section>
  );
}

function RecommendationsTab({ rec }: { rec: Forecast }) {
  const recs = ["Increase Workspace Quota", "Reserve Capacity", "Expand Kubernetes Cluster", "Purchase Reserved Instances", "Archive Unused Storage", "Upgrade Database Tier", "Scale AI Infrastructure", "Increase Network Capacity"];
  const list = recs.map((r) => {
    const m = hashId(rec.id + r);
    return { id: r, recommendation: r, impact: pick(["High", "Medium", "Low"], m), priority: pick(["High", "Medium"], m), cost: `$${1 + (m % 20)}k`, savings: `$${1 + (m % 8)}k` };
  }).slice(0, rec.risk === "Critical" || rec.risk === "High" ? 8 : 4);
  const cols: Column<(typeof list)[number]>[] = [
    { key: "recommendation", header: "Recommendation", render: (r) => r.recommendation },
    { key: "impact", header: "Impact", render: (r) => r.impact },
    { key: "priority", header: "Priority", render: (r) => r.priority },
    { key: "cost", header: "Est. Cost", render: (r) => r.cost },
    { key: "savings", header: "Est. Savings", render: (r) => <span style={{ color: T.success }}>{r.savings}</span> },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Capacity planning recommendations. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ActivityTab({ rec }: { rec: Forecast }) {
  const events = ["Forecast Generated", "Scenario Created", "Prediction Updated", "Capacity Review", "Recommendation Generated", "Forecast Exported"];
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
  const events = ["Forecast Generated", "Scenario Created", "Forecast Updated", "Recommendation Generated", "Forecast Exported"];
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

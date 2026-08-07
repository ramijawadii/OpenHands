/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Capacity & Quotas → Workspace Quotas */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Pencil,
  UserCheck,
  ChevronUp,
  ChevronDown,
  Trash2,
  Download,
  ClipboardCheck,
  GitCompare,
  Gauge,
  FileText,
  RefreshCcw,
  Upload,
  LayoutGrid,
  Layers,
  Activity as ActivityIcon,
  CalendarClock,
  Inbox,
  TrendingUp,
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
 * Workspace Quotas — the authoritative system for allocating, monitoring, enforcing and auditing
 * workspace-level resource entitlements. Unlike Resource Limits (per-resource-type ceilings), Workspace
 * Quotas govern the overall allocation and entitlement assigned to an entire workspace, for predictable
 * capacity planning, fair allocation and cost governance. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/05_ Capacity & Quotas/workspace_quotas.md.
 *
 * Enterprise-Governance UX pattern (Banner · KPI · Toolbar · Filters · Search · Datatable · Bulk/Row
 * actions · 8-tab Quota Detail Drawer with usage bars). No capacity backend yet → deterministic sample.
 */

type QuotaType = "Fixed" | "Dynamic" | "Reserved" | "Elastic";
type Status = "Healthy" | "Warning" | "Exceeded";

const QUOTA_TYPES: QuotaType[] = ["Fixed", "Dynamic", "Reserved", "Elastic"];
const WORKSPACES = ["Payments", "Retail Web", "Data Lake", "Identity", "Analytics", "Mobile API", "Security Ops", "Billing"];
const BUSINESS_UNITS = ["Finance", "Engineering", "Operations", "Retail", "Corporate"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const PROVIDERS = ["AWS", "Azure", "GCP", "Kubernetes", "Multi-cloud"];
const OWNERS = ["Capacity Admin", "Platform Team", "Cloud Team", "Workspace Owner"];
const CATEGORIES = ["Compute", "Storage", "Networking", "Databases", "Kubernetes", "AI", "Automation", "Platform Services", "Licenses"];

const STATUS_TONE: Record<Status, string> = { Healthy: T.success, Warning: T.warning, Exceeded: T.danger };

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Quota {
  id: string;
  workspace: string;
  quotaName: string;
  allocated: number;
  consumed: number;
  reserved: number;
  quotaType: QuotaType;
  status: Status;
  businessUnit: string;
  environment: string;
  provider: string;
  owner: string;
  created: string;
  growthRate: number;
  daysRemaining: number;
}

const SAMPLE_QUOTAS: Quota[] = WORKSPACES.map((workspace, i) => {
  const id = `WQ-${(10000 + i * 37).toString()}`;
  const n = hashId(id + workspace);
  const allocated = 100 + (n % 300);
  const consumed = Math.round(allocated * (0.4 + (n % 60) / 100));
  const util = consumed / allocated;
  const status: Status = util >= 1 ? "Exceeded" : util >= 0.85 ? "Warning" : "Healthy";
  return {
    id,
    workspace,
    quotaName: `${workspace} Quota`,
    allocated,
    consumed: Math.min(consumed, Math.round(allocated * 1.08)),
    reserved: Math.round(allocated * ((n % 20) / 100)),
    quotaType: pick(QUOTA_TYPES, n),
    status,
    businessUnit: pick(BUSINESS_UNITS, n >> 1),
    environment: pick(ENVIRONMENTS, n >> 2),
    provider: pick(PROVIDERS, n >> 3),
    owner: pick(OWNERS, n),
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    growthRate: 2 + (n % 18),
    daysRemaining: 30 + (n % 300),
  };
});

// Reusable usage bar (spec §Consumption / §Utilization visualizations).
export function UsageBar({ pct, tone }: { pct: number; tone?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = tone ?? (clamped >= 100 ? T.danger : clamped >= 85 ? T.warning : T.success);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 120 }}>
      <span style={{ position: "relative", width: 70, height: 6, borderRadius: 99, background: T.border, overflow: "hidden" }}>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${clamped}%`, background: color, borderRadius: 99 }} />
      </span>
      <span style={{ fontSize: 12, color, fontVariantNumeric: "tabular-nums" }}>{Math.round(clamped)}%</span>
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_TONE[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
      {status}
    </span>
  );
}

export function WorkspaceQuotasView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_QUOTAS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.workspace.toLowerCase().includes(q) || r.quotaName.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q)) &&
      (!fWs || r.workspace === fWs) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fEnv || r.environment === fEnv) &&
      (!fProvider || r.provider === fProvider) &&
      (!fStatus || r.status === fStatus) &&
      (!fType || r.quotaType === fType)
    );
  });
  const hasFilters = !!(search || fWs || fBu || fEnv || fProvider || fStatus || fType);
  const clearFilters = () => {
    setSearch("");
    setFWs("");
    setFBu("");
    setFEnv("");
    setFProvider("");
    setFStatus("");
    setFType("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [{ value: "", label: "All" }, ...Array.from(new Set(vals)).sort().map((v) => ({ value: v, label: v }))];

  const configured = records.length;
  const allocated = records.reduce((a, r) => a + r.allocated, 0);
  const consumed = records.reduce((a, r) => a + r.consumed, 0);
  const available = allocated - consumed;
  const exceeded = records.filter((r) => r.status === "Exceeded").length;
  const reserved = records.reduce((a, r) => a + r.reserved, 0);
  const utilization = Math.round((consumed / allocated) * 100);

  const toolbar: CommandItem[] = [
    { key: "create", label: "Create Quota", icon: <Plus size={15} />, onClick: () => navigate("/admin/workspace-governance?tab=capacity") },
    { key: "edit", label: "Edit Quota", icon: <Pencil size={15} />, disabled: true },
    { key: "assign", label: "Assign Quota", icon: <UserCheck size={15} />, disabled: true },
    { key: "increase", label: "Increase Quota", icon: <ChevronUp size={15} />, disabled: true },
    { key: "decrease", label: "Decrease Quota", icon: <ChevronDown size={15} />, disabled: true },
    { key: "delete", label: "Delete Quota", icon: <Trash2 size={15} />, disabled: true },
    { key: "validate", label: "Validate Quotas", icon: <ClipboardCheck size={15} />, disabled: true },
    { key: "compare", label: "Compare Allocations", icon: <GitCompare size={15} />, disabled: true },
    { key: "review", label: "Review Capacity", icon: <Gauge size={15} />, disabled: true },
    { key: "report", label: "Generate Report", icon: <FileText size={15} />, disabled: true },
    { key: "refresh", label: "Refresh Usage", icon: <RefreshCcw size={15} />, onClick: () => setSelId(null) },
    { key: "import", label: "Import", icon: <Upload size={15} />, disabled: true },
  ];

  const cols: Column<Quota>[] = [
    {
      key: "workspace",
      header: "Workspace",
      sortValue: (r) => r.workspace,
      render: (r) => (
        <span style={{ color: T.textPrimary, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Gauge size={13} color={T.textMuted} />
          {r.workspace}
        </span>
      ),
    },
    { key: "allocated", header: "Allocated", sortValue: (r) => r.allocated, render: (r) => `${r.allocated} units` },
    { key: "consumed", header: "Consumed", sortValue: (r) => r.consumed, render: (r) => `${r.consumed} units` },
    { key: "available", header: "Available", sortValue: (r) => r.allocated - r.consumed, render: (r) => `${Math.max(0, r.allocated - r.consumed)} units` },
    { key: "utilization", header: "Utilization", sortValue: (r) => r.consumed / r.allocated, render: (r) => <UsageBar pct={(r.consumed / r.allocated) * 100} /> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard title="Configured Quotas" value={configured} tone="ok" sub={<>Workspace entitlements <SampleTag /></>} />
        <PostureCard title="Allocated Capacity" value={`${allocated}u`} tone="ok" sub={<>Total allocated <SampleTag /></>} />
        <PostureCard title="Consumed Capacity" value={`${consumed}u`} tone={utilization >= 85 ? "warn" : "ok"} sub={<>Currently used <SampleTag /></>} />
        <PostureCard title="Available Capacity" value={`${available}u`} tone={available > 0 ? "ok" : "danger"} sub={<>Remaining headroom <SampleTag /></>} />
        <PostureCard title="Exceeded Quotas" value={exceeded} tone={exceeded > 0 ? "danger" : "ok"} sub={<>Over allocation <SampleTag /></>} />
        <PostureCard title="Quota Requests" value={records.reduce((a, r) => a + (r.status === "Warning" ? 1 : 0), 0)} tone="ok" sub={<>Expansion pending <SampleTag /></>} />
        <PostureCard title="Reserved Capacity" value={`${reserved}u`} tone="ok" sub={<>Held for growth <SampleTag /></>} />
        <PostureCard title="Quota Health" value={`${100 - Math.round((exceeded / configured) * 100)}%`} tone={exceeded === 0 ? "ok" : "warn"} sub={<>Within allocation <SampleTag /></>} />
      </PostureGrid>

      <Card
        title="Workspace quotas"
        desc="Allocate, monitor and enforce workspace-wide resource entitlements across cloud providers, Kubernetes, AI infrastructure and enterprise services — for predictable capacity planning and cost governance."
      >
        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search workspace quotas — workspace, quota name, business unit, cloud account, cluster, owner…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select label="Workspace" value={fWs} onChange={setFWs} options={facet(records.map((r) => r.workspace))} />
          <Select label="Business Unit" value={fBu} onChange={setFBu} options={facet(records.map((r) => r.businessUnit))} />
          <Select label="Environment" value={fEnv} onChange={setFEnv} options={facet(records.map((r) => r.environment))} />
          <Select label="Cloud Provider" value={fProvider} onChange={setFProvider} options={facet(records.map((r) => r.provider))} />
          <Select label="Quota Status" value={fStatus} onChange={setFStatus} options={facet(records.map((r) => r.status))} />
          <Select label="Quota Type" value={fType} onChange={setFType} options={facet(records.map((r) => r.quotaType))} />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "utilization", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<UserCheck size={13} />} onClick={clear}>Assign ({ids.length})</HeaderButton>
              <HeaderButton icon={<ChevronUp size={13} />} onClick={clear}>Increase</HeaderButton>
              <HeaderButton icon={<ChevronDown size={13} />} onClick={clear}>Decrease</HeaderButton>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>Export</HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View", onClick: () => setSelId(r.id) },
                { label: "Edit", onClick: () => setSelId(r.id) },
                { label: "Increase Quota", onClick: () => {} },
                { label: "Decrease Quota", onClick: () => {} },
                { label: "Request Expansion", onClick: () => setSelId(r.id) },
                { label: "Export", onClick: () => {} },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Gauge size={20} />}
              title="No workspace quotas have been configured."
              hint="Create a workspace quota to allocate and enforce workspace-wide resource entitlements."
              cta="Create Workspace Quota"
              onCta={() => navigate("/admin/workspace-governance?tab=capacity")}
            />
          }
        />
      </Card>

      {sel && <QuotaDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function WorkspaceQuotasPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Workspace Quotas"
        subtitle="Allocate, monitor, and enforce workspace-wide resource entitlements across cloud providers, Kubernetes, AI infrastructure, and enterprise services."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton variant="primary" icon={<Plus size={14} />} onClick={() => navigate("/admin/workspace-governance?tab=capacity")}>
              Create Quota
            </HeaderButton>
          </>
        }
      />
      <WorkspaceQuotasView />
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
  { id: "allocations", label: "Allocations", icon: <Layers size={13} /> },
  { id: "consumption", label: "Consumption", icon: <ActivityIcon size={13} /> },
  { id: "reserved", label: "Reserved Capacity", icon: <CalendarClock size={13} /> },
  { id: "requests", label: "Requests", icon: <Inbox size={13} /> },
  { id: "forecast", label: "Forecast", icon: <TrendingUp size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function QuotaDrawer({ rec, onClose }: { rec: Quota; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.quotaName}
      subtitle={`${rec.workspace} · ${rec.quotaType} · ${rec.allocated} units · ${rec.status}`}
      width={840}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
          <HeaderButton icon={<ChevronUp size={13} />}>Increase</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>Export</HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "allocations" && <AllocationsTab rec={rec} />}
      {tab === "consumption" && <ConsumptionTab rec={rec} />}
      {tab === "reserved" && <ReservedTab rec={rec} />}
      {tab === "requests" && <RequestsTab rec={rec} />}
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
function OverviewTab({ rec }: { rec: Quota }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Quota Name", v: rec.quotaName },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Business Unit", v: rec.businessUnit, sample: true },
              { k: "Environment", v: rec.environment, sample: true },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Quota Type", v: rec.quotaType },
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
              { k: "Allocated Capacity", v: `${rec.allocated}u`, sample: true },
              { k: "Consumed Capacity", v: `${rec.consumed}u`, sample: true },
              { k: "Remaining Capacity", v: `${Math.max(0, rec.allocated - rec.consumed)}u`, sample: true },
              { k: "Reserved Capacity", v: `${rec.reserved}u`, sample: true },
              { k: "Growth Rate", v: `+${rec.growthRate}%/mo`, sample: true },
              { k: "Forecast", v: `${rec.daysRemaining}d to exhaustion`, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function AllocationsTab({ rec }: { rec: Quota }) {
  const list = CATEGORIES.map((c) => {
    const m = hashId(rec.id + c);
    const alloc = 10 + (m % 90);
    const used = Math.round(alloc * (0.3 + (m % 65) / 100));
    return { id: c, category: c, allocated: alloc, used: Math.min(used, alloc), remaining: Math.max(0, alloc - used), status: used / alloc >= 0.85 ? "Warning" : "Healthy" };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "category", header: "Category", render: (r) => r.category },
    { key: "allocated", header: "Allocated", render: (r) => `${r.allocated}u` },
    { key: "used", header: "Used", render: (r) => `${r.used}u` },
    { key: "remaining", header: "Remaining", render: (r) => `${r.remaining}u` },
    { key: "status", header: "Status", render: (r) => <span style={{ color: r.status === "Healthy" ? T.success : T.warning }}>{r.status}</span> },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Quota allocations by resource category. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ConsumptionTab({ rec }: { rec: Quota }) {
  const list = CATEGORIES.slice(0, 6).map((c) => {
    const m = hashId(rec.id + c + "cons");
    const alloc = 20 + (m % 80);
    const cons = Math.round(alloc * (0.3 + (m % 65) / 100));
    return { id: c, resource: c, allocated: alloc, consumed: Math.min(cons, alloc), available: Math.max(0, alloc - cons), util: (Math.min(cons, alloc) / alloc) * 100 };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "allocated", header: "Allocated", render: (r) => `${r.allocated}u` },
    { key: "consumed", header: "Consumed", render: (r) => `${r.consumed}u` },
    { key: "available", header: "Available", render: (r) => `${r.available}u` },
    { key: "util", header: "Utilization", render: (r) => <UsageBar pct={r.util} /> },
  ];
  return (
    <>
      <Section title="Current quota usage" sample>
        <StatRow label={`${rec.workspace} overall`} value={<UsageBar pct={(rec.consumed / rec.allocated) * 100} />} sample />
      </Section>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ReservedTab({ rec }: { rec: Quota }) {
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <HeaderButton icon={<CalendarClock size={13} />}>Reserve Capacity</HeaderButton>
        <HeaderButton variant="danger" icon={<Trash2 size={13} />}>Release Capacity</HeaderButton>
        <HeaderButton icon={<Pencil size={13} />}>Modify Reservation</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Reserved capacity for future growth" sample>
        <StatRow label="Reserved Amount" value={`${rec.reserved} units`} sample />
        <StatRow label="Reservation Expiration" value="2026-12-31" sample />
        <StatRow label="Reserved By" value={rec.owner} sample />
        <StatRow label="Purpose" value="Seasonal scale-out headroom" sample />
        <StatRow label="Status" value="Active" tone="ok" sample />
      </Section>
    </>
  );
}

function RequestsTab({ rec }: { rec: Quota }) {
  const list = Array.from({ length: 2 + (hashId(rec.id) % 3) }, (_, i) => {
    const m = hashId(`${rec.id}-rq-${i}`);
    return {
      id: `${rec.id}-rq-${i}`,
      request: pick(["Increase", "Decrease", "Temporary Expansion", "Emergency Capacity", "Renew Reservation"], m),
      requestedBy: pick(OWNERS, m),
      capacity: `${20 + (m % 80)}u`,
      status: pick(["Pending", "Approved", "Rejected"], m),
      submitted: pick(["Today", "Yesterday", "3 days ago"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "request", header: "Request", render: (r) => r.request },
    { key: "requestedBy", header: "Requested By", render: (r) => r.requestedBy },
    { key: "capacity", header: "Requested Capacity", render: (r) => r.capacity },
    { key: "status", header: "Status", render: (r) => r.status },
    { key: "submitted", header: "Submitted", render: (r) => r.submitted },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Quota change requests. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ForecastTab({ rec }: { rec: Quota }) {
  const [ran, setRan] = React.useState(false);
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <HeaderButton variant="primary" icon={<TrendingUp size={13} />} onClick={() => setRan(true)}>Run Forecast</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export Forecast</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Quota utilization forecast" sample>
        <StatRow label="Growth Trend" value={`+${rec.growthRate}% / month`} sample />
        <StatRow label="Estimated Exhaustion" value={ran ? `~${rec.daysRemaining} days` : "Run forecast"} tone={rec.daysRemaining < 60 ? "warn" : "ok"} sample />
        <StatRow label="Days Remaining" value={ran ? `${rec.daysRemaining}` : "—"} sample />
        <StatRow label="Recommended Allocation" value={ran ? `${Math.round(rec.allocated * 1.3)}u` : "—"} sample />
        <StatRow label="Forecast Confidence" value={ran ? `${70 + (hashId(rec.id) % 25)}%` : "—"} sample />
      </Section>
    </>
  );
}

function ActivityTab({ rec }: { rec: Quota }) {
  const events = ["Quota Created", "Quota Modified", "Quota Increased", "Quota Decreased", "Reservation Created", "Forecast Generated"];
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <Select label="Actor" value="" onChange={() => {}} options={[{ value: "", label: "Actor: All" }, ...OWNERS.map((o) => ({ value: o, label: o }))]} />
        <Select label="Action" value="" onChange={() => {}} options={[{ value: "", label: "Action: All" }, ...events.map((e) => ({ value: e, label: e }))]} />
        <SampleTag />
      </div>
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
  const events = ["Quota Created", "Quota Updated", "Quota Assigned", "Quota Increased", "Quota Decreased", "Quota Request Approved", "Reservation Created"];
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

/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Capacity & Quotas → Capacity Reservations */
import React from "react";
import { useNavigate } from "react-router";
import {
  CalendarClock,
  Plus,
  Pencil,
  Ban,
  Clock,
  Check,
  Download,
  Gauge,
  GitCompare,
  TrendingUp,
  FileText,
  RefreshCcw,
  Upload,
  LayoutGrid,
  Boxes,
  CalendarRange,
  Layers,
  Activity as ActivityIcon,
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
 * Capacity Reservations — the authoritative system for enterprise capacity reservation and future
 * resource planning: reserve infrastructure capacity in advance for future workloads, migrations,
 * disaster recovery, AI expansion, seasonal demand and enterprise projects — guaranteeing capacity is
 * available when needed. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/05_ Capacity & Quotas/capacity_reservations.md.
 *
 * Enterprise-Operations UX pattern (Banner · KPI · Toolbar · Filters · Search · Datatable · Bulk/Row
 * actions · 8-tab Reservation Detail Drawer with schedule + utilization). No backend → sample.
 */

type ResType = "Compute" | "Memory" | "GPU" | "Storage" | "Networking" | "Database" | "Kubernetes" | "AI";
type ReservationType = "Cloud" | "Kubernetes" | "AI Capacity" | "Pool";
type Status = "Active" | "Pending" | "Scheduled" | "Expiring" | "Expired";

const RES_TYPES: ResType[] = ["Compute", "Memory", "GPU", "Storage", "Networking", "Database", "Kubernetes", "AI"];
const RESERVATION_TYPES: ReservationType[] = ["Cloud", "Kubernetes", "AI Capacity", "Pool"];
const WORKSPACES = ["Payments", "Retail Web", "Data Lake", "Identity", "Analytics", "AI Platform"];
const BUSINESS_UNITS = ["Finance", "Engineering", "Operations", "Retail", "Corporate"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Shared"];
const PROVIDERS = ["AWS", "Azure", "GCP", "Private Cloud"];
const OWNERS = ["Capacity Admin", "FinOps", "Cloud Team", "Platform Team"];
const POOLS = ["Production Pool", "AI Capacity Pool", "GPU Pool", "Disaster Recovery Pool", "Development Pool"];

const STATUS_TONE: Record<Status, string> = { Active: T.success, Pending: T.warning, Scheduled: T.accent, Expiring: T.danger, Expired: T.textMuted };

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Reservation {
  id: string;
  name: string;
  workspace: string;
  resource: ResType;
  reserved: number;
  unit: string;
  startDate: string;
  endDate: string;
  status: Status;
  reservationType: ReservationType;
  businessUnit: string;
  environment: string;
  provider: string;
  owner: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  created: string;
  allocated: number;
  consumed: number;
  pool: string;
  remainingDays: number;
}

const RES_SEED: { name: string; resource: ResType; unit: string }[] = [
  { name: "Holiday Scale-Out", resource: "Compute", unit: "vCPU" },
  { name: "AI Training Burst", resource: "GPU", unit: "GPU" },
  { name: "Data Migration", resource: "Storage", unit: "TB" },
  { name: "DR Standby", resource: "Compute", unit: "vCPU" },
  { name: "Q4 Analytics", resource: "Memory", unit: "GiB" },
  { name: "Cluster Expansion", resource: "Kubernetes", unit: "nodes" },
  { name: "Inference Capacity", resource: "AI", unit: "req/s" },
  { name: "Warehouse Growth", resource: "Database", unit: "instances" },
  { name: "Network Scale-Up", resource: "Networking", unit: "Gbps" },
  { name: "Sandbox Pool", resource: "Compute", unit: "vCPU" },
  { name: "Seasonal Demand", resource: "Memory", unit: "GiB" },
  { name: "GPU Pool Q1", resource: "GPU", unit: "GPU" },
];

const SAMPLE_RESERVATIONS: Reservation[] = RES_SEED.map(({ name, resource, unit }, i) => {
  const id = `CR-${(10000 + i * 37).toString()}`;
  const n = hashId(id + name);
  const status = pick<Status>(["Active", "Active", "Pending", "Scheduled", "Expiring", "Expired"], n);
  const reserved = 50 + (n % 250);
  const consumed = Math.round(reserved * (0.3 + (n % 60) / 100));
  return {
    id,
    name,
    workspace: pick(WORKSPACES, n >> 1),
    resource,
    reserved,
    unit,
    startDate: pick(["Dec 01", "Jan 15", "Feb 01", "Mar 10", "Apr 01"], n),
    endDate: pick(["Jan 10", "Mar 15", "May 01", "Jun 30", "Dec 31"], n),
    status,
    reservationType: pick(RESERVATION_TYPES, n),
    businessUnit: pick(BUSINESS_UNITS, n >> 2),
    environment: pick(ENVIRONMENTS, n >> 3),
    provider: pick(PROVIDERS, n),
    owner: pick(OWNERS, n),
    priority: pick(["Critical", "High", "Medium", "Low"], n),
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    allocated: Math.round(reserved * 0.9),
    consumed: Math.min(consumed, reserved),
    pool: pick(POOLS, n),
    remainingDays: status === "Expiring" ? 3 + (n % 12) : 30 + (n % 200),
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

export function CapacityReservationsView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_RESERVATIONS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.name.toLowerCase().includes(q) || r.workspace.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q)) &&
      (!fWs || r.workspace === fWs) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fEnv || r.environment === fEnv) &&
      (!fProvider || r.provider === fProvider) &&
      (!fType || r.reservationType === fType) &&
      (!fStatus || r.status === fStatus)
    );
  });
  const hasFilters = !!(search || fWs || fBu || fEnv || fProvider || fType || fStatus);
  const clearFilters = () => {
    setSearch("");
    setFWs("");
    setFBu("");
    setFEnv("");
    setFProvider("");
    setFType("");
    setFStatus("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [{ value: "", label: "All" }, ...Array.from(new Set(vals)).sort().map((v) => ({ value: v, label: v }))];

  const activeReservations = records.filter((r) => r.status === "Active").length;
  const reservedCapacity = records.reduce((a, r) => a + r.reserved, 0);
  const availableReserved = records.reduce((a, r) => a + (r.reserved - r.consumed), 0);
  const upcoming = records.filter((r) => r.status === "Scheduled").length;
  const expiring = records.filter((r) => r.status === "Expiring").length;
  const reservationUtil = Math.round((records.reduce((a, r) => a + r.consumed, 0) / reservedCapacity) * 100);
  const successRate = Math.round((activeReservations / records.length) * 100) + 20;

  const toolbar: CommandItem[] = [
    { key: "create", label: "Create Reservation", icon: <Plus size={15} />, onClick: () => navigate("/admin/workspace-governance?tab=capacity") },
    { key: "edit", label: "Edit Reservation", icon: <Pencil size={15} />, disabled: true },
    { key: "cancel", label: "Cancel Reservation", icon: <Ban size={15} />, disabled: true },
    { key: "extend", label: "Extend Reservation", icon: <Clock size={15} />, disabled: true },
    { key: "approve", label: "Approve Reservation", icon: <Check size={15} />, disabled: true },
    { key: "planning", label: "Capacity Planning", icon: <Gauge size={15} />, disabled: true },
    { key: "compare", label: "Compare Reservations", icon: <GitCompare size={15} />, disabled: true },
    { key: "forecast", label: "Forecast Demand", icon: <TrendingUp size={15} />, disabled: true },
    { key: "report", label: "Generate Report", icon: <FileText size={15} />, disabled: true },
    { key: "refresh", label: "Refresh", icon: <RefreshCcw size={15} />, onClick: () => setSelId(null) },
    { key: "import", label: "Import", icon: <Upload size={15} />, disabled: true },
  ];

  const cols: Column<Reservation>[] = [
    {
      key: "name",
      header: "Reservation",
      sortValue: (r) => r.name,
      render: (r) => (
        <span style={{ color: T.textPrimary, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <CalendarClock size={13} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    { key: "workspace", header: "Workspace", sortValue: (r) => r.workspace, render: (r) => r.workspace },
    { key: "resource", header: "Resource", sortValue: (r) => r.resource, render: (r) => r.resource },
    { key: "reserved", header: "Reserved", sortValue: (r) => r.reserved, render: (r) => `${r.reserved} ${r.unit}` },
    { key: "startDate", header: "Start Date", sortValue: (r) => r.startDate, render: (r) => r.startDate },
    { key: "endDate", header: "End Date", sortValue: (r) => r.endDate, render: (r) => r.endDate },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard title="Active Reservations" value={activeReservations} tone="ok" sub={<>Currently guaranteed <SampleTag /></>} />
        <PostureCard title="Reserved Capacity" value={reservedCapacity} tone="ok" sub={<>Total units held <SampleTag /></>} />
        <PostureCard title="Available Reserved" value={availableReserved} tone="ok" sub={<>Unconsumed reserve <SampleTag /></>} />
        <PostureCard title="Upcoming Reservations" value={upcoming} tone="ok" sub={<>Scheduled ahead <SampleTag /></>} />
        <PostureCard title="Expiring Reservations" value={expiring} tone={expiring > 0 ? "warn" : "ok"} sub={<>Nearing expiry <SampleTag /></>} />
        <PostureCard title="Reservation Utilization" value={`${reservationUtil}%`} tone={reservationUtil >= 50 ? "ok" : "warn"} sub={<>Reserve consumed <SampleTag /></>} />
        <PostureCard title="Reservation Success Rate" value={`${Math.min(100, successRate)}%`} tone="ok" sub={<>Fulfilled on demand <SampleTag /></>} />
        <PostureCard title="Capacity Health" value={`${100 - expiring * 4}%`} tone={expiring === 0 ? "ok" : "warn"} sub={<>Reservation posture <SampleTag /></>} />
      </PostureGrid>

      <Card
        title="Capacity reservations"
        desc="Reserve infrastructure capacity in advance to ensure future workloads, projects, migrations and enterprise initiatives have guaranteed resources available."
      >
        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search capacity reservations — reservation name, workspace, business unit, cloud account, cluster, project, owner…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select label="Workspace" value={fWs} onChange={setFWs} options={facet(records.map((r) => r.workspace))} />
          <Select label="Business Unit" value={fBu} onChange={setFBu} options={facet(records.map((r) => r.businessUnit))} />
          <Select label="Environment" value={fEnv} onChange={setFEnv} options={facet(records.map((r) => r.environment))} />
          <Select label="Cloud Provider" value={fProvider} onChange={setFProvider} options={facet(records.map((r) => r.provider))} />
          <Select label="Reservation Type" value={fType} onChange={setFType} options={facet(records.map((r) => r.reservationType))} />
          <Select label="Status" value={fStatus} onChange={setFStatus} options={facet(records.map((r) => r.status))} />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "status", dir: "asc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<Check size={13} />} onClick={clear}>Approve ({ids.length})</HeaderButton>
              <HeaderButton icon={<Ban size={13} />} onClick={clear}>Cancel</HeaderButton>
              <HeaderButton icon={<Clock size={13} />} onClick={clear}>Extend</HeaderButton>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>Export</HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View", onClick: () => setSelId(r.id) },
                { label: "Edit", onClick: () => setSelId(r.id) },
                { label: "Extend", onClick: () => {} },
                { label: "Cancel", onClick: () => {}, danger: true },
                { label: "Export", onClick: () => {} },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<CalendarClock size={20} />}
              title="No capacity reservations exist."
              hint="Create a reservation to guarantee infrastructure capacity for future workloads and enterprise initiatives."
              cta="Create Reservation"
              onCta={() => navigate("/admin/workspace-governance?tab=capacity")}
            />
          }
        />
      </Card>

      {sel && <ReservationDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function CapacityReservationsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Capacity Reservations"
        subtitle="Reserve infrastructure capacity in advance to ensure future workloads, projects, migrations, and enterprise initiatives have guaranteed resources available."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton variant="primary" icon={<Plus size={14} />} onClick={() => navigate("/admin/workspace-governance?tab=capacity")}>
              Create Reservation
            </HeaderButton>
          </>
        }
      />
      <CapacityReservationsView />
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
  { id: "resources", label: "Reserved Resources", icon: <Boxes size={13} /> },
  { id: "schedule", label: "Schedule", icon: <CalendarRange size={13} /> },
  { id: "allocation", label: "Allocation", icon: <Layers size={13} /> },
  { id: "utilization", label: "Utilization", icon: <ActivityIcon size={13} /> },
  { id: "forecast", label: "Forecast", icon: <TrendingUp size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function ReservationDrawer({ rec, onClose }: { rec: Reservation; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.workspace} · ${rec.reserved} ${rec.unit} · ${rec.startDate}–${rec.endDate} · ${rec.status}`}
      width={840}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
          <HeaderButton icon={<Clock size={13} />}>Extend</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>Export</HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "schedule" && <ScheduleTab rec={rec} />}
      {tab === "allocation" && <AllocationTab rec={rec} />}
      {tab === "utilization" && <UtilizationTab rec={rec} />}
      {tab === "forecast" && <ForecastTab />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Reservation }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Reservation Name", v: rec.name },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Business Unit", v: rec.businessUnit, sample: true },
              { k: "Reservation Type", v: rec.reservationType },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Priority", v: rec.priority },
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
              { k: "Reserved Capacity", v: `${rec.reserved} ${rec.unit}`, sample: true },
              { k: "Allocated Capacity", v: `${rec.allocated} ${rec.unit}`, sample: true },
              { k: "Consumed Capacity", v: `${rec.consumed} ${rec.unit}`, sample: true },
              { k: "Available Capacity", v: `${Math.max(0, rec.reserved - rec.consumed)} ${rec.unit}`, sample: true },
              { k: "Reservation Utilization", v: `${Math.round((rec.consumed / rec.reserved) * 100)}%`, sample: true },
              { k: "Expiration", v: rec.endDate, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function ResourcesTab({ rec }: { rec: Reservation }) {
  const list = RES_TYPES.slice(0, 5).map((r, i) => {
    const m = hashId(rec.id + r);
    const reserved = i === 0 ? rec.reserved : 10 + (m % 90);
    return { id: r, resource: r, reserved, allocated: Math.round(reserved * 0.9), available: Math.round(reserved * 0.3), unit: i === 0 ? rec.unit : pick(["vCPU", "GiB", "TB", "GPU"], m) };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "reserved", header: "Reserved", render: (r) => `${r.reserved} ${r.unit}` },
    { key: "allocated", header: "Allocated", render: (r) => `${r.allocated} ${r.unit}` },
    { key: "available", header: "Available", render: (r) => `${r.available} ${r.unit}` },
    { key: "unit", header: "Unit", render: (r) => r.unit },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Reserved infrastructure. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ScheduleTab({ rec }: { rec: Reservation }) {
  return (
    <Section title="Schedule — reservation timing" sample>
      <KVGrid
        items={[
          { k: "Start Date", v: rec.startDate, sample: true },
          { k: "End Date", v: rec.endDate, sample: true },
          { k: "Duration", v: `${30 + (hashId(rec.id) % 90)} days`, sample: true },
          { k: "Expiration", v: rec.endDate, sample: true },
          { k: "Recurring", v: hashId(rec.id) % 2 === 0 ? "Annual" : "One-time", sample: true },
          { k: "Timezone", v: "UTC", sample: true },
        ]}
      />
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 6 }}>Reservation window</div>
        <div style={{ position: "relative", height: 10, borderRadius: 99, background: T.border, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: "20%", width: "55%", top: 0, bottom: 0, background: T.accent, borderRadius: 99 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textMuted, marginTop: 4 }}>
          <span>{rec.startDate}</span>
          <span>Today</span>
          <span>{rec.endDate}</span>
        </div>
      </div>
    </Section>
  );
}

function AllocationTab({ rec }: { rec: Reservation }) {
  const targets = ["Workspace", "Business Unit", "Project", "Environment", "Cloud Provider", "Region", "Cluster"];
  const list = targets.map((t) => {
    const m = hashId(rec.id + t);
    const reserved = 10 + (m % 60);
    return { id: t, target: t, reserved, allocated: Math.round(reserved * 0.8), remaining: Math.round(reserved * 0.2) };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "target", header: "Target", render: (r) => r.target },
    { key: "reserved", header: "Reserved", render: (r) => `${r.reserved} ${rec.unit}` },
    { key: "allocated", header: "Allocated", render: (r) => `${r.allocated} ${rec.unit}` },
    { key: "remaining", header: "Remaining", render: (r) => `${r.remaining} ${rec.unit}` },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        How reserved capacity is distributed. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function UtilizationTab({ rec }: { rec: Reservation }) {
  const util = (rec.consumed / rec.reserved) * 100;
  return (
    <Section title="Reservation utilization — how reserved capacity is used" sample>
      <StatRow label="Reserved" value={`${rec.reserved} ${rec.unit}`} sample />
      <StatRow label="Consumed" value={`${rec.consumed} ${rec.unit}`} sample />
      <StatRow label="Remaining" value={`${Math.max(0, rec.reserved - rec.consumed)} ${rec.unit}`} sample />
      <StatRow label="Utilization" value={<UsageBar pct={util} tone={util < 40 ? T.warning : T.success} />} sample />
      <StatRow label="Efficiency" value={util < 40 ? "Underused — consider releasing" : "Efficient"} tone={util < 40 ? "warn" : "ok"} sample />
    </Section>
  );
}

function ForecastTab() {
  const [ran, setRan] = React.useState(false);
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <HeaderButton variant="primary" icon={<TrendingUp size={13} />} onClick={() => setRan(true)}>Generate Forecast</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Reservation demand forecast" sample>
        <StatRow label="Upcoming Demand" value={ran ? "+35% next quarter" : "Run forecast"} sample />
        <StatRow label="Capacity Shortage" value={ran ? "Predicted in 45 days" : "—"} tone={ran ? "warn" : undefined} sample />
        <StatRow label="Recommended Reservations" value={ran ? "2 additional pools" : "—"} sample />
        <StatRow label="Forecast Confidence" value={ran ? "82%" : "—"} sample />
      </Section>
    </>
  );
}

function ActivityTab({ rec }: { rec: Reservation }) {
  const events = ["Reservation Created", "Reservation Approved", "Reservation Modified", "Reservation Extended", "Reservation Activated", "Reservation Expired", "Reservation Cancelled"];
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
  const events = ["Reservation Created", "Reservation Updated", "Reservation Approved", "Reservation Extended", "Reservation Cancelled", "Reservation Expired", "Reservation Utilized"];
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

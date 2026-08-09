/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Inheritance & Overrides → Locked Configuration */
import React from "react";
import { useNavigate } from "react-router";
import {
  Lock,
  Unlock,
  Copy,
  Download,
  RefreshCcw,
  ShieldCheck,
  ClipboardCheck,
  History,
  LayoutGrid,
  SlidersHorizontal,
  Layers,
  Inbox,
  Network,
  Check,
  X,
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
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";

/**
 * Locked Configuration — the highest-precedence governance mechanism in the inheritance model:
 * enterprise-controlled settings that cannot be modified below a specified scope. Unlike Workspace
 * Overrides (controlled deviations), a lock explicitly prevents modification unless removed at the
 * owning scope or granted a governed unlock. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/02_Inheritance & Overrides/locked_configuration.md.
 *
 * Enterprise-Governance UX pattern (Banner · Toolbar · Filters · Search · Datatable · Bulk/Row actions ·
 * 8-tab Lock Detail Drawer). No lock backend yet → deterministic sample data tagged `Sample`.
 */

type Category =
  | "Platform"
  | "Identity"
  | "Security"
  | "Compliance"
  | "Networking"
  | "Cloud Resources"
  | "AI Configuration"
  | "Automation"
  | "Monitoring"
  | "Logging"
  | "Encryption"
  | "Secrets";
type LockScope =
  | "Organization"
  | "Business Unit"
  | "Workspace Template"
  | "Workspace";
type LockLevel =
  | "Read Only"
  | "Soft Lock"
  | "Hard Lock"
  | "Temporary Lock"
  | "Inherited Lock";
type Status = "Locked" | "Unlocked" | "Pending Unlock";

const SCOPES: LockScope[] = [
  "Organization",
  "Business Unit",
  "Workspace Template",
  "Workspace",
];
const LEVELS: LockLevel[] = [
  "Read Only",
  "Soft Lock",
  "Hard Lock",
  "Temporary Lock",
  "Inherited Lock",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const OWNERS = [
  "Security Team",
  "Governance Admin",
  "Platform Team",
  "Compliance Office",
  "Cloud Team",
];

const STATUS_TONE: Record<Status, string> = {
  Locked: T.success,
  Unlocked: T.textMuted,
  "Pending Unlock": T.warning,
};
const LEVEL_TONE: Record<LockLevel, string> = {
  "Read Only": T.accent,
  "Soft Lock": T.warning,
  "Hard Lock": T.danger,
  "Temporary Lock": T.purple,
  "Inherited Lock": T.textMuted,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface LockRec {
  id: string;
  name: string;
  category: Category;
  scope: LockScope;
  level: LockLevel;
  status: Status;
  inherited: boolean;
  owner: string;
  businessUnit: string;
  currentValue: string;
  created: string;
  modified: string;
  description: string;
  inheritedWorkspaces: number;
  affectedPolicies: number;
  blockedOverrides: number;
  unlockRequests: number;
  dependencies: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
}

const LOCK_NAMES: { name: string; cat: Category; val: string }[] = [
  { name: "Audit Logging", cat: "Logging", val: "Enabled" },
  { name: "MFA Required", cat: "Identity", val: "Enforced" },
  { name: "Encryption at Rest", cat: "Encryption", val: "AES-256" },
  { name: "Data Residency", cat: "Compliance", val: "EU only" },
  { name: "Secrets Backend", cat: "Secrets", val: "Vault" },
  { name: "Network Egress Policy", cat: "Networking", val: "Default-deny" },
  { name: "Approved AI Providers", cat: "AI Configuration", val: "Allow-list" },
  {
    name: "Cloud Provider Allow-list",
    cat: "Cloud Resources",
    val: "AWS, Azure",
  },
  { name: "Session Timeout", cat: "Security", val: "15 min" },
  { name: "Backup Retention", cat: "Platform", val: "35 days" },
  { name: "Compliance Framework", cat: "Compliance", val: "SOC 2 + ISO 27001" },
  { name: "Automation Approval", cat: "Automation", val: "Required" },
  { name: "Log Forwarding", cat: "Monitoring", val: "SIEM" },
  { name: "TLS Minimum Version", cat: "Security", val: "TLS 1.2" },
];

const SAMPLE_LOCKS: LockRec[] = LOCK_NAMES.map(({ name, cat, val }, i) => {
  const id = `LK-${(1000 + i * 7).toString().padStart(5, "0")}`;
  const n = hashId(id + name);
  const scope = pick(SCOPES, n);
  const level = pick(LEVELS, n >> 1);
  const status = pick<Status>(
    ["Locked", "Locked", "Locked", "Pending Unlock", "Unlocked"],
    n,
  );
  return {
    id,
    name,
    category: cat,
    scope,
    level,
    status,
    inherited: scope !== "Workspace" && n % 3 !== 0,
    owner: pick(OWNERS, n),
    businessUnit: pick(BUSINESS_UNITS, n >> 2),
    currentValue: val,
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    modified: `2026-0${1 + (n % 7)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    description: `Enterprise-controlled ${name.toLowerCase()} lock, enforced at the ${scope} scope and inherited downstream.`,
    inheritedWorkspaces: 2 + (n % 140),
    affectedPolicies: 1 + (n % 12),
    blockedOverrides: n % 20,
    unlockRequests: n % 5,
    dependencies: 1 + (n % 9),
    riskLevel: pick(["Low", "Medium", "High", "Critical"], n >> 3),
  };
});

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_TONE[status];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      {status === "Locked" ? (
        <Lock size={12} />
      ) : status === "Pending Unlock" ? (
        <Unlock size={12} />
      ) : (
        <Unlock size={12} />
      )}
      {status}
    </span>
  );
}
function LevelBadge({ level }: { level: LockLevel }) {
  const c = LEVEL_TONE[level];
  return (
    <span
      style={{
        fontSize: 11.5,
        color: c,
        border: `1px solid ${c}55`,
        borderRadius: 99,
        padding: "2px 9px",
        whiteSpace: "nowrap",
      }}
    >
      {level}
    </span>
  );
}

export function LockedConfigurationView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fCat, setFCat] = React.useState("");
  const [fScope, setFScope] = React.useState("");
  const [fLevel, setFLevel] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fInherit, setFInherit] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_LOCKS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q)) &&
      (!fCat || r.category === fCat) &&
      (!fScope || r.scope === fScope) &&
      (!fLevel || r.level === fLevel) &&
      (!fStatus || r.status === fStatus) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fInherit || (fInherit === "inherited") === r.inherited) &&
      (!fOwner || r.owner === fOwner)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFCat("");
    setFScope("");
    setFLevel("");
    setFStatus("");
    setFBu("");
    setFInherit("");
    setFOwner("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Operational Dashboard (spec §Operational Dashboard).
  const activeLocks = records.filter((r) => r.status === "Locked").length;
  const lockedWorkspaces = records.reduce(
    (a, r) => Math.max(a, r.inheritedWorkspaces),
    0,
  );
  const pendingUnlock = records.reduce((a, r) => a + r.unlockRequests, 0);
  const highRiskUnlock = records
    .filter((r) => r.riskLevel === "High" || r.riskLevel === "Critical")
    .reduce((a, r) => a + r.unlockRequests, 0);
  const lockedPolicies = records.reduce((a, r) => a + r.affectedPolicies, 0);
  const blockedOverrides = records.reduce((a, r) => a + r.blockedOverrides, 0);

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Lock",
      icon: <Lock size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=inheritance"),
    },
    {
      key: "modify",
      label: "Modify Lock",
      icon: <SlidersHorizontal size={15} />,
      disabled: true,
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: <Copy size={15} />,
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
      onClick: () => setSelId(null),
    },
    {
      key: "lock",
      label: "Lock Configuration",
      icon: <Lock size={15} />,
      disabled: true,
    },
    {
      key: "unlock",
      label: "Unlock Configuration",
      icon: <Unlock size={15} />,
      disabled: true,
    },
    {
      key: "approve",
      label: "Approve Unlock",
      icon: <Check size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Lock",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "conflicts",
      label: "Detect Conflicts",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "impact",
      label: "Run Impact Analysis",
      icon: <Network size={15} />,
      disabled: true,
    },
    {
      key: "version",
      label: "Lock History",
      icon: <History size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<LockRec>[] = [
    {
      key: "name",
      header: "Configuration",
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
          <Lock size={13} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortValue: (r) => r.category,
      render: (r) => r.category,
    },
    {
      key: "scope",
      header: "Lock Scope",
      sortValue: (r) => r.scope,
      render: (r) => r.scope,
    },
    {
      key: "inherited",
      header: "Inherited",
      sortValue: (r) => (r.inherited ? 1 : 0),
      render: (r) => (r.inherited ? "Yes" : "No"),
    },
    {
      key: "level",
      header: "Lock Level",
      sortValue: (r) => r.level,
      render: (r) => <LevelBadge level={r.level} />,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
  ];

  return (
    <>
      <StatStripPlain
        items={[
          { label: "Active Locks", value: activeLocks, tone: "ok" },
          { label: "Locked Workspaces", value: lockedWorkspaces, tone: "ok" },
          {
            label: "Pending Unlock Requests",
            value: pendingUnlock,
            tone: pendingUnlock > 0 ? "warn" : "ok",
          },
          {
            label: "High-Risk Unlocks",
            value: highRiskUnlock,
            tone: highRiskUnlock > 0 ? "danger" : "ok",
          },
          { label: "Locked Policies", value: lockedPolicies, tone: "ok" },
          {
            label: "Blocked Overrides",
            value: blockedOverrides,
            tone: blockedOverrides > 0 ? "warn" : "ok",
          },
          { label: "Lock Violations", value: 0, tone: "ok" },
        ]}
      />

      <DiscoveryListView
        title="Locked configuration"
        desc="Locked Configuration is the highest-precedence governance mechanism in the inheritance model — it prevents modification of critical settings below the owning scope, supporting only governed unlock workflows."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search locked configuration — configuration, policy, workspace, business unit, owner, category…"
        count={rows.length}
        pills={[
          {
            key: "category",
            label: "Category",
            value: fCat,
            onChange: setFCat,
            options: facet(records.map((r) => r.category)),
          },
          {
            key: "lockScope",
            label: "Lock Scope",
            value: fScope,
            onChange: setFScope,
            options: facet(records.map((r) => r.scope)),
          },
          {
            key: "lockLevel",
            label: "Lock Level",
            value: fLevel,
            onChange: setFLevel,
            options: facet(records.map((r) => r.level)),
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
          {
            key: "inheritance",
            label: "Inheritance",
            value: fInherit,
            onChange: setFInherit,
            options: [
              { value: "", label: "All" },
              { value: "inherited", label: "Inherited" },
              { value: "direct", label: "Direct" },
            ],
          },
          {
            key: "owner",
            label: "Owner",
            value: fOwner,
            onChange: setFOwner,
            options: facet(records.map((r) => r.owner)),
          },
        ]}
        presets={[{ label: "All locked configuration", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "scope", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Lock size={13} />} onClick={clear}>
              Lock ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<Unlock size={13} />} onClick={clear}>
              Unlock
            </HeaderButton>
            <HeaderButton icon={<Download size={13} />} onClick={clear}>
              Export
            </HeaderButton>
            <HeaderButton icon={<ClipboardCheck size={13} />} onClick={clear}>
              Validate
            </HeaderButton>
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "View", onClick: () => setSelId(r.id) },
              { label: "Edit", onClick: () => setSelId(r.id) },
              { label: "Lock", onClick: () => {} },
              { label: "Unlock", onClick: () => setSelId(r.id) },
              { label: "View Dependencies", onClick: () => setSelId(r.id) },
              { label: "Impact Analysis", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Lock size={20} />}
            title="No locked configurations found."
            hint="Create a lock to protect critical enterprise configuration from unauthorized modification across inherited workspace settings."
            cta="Create Lock"
            onCta={() =>
              navigate("/admin/workspace-governance?tab=inheritance")
            }
          />
        }
      />

      {sel && <LockDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function LockedConfigurationPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Locked Configuration"
        subtitle="Protect critical enterprise configuration by preventing unauthorized modifications across inherited workspace settings."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Lock size={14} />}
              onClick={() =>
                navigate("/admin/workspace-governance?tab=inheritance")
              }
            >
              Create Lock
            </HeaderButton>
          </>
        }
      />
      <LockedConfigurationView />
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
  { id: "settings", label: "Locked Settings", icon: <Lock size={13} /> },
  { id: "scope", label: "Lock Scope", icon: <Layers size={13} /> },
  { id: "deps", label: "Dependencies", icon: <Network size={13} /> },
  {
    id: "effective",
    label: "Effective Configuration",
    icon: <ShieldCheck size={13} />,
  },
  { id: "unlock", label: "Unlock Requests", icon: <Inbox size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function LockDrawer({ rec, onClose }: { rec: LockRec; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.category} · ${rec.scope} · ${rec.level} · ${rec.status}`}
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
          <HeaderButton icon={<Network size={13} />}>
            Impact Analysis
          </HeaderButton>
          <HeaderButton icon={<Unlock size={13} />}>Unlock</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "settings" && <SettingsTab rec={rec} />}
      {tab === "scope" && <ScopeTab rec={rec} />}
      {tab === "deps" && <DepsTab rec={rec} />}
      {tab === "effective" && <EffectiveTab rec={rec} />}
      {tab === "unlock" && <UnlockTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: LockRec }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Configuration", v: rec.name },
              { k: "Category", v: rec.category },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Status", v: rec.status },
              { k: "Lock Level", v: rec.level },
              { k: "Created Date", v: rec.created, sample: true },
              { k: "Modified Date", v: rec.modified, sample: true },
            ]}
          />
          <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
            {rec.description}
          </div>
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              {
                k: "Inherited Workspaces",
                v: rec.inheritedWorkspaces,
                sample: true,
              },
              { k: "Affected Policies", v: rec.affectedPolicies, sample: true },
              { k: "Blocked Overrides", v: rec.blockedOverrides, sample: true },
              { k: "Unlock Requests", v: rec.unlockRequests, sample: true },
              { k: "Dependencies", v: rec.dependencies, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function SettingsTab({ rec }: { rec: LockRec }) {
  return (
    <Section title="Locked settings — protected configuration" sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
        The configuration values protected by this lock, who locked them, and
        the enforcement level.
      </div>
      <StatRow
        label={rec.name}
        value={`${rec.currentValue} · Locked by ${rec.owner}`}
        tone="ok"
        sample
      />
      <StatRow
        label="Lock Level"
        value={<LevelBadge level={rec.level} />}
        sample
      />
      <StatRow label="Category" value={rec.category} sample />
    </Section>
  );
}

function ScopeTab({ rec }: { rec: LockRec }) {
  return (
    <Section title="Lock scope — where the lock applies" sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
        Hierarchy: Organization → Business Unit → Workspace Template →
        Workspace.
      </div>
      {SCOPES.map((s) => (
        <StatRow
          key={s}
          label={s}
          value={
            s === rec.scope
              ? "Owning scope (locked here)"
              : rec.inherited
                ? "Inherited"
                : "—"
          }
          tone={s === rec.scope ? "ok" : undefined}
          sample
        />
      ))}
      <StatRow
        label="Effective Scope"
        value={`${rec.inheritedWorkspaces} workspaces`}
        sample
      />
    </Section>
  );
}

function DepsTab({ rec }: { rec: LockRec }) {
  const n = hashId(rec.id);
  const list = Array.from({ length: 2 + (n % 4) }, (_, i) => {
    const m = hashId(`${rec.id}-d-${i}`);
    return {
      id: `${rec.id}-d-${i}`,
      dep: pick(
        [
          "Encryption Policy",
          "IAM Baseline",
          "Network Policy",
          "Backup Policy",
          "Compliance Control",
        ],
        m,
      ),
      rel: pick(["Requires", "Enforced by", "Depends on"], m),
      workspace: `${pick(BUSINESS_UNITS, m)} WS`,
      status: pick(["Active", "Active", "Pending"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "dep", header: "Dependent Policy", render: (r) => r.dep },
    { key: "rel", header: "Relationship", render: (r) => r.rel },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "status", header: "Status", render: (r) => r.status },
  ];
  return (
    <>
      <div
        style={{
          fontSize: 12.5,
          color: T.textMuted,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Configurations affected by this lock. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function EffectiveTab({ rec }: { rec: LockRec }) {
  return (
    <Section title="Effective configuration — after applying locks" sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
        A requested override against a locked configuration is rejected unless
        an unlock is approved.
      </div>
      <KVGrid
        items={[
          { k: "Configuration", v: rec.name },
          { k: "Inherited Value", v: rec.currentValue, sample: true },
          {
            k: "Requested Override",
            v: rec.blockedOverrides > 0 ? "Change requested" : "None",
            sample: true,
          },
          {
            k: "Effective Value",
            v: `${rec.currentValue} (Locked)`,
            sample: true,
          },
          { k: "Lock Status", v: rec.status, sample: true },
        ]}
      />
    </Section>
  );
}

function UnlockTab({ rec }: { rec: LockRec }) {
  const list = Array.from({ length: rec.unlockRequests }, (_, i) => {
    const m = hashId(`${rec.id}-u-${i}`);
    return {
      id: `${rec.id}-u-${i}`,
      requester: pick(OWNERS, m),
      reason: pick(
        [
          "Migration",
          "Emergency Response",
          "Customer Requirement",
          "Regulatory Exception",
          "Temporary Testing",
        ],
        m,
      ),
      risk: pick(["Low", "Medium", "High", "Critical"], m),
      status: pick(["Pending", "Security Review", "Governance Review"], m),
      expiration: `2026-0${1 + (m % 8)}-${(1 + (m % 27)).toString().padStart(2, "0")}`,
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "requester", header: "Requester", render: (r) => r.requester },
    { key: "reason", header: "Reason", render: (r) => r.reason },
    { key: "risk", header: "Risk Level", render: (r) => r.risk },
    { key: "status", header: "Status", render: (r) => r.status },
    { key: "expiration", header: "Expiration", render: (r) => r.expiration },
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
        <HeaderButton icon={<Check size={13} />}>Approve</HeaderButton>
        <HeaderButton variant="danger" icon={<X size={13} />}>
          Reject
        </HeaderButton>
        <HeaderButton icon={<Inbox size={13} />}>
          Request More Information
        </HeaderButton>
        <SampleTag />
      </div>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
        Workflow: Request → Security Review → Governance Review → Approval →
        Unlock.
      </div>
      {list.length ? (
        <DirectoryTable columns={cols} rows={list} />
      ) : (
        <EmptyState
          icon={<Inbox size={18} />}
          title="No unlock requests"
          hint="No requests to remove this lock are pending."
        />
      )}
    </>
  );
}

function ActivityTab({ rec }: { rec: LockRec }) {
  const events = [
    "Configuration Locked",
    "Lock Updated",
    "Unlock Requested",
    "Unlock Approved",
    "Unlock Rejected",
    "Configuration Restored",
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
    "Lock Created",
    "Lock Modified",
    "Configuration Locked",
    "Unlock Requested",
    "Unlock Approved",
    "Unlock Rejected",
    "Configuration Restored",
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

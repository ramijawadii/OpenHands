/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Inheritance & Overrides → Effective Configuration */
import React from "react";
import {
  RefreshCcw,
  GitCompare,
  Download,
  FileText,
  Eye,
  Network,
  ClipboardCheck,
  Waypoints,
  FileJson,
  FileCode,
  LayoutGrid,
  ShieldCheck,
  Route,
  ListChecks,
  History,
  Layers,
  Lock,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Card,
  StatRow,
  KVGrid,
  DirectoryTable,
  HeaderButton,
  Select,
  SampleTag,
  SideRailDrawer,
  ScopeBadge,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";

/**
 * Effective Configuration — the authoritative, computed runtime configuration of a workspace: the final
 * result after evaluating Organization Defaults → Business Unit → Template → Policy/Compliance
 * Assignments → Overrides → Exceptions → Workspace Config. It answers "what configuration is actually in
 * effect for this workspace right now, and why?". Unlike the Inheritance Tree (which shows relationships),
 * this shows the final values and their winning source. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/02_Inheritance & Overrides/effective_configuration.md.
 *
 * Enterprise-Administration UX pattern (Banner · Configuration Summary · Toolbar · Filters · Search ·
 * Configuration directory · 8-tab Configuration Detail Drawer). No evaluation backend yet → sample data.
 */

type Category =
  | "Platform"
  | "Identity"
  | "Security"
  | "Compliance"
  | "Cloud"
  | "Networking"
  | "Automation"
  | "AI Platform"
  | "Monitoring"
  | "Cost";
type Source =
  | "Organization Default"
  | "Business Unit Default"
  | "Workspace Template"
  | "Creation Policy"
  | "Operational Policy"
  | "Compliance Assignment"
  | "Workspace Override"
  | "Approved Exception";
type CfgStatus = "Healthy" | "Overridden" | "Drift" | "Conflict";

const WORKSPACES = [
  "Payments",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Mobile API",
];
const SOURCES: Source[] = [
  "Organization Default",
  "Business Unit Default",
  "Workspace Template",
  "Creation Policy",
  "Operational Policy",
  "Compliance Assignment",
  "Workspace Override",
  "Approved Exception",
];
const OWNERS = [
  "Governance Admin",
  "Security Team",
  "Platform Team",
  "Compliance Office",
];

const STATUS_TONE: Record<CfgStatus, string> = {
  Healthy: T.success,
  Overridden: T.warning,
  Drift: T.danger,
  Conflict: T.danger,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Cfg {
  id: string;
  name: string;
  category: Category;
  currentValue: string;
  defaultValue: string;
  overrideValue: string;
  source: Source;
  inherited: boolean;
  locked: boolean;
  status: CfgStatus;
  dataType: string;
  description: string;
}

const CFG_SEED: { name: string; cat: Category; val: string; def: string }[] = [
  { name: "Default Region", cat: "Cloud", val: "eu-west-1", def: "eu-west-1" },
  {
    name: "Encryption at Rest",
    cat: "Security",
    val: "AES-256",
    def: "AES-256",
  },
  {
    name: "MFA Enforcement",
    cat: "Identity",
    val: "Enforced",
    def: "Enforced",
  },
  {
    name: "Audit Logging",
    cat: "Security",
    val: "Enabled → SIEM",
    def: "Enabled",
  },
  {
    name: "Default AI Model",
    cat: "AI Platform",
    val: "GPT-5 Enterprise",
    def: "GPT-5",
  },
  {
    name: "Network Egress",
    cat: "Networking",
    val: "Default-deny",
    def: "Default-deny",
  },
  { name: "Backup Retention", cat: "Platform", val: "35 days", def: "35 days" },
  {
    name: "Compliance Framework",
    cat: "Compliance",
    val: "SOC 2 + ISO 27001",
    def: "SOC 2",
  },
  { name: "Session Timeout", cat: "Identity", val: "15 min", def: "30 min" },
  {
    name: "Automation Approval",
    cat: "Automation",
    val: "Required",
    def: "Required",
  },
  { name: "Log Forwarding", cat: "Monitoring", val: "SIEM", def: "Local" },
  { name: "Budget Limit", cat: "Cost", val: "$50k/mo", def: "$25k/mo" },
  {
    name: "Allowed Cloud Providers",
    cat: "Cloud",
    val: "AWS, Azure",
    def: "AWS, Azure, GCP",
  },
  { name: "TLS Minimum", cat: "Security", val: "TLS 1.2", def: "TLS 1.2" },
];

function buildConfig(workspace: string): Cfg[] {
  return CFG_SEED.map(({ name, cat, val, def }, i) => {
    const id = `${workspace}-CF-${i}`;
    const n = hashId(id + name);
    const overridden = val !== def;
    const status: CfgStatus = pick<CfgStatus>(
      overridden
        ? ["Overridden", "Overridden", "Healthy", "Drift"]
        : ["Healthy", "Healthy", "Healthy", "Conflict"],
      n,
    );
    return {
      id,
      name,
      category: cat,
      currentValue: val,
      defaultValue: def,
      overrideValue: overridden ? val : "—",
      source: overridden
        ? pick<Source>(
            ["Workspace Override", "Operational Policy", "Approved Exception"],
            n,
          )
        : pick<Source>(
            [
              "Organization Default",
              "Business Unit Default",
              "Workspace Template",
            ],
            n,
          ),
      inherited: !overridden,
      locked: n % 4 === 0,
      status,
      dataType: pick(["string", "boolean", "enum", "number", "list"], n),
      description: `${name} governs ${cat.toLowerCase()} behavior for the ${workspace} workspace.`,
    };
  });
}

function StatusBadge({ status }: { status: CfgStatus }) {
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

export function EffectiveConfigurationView() {
  const [workspace, setWorkspace] = React.useState(WORKSPACES[0]);
  const [search, setSearch] = React.useState("");
  const [fCat, setFCat] = React.useState("");
  const [fSource, setFSource] = React.useState("");
  const [fInherit, setFInherit] = React.useState("");
  const [fLocked, setFLocked] = React.useState("");
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

  const records = React.useMemo(() => buildConfig(workspace), [workspace]);
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.currentValue.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q)) &&
      (!fCat || r.category === fCat) &&
      (!fSource || r.source === fSource) &&
      (!fInherit || (fInherit === "inherited") === r.inherited) &&
      (!fLocked || (fLocked === "locked") === r.locked) &&
      (!fStatus || r.status === fStatus)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFCat("");
    setFSource("");
    setFInherit("");
    setFLocked("");
    setFStatus("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Operational Dashboard (spec §Operational Dashboard).
  const overrides = records.filter((r) => !r.inherited).length;
  const drift = records.filter((r) => r.status === "Drift").length;
  const conflicts = records.filter((r) => r.status === "Conflict").length;
  const healthy = records.filter((r) => r.status === "Healthy").length;
  const configHealth = Math.round((healthy / records.length) * 100);
  const locked = records.filter((r) => r.locked).length;

  const toolbar: CommandItem[] = [
    {
      key: "refresh",
      label: "Refresh Evaluation",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "compare",
      label: "Compare Configuration",
      icon: <GitCompare size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "preview",
      label: "Preview Changes",
      icon: <Eye size={15} />,
      disabled: true,
    },
    {
      key: "inheritance",
      label: "View Inheritance",
      icon: <Network size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Run Validation",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "drift",
      label: "Detect Drift",
      icon: <Waypoints size={15} />,
      disabled: true,
    },
    {
      key: "json",
      label: "Download JSON",
      icon: <FileJson size={15} />,
      disabled: true,
    },
    {
      key: "yaml",
      label: "Download YAML",
      icon: <FileCode size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Cfg>[] = [
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
          {r.locked ? (
            <Lock size={12} color={T.textMuted} />
          ) : (
            <Layers size={13} color={T.textMuted} />
          )}
          {r.name}
        </span>
      ),
    },
    {
      key: "currentValue",
      header: "Current Value",
      sortValue: (r) => r.currentValue,
      render: (r) => (
        <span style={{ color: r.inherited ? T.textNav : T.warning }}>
          {r.currentValue}
        </span>
      ),
    },
    {
      key: "source",
      header: "Source",
      sortValue: (r) => r.source,
      render: (r) => r.source,
    },
    {
      key: "inherited",
      header: "Inherited",
      sortValue: (r) => (r.inherited ? 1 : 0),
      render: (r) => (r.inherited ? "Yes" : "No"),
    },
    {
      key: "locked",
      header: "Locked",
      sortValue: (r) => (r.locked ? 1 : 0),
      render: (r) => (r.locked ? "Yes" : "No"),
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
      {/* Configuration Summary (spec §Configuration Summary) */}
      <Card
        title="Configuration summary"
        desc="Select a workspace to view its authoritative computed runtime configuration after inheritance, policy evaluation, overrides and governance rules."
        right={
          <div style={{ minWidth: 220 }}>
            <Select
              label="Workspace"
              value={workspace}
              onChange={(v) => {
                setWorkspace(v);
                setSelId(null);
              }}
              options={WORKSPACES.map((w) => ({ value: w, label: w }))}
            />
          </div>
        }
      >
        <KVGrid
          cols={3}
          items={[
            { k: "Workspace", v: workspace },
            { k: "Workspace Type", v: "Regulated Production", sample: true },
            {
              k: "Business Unit",
              v: pick(["Finance", "Retail", "Engineering"], hashId(workspace)),
              sample: true,
            },
            { k: "Environment", v: "Production", sample: true },
            {
              k: "Configuration Version",
              v: `v${8 + (hashId(workspace) % 6)}`,
              sample: true,
            },
            {
              k: "Inheritance Status",
              v: overrides > 0 ? "Customized" : "Fully inherited",
              sample: true,
            },
            {
              k: "Compliance Status",
              v: conflicts > 0 ? "At risk" : "Compliant",
              sample: true,
            },
            {
              k: "Drift Status",
              v: drift > 0 ? `${drift} drifted` : "No drift",
              sample: true,
            },
            { k: "Last Evaluation", v: "3 minutes ago", sample: true },
          ]}
        />
      </Card>

      {/* Operational Dashboard */}
      <StatStripPlain
        items={[
          {
            label: "Configuration Health",
            value: `${configHealth}%`,
            tone: configHealth >= 85 ? "ok" : "warn",
          },
          {
            label: "Overrides",
            value: overrides,
            tone: overrides > 0 ? "warn" : "ok",
          },
          {
            label: "Configuration Drift",
            value: drift,
            tone: drift > 0 ? "danger" : "ok",
          },
          {
            label: "Pending Changes",
            value: hashId(workspace) % 4,
            tone: "ok",
          },
          {
            label: "Effective Policies",
            value: 12 + (hashId(workspace) % 10),
            tone: "ok",
          },
          {
            label: "Compliance Status",
            value: conflicts > 0 ? "At risk" : "Compliant",
            tone: conflicts > 0 ? "warn" : "ok",
          },
          {
            label: "Inheritance Issues",
            value: conflicts,
            tone: conflicts > 0 ? "warn" : "ok",
          },
          { label: "Locked Settings", value: locked, tone: "ok" },
        ]}
      />

      <DiscoveryListView
        title={`Effective configuration — ${workspace}`}
        desc="The final operational configuration applied to this workspace, with the winning source and lock/inheritance status for every setting."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search effective configuration — configuration, policy, resource, integration, setting, cloud service…"
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
            key: "source",
            label: "Source",
            value: fSource,
            onChange: setFSource,
            options: facet(records.map((r) => r.source)),
          },
          {
            key: "inherited",
            label: "Inherited",
            value: fInherit,
            onChange: setFInherit,
            options: [
              { value: "", label: "All" },
              { value: "inherited", label: "Inherited" },
              { value: "direct", label: "Overridden" },
            ],
          },
          {
            key: "locked",
            label: "Locked",
            value: fLocked,
            onChange: setFLocked,
            options: [
              { value: "", label: "All" },
              { value: "locked", label: "Locked" },
              { value: "unlocked", label: "Unlocked" },
            ],
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
        ]}
        presets={[{ label: "All", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "category", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
      />

      {sel && (
        <CfgDrawer
          rec={sel}
          workspace={workspace}
          onClose={() => setSelId(null)}
        />
      )}
    </>
  );
}

export function EffectiveConfigurationPage() {
  return (
    <Page>
      <PageHeader
        title="Effective Configuration"
        subtitle="View the final operational configuration applied to a workspace after inheritance, policy evaluation, overrides, and governance rules have been processed."
        actions={<ScopeBadge scope="This workspace" />}
      />
      <EffectiveConfigurationView />
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
  { id: "value", label: "Current Value", icon: <Layers size={13} /> },
  {
    id: "source",
    label: "Configuration Source",
    icon: <ShieldCheck size={13} />,
  },
  { id: "path", label: "Inheritance Path", icon: <Route size={13} /> },
  {
    id: "policies",
    label: "Policy References",
    icon: <ListChecks size={13} />,
  },
  { id: "history", label: "Change History", icon: <History size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function CfgDrawer({
  rec,
  workspace,
  onClose,
}: {
  rec: Cfg;
  workspace: string;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.category} · ${rec.currentValue} · ${rec.source}`}
      width={840}
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
          <HeaderButton icon={<GitCompare size={13} />}>Compare</HeaderButton>
          <HeaderButton icon={<ShieldCheck size={13} />}>
            View Policy
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "value" && <ValueTab rec={rec} />}
      {tab === "source" && <SourceTab rec={rec} />}
      {tab === "path" && <PathTab rec={rec} workspace={workspace} />}
      {tab === "policies" && <PoliciesTab rec={rec} />}
      {tab === "history" && <HistoryTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

function OverviewTab({ rec }: { rec: Cfg }) {
  return (
    <Section title="Overview">
      <KVGrid
        items={[
          { k: "Configuration Name", v: rec.name },
          { k: "Category", v: rec.category },
          { k: "Current Value", v: rec.currentValue },
          { k: "Data Type", v: rec.dataType, sample: true },
          { k: "Status", v: rec.status },
          { k: "Locked", v: rec.locked ? "Yes" : "No" },
        ]}
      />
      <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
        {rec.description}
      </div>
    </Section>
  );
}

function ValueTab({ rec }: { rec: Cfg }) {
  return (
    <Section title="Current value" sample>
      <KVGrid
        items={[
          { k: "Current Setting", v: rec.currentValue, sample: true },
          { k: "Default Value", v: rec.defaultValue, sample: true },
          { k: "Effective Value", v: rec.currentValue, sample: true },
          { k: "Override Value", v: rec.overrideValue, sample: true },
          { k: "Last Modified", v: "2026-06-14", sample: true },
        ]}
      />
    </Section>
  );
}

function SourceTab({ rec }: { rec: Cfg }) {
  const list = SOURCES.map((s) => {
    const m = hashId(rec.id + s);
    const winning = s === rec.source;
    return {
      id: s,
      source: s,
      version: `v${1 + (m % 9)}`,
      modifiedBy: pick(OWNERS, m),
      appliedDate: `2026-0${1 + (m % 8)}-${(1 + (m % 27)).toString().padStart(2, "0")}`,
      winning: winning ? "Winning" : "Evaluated",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "source", header: "Source", render: (r) => r.source },
    { key: "version", header: "Version", render: (r) => r.version },
    { key: "modifiedBy", header: "Modified By", render: (r) => r.modifiedBy },
    {
      key: "appliedDate",
      header: "Applied Date",
      render: (r) => r.appliedDate,
    },
    {
      key: "winning",
      header: "Result",
      render: (r) => (
        <span
          style={{ color: r.winning === "Winning" ? T.success : T.textMuted }}
        >
          {r.winning}
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
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Where the current value originated — the winning source and every
        evaluated layer. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function PathTab({ rec, workspace }: { rec: Cfg; workspace: string }) {
  const layers = [
    {
      layer: "Organization",
      value: rec.defaultValue,
      winning: rec.source === "Organization Default",
    },
    {
      layer: "Business Unit",
      value: rec.defaultValue,
      winning: rec.source === "Business Unit Default",
    },
    {
      layer: "Workspace Template",
      value: rec.defaultValue,
      winning: rec.source === "Workspace Template",
    },
    {
      layer: "Policy",
      value: rec.currentValue,
      winning: rec.source.includes("Policy"),
    },
    {
      layer: "Workspace Override",
      value: rec.overrideValue,
      winning: rec.source === "Workspace Override",
    },
    {
      layer: "Effective Configuration",
      value: rec.currentValue,
      winning: true,
    },
  ];
  return (
    <Section title={`Inheritance path — ${workspace}`} sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Every evaluated layer, the winning configuration, and why. The last
        layer is always the effective value.
      </div>
      {layers.map((l, i) => (
        <div
          key={l.layer}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 0",
          }}
        >
          <div
            style={{
              width: 20,
              textAlign: "center",
              color: T.textMuted,
              fontSize: 11,
            }}
          >
            {i + 1}
          </div>
          <div
            style={{
              width: 4,
              height: 28,
              background: l.winning ? T.success : T.border,
              borderRadius: 2,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                color: l.winning ? T.textPrimary : T.textMuted,
                fontWeight: l.winning ? 600 : 400,
              }}
            >
              {l.layer}
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>{l.value}</div>
          </div>
          {l.winning && (
            <span
              style={{
                fontSize: 11,
                color: T.success,
                border: `1px solid ${T.success}55`,
                borderRadius: 99,
                padding: "2px 9px",
              }}
            >
              Winning
            </span>
          )}
        </div>
      ))}
    </Section>
  );
}

function PoliciesTab({ rec }: { rec: Cfg }) {
  const list = Array.from({ length: 2 + (hashId(rec.id) % 3) }, (_, i) => {
    const m = hashId(`${rec.id}-p-${i}`);
    return {
      id: `${rec.id}-p-${i}`,
      policy: pick(
        [
          "Security Baseline",
          "Data Residency",
          "Encryption Standard",
          "AI Governance",
          "Network Policy",
        ],
        m,
      ),
      version: `v${1 + (m % 6)}`,
      priority: pick(["Critical", "High", "Medium"], m),
      status: pick(["Active", "Active", "Draft"], m),
      effect: pick(["Sets value", "Restricts range", "Locks value"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "policy", header: "Policy", render: (r) => r.policy },
    { key: "version", header: "Version", render: (r) => r.version },
    { key: "priority", header: "Priority", render: (r) => r.priority },
    { key: "status", header: "Status", render: (r) => r.status },
    { key: "effect", header: "Effect", render: (r) => r.effect },
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
        Every policy affecting this configuration. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function HistoryTab({ rec }: { rec: Cfg }) {
  const list = Array.from({ length: 4 }, (_, i) => {
    const m = hashId(`${rec.id}-h-${i}`);
    return {
      id: `${rec.id}-h-${i}`,
      previous: pick(["Enabled", "eu-west-1", "30 min", "GPT-5"], m),
      current: rec.currentValue,
      changedBy: pick(OWNERS, m),
      date: `2026-0${1 + (m % 8)}-${(1 + (m % 27)).toString().padStart(2, "0")}`,
      reason: pick(
        [
          "Policy update",
          "Approved override",
          "Drift remediation",
          "Template change",
        ],
        m,
      ),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    {
      key: "previous",
      header: "Previous Value",
      render: (r) => <span style={{ color: T.textMuted }}>{r.previous}</span>,
    },
    { key: "current", header: "Current Value", render: (r) => r.current },
    { key: "changedBy", header: "Changed By", render: (r) => r.changedBy },
    { key: "date", header: "Date", render: (r) => r.date },
    { key: "reason", header: "Reason", render: (r) => r.reason },
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
        <HeaderButton icon={<GitCompare size={13} />}>
          Compare Versions
        </HeaderButton>
        <HeaderButton icon={<History size={13} />}>Restore</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ActivityTab({ rec }: { rec: Cfg }) {
  const events = [
    "Configuration Evaluated",
    "Policy Updated",
    "Override Applied",
    "Configuration Changed",
    "Drift Detected",
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
    "Configuration Calculated",
    "Override Applied",
    "Policy Evaluated",
    "Inheritance Updated",
    "Drift Detected",
    "Baseline Restored",
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

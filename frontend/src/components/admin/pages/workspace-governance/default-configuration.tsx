/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Workspace Policies → Default Configuration */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Copy,
  Upload,
  Download,
  RefreshCcw,
  UserCheck,
  Eye,
  ClipboardCheck,
  Send,
  Archive,
  GitBranch,
  History,
  LayoutGrid,
  Settings2,
  ShieldCheck,
  Cog,
  Boxes,
  Brain,
  Cable,
  Activity as ActivityIcon,
  Trash2,
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
  PostureCard,
  PostureGrid,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { ColumnChooser } from "#/components/admin/settings-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";

/**
 * Default Configuration — the enterprise baseline configuration automatically applied to newly
 * provisioned workspaces (the actual initial settings, services, features, integrations, quotas and
 * governance a workspace starts with). Foundation for consistent enterprise provisioning.
 * Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/01_Workspace Policies/default_configuration.md.
 *
 * Same Enterprise-Governance UX (Banner · Toolbar · Filters · Search · Datatable · Bulk/Row actions ·
 * 11-tab Configuration Detail Drawer). No configuration backend yet → deterministic representative
 * sample data (tagged `Sample`); swap SAMPLE_CONFIGS for the live query when it lands.
 */

type Status = "Active" | "Draft" | "Archived" | "Disabled";
type Assignment = "Organization" | "Business Unit" | "Workspace";

const ASSIGNMENTS: Assignment[] = [
  "Organization",
  "Business Unit",
  "Workspace",
];
const WORKSPACE_TYPES = [
  "Production",
  "Development",
  "Sandbox",
  "Research",
  "Shared Services",
  "Customer",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const PROFILES = [
  "Enterprise Production",
  "Enterprise Development",
  "Sandbox",
  "Research",
  "Shared Services",
  "Customer Workspace",
  "Compliance Workspace",
];
const OWNERS = [
  "Platform Admin",
  "Aisha Khan",
  "David Chen",
  "Marco Rossi",
  "Priya Nair",
];

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Draft: T.textMuted,
  Archived: T.textMuted,
  Disabled: T.warning,
};

interface Config {
  id: string;
  name: string;
  workspaceType: string;
  assignment: Assignment;
  status: Status;
  version: string;
  modified: string;
  created: string;
  owner: string;
  businessUnit: string;
  environment: string;
  profile: string;
  inherited: boolean;
  description: string;
  // Statistics
  assignedWorkspaces: number;
  inheritedConfigs: number;
  overrides: number;
  validationScore: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

const CONFIG_NAMES = [
  "Enterprise Production Baseline",
  "Enterprise Development Baseline",
  "Sandbox Baseline",
  "Research Workspace Baseline",
  "Shared Services Baseline",
  "Customer Workspace Baseline",
  "Compliance Workspace Baseline",
  "Regulated Production Baseline",
  "Cloud-Native Baseline",
  "Data Platform Baseline",
];

const SAMPLE_CONFIGS: Config[] = CONFIG_NAMES.map((name, i) => {
  const id = `DC-${(1000 + i * 8).toString().padStart(5, "0")}`;
  const n = hashId(id + name);
  return {
    id,
    name,
    workspaceType: pick(WORKSPACE_TYPES, n),
    assignment: pick(ASSIGNMENTS, n >> 2),
    status: pick<Status>(
      ["Active", "Active", "Active", "Draft", "Disabled", "Archived"],
      n,
    ),
    version: `v${1 + (n % 9)}`,
    modified: `2026-0${1 + (n % 7)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + ((n + 6) % 27)).toString().padStart(2, "0")}`,
    owner: pick(OWNERS, n),
    businessUnit: pick(BUSINESS_UNITS, n >> 1),
    environment: pick(ENVIRONMENTS, n >> 3),
    profile: pick(PROFILES, n >> 4),
    inherited: n % 3 === 0,
    description: `Enterprise baseline configuration automatically applied to new ${pick(WORKSPACE_TYPES, n).toLowerCase()} workspaces during provisioning.`,
    assignedWorkspaces: 5 + (n % 240),
    inheritedConfigs: 1 + (n % 6),
    overrides: n % 5,
    validationScore: 78 + (n % 22),
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

export function DefaultConfigurationView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fProfile, setFProfile] = React.useState("");
  const [fInherit, setFInherit] = React.useState("");
  const [fVersion, setFVersion] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_CONFIGS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.workspaceType.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.profile.toLowerCase().includes(q)) &&
      (!fStatus || r.status === fStatus) &&
      (!fEnv || r.environment === fEnv) &&
      (!fType || r.workspaceType === fType) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fProfile || r.profile === fProfile) &&
      (!fInherit || (fInherit === "inherited") === r.inherited) &&
      (!fVersion || r.version === fVersion)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFStatus("");
    setFEnv("");
    setFType("");
    setFBu("");
    setFProfile("");
    setFInherit("");
    setFVersion("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Operational Dashboard (spec §Operational Dashboard).
  const published = records.filter((r) => r.status === "Active").length;
  const overrides = records.reduce((a, r) => a + r.overrides, 0);
  const drift = records.filter((r) => r.validationScore < 90).length;
  const validationFailures = records.filter(
    (r) => r.validationScore < 85,
  ).length;
  const conflicts = records.filter(
    (r) => r.inherited && r.overrides > 0,
  ).length;
  const versions = records.reduce(
    (a, r) => a + parseInt(r.version.slice(1), 10),
    0,
  );
  const coverage = Math.round((published / records.length) * 100);

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Configuration",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=policies"),
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: <Copy size={15} />,
      disabled: true,
    },
    {
      key: "import",
      label: "Import",
      icon: <Upload size={15} />,
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
      key: "assign",
      label: "Assign Configuration",
      icon: <UserCheck size={15} />,
      disabled: true,
    },
    {
      key: "preview",
      label: "Preview Effective Configuration",
      icon: <Eye size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Configuration",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "publish",
      label: "Publish",
      icon: <Send size={15} />,
      disabled: true,
    },
    {
      key: "archive",
      label: "Archive",
      icon: <Archive size={15} />,
      disabled: true,
    },
    {
      key: "version",
      label: "Create Version",
      icon: <GitBranch size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Versions",
      icon: <History size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Config>[] = [
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
          <Settings2 size={14} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    {
      key: "workspaceType",
      header: "Workspace Type",
      sortValue: (r) => r.workspaceType,
      render: (r) => r.workspaceType,
    },
    {
      key: "assignment",
      header: "Assignment",
      sortValue: (r) => r.assignment,
      render: (r) => r.assignment,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "version",
      header: "Version",
      sortValue: (r) => r.version,
      render: (r) => r.version,
    },
    {
      key: "modified",
      header: "Last Modified",
      sortValue: (r) => r.modified,
      render: (r) => r.modified,
    },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard
          title="Published Configurations"
          value={published}
          tone="ok"
          sub={
            <>
              Active baselines <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Workspace Coverage"
          value={`${coverage}%`}
          tone={coverage >= 80 ? "ok" : "warn"}
          sub={
            <>
              Provisioned with a baseline <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Configuration Drift"
          value={drift}
          tone={drift > 0 ? "warn" : "ok"}
          sub={
            <>
              Baselines below 90% <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Overrides"
          value={overrides}
          tone={overrides > 0 ? "warn" : "ok"}
          sub={
            <>
              Approved deviations <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Validation Failures"
          value={validationFailures}
          tone={validationFailures > 0 ? "danger" : "ok"}
          sub={
            <>
              Below validation floor <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Inheritance Conflicts"
          value={conflicts}
          tone={conflicts > 0 ? "warn" : "ok"}
          sub={
            <>
              Inherited + overridden <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Configuration Versions"
          value={versions}
          sub={
            <>
              Across all baselines <SampleTag />
            </>
          }
        />
      </PostureGrid>

      <DiscoveryListView
        title="Default configurations"
        desc="Default Configuration specifies the initial settings, services, features, integrations, quotas and governance automatically provisioned for a workspace — the foundation for consistent enterprise provisioning."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search default configurations — configuration name, workspace type, business unit, environment, assignment…"
        count={rows.length}
        pills={[
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
          {
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "workspaceType",
            label: "Workspace Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.workspaceType)),
          },
          {
            key: "businessUnit",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "configurationProfile",
            label: "Configuration Profile",
            value: fProfile,
            onChange: setFProfile,
            options: facet(records.map((r) => r.profile)),
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
            key: "version",
            label: "Version",
            value: fVersion,
            onChange: setFVersion,
            options: facet(records.map((r) => r.version)),
          },
        ]}
        presets={[
          { label: "All default configurations", onApply: clearFilters },
        ]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<UserCheck size={13} />} onClick={clear}>
              Assign ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<ClipboardCheck size={13} />} onClick={clear}>
              Enable
            </HeaderButton>
            <HeaderButton onClick={clear}>Disable</HeaderButton>
            <HeaderButton icon={<Download size={13} />} onClick={clear}>
              Export
            </HeaderButton>
            <HeaderButton icon={<Archive size={13} />} onClick={clear}>
              Archive
            </HeaderButton>
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "View", onClick: () => setSelId(r.id) },
              { label: "Edit", onClick: () => setSelId(r.id) },
              { label: "Duplicate", onClick: () => {} },
              { label: "Assign", onClick: () => setSelId(r.id) },
              { label: "Preview", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
              { label: "Archive", onClick: () => setSelId(r.id) },
              {
                label: "Delete",
                onClick: () => setSelId(r.id),
                danger: true,
              },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Settings2 size={20} />}
            title="No default configurations found."
            hint="Create a default configuration to define the enterprise baseline automatically applied to new workspaces during provisioning."
            cta="Create Default Configuration"
            onCta={() => navigate("/admin/workspace-governance?tab=policies")}
          />
        }
      />

      {sel && <ConfigDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function DefaultConfigurationPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Default Configuration"
        subtitle="Define the default enterprise configuration automatically applied to new workspaces during provisioning."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() =>
                navigate("/admin/workspace-governance?tab=policies")
              }
            >
              Create Configuration
            </HeaderButton>
          </>
        }
      />
      <DefaultConfigurationView />
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

// A labelled group of default settings rendered as StatRows (config backend not wired).
function SettingGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title} sample>
      {items.map((it, i) => (
        <StatRow
          key={it}
          label={it}
          value={pick(
            ["Enabled", "Inherited", "Custom", "Enabled"],
            hashId(it) + i,
          )}
          tone="ok"
          sample
        />
      ))}
    </Section>
  );
}

// ════════════ Configuration Detail Drawer — 11 sub-tabs (spec §Configuration Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "platform", label: "Platform Defaults", icon: <Settings2 size={13} /> },
  {
    id: "security",
    label: "Security Defaults",
    icon: <ShieldCheck size={13} />,
  },
  { id: "operational", label: "Operational Defaults", icon: <Cog size={13} /> },
  { id: "resource", label: "Resource Defaults", icon: <Boxes size={13} /> },
  { id: "ai", label: "AI Defaults", icon: <Brain size={13} /> },
  { id: "integrations", label: "Integrations", icon: <Cable size={13} /> },
  { id: "assignments", label: "Assignments", icon: <UserCheck size={13} /> },
  { id: "validation", label: "Validation", icon: <ClipboardCheck size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function ConfigDrawer({ rec, onClose }: { rec: Config; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.workspaceType} · ${rec.status} · ${rec.version} · ${rec.assignment}`}
      width={860}
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
          <HeaderButton icon={<Eye size={13} />}>Preview</HeaderButton>
          <HeaderButton icon={<UserCheck size={13} />}>Assign</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "platform" && (
        <SettingGroup
          title="Platform Defaults"
          items={[
            "Workspace Template",
            "Default Region",
            "Default Time Zone",
            "Default Language",
            "Naming Convention",
            "Tags",
            "Labels",
            "Workspace Icon",
            "Lifecycle Policy",
          ]}
        />
      )}
      {tab === "security" && (
        <SettingGroup
          title="Security Defaults"
          items={[
            "Authentication",
            "MFA",
            "Session Policies",
            "Encryption",
            "Secret Management",
            "Conditional Access",
            "DLP",
            "Workspace Isolation",
            "Audit Logging",
          ]}
        />
      )}
      {tab === "operational" && (
        <SettingGroup
          title="Operational Defaults"
          items={[
            "Maintenance Window",
            "Operational Hours",
            "Notification Rules",
            "Automation Enabled",
            "Approval Requirements",
            "Monitoring Enabled",
            "Health Checks",
            "Backup Schedule",
            "Retention Policy",
          ]}
        />
      )}
      {tab === "resource" && (
        <SettingGroup
          title="Resource Defaults"
          items={[
            "AWS Account",
            "Azure Subscription",
            "GCP Project",
            "Kubernetes Cluster",
            "Storage",
            "Networking",
            "Databases",
            "Resource Groups",
            "Cost Center",
            "Quota Profile",
          ]}
        />
      )}
      {tab === "ai" && (
        <SettingGroup
          title="AI Defaults"
          items={[
            "Default AI Provider",
            "Default Model",
            "Fallback Model",
            "Prompt Library",
            "Knowledge Sources",
            "Guardrails",
            "Safety Policies",
            "Execution Mode",
            "Human Approval",
            "Context Window",
            "Memory Settings",
          ]}
        />
      )}
      {tab === "integrations" && <IntegrationsTab rec={rec} />}
      {tab === "assignments" && <AssignmentsTab rec={rec} />}
      {tab === "validation" && <ValidationTab />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "scope", label: "Scope" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Config }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Configuration Name", v: rec.name },
              { k: "Status", v: rec.status },
              { k: "Version", v: rec.version },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Created Date", v: rec.created, sample: true },
              { k: "Modified Date", v: rec.modified, sample: true },
            ]}
          />
          <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
            {rec.description}
          </div>
        </Section>
      )}
      {sub === "scope" && (
        <Section title="Scope" sample>
          <StatRow label="Organization" value="Contoso Enterprise" sample />
          <StatRow label="Business Unit" value={rec.businessUnit} sample />
          <StatRow label="Workspace Type" value={rec.workspaceType} sample />
          <StatRow label="Environment" value={rec.environment} sample />
          <StatRow
            label="Inheritance"
            value={rec.inherited ? "Inherited from Organization" : "Direct"}
            tone={rec.inherited ? "ok" : undefined}
            sample
          />
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              {
                k: "Assigned Workspaces",
                v: rec.assignedWorkspaces,
                sample: true,
              },
              {
                k: "Inherited Configurations",
                v: rec.inheritedConfigs,
                sample: true,
              },
              { k: "Overrides", v: rec.overrides, sample: true },
              {
                k: "Validation Score",
                v: `${rec.validationScore}%`,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function IntegrationsTab({ rec }: { rec: Config }) {
  const integrations = [
    "Identity Provider",
    "SSO",
    "SCIM",
    "SIEM",
    "ITSM",
    "Slack",
    "Microsoft Teams",
    "Jira",
    "GitHub",
    "Cloud Providers",
    "MCP Servers",
    "Email",
    "Webhooks",
  ];
  const list = integrations.map((integration, i) => {
    const m = hashId(`${rec.id}-i-${i}`);
    return {
      id: `${rec.id}-i-${i}`,
      integration,
      type: pick(
        ["Identity", "Security", "Collaboration", "Cloud", "Automation"],
        m,
      ),
      enabled: m % 3 === 0 ? "No" : "Yes",
      inherited: m % 2 === 0 ? "Yes" : "No",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "integration", header: "Integration", render: (r) => r.integration },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "enabled", header: "Enabled", render: (r) => r.enabled },
    { key: "inherited", header: "Inherited", render: (r) => r.inherited },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
        Enterprise integrations automatically assigned to new workspaces.{" "}
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} pageSize={9} />
    </>
  );
}

function AssignmentsTab({ rec }: { rec: Config }) {
  const n = hashId(rec.id);
  const list = Array.from({ length: 2 + (n % 4) }, (_, i) => {
    const m = hashId(`${rec.id}-a-${i}`);
    return {
      id: `${rec.id}-a-${i}`,
      assignment: `${pick(BUSINESS_UNITS, m)} ${pick(WORKSPACE_TYPES, m)}`,
      scope: pick(ASSIGNMENTS, m),
      inherited: m % 2 === 0 ? "Inherited" : "Direct",
      status: pick<Status>(["Active", "Active", "Disabled"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "assignment", header: "Assignment", render: (r) => r.assignment },
    { key: "scope", header: "Scope", render: (r) => r.scope },
    { key: "inherited", header: "Inherited", render: (r) => r.inherited },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
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
        <HeaderButton icon={<UserCheck size={13} />}>Assign</HeaderButton>
        <HeaderButton variant="danger" icon={<Trash2 size={13} />}>
          Remove Assignment
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ValidationTab() {
  const categories = [
    "Security",
    "Compliance",
    "Resources",
    "AI",
    "Identity",
    "Integrations",
    "Networking",
    "Automation",
    "Monitoring",
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
        <HeaderButton icon={<ClipboardCheck size={13} />}>
          Run Validation
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>
          Generate Report
        </HeaderButton>
        <SampleTag />
      </div>
      <Section title="Validation results — Passed · Warnings · Errors" sample>
        {categories.map((c, i) => {
          const r = pick(
            ["Passed", "Passed", "Warnings", "Errors"],
            hashId(c) + i,
          );
          return (
            <StatRow
              key={c}
              label={c}
              value={r}
              tone={
                r === "Passed" ? "ok" : r === "Warnings" ? "warn" : "danger"
              }
              sample
            />
          );
        })}
      </Section>
    </>
  );
}

function ActivityTab({ rec }: { rec: Config }) {
  const events = [
    "Configuration Created",
    "Configuration Updated",
    "Assignment Added",
    "Validation Executed",
    "Published",
    "Override Applied",
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
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Date: Any" },
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
    "Configuration Created",
    "Configuration Modified",
    "Assignment Updated",
    "Published",
    "Archived",
    "Validation Completed",
    "Override Approved",
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

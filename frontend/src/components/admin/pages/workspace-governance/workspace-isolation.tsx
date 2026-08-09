/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Cross-Workspace Governance → Workspace Isolation */
import React from "react";
import { useNavigate } from "react-router";
import {
  ShieldOff,
  Plus,
  Check,
  Trash2,
  ClipboardCheck,
  Download,
  RefreshCcw,
  ScanLine,
  FileText,
  GitCompare,
  RotateCcw,
  LayoutGrid,
  ListChecks,
  Network,
  Fingerprint,
  Database,
  Boxes,
  Bot,
  Cog,
  FilePlus2,
  CheckCircle2,
  History,
  ShieldCheck,
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
 * Workspace Isolation — the primary security control enabling multi-tenancy: the security, networking,
 * identity, operational and governance boundaries that prevent one workspace from affecting or accessing
 * another unless explicitly authorized. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/04_Cross-Workspace Governance/workspace_isolation.md.
 *
 * Enterprise-Governance UX pattern (Banner · KPI · Toolbar · Filters · Search · Datatable · Bulk/Row
 * actions · 12-tab Isolation Detail Drawer). No isolation backend yet → deterministic sample.
 */

type IsolationLevel =
  | "Strict"
  | "High Security"
  | "Standard"
  | "Shared Services"
  | "Development"
  | "Sandbox"
  | "Custom";
type Boundary = "Isolated" | "Shared" | "Restricted";
type Status = "Healthy" | "Violation" | "Degraded";

const LEVELS: IsolationLevel[] = [
  "Strict",
  "High Security",
  "Standard",
  "Shared Services",
  "Development",
  "Sandbox",
  "Custom",
];
const ENVIRONMENTS = [
  "Production",
  "Pre-production",
  "Development",
  "Sandbox",
  "Shared Services",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const PROVIDERS = ["AWS", "Azure", "GCP", "Kubernetes", "Multi-cloud"];
const WORKSPACES = [
  "Payments",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Mobile API",
  "Security Ops",
  "Sandbox Lab",
];
const OWNERS = [
  "Security Team",
  "Platform Team",
  "Governance Admin",
  "Workspace Owner",
];

const STATUS_TONE: Record<Status, string> = {
  Healthy: T.success,
  Violation: T.danger,
  Degraded: T.warning,
};
const BOUNDARY_TONE: Record<Boundary, string> = {
  Isolated: T.success,
  Shared: T.warning,
  Restricted: T.accent,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Isolation {
  id: string;
  workspace: string;
  level: IsolationLevel;
  environment: string;
  network: Boundary;
  identity: Boundary;
  data: Boundary;
  status: Status;
  businessUnit: string;
  provider: string;
  owner: string;
  created: string;
  lastValidation: string;
  policies: number;
  exceptions: number;
  violations: number;
  protectedResources: number;
  protectedIdentities: number;
  complianceControls: number;
  validationScore: number;
}

const SAMPLE_ISO: Isolation[] = WORKSPACES.map((workspace, i) => {
  const id = `IS-${(10000 + i * 37).toString()}`;
  const n = hashId(id + workspace);
  const level = pick(LEVELS, n);
  const strict = level === "Strict" || level === "High Security";
  const status = pick<Status>(
    strict
      ? ["Healthy", "Healthy", "Healthy", "Degraded"]
      : ["Healthy", "Healthy", "Degraded", "Violation"],
    n,
  );
  const boundary = (seed: number): Boundary =>
    strict
      ? "Isolated"
      : pick<Boundary>(["Isolated", "Isolated", "Shared", "Restricted"], seed);
  return {
    id,
    workspace,
    level,
    environment: pick(ENVIRONMENTS, n >> 2),
    network: boundary(n),
    identity: boundary(n >> 1),
    data: boundary(n >> 2),
    status,
    businessUnit: pick(BUSINESS_UNITS, n),
    provider: pick(PROVIDERS, n >> 3),
    owner: pick(OWNERS, n),
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    lastValidation: pick(["5 minutes ago", "2 hours ago", "yesterday"], n),
    policies: 3 + (n % 6),
    exceptions: n % 4,
    violations: status === "Violation" ? 1 + (n % 3) : 0,
    protectedResources: 10 + (n % 60),
    protectedIdentities: 5 + (n % 40),
    complianceControls: 4 + (n % 16),
    validationScore: strict ? 95 + (n % 5) : 75 + (n % 20),
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
function BoundaryBadge({ boundary }: { boundary: Boundary }) {
  const c = BOUNDARY_TONE[boundary];
  return <span style={{ fontSize: 11.5, color: c }}>{boundary}</span>;
}

export function WorkspaceIsolationView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fLevel, setFLevel] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fProvider, setFProvider] = React.useState("");
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

  const records = SAMPLE_ISO;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.level.toLowerCase().includes(q)) &&
      (!fWs || r.workspace === fWs) &&
      (!fEnv || r.environment === fEnv) &&
      (!fLevel || r.level === fLevel) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fProvider || r.provider === fProvider) &&
      (!fStatus || r.status === fStatus)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFWs("");
    setFEnv("");
    setFLevel("");
    setFBu("");
    setFProvider("");
    setFStatus("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const protectedWorkspaces = records.length;
  const policies = records.reduce((a, r) => a + r.policies, 0);
  const violations = records.reduce((a, r) => a + r.violations, 0);
  const exceptions = records.reduce((a, r) => a + r.exceptions, 0);
  const crossConnections =
    records.filter((r) => r.network === "Shared").length * 3;
  const validationScore = Math.round(
    records.reduce((a, r) => a + r.validationScore, 0) / records.length,
  );
  const securityFindings = violations;
  const complianceScore = Math.round(
    records.reduce((a, r) => a + r.validationScore, 0) / records.length,
  );

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Isolation Policy",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=cross"),
    },
    {
      key: "apply",
      label: "Apply Policy",
      icon: <Check size={15} />,
      disabled: true,
    },
    {
      key: "remove",
      label: "Remove Policy",
      icon: <Trash2 size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Isolation",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "review",
      label: "Launch Review",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "scan",
      label: "Run Compliance Scan",
      icon: <ScanLine size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Policies",
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
      key: "detect",
      label: "Detect Violations",
      icon: <ShieldOff size={15} />,
      disabled: true,
    },
    {
      key: "refresh",
      label: "Refresh",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "restore",
      label: "Restore Defaults",
      icon: <RotateCcw size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Isolation>[] = [
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
          <ShieldOff size={13} color={T.textMuted} />
          {r.workspace}
        </span>
      ),
    },
    {
      key: "level",
      header: "Isolation Level",
      sortValue: (r) => r.level,
      render: (r) => r.level,
    },
    {
      key: "environment",
      header: "Environment",
      sortValue: (r) => r.environment,
      render: (r) => r.environment,
    },
    {
      key: "network",
      header: "Network",
      sortValue: (r) => r.network,
      render: (r) => <BoundaryBadge boundary={r.network} />,
    },
    {
      key: "identity",
      header: "Identity",
      sortValue: (r) => r.identity,
      render: (r) => <BoundaryBadge boundary={r.identity} />,
    },
    {
      key: "data",
      header: "Data",
      sortValue: (r) => r.data,
      render: (r) => <BoundaryBadge boundary={r.data} />,
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
      <PostureGrid>
        <PostureCard
          title="Protected Workspaces"
          value={protectedWorkspaces}
          tone="ok"
          sub={
            <>
              With isolation policy <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Isolation Policies"
          value={policies}
          tone="ok"
          sub={
            <>
              Enforced enterprise-wide <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Isolation Violations"
          value={violations}
          tone={violations > 0 ? "danger" : "ok"}
          sub={
            <>
              Boundary breaches <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Active Exceptions"
          value={exceptions}
          tone={exceptions > 0 ? "warn" : "ok"}
          sub={
            <>
              Approved deviations <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Cross-Workspace Connections"
          value={crossConnections}
          tone="ok"
          sub={
            <>
              Explicit shares <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Validation Score"
          value={`${validationScore}%`}
          tone={validationScore >= 90 ? "ok" : "warn"}
          sub={
            <>
              Continuous validation <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Security Findings"
          value={securityFindings}
          tone={securityFindings > 0 ? "warn" : "ok"}
          sub={
            <>
              Open isolation issues <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Compliance Score"
          value={`${complianceScore}%`}
          tone={complianceScore >= 85 ? "ok" : "warn"}
          sub={
            <>
              Isolation posture <SampleTag />
            </>
          }
        />
      </PostureGrid>

      <DiscoveryListView
        title="Workspace isolation"
        desc="Define and enforce security boundaries that isolate workspaces while enabling controlled cross-workspace collaboration through approved governance policies. No implicit cross-workspace trust."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search isolation policies — workspace, policy, environment, owner, business unit, cloud provider…"
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
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "isolationLevel",
            label: "Isolation Level",
            value: fLevel,
            onChange: setFLevel,
            options: facet(records.map((r) => r.level)),
          },
          {
            key: "businessUnit",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "cloudProvider",
            label: "Cloud Provider",
            value: fProvider,
            onChange: setFProvider,
            options: facet(records.map((r) => r.provider)),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
        ]}
        presets={[{ label: "All workspace isolation", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "status", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Check size={13} />} onClick={clear}>
              Apply Policy ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<ClipboardCheck size={13} />} onClick={clear}>
              Validate
            </HeaderButton>
            <HeaderButton icon={<ScanLine size={13} />} onClick={clear}>
              Compliance Scan
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
              { label: "Validate", onClick: () => setSelId(r.id) },
              { label: "Launch Review", onClick: () => {} },
              { label: "Clone Policy", onClick: () => {} },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<ShieldOff size={20} />}
            title="No isolation policies have been configured."
            hint="Create an isolation policy to enforce security, network, identity and data boundaries between workspaces."
            cta="Create Isolation Policy"
            onCta={() => navigate("/admin/workspace-governance?tab=cross")}
          />
        }
      />

      {sel && <IsolationDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function WorkspaceIsolationPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Workspace Isolation"
        subtitle="Define and enforce security boundaries that isolate workspaces while enabling controlled cross-workspace collaboration through approved governance policies."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspace-governance?tab=cross")}
            >
              Create Isolation Policy
            </HeaderButton>
          </>
        }
      />
      <WorkspaceIsolationView />
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

// Text-only control group renderer (isolation domains have no backend).
function ControlGroup({
  items,
  valueOf,
}: {
  items: string[];
  valueOf?: (it: string) => string;
}) {
  return (
    <>
      {items.map((it) => (
        <StatRow
          key={it}
          label={it}
          value={valueOf ? valueOf(it) : "Enforced"}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "policies",
    label: "Isolation Policies",
    icon: <ListChecks size={13} />,
  },
  { id: "network", label: "Network Isolation", icon: <Network size={13} /> },
  {
    id: "identity",
    label: "Identity Isolation",
    icon: <Fingerprint size={13} />,
  },
  { id: "data", label: "Data Isolation", icon: <Database size={13} /> },
  { id: "resource", label: "Resource Isolation", icon: <Boxes size={13} /> },
  { id: "ai", label: "AI Isolation", icon: <Bot size={13} /> },
  { id: "automation", label: "Automation Isolation", icon: <Cog size={13} /> },
  { id: "exceptions", label: "Exceptions", icon: <FilePlus2 size={13} /> },
  { id: "validation", label: "Validation", icon: <CheckCircle2 size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function IsolationDrawer({
  rec,
  onClose,
}: {
  rec: Isolation;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.workspace}
      subtitle={`${rec.level} · ${rec.environment} · ${rec.status}`}
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
          <HeaderButton icon={<CheckCircle2 size={13} />}>
            Validate
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "policies" && <PoliciesTab rec={rec} />}
      {tab === "network" && <NetworkTab rec={rec} />}
      {tab === "identity" && <IdentityTab />}
      {tab === "data" && <DataTab />}
      {tab === "resource" && <ResourceTab />}
      {tab === "ai" && <AITab />}
      {tab === "automation" && <AutomationTab />}
      {tab === "exceptions" && <ExceptionsTab rec={rec} />}
      {tab === "validation" && <ValidationTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Isolation }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Workspace", v: rec.workspace },
              { k: "Environment", v: rec.environment, sample: true },
              { k: "Isolation Level", v: rec.level },
              { k: "Status", v: rec.status },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Applied Policies", v: rec.policies, sample: true },
              { k: "Created Date", v: rec.created, sample: true },
              { k: "Last Validation", v: rec.lastValidation, sample: true },
            ]}
          />
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Isolation Policies", v: rec.policies, sample: true },
              { k: "Exceptions", v: rec.exceptions, sample: true },
              { k: "Violations", v: rec.violations, sample: true },
              {
                k: "Protected Resources",
                v: rec.protectedResources,
                sample: true,
              },
              {
                k: "Protected Identities",
                v: rec.protectedIdentities,
                sample: true,
              },
              {
                k: "Compliance Controls",
                v: rec.complianceControls,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function PoliciesTab({ rec }: { rec: Isolation }) {
  const list = LEVELS.map((l) => {
    const m = hashId(rec.id + l);
    return {
      id: l,
      policy: `${l} Isolation`,
      enforcement:
        l === rec.level
          ? "Applied"
          : pick(["Available", "Available", "Inherited"], m),
      inherited: m % 3 === 0 ? "Yes" : "No",
      version: `v${1 + (m % 5)}`,
      status: l === rec.level ? "Active" : "—",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "policy", header: "Policy", render: (r) => r.policy },
    { key: "enforcement", header: "Enforcement", render: (r) => r.enforcement },
    { key: "inherited", header: "Inherited", render: (r) => r.inherited },
    { key: "version", header: "Version", render: (r) => r.version },
    { key: "status", header: "Status", render: (r) => r.status },
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
        <HeaderButton icon={<Check size={13} />}>Assign</HeaderButton>
        <HeaderButton variant="danger" icon={<Trash2 size={13} />}>
          Remove
        </HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function NetworkTab({ rec }: { rec: Isolation }) {
  const controls = [
    "Private Networking",
    "Firewall Rules",
    "VPC Isolation",
    "Virtual Networks",
    "Service Mesh",
    "Private Endpoints",
    "Ingress Policies",
    "Egress Policies",
    "DNS Isolation",
    "Zero Trust Networking",
  ];
  const list = controls.map((c) => {
    const m = hashId(rec.id + c);
    return {
      id: c,
      policy: c,
      status: pick(["Enforced", "Enforced", "Partial"], m),
      violations: m % 3,
      lastValidation: pick(["5m ago", "2h ago", "yesterday"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "policy", header: "Policy", render: (r) => r.policy },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Enforced" ? T.success : T.warning }}
        >
          {r.status}
        </span>
      ),
    },
    { key: "violations", header: "Violations", render: (r) => r.violations },
    {
      key: "lastValidation",
      header: "Last Validation",
      render: (r) => r.lastValidation,
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
        Controls network communication between workspaces. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function IdentityTab() {
  return (
    <>
      <Section title="Identity isolation controls" sample>
        <ControlGroup
          items={[
            "Users",
            "Groups",
            "Roles",
            "Service Accounts",
            "Managed Identities",
            "Federated Identity",
            "OIDC",
            "SAML",
          ]}
          valueOf={() => "Isolated"}
        />
      </Section>
      <Section title="Rules" sample>
        <ControlGroup
          items={[
            "No shared administrator accounts",
            "No implicit trust",
            "Least privilege",
            "Explicit federation only",
          ]}
          valueOf={() => "Enforced"}
        />
      </Section>
    </>
  );
}

function DataTab() {
  return (
    <Section title="Data isolation controls" sample>
      <ControlGroup
        items={[
          "Database Isolation",
          "Storage Isolation",
          "Encryption",
          "Key Separation",
          "Secrets Isolation",
          "Backup Isolation",
          "Logging Isolation",
        ]}
        valueOf={() => "Compliant"}
      />
    </Section>
  );
}

function ResourceTab() {
  const resources = [
    "AWS Accounts",
    "Azure Subscriptions",
    "GCP Projects",
    "Kubernetes Clusters",
    "Virtual Networks",
    "Storage",
    "Databases",
    "Secrets",
    "AI Models",
  ];
  return (
    <Section title="Resource isolation — infrastructure sharing policy" sample>
      {resources.map((r) => {
        const m = hashId(r);
        return (
          <StatRow
            key={r}
            label={r}
            value={pick(["Dedicated", "Dedicated", "Shared", "Restricted"], m)}
            tone="ok"
            sample
          />
        );
      })}
    </Section>
  );
}

function AITab() {
  return (
    <Section title="AI isolation controls" sample>
      <ControlGroup
        items={[
          "Dedicated AI Agents",
          "Model Isolation",
          "Prompt Isolation",
          "Knowledge Base Isolation",
          "Vector Database Isolation",
          "Memory Isolation",
          "Inference Isolation",
          "GPU Isolation",
        ]}
        valueOf={() => "Isolated"}
      />
    </Section>
  );
}

function AutomationTab() {
  return (
    <Section title="Automation isolation controls" sample>
      <ControlGroup
        items={[
          "Workflow Isolation",
          "Pipeline Isolation",
          "Execution Isolation",
          "Credential Isolation",
          "Secret Isolation",
          "Job Isolation",
          "Agent Isolation",
        ]}
        valueOf={() => "Enforced"}
      />
    </Section>
  );
}

function ExceptionsTab({ rec }: { rec: Isolation }) {
  const list = Array.from({ length: rec.exceptions }, (_, i) => {
    const m = hashId(`${rec.id}-e-${i}`);
    return {
      id: `${rec.id}-e-${i}`,
      policy: pick(
        ["Network Isolation", "Data Isolation", "Identity Isolation"],
        m,
      ),
      reason: pick(["Migration", "Shared Logging", "Emergency Response"], m),
      approvedBy: pick(OWNERS, m),
      expiration: `2026-0${1 + (m % 8)}-${(1 + (m % 27)).toString().padStart(2, "0")}`,
      status: pick(["Active", "Pending", "Expired"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "policy", header: "Policy", render: (r) => r.policy },
    { key: "reason", header: "Reason", render: (r) => r.reason },
    { key: "approvedBy", header: "Approved By", render: (r) => r.approvedBy },
    { key: "expiration", header: "Expiration", render: (r) => r.expiration },
    { key: "status", header: "Status", render: (r) => r.status },
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
        <HeaderButton icon={<FilePlus2 size={13} />}>
          Create Exception
        </HeaderButton>
        <HeaderButton icon={<Check size={13} />}>Approve</HeaderButton>
        <SampleTag />
      </div>
      {list.length ? (
        <DirectoryTable columns={cols} rows={list} />
      ) : (
        <EmptyState
          icon={<FilePlus2 size={18} />}
          title="No exceptions"
          hint="No approved isolation exceptions for this workspace."
        />
      )}
    </>
  );
}

function ValidationTab({ rec }: { rec: Isolation }) {
  const checks = [
    "Network",
    "Identity",
    "Resources",
    "Secrets",
    "Storage",
    "Policies",
    "Automation",
    "AI",
    "Compliance",
  ];
  const list = checks.map((c) => {
    const m = hashId(rec.id + c);
    const result = pick(["Passed", "Passed", "Passed", "Failed"], m);
    return {
      id: c,
      validation: c,
      result,
      severity:
        result === "Failed" ? pick(["Medium", "High", "Critical"], m) : "—",
      recommendation: result === "Failed" ? "Remediate boundary" : "Maintain",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "validation", header: "Validation", render: (r) => r.validation },
    {
      key: "result",
      header: "Result",
      render: (r) => (
        <span style={{ color: r.result === "Passed" ? T.success : T.danger }}>
          {r.result}
        </span>
      ),
    },
    { key: "severity", header: "Severity", render: (r) => r.severity },
    {
      key: "recommendation",
      header: "Recommendation",
      render: (r) => r.recommendation,
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
        <HeaderButton icon={<CheckCircle2 size={13} />}>
          Run Validation
        </HeaderButton>
        <HeaderButton icon={<FileText size={13} />}>
          Generate Report
        </HeaderButton>
        <SampleTag />
      </div>
      <Section title="Continuous isolation validation" sample>
        <StatRow
          label="Validation Score"
          value={`${rec.validationScore}%`}
          tone={rec.validationScore >= 90 ? "ok" : "warn"}
          sample
        />
      </Section>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ActivityTab({ rec }: { rec: Isolation }) {
  const events = [
    "Policy Assigned",
    "Validation Completed",
    "Violation Detected",
    "Exception Approved",
    "Policy Updated",
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
    "Isolation Policy Assigned",
    "Isolation Updated",
    "Validation Completed",
    "Violation Detected",
    "Exception Approved",
    "Policy Removed",
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

/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Cross-Workspace Governance → Cross-Workspace Access */
import React from "react";
import { useNavigate } from "react-router";
import {
  KeyRound,
  Send,
  Check,
  Ban,
  Clock,
  Download,
  ClipboardCheck,
  ShieldAlert,
  ScanLine,
  FileText,
  RefreshCcw,
  LayoutGrid,
  User,
  Boxes,
  ListChecks,
  GitPullRequestArrow,
  Waypoints,
  ShieldCheck,
  BadgeCheck,
  History,
  ArrowRight,
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
 * Cross-Workspace Access — governs the actual permissions and effective access granted across workspace
 * boundaries (identities, services, applications, automation, AI agents, workloads). Unlike Trust
 * Relationships (which establish that trust exists), this governs the real permissions, with centralized
 * visibility, approval, auditing and continuous validation. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/04_Cross-Workspace Governance/cross_workspace_access.md.
 *
 * Enterprise-Governance UX pattern (Banner · KPI Dashboard · Toolbar · Filters · Search · Datatable ·
 * Bulk/Row actions · 10-tab Access Detail Drawer). No access backend yet → deterministic sample.
 */

type IdentityType =
  | "User"
  | "Group"
  | "Role"
  | "Service Account"
  | "Application"
  | "AI Agent"
  | "Managed Identity";
type AccessType =
  | "Temporary"
  | "Permanent"
  | "Service"
  | "Human"
  | "AI Agent"
  | "Emergency";
type Permission = "Read" | "Write" | "Execute" | "Deploy" | "Admin" | "Owner";
type Status = "Active" | "Pending" | "Expired" | "Revoked";

const IDENTITY_TYPES: IdentityType[] = [
  "User",
  "Group",
  "Role",
  "Service Account",
  "Application",
  "AI Agent",
  "Managed Identity",
];
const ACCESS_TYPES: AccessType[] = [
  "Temporary",
  "Permanent",
  "Service",
  "Human",
  "AI Agent",
  "Emergency",
];
const PERMISSIONS: Permission[] = [
  "Read",
  "Write",
  "Execute",
  "Deploy",
  "Admin",
  "Owner",
];
const WORKSPACES = [
  "Payments",
  "Shared Services",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Security Ops",
];
const RESOURCES = [
  "Central Secrets",
  "Shared VPC",
  "Logging Cluster",
  "AI Gateway",
  "Shared Database",
  "Image Registry",
  "API Gateway",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Shared"];
const OWNERS = [
  "Security Team",
  "Platform Team",
  "Access Admin",
  "Workspace Owner",
];
const FRAMEWORKS = [
  "ISO 27001",
  "SOC 2",
  "NIST",
  "PCI DSS",
  "HIPAA",
  "CSA CCM",
];

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Pending: T.warning,
  Expired: T.textMuted,
  Revoked: T.danger,
};
const PERM_TONE: Record<Permission, string> = {
  Read: T.textMuted,
  Write: T.accent,
  Execute: T.accent,
  Deploy: T.warning,
  Admin: T.danger,
  Owner: T.danger,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Access {
  id: string;
  identity: string;
  identityType: IdentityType;
  source: string;
  target: string;
  resource: string;
  permission: Permission;
  accessType: AccessType;
  expiration: string;
  status: Status;
  environment: string;
  owner: string;
  created: string;
  framework: string;
  privileged: boolean;
  approvalStages: number;
  policyViolations: number;
  resources: number;
  permissions: number;
}

const IDENTITY_NAMES = [
  "Payments API",
  "billing-svc",
  "Data Team",
  "sre-agent",
  "Analytics Role",
  "deploy-bot",
  "Support Group",
  "backup-svc",
  "security-agent",
  "Mobile App",
  "etl-svc",
  "Platform Admins",
  "audit-reader",
  "ml-agent",
  "webhook-svc",
];

const SAMPLE_ACCESS: Access[] = IDENTITY_NAMES.map((identity, i) => {
  const id = `AC-${(10000 + i * 37).toString()}`;
  const n = hashId(id + identity);
  const source = pick(WORKSPACES, n);
  let target = pick(WORKSPACES, n >> 2);
  if (target === source) target = pick(WORKSPACES, n >> 4);
  const permission = pick(PERMISSIONS, n >> 1);
  const status = pick<Status>(
    ["Active", "Active", "Active", "Pending", "Expired", "Revoked"],
    n,
  );
  return {
    id,
    identity,
    identityType: pick(IDENTITY_TYPES, n),
    source,
    target,
    resource: pick(RESOURCES, n >> 3),
    permission,
    accessType: pick(ACCESS_TYPES, n >> 1),
    expiration: pick(["Never", "2026-09-30", "30 days", "24 hours"], n),
    status,
    environment: pick(ENVIRONMENTS, n >> 2),
    owner: pick(OWNERS, n),
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    framework: pick(FRAMEWORKS, n >> 3),
    privileged: permission === "Admin" || permission === "Owner",
    approvalStages: 2 + (n % 3),
    policyViolations: n % 4,
    resources: 1 + (n % 8),
    permissions: 1 + (n % 5),
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
function PermBadge({ permission }: { permission: Permission }) {
  const c = PERM_TONE[permission];
  return (
    <span
      style={{
        fontSize: 11.5,
        color: c,
        border: `1px solid ${c}55`,
        borderRadius: 99,
        padding: "2px 9px",
      }}
    >
      {permission}
    </span>
  );
}

export function CrossWorkspaceAccessView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fSource, setFSource] = React.useState("");
  const [fTarget, setFTarget] = React.useState("");
  const [fIdentity, setFIdentity] = React.useState("");
  const [fAccess, setFAccess] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
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

  const records = SAMPLE_ACCESS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.identity.toLowerCase().includes(q) ||
        r.resource.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q)) &&
      (!fSource || r.source === fSource) &&
      (!fTarget || r.target === fTarget) &&
      (!fIdentity || r.identityType === fIdentity) &&
      (!fAccess || r.accessType === fAccess) &&
      (!fEnv || r.environment === fEnv) &&
      (!fStatus || r.status === fStatus)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFSource("");
    setFTarget("");
    setFIdentity("");
    setFAccess("");
    setFEnv("");
    setFStatus("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const activeGrants = records.filter((r) => r.status === "Active").length;
  const pending = records.filter((r) => r.status === "Pending").length;
  const temporary = records.filter((r) => r.accessType === "Temporary").length;
  const expired = records.filter((r) => r.status === "Expired").length;
  const sharedResources = new Set(records.map((r) => r.resource)).size;
  const privileged = records.filter((r) => r.privileged).length;
  const violations = records.reduce((a, r) => a + r.policyViolations, 0);
  const reviews = records.filter((r) => r.status === "Active").length;

  const toolbar: CommandItem[] = [
    {
      key: "grant",
      label: "Grant Access",
      icon: <KeyRound size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=cross"),
    },
    {
      key: "request",
      label: "Request Access",
      icon: <Send size={15} />,
      disabled: true,
    },
    {
      key: "approve",
      label: "Approve Access",
      icon: <Check size={15} />,
      disabled: true,
    },
    {
      key: "revoke",
      label: "Revoke Access",
      icon: <Ban size={15} />,
      disabled: true,
    },
    {
      key: "extend",
      label: "Extend Access",
      icon: <Clock size={15} />,
      disabled: true,
    },
    {
      key: "review",
      label: "Launch Review",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "excessive",
      label: "Detect Excessive Access",
      icon: <ShieldAlert size={15} />,
      disabled: true,
    },
    {
      key: "scan",
      label: "Run Compliance Scan",
      icon: <ScanLine size={15} />,
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
      label: "Refresh Permissions",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Access>[] = [
    {
      key: "identity",
      header: "Identity",
      sortValue: (r) => r.identity,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <User size={13} color={T.textMuted} />
          {r.identity}
          <span style={{ fontSize: 10.5, color: T.textMuted }}>
            · {r.identityType}
          </span>
        </span>
      ),
    },
    {
      key: "route",
      header: "Source → Target",
      render: (r) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: T.textNav,
          }}
        >
          {r.source} <ArrowRight size={11} color={T.textMuted} /> {r.target}
        </span>
      ),
    },
    {
      key: "resource",
      header: "Resource",
      sortValue: (r) => r.resource,
      render: (r) => r.resource,
    },
    {
      key: "permission",
      header: "Permission",
      sortValue: (r) => r.permission,
      render: (r) => <PermBadge permission={r.permission} />,
    },
    {
      key: "expiration",
      header: "Expiration",
      sortValue: (r) => r.expiration,
      render: (r) => r.expiration,
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
          title="Active Access Grants"
          value={activeGrants}
          tone="ok"
          sub={
            <>
              Effective now <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Pending Requests"
          value={pending}
          tone={pending > 0 ? "warn" : "ok"}
          sub={
            <>
              Awaiting approval <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Temporary Grants"
          value={temporary}
          tone="ok"
          sub={
            <>
              Time-limited access <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Expired Grants"
          value={expired}
          tone="ok"
          sub={
            <>
              No longer valid <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Shared Resources"
          value={sharedResources}
          tone="ok"
          sub={
            <>
              Accessed cross-workspace <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Privileged Access"
          value={privileged}
          tone={privileged > 0 ? "warn" : "ok"}
          sub={
            <>
              Admin/Owner grants <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Policy Violations"
          value={violations}
          tone={violations > 0 ? "warn" : "ok"}
          sub={
            <>
              Failing governance <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Access Reviews"
          value={reviews}
          tone="ok"
          sub={
            <>
              Certification scope <SampleTag />
            </>
          }
        />
      </PostureGrid>

      <DiscoveryListView
        title="Cross-workspace access"
        desc="Manage and govern secure access between workspaces while enforcing least privilege, approval workflows, isolation boundaries and enterprise security policies."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search cross-workspace access — workspace, identity, group, role, resource, application, service, AI agent…"
        count={rows.length}
        pills={[
          {
            key: "sourceWorkspace",
            label: "Source Workspace",
            value: fSource,
            onChange: setFSource,
            options: facet(records.map((r) => r.source)),
          },
          {
            key: "targetWorkspace",
            label: "Target Workspace",
            value: fTarget,
            onChange: setFTarget,
            options: facet(records.map((r) => r.target)),
          },
          {
            key: "identityType",
            label: "Identity Type",
            value: fIdentity,
            onChange: setFIdentity,
            options: facet(records.map((r) => r.identityType)),
          },
          {
            key: "accessType",
            label: "Access Type",
            value: fAccess,
            onChange: setFAccess,
            options: facet(records.map((r) => r.accessType)),
          },
          {
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
        ]}
        presets={[
          { label: "All cross-workspace access", onApply: clearFilters },
        ]}
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
              Approve ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<Ban size={13} />} onClick={clear}>
              Revoke
            </HeaderButton>
            <HeaderButton icon={<Clock size={13} />} onClick={clear}>
              Extend
            </HeaderButton>
            <HeaderButton icon={<ClipboardCheck size={13} />} onClick={clear}>
              Review
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
              { label: "Extend", onClick: () => {} },
              { label: "Approve", onClick: () => {} },
              { label: "Revoke", onClick: () => {}, danger: true },
              { label: "Launch Review", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<KeyRound size={20} />}
            title="No cross-workspace access has been configured."
            hint="Grant cross-workspace access to allow an identity in one workspace to reach a resource in another, under least privilege and approval workflows."
            cta="Grant Cross-Workspace Access"
            onCta={() => navigate("/admin/workspace-governance?tab=cross")}
          />
        }
      />

      {sel && <AccessDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function CrossWorkspaceAccessPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Cross-Workspace Access"
        subtitle="Manage and govern secure access between workspaces while enforcing least privilege, approval workflows, isolation boundaries, and enterprise security policies."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<KeyRound size={14} />}
              onClick={() => navigate("/admin/workspace-governance?tab=cross")}
            >
              Grant Access
            </HeaderButton>
          </>
        }
      />
      <CrossWorkspaceAccessView />
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
  { id: "identity", label: "Identity", icon: <User size={13} /> },
  { id: "resources", label: "Resources", icon: <Boxes size={13} /> },
  { id: "permissions", label: "Permissions", icon: <ListChecks size={13} /> },
  {
    id: "approval",
    label: "Approval Workflow",
    icon: <GitPullRequestArrow size={13} />,
  },
  { id: "effective", label: "Effective Access", icon: <Waypoints size={13} /> },
  { id: "security", label: "Security", icon: <ShieldCheck size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function AccessDrawer({ rec, onClose }: { rec: Access; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.identity} → ${rec.target}`}
      subtitle={`${rec.accessType} · ${rec.permission} on ${rec.resource} · ${rec.status}`}
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
          <HeaderButton icon={<Clock size={13} />}>Extend</HeaderButton>
          <HeaderButton icon={<Ban size={13} />}>Revoke</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "identity" && <IdentityTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "permissions" && <PermissionsTab rec={rec} />}
      {tab === "approval" && <ApprovalTab rec={rec} />}
      {tab === "effective" && <EffectiveTab rec={rec} />}
      {tab === "security" && <SecurityTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Access }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Access ID", v: rec.id },
              { k: "Source Workspace", v: rec.source, sample: true },
              { k: "Target Workspace", v: rec.target, sample: true },
              { k: "Access Type", v: rec.accessType },
              {
                k: "Purpose",
                v: `${rec.permission} access to ${rec.resource}`,
                sample: true,
              },
              { k: "Owner", v: rec.owner, sample: true },
              { k: "Created Date", v: rec.created, sample: true },
              { k: "Expiration", v: rec.expiration, sample: true },
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
              { k: "Resources", v: rec.resources, sample: true },
              { k: "Permissions", v: rec.permissions, sample: true },
              {
                k: "Inherited Access",
                v: rec.permission === "Admin" ? "Yes" : "No",
                sample: true,
              },
              { k: "Approval Stages", v: rec.approvalStages, sample: true },
              { k: "Policy Violations", v: rec.policyViolations, sample: true },
              { k: "Review Status", v: "Current", sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function IdentityTab({ rec }: { rec: Access }) {
  const list = [
    {
      id: rec.id,
      identity: rec.identity,
      type: rec.identityType,
      workspace: rec.source,
      owner: rec.owner,
      status: "Active",
    },
  ];
  const cols: Column<(typeof list)[number]>[] = [
    { key: "identity", header: "Identity", render: (r) => r.identity },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "owner", header: "Owner", render: (r) => r.owner },
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
        Who is receiving access. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ResourcesTab({ rec }: { rec: Access }) {
  const list = Array.from({ length: rec.resources }, (_, i) => {
    const m = hashId(`${rec.id}-r-${i}`);
    return {
      id: `${rec.id}-r-${i}`,
      resource: i === 0 ? rec.resource : pick(RESOURCES, m),
      type: pick(["Secrets", "Network", "Database", "AI", "Storage", "API"], m),
      workspace: rec.target,
      classification: pick(["Internal", "Confidential", "Restricted"], m),
      status: pick(["Active", "Active", "Pending"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    {
      key: "classification",
      header: "Classification",
      render: (r) => r.classification,
    },
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
        Resources being accessed in {rec.target}. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function PermissionsTab({ rec }: { rec: Access }) {
  const list = Array.from({ length: rec.permissions }, (_, i) => {
    const m = hashId(`${rec.id}-p-${i}`);
    return {
      id: `${rec.id}-p-${i}`,
      permission: i === 0 ? rec.permission : pick(PERMISSIONS, m),
      scope: pick(["Resource", "Namespace", "Account"], m),
      inherited: m % 3 === 0 ? "Yes" : "No",
      approvedBy: pick(OWNERS, m),
      status: "Granted",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    {
      key: "permission",
      header: "Permission",
      render: (r) => <PermBadge permission={r.permission as Permission} />,
    },
    { key: "scope", header: "Scope", render: (r) => r.scope },
    { key: "inherited", header: "Inherited", render: (r) => r.inherited },
    { key: "approvedBy", header: "Approved By", render: (r) => r.approvedBy },
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
        Identity → Workspace → Permission → Resource. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ApprovalTab({ rec }: { rec: Access }) {
  const stages = [
    "Request",
    "Manager Approval",
    "Workspace Owner",
    "Security Approval",
    "Granted",
  ];
  return (
    <Section title="Approval workflow" sample>
      {stages.map((s, i) => {
        const done = i < rec.approvalStages + 1;
        return (
          <div
            key={s}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: done ? T.success : T.border,
                color: "#fff",
                fontSize: 11,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {done ? "✓" : i + 1}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: T.textPrimary }}>{s}</div>
              <div style={{ fontSize: 11.5, color: T.textMuted }}>
                {done
                  ? `${pick(OWNERS, hashId(rec.id) + i)} · approved`
                  : "Pending"}
              </div>
            </div>
          </div>
        );
      })}
    </Section>
  );
}

function EffectiveTab({ rec }: { rec: Access }) {
  const layers = [
    "User",
    "Group",
    "Role",
    "Workspace Policy",
    "Trust Relationship",
    "Cross-Workspace Access",
    "Final Permission",
  ];
  return (
    <Section
      title="Effective access — final permission after inheritance"
      sample
    >
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        The evaluation chain producing the final permission.
      </div>
      {layers.map((l, i) => (
        <div
          key={l}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 0",
          }}
        >
          <div
            style={{
              width: 4,
              height: 24,
              background: i === layers.length - 1 ? T.success : T.border,
              borderRadius: 2,
            }}
          />
          <div
            style={{
              fontSize: 13,
              color: i === layers.length - 1 ? T.textPrimary : T.textMuted,
              fontWeight: i === layers.length - 1 ? 600 : 400,
            }}
          >
            {l}
          </div>
          {i === layers.length - 1 && (
            <span style={{ marginLeft: "auto" }}>
              <PermBadge permission={rec.permission} />
            </span>
          )}
        </div>
      ))}
    </Section>
  );
}

function SecurityTab({ rec }: { rec: Access }) {
  const controls = [
    "Conditional Access",
    "MFA Requirement",
    "Least Privilege",
    "Zero Trust Validation",
    "Session Controls",
  ];
  const list = controls.map((c) => {
    const m = hashId(rec.id + c);
    return {
      id: c,
      control: c,
      status: pick(["Passed", "Passed", "Attention"], m),
      severity: pick(["Low", "Medium", "High"], m),
      recommendation: pick(["Maintain", "Reduce scope", "Add expiration"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "control", header: "Control", render: (r) => r.control },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span style={{ color: r.status === "Passed" ? T.success : T.warning }}>
          {r.status}
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
      <Section title="Zero-trust security posture" sample>
        <StatRow
          label="Risk Score"
          value={`${rec.policyViolations * 12 + (rec.privileged ? 30 : 0)}/100`}
          tone={rec.privileged ? "warn" : "ok"}
          sample
        />
        <StatRow
          label="Least Privilege"
          value={rec.privileged ? "Review — privileged" : "Compliant"}
          tone={rec.privileged ? "warn" : "ok"}
          sample
        />
      </Section>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ComplianceTab({ rec }: { rec: Access }) {
  const list = FRAMEWORKS.map((f) => {
    const m = hashId(rec.id + f);
    return {
      id: f,
      framework: f,
      status: pick(["Compliant", "Compliant", "Gap"], m),
      violations: m % 3,
      controls: 2 + (m % 10),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "framework", header: "Framework", render: (r) => r.framework },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Compliant" ? T.success : T.warning }}
        >
          {r.status}
        </span>
      ),
    },
    { key: "violations", header: "Violations", render: (r) => r.violations },
    { key: "controls", header: "Controls", render: (r) => r.controls },
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
        Compliance posture for this grant. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ActivityTab({ rec }: { rec: Access }) {
  const events = [
    "Access Requested",
    "Access Granted",
    "Access Modified",
    "Permission Updated",
    "Access Extended",
    "Access Revoked",
    "Review Completed",
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
    "Access Requested",
    "Access Approved",
    "Permission Granted",
    "Permission Modified",
    "Permission Revoked",
    "Emergency Access Used",
    "Review Completed",
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

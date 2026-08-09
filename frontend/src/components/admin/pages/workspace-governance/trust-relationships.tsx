/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Cross-Workspace Governance → Trust Relationships */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Send,
  Download,
  RefreshCcw,
  Check,
  X,
  PauseCircle,
  Ban,
  ClipboardCheck,
  ScanLine,
  FileText,
  Upload,
  LayoutGrid,
  Users,
  KeyRound,
  ListChecks,
  Boxes,
  Fingerprint,
  ShieldCheck,
  BadgeCheck,
  History,
  Handshake,
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
 * Trust Relationships — the authoritative registry for all cross-workspace trust: the authorization,
 * communication, identity, resource and governance trust established between workspaces. Trust enables
 * controlled collaboration while preserving isolation and enforcing least privilege. Unlike
 * Cross-Workspace Access (the actual permissions), Trust Relationships establish that trust exists.
 * Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/04_Cross-Workspace Governance/trust_relationships.md.
 *
 * Enterprise-Governance UX pattern (Banner · KPI Dashboard · Toolbar · Filters · Search · Datatable ·
 * Bulk/Row actions · 10-tab Trust Detail Drawer). No trust backend yet → deterministic sample.
 */

type TrustType =
  | "Identity Trust"
  | "Resource Sharing"
  | "Application Trust"
  | "Service Trust"
  | "Network Trust"
  | "Secrets Trust"
  | "AI Platform Trust"
  | "Federation Trust";
type AccessScope = "Read Only" | "Read/Write" | "Scoped" | "Admin";
type Status = "Active" | "Pending" | "Suspended" | "Revoked" | "Expiring";

const TRUST_TYPES: TrustType[] = [
  "Identity Trust",
  "Resource Sharing",
  "Application Trust",
  "Service Trust",
  "Network Trust",
  "Secrets Trust",
  "AI Platform Trust",
  "Federation Trust",
];
const SCOPES: AccessScope[] = ["Read Only", "Read/Write", "Scoped", "Admin"];
const WORKSPACES = [
  "Payments",
  "Shared Services",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Security Ops",
  "Central Logging",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Shared"];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const OWNERS = [
  "Governance Admin",
  "Security Team",
  "Platform Team",
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
  Suspended: T.accent,
  Revoked: T.textMuted,
  Expiring: T.danger,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Trust {
  id: string;
  name: string;
  source: string;
  target: string;
  trustType: TrustType;
  scope: AccessScope;
  expiration: string;
  status: Status;
  businessUnit: string;
  environment: string;
  owner: string;
  created: string;
  framework: string;
  connectedResources: number;
  sharedAssets: number;
  sharedRoles: number;
  policies: number;
  reviews: number;
  securityFindings: number;
}

const SAMPLE_TRUSTS: Trust[] = Array.from({ length: 15 }, (_, i) => {
  const id = `TR-${(10000 + i * 37).toString()}`;
  const n = hashId(id);
  const source = pick(WORKSPACES, n);
  let target = pick(WORKSPACES, n >> 2);
  if (target === source) target = pick(WORKSPACES, n >> 4);
  const status = pick<Status>(
    [
      "Active",
      "Active",
      "Active",
      "Pending",
      "Suspended",
      "Expiring",
      "Revoked",
    ],
    n,
  );
  return {
    id,
    name: `${source} → ${target}`,
    source,
    target,
    trustType: pick(TRUST_TYPES, n >> 1),
    scope: pick(SCOPES, n >> 3),
    expiration: pick(["Never", "2026-09-30", "2026-12-31", "30 days"], n),
    status,
    businessUnit: pick(BUSINESS_UNITS, n),
    environment: pick(ENVIRONMENTS, n >> 2),
    owner: pick(OWNERS, n),
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    framework: pick(FRAMEWORKS, n >> 3),
    connectedResources: 1 + (n % 30),
    sharedAssets: n % 12,
    sharedRoles: n % 8,
    policies: 1 + (n % 6),
    reviews: n % 4,
    securityFindings: n % 6,
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

export function TrustRelationshipsView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fSource, setFSource] = React.useState("");
  const [fTarget, setFTarget] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_TRUSTS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.trustType.toLowerCase().includes(q)) &&
      (!fSource || r.source === fSource) &&
      (!fTarget || r.target === fTarget) &&
      (!fType || r.trustType === fType) &&
      (!fEnv || r.environment === fEnv) &&
      (!fStatus || r.status === fStatus) &&
      (!fBu || r.businessUnit === fBu)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFSource("");
    setFTarget("");
    setFType("");
    setFEnv("");
    setFStatus("");
    setFBu("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const activeTrusts = records.filter((r) => r.status === "Active").length;
  const pending = records.filter((r) => r.status === "Pending").length;
  const expired = records.filter((r) => r.status === "Revoked").length;
  const revoked = records.filter((r) => r.status === "Revoked").length;
  const connectedWorkspaces = new Set([
    ...records.map((r) => r.source),
    ...records.map((r) => r.target),
  ]).size;
  const sharedResources = records.reduce((a, r) => a + r.connectedResources, 0);
  const violations = records.reduce((a, r) => a + r.securityFindings, 0);
  const reviews = records.reduce((a, r) => a + r.reviews, 0);

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Trust",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=cross"),
    },
    {
      key: "request",
      label: "Request Trust",
      icon: <Send size={15} />,
      disabled: true,
    },
    {
      key: "approve",
      label: "Approve Trust",
      icon: <Check size={15} />,
      disabled: true,
    },
    {
      key: "reject",
      label: "Reject Trust",
      icon: <X size={15} />,
      disabled: true,
    },
    {
      key: "suspend",
      label: "Suspend Trust",
      icon: <PauseCircle size={15} />,
      disabled: true,
    },
    {
      key: "revoke",
      label: "Revoke Trust",
      icon: <Ban size={15} />,
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
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "sync",
      label: "Synchronize",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
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
  ];

  const cols: Column<Trust>[] = [
    {
      key: "name",
      header: "Trust",
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
          <Handshake size={13} color={T.textMuted} />
          {r.source} <ArrowRight size={11} color={T.textMuted} /> {r.target}
        </span>
      ),
    },
    {
      key: "trustType",
      header: "Trust Type",
      sortValue: (r) => r.trustType,
      render: (r) => r.trustType,
    },
    {
      key: "scope",
      header: "Access Scope",
      sortValue: (r) => r.scope,
      render: (r) => r.scope,
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
          title="Active Trusts"
          value={activeTrusts}
          tone="ok"
          sub={
            <>
              In effect now <SampleTag />
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
          title="Expired Trusts"
          value={expired}
          tone="ok"
          sub={
            <>
              No longer valid <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Revoked Trusts"
          value={revoked}
          tone="ok"
          sub={
            <>
              Permanently terminated <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Connected Workspaces"
          value={connectedWorkspaces}
          tone="ok"
          sub={
            <>
              Participating in trust <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Shared Resources"
          value={sharedResources}
          tone="ok"
          sub={
            <>
              Exposed via trust <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Policy Violations"
          value={violations}
          tone={violations > 0 ? "warn" : "ok"}
          sub={
            <>
              Failing validation <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Trust Reviews"
          value={reviews}
          tone={reviews > 0 ? "warn" : "ok"}
          sub={
            <>
              Certifications due <SampleTag />
            </>
          }
        />
      </PostureGrid>

      <DiscoveryListView
        title="Trust relationships"
        desc="Manage secure trust relationships between workspaces for controlled resource sharing, identity federation and cross-workspace collaboration — while preserving isolation and least privilege."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search trust relationships — workspace, trust name, trust ID, owner, business unit, tags…"
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
            key: "trustType",
            label: "Trust Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.trustType)),
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
          {
            key: "businessUnit",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
        ]}
        presets={[{ label: "All trust relationships", onApply: clearFilters }]}
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
            <HeaderButton icon={<PauseCircle size={13} />} onClick={clear}>
              Suspend
            </HeaderButton>
            <HeaderButton icon={<Ban size={13} />} onClick={clear}>
              Revoke
            </HeaderButton>
            <HeaderButton icon={<ClipboardCheck size={13} />} onClick={clear}>
              Launch Review
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
              { label: "Approve", onClick: () => {} },
              { label: "Suspend", onClick: () => {} },
              { label: "Revoke", onClick: () => {}, danger: true },
              { label: "Launch Review", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Handshake size={20} />}
            title="No trust relationships have been configured."
            hint="Create a trust relationship to enable controlled resource sharing and identity federation between workspaces."
            cta="Create Trust Relationship"
            onCta={() => navigate("/admin/workspace-governance?tab=cross")}
          />
        }
      />

      {sel && <TrustDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function TrustRelationshipsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Trust Relationships"
        subtitle="Manage secure trust relationships between workspaces for controlled resource sharing, identity federation, and cross-workspace collaboration."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspace-governance?tab=cross")}
            >
              Create Trust
            </HeaderButton>
          </>
        }
      />
      <TrustRelationshipsView />
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
  { id: "participants", label: "Participants", icon: <Users size={13} /> },
  { id: "scope", label: "Access Scope", icon: <KeyRound size={13} /> },
  { id: "policies", label: "Policies", icon: <ListChecks size={13} /> },
  { id: "resources", label: "Resources", icon: <Boxes size={13} /> },
  {
    id: "federation",
    label: "Identity Federation",
    icon: <Fingerprint size={13} />,
  },
  { id: "security", label: "Security", icon: <ShieldCheck size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function TrustDrawer({ rec, onClose }: { rec: Trust; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.trustType} · ${rec.scope} · ${rec.status} · exp ${rec.expiration}`}
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
          <HeaderButton icon={<PauseCircle size={13} />}>Suspend</HeaderButton>
          <HeaderButton icon={<ClipboardCheck size={13} />}>
            Launch Review
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "participants" && <ParticipantsTab rec={rec} />}
      {tab === "scope" && <ScopeTab rec={rec} />}
      {tab === "policies" && <PoliciesTab />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "federation" && <FederationTab rec={rec} />}
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
function OverviewTab({ rec }: { rec: Trust }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Trust Name", v: rec.name },
              { k: "Trust ID", v: rec.id },
              { k: "Source Workspace", v: rec.source, sample: true },
              { k: "Target Workspace", v: rec.target, sample: true },
              { k: "Trust Type", v: rec.trustType },
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
              {
                k: "Connected Resources",
                v: rec.connectedResources,
                sample: true,
              },
              { k: "Shared Assets", v: rec.sharedAssets, sample: true },
              { k: "Shared Roles", v: rec.sharedRoles, sample: true },
              { k: "Policies", v: rec.policies, sample: true },
              { k: "Reviews", v: rec.reviews, sample: true },
              { k: "Security Findings", v: rec.securityFindings, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function ParticipantsTab({ rec }: { rec: Trust }) {
  const list = [rec.source, rec.target].map((w, i) => {
    const m = hashId(rec.id + w);
    return {
      id: w,
      workspace: w,
      role: i === 0 ? "Source (Grantor)" : "Target (Grantee)",
      owner: pick(OWNERS, m),
      businessUnit: pick(BUSINESS_UNITS, m),
      environment: pick(ENVIRONMENTS, m),
      status: "Active",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "role", header: "Role", render: (r) => r.role },
    { key: "owner", header: "Owner", render: (r) => r.owner },
    {
      key: "businessUnit",
      header: "Business Unit",
      render: (r) => r.businessUnit,
    },
    { key: "environment", header: "Environment", render: (r) => r.environment },
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
        <HeaderButton icon={<Users size={13} />}>View Workspace</HeaderButton>
        <HeaderButton icon={<KeyRound size={13} />}>
          Transfer Ownership
        </HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ScopeTab({ rec }: { rec: Trust }) {
  const scopes = [
    "Identity",
    "Groups",
    "Roles",
    "Applications",
    "Cloud Resources",
    "Storage",
    "Networks",
    "Secrets",
    "AI Resources",
    "Monitoring",
    "Logs",
    "Policies",
  ];
  const list = scopes.map((s) => {
    const m = hashId(rec.id + s);
    return {
      id: s,
      resource: s,
      permission: pick(["Read", "Read/Write", "None"], m),
      inherited: m % 3 === 0 ? "Yes" : "No",
      approval: m % 2 === 0 ? "Required" : "No",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "permission", header: "Permission", render: (r) => r.permission },
    { key: "inherited", header: "Inherited", render: (r) => r.inherited },
    { key: "approval", header: "Approval Required", render: (r) => r.approval },
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
        What is shared between {rec.source} and {rec.target}. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function PoliciesTab() {
  const items = [
    "Trust Policy",
    "Approval Policy",
    "Security Policy",
    "Compliance Policy",
    "Isolation Policy",
    "Expiration Policy",
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
        <HeaderButton icon={<ListChecks size={13} />}>
          Assign Policy
        </HeaderButton>
        <HeaderButton variant="danger" icon={<X size={13} />}>
          Remove Policy
        </HeaderButton>
        <SampleTag />
      </div>
      <Section title="Governance policies applied to the trust" sample>
        {items.map((it) => (
          <StatRow key={it} label={it} value="Assigned" tone="ok" sample />
        ))}
      </Section>
    </>
  );
}

function ResourcesTab({ rec }: { rec: Trust }) {
  const list = Array.from(
    { length: Math.min(8, rec.connectedResources) },
    (_, i) => {
      const m = hashId(`${rec.id}-r-${i}`);
      return {
        id: `${rec.id}-r-${i}`,
        resource: pick(
          [
            "Central Secrets",
            "Shared VPC",
            "Logging Cluster",
            "AI Gateway",
            "Image Registry",
            "Shared DB",
          ],
          m,
        ),
        type: pick(
          ["Secrets", "Network", "Logging", "AI", "Registry", "Database"],
          m,
        ),
        workspace: m % 2 === 0 ? rec.source : rec.target,
        permission: pick(["Read", "Read/Write"], m),
        status: pick(["Active", "Active", "Suspended"], m),
      };
    },
  );
  const cols: Column<(typeof list)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "permission", header: "Permission", render: (r) => r.permission },
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
        Resources shared through this trust. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function FederationTab({ rec }: { rec: Trust }) {
  const providers = [
    "Microsoft Entra ID",
    "AWS IAM",
    "Google IAM",
    "OIDC",
    "SAML",
  ];
  const list = providers.map((p) => {
    const m = hashId(rec.id + p);
    return {
      id: p,
      provider: p,
      trustType: pick(["Federated", "Direct", "Delegated"], m),
      authentication: pick(["OIDC", "SAML", "Certificate"], m),
      synchronization: m % 2 === 0 ? "Enabled" : "Manual",
      status: pick(["Active", "Active", "Pending"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "provider", header: "Identity Provider", render: (r) => r.provider },
    { key: "trustType", header: "Trust Type", render: (r) => r.trustType },
    {
      key: "authentication",
      header: "Authentication",
      render: (r) => r.authentication,
    },
    {
      key: "synchronization",
      header: "Synchronization",
      render: (r) => r.synchronization,
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
        Identity relationships established between the workspaces. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function SecurityTab({ rec }: { rec: Trust }) {
  const controls = [
    "Encryption",
    "Authentication",
    "Authorization",
    "Audit Logging",
    "Conditional Access",
  ];
  const list = controls.map((c) => {
    const m = hashId(rec.id + c);
    return {
      id: c,
      control: c,
      status: pick(["Enabled", "Enabled", "Partial"], m),
      findings: m % 3,
      severity: pick(["Low", "Medium", "High"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "control", header: "Control", render: (r) => r.control },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span style={{ color: r.status === "Enabled" ? T.success : T.warning }}>
          {r.status}
        </span>
      ),
    },
    { key: "findings", header: "Findings", render: (r) => r.findings },
    { key: "severity", header: "Severity", render: (r) => r.severity },
  ];
  return (
    <>
      <Section title="Security posture" sample>
        <StatRow
          label="Risk Score"
          value={`${rec.securityFindings * 8}/100`}
          tone={rec.securityFindings > 3 ? "warn" : "ok"}
          sample
        />
      </Section>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ComplianceTab({ rec }: { rec: Trust }) {
  const list = FRAMEWORKS.map((f) => {
    const m = hashId(rec.id + f);
    return {
      id: f,
      framework: f,
      status: pick(["Compliant", "Compliant", "Gap"], m),
      controls: 2 + (m % 12),
      violations: m % 3,
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
    { key: "controls", header: "Controls", render: (r) => r.controls },
    { key: "violations", header: "Violations", render: (r) => r.violations },
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
        Compliance posture for this trust. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ActivityTab({ rec }: { rec: Trust }) {
  const events = [
    "Trust Created",
    "Trust Approved",
    "Policy Updated",
    "Access Granted",
    "Access Revoked",
    "Review Completed",
    "Trust Suspended",
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
    "Trust Created",
    "Trust Modified",
    "Trust Approved",
    "Trust Rejected",
    "Trust Suspended",
    "Trust Revoked",
    "Policy Updated",
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

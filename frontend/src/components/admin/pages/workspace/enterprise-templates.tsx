/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Workspace Templates → Enterprise Templates */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Download,
  Upload,
  Copy,
  Archive,
  Send,
  Ban,
  RefreshCcw,
  ClipboardCheck,
  GitCompare,
  GitBranch,
  Star,
  Layers,
  FileText,
  CheckCircle,
  LayoutGrid,
  Settings2,
  Scale,
  BadgeCheck,
  Bot,
  ListOrdered,
  Activity as ActivityIcon,
  History,
  ShieldCheck,
  RotateCcw,
  Edit3,
} from "lucide-react";
import {
  Page,
  Tabs,
  PageHeader,
  Card,
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
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Enterprise Templates — organization-approved blueprints used to standardize the creation of
 * workspaces across the enterprise. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/01_Workspace Templates/enterprise_templates.md.
 *
 * A template defines the initial governance, security, compliance, operational, AI and platform
 * configuration that every new workspace inherits during provisioning. Templates are managed
 * centrally by Organization / Platform Administrators and are version-controlled. This view reuses
 * the Enterprise-Administration UX pattern shared with the Users & Workspaces modules: Banner ·
 * Toolbar · Filters · Search · Data Table · Bulk/Row actions · Template Detail Drawer (9 sub-tabs),
 * plus an Operational Dashboard and a Template Inheritance visualization.
 *
 * There is no template backend yet, so the template set is deterministic representative sample data
 * (tagged `Sample` in the UI). When admin/org_model.py + the template registry land, swap
 * SAMPLE_TEMPLATES for the live query — the component API stays identical.
 */

// ── Status model (drives the sub-navigation) ──────────────────────────────────────────────────────
type Status = "Draft" | "Published" | "Deprecated" | "Archived";

const STATUS_TONE: Record<Status, string> = {
  Draft: T.warning,
  Published: T.success,
  Deprecated: T.danger,
  Archived: T.textMuted,
};

// Second-level sub-navigation (spec §Navigation).
const NAV_TABS = [
  { id: "active", label: "Active Templates", Icon: Layers },
  { id: "draft", label: "Draft Templates", Icon: FileText },
  { id: "published", label: "Published", Icon: CheckCircle },
  { id: "deprecated", label: "Deprecated", Icon: Ban },
  { id: "archived", label: "Archived", Icon: Archive },
  { id: "versions", label: "Versions", Icon: GitBranch },
];

const CATEGORIES = [
  "Cloud Operations",
  "Security Baseline",
  "Data Platform",
  "Compliance",
  "AI Platform",
  "Networking",
  "Landing Zone",
];
const WS_TYPES = ["Enterprise", "Department", "Project", "Shared Service"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const COMPLIANCE_PROFILES = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
];
const GOVERNANCE_PROFILES = ["Strict", "Balanced", "Relaxed"];
const SECURITY_PROFILES = ["Baseline", "Hardened", "Zero-Trust"];
const OWNERS = [
  "Alice Smith",
  "David Chen",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
];
const APPROVAL_STATES = ["Approved", "Pending Approval", "Changes Requested"];

interface TemplateRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  workspaceType: string;
  environment: string;
  businessUnit: string;
  version: string;
  versionNum: number;
  isDefault: boolean;
  status: Status;
  // ownership
  owner: string;
  businessOwner: string;
  maintainer: string;
  approvalStatus: string;
  // profiles
  complianceProfile: string;
  governanceProfile: string;
  securityProfile: string;
  // statistics
  workspacesUsing: number;
  policiesIncluded: number;
  complianceFrameworks: number;
  aiProfiles: number;
  provisioningMin: number;
  // metadata
  tags: string[];
  created: string;
  modified: string;
  lastUpdated: string;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative template set (~14 records covering every state/category).
const SAMPLE_TEMPLATES: TemplateRecord[] = Array.from(
  { length: 14 },
  (_, i) => {
    const id = `TPL-${(1200 + i * 11).toString().padStart(5, "0")}`;
    const n = hashId(id);
    const status = pick<Status>(
      [
        "Published",
        "Published",
        "Published",
        "Draft",
        "Draft",
        "Deprecated",
        "Archived",
      ],
      n,
    );
    const category = pick(CATEGORIES, n);
    const wsType = pick(WS_TYPES, n >> 3);
    const env = pick(ENVIRONMENTS, n >> 1);
    const major = 1 + (n % 5);
    const minor = n % 6;
    return {
      id,
      name: `${["Enterprise", "Standard", "Regulated", "Landing Zone", "Secure"][n % 5]} ${env === "Production" ? "Production" : env}`,
      description: `${category} baseline for ${wsType.toLowerCase()} workspaces in ${env.toLowerCase()} — standardizes governance, security, compliance and AI configuration on provisioning.`,
      category,
      workspaceType: wsType,
      environment: env,
      businessUnit: pick(BUSINESS_UNITS, n),
      version: `v${major}.${minor}`,
      versionNum: major * 100 + minor,
      isDefault: n % 4 === 0 && status === "Published",
      status,
      owner: pick(OWNERS, n),
      businessOwner: pick(OWNERS, n + 2),
      maintainer: pick(OWNERS, n + 3),
      approvalStatus:
        status === "Published" ? "Approved" : pick(APPROVAL_STATES, n),
      complianceProfile: pick(COMPLIANCE_PROFILES, n),
      governanceProfile: pick(GOVERNANCE_PROFILES, n),
      securityProfile: pick(SECURITY_PROFILES, n >> 2),
      workspacesUsing: status === "Published" ? 3 + (n % 60) : n % 4,
      policiesIncluded: 6 + (n % 24),
      complianceFrameworks: 1 + (n % 4),
      aiProfiles: 1 + (n % 5),
      provisioningMin: 6 + (n % 20),
      tags: [
        env.toLowerCase(),
        category.toLowerCase().replace(/\s+/g, "-"),
        pick(BUSINESS_UNITS, n).toLowerCase(),
      ],
      created: `2025-1${1 + (n % 2)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      modified: `2026-0${1 + (n % 6)}-${(1 + ((n + 3) % 27)).toString().padStart(2, "0")}`,
      lastUpdated: pick(
        ["2 days ago", "6 hours ago", "yesterday", "1 week ago", "3 days ago"],
        n,
      ),
    };
  },
);

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

/**
 * Embeddable body — Operational Dashboard + Template Inheritance + sub-navigation + directory +
 * template detail drawer, WITHOUT the outer <Page> or the page banner. Rendered both as the
 * standalone route (via EnterpriseTemplatesPage) and as a tab of the Workspace Management console.
 * Uses local state for the status sub-nav so it never collides with a host page's `?tab=` param.
 */
export function EnterpriseTemplatesView() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("active");

  // Filters (spec §Filters)
  const [search, setSearch] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fCategory, setFCategory] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [fGovernance, setFGovernance] = React.useState("");
  const [fVersion, setFVersion] = React.useState("");
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

  const records = SAMPLE_TEMPLATES;

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (tab === "active"
        ? r.status !== "Archived"
        : tab === "draft"
          ? r.status === "Draft"
          : tab === "published"
            ? r.status === "Published"
            : tab === "deprecated"
              ? r.status === "Deprecated"
              : tab === "archived"
                ? r.status === "Archived"
                : true) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.workspaceType.toLowerCase().includes(q) ||
        r.version.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))) &&
      (!fStatus || r.status === fStatus) &&
      (!fCategory || r.category === fCategory) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fType || r.workspaceType === fType) &&
      (!fEnv || r.environment === fEnv) &&
      (!fCompliance || r.complianceProfile === fCompliance) &&
      (!fGovernance || r.governanceProfile === fGovernance) &&
      (!fVersion || r.version === fVersion) &&
      (!fOwner || r.owner === fOwner)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFStatus("");
    setFCategory("");
    setFBu("");
    setFType("");
    setFEnv("");
    setFCompliance("");
    setFGovernance("");
    setFVersion("");
    setFOwner("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational Dashboard (spec §Operational Dashboard) ──
  const publishedCount = records.filter((r) => r.status === "Published").length;
  const draftCount = records.filter((r) => r.status === "Draft").length;
  const deprecatedCount = records.filter(
    (r) => r.status === "Deprecated",
  ).length;
  const defaultCount = records.filter((r) => r.isDefault).length;
  const workspacesProvisioned = records.reduce(
    (a, r) => a + r.workspacesUsing,
    0,
  );
  const mostUsed = [...records].sort(
    (a, b) => b.workspacesUsing - a.workspacesUsing,
  )[0];
  const latestVersion = [...records].sort(
    (a, b) => b.versionNum - a.versionNum,
  )[0];

  // ── Toolbar (spec §Toolbar: Create · Administrative · Governance actions) ──
  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Template",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=templates"),
    },
    {
      key: "clone",
      label: "Clone Template",
      icon: <Copy size={15} />,
      disabled: true,
    },
    {
      key: "publish",
      label: "Publish",
      icon: <Send size={15} />,
      disabled: true,
    },
    {
      key: "deprecate",
      label: "Deprecate",
      icon: <Ban size={15} />,
      disabled: true,
    },
    {
      key: "archive",
      label: "Archive",
      icon: <Archive size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
    {
      key: "import",
      label: "Import",
      icon: <Upload size={15} />,
      disabled: true,
    },
    {
      key: "refresh",
      label: "Refresh",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "validate",
      label: "Validate Template",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Versions",
      icon: <GitCompare size={15} />,
      disabled: true,
    },
    {
      key: "assign-default",
      label: "Assign Default",
      icon: <Star size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<TemplateRecord>[] = [
    {
      key: "template",
      header: "Template",
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
          <FileText size={14} color={T.textMuted} />
          <span>
            {r.name}
            <span
              style={{
                display: "block",
                fontFamily: "monospace",
                fontSize: 10.5,
                color: T.textMuted,
              }}
            >
              {r.id}
            </span>
          </span>
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
      key: "type",
      header: "Workspace Type",
      sortValue: (r) => r.workspaceType,
      render: (r) => r.workspaceType,
    },
    {
      key: "env",
      header: "Environment",
      sortValue: (r) => r.environment,
      render: (r) => r.environment,
    },
    {
      key: "version",
      header: "Version",
      sortValue: (r) => r.versionNum,
      render: (r) => (
        <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>
          {r.version}
        </span>
      ),
    },
    {
      key: "default",
      header: "Default",
      sortValue: (r) => (r.isDefault ? 1 : 0),
      render: (r) =>
        r.isDefault ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              color: T.accent,
            }}
          >
            <Star size={13} /> Yes
          </span>
        ) : (
          <span style={{ color: T.textMuted }}>No</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "updated",
      header: "Last Updated",
      sortValue: (r) => r.modified,
      render: (r) => (
        <span style={{ color: T.textMuted }}>{r.lastUpdated}</span>
      ),
    },
  ];

  return (
    <>
      {/* ── Operational Dashboard ── */}
      <Card
        title="Operational dashboard"
        desc="Enterprise template estate at a glance — publication state, defaults, provisioning reach and the latest catalog version."
      >
        <StatStripPlain
          items={[
            { label: "Published Templates", value: publishedCount, tone: "ok" },
            { label: "Draft Templates", value: draftCount, tone: "warn" },
            {
              label: "Deprecated Templates",
              value: deprecatedCount,
              tone: "danger",
            },
            { label: "Default Templates", value: defaultCount, tone: "ok" },
            {
              label: "Workspaces Provisioned",
              value: workspacesProvisioned.toLocaleString(),
              tone: "muted",
            },
            {
              label: "Most Used Template",
              value: mostUsed.name,
              tone: "muted",
            },
            {
              label: "Latest Version",
              value: latestVersion.version,
              tone: "muted",
            },
          ]}
        />
      </Card>

      {/* ── Second-level sub-navigation ── */}
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={tab}
          onChange={setTab}
          options={NAV_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {tab === "versions" ? (
        <VersionsView records={records} onOpen={(id) => setSelId(id)} />
      ) : (
        <DiscoveryListView
          title="Enterprise template catalog"
          commands={toolbar}
          pills={[
            {
              key: "status",
              label: "Status",
              value: fStatus,
              onChange: setFStatus,
              options: facet(records.map((r) => r.status)),
            },
            {
              key: "category",
              label: "Category",
              value: fCategory,
              onChange: setFCategory,
              options: facet(records.map((r) => r.category)),
            },
            {
              key: "bu",
              label: "Business Unit",
              value: fBu,
              onChange: setFBu,
              options: facet(records.map((r) => r.businessUnit)),
            },
            {
              key: "type",
              label: "Workspace Type",
              value: fType,
              onChange: setFType,
              options: facet(records.map((r) => r.workspaceType)),
            },
            {
              key: "env",
              label: "Environment",
              value: fEnv,
              onChange: setFEnv,
              options: facet(records.map((r) => r.environment)),
            },
            {
              key: "compliance",
              label: "Compliance Profile",
              value: fCompliance,
              onChange: setFCompliance,
              options: facet(records.map((r) => r.complianceProfile)),
            },
            {
              key: "governance",
              label: "Governance Profile",
              value: fGovernance,
              onChange: setFGovernance,
              options: facet(records.map((r) => r.governanceProfile)),
            },
            {
              key: "version",
              label: "Version",
              value: fVersion,
              onChange: setFVersion,
              options: facet(records.map((r) => r.version)),
            },
            {
              key: "owner",
              label: "Owner",
              value: fOwner,
              onChange: setFOwner,
              options: facet(records.map((r) => r.owner)),
            },
          ]}
          presets={[{ label: "All templates", onApply: clearFilters }]}
          filterRightSlot={
            <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
          }
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search enterprise templates — name, description, business unit, workspace type, tags, version…"
          count={rows.length}
          columns={cols.filter((c) => !hidden.has(c.key))}
          rows={rows}
          pageSize={15}
          initialSort={{ key: "template", dir: "asc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<Send size={13} />} onClick={clear}>
                Publish ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<Archive size={13} />} onClick={clear}>
                Archive
              </HeaderButton>
              <HeaderButton icon={<Download size={13} />} onClick={clear}>
                Export
              </HeaderButton>
              <HeaderButton icon={<Star size={13} />} onClick={clear}>
                Assign Default
              </HeaderButton>
            </>
          )}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "Open", onClick: () => setSelId(r.id) },
                { label: "Edit", onClick: () => setSelId(r.id) },
                { label: "Clone", onClick: () => setSelId(r.id) },
                { label: "Publish", onClick: () => setSelId(r.id) },
                { label: "Deprecate", onClick: () => setSelId(r.id) },
                { label: "Archive", onClick: () => setSelId(r.id) },
                { label: "Export", onClick: () => {} },
                { label: "Compare Versions", onClick: () => setSelId(r.id) },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Plus size={20} />}
              title="No enterprise templates available."
              hint="Adjust filters, or create / import an enterprise template to get started."
              cta="Create Enterprise Template"
              onCta={() => navigate("/admin/workspaces?tab=templates")}
            />
          }
        />
      )}

      {/* ── Template Inheritance visualization (spec §Template Inheritance) ── */}
      <Card
        title="Template inheritance"
        desc="Effective configuration inherited by newly provisioned workspaces — organization defaults flow through the enterprise template, then per-workspace overrides."
      >
        <TemplateInheritance />
      </Card>

      {sel && <TemplateDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function EnterpriseTemplatesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Enterprise Templates"
        subtitle="Manage organization-wide workspace templates used to standardize workspace provisioning, governance, security, compliance and operational configuration."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=templates")}
            >
              Create Template
            </HeaderButton>
          </>
        }
      />
      <EnterpriseTemplatesView />
    </Page>
  );
}

// ── Versions sub-view (spec §Navigation → Versions) ──
function VersionsView({
  records,
  onOpen,
}: {
  records: TemplateRecord[];
  onOpen: (id: string) => void;
}) {
  // Flatten each template into its published version lineage.
  const versions = records.flatMap((r) => {
    const n = hashId(r.id);
    const count = 2 + (n % 4);
    return Array.from({ length: count }, (_, i) => {
      const major = Math.max(1, r.versionNum - (count - 1 - i) * 100 - i);
      return {
        id: `${r.id}-v${i}`,
        templateId: r.id,
        template: r.name,
        version: i === count - 1 ? r.version : `v${1 + i}.${(n + i) % 6}`,
        published: `2026-0${1 + ((n + i) % 6)}-${(1 + ((n + i) % 27)).toString().padStart(2, "0")}`,
        publishedBy: pick(OWNERS, n + i),
        status: (i === count - 1 ? r.status : "Deprecated") as Status,
        notes: pick(
          [
            "Governance baseline update",
            "Compliance framework refresh",
            "AI runtime pin bump",
            "Networking defaults revised",
            "Security profile hardened",
          ],
          n + i,
        ),
        _major: major,
      };
    });
  });
  const cols: Column<(typeof versions)[number]>[] = [
    {
      key: "version",
      header: "Version",
      sortValue: (r) => r.version,
      render: (r) => (
        <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>
          {r.version}
        </span>
      ),
    },
    {
      key: "template",
      header: "Template",
      sortValue: (r) => r.template,
      render: (r) => r.template,
    },
    {
      key: "published",
      header: "Published",
      sortValue: (r) => r.published,
      render: (r) => r.published,
    },
    {
      key: "by",
      header: "Published By",
      sortValue: (r) => r.publishedBy,
      render: (r) => r.publishedBy,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    { key: "notes", header: "Notes", render: (r) => r.notes },
  ];
  return (
    <Card
      title="Published versions"
      desc="Every published version across the enterprise template catalog. Compare, restore or export a specific version."
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <HeaderButton icon={<GitCompare size={13} />}>Compare</HeaderButton>
        <HeaderButton icon={<RotateCcw size={13} />}>Restore</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable
        columns={cols}
        rows={versions}
        pageSize={15}
        initialSort={{ key: "published", dir: "desc" }}
        onRowClick={(r) => onOpen(r.templateId)}
      />
    </Card>
  );
}

// ── Template Inheritance chain (Organization Defaults → Enterprise Template → Workspace → Overrides) ──
function TemplateInheritance() {
  const nodes = [
    "Organization Defaults",
    "Enterprise Template",
    "Workspace",
    "Workspace Overrides",
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {nodes.map((label, i) => (
        <React.Fragment key={label}>
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 12.5,
              color: i === 1 ? T.textPrimary : T.textNav,
              fontWeight: i === 1 ? 600 : 400,
              background:
                i === 1 ? "var(--cg-accent-bg-strong)" : "transparent",
            }}
          >
            {label}
          </div>
          {i < nodes.length - 1 && (
            <span
              style={{ color: T.textMuted, textAlign: "center", fontSize: 12 }}
            >
              ↓
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ════════════ Template Detail Drawer — 9 sub-tabs (spec §Template Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "config", label: "Configuration", icon: <Settings2 size={13} /> },
  { id: "governance", label: "Governance", icon: <Scale size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "ai", label: "AI Configuration", icon: <Bot size={13} /> },
  {
    id: "provisioning",
    label: "Provisioning Defaults",
    icon: <ListOrdered size={13} />,
  },
  { id: "versions", label: "Version History", icon: <GitBranch size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function TemplateDetailDrawer({
  rec,
  onClose,
}: {
  rec: TemplateRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.version} · ${rec.status} · ${rec.category}${rec.isDefault ? " · Default Template" : ""}`}
      width={760}
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
          <HeaderButton icon={<Edit3 size={13} />}>Edit</HeaderButton>
          <HeaderButton icon={<Copy size={13} />}>Clone</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton variant="primary" icon={<Send size={13} />}>
            Publish
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "config" && <ConfigurationTab rec={rec} />}
      {tab === "governance" && <GovernanceTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "ai" && <AiConfigTab rec={rec} />}
      {tab === "provisioning" && <ProvisioningTab rec={rec} />}
      {tab === "versions" && <VersionHistoryTab rec={rec} />}
      {tab === "activity" && <ActivityTab />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
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
          marginBottom: 4,
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

// ── Shared: a disabled-until-wired action toolbar row (used by drawer sub-tabs) ──
function ToolbarRow({
  buttons,
  sample,
}: {
  buttons: string[];
  sample?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 14,
        alignItems: "center",
      }}
    >
      {buttons.map((b) => (
        <HeaderButton key={b}>{b}</HeaderButton>
      ))}
      {sample && <SampleTag />}
    </div>
  );
}

// ── Overview (General · Ownership · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "ownership", label: "Ownership" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Template Name", v: rec.name },
              { k: "Description", v: rec.description },
              { k: "Category", v: rec.category },
              { k: "Workspace Type", v: rec.workspaceType },
              { k: "Environment", v: rec.environment },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Status", v: <StatusBadge status={rec.status} /> },
              { k: "Version", v: rec.version },
              { k: "Created", v: rec.created },
              { k: "Last Modified", v: rec.modified },
            ]}
          />
        </Section>
      )}

      {sub === "ownership" && (
        <Section title="Ownership" sample>
          <KVGrid
            items={[
              { k: "Template Owner", v: rec.owner, sample: true },
              { k: "Business Owner", v: rec.businessOwner, sample: true },
              { k: "Maintainer", v: rec.maintainer, sample: true },
              { k: "Approval Status", v: rec.approvalStatus, sample: true },
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
                k: "Workspaces Using Template",
                v: rec.workspacesUsing,
                sample: true,
              },
              { k: "Current Version", v: rec.version, sample: true },
              { k: "Policies Included", v: rec.policiesIncluded, sample: true },
              {
                k: "Compliance Frameworks",
                v: rec.complianceFrameworks,
                sample: true,
              },
              { k: "AI Profiles", v: rec.aiProfiles, sample: true },
              {
                k: "Provisioning Time",
                v: `${rec.provisioningMin} min`,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Configuration (default workspace configuration) ──
const CONFIGURATION_SUBS = [
  { id: "workspace-metadata", label: "Workspace Metadata" },
  { id: "naming-convention", label: "Naming Convention" },
  { id: "default-tags", label: "Default Tags" },
  { id: "resource-configuration", label: "Resource Configuration" },
  { id: "regions", label: "Regions" },
  { id: "cloud-providers", label: "Cloud Providers" },
  { id: "default-integrations", label: "Default Integrations" },
  { id: "notifications", label: "Notifications" },
];
function ConfigurationTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("workspace-metadata");
  return (
    <>
      <div
        style={{
          fontSize: 12.5,
          color: T.textMuted,
          marginBottom: 12,
        }}
      >
        Defines the default workspace configuration applied on provisioning.
      </div>
      <ToolbarRow
        buttons={["Edit Configuration", "Validate", "Preview"]}
        sample
      />
      <Tabs tabs={CONFIGURATION_SUBS} active={sub} onChange={setSub} />
      {sub === "workspace-metadata" && (
        <Section title="Workspace Metadata" sample>
          <StatRow
            label="Legal Entity"
            value="ACME Global Holdings Ltd."
            sample
          />
          <StatRow
            label="Data Residency"
            value={rec.environment === "Production" ? "EU" : "Multi-region"}
            sample
          />
          <StatRow label="Support Tier" value="Enterprise (24/7)" sample />
          <StatRow
            label="Cost Centre"
            value={`CC-${rec.businessUnit.slice(0, 3).toUpperCase()}-001`}
            sample
          />
        </Section>
      )}
      {sub === "naming-convention" && (
        <Section title="Naming Convention" sample>
          <StatRow label="Pattern" value="{bu}-{env}-{app}-{seq}" sample />
          <StatRow label="Enforcement" value="Blocking on violation" sample />
        </Section>
      )}
      {sub === "default-tags" && (
        <Section title="Default Tags" sample>
          <StatRow label="Tags" value={rec.tags.join(", ")} sample />
          <StatRow
            label="Mandatory Tags"
            value="env, business-unit, cost-centre, data-classification"
            sample
          />
        </Section>
      )}
      {sub === "resource-configuration" && (
        <Section title="Resource Configuration" sample>
          <StatRow
            label="Default Resource Group"
            value="Standard tier"
            sample
          />
          <StatRow label="Baseline Resources" value="24 resources" sample />
        </Section>
      )}
      {sub === "regions" && (
        <Section title="Regions" sample>
          <StatRow
            label="Allowed Regions"
            value="eu-west-1, eu-central-1"
            sample
          />
          <StatRow label="Primary Region" value="eu-west-1" sample />
        </Section>
      )}
      {sub === "cloud-providers" && (
        <Section title="Cloud Providers" sample>
          <StatRow
            label="Approved Providers"
            value="AWS, Azure, Google Cloud"
            sample
          />
        </Section>
      )}
      {sub === "default-integrations" && (
        <Section title="Default Integrations" sample>
          <StatRow
            label="Integrations"
            value="GitHub, Jira, ServiceNow"
            sample
          />
        </Section>
      )}
      {sub === "notifications" && (
        <Section title="Notifications" sample>
          <StatRow label="Channels" value="Email, Slack, PagerDuty" sample />
          <StatRow label="Default Recipients" value="Workspace owners" sample />
        </Section>
      )}
    </>
  );
}

// ── Governance (organizational governance inherited by new workspaces) ──
const GOVERNANCE_SUBS = [
  { id: "governance-profile", label: "Governance Profile" },
  { id: "organization-policies", label: "Organization Policies" },
  { id: "workspace-policies", label: "Workspace Policies" },
  { id: "inheritance-rules", label: "Inheritance Rules" },
  { id: "approval-policies", label: "Approval Policies" },
  { id: "operational-policies", label: "Operational Policies" },
  { id: "inheritance", label: "Inheritance" },
];
function GovernanceTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("governance-profile");
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Defines organizational governance inherited by newly provisioned
        workspaces.
      </div>
      <Tabs tabs={GOVERNANCE_SUBS} active={sub} onChange={setSub} />
      {sub === "governance-profile" && (
        <Section title="Governance Profile" sample>
          <StatRow label="Profile" value={rec.governanceProfile} sample />
          <StatRow
            label="Security Profile"
            value={rec.securityProfile}
            sample
          />
        </Section>
      )}
      {sub === "organization-policies" && (
        <Section title="Organization Policies" sample>
          <StatRow
            label="Inherited Policies"
            value={`${rec.policiesIncluded} inherited`}
            sample
          />
          <StatRow
            label="Enforcement Mode"
            value="Most-restrictive-wins"
            sample
          />
        </Section>
      )}
      {sub === "workspace-policies" && (
        <Section title="Workspace Policies" sample>
          <StatRow
            label="Workspace Overrides"
            value="3 allowed overrides"
            sample
          />
          <StatRow label="Mandatory Floor" value="Cannot be relaxed" sample />
        </Section>
      )}
      {sub === "inheritance-rules" && (
        <Section title="Inheritance Rules" sample>
          <StatRow
            label="Merge Strategy"
            value="Most-restrictive-wins"
            sample
          />
          <StatRow
            label="Override Scope"
            value="Non-security controls only"
            sample
          />
        </Section>
      )}
      {sub === "approval-policies" && (
        <Section title="Approval Policies" sample>
          <StatRow
            label="Provisioning Approval"
            value="2-of-3 approvers"
            sample
          />
          <StatRow
            label="Publish Approval"
            value="Platform Admin required"
            sample
          />
        </Section>
      )}
      {sub === "operational-policies" && (
        <Section title="Operational Policies" sample>
          <StatRow label="Change Windows" value="Business hours (UTC)" sample />
          <StatRow
            label="Backup Policy"
            value="Daily · 30-day retention"
            sample
          />
        </Section>
      )}
      {sub === "inheritance" && (
        <Section title="Inheritance">
          <GovernanceChain />
        </Section>
      )}
    </>
  );
}

function GovernanceChain() {
  const nodes = ["Organization Governance", "Enterprise Template", "Workspace"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {nodes.map((label, i) => (
        <React.Fragment key={label}>
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 12.5,
              color: i === nodes.length - 1 ? T.textPrimary : T.textNav,
              fontWeight: i === nodes.length - 1 ? 600 : 400,
              background:
                i === nodes.length - 1
                  ? "var(--cg-accent-bg-strong)"
                  : "transparent",
            }}
          >
            {label}
          </div>
          {i < nodes.length - 1 && (
            <span
              style={{ color: T.textMuted, textAlign: "center", fontSize: 12 }}
            >
              ↓
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Compliance (compliance configuration assigned during provisioning) ──
const COMPLIANCE_SUBS = [
  { id: "compliance-frameworks", label: "Compliance Frameworks" },
  { id: "control-baselines", label: "Control Baselines" },
  { id: "evidence-policies", label: "Evidence Policies" },
  { id: "assessment-schedule", label: "Assessment Schedule" },
  { id: "reporting-configuration", label: "Reporting Configuration" },
];
function ComplianceTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("compliance-frameworks");
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Defines the compliance configuration automatically assigned during
        provisioning.
      </div>
      <ToolbarRow buttons={["Assign Framework", "Preview Controls"]} sample />
      <Tabs tabs={COMPLIANCE_SUBS} active={sub} onChange={setSub} />
      {sub === "compliance-frameworks" && (
        <Section title="Compliance Frameworks" sample>
          <StatRow
            label="Primary Framework"
            value={rec.complianceProfile}
            sample
          />
          <StatRow
            label="Assigned Frameworks"
            value={`${rec.complianceFrameworks} frameworks`}
            sample
          />
        </Section>
      )}
      {sub === "control-baselines" && (
        <Section title="Control Baselines" sample>
          <StatRow label="Assigned Controls" value="128 controls" sample />
          <StatRow
            label="Baseline Profile"
            value={rec.securityProfile}
            sample
          />
        </Section>
      )}
      {sub === "evidence-policies" && (
        <Section title="Evidence Policies" sample>
          <StatRow label="Evidence Collection" value="Automated" sample />
          <StatRow label="Retention" value="7 years" sample />
        </Section>
      )}
      {sub === "assessment-schedule" && (
        <Section title="Assessment Schedule" sample>
          <StatRow label="Cadence" value="Quarterly" sample />
          <StatRow label="Next Assessment" value="2026-09-30" sample />
        </Section>
      )}
      {sub === "reporting-configuration" && (
        <Section title="Reporting Configuration" sample>
          <StatRow label="Report Format" value="PDF · CSV · JSON" sample />
          <StatRow label="Distribution" value="Compliance Center" sample />
        </Section>
      )}
    </>
  );
}

// ── AI Configuration (default AI platform configuration) ──
const AI_CONFIG_SUBS = [
  { id: "ai-runtime", label: "AI Runtime" },
  { id: "approved-models", label: "Approved Models" },
  { id: "agent-policies", label: "Agent Policies" },
  { id: "knowledge-sources", label: "Knowledge Sources" },
  { id: "prompt-libraries", label: "Prompt Libraries" },
  { id: "execution-policies", label: "Execution Policies" },
  { id: "safety-policies", label: "Safety Policies" },
];
function AiConfigTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("ai-runtime");
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
        Defines the default AI platform configuration inherited by new
        workspaces.
      </div>
      <Tabs tabs={AI_CONFIG_SUBS} active={sub} onChange={setSub} />
      {sub === "ai-runtime" && (
        <Section title="AI Runtime" sample>
          <StatRow
            label="Runtime Image"
            value="cloudguard-runtime:latest"
            sample
          />
          <StatRow label="Execution Sandbox" value="gVisor · Tier 3" sample />
        </Section>
      )}
      {sub === "approved-models" && (
        <Section title="Approved Models" sample>
          <StatRow
            label="Models"
            value="claude-opus, claude-sonnet, gemini-pro"
            sample
          />
          <StatRow label="Default Model" value="claude-sonnet" sample />
        </Section>
      )}
      {sub === "agent-policies" && (
        <Section title="Agent Policies" sample>
          <StatRow
            label="Available Agents"
            value={`${rec.aiProfiles + 3}`}
            sample
          />
          <StatRow label="Autonomy Default" value="Ask (HITL gate)" sample />
        </Section>
      )}
      {sub === "knowledge-sources" && (
        <Section title="Knowledge Sources" sample>
          <StatRow label="Sources" value="5 knowledge bases" sample />
        </Section>
      )}
      {sub === "prompt-libraries" && (
        <Section title="Prompt Libraries" sample>
          <StatRow label="Libraries" value="3 curated libraries" sample />
        </Section>
      )}
      {sub === "execution-policies" && (
        <Section title="Execution Policies" sample>
          <StatRow label="Permission Tier" value="Operator" sample />
          <StatRow
            label="Approval Gate"
            value="Destructive actions require approval"
            sample
          />
        </Section>
      )}
      {sub === "safety-policies" && (
        <Section title="Safety Policies" sample>
          <StatRow
            label="Output Filter"
            value="Prompt-echo block · secret redaction"
            sample
          />
          <StatRow label="Input Screen" value="Enabled" sample />
        </Section>
      )}
    </>
  );
}

// ── Provisioning Defaults (defaults used during workspace provisioning) ──
const PROVISIONING_SUBS = [
  { id: "cloud-resources", label: "Cloud Resources" },
  { id: "identity-configuration", label: "Identity Configuration" },
  { id: "resource-quotas", label: "Resource Quotas" },
  { id: "networking", label: "Networking" },
  { id: "storage", label: "Storage" },
  { id: "integrations", label: "Integrations" },
  { id: "operational-settings", label: "Operational Settings" },
  { id: "monitoring", label: "Monitoring" },
];
function ProvisioningTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("cloud-resources");
  return (
    <>
      <div
        style={{
          fontSize: 12.5,
          color: T.textMuted,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Specifies defaults used during workspace provisioning <SampleTag />
      </div>
      <Tabs tabs={PROVISIONING_SUBS} active={sub} onChange={setSub} />
      {sub === "cloud-resources" && (
        <Section title="Cloud Resources" sample>
          <StatRow
            label="Baseline Resources"
            value="24 resources provisioned"
            sample
          />
          <StatRow label="Cloud Providers" value="AWS, Azure" sample />
        </Section>
      )}
      {sub === "identity-configuration" && (
        <Section title="Identity Configuration" sample>
          <StatRow label="Identity Provider" value="Federated (OIDC)" sample />
          <StatRow label="Default Roles" value="Owner, Admin, Viewer" sample />
        </Section>
      )}
      {sub === "resource-quotas" && (
        <Section title="Resource Quotas" sample>
          <StatRow label="Compute" value="Standard tier · 200 vCPU" sample />
          <StatRow label="Cloud Accounts" value="Up to 5 accounts" sample />
        </Section>
      )}
      {sub === "networking" && (
        <Section title="Networking" sample>
          <StatRow label="Network Baseline" value="Hub-and-spoke VPC" sample />
          <StatRow label="Ingress" value="Deny-by-default" sample />
        </Section>
      )}
      {sub === "storage" && (
        <Section title="Storage" sample>
          <StatRow
            label="Encryption"
            value="CMEK · at-rest + in-transit"
            sample
          />
          <StatRow label="Default Class" value="Standard · versioned" sample />
        </Section>
      )}
      {sub === "integrations" && (
        <Section title="Integrations" sample>
          <StatRow label="Default Integrations" value="GitHub, Jira" sample />
        </Section>
      )}
      {sub === "operational-settings" && (
        <Section title="Operational Settings" sample>
          <StatRow
            label="Estimated Provisioning Time"
            value={`${rec.provisioningMin} minutes`}
            tone="ok"
            sample
          />
          <StatRow label="Change Windows" value="Business hours (UTC)" sample />
        </Section>
      )}
      {sub === "monitoring" && (
        <Section title="Monitoring" sample>
          <StatRow
            label="Observability"
            value="Metrics + logs + traces"
            sample
          />
          <StatRow
            label="Default Alerts"
            value="Health, drift, compliance"
            sample
          />
        </Section>
      )}
    </>
  );
}

// ── Version History (tracks every published version) ──
function VersionHistoryTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
  const count = 3 + (n % 3);
  const versions = Array.from({ length: count }, (_, i) => ({
    id: `${rec.id}-vh${i}`,
    version: i === count - 1 ? rec.version : `v${1 + i}.${(n + i) % 6}`,
    published: `2026-0${1 + ((n + i) % 6)}-${(1 + ((n + i) % 27)).toString().padStart(2, "0")}`,
    publishedBy: pick(OWNERS, n + i),
    status: (i === count - 1 ? rec.status : "Deprecated") as Status,
    notes: pick(
      [
        "Initial published baseline",
        "Governance profile update",
        "Compliance framework refresh",
        "AI runtime pin bump",
        "Security hardening",
      ],
      n + i,
    ),
  }));
  const cols: Column<(typeof versions)[number]>[] = [
    {
      key: "version",
      header: "Version",
      render: (r) => (
        <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>
          {r.version}
        </span>
      ),
    },
    { key: "published", header: "Published", render: (r) => r.published },
    { key: "by", header: "Published By", render: (r) => r.publishedBy },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    { key: "notes", header: "Notes", render: (r) => r.notes },
  ];
  return (
    <>
      <ToolbarRow buttons={["Compare", "Restore", "Export"]} sample />
      <DirectoryTable columns={cols} rows={versions} />
      <Section title="Comparison" sample>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <ConfigBlock title={`Version A · ${versions[0].version}`} muted>
            <StatRow label="Governance Profile" value={rec.governanceProfile} />
            <StatRow label="Compliance Profile" value={rec.complianceProfile} />
            <StatRow label="Security Profile" value={rec.securityProfile} />
          </ConfigBlock>
          <span
            style={{ color: T.textMuted, textAlign: "center", fontSize: 13 }}
          >
            ↓ Configuration Differences
          </span>
          <ConfigBlock title={`Version B · ${rec.version}`}>
            <StatRow
              label="Governance Profile"
              value={rec.governanceProfile}
              tone="ok"
            />
            <StatRow
              label="Compliance Profile"
              value={rec.complianceProfile}
              tone="ok"
            />
            <StatRow
              label="Security Profile"
              value={rec.securityProfile}
              tone="ok"
            />
          </ConfigBlock>
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 8 }}>
          Differences between the two selected versions are highlighted.
        </div>
      </Section>
    </>
  );
}

function ConfigBlock({
  title,
  muted,
  children,
}: {
  title: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        background: muted ? "transparent" : "var(--cg-accent-bg-strong)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: T.textNav,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Activity (timeline + filters) ──
function ActivityTab() {
  const [fActor, setFActor] = React.useState("");
  const [fCategory, setFCategory] = React.useState("");
  const events = [
    { label: "Template Created", category: "Lifecycle" },
    { label: "Configuration Updated", category: "Configuration" },
    { label: "Version Published", category: "Version" },
    { label: "Assigned as Default", category: "Governance" },
    { label: "Workspace Provisioned", category: "Provisioning" },
    { label: "Template Archived", category: "Lifecycle" },
  ].map((e, i) => ({ ...e, actor: pick(OWNERS, i) }));
  const shown = events.filter(
    (e) =>
      (!fActor || e.actor === fActor) &&
      (!fCategory || e.category === fCategory),
  );
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals)).map((v) => ({ value: v, label: v })),
  ];
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <Select
          label="Actor"
          value={fActor}
          onChange={setFActor}
          options={facet(events.map((e) => e.actor))}
        />
        <Select
          label="Category"
          value={fCategory}
          onChange={setFCategory}
          options={facet(events.map((e) => e.category))}
        />
        <span
          style={{
            fontSize: 11.5,
            color: T.textMuted,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Template activity timeline (Date filter — most recent first){" "}
          <SampleTag />
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {shown.map((e, i) => (
          <div
            key={e.label}
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
              <div style={{ fontSize: 13, color: T.textPrimary }}>
                {e.label}
              </div>
              <div style={{ fontSize: 11.5, color: T.textMuted }}>
                {e.actor} · {e.category} ·{" "}
                {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Audit History (immutable, read-only) ──
function AuditTab() {
  const events = [
    "Template Created",
    "Template Modified",
    "Configuration Changed",
    "Version Published",
    "Version Restored",
    "Template Assigned",
    "Template Archived",
    "Template Exported",
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

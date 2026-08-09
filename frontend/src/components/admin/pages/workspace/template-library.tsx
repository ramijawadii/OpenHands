/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Workspace Templates → Template Library */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Upload,
  Download,
  Share2,
  Star,
  RefreshCcw,
  ClipboardCheck,
  GitCompare,
  FolderTree,
  BadgeCheck,
  LayoutGrid,
  Layers,
  Sliders,
  GitBranch,
  BarChart3,
  History as HistoryIcon,
  Activity as ActivityIcon,
  ShieldCheck,
  Copy,
  Eye,
  Rocket,
  Archive,
  Package,
  Building2,
  Users as UsersIcon,
  Store,
  Clock,
  Sparkles,
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
 * Template Library — the centralized, enterprise-marketplace catalog for every reusable workspace
 * template across the organization. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/01_Workspace Templates/template_library.md.
 *
 * Unlike the per-type template modules (Enterprise / Environment / Compliance / Operational / Custom),
 * the Library is a single catalog for discovering, governing, comparing, versioning and reusing
 * templates — maximizing reuse, standardization and operational consistency while reducing template
 * duplication. It aggregates Enterprise / Environment / Compliance / Operational / Custom templates
 * plus Vendor, Marketplace and Organization-Shared templates, and is consumed by Workspace Requests,
 * the Provisioning Queue, Automation, Workspace Provisioning, Active Workspaces and Org Governance.
 *
 * Reuses the Enterprise-Administration UX pattern shared with the Users module: Banner · Toolbar ·
 * Filters · Search · Data Table · Bulk/Row actions · Template Detail Drawer (8 sub-tabs) plus the
 * Operational Dashboard and Template Collections gallery.
 *
 * There is no template backend yet, so the catalog is deterministic representative sample data
 * (tagged `Sample` in the UI). When admin/org_model.py + the template registry land, swap
 * SAMPLE_TEMPLATES for the live query — the component API stays identical.
 */

// ── Library navigation (spec §Navigation) — the second-level sub-nav ──────────────────────────────
const NAV_TABS = [
  { id: "organization", label: "Organization Templates", Icon: Building2 },
  { id: "shared", label: "Shared Templates", Icon: UsersIcon },
  { id: "marketplace", label: "Marketplace Templates", Icon: Store },
  { id: "vendor", label: "Vendor Templates", Icon: Package },
  { id: "recent", label: "Recently Used", Icon: Clock },
  { id: "favorites", label: "Favorites", Icon: Star },
  { id: "recommended", label: "Recommended", Icon: Sparkles },
  { id: "archived", label: "Archived", Icon: Archive },
  { id: "collections", label: "Template Collections", Icon: FolderTree },
];

type Status = "Published" | "Draft" | "Archived" | "Deprecated";
const STATUS_TONE: Record<Status, string> = {
  Published: T.success,
  Draft: T.warning,
  Archived: T.textMuted,
  Deprecated: T.danger,
};

type Visibility = "Organization" | "Shared" | "Private" | "Marketplace";
type Source = "Organization" | "Shared" | "Marketplace" | "Vendor";

// Template types available in the library (spec §Purpose).
const TEMPLATE_TYPES = [
  "Enterprise",
  "Environment",
  "Compliance",
  "Operational",
  "Custom",
  "Vendor",
  "Marketplace",
  "Organization Shared",
];
const CATEGORIES = [
  "Production",
  "Development",
  "Security",
  "Compliance",
  "Data Platform",
  "Landing Zone",
];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const INDUSTRIES = [
  "Financial Services",
  "Healthcare",
  "Government",
  "Retail",
  "Technology",
];
const COMPLIANCE_FRAMEWORKS = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
  "FedRAMP",
];
const WORKSPACE_TYPES = [
  "Enterprise",
  "Department",
  "Project",
  "Shared Service",
];
const VISIBILITIES: Visibility[] = [
  "Organization",
  "Shared",
  "Private",
  "Marketplace",
];
const OWNERS = [
  "Platform Team",
  "Security Guild",
  "Cloud CoE",
  "Data Platform",
  "Compliance Office",
  "Vendor: HashiCorp",
];
const TAG_POOL = [
  "aws",
  "azure",
  "gcp",
  "landing-zone",
  "pci",
  "hipaa",
  "baseline",
  "hardened",
  "cost-optimized",
  "multi-region",
];

// Template Collections (spec §Collections).
const COLLECTIONS = [
  { name: "AWS Enterprise", desc: "AWS landing-zone + enterprise baselines" },
  { name: "Azure Enterprise", desc: "Azure enterprise-scale foundations" },
  { name: "PCI DSS", desc: "Cardholder-data compliant workspaces" },
  { name: "Healthcare", desc: "HIPAA / HITRUST clinical workloads" },
  { name: "Government", desc: "FedRAMP / IL-aligned templates" },
  { name: "SOC Operations", desc: "Detection & response operational stacks" },
  { name: "Developer Platform", desc: "Self-service developer sandboxes" },
];

interface TemplateRecord {
  id: string;
  name: string;
  description: string;
  templateType: string;
  category: string;
  businessUnit: string;
  environment: string;
  industry: string;
  complianceFramework: string;
  workspaceType: string;
  visibility: Visibility;
  source: Source;
  owner: string;
  version: string;
  status: Status;
  tags: string[];
  favorite: boolean;
  recentlyUsed: boolean;
  recommended: boolean;
  // statistics (spec §Overview → Statistics)
  provisionedWorkspaces: number;
  versions: number;
  dependencies: number;
  collections: number;
  favorites: number;
  downloads: number;
  created: string;
  modified: string;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative template catalog.
const SAMPLE_TEMPLATES: TemplateRecord[] = Array.from(
  { length: 15 },
  (_, i) => {
    const id = `TPL-${(1000 + i * 37).toString()}`;
    const n = hashId(id);
    const templateType = pick(TEMPLATE_TYPES, n);
    const source: Source =
      templateType === "Vendor"
        ? "Vendor"
        : templateType === "Marketplace"
          ? "Marketplace"
          : templateType === "Organization Shared"
            ? "Shared"
            : "Organization";
    const visibility: Visibility =
      source === "Marketplace"
        ? "Marketplace"
        : source === "Shared"
          ? "Shared"
          : pick(VISIBILITIES, n >> 2);
    const status = pick<Status>(
      [
        "Published",
        "Published",
        "Published",
        "Draft",
        "Archived",
        "Deprecated",
      ],
      n,
    );
    return {
      id,
      name: `${pick(INDUSTRIES, n).split(" ")[0]} ${pick(CATEGORIES, n)} ${templateType}`,
      description: `${templateType} template for ${pick(BUSINESS_UNITS, n)} ${pick(ENVIRONMENTS, n >> 2).toLowerCase()} workspaces on ${pick(["AWS", "Azure", "Google Cloud"], n)}.`,
      templateType,
      category: pick(CATEGORIES, n),
      businessUnit: pick(BUSINESS_UNITS, n),
      environment: pick(ENVIRONMENTS, n >> 2),
      industry: pick(INDUSTRIES, n),
      complianceFramework: pick(COMPLIANCE_FRAMEWORKS, n),
      workspaceType: pick(WORKSPACE_TYPES, n >> 3),
      visibility,
      source,
      owner: pick(OWNERS, n),
      version: `v${1 + (n % 5)}.${n % 9}`,
      status,
      tags: [pick(TAG_POOL, n), pick(TAG_POOL, n + 3), pick(TAG_POOL, n + 7)],
      favorite: n % 3 === 0,
      recentlyUsed: n % 2 === 0,
      recommended: n % 4 === 0,
      provisionedWorkspaces: status === "Published" ? 4 + (n % 300) : n % 8,
      versions: 1 + (n % 12),
      dependencies: n % 6,
      collections: n % 4,
      favorites: 2 + (n % 60),
      downloads: 20 + (n % 900),
      created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-0${1 + (n % 8)}`,
      modified: `2026-0${1 + (n % 6)}-1${n % 9}`,
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
 * Embeddable body — sub-navigation + Operational Dashboard + directory (or Collections gallery) +
 * Template Detail Drawer, WITHOUT the outer <Page> or the page banner. Rendered both as the standalone
 * route and as a tab of the Workspace Administration console. Uses local state for the library sub-nav
 * so it never collides with a host page's `?tab=` param.
 */
export function TemplateLibraryView() {
  const navigate = useNavigate();
  const [nav, setNav] = React.useState("organization");
  const [, refresh] = React.useReducer((x) => x + 1, 0);

  // Filters (spec §Filters)
  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fCategory, setFCategory] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fIndustry, setFIndustry] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [fWsType, setFWsType] = React.useState("");
  const [fVisibility, setFVisibility] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fVersion, setFVersion] = React.useState("");
  const [fTag, setFTag] = React.useState("");

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

  // Sub-nav scoping (spec §Navigation).
  const navMatch = (r: TemplateRecord) => {
    switch (nav) {
      case "organization":
        return r.source === "Organization";
      case "shared":
        return r.source === "Shared" || r.visibility === "Shared";
      case "marketplace":
        return r.source === "Marketplace";
      case "vendor":
        return r.source === "Vendor";
      case "recent":
        return r.recentlyUsed;
      case "favorites":
        return r.favorite;
      case "recommended":
        return r.recommended;
      case "archived":
        return r.status === "Archived";
      default:
        return true;
    }
  };

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      navMatch(r) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.complianceFramework.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))) &&
      (!fType || r.templateType === fType) &&
      (!fCategory || r.category === fCategory) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fEnv || r.environment === fEnv) &&
      (!fIndustry || r.industry === fIndustry) &&
      (!fCompliance || r.complianceFramework === fCompliance) &&
      (!fWsType || r.workspaceType === fWsType) &&
      (!fVisibility || r.visibility === fVisibility) &&
      (!fOwner || r.owner === fOwner) &&
      (!fStatus || r.status === fStatus) &&
      (!fVersion || r.version === fVersion) &&
      (!fTag || r.tags.includes(fTag))
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFCategory("");
    setFBu("");
    setFEnv("");
    setFIndustry("");
    setFCompliance("");
    setFWsType("");
    setFVisibility("");
    setFOwner("");
    setFStatus("");
    setFVersion("");
    setFTag("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational Dashboard (spec §Operational Dashboard) ──
  const published = records.filter((r) => r.status === "Published").length;
  const draft = records.filter((r) => r.status === "Draft").length;
  const archived = records.filter((r) => r.status === "Archived").length;
  const favorites = records.filter((r) => r.favorite).length;
  const provisioned = records.reduce((a, r) => a + r.provisionedWorkspaces, 0);
  const mostUsed = [...records].sort(
    (a, b) => b.provisionedWorkspaces - a.provisionedWorkspaces,
  )[0];

  // ── Toolbar (spec §Toolbar: New · Library Actions · Governance Actions) ──
  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Template",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=requests"),
    },
    {
      key: "import",
      label: "Import Template",
      icon: <Upload size={15} />,
      onClick: () => setNav("marketplace"),
    },
    {
      key: "publish",
      label: "Publish",
      icon: <Rocket size={15} />,
      disabled: true,
    },
    {
      key: "share",
      label: "Share",
      icon: <Share2 size={15} />,
      disabled: true,
    },
    {
      key: "favorite",
      label: "Favorite",
      icon: <Star size={15} />,
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
      onClick: () => refresh(),
    },
    {
      key: "validate",
      label: "Validate",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Templates",
      icon: <GitCompare size={15} />,
      disabled: true,
    },
    {
      key: "collections",
      label: "Manage Collections",
      icon: <FolderTree size={15} />,
      onClick: () => setNav("collections"),
    },
    {
      key: "assign-default",
      label: "Assign Default",
      icon: <BadgeCheck size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<TemplateRecord>[] = [
    {
      key: "name",
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
          <Package size={14} color={T.textMuted} />
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
      key: "type",
      header: "Type",
      sortValue: (r) => r.templateType,
      render: (r) => r.templateType,
    },
    {
      key: "category",
      header: "Category",
      sortValue: (r) => r.category,
      render: (r) => r.category,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
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
      key: "visibility",
      header: "Visibility",
      sortValue: (r) => r.visibility,
      render: (r) => r.visibility,
    },
    {
      key: "usage",
      header: "Usage",
      sortValue: (r) => r.provisionedWorkspaces,
      render: (r) => `${r.provisionedWorkspaces.toLocaleString()} Workspaces`,
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
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={nav}
          onChange={setNav}
          options={NAV_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {/* ── Operational Dashboard ── */}
      <Card
        title="Operational dashboard"
        desc="Library-wide template posture across the organization."
        right={<SampleTag />}
      >
        <StatStripPlain
          items={[
            { label: "Total Templates", value: records.length, tone: "ok" },
            { label: "Published", value: published, tone: "ok" },
            { label: "Draft", value: draft, tone: "warn" },
            { label: "Archived", value: archived, tone: "muted" },
            { label: "Favorites", value: favorites, tone: "ok" },
            { label: "Collections", value: COLLECTIONS.length, tone: "ok" },
            {
              label: "Provisioned Workspaces",
              value: provisioned.toLocaleString(),
              tone: "ok",
            },
            {
              label: "Most Used Template",
              value: mostUsed.version,
              tone: "ok",
            },
          ]}
        />
      </Card>

      {nav === "collections" ? (
        <CollectionsGallery records={records} />
      ) : (
        <DiscoveryListView
          title="Template catalog"
          commands={toolbar}
          pills={[
            {
              key: "type",
              label: "Template Type",
              value: fType,
              onChange: setFType,
              options: facet(records.map((r) => r.templateType)),
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
              key: "env",
              label: "Environment",
              value: fEnv,
              onChange: setFEnv,
              options: facet(records.map((r) => r.environment)),
            },
            {
              key: "industry",
              label: "Industry",
              value: fIndustry,
              onChange: setFIndustry,
              options: facet(records.map((r) => r.industry)),
            },
            {
              key: "compliance",
              label: "Compliance",
              value: fCompliance,
              onChange: setFCompliance,
              options: facet(records.map((r) => r.complianceFramework)),
            },
            {
              key: "wsType",
              label: "Workspace Type",
              value: fWsType,
              onChange: setFWsType,
              options: facet(records.map((r) => r.workspaceType)),
            },
            {
              key: "visibility",
              label: "Visibility",
              value: fVisibility,
              onChange: setFVisibility,
              options: facet(records.map((r) => r.visibility)),
            },
            {
              key: "owner",
              label: "Owner",
              value: fOwner,
              onChange: setFOwner,
              options: facet(records.map((r) => r.owner)),
            },
            {
              key: "status",
              label: "Status",
              value: fStatus,
              onChange: setFStatus,
              options: facet(records.map((r) => r.status)),
            },
            {
              key: "version",
              label: "Version",
              value: fVersion,
              onChange: setFVersion,
              options: facet(records.map((r) => r.version)),
            },
            {
              key: "tag",
              label: "Tags",
              value: fTag,
              onChange: setFTag,
              options: facet(records.flatMap((r) => r.tags)),
            },
          ]}
          presets={[{ label: "All templates", onApply: clearFilters }]}
          filterRightSlot={
            <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
          }
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search templates — name, description, framework, category, business unit, tags, owner…"
          count={rows.length}
          columns={cols.filter((c) => !hidden.has(c.key))}
          rows={rows}
          pageSize={15}
          initialSort={{ key: "usage", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <HeaderButton icon={<Share2 size={13} />} onClick={clear}>
                Share ({ids.length})
              </HeaderButton>
              <HeaderButton icon={<Rocket size={13} />} onClick={clear}>
                Publish
              </HeaderButton>
              <HeaderButton icon={<Star size={13} />} onClick={clear}>
                Favorite
              </HeaderButton>
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
                { label: "Open", onClick: () => setSelId(r.id) },
                { label: "Preview", onClick: () => setSelId(r.id) },
                {
                  label: "Use Template",
                  onClick: () => navigate("/admin/workspaces?tab=requests"),
                },
                { label: "Clone", onClick: () => {} },
                { label: "Share", onClick: () => {} },
                { label: "Favorite", onClick: () => {} },
                { label: "Compare", onClick: () => setSelId(r.id) },
                { label: "Export", onClick: () => {} },
                { label: "Archive", onClick: () => {}, danger: true },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Package size={20} />}
              title="No templates available."
              hint="Adjust filters, or create / import a template — or browse the marketplace to get started."
              cta="Create Template"
              onCta={() => navigate("/admin/workspaces?tab=requests")}
            />
          }
        />
      )}

      {sel && (
        <TemplateDetailDrawer
          rec={sel}
          allTemplates={records}
          onClose={() => setSelId(null)}
          onUse={() => navigate("/admin/workspaces?tab=requests")}
        />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function TemplateLibraryPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Template Library"
        subtitle="Browse, discover, compare and manage reusable workspace templates across the organization."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=requests")}
            >
              Create Template
            </HeaderButton>
          </>
        }
      />
      <TemplateLibraryView />
    </Page>
  );
}

// ════════════ Template Collections gallery (spec §Collections) ════════════
function CollectionsGallery({ records }: { records: TemplateRecord[] }) {
  return (
    <Card
      title="Template collections"
      desc="Groups of related templates — curated for clouds, compliance frameworks and operating models."
      right={<SampleTag />}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <HeaderButton icon={<Plus size={13} />}>Create Collection</HeaderButton>
        <HeaderButton icon={<Plus size={13} />}>Add Template</HeaderButton>
        <HeaderButton variant="danger">Remove Template</HeaderButton>
      </div>
      <StatStripPlain
        items={COLLECTIONS.map((c, i) => ({
          label: c.name,
          value: `${3 + ((hashId(c.name) + i) % 10)} templates`,
          tone: "ok" as const,
        }))}
      />
      <div style={{ marginTop: 6, fontSize: 11.5, color: T.textMuted }}>
        {records.length} templates are catalogued across {COLLECTIONS.length}{" "}
        collections.
      </div>
    </Card>
  );
}

// ════════════ Template Detail Drawer — 8 sub-tabs (spec §Template Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "composition", label: "Composition", icon: <Layers size={13} /> },
  { id: "configuration", label: "Configuration", icon: <Sliders size={13} /> },
  { id: "dependencies", label: "Dependencies", icon: <GitBranch size={13} /> },
  { id: "usage", label: "Usage", icon: <BarChart3 size={13} /> },
  { id: "versions", label: "Version History", icon: <HistoryIcon size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <ShieldCheck size={13} /> },
];

function TemplateDetailDrawer({
  rec,
  allTemplates,
  onClose,
  onUse,
}: {
  rec: TemplateRecord;
  allTemplates: TemplateRecord[];
  onClose: () => void;
  onUse: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      // Drawer header displays Template Type · Version · Status · Visibility (spec §Drawer Header).
      subtitle={`${rec.templateType} · ${rec.version} · ${rec.status} · ${rec.visibility}`}
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
          {/* Quick Actions (spec §Drawer Header) */}
          <HeaderButton icon={<Copy size={13} />}>Clone</HeaderButton>
          <HeaderButton icon={<Share2 size={13} />}>Share</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton
            variant="primary"
            icon={<Rocket size={13} />}
            onClick={onUse}
          >
            Use
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "composition" && <CompositionTab rec={rec} />}
      {tab === "configuration" && <ConfigurationTab />}
      {tab === "dependencies" && (
        <DependenciesTab rec={rec} allTemplates={allTemplates} />
      )}
      {tab === "usage" && <UsageTab rec={rec} />}
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

// ── Reusable vertical chain visualization (Composition / Dependencies / Comparison) ──
function ChainViz({
  nodes,
  highlightLast,
}: {
  nodes: string[];
  highlightLast?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {nodes.map((label, i) => {
        const isLast = i === nodes.length - 1;
        const strong = highlightLast && isLast;
        return (
          <React.Fragment key={label}>
            <div
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: 12.5,
                color: strong ? T.textPrimary : T.textNav,
                fontWeight: strong ? 600 : 400,
                background: strong
                  ? "var(--cg-accent-bg-strong)"
                  : "transparent",
              }}
            >
              {label}
            </div>
            {!isLast && (
              <span
                style={{
                  color: T.textMuted,
                  textAlign: "center",
                  fontSize: 12,
                }}
              >
                ↓
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Overview (General · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
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
              { k: "Template Type", v: rec.templateType },
              { k: "Category", v: rec.category },
              { k: "Workspace Type", v: rec.workspaceType },
              { k: "Owner", v: rec.owner },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Version", v: rec.version },
              { k: "Visibility", v: rec.visibility },
              { k: "Status", v: rec.status },
              { k: "Created", v: rec.created, sample: true },
              { k: "Modified", v: rec.modified, sample: true },
            ]}
          />
          <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
            {rec.description}
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              paddingTop: 10,
            }}
          >
            {rec.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  color: T.textNav,
                  background: T.badgeBg,
                  border: `1px solid ${T.border}`,
                  borderRadius: 99,
                  padding: "2px 9px",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </Section>
      )}

      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              {
                k: "Provisioned Workspaces",
                v: rec.provisionedWorkspaces.toLocaleString(),
                sample: true,
              },
              { k: "Versions", v: rec.versions, sample: true },
              { k: "Dependencies", v: rec.dependencies, sample: true },
              { k: "Collections", v: rec.collections, sample: true },
              { k: "Favorites", v: rec.favorites, sample: true },
              {
                k: "Downloads",
                v: rec.downloads.toLocaleString(),
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Composition (what the template contains + layered visualization) ──
const COMPOSITION_SUBS = [
  { id: "template-composition", label: "Template composition" },
  { id: "layered-visualization", label: "Layered visualization" },
];
function CompositionTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("template-composition");
  const n = hashId(rec.id);
  const parts = [
    "Enterprise Template",
    "Environment Template",
    "Compliance Template",
    "Operational Template",
    "Custom Components",
    "AI Configuration",
    "Policies",
    "Automation",
    "Integrations",
  ];
  return (
    <>
      <Tabs tabs={COMPOSITION_SUBS} active={sub} onChange={setSub} />
      {sub === "template-composition" && (
        <Section title="Template composition" sample>
          <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 4 }}>
            What this template contains.
          </div>
          {parts.map((p, i) => {
            const included = (n + i) % 5 !== 0;
            return (
              <StatRow
                key={p}
                label={p}
                value={
                  included ? `${1 + ((n + i) % 6)} included` : "Not included"
                }
                tone={included ? "ok" : "muted"}
                sample
              />
            );
          })}
        </Section>
      )}
      {sub === "layered-visualization" && (
        <Section title="Layered visualization" sample>
          <ChainViz
            nodes={[
              "Enterprise",
              "Environment",
              "Compliance",
              "Operational",
              "Custom",
              "Workspace",
            ]}
            highlightLast
          />
        </Section>
      )}
    </>
  );
}

// ── Configuration (effective workspace configuration, read-only preview) ──
function ConfigurationTab() {
  const sections = [
    "Governance",
    "Security",
    "Compliance",
    "Identity",
    "Cloud",
    "Networking",
    "AI",
    "Automation",
    "Monitoring",
    "Operations",
  ];
  const previews: Record<string, string> = {
    Governance: "Strict profile · 2-of-3 approvers",
    Security: "Hardened baseline · CIS L2",
    Compliance: "ISO 27001 · SOC 2 · PCI DSS",
    Identity: "SSO federated · SCIM provisioning",
    Cloud: "AWS · multi-region · guardrails on",
    Networking: "Private egress · no public ingress",
    AI: "cloudguard-runtime · execution policy: ask",
    Automation: "Drift remediation · nightly sync",
    Monitoring: "Full telemetry · 90d retention",
    Operations: "Standard tier · quarterly review",
  };
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
        Effective workspace configuration — read-only preview <SampleTag />
      </div>
      {sections.map((s) => (
        <StatRow key={s} label={s} value={previews[s]} sample />
      ))}
    </>
  );
}

// ── Dependencies (template relationships + visualization) ──
const DEPENDENCIES_SUBS = [
  { id: "template-relationships", label: "Template relationships" },
  { id: "dependency-chain", label: "Dependency chain" },
];
function DependenciesTab({
  rec,
  allTemplates,
}: {
  rec: TemplateRecord;
  allTemplates: TemplateRecord[];
}) {
  const [sub, setSub] = React.useState("template-relationships");
  const n = hashId(rec.id);
  const other = allTemplates.filter((t) => t.id !== rec.id);
  const names = (offset: number, count: number) =>
    Array.from(
      { length: count },
      (_, i) => pick(other, n + offset + i).name,
    ).join(", ") || "None";
  return (
    <>
      <Tabs tabs={DEPENDENCIES_SUBS} active={sub} onChange={setSub} />
      {sub === "template-relationships" && (
        <Section title="Template relationships" sample>
          <StatRow
            label="Parent Templates"
            value={names(1, rec.dependencies % 3)}
            sample
          />
          <StatRow
            label="Child Templates"
            value={names(4, rec.dependencies % 2)}
            sample
          />
          <StatRow label="Inherited Templates" value={names(7, 1)} sample />
          <StatRow
            label="Dependent Templates"
            value={`${rec.provisionedWorkspaces % 5} templates`}
            sample
          />
          <StatRow
            label="Referenced Profiles"
            value={`${rec.complianceFramework} · Governance profile`}
            sample
          />
        </Section>
      )}
      {sub === "dependency-chain" && (
        <Section title="Dependency chain" sample>
          <ChainViz
            nodes={[pick(other, n).name, rec.name, pick(other, n + 5).name]}
            highlightLast
          />
        </Section>
      )}
    </>
  );
}

// ── Usage (where the template is used) ──
function UsageTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
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
        <HeaderButton icon={<Eye size={13} />}>View Consumers</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export Usage</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Where this template is used" sample>
        <StatRow
          label="Provisioned Workspaces"
          value={rec.provisionedWorkspaces.toLocaleString()}
          tone="ok"
          sample
        />
        <StatRow
          label="Enterprise Templates"
          value={`${n % 4} referencing`}
          sample
        />
        <StatRow
          label="Environment Templates"
          value={`${n % 3} referencing`}
          sample
        />
        <StatRow label="Automation Jobs" value={`${n % 6} jobs`} sample />
        <StatRow label="Provisioning Queue" value={`${n % 5} queued`} sample />
        <StatRow
          label="Workspace Requests"
          value={`${n % 8} open requests`}
          sample
        />
      </Section>
    </>
  );
}

// ── Version History (toolbar + table + comparison view) ──
function VersionHistoryTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
  const rows = Array.from({ length: Math.min(6, rec.versions) }, (_, i) => {
    const major = Math.max(1, rec.versions - i);
    return {
      id: `${rec.id}-v${i}`,
      version: `v${major}.${(n + i) % 9}`,
      published: `2026-0${1 + ((n + i) % 6)}-1${(n + i) % 9}`,
      author: pick(OWNERS, n + i),
      status: i === 0 ? "Published" : i === 1 ? "Deprecated" : "Archived",
      releaseNotes: pick(
        [
          "Hardened network baseline",
          "Added PCI DSS controls",
          "Updated AI execution policy",
          "Cost-optimization guardrails",
          "Initial release",
        ],
        n + i,
      ),
    };
  });
  const cols: Column<(typeof rows)[number]>[] = [
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
    { key: "author", header: "Author", render: (r) => r.author },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{
            color:
              r.status === "Published"
                ? T.success
                : r.status === "Deprecated"
                  ? T.danger
                  : T.textMuted,
          }}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "notes",
      header: "Release Notes",
      render: (r) => r.releaseNotes,
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
        <HeaderButton icon={<GitCompare size={13} />}>Compare</HeaderButton>
        <HeaderButton icon={<RefreshCcw size={13} />}>Restore</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={rows} />
      <div style={{ marginTop: 18 }}>
        <Section title="Comparison view" sample>
          <ChainViz
            nodes={[
              rows[rows.length - 1]?.version ?? "v3.1",
              "Differences",
              rows[0]?.version ?? "v4.0",
            ]}
            highlightLast
          />
        </Section>
      </div>
    </>
  );
}

// ── Activity (timeline + filters) ──
function ActivityTab() {
  const events = [
    "Created",
    "Published",
    "Updated",
    "Shared",
    "Assigned",
    "Used",
    "Archived",
  ];
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <Select
          label="Actor"
          value=""
          onChange={() => {}}
          options={[{ value: "", label: "All actors" }]}
        />
        <Select
          label="Category"
          value=""
          onChange={() => {}}
          options={[{ value: "", label: "All categories" }]}
        />
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[{ value: "", label: "All dates" }]}
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
              {pick(OWNERS, i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Audit History (immutable, read-only) ──
function AuditTab() {
  const events = [
    "Template Created",
    "Template Modified",
    "Published",
    "Assigned",
    "Imported",
    "Exported",
    "Shared",
    "Archived",
    "Deleted",
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

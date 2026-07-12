/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Workspace Templates → Custom Templates */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Copy,
  Files,
  Upload,
  Download,
  Share2,
  Archive,
  Ban,
  RefreshCcw,
  CheckCircle,
  ClipboardCheck,
  Eye,
  GitCompare,
  Star,
  FileText,
  History,
  Activity as ActivityIcon,
  Bot,
  ShieldCheck,
  Settings,
  Layers,
  LayoutGrid,
  Lock,
  GitBranch,
  ArrowRight,
  Boxes,
} from "lucide-react";
import {
  Page,
  Tabs,
  PageHeader,
  Card,
  StatRow,
  KVGrid,
  DirectoryTable,
  FilterBar,
  CommandBar,
  HeaderButton,
  Select,
  EmptyState,
  SampleTag,
  Drawer,
  SideRailDrawer,
  RowMenu,
  ScopeBadge,
  PostureGrid,
  PostureCard,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";

/**
 * Custom Templates — the organization-specific workspace-template composition surface.
 * Authoritative spec:
 * docs/workspace/workspace_module/├── Workspace Administration/01_Workspace Templates/custom_templates.md.
 *
 * A Custom Template composes any combination of platform capabilities (Enterprise · Environment ·
 * Compliance · Operational templates + Governance / Security / AI profiles), may inherit from one or
 * more existing templates, and overrides only the required configuration — a reusable, business-
 * specific workspace blueprint. This view reuses the Enterprise-Administration UX pattern shared with
 * the Users module: Banner · Toolbar · Filters · Search · Data Table · Bulk/Row actions · Template
 * Detail Drawer (9 sub-tabs) plus the module's Operational Dashboard.
 *
 * There is no custom-template backend yet, so the template set is representative sample data (every
 * such field is tagged `Sample` in the UI). When admin/org_model.py ships the live template registry,
 * swap SAMPLE_TEMPLATES for the live query — the component API stays identical.
 */

// ── Reference data (spec: Toolbar wizard · Filters · Composition) ─────────────────────────────────
const CATEGORIES = [
  "Security",
  "Compliance",
  "Operations",
  "Finance",
  "Healthcare",
  "AI",
  "Executive",
  "Onboarding",
];
const WORKSPACE_TYPES = [
  "Enterprise",
  "Department",
  "Project",
  "Shared Service",
  "Production",
];
const BASE_TEMPLATES = [
  "Enterprise Production",
  "Enterprise Standard",
  "Regulated Enterprise",
  "Secure Baseline",
];
const ENVIRONMENT_TEMPLATES = [
  "Production",
  "Pre-production",
  "Development",
  "Sandbox",
];
const COMPLIANCE_TEMPLATES = [
  "PCI DSS",
  "HIPAA",
  "SOC 2",
  "ISO 27001",
  "NIST CSF",
  "FedRAMP",
];
const OPERATIONAL_TEMPLATES = [
  "Standard Ops",
  "24/7 SOC",
  "High-Availability",
  "Batch Processing",
];
const GOVERNANCE_PROFILES = ["Strict", "Balanced", "Relaxed"];
const SECURITY_PROFILES = ["Maximum", "Elevated", "Standard"];
const AI_PROFILES = ["Restricted", "Governed", "Research", "Disabled"];
const BUSINESS_UNITS = [
  "Payments",
  "Platform",
  "Security",
  "Data",
  "Retail",
  "Healthcare",
  "Finance",
];
const OWNERS = [
  "Platform Team",
  "Security Engineering",
  "Compliance Office",
  "Cloud Foundations",
  "AI Research Guild",
  "SOC Operations",
];
const VISIBILITY = [
  "Private",
  "Business Unit",
  "Organization",
  "Shared Library",
];
const VERSIONS = ["v1.0", "v1.2", "v2.0", "v2.3", "v3.1"];

type Status = "Draft" | "Published" | "Deprecated" | "Archived";
const STATUS_TONE: Record<Status, string> = {
  Draft: T.textMuted,
  Published: T.success,
  Deprecated: T.warning,
  Archived: T.textMuted,
};

// Deterministic seed names — the spec's canonical Custom-Template use cases + the worked example.
const TEMPLATE_NAMES = [
  "SOC Production",
  "Finance Production Workspace",
  "MSSP Customer Workspace",
  "Healthcare Business Unit",
  "Internal Red Team",
  "AI Research",
  "SOC Operations",
  "M&A Due Diligence",
  "Customer Onboarding",
  "Regulated Production",
  "Executive Reporting",
  "Payments PCI Enclave",
  "Data Platform Sandbox",
  "Partner Shared Service",
];

interface TemplateRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  businessUnit: string;
  workspaceType: string;
  owner: string;
  visibility: string;
  baseTemplate: string;
  environmentTemplate: string;
  complianceTemplate: string;
  operationalTemplate: string;
  governanceProfile: string;
  securityProfile: string;
  aiProfile: string;
  version: string;
  status: Status;
  tags: string[];
  updated: string;
  created: string;
  modified: string;
  // statistics
  assignedWorkspaces: number;
  inheritedTemplates: number;
  overrides: number;
  policies: number;
  complianceFrameworks: number;
  automationRules: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

function enrich(name: string, idx: number): TemplateRecord {
  const id = `tmpl-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const n = hashId(id);
  const status: Status =
    idx % 7 === 0
      ? "Archived"
      : idx % 5 === 0
        ? "Deprecated"
        : idx % 3 === 0
          ? "Draft"
          : "Published";
  return {
    id,
    name,
    description: `Reusable ${pick(CATEGORIES, n).toLowerCase()} workspace blueprint for ${pick(BUSINESS_UNITS, n >> 1)} teams, composed from enterprise, environment, compliance and operational templates.`,
    category: pick(CATEGORIES, n),
    businessUnit: pick(BUSINESS_UNITS, n >> 1),
    workspaceType: pick(WORKSPACE_TYPES, n >> 2),
    owner: pick(OWNERS, n),
    visibility: pick(VISIBILITY, n >> 3),
    baseTemplate: pick(BASE_TEMPLATES, n),
    environmentTemplate: pick(ENVIRONMENT_TEMPLATES, n >> 1),
    complianceTemplate: pick(COMPLIANCE_TEMPLATES, n),
    operationalTemplate: pick(OPERATIONAL_TEMPLATES, n >> 2),
    governanceProfile: pick(GOVERNANCE_PROFILES, n),
    securityProfile: pick(SECURITY_PROFILES, n >> 1),
    aiProfile: pick(AI_PROFILES, n >> 2),
    version: pick(VERSIONS, n),
    status,
    tags: [
      pick(CATEGORIES, n).toLowerCase(),
      pick(BUSINESS_UNITS, n).toLowerCase(),
    ],
    updated: pick(
      ["Yesterday", "2 days ago", "1 week ago", "3 weeks ago", "5 minutes ago"],
      n,
    ),
    created: "2025-11-04",
    modified: "2026-06-20",
    assignedWorkspaces: status === "Published" ? 2 + (n % 40) : n % 3,
    inheritedTemplates: 3 + (n % 3),
    overrides: n % 14,
    policies: 6 + (n % 24),
    complianceFrameworks: 1 + (n % 4),
    automationRules: n % 12,
  };
}

const SAMPLE_TEMPLATES: TemplateRecord[] = TEMPLATE_NAMES.map(enrich);

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

// ── Custom-Template sub-navigation (spec § Navigation) ────────────────────────────────────────────
const SUB_TABS = [
  { id: "active", label: "Active Templates", Icon: LayoutGrid },
  { id: "draft", label: "Draft Templates", Icon: FileText },
  { id: "published", label: "Published", Icon: CheckCircle },
  { id: "deprecated", label: "Deprecated", Icon: Ban },
  { id: "archived", label: "Archived", Icon: Archive },
  { id: "shared", label: "Shared Templates", Icon: Share2 },
  { id: "private", label: "Private Templates", Icon: Lock },
  { id: "versions", label: "Versions", Icon: GitBranch },
];

function matchesSub(r: TemplateRecord, sub: string): boolean {
  switch (sub) {
    case "active":
      return r.status === "Published";
    case "draft":
      return r.status === "Draft";
    case "published":
      return r.status === "Published";
    case "deprecated":
      return r.status === "Deprecated";
    case "archived":
      return r.status === "Archived";
    case "shared":
      return (
        r.visibility === "Shared Library" || r.visibility === "Organization"
      );
    case "private":
      return r.visibility === "Private";
    default:
      return true;
  }
}

/**
 * Embeddable body — Operational Dashboard + sub-navigation + template directory + detail drawer,
 * WITHOUT the outer <Page> or the page banner. Uses local state for the sub-nav so it never collides
 * with a host page's `?tab=` param.
 */
export function CustomTemplatesView() {
  const navigate = useNavigate();
  const [sub, setSub] = React.useState("active");

  // Filters (spec § Filters)
  const [search, setSearch] = React.useState("");
  const [fCategory, setFCategory] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fVisibility, setFVisibility] = React.useState("");
  const [fVersion, setFVersion] = React.useState("");
  const [fBase, setFBase] = React.useState("");
  const [fType, setFType] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [builder, setBuilder] = React.useState(false);
  const [, bump] = React.useReducer((x) => x + 1, 0);

  const records = SAMPLE_TEMPLATES;

  const hasFilters = !!(
    search ||
    fCategory ||
    fBu ||
    fOwner ||
    fStatus ||
    fVisibility ||
    fVersion ||
    fBase ||
    fType
  );
  const clearFilters = () => {
    setSearch("");
    setFCategory("");
    setFBu("");
    setFOwner("");
    setFStatus("");
    setFVisibility("");
    setFVersion("");
    setFBase("");
    setFType("");
  };

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      matchesSub(r, sub) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.workspaceType.toLowerCase().includes(q)) &&
      (!fCategory || r.category === fCategory) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fOwner || r.owner === fOwner) &&
      (!fStatus || r.status === fStatus) &&
      (!fVisibility || r.visibility === fVisibility) &&
      (!fVersion || r.version === fVersion) &&
      (!fBase || r.baseTemplate === fBase) &&
      (!fType || r.workspaceType === fType)
    );
  });
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational Dashboard (spec § Operational Dashboard) ──
  const published = records.filter((r) => r.status === "Published").length;
  const drafts = records.filter((r) => r.status === "Draft").length;
  const shared = records.filter(
    (r) => r.visibility === "Shared Library" || r.visibility === "Organization",
  ).length;
  const priv = records.filter((r) => r.visibility === "Private").length;
  const assigned = records.reduce((s, r) => s + r.assignedWorkspaces, 0);
  const mostUsed = records.reduce((a, b) =>
    b.assignedWorkspaces > a.assignedWorkspaces ? b : a,
  );

  // ── Toolbar (spec § Toolbar: Create · Administrative Actions · Validation Actions) ──
  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Custom Template",
      icon: <Plus size={15} />,
      onClick: () => setBuilder(true),
    },
    {
      key: "clone",
      label: "Clone",
      icon: <Copy size={15} />,
      disabled: true,
    },
    {
      key: "publish",
      label: "Publish",
      icon: <CheckCircle size={15} />,
      disabled: true,
    },
    {
      key: "archive",
      label: "Archive",
      icon: <Archive size={15} />,
      disabled: true,
    },
    {
      key: "deprecate",
      label: "Deprecate",
      icon: <Ban size={15} />,
      disabled: true,
    },
    {
      key: "share",
      label: "Share",
      icon: <Share2 size={15} />,
      disabled: true,
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: <Files size={15} />,
      disabled: true,
    },
    {
      key: "import",
      label: "Import",
      icon: <Upload size={15} />,
      onClick: () => setBuilder(true),
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
      onClick: () => bump(),
    },
    {
      key: "validate",
      label: "Validate",
      icon: <ClipboardCheck size={15} />,
      onClick: () => bump(),
    },
    {
      key: "preview",
      label: "Preview Effective Configuration",
      icon: <Eye size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Versions",
      icon: <GitCompare size={15} />,
      onClick: () => setSub("versions"),
    },
    {
      key: "assign-default",
      label: "Assign Default",
      icon: <Star size={15} />,
      disabled: true,
    },
  ];

  // ── Table columns (spec § Table: exact order) ──
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
          <Layers size={14} color={T.textMuted} />
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
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "visibility",
      header: "Visibility",
      sortValue: (r) => r.visibility,
      render: (r) => r.visibility,
    },
    {
      key: "base",
      header: "Base Template",
      sortValue: (r) => r.baseTemplate,
      render: (r) => r.baseTemplate,
    },
    {
      key: "version",
      header: "Version",
      sortValue: (r) => r.version,
      render: (r) => (
        <span style={{ fontFamily: "monospace" }}>{r.version}</span>
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
      header: "Updated",
      render: (r) => <span style={{ color: T.textMuted }}>{r.updated}</span>,
    },
  ];

  // ── Versions sub-view (spec § Navigation → Versions; § Version History table) ──
  const versionRows = records.flatMap((r) =>
    VERSIONS.slice(0, 3 + (hashId(r.id) % 3)).map((v, i) => ({
      id: `${r.id}-${v}`,
      templateId: r.id,
      template: r.name,
      version: v,
      published: `2026-0${1 + (i % 6)}-1${i % 9}`,
      publishedBy: pick(OWNERS, hashId(r.id) + i),
      status: i === 0 ? "Current" : "Superseded",
      notes: pick(
        [
          "Initial composition",
          "Tightened security profile",
          "Added compliance overrides",
          "Updated AI guardrails",
          "Governance floor raised",
        ],
        hashId(r.id) + i,
      ),
    })),
  );
  const versionCols: Column<(typeof versionRows)[number]>[] = [
    { key: "template", header: "Template", render: (r) => r.template },
    {
      key: "version",
      header: "Version",
      render: (r) => (
        <span style={{ fontFamily: "monospace" }}>{r.version}</span>
      ),
    },
    { key: "published", header: "Published", render: (r) => r.published },
    { key: "by", header: "Published By", render: (r) => r.publishedBy },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Current" ? T.success : T.textMuted }}
        >
          {r.status}
        </span>
      ),
    },
    { key: "notes", header: "Notes", render: (r) => r.notes },
  ];

  return (
    <>
      {/* ── Operational Dashboard ── */}
      <PostureGrid>
        <PostureCard
          title="Custom Templates"
          value={records.length}
          sub={<>Composed blueprints · Sample</>}
          tone="muted"
        />
        <PostureCard
          title="Published Templates"
          value={published}
          sub={<>Available for provisioning · Sample</>}
          tone="ok"
        />
        <PostureCard
          title="Draft Templates"
          value={drafts}
          sub={<>Not yet published · Sample</>}
          tone="warn"
        />
        <PostureCard
          title="Shared Templates"
          value={shared}
          sub={<>Organization / shared library · Sample</>}
          tone="muted"
        />
        <PostureCard
          title="Private Templates"
          value={priv}
          sub={<>Owner-scoped · Sample</>}
          tone="muted"
        />
        <PostureCard
          title="Assigned Workspaces"
          value={assigned}
          sub={<>Provisioned from custom templates · Sample</>}
          tone="ok"
        />
        <PostureCard
          title="Most Used Template"
          value={<span style={{ fontSize: 15 }}>{mostUsed.name}</span>}
          sub={<>{mostUsed.assignedWorkspaces} workspaces · Sample</>}
          tone="ok"
        />
      </PostureGrid>

      <div style={{ height: 18 }} />

      {/* ── Sub-navigation ── */}
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={sub}
          onChange={setSub}
          options={SUB_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {sub === "versions" ? (
        <Card
          title="Template versions"
          desc="Every published version across all custom templates. Select a row to open the parent template's version history."
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
            <HeaderButton icon={<History size={13} />}>Restore</HeaderButton>
            <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
            <SampleTag />
          </div>
          <DirectoryTable
            columns={versionCols}
            rows={versionRows}
            pageSize={15}
            onRowClick={(r) => setSelId(r.templateId)}
            empty={
              <EmptyState
                icon={<GitBranch size={20} />}
                title="No template versions available."
                hint="Publish a custom template to create its first version."
              />
            }
          />
        </Card>
      ) : (
        <Card
          title="Custom template directory"
          desc="Compose governance, security, compliance, operational, AI and infrastructure configurations into a reusable, business-specific workspace blueprint. Select a row for the full detail drawer."
        >
          {/* ── Toolbar ── */}
          <CommandBar items={toolbar} />

          {/* ── Filters + Search ── */}
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search custom templates — name, description, business unit, owner, tags, workspace type…"
            count={rows.length}
            total={records.filter((r) => matchesSub(r, sub)).length}
            showClear={hasFilters}
            onClear={clearFilters}
          >
            <Select
              label="Category"
              value={fCategory}
              onChange={setFCategory}
              options={facet(records.map((r) => r.category))}
            />
            <Select
              label="Business Unit"
              value={fBu}
              onChange={setFBu}
              options={facet(records.map((r) => r.businessUnit))}
            />
            <Select
              label="Owner"
              value={fOwner}
              onChange={setFOwner}
              options={facet(records.map((r) => r.owner))}
            />
            <Select
              label="Status"
              value={fStatus}
              onChange={setFStatus}
              options={facet(records.map((r) => r.status))}
            />
            <Select
              label="Visibility"
              value={fVisibility}
              onChange={setFVisibility}
              options={facet(records.map((r) => r.visibility))}
            />
            <Select
              label="Version"
              value={fVersion}
              onChange={setFVersion}
              options={facet(records.map((r) => r.version))}
            />
            <Select
              label="Base Template"
              value={fBase}
              onChange={setFBase}
              options={facet(records.map((r) => r.baseTemplate))}
            />
            <Select
              label="Workspace Type"
              value={fType}
              onChange={setFType}
              options={facet(records.map((r) => r.workspaceType))}
            />
          </FilterBar>

          {/* ── Data Table + Row/Bulk actions ── */}
          <DirectoryTable
            columns={cols}
            rows={rows}
            pageSize={15}
            initialSort={{ key: "name", dir: "asc" }}
            onRowClick={(r) => setSelId(r.id)}
            selectable
            bulkActions={(ids, clear) => (
              <>
                <HeaderButton icon={<CheckCircle size={13} />} onClick={clear}>
                  Publish
                </HeaderButton>
                <HeaderButton icon={<Archive size={13} />} onClick={clear}>
                  Archive ({ids.length})
                </HeaderButton>
                <HeaderButton icon={<Share2 size={13} />} onClick={clear}>
                  Share
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
                  { label: "Clone", onClick: () => {} },
                  { label: "Duplicate", onClick: () => {} },
                  { label: "Publish", onClick: () => {} },
                  { label: "Archive", onClick: () => {} },
                  { label: "Share", onClick: () => {} },
                  { label: "Export", onClick: () => {} },
                  {
                    label: "Compare Versions",
                    onClick: () => setSub("versions"),
                  },
                ]}
              />
            )}
            empty={
              <EmptyState
                icon={<Plus size={20} />}
                title="No custom templates available."
                hint="Create a custom template, or import one to get started."
                cta="Create Custom Template"
                onCta={() => setBuilder(true)}
              />
            }
          />
        </Card>
      )}

      {sel && (
        <TemplateDetailDrawer
          rec={sel}
          onClose={() => setSelId(null)}
          onOpen={() => navigate(`/admin/workspaces?tab=requests`)}
        />
      )}

      {builder && <TemplateBuilderDrawer onClose={() => setBuilder(false)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function CustomTemplatesPage() {
  const [builderOpen, setBuilderOpen] = React.useState(false);
  return (
    <Page>
      <PageHeader
        title="Custom Templates"
        subtitle="Create and manage organization-specific workspace templates by composing governance, security, compliance, operational, AI, and infrastructure configurations."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => setBuilderOpen(true)}
            >
              Create Custom Template
            </HeaderButton>
          </>
        }
      />
      <CustomTemplatesView />
      {builderOpen && (
        <TemplateBuilderDrawer onClose={() => setBuilderOpen(false)} />
      )}
    </Page>
  );
}

// ════════════ Custom Template Builder (spec § Toolbar → Create Custom Template wizard) ════════════
function TemplateBuilderDrawer({ onClose }: { onClose: () => void }) {
  return (
    <Drawer
      title="Custom Template Builder"
      subtitle="Compose a reusable, business-specific workspace blueprint"
      width={720}
      onClose={onClose}
      footer={
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <HeaderButton onClick={onClose}>Cancel</HeaderButton>
          <HeaderButton icon={<ClipboardCheck size={13} />}>
            Validate
          </HeaderButton>
          <HeaderButton
            variant="primary"
            icon={<Plus size={13} />}
            onClick={onClose}
          >
            Create Template
          </HeaderButton>
        </div>
      }
    >
      <Section title="Identity">
        <KVGrid
          items={[
            { k: "Template Name", v: "New Custom Template", sample: true },
            {
              k: "Description",
              v: "Business-specific workspace blueprint",
              sample: true,
            },
            { k: "Category", v: pick(CATEGORIES, 3), sample: true },
            { k: "Business Unit", v: pick(BUSINESS_UNITS, 2), sample: true },
            { k: "Workspace Type", v: pick(WORKSPACE_TYPES, 1), sample: true },
          ]}
        />
      </Section>
      <Section title="Inherited templates">
        <KVGrid
          items={[
            { k: "Base Template", v: pick(BASE_TEMPLATES, 0), sample: true },
            {
              k: "Environment Template",
              v: pick(ENVIRONMENT_TEMPLATES, 0),
              sample: true,
            },
            {
              k: "Compliance Template",
              v: pick(COMPLIANCE_TEMPLATES, 0),
              sample: true,
            },
            {
              k: "Operational Template",
              v: pick(OPERATIONAL_TEMPLATES, 0),
              sample: true,
            },
          ]}
        />
      </Section>
      <Section title="Profiles">
        <KVGrid
          items={[
            { k: "AI Profile", v: pick(AI_PROFILES, 1), sample: true },
            {
              k: "Governance Profile",
              v: pick(GOVERNANCE_PROFILES, 0),
              sample: true,
            },
            {
              k: "Security Profile",
              v: pick(SECURITY_PROFILES, 0),
              sample: true,
            },
          ]}
        />
      </Section>
      <Section title="Release">
        <KVGrid
          items={[
            { k: "Version", v: "v1.0", sample: true },
            { k: "Tags", v: "finance, production", sample: true },
          ]}
        />
      </Section>
    </Drawer>
  );
}

// ════════════ Custom Template Detail Drawer — 9 sub-tabs (spec § Custom Template Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "composition", label: "Composition", icon: <Layers size={13} /> },
  { id: "configuration", label: "Configuration", icon: <Settings size={13} /> },
  { id: "overrides", label: "Overrides", icon: <GitCompare size={13} /> },
  { id: "ai", label: "AI Configuration", icon: <Bot size={13} /> },
  { id: "preview", label: "Preview", icon: <Eye size={13} /> },
  { id: "versions", label: "Version History", icon: <History size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <ShieldCheck size={13} /> },
];

function TemplateDetailDrawer({
  rec,
  onClose,
  onOpen,
}: {
  rec: TemplateRecord;
  onClose: () => void;
  onOpen: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      title={rec.name}
      // Drawer header displays: Template Name · Version · Status · Owner · Visibility
      subtitle={`${rec.version} · ${rec.status} · ${rec.owner} · ${rec.visibility}`}
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      onClose={onClose}
      footer={
        // Drawer header quick actions: Edit · Clone · Publish · Share · Export
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <HeaderButton icon={<Settings size={13} />}>Edit</HeaderButton>
          <HeaderButton icon={<Copy size={13} />}>Clone</HeaderButton>
          <HeaderButton icon={<CheckCircle size={13} />}>Publish</HeaderButton>
          <HeaderButton icon={<Share2 size={13} />}>Share</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton
            variant="primary"
            icon={<ArrowRight size={13} />}
            onClick={onOpen}
          >
            Use in Request
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "composition" && <CompositionTab rec={rec} />}
      {tab === "configuration" && <ConfigurationTab rec={rec} />}
      {tab === "overrides" && <OverridesTab rec={rec} />}
      {tab === "ai" && <AiConfigTab rec={rec} />}
      {tab === "preview" && <PreviewTab rec={rec} />}
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

// ── Overview (General · Statistics · Sharing) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
  { id: "sharing", label: "Sharing" },
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
              { k: "Description", v: rec.description, sample: true },
              { k: "Category", v: rec.category },
              { k: "Workspace Type", v: rec.workspaceType },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Owner", v: rec.owner },
              { k: "Visibility", v: rec.visibility },
              { k: "Version", v: rec.version },
              { k: "Status", v: <StatusBadge status={rec.status} /> },
              { k: "Created", v: rec.created },
              { k: "Modified", v: rec.modified },
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
                k: "Assigned Workspaces",
                v: rec.assignedWorkspaces,
                sample: true,
              },
              {
                k: "Inherited Templates",
                v: rec.inheritedTemplates,
                sample: true,
              },
              { k: "Overrides", v: rec.overrides, sample: true },
              { k: "Policies", v: rec.policies, sample: true },
              {
                k: "Compliance Frameworks",
                v: rec.complianceFrameworks,
                sample: true,
              },
              { k: "Automation Rules", v: rec.automationRules, sample: true },
            ]}
          />
        </Section>
      )}
      {sub === "sharing" && (
        <Section title="Sharing" sample>
          <StatRow
            label="Current Visibility"
            value={rec.visibility}
            tone={rec.visibility === "Private" ? "muted" : "ok"}
            sample
          />
          <StatRow
            label="Visibility Levels"
            value="Private · Business Unit · Organization · Shared Library"
            sample
          />
          <ToolbarRow buttons={["Share", "Unshare", "Transfer Ownership"]} />
        </Section>
      )}
    </>
  );
}

// ── Composition (spec § Composition + Dependency Viewer) ──
const COMPOSITION_SUBS = [
  { id: "composed", label: "Composed Platform Templates" },
  { id: "chain", label: "Composition Chain" },
  { id: "dependency-viewer", label: "Dependency Viewer" },
];
function CompositionTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("composed");
  return (
    <>
      <Tabs tabs={COMPOSITION_SUBS} active={sub} onChange={setSub} />
      {sub === "composed" && (
        <Section title="Composed platform templates" sample>
          <StatRow
            label="Enterprise Template"
            value={rec.baseTemplate}
            sample
          />
          <StatRow
            label="Environment Template"
            value={rec.environmentTemplate}
            sample
          />
          <StatRow
            label="Compliance Template"
            value={rec.complianceTemplate}
            sample
          />
          <StatRow
            label="Operational Template"
            value={rec.operationalTemplate}
            sample
          />
          <StatRow
            label="Governance Profile"
            value={rec.governanceProfile}
            sample
          />
          <StatRow
            label="Security Profile"
            value={rec.securityProfile}
            sample
          />
          <StatRow label="AI Profile" value={rec.aiProfile} sample />
        </Section>
      )}
      {sub === "chain" && (
        <Section title="Composition chain">
          <FlowChain
            nodes={[
              "Enterprise Template",
              "Environment Template",
              "Compliance Template",
              "Operational Template",
              "Custom Overrides",
              "Final Workspace Template",
            ]}
          />
        </Section>
      )}
      {sub === "dependency-viewer" && (
        <Section title="Dependency viewer" sample>
          <FlowChain
            nodes={[
              "Enterprise Template",
              "Environment Template",
              "Compliance Template",
              "Operational Template",
              "Custom Template",
              "Workspace",
            ]}
          />
          <div style={{ fontSize: 12, color: T.textMuted, paddingTop: 6 }}>
            Selecting any component displays inherited configuration and
            dependencies.
          </div>
        </Section>
      )}
    </>
  );
}

// ── Configuration (spec § Configuration: effective config across 13 domains) ──
const CONFIG_DOMAINS: { k: string; v: string }[] = [
  { k: "Workspace Metadata", v: "Name, owner, business unit, tags" },
  { k: "Governance", v: "Strict profile · 6 inherited policies" },
  { k: "Identity", v: "SSO required · MFA enforced · SCIM sync" },
  { k: "Platform Security", v: "Maximum profile · CMEK · HYOK" },
  { k: "Compliance", v: "PCI DSS + SOC 2 · quarterly assessment" },
  { k: "Automation", v: "8 automation rules · drift auto-remediation" },
  { k: "Operations", v: "24/7 SOC · on-call rotation" },
  { k: "Networking", v: "Private endpoints · egress allowlist" },
  { k: "AI Configuration", v: "Governed profile · approved models only" },
  { k: "Resource Limits", v: "Standard tier · 30 accounts max" },
  { k: "Monitoring", v: "Full telemetry · 90-day retention" },
  { k: "Notifications", v: "Novu · 3 channels · HITL gate" },
  { k: "Integrations", v: "AWS · Azure · GitHub · ServiceNow" },
];
function ConfigurationTab({ rec }: { rec: TemplateRecord }) {
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
        Complete effective configuration for {rec.name} <SampleTag />
      </div>
      <ToolbarRow buttons={["Edit", "Validate", "Preview"]} />
      <Section title="Configuration domains" sample>
        {CONFIG_DOMAINS.map((d) => (
          <StatRow key={d.k} label={d.k} value={d.v} sample />
        ))}
      </Section>
    </>
  );
}

// ── Overrides (spec § Overrides) ──
function OverridesTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
  const rows = Array.from({ length: 3 + (n % 4) }, (_, i) => ({
    id: `${rec.id}-ovr-${i}`,
    setting: pick(
      [
        "MFA Enforcement",
        "Egress Policy",
        "Data Residency",
        "Log Retention",
        "Approved AI Models",
        "Session Timeout",
      ],
      n + i,
    ),
    inherited: pick(
      ["Recommended", "30 days", "us-east-1", "Optional", "Any", "60 min"],
      n + i,
    ),
    custom: pick(
      ["Mandatory", "90 days", "eu-west-1", "Enforced", "Allowlist", "15 min"],
      n + i + 1,
    ),
    source: pick(
      ["Compliance Template", "Governance Profile", "Custom Override"],
      n + i,
    ),
    modifiedBy: pick(OWNERS, n + i),
    modifiedDate: `2026-0${1 + (i % 6)}-1${i % 9}`,
  }));
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "setting", header: "Setting", render: (r) => r.setting },
    {
      key: "inherited",
      header: "Inherited Value",
      render: (r) => <span style={{ color: T.textMuted }}>{r.inherited}</span>,
    },
    {
      key: "custom",
      header: "Custom Value",
      render: (r) => <span style={{ color: T.textPrimary }}>{r.custom}</span>,
    },
    { key: "source", header: "Override Source", render: (r) => r.source },
    { key: "by", header: "Modified By", render: (r) => r.modifiedBy },
    { key: "date", header: "Modified Date", render: (r) => r.modifiedDate },
  ];
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
        Every configuration that differs from inherited templates <SampleTag />
      </div>
      <ToolbarRow
        buttons={["Show Differences", "Remove Override", "Reset to Parent"]}
      />
      <DirectoryTable columns={cols} rows={rows} />
      <div style={{ height: 18 }} />
      <Section title="Override resolution">
        <FlowChain
          nodes={[
            "Inherited Configuration",
            "Custom Override",
            "Effective Configuration",
          ]}
        />
      </Section>
    </>
  );
}

// ── AI Configuration (spec § AI Configuration) ──
function AiConfigTab({ rec }: { rec: TemplateRecord }) {
  return (
    <Section title="Workspace AI defaults" sample>
      <KVGrid
        items={[
          { k: "AI Runtime", v: "cloudguard-runtime:latest", sample: true },
          {
            k: "Approved Models",
            v: "Claude Opus · Sonnet · Haiku",
            sample: true,
          },
          {
            k: "Prompt Policies",
            v: "PII redaction · injection screen",
            sample: true,
          },
          {
            k: "Knowledge Sources",
            v: "Org KB · Compliance library",
            sample: true,
          },
          {
            k: "Agent Policies",
            v: `${rec.aiProfile} · scoped tools`,
            sample: true,
          },
          {
            k: "Execution Profiles",
            v: "Sandboxed · fail-closed",
            sample: true,
          },
          {
            k: "Guardrails",
            v: "Output filter · secret redaction",
            sample: true,
          },
          {
            k: "Safety Policies",
            v: "HITL gate · deny-unknown RBAC",
            sample: true,
          },
        ]}
      />
    </Section>
  );
}

// ── Preview (spec § Preview) ──
function PreviewTab({ rec }: { rec: TemplateRecord }) {
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
        Preview the workspace before publication <SampleTag />
      </div>
      <Section title="Preview" sample>
        <StatRow
          label="Workspace Summary"
          value={`${rec.workspaceType} · ${rec.businessUnit}`}
          sample
        />
        <StatRow
          label="Effective Policies"
          value={`${rec.policies} policies`}
          sample
        />
        <StatRow
          label="Compliance Coverage"
          value={`${rec.complianceTemplate} · ${rec.complianceFrameworks} frameworks`}
          tone="ok"
          sample
        />
        <StatRow
          label="Resource Allocation"
          value="Standard tier · 30 accounts"
          sample
        />
        <StatRow
          label="AI Configuration"
          value={`${rec.aiProfile} profile`}
          sample
        />
        <StatRow
          label="Security Configuration"
          value={`${rec.securityProfile} profile`}
          tone="ok"
          sample
        />
        <StatRow label="Provisioning Time" value="~ 4 minutes" sample />
      </Section>
      <ToolbarRow
        buttons={["Validate", "Simulate Provisioning", "Export Preview"]}
      />
    </>
  );
}

// ── Version History (spec § Version History) ──
function VersionHistoryTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
  const rows = VERSIONS.slice(0, 3 + (n % 3)).map((v, i) => ({
    id: `${rec.id}-vh-${v}`,
    version: v,
    published: `2026-0${1 + (i % 6)}-1${i % 9}`,
    publishedBy: pick(OWNERS, n + i),
    status: i === 0 ? "Current" : "Superseded",
    notes: pick(
      [
        "Initial composition",
        "Tightened security profile",
        "Added compliance overrides",
        "Updated AI guardrails",
        "Governance floor raised",
      ],
      n + i,
    ),
  }));
  const cols: Column<(typeof rows)[number]>[] = [
    {
      key: "version",
      header: "Version",
      render: (r) => (
        <span style={{ fontFamily: "monospace" }}>{r.version}</span>
      ),
    },
    { key: "published", header: "Published", render: (r) => r.published },
    { key: "by", header: "Published By", render: (r) => r.publishedBy },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Current" ? T.success : T.textMuted }}
        >
          {r.status}
        </span>
      ),
    },
    { key: "notes", header: "Notes", render: (r) => r.notes },
  ];
  return (
    <>
      <ToolbarRow buttons={["Compare", "Restore", "Export"]} sample />
      <DirectoryTable columns={cols} rows={rows} />
      <div style={{ height: 18 }} />
      <Section title="Comparison view">
        <FlowChain
          nodes={["Version 1.2", "Configuration Differences", "Version 2.0"]}
        />
      </Section>
    </>
  );
}

// ── Activity (spec § Activity: timeline + filters) ──
function ActivityTab() {
  const events = [
    "Template Created",
    "Inherited Template Changed",
    "Override Added",
    "Version Published",
    "Template Assigned",
    "Archived",
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
          options={[{ value: "", label: "Actor: All" }]}
        />
        <Select
          label="Category"
          value=""
          onChange={() => {}}
          options={[{ value: "", label: "Category: All" }]}
        />
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[{ value: "", label: "Date: All" }]}
        />
        <SampleTag />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
      </div>
    </>
  );
}

// ── Audit History (spec § Audit History: immutable, read-only) ──
function AuditTab() {
  const events = [
    "Template Created",
    "Configuration Modified",
    "Override Added",
    "Override Removed",
    "Version Published",
    "Shared",
    "Exported",
    "Assigned",
    "Archived",
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
          value={`${pick(OWNERS, i)} · 2026-06-${10 + i}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

// ── Shared: vertical flow-chain visualization (composition / dependency / comparison) ──
function FlowChain({ nodes }: { nodes: string[] }) {
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
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: i === nodes.length - 1 ? T.textPrimary : T.textNav,
              fontWeight: i === nodes.length - 1 ? 600 : 400,
              background:
                i === nodes.length - 1
                  ? "var(--cg-accent-bg-strong)"
                  : "transparent",
            }}
          >
            <Boxes size={13} color={T.textMuted} />
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

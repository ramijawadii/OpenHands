/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Workspace Templates → Compliance Templates */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Download,
  Upload,
  Copy,
  Archive,
  RefreshCcw,
  ClipboardCheck,
  FileText,
  LayoutGrid,
  GitBranch,
  GitCompare,
  ShieldCheck,
  History,
  AlertTriangle,
  Activity as ActivityIcon,
  Scale,
  Send,
  Star,
  Eye,
  ListChecks,
  Database,
  Workflow,
  Layers,
  PenLine,
  CheckCheck,
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
 * Compliance Templates — reusable compliance blueprints (regulatory posture, control assignments,
 * assessment schedules, evidence collection, reporting configuration, remediation policies) that are
 * automatically applied to newly provisioned workspaces. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/01_Workspace Templates/compliance_templates.md.
 *
 * Compliance Templates define HOW a workspace is governed from a compliance perspective (distinct
 * from Enterprise Templates, which define the workspace, and Environment Templates, which define
 * operational behavior). They are centrally managed, version-controlled and reusable across the
 * organization. This view reuses the Enterprise-Administration UX pattern shared with the Users
 * module (Banner · Toolbar · Filters · Search · Data Table · Bulk/Row actions · Template Detail
 * Drawer with 11 sub-tabs) plus the spec dashboards (Operational Dashboard, Compliance Coverage
 * Matrix, Template Relationships).
 *
 * There is no template backend yet, so the template set is representative sample data (tagged
 * `Sample` in the UI). When admin/org_model.py + the compliance-template engine land, swap
 * SAMPLE_TEMPLATES for the live query — the component API stays identical.
 */

// ── Status model (drives the sub-navigation) ──────────────────────────────────────────────────────
type Status = "Active" | "Draft" | "Published" | "Deprecated" | "Archived";

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Draft: T.warning,
  Published: T.accent,
  Deprecated: T.warning,
  Archived: T.textMuted,
};

// Navigation (spec §Navigation): Active · Draft · Published · Deprecated · Archived · Versions.
const NAV_TABS = [
  { id: "active", label: "Active Templates", Icon: CheckCheck },
  { id: "draft", label: "Draft Templates", Icon: PenLine },
  { id: "published", label: "Published", Icon: Send },
  { id: "deprecated", label: "Deprecated", Icon: AlertTriangle },
  { id: "archived", label: "Archived", Icon: Archive },
  { id: "versions", label: "Versions", Icon: GitBranch },
];

// map sub-nav id → status filter (versions is a dedicated cross-template view)
const TAB_STATUS: Record<string, Status | null> = {
  active: "Active",
  draft: "Draft",
  published: "Published",
  deprecated: "Deprecated",
  archived: "Archived",
  versions: null,
};

const INDUSTRIES = [
  "Financial",
  "Healthcare",
  "Government",
  "Technology",
  "Retail",
  "Manufacturing",
];
const CATEGORIES = ["Regulatory", "Security Baseline", "Industry", "Internal"];
const COMPLIANCE_TIERS = ["Enterprise", "Regulated", "Standard", "Baseline"];
const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const FRAMEWORK_POOL = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
  "CIS Controls",
  "FedRAMP",
  "GDPR",
];
// Regulatory programs (spec §Regulatory Programs → Examples).
const REGULATORY_PROGRAMS = [
  "GDPR",
  "HIPAA",
  "PCI DSS",
  "SOC 2",
  "ISO 27001",
  "NIST CSF",
  "CIS Controls",
  "FedRAMP",
  "NIS2",
  "DORA",
  "CCPA",
  "PDPL",
];
// Evidence categories (spec §Evidence Collection → Categories).
const EVIDENCE_CATEGORIES = [
  "Cloud Configuration",
  "IAM",
  "Network Security",
  "Encryption",
  "Logging",
  "Vulnerability Data",
  "Assets",
  "Policies",
  "Audit Logs",
  "AI Assessments",
];
const AUTHORS = [
  "Alice Smith",
  "David Chen",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
];

// Named blueprints (spec §Purpose → Examples, plus the table example "Financial Production").
const TEMPLATE_NAMES = [
  "Enterprise Security Baseline",
  "PCI DSS Production",
  "Healthcare (HIPAA)",
  "Financial Services",
  "Government Cloud",
  "ISO 27001 Enterprise",
  "SOC 2 SaaS",
  "Internal Baseline",
  "Financial Production",
  "Retail Cardholder Data",
  "EU Data Residency (GDPR)",
  "FedRAMP Moderate",
  "Manufacturing OT Security",
  "Platform Default Baseline",
];

interface TemplateRecord {
  id: string;
  name: string;
  description: string;
  industry: string;
  category: string;
  complianceTier: string;
  businessUnit: string;
  frameworks: string[];
  version: string;
  isDefault: boolean;
  status: Status;
  created: string;
  modified: string;
  updatedLabel: string;
  // statistics
  frameworkCount: number;
  controls: number;
  policies: number;
  evidenceSources: number;
  automationRules: number;
  assignedWorkspaces: number;
  regulatoryPrograms: number;
  assessmentSuccess: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative template set (~14 blueprints).
const SAMPLE_TEMPLATES: TemplateRecord[] = TEMPLATE_NAMES.map((name, i) => {
  const id = `CT-${(1040 + i * 3).toString().padStart(5, "0")}`;
  const n = hashId(id);
  const status = pick<Status>(
    [
      "Active",
      "Published",
      "Published",
      "Draft",
      "Active",
      "Deprecated",
      "Archived",
    ],
    n,
  );
  const fwCount = 2 + (n % 3);
  const frameworks = Array.from({ length: fwCount }, (_, k) =>
    pick(FRAMEWORK_POOL, n + k),
  ).filter((v, k, a) => a.indexOf(v) === k);
  const major = 2 + (n % 5);
  const minor = n % 4;
  return {
    id,
    name,
    description: `${name} compliance blueprint — standardizes regulatory posture, control baseline, assessment schedule and evidence collection for provisioned workspaces.`,
    industry: pick(INDUSTRIES, n),
    category: pick(CATEGORIES, n >> 2),
    complianceTier: pick(COMPLIANCE_TIERS, n >> 1),
    businessUnit: pick(BUSINESS_UNITS, n >> 3),
    frameworks,
    version: `v${major}.${minor}`,
    isDefault: n % 4 === 0,
    status,
    created: `2025-1${1 + (n % 2)}-0${1 + (n % 8)}`,
    modified: `2026-0${1 + (n % 6)}-${(10 + (n % 18)).toString()}`,
    updatedLabel: pick(
      ["Yesterday", "2 days ago", "Last week", "3 hours ago", "Today"],
      n,
    ),
    frameworkCount: frameworks.length,
    controls: 80 + (n % 240),
    policies: 12 + (n % 40),
    evidenceSources: 4 + (n % 10),
    automationRules: 3 + (n % 12),
    assignedWorkspaces: n % 60,
    regulatoryPrograms: 2 + (n % 6),
    assessmentSuccess: 82 + (n % 18),
  };
});

const TIER_TONE: Record<string, string> = {
  Enterprise: T.accent,
  Regulated: T.warning,
  Standard: T.textNav,
  Baseline: T.textMuted,
};

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

function FrameworkChips({ items }: { items: string[] }) {
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
      {items.map((f) => (
        <span
          key={f}
          style={{
            fontSize: 10.5,
            padding: "1px 6px",
            borderRadius: 5,
            border: `1px solid ${T.border}`,
            color: T.textNav,
            whiteSpace: "nowrap",
          }}
        >
          {f}
        </span>
      ))}
    </span>
  );
}

/**
 * Embeddable body — sub-navigation + operational dashboard + directory + spec dashboards + template
 * detail drawer, WITHOUT the outer <Page> or the page banner. Rendered both as the standalone route
 * and as a tab of the Workspace Templates console. Uses local state for the status sub-nav so it
 * never collides with a host page's `?tab=` param.
 */
export function ComplianceTemplatesView() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("active");

  // Filters (spec §Filters)
  const [search, setSearch] = React.useState("");
  const [fIndustry, setFIndustry] = React.useState("");
  const [fFramework, setFFramework] = React.useState("");
  const [fTier, setFTier] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fVersion, setFVersion] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fDefault, setFDefault] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_TEMPLATES;
  const tabStatus = TAB_STATUS[tab];
  const isVersions = tab === "versions";

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!tabStatus || r.status === tabStatus) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.industry.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.version.toLowerCase().includes(q) ||
        r.frameworks.join(" ").toLowerCase().includes(q)) &&
      (!fIndustry || r.industry === fIndustry) &&
      (!fFramework || r.frameworks.includes(fFramework)) &&
      (!fTier || r.complianceTier === fTier) &&
      (!fStatus || r.status === fStatus) &&
      (!fVersion || r.version === fVersion) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fDefault || (fDefault === "Yes") === r.isDefault)
    );
  });
  const hasFilters = !!(
    search ||
    fIndustry ||
    fFramework ||
    fTier ||
    fStatus ||
    fVersion ||
    fBu ||
    fDefault
  );
  const clearFilters = () => {
    setSearch("");
    setFIndustry("");
    setFFramework("");
    setFTier("");
    setFStatus("");
    setFVersion("");
    setFBu("");
    setFDefault("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational Dashboard (spec §Operational Dashboard) ──
  const published = records.filter(
    (r) => r.status === "Published" || r.status === "Active",
  ).length;
  const frameworksCovered = new Set(records.flatMap((r) => r.frameworks)).size;
  const controlsIncluded = records.reduce((a, r) => a + r.controls, 0);
  const assignedWorkspaces = records.reduce(
    (a, r) => a + r.assignedWorkspaces,
    0,
  );
  const evidenceSources = records.reduce((a, r) => a + r.evidenceSources, 0);
  const automationRules = records.reduce((a, r) => a + r.automationRules, 0);
  const avgSuccess = Math.round(
    records.reduce((a, r) => a + r.assessmentSuccess, 0) / records.length,
  );

  // ── Toolbar (spec §Toolbar: Create · Administrative · Validation) ──
  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Compliance Template",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=templates"),
    },
    { key: "clone", label: "Clone", icon: <Copy size={15} />, disabled: true },
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
      key: "deprecate",
      label: "Deprecate",
      icon: <AlertTriangle size={15} />,
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
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Template",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "preview",
      label: "Preview Controls",
      icon: <Eye size={15} />,
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

  // ── Table columns (spec §Table → Columns, exactly) ──
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
          <ShieldCheck size={14} color={T.textMuted} />
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
      key: "industry",
      header: "Industry",
      sortValue: (r) => r.industry,
      render: (r) => r.industry,
    },
    {
      key: "frameworks",
      header: "Frameworks",
      render: (r) => <FrameworkChips items={r.frameworks} />,
    },
    {
      key: "tier",
      header: "Compliance Tier",
      sortValue: (r) => r.complianceTier,
      render: (r) => (
        <span style={{ color: TIER_TONE[r.complianceTier] ?? T.textNav }}>
          {r.complianceTier}
        </span>
      ),
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
            <Star size={12} /> Yes
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
      header: "Updated",
      sortValue: (r) => r.modified,
      render: (r) => (
        <span style={{ color: T.textMuted }}>{r.updatedLabel}</span>
      ),
    },
  ];

  return (
    <>
      {/* ── Status sub-navigation ── */}
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={tab}
          onChange={setTab}
          options={NAV_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {/* ── Operational Dashboard ── */}
      <Card
        title="Operational dashboard"
        desc="Compliance-template estate at a glance — coverage, adoption and automation across the organization."
      >
        <PostureGrid>
          <PostureCard
            title="Published Templates"
            value={published}
            sub={<SampleTag />}
            tone="ok"
          />
          <PostureCard
            title="Frameworks Covered"
            value={frameworksCovered}
            sub={<SampleTag />}
            tone="muted"
          />
          <PostureCard
            title="Controls Included"
            value={controlsIncluded.toLocaleString()}
            sub={<SampleTag />}
            tone="muted"
          />
          <PostureCard
            title="Assigned Workspaces"
            value={assignedWorkspaces}
            sub={<SampleTag />}
            tone="muted"
          />
          <PostureCard
            title="Assessment Success Rate"
            value={`${avgSuccess}%`}
            sub={<SampleTag />}
            tone={avgSuccess >= 90 ? "ok" : "warn"}
          />
          <PostureCard
            title="Evidence Sources"
            value={evidenceSources}
            sub={<SampleTag />}
            tone="muted"
          />
          <PostureCard
            title="Automation Rules"
            value={automationRules}
            sub={<SampleTag />}
            tone="muted"
          />
        </PostureGrid>
      </Card>

      {isVersions ? (
        <VersionsCard records={records} onOpen={(id) => setSelId(id)} />
      ) : (
        <Card
          title="Compliance template library"
          desc="Reusable compliance blueprints applied during workspace provisioning and throughout the workspace lifecycle. Select a row for the full detail drawer and lifecycle actions."
        >
          {/* ── Toolbar ── */}
          <CommandBar items={toolbar} />

          {/* ── Filters + Search ── */}
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search compliance templates — name, framework, industry, description, tags, version…"
            count={rows.length}
            total={records.length}
            showClear={hasFilters}
            onClear={clearFilters}
          >
            <Select
              label="Industry"
              value={fIndustry}
              onChange={setFIndustry}
              options={facet(records.map((r) => r.industry))}
            />
            <Select
              label="Framework"
              value={fFramework}
              onChange={setFFramework}
              options={facet(records.flatMap((r) => r.frameworks))}
            />
            <Select
              label="Compliance Tier"
              value={fTier}
              onChange={setFTier}
              options={facet(records.map((r) => r.complianceTier))}
            />
            <Select
              label="Status"
              value={fStatus}
              onChange={setFStatus}
              options={facet(records.map((r) => r.status))}
            />
            <Select
              label="Version"
              value={fVersion}
              onChange={setFVersion}
              options={facet(records.map((r) => r.version))}
            />
            <Select
              label="Business Unit"
              value={fBu}
              onChange={setFBu}
              options={facet(records.map((r) => r.businessUnit))}
            />
            <Select
              label="Default"
              value={fDefault}
              onChange={setFDefault}
              options={[
                { value: "", label: "All" },
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
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
                <HeaderButton icon={<Send size={13} />} onClick={clear}>
                  Publish ({ids.length})
                </HeaderButton>
                <HeaderButton icon={<Archive size={13} />} onClick={clear}>
                  Archive
                </HeaderButton>
                <HeaderButton icon={<Star size={13} />} onClick={clear}>
                  Assign Default
                </HeaderButton>
                <HeaderButton icon={<Download size={13} />} onClick={clear}>
                  Export
                </HeaderButton>
              </>
            )}
            rowActions={(r) => (
              <RowMenu
                items={[
                  { label: "Open", onClick: () => setSelId(r.id) },
                  { label: "Edit", onClick: () => setSelId(r.id) },
                  { label: "Clone", onClick: () => {} },
                  { label: "Publish", onClick: () => setSelId(r.id) },
                  { label: "Archive", onClick: () => {} },
                  { label: "Compare Versions", onClick: () => setSelId(r.id) },
                  { label: "Export", onClick: () => {} },
                ]}
              />
            )}
            empty={
              <EmptyState
                icon={<Plus size={20} />}
                title="No compliance templates available."
                hint="Adjust filters, or create / import a compliance template to get started."
                cta="Create Compliance Template"
                onCta={() => navigate("/admin/workspaces?tab=templates")}
              />
            }
          />
        </Card>
      )}

      {/* ── Compliance Coverage Matrix (spec §Compliance Coverage Matrix) ── */}
      <Card
        title="Compliance coverage matrix"
        desc="Understand complete compliance coverage — regulation through report — before assigning a template."
      >
        <FlowChain
          nodes={[
            "Regulation",
            "Framework",
            "Control",
            "Policy",
            "Assessment",
            "Evidence",
            "Report",
          ]}
          sample
        />
      </Card>

      {/* ── Template Relationships (spec §Template Relationships) ── */}
      <Card
        title="Template relationships"
        desc="Compliance Templates establish the compliance baseline inherited by workspaces while allowing additional framework assignments or workspace-specific exceptions per organizational governance."
      >
        <FlowChain
          nodes={[
            "Organization Compliance Center",
            "Compliance Template",
            "Enterprise Template",
            "Environment Template",
            "Workspace",
            "Compliance Assessments",
          ]}
        />
      </Card>

      {sel && <TemplateDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function ComplianceTemplatesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Compliance Templates"
        subtitle="Manage reusable compliance configurations used during workspace provisioning and governance."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=templates")}
            >
              Create Compliance Template
            </HeaderButton>
          </>
        }
      />
      <ComplianceTemplatesView />
    </Page>
  );
}

// ── Vertical flow-chain (coverage matrix, relationships, comparison) ──
function FlowChain({ nodes, sample }: { nodes: string[]; sample?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sample && (
        <div style={{ marginBottom: 2 }}>
          <SampleTag />
        </div>
      )}
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

// ── Versions sub-nav view — cross-template version registry (spec §Version History) ──
interface VersionRow {
  id: string;
  templateId: string;
  template: string;
  version: string;
  published: string;
  publishedBy: string;
  status: string;
  notes: string;
}

function VersionsCard({
  records,
  onOpen,
}: {
  records: TemplateRecord[];
  onOpen: (id: string) => void;
}) {
  const versions: VersionRow[] = records.flatMap((r) => {
    const n = hashId(r.id);
    const major = parseInt(
      r.version.replace(/[^0-9]/g, "").charAt(0) || "1",
      10,
    );
    return Array.from({ length: 3 }, (_, k) => {
      const v = major - k;
      const st = k === 0 ? r.status : k === 1 ? "Deprecated" : "Archived";
      return {
        id: `${r.id}-v${v}`,
        templateId: r.id,
        template: r.name,
        version: `v${v}.${(n + k) % 5}`,
        published: `2026-0${1 + ((n + k) % 6)}-${(10 + ((n + k) % 15)).toString()}`,
        publishedBy: pick(AUTHORS, n + k),
        status: st,
        notes: pick(
          [
            "Initial baseline",
            "Framework mapping refresh",
            "Control baseline expansion",
            "Evidence source additions",
            "Automation policy update",
          ],
          n + k,
        ),
      };
    });
  });
  const cols: Column<VersionRow>[] = [
    {
      key: "template",
      header: "Template",
      sortValue: (r) => r.template,
      render: (r) => r.template,
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
      render: (r) => r.status,
    },
    { key: "notes", header: "Notes", render: (r) => r.notes },
  ];
  return (
    <Card
      title="Version registry"
      desc="Every published version across all compliance templates. Compare or restore any prior version."
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
        columns={cols}
        rows={versions}
        pageSize={15}
        initialSort={{ key: "published", dir: "desc" }}
        onRowClick={(r) => onOpen(r.templateId)}
      />
    </Card>
  );
}

// ════════════ Compliance Template Detail Drawer — 11 sub-tabs (spec §Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "programs", label: "Regulatory Programs", icon: <Scale size={13} /> },
  { id: "mapping", label: "Framework Mapping", icon: <Layers size={13} /> },
  { id: "baseline", label: "Control Baseline", icon: <ListChecks size={13} /> },
  {
    id: "assessment",
    label: "Assessment Configuration",
    icon: <ClipboardCheck size={13} />,
  },
  {
    id: "evidence",
    label: "Evidence Collection",
    icon: <Database size={13} />,
  },
  { id: "reporting", label: "Reporting", icon: <FileText size={13} /> },
  { id: "automation", label: "Automation", icon: <Workflow size={13} /> },
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
      // Drawer header displays: Name · Version · Status · Compliance Tier · Framework Count.
      subtitle={`${rec.version} · ${rec.status} · ${rec.complianceTier} tier · ${rec.frameworkCount} frameworks`}
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
          <HeaderButton icon={<PenLine size={13} />}>Edit</HeaderButton>
          <HeaderButton icon={<Copy size={13} />}>Clone</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton variant="primary" icon={<Send size={13} />}>
            Publish
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "programs" && <ProgramsTab rec={rec} />}
      {tab === "mapping" && <MappingTab rec={rec} />}
      {tab === "baseline" && <BaselineTab rec={rec} />}
      {tab === "assessment" && <AssessmentTab rec={rec} />}
      {tab === "evidence" && <EvidenceTab rec={rec} />}
      {tab === "reporting" && <ReportingTab rec={rec} />}
      {tab === "automation" && <AutomationTab rec={rec} />}
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
              { k: "Industry", v: rec.industry },
              { k: "Category", v: rec.category },
              { k: "Compliance Tier", v: rec.complianceTier },
              { k: "Version", v: rec.version },
              { k: "Status", v: rec.status },
              { k: "Created", v: rec.created, sample: true },
              { k: "Modified", v: rec.modified, sample: true },
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
              { k: "Frameworks", v: rec.frameworkCount, sample: true },
              { k: "Controls", v: rec.controls, sample: true },
              { k: "Policies", v: rec.policies, sample: true },
              { k: "Evidence Sources", v: rec.evidenceSources, sample: true },
              { k: "Automation Rules", v: rec.automationRules, sample: true },
              {
                k: "Assigned Workspaces",
                v: rec.assignedWorkspaces,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Regulatory Programs — applicable regulatory obligations ──
function ProgramsTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
  const rows = REGULATORY_PROGRAMS.map((program, i) => ({
    id: `${rec.id}-prog-${i}`,
    program,
    applicability: i < rec.regulatoryPrograms ? "Applicable" : "Not applicable",
    obligations: 4 + ((n + i) % 30),
    status: i < rec.regulatoryPrograms ? "Enforced" : "Available",
  }));
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "program", header: "Regulatory Program", render: (r) => r.program },
    {
      key: "applicability",
      header: "Applicability",
      render: (r) => (
        <span
          style={{
            color:
              r.applicability === "Applicable" ? T.textPrimary : T.textMuted,
          }}
        >
          {r.applicability}
        </span>
      ),
    },
    {
      key: "obligations",
      header: "Obligations",
      render: (r) => r.obligations,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{
            color: r.status === "Enforced" ? T.success : T.textMuted,
          }}
        >
          {r.status}
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
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Applicable regulatory obligations for this template <SampleTag />
      </div>
      <ToolbarRow
        buttons={["Add Program", "Remove Program", "Preview Impact"]}
      />
      <DirectoryTable columns={cols} rows={rows} pageSize={12} />
    </>
  );
}

// ── Framework Mapping — regulatory obligations → security frameworks ──
function MappingTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
  const rows = rec.frameworks.map((framework, i) => {
    const mapped = 40 + ((n + i) % 120);
    const coverage = 78 + ((n + i) % 22);
    return {
      id: `${rec.id}-fw-${i}`,
      framework,
      version: pick(["2022", "2013", "v2.0", "Rev.5", "v8"], n + i),
      mappedControls: mapped,
      coverage,
      status: coverage >= 95 ? "Complete" : "Partial",
    };
  });
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "framework", header: "Framework", render: (r) => r.framework },
    { key: "version", header: "Version", render: (r) => r.version },
    {
      key: "mapped",
      header: "Mapped Controls",
      render: (r) => `${r.mappedControls} Controls`,
    },
    {
      key: "coverage",
      header: "Coverage",
      render: (r) => (
        <span style={{ color: r.coverage >= 95 ? T.success : T.warning }}>
          {r.coverage}% Coverage
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Complete" ? T.success : T.warning }}
        >
          {r.status}
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
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Regulatory obligations mapped to security frameworks <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={rows} />
      <Section title="Example mapping" sample>
        <FlowChain
          nodes={["ISO 27001", "Annex A", "114 Controls", "100% Coverage"]}
        />
      </Section>
    </>
  );
}

// ── Control Baseline — controls automatically assigned ──
function BaselineTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
  const mandatory = Math.round(rec.controls * 0.55);
  const recommended = Math.round(rec.controls * 0.25);
  const custom = 4 + (n % 12);
  const inherited = Math.round(rec.controls * 0.15);
  const exceptions = n % 6;
  return (
    <>
      <Section title="Control baseline" sample>
        <StatRow
          label="Mandatory Controls"
          value={`${mandatory} controls`}
          tone="ok"
          sample
        />
        <StatRow
          label="Recommended Controls"
          value={`${recommended} controls`}
          sample
        />
        <StatRow label="Custom Controls" value={`${custom} controls`} sample />
        <StatRow
          label="Inherited Controls"
          value={`${inherited} controls`}
          sample
        />
        <StatRow
          label="Exceptions"
          value={`${exceptions} exceptions`}
          tone={exceptions === 0 ? "ok" : "warn"}
          sample
        />
      </Section>
      <ToolbarRow
        buttons={["Assign Controls", "Remove Controls", "Compare Baselines"]}
      />
    </>
  );
}

// ── Assessment Configuration — compliance assessment behavior ──
const ASSESSMENT_SUBS = [
  { id: "assessment-configuration", label: "Assessment configuration" },
  { id: "assessment-cadence", label: "Assessment cadence" },
];
function AssessmentTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("assessment-configuration");
  const n = hashId(rec.id);
  return (
    <>
      <Tabs tabs={ASSESSMENT_SUBS} active={sub} onChange={setSub} />
      {sub === "assessment-configuration" && (
        <Section title="Assessment configuration" sample>
          <StatRow
            label="Assessment Schedule"
            value="Quarterly Audit · Annual Certification"
            sample
          />
          <StatRow
            label="Continuous Monitoring"
            value={n % 3 === 0 ? "Disabled" : "Enabled"}
            tone={n % 3 === 0 ? "warn" : "ok"}
            sample
          />
          <StatRow label="Manual Reviews" value="Monthly review board" sample />
          <StatRow
            label="Evidence Validation"
            value="Weekly Validation"
            tone="ok"
            sample
          />
          <StatRow
            label="Risk Thresholds"
            value="High ≥ 7.0 · Critical ≥ 9.0"
            sample
          />
          <StatRow label="Exceptions" value={`${n % 5} active`} sample />
        </Section>
      )}
      {sub === "assessment-cadence" && (
        <Section title="Assessment cadence" sample>
          <FlowChain
            nodes={[
              "Continuous Assessment",
              "Weekly Validation",
              "Quarterly Audit",
              "Annual Certification",
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Evidence Collection — evidence automatically collected ──
function EvidenceTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
  const rows = EVIDENCE_CATEGORIES.map((category, i) => ({
    id: `${rec.id}-ev-${i}`,
    category,
    source: pick(
      ["Cloud API", "Agent", "Connector", "Scanner", "Manual Upload"],
      n + i,
    ),
    frequency: pick(["Continuous", "Daily", "Weekly", "On-demand"], n + i),
    status: (n + i) % 5 === 0 ? "Paused" : "Collecting",
  }));
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "category", header: "Evidence Category", render: (r) => r.category },
    { key: "source", header: "Source", render: (r) => r.source },
    { key: "frequency", header: "Frequency", render: (r) => r.frequency },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Collecting" ? T.success : T.warning }}
        >
          {r.status}
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
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Evidence automatically collected for this template <SampleTag />
      </div>
      <ToolbarRow buttons={["Add Evidence Source", "Preview Collection"]} />
      <DirectoryTable columns={cols} rows={rows} pageSize={12} />
    </>
  );
}

// ── Reporting — reporting standards ──
const REPORTING_SUBS = [
  { id: "reporting-standards", label: "Reporting standards" },
  { id: "supported-formats", label: "Supported formats" },
];
function ReportingTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("reporting-standards");
  const n = hashId(rec.id);
  return (
    <>
      <Tabs tabs={REPORTING_SUBS} active={sub} onChange={setSub} />
      {sub === "reporting-standards" && (
        <Section title="Reporting standards" sample>
          <StatRow
            label="Executive Reports"
            value={n % 2 === 0 ? "Monthly" : "Quarterly"}
            sample
          />
          <StatRow
            label="Audit Reports"
            value="On assessment completion"
            sample
          />
          <StatRow
            label="Regulatory Reports"
            value="Per obligation schedule"
            sample
          />
          <StatRow label="Board Reports" value="Quarterly" sample />
          <StatRow
            label="Evidence Packages"
            value={`${rec.evidenceSources} bundled sources`}
            sample
          />
          <StatRow
            label="Export Formats"
            value="PDF · Excel · JSON · CSV · API"
            sample
          />
        </Section>
      )}
      {sub === "supported-formats" && (
        <Section title="Supported formats" sample>
          <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
            {["PDF", "Excel", "JSON", "CSV", "API"].map((f) => (
              <span
                key={f}
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: `1px solid ${T.border}`,
                  color: T.textNav,
                }}
              >
                {f}
              </span>
            ))}
          </span>
        </Section>
      )}
    </>
  );
}

// ── Automation — automated compliance operations ──
const AUTOMATION_SUBS = [
  { id: "automated-operations", label: "Automated operations" },
  { id: "active-automations", label: "Active automations" },
];
function AutomationTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("automated-operations");
  const n = hashId(rec.id);
  return (
    <>
      <Tabs tabs={AUTOMATION_SUBS} active={sub} onChange={setSub} />
      {sub === "automated-operations" && (
        <Section title="Automated operations" sample>
          <StatRow
            label="Continuous Assessment"
            value={n % 3 === 0 ? "Disabled" : "Enabled"}
            tone={n % 3 === 0 ? "warn" : "ok"}
            sample
          />
          <StatRow
            label="Automatic Evidence Collection"
            value="Enabled"
            tone="ok"
            sample
          />
          <StatRow
            label="Remediation Policies"
            value={`${rec.automationRules} rules`}
            sample
          />
          <StatRow label="Approval Policies" value="2-of-3 approvers" sample />
          <StatRow
            label="Notification Policies"
            value="Email · Slack · Ticketing"
            sample
          />
          <StatRow
            label="Compliance Workflows"
            value={`${3 + (n % 5)} workflows`}
            sample
          />
        </Section>
      )}
      {sub === "active-automations" && (
        <Section title="Active automations" sample>
          <FlowChain
            nodes={[
              "Daily Compliance Scan",
              "Automatic Ticket Creation",
              "Weekly Executive Report",
              "Continuous Evidence Collection",
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Version History (per-template) ──
function VersionHistoryTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
  const major = parseInt(
    rec.version.replace(/[^0-9]/g, "").charAt(0) || "1",
    10,
  );
  const rows = Array.from({ length: 5 }, (_, k) => {
    const v = major - k;
    return {
      id: `${rec.id}-vh-${v}`,
      version: `v${v}.${(n + k) % 5}`,
      published: `2026-0${1 + ((n + k) % 6)}-${(10 + ((n + k) % 15)).toString()}`,
      publishedBy: pick(AUTHORS, n + k),
      status: k === 0 ? rec.status : k === 1 ? "Deprecated" : "Archived",
      notes: pick(
        [
          "Framework mapping refresh",
          "Control baseline expansion",
          "Evidence source additions",
          "Automation policy update",
          "Initial baseline",
        ],
        n + k,
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
    { key: "by", header: "Published By", render: (r) => r.publishedBy },
    { key: "status", header: "Status", render: (r) => r.status },
    { key: "notes", header: "Notes", render: (r) => r.notes },
  ];
  return (
    <>
      <ToolbarRow buttons={["Compare", "Restore", "Export"]} sample />
      <DirectoryTable columns={cols} rows={rows} />
      <Section title="Comparison view" sample>
        <FlowChain
          nodes={[
            `Version ${major - 1}.0`,
            "Differences",
            `Version ${major}.0`,
          ]}
        />
      </Section>
    </>
  );
}

// ── Activity (timeline) ──
function ActivityTab() {
  const [fActor, setFActor] = React.useState("");
  const [fCategory, setFCategory] = React.useState("");
  const events = [
    { event: "Template Created", category: "Lifecycle" },
    { event: "Framework Added", category: "Framework" },
    { event: "Control Updated", category: "Control" },
    { event: "Published", category: "Lifecycle" },
    { event: "Assigned", category: "Assignment" },
    { event: "Archived", category: "Lifecycle" },
  ];
  const enriched = events.map((e, i) => ({
    ...e,
    actor: pick(AUTHORS, i),
    when: pick(["5 min", "2 h", "yesterday", "3 days"], i),
  }));
  const rows = enriched.filter(
    (e) =>
      (!fActor || e.actor === fActor) &&
      (!fCategory || e.category === fCategory),
  );
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Select
          label="Actor"
          value={fActor}
          onChange={setFActor}
          options={[
            { value: "", label: "All actors" },
            ...Array.from(new Set(enriched.map((e) => e.actor))).map((v) => ({
              value: v,
              label: v,
            })),
          ]}
        />
        <Select
          label="Category"
          value={fCategory}
          onChange={setFCategory}
          options={[
            { value: "", label: "All categories" },
            ...Array.from(new Set(enriched.map((e) => e.category))).map(
              (v) => ({
                value: v,
                label: v,
              }),
            ),
          ]}
        />
        <span style={{ fontSize: 11.5, color: T.textMuted }}>Date range</span>
        <SampleTag />
      </div>
      {rows.map((e) => (
        <div
          key={e.event}
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
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e.event}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>
              {e.actor} · {e.category} · {e.when} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Audit History (read-only immutable log) ──
function AuditTab() {
  const events = [
    "Template Created",
    "Template Modified",
    "Framework Added",
    "Control Updated",
    "Assessment Updated",
    "Evidence Updated",
    "Published",
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
          value={`${pick(AUTHORS, i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

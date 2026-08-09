/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Workspace Templates → Environment Templates */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Download,
  Upload,
  Copy,
  Send,
  Archive,
  ArchiveRestore,
  RefreshCcw,
  ClipboardCheck,
  GitCompare,
  Eye,
  Star,
  LayoutGrid,
  Layers,
  SlidersHorizontal,
  Scale,
  ShieldCheck,
  BadgeCheck,
  Bot,
  Boxes,
  History,
  Activity as ActivityIcon,
  FileText,
  FlaskConical,
  TestTube,
  Beaker,
  LifeBuoy,
  GraduationCap,
  Wrench,
  Pencil,
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
 * Environment Templates — standardized configurations for specific operational environments
 * (Production, Staging, Development, Testing, Sandbox, Disaster Recovery, Training, Custom).
 * Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/01_Workspace Templates/environment_templates.md.
 *
 * Unlike Enterprise Templates (the overall workspace blueprint), Environment Templates focus on
 * environment-specific behaviour — security, governance, operational, compliance and AI standards
 * appropriate to each environment. They are reusable and can be attached to one or more Enterprise
 * Templates. This view reuses the Enterprise-Administration UX pattern shared with the Users module:
 * Banner · Toolbar · Filters · Search · Data Table · Bulk/Row actions · Template Detail Drawer
 * (10 sub-tabs) plus the Operational Dashboard, Environment Comparison and Template Hierarchy
 * visualizations the spec calls for.
 *
 * There is no template backend yet, so the template set is representative sample data (tagged
 * `Sample` in the UI). When admin/org_model.py + the template engine land, swap SAMPLE_TEMPLATES for
 * the live query — the component API stays identical.
 */

// ── Environment model (drives the sub-navigation + environment-specific behaviour) ─────────────────
const ENVIRONMENTS = [
  "Production",
  "Staging",
  "Development",
  "Testing",
  "Sandbox",
  "Disaster Recovery",
  "Training",
  "Custom",
];

type Status = "Published" | "Draft" | "Deprecated" | "Archived";
const STATUS_TONE: Record<Status, string> = {
  Published: T.success,
  Draft: T.warning,
  Deprecated: T.textMuted,
  Archived: T.textMuted,
};

// Environment-type sub-navigation (spec §Navigation): the eight environment leaves plus Archived
// (status view) and Versions (aggregate version view).
const ENV_TABS = [
  { id: "all", label: "All", Icon: LayoutGrid },
  { id: "Production", label: "Production", Icon: ShieldCheck },
  { id: "Staging", label: "Staging", Icon: FlaskConical },
  { id: "Development", label: "Development", Icon: Wrench },
  { id: "Testing", label: "Testing", Icon: TestTube },
  { id: "Sandbox", label: "Sandbox", Icon: Beaker },
  { id: "Disaster Recovery", label: "Disaster Recovery", Icon: LifeBuoy },
  { id: "Training", label: "Training", Icon: GraduationCap },
  { id: "Custom", label: "Custom", Icon: SlidersHorizontal },
  { id: "archived", label: "Archived", Icon: Archive },
  { id: "versions", label: "Versions", Icon: History },
];

const BUSINESS_UNITS = ["Payments", "Platform", "Security", "Data", "Retail"];
const COMPLIANCE_PROFILES = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
  "Internal Baseline",
];
const SECURITY_PROFILES = ["Maximum", "Hardened", "Standard", "Relaxed"];
const GOVERNANCE_PROFILES = ["Strict", "Balanced", "Relaxed", "Self-Service"];
const OPERATIONAL_PROFILES = [
  "High Availability",
  "Standard",
  "Disposable",
  "Best Effort",
];
const OWNERS = [
  "Alice Smith",
  "David Chen",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
];
const CLOUD_PROVIDERS = ["AWS", "Azure", "Google Cloud", "Kubernetes"];
const REGIONS = ["eu-west-1", "eu-central-1", "us-east-1", "us-west-2"];

interface TemplateRecord {
  id: string;
  name: string;
  environment: string;
  version: string;
  enterpriseTemplates: number;
  status: Status;
  isDefault: boolean;
  updated: string;
  // general
  description: string;
  businessUnit: string;
  defaultEnterpriseTemplate: string;
  created: string;
  modified: string;
  publishedBy: string;
  // profiles
  governanceProfile: string;
  securityProfile: string;
  complianceProfile: string;
  operationalProfile: string;
  aiConfiguration: string;
  tags: string[];
  // statistics
  workspaces: number;
  policies: number;
  cloudResources: number;
  complianceFrameworks: number;
  aiPolicies: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative template set (~15 records covering every environment + status).
const SAMPLE_TEMPLATES: TemplateRecord[] = Array.from(
  { length: 15 },
  (_, i) => {
    const environment = ENVIRONMENTS[i % ENVIRONMENTS.length];
    const id = `ENV-TPL-${(1001 + i * 3).toString()}`;
    const n = hashId(id);
    const status: Status =
      environment === "Production" || environment === "Staging"
        ? "Published"
        : pick<Status>(
            ["Published", "Published", "Draft", "Deprecated", "Archived"],
            n,
          );
    const major = 1 + (n % 3);
    const minor = n % 6;
    return {
      id,
      name: `${environment} ${pick(["Standard", "Baseline", "Hardened", "Regulated", "Blueprint"], n)}`,
      environment,
      version: `v${major}.${minor}`,
      enterpriseTemplates:
        environment === "Production" ? 12 + (n % 10) : 1 + (n % 9),
      status,
      isDefault: environment === "Production" ? i % 2 === 0 : n % 5 === 0,
      updated: pick(
        ["Yesterday", "2 days ago", "Last week", "3 weeks ago", "5 hours ago"],
        n,
      ),
      description: `Standardized ${environment.toLowerCase()} configuration enforcing consistent security, governance, operational and compliance standards for the ${pick(BUSINESS_UNITS, n)} business unit.`,
      businessUnit: pick(BUSINESS_UNITS, n),
      defaultEnterpriseTemplate: `${pick(BUSINESS_UNITS, n >> 1)} Enterprise Baseline`,
      created: `2025-${(1 + (n % 9)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      modified: `2026-0${1 + (n % 6)}-${(1 + ((n + 9) % 27)).toString().padStart(2, "0")}`,
      publishedBy: pick(OWNERS, n),
      governanceProfile:
        environment === "Production"
          ? "Strict"
          : environment === "Development" || environment === "Sandbox"
            ? "Self-Service"
            : pick(GOVERNANCE_PROFILES, n),
      securityProfile:
        environment === "Production"
          ? "Maximum"
          : environment === "Development" || environment === "Sandbox"
            ? "Relaxed"
            : pick(SECURITY_PROFILES, n),
      complianceProfile:
        environment === "Production"
          ? "PCI DSS"
          : environment === "Development"
            ? "Internal Baseline"
            : pick(COMPLIANCE_PROFILES, n),
      operationalProfile:
        environment === "Production"
          ? "High Availability"
          : environment === "Sandbox"
            ? "Disposable"
            : pick(OPERATIONAL_PROFILES, n),
      aiConfiguration:
        environment === "Production"
          ? "Approved Models Only"
          : "Experimental Models Allowed",
      tags: [
        environment.toLowerCase().replace(/\s+/g, "-"),
        pick(["regulated", "internal", "pci", "gxp", "public"], n),
        pick(["cost-optimized", "ha", "ephemeral", "audited"], n >> 2),
      ],
      workspaces: environment === "Production" ? 40 + (n % 120) : n % 40,
      policies: 6 + (n % 30),
      cloudResources: 20 + (n % 400),
      complianceFrameworks:
        environment === "Production" ? 3 + (n % 3) : 1 + (n % 2),
      aiPolicies: 2 + (n % 8),
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

function DefaultBadge({ isDefault }: { isDefault: boolean }) {
  return isDefault ? (
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
  );
}

/**
 * Embeddable body — sub-navigation + operational dashboard + directory + template detail drawer,
 * WITHOUT the outer <Page> or the page banner. Rendered both as the standalone route and as a tab of
 * the Workspace Templates console. Uses local state for the environment sub-nav so it never collides
 * with a host page's `?tab=` param.
 */
export function EnvironmentTemplatesView() {
  const navigate = useNavigate();
  const [env, setEnv] = React.useState("all");

  // Filters (spec §Filters)
  const [search, setSearch] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fVersion, setFVersion] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");
  const [fSecurity, setFSecurity] = React.useState("");
  const [fDefault, setFDefault] = React.useState("");

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
    const envMatch =
      env === "all"
        ? true
        : env === "archived"
          ? r.status === "Archived"
          : env === "versions"
            ? true
            : r.environment === env;
    return (
      envMatch &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.environment.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.tags.join(" ").toLowerCase().includes(q) ||
        r.version.toLowerCase().includes(q)) &&
      (!fEnv || r.environment === fEnv) &&
      (!fStatus || r.status === fStatus) &&
      (!fVersion || r.version === fVersion) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fCompliance || r.complianceProfile === fCompliance) &&
      (!fSecurity || r.securityProfile === fSecurity) &&
      (!fDefault || (fDefault === "Yes" ? r.isDefault : !r.isDefault))
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFEnv("");
    setFStatus("");
    setFVersion("");
    setFBu("");
    setFCompliance("");
    setFSecurity("");
    setFDefault("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Toolbar (spec §Toolbar: Create · Administrative · Validation) ──
  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Environment Template",
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
      key: "deprecate",
      label: "Deprecate",
      icon: <Archive size={15} />,
      disabled: true,
    },
    {
      key: "archive",
      label: "Archive",
      icon: <Archive size={15} />,
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
      onClick: () => clearFilters(),
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
      key: "preview",
      label: "Preview Effective Configuration",
      icon: <Eye size={15} />,
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
      key: "environment",
      header: "Environment",
      sortValue: (r) => r.environment,
      render: (r) => r.environment,
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
      key: "enterpriseTemplates",
      header: "Enterprise Templates",
      sortValue: (r) => r.enterpriseTemplates,
      render: (r) => r.enterpriseTemplates,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "default",
      header: "Default",
      sortValue: (r) => (r.isDefault ? 0 : 1),
      render: (r) => <DefaultBadge isDefault={r.isDefault} />,
    },
    {
      key: "updated",
      header: "Updated",
      sortValue: (r) => r.updated,
      render: (r) => <span style={{ color: T.textMuted }}>{r.updated}</span>,
    },
  ];

  const isVersions = env === "versions";

  return (
    <>
      {/* ── Environment sub-navigation ── */}
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="View"
          value={env}
          onChange={setEnv}
          options={ENV_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {/* ── Operational Dashboard (spec §Operational Dashboard) ── */}
      <OperationalDashboard records={records} />

      {isVersions ? (
        <VersionsCard records={records} onOpen={(id) => setSelId(id)} />
      ) : (
        <DiscoveryListView
          title="Environment template catalog"
          commands={toolbar}
          pills={[
            {
              key: "env",
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
              key: "version",
              label: "Version",
              value: fVersion,
              onChange: setFVersion,
              options: facet(records.map((r) => r.version)),
            },
            {
              key: "bu",
              label: "Business Unit",
              value: fBu,
              onChange: setFBu,
              options: facet(records.map((r) => r.businessUnit)),
            },
            {
              key: "compliance",
              label: "Compliance Profile",
              value: fCompliance,
              onChange: setFCompliance,
              options: facet(records.map((r) => r.complianceProfile)),
            },
            {
              key: "security",
              label: "Security Profile",
              value: fSecurity,
              onChange: setFSecurity,
              options: facet(records.map((r) => r.securityProfile)),
            },
            {
              key: "default",
              label: "Default",
              value: fDefault,
              onChange: setFDefault,
              options: [
                { value: "", label: "All" },
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ],
            },
          ]}
          presets={[{ label: "All templates", onApply: clearFilters }]}
          filterRightSlot={
            <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
          }
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search environment templates — name, environment, description, business unit, tags, version…"
          count={rows.length}
          columns={cols.filter((c) => !hidden.has(c.key))}
          rows={rows}
          pageSize={15}
          initialSort={{ key: "environment", dir: "asc" }}
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
                { label: "Clone", onClick: () => {} },
                { label: "Publish", onClick: () => setSelId(r.id) },
                { label: "Archive", onClick: () => {} },
                { label: "Export", onClick: () => {} },
                { label: "Compare Versions", onClick: () => setSelId(r.id) },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Layers size={20} />}
              title="No environment templates available."
              hint="Adjust filters, or create / import an environment template to get started."
              cta="Create Environment Template"
              onCta={() => navigate("/admin/workspaces?tab=templates")}
            />
          }
        />
      )}

      {/* ── Environment Comparison (spec §Environment Comparison) ── */}
      <EnvironmentComparison />

      {/* ── Template Hierarchy (spec §Template Hierarchy) ── */}
      <TemplateHierarchy />

      {sel && <TemplateDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function EnvironmentTemplatesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Environment Templates"
        subtitle="Manage standardized configurations for operational environments used during workspace provisioning — Production, Staging, Development, Testing, Sandbox, Disaster Recovery and Training."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=templates")}
            >
              Create Environment Template
            </HeaderButton>
          </>
        }
      />
      <EnvironmentTemplatesView />
    </Page>
  );
}

// ════════════ Operational Dashboard (spec §Operational Dashboard) ════════════
function OperationalDashboard({ records }: { records: TemplateRecord[] }) {
  const published = records.filter((r) => r.status === "Published").length;
  const defaults = records.filter((r) => r.isDefault).length;
  const workspaces = records.reduce((a, r) => a + r.workspaces, 0);
  const usage = records.reduce((a, r) => a + r.enterpriseTemplates, 0);
  const envCount = new Set(records.map((r) => r.environment)).size;
  return (
    <Card
      title="Operational dashboard"
      desc="Fleet-wide environment-template posture."
      right={<SampleTag />}
    >
      <StatStripPlain
        items={[
          { label: "Environment Templates", value: records.length, tone: "ok" },
          { label: "Published Versions", value: published, tone: "ok" },
          { label: "Default Templates", value: defaults, tone: "ok" },
          {
            label: "Provisioned Workspaces",
            value: workspaces.toLocaleString(),
            tone: "muted",
          },
          { label: "Template Usage", value: usage, tone: "muted" },
          {
            label: "Environment Distribution",
            value: `${envCount} types`,
            tone: "muted",
          },
        ]}
      />
    </Card>
  );
}

// ════════════ Environment Comparison (spec §Environment Comparison) ════════════
const COMPARISON: {
  env: string;
  Icon: typeof ShieldCheck;
  traits: string[];
}[] = [
  {
    env: "Production",
    Icon: ShieldCheck,
    traits: [
      "Maximum Security",
      "Strict Governance",
      "Full Compliance",
      "High Availability",
    ],
  },
  {
    env: "Development",
    Icon: Wrench,
    traits: [
      "Flexible Policies",
      "Faster Provisioning",
      "Reduced Restrictions",
      "Experimental AI",
    ],
  },
  {
    env: "Testing",
    Icon: TestTube,
    traits: [
      "Isolated Resources",
      "Disposable Data",
      "Automated Cleanup",
      "Validation Policies",
    ],
  },
  {
    env: "Sandbox",
    Icon: Beaker,
    traits: [
      "Short Lifetime",
      "Limited Quotas",
      "Experimental Features",
      "Automatic Deletion",
    ],
  },
  {
    env: "Disaster Recovery",
    Icon: LifeBuoy,
    traits: [
      "Replicated Configuration",
      "Backup Resources",
      "Failover Policies",
      "Recovery Validation",
    ],
  },
];

function EnvironmentComparison() {
  return (
    <Card
      title="Environment comparison"
      desc="How the standard environments differ across security, governance, compliance, availability and AI."
      right={<SampleTag />}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {COMPARISON.map(({ env, Icon, traits }) => (
          <div
            key={env}
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                color: T.textPrimary,
              }}
            >
              <Icon size={15} color={T.accent} />
              {env}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {traits.map((t) => (
                <div
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: T.textNav,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: T.accent,
                      flexShrink: 0,
                    }}
                  />
                  {t}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ════════════ Template Hierarchy (spec §Template Hierarchy) ════════════
function TemplateHierarchy() {
  const nodes = [
    "Organization Policies",
    "Enterprise Template",
    "Environment Template",
    "Workspace",
    "Workspace Overrides",
  ];
  const highlight = "Environment Template";
  return (
    <Card
      title="Template hierarchy"
      desc="Environment Templates specialize Enterprise Templates by applying environment-specific operational, security, compliance, AI and infrastructure settings."
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: 520,
        }}
      >
        {nodes.map((label, i) => (
          <React.Fragment key={label}>
            <div
              style={{
                border: `1px solid ${label === highlight ? "var(--cg-accent)" : T.border}`,
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 12.5,
                color: label === highlight ? T.textPrimary : T.textNav,
                fontWeight: label === highlight ? 600 : 400,
                background:
                  label === highlight
                    ? "var(--cg-accent-bg-strong)"
                    : "transparent",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {label === highlight && <Layers size={14} color={T.accent} />}
              {label}
            </div>
            {i < nodes.length - 1 && (
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
        ))}
      </div>
    </Card>
  );
}

// ════════════ Versions view (spec §Navigation → Versions) ════════════
function VersionsCard({
  records,
  onOpen,
}: {
  records: TemplateRecord[];
  onOpen: (id: string) => void;
}) {
  const cols: Column<TemplateRecord>[] = [
    {
      key: "name",
      header: "Template",
      sortValue: (r) => r.name,
      render: (r) => (
        <span style={{ color: T.textPrimary }}>
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
      ),
    },
    {
      key: "environment",
      header: "Environment",
      sortValue: (r) => r.environment,
      render: (r) => r.environment,
    },
    {
      key: "version",
      header: "Current Version",
      sortValue: (r) => r.version,
      render: (r) => (
        <span style={{ fontFamily: "monospace", fontSize: 11.5 }}>
          {r.version}
        </span>
      ),
    },
    {
      key: "publishedBy",
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
    {
      key: "modified",
      header: "Published",
      sortValue: (r) => r.modified,
      render: (r) => r.modified,
    },
  ];
  return (
    <Card
      title="Version registry"
      desc="Current published version of every environment template. Open a template for its full version history and comparison view."
      right={<SampleTag />}
    >
      <DirectoryTable
        columns={cols}
        rows={records}
        pageSize={15}
        initialSort={{ key: "modified", dir: "desc" }}
        onRowClick={(r) => onOpen(r.id)}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "Open", onClick: () => onOpen(r.id) },
              { label: "Compare Versions", onClick: () => onOpen(r.id) },
              { label: "Restore", onClick: () => {} },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
      />
    </Card>
  );
}

// ════════════ Template Detail Drawer — 10 sub-tabs (spec §Environment Template Detail Drawer) ═══════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "environment",
    label: "Environment Configuration",
    icon: <SlidersHorizontal size={13} />,
  },
  { id: "governance", label: "Governance", icon: <Scale size={13} /> },
  { id: "security", label: "Security", icon: <ShieldCheck size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "ai", label: "AI Configuration", icon: <Bot size={13} /> },
  { id: "resources", label: "Resource Defaults", icon: <Boxes size={13} /> },
  { id: "versions", label: "Version History", icon: <History size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <FileText size={13} /> },
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
      // Drawer header (spec §Drawer Header): Template Name · Environment · Version · Status · Default
      title={rec.name}
      subtitle={`${rec.environment} · ${rec.version} · ${rec.status} · ${rec.isDefault ? "Default" : "Not default"}`}
      width={760}
      onClose={onClose}
      footer={
        // Quick Actions (spec §Drawer Header → Quick Actions): Edit · Clone · Publish · Export
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <HeaderButton icon={<Pencil size={13} />}>Edit</HeaderButton>
          <HeaderButton icon={<Copy size={13} />}>Clone</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton variant="primary" icon={<Send size={13} />}>
            Publish
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "environment" && <EnvironmentConfigTab rec={rec} />}
      {tab === "governance" && <GovernanceTab rec={rec} />}
      {tab === "security" && <SecurityTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "ai" && <AiConfigTab rec={rec} />}
      {tab === "resources" && <ResourceDefaultsTab rec={rec} />}
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

// ── Overview (General · Statistics) ──
const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "default-enterprise-template", label: "Default Enterprise Template" },
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
              { k: "Environment Type", v: rec.environment },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Version", v: rec.version },
              { k: "Status", v: <StatusBadge status={rec.status} /> },
              { k: "Default", v: rec.isDefault ? "Yes" : "No" },
              { k: "Created", v: rec.created },
              { k: "Modified", v: rec.modified },
            ]}
          />
          <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
            {rec.description}
          </div>
        </Section>
      )}

      {sub === "default-enterprise-template" && (
        <Section title="Default Enterprise Template" sample>
          <KVGrid
            items={[
              {
                k: "Default Enterprise Template",
                v: rec.defaultEnterpriseTemplate,
                sample: true,
              },
              {
                k: "Governance Profile",
                v: rec.governanceProfile,
                sample: true,
              },
              { k: "Security Profile", v: rec.securityProfile, sample: true },
              {
                k: "Compliance Profile",
                v: rec.complianceProfile,
                sample: true,
              },
              {
                k: "Operational Profile",
                v: rec.operationalProfile,
                sample: true,
              },
              { k: "AI Configuration", v: rec.aiConfiguration, sample: true },
              { k: "Tags", v: rec.tags.join(", "), sample: true },
            ]}
          />
        </Section>
      )}

      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Workspaces", v: rec.workspaces, sample: true },
              {
                k: "Enterprise Templates",
                v: rec.enterpriseTemplates,
                sample: true,
              },
              { k: "Policies", v: rec.policies, sample: true },
              {
                k: "Cloud Resources",
                v: rec.cloudResources.toLocaleString(),
                sample: true,
              },
              {
                k: "Compliance Frameworks",
                v: rec.complianceFrameworks,
                sample: true,
              },
              { k: "AI Policies", v: rec.aiPolicies, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Environment Configuration (spec §Environment Configuration) ──
function EnvironmentConfigTab({ rec }: { rec: TemplateRecord }) {
  const prod = rec.environment === "Production";
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
        Defines environment-specific operational behaviour <SampleTag />
      </div>
      <Section title="Environment Configuration" sample>
        <StatRow label="Environment Type" value={rec.environment} sample />
        <StatRow
          label="Workspace Naming"
          value={`${rec.environment.slice(0, 4).toLowerCase()}-{bu}-{team}-{seq}`}
          sample
        />
        <StatRow label="Environment Tags" value={rec.tags.join(", ")} sample />
        <StatRow
          label="Deployment Model"
          value={prod ? "Multi-region Active/Active" : "Single-region"}
          sample
        />
        <StatRow
          label="Availability"
          value={prod ? "99.99% SLA" : "Best effort"}
          tone={prod ? "ok" : "muted"}
          sample
        />
        <StatRow
          label="Maintenance Windows"
          value={prod ? "Sun 02:00–04:00 UTC (change-controlled)" : "Anytime"}
          sample
        />
        <StatRow
          label="Scaling Defaults"
          value={prod ? "Auto-scale 3–24 nodes" : "Fixed 1–2 nodes"}
          sample
        />
        <StatRow
          label="Notification Rules"
          value={prod ? "PagerDuty + Email + Slack" : "Email only"}
          sample
        />
      </Section>
    </>
  );
}

// ── Governance (spec §Governance) ──
const GOVERNANCE_SUBS = [
  { id: "governance", label: "Governance" },
  { id: "governance-profile", label: "Governance profile" },
];
function GovernanceTab({ rec }: { rec: TemplateRecord }) {
  const [sub, setSub] = React.useState("governance");
  const prod = rec.environment === "Production";
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
        Governance differences for the {rec.environment} environment{" "}
        <SampleTag />
      </div>
      <Tabs tabs={GOVERNANCE_SUBS} active={sub} onChange={setSub} />
      {sub === "governance" && (
        <Section title="Governance" sample>
          <StatRow
            label="Approval Policies"
            value={prod ? "Dual Approval Required" : "Self-Service Allowed"}
            tone={prod ? "warn" : "ok"}
            sample
          />
          <StatRow
            label="Change Control"
            value={prod ? "CAB-approved change windows" : "No change control"}
            sample
          />
          <StatRow
            label="Workspace Restrictions"
            value={prod ? "Locked baseline, no drift" : "Overrides permitted"}
            sample
          />
          <StatRow
            label="Operational Policies"
            value={rec.operationalProfile}
            sample
          />
          <StatRow
            label="Inheritance Rules"
            value="Most-restrictive-wins from Enterprise Template"
            sample
          />
        </Section>
      )}
      {sub === "governance-profile" && (
        <Section title="Governance profile">
          <StatRow
            label="Governance Profile"
            value={rec.governanceProfile}
            sample
          />
        </Section>
      )}
    </>
  );
}

// ── Security (spec §Security) ──
function SecurityTab({ rec }: { rec: TemplateRecord }) {
  const prod = rec.environment === "Production";
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
        Environment-specific security posture — {rec.securityProfile} profile{" "}
        <SampleTag />
      </div>
      <Section title="Security" sample>
        <StatRow
          label="Network Policies"
          value={prod ? "Private Networking Only" : "Standard Networking"}
          tone={prod ? "ok" : "muted"}
          sample
        />
        <StatRow
          label="Identity Policies"
          value={prod ? "MFA Mandatory · SSO enforced" : "SSO optional"}
          tone={prod ? "ok" : "warn"}
          sample
        />
        <StatRow
          label="Access Restrictions"
          value={prod ? "Just-in-time, least-privilege" : "Standing access"}
          sample
        />
        <StatRow
          label="Encryption Defaults"
          value={prod ? "CMK Required" : "Platform Keys Allowed"}
          tone={prod ? "ok" : "muted"}
          sample
        />
        <StatRow
          label="Secrets Management"
          value={prod ? "Vault + auto-rotation" : "Vault (manual rotation)"}
          sample
        />
        <StatRow
          label="Logging Level"
          value={prod ? "Full audit + data-plane" : "Standard"}
          sample
        />
        <StatRow
          label="Monitoring"
          value={prod ? "24/7 SOC + anomaly detection" : "Business hours"}
          sample
        />
        <StatRow
          label="Private Connectivity"
          value={prod ? "PrivateLink / Private Endpoints" : "Public egress"}
          tone={prod ? "ok" : "muted"}
          sample
        />
      </Section>
    </>
  );
}

// ── Compliance (spec §Compliance) ──
function ComplianceTab({ rec }: { rec: TemplateRecord }) {
  const prod = rec.environment === "Production";
  const frameworks = prod
    ? ["ISO 27001", "SOC 2", "PCI DSS"]
    : [rec.complianceProfile];
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
        Compliance requirements based on the {rec.environment} environment{" "}
        <SampleTag />
      </div>
      <Section title="Compliance" sample>
        <StatRow
          label="Compliance Frameworks"
          value={frameworks.join(", ")}
          tone={prod ? "ok" : "muted"}
          sample
        />
        <StatRow
          label="Required Controls"
          value={prod ? "312 controls" : "48 baseline controls"}
          sample
        />
        <StatRow
          label="Assessment Frequency"
          value={prod ? "Continuous + Quarterly" : "Annual"}
          sample
        />
        <StatRow
          label="Evidence Collection"
          value={prod ? "Automated" : "On-demand"}
          sample
        />
        <StatRow
          label="Retention Policy"
          value={prod ? "7 years (immutable)" : "90 days"}
          sample
        />
        <StatRow
          label="Reporting Profile"
          value={prod ? "Executive + Auditor" : "Internal only"}
          sample
        />
      </Section>
    </>
  );
}

// ── AI Configuration (spec §AI Configuration) ──
function AiConfigTab({ rec }: { rec: TemplateRecord }) {
  const prod = rec.environment === "Production";
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
        Defines AI behaviour for the {rec.environment} environment <SampleTag />
      </div>
      <Section title="AI Configuration" sample>
        <StatRow
          label="Approved Models"
          value={prod ? "Approved Models Only" : "Experimental Models Allowed"}
          tone={prod ? "ok" : "warn"}
          sample
        />
        <StatRow
          label="Inference Mode"
          value={prod ? "Private / in-tenant only" : "Shared inference allowed"}
          sample
        />
        <StatRow
          label="Prompt Policies"
          value={prod ? "Curated prompt library, locked" : "Freeform allowed"}
          sample
        />
        <StatRow
          label="Knowledge Sources"
          value={prod ? "Governed, PII-redacted" : "Broad, sandboxed"}
          sample
        />
        <StatRow
          label="Execution Policies"
          value={prod ? "Ask-mode + approval gates" : "Autonomous allowed"}
          sample
        />
        <StatRow
          label="Agent Permissions"
          value={prod ? "Least-privilege, read-mostly" : "Elevated in sandbox"}
          sample
        />
        <StatRow
          label="Safety Policies"
          value={
            prod ? "Full guardrails + output filter" : "Relaxed guardrails"
          }
          tone={prod ? "ok" : "warn"}
          sample
        />
      </Section>
    </>
  );
}

// ── Resource Defaults (spec §Resource Defaults) ──
function ResourceDefaultsTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
  const prod = rec.environment === "Production";
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
        Infrastructure defaults for the {rec.environment} environment{" "}
        <SampleTag />
      </div>
      <Section title="Resource Defaults" sample>
        <StatRow
          label="Cloud Providers"
          value={`${pick(CLOUD_PROVIDERS, n)}, ${pick(CLOUD_PROVIDERS, n + 1)}`}
          sample
        />
        <StatRow
          label="Regions"
          value={
            prod
              ? `${pick(REGIONS, n)}, ${pick(REGIONS, n + 2)} (multi-region)`
              : pick(REGIONS, n)
          }
          sample
        />
        <StatRow
          label="Storage"
          value={prod ? "Encrypted, versioned, replicated" : "Standard SSD"}
          sample
        />
        <StatRow
          label="Networking"
          value={prod ? "Isolated VPC + private subnets" : "Shared VPC"}
          sample
        />
        <StatRow
          label="Resource Limits"
          value={prod ? "Enterprise quota" : "Capped / limited quotas"}
          sample
        />
        <StatRow
          label="Budgets"
          value={prod ? "$—/mo with alerts" : "Low-cost, hard cap"}
          sample
        />
        <StatRow
          label="Monitoring"
          value={prod ? "Full-stack observability" : "Basic metrics"}
          sample
        />
        <StatRow
          label="Backup Policies"
          value={prod ? "Hourly snapshots, 35-day retention" : "None"}
          sample
        />
        <StatRow
          label="Disaster Recovery"
          value={prod ? "Cross-region failover (RPO 5m)" : "Not configured"}
          tone={prod ? "ok" : "muted"}
          sample
        />
      </Section>
    </>
  );
}

// ── Version History (spec §Version History) ──
function VersionHistoryTab({ rec }: { rec: TemplateRecord }) {
  const n = hashId(rec.id);
  const [major, minor] = rec.version
    .replace("v", "")
    .split(".")
    .map((x) => parseInt(x, 10));
  const count = 3 + (n % 3);
  const versions = Array.from({ length: count }, (_, i) => {
    const idx = count - 1 - i;
    const v = `v${major}.${Math.max(0, minor - idx)}`;
    const isCurrent = idx === 0;
    return {
      id: `${rec.id}-${v}`,
      version: v,
      published: `2026-0${1 + ((n + idx) % 6)}-${(1 + ((n + idx) % 27)).toString().padStart(2, "0")}`,
      publishedBy: pick(OWNERS, n + idx),
      status: isCurrent
        ? rec.status
        : idx === 1
          ? ("Deprecated" as Status)
          : ("Archived" as Status),
      notes: pick(
        [
          "Tightened encryption defaults to CMK",
          "Added PCI DSS control mapping",
          "Reduced provisioning time",
          "Introduced auto-scaling defaults",
          "Baseline release",
        ],
        n + idx,
      ),
    };
  });
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
      {/* Version History toolbar (spec): Compare · Restore · Export */}
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
        <HeaderButton icon={<ArchiveRestore size={13} />}>Restore</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={versions} />

      {/* Comparison View (spec): Version N-1 → Differences → Version N */}
      <Section title="Comparison view" sample>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <VersionBlock
            title={`Version ${Math.max(0, minor - 1)}`}
            muted
            rows={[
              ["Encryption", "Platform Keys"],
              ["Approval", "Single Approval"],
              ["Assessment", "Annual"],
            ]}
          />
          <span
            style={{ color: T.textMuted, textAlign: "center", fontSize: 13 }}
          >
            ↓ Differences
          </span>
          <VersionBlock
            title={`Version ${minor} (current)`}
            rows={[
              ["Encryption", "CMK Required"],
              ["Approval", "Dual Approval"],
              ["Assessment", "Continuous + Quarterly"],
            ]}
          />
        </div>
      </Section>
    </>
  );
}

function VersionBlock({
  title,
  muted,
  rows,
}: {
  title: string;
  muted?: boolean;
  rows: [string, string][];
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
      {rows.map(([k, v]) => (
        <StatRow key={k} label={k} value={v} tone={muted ? undefined : "ok"} />
      ))}
    </div>
  );
}

// ── Activity (spec §Activity: timeline + Actor/Category/Date filters) ──
function ActivityTab() {
  const [actor, setActor] = React.useState("");
  const [category, setCategory] = React.useState("");
  const events = [
    { label: "Template Created", category: "Lifecycle" },
    { label: "Configuration Updated", category: "Configuration" },
    { label: "Version Published", category: "Version" },
    { label: "Assigned", category: "Assignment" },
    { label: "Workspace Provisioned", category: "Provisioning" },
    { label: "Archived", category: "Lifecycle" },
  ];
  const visible = events.filter((e) => !category || e.category === category);
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <Select
          label="Actor"
          value={actor}
          onChange={setActor}
          options={[
            { value: "", label: "All" },
            ...OWNERS.map((o) => ({ value: o, label: o })),
          ]}
        />
        <Select
          label="Category"
          value={category}
          onChange={setCategory}
          options={[
            { value: "", label: "All" },
            ...Array.from(new Set(events.map((e) => e.category))).map((c) => ({
              value: c,
              label: c,
            })),
          ]}
        />
        <SampleTag />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {visible.map((e, i) => (
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
                {actor || pick(OWNERS, i)} · {e.category} ·{" "}
                {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Audit History (spec §Audit History — immutable, read-only) ──
function AuditTab() {
  const events = [
    "Template Created",
    "Template Updated",
    "Version Published",
    "Configuration Changed",
    "Template Assigned",
    "Template Exported",
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
          value={`${pick(OWNERS, i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

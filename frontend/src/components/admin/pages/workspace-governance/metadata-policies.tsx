/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Workspace Policies → Metadata Policies */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Upload,
  Copy,
  Download,
  RefreshCcw,
  UserCheck,
  ClipboardCheck,
  Eye,
  Send,
  Archive,
  GitBranch,
  History,
  LayoutGrid,
  ListChecks,
  ShieldCheck,
  Tags,
  Gauge,
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
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";

/**
 * Metadata Policies — the enterprise standards for workspace METADATA (what descriptive information a
 * workspace must contain — identity, classification, ownership, tags), not how it operates. Every
 * workspace must carry complete, validated, standardized business metadata before and throughout its
 * lifecycle. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/01_Workspace Policies/metadata_policies.md.
 *
 * Same Enterprise-Governance UX as Operational Policies (Banner · Toolbar · Filters · Search · Datatable
 * · Bulk/Row actions · 8-tab Policy Detail Drawer). No metadata-policy backend yet → deterministic
 * representative sample data (tagged `Sample`); swap SAMPLE_POLICIES for the live query when it lands.
 */

type Priority = "Critical" | "High" | "Medium" | "Low";
type Status = "Active" | "Draft" | "Archived" | "Disabled";
type Assignment = "Organization" | "Business Unit" | "Workspace";

const ASSIGNMENTS: Assignment[] = [
  "Organization",
  "Business Unit",
  "Workspace",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const WORKSPACE_TYPES = [
  "Production",
  "Shared Services",
  "Customer",
  "Research",
  "Sandbox",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const OWNERS = [
  "Data Governance Admin",
  "Aisha Khan",
  "David Chen",
  "Marco Rossi",
  "Priya Nair",
];

const PRIORITY_TONE: Record<Priority, string> = {
  Critical: T.danger,
  High: T.warning,
  Medium: T.accent,
  Low: T.textMuted,
};
const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Draft: T.textMuted,
  Archived: T.textMuted,
  Disabled: T.warning,
};
const PRIORITY_ORDER: Record<Priority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

interface Policy {
  id: string;
  name: string;
  priority: Priority;
  assignment: Assignment;
  requiredFields: number;
  status: Status;
  version: string;
  modified: string;
  created: string;
  owner: string;
  businessUnit: string;
  workspaceType: string;
  environment: string;
  inherited: boolean;
  description: string;
  // Statistics
  assignments: number;
  validatedWorkspaces: number;
  validationFailures: number;
  exceptions: number;
  complianceScore: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

const POLICY_NAMES = [
  "Enterprise Workspace Metadata",
  "Production Metadata Standard",
  "Data Classification Metadata",
  "Cost Allocation Metadata",
  "Ownership & Accountability Metadata",
  "Compliance Program Metadata",
  "Regional & Residency Metadata",
  "Customer Workspace Metadata",
  "Research Workspace Metadata",
  "Sandbox Metadata Baseline",
];

const SAMPLE_POLICIES: Policy[] = POLICY_NAMES.map((name, i) => {
  const id = `MD-${(1000 + i * 9).toString().padStart(5, "0")}`;
  const n = hashId(id + name);
  return {
    id,
    name,
    priority: pick<Priority>(
      ["Critical", "Critical", "High", "Medium", "Low"],
      n,
    ),
    assignment: pick(ASSIGNMENTS, n >> 2),
    requiredFields: 8 + (n % 18),
    status: pick<Status>(
      ["Active", "Active", "Active", "Draft", "Disabled", "Archived"],
      n,
    ),
    version: `v${1 + (n % 6)}`,
    modified: `2026-0${1 + (n % 7)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + ((n + 4) % 27)).toString().padStart(2, "0")}`,
    owner: pick(OWNERS, n),
    businessUnit: pick(BUSINESS_UNITS, n >> 1),
    workspaceType: pick(WORKSPACE_TYPES, n >> 3),
    environment: pick(ENVIRONMENTS, n >> 4),
    inherited: n % 3 === 0,
    description: `Enterprise metadata standard governing ${name.toLowerCase()} — required fields, validation rules and classification.`,
    assignments: 3 + (n % 120),
    validatedWorkspaces: 40 + (n % 260),
    validationFailures: n % 30,
    exceptions: n % 6,
    complianceScore: 72 + (n % 28),
  };
});

function PriorityBadge({ priority }: { priority: Priority }) {
  const c = PRIORITY_TONE[priority];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: c }}
      />
      {priority}
    </span>
  );
}
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

export function MetadataPoliciesView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fPriority, setFPriority] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
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

  const records = SAMPLE_POLICIES;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q)) &&
      (!fStatus || r.status === fStatus) &&
      (!fPriority || r.priority === fPriority) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fType || r.workspaceType === fType) &&
      (!fEnv || r.environment === fEnv) &&
      (!fInherit || (fInherit === "inherited") === r.inherited) &&
      (!fVersion || r.version === fVersion)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFStatus("");
    setFPriority("");
    setFBu("");
    setFType("");
    setFEnv("");
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
  const avgScore = Math.round(
    records.reduce((a, r) => a + r.complianceScore, 0) / records.length,
  );
  const failures = records.reduce((a, r) => a + r.validationFailures, 0);
  const missing = records.reduce(
    (a, r) =>
      a +
      Math.max(
        0,
        r.requiredFields -
          Math.round(r.requiredFields * (r.complianceScore / 100)),
      ),
    0,
  );
  const exceptions = records.reduce((a, r) => a + r.exceptions, 0);
  const validated = records.reduce((a, r) => a + r.validatedWorkspaces, 0);
  const active = records.filter((r) => r.status === "Active").length;
  const coverage = Math.round((active / records.length) * 100);

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Policy",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=policies"),
    },
    {
      key: "import",
      label: "Import",
      icon: <Upload size={15} />,
      disabled: true,
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: <Copy size={15} />,
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
      label: "Assign Policy",
      icon: <UserCheck size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Metadata",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "preview",
      label: "Preview Evaluation",
      icon: <Eye size={15} />,
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

  const cols: Column<Policy>[] = [
    {
      key: "name",
      header: "Policy",
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
          <Tags size={14} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortValue: (r) => PRIORITY_ORDER[r.priority],
      render: (r) => <PriorityBadge priority={r.priority} />,
    },
    {
      key: "assignment",
      header: "Assignment",
      sortValue: (r) => r.assignment,
      render: (r) => r.assignment,
    },
    {
      key: "requiredFields",
      header: "Required Fields",
      sortValue: (r) => r.requiredFields,
      render: (r) => r.requiredFields,
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
      <StatStripPlain
        items={[
          {
            label: "Metadata Compliance",
            value: `${avgScore}%`,
            tone: avgScore >= 85 ? "ok" : "warn",
          },
          {
            label: "Validation Failures",
            value: failures,
            tone: failures > 0 ? "warn" : "ok",
          },
          {
            label: "Missing Required Fields",
            value: missing,
            tone: missing > 0 ? "warn" : "ok",
          },
          {
            label: "Policy Coverage",
            value: `${coverage}%`,
            tone: coverage >= 80 ? "ok" : "warn",
          },
          {
            label: "Exceptions",
            value: exceptions,
            tone: exceptions > 0 ? "warn" : "ok",
          },
          {
            label: "Recently Validated",
            value: validated.toLocaleString(),
            tone: "ok",
          },
          {
            label: "Metadata Quality Score",
            value: `${avgScore}%`,
            tone: avgScore >= 85 ? "ok" : "warn",
          },
        ]}
      />

      <DiscoveryListView
        title="Metadata policies"
        desc="Metadata Policies govern what descriptive information a workspace must contain — ensuring every workspace is consistently identified, classified, searchable, governed and reportable."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search metadata policies — name, description, metadata field, workspace, tags, business unit…"
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
            key: "priority",
            label: "Priority",
            value: fPriority,
            onChange: setFPriority,
            options: facet(records.map((r) => r.priority)),
          },
          {
            key: "businessUnit",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "workspaceType",
            label: "Workspace Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.workspaceType)),
          },
          {
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
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
        presets={[{ label: "All metadata policies", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "priority", dir: "asc" }}
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
              { label: "Preview Evaluation", onClick: () => setSelId(r.id) },
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
            icon={<Tags size={20} />}
            title="No metadata policies found."
            hint="Create a metadata policy to enforce mandatory metadata standards, validation rules and classification requirements across workspaces."
            cta="Create Metadata Policy"
            onCta={() => navigate("/admin/workspace-governance?tab=policies")}
          />
        }
      />

      {sel && <PolicyDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function MetadataPoliciesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Metadata Policies"
        subtitle="Define mandatory metadata standards, validation rules and classification requirements for enterprise workspaces."
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
              Create Policy
            </HeaderButton>
          </>
        }
      />
      <MetadataPoliciesView />
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

// ════════════ Policy Detail Drawer — 8 sub-tabs (spec §Policy Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "required",
    label: "Required Metadata",
    icon: <ListChecks size={13} />,
  },
  {
    id: "validation",
    label: "Validation Rules",
    icon: <ClipboardCheck size={13} />,
  },
  {
    id: "classification",
    label: "Classification",
    icon: <ShieldCheck size={13} />,
  },
  { id: "assignments", label: "Assignments", icon: <UserCheck size={13} /> },
  { id: "evaluation", label: "Evaluation", icon: <Gauge size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function PolicyDrawer({ rec, onClose }: { rec: Policy; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.priority} · ${rec.status} · ${rec.version} · ${rec.assignment} · ${rec.requiredFields} required fields`}
      width={820}
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
          <HeaderButton icon={<ClipboardCheck size={13} />}>
            Validate
          </HeaderButton>
          <HeaderButton icon={<UserCheck size={13} />}>Assign</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "required" && <RequiredTab />}
      {tab === "validation" && <ValidationTab />}
      {tab === "classification" && <ClassificationTab />}
      {tab === "assignments" && <AssignmentsTab rec={rec} />}
      {tab === "evaluation" && <EvaluationTab rec={rec} />}
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
function OverviewTab({ rec }: { rec: Policy }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Policy Name", v: rec.name },
              { k: "Priority", v: rec.priority },
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
          <StatRow
            label="Workspace"
            value={rec.assignment === "Workspace" ? "3 workspaces" : "—"}
            sample
          />
          <StatRow
            label="Inherited Scope"
            value={
              rec.inherited
                ? "Inherited from Organization"
                : "Direct assignment"
            }
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
              { k: "Assignments", v: rec.assignments, sample: true },
              {
                k: "Validated Workspaces",
                v: rec.validatedWorkspaces,
                sample: true,
              },
              {
                k: "Validation Failures",
                v: rec.validationFailures,
                sample: true,
              },
              { k: "Exceptions", v: rec.exceptions, sample: true },
              {
                k: "Compliance Score",
                v: `${rec.complianceScore}%`,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Required Metadata (26 fields, spec §Required Metadata) ──
const META_FIELDS = [
  "Workspace Name",
  "Workspace ID",
  "Description",
  "Business Unit",
  "Department",
  "Business Owner",
  "Technical Owner",
  "Workspace Administrator",
  "Environment",
  "Workspace Type",
  "Business Criticality",
  "Data Classification",
  "Compliance Programs",
  "Risk Level",
  "Cost Center",
  "Project Code",
  "Application Portfolio",
  "Region",
  "Country",
  "Primary Cloud",
  "Tags",
  "Labels",
  "Business Purpose",
  "Lifecycle Status",
  "Creation Date",
  "Expiration Date",
];
const FIELD_MODES = [
  "Required",
  "Optional",
  "Read Only",
  "Inherited",
  "Calculated",
];
function RequiredTab() {
  return (
    <Section
      title="Required metadata fields — every workspace must maintain"
      sample
    >
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
        Each field is one of: {FIELD_MODES.join(" · ")}.
      </div>
      {META_FIELDS.map((f, i) => (
        <StatRow
          key={f}
          label={f}
          value={pick(FIELD_MODES, hashId(f) + i)}
          tone={hashId(f) % 2 === 0 ? "ok" : undefined}
          sample
        />
      ))}
    </Section>
  );
}

// ── Validation Rules (spec §Validation Rules) ──
function ValidationTab() {
  const types = [
    "Required Fields",
    "Allowed Values",
    "Regular Expressions",
    "Naming Standards",
    "Length Limits",
    "Unique Values",
    "Lookup Lists",
    "Conditional Requirements",
    "Cross-Field Validation",
  ];
  const modes = [
    "Warning",
    "Block Creation",
    "Block Update",
    "Automatic Correction",
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
          Validate
        </HeaderButton>
        <HeaderButton icon={<Eye size={13} />}>Preview</HeaderButton>
        <HeaderButton>Test Rule</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Validation types" sample>
        {types.map((t) => (
          <StatRow key={t} label={t} value="Enabled" tone="ok" sample />
        ))}
      </Section>
      <Section title="Validation modes" sample>
        {modes.map((m, i) => (
          <StatRow
            key={m}
            label={m}
            value={i === 1 ? "Selected" : "Available"}
            tone={i === 1 ? "ok" : undefined}
            sample
          />
        ))}
      </Section>
    </>
  );
}

// ── Classification (spec §Classification) ──
function ClassificationTab() {
  const classes = [
    "Business Criticality",
    "Data Classification",
    "Environment",
    "Regulatory Scope",
    "Business Domain",
    "Application Tier",
    "Operational Tier",
    "Sensitivity",
    "Recovery Tier",
    "Support Tier",
  ];
  const allowed = [
    "Public",
    "Internal",
    "Confidential",
    "Restricted",
    "Highly Confidential",
  ];
  return (
    <>
      <Section title="Supported classifications" sample>
        {classes.map((c) => (
          <StatRow key={c} label={c} value="Standardized" tone="ok" sample />
        ))}
      </Section>
      <Section title="Allowed values (Data Classification example)" sample>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {allowed.map((a) => (
            <span
              key={a}
              style={{
                fontSize: 12,
                color: T.textNav,
                border: `1px solid ${T.border}`,
                borderRadius: 99,
                padding: "4px 10px",
              }}
            >
              {a}
            </span>
          ))}
        </div>
      </Section>
    </>
  );
}

// ── Assignments (spec §Assignments) ──
function AssignmentsTab({ rec }: { rec: Policy }) {
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

// ── Evaluation (spec §Evaluation) ──
function EvaluationTab({ rec }: { rec: Policy }) {
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
        <HeaderButton icon={<Gauge size={13} />}>Run Validation</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>
          Generate Report
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Workspace metadata compliance" sample>
        <StatRow
          label="Metadata Score"
          value={`${rec.complianceScore}%`}
          tone={rec.complianceScore >= 85 ? "ok" : "warn"}
          sample
        />
        <StatRow
          label="Validation Status"
          value={rec.validationFailures === 0 ? "Passing" : "Failures present"}
          tone={rec.validationFailures === 0 ? "ok" : "warn"}
          sample
        />
        <StatRow label="Missing Fields" value={hashId(rec.id) % 5} sample />
        <StatRow
          label="Validation Errors"
          value={rec.validationFailures}
          tone={rec.validationFailures > 0 ? "warn" : "ok"}
          sample
        />
        <StatRow
          label="Policy Compliance"
          value={`${rec.complianceScore}%`}
          sample
        />
        <StatRow label="Effective Policy" value={rec.version} sample />
      </Section>
    </>
  );
}

function ActivityTab({ rec }: { rec: Policy }) {
  const events = [
    "Policy Created",
    "Metadata Updated",
    "Validation Executed",
    "Policy Assigned",
    "Policy Published",
    "Exception Granted",
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
    "Policy Created",
    "Policy Modified",
    "Validation Executed",
    "Assignment Changed",
    "Metadata Updated",
    "Policy Published",
    "Exception Approved",
    "Policy Deleted",
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

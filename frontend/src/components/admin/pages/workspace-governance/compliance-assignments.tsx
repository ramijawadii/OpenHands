/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Workspace Policies → Compliance Assignments */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Package,
  Layers,
  Trash2,
  Download,
  RefreshCcw,
  Eye,
  ClipboardCheck,
  ShieldAlert,
  Send,
  History,
  LayoutGrid,
  BadgeCheck,
  ListChecks,
  Target,
  Gauge,
  Activity as ActivityIcon,
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
 * Compliance Assignments — which regulatory frameworks, security standards and governance baselines
 * are assigned to a workspace (its compliance OBLIGATIONS), driving control implementation, evidence,
 * monitoring and audit readiness. Inherited from the Organization by default; extendable/overridable
 * per business unit / workspace. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/01_Workspace Policies/compliance_assignments.md.
 *
 * Same Enterprise-Governance UX (Banner · Toolbar · Filters · Search · Datatable · Bulk/Row actions ·
 * 8-tab Assignment Detail Drawer). No compliance-assignment backend yet → deterministic representative
 * sample data (tagged `Sample`); swap SAMPLE_ASSIGNMENTS for the live query when it lands.
 */

type AssignmentType = "Organization" | "Business Unit" | "Workspace";
type Status = "Active" | "Pending" | "Exception" | "Disabled";

const FRAMEWORKS = [
  "ISO 27001",
  "ISO 27017",
  "ISO 27018",
  "ISO 27701",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "HITRUST",
  "NIST CSF",
  "NIST SP 800-53",
  "CIS Controls",
  "CIS Benchmarks",
  "CSA CCM",
  "MITRE ATT&CK",
  "OWASP ASVS",
  "OWASP Top 10",
  "GDPR",
  "CCPA",
  "UK GDPR",
  "LGPD",
  "PIPEDA",
  "PDPL",
  "DORA",
  "NIS2",
  "FedRAMP",
  "CJIS",
  "FERPA",
  "SOX",
  "Internal Policies",
];
const PROFILES = [
  "Enterprise Baseline",
  "Financial Services",
  "Healthcare",
  "Government",
  "Cloud Native",
  "Critical Production",
  "Development",
  "Research",
];
const ASSIGNMENT_TYPES: AssignmentType[] = [
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
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const OWNERS = [
  "Compliance Admin",
  "Aisha Khan",
  "David Chen",
  "Marco Rossi",
  "Priya Nair",
];

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Pending: T.warning,
  Exception: T.accent,
  Disabled: T.textMuted,
};

interface Assignment {
  id: string;
  workspace: string;
  framework: string;
  assignmentType: AssignmentType;
  inherited: boolean;
  status: Status;
  effectiveDate: string;
  businessUnit: string;
  environment: string;
  profile: string;
  owner: string;
  created: string;
  modified: string;
  description: string;
  // Statistics
  assignedFrameworks: number;
  requiredControls: number;
  implementedControls: number;
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

const WORKSPACES = [
  "Payments Production",
  "Treasury Analytics",
  "Retail Storefront",
  "Platform Core",
  "Cloud Foundations",
  "Patient Portal",
  "Claims Processing",
  "HR Systems",
  "Data Lake",
  "Research Sandbox",
  "Customer Trust",
  "Billing Engine",
];

const SAMPLE_ASSIGNMENTS: Assignment[] = WORKSPACES.map((workspace, i) => {
  const id = `CA-${(1000 + i * 6).toString().padStart(5, "0")}`;
  const n = hashId(id + workspace);
  const req = 40 + (n % 160);
  return {
    id,
    workspace,
    framework: pick(FRAMEWORKS, n),
    assignmentType: pick(ASSIGNMENT_TYPES, n >> 2),
    inherited: n % 2 === 0,
    status: pick<Status>(
      ["Active", "Active", "Active", "Pending", "Exception", "Disabled"],
      n,
    ),
    effectiveDate: `2026-0${1 + (n % 7)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    businessUnit: pick(BUSINESS_UNITS, n >> 1),
    environment: pick(ENVIRONMENTS, n >> 3),
    profile: pick(PROFILES, n >> 4),
    owner: pick(OWNERS, n),
    created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + ((n + 2) % 27)).toString().padStart(2, "0")}`,
    modified: `2026-0${1 + (n % 7)}-${(1 + ((n + 9) % 27)).toString().padStart(2, "0")}`,
    description: `${workspace} carries the ${pick(PROFILES, n >> 4)} compliance profile, assigned at the ${pick(ASSIGNMENT_TYPES, n >> 2).toLowerCase()} scope.`,
    assignedFrameworks: 3 + (n % 9),
    requiredControls: req,
    implementedControls: Math.round(req * (0.7 + (n % 30) / 100)),
    exceptions: n % 5,
    complianceScore: 72 + (n % 28),
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

export function ComplianceAssignmentsView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fFramework, setFFramework] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fProfile, setFProfile] = React.useState("");
  const [fInherit, setFInherit] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_ASSIGNMENTS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.framework.toLowerCase().includes(q) ||
        r.profile.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q)) &&
      (!fFramework || r.framework === fFramework) &&
      (!fType || r.assignmentType === fType) &&
      (!fStatus || r.status === fStatus) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fEnv || r.environment === fEnv) &&
      (!fProfile || r.profile === fProfile) &&
      (!fInherit || (fInherit === "inherited") === r.inherited)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFFramework("");
    setFType("");
    setFStatus("");
    setFBu("");
    setFEnv("");
    setFProfile("");
    setFInherit("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Operational Dashboard (spec §Operational Dashboard).
  const assignedFrameworks = records.reduce(
    (a, r) => a + r.assignedFrameworks,
    0,
  );
  const profiles = new Set(records.map((r) => r.profile)).size;
  const pending = records.filter((r) => r.status === "Pending").length;
  const exceptions = records.reduce((a, r) => a + r.exceptions, 0);
  const active = records.filter((r) => r.status === "Active").length;
  const coverage = Math.round((active / records.length) * 100);
  const avgScore = Math.round(
    records.reduce((a, r) => a + r.complianceScore, 0) / records.length,
  );

  const toolbar: CommandItem[] = [
    {
      key: "assign",
      label: "Assign Framework",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=policies"),
    },
    {
      key: "profile",
      label: "Assign Profile",
      icon: <Package size={15} />,
      disabled: true,
    },
    {
      key: "bulk",
      label: "Bulk Assign",
      icon: <Layers size={15} />,
      disabled: true,
    },
    {
      key: "remove",
      label: "Remove Assignment",
      icon: <Trash2 size={15} />,
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
      key: "preview",
      label: "Preview Effective Compliance",
      icon: <Eye size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Assignment",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "exception",
      label: "Request Exception",
      icon: <ShieldAlert size={15} />,
      disabled: true,
    },
    {
      key: "publish",
      label: "Publish Changes",
      icon: <Send size={15} />,
      disabled: true,
    },
    {
      key: "history",
      label: "Assignment History",
      icon: <History size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Assignment>[] = [
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
          <BadgeCheck size={14} color={T.textMuted} />
          {r.workspace}
        </span>
      ),
    },
    {
      key: "framework",
      header: "Framework",
      sortValue: (r) => r.framework,
      render: (r) => r.framework,
    },
    {
      key: "assignmentType",
      header: "Assignment Type",
      sortValue: (r) => r.assignmentType,
      render: (r) => r.assignmentType,
    },
    {
      key: "inherited",
      header: "Inherited",
      sortValue: (r) => (r.inherited ? 1 : 0),
      render: (r) => (r.inherited ? "Yes" : "No"),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "effectiveDate",
      header: "Effective Date",
      sortValue: (r) => r.effectiveDate,
      render: (r) => r.effectiveDate,
    },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard
          title="Assigned Frameworks"
          value={assignedFrameworks}
          tone="ok"
          sub={
            <>
              Across the estate <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Coverage"
          value={`${coverage}%`}
          tone={coverage >= 80 ? "ok" : "warn"}
          sub={
            <>
              Workspaces assigned <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Compliance Profiles"
          value={profiles}
          sub={
            <>
              Distinct profiles in use <SampleTag />
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
          title="Exceptions"
          value={exceptions}
          tone={exceptions > 0 ? "warn" : "ok"}
          sub={
            <>
              Approved deviations <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Assignment Changes"
          value={records.length}
          sub={
            <>
              Recent changes <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Avg Compliance Score"
          value={`${avgScore}%`}
          tone={avgScore >= 85 ? "ok" : "warn"}
          sub={
            <>
              Implemented / required <SampleTag />
            </>
          }
        />
      </PostureGrid>

      <DiscoveryListView
        title="Compliance assignments"
        desc="Compliance Assignments establish each workspace's compliance posture — the regulatory frameworks and baselines that drive control implementation, evidence collection, monitoring and audit readiness."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search compliance assignments — workspace, framework, compliance profile, business unit, owner, tags…"
        count={rows.length}
        pills={[
          {
            key: "framework",
            label: "Framework",
            value: fFramework,
            onChange: setFFramework,
            options: facet(records.map((r) => r.framework)),
          },
          {
            key: "assignmentType",
            label: "Assignment Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.assignmentType)),
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
          {
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "complianceProfile",
            label: "Compliance Profile",
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
        ]}
        presets={[
          { label: "All compliance assignments", onApply: clearFilters },
        ]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "workspace", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Plus size={13} />} onClick={clear}>
              Assign Framework ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<Trash2 size={13} />} onClick={clear}>
              Remove Assignment
            </HeaderButton>
            <HeaderButton icon={<Download size={13} />} onClick={clear}>
              Export
            </HeaderButton>
            <HeaderButton icon={<ClipboardCheck size={13} />} onClick={clear}>
              Validate
            </HeaderButton>
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "View", onClick: () => setSelId(r.id) },
              { label: "Edit", onClick: () => setSelId(r.id) },
              { label: "Assign", onClick: () => setSelId(r.id) },
              {
                label: "Preview Effective Compliance",
                onClick: () => setSelId(r.id),
              },
              { label: "Request Exception", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
              {
                label: "Remove",
                onClick: () => setSelId(r.id),
                danger: true,
              },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<BadgeCheck size={20} />}
            title="No compliance assignments found."
            hint="Assign a regulatory framework or compliance profile to a workspace to establish its compliance obligations."
            cta="Assign Compliance Framework"
            onCta={() => navigate("/admin/workspace-governance?tab=policies")}
          />
        }
      />

      {sel && <AssignmentDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function ComplianceAssignmentsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Compliance Assignments"
        subtitle="Assign regulatory frameworks, security standards and organizational compliance baselines to enterprise workspaces."
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
              Assign Framework
            </HeaderButton>
          </>
        }
      />
      <ComplianceAssignmentsView />
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

function FlowChain({ steps }: { steps: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 12.5,
              color: T.textNav,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background:
                i === steps.length - 1
                  ? "var(--cg-accent-bg-strong)"
                  : "transparent",
            }}
          >
            <span
              style={{
                color: T.textMuted,
                fontFamily: "monospace",
                fontSize: 11,
              }}
            >
              {(i + 1).toString().padStart(2, "0")}
            </span>
            {s}
          </div>
          {i < steps.length - 1 && (
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

// ════════════ Assignment Detail Drawer — 8 sub-tabs (spec §Assignment Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "frameworks",
    label: "Assigned Frameworks",
    icon: <BadgeCheck size={13} />,
  },
  {
    id: "controls",
    label: "Effective Controls",
    icon: <ListChecks size={13} />,
  },
  { id: "scope", label: "Assignment Scope", icon: <Target size={13} /> },
  { id: "exceptions", label: "Exceptions", icon: <ShieldAlert size={13} /> },
  { id: "evaluation", label: "Evaluation", icon: <Gauge size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function AssignmentDrawer({
  rec,
  onClose,
}: {
  rec: Assignment;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.workspace}
      subtitle={`${rec.profile} · ${rec.assignedFrameworks} frameworks · ${rec.status}`}
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
          <HeaderButton icon={<Plus size={13} />}>
            Assign Framework
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "frameworks" && <FrameworksTab rec={rec} />}
      {tab === "controls" && <ControlsTab rec={rec} />}
      {tab === "scope" && <ScopeTab />}
      {tab === "exceptions" && <ExceptionsTab rec={rec} />}
      {tab === "evaluation" && <EvaluationTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Assignment }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Workspace", v: rec.workspace },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Environment", v: rec.environment },
              { k: "Compliance Profile", v: rec.profile },
              { k: "Assignment Type", v: rec.assignmentType },
              { k: "Status", v: rec.status },
              { k: "Created Date", v: rec.created, sample: true },
              { k: "Modified Date", v: rec.modified, sample: true },
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
              {
                k: "Assigned Frameworks",
                v: rec.assignedFrameworks,
                sample: true,
              },
              { k: "Required Controls", v: rec.requiredControls, sample: true },
              {
                k: "Implemented Controls",
                v: rec.implementedControls,
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

function FrameworksTab({ rec }: { rec: Assignment }) {
  const list = Array.from({ length: rec.assignedFrameworks }, (_, i) => {
    const m = hashId(`${rec.id}-f-${i}`);
    return {
      id: `${rec.id}-f-${i}`,
      framework: pick(FRAMEWORKS, m),
      version: `20${23 + (m % 3)}`,
      assignment: pick(ASSIGNMENT_TYPES, m),
      inherited: m % 2 === 0 ? "Yes" : "No",
      status: pick<Status>(["Active", "Active", "Pending"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "framework", header: "Framework", render: (r) => r.framework },
    { key: "version", header: "Version", render: (r) => r.version },
    { key: "assignment", header: "Assignment", render: (r) => r.assignment },
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
        <HeaderButton icon={<Plus size={13} />}>Assign</HeaderButton>
        <HeaderButton variant="danger" icon={<Trash2 size={13} />}>
          Remove
        </HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ControlsTab({ rec }: { rec: Assignment }) {
  const n = hashId(rec.id);
  const list = Array.from({ length: 6 + (n % 6) }, (_, i) => {
    const m = hashId(`${rec.id}-c-${i}`);
    return {
      id: `${rec.id}-c-${i}`,
      control: `${pick(["AC", "AU", "CM", "IA", "SC", "SI"], m)}-${1 + (m % 20)}`,
      framework: pick(FRAMEWORKS, m),
      priority: pick(["Critical", "High", "Medium", "Low"], m),
      implementation: pick(["Implemented", "In Progress", "Not Started"], m),
      status: pick<Status>(["Active", "Pending"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "control", header: "Control", render: (r) => r.control },
    { key: "framework", header: "Framework", render: (r) => r.framework },
    { key: "priority", header: "Priority", render: (r) => r.priority },
    {
      key: "implementation",
      header: "Implementation",
      render: (r) => r.implementation,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];
  return (
    <>
      <Section title="Effective controls resolution" sample>
        <FlowChain
          steps={[
            "Framework",
            "Required Controls",
            "Inherited Controls",
            "Workspace Overrides",
            "Effective Compliance Controls",
          ]}
        />
      </Section>
      <Section title="Controls required after inheritance + evaluation" sample>
        <DirectoryTable columns={cols} rows={list} pageSize={8} />
      </Section>
    </>
  );
}

function ScopeTab() {
  return (
    <>
      <Section title="Assignment hierarchy" sample>
        <FlowChain steps={["Organization", "Business Unit", "Workspace"]} />
      </Section>
      <Section title="Assignment source" sample>
        <StatRow
          label="Assignment Source"
          value="Organization Baseline"
          tone="ok"
          sample
        />
        <StatRow
          label="Inherited"
          value="12 frameworks from ancestors"
          tone="ok"
          sample
        />
        <StatRow label="Override" value="2 at this workspace" sample />
        <StatRow
          label="Effective Assignment"
          value="Organization → Business Unit → Workspace"
          sample
        />
      </Section>
    </>
  );
}

function ExceptionsTab({ rec }: { rec: Assignment }) {
  const list = [
    "Temporary Exception",
    "Migration Exception",
    "Customer Requirement",
    "Regulatory Waiver",
  ]
    .slice(0, 1 + (hashId(rec.id) % 4))
    .map((reason, i) => ({
      id: `${rec.id}-x-${i}`,
      framework: pick(FRAMEWORKS, hashId(rec.id) + i),
      control: `${pick(["AC", "AU", "SC"], hashId(rec.id) + i)}-${1 + i}`,
      reason,
      approvedBy: pick(OWNERS, hashId(rec.id) + i),
      expiration: `2026-0${1 + ((hashId(rec.id) + i) % 8)}-15`,
      status: pick<Status>(["Active", "Pending"], hashId(rec.id) + i),
    }));
  const cols: Column<(typeof list)[number]>[] = [
    { key: "framework", header: "Framework", render: (r) => r.framework },
    { key: "control", header: "Control", render: (r) => r.control },
    { key: "reason", header: "Reason", render: (r) => r.reason },
    { key: "approvedBy", header: "Approved By", render: (r) => r.approvedBy },
    { key: "expiration", header: "Expiration", render: (r) => r.expiration },
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
        <HeaderButton icon={<Plus size={13} />}>Request Exception</HeaderButton>
        <HeaderButton icon={<ClipboardCheck size={13} />}>Approve</HeaderButton>
        <HeaderButton variant="danger">Reject</HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function EvaluationTab({ rec }: { rec: Assignment }) {
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
        <HeaderButton icon={<Gauge size={13} />}>Run Evaluation</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>
          Generate Report
        </HeaderButton>
        <SampleTag />
      </div>
      <Section title="Compliance assignment evaluation" sample>
        <StatRow
          label="Assigned Frameworks"
          value={rec.assignedFrameworks}
          tone="ok"
          sample
        />
        <StatRow
          label="Missing Assignments"
          value={hashId(rec.id) % 3}
          tone={hashId(rec.id) % 3 > 0 ? "warn" : "ok"}
          sample
        />
        <StatRow
          label="Duplicate Assignments"
          value={hashId(rec.id) % 2}
          sample
        />
        <StatRow
          label="Inherited Frameworks"
          value={
            rec.inherited
              ? `${1 + (hashId(rec.id) % 6)} from Organization`
              : "None"
          }
          sample
        />
        <StatRow
          label="Effective Compliance"
          value={`${rec.complianceScore}%`}
          tone={rec.complianceScore >= 85 ? "ok" : "warn"}
          sample
        />
      </Section>
    </>
  );
}

function ActivityTab({ rec }: { rec: Assignment }) {
  const events = [
    "Framework Assigned",
    "Framework Removed",
    "Profile Updated",
    "Exception Approved",
    "Assignment Published",
    "Compliance Evaluated",
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
    "Framework Assigned",
    "Framework Removed",
    "Assignment Modified",
    "Exception Approved",
    "Assignment Published",
    "Compliance Evaluated",
    "Assignment Deleted",
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

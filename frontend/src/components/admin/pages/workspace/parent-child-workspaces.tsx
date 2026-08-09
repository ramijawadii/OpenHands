/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Hierarchy & Relationships → Parent / Child Workspaces */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  GitBranch,
  GitFork,
  Link2,
  Link2Off,
  Move,
  RefreshCcw,
  Sliders,
  Eye,
  ShieldCheck,
  Download,
  LayoutGrid,
  Network,
  Layers,
  Share2,
  Boxes,
  Repeat,
  Activity as ActivityIcon,
  History,
  Pencil,
  Workflow,
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
 * Parent / Child Workspaces — the operational workspace-to-workspace hierarchy. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/03_Hierarchy & Relationships/
 * parent_child_workspaces.md.
 *
 * Unlike the Organization Hierarchy (which defines WHO owns a workspace), Parent / Child Workspaces
 * model HOW workspaces are operationally related — configuration inheritance, shared governance,
 * shared resources, lifecycle coordination and dependency graphs — while preserving workspace
 * isolation where required. Each child inherits selected capabilities from its parent.
 *
 * Reuses the Enterprise-Administration UX pattern (Banner · Toolbar · Hierarchy Tree · Filters ·
 * Search · Relationship Graph · Data Table · Relationship Detail Drawer with 8 sub-tabs). The
 * relationship set is deterministic representative sample data (tagged `Sample`); when the workspace
 * hierarchy backend lands, swap SAMPLE_RELATIONSHIPS for the live query — the component API is stable.
 */

// ── Lifecycle status model ───────────────────────────────────────────────────────────────────────
type Lifecycle =
  | "Provisioning"
  | "Active"
  | "Maintenance"
  | "Suspended"
  | "Archived"
  | "Decommissioned";

const STATUS_TONE: Record<Lifecycle, string> = {
  Provisioning: T.accent,
  Active: T.success,
  Maintenance: T.warning,
  Suspended: T.warning,
  Archived: T.textMuted,
  Decommissioned: T.danger,
};

// ── Second-level sub-navigation (rendered as the first FilterBar facet) ───────────────────────────
const VIEWS = [
  { id: "parents", label: "Parent Workspaces" },
  { id: "children", label: "Child Workspaces" },
  { id: "hierarchies", label: "Hierarchies" },
  { id: "orphans", label: "Orphan Workspaces" },
  { id: "cross", label: "Cross-Hierarchy Links" },
  { id: "inheritance", label: "Inheritance Policies" },
  { id: "graph", label: "Dependency Graph" },
  { id: "history", label: "Relationship History" },
];

// Relationship Types (spec §Relationship Types).
const RELATIONSHIP_TYPES = [
  "Parent",
  "Child",
  "Shared Service",
  "Platform Workspace",
  "Environment Workspace",
  "Business Workspace",
  "Reference Workspace",
];
const ENVIRONMENTS = ["Production", "Staging", "Development", "Sandbox"];
const BUSINESS_UNITS = [
  "Payments",
  "Identity",
  "Security",
  "Platform",
  "Data",
  "Retail",
];
const LIFECYCLE_STATES: Lifecycle[] = [
  "Provisioning",
  "Active",
  "Maintenance",
  "Suspended",
  "Archived",
  "Decommissioned",
];
const ROOTS = ["Corporate Platform", "Global Services", "Regional Platform"];
const OWNERS = [
  "John Smith",
  "Priya Nair",
  "Marco Rossi",
  "Sara Ahmed",
  "David Chen",
  "Aisha Khan",
];
const ACTORS = ["David Chen", "Aisha Khan", "Tomás Silva", "System"];

// Inheritance categories (spec §Inheritance).
const INHERITANCE_CATEGORIES = [
  "Workspace Policies",
  "Compliance Configuration",
  "Security Policies",
  "Identity Configuration",
  "Automation Policies",
  "Notification Policies",
  "AI Governance",
  "Resource Quotas",
  "Tags",
  "Metadata",
];

// Shared-resource categories (spec §Shared Resources).
const SHARED_CATEGORIES = [
  "Knowledge Bases",
  "AI Models",
  "Secrets",
  "Integrations",
  "Cloud Accounts",
  "Storage",
  "Automation",
  "Templates",
  "Shared Assets",
];

interface RelationshipRecord {
  id: string;
  workspace: string;
  parent: string; // "—" for a top-level parent
  relationshipType: string;
  children: number;
  inheritanceEnabled: boolean;
  status: Lifecycle;
  environment: string;
  businessUnit: string;
  owner: string;
  hierarchy: string; // root hierarchy this workspace belongs to
  hierarchyLevel: number;
  hierarchyDepth: number;
  inheritedPolicies: number;
  overrides: number;
  sharedResources: number;
  dependencies: number;
  complianceCoverage: number;
  crossLink: boolean;
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

// Deterministic representative relationship set (~15 records).
const SAMPLE_RELATIONSHIPS: RelationshipRecord[] = Array.from(
  { length: 15 },
  (_, i) => {
    const id = `WSR-${(3100 + i * 11).toString().padStart(5, "0")}`;
    const n = hashId(id);
    const isRoot = i % 5 === 0;
    const bu = pick(BUSINESS_UNITS, n);
    const env = pick(ENVIRONMENTS, n >> 2);
    const hierarchy = pick(ROOTS, n >> 3);
    const children = isRoot ? 3 + (n % 6) : n % 4;
    const relationshipType = isRoot
      ? pick(["Parent", "Platform Workspace"], n)
      : pick(
          [
            "Child",
            "Shared Service",
            "Environment Workspace",
            "Business Workspace",
            "Reference Workspace",
          ],
          n,
        );
    const level = isRoot ? 0 : 1 + (n % 3);
    return {
      id,
      workspace: `${bu} ${env}`,
      parent: isRoot ? "—" : hierarchy,
      relationshipType,
      children,
      inheritanceEnabled: n % 4 !== 0,
      status: pick(LIFECYCLE_STATES, n >> 1),
      environment: env,
      businessUnit: bu,
      owner: pick(OWNERS, n),
      hierarchy,
      hierarchyLevel: level,
      hierarchyDepth: isRoot ? 3 : Math.max(1, 4 - level),
      inheritedPolicies: isRoot ? 0 : 4 + (n % 10),
      overrides: isRoot ? 0 : n % 5,
      sharedResources: 2 + (n % 9),
      dependencies: n % 6,
      complianceCoverage: 72 + (n % 27),
      crossLink: n % 3 === 0 && !isRoot,
      created: `2026-0${1 + (n % 6)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      modified: `2026-0${6 + (n % 2)}-${(1 + ((n + 4) % 27)).toString().padStart(2, "0")}`,
    };
  },
);

function StatusBadge({ status }: { status: Lifecycle }) {
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
 * Embeddable body — sub-navigation + operational dashboard + hierarchy tree + relationship directory
 * + relationship detail drawer, WITHOUT the outer <Page> or the page banner. Rendered both as the
 * standalone route and as a tab of the Workspace Management console. Local state backs the View
 * sub-nav so it never collides with a host page's `?tab=`.
 */
export function ParentChildWorkspacesView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("parents");

  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fDepth, setFDepth] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fInherit, setFInherit] = React.useState("");
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

  const records = SAMPLE_RELATIONSHIPS;

  const inView = (r: RelationshipRecord): boolean => {
    switch (view) {
      case "parents":
        return r.parent === "—" || r.children > 0;
      case "children":
        return r.parent !== "—";
      case "orphans":
        return r.parent === "—" && r.children === 0;
      case "cross":
        return r.crossLink;
      case "inheritance":
        return r.inheritanceEnabled;
      case "hierarchies":
      case "graph":
      case "history":
      default:
        return true;
    }
  };

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      inView(r) &&
      (!q ||
        r.workspace.toLowerCase().includes(q) ||
        r.parent.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.environment.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.relationshipType.toLowerCase().includes(q)) &&
      (!fType || r.relationshipType === fType) &&
      (!fEnv || r.environment === fEnv) &&
      (!fDepth || String(r.hierarchyDepth) === fDepth) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fInherit ||
        (fInherit === "Enabled"
          ? r.inheritanceEnabled
          : !r.inheritanceEnabled)) &&
      (!fStatus || r.status === fStatus)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFEnv("");
    setFDepth("");
    setFBu("");
    setFInherit("");
    setFStatus("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // ── Operational Dashboard (spec §Operational Dashboard) ──
  const parents = records.filter(
    (r) => r.parent === "—" || r.children > 0,
  ).length;
  const childCount = records.filter((r) => r.parent !== "—").length;
  const maxDepth = Math.max(...records.map((r) => r.hierarchyDepth));
  const sharedTotal = records.reduce((a, r) => a + r.sharedResources, 0);
  const overridesTotal = records.reduce((a, r) => a + r.overrides, 0);

  const toolbar: CommandItem[] = [
    {
      key: "create-parent",
      label: "Create Parent",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=hierarchy"),
    },
    {
      key: "create-child",
      label: "Create Child",
      icon: <GitFork size={15} />,
      onClick: () => navigate("/admin/workspaces?tab=hierarchy"),
    },
    {
      key: "attach",
      label: "Attach Child",
      icon: <Link2 size={15} />,
      disabled: true,
    },
    {
      key: "detach",
      label: "Detach Child",
      icon: <Link2Off size={15} />,
      disabled: true,
    },
    {
      key: "move",
      label: "Move Workspace",
      icon: <Move size={15} />,
      disabled: true,
    },
    { key: "refresh", label: "Refresh", icon: <RefreshCcw size={15} /> },
    {
      key: "configure",
      label: "Configure Inheritance",
      icon: <Sliders size={15} />,
      disabled: true,
    },
    {
      key: "preview",
      label: "Preview Effective Configuration",
      icon: <Eye size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Hierarchy",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export Hierarchy",
      icon: <Download size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<RelationshipRecord>[] = [
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
          <LayoutGrid size={14} color={T.textMuted} />
          {r.workspace}
        </span>
      ),
    },
    {
      key: "parent",
      header: "Parent",
      sortValue: (r) => r.parent,
      render: (r) =>
        r.parent === "—" ? (
          <span style={{ color: T.textMuted }}>— (top-level)</span>
        ) : (
          r.parent
        ),
    },
    {
      key: "relationship",
      header: "Relationship",
      sortValue: (r) => r.relationshipType,
      render: (r) => r.relationshipType,
    },
    {
      key: "children",
      header: "Children",
      sortValue: (r) => r.children,
      render: (r) => r.children,
    },
    {
      key: "inheritance",
      header: "Inheritance",
      sortValue: (r) => (r.inheritanceEnabled ? 1 : 0),
      render: (r) => (
        <span style={{ color: r.inheritanceEnabled ? T.success : T.textMuted }}>
          {r.inheritanceEnabled ? "Enabled" : "Disabled"}
        </span>
      ),
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
      {/* Operational Dashboard */}
      <StatStripPlain
        items={[
          { label: "Parent Workspaces", value: parents },
          { label: "Child Workspaces", value: childCount },
          { label: "Hierarchy Depth", value: `${maxDepth} levels` },
          { label: "Shared Resources", value: sharedTotal },
          {
            label: "Inheritance Overrides",
            value: overridesTotal,
            tone: "warn",
          },
          { label: "Relationship Changes (30d)", value: 24 },
          { label: "Validation Errors", value: 2, tone: "danger" },
        ]}
      />

      <div style={{ height: 16 }} />

      {/* Hierarchy Tree */}
      <HierarchyTreeCard />

      {/* Relationship directory */}
      <DiscoveryListView
        title="Workspace relationship directory"
        commands={toolbar}
        pills={[
          {
            key: "view",
            label: "View",
            value: view,
            onChange: setView,
            options: VIEWS.map((v) => ({ value: v.id, label: v.label })),
          },
          {
            key: "type",
            label: "Relationship Type",
            value: fType,
            onChange: setFType,
            options: facet(RELATIONSHIP_TYPES),
          },
          {
            key: "env",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "depth",
            label: "Hierarchy Depth",
            value: fDepth,
            onChange: setFDepth,
            options: facet(records.map((r) => String(r.hierarchyDepth))),
          },
          {
            key: "bu",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "inherit",
            label: "Inheritance Enabled",
            value: fInherit,
            onChange: setFInherit,
            options: [
              { value: "", label: "All" },
              { value: "Enabled", label: "Enabled" },
              { value: "Disabled", label: "Disabled" },
            ],
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
        ]}
        presets={[{ label: "All relationships", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search workspace hierarchy — workspace, parent, child, business unit, environment, owner…"
        count={rows.length}
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={15}
        initialSort={{ key: "workspace", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<Move size={13} />} onClick={clear}>
              Move ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<Link2 size={13} />} onClick={clear}>
              Attach
            </HeaderButton>
            <HeaderButton icon={<Link2Off size={13} />} onClick={clear}>
              Detach
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
              { label: "Edit Relationship", onClick: () => setSelId(r.id) },
              { label: "Move", onClick: () => setSelId(r.id) },
              { label: "Attach Child", onClick: () => setSelId(r.id) },
              {
                label: "Detach Child",
                onClick: () => setSelId(r.id),
                danger: true,
              },
              { label: "Preview Inheritance", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Network size={20} />}
            title="No parent/child workspace relationships configured."
            hint="Create a parent workspace or attach a child workspace to model operational relationships, configuration inheritance and lifecycle coordination."
            cta="Create Parent Workspace"
            onCta={() => navigate("/admin/workspaces?tab=hierarchy")}
          />
        }
      />

      {/* View-specific surfaces */}
      {view === "graph" && <DependencyGraphCard />}
      {view === "history" && <RelationshipHistoryCard records={records} />}

      {/* Hierarchy validation (spec §Hierarchy Validation) */}
      <HierarchyValidationCard />

      {/* Enterprise relationship model (spec §Enterprise Relationship Model) */}
      <RelationshipModelCard />

      {sel && (
        <RelationshipDetailDrawer rec={sel} onClose={() => setSelId(null)} />
      )}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function ParentChildWorkspacesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Parent / Child Workspaces"
        subtitle="Manage hierarchical workspace relationships, inheritance policies, operational boundaries, and lifecycle dependencies."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=hierarchy")}
            >
              Create Parent
            </HeaderButton>
          </>
        }
      />
      <ParentChildWorkspacesView />
    </Page>
  );
}

// ════════════ Hierarchy Tree (spec §Hierarchy Tree) ════════════
const TREE_SUPPORTS = [
  "Expand",
  "Collapse",
  "Drag & Drop",
  "Move",
  "Filter",
  "Zoom",
  "Show Counts",
];
function HierarchyTreeCard() {
  const lines: { text: string; count?: number }[] = [
    { text: "Corporate Platform", count: 6 },
    { text: "├── Production", count: 3 },
    { text: "│   ├── Payments" },
    { text: "│   ├── Identity" },
    { text: "│   └── Security" },
    { text: "├── Staging", count: 1 },
    { text: "└── Development", count: 2 },
  ];
  return (
    <Card
      title="Hierarchy tree"
      desc="Expand, collapse, drag & drop, move, filter and zoom the workspace hierarchy."
      right={<SampleTag />}
    >
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 12.5,
          lineHeight: 1.9,
          color: T.textNav,
          background: "var(--cg-input-bg)",
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          padding: "12px 16px",
          overflowX: "auto",
        }}
      >
        {lines.map((l) => (
          <div
            key={l.text}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <span style={{ whiteSpace: "pre" }}>{l.text}</span>
            {l.count != null && (
              <span
                style={{
                  fontSize: 10.5,
                  color: T.textMuted,
                  border: `1px solid ${T.border}`,
                  borderRadius: 99,
                  padding: "0 7px",
                }}
              >
                {l.count}
              </span>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginTop: 12,
        }}
      >
        {TREE_SUPPORTS.map((s) => (
          <span
            key={s}
            style={{
              fontSize: 11,
              color: T.textMuted,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              padding: "3px 8px",
            }}
          >
            {s}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ════════════ Dependency Graph (spec §Dependency Graph) ════════════
const GRAPH_SUPPORTS = [
  "Zoom",
  "Filter",
  "Highlight Critical Paths",
  "Show Cycles",
];
function DependencyGraphCard() {
  const nodes = [
    "Workspace",
    "Depends On",
    "Shared Service",
    "Another Workspace",
  ];
  return (
    <Card
      title="Dependency graph"
      desc="Interactive visualization of operational dependencies between workspaces."
      right={<SampleTag />}
    >
      <FlowChain nodes={nodes} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
        {GRAPH_SUPPORTS.map((s) => (
          <span
            key={s}
            style={{
              fontSize: 11,
              color: T.textMuted,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              padding: "3px 8px",
            }}
          >
            {s}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ════════════ Relationship History (spec §Relationship History / Audit) ════════════
const HISTORY_EVENTS = [
  "Relationship Created",
  "Relationship Modified",
  "Workspace Attached",
  "Workspace Detached",
  "Inheritance Changed",
  "Hierarchy Updated",
  "Parent Changed",
  "Deleted",
];
function RelationshipHistoryCard({
  records,
}: {
  records: RelationshipRecord[];
}) {
  const rows = records.slice(0, 10).map((r, i) => ({
    id: `${r.id}-hist`,
    event: pick(HISTORY_EVENTS, hashId(r.id) + i),
    workspace: r.workspace,
    actor: pick(ACTORS, hashId(r.id) + i),
    date: r.modified,
  }));
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "event", header: "Event", render: (r) => r.event },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "actor", header: "Actor", render: (r) => r.actor },
    { key: "date", header: "Date", render: (r) => r.date },
  ];
  return (
    <Card
      title="Relationship history"
      desc="Chronological record of relationship changes across the hierarchy."
      right={<SampleTag />}
    >
      <DirectoryTable columns={cols} rows={rows} />
    </Card>
  );
}

// ════════════ Hierarchy Validation (spec §Hierarchy Validation) ════════════
const VALIDATION_CHECKS = [
  "Circular Dependencies",
  "Orphan Workspaces",
  "Broken Relationships",
  "Inheritance Conflicts",
  "Policy Conflicts",
  "Lifecycle Conflicts",
];
function HierarchyValidationCard() {
  return (
    <Card
      title="Hierarchy validation"
      desc="Automated integrity checks across the workspace hierarchy."
      right={<SampleTag />}
    >
      {VALIDATION_CHECKS.map((label, i) => {
        const state =
          i % 6 === 1 ? "Failed" : i % 3 === 2 ? "Warning" : "Passed";
        return (
          <StatRow
            key={label}
            label={label}
            value={state}
            tone={
              state === "Passed"
                ? "ok"
                : state === "Warning"
                  ? "warn"
                  : "danger"
            }
            sample
          />
        );
      })}
    </Card>
  );
}

// ════════════ Enterprise Relationship Model (spec §Enterprise Relationship Model) ════════════
function RelationshipModelCard() {
  return (
    <Card
      title="Enterprise relationship model"
      desc="Unlike the Organization Hierarchy (who owns a workspace), Parent / Child Workspaces define how workspaces are operationally related — inheritance, shared governance, lifecycle coordination — while preserving isolation."
    >
      <FlowChain
        nodes={[
          "Organization Hierarchy",
          "Parent Workspace",
          "Child Workspace",
          "Inherited Policies",
          "Shared Resources",
          "Workspace Operations",
        ]}
      />
    </Card>
  );
}

// A reusable vertical node → node flow (ASCII-style), no graph library.
function FlowChain({ nodes }: { nodes: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {nodes.map((node, i) => (
        <React.Fragment key={node}>
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
              background: "var(--cg-input-bg)",
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
            {node}
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

// ════════════ Relationship Detail Drawer — 8 sub-tabs (spec §Workspace Relationship Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "hierarchy", label: "Hierarchy", icon: <GitBranch size={13} /> },
  { id: "inheritance", label: "Inheritance", icon: <Layers size={13} /> },
  { id: "shared", label: "Shared Resources", icon: <Share2 size={13} /> },
  { id: "dependencies", label: "Dependencies", icon: <Workflow size={13} /> },
  { id: "lifecycle", label: "Lifecycle", icon: <Repeat size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function RelationshipDetailDrawer({
  rec,
  onClose,
}: {
  rec: RelationshipRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.workspace} · ${rec.relationshipType}`}
      subtitle={`Parent: ${rec.parent} · ${rec.children} children · ${rec.status}`}
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
          <HeaderButton icon={<Move size={13} />}>Move</HeaderButton>
          <HeaderButton icon={<Link2 size={13} />}>Attach Child</HeaderButton>
          <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
          <HeaderButton variant="primary" icon={<Pencil size={13} />}>
            Edit
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "hierarchy" && <HierarchyTab rec={rec} />}
      {tab === "inheritance" && <InheritanceTab rec={rec} />}
      {tab === "shared" && <SharedResourcesTab rec={rec} />}
      {tab === "dependencies" && <DependenciesTab rec={rec} />}
      {tab === "lifecycle" && <LifecycleTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
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
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: RelationshipRecord }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Workspace", v: rec.workspace },
              { k: "Relationship Type", v: rec.relationshipType },
              { k: "Parent Workspace", v: rec.parent },
              { k: "Hierarchy Level", v: `Level ${rec.hierarchyLevel}` },
              { k: "Environment", v: rec.environment },
              { k: "Business Unit", v: rec.businessUnit },
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
              { k: "Children", v: rec.children, sample: true },
              {
                k: "Inherited Policies",
                v: rec.inheritedPolicies,
                sample: true,
              },
              { k: "Shared Resources", v: rec.sharedResources, sample: true },
              { k: "Dependencies", v: rec.dependencies, sample: true },
              {
                k: "Compliance Coverage",
                v: `${rec.complianceCoverage}%`,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Hierarchy (parent → child → grandchild) ──
const HIERARCHY_SUBS = [
  { id: "workspace-hierarchy", label: "Workspace hierarchy" },
  { id: "positioning", label: "Positioning" },
];
function HierarchyTab({ rec }: { rec: RelationshipRecord }) {
  const [sub, setSub] = React.useState("workspace-hierarchy");
  const parentNode = rec.parent === "—" ? rec.workspace : rec.parent;
  const nodes =
    rec.parent === "—"
      ? [rec.workspace, "Child Workspace", "Grandchild Workspace"]
      : [parentNode, rec.workspace, "Child Workspace"];
  return (
    <>
      <Tabs tabs={HIERARCHY_SUBS} active={sub} onChange={setSub} />
      {sub === "workspace-hierarchy" && (
        <Section title="Workspace hierarchy" sample>
          <FlowChain nodes={nodes} />
        </Section>
      )}
      {sub === "positioning" && (
        <Section title="Positioning">
          <KVGrid
            items={[
              { k: "Parent", v: rec.parent },
              { k: "Children", v: rec.children, sample: true },
              { k: "Hierarchy Level", v: `Level ${rec.hierarchyLevel}` },
              {
                k: "Hierarchy Depth",
                v: `${rec.hierarchyDepth} levels`,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Inheritance (categories · resolution · overrides) ──
const INHERITANCE_SUBS = [
  { id: "inheritance-categories", label: "Inheritance categories" },
  { id: "resolution", label: "Resolution" },
  { id: "summary", label: "Summary" },
];
function InheritanceTab({ rec }: { rec: RelationshipRecord }) {
  const [sub, setSub] = React.useState("inheritance-categories");
  const n = hashId(rec.id);
  return (
    <>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
      >
        <HeaderButton icon={<Eye size={13} />}>
          Preview Effective Configuration
        </HeaderButton>
        <HeaderButton icon={<GitBranch size={13} />}>
          Compare Parent
        </HeaderButton>
        <HeaderButton icon={<Sliders size={13} />}>Show Overrides</HeaderButton>
      </div>

      <Tabs tabs={INHERITANCE_SUBS} active={sub} onChange={setSub} />
      {sub === "inheritance-categories" && (
        <Section title="Inheritance categories" sample>
          {INHERITANCE_CATEGORIES.map((cat, i) => {
            const state =
              (n + i) % 5 === 0
                ? "Locked"
                : (n + i) % 3 === 0
                  ? "Overridden"
                  : "Inherited";
            return (
              <StatRow
                key={cat}
                label={cat}
                value={state}
                tone={
                  state === "Inherited"
                    ? "ok"
                    : state === "Overridden"
                      ? "warn"
                      : "muted"
                }
                sample
              />
            );
          })}
        </Section>
      )}

      {sub === "resolution" && (
        <Section title="Resolution" sample>
          <FlowChain
            nodes={[
              "Parent Workspace",
              "Inherited Configuration",
              "Workspace Override",
              "Effective Configuration",
            ]}
          />
        </Section>
      )}

      {sub === "summary" && (
        <Section title="Summary" sample>
          <KVGrid
            cols={3}
            items={[
              {
                k: "Inherited",
                v: INHERITANCE_CATEGORIES.length - rec.overrides,
                sample: true,
              },
              { k: "Overridden", v: rec.overrides, sample: true },
              { k: "Locked", v: n % 3, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Shared Resources (categories + table) ──
function SharedResourcesTab({ rec }: { rec: RelationshipRecord }) {
  const n = hashId(rec.id);
  const rows = SHARED_CATEGORIES.slice(0, 3 + (n % 5)).map((type, i) => ({
    id: `${rec.id}-res-${i}`,
    resource: `${type} · ${rec.businessUnit}`,
    type,
    owner: pick(OWNERS, n + i),
    sharedWith: pick(
      ["All children", "Direct children", "Selected workspaces"],
      n + i,
    ),
    permission: pick(["Read", "Read / Write", "Admin"], n + i),
  }));
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "owner", header: "Owner", render: (r) => r.owner },
    { key: "sharedWith", header: "Shared With", render: (r) => r.sharedWith },
    { key: "permission", header: "Permission", render: (r) => r.permission },
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
        <Boxes size={14} /> Resources shared across the hierarchy <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={rows} />
    </>
  );
}

// ── Dependencies (consumes / provides / shared services) ──
const DEPENDENCIES_SUBS = [
  { id: "operational-dependencies", label: "Operational dependencies" },
  { id: "dependency-chain", label: "Dependency chain" },
];
function DependenciesTab({ rec }: { rec: RelationshipRecord }) {
  const [sub, setSub] = React.useState("operational-dependencies");
  return (
    <>
      <Tabs tabs={DEPENDENCIES_SUBS} active={sub} onChange={setSub} />
      {sub === "operational-dependencies" && (
        <Section title="Operational dependencies" sample>
          <KVGrid
            cols={1}
            items={[
              {
                k: "Consumes",
                v: "Identity Service · Secrets Vault",
                sample: true,
              },
              {
                k: "Provides",
                v: "Shared Knowledge Base · Automation",
                sample: true,
              },
              {
                k: "Shared Services",
                v: `${rec.sharedResources} services`,
                sample: true,
              },
              {
                k: "Required Services",
                v: "Logging · Compliance Engine",
                sample: true,
              },
              {
                k: "Dependent Workspaces",
                v: `${rec.children} workspaces`,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
      {sub === "dependency-chain" && (
        <Section title="Dependency chain" sample>
          <FlowChain
            nodes={["Parent Workspace", "Shared Service", "Child Workspace"]}
          />
        </Section>
      )}
    </>
  );
}

// ── Lifecycle (orders + states) ──
const LIFECYCLE_SUBS = [
  { id: "lifecycle-coordination", label: "Lifecycle coordination" },
  { id: "lifecycle-states", label: "Lifecycle states" },
];
function LifecycleTab({ rec }: { rec: RelationshipRecord }) {
  const [sub, setSub] = React.useState("lifecycle-coordination");
  return (
    <>
      <Tabs tabs={LIFECYCLE_SUBS} active={sub} onChange={setSub} />
      {sub === "lifecycle-coordination" && (
        <Section title="Lifecycle coordination" sample>
          <StatRow label="Provisioning Order" value="Parent → Child" sample />
          <StatRow label="Maintenance Order" value="Child → Parent" sample />
          <StatRow
            label="Archive Dependencies"
            value={`${rec.dependencies} blocking`}
            sample
          />
          <StatRow
            label="Deletion Dependencies"
            value={rec.children > 0 ? "Detach children first" : "None"}
            tone={rec.children > 0 ? "warn" : "ok"}
            sample
          />
          <StatRow label="Recovery Order" value="Parent → Child" sample />
        </Section>
      )}
      {sub === "lifecycle-states" && (
        <Section title="Lifecycle states">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {LIFECYCLE_STATES.map((s) => {
              const on = s === rec.status;
              return (
                <span
                  key={s}
                  style={{
                    fontSize: 11.5,
                    padding: "3px 9px",
                    borderRadius: 99,
                    border: `1px solid ${on ? STATUS_TONE[s] : T.border}`,
                    color: on ? STATUS_TONE[s] : T.textMuted,
                    fontWeight: on ? 600 : 400,
                  }}
                >
                  {s}
                </span>
              );
            })}
          </div>
        </Section>
      )}
    </>
  );
}

// ── Activity timeline ──
const ACTIVITY_EVENTS = [
  "Workspace Attached",
  "Workspace Detached",
  "Parent Changed",
  "Inheritance Updated",
  "Policy Updated",
  "Hierarchy Modified",
];
function ActivityTab({ rec }: { rec: RelationshipRecord }) {
  const n = hashId(rec.id);
  return (
    <>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
      >
        <Select
          label="Actor"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Actor: All" },
            ...ACTORS.map((a) => ({ value: a, label: a })),
          ]}
        />
        <Select
          label="Action"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Action: All" },
            ...ACTIVITY_EVENTS.map((a) => ({ value: a, label: a })),
          ]}
        />
        <Select
          label="Date"
          value=""
          onChange={() => {}}
          options={[
            { value: "", label: "Date: All" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
          ]}
        />
        <SampleTag />
      </div>
      {ACTIVITY_EVENTS.map((e, i) => (
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
              {pick(ACTORS, n + i)} ·{" "}
              {pick(["5 min", "2 h", "yesterday", "3 days"], n + i)} ago
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Audit History (immutable) ──
function AuditTab() {
  const events = [
    "Relationship Created",
    "Relationship Modified",
    "Workspace Attached",
    "Workspace Detached",
    "Inheritance Changed",
    "Hierarchy Updated",
    "Parent Changed",
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
          value={`${pick(ACTORS, i)} · 2026-07-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

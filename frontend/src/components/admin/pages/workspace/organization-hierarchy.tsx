/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Management → Workspace Administration → Hierarchy & Relationships → Organization Hierarchy */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Pencil,
  Move,
  GitMerge,
  Archive,
  Trash2,
  RefreshCcw,
  Download,
  LayoutGrid,
  UserCheck,
  ShieldCheck,
  Eye,
  ClipboardCheck,
  GitBranch,
  Boxes,
  Users,
  BarChart3,
  Activity as ActivityIcon,
  History,
  Network,
  FolderTree,
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
  PostureCard,
  PostureGrid,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { ColumnChooser } from "#/components/admin/settings-kit";

/**
 * Organization Hierarchy — the authoritative logical enterprise structure that defines where each
 * workspace resides within the organization (Business Units, Divisions, Departments, Regions, Legal
 * Entities, Business Domains, Portfolios, Programs). Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Administration/03_Hierarchy & Relationships/
 * organization_hierarchy.md.
 *
 * This is the enterprise's logical governance backbone — NOT the cloud infrastructure hierarchy. Every
 * workspace belongs to exactly one organizational location, and the hierarchy drives ownership, policy
 * inheritance, administrative delegation, compliance scope, reporting, chargeback, cost allocation,
 * search/discovery, access scoping and analytics. Reuses the Enterprise-Administration UX pattern
 * shared with the Users / Workspace-Requests modules (Banner · Toolbar · Hierarchy Tree · Filters ·
 * Search · Node Table · Bulk/Row actions · Organization Detail Drawer with 8 sub-tabs).
 *
 * There is no hierarchy backend yet, so the node set is representative sample data (tagged `Sample` in
 * the UI). When admin/org_model.py + the inheritance engine land, swap SAMPLE_NODES for the live query
 * — the component API stays identical.
 */

// ── Node-type / status models ─────────────────────────────────────────────────────────────────────
type NodeType =
  | "Enterprise"
  | "Business Unit"
  | "Division"
  | "Department"
  | "Region"
  | "Legal Entity"
  | "Business Domain"
  | "Portfolio"
  | "Program";

type Status = "Active" | "Under Review" | "Draft" | "Archived";

const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  "Under Review": T.warning,
  Draft: T.textMuted,
  Archived: T.textMuted,
};

// Second-level sub-navigation (spec §Navigation) — surfaced as the first FilterBar facet ("View").
const VIEW_TABS: {
  id: string;
  label: string;
  type?: NodeType;
  special?: "unassigned";
}[] = [
  { id: "all", label: "All Nodes" },
  { id: "enterprise", label: "Enterprise", type: "Enterprise" },
  { id: "business-units", label: "Business Units", type: "Business Unit" },
  { id: "divisions", label: "Divisions", type: "Division" },
  { id: "departments", label: "Departments", type: "Department" },
  { id: "regions", label: "Regions", type: "Region" },
  { id: "legal-entities", label: "Legal Entities", type: "Legal Entity" },
  {
    id: "business-domains",
    label: "Business Domains",
    type: "Business Domain",
  },
  { id: "portfolios", label: "Portfolios", type: "Portfolio" },
  { id: "programs", label: "Programs", type: "Program" },
  { id: "unassigned", label: "Unassigned Workspaces", special: "unassigned" },
];

const NODE_TYPES: NodeType[] = [
  "Enterprise",
  "Business Unit",
  "Division",
  "Department",
  "Region",
  "Legal Entity",
  "Business Domain",
  "Portfolio",
  "Program",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const REGIONS = ["Americas", "Europe", "APAC", "Global"];
const OWNERS = [
  "Finance CIO",
  "Aisha Khan",
  "David Chen",
  "Marco Rossi",
  "Priya Nair",
  "Tomás Silva",
];
const COMPLIANCE_SCOPES = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST CSF",
];
const STATUSES: Status[] = ["Active", "Under Review", "Draft", "Archived"];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const EXECUTIVE_SPONSORS = ["CFO", "CTO", "COO", "CISO", "Chief Data Officer"];

interface OrgNode {
  id: string;
  name: string;
  type: NodeType;
  parent: string;
  workspaces: number;
  policies: number;
  owner: string;
  status: Status;
  businessUnit: string;
  region: string;
  complianceScope: string;
  description: string;
  created: string;
  modified: string;
  depth: number;
  unassigned: boolean;
  // Statistics
  childOrgs: number;
  compliancePrograms: number;
  administrators: number;
  businessOwners: number;
  // Ownership
  businessOwner: string;
  executiveSponsor: string;
  costCenter: string;
  delegatedAdmins: string[];
  workspaceOwners: string[];
  // Analytics
  monthlyCost: number;
  complianceCoverage: number;
  resourceConsumption: number;
  riskScore: number;
  growth: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

// Deterministic representative organization-node set.
const SAMPLE_NODES: OrgNode[] = Array.from({ length: 15 }, (_, i) => {
  const id = `ORG-${(1000 + i * 13).toString().padStart(5, "0")}`;
  const n = hashId(id);
  const type = i === 0 ? "Enterprise" : pick(NODE_TYPES.slice(1), n);
  const status =
    i === 0
      ? "Active"
      : pick<Status>(
          ["Active", "Active", "Under Review", "Draft", "Archived"],
          n,
        );
  const bu = pick(BUSINESS_UNITS, n);
  const region = pick(REGIONS, n >> 2);
  const depth =
    type === "Enterprise"
      ? 0
      : type === "Division" || type === "Region"
        ? 1
        : type === "Business Unit" || type === "Legal Entity"
          ? 2
          : 3;
  const name =
    type === "Enterprise"
      ? "Contoso Enterprise"
      : type === "Region"
        ? region
        : `${bu} ${type === "Business Unit" ? "" : type}`.trim();
  const parent =
    type === "Enterprise"
      ? "—"
      : depth === 1
        ? "Contoso Enterprise"
        : depth === 2
          ? pick(REGIONS, n)
          : bu;
  const workspaces =
    type === "Enterprise" ? 312 : (n % 90) + (type === "Department" ? 4 : 12);
  return {
    id,
    name,
    type,
    parent,
    workspaces,
    policies: 2 + (n % 18),
    owner: type === "Enterprise" ? "Enterprise Admin" : pick(OWNERS, n),
    status,
    businessUnit: bu,
    region,
    complianceScope: pick(COMPLIANCE_SCOPES, n),
    description: `${type} node governing ${workspaces} workspaces across the ${bu} organization in ${region}.`,
    created: `2024-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    modified: `2026-0${1 + (n % 7)}-${(1 + ((n + 9) % 27)).toString().padStart(2, "0")}`,
    depth,
    unassigned: i === 14, // one representative "unassigned workspaces" bucket
    childOrgs: type === "Enterprise" ? 9 : n % 7,
    compliancePrograms: 1 + (n % 5),
    administrators: 1 + (n % 8),
    businessOwners: 1 + (n % 4),
    businessOwner: pick(OWNERS, n + 1),
    executiveSponsor: pick(EXECUTIVE_SPONSORS, n),
    costCenter: `CC-${(4000 + (n % 900)).toString()}`,
    delegatedAdmins: [pick(OWNERS, n + 2), pick(OWNERS, n + 3)],
    workspaceOwners: [
      pick(OWNERS, n + 4),
      pick(OWNERS, n + 5),
      pick(OWNERS, n + 6),
    ],
    monthlyCost: 8 + (n % 240),
    complianceCoverage: 62 + (n % 38),
    resourceConsumption: 40 + (n % 60),
    riskScore: 10 + (n % 80),
    growth: 2 + (n % 28),
  };
});

const STATUS_ORDER: Record<Status, number> = {
  Active: 0,
  "Under Review": 1,
  Draft: 2,
  Archived: 3,
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

// Workspace-count facet buckets (spec §Filters → Workspace Count).
const COUNT_BUCKETS: {
  value: string;
  label: string;
  test: (n: number) => boolean;
}[] = [
  { value: "0", label: "0 (empty)", test: (n) => n === 0 },
  { value: "1-25", label: "1–25", test: (n) => n >= 1 && n <= 25 },
  { value: "26-75", label: "26–75", test: (n) => n >= 26 && n <= 75 },
  { value: "76+", label: "76+", test: (n) => n >= 76 },
];

/**
 * Embeddable body — operational dashboard + hierarchy visualizations + node directory + organization
 * detail drawer, WITHOUT the outer <Page> or the page banner. Rendered both as the standalone route
 * and as a tab of the Workspace Administration console. Uses local state for the View sub-nav so it
 * never collides with a host page's `?tab=`.
 */
export function OrganizationHierarchyView() {
  const navigate = useNavigate();
  const [view, setView] = React.useState("all");

  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [fRegion, setFRegion] = React.useState("");
  const [fCount, setFCount] = React.useState("");
  const [fOwner, setFOwner] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fCompliance, setFCompliance] = React.useState("");

  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_NODES;
  const viewDef = VIEW_TABS.find((v) => v.id === view);

  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    const viewMatch =
      viewDef?.special === "unassigned"
        ? r.unassigned
        : viewDef?.type
          ? r.type === viewDef.type
          : true;
    const countBucket = COUNT_BUCKETS.find((b) => b.value === fCount);
    return (
      viewMatch &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.parent.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q)) &&
      (!fType || r.type === fType) &&
      (!fBu || r.businessUnit === fBu) &&
      (!fRegion || r.region === fRegion) &&
      (!countBucket || countBucket.test(r.workspaces)) &&
      (!fOwner || r.owner === fOwner) &&
      (!fStatus || r.status === fStatus) &&
      (!fCompliance || r.complianceScope === fCompliance)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFBu("");
    setFRegion("");
    setFCount("");
    setFOwner("");
    setFStatus("");
    setFCompliance("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;

  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Operational Dashboard metrics (spec §Operational Dashboard).
  const totalWorkspaces = records.reduce((a, r) => a + r.workspaces, 0);
  const buCount = records.filter((r) => r.type === "Business Unit").length;
  const deptCount = records.filter((r) => r.type === "Department").length;
  const unassignedCount = records.filter((r) => r.unassigned).length;
  const maxDepth = Math.max(...records.map((r) => r.depth)) + 1;
  const policyCoverage = Math.round(
    (records.filter((r) => r.policies > 0).length / records.length) * 100,
  );

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Node",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspaces"),
    },
    {
      key: "edit",
      label: "Edit Node",
      icon: <Pencil size={15} />,
      disabled: true,
    },
    {
      key: "move",
      label: "Move Node",
      icon: <Move size={15} />,
      disabled: true,
    },
    {
      key: "merge",
      label: "Merge Nodes",
      icon: <GitMerge size={15} />,
      disabled: true,
    },
    {
      key: "archive",
      label: "Archive Node",
      icon: <Archive size={15} />,
      disabled: true,
    },
    {
      key: "delete",
      label: "Delete Node",
      icon: <Trash2 size={15} />,
      disabled: true,
    },
    {
      key: "refresh",
      label: "Refresh",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "assign-ws",
      label: "Assign Workspaces",
      icon: <LayoutGrid size={15} />,
      disabled: true,
    },
    {
      key: "assign-owners",
      label: "Assign Owners",
      icon: <UserCheck size={15} />,
      disabled: true,
    },
    {
      key: "assign-policies",
      label: "Assign Policies",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "preview",
      label: "Preview Inheritance",
      icon: <Eye size={15} />,
      disabled: true,
    },
    {
      key: "validate",
      label: "Validate Hierarchy",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<OrgNode>[] = [
    {
      key: "name",
      header: "Organization",
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
          <FolderTree size={14} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortValue: (r) => r.type,
      render: (r) => r.type,
    },
    {
      key: "parent",
      header: "Parent",
      sortValue: (r) => r.parent,
      render: (r) => r.parent,
    },
    {
      key: "workspaces",
      header: "Workspaces",
      sortValue: (r) => r.workspaces,
      render: (r) => r.workspaces,
    },
    {
      key: "policies",
      header: "Policies",
      sortValue: (r) => r.policies,
      render: (r) => r.policies,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (r) => r.owner,
      render: (r) => r.owner,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => STATUS_ORDER[r.status],
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <>
      {/* Operational Dashboard (spec §Operational Dashboard) */}
      <PostureGrid>
        <PostureCard
          title="Organization Nodes"
          value={records.length}
          sub={
            <>
              Across the enterprise <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Business Units"
          value={buCount}
          sub={
            <>
              Top-level organizations <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Departments"
          value={deptCount}
          sub={
            <>
              Leaf-level organizations <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Managed Workspaces"
          value={totalWorkspaces}
          tone="ok"
          sub={
            <>
              Placed in the hierarchy <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Hierarchy Depth"
          value={maxDepth}
          sub={
            <>
              Enterprise → Workspace levels <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Unassigned Workspaces"
          value={unassignedCount}
          tone={unassignedCount > 0 ? "warn" : "ok"}
          sub={
            <>
              Need organizational placement <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Policy Coverage"
          value={`${policyCoverage}%`}
          tone={policyCoverage >= 80 ? "ok" : "warn"}
          sub={
            <>
              Nodes with governance <SampleTag />
            </>
          }
        />
      </PostureGrid>

      {/* Hierarchy Tree (spec §Hierarchy Tree) */}
      <Card
        title="Hierarchy tree"
        desc="The enterprise organizational tree — supports expand · collapse · drag & drop · move · filter · zoom."
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HeaderButton icon={<Plus size={13} />}>Expand</HeaderButton>
            <HeaderButton>Collapse</HeaderButton>
            <HeaderButton icon={<Move size={13} />}>Move</HeaderButton>
          </div>
        }
      >
        <AsciiTree
          lines={[
            "Enterprise",
            "│",
            "├── Americas",
            "│   ├── Finance",
            "│   ├── HR",
            "│   └── Platform",
            "│",
            "├── Europe",
            "│",
            "└── APAC",
          ]}
        />
      </Card>

      {/* Node Table (spec §Node Table + §Toolbar + §Filters + §Search + §Row/Bulk Actions) */}
      <DiscoveryListView
        title="Organization nodes"
        commands={toolbar}
        pills={[
          {
            key: "view",
            label: "View",
            value: view,
            onChange: setView,
            options: VIEW_TABS.map((v) => ({ value: v.id, label: v.label })),
          },
          {
            key: "type",
            label: "Node Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.type)),
          },
          {
            key: "bu",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
          {
            key: "region",
            label: "Region",
            value: fRegion,
            onChange: setFRegion,
            options: facet(records.map((r) => r.region)),
          },
          {
            key: "count",
            label: "Workspace Count",
            value: fCount,
            onChange: setFCount,
            options: [
              { value: "", label: "All" },
              ...COUNT_BUCKETS.map((b) => ({ value: b.value, label: b.label })),
            ],
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
            key: "compliance",
            label: "Compliance Scope",
            value: fCompliance,
            onChange: setFCompliance,
            options: facet(records.map((r) => r.complianceScope)),
          },
        ]}
        presets={[{ label: "All nodes", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search organization hierarchy — organization, business unit, department, region, portfolio, program, workspace…"
        count={rows.length}
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "workspaces", dir: "desc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<ShieldCheck size={13} />} onClick={clear}>
              Assign Policies ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<Move size={13} />} onClick={clear}>
              Move
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
              { label: "View", onClick: () => setSelId(r.id) },
              { label: "Edit", onClick: () => setSelId(r.id) },
              { label: "Move", onClick: () => setSelId(r.id) },
              { label: "Assign Workspace", onClick: () => setSelId(r.id) },
              { label: "Assign Policy", onClick: () => setSelId(r.id) },
              { label: "View Descendants", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
              {
                label: "Archive",
                onClick: () => setSelId(r.id),
                danger: true,
              },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Network size={20} />}
            title="No organizational hierarchy configured."
            hint="Create an organization structure, or import an existing organization, to place your workspaces."
            cta="Create Organization Structure"
            onCta={() => navigate("/admin/workspaces")}
          />
        }
      />

      {/* Hierarchy Visualization (spec §Hierarchy Visualization) */}
      <Card
        title="Hierarchy visualization"
        desc="Interactive enterprise tree."
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HeaderButton>Expand All</HeaderButton>
            <HeaderButton>Collapse All</HeaderButton>
            <HeaderButton>Show Workspace Counts</HeaderButton>
            <HeaderButton>Show Policies</HeaderButton>
            <HeaderButton>Show Compliance</HeaderButton>
          </div>
        }
      >
        <AsciiTree
          lines={[
            "Enterprise",
            "│",
            "├── Finance",
            "│   ├── Payments",
            "│   ├── Treasury",
            "│   └── Audit",
            "│",
            "├── Engineering",
            "│   ├── Platform",
            "│   ├── Cloud",
            "│   └── AI",
            "│",
            "└── Operations",
          ]}
        />
      </Card>

      {/* Inheritance Preview (spec §Inheritance Preview) */}
      <Card
        title="Inheritance preview"
        desc="Shows what the selected organizational node inherits down the enterprise governance chain."
        right={
          <HeaderButton icon={<Eye size={13} />}>
            Preview Inheritance
          </HeaderButton>
        }
      >
        <FlowChain
          steps={[
            "Enterprise Policies",
            "Division Policies",
            "Business Unit Policies",
            "Department Policies",
            "Workspace",
          ]}
        />
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}
        >
          <StatRow
            label="Effective Policies"
            value="18 resolved"
            tone="ok"
            sample
          />
          <div style={{ width: "100%" }} />
          <StatRow
            label="Inherited Settings"
            value="14 from ancestors"
            sample
          />
          <div style={{ width: "100%" }} />
          <StatRow
            label="Locked Settings"
            value="5 mandatory floors"
            tone="warn"
            sample
          />
          <div style={{ width: "100%" }} />
          <StatRow label="Overrides" value="2 at this node" sample />
        </div>
      </Card>

      {sel && <OrgDetailDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

/** Standalone route wrapper — banner + <Page> chrome around the embeddable view. */
export function OrganizationHierarchyPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Organization Hierarchy"
        subtitle="Manage the enterprise organizational structure that governs workspace ownership, policy inheritance, reporting, and operational visibility."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces")}
            >
              Create Node
            </HeaderButton>
          </>
        }
      />
      <OrganizationHierarchyView />
    </Page>
  );
}

// ── Shared visual helpers ─────────────────────────────────────────────────────────────────────────
/** Renders an indented ASCII/text tree inside a monospace block (admin-kit primitives only). */
function AsciiTree({ lines }: { lines: string[] }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 11.5, color: T.textMuted }}>
          Enterprise organizational tree
        </span>
        <SampleTag />
      </div>
      <pre
        style={{
          margin: 0,
          fontFamily: "monospace",
          fontSize: 12.5,
          lineHeight: 1.65,
          color: T.textNav,
          whiteSpace: "pre",
          overflowX: "auto",
        }}
      >
        {lines.join("\n")}
      </pre>
    </>
  );
}

/** Renders a node → node flow chain (vertical), like the reference's inheritance pipeline. */
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

// ════════════ Organization Detail Drawer — 8 sub-tabs (spec §Organization Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "hierarchy", label: "Hierarchy", icon: <GitBranch size={13} /> },
  { id: "workspaces", label: "Workspaces", icon: <Boxes size={13} /> },
  { id: "governance", label: "Governance", icon: <ShieldCheck size={13} /> },
  { id: "ownership", label: "Ownership", icon: <Users size={13} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function OrgDetailDrawer({
  rec,
  onClose,
}: {
  rec: OrgNode;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      // Drawer Header (spec §Drawer Header): Name · Type · Workspace Count · Status
      title={`${rec.name}`}
      subtitle={`${rec.type} · ${rec.workspaces} workspaces · ${rec.status}`}
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
          {/* Quick Actions (spec §Drawer Header → Quick Actions) */}
          <HeaderButton icon={<Pencil size={13} />}>Edit</HeaderButton>
          <HeaderButton icon={<LayoutGrid size={13} />}>
            Assign Workspace
          </HeaderButton>
          <HeaderButton icon={<Eye size={13} />}>
            Preview Inheritance
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "hierarchy" && <HierarchyTab rec={rec} />}
      {tab === "workspaces" && <WorkspacesTab rec={rec} />}
      {tab === "governance" && <GovernanceTab rec={rec} />}
      {tab === "ownership" && <OwnershipTab rec={rec} />}
      {tab === "analytics" && <AnalyticsTab rec={rec} />}
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
function OverviewTab({ rec }: { rec: OrgNode }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Name", v: rec.name },
              { k: "Organization Type", v: rec.type },
              { k: "Parent", v: rec.parent },
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
              { k: "Child Organizations", v: rec.childOrgs, sample: true },
              { k: "Workspaces", v: rec.workspaces, sample: true },
              { k: "Policies", v: rec.policies, sample: true },
              {
                k: "Compliance Programs",
                v: rec.compliancePrograms,
                sample: true,
              },
              { k: "Administrators", v: rec.administrators, sample: true },
              { k: "Business Owners", v: rec.businessOwners, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Hierarchy (relationships) ──
const HIERARCHY_SUBS = [
  { id: "organizational-relationships", label: "Organizational relationships" },
  { id: "relationship-detail", label: "Relationship detail" },
  { id: "child-organizations", label: "Child organizations" },
];
function HierarchyTab({ rec }: { rec: OrgNode }) {
  const [sub, setSub] = React.useState("organizational-relationships");
  const children = ["Payments", "Treasury", "Audit", "Platform", "Cloud"].slice(
    0,
    2 + (hashId(rec.id) % 3),
  );
  return (
    <>
      <Tabs tabs={HIERARCHY_SUBS} active={sub} onChange={setSub} />
      {sub === "organizational-relationships" && (
        <Section title="Organizational relationships" sample>
          <FlowChain
            steps={[
              "Enterprise",
              "Division",
              "Business Unit",
              "Department",
              "Workspace",
            ]}
          />
        </Section>
      )}
      {sub === "relationship-detail" && (
        <Section title="Relationship detail" sample>
          <StatRow label="Parent" value={rec.parent} sample />
          <StatRow
            label="Children"
            value={`${children.length} child organizations`}
            sample
          />
          <StatRow label="Depth" value={`Level ${rec.depth}`} sample />
          <StatRow
            label="Inherited Policies"
            value={`${rec.policies} policies from ancestors`}
            tone="ok"
            sample
          />
        </Section>
      )}
      {sub === "child-organizations" && (
        <Section title="Child organizations" sample>
          <AsciiTree
            lines={[
              rec.name,
              "│",
              ...children.map(
                (c, i) => `${i === children.length - 1 ? "└──" : "├──"} ${c}`,
              ),
            ]}
          />
        </Section>
      )}
    </>
  );
}

// ── Workspaces belonging to this node ──
function WorkspacesTab({ rec }: { rec: OrgNode }) {
  const n = hashId(rec.id);
  const list = Array.from({ length: 2 + (n % 5) }, (_, i) => {
    const m = hashId(`${rec.id}-ws-${i}`);
    return {
      id: `${rec.id}-ws-${i}`,
      workspace: `${rec.businessUnit} ${pick(ENVIRONMENTS, m)}`,
      environment: pick(ENVIRONMENTS, m),
      owner: pick(OWNERS, m),
      compliance: pick(COMPLIANCE_SCOPES, m),
      status: pick<Status>(STATUSES, m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "environment", header: "Environment", render: (r) => r.environment },
    { key: "owner", header: "Owner", render: (r) => r.owner },
    { key: "compliance", header: "Compliance", render: (r) => r.compliance },
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
        <HeaderButton icon={<LayoutGrid size={13} />}>
          Assign Workspace
        </HeaderButton>
        <HeaderButton icon={<Move size={13} />}>Move Workspace</HeaderButton>
        <HeaderButton icon={<Download size={13} />}>Export</HeaderButton>
        <SampleTag />
      </div>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
        Every workspace belonging to {rec.name}.
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

// ── Governance inherited by this node ──
function GovernanceTab({ rec }: { rec: OrgNode }) {
  const sections: { title: string; value: string; tone?: "ok" | "warn" }[] = [
    {
      title: "Inherited Policies",
      value: `${rec.policies} effective`,
      tone: "ok",
    },
    {
      title: "Compliance Programs",
      value: `${rec.compliancePrograms} · ${rec.complianceScope}`,
      tone: "ok",
    },
    {
      title: "Platform Security",
      value: "Baseline hardened profile",
      tone: "ok",
    },
    {
      title: "Identity Policies",
      value: "SSO + conditional access",
      tone: "ok",
    },
    { title: "Approval Chains", value: "2-stage governance approval" },
    {
      title: "Automation Policies",
      value: "Drift remediation enabled",
      tone: "warn",
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
        <HeaderButton icon={<Eye size={13} />}>
          Preview Effective Governance
        </HeaderButton>
        <SampleTag />
      </div>
      <Section title="Governance inherited by this node" sample>
        {sections.map((s) => (
          <StatRow
            key={s.title}
            label={s.title}
            value={s.value}
            tone={s.tone}
            sample
          />
        ))}
      </Section>
    </>
  );
}

// ── Ownership ──
function OwnershipTab({ rec }: { rec: OrgNode }) {
  return (
    <Section title="Ownership" sample>
      <KVGrid
        items={[
          { k: "Business Owner", v: rec.businessOwner, sample: true },
          { k: "Executive Sponsor", v: rec.executiveSponsor, sample: true },
          {
            k: "Workspace Owners",
            v: rec.workspaceOwners.join(", "),
            sample: true,
          },
          {
            k: "Delegated Administrators",
            v: rec.delegatedAdmins.join(", "),
            sample: true,
          },
          { k: "Cost Center", v: rec.costCenter, sample: true },
        ]}
      />
    </Section>
  );
}

// ── Analytics ──
const ANALYTICS_SUBS = [
  { id: "metrics", label: "Metrics" },
  { id: "charts", label: "Charts" },
];
function AnalyticsTab({ rec }: { rec: OrgNode }) {
  const [sub, setSub] = React.useState("metrics");
  const charts: { label: string; value: number }[] = [
    { label: "Workspace Growth", value: rec.growth * 3 },
    { label: "Compliance Coverage", value: rec.complianceCoverage },
    {
      label: "Cost Allocation",
      value: Math.min(100, Math.round((rec.monthlyCost / 250) * 100)),
    },
    { label: "Regional Distribution", value: rec.resourceConsumption },
  ];
  return (
    <>
      <Tabs tabs={ANALYTICS_SUBS} active={sub} onChange={setSub} />
      {sub === "metrics" && (
        <Section title="Metrics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Workspace Count", v: rec.workspaces, sample: true },
              { k: "Monthly Cost", v: `$${rec.monthlyCost}k`, sample: true },
              {
                k: "Compliance Coverage",
                v: `${rec.complianceCoverage}%`,
                sample: true,
              },
              {
                k: "Resource Consumption",
                v: `${rec.resourceConsumption}%`,
                sample: true,
              },
              { k: "Risk Score", v: `${rec.riskScore}/100`, sample: true },
              { k: "Growth", v: `+${rec.growth}% MoM`, sample: true },
            ]}
          />
        </Section>
      )}
      {sub === "charts" && (
        <Section title="Charts" sample>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {charts.map((c) => (
              <div key={c.label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: T.textNav,
                    marginBottom: 4,
                  }}
                >
                  <span>{c.label}</span>
                  <span style={{ color: T.textMuted }}>{c.value}%</span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 99,
                    background: "var(--cg-bg-badge)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, c.value)}%`,
                      background: T.accent,
                      borderRadius: 99,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

// ── Activity timeline (spec §Activity) ──
function ActivityTab({ rec }: { rec: OrgNode }) {
  const events = [
    "Node Created",
    "Workspace Assigned",
    "Hierarchy Updated",
    "Policy Assigned",
    "Organization Renamed",
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

// ── Audit History (immutable, read-only — spec §Audit History) ──
function AuditTab() {
  const events = [
    "Organization Created",
    "Organization Modified",
    "Workspace Assigned",
    "Workspace Moved",
    "Policy Assigned",
    "Ownership Changed",
    "Hierarchy Updated",
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

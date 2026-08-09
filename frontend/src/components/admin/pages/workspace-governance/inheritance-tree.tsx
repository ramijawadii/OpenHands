/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Inheritance & Overrides → Inheritance Tree */
import React from "react";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Briefcase,
  LayoutTemplate,
  Boxes,
  Maximize2,
  Minimize2,
  RefreshCcw,
  Eye,
  ShieldCheck,
  Lock,
  Download,
  LayoutGrid,
  ArrowDownToLine,
  ArrowUpFromLine,
  ListChecks,
  SlidersHorizontal,
  Network,
  History,
  Layers,
  AlertTriangle,
} from "lucide-react";
import {
  Page,
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
  ScopeBadge,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { StatStripPlain } from "#/components/admin/settings-kit";

/**
 * Inheritance Tree — the authoritative visualization of governance inheritance across the platform:
 * how configuration, policies and settings flow through Organization → Business Unit → Workspace
 * Template → Workspace, where they are overridden, locked, or conflict. Unlike Effective Configuration
 * (the final computed result), the Inheritance Tree shows the hierarchical relationships that produced
 * it. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/02_Inheritance & Overrides/inheritance_tree.md.
 *
 * Interactive hierarchy explorer (expand/collapse, status indicators) + 9-tab node detail drawer. No
 * inheritance backend yet → deterministic sample hierarchy tagged `Sample`.
 */

type NodeType =
  | "Organization"
  | "Business Unit"
  | "Workspace Template"
  | "Workspace";
type NodeStatus =
  | "Healthy"
  | "Inherited"
  | "Overridden"
  | "Conflict"
  | "Archived";

const STATUS_TONE: Record<NodeStatus, string> = {
  Healthy: T.success,
  Inherited: T.accent,
  Overridden: T.warning,
  Conflict: T.danger,
  Archived: T.textMuted,
};
const TYPE_ICON: Record<NodeType, React.ReactNode> = {
  Organization: <Building2 size={14} />,
  "Business Unit": <Briefcase size={14} />,
  "Workspace Template": <LayoutTemplate size={14} />,
  Workspace: <Boxes size={14} />,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface TreeNode {
  id: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  owner: string;
  businessUnit: string;
  configVersion: string;
  inheritedCount: number;
  overrides: number;
  locked: number;
  conflicts: number;
  children?: TreeNode[];
}

const OWNERS = [
  "Governance Admin",
  "Security Team",
  "Platform Team",
  "BU Lead",
  "Workspace Admin",
];

function mkWorkspace(bu: string, i: number): TreeNode {
  const id = `WS-${bu}-${i}`;
  const n = hashId(id);
  return {
    id,
    name: `${bu} ${pick(["Payments", "Web", "Data", "Mobile", "Analytics", "Billing"], n)} WS`,
    type: "Workspace",
    status: pick<NodeStatus>(
      ["Healthy", "Healthy", "Inherited", "Overridden", "Conflict"],
      n,
    ),
    owner: pick(OWNERS, n),
    businessUnit: bu,
    configVersion: `v${1 + (n % 9)}`,
    inheritedCount: 20 + (n % 40),
    overrides: n % 6,
    locked: 3 + (n % 8),
    conflicts: n % 3 === 0 ? n % 2 : 0,
  };
}
function mkTemplate(bu: string, i: number): TreeNode {
  const id = `TPL-${bu}-${i}`;
  const n = hashId(id);
  return {
    id,
    name: `${pick(["Production", "Regulated", "Standard", "Sandbox"], n)} Template`,
    type: "Workspace Template",
    status: pick<NodeStatus>(["Healthy", "Inherited", "Overridden"], n),
    owner: pick(OWNERS, n),
    businessUnit: bu,
    configVersion: `v${1 + (n % 6)}`,
    inheritedCount: 30 + (n % 20),
    overrides: n % 4,
    locked: 5 + (n % 6),
    conflicts: 0,
    children: [mkWorkspace(bu, i * 2), mkWorkspace(bu, i * 2 + 1)],
  };
}
function mkBusinessUnit(bu: string): TreeNode {
  const id = `BU-${bu}`;
  const n = hashId(id);
  return {
    id,
    name: bu,
    type: "Business Unit",
    status: pick<NodeStatus>(
      ["Healthy", "Healthy", "Inherited", "Overridden"],
      n,
    ),
    owner: pick(OWNERS, n),
    businessUnit: bu,
    configVersion: `v${1 + (n % 5)}`,
    inheritedCount: 40 + (n % 30),
    overrides: n % 5,
    locked: 8 + (n % 6),
    conflicts: n % 4 === 0 ? 1 : 0,
    children: [mkTemplate(bu, 0), mkWorkspace(bu, 9)],
  };
}
const ROOT: TreeNode = {
  id: "ORG",
  name: "Contoso Enterprise",
  type: "Organization",
  status: "Healthy",
  owner: "Governance Admin",
  businessUnit: "—",
  configVersion: "v12",
  inheritedCount: 0,
  overrides: 0,
  locked: 24,
  conflicts: 1,
  children: ["Finance", "Engineering", "Operations", "Retail"].map(
    mkBusinessUnit,
  ),
};

function flatten(node: TreeNode, acc: TreeNode[] = []): TreeNode[] {
  acc.push(node);
  node.children?.forEach((c) => flatten(c, acc));
  return acc;
}
const ALL_NODES = flatten(ROOT);

function StatusDot({ status }: { status: NodeStatus }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: STATUS_TONE[status],
        flexShrink: 0,
      }}
    />
  );
}

function TreeRow({
  node,
  depth,
  expanded,
  toggle,
  onSelect,
  selId,
  visibleStatus,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  onSelect: (id: string) => void;
  selId: string | null;
  visibleStatus: string;
}) {
  const hasChildren = !!node.children?.length;
  const isOpen = expanded.has(node.id);
  const dim = visibleStatus && node.status !== visibleStatus;
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSelect(node.id);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          paddingLeft: 10 + depth * 22,
          borderRadius: 8,
          cursor: "pointer",
          background: node.id === selId ? T.badgeBg : "transparent",
          opacity: dim ? 0.4 : 1,
          fontSize: 13,
          color: T.textPrimary,
        }}
      >
        {hasChildren ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              toggle(node.id);
            }}
            style={{ display: "inline-flex", color: T.textMuted }}
          >
            {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </span>
        ) : (
          <span style={{ width: 15, display: "inline-block" }} />
        )}
        <span style={{ color: T.textMuted, display: "inline-flex" }}>
          {TYPE_ICON[node.type]}
        </span>
        <span style={{ fontWeight: node.type === "Organization" ? 600 : 400 }}>
          {node.name}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginLeft: 6,
          }}
        >
          <StatusDot status={node.status} />
          <span style={{ fontSize: 11.5, color: STATUS_TONE[node.status] }}>
            {node.status}
          </span>
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: T.textMuted,
            display: "flex",
            gap: 12,
          }}
        >
          {node.overrides > 0 && (
            <span style={{ color: T.warning }}>
              {node.overrides} override{node.overrides > 1 ? "s" : ""}
            </span>
          )}
          {node.locked > 0 && (
            <span>
              <Lock size={10} style={{ verticalAlign: "middle" }} />{" "}
              {node.locked}
            </span>
          )}
          {node.conflicts > 0 && (
            <span style={{ color: T.danger }}>{node.conflicts} conflict</span>
          )}
          <span>{node.configVersion}</span>
        </span>
      </div>
      {hasChildren &&
        isOpen &&
        node.children!.map((c) => (
          <TreeRow
            key={c.id}
            node={c}
            depth={depth + 1}
            expanded={expanded}
            toggle={toggle}
            onSelect={onSelect}
            selId={selId}
            visibleStatus={visibleStatus}
          />
        ))}
    </>
  );
}

export function InheritanceTreeView() {
  const [expanded, setExpanded] = React.useState<Set<string>>(
    new Set([
      "ORG",
      "BU-Finance",
      "BU-Engineering",
      "BU-Operations",
      "BU-Retail",
    ]),
  );
  const [selId, setSelId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fType, setFType] = React.useState("");

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const expandAll = () => setExpanded(new Set(ALL_NODES.map((n) => n.id)));
  const collapseAll = () => setExpanded(new Set(["ORG"]));

  const sel = ALL_NODES.find((n) => n.id === selId) ?? null;

  // Operational Dashboard (spec §Operational Dashboard).
  const depth = 4;
  const inheritedConfigs = ALL_NODES.reduce((a, n) => a + n.inheritedCount, 0);
  const overrides = ALL_NODES.reduce((a, n) => a + n.overrides, 0);
  const lockedSettings = ALL_NODES.reduce((a, n) => a + n.locked, 0);
  const conflicts = ALL_NODES.reduce((a, n) => a + n.conflicts, 0);
  const healthyNodes = ALL_NODES.filter((n) => n.status === "Healthy").length;
  const coverage = Math.round((healthyNodes / ALL_NODES.length) * 100);

  const toolbar: CommandItem[] = [
    {
      key: "expand",
      label: "Expand All",
      icon: <Maximize2 size={15} />,
      onClick: expandAll,
    },
    {
      key: "collapse",
      label: "Collapse All",
      icon: <Minimize2 size={15} />,
      onClick: collapseAll,
    },
    {
      key: "refresh",
      label: "Refresh",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "preview",
      label: "Preview Effective Configuration",
      icon: <Eye size={15} />,
      disabled: true,
    },
    {
      key: "overrides",
      label: "Show Overrides",
      icon: <SlidersHorizontal size={15} />,
      onClick: () => setFStatus("Overridden"),
    },
    {
      key: "locked",
      label: "Show Locked",
      icon: <Lock size={15} />,
      disabled: true,
    },
    {
      key: "conflicts",
      label: "Detect Conflicts",
      icon: <AlertTriangle size={15} />,
      onClick: () => setFStatus("Conflict"),
    },
    {
      key: "export",
      label: "Export Tree",
      icon: <Download size={15} />,
      disabled: true,
    },
  ];

  const visible = ALL_NODES.filter((n) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        n.name.toLowerCase().includes(q) ||
        n.businessUnit.toLowerCase().includes(q)) &&
      (!fType || n.type === fType)
    );
  });
  const searchActive = !!(search || fType);

  return (
    <>
      <StatStripPlain
        items={[
          { label: "Hierarchy Depth", value: depth, tone: "ok" },
          {
            label: "Inherited Configurations",
            value: inheritedConfigs.toLocaleString(),
            tone: "ok",
          },
          {
            label: "Overrides",
            value: overrides,
            tone: overrides > 0 ? "warn" : "ok",
          },
          { label: "Locked Settings", value: lockedSettings, tone: "ok" },
          {
            label: "Conflicts",
            value: conflicts,
            tone: conflicts > 0 ? "danger" : "ok",
          },
          { label: "Healthy Nodes", value: healthyNodes, tone: "ok" },
          {
            label: "Policy Coverage",
            value: `${coverage}%`,
            tone: coverage >= 80 ? "ok" : "warn",
          },
          { label: "Inheritance Errors", value: 0, tone: "ok" },
        ]}
      />

      <Card
        title="Inheritance hierarchy"
        desc="Trace any configuration value back to its origin. The tree shows Organization → Business Unit → Workspace Template → Workspace, with per-node inheritance status, overrides, locks and conflicts."
      >
        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search hierarchy — workspace, business unit, configuration, policy, template…"
          count={visible.length}
          total={ALL_NODES.length}
          showClear={searchActive || !!fStatus}
          onClear={() => {
            setSearch("");
            setFType("");
            setFStatus("");
          }}
        >
          <Select
            label="Node Type"
            value={fType}
            onChange={setFType}
            options={[
              { value: "", label: "All" },
              ...(
                [
                  "Organization",
                  "Business Unit",
                  "Workspace Template",
                  "Workspace",
                ] as NodeType[]
              ).map((t) => ({ value: t, label: t })),
            ]}
          />
          <Select
            label="Inheritance Status"
            value={fStatus}
            onChange={setFStatus}
            options={[
              { value: "", label: "All" },
              ...(
                [
                  "Healthy",
                  "Inherited",
                  "Overridden",
                  "Conflict",
                  "Archived",
                ] as NodeStatus[]
              ).map((s) => ({ value: s, label: s })),
            ]}
          />
        </FilterBar>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            padding: "4px 4px 12px",
            fontSize: 11.5,
            color: T.textMuted,
          }}
        >
          {(
            [
              "Healthy",
              "Inherited",
              "Overridden",
              "Conflict",
              "Archived",
            ] as NodeStatus[]
          ).map((s) => (
            <span
              key={s}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <StatusDot status={s} /> {s}
            </span>
          ))}
        </div>

        <div
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: 6,
            background: T.cardBg,
          }}
        >
          <TreeRow
            node={ROOT}
            depth={0}
            expanded={expanded}
            toggle={toggle}
            onSelect={setSelId}
            selId={selId}
            visibleStatus={fStatus}
          />
        </div>
      </Card>

      {sel && <NodeDrawer node={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function InheritanceTreePage() {
  return (
    <Page>
      <PageHeader
        title="Inheritance Tree"
        subtitle="Visualize how configuration, policies, and governance settings are inherited throughout the enterprise hierarchy."
        actions={<ScopeBadge scope="Organization" />}
      />
      <InheritanceTreeView />
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
  {
    id: "incoming",
    label: "Incoming Configuration",
    icon: <ArrowDownToLine size={13} />,
  },
  {
    id: "outgoing",
    label: "Outgoing Configuration",
    icon: <ArrowUpFromLine size={13} />,
  },
  { id: "policies", label: "Applied Policies", icon: <ListChecks size={13} /> },
  {
    id: "overrides",
    label: "Overrides",
    icon: <SlidersHorizontal size={13} />,
  },
  { id: "locked", label: "Locked Configuration", icon: <Lock size={13} /> },
  { id: "children", label: "Children", icon: <Network size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function NodeDrawer({
  node,
  onClose,
}: {
  node: TreeNode;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={node.name}
      subtitle={`${node.type} · ${node.status} · ${node.configVersion}`}
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
          <HeaderButton icon={<Eye size={13} />}>
            View Effective Configuration
          </HeaderButton>
          <HeaderButton icon={<Layers size={13} />}>Compare</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab node={node} />}
      {tab === "incoming" && <IncomingTab node={node} />}
      {tab === "outgoing" && <OutgoingTab node={node} />}
      {tab === "policies" && <PoliciesTab node={node} />}
      {tab === "overrides" && <OverridesTab node={node} />}
      {tab === "locked" && <LockedTab node={node} />}
      {tab === "children" && <ChildrenTab node={node} />}
      {tab === "activity" && <ActivityTab node={node} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

function OverviewTab({ node }: { node: TreeNode }) {
  return (
    <Section title="Node details">
      <KVGrid
        items={[
          { k: "Name", v: node.name },
          { k: "Type", v: node.type },
          { k: "Owner", v: node.owner, sample: true },
          { k: "Business Unit", v: node.businessUnit, sample: true },
          { k: "Status", v: node.status },
          { k: "Configuration Version", v: node.configVersion, sample: true },
        ]}
      />
      <div style={{ marginTop: 10 }}>
        <StatRow
          label="Inheritance Path"
          value="Organization → Business Unit → Template → Workspace"
          sample
        />
      </div>
    </Section>
  );
}

const CONFIGS = [
  "Authentication",
  "Encryption",
  "Default Region",
  "Backup Retention",
  "Network Policy",
  "Audit Logging",
  "AI Model Allow-list",
  "Session Timeout",
];

function IncomingTab({ node }: { node: TreeNode }) {
  const list = CONFIGS.map((c) => {
    const m = hashId(node.id + c);
    return {
      id: c,
      config: c,
      source: pick(
        [
          "Organization Default",
          "Business Unit Default",
          "Workspace Template",
          "Policy Assignment",
        ],
        m,
      ),
      inherited: m % 5 === 0 ? "No" : "Yes",
      version: `v${1 + (m % 9)}`,
      status: pick<NodeStatus>(
        ["Healthy", "Healthy", "Overridden", "Conflict"],
        m,
      ),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "config", header: "Configuration", render: (r) => r.config },
    { key: "source", header: "Source", render: (r) => r.source },
    { key: "inherited", header: "Inherited", render: (r) => r.inherited },
    { key: "version", header: "Version", render: (r) => r.version },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: STATUS_TONE[r.status],
          }}
        >
          <StatusDot status={r.status} /> {r.status}
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
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Inherited settings received by this node. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function OutgoingTab({ node }: { node: TreeNode }) {
  if (node.type === "Workspace") {
    return (
      <EmptyState
        icon={<ArrowUpFromLine size={18} />}
        title="Leaf node"
        hint="A workspace has no downstream children, so it does not pass configuration onward."
      />
    );
  }
  const list = CONFIGS.slice(0, 6).map((c) => {
    const m = hashId(`${node.id + c}out`);
    return {
      id: c,
      config: c,
      inheritedBy: `${2 + (m % 20)} nodes`,
      override: m % 4 === 0 ? "Yes" : "No",
      locked: m % 3 === 0 ? "Yes" : "No",
      status: pick(["Propagated", "Propagated", "Partial"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "config", header: "Configuration", render: (r) => r.config },
    {
      key: "inheritedBy",
      header: "Inherited By",
      render: (r) => r.inheritedBy,
    },
    { key: "override", header: "Override", render: (r) => r.override },
    { key: "locked", header: "Locked", render: (r) => r.locked },
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
        Settings inherited by child objects. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function PoliciesTab({ node }: { node: TreeNode }) {
  const list = [
    "Creation Policies",
    "Operational Policies",
    "Metadata Policies",
    "Compliance Assignments",
    "Policy Assignments",
    "Default Configuration",
  ].map((p) => {
    const m = hashId(node.id + p);
    return {
      id: p,
      policy: p,
      source: pick(["Organization", "Business Unit", "Template"], m),
      priority: pick(["Critical", "High", "Medium"], m),
      effective: m % 5 === 0 ? "Overridden" : "Yes",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "policy", header: "Policy", render: (r) => r.policy },
    { key: "source", header: "Source", render: (r) => r.source },
    { key: "priority", header: "Priority", render: (r) => r.priority },
    { key: "effective", header: "Effective", render: (r) => r.effective },
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
        Policies applied at this node. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function OverridesTab({ node }: { node: TreeNode }) {
  const list = Array.from({ length: node.overrides }, (_, i) => {
    const m = hashId(`${node.id}-ov-${i}`);
    return {
      id: `${node.id}-ov-${i}`,
      config: pick(CONFIGS, m),
      original: pick(["Enabled", "eu-west-1", "35 days", "TLS 1.2"], m),
      override: pick(["Disabled", "us-east-1", "7 days", "TLS 1.3"], m),
      approvedBy: pick(OWNERS, m),
      status: pick(["Approved", "Approved", "Pending"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "config", header: "Configuration", render: (r) => r.config },
    {
      key: "original",
      header: "Original Value",
      render: (r) => <span style={{ color: T.textMuted }}>{r.original}</span>,
    },
    {
      key: "override",
      header: "Override Value",
      render: (r) => <span style={{ color: T.warning }}>{r.override}</span>,
    },
    { key: "approvedBy", header: "Approved By", render: (r) => r.approvedBy },
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
        Configuration overridden at this node. <SampleTag />
      </div>
      {list.length ? (
        <DirectoryTable columns={cols} rows={list} />
      ) : (
        <EmptyState
          icon={<SlidersHorizontal size={18} />}
          title="No overrides"
          hint="This node inherits all configuration without deviation."
        />
      )}
    </>
  );
}

function LockedTab({ node }: { node: TreeNode }) {
  const list = Array.from({ length: Math.min(6, node.locked) }, (_, i) => {
    const m = hashId(`${node.id}-lk-${i}`);
    return {
      id: `${node.id}-lk-${i}`,
      config: pick(
        [
          "Audit Logging",
          "MFA Required",
          "Encryption",
          "Data Residency",
          "Secrets Backend",
        ],
        m,
      ),
      source: pick(["Organization", "Business Unit"], m),
      lockLevel: pick(["Hard Lock", "Soft Lock", "Read Only"], m),
      status: "Locked",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "config", header: "Configuration", render: (r) => r.config },
    { key: "source", header: "Source", render: (r) => r.source },
    { key: "lockLevel", header: "Lock Level", render: (r) => r.lockLevel },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{
            color: T.success,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Lock size={11} /> {r.status}
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
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Inherited locked settings at this node. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ChildrenTab({ node }: { node: TreeNode }) {
  const kids = node.children ?? [];
  if (!kids.length) {
    return (
      <EmptyState
        icon={<Network size={18} />}
        title="No children"
        hint="This node is a leaf in the inheritance hierarchy."
      />
    );
  }
  const cols: Column<TreeNode>[] = [
    { key: "name", header: "Child", render: (r) => r.name },
    { key: "type", header: "Type", render: (r) => r.type },
    {
      key: "inheritedCount",
      header: "Inherited Settings",
      render: (r) => r.inheritedCount,
    },
    { key: "overrides", header: "Overrides", render: (r) => r.overrides },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: STATUS_TONE[r.status],
          }}
        >
          <StatusDot status={r.status} /> {r.status}
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
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Downstream inheritance. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={kids} />
    </>
  );
}

function ActivityTab({ node }: { node: TreeNode }) {
  const events = [
    "Configuration Inherited",
    "Override Applied",
    "Policy Updated",
    "Node Created",
    "Inheritance Recalculated",
    "Conflict Resolved",
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
              {pick(OWNERS, hashId(node.id) + i)} ·{" "}
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
    "Inheritance Created",
    "Policy Applied",
    "Override Added",
    "Configuration Locked",
    "Inheritance Updated",
    "Conflict Resolved",
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

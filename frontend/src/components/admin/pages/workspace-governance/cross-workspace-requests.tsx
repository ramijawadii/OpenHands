/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Cross-Workspace Governance → Cross-Workspace Requests */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Check,
  X,
  Ban,
  Undo2,
  Copy,
  Download,
  ClipboardCheck,
  Network,
  FileText,
  RefreshCcw,
  CheckCheck,
  LayoutGrid,
  FileText as FileDetails,
  Boxes,
  GitPullRequestArrow,
  Waypoints,
  ShieldCheck,
  BadgeCheck,
  History,
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
 * Cross-Workspace Requests — the authoritative workflow system for all cross-workspace operations:
 * one workspace requesting access, resources, services, data, APIs, identities, approvals or
 * collaboration from another, with governance, approval workflows, auditing, security validation and
 * compliance enforcement. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/04_Cross-Workspace Governance/cross_workspace_requests.md.
 *
 * Enterprise-Governance UX pattern (Banner · KPI · Toolbar · Filters · Search · Datatable · Bulk/Row
 * actions · 9-tab Request Detail Drawer with approval workflow). No request backend yet → sample.
 */

type RequestType =
  | "Resource Access"
  | "Secrets Access"
  | "API Access"
  | "Database Access"
  | "Network Connectivity"
  | "Identity Federation"
  | "AI Service Access"
  | "Data Sharing"
  | "Workspace Peering"
  | "Emergency Access"
  | "Policy Exception";
type Priority = "Critical" | "High" | "Medium" | "Low";
type Status =
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Expired"
  | "Cancelled";

const REQUEST_TYPES: RequestType[] = [
  "Resource Access",
  "Secrets Access",
  "API Access",
  "Database Access",
  "Network Connectivity",
  "Identity Federation",
  "AI Service Access",
  "Data Sharing",
  "Workspace Peering",
  "Emergency Access",
  "Policy Exception",
];
const WORKSPACES = [
  "Payments",
  "Shared Services",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Security Ops",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Shared"];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const REQUESTERS = [
  "Aisha Khan",
  "David Chen",
  "Marco Rossi",
  "Priya Nair",
  "Sara Lopez",
];
const APPROVERS = [
  "Workspace Owner",
  "Security Team",
  "Governance Admin",
  "Compliance Office",
];
const FRAMEWORKS = [
  "ISO 27001",
  "SOC 2",
  "NIST",
  "PCI DSS",
  "HIPAA",
  "CSA CCM",
];

const PRIORITY_TONE: Record<Priority, string> = {
  Critical: T.danger,
  High: T.warning,
  Medium: T.accent,
  Low: T.textMuted,
};
const PRIORITY_ORDER: Record<Priority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};
const STATUS_TONE: Record<Status, string> = {
  "Pending Approval": T.warning,
  Approved: T.success,
  Rejected: T.danger,
  Expired: T.textMuted,
  Cancelled: T.textMuted,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Request {
  id: string;
  title: string;
  source: string;
  target: string;
  type: RequestType;
  priority: Priority;
  submitted: string;
  status: Status;
  requester: string;
  approver: string;
  environment: string;
  businessUnit: string;
  created: string;
  framework: string;
  riskLevel: Priority;
  approvals: number;
  resources: number;
  dependencies: number;
  policyChecks: number;
  securityFindings: number;
}

const SAMPLE_REQUESTS: Request[] = Array.from({ length: 15 }, (_, i) => {
  const id = `REQ-${(10400 + i * 41).toString()}`;
  const n = hashId(id);
  const source = pick(WORKSPACES, n);
  let target = pick(WORKSPACES, n >> 2);
  if (target === source) target = pick(WORKSPACES, n >> 4);
  const type = pick(REQUEST_TYPES, n >> 1);
  const status = pick<Status>(
    [
      "Pending Approval",
      "Pending Approval",
      "Approved",
      "Approved",
      "Rejected",
      "Expired",
      "Cancelled",
    ],
    n,
  );
  return {
    id,
    title: `${type} — ${source} → ${target}`,
    source,
    target,
    type,
    priority: pick<Priority>(["Critical", "High", "High", "Medium", "Low"], n),
    submitted: pick(["Today", "Yesterday", "2 days ago", "1 week ago"], n),
    status,
    requester: pick(REQUESTERS, n),
    approver: pick(APPROVERS, n >> 1),
    environment: pick(ENVIRONMENTS, n >> 2),
    businessUnit: pick(BUSINESS_UNITS, n),
    created: `2026-0${1 + (n % 8)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    framework: pick(FRAMEWORKS, n >> 3),
    riskLevel: pick<Priority>(["Critical", "High", "Medium", "Low"], n >> 2),
    approvals: 2 + (n % 4),
    resources: 1 + (n % 6),
    dependencies: n % 5,
    policyChecks: 3 + (n % 5),
    securityFindings: n % 4,
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

export function CrossWorkspaceRequestsView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fSource, setFSource] = React.useState("");
  const [fTarget, setFTarget] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fPriority, setFPriority] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_REQUESTS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.requester.toLowerCase().includes(q)) &&
      (!fType || r.type === fType) &&
      (!fSource || r.source === fSource) &&
      (!fTarget || r.target === fTarget) &&
      (!fStatus || r.status === fStatus) &&
      (!fPriority || r.priority === fPriority) &&
      (!fBu || r.businessUnit === fBu)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFSource("");
    setFTarget("");
    setFStatus("");
    setFPriority("");
    setFBu("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const pending = records.filter((r) => r.status === "Pending Approval").length;
  const incoming = records.filter(
    (r) => r.status === "Pending Approval",
  ).length;
  const outgoing = records.length - incoming;
  const approved = records.filter((r) => r.status === "Approved").length;
  const rejected = records.filter((r) => r.status === "Rejected").length;
  const expired = records.filter((r) => r.status === "Expired").length;
  const avgApproval = 14 + (hashId("avg") % 30);
  const violations = records.reduce((a, r) => a + r.securityFindings, 0);

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Request",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=cross"),
    },
    {
      key: "approve",
      label: "Approve",
      icon: <Check size={15} />,
      disabled: true,
    },
    { key: "reject", label: "Reject", icon: <X size={15} />, disabled: true },
    { key: "cancel", label: "Cancel", icon: <Ban size={15} />, disabled: true },
    {
      key: "withdraw",
      label: "Withdraw",
      icon: <Undo2 size={15} />,
      disabled: true,
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: <Copy size={15} />,
      disabled: true,
    },
    {
      key: "review",
      label: "Launch Review",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "deps",
      label: "Check Dependencies",
      icon: <Network size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "refresh",
      label: "Refresh",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "bulk",
      label: "Bulk Approve",
      icon: <CheckCheck size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Request>[] = [
    {
      key: "id",
      header: "Request",
      sortValue: (r) => r.id,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <GitPullRequestArrow size={13} color={T.textMuted} />
          <span>{r.id}</span>
          <span style={{ fontSize: 11, color: T.textMuted }}>· {r.type}</span>
        </span>
      ),
    },
    {
      key: "source",
      header: "Source Workspace",
      sortValue: (r) => r.source,
      render: (r) => r.source,
    },
    {
      key: "target",
      header: "Target Workspace",
      sortValue: (r) => r.target,
      render: (r) => r.target,
    },
    {
      key: "priority",
      header: "Priority",
      sortValue: (r) => PRIORITY_ORDER[r.priority],
      render: (r) => <PriorityBadge priority={r.priority} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      sortValue: (r) => r.created,
      render: (r) => r.submitted,
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
      <StatStripPlain
        items={[
          {
            label: "Pending Requests",
            value: pending,
            tone: pending > 0 ? "warn" : "ok",
          },
          { label: "Incoming Requests", value: incoming, tone: "ok" },
          { label: "Outgoing Requests", value: outgoing, tone: "ok" },
          { label: "Approved Requests", value: approved, tone: "ok" },
          {
            label: "Rejected Requests",
            value: rejected,
            tone: rejected > 0 ? "warn" : "ok",
          },
          { label: "Expired Requests", value: expired, tone: "ok" },
          {
            label: "Avg Approval Time",
            value: `${avgApproval}h`,
            tone: avgApproval <= 24 ? "ok" : "warn",
          },
          {
            label: "Policy Violations",
            value: violations,
            tone: violations > 0 ? "warn" : "ok",
          },
        ]}
      />

      <DiscoveryListView
        title="Cross-workspace requests"
        desc="Manage requests between workspaces for shared resources, access, services, collaboration and operational activities — while enforcing enterprise governance, approval workflows and compliance."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search cross-workspace requests — request ID, workspace, requester, approver, application, resource, service…"
        count={rows.length}
        pills={[
          {
            key: "requestType",
            label: "Request Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.type)),
          },
          {
            key: "sourceWorkspace",
            label: "Source Workspace",
            value: fSource,
            onChange: setFSource,
            options: facet(records.map((r) => r.source)),
          },
          {
            key: "targetWorkspace",
            label: "Target Workspace",
            value: fTarget,
            onChange: setFTarget,
            options: facet(records.map((r) => r.target)),
          },
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
        ]}
        presets={[
          { label: "All cross-workspace requests", onApply: clearFilters },
        ]}
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
            <HeaderButton icon={<Check size={13} />} onClick={clear}>
              Approve ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<X size={13} />} onClick={clear}>
              Reject
            </HeaderButton>
            <HeaderButton icon={<Ban size={13} />} onClick={clear}>
              Cancel
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
              { label: "Approve", onClick: () => {} },
              { label: "Reject", onClick: () => {} },
              { label: "Cancel", onClick: () => {} },
              { label: "Duplicate", onClick: () => {} },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<GitPullRequestArrow size={20} />}
            title="No cross-workspace requests exist."
            hint="Create a cross-workspace request to ask another workspace for access, resources, services or collaboration under governance."
            cta="Create Cross-Workspace Request"
            onCta={() => navigate("/admin/workspace-governance?tab=cross")}
          />
        }
      />

      {sel && <RequestDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function CrossWorkspaceRequestsPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Cross-Workspace Requests"
        subtitle="Manage requests between workspaces for shared resources, access, services, collaboration, and operational activities while enforcing enterprise governance."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspace-governance?tab=cross")}
            >
              Create Request
            </HeaderButton>
          </>
        }
      />
      <CrossWorkspaceRequestsView />
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
  { id: "details", label: "Request Details", icon: <FileDetails size={13} /> },
  { id: "resources", label: "Requested Resources", icon: <Boxes size={13} /> },
  {
    id: "approval",
    label: "Approval Workflow",
    icon: <GitPullRequestArrow size={13} />,
  },
  { id: "deps", label: "Dependencies", icon: <Waypoints size={13} /> },
  { id: "security", label: "Security Review", icon: <ShieldCheck size={13} /> },
  { id: "compliance", label: "Compliance", icon: <BadgeCheck size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function RequestDrawer({
  rec,
  onClose,
}: {
  rec: Request;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.id} · ${rec.type}`}
      subtitle={`${rec.source} → ${rec.target} · ${rec.priority} · ${rec.status}`}
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
          <HeaderButton icon={<Check size={13} />}>Approve</HeaderButton>
          <HeaderButton variant="danger" icon={<X size={13} />}>
            Reject
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "details" && <DetailsTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "approval" && <ApprovalTab rec={rec} />}
      {tab === "deps" && <DepsTab rec={rec} />}
      {tab === "security" && <SecurityTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Request }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Request ID", v: rec.id },
              { k: "Title", v: rec.title },
              { k: "Source Workspace", v: rec.source, sample: true },
              { k: "Target Workspace", v: rec.target, sample: true },
              { k: "Requester", v: rec.requester, sample: true },
              { k: "Created Date", v: rec.created, sample: true },
              { k: "Priority", v: rec.priority },
              { k: "Status", v: rec.status },
            ]}
          />
          <div style={{ fontSize: 12.5, color: T.textNav, paddingTop: 6 }}>
            {rec.source} requests {rec.type.toLowerCase()} from {rec.target},
            subject to approval and compliance validation.
          </div>
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Approvals", v: rec.approvals, sample: true },
              { k: "Resources", v: rec.resources, sample: true },
              { k: "Dependencies", v: rec.dependencies, sample: true },
              { k: "Policy Checks", v: rec.policyChecks, sample: true },
              { k: "Security Findings", v: rec.securityFindings, sample: true },
              {
                k: "Estimated Completion",
                v: rec.status === "Approved" ? "Complete" : "2 days",
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function DetailsTab({ rec }: { rec: Request }) {
  return (
    <Section title="Request details" sample>
      <KVGrid
        items={[
          { k: "Request Type", v: rec.type },
          {
            k: "Business Justification",
            v: `Operational need for ${rec.type.toLowerCase()}`,
            sample: true,
          },
          {
            k: "Requested Duration",
            v: pick(["30 days", "90 days", "Permanent"], hashId(rec.id)),
            sample: true,
          },
          { k: "Requested Start Date", v: rec.created, sample: true },
          { k: "Requested End Date", v: "2026-12-31", sample: true },
          { k: "Risk Level", v: rec.riskLevel, sample: true },
          {
            k: "Approval Requirement",
            v: `${rec.approvals}-stage workflow`,
            sample: true,
          },
        ]}
      />
    </Section>
  );
}

function ResourcesTab({ rec }: { rec: Request }) {
  const list = Array.from({ length: rec.resources }, (_, i) => {
    const m = hashId(`${rec.id}-r-${i}`);
    return {
      id: `${rec.id}-r-${i}`,
      resource: pick(
        [
          "Central Secrets",
          "Shared DB",
          "AI Gateway",
          "API Gateway",
          "Shared VPC",
        ],
        m,
      ),
      type: pick(["Secrets", "Database", "AI", "API", "Network"], m),
      workspace: rec.target,
      permission: pick(["Read", "Read/Write", "Execute"], m),
      duration: pick(["30 days", "90 days", "Permanent"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "permission", header: "Permission", render: (r) => r.permission },
    { key: "duration", header: "Duration", render: (r) => r.duration },
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
        <HeaderButton icon={<Plus size={13} />}>Add Resource</HeaderButton>
        <HeaderButton icon={<ClipboardCheck size={13} />}>
          Validate
        </HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ApprovalTab({ rec }: { rec: Request }) {
  const stages = [
    "Request",
    "Workspace Owner",
    "Security Review",
    "Governance Review",
    "Compliance Review",
    "Final Approval",
  ];
  const completed =
    rec.status === "Approved"
      ? stages.length
      : rec.status === "Rejected"
        ? 2
        : rec.approvals;
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
        <HeaderButton icon={<Check size={13} />}>Approve</HeaderButton>
        <HeaderButton variant="danger" icon={<X size={13} />}>
          Reject
        </HeaderButton>
        <HeaderButton icon={<Undo2 size={13} />}>Delegate</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Approval workflow">
        {stages.map((s, i) => {
          const done = i < completed;
          const rejected = rec.status === "Rejected" && i === 2;
          return (
            <div
              key={s}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: rejected ? T.danger : done ? T.success : T.border,
                  color: "#fff",
                  fontSize: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {rejected ? "✕" : done ? "✓" : i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: T.textPrimary }}>{s}</div>
                <div style={{ fontSize: 11.5, color: T.textMuted }}>
                  {rejected
                    ? `${pick(APPROVERS, hashId(rec.id))} · rejected`
                    : done
                      ? `${pick(APPROVERS, hashId(rec.id) + i)} · approved`
                      : "Pending"}
                </div>
              </div>
            </div>
          );
        })}
      </Section>
    </>
  );
}

function DepsTab({ rec }: { rec: Request }) {
  const list = Array.from({ length: 2 + rec.dependencies }, (_, i) => {
    const m = hashId(`${rec.id}-d-${i}`);
    return {
      id: `${rec.id}-d-${i}`,
      dependency: pick(
        [
          "Trust Relationship",
          "Isolation Policy",
          "Shared Resource Policy",
          "Compliance Assignment",
        ],
        m,
      ),
      type: pick(["Trust", "Policy", "Resource"], m),
      status: pick(["Satisfied", "Satisfied", "Blocking"], m),
      blocking: m % 4 === 0 ? "Yes" : "No",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "dependency", header: "Dependency", render: (r) => r.dependency },
    { key: "type", header: "Type", render: (r) => r.type },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Satisfied" ? T.success : T.danger }}
        >
          {r.status}
        </span>
      ),
    },
    { key: "blocking", header: "Blocking", render: (r) => r.blocking },
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
        Request → Required Trust → Required Policy → Required Resource.{" "}
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function SecurityTab({ rec }: { rec: Request }) {
  const checks = [
    "Least Privilege",
    "Isolation Validation",
    "Conditional Access",
    "Trust Validation",
    "Risk Analysis",
    "Policy Compliance",
  ];
  const list = checks.map((c) => {
    const m = hashId(rec.id + c);
    const result = pick(["Passed", "Passed", "Attention"], m);
    return {
      id: c,
      control: c,
      status: result,
      severity: result === "Passed" ? "—" : pick(["Medium", "High"], m),
      recommendation: result === "Passed" ? "Maintain" : "Scope down",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "control", header: "Control", render: (r) => r.control },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span style={{ color: r.status === "Passed" ? T.success : T.warning }}>
          {r.status}
        </span>
      ),
    },
    { key: "severity", header: "Severity", render: (r) => r.severity },
    {
      key: "recommendation",
      header: "Recommendation",
      render: (r) => r.recommendation,
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
        Security validation for this request. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ComplianceTab({ rec }: { rec: Request }) {
  const list = FRAMEWORKS.map((f) => {
    const m = hashId(rec.id + f);
    return {
      id: f,
      framework: f,
      status: pick(["Compliant", "Compliant", "Gap"], m),
      controls: 2 + (m % 10),
      violations: m % 3,
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "framework", header: "Framework", render: (r) => r.framework },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Compliant" ? T.success : T.warning }}
        >
          {r.status}
        </span>
      ),
    },
    { key: "controls", header: "Required Controls", render: (r) => r.controls },
    { key: "violations", header: "Violations", render: (r) => r.violations },
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
        Compliance validation for this request. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ActivityTab({ rec }: { rec: Request }) {
  const events = [
    "Request Created",
    "Request Submitted",
    "Approval Granted",
    "Approval Rejected",
    "Request Modified",
    "Resources Granted",
    "Request Closed",
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
            ...APPROVERS.map((o) => ({ value: o, label: o })),
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
              {pick([...REQUESTERS, ...APPROVERS], hashId(rec.id) + i)} ·{" "}
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
    "Request Created",
    "Approval Granted",
    "Approval Rejected",
    "Policy Validation",
    "Security Review",
    "Compliance Review",
    "Request Cancelled",
    "Request Closed",
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
          value={`${pick(APPROVERS, i)} · 2026-06-${(10 + i).toString().padStart(2, "0")}`}
          tone="ok"
          sample
        />
      ))}
    </>
  );
}

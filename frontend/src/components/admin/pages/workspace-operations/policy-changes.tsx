/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Operations → Workspace Audit → Policy Changes */
import React from "react";
import {
  Search as SearchIcon,
  GitCompare,
  Download,
  FileText,
  FolderSearch,
  RefreshCcw,
  ShieldCheck,
  RotateCcw,
  FileArchive,
  LayoutGrid,
  ScrollText,
  GitBranch,
  UserCheck,
  Radar,
  GitPullRequestArrow,
  Boxes,
  BadgeCheck,
  FileCheck2,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
  StatRow,
  KVGrid,
  DirectoryTable,
  HeaderButton,
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
import { ColumnChooser, StatStripPlain } from "#/components/admin/settings-kit";
import {
  ResultBadge,
  AuditSection,
  EvidenceTab,
  AuditVerificationTab,
  type AuditResult,
  type Integrity,
} from "#/components/admin/pages/workspace-operations/administrative-activity";

/**
 * Policy Changes — the authoritative policy audit system for the Workspace platform: an immutable,
 * version-controlled record of every policy modification (definitions, assignments, inheritance,
 * overrides, exceptions, enforcement changes, lifecycle) with who/what/why, the approval process and
 * resulting impact. Unlike Configuration Changes (all config), this focuses on policy. Authoritative
 * spec: docs/workspace/workspace_module/…/Workspace Operations/Workspace Audit/policy_changes.md.
 *
 * Enterprise-Policy-Audit UX pattern (Banner · KPI · Policy Change Table · Filters · Search · Detail
 * Drawer with version comparison + approval workflow). Read-only immutable records → sample.
 */

type Category =
  | "Workspace"
  | "Governance"
  | "Security"
  | "Compliance"
  | "Lifecycle"
  | "Automation"
  | "Resource"
  | "Identity"
  | "Notification";
type Operation =
  | "Create"
  | "Update"
  | "Delete"
  | "Assign"
  | "Unassign"
  | "Enable"
  | "Disable"
  | "Rollback"
  | "Clone";

const CATEGORIES: Category[] = [
  "Workspace",
  "Governance",
  "Security",
  "Compliance",
  "Lifecycle",
  "Automation",
  "Resource",
  "Identity",
  "Notification",
];
const OPERATIONS: Operation[] = [
  "Create",
  "Update",
  "Delete",
  "Assign",
  "Unassign",
  "Enable",
  "Disable",
  "Rollback",
  "Clone",
];
const ADMINS = [
  "john.smith",
  "alice.jones",
  "gov.admin",
  "sec.admin",
  "comp.admin",
];
const WORKSPACES = [
  "Payments Production",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Organization",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const POLICY_NAMES = [
  "Workspace Creation Policy",
  "Production Security Baseline",
  "Data Residency — EU",
  "MFA Enforcement",
  "SOC 2 Framework",
  "Retention Policy",
  "Automation Approval",
  "RBAC Baseline",
  "Encryption Standard",
  "Network Egress Policy",
  "Naming Convention",
  "Approval Chain Policy",
];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface PolicyChange {
  id: string;
  timestamp: string;
  policy: string;
  category: Category;
  operation: Operation;
  workspace: string;
  admin: string;
  result: AuditResult;
  version: string;
  previousVersion: string;
  businessUnit: string;
  approvalStatus: "Approved" | "Pending" | "Rejected";
  integrity: Integrity;
  affectedWorkspaces: number;
  assignments: number;
  overrides: number;
  exceptions: number;
  riskScore: number;
}

const SAMPLE_POLICY_CHANGES: PolicyChange[] = Array.from(
  { length: 18 },
  (_, i) => {
    const id = `POL-${(600000 + i * 137).toString()}`;
    const n = hashId(id);
    return {
      id,
      timestamp: `2026-07-${(10 + (n % 18)).toString().padStart(2, "0")} ${(8 + (n % 10)).toString().padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")} UTC`,
      policy: pick(POLICY_NAMES, n),
      category: pick(CATEGORIES, n >> 1),
      operation: pick(OPERATIONS, n >> 2),
      workspace: pick(WORKSPACES, n >> 3),
      admin: pick(ADMINS, n),
      result: pick<AuditResult>(
        ["Success", "Success", "Success", "Success", "Warning"],
        n,
      ),
      version: `v${2 + (n % 6)}.${n % 9}`,
      previousVersion: `v${1 + (n % 6)}.${(n + 3) % 9}`,
      businessUnit: pick(BUSINESS_UNITS, n),
      approvalStatus: pick<"Approved" | "Pending" | "Rejected">(
        ["Approved", "Approved", "Approved", "Pending", "Rejected"],
        n,
      ),
      integrity: pick<Integrity>(
        ["Verified", "Verified", "Verified", "Warning"],
        n,
      ),
      affectedWorkspaces: 1 + (n % 24),
      assignments: 1 + (n % 12),
      overrides: n % 5,
      exceptions: n % 4,
      riskScore: 10 + (n % 70),
    };
  },
);

export function PolicyChangesView() {
  const [search, setSearch] = React.useState("");
  const [fCat, setFCat] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fAdmin, setFAdmin] = React.useState("");
  const [fApproval, setFApproval] = React.useState("");
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

  const records = SAMPLE_POLICY_CHANGES;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.id.toLowerCase().includes(q) ||
        r.policy.toLowerCase().includes(q) ||
        r.admin.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q)) &&
      (!fCat || r.category === fCat) &&
      (!fWs || r.workspace === fWs) &&
      (!fAdmin || r.admin === fAdmin) &&
      (!fApproval || r.approvalStatus === fApproval) &&
      (!fBu || r.businessUnit === fBu)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFCat("");
    setFWs("");
    setFAdmin("");
    setFApproval("");
    setFBu("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const total = records.length;
  const activePolicies = new Set(records.map((r) => r.policy)).size;
  const assignments = records.reduce((a, r) => a + r.assignments, 0);
  const overrides = records.reduce((a, r) => a + r.overrides, 0);
  const exceptions = records.reduce((a, r) => a + r.exceptions, 0);
  const rollbacks = records.filter((r) => r.operation === "Rollback").length;
  const pendingReviews = records.filter(
    (r) => r.approvalStatus === "Pending",
  ).length;
  const integrityOk = records.every((r) => r.integrity === "Verified");

  const toolbar: CommandItem[] = [
    {
      key: "search",
      label: "Advanced Search",
      icon: <SearchIcon size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Versions",
      icon: <GitCompare size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
    {
      key: "report",
      label: "Generate Report",
      icon: <FileText size={15} />,
      disabled: true,
    },
    {
      key: "investigate",
      label: "Open Investigation",
      icon: <FolderSearch size={15} />,
      disabled: true,
    },
    {
      key: "refresh",
      label: "Refresh",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "verify",
      label: "Verify Integrity",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
    {
      key: "rollback",
      label: "Rollback Analysis",
      icon: <RotateCcw size={15} />,
      disabled: true,
    },
    {
      key: "evidence",
      label: "Download Evidence",
      icon: <FileArchive size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<PolicyChange>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      sortValue: (r) => r.timestamp,
      render: (r) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
          {r.timestamp}
        </span>
      ),
    },
    {
      key: "policy",
      header: "Policy",
      sortValue: (r) => r.policy,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FileCheck2 size={13} color={T.textMuted} />
          {r.policy}
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
      key: "operation",
      header: "Operation",
      sortValue: (r) => r.operation,
      render: (r) => r.operation,
    },
    {
      key: "workspace",
      header: "Workspace",
      sortValue: (r) => r.workspace,
      render: (r) => r.workspace,
    },
    {
      key: "admin",
      header: "Administrator",
      sortValue: (r) => r.admin,
      render: (r) => r.admin,
    },
    {
      key: "result",
      header: "Result",
      sortValue: (r) => r.result,
      render: (r) => <ResultBadge result={r.result} />,
    },
    {
      key: "version",
      header: "Version",
      sortValue: (r) => r.version,
      render: (r) => r.version,
    },
  ];

  return (
    <>
      <StatStripPlain
        items={[
          { label: "Policy Changes", value: total, tone: "ok" },
          { label: "Active Policies", value: activePolicies, tone: "ok" },
          { label: "Policy Assignments", value: assignments, tone: "ok" },
          {
            label: "Policy Overrides",
            value: overrides,
            tone: overrides > 0 ? "warn" : "ok",
          },
          {
            label: "Policy Exceptions",
            value: exceptions,
            tone: exceptions > 0 ? "warn" : "ok",
          },
          { label: "Policy Rollbacks", value: rollbacks, tone: "ok" },
          {
            label: "Pending Reviews",
            value: pendingReviews,
            tone: pendingReviews > 0 ? "warn" : "ok",
          },
          {
            label: "Audit Integrity",
            value: integrityOk ? "Verified" : "Review",
            tone: integrityOk ? "ok" : "warn",
          },
        ]}
      />

      <DiscoveryListView
        title="Policy changes"
        desc="Review and investigate every policy creation, modification, assignment, override, exception and deletion across the Workspace platform. Records are immutable and fully version-controlled."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search policy changes — policy ID, policy name, workspace, administrator, assignment, version, approval ID…"
        count={rows.length}
        pills={[
          {
            key: "policyCategory",
            label: "Policy Category",
            value: fCat,
            onChange: setFCat,
            options: facet(records.map((r) => r.category)),
          },
          {
            key: "workspace",
            label: "Workspace",
            value: fWs,
            onChange: setFWs,
            options: facet(records.map((r) => r.workspace)),
          },
          {
            key: "administrator",
            label: "Administrator",
            value: fAdmin,
            onChange: setFAdmin,
            options: facet(records.map((r) => r.admin)),
          },
          {
            key: "approvalStatus",
            label: "Approval Status",
            value: fApproval,
            onChange: setFApproval,
            options: facet(records.map((r) => r.approvalStatus)),
          },
          {
            key: "businessUnit",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
        ]}
        presets={[{ label: "All policy changes", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "timestamp", dir: "desc" }}
        onRowClick={(r) => setSelId(r.id)}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "View Details", onClick: () => setSelId(r.id) },
              { label: "Compare Versions", onClick: () => setSelId(r.id) },
              { label: "Export Evidence", onClick: () => setSelId(r.id) },
              { label: "Rollback Analysis", onClick: () => setSelId(r.id) },
              { label: "Open Investigation", onClick: () => setSelId(r.id) },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<FileCheck2 size={20} />}
            title="No policy changes found."
            hint="Adjust filters to review policy modifications across the platform."
          />
        }
      />

      {sel && <PolicyDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function PolicyChangesPage() {
  return (
    <Page>
      <PageHeader
        title="Policy Changes"
        subtitle="Review and investigate every policy creation, modification, assignment, override, exception, and deletion across the Workspace platform."
        actions={<ScopeBadge scope="Organization" />}
      />
      <PolicyChangesView />
    </Page>
  );
}

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "details", label: "Policy Details", icon: <ScrollText size={13} /> },
  { id: "compare", label: "Version Comparison", icon: <GitBranch size={13} /> },
  { id: "assignments", label: "Assignments", icon: <UserCheck size={13} /> },
  { id: "impact", label: "Impact Analysis", icon: <Radar size={13} /> },
  {
    id: "approval",
    label: "Approval Workflow",
    icon: <GitPullRequestArrow size={13} />,
  },
  { id: "resources", label: "Related Resources", icon: <Boxes size={13} /> },
  { id: "evidence", label: "Evidence", icon: <FileArchive size={13} /> },
  { id: "verify", label: "Audit Verification", icon: <BadgeCheck size={13} /> },
];

function PolicyDrawer({
  rec,
  onClose,
}: {
  rec: PolicyChange;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.operation} · ${rec.policy}`}
      subtitle={`${rec.category} · ${rec.workspace} · ${rec.version} · ${rec.result}`}
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
          <HeaderButton icon={<GitCompare size={13} />}>Compare</HeaderButton>
          <HeaderButton icon={<UserCheck size={13} />}>
            View Assignments
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "details" && <DetailsTab rec={rec} />}
      {tab === "compare" && <CompareTab rec={rec} />}
      {tab === "assignments" && <AssignmentsTab rec={rec} />}
      {tab === "impact" && <ImpactTab rec={rec} />}
      {tab === "approval" && <ApprovalTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "evidence" && (
        <EvidenceTab
          id={rec.id}
          items={[
            "Policy Snapshot",
            "Before/After Diff",
            "Approval Record",
            "API Request",
            "API Response",
            "Digital Signature",
            "Correlation IDs",
          ]}
        />
      )}
      {tab === "verify" && <AuditVerificationTab integrity={rec.integrity} />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: PolicyChange }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <AuditSection title="General">
          <KVGrid
            items={[
              { k: "Policy ID", v: rec.id },
              { k: "Policy Name", v: rec.policy },
              { k: "Category", v: rec.category },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Administrator", v: rec.admin, sample: true },
              { k: "Operation", v: rec.operation },
              { k: "Timestamp", v: rec.timestamp, sample: true },
              { k: "Version", v: rec.version },
              { k: "Status", v: rec.result },
            ]}
          />
        </AuditSection>
      )}
      {sub === "statistics" && (
        <AuditSection title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              {
                k: "Affected Workspaces",
                v: rec.affectedWorkspaces,
                sample: true,
              },
              { k: "Assignments", v: rec.assignments, sample: true },
              { k: "Overrides", v: rec.overrides, sample: true },
              { k: "Exceptions", v: rec.exceptions, sample: true },
              { k: "Risk Score", v: `${rec.riskScore}/100`, sample: true },
              {
                k: "Compliance Impact",
                v: rec.category === "Compliance" ? "Direct" : "Indirect",
                sample: true,
              },
            ]}
          />
        </AuditSection>
      )}
    </>
  );
}

function DetailsTab({ rec }: { rec: PolicyChange }) {
  return (
    <AuditSection title="Policy details" sample>
      <KVGrid
        items={[
          { k: "Policy Name", v: rec.policy },
          { k: "Category", v: rec.category },
          { k: "Operation", v: rec.operation },
          { k: "Previous Version", v: rec.previousVersion, sample: true },
          { k: "Current Version", v: rec.version, sample: true },
          { k: "Reason", v: "Governance update", sample: true },
          {
            k: "Approval Reference",
            v: `APR-${(4000 + (hashId(rec.id) % 9000)).toString()}`,
            sample: true,
          },
          { k: "Source", v: "Governance Center", sample: true },
          {
            k: "Change Request",
            v: `CR-${(hashId(rec.id) % 90000).toString()}`,
            sample: true,
          },
        ]}
      />
    </AuditSection>
  );
}

function CompareTab({ rec }: { rec: PolicyChange }) {
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              color: T.textMuted,
              padding: "6px 10px",
              borderBottom: `1px solid ${T.border}`,
              background: T.badgeBg,
            }}
          >
            Previous ({rec.previousVersion})
          </div>
          <pre
            style={{
              margin: 0,
              padding: 10,
              fontSize: 11.5,
              color: T.textNav,
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
            }}
          >{`rules: 12\nenforcement: monitoring\nassignments: 8`}</pre>
        </div>
        <div
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              color: T.textMuted,
              padding: "6px 10px",
              borderBottom: `1px solid ${T.border}`,
              background: T.badgeBg,
            }}
          >
            Current ({rec.version})
          </div>
          <pre
            style={{
              margin: 0,
              padding: 10,
              fontSize: 11.5,
              color: T.warning,
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
            }}
          >{`rules: 14\nenforcement: enforced\nassignments: ${rec.assignments}`}</pre>
        </div>
      </div>
      <AuditSection title="Rule & assignment delta" sample>
        <StatRow label="Added Rules" value={2} tone="ok" sample />
        <StatRow label="Modified Rules" value={1} sample />
        <StatRow label="Removed Rules" value={0} sample />
        <StatRow label="Inheritance Changes" value={rec.overrides} sample />
        <StatRow label="Assignment Changes" value={rec.assignments} sample />
      </AuditSection>
    </>
  );
}

function AssignmentsTab({ rec }: { rec: PolicyChange }) {
  const list = Array.from({ length: rec.assignments }, (_, i) => {
    const m = hashId(`${rec.id}-a-${i}`);
    return {
      id: `${rec.id}-a-${i}`,
      target: `${pick(BUSINESS_UNITS, m)} / ${pick(WORKSPACES, m)}`,
      type: pick(
        ["Organization", "Business Unit", "Workspace", "Workspace Template"],
        m,
      ),
      assignment: pick(["Inherited", "Direct", "Override", "Exception"], m),
      status: pick(["Active", "Active", "Pending"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "target", header: "Target", render: (r) => r.target },
    { key: "type", header: "Assignment Type", render: (r) => r.type },
    { key: "assignment", header: "Assignment", render: (r) => r.assignment },
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
        Where this policy is assigned (inherited / direct / override /
        exception). <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ImpactTab({ rec }: { rec: PolicyChange }) {
  return (
    <AuditSection title="Impact analysis" sample>
      <StatRow
        label="Affected Workspaces"
        value={rec.affectedWorkspaces}
        sample
      />
      <StatRow
        label="Affected Resources"
        value={rec.affectedWorkspaces * 4}
        sample
      />
      <StatRow
        label="Affected Users"
        value={rec.affectedWorkspaces * 12}
        sample
      />
      <StatRow
        label="Compliance Impact"
        value={rec.category === "Compliance" ? "Framework affected" : "None"}
        tone={rec.category === "Compliance" ? "warn" : "ok"}
        sample
      />
      <StatRow
        label="Security Impact"
        value={rec.category === "Security" ? "Elevated" : "Low"}
        tone={rec.category === "Security" ? "warn" : "ok"}
        sample
      />
      <StatRow
        label="Operational Impact"
        value={rec.riskScore > 50 ? "Elevated" : "Low"}
        sample
      />
      <StatRow
        label="Business Impact"
        value={rec.riskScore > 60 ? "High" : "Moderate"}
        sample
      />
    </AuditSection>
  );
}

function ApprovalTab({ rec }: { rec: PolicyChange }) {
  const stages = [
    "Submitted",
    "Governance Review",
    "Security Review",
    "Compliance Review",
    "Approved",
    "Published",
  ];
  const completed =
    rec.approvalStatus === "Approved"
      ? stages.length
      : rec.approvalStatus === "Rejected"
        ? 2
        : 3;
  return (
    <AuditSection title="Approval workflow" sample>
      {stages.map((s, i) => {
        const done = i < completed;
        const rejected = rec.approvalStatus === "Rejected" && i === 2;
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
                  ? `${pick(ADMINS, hashId(rec.id))} · rejected`
                  : done
                    ? `${pick(ADMINS, hashId(rec.id) + i)} · approved`
                    : "Pending"}
              </div>
            </div>
          </div>
        );
      })}
    </AuditSection>
  );
}

function ResourcesTab({ rec }: { rec: PolicyChange }) {
  const list = Array.from({ length: 3 + (hashId(rec.id) % 4) }, (_, i) => {
    const m = hashId(`${rec.id}-r-${i}`);
    return {
      id: `${rec.id}-r-${i}`,
      resource: pick(
        [
          "Workspace",
          "Workspace Template",
          "Automation",
          "Cloud Account",
          "Compliance Framework",
          "Identity",
        ],
        m,
      ),
      workspace: pick(WORKSPACES, m),
      status: pick(["Active", "Active", "Pending"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
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
        Resources related to this policy change. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

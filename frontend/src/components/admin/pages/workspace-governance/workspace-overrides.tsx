/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Inheritance & Overrides → Workspace Overrides */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Pencil,
  Copy,
  Download,
  RefreshCcw,
  Send,
  ClipboardCheck,
  Undo2,
  Eye,
  GitCompare,
  ShieldAlert,
  History,
  LayoutGrid,
  SlidersHorizontal,
  Layers,
  GitBranch,
  Gauge,
  CalendarClock,
  Activity as ActivityIcon,
  ShieldCheck,
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
  FloorBadge,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { StatStripPlain, ColumnChooser } from "#/components/admin/settings-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";

/**
 * Workspace Overrides — approved DEVIATIONS from inherited enterprise governance for an individual
 * workspace. Overrides are exceptions, not the default operating model: every one is governed,
 * risk-assessed, approval-workflowed, time-boxed and audited. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/02_Inheritance & Overrides/workspace_overrides.md.
 *
 * Enterprise-Governance UX (Banner · Toolbar · Filters · Search · Datatable · Bulk/Row actions ·
 * 9-tab Override Detail Drawer). No override backend yet → deterministic representative sample data
 * (tagged `Sample`); swap SAMPLE_OVERRIDES for the live query when the inheritance engine lands.
 */

type Category =
  | "Platform"
  | "Security"
  | "Compliance"
  | "Cloud"
  | "Networking"
  | "AI"
  | "Identity"
  | "Automation"
  | "Monitoring"
  | "Integrations"
  | "Notifications"
  | "Resource Quotas"
  | "Cost Controls";
type OverrideType =
  | "Temporary"
  | "Permanent"
  | "Scheduled"
  | "Emergency"
  | "Customer-Specific"
  | "Migration"
  | "Regulatory";
type Approval = "Approved" | "Pending" | "Rejected";
type Status = "Active" | "Pending" | "Expiring Soon" | "Expired" | "Restored";
type Risk = "Low" | "Medium" | "High" | "Critical";

const OVERRIDE_TYPES: OverrideType[] = [
  "Temporary",
  "Permanent",
  "Scheduled",
  "Emergency",
  "Customer-Specific",
  "Migration",
  "Regulatory",
];
const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const OWNERS = [
  "Governance Admin",
  "Aisha Khan",
  "David Chen",
  "Marco Rossi",
  "Priya Nair",
];

const RISK_TONE: Record<Risk, string> = {
  Low: T.textMuted,
  Medium: T.accent,
  High: T.warning,
  Critical: T.danger,
};
const APPROVAL_TONE: Record<Approval, string> = {
  Approved: T.success,
  Pending: T.warning,
  Rejected: T.danger,
};
const STATUS_TONE: Record<Status, string> = {
  Active: T.success,
  Pending: T.warning,
  "Expiring Soon": T.warning,
  Expired: T.textMuted,
  Restored: T.accent,
};
interface Override {
  id: string;
  name: string;
  category: Category;
  overrideType: OverrideType;
  workspace: string;
  approval: Approval;
  expiration: string;
  status: Status;
  environment: string;
  businessUnit: string;
  risk: Risk;
  owner: string;
  created: string;
  modified: string;
  configItem: string;
  currentValue: string;
  overrideValue: string;
  reason: string;
  description: string;
  // Statistics
  affectedSettings: number;
  inheritedPolicies: number;
  approvals: number;
  complianceImpact: string;
  riskScore: number;
}

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

const OVERRIDE_NAMES = [
  [
    "Production AI Provider",
    "AI",
    "Default AI Provider",
    "Anthropic",
    "Azure OpenAI",
  ],
  [
    "EU Data Residency Region",
    "Cloud",
    "Default Region",
    "us-east-1",
    "eu-west-1",
  ],
  ["Extended Resource Quota", "Resource Quotas", "vCPU Quota", "64", "256"],
  [
    "Customer SSO Provider",
    "Identity",
    "Identity Provider",
    "Entra ID",
    "Okta",
  ],
  [
    "Legacy Encryption Cipher",
    "Security",
    "Encryption",
    "AES-256 + KMS",
    "AES-256 (BYOK)",
  ],
  [
    "Additional SIEM Connector",
    "Integrations",
    "SIEM",
    "Splunk",
    "Sentinel + Splunk",
  ],
  [
    "Relaxed Session Timeout",
    "Security",
    "Session Timeout",
    "8 hours",
    "12 hours",
  ],
  [
    "Migration Backup Window",
    "Monitoring",
    "Backup Schedule",
    "Daily",
    "Hourly",
  ],
  ["Regulatory Retention", "Compliance", "Retention", "35 days", "7 years"],
  [
    "Custom Cost Budget",
    "Cost Controls",
    "Default Budget",
    "$10k / mo",
    "$45k / mo",
  ],
  [
    "Egress Exception",
    "Networking",
    "Egress Policy",
    "Deny-all",
    "Allow: partner-api",
  ],
  ["Autonomous Execution", "Automation", "Execution Mode", "Ask", "Autonomous"],
];

const SAMPLE_OVERRIDES: Override[] = OVERRIDE_NAMES.map(
  ([name, cat, configItem, currentValue, overrideValue], i) => {
    const id = `OV-${(1000 + i * 4).toString().padStart(5, "0")}`;
    const n = hashId(id + name);
    const approval = pick<Approval>(
      ["Approved", "Approved", "Approved", "Pending", "Rejected"],
      n,
    );
    const status =
      approval === "Pending"
        ? "Pending"
        : approval === "Rejected"
          ? "Restored"
          : pick<Status>(["Active", "Active", "Expiring Soon", "Expired"], n);
    return {
      id,
      name,
      category: cat as Category,
      overrideType: pick(OVERRIDE_TYPES, n),
      workspace: `${pick(BUSINESS_UNITS, n >> 1)} ${pick(ENVIRONMENTS, n >> 2)}`,
      approval,
      expiration: `2026-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      status,
      environment: pick(ENVIRONMENTS, n >> 2),
      businessUnit: pick(BUSINESS_UNITS, n >> 1),
      risk: pick<Risk>(["Low", "Medium", "High", "High", "Critical"], n),
      owner: pick(OWNERS, n),
      created: `2025-${(1 + (n % 12)).toString().padStart(2, "0")}-${(1 + ((n + 7) % 27)).toString().padStart(2, "0")}`,
      modified: `2026-0${1 + (n % 7)}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
      configItem,
      currentValue,
      overrideValue,
      reason: pick(
        [
          "Customer requirement",
          "Regulatory obligation",
          "Technical constraint",
          "Migration window",
          "Business exception",
        ],
        n,
      ),
      description: `Approved deviation from the inherited ${configItem} baseline for the ${pick(BUSINESS_UNITS, n >> 1)} workspace.`,
      affectedSettings: 1 + (n % 6),
      inheritedPolicies: 2 + (n % 8),
      approvals: 2 + (n % 4),
      complianceImpact: pick(["None", "Low", "Medium", "Requires review"], n),
      riskScore: 10 + (n % 85),
    };
  },
);

function RiskBadge({ risk }: { risk: Risk }) {
  const c = RISK_TONE[risk];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: c }}
      />
      {risk}
    </span>
  );
}
function ApprovalBadge({ approval }: { approval: Approval }) {
  const c = APPROVAL_TONE[approval];
  return <span style={{ color: c }}>{approval}</span>;
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

export function WorkspaceOverridesView() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fCat, setFCat] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fApproval, setFApproval] = React.useState("");
  const [fRisk, setFRisk] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_OVERRIDES;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q) ||
        r.configItem.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q)) &&
      (!fStatus || r.status === fStatus) &&
      (!fType || r.overrideType === fType) &&
      (!fCat || r.category === fCat) &&
      (!fEnv || r.environment === fEnv) &&
      (!fApproval || r.approval === fApproval) &&
      (!fRisk || r.risk === fRisk)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFStatus("");
    setFType("");
    setFCat("");
    setFEnv("");
    setFApproval("");
    setFRisk("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // Operational Dashboard (spec §Operational Dashboard).
  const active = records.filter(
    (r) => r.status === "Active" || r.status === "Expiring Soon",
  ).length;
  const pending = records.filter((r) => r.approval === "Pending").length;
  const expired = records.filter((r) => r.status === "Expired").length;
  const highRisk = records.filter(
    (r) => r.risk === "High" || r.risk === "Critical",
  ).length;
  const complianceExceptions = records.filter(
    (r) => r.complianceImpact !== "None",
  ).length;
  const drift = records.filter(
    (r) => r.status === "Active" && r.risk !== "Low",
  ).length;
  const categories = new Set(records.map((r) => r.category)).size;

  const toolbar: CommandItem[] = [
    {
      key: "create",
      label: "Create Override",
      icon: <Plus size={15} />,
      onClick: () => navigate("/admin/workspace-governance?tab=inheritance"),
    },
    {
      key: "edit",
      label: "Edit Override",
      icon: <Pencil size={15} />,
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
      key: "submit",
      label: "Submit for Approval",
      icon: <Send size={15} />,
      disabled: true,
    },
    {
      key: "approve",
      label: "Approve",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "expire",
      label: "Expire Override",
      icon: <CalendarClock size={15} />,
      disabled: true,
    },
    {
      key: "restore",
      label: "Restore Baseline",
      icon: <Undo2 size={15} />,
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
      label: "Validate Override",
      icon: <ClipboardCheck size={15} />,
      disabled: true,
    },
    {
      key: "conflicts",
      label: "Detect Conflicts",
      icon: <ShieldAlert size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Baseline",
      icon: <GitCompare size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Override>[] = [
    {
      key: "name",
      header: "Override",
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
          <SlidersHorizontal size={14} color={T.textMuted} />
          {r.name}
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
      key: "workspace",
      header: "Workspace",
      sortValue: (r) => r.workspace,
      render: (r) => r.workspace,
    },
    {
      key: "approval",
      header: "Approval",
      sortValue: (r) => r.approval,
      render: (r) => <ApprovalBadge approval={r.approval} />,
    },
    {
      key: "expiration",
      header: "Expiration",
      sortValue: (r) => r.expiration,
      render: (r) => r.expiration,
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
          { label: "Active Overrides", value: active },
          {
            label: "Pending Approvals",
            value: pending,
            tone: pending > 0 ? "warn" : "ok",
          },
          { label: "Expired Overrides", value: expired },
          {
            label: "High-Risk Overrides",
            value: highRisk,
            tone: highRisk > 0 ? "danger" : "ok",
          },
          {
            label: "Compliance Exceptions",
            value: complianceExceptions,
            tone: complianceExceptions > 0 ? "warn" : "ok",
          },
          {
            label: "Configuration Drift",
            value: drift,
            tone: drift > 0 ? "warn" : "ok",
          },
          { label: "Categories", value: categories },
        ]}
      />

      <DiscoveryListView
        title="Workspace overrides"
        desc="Workspace Overrides provide controlled flexibility within a governed environment — approved deviations from the inherited baseline, each with a business justification, risk assessment, approval workflow, expiration and audit record."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search workspace overrides — override name, workspace, configuration, policy, reason, business unit…"
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
            key: "overrideType",
            label: "Override Type",
            value: fType,
            onChange: setFType,
            options: facet(records.map((r) => r.overrideType)),
          },
          {
            key: "category",
            label: "Category",
            value: fCat,
            onChange: setFCat,
            options: facet(records.map((r) => r.category)),
          },
          {
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "approvalStatus",
            label: "Approval Status",
            value: fApproval,
            onChange: setFApproval,
            options: facet(records.map((r) => r.approval)),
          },
          {
            key: "riskLevel",
            label: "Risk Level",
            value: fRisk,
            onChange: setFRisk,
            options: facet(records.map((r) => r.risk)),
          },
        ]}
        presets={[{ label: "All workspace overrides", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "status", dir: "asc" }}
        onRowClick={(r) => setSelId(r.id)}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <HeaderButton icon={<ClipboardCheck size={13} />} onClick={clear}>
              Approve ({ids.length})
            </HeaderButton>
            <HeaderButton icon={<Trash2 size={13} />} onClick={clear}>
              Reject
            </HeaderButton>
            <HeaderButton icon={<CalendarClock size={13} />} onClick={clear}>
              Expire
            </HeaderButton>
            <HeaderButton icon={<Download size={13} />} onClick={clear}>
              Export
            </HeaderButton>
            <HeaderButton icon={<Undo2 size={13} />} onClick={clear}>
              Restore Baseline
            </HeaderButton>
          </>
        )}
        rowActions={(r) => (
          <RowMenu
            items={[
              { label: "View", onClick: () => setSelId(r.id) },
              { label: "Edit", onClick: () => setSelId(r.id) },
              { label: "Approve", onClick: () => setSelId(r.id) },
              { label: "Reject", onClick: () => setSelId(r.id) },
              { label: "Duplicate", onClick: () => {} },
              { label: "Restore Baseline", onClick: () => setSelId(r.id) },
              { label: "Expire", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<SlidersHorizontal size={20} />}
            title="No workspace overrides configured."
            hint="Create a governed, risk-assessed deviation from the inherited enterprise baseline for an individual workspace."
            cta="Create Workspace Override"
            onCta={() =>
              navigate("/admin/workspace-governance?tab=inheritance")
            }
          />
        }
      />

      {sel && <OverrideDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function WorkspaceOverridesPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Workspace Overrides"
        subtitle="Manage approved deviations from inherited enterprise configuration, policies and governance for individual workspaces."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() =>
                navigate("/admin/workspace-governance?tab=inheritance")
              }
            >
              Create Override
            </HeaderButton>
          </>
        }
      />
      <WorkspaceOverridesView />
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

// ════════════ Override Detail Drawer — 9 sub-tabs (spec §Override Detail Drawer) ════════════
const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "details",
    label: "Override Details",
    icon: <SlidersHorizontal size={13} />,
  },
  {
    id: "original",
    label: "Original Configuration",
    icon: <Layers size={13} />,
  },
  {
    id: "effective",
    label: "Effective Configuration",
    icon: <GitBranch size={13} />,
  },
  {
    id: "approval",
    label: "Approval Workflow",
    icon: <ClipboardCheck size={13} />,
  },
  { id: "risk", label: "Risk Assessment", icon: <Gauge size={13} /> },
  { id: "expiration", label: "Expiration", icon: <CalendarClock size={13} /> },
  { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function OverrideDrawer({
  rec,
  onClose,
}: {
  rec: Override;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.category} · ${rec.workspace} · ${rec.status} · ${rec.approval}`}
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
          <HeaderButton icon={<ClipboardCheck size={13} />}>
            Approve
          </HeaderButton>
          <HeaderButton icon={<GitCompare size={13} />}>Compare</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "details" && <DetailsTab rec={rec} />}
      {tab === "original" && <OriginalTab rec={rec} />}
      {tab === "effective" && <EffectiveTab rec={rec} />}
      {tab === "approval" && <ApprovalTab rec={rec} />}
      {tab === "risk" && <RiskTab rec={rec} />}
      {tab === "expiration" && <ExpirationTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Override }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Override Name", v: rec.name },
              { k: "Workspace", v: rec.workspace },
              { k: "Business Unit", v: rec.businessUnit },
              { k: "Category", v: rec.category },
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
              { k: "Affected Settings", v: rec.affectedSettings, sample: true },
              {
                k: "Inherited Policies",
                v: rec.inheritedPolicies,
                sample: true,
              },
              { k: "Approvals", v: rec.approvals, sample: true },
              { k: "Compliance Impact", v: rec.complianceImpact, sample: true },
              { k: "Risk Score", v: `${rec.riskScore}/100`, sample: true },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function DetailsTab({ rec }: { rec: Override }) {
  return (
    <Section
      title="Override details — the configuration being overridden"
      sample
    >
      <KVGrid
        items={[
          { k: "Configuration Item", v: rec.configItem },
          { k: "Current Value", v: rec.currentValue },
          { k: "Override Value", v: rec.overrideValue },
          { k: "Reason", v: rec.reason },
          {
            k: "Business Justification",
            v: `${rec.reason} — approved by governance.`,
            sample: true,
          },
          {
            k: "Technical Justification",
            v: "Documented technical constraint.",
            sample: true,
          },
          { k: "Owner", v: rec.owner, sample: true },
        ]}
      />
    </Section>
  );
}

function OriginalTab({ rec }: { rec: Override }) {
  const list = [
    {
      id: "1",
      configuration: rec.configItem,
      inherited: rec.currentValue,
      source: "Organization Default",
      policy: "Operational Policy",
      locked: rec.risk === "Critical" ? "Yes" : "No",
    },
    {
      id: "2",
      configuration: "Default Region",
      inherited: "eu-west-1",
      source: "Organization Default",
      policy: "Operational Policy",
      locked: "No",
    },
    {
      id: "3",
      configuration: "Encryption",
      inherited: "AES-256 + KMS",
      source: "Organization Default",
      policy: "Security Policy",
      locked: "Yes",
    },
  ];
  const cols: Column<(typeof list)[number]>[] = [
    {
      key: "configuration",
      header: "Configuration",
      render: (r) => r.configuration,
    },
    { key: "inherited", header: "Inherited Value", render: (r) => r.inherited },
    { key: "source", header: "Source", render: (r) => r.source },
    { key: "policy", header: "Policy", render: (r) => r.policy },
    {
      key: "locked",
      header: "Locked",
      render: (r) => (r.locked === "Yes" ? <FloorBadge /> : "No"),
    },
  ];
  return (
    <Section
      title="Original configuration — inherited enterprise baseline"
      sample
    >
      <DirectoryTable columns={cols} rows={list} />
    </Section>
  );
}

function EffectiveTab({ rec }: { rec: Override }) {
  const list = [
    {
      id: "1",
      configuration: rec.configItem,
      original: rec.currentValue,
      override: rec.overrideValue,
      effective: rec.overrideValue,
    },
  ];
  const cols: Column<(typeof list)[number]>[] = [
    {
      key: "configuration",
      header: "Configuration",
      render: (r) => r.configuration,
    },
    { key: "original", header: "Original", render: (r) => r.original },
    { key: "override", header: "Override", render: (r) => r.override },
    {
      key: "effective",
      header: "Effective",
      render: (r) => (
        <span style={{ color: T.textPrimary, fontWeight: 500 }}>
          {r.effective}
        </span>
      ),
    },
  ];
  return (
    <>
      <Section
        title="Effective configuration after applying the override"
        sample
      >
        <FlowChain
          steps={[
            "Inherited Configuration",
            "Workspace Override",
            "Effective Configuration",
          ]}
        />
      </Section>
      <Section title="Resulting values" sample>
        <DirectoryTable columns={cols} rows={list} />
      </Section>
    </>
  );
}

function ApprovalTab({ rec }: { rec: Override }) {
  const stages = [
    "Request",
    "Workspace Owner",
    "Platform Administrator",
    "Security Review",
    "Compliance Review",
    "Final Approval",
  ];
  const decidedThrough =
    rec.approval === "Approved"
      ? stages.length
      : rec.approval === "Rejected"
        ? 3
        : 2 + (hashId(rec.id) % 3);
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
        <HeaderButton icon={<ClipboardCheck size={13} />}>Approve</HeaderButton>
        <HeaderButton variant="danger">Reject</HeaderButton>
        <HeaderButton>Request Changes</HeaderButton>
        <HeaderButton icon={<ShieldAlert size={13} />}>Escalate</HeaderButton>
        <SampleTag />
      </div>
      <Section title="Approval workflow" sample>
        {stages.map((stage, i) => {
          const decision =
            i < decidedThrough
              ? rec.approval === "Rejected" && i === decidedThrough - 1
                ? "Rejected"
                : "Approved"
              : "Pending";
          return (
            <StatRow
              key={stage}
              label={`${(i + 1).toString().padStart(2, "0")} · ${stage}`}
              value={`${decision} · ${pick(OWNERS, hashId(rec.id) + i)}`}
              tone={
                decision === "Approved"
                  ? "ok"
                  : decision === "Rejected"
                    ? "danger"
                    : "warn"
              }
              sample
            />
          );
        })}
      </Section>
    </>
  );
}

function RiskTab({ rec }: { rec: Override }) {
  const rec2Line = (label: string, v: string) => (
    <StatRow key={label} label={label} value={v} sample />
  );
  return (
    <>
      <Section title="Risk assessment" sample>
        <StatRow
          label="Risk Level"
          value={<RiskBadge risk={rec.risk} />}
          sample
        />
        <StatRow
          label="Risk Score"
          value={`${rec.riskScore}/100`}
          tone={
            rec.riskScore >= 70 ? "danger" : rec.riskScore >= 40 ? "warn" : "ok"
          }
          sample
        />
        {rec2Line("Compliance Impact", rec.complianceImpact)}
        {rec2Line(
          "Security Impact",
          rec.category === "Security" ? "Elevated" : "Low",
        )}
        {rec2Line(
          "Operational Impact",
          rec.overrideType === "Emergency" ? "High" : "Low",
        )}
        {rec2Line("Business Impact", "Positive — unblocks requirement")}
      </Section>
      <Section title="Recommendation" sample>
        <StatRow
          label="Governance recommendation"
          value={
            rec.risk === "Critical"
              ? "Require Mitigation"
              : rec.risk === "High"
                ? "Require Approval"
                : "Accept"
          }
          tone={
            rec.risk === "Critical"
              ? "danger"
              : rec.risk === "High"
                ? "warn"
                : "ok"
          }
          sample
        />
      </Section>
    </>
  );
}

function ExpirationTab({ rec }: { rec: Override }) {
  return (
    <Section title="Expiration & lifecycle" sample>
      <KVGrid
        items={[
          {
            k: "Expiration Date",
            v:
              rec.overrideType === "Permanent"
                ? "None (permanent)"
                : rec.expiration,
            sample: true,
          },
          { k: "Review Frequency", v: "Quarterly", sample: true },
          {
            k: "Auto Expire",
            v: rec.overrideType === "Temporary" ? "Yes" : "No",
            sample: true,
          },
          {
            k: "Renewal Required",
            v: rec.overrideType === "Temporary" ? "Yes" : "No",
            sample: true,
          },
          { k: "Review Owner", v: rec.owner, sample: true },
          { k: "Lifecycle", v: rec.status, sample: true },
        ]}
      />
    </Section>
  );
}

function ActivityTab({ rec }: { rec: Override }) {
  const events = [
    "Override Created",
    "Submitted",
    "Approved",
    "Modified",
    "Expired",
    "Restored",
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
    "Override Requested",
    "Override Approved",
    "Override Rejected",
    "Configuration Changed",
    "Override Expired",
    "Baseline Restored",
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

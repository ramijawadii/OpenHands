/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Governance → Inheritance & Overrides → Configuration Drift */
import React from "react";
import { useNavigate } from "react-router";
import {
  RefreshCcw,
  Download,
  ScanLine,
  Check,
  X,
  EyeOff,
  FilePlus2,
  GitCompare,
  RotateCcw,
  Wrench,
  LayoutGrid,
  ShieldCheck,
  Search as SearchIcon,
  BadgeCheck,
  History,
  Waypoints,
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
 * Configuration Drift — the platform's continuous governance-verification engine: it detects, analyzes
 * and manages deviations between a workspace's Expected Configuration (governance baseline) and its
 * Actual Runtime Configuration. Answers what/when/who/why changed, whether it was approved, whether it
 * violates policy, and whether to remediate. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Governance/02_Inheritance & Overrides/configuration_drift.md.
 *
 * Enterprise-Governance UX pattern (Banner · KPI Summary · Toolbar · Filters · Search · Datatable ·
 * Bulk/Row actions · 8-tab Drift Detail Drawer). No drift backend yet → deterministic sample data.
 */

type Severity = "Low" | "Medium" | "High" | "Critical";
type Status =
  | "Active"
  | "Approved"
  | "Remediated"
  | "Ignored"
  | "Pending Remediation";
type Category =
  | "Platform"
  | "Identity"
  | "Security"
  | "Compliance"
  | "Cloud"
  | "Networking"
  | "Automation"
  | "AI Platform";
type Cause =
  | "Manual Change"
  | "Automation"
  | "Cloud Console"
  | "Infrastructure as Code"
  | "API"
  | "Policy Update"
  | "Emergency Change"
  | "Template Update"
  | "Provider Change";

const ENVIRONMENTS = ["Production", "Pre-production", "Development", "Sandbox"];
const WORKSPACES = [
  "Payments",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Mobile API",
];
const FRAMEWORKS = [
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "HIPAA",
  "NIST",
  "CIS",
  "CSA CCM",
  "GDPR",
];
const DETECTION = [
  "Continuous Scan",
  "Scheduled Scan",
  "Cloud Event",
  "Policy Evaluation",
  "Manual Scan",
];
const OWNERS = [
  "Platform Team",
  "Cloud Team",
  "Security Team",
  "Aisha Khan",
  "Marco Rossi",
];

const SEV_TONE: Record<Severity, string> = {
  Low: T.textMuted,
  Medium: T.accent,
  High: T.warning,
  Critical: T.danger,
};
const SEV_ORDER: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};
const STATUS_TONE: Record<Status, string> = {
  Active: T.danger,
  "Pending Remediation": T.warning,
  Approved: T.accent,
  Remediated: T.success,
  Ignored: T.textMuted,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Drift {
  id: string;
  name: string;
  expected: string;
  actual: string;
  category: Category;
  severity: Severity;
  status: Status;
  detected: string;
  workspace: string;
  environment: string;
  cause: Cause;
  actor: string;
  framework: string;
  detection: string;
  policyViolations: number;
  complianceViolations: number;
  affectedResources: number;
  relatedAlerts: number;
  remediationAttempts: number;
  ageHours: number;
}

const DRIFTS_SEED: { name: string; cat: Category; exp: string; act: string }[] =
  [
    {
      name: "Default Region",
      cat: "Cloud",
      exp: "eu-west-1",
      act: "us-east-1",
    },
    {
      name: "Encryption at Rest",
      cat: "Security",
      exp: "Enabled",
      act: "Disabled",
    },
    {
      name: "MFA Enforcement",
      cat: "Identity",
      exp: "Enforced",
      act: "Optional",
    },
    { name: "Audit Logging", cat: "Security", exp: "Enabled", act: "Disabled" },
    {
      name: "Firewall Rule",
      cat: "Networking",
      exp: "Default-deny",
      act: "0.0.0.0/0 allow",
    },
    {
      name: "Approved AI Model",
      cat: "AI Platform",
      exp: "GPT-5 Enterprise",
      act: "GPT-4o",
    },
    {
      name: "Backup Retention",
      cat: "Platform",
      exp: "35 days",
      act: "7 days",
    },
    {
      name: "Compliance Framework",
      cat: "Compliance",
      exp: "SOC 2",
      act: "None",
    },
    {
      name: "IAM Role Policy",
      cat: "Identity",
      exp: "Least privilege",
      act: "AdministratorAccess",
    },
    {
      name: "Automation Approval",
      cat: "Automation",
      exp: "Required",
      act: "Auto-run",
    },
    { name: "TLS Version", cat: "Security", exp: "TLS 1.2", act: "TLS 1.0" },
    {
      name: "Storage Public Access",
      cat: "Cloud",
      exp: "Blocked",
      act: "Public",
    },
    {
      name: "Network Policy",
      cat: "Networking",
      exp: "Namespaced",
      act: "Open",
    },
    { name: "Log Forwarding", cat: "Platform", exp: "SIEM", act: "Local only" },
  ];

const SAMPLE_DRIFT: Drift[] = DRIFTS_SEED.map(({ name, cat, exp, act }, i) => {
  const id = `DR-${(1000 + i * 7).toString().padStart(5, "0")}`;
  const n = hashId(id + name);
  const severity = pick<Severity>(
    ["Critical", "High", "High", "Medium", "Low"],
    n,
  );
  const status = pick<Status>(
    [
      "Active",
      "Active",
      "Pending Remediation",
      "Approved",
      "Remediated",
      "Ignored",
    ],
    n,
  );
  return {
    id,
    name,
    expected: exp,
    actual: act,
    category: cat,
    severity,
    status,
    detected: pick(
      ["5 minutes ago", "2 hours ago", "yesterday", "3 days ago"],
      n,
    ),
    workspace: pick(WORKSPACES, n >> 1),
    environment: pick(ENVIRONMENTS, n >> 2),
    cause: pick<Cause>(
      [
        "Manual Change",
        "Cloud Console",
        "Automation",
        "API",
        "Infrastructure as Code",
        "Emergency Change",
        "Provider Change",
      ],
      n,
    ),
    actor: pick(OWNERS, n),
    framework: pick(FRAMEWORKS, n >> 3),
    detection: pick(DETECTION, n),
    policyViolations: n % 5,
    complianceViolations: n % 4,
    affectedResources: 1 + (n % 25),
    relatedAlerts: n % 8,
    remediationAttempts: n % 3,
    ageHours: 1 + (n % 160),
  };
});

function SeverityBadge({ severity }: { severity: Severity }) {
  const c = SEV_TONE[severity];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: c }}
      />
      {severity}
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
function Diff({ expected, actual }: { expected: string; actual: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
      }}
    >
      <span style={{ color: T.success }}>{expected}</span>
      <span style={{ color: T.textMuted }}>→</span>
      <span style={{ color: T.danger }}>{actual}</span>
    </span>
  );
}

export function ConfigurationDriftView() {
  const [search, setSearch] = React.useState("");
  const [fSev, setFSev] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [fCat, setFCat] = React.useState("");
  const [fFramework, setFFramework] = React.useState("");
  const [fDetection, setFDetection] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_DRIFT;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.actor.toLowerCase().includes(q)) &&
      (!fSev || r.severity === fSev) &&
      (!fStatus || r.status === fStatus) &&
      (!fWs || r.workspace === fWs) &&
      (!fEnv || r.environment === fEnv) &&
      (!fCat || r.category === fCat) &&
      (!fFramework || r.framework === fFramework) &&
      (!fDetection || r.detection === fDetection)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFSev("");
    setFStatus("");
    setFWs("");
    setFEnv("");
    setFCat("");
    setFFramework("");
    setFDetection("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  // KPI Summary (spec §KPI Summary).
  const activeDrift = records.filter((r) => r.status === "Active").length;
  const criticalDrift = records.filter((r) => r.severity === "Critical").length;
  const approvedDrift = records.filter((r) => r.status === "Approved").length;
  const pendingRemediation = records.filter(
    (r) => r.status === "Pending Remediation",
  ).length;
  const autoRemediated = records.filter(
    (r) => r.status === "Remediated",
  ).length;
  const complianceViolations = records.reduce(
    (a, r) => a + r.complianceViolations,
    0,
  );
  const policyViolations = records.reduce((a, r) => a + r.policyViolations, 0);
  const avgAge = Math.round(
    records.reduce((a, r) => a + r.ageHours, 0) / records.length,
  );

  const toolbar: CommandItem[] = [
    {
      key: "scan",
      label: "Scan Workspace",
      icon: <ScanLine size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "scanall",
      label: "Scan All",
      icon: <ScanLine size={15} />,
      disabled: true,
    },
    {
      key: "refresh",
      label: "Refresh",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "export",
      label: "Export",
      icon: <Download size={15} />,
      disabled: true,
    },
    {
      key: "approve",
      label: "Approve Drift",
      icon: <Check size={15} />,
      disabled: true,
    },
    {
      key: "reject",
      label: "Reject Drift",
      icon: <X size={15} />,
      disabled: true,
    },
    {
      key: "ignore",
      label: "Ignore Drift",
      icon: <EyeOff size={15} />,
      disabled: true,
    },
    {
      key: "exception",
      label: "Create Exception",
      icon: <FilePlus2 size={15} />,
      disabled: true,
    },
    {
      key: "compare",
      label: "Compare Baseline",
      icon: <GitCompare size={15} />,
      disabled: true,
    },
    {
      key: "auto",
      label: "Auto Remediate",
      icon: <Wrench size={15} />,
      disabled: true,
    },
    {
      key: "restore",
      label: "Restore Baseline",
      icon: <RotateCcw size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Drift>[] = [
    {
      key: "name",
      header: "Configuration",
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
          <Waypoints size={13} color={T.textMuted} />
          {r.name}
        </span>
      ),
    },
    {
      key: "diff",
      header: "Expected → Actual",
      render: (r) => <Diff expected={r.expected} actual={r.actual} />,
    },
    {
      key: "category",
      header: "Category",
      sortValue: (r) => r.category,
      render: (r) => r.category,
    },
    {
      key: "severity",
      header: "Severity",
      sortValue: (r) => SEV_ORDER[r.severity],
      render: (r) => <SeverityBadge severity={r.severity} />,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "detected",
      header: "Detected",
      sortValue: (r) => r.ageHours,
      render: (r) => r.detected,
    },
    {
      key: "workspace",
      header: "Workspace",
      sortValue: (r) => r.workspace,
      render: (r) => r.workspace,
    },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard
          title="Active Drift"
          value={activeDrift}
          tone={activeDrift > 0 ? "danger" : "ok"}
          sub={
            <>
              Unresolved deviations <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Critical Drift"
          value={criticalDrift}
          tone={criticalDrift > 0 ? "danger" : "ok"}
          sub={
            <>
              Highest severity <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Approved Drift"
          value={approvedDrift}
          tone="ok"
          sub={
            <>
              Accepted via governance <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Pending Remediation"
          value={pendingRemediation}
          tone={pendingRemediation > 0 ? "warn" : "ok"}
          sub={
            <>
              Awaiting fix <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Auto Remediated"
          value={autoRemediated}
          tone="ok"
          sub={
            <>
              Restored to baseline <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Compliance Violations"
          value={complianceViolations}
          tone={complianceViolations > 0 ? "warn" : "ok"}
          sub={
            <>
              Framework impact <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Policy Violations"
          value={policyViolations}
          tone={policyViolations > 0 ? "warn" : "ok"}
          sub={
            <>
              Governance impact <SampleTag />
            </>
          }
        />
        <PostureCard
          title="Average Drift Age"
          value={`${avgAge}h`}
          tone={avgAge <= 24 ? "ok" : "warn"}
          sub={
            <>
              Detect to resolve <SampleTag />
            </>
          }
        />
      </PostureGrid>

      <DiscoveryListView
        title="Configuration drift"
        desc="Continuously monitor and remediate deviations between the expected governance baseline and the actual workspace configuration across policy, compliance, security and infrastructure."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search configuration drift — workspace, configuration, policy, resource, control, user…"
        count={rows.length}
        pills={[
          {
            key: "severity",
            label: "Severity",
            value: fSev,
            onChange: setFSev,
            options: facet(records.map((r) => r.severity)),
          },
          {
            key: "status",
            label: "Status",
            value: fStatus,
            onChange: setFStatus,
            options: facet(records.map((r) => r.status)),
          },
          {
            key: "workspace",
            label: "Workspace",
            value: fWs,
            onChange: setFWs,
            options: facet(records.map((r) => r.workspace)),
          },
          {
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "category",
            label: "Category",
            value: fCat,
            onChange: setFCat,
            options: facet(records.map((r) => r.category)),
          },
          {
            key: "complianceFramework",
            label: "Compliance Framework",
            value: fFramework,
            onChange: setFFramework,
            options: facet(records.map((r) => r.framework)),
          },
          {
            key: "detectionMethod",
            label: "Detection Method",
            value: fDetection,
            onChange: setFDetection,
            options: facet(records.map((r) => r.detection)),
          },
        ]}
        presets={[{ label: "All configuration drift", onApply: clearFilters }]}
        filterRightSlot={
          <ColumnChooser cols={cols} hidden={hidden} onToggle={toggleCol} />
        }
        columns={cols.filter((c) => !hidden.has(c.key))}
        rows={rows}
        pageSize={12}
        initialSort={{ key: "severity", dir: "asc" }}
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
            <HeaderButton icon={<RotateCcw size={13} />} onClick={clear}>
              Restore Baseline
            </HeaderButton>
            <HeaderButton icon={<Wrench size={13} />} onClick={clear}>
              Auto Remediate
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
              { label: "Compare", onClick: () => setSelId(r.id) },
              { label: "Approve", onClick: () => {} },
              { label: "Reject", onClick: () => {} },
              { label: "Restore Baseline", onClick: () => setSelId(r.id) },
              { label: "Ignore", onClick: () => {} },
              { label: "Create Exception", onClick: () => setSelId(r.id) },
              { label: "Export", onClick: () => {} },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<BadgeCheck size={20} />}
            title="No configuration drift detected."
            hint="Every scanned workspace matches its governance baseline. Run a configuration scan to re-check."
            cta="Run Configuration Scan"
            onCta={() => setSelId(null)}
          />
        }
      />

      {sel && <DriftDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function ConfigurationDriftPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title="Configuration Drift"
        subtitle="Continuously monitor and remediate deviations between the expected governance baseline and the actual workspace configuration."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<ScanLine size={14} />}
              onClick={() =>
                navigate("/admin/workspace-governance?tab=inheritance")
              }
            >
              Scan All
            </HeaderButton>
          </>
        }
      />
      <ConfigurationDriftView />
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
    id: "comparison",
    label: "Configuration Comparison",
    icon: <GitCompare size={13} />,
  },
  { id: "rootcause", label: "Root Cause", icon: <SearchIcon size={13} /> },
  {
    id: "governance",
    label: "Governance Impact",
    icon: <ShieldCheck size={13} />,
  },
  {
    id: "compliance",
    label: "Compliance Impact",
    icon: <BadgeCheck size={13} />,
  },
  { id: "remediation", label: "Remediation", icon: <Wrench size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "audit", label: "Audit History", icon: <History size={13} /> },
];

function DriftDrawer({ rec, onClose }: { rec: Drift; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.workspace} · ${rec.severity} · ${rec.status} · detected ${rec.detected}`}
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
          <HeaderButton icon={<RotateCcw size={13} />}>Restore</HeaderButton>
          <HeaderButton icon={<Check size={13} />}>Approve</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "comparison" && <ComparisonTab rec={rec} />}
      {tab === "rootcause" && <RootCauseTab rec={rec} />}
      {tab === "governance" && <GovernanceTab rec={rec} />}
      {tab === "compliance" && <ComplianceTab rec={rec} />}
      {tab === "remediation" && <RemediationTab />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "audit" && <AuditTab />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Drift }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <Section title="General">
          <KVGrid
            items={[
              { k: "Configuration", v: rec.name },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Category", v: rec.category },
              { k: "Severity", v: rec.severity },
              { k: "Status", v: rec.status },
              { k: "Detected", v: rec.detected, sample: true },
              { k: "Last Evaluated", v: rec.detected, sample: true },
              { k: "Environment", v: rec.environment, sample: true },
            ]}
          />
        </Section>
      )}
      {sub === "statistics" && (
        <Section title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Policy Violations", v: rec.policyViolations, sample: true },
              {
                k: "Compliance Violations",
                v: rec.complianceViolations,
                sample: true,
              },
              {
                k: "Affected Resources",
                v: rec.affectedResources,
                sample: true,
              },
              { k: "Related Alerts", v: rec.relatedAlerts, sample: true },
              {
                k: "Remediation Attempts",
                v: rec.remediationAttempts,
                sample: true,
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function ComparisonTab({ rec }: { rec: Drift }) {
  const list = [
    {
      id: "1",
      conf: rec.name,
      expected: rec.expected,
      actual: rec.actual,
      source: "Organization Default",
      changedBy: rec.actor,
    },
  ];
  const cols: Column<(typeof list)[number]>[] = [
    { key: "conf", header: "Configuration", render: (r) => r.conf },
    {
      key: "expected",
      header: "Expected",
      render: (r) => <span style={{ color: T.success }}>{r.expected}</span>,
    },
    {
      key: "actual",
      header: "Actual",
      render: (r) => <span style={{ color: T.danger }}>{r.actual}</span>,
    },
    { key: "source", header: "Source", render: (r) => r.source },
    { key: "changedBy", header: "Changed By", render: (r) => r.changedBy },
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
        Expected configuration vs actual runtime state. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function RootCauseTab({ rec }: { rec: Drift }) {
  return (
    <Section title="Root cause — why drift occurred" sample>
      <KVGrid
        items={[
          { k: "Cause", v: rec.cause, sample: true },
          { k: "Actor", v: rec.actor, sample: true },
          { k: "Time", v: rec.detected, sample: true },
          { k: "Detection Method", v: rec.detection, sample: true },
          { k: "Evidence", v: `Cloud audit event ${rec.id}`, sample: true },
        ]}
      />
    </Section>
  );
}

function GovernanceTab({ rec }: { rec: Drift }) {
  return (
    <Section title="Governance impact — policy evaluation" sample>
      <StatRow
        label="Affected Policies"
        value={rec.policyViolations}
        tone={rec.policyViolations > 0 ? "warn" : "ok"}
        sample
      />
      <StatRow
        label="Broken Inheritance"
        value={rec.policyViolations > 0 ? "Yes" : "No"}
        sample
      />
      <StatRow
        label="Override Status"
        value={rec.status === "Approved" ? "Approved override" : "Unapproved"}
        sample
      />
      <StatRow
        label="Lock Status"
        value={rec.severity === "Critical" ? "Violates lock" : "No lock"}
        tone={rec.severity === "Critical" ? "warn" : undefined}
        sample
      />
      <StatRow
        label="Approval Required"
        value={
          rec.severity === "High" || rec.severity === "Critical" ? "Yes" : "No"
        }
        sample
      />
      <StatRow
        label="Severity"
        value={<SeverityBadge severity={rec.severity} />}
        sample
      />
    </Section>
  );
}

function ComplianceTab({ rec }: { rec: Drift }) {
  return (
    <Section title="Compliance impact — regulatory evaluation" sample>
      <StatRow label="Affected Framework" value={rec.framework} sample />
      <StatRow
        label="Failed Controls"
        value={rec.complianceViolations}
        tone={rec.complianceViolations > 0 ? "warn" : "ok"}
        sample
      />
      <StatRow
        label="Evidence Impact"
        value={rec.complianceViolations > 0 ? "Evidence invalidated" : "None"}
        sample
      />
      <StatRow label="Audit Risk" value={rec.severity} sample />
      <StatRow
        label="Compliance Score"
        value={`${100 - rec.complianceViolations * 6}%`}
        tone={rec.complianceViolations > 0 ? "warn" : "ok"}
        sample
      />
    </Section>
  );
}

function RemediationTab() {
  const actions = [
    "Restore Baseline",
    "Approve Drift",
    "Ignore",
    "Create Exception",
    "Create Automation",
    "Assign Incident",
  ];
  const modes = ["Manual", "Automatic", "Scheduled", "Approval Required"];
  return (
    <>
      <Section title="Remediation actions" sample>
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}
        >
          {actions.map((a) => (
            <HeaderButton key={a}>{a}</HeaderButton>
          ))}
        </div>
      </Section>
      <Section title="Remediation modes" sample>
        {modes.map((m, i) => (
          <StatRow
            key={m}
            label={m}
            value={i === 0 ? "Selected" : "Available"}
            tone={i === 0 ? "ok" : undefined}
            sample
          />
        ))}
      </Section>
    </>
  );
}

function ActivityTab({ rec }: { rec: Drift }) {
  const events = [
    "Drift Detected",
    "Alert Generated",
    "Approval Requested",
    "Baseline Restored",
    "Exception Created",
    "Automation Executed",
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
    "Drift Detected",
    "Drift Approved",
    "Drift Rejected",
    "Baseline Restored",
    "Exception Approved",
    "Automation Executed",
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

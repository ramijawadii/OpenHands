/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Operations → Workspace Audit → Administrative Activity */
import React from "react";
import {
  Search as SearchIcon,
  Download,
  FileText,
  FolderSearch,
  RefreshCcw,
  ShieldCheck,
  FilePlus2,
  LayoutGrid,
  SlidersHorizontal,
  Boxes,
  MonitorSmartphone,
  Link2,
  History,
  FileArchive,
  BadgeCheck,
  UserCog,
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

/**
 * Administrative Activity — the authoritative administrative audit log for the Workspace platform: an
 * immutable, cryptographically-verifiable trail of every administrator action across workspace
 * management, governance, provisioning, automation, policies, identity, access, compliance,
 * integrations and platform configuration. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Operations/Workspace Audit/administrative_activity.md.
 *
 * Enterprise-Audit UX pattern (Banner · KPI Dashboard · Audit Table · Filters · Search · Activity
 * Drawer · Evidence Export). Read-only immutable audit records → deterministic sample. This file also
 * exports the shared audit primitives (ResultBadge, SeverityBadge, IntegrityBadge, EvidenceTab,
 * AuditVerificationTab) reused across the Workspace Audit leaves.
 */

// ── Shared audit primitives (exported for the other Workspace Audit leaves) ─────────────────────────
export type AuditResult = "Success" | "Failed" | "Warning";
export type Severity = "Critical" | "High" | "Medium" | "Low";
export type Integrity = "Verified" | "Warning" | "Failed";

const RESULT_TONE: Record<AuditResult, string> = {
  Success: T.success,
  Failed: T.danger,
  Warning: T.warning,
};
const SEVERITY_TONE: Record<Severity, string> = {
  Critical: T.danger,
  High: T.warning,
  Medium: T.accent,
  Low: T.textMuted,
};
export const SEVERITY_ORDER: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};
const INTEGRITY_TONE: Record<Integrity, string> = {
  Verified: T.success,
  Warning: T.warning,
  Failed: T.danger,
};

export function ResultBadge({ result }: { result: AuditResult }) {
  const c = RESULT_TONE[result];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: c }}
      />
      {result}
    </span>
  );
}
export function SeverityBadge({ severity }: { severity: Severity }) {
  const c = SEVERITY_TONE[severity];
  return <span style={{ fontSize: 11.5, color: c }}>{severity}</span>;
}
export function IntegrityBadge({ integrity }: { integrity: Integrity }) {
  const c = INTEGRITY_TONE[integrity];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}
    >
      <ShieldCheck size={12} /> {integrity}
    </span>
  );
}

export function AuditSection({
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

// Generic Evidence tab — every audit record exposes a forensic evidence package (spec §Evidence).
export function EvidenceTab({ id, items }: { id: string; items?: string[] }) {
  const list = items ?? [
    "JSON Record",
    "API Request",
    "API Response",
    "Approval Record",
    "Correlation IDs",
    "Digital Signature",
    "Related Logs",
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
        <HeaderButton icon={<Download size={13} />}>Download</HeaderButton>
        <HeaderButton icon={<FileArchive size={13} />}>Export</HeaderButton>
        <HeaderButton variant="primary" icon={<FilePlus2 size={13} />}>
          Generate Evidence Package
        </HeaderButton>
        <SampleTag />
      </div>
      <AuditSection title="Forensic evidence" sample>
        <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 8 }}>
          Cryptographically-signed evidence bundle for record {id}. All
          artifacts are immutable and hash-chained.
        </div>
        {list.map((it) => (
          <StatRow key={it} label={it} value="Included" tone="ok" sample />
        ))}
      </AuditSection>
    </>
  );
}

// Generic Audit Verification tab — integrity/hash/signature/tamper status (spec §Audit Verification).
export function AuditVerificationTab({
  integrity = "Verified" as Integrity,
}: {
  integrity?: Integrity;
}) {
  return (
    <AuditSection title="Audit verification" sample>
      <StatRow
        label="Integrity Status"
        value={<IntegrityBadge integrity={integrity} />}
        sample
      />
      <StatRow
        label="Hash Verification"
        value="SHA-256 chain valid"
        tone="ok"
        sample
      />
      <StatRow
        label="Timestamp Validation"
        value="RFC 3161 TSA verified"
        tone="ok"
        sample
      />
      <StatRow
        label="Signature Verification"
        value="Ed25519 signature valid"
        tone="ok"
        sample
      />
      <StatRow
        label="Chain Validation"
        value="Linked to previous record"
        tone="ok"
        sample
      />
      <StatRow
        label="Tamper Detection"
        value={
          integrity === "Verified" ? "No tampering detected" : "Anomaly flagged"
        }
        tone={integrity === "Verified" ? "ok" : "warn"}
        sample
      />
    </AuditSection>
  );
}

// ── Administrative Activity leaf ────────────────────────────────────────────────────────────────────
type Category =
  | "Governance"
  | "Provisioning"
  | "Automation"
  | "Security"
  | "Compliance"
  | "Identity"
  | "Configuration"
  | "Organization";

const CATEGORIES: Category[] = [
  "Governance",
  "Provisioning",
  "Automation",
  "Security",
  "Compliance",
  "Identity",
  "Configuration",
  "Organization",
];
const ADMINS = [
  "john.smith",
  "alice.jones",
  "m.rossi",
  "p.nair",
  "s.lopez",
  "gov.admin",
];
const WORKSPACES = [
  "Payments Production",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Mobile API",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const PROVIDERS = ["AWS", "Azure", "GCP", "Kubernetes"];
const RESOURCE_TYPES = [
  "Workspace Policy",
  "Workspace",
  "Cloud Account",
  "Role",
  "Secret",
  "Automation Template",
  "Compliance Assignment",
  "Provisioning Job",
];
const ACTIONS = [
  "Updated Workspace Policy",
  "Created Workspace",
  "Rotated Secret",
  "Assigned Role",
  "Executed Automation",
  "Archived Workspace",
  "Updated MFA Policy",
  "Assigned Framework",
  "Deleted Automation",
  "Escalated Privilege",
];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Activity {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  category: Category;
  workspace: string;
  targetResource: string;
  result: AuditResult;
  severity: Severity;
  ip: string;
  businessUnit: string;
  provider: string;
  sessionId: string;
  privileged: boolean;
  integrity: Integrity;
  durationMs: number;
  affectedResources: number;
  relatedActivities: number;
  riskScore: number;
  previousValue: string;
  newValue: string;
}

const SAMPLE_ACTIVITY: Activity[] = Array.from({ length: 18 }, (_, i) => {
  const id = `ADM-${(400000 + i * 137).toString()}`;
  const n = hashId(id);
  const action = pick(ACTIONS, n);
  const result = pick<AuditResult>(
    ["Success", "Success", "Success", "Success", "Failed", "Warning"],
    n,
  );
  const privileged = n % 3 === 0;
  return {
    id,
    timestamp: `2026-07-${(10 + (n % 18)).toString().padStart(2, "0")} ${(8 + (n % 10)).toString().padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")} UTC`,
    admin: pick(ADMINS, n),
    action,
    category: pick(CATEGORIES, n >> 1),
    workspace: pick(WORKSPACES, n >> 2),
    targetResource: pick(RESOURCE_TYPES, n >> 3),
    result,
    severity: privileged
      ? pick<Severity>(["Critical", "High", "High", "Medium"], n)
      : pick<Severity>(["Medium", "Low", "Low"], n),
    ip: `192.168.${20 + (n % 40)}.${1 + (n % 250)}`,
    businessUnit: pick(BUSINESS_UNITS, n),
    provider: pick(PROVIDERS, n >> 2),
    sessionId: `SES-${(90000 + (n % 9000)).toString()}`,
    privileged,
    integrity: pick<Integrity>(
      ["Verified", "Verified", "Verified", "Warning"],
      n,
    ),
    durationMs: 40 + (n % 4000),
    affectedResources: 1 + (n % 12),
    relatedActivities: n % 6,
    riskScore: (privileged ? 40 : 10) + (n % 45),
    previousValue: pick(
      ["Enabled", "v3", "Read-only", "eu-west-1", "Optional"],
      n,
    ),
    newValue: pick(["Disabled", "v4", "Admin", "us-east-1", "Enforced"], n),
  };
});

export function AdministrativeActivityView() {
  const [search, setSearch] = React.useState("");
  const [fAdmin, setFAdmin] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fCat, setFCat] = React.useState("");
  const [fResult, setFResult] = React.useState("");
  const [fSeverity, setFSeverity] = React.useState("");
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

  const records = SAMPLE_ACTIVITY;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.id.toLowerCase().includes(q) ||
        r.admin.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q)) &&
      (!fAdmin || r.admin === fAdmin) &&
      (!fWs || r.workspace === fWs) &&
      (!fCat || r.category === fCat) &&
      (!fResult || r.result === fResult) &&
      (!fSeverity || r.severity === fSeverity) &&
      (!fBu || r.businessUnit === fBu)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFAdmin("");
    setFWs("");
    setFCat("");
    setFResult("");
    setFSeverity("");
    setFBu("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const actions = records.length;
  const activeAdmins = new Set(records.map((r) => r.admin)).size;
  const configChanges = records.filter(
    (r) => r.category === "Configuration" || r.action.includes("Updated"),
  ).length;
  const permChanges = records.filter(
    (r) => r.action.includes("Role") || r.action.includes("Privilege"),
  ).length;
  const failed = records.filter((r) => r.result === "Failed").length;
  const privileged = records.filter((r) => r.privileged).length;
  const sessions = new Set(records.map((r) => r.sessionId)).size;
  const integrityOk = records.every((r) => r.integrity === "Verified");

  const toolbar: CommandItem[] = [
    {
      key: "search",
      label: "Advanced Search",
      icon: <SearchIcon size={15} />,
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
      key: "evidence",
      label: "Download Evidence",
      icon: <FileArchive size={15} />,
      disabled: true,
    },
    {
      key: "case",
      label: "Create Case",
      icon: <FilePlus2 size={15} />,
      disabled: true,
    },
    {
      key: "retention",
      label: "Retention Settings",
      icon: <History size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<Activity>[] = [
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
      key: "admin",
      header: "Administrator",
      sortValue: (r) => r.admin,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <UserCog size={13} color={r.privileged ? T.warning : T.textMuted} />
          {r.admin}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      sortValue: (r) => r.action,
      render: (r) => r.action,
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
      key: "result",
      header: "Result",
      sortValue: (r) => r.result,
      render: (r) => <ResultBadge result={r.result} />,
    },
    {
      key: "ip",
      header: "IP Address",
      sortValue: (r) => r.ip,
      render: (r) => (
        <span style={{ fontSize: 12, color: T.textMuted }}>{r.ip}</span>
      ),
    },
  ];

  return (
    <>
      <StatStripPlain
        items={[
          { label: "Administrative Actions", value: actions, tone: "ok" },
          { label: "Active Administrators", value: activeAdmins, tone: "ok" },
          { label: "Configuration Changes", value: configChanges, tone: "ok" },
          {
            label: "Permission Changes",
            value: permChanges,
            tone: permChanges > 0 ? "warn" : "ok",
          },
          {
            label: "Failed Operations",
            value: failed,
            tone: failed > 0 ? "warn" : "ok",
          },
          {
            label: "Privileged Actions",
            value: privileged,
            tone: privileged > 0 ? "warn" : "ok",
          },
          { label: "Administrative Sessions", value: sessions, tone: "ok" },
          {
            label: "Audit Integrity",
            value: integrityOk ? "Verified" : "Review",
            tone: integrityOk ? "ok" : "warn",
          },
        ]}
      />

      <DiscoveryListView
        title="Administrative activity"
        desc="Review and investigate all administrative actions performed across workspaces, cloud environments, governance, security and platform administration. Records are immutable and cryptographically verifiable."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search administrative activity — activity ID, administrator, workspace, action, policy, resource, session…"
        count={rows.length}
        pills={[
          {
            key: "administrator",
            label: "Administrator",
            value: fAdmin,
            onChange: setFAdmin,
            options: facet(records.map((r) => r.admin)),
          },
          {
            key: "workspace",
            label: "Workspace",
            value: fWs,
            onChange: setFWs,
            options: facet(records.map((r) => r.workspace)),
          },
          {
            key: "actionCategory",
            label: "Action Category",
            value: fCat,
            onChange: setFCat,
            options: facet(records.map((r) => r.category)),
          },
          {
            key: "result",
            label: "Result",
            value: fResult,
            onChange: setFResult,
            options: facet(records.map((r) => r.result)),
          },
          {
            key: "severity",
            label: "Severity",
            value: fSeverity,
            onChange: setFSeverity,
            options: facet(records.map((r) => r.severity)),
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
          { label: "All administrative activity", onApply: clearFilters },
        ]}
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
              { label: "Export Evidence", onClick: () => setSelId(r.id) },
              { label: "View Related Activity", onClick: () => setSelId(r.id) },
              { label: "Open Investigation", onClick: () => setSelId(r.id) },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<UserCog size={20} />}
            title="No administrative activity found."
            hint="Adjust filters to review administrative actions across the platform."
          />
        }
      />

      {sel && <ActivityDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function AdministrativeActivityPage() {
  return (
    <Page>
      <PageHeader
        title="Administrative Activity"
        subtitle="Review and investigate all administrative actions performed across workspaces, cloud environments, governance, security, and platform administration."
        actions={<ScopeBadge scope="Organization" />}
      />
      <AdministrativeActivityView />
    </Page>
  );
}

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "action",
    label: "Action Details",
    icon: <SlidersHorizontal size={13} />,
  },
  { id: "targets", label: "Target Resources", icon: <Boxes size={13} /> },
  {
    id: "session",
    label: "Session Information",
    icon: <MonitorSmartphone size={13} />,
  },
  { id: "related", label: "Related Activities", icon: <Link2 size={13} /> },
  { id: "history", label: "Change History", icon: <History size={13} /> },
  { id: "evidence", label: "Evidence", icon: <FileArchive size={13} /> },
  { id: "verify", label: "Audit Verification", icon: <BadgeCheck size={13} /> },
];

function ActivityDrawer({
  rec,
  onClose,
}: {
  rec: Activity;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.action}
      subtitle={`${rec.admin} · ${rec.category} · ${rec.workspace} · ${rec.result}`}
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
          <HeaderButton icon={<FolderSearch size={13} />}>
            Open Investigation
          </HeaderButton>
          <HeaderButton icon={<MonitorSmartphone size={13} />}>
            View Session
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "action" && <ActionTab rec={rec} />}
      {tab === "targets" && <TargetsTab rec={rec} />}
      {tab === "session" && <SessionTab rec={rec} />}
      {tab === "related" && <RelatedTab rec={rec} />}
      {tab === "history" && <ChangeHistoryTab rec={rec} />}
      {tab === "evidence" && <EvidenceTab id={rec.id} />}
      {tab === "verify" && <AuditVerificationTab integrity={rec.integrity} />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Activity }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <AuditSection title="General">
          <KVGrid
            items={[
              { k: "Activity ID", v: rec.id },
              { k: "Administrator", v: rec.admin, sample: true },
              { k: "Action", v: rec.action },
              { k: "Category", v: rec.category },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Business Unit", v: rec.businessUnit, sample: true },
              { k: "Timestamp", v: rec.timestamp, sample: true },
              { k: "Result", v: rec.result },
              { k: "Severity", v: rec.severity },
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
                k: "Execution Duration",
                v: `${rec.durationMs} ms`,
                sample: true,
              },
              {
                k: "Affected Resources",
                v: rec.affectedResources,
                sample: true,
              },
              {
                k: "Related Activities",
                v: rec.relatedActivities,
                sample: true,
              },
              {
                k: "Privilege Level",
                v: rec.privileged ? "Privileged" : "Standard",
                sample: true,
              },
              { k: "Risk Score", v: `${rec.riskScore}/100`, sample: true },
            ]}
          />
        </AuditSection>
      )}
    </>
  );
}

function ActionTab({ rec }: { rec: Activity }) {
  return (
    <AuditSection title="Action details" sample>
      <KVGrid
        items={[
          { k: "Action Type", v: rec.action.split(" ")[0], sample: true },
          { k: "Previous Value", v: rec.previousValue, sample: true },
          { k: "New Value", v: rec.newValue, sample: true },
          { k: "Reason", v: "Operational change request", sample: true },
          {
            k: "Approval Reference",
            v: `APR-${(4000 + (hashId(rec.id) % 9000)).toString()}`,
            sample: true,
          },
          { k: "Execution Source", v: "Admin Console", sample: true },
          { k: "Client Application", v: "CloudGuard Console", sample: true },
          {
            k: "Request ID",
            v: `REQ-${(hashId(rec.id) % 900000).toString()}`,
            sample: true,
          },
        ]}
      />
    </AuditSection>
  );
}

function TargetsTab({ rec }: { rec: Activity }) {
  const list = Array.from({ length: rec.affectedResources }, (_, i) => {
    const m = hashId(`${rec.id}-t-${i}`);
    return {
      id: `${rec.id}-t-${i}`,
      resource: pick(RESOURCE_TYPES, m),
      workspace: rec.workspace,
      provider: pick(PROVIDERS, m),
      status: pick(["Modified", "Modified", "Created"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "provider", header: "Provider", render: (r) => r.provider },
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
        Resources targeted by this action. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function SessionTab({ rec }: { rec: Activity }) {
  return (
    <AuditSection title="Session information" sample>
      <KVGrid
        items={[
          { k: "Session ID", v: rec.sessionId, sample: true },
          { k: "Authentication Method", v: "SSO + MFA", sample: true },
          { k: "Login Time", v: rec.timestamp, sample: true },
          { k: "Logout Time", v: "Active", sample: true },
          { k: "IP Address", v: rec.ip, sample: true },
          { k: "Device", v: "Managed Laptop", sample: true },
          { k: "Browser", v: "Edge 126", sample: true },
          { k: "Operating System", v: "Windows 11", sample: true },
          { k: "MFA Status", v: "Passed", sample: true },
          { k: "Location", v: "Frankfurt, DE", sample: true },
        ]}
      />
    </AuditSection>
  );
}

function RelatedTab({ rec }: { rec: Activity }) {
  const list = Array.from({ length: 2 + rec.relatedActivities }, (_, i) => {
    const m = hashId(`${rec.id}-r-${i}`);
    return {
      id: `${rec.id}-r-${i}`,
      activity: pick(
        [
          "Approval",
          "Policy Update",
          "Automation Execution",
          "Provisioning",
          "Configuration Change",
          "Permission Assignment",
        ],
        m,
      ),
      admin: pick(ADMINS, m),
      time: `2026-07-${(10 + (m % 18)).toString().padStart(2, "0")}`,
      result: pick<AuditResult>(["Success", "Success", "Warning"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "activity", header: "Related Activity", render: (r) => r.activity },
    { key: "admin", header: "Administrator", render: (r) => r.admin },
    { key: "time", header: "Time", render: (r) => r.time },
    {
      key: "result",
      header: "Result",
      render: (r) => <ResultBadge result={r.result} />,
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
        Linked administrative events (correlated). <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ChangeHistoryTab({ rec }: { rec: Activity }) {
  return (
    <AuditSection title="Change history — before / after" sample>
      <KVGrid
        items={[
          { k: "Previous State", v: rec.previousValue, sample: true },
          { k: "Modified State", v: rec.newValue, sample: true },
          { k: "Changed Fields", v: "1 field", sample: true },
          { k: "Version", v: `v${1 + (hashId(rec.id) % 8)}`, sample: true },
          {
            k: "Change Summary",
            v: `${rec.action} by ${rec.admin}`,
            sample: true,
          },
        ]}
      />
    </AuditSection>
  );
}

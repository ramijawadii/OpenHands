/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Operations → Workspace Audit → Configuration Changes */
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
  SlidersHorizontal,
  FileDiff,
  Boxes,
  Radar,
  History,
  BadgeCheck,
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
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import { ColumnChooser, StatStripPlain } from "#/components/admin/settings-kit";
import {
  ResultBadge,
  SeverityBadge,
  SEVERITY_ORDER,
  AuditSection,
  EvidenceTab,
  AuditVerificationTab,
  type AuditResult,
  type Severity,
  type Integrity,
} from "#/components/admin/pages/workspace-operations/administrative-activity";

/**
 * Configuration Changes — the authoritative configuration audit and change-history system for the
 * Workspace platform: an immutable, version-controlled record of every configuration modification with
 * complete before/after state, enabling precise comparison, rollback analysis, forensic investigation
 * and compliance. Unlike Administrative Activity (all admin actions), this focuses on what configuration
 * changed. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Operations/Workspace Audit/configuration_changes.md.
 *
 * Enterprise-Configuration-Audit UX pattern (Banner · KPI · Change History Table · Filters · Search ·
 * Detail Drawer with a configuration diff viewer). Read-only immutable records → sample.
 */

type Category =
  | "Workspace"
  | "Governance"
  | "Identity"
  | "Automation"
  | "Infrastructure"
  | "Security"
  | "Compliance"
  | "Integration"
  | "Notification";
type Operation =
  | "Create"
  | "Update"
  | "Delete"
  | "Import"
  | "Restore"
  | "Rollback"
  | "Assign"
  | "Remove";

const CATEGORIES: Category[] = [
  "Workspace",
  "Governance",
  "Identity",
  "Automation",
  "Infrastructure",
  "Security",
  "Compliance",
  "Integration",
  "Notification",
];
const OPERATIONS: Operation[] = [
  "Create",
  "Update",
  "Delete",
  "Import",
  "Restore",
  "Rollback",
  "Assign",
  "Remove",
];
const ADMINS = ["john.smith", "alice.jones", "m.rossi", "p.nair", "s.lopez"];
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
const CONFIGS = [
  "Workspace Policy",
  "RBAC Configuration",
  "Encryption Settings",
  "Network Policy",
  "Automation Template",
  "Compliance Assignment",
  "Cloud Connector",
  "Notification Routing",
  "Storage Configuration",
  "Firewall Rules",
];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Change {
  id: string;
  timestamp: string;
  configuration: string;
  category: Category;
  workspace: string;
  admin: string;
  operation: Operation;
  result: AuditResult;
  severity: Severity;
  businessUnit: string;
  provider: string;
  environment: string;
  integrity: Integrity;
  version: string;
  previousVersion: string;
  affectedResources: number;
  changedProperties: number;
  relatedChanges: number;
  riskScore: number;
  rollbackAvailable: boolean;
  drift: boolean;
  before: string;
  after: string;
}

const SAMPLE_CHANGES: Change[] = Array.from({ length: 18 }, (_, i) => {
  const id = `CFG-${(500000 + i * 137).toString()}`;
  const n = hashId(id);
  const operation = pick(OPERATIONS, n);
  const result = pick<AuditResult>(
    ["Success", "Success", "Success", "Success", "Failed", "Warning"],
    n,
  );
  const version = `v${2 + (n % 8)}`;
  return {
    id,
    timestamp: `2026-07-${(10 + (n % 18)).toString().padStart(2, "0")} ${(8 + (n % 10)).toString().padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")} UTC`,
    configuration: pick(CONFIGS, n),
    category: pick(CATEGORIES, n >> 1),
    workspace: pick(WORKSPACES, n >> 2),
    admin: pick(ADMINS, n),
    operation,
    result,
    severity: pick<Severity>(
      ["Critical", "High", "Medium", "Medium", "Low"],
      n,
    ),
    businessUnit: pick(BUSINESS_UNITS, n),
    provider: pick(PROVIDERS, n >> 2),
    environment: pick(["Production", "Pre-production", "Development"], n),
    integrity: pick<Integrity>(
      ["Verified", "Verified", "Verified", "Warning"],
      n,
    ),
    version,
    previousVersion: `v${1 + (n % 8)}`,
    affectedResources: 1 + (n % 14),
    changedProperties: 1 + (n % 8),
    relatedChanges: n % 6,
    riskScore: 10 + (n % 70),
    rollbackAvailable: n % 3 !== 0,
    drift: n % 5 === 0,
    before: pick(["Enabled", "eu-west-1", "TLS 1.2", "Optional", "35 days"], n),
    after: pick(["Disabled", "us-east-1", "TLS 1.3", "Enforced", "7 days"], n),
  };
});

export function ConfigurationChangesView() {
  const [search, setSearch] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fCat, setFCat] = React.useState("");
  const [fAdmin, setFAdmin] = React.useState("");
  const [fResult, setFResult] = React.useState("");
  const [fSeverity, setFSeverity] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const toggleCol = (k: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const records = SAMPLE_CHANGES;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.id.toLowerCase().includes(q) ||
        r.configuration.toLowerCase().includes(q) ||
        r.admin.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q)) &&
      (!fWs || r.workspace === fWs) &&
      (!fCat || r.category === fCat) &&
      (!fAdmin || r.admin === fAdmin) &&
      (!fResult || r.result === fResult) &&
      (!fSeverity || r.severity === fSeverity) &&
      (!fEnv || r.environment === fEnv)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFWs("");
    setFCat("");
    setFAdmin("");
    setFResult("");
    setFSeverity("");
    setFEnv("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const total = records.length;
  const today =
    records.filter((r) => r.timestamp.includes("2026-07-12")).length + 3;
  const critical = records.filter((r) => r.severity === "Critical").length;
  const pendingReviews = records.filter((r) => r.result === "Warning").length;
  const drift = records.filter((r) => r.drift).length;
  const rollbacks = records.filter((r) => r.operation === "Rollback").length;
  const verified = records.filter((r) => r.integrity === "Verified").length;
  const integrityOk = verified === total;

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

  const cols: Column<Change>[] = [
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
      key: "configuration",
      header: "Configuration",
      sortValue: (r) => r.configuration,
      render: (r) => (
        <span
          style={{
            color: T.textPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FileDiff size={13} color={T.textMuted} />
          {r.configuration}
          {r.drift && (
            <span
              style={{
                fontSize: 10,
                color: T.warning,
                border: `1px solid ${T.warning}55`,
                borderRadius: 99,
                padding: "1px 6px",
              }}
            >
              drift
            </span>
          )}
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
      key: "admin",
      header: "Administrator",
      sortValue: (r) => r.admin,
      render: (r) => r.admin,
    },
    {
      key: "operation",
      header: "Operation",
      sortValue: (r) => r.operation,
      render: (r) => r.operation,
    },
    {
      key: "result",
      header: "Result",
      sortValue: (r) => r.result,
      render: (r) => <ResultBadge result={r.result} />,
    },
    {
      key: "severity",
      header: "Severity",
      sortValue: (r) => SEVERITY_ORDER[r.severity],
      render: (r) => <SeverityBadge severity={r.severity} />,
    },
  ];

  return (
    <>
      <StatStripPlain
        items={[
          { label: "Configuration Changes", value: total, tone: "ok" },
          { label: "Today's Changes", value: today, tone: "ok" },
          {
            label: "Critical Changes",
            value: critical,
            tone: critical > 0 ? "warn" : "ok",
          },
          {
            label: "Pending Reviews",
            value: pendingReviews,
            tone: pendingReviews > 0 ? "warn" : "ok",
          },
          {
            label: "Configuration Drift",
            value: drift,
            tone: drift > 0 ? "warn" : "ok",
          },
          { label: "Rollback Events", value: rollbacks, tone: "ok" },
          { label: "Verified Changes", value: verified, tone: "ok" },
          {
            label: "Audit Integrity",
            value: integrityOk ? "Verified" : "Review",
            tone: integrityOk ? "ok" : "warn",
          },
        ]}
      />

      <DiscoveryListView
        title="Configuration changes"
        desc="Track, compare, investigate and audit every configuration change across workspaces, cloud infrastructure, governance, automation and platform services. Records are immutable and version-controlled."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search configuration changes — change ID, workspace, configuration, policy, resource, administrator, version…"
        count={rows.length}
        pills={[
          {
            key: "workspace",
            label: "Workspace",
            value: fWs,
            onChange: setFWs,
            options: facet(records.map((r) => r.workspace)),
          },
          {
            key: "configurationCategory",
            label: "Configuration Category",
            value: fCat,
            onChange: setFCat,
            options: facet(records.map((r) => r.category)),
          },
          {
            key: "administrator",
            label: "Administrator",
            value: fAdmin,
            onChange: setFAdmin,
            options: facet(records.map((r) => r.admin)),
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
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
        ]}
        presets={[
          { label: "All configuration changes", onApply: clearFilters },
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
              { label: "Compare Versions", onClick: () => setSelId(r.id) },
              { label: "Export Evidence", onClick: () => setSelId(r.id) },
              { label: "Rollback Analysis", onClick: () => setSelId(r.id) },
              { label: "Open Investigation", onClick: () => setSelId(r.id) },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<FileDiff size={20} />}
            title="No configuration changes found."
            hint="Adjust filters to review configuration modifications across the platform."
          />
        }
      />

      {sel && <ChangeDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function ConfigurationChangesPage() {
  return (
    <Page>
      <PageHeader
        title="Configuration Changes"
        subtitle="Track, compare, investigate, and audit every configuration change across workspaces, cloud infrastructure, governance, automation, and platform services."
        actions={<ScopeBadge scope="Organization" />}
      />
      <ConfigurationChangesView />
    </Page>
  );
}

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "details",
    label: "Change Details",
    icon: <SlidersHorizontal size={13} />,
  },
  { id: "diff", label: "Configuration Diff", icon: <FileDiff size={13} /> },
  { id: "resources", label: "Related Resources", icon: <Boxes size={13} /> },
  { id: "impact", label: "Change Impact", icon: <Radar size={13} /> },
  { id: "history", label: "Version History", icon: <History size={13} /> },
  { id: "evidence", label: "Evidence", icon: <FileArchive size={13} /> },
  { id: "verify", label: "Audit Verification", icon: <BadgeCheck size={13} /> },
];

function ChangeDrawer({ rec, onClose }: { rec: Change; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.operation} · ${rec.configuration}`}
      subtitle={`${rec.workspace} · ${rec.admin} · ${rec.version} · ${rec.result}`}
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
          <HeaderButton icon={<RotateCcw size={13} />}>
            Rollback Analysis
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "details" && <DetailsTab rec={rec} />}
      {tab === "diff" && <DiffTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "impact" && <ImpactTab rec={rec} />}
      {tab === "history" && <VersionHistoryTab rec={rec} />}
      {tab === "evidence" && (
        <EvidenceTab
          id={rec.id}
          items={[
            "Configuration Snapshot",
            "Before/After Diff",
            "API Request",
            "API Response",
            "Approval Record",
            "Correlation IDs",
            "Digital Signature",
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
function OverviewTab({ rec }: { rec: Change }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <AuditSection title="General">
          <KVGrid
            items={[
              { k: "Change ID", v: rec.id },
              { k: "Configuration", v: rec.configuration },
              { k: "Category", v: rec.category },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Administrator", v: rec.admin, sample: true },
              { k: "Operation", v: rec.operation },
              { k: "Timestamp", v: rec.timestamp, sample: true },
              { k: "Severity", v: rec.severity },
              { k: "Result", v: rec.result },
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
                k: "Affected Resources",
                v: rec.affectedResources,
                sample: true,
              },
              {
                k: "Changed Properties",
                v: rec.changedProperties,
                sample: true,
              },
              { k: "Related Changes", v: rec.relatedChanges, sample: true },
              { k: "Risk Score", v: `${rec.riskScore}/100`, sample: true },
              {
                k: "Rollback Availability",
                v: rec.rollbackAvailable ? "Available" : "Unavailable",
                sample: true,
              },
            ]}
          />
        </AuditSection>
      )}
    </>
  );
}

function DetailsTab({ rec }: { rec: Change }) {
  return (
    <AuditSection title="Change details" sample>
      <KVGrid
        items={[
          { k: "Configuration Name", v: rec.configuration },
          { k: "Operation", v: rec.operation },
          { k: "Previous Version", v: rec.previousVersion, sample: true },
          { k: "New Version", v: rec.version, sample: true },
          { k: "Reason", v: "Operational change request", sample: true },
          {
            k: "Approval Reference",
            v: `APR-${(4000 + (hashId(rec.id) % 9000)).toString()}`,
            sample: true,
          },
          { k: "Source", v: "Admin Console", sample: true },
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

function DiffTab({ rec }: { rec: Change }) {
  const [fmt, setFmt] = React.useState("JSON");
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
          label="Format"
          value={fmt}
          onChange={setFmt}
          options={["JSON", "YAML", "XML", "Table", "Text Diff"].map((f) => ({
            value: f,
            label: f,
          }))}
        />
        <SampleTag />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
          >{`{\n  "${rec.configuration.toLowerCase().replace(/ /g, "_")}": "${rec.before}"\n}`}</pre>
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
          >{`{\n  "${rec.configuration.toLowerCase().replace(/ /g, "_")}": "${rec.after}"\n}`}</pre>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <StatRow label="Changed Fields" value={rec.changedProperties} sample />
        <StatRow label="Added Fields" value={hashId(rec.id) % 3} sample />
        <StatRow label="Removed Fields" value={hashId(rec.id) % 2} sample />
      </div>
    </>
  );
}

function ResourcesTab({ rec }: { rec: Change }) {
  const list = Array.from({ length: rec.affectedResources }, (_, i) => {
    const m = hashId(`${rec.id}-r-${i}`);
    return {
      id: `${rec.id}-r-${i}`,
      resource: pick(
        [
          "Workspace",
          "Policy",
          "Cloud Account",
          "Cluster",
          "Secret",
          "Integration",
        ],
        m,
      ),
      workspace: rec.workspace,
      provider: pick(PROVIDERS, m),
      status: pick(["Affected", "Affected", "Pending"], m),
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
        Resources related to this configuration change. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function ImpactTab({ rec }: { rec: Change }) {
  return (
    <AuditSection title="Change impact" sample>
      <StatRow
        label="Affected Workspaces"
        value={1 + (hashId(rec.id) % 6)}
        sample
      />
      <StatRow
        label="Affected Resources"
        value={rec.affectedResources}
        sample
      />
      <StatRow label="Dependent Systems" value={hashId(rec.id) % 5} sample />
      <StatRow
        label="Policy Impact"
        value={rec.category === "Governance" ? "Direct" : "Indirect"}
        sample
      />
      <StatRow
        label="Compliance Impact"
        value={rec.severity === "Critical" ? "Framework at risk" : "None"}
        tone={rec.severity === "Critical" ? "warn" : "ok"}
        sample
      />
      <StatRow label="Operational Risk" value={rec.severity} sample />
      <StatRow
        label="Business Impact"
        value={rec.riskScore > 50 ? "Elevated" : "Low"}
        tone={rec.riskScore > 50 ? "warn" : "ok"}
        sample
      />
    </AuditSection>
  );
}

function VersionHistoryTab({ rec }: { rec: Change }) {
  const list = Array.from({ length: 1 + (hashId(rec.id) % 6) }, (_, i) => {
    const m = hashId(`${rec.id}-v-${i}`);
    return {
      id: `${rec.id}-v-${i}`,
      version: `v${8 - i}.${m % 9}`,
      created: `2026-0${1 + (m % 8)}-${(1 + (m % 27)).toString().padStart(2, "0")}`,
      admin: pick(ADMINS, m),
      summary: pick(
        [
          "Initial",
          "Policy tightened",
          "Region change",
          "Rollback",
          "Encryption upgrade",
        ],
        m,
      ),
      status: i === 0 ? "Current" : "Superseded",
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "version", header: "Version", render: (r) => r.version },
    { key: "created", header: "Created", render: (r) => r.created },
    { key: "admin", header: "Administrator", render: (r) => r.admin },
    { key: "summary", header: "Summary", render: (r) => r.summary },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{ color: r.status === "Current" ? T.success : T.textMuted }}
        >
          {r.status}
        </span>
      ),
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
        <HeaderButton icon={<GitCompare size={13} />}>Compare</HeaderButton>
        <HeaderButton icon={<Waypoints size={13} />}>
          Rollback Analysis
        </HeaderButton>
        <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

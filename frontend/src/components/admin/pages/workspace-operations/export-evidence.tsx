/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Operations → Workspace Audit → Export & Evidence */
import React from "react";
import {
  FilePlus2,
  FileArchive,
  Download,
  ShieldCheck,
  Share2,
  Trash2,
  RefreshCcw,
  LayoutGrid,
  Boxes,
  BadgeCheck,
  FolderSearch,
  Timer,
  History,
  Package,
  Lock,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Card,
  Tabs,
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
  RowMenu,
  ScopeBadge,
  PostureCard,
  PostureGrid,
  T,
  type Column,
  type CommandItem,
} from "#/components/admin/admin-kit";
import {
  AuditSection,
  IntegrityBadge,
  AuditVerificationTab,
  type Integrity,
} from "#/components/admin/pages/workspace-operations/administrative-activity";

/**
 * Export & Evidence — the enterprise-wide evidence management and audit export center for the Workspace
 * platform: securely collect, package, verify and export audit records, timelines, snapshots, policy
 * history, lifecycle records and investigation data into cryptographically-verifiable evidence packages
 * for regulatory audits, legal discovery, security investigations, incident response and reporting.
 * Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Operations/Workspace Audit/export_evidence.md.
 *
 * Enterprise-Evidence-Management UX pattern (Banner · KPI · Export Queue · Evidence Library · Filters ·
 * Search · Evidence Detail Drawer). Read-only immutable, signed packages → sample.
 */

type PackageType = "Workspace Audit" | "Compliance Assessment" | "Incident Investigation" | "Executive Report" | "Forensic Package" | "Lifecycle History" | "Full Workspace Evidence" | "Custom Package";
type ExportStatus = "Completed" | "Processing" | "Queued" | "Failed" | "Expired";
type Format = "PDF" | "CSV" | "JSON" | "ZIP Evidence Package" | "Encrypted ZIP" | "Signed Archive";

const PACKAGE_TYPES: PackageType[] = ["Workspace Audit", "Compliance Assessment", "Incident Investigation", "Executive Report", "Forensic Package", "Lifecycle History", "Full Workspace Evidence", "Custom Package"];
const STATUSES: ExportStatus[] = ["Completed", "Processing", "Queued", "Failed", "Expired"];
const FORMATS: Format[] = ["PDF", "CSV", "JSON", "ZIP Evidence Package", "Encrypted ZIP", "Signed Archive"];
const WORKSPACES = ["Payments Production", "Retail Web", "Data Lake", "Identity", "Analytics", "Organization"];
const BUSINESS_UNITS = ["Finance", "Engineering", "Operations", "Retail", "Corporate"];
const REQUESTERS = ["audit.admin", "comp.admin", "sec.admin", "legal.admin", "john.smith"];
const FRAMEWORKS = ["ISO 27001", "SOC 2", "NIST CSF", "PCI DSS", "HIPAA", "CIS Controls", "CSA CCM"];

const STATUS_TONE: Record<ExportStatus, string> = { Completed: T.success, Processing: T.accent, Queued: T.warning, Failed: T.danger, Expired: T.textMuted };

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface EvPackage {
  id: string;
  name: string;
  type: PackageType;
  requester: string;
  workspace: string;
  status: ExportStatus;
  created: string;
  expires: string;
  format: Format;
  businessUnit: string;
  framework: string;
  integrity: Integrity;
  sizeMb: number;
  downloadCount: number;
  encrypted: boolean;
  legalHold: boolean;
}

const SAMPLE_PACKAGES: EvPackage[] = Array.from({ length: 16 }, (_, i) => {
  const id = `EXP-${(800000 + i * 137).toString()}`;
  const n = hashId(id);
  const type = pick(PACKAGE_TYPES, n);
  const status = pick<ExportStatus>(["Completed", "Completed", "Completed", "Processing", "Queued", "Failed", "Expired"], n);
  return {
    id,
    name: `${type} — ${pick(WORKSPACES, n >> 1)}`,
    type,
    requester: pick(REQUESTERS, n),
    workspace: pick(WORKSPACES, n >> 1),
    status,
    created: `2026-07-${(10 + (n % 18)).toString().padStart(2, "0")}`,
    expires: `2026-${(9 + (n % 3)).toString().padStart(2, "0")}-${(1 + (n % 27)).toString().padStart(2, "0")}`,
    format: pick(FORMATS, n >> 2),
    businessUnit: pick(BUSINESS_UNITS, n),
    framework: pick(FRAMEWORKS, n >> 3),
    integrity: pick<Integrity>(["Verified", "Verified", "Verified", "Warning"], n),
    sizeMb: 1 + (n % 240),
    downloadCount: n % 12,
    encrypted: n % 2 === 0,
    legalHold: n % 5 === 0,
  };
});

function StatusBadge({ status }: { status: ExportStatus }) {
  const c = STATUS_TONE[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
      {status}
    </span>
  );
}

export function ExportEvidenceView() {
  const [search, setSearch] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fFramework, setFFramework] = React.useState("");
  const [fFormat, setFFormat] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_PACKAGES;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q) || r.workspace.toLowerCase().includes(q)) &&
      (!fType || r.type === fType) &&
      (!fWs || r.workspace === fWs) &&
      (!fStatus || r.status === fStatus) &&
      (!fFramework || r.framework === fFramework) &&
      (!fFormat || r.format === fFormat) &&
      (!fBu || r.businessUnit === fBu)
    );
  });
  const hasFilters = !!(search || fType || fWs || fStatus || fFramework || fFormat || fBu);
  const clearFilters = () => {
    setSearch("");
    setFType("");
    setFWs("");
    setFStatus("");
    setFFramework("");
    setFFormat("");
    setFBu("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [{ value: "", label: "All" }, ...Array.from(new Set(vals)).sort().map((v) => ({ value: v, label: v }))];

  const packages = records.length;
  const generated = records.filter((r) => r.status === "Completed").length;
  const scheduled = records.filter((r) => r.status === "Queued").length;
  const pending = records.filter((r) => r.status === "Processing" || r.status === "Queued").length;
  const failed = records.filter((r) => r.status === "Failed").length;
  const downloads = records.reduce((a, r) => a + r.downloadCount, 0);
  const verified = records.filter((r) => r.integrity === "Verified").length;
  const storageMb = records.reduce((a, r) => a + r.sizeMb, 0);

  const toolbar: CommandItem[] = [
    { key: "new", label: "New Export", icon: <FilePlus2 size={15} />, disabled: true },
    { key: "generate", label: "Generate Evidence", icon: <FileArchive size={15} />, disabled: true },
    { key: "download", label: "Download", icon: <Download size={15} />, disabled: true },
    { key: "verify", label: "Verify Integrity", icon: <ShieldCheck size={15} />, disabled: true },
    { key: "share", label: "Share Secure Link", icon: <Share2 size={15} />, disabled: true },
    { key: "delete", label: "Delete", icon: <Trash2 size={15} />, disabled: true },
    { key: "refresh", label: "Refresh", icon: <RefreshCcw size={15} />, onClick: () => setSelId(null) },
    { key: "templates", label: "Export Templates", icon: <Package size={15} />, disabled: true },
  ];

  const cols: Column<EvPackage>[] = [
    {
      key: "id",
      header: "Export ID",
      sortValue: (r) => r.id,
      render: (r) => (
        <span style={{ color: T.textPrimary, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Package size={13} color={T.textMuted} />
          {r.id}
          {r.legalHold && <span style={{ fontSize: 10, color: T.danger, border: `1px solid ${T.danger}55`, borderRadius: 99, padding: "1px 6px", display: "inline-flex", alignItems: "center", gap: 3 }}><Lock size={9} /> hold</span>}
        </span>
      ),
    },
    { key: "type", header: "Type", sortValue: (r) => r.type, render: (r) => r.type },
    { key: "requester", header: "Requester", sortValue: (r) => r.requester, render: (r) => r.requester },
    { key: "format", header: "Format", sortValue: (r) => r.format, render: (r) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        {r.encrypted && <Lock size={11} color={T.textMuted} />}
        {r.format}
      </span>
    ) },
    { key: "created", header: "Created", sortValue: (r) => r.created, render: (r) => r.created },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: "integrity", header: "Integrity", sortValue: (r) => r.integrity, render: (r) => <IntegrityBadge integrity={r.integrity} /> },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard title="Evidence Packages" value={packages} tone="ok" sub={<>Generated bundles <SampleTag /></>} />
        <PostureCard title="Exports Generated" value={generated} tone="ok" sub={<>Completed exports <SampleTag /></>} />
        <PostureCard title="Scheduled Exports" value={scheduled} tone="ok" sub={<>Queued/recurring <SampleTag /></>} />
        <PostureCard title="Pending Requests" value={pending} tone={pending > 0 ? "warn" : "ok"} sub={<>In progress <SampleTag /></>} />
        <PostureCard title="Failed Exports" value={failed} tone={failed > 0 ? "danger" : "ok"} sub={<>Require retry <SampleTag /></>} />
        <PostureCard title="Download Requests" value={downloads} tone="ok" sub={<>Total downloads <SampleTag /></>} />
        <PostureCard title="Integrity Verified" value={`${verified}/${packages}`} tone={verified === packages ? "ok" : "warn"} sub={<>Signed & verified <SampleTag /></>} />
        <PostureCard title="Storage Used" value={`${(storageMb / 1024).toFixed(1)} GB`} tone="ok" sub={<>Evidence repository <SampleTag /></>} />
      </PostureGrid>

      <Card
        title="Export & evidence"
        desc="Generate, manage, verify and export audit evidence packages for governance, compliance, security investigations, regulatory reporting and legal discovery. All packages are immutable, signed and integrity-verified."
      >
        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search exports and evidence — export ID, evidence package, workspace, investigation, audit report, framework, requester…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select label="Export Type" value={fType} onChange={setFType} options={facet(records.map((r) => r.type))} />
          <Select label="Workspace" value={fWs} onChange={setFWs} options={facet(records.map((r) => r.workspace))} />
          <Select label="Status" value={fStatus} onChange={setFStatus} options={facet(records.map((r) => r.status))} />
          <Select label="Compliance Framework" value={fFramework} onChange={setFFramework} options={facet(records.map((r) => r.framework))} />
          <Select label="Format" value={fFormat} onChange={setFFormat} options={facet(records.map((r) => r.format))} />
          <Select label="Business Unit" value={fBu} onChange={setFBu} options={facet(records.map((r) => r.businessUnit))} />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "created", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View", onClick: () => setSelId(r.id) },
                { label: "Download", onClick: () => {} },
                { label: "Verify", onClick: () => setSelId(r.id) },
                { label: "Share", onClick: () => {} },
                { label: "Delete", onClick: () => {}, danger: true },
              ]}
            />
          )}
          empty={
            <EmptyState
              icon={<Package size={20} />}
              title="No evidence packages available."
              hint="Generate an evidence package to collect audit records, timelines and snapshots into a signed, verifiable bundle."
              cta="Generate Evidence Package"
              onCta={() => setSelId(null)}
            />
          }
        />
      </Card>

      {sel && <PackageDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function ExportEvidencePage() {
  return (
    <Page>
      <PageHeader
        title="Export & Evidence"
        subtitle="Generate, manage, verify, and export audit evidence packages for governance, compliance, security investigations, regulatory reporting, and legal discovery."
        actions={<ScopeBadge scope="Organization" />}
      />
      <ExportEvidenceView />
    </Page>
  );
}

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "contents", label: "Package Contents", icon: <Boxes size={13} /> },
  { id: "integrity", label: "Integrity Verification", icon: <BadgeCheck size={13} /> },
  { id: "investigations", label: "Related Investigations", icon: <FolderSearch size={13} /> },
  { id: "downloads", label: "Download History", icon: <Download size={13} /> },
  { id: "retention", label: "Retention", icon: <Timer size={13} /> },
  { id: "activity", label: "Activity", icon: <History size={13} /> },
  { id: "verify", label: "Audit Verification", icon: <ShieldCheck size={13} /> },
];

function PackageDrawer({ rec, onClose }: { rec: EvPackage; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.name}
      subtitle={`${rec.type} · ${rec.format} · ${rec.status} · ${rec.sizeMb} MB`}
      width={840}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
          <HeaderButton icon={<ShieldCheck size={13} />}>Verify</HeaderButton>
          <HeaderButton icon={<Share2 size={13} />}>Share</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>Download</HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "contents" && <ContentsTab />}
      {tab === "integrity" && <IntegrityTab rec={rec} />}
      {tab === "investigations" && <InvestigationsTab rec={rec} />}
      {tab === "downloads" && <DownloadsTab rec={rec} />}
      {tab === "retention" && <RetentionTab rec={rec} />}
      {tab === "activity" && <ActivityTab rec={rec} />}
      {tab === "verify" && <AuditVerificationTab integrity={rec.integrity} />}
    </SideRailDrawer>
  );
}

function OverviewTab({ rec }: { rec: EvPackage }) {
  return (
    <AuditSection title="Overview">
      <KVGrid
        items={[
          { k: "Package ID", v: rec.id },
          { k: "Package Name", v: rec.name },
          { k: "Requester", v: rec.requester, sample: true },
          { k: "Workspace", v: rec.workspace, sample: true },
          { k: "Export Type", v: rec.type },
          { k: "Format", v: rec.format },
          { k: "Created", v: rec.created, sample: true },
          { k: "Status", v: rec.status },
          { k: "Expiration", v: rec.expires, sample: true },
        ]}
      />
    </AuditSection>
  );
}

function ContentsTab() {
  const contents = ["Audit Logs", "Timelines", "Configuration", "Policies", "Lifecycle Events", "Approvals", "Compliance Reports", "Security Events", "Attachments", "Manifest"];
  return (
    <AuditSection title="Package contents" sample>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 8 }}>Every artifact is hash-listed in the evidence manifest and covered by the package signature.</div>
      {contents.map((c) => (
        <StatRow key={c} label={c} value="Included" tone="ok" sample />
      ))}
    </AuditSection>
  );
}

function IntegrityTab({ rec }: { rec: EvPackage }) {
  return (
    <AuditSection title="Integrity verification" sample>
      <StatRow label="Package Signature" value="Ed25519 · valid" tone="ok" sample />
      <StatRow label="Hash Verification" value="SHA-256 manifest match" tone="ok" sample />
      <StatRow label="Evidence Chain" value="Complete chain of custody" tone="ok" sample />
      <StatRow label="Timestamp Validation" value="RFC 3161 TSA verified" tone="ok" sample />
      <StatRow label="Manifest Validation" value="All artifacts accounted" tone="ok" sample />
      <StatRow label="Tamper Detection" value={rec.integrity === "Verified" ? "No tampering detected" : "Anomaly flagged"} tone={rec.integrity === "Verified" ? "ok" : "warn"} sample />
      <StatRow label="Verification Status" value={<IntegrityBadge integrity={rec.integrity} />} sample />
    </AuditSection>
  );
}

function InvestigationsTab({ rec }: { rec: EvPackage }) {
  const list = Array.from({ length: 2 + (hashId(rec.id) % 3) }, (_, i) => {
    const m = hashId(`${rec.id}-inv-${i}`);
    return { id: `${rec.id}-inv-${i}`, investigation: pick(["Incident", "Audit", "Compliance Review", "Forensic Investigation", "Risk Assessment"], m), ref: `CASE-${(1000 + (m % 9000)).toString()}`, status: pick(["Open", "Closed", "In Review"], m) };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "investigation", header: "Investigation", render: (r) => r.investigation },
    { key: "ref", header: "Reference", render: (r) => r.ref },
    { key: "status", header: "Status", render: (r) => r.status },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Investigations linked to this evidence package. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function DownloadsTab({ rec }: { rec: EvPackage }) {
  const list = Array.from({ length: rec.downloadCount }, (_, i) => {
    const m = hashId(`${rec.id}-d-${i}`);
    return { id: `${rec.id}-d-${i}`, downloadedBy: pick(REQUESTERS, m), timestamp: `2026-07-${(12 + (m % 10)).toString().padStart(2, "0")} ${(9 + (m % 8)).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`, ip: `10.0.${m % 250}.${(m >> 3) % 250}`, method: pick(["Secure Link", "Console", "API"], m), verification: "Verified" };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "downloadedBy", header: "Downloaded By", render: (r) => r.downloadedBy },
    { key: "timestamp", header: "Timestamp", render: (r) => r.timestamp },
    { key: "ip", header: "IP Address", render: (r) => <span style={{ fontSize: 12, color: T.textMuted }}>{r.ip}</span> },
    { key: "method", header: "Method", render: (r) => r.method },
    { key: "verification", header: "Verification", render: (r) => <span style={{ color: T.success }}>{r.verification}</span> },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Complete download / chain-of-custody log. <SampleTag />
      </div>
      {list.length ? <DirectoryTable columns={cols} rows={list} /> : <EmptyState icon={<Download size={18} />} title="No downloads yet" hint="This package has not been downloaded." />}
    </>
  );
}

function RetentionTab({ rec }: { rec: EvPackage }) {
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <HeaderButton icon={<Timer size={13} />}>Extend</HeaderButton>
        <HeaderButton icon={<FileArchive size={13} />}>Archive</HeaderButton>
        <HeaderButton icon={<Lock size={13} />}>Apply Legal Hold</HeaderButton>
        <SampleTag />
      </div>
      <AuditSection title="Retention" sample>
        <StatRow label="Retention Policy" value="7 years (regulatory)" sample />
        <StatRow label="Expiration" value={rec.expires} sample />
        <StatRow label="Archive Location" value="Immutable object store (WORM)" sample />
        <StatRow label="Legal Hold" value={rec.legalHold ? "Active" : "None"} tone={rec.legalHold ? "warn" : undefined} sample />
        <StatRow label="Deletion Schedule" value={rec.legalHold ? "Suspended (hold)" : rec.expires} sample />
      </AuditSection>
    </>
  );
}

function ActivityTab({ rec }: { rec: EvPackage }) {
  const events = ["Export Requested", "Evidence Generated", "Verification Completed", "Downloaded", "Shared", "Archived"];
  return (
    <AuditSection title="Activity" sample>
      {events.map((e, i) => (
        <div key={e} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, marginTop: 5, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>{pick(REQUESTERS, hashId(rec.id) + i)} · {pick(["5 min", "2 h", "yesterday", "3 days"], i)} ago</div>
          </div>
        </div>
      ))}
    </AuditSection>
  );
}

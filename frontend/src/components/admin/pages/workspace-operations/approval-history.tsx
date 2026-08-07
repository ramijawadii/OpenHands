/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Operations → Workspace Audit → Approval History */
import React from "react";
import {
  Search as SearchIcon,
  Download,
  FileText,
  FolderSearch,
  RefreshCcw,
  ShieldCheck,
  FileArchive,
  LayoutGrid,
  GitPullRequestArrow,
  Gavel,
  Boxes,
  ListChecks,
  History,
  BadgeCheck,
  Stamp,
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
  EvidenceTab,
  AuditVerificationTab,
  type Integrity,
} from "#/components/admin/pages/workspace-operations/administrative-activity";

/**
 * Approval History — the authoritative approval audit repository for the Workspace platform: an
 * immutable history of every approval decision (lifecycle, provisioning, automation, governance,
 * identity, access, compliance, resource requests, policy exceptions, admin actions) with complete
 * workflow context. Unlike Approval Alerts (attention-needed), this records finalized history.
 * Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Operations/Workspace Audit/approval_history.md.
 *
 * Enterprise-Approval-Audit UX pattern (Banner · KPI · History Table · Filters · Search · Detail Drawer
 * with staged approval workflow). Read-only immutable records → sample.
 */

type Decision = "Approved" | "Rejected" | "Cancelled" | "Expired" | "Delegated" | "Escalated" | "Withdrawn";
type RequestType = "Workspace Creation" | "Secrets Access" | "Policy Exception" | "Emergency Access" | "Provisioning" | "Automation" | "Resource Request" | "Identity Federation";

const DECISIONS: Decision[] = ["Approved", "Rejected", "Cancelled", "Expired", "Delegated", "Escalated", "Withdrawn"];
const REQUEST_TYPES: RequestType[] = ["Workspace Creation", "Secrets Access", "Policy Exception", "Emergency Access", "Provisioning", "Automation", "Resource Request", "Identity Federation"];
const REQUESTERS = ["alice.jones", "d.chen", "m.rossi", "p.nair", "s.lopez"];
const APPROVERS = ["john.smith", "gov.admin", "sec.admin", "comp.admin", "exec.owner"];
const WORKSPACES = ["Payments Production", "Retail Web", "Data Lake", "Identity", "Analytics", "Shared Services"];
const BUSINESS_UNITS = ["Finance", "Engineering", "Operations", "Retail", "Corporate"];

const DECISION_TONE: Record<Decision, string> = {
  Approved: T.success,
  Rejected: T.danger,
  Cancelled: T.textMuted,
  Expired: T.textMuted,
  Delegated: T.accent,
  Escalated: T.warning,
  Withdrawn: T.textMuted,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface Approval {
  id: string;
  requestType: RequestType;
  requester: string;
  approver: string;
  workspace: string;
  decision: Decision;
  decisionTime: string;
  durationMin: number;
  businessUnit: string;
  environment: string;
  integrity: Integrity;
  stages: number;
  escalations: number;
  delegations: number;
  riskScore: number;
  slaMet: boolean;
}

const SAMPLE_APPROVALS: Approval[] = Array.from({ length: 18 }, (_, i) => {
  const id = `APR-${(4000 + i * 41).toString().padStart(6, "0")}`;
  const n = hashId(id);
  const decision = pick<Decision>(["Approved", "Approved", "Approved", "Rejected", "Expired", "Delegated", "Escalated"], n);
  return {
    id,
    requestType: pick(REQUEST_TYPES, n >> 1),
    requester: pick(REQUESTERS, n),
    approver: pick(APPROVERS, n >> 2),
    workspace: pick(WORKSPACES, n >> 3),
    decision,
    decisionTime: `2026-07-${(10 + (n % 18)).toString().padStart(2, "0")} ${(8 + (n % 10)).toString().padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")} UTC`,
    durationMin: 5 + (n % 240),
    businessUnit: pick(BUSINESS_UNITS, n),
    environment: pick(["Production", "Pre-production", "Development"], n),
    integrity: pick<Integrity>(["Verified", "Verified", "Verified", "Warning"], n),
    stages: 2 + (n % 4),
    escalations: n % 3,
    delegations: n % 2,
    riskScore: 10 + (n % 70),
    slaMet: n % 4 !== 0,
  };
});

function DecisionBadge({ decision }: { decision: Decision }) {
  const c = DECISION_TONE[decision];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: c }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
      {decision}
    </span>
  );
}

export function ApprovalHistoryView() {
  const [search, setSearch] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fType, setFType] = React.useState("");
  const [fDecision, setFDecision] = React.useState("");
  const [fApprover, setFApprover] = React.useState("");
  const [fBu, setFBu] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);

  const records = SAMPLE_APPROVALS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.id.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q) || r.approver.toLowerCase().includes(q) || r.workspace.toLowerCase().includes(q)) &&
      (!fWs || r.workspace === fWs) &&
      (!fType || r.requestType === fType) &&
      (!fDecision || r.decision === fDecision) &&
      (!fApprover || r.approver === fApprover) &&
      (!fBu || r.businessUnit === fBu)
    );
  });
  const hasFilters = !!(search || fWs || fType || fDecision || fApprover || fBu);
  const clearFilters = () => {
    setSearch("");
    setFWs("");
    setFType("");
    setFDecision("");
    setFApprover("");
    setFBu("");
  };
  const sel = records.find((r) => r.id === selId) ?? null;
  const facet = (vals: string[]) => [{ value: "", label: "All" }, ...Array.from(new Set(vals)).sort().map((v) => ({ value: v, label: v }))];

  const total = records.length;
  const approved = records.filter((r) => r.decision === "Approved").length;
  const rejected = records.filter((r) => r.decision === "Rejected").length;
  const expired = records.filter((r) => r.decision === "Expired").length;
  const escalated = records.filter((r) => r.decision === "Escalated" || r.escalations > 0).length;
  const delegated = records.filter((r) => r.decision === "Delegated" || r.delegations > 0).length;
  const avgTime = Math.round(records.reduce((a, r) => a + r.durationMin, 0) / records.length);
  const sla = Math.round((records.filter((r) => r.slaMet).length / records.length) * 100);

  const toolbar: CommandItem[] = [
    { key: "search", label: "Advanced Search", icon: <SearchIcon size={15} />, disabled: true },
    { key: "export", label: "Export", icon: <Download size={15} />, disabled: true },
    { key: "report", label: "Generate Report", icon: <FileText size={15} />, disabled: true },
    { key: "investigate", label: "Open Investigation", icon: <FolderSearch size={15} />, disabled: true },
    { key: "refresh", label: "Refresh", icon: <RefreshCcw size={15} />, onClick: () => setSelId(null) },
    { key: "evidence", label: "Download Evidence", icon: <FileArchive size={15} />, disabled: true },
    { key: "verify", label: "Verify Integrity", icon: <ShieldCheck size={15} />, disabled: true },
  ];

  const cols: Column<Approval>[] = [
    {
      key: "id",
      header: "Approval ID",
      sortValue: (r) => r.id,
      render: (r) => (
        <span style={{ color: T.textPrimary, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Stamp size={13} color={T.textMuted} />
          {r.id}
        </span>
      ),
    },
    { key: "requestType", header: "Request Type", sortValue: (r) => r.requestType, render: (r) => r.requestType },
    { key: "requester", header: "Requester", sortValue: (r) => r.requester, render: (r) => r.requester },
    { key: "approver", header: "Approver", sortValue: (r) => r.approver, render: (r) => r.approver },
    { key: "workspace", header: "Workspace", sortValue: (r) => r.workspace, render: (r) => r.workspace },
    { key: "decision", header: "Decision", sortValue: (r) => r.decision, render: (r) => <DecisionBadge decision={r.decision} /> },
    { key: "durationMin", header: "Duration", sortValue: (r) => r.durationMin, render: (r) => `${r.durationMin} min` },
  ];

  return (
    <>
      <PostureGrid>
        <PostureCard title="Approval Requests" value={total} tone="ok" sub={<>Recorded this period <SampleTag /></>} />
        <PostureCard title="Approved" value={approved} tone="ok" sub={<>Granted requests <SampleTag /></>} />
        <PostureCard title="Rejected" value={rejected} tone={rejected > 0 ? "warn" : "ok"} sub={<>Denied requests <SampleTag /></>} />
        <PostureCard title="Expired" value={expired} tone="ok" sub={<>No action taken <SampleTag /></>} />
        <PostureCard title="Escalated" value={escalated} tone={escalated > 0 ? "warn" : "ok"} sub={<>Required escalation <SampleTag /></>} />
        <PostureCard title="Delegated" value={delegated} tone="ok" sub={<>Delegated decisions <SampleTag /></>} />
        <PostureCard title="Avg Approval Time" value={`${avgTime}m`} tone={avgTime <= 60 ? "ok" : "warn"} sub={<>Submit to decision <SampleTag /></>} />
        <PostureCard title="SLA Compliance" value={`${sla}%`} tone={sla >= 90 ? "ok" : "warn"} sub={<>Within SLA <SampleTag /></>} />
      </PostureGrid>

      <Card
        title="Approval history"
        desc="Review the complete audit history of approval workflows across workspaces, governance, automation, identity, provisioning and compliance. Records are immutable and cryptographically verifiable."
      >
        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search approval history — approval ID, requester, approver, workspace, policy, resource, provisioning/automation job…"
          count={rows.length}
          total={records.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select label="Workspace" value={fWs} onChange={setFWs} options={facet(records.map((r) => r.workspace))} />
          <Select label="Approval Type" value={fType} onChange={setFType} options={facet(records.map((r) => r.requestType))} />
          <Select label="Approval Status" value={fDecision} onChange={setFDecision} options={facet(records.map((r) => r.decision))} />
          <Select label="Approver" value={fApprover} onChange={setFApprover} options={facet(records.map((r) => r.approver))} />
          <Select label="Business Unit" value={fBu} onChange={setFBu} options={facet(records.map((r) => r.businessUnit))} />
        </FilterBar>

        <DirectoryTable
          columns={cols}
          rows={rows}
          pageSize={12}
          initialSort={{ key: "id", dir: "desc" }}
          onRowClick={(r) => setSelId(r.id)}
          rowActions={(r) => (
            <RowMenu
              items={[
                { label: "View Details", onClick: () => setSelId(r.id) },
                { label: "Export Evidence", onClick: () => setSelId(r.id) },
                { label: "View Workflow", onClick: () => setSelId(r.id) },
                { label: "Open Investigation", onClick: () => setSelId(r.id) },
              ]}
            />
          )}
          empty={<EmptyState icon={<Stamp size={20} />} title="No approval history found." hint="Adjust filters to review approval workflows across the platform." />}
        />
      </Card>

      {sel && <ApprovalDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function ApprovalHistoryPage() {
  return (
    <Page>
      <PageHeader
        title="Approval History"
        subtitle="Review the complete audit history of approval workflows across workspaces, governance, automation, identity, provisioning, and compliance."
        actions={<ScopeBadge scope="Organization" />}
      />
      <ApprovalHistoryView />
    </Page>
  );
}

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "workflow", label: "Approval Workflow", icon: <GitPullRequestArrow size={13} /> },
  { id: "decision", label: "Decision Details", icon: <Gavel size={13} /> },
  { id: "resources", label: "Related Resources", icon: <Boxes size={13} /> },
  { id: "policy", label: "Policy Evaluation", icon: <ListChecks size={13} /> },
  { id: "timeline", label: "Timeline", icon: <History size={13} /> },
  { id: "evidence", label: "Evidence", icon: <FileArchive size={13} /> },
  { id: "verify", label: "Audit Verification", icon: <BadgeCheck size={13} /> },
];

function ApprovalDrawer({ rec, onClose }: { rec: Approval; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.id} · ${rec.requestType}`}
      subtitle={`${rec.requester} → ${rec.approver} · ${rec.workspace} · ${rec.decision}`}
      width={860}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
          <HeaderButton icon={<GitPullRequestArrow size={13} />}>View Workflow</HeaderButton>
          <HeaderButton icon={<FolderSearch size={13} />}>Open Investigation</HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>Export</HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "workflow" && <WorkflowTab rec={rec} />}
      {tab === "decision" && <DecisionTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "policy" && <PolicyTab rec={rec} />}
      {tab === "timeline" && <TimelineTab rec={rec} />}
      {tab === "evidence" && <EvidenceTab id={rec.id} items={["Approval Record", "Approval Comments", "Workflow History", "Policy Evaluation", "Notification Records", "API Request", "API Response", "Digital Signature"]} />}
      {tab === "verify" && <AuditVerificationTab integrity={rec.integrity} />}
    </SideRailDrawer>
  );
}

const OVERVIEW_SUBS = [
  { id: "general", label: "General" },
  { id: "statistics", label: "Statistics" },
];
function OverviewTab({ rec }: { rec: Approval }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <AuditSection title="General">
          <KVGrid
            items={[
              { k: "Approval ID", v: rec.id },
              { k: "Request Type", v: rec.requestType },
              { k: "Requester", v: rec.requester, sample: true },
              { k: "Approver", v: rec.approver, sample: true },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Approval Policy", v: "Two-Level Approval", sample: true },
              { k: "Status", v: rec.decision },
              { k: "Decision", v: rec.decision },
              { k: "Decision Time", v: rec.decisionTime, sample: true },
            ]}
          />
        </AuditSection>
      )}
      {sub === "statistics" && (
        <AuditSection title="Statistics" sample>
          <KVGrid
            cols={3}
            items={[
              { k: "Approval Duration", v: `${rec.durationMin} min`, sample: true },
              { k: "Workflow Stages", v: rec.stages, sample: true },
              { k: "Escalations", v: rec.escalations, sample: true },
              { k: "Delegations", v: rec.delegations, sample: true },
              { k: "Risk Score", v: `${rec.riskScore}/100`, sample: true },
              { k: "Business Impact", v: rec.riskScore > 50 ? "Elevated" : "Low", sample: true },
            ]}
          />
        </AuditSection>
      )}
    </>
  );
}

function WorkflowTab({ rec }: { rec: Approval }) {
  const stages = ["Request Submitted", "Manager Review", "Security Review", "Compliance Review", "Executive Approval", "Completed"];
  const completed = rec.decision === "Approved" ? stages.length : rec.decision === "Rejected" ? 2 : rec.stages;
  return (
    <AuditSection title="Approval workflow" sample>
      {stages.map((s, i) => {
        const done = i < completed;
        const rejected = rec.decision === "Rejected" && i === 2;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: rejected ? T.danger : done ? T.success : T.border, color: "#fff", fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {rejected ? "✕" : done ? "✓" : i + 1}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: T.textPrimary }}>{s}</div>
              <div style={{ fontSize: 11.5, color: T.textMuted }}>{rejected ? `${pick(APPROVERS, hashId(rec.id))} · rejected` : done ? `${pick(APPROVERS, hashId(rec.id) + i)} · approved` : "Pending"}</div>
            </div>
          </div>
        );
      })}
    </AuditSection>
  );
}

function DecisionTab({ rec }: { rec: Approval }) {
  return (
    <AuditSection title="Decision details" sample>
      <KVGrid
        items={[
          { k: "Decision", v: rec.decision },
          { k: "Decision Reason", v: rec.decision === "Rejected" ? "Insufficient justification" : "Meets policy requirements", sample: true },
          { k: "Approver Comments", v: rec.decision === "Approved" ? "Approved per baseline" : "See workflow", sample: true },
          { k: "Approval Method", v: "Console", sample: true },
          { k: "Approval Source", v: "Approval Queue", sample: true },
          { k: "Approval Policy", v: "Two-Level Approval", sample: true },
          { k: "Approval SLA", v: rec.slaMet ? "Met" : "Breached", sample: true },
          { k: "Approval Timestamp", v: rec.decisionTime, sample: true },
        ]}
      />
    </AuditSection>
  );
}

function ResourcesTab({ rec }: { rec: Approval }) {
  const list = Array.from({ length: 3 + (hashId(rec.id) % 4) }, (_, i) => {
    const m = hashId(`${rec.id}-r-${i}`);
    return { id: `${rec.id}-r-${i}`, resource: pick(["Workspace", "Provisioning Job", "Policy", "Cloud Account", "Role", "Compliance Control"], m), workspace: pick(WORKSPACES, m), status: pick(["Granted", "Granted", "Pending"], m) };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "resource", header: "Resource", render: (r) => r.resource },
    { key: "workspace", header: "Workspace", render: (r) => r.workspace },
    { key: "status", header: "Status", render: (r) => r.status },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Resources related to this approval. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function PolicyTab({ rec }: { rec: Approval }) {
  const policies = ["Approval Policy", "Governance Policy", "Compliance Policy", "Security Policy", "Delegation Rule", "Escalation Rule"];
  const list = policies.map((p) => {
    const m = hashId(rec.id + p);
    return { id: p, policy: p, status: pick(["Satisfied", "Satisfied", "Exception Applied", "Policy Override"], m) };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "policy", header: "Policy", render: (r) => r.policy },
    { key: "status", header: "Status", render: (r) => <span style={{ color: r.status === "Satisfied" ? T.success : T.warning }}>{r.status}</span> },
  ];
  return (
    <>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Policy evaluation for this approval. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function TimelineTab({ rec }: { rec: Approval }) {
  const events = ["Request Created", "Approval Assigned", "Reminder Sent", "Delegated", "Escalated", "Approved", "Completed"];
  return (
    <AuditSection title="Approval timeline" sample>
      {events.map((e, i) => (
        <div key={e} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, marginTop: 5, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, color: T.textPrimary }}>{e}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>{pick([...REQUESTERS, ...APPROVERS], hashId(rec.id) + i)} · {pick(["5 min", "20 min", "1 h", "2 h"], i)} into workflow</div>
          </div>
        </div>
      ))}
    </AuditSection>
  );
}

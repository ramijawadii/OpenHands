/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Operations → Workspace Audit → Lifecycle Events */
import React from "react";
import {
  Search as SearchIcon,
  Download,
  FileText,
  FolderSearch,
  RefreshCcw,
  ShieldCheck,
  Play,
  FileArchive,
  LayoutGrid,
  SlidersHorizontal,
  History,
  Boxes,
  Network,
  ListChecks,
  BadgeCheck,
  Repeat,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
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
  type Severity,
  type Integrity,
} from "#/components/admin/pages/workspace-operations/administrative-activity";

/**
 * Lifecycle Events — the authoritative lifecycle audit log for Workspace Management: an immutable
 * timeline of every state transition (request → provisioning → activation → maintenance → suspension →
 * archive → restoration → decommission), capturing each automated/manual transition with actor,
 * trigger, approvals, dependencies and system changes. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Operations/Workspace Audit/lifecycle_events.md.
 *
 * Enterprise-Audit UX pattern (Banner · KPI · Event Table · Filters · Search · Event Detail Drawer).
 * Read-only immutable records → sample.
 */

type Phase =
  | "Request"
  | "Provisioning"
  | "Activation"
  | "Operational"
  | "Maintenance"
  | "Suspension"
  | "Archive"
  | "Restoration"
  | "Decommission";
type TransitionType =
  | "Manual"
  | "Automated"
  | "Scheduled"
  | "Approval Driven"
  | "Policy Driven"
  | "Recovery"
  | "Rollback";

const PHASES: Phase[] = [
  "Request",
  "Provisioning",
  "Activation",
  "Operational",
  "Maintenance",
  "Suspension",
  "Archive",
  "Restoration",
  "Decommission",
];
const TRANSITION_TYPES: TransitionType[] = [
  "Manual",
  "Automated",
  "Scheduled",
  "Approval Driven",
  "Policy Driven",
  "Recovery",
  "Rollback",
];
const WORKSPACES = [
  "Payments Production",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
  "Mobile API",
];
const TEMPLATES = [
  "Regulated Production",
  "Standard",
  "Sandbox",
  "Data Platform",
];
const BUSINESS_UNITS = [
  "Finance",
  "Engineering",
  "Operations",
  "Retail",
  "Corporate",
];
const PROVIDERS = ["AWS", "Azure", "GCP", "Kubernetes"];
const ACTORS = [
  "Automation Engine",
  "Provisioning Engine",
  "john.smith",
  "gov.admin",
  "Scheduler",
];
const EVENTS_BY_PHASE: Record<Phase, string[]> = {
  Request: [
    "Workspace Requested",
    "Request Updated",
    "Request Approved",
    "Request Cancelled",
  ],
  Provisioning: [
    "Provisioning Started",
    "Provisioning Completed",
    "Provisioning Failed",
    "Provisioning Retried",
  ],
  Activation: [
    "Validation Completed",
    "Workspace Activated",
    "Activation Failed",
  ],
  Operational: [
    "Workspace Updated",
    "Workspace Expanded",
    "Configuration Applied",
    "Ownership Changed",
  ],
  Maintenance: [
    "Maintenance Started",
    "Maintenance Completed",
    "Maintenance Extended",
  ],
  Suspension: [
    "Workspace Suspended",
    "Suspension Removed",
    "Emergency Suspension",
  ],
  Archive: ["Archive Started", "Archive Completed", "Archive Failed"],
  Restoration: ["Restore Started", "Restore Completed", "Restore Failed"],
  Decommission: [
    "Decommission Requested",
    "Cleanup Completed",
    "Workspace Deleted",
  ],
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface LEvent {
  id: string;
  timestamp: string;
  workspace: string;
  phase: Phase;
  event: string;
  actor: string;
  result: AuditResult;
  durationMin: number;
  correlationId: string;
  template: string;
  businessUnit: string;
  environment: string;
  provider: string;
  severity: Severity;
  integrity: Integrity;
  transitionType: TransitionType;
  previousState: string;
  currentState: string;
  dependentResources: number;
  relatedEvents: number;
  riskScore: number;
}

const SAMPLE_EVENTS: LEvent[] = Array.from({ length: 18 }, (_, i) => {
  const id = `LCE-${(700000 + i * 137).toString()}`;
  const n = hashId(id);
  const phase = pick(PHASES, n);
  const event = pick(EVENTS_BY_PHASE[phase], n >> 1);
  const failed = event.includes("Failed");
  return {
    id,
    timestamp: `2026-07-${(10 + (n % 18)).toString().padStart(2, "0")} ${(8 + (n % 10)).toString().padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")} UTC`,
    workspace: pick(WORKSPACES, n >> 2),
    phase,
    event,
    actor: pick(ACTORS, n),
    result: failed
      ? "Failed"
      : pick<AuditResult>(["Success", "Success", "Success", "Warning"], n),
    durationMin: 1 + (n % 40),
    correlationId: `COR-${(30000 + (n % 9000)).toString()}`,
    template: pick(TEMPLATES, n),
    businessUnit: pick(BUSINESS_UNITS, n),
    environment: pick(["Production", "Pre-production", "Development"], n),
    provider: pick(PROVIDERS, n >> 2),
    severity: failed
      ? pick<Severity>(["Critical", "High"], n)
      : pick<Severity>(["Medium", "Low", "Low"], n),
    integrity: pick<Integrity>(
      ["Verified", "Verified", "Verified", "Warning"],
      n,
    ),
    transitionType: pick(TRANSITION_TYPES, n >> 1),
    previousState: pick(
      ["Requested", "Provisioning", "Active", "Maintenance", "Suspended"],
      n,
    ),
    currentState: pick(
      ["Provisioning", "Active", "Maintenance", "Suspended", "Archived"],
      n + 1,
    ),
    dependentResources: 1 + (n % 12),
    relatedEvents: n % 8,
    riskScore: (failed ? 50 : 10) + (n % 40),
  };
});

const PHASE_TONE: Record<Phase, string> = {
  Request: T.textMuted,
  Provisioning: T.accent,
  Activation: T.success,
  Operational: T.success,
  Maintenance: T.warning,
  Suspension: T.warning,
  Archive: T.textMuted,
  Restoration: T.accent,
  Decommission: T.danger,
};

export function LifecycleEventsView() {
  const [search, setSearch] = React.useState("");
  const [fWs, setFWs] = React.useState("");
  const [fPhase, setFPhase] = React.useState("");
  const [fTemplate, setFTemplate] = React.useState("");
  const [fResult, setFResult] = React.useState("");
  const [fEnv, setFEnv] = React.useState("");
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

  const records = SAMPLE_EVENTS;
  const rows = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.id.toLowerCase().includes(q) ||
        r.workspace.toLowerCase().includes(q) ||
        r.event.toLowerCase().includes(q) ||
        r.actor.toLowerCase().includes(q)) &&
      (!fWs || r.workspace === fWs) &&
      (!fPhase || r.phase === fPhase) &&
      (!fTemplate || r.template === fTemplate) &&
      (!fResult || r.result === fResult) &&
      (!fEnv || r.environment === fEnv) &&
      (!fBu || r.businessUnit === fBu)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFWs("");
    setFPhase("");
    setFTemplate("");
    setFResult("");
    setFEnv("");
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
  const requests = records.filter((r) => r.phase === "Request").length;
  const provisioning = records.filter((r) => r.phase === "Provisioning").length;
  const transitions = records.filter((r) => r.result === "Success").length;
  const failed = records.filter((r) => r.result === "Failed").length;
  const exceptions = records.filter(
    (r) => r.transitionType === "Policy Driven",
  ).length;
  const avgTransition = Math.round(
    records.reduce((a, r) => a + r.durationMin, 0) / records.length,
  );
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
      key: "replay",
      label: "Replay Timeline",
      icon: <Play size={15} />,
      disabled: true,
    },
    {
      key: "evidence",
      label: "Download Evidence",
      icon: <FileArchive size={15} />,
      disabled: true,
    },
  ];

  const cols: Column<LEvent>[] = [
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
      key: "workspace",
      header: "Workspace",
      sortValue: (r) => r.workspace,
      render: (r) => r.workspace,
    },
    {
      key: "phase",
      header: "Lifecycle Phase",
      sortValue: (r) => r.phase,
      render: (r) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: PHASE_TONE[r.phase],
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: PHASE_TONE[r.phase],
            }}
          />
          {r.phase}
        </span>
      ),
    },
    {
      key: "event",
      header: "Event",
      sortValue: (r) => r.event,
      render: (r) => r.event,
    },
    {
      key: "actor",
      header: "Actor",
      sortValue: (r) => r.actor,
      render: (r) => r.actor,
    },
    {
      key: "result",
      header: "Result",
      sortValue: (r) => r.result,
      render: (r) => <ResultBadge result={r.result} />,
    },
    {
      key: "durationMin",
      header: "Duration",
      sortValue: (r) => r.durationMin,
      render: (r) => `${r.durationMin} min`,
    },
  ];

  return (
    <>
      <StatStripPlain
        items={[
          { label: "Lifecycle Events", value: total, tone: "ok" },
          { label: "Workspace Requests", value: requests, tone: "ok" },
          { label: "Provisioning Events", value: provisioning, tone: "ok" },
          { label: "Lifecycle Transitions", value: transitions, tone: "ok" },
          {
            label: "Failed Transitions",
            value: failed,
            tone: failed > 0 ? "danger" : "ok",
          },
          {
            label: "Policy Exceptions",
            value: exceptions,
            tone: exceptions > 0 ? "warn" : "ok",
          },
          {
            label: "Avg Transition Time",
            value: `${avgTransition}m`,
            tone: "ok",
          },
          {
            label: "Audit Integrity",
            value: integrityOk ? "Verified" : "Review",
            tone: integrityOk ? "ok" : "warn",
          },
        ]}
      />

      <DiscoveryListView
        title="Lifecycle events"
        desc="Review the complete audited lifecycle history of every workspace from creation through retirement — every automated and manual state transition with actor, trigger, approvals and dependencies."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search lifecycle events — event ID, workspace, lifecycle phase, event, request ID, provisioning/automation job, approval ID…"
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
            key: "lifecyclePhase",
            label: "Lifecycle Phase",
            value: fPhase,
            onChange: setFPhase,
            options: facet(records.map((r) => r.phase)),
          },
          {
            key: "workspaceTemplate",
            label: "Workspace Template",
            value: fTemplate,
            onChange: setFTemplate,
            options: facet(records.map((r) => r.template)),
          },
          {
            key: "result",
            label: "Result",
            value: fResult,
            onChange: setFResult,
            options: facet(records.map((r) => r.result)),
          },
          {
            key: "environment",
            label: "Environment",
            value: fEnv,
            onChange: setFEnv,
            options: facet(records.map((r) => r.environment)),
          },
          {
            key: "businessUnit",
            label: "Business Unit",
            value: fBu,
            onChange: setFBu,
            options: facet(records.map((r) => r.businessUnit)),
          },
        ]}
        presets={[{ label: "All lifecycle events", onApply: clearFilters }]}
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
              { label: "View Timeline", onClick: () => setSelId(r.id) },
              { label: "Export Evidence", onClick: () => setSelId(r.id) },
              { label: "Open Investigation", onClick: () => setSelId(r.id) },
            ]}
          />
        )}
        empty={
          <EmptyState
            icon={<Repeat size={20} />}
            title="No lifecycle events found."
            hint="Adjust filters to review workspace lifecycle transitions."
          />
        }
      />

      {sel && <EventDrawer rec={sel} onClose={() => setSelId(null)} />}
    </>
  );
}

export function LifecycleEventsPage() {
  return (
    <Page>
      <PageHeader
        title="Lifecycle Events"
        subtitle="Review the complete audited lifecycle history of every workspace from creation through retirement."
        actions={<ScopeBadge scope="Organization" />}
      />
      <LifecycleEventsView />
    </Page>
  );
}

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  {
    id: "details",
    label: "Event Details",
    icon: <SlidersHorizontal size={13} />,
  },
  { id: "timeline", label: "Timeline", icon: <History size={13} /> },
  { id: "resources", label: "Related Resources", icon: <Boxes size={13} /> },
  { id: "deps", label: "Dependencies", icon: <Network size={13} /> },
  { id: "policy", label: "Policy Evaluation", icon: <ListChecks size={13} /> },
  { id: "evidence", label: "Evidence", icon: <FileArchive size={13} /> },
  { id: "verify", label: "Audit Verification", icon: <BadgeCheck size={13} /> },
];

function EventDrawer({ rec, onClose }: { rec: LEvent; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={`${rec.event} · ${rec.workspace}`}
      subtitle={`${rec.phase} · ${rec.actor} · ${rec.result} · ${rec.correlationId}`}
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
          <HeaderButton icon={<History size={13} />}>
            View Timeline
          </HeaderButton>
          <HeaderButton icon={<FolderSearch size={13} />}>
            Open Investigation
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "details" && <DetailsTab rec={rec} />}
      {tab === "timeline" && <TimelineTab rec={rec} />}
      {tab === "resources" && <ResourcesTab rec={rec} />}
      {tab === "deps" && <DepsTab rec={rec} />}
      {tab === "policy" && <PolicyTab />}
      {tab === "evidence" && (
        <EvidenceTab
          id={rec.id}
          items={[
            "Lifecycle Record",
            "Workflow History",
            "Automation Logs",
            "Provisioning Logs",
            "Approval Records",
            "API Requests",
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
function OverviewTab({ rec }: { rec: LEvent }) {
  const [sub, setSub] = React.useState("general");
  return (
    <>
      <Tabs tabs={OVERVIEW_SUBS} active={sub} onChange={setSub} />
      {sub === "general" && (
        <AuditSection title="General">
          <KVGrid
            items={[
              { k: "Event ID", v: rec.id },
              { k: "Workspace", v: rec.workspace, sample: true },
              { k: "Lifecycle Phase", v: rec.phase },
              { k: "Lifecycle Event", v: rec.event },
              { k: "Actor", v: rec.actor, sample: true },
              { k: "Execution Source", v: rec.transitionType, sample: true },
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
                k: "Transition Duration",
                v: `${rec.durationMin} min`,
                sample: true,
              },
              {
                k: "Dependent Resources",
                v: rec.dependentResources,
                sample: true,
              },
              { k: "Related Events", v: rec.relatedEvents, sample: true },
              { k: "Workflow Stage", v: rec.phase, sample: true },
              {
                k: "Business Impact",
                v: rec.riskScore > 50 ? "Elevated" : "Low",
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

function DetailsTab({ rec }: { rec: LEvent }) {
  return (
    <AuditSection title="Event details" sample>
      <KVGrid
        items={[
          { k: "Lifecycle Phase", v: rec.phase },
          { k: "Trigger", v: rec.transitionType, sample: true },
          { k: "Previous State", v: rec.previousState, sample: true },
          { k: "Current State", v: rec.currentState, sample: true },
          { k: "Expected State", v: rec.currentState, sample: true },
          { k: "Transition Type", v: rec.transitionType },
          {
            k: "Execution Method",
            v: rec.actor.includes("Engine") ? "Automated" : "Manual",
            sample: true,
          },
          { k: "Execution Source", v: rec.actor, sample: true },
          { k: "Reason", v: "Lifecycle transition", sample: true },
          { k: "Correlation ID", v: rec.correlationId, sample: true },
        ]}
      />
    </AuditSection>
  );
}

function TimelineTab({ rec }: { rec: LEvent }) {
  const seq = [
    "Workspace Requested",
    "Approval Granted",
    "Provisioning Started",
    "Provisioning Completed",
    "Validation Passed",
    "Workspace Activated",
    "Maintenance",
    "Suspended",
    "Archived",
  ];
  const currentIdx =
    seq.findIndex((s) => rec.event.includes(s.split(" ")[0])) >= 0
      ? seq.findIndex((s) => rec.event.includes(s.split(" ")[0]))
      : 3;
  return (
    <AuditSection title="Lifecycle sequence" sample>
      {seq.map((s, i) => (
        <div
          key={s}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 0",
          }}
        >
          <span
            style={{
              width: 4,
              height: 24,
              background: i <= currentIdx ? T.accent : T.border,
              borderRadius: 2,
            }}
          />
          <div
            style={{
              fontSize: 13,
              color: i === currentIdx ? T.textPrimary : T.textMuted,
              fontWeight: i === currentIdx ? 600 : 400,
            }}
          >
            {s}
          </div>
          {i === currentIdx && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: T.accent,
                border: `1px solid ${T.accent}55`,
                borderRadius: 99,
                padding: "2px 9px",
              }}
            >
              this event
            </span>
          )}
        </div>
      ))}
    </AuditSection>
  );
}

function ResourcesTab({ rec }: { rec: LEvent }) {
  const list = Array.from({ length: rec.dependentResources }, (_, i) => {
    const m = hashId(`${rec.id}-r-${i}`);
    return {
      id: `${rec.id}-r-${i}`,
      resource: pick(
        [
          "Provisioning Job",
          "Automation Workflow",
          "Approval Request",
          "Cloud Account",
          "Cluster",
          "Policy",
        ],
        m,
      ),
      workspace: rec.workspace,
      status: pick(["Completed", "Completed", "Pending"], m),
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
        Resources related to this lifecycle event. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function DepsTab({ rec }: { rec: LEvent }) {
  const deps = [
    "Required Approvals",
    "Provisioning Jobs",
    "Automation Tasks",
    "Shared Resources",
    "Parent Workspace",
    "External Systems",
  ];
  const list = deps.map((d) => {
    const m = hashId(rec.id + d);
    return {
      id: d,
      dependency: d,
      status: pick(["Satisfied", "Satisfied", "Pending", "Blocked"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "dependency", header: "Dependency", render: (r) => r.dependency },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          style={{
            color:
              r.status === "Satisfied"
                ? T.success
                : r.status === "Blocked"
                  ? T.danger
                  : T.warning,
          }}
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
          fontSize: 12.5,
          color: T.textMuted,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Transition dependencies. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

function PolicyTab() {
  const policies = [
    "Lifecycle Policy",
    "Provisioning Policy",
    "Retention Policy",
    "Archive Policy",
    "Deletion Policy",
    "Compliance Policy",
    "Approval Policy",
  ];
  const list = policies.map((p) => {
    const m = hashId(`${p}lce`);
    return {
      id: p,
      policy: p,
      result: pick(["Passed", "Passed", "Warning", "Exception Applied"], m),
    };
  });
  const cols: Column<(typeof list)[number]>[] = [
    { key: "policy", header: "Policy", render: (r) => r.policy },
    {
      key: "result",
      header: "Result",
      render: (r) => (
        <span style={{ color: r.result === "Passed" ? T.success : T.warning }}>
          {r.result}
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
        Policy evaluation for this transition. <SampleTag />
      </div>
      <DirectoryTable columns={cols} rows={list} />
    </>
  );
}

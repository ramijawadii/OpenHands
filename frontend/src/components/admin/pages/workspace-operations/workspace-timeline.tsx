/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Operations → Workspace Audit → Workspace Timeline */
import React from "react";
import {
  Search as SearchIcon,
  RefreshCcw,
  Eye,
  Download,
  ShieldCheck,
  Play,
  FileText,
  Waypoints,
  Rocket,
  Cog,
  ShieldAlert,
  BadgeCheck,
  KeyRound,
  Boxes,
  Fingerprint,
  Plug,
  GitBranch,
  AlertTriangle,
  LayoutGrid,
  Link2,
  Radar,
  FileArchive,
} from "lucide-react";
import {
  Page,
  PageHeader,
  StatRow,
  KVGrid,
  HeaderButton,
  Select,
  EmptyState,
  SideRailDrawer,
  ScopeBadge,
  T,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { StatStripPlain } from "#/components/admin/settings-kit";
import { DiscoveryListView } from "#/components/admin/discovery-kit";
import {
  ResultBadge,
  AuditSection,
  EvidenceTab,
  AuditVerificationTab,
  type AuditResult,
  type Integrity,
} from "#/components/admin/pages/workspace-operations/administrative-activity";

/**
 * Workspace Timeline — the authoritative historical timeline for every workspace: a single correlated,
 * read-only, immutable, chronologically-ordered view aggregating events from every Workspace Management
 * subsystem (lifecycle, admin, config, policy, identity, automation, provisioning, security, compliance,
 * approvals, incidents, integrations). Unlike the individual audit leaves, it correlates events by
 * workflow/resource/execution into one investigative timeline. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Operations/Workspace Audit/workspace_timeline.md.
 *
 * Enterprise-Timeline UX pattern (Banner · Timeline Dashboard · Interactive Timeline · Event Correlation
 * · Filters · Search · Detail Drawer · Investigation Mode). Read-only immutable records → sample.
 */

type Category =
  | "Lifecycle"
  | "Administration"
  | "Configuration"
  | "Policies"
  | "Identity & Access"
  | "Automation"
  | "Provisioning"
  | "Security"
  | "Compliance"
  | "Approvals"
  | "Incidents"
  | "Integrations";

const CAT_ICON: Record<Category, React.ReactNode> = {
  Lifecycle: <Rocket size={13} />,
  Administration: <Cog size={13} />,
  Configuration: <Boxes size={13} />,
  Policies: <BadgeCheck size={13} />,
  "Identity & Access": <Fingerprint size={13} />,
  Automation: <Cog size={13} />,
  Provisioning: <Rocket size={13} />,
  Security: <ShieldAlert size={13} />,
  Compliance: <BadgeCheck size={13} />,
  Approvals: <KeyRound size={13} />,
  Incidents: <AlertTriangle size={13} />,
  Integrations: <Plug size={13} />,
};
const CAT_TONE: Record<Category, string> = {
  Lifecycle: T.accent,
  Administration: T.textNav,
  Configuration: T.accent,
  Policies: T.purple,
  "Identity & Access": T.accent,
  Automation: T.textNav,
  Provisioning: T.accent,
  Security: T.danger,
  Compliance: T.success,
  Approvals: T.warning,
  Incidents: T.danger,
  Integrations: T.textNav,
};
const WORKSPACES = [
  "Payments Production",
  "Retail Web",
  "Data Lake",
  "Identity",
  "Analytics",
];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
const pick = <X,>(arr: X[], n: number): X =>
  arr[((Math.trunc(n) % arr.length) + arr.length) % arr.length];

interface TEvent {
  id: string;
  time: string;
  minute: number;
  category: Category;
  event: string;
  actor: string;
  result: AuditResult;
  correlationId: string;
  workspace: string;
  integrity: Integrity;
  duration: string;
  affectedResources: number;
}

// A single correlated workspace-creation → activation chain, plus later operational events.
const EVENT_SEQ: {
  time: string;
  minute: number;
  category: Category;
  event: string;
  actor: string;
}[] = [
  {
    time: "09:12",
    minute: 552,
    category: "Lifecycle",
    event: "Workspace Requested",
    actor: "Administrator",
  },
  {
    time: "09:14",
    minute: 554,
    category: "Approvals",
    event: "Approval Submitted",
    actor: "john.smith",
  },
  {
    time: "09:15",
    minute: 555,
    category: "Approvals",
    event: "Approval Completed",
    actor: "gov.admin",
  },
  {
    time: "09:15",
    minute: 555,
    category: "Provisioning",
    event: "Provisioning Started",
    actor: "Automation Engine",
  },
  {
    time: "09:27",
    minute: 567,
    category: "Provisioning",
    event: "Provisioning Completed",
    actor: "Provisioning Engine",
  },
  {
    time: "09:29",
    minute: 569,
    category: "Lifecycle",
    event: "Validation Passed",
    actor: "Automation Engine",
  },
  {
    time: "09:32",
    minute: 572,
    category: "Lifecycle",
    event: "Workspace Activated",
    actor: "Automation Engine",
  },
  {
    time: "09:45",
    minute: 585,
    category: "Policies",
    event: "Policy Assigned",
    actor: "gov.admin",
  },
  {
    time: "09:47",
    minute: 587,
    category: "Identity & Access",
    event: "Identity Groups Synced",
    actor: "Automation Engine",
  },
  {
    time: "09:52",
    minute: 592,
    category: "Compliance",
    event: "Compliance Scan Started",
    actor: "Compliance Scanner",
  },
  {
    time: "10:04",
    minute: 604,
    category: "Compliance",
    event: "Compliance Scan Completed",
    actor: "Compliance Scanner",
  },
  {
    time: "11:42",
    minute: 702,
    category: "Configuration",
    event: "Configuration Updated",
    actor: "john.smith",
  },
  {
    time: "13:18",
    minute: 798,
    category: "Security",
    event: "Secret Rotated",
    actor: "Automation Engine",
  },
  {
    time: "14:06",
    minute: 846,
    category: "Policies",
    event: "Override Applied",
    actor: "gov.admin",
  },
  {
    time: "16:30",
    minute: 990,
    category: "Automation",
    event: "Scheduled Task Executed",
    actor: "Automation Engine",
  },
  {
    time: "18:11",
    minute: 1091,
    category: "Integrations",
    event: "Webhook Added",
    actor: "john.smith",
  },
];

function buildEvents(workspace: string): TEvent[] {
  return EVENT_SEQ.map((e, i) => {
    const id = `${workspace}-TL-${i}`;
    const n = hashId(id + e.event);
    return {
      id,
      time: e.time,
      minute: e.minute,
      category: e.category,
      event: e.event,
      actor: e.actor,
      result: e.event.includes("Failed")
        ? "Failed"
        : pick<AuditResult>(["Success", "Success", "Success", "Warning"], n),
      correlationId:
        e.minute < 610 ? "COR-32814" : `COR-${(33000 + (n % 900)).toString()}`,
      workspace,
      integrity: "Verified",
      duration: pick(["<1s", "2s", "12 min", "18 min", "45s"], n),
      affectedResources: 1 + (n % 8),
    };
  });
}

export function WorkspaceTimelineView() {
  const [workspace, setWorkspace] = React.useState(WORKSPACES[0]);
  const [search, setSearch] = React.useState("");
  const [fCat, setFCat] = React.useState("");
  const [fResult, setFResult] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);

  const all = React.useMemo(() => buildEvents(workspace), [workspace]);
  const events = all.filter((e) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        e.event.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.correlationId.toLowerCase().includes(q)) &&
      (!fCat || e.category === fCat) &&
      (!fResult || e.result === fResult)
    );
  });
  const clearFilters = () => {
    setSearch("");
    setFCat("");
    setFResult("");
  };
  const sel = all.find((e) => e.id === selId) ?? null;
  const facet = (vals: string[]) => [
    { value: "", label: "All" },
    ...Array.from(new Set(vals))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const totalEvents = all.length;
  const lifecycle = all.filter((e) => e.category === "Lifecycle").length;
  const admin = all.filter(
    (e) => e.category === "Administration" || e.category === "Configuration",
  ).length;
  const policy = all.filter((e) => e.category === "Policies").length;
  const config = all.filter((e) => e.category === "Configuration").length;
  const security = all.filter((e) => e.category === "Security").length;
  const compliance = all.filter((e) => e.category === "Compliance").length;
  const integrityOk = all.every((e) => e.integrity === "Verified");

  const toolbar: CommandItem[] = [
    {
      key: "search",
      label: "Advanced Search",
      icon: <SearchIcon size={15} />,
      disabled: true,
    },
    {
      key: "correlation",
      label: "Correlation View",
      icon: <Link2 size={15} />,
      disabled: true,
    },
    {
      key: "export",
      label: "Export Timeline",
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
      key: "refresh",
      label: "Refresh",
      icon: <RefreshCcw size={15} />,
      onClick: () => setSelId(null),
    },
    {
      key: "replay",
      label: "Replay Timeline",
      icon: <Play size={15} />,
      disabled: true,
    },
    {
      key: "verify",
      label: "Verify Integrity",
      icon: <ShieldCheck size={15} />,
      disabled: true,
    },
  ];

  return (
    <>
      {/* Workspace picker — the timeline is scoped to one workspace at a time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ minWidth: 240 }}>
          <Select
            label="Workspace"
            value={workspace}
            onChange={(v) => {
              setWorkspace(v);
              setSelId(null);
            }}
            options={WORKSPACES.map((w) => ({ value: w, label: w }))}
          />
        </div>
      </div>

      {/* Summary — recreated as framework stat tiles */}
      <StatStripPlain
        items={[
          { label: "Workspace", value: workspace },
          {
            label: "First Event",
            value: `${all[0].time} · ${all[0].event}`,
          },
          {
            label: "Latest Event",
            value: `${all[all.length - 1].time} · ${all[all.length - 1].event}`,
          },
          {
            label: "Correlated Chains",
            value: Array.from(new Set(all.map((e) => e.correlationId))).length,
          },
          {
            label: "Timeline Integrity",
            value: integrityOk ? "Verified" : "Review",
            tone: integrityOk ? "ok" : "warn",
          },
          { label: "Retention", value: "7 years (immutable)" },
        ]}
      />

      <StatStripPlain
        items={[
          { label: "Total Events", value: totalEvents, tone: "ok" },
          { label: "Lifecycle Events", value: lifecycle, tone: "ok" },
          { label: "Administrative Changes", value: admin, tone: "ok" },
          { label: "Policy Changes", value: policy, tone: "ok" },
          { label: "Configuration Changes", value: config, tone: "ok" },
          {
            label: "Security Events",
            value: security,
            tone: security > 0 ? "warn" : "ok",
          },
          { label: "Compliance Events", value: compliance, tone: "ok" },
          {
            label: "Timeline Integrity",
            value: integrityOk ? "Verified" : "Review",
            tone: integrityOk ? "ok" : "warn",
          },
        ]}
      />

      <DiscoveryListView
        title={`Workspace timeline — ${workspace}`}
        desc="Interactive chronological history. Events are automatically correlated by workflow, resource and execution context."
        commands={toolbar}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search workspace timeline — event, actor, policy, resource, correlation ID, provisioning/automation job…"
        count={events.length}
        pills={[
          {
            key: "category",
            label: "Category",
            value: fCat,
            onChange: setFCat,
            options: facet(all.map((e) => e.category)),
          },
          {
            key: "result",
            label: "Result",
            value: fResult,
            onChange: setFResult,
            options: facet(all.map((e) => e.result)),
          },
        ]}
        presets={[{ label: "All events", onApply: clearFilters }]}
        columns={[
          {
            key: "time",
            header: "Time",
            sortValue: (e) => e.minute,
            render: (e) => (
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: T.textMuted,
                }}
              >
                {e.time}
              </span>
            ),
          },
          {
            key: "event",
            header: "Event",
            sortValue: (e) => e.event,
            render: (e) => (
              <span
                style={{
                  color: T.textPrimary,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    color: CAT_TONE[e.category],
                    display: "inline-flex",
                  }}
                >
                  {CAT_ICON[e.category]}
                </span>
                {e.event}
              </span>
            ),
          },
          {
            key: "category",
            header: "Category",
            sortValue: (e) => e.category,
            render: (e) => e.category,
          },
          {
            key: "actor",
            header: "Actor",
            sortValue: (e) => e.actor,
            render: (e) => e.actor,
          },
          {
            key: "result",
            header: "Result",
            sortValue: (e) => e.result,
            render: (e) => <ResultBadge result={e.result} />,
          },
          {
            key: "correlationId",
            header: "Correlation ID",
            sortValue: (e) => e.correlationId,
            render: (e) => (
              <span style={{ fontFamily: "monospace" }}>{e.correlationId}</span>
            ),
          },
          {
            key: "duration",
            header: "Duration",
            sortValue: (e) => e.duration,
            render: (e) => e.duration,
          },
        ]}
        rows={events}
        pageSize={12}
        initialSort={{ key: "time", dir: "asc" }}
        onRowClick={(e) => setSelId(e.id)}
        empty={
          <EmptyState
            icon={<Waypoints size={20} />}
            title="No timeline events found."
            hint="Adjust filters to explore the workspace history."
          />
        }
      />

      {sel && (
        <EventDrawer rec={sel} all={all} onClose={() => setSelId(null)} />
      )}
    </>
  );
}

export function WorkspaceTimelinePage() {
  return (
    <Page>
      <PageHeader
        title="Workspace Timeline"
        subtitle="Explore the complete chronological history of a workspace across lifecycle, governance, security, automation, compliance, and operational events."
        actions={<ScopeBadge scope="This workspace" />}
      />
      <WorkspaceTimelineView />
    </Page>
  );
}

const DRAWER_TABS = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "details", label: "Event Details", icon: <Cog size={13} /> },
  { id: "related", label: "Related Events", icon: <Link2 size={13} /> },
  { id: "context", label: "Timeline Context", icon: <GitBranch size={13} /> },
  { id: "impact", label: "Impact Analysis", icon: <Radar size={13} /> },
  { id: "evidence", label: "Evidence", icon: <FileArchive size={13} /> },
  { id: "verify", label: "Audit Verification", icon: <BadgeCheck size={13} /> },
];

function EventDrawer({
  rec,
  all,
  onClose,
}: {
  rec: TEvent;
  all: TEvent[];
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState("overview");
  return (
    <SideRailDrawer
      sections={DRAWER_TABS}
      active={tab}
      onSelect={setTab}
      title={rec.event}
      subtitle={`${rec.time} · ${rec.category} · ${rec.actor} · ${rec.result}`}
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
            Investigation Mode
          </HeaderButton>
          <HeaderButton variant="primary" icon={<Download size={13} />}>
            Export
          </HeaderButton>
        </div>
      }
    >
      {tab === "overview" && <OverviewTab rec={rec} />}
      {tab === "details" && <DetailsTab rec={rec} />}
      {tab === "related" && <RelatedTab rec={rec} all={all} />}
      {tab === "context" && <ContextTab rec={rec} all={all} />}
      {tab === "impact" && <ImpactTab rec={rec} />}
      {tab === "evidence" && (
        <EvidenceTab
          id={rec.id}
          items={[
            "Audit Record",
            "API Logs",
            "Approval Record",
            "Automation Logs",
            "Policy Snapshot",
            "Configuration Snapshot",
            "Digital Signature",
            "Correlation Metadata",
          ]}
        />
      )}
      {tab === "verify" && <AuditVerificationTab integrity={rec.integrity} />}
    </SideRailDrawer>
  );
}

function OverviewTab({ rec }: { rec: TEvent }) {
  return (
    <AuditSection title="Overview">
      <KVGrid
        items={[
          { k: "Event ID", v: rec.id },
          { k: "Category", v: rec.category },
          { k: "Event", v: rec.event },
          { k: "Timestamp", v: `2026-07-12 ${rec.time} UTC`, sample: true },
          { k: "Actor", v: rec.actor, sample: true },
          { k: "Workspace", v: rec.workspace, sample: true },
          { k: "Result", v: rec.result },
          { k: "Correlation ID", v: rec.correlationId, sample: true },
        ]}
      />
    </AuditSection>
  );
}

function DetailsTab({ rec }: { rec: TEvent }) {
  return (
    <AuditSection title="Event details" sample>
      <KVGrid
        items={[
          {
            k: "Description",
            v: `${rec.event} in ${rec.workspace}`,
            sample: true,
          },
          { k: "Execution Source", v: rec.actor, sample: true },
          {
            k: "Request ID",
            v: `REQ-${(hashId(rec.id) % 900000).toString()}`,
            sample: true,
          },
          { k: "Correlation ID", v: rec.correlationId, sample: true },
          {
            k: "Trigger",
            v: rec.actor.includes("Engine") ? "Automated" : "Manual",
            sample: true,
          },
          { k: "Duration", v: rec.duration, sample: true },
          { k: "Affected Resources", v: rec.affectedResources, sample: true },
        ]}
      />
    </AuditSection>
  );
}

function RelatedTab({ rec, all }: { rec: TEvent; all: TEvent[] }) {
  const related = all.filter(
    (e) => e.correlationId === rec.correlationId && e.id !== rec.id,
  );
  if (!related.length) {
    return (
      <EmptyState
        icon={<Link2 size={18} />}
        title="No correlated events"
        hint="This event is not part of a multi-event workflow chain."
      />
    );
  }
  return (
    <AuditSection title={`Correlated events — ${rec.correlationId}`} sample>
      {related.map((e) => (
        <StatRow
          key={e.id}
          label={`${e.time} · ${e.event}`}
          value={<ResultBadge result={e.result} />}
          sample
        />
      ))}
    </AuditSection>
  );
}

function ContextTab({ rec, all }: { rec: TEvent; all: TEvent[] }) {
  const idx = all.findIndex((e) => e.id === rec.id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;
  return (
    <AuditSection title="Timeline context" sample>
      <StatRow
        label="Previous Event"
        value={prev ? `${prev.time} · ${prev.event}` : "—"}
        sample
      />
      <StatRow
        label="Current Event"
        value={`${rec.time} · ${rec.event}`}
        tone="ok"
        sample
      />
      <StatRow
        label="Next Event"
        value={next ? `${next.time} · ${next.event}` : "—"}
        sample
      />
      <StatRow label="Parent Workflow" value={rec.correlationId} sample />
      <StatRow
        label="Child Events"
        value={
          all.filter((e) => e.correlationId === rec.correlationId).length - 1
        }
        sample
      />
    </AuditSection>
  );
}

function ImpactTab({ rec }: { rec: TEvent }) {
  return (
    <AuditSection title="Impact analysis" sample>
      <StatRow
        label="Affected Resources"
        value={rec.affectedResources}
        sample
      />
      <StatRow
        label="Affected Users"
        value={rec.affectedResources * 3}
        sample
      />
      <StatRow
        label="Business Impact"
        value={rec.category === "Incidents" ? "High" : "Low"}
        tone={rec.category === "Incidents" ? "warn" : "ok"}
        sample
      />
      <StatRow
        label="Security Impact"
        value={rec.category === "Security" ? "Reviewed" : "None"}
        sample
      />
      <StatRow
        label="Compliance Impact"
        value={rec.category === "Compliance" ? "Evidence generated" : "None"}
        sample
      />
      <StatRow
        label="Operational Impact"
        value={rec.result === "Failed" ? "Degraded" : "Nominal"}
        tone={rec.result === "Failed" ? "warn" : "ok"}
        sample
      />
    </AuditSection>
  );
}

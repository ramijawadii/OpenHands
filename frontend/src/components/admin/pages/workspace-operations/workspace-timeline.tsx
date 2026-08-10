/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components, no-bitwise -- CloudGuard Workspace Operations → Workspace Audit → Workspace Timeline */
import React from "react";
import {
  Search as SearchIcon,
  RefreshCcw,
  Eye,
  Download,
  ShieldCheck,
  Maximize2,
  Minimize2,
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
  Card,
  StatRow,
  KVGrid,
  FilterBar,
  CommandBar,
  HeaderButton,
  Select,
  EmptyState,
  SideRailDrawer,
  ScopeBadge,
  T,
  type CommandItem,
} from "#/components/admin/admin-kit";
import { StatStripPlain } from "#/components/admin/settings-kit";
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
const CATEGORIES = Object.keys(CAT_ICON) as Category[];
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
  const [collapsed, setCollapsed] = React.useState(false);
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
  const hasFilters = !!(search || fCat || fResult);
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

  // Group into correlated chains for the "expand correlated events" view.
  const chains = Array.from(new Set(events.map((e) => e.correlationId)));

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
      key: "expand",
      label: collapsed ? "Expand Correlated" : "Collapse Groups",
      icon: collapsed ? <Maximize2 size={15} /> : <Minimize2 size={15} />,
      onClick: () => setCollapsed((c) => !c),
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
      {/* Workspace picker + summary */}
      <Card
        title="Timeline summary"
        desc="Select a workspace to explore its complete chronological history across lifecycle, governance, security, automation, compliance and operational events."
        right={
          <div style={{ minWidth: 220 }}>
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
        }
      >
        <KVGrid
          cols={3}
          items={[
            { k: "Workspace", v: workspace },
            {
              k: "First Event",
              v: `${all[0].time} · ${all[0].event}`,
              sample: true,
            },
            {
              k: "Latest Event",
              v: `${all[all.length - 1].time} · ${all[all.length - 1].event}`,
              sample: true,
            },
            {
              k: "Correlated Chains",
              v: Array.from(new Set(all.map((e) => e.correlationId))).length,
              sample: true,
            },
            {
              k: "Timeline Integrity",
              v: integrityOk ? "Verified" : "Review",
              sample: true,
            },
            { k: "Retention", v: "7 years (immutable)", sample: true },
          ]}
        />
      </Card>

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

      <Card
        title={`Workspace timeline — ${workspace}`}
        desc="Interactive chronological history. Events are automatically correlated by workflow, resource and execution context."
      >
        <CommandBar items={toolbar} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search workspace timeline — event, actor, policy, resource, correlation ID, provisioning/automation job…"
          count={events.length}
          total={all.length}
          showClear={hasFilters}
          onClear={clearFilters}
        >
          <Select
            label="Category"
            value={fCat}
            onChange={setFCat}
            options={facet(all.map((e) => e.category))}
          />
          <Select
            label="Result"
            value={fResult}
            onChange={setFResult}
            options={facet(all.map((e) => e.result))}
          />
        </FilterBar>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            padding: "4px 4px 12px",
            fontSize: 11.5,
            color: T.textMuted,
          }}
        >
          {CATEGORIES.slice(0, 8).map((c) => (
            <span
              key={c}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: CAT_TONE[c],
              }}
            >
              {CAT_ICON[c]} {c}
            </span>
          ))}
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon={<Waypoints size={20} />}
            title="No timeline events found."
            hint="Adjust filters to explore the workspace history."
          />
        ) : collapsed ? (
          // Collapsed = grouped by correlation chain
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {chains.map((chain) => {
              const chainEvents = events.filter(
                (e) => e.correlationId === chain,
              );
              return (
                <div
                  key={chain}
                  style={{
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: "10px 14px",
                    background: T.cardBg,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <Link2 size={14} color={T.textMuted} />
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: T.textPrimary,
                      }}
                    >
                      {chain}
                    </span>
                    <span style={{ fontSize: 11.5, color: T.textMuted }}>
                      · {chainEvents.length} correlated events ·{" "}
                      {chainEvents[0].time}–
                      {chainEvents[chainEvents.length - 1].time}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {chainEvents.map((e) => (
                      <span
                        key={e.id}
                        style={{
                          fontSize: 11.5,
                          color: CAT_TONE[e.category],
                          border: `1px solid ${CAT_TONE[e.category]}44`,
                          borderRadius: 99,
                          padding: "2px 9px",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelId(e.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(k) => {
                          if (k.key === "Enter") setSelId(e.id);
                        }}
                      >
                        {e.time} · {e.event}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Expanded = full vertical timeline
          <div style={{ position: "relative", paddingLeft: 8 }}>
            {events.map((e, i) => (
              <div
                key={e.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelId(e.id)}
                onKeyDown={(k) => {
                  if (k.key === "Enter") setSelId(e.id);
                }}
                style={{
                  display: "flex",
                  gap: 14,
                  cursor: "pointer",
                  padding: "10px 10px",
                  borderRadius: 8,
                  background: e.id === selId ? T.badgeBg : "transparent",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: `${CAT_TONE[e.category]}22`,
                      color: CAT_TONE[e.category],
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px solid ${CAT_TONE[e.category]}66`,
                    }}
                  >
                    {CAT_ICON[e.category]}
                  </span>
                  {i < events.length - 1 && (
                    <span
                      style={{
                        width: 2,
                        flex: 1,
                        background: T.border,
                        marginTop: 2,
                        minHeight: 14,
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: T.textMuted,
                        fontVariantNumeric: "tabular-nums",
                        minWidth: 40,
                      }}
                    >
                      {e.time}
                    </span>
                    <span
                      style={{
                        fontSize: 13.5,
                        color: T.textPrimary,
                        fontWeight: 500,
                      }}
                    >
                      {e.event}
                    </span>
                    <ResultBadge result={e.result} />
                  </div>
                  <div
                    style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}
                  >
                    {e.category} · {e.actor} · {e.correlationId}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

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

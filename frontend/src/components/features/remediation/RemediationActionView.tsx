/* eslint-disable i18next/no-literal-string -- remediation record */
import React from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  FileJson,
  FileSearch,
  FlaskConical,
  GitBranch,
  Layers,
  LayoutGrid,
  Lock,
  Save,
  ShieldCheck,
  Terminal,
  Ticket,
  Undo2,
  Workflow,
} from "lucide-react";
import { SideRailPanel, type RailSection } from "#/components/admin/admin-kit";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";
import { GridPalette } from "#/components/features/explore/cloudguard-grid/palette";
import { SeverityGauge } from "#/components/features/explore/cloudguard-grid/SeverityGauge";
import { CountryFlag } from "#/components/features/explore/cloudguard-grid/flags";
import { REGION_COUNTRY } from "#/components/features/explore/cloudguard-grid/data";
import {
  ENV_COLOR,
  ResourceIcon,
} from "#/components/features/explore/cloudguard-grid/icons";
import { SvgIcon } from "#/components/features/explore/cloudguard-grid/SvgIcon";
import { REMEDIATION_VIEWS } from "./remediation-structure";
import {
  buildPlan,
  describeAction,
  fieldValue,
  locationOf,
  type PhaseAuthorization,
  type RemediationAction,
} from "./remediation-data";
import { exportAction } from "./remediation-export";
import type { LinkedAsset, LinkedFinding } from "./remediation-detail-data";
import {
  buildAttack,
  buildControls,
  buildDefend,
  buildFrameworks,
} from "./remediation-detail-data";
import { CATEGORY_TONE, strategiesIn } from "./remediation-strategy";
import { phaseId, strategyFor, taskId } from "./remediation-task-data";
import { RemediationTaskView } from "./RemediationTaskView";
import { ScopeAssetsView, openInventory } from "./ScopeAssetsView";
import { StageFieldView } from "./StageFieldView";
import { AssetPanel, FindingPanel } from "./NodePanels";
import { ApprovalsPane } from "./ApprovalsPane";
import { EvidencePane, EvidenceRecordView } from "./EvidencePane";
import { AuditPane, AuditEntryView } from "./AuditPane";
import { TicketsPane, TicketView } from "./TicketsPane";
import { RollbackPane } from "./rollback/RollbackPane";
import { UndoEntryView } from "./rollback/UndoEntryView";
import type { UndoEntry } from "./rollback/undo-journal";
import { SimulationPane } from "./simulation/SimulationPane";
import type { Ticket as LinkedTicket } from "./remediation-ticket-data";
import type { AuditChange } from "./remediation-audit-data";
import type { EvidenceRecord } from "./remediation-evidence-data";
import {
  AccessTag,
  IconRow,
  Section,
  StepTag,
  LifecyclePane,
  RelatedFindingsPane,
  TimelineDot,
  TimelineItem,
} from "./RemediationPanes";

/**
 * One Remediation Action, rendered as the event drawer renders one event.
 *
 * Deliberately the SAME shell — `SideRailPanel`, the same collapsible sections,
 * the same header/action/footer arrangement, the same `.cg-report-action`
 * buttons. A remediation record and a security event are both "one thing, many
 * facets", and giving them two different chromes would make the drawer feel
 * like two products.
 *
 * The rail is a flat seven, matching the taxonomy's top level. Lifecycle's ten
 * stages are NOT rail entries — a sequence navigates itself, and the timeline
 * pane shows the whole of it in one scroll. Moving between views is the pager
 * in the header rather than a rail click, so the two navigation models do not
 * compete.
 */

/** Vendor logo slugs, matching the inventory's own provider marks. */
const PROVIDER_SLUG: Record<string, string> = {
  AWS: "aws",
  Azure: "microsoft_azure",
  GCP: "google_cloud",
};

const VIEW_ICON: Record<string, React.ReactNode> = {
  overview: <LayoutGrid size={13} />,
  "simulation-results": <FlaskConical size={13} />,
  "related-findings": <FileSearch size={13} />,
  lifecycle: <Workflow size={13} />,
  rollback: <Undo2 size={13} />,
  approvals: <ShieldCheck size={13} />,
  tickets: <Ticket size={13} />,
  evidence: <FileJson size={13} />,
  audit: <GitBranch size={13} />,
};

/** One monospace stack for every identifier on this surface. */
const MONO = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 10px",
  fontSize: 12.5,
  lineHeight: 1,
  fontFamily: APP_FONT,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

/**
 * A control reference: framework first, then the identifier.
 *
 * `SC-7` alone is ambiguous — it means nothing without knowing it is NIST — and
 * an operator scanning ten tags cannot hold four numbering schemes in their
 * head. Naming the framework makes each tag self-describing.
 *
 * Type stays neutral, matching the strategy chip. Colour on this surface means
 * severity; spending it on taxonomy would make a routine ISO reference look as
 * urgent as a Critical finding. The frameworks are already distinguished by the
 * words in front of the number.
 */
function ControlTag({
  framework,
  ref: reference,
  title,
}: {
  framework: string;
  ref: string;
  title: string;
}) {
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 4,
        padding: "0 6px",
        fontSize: 10,
        lineHeight: "16px",
        borderRadius: 3,
        border: "1px solid var(--cg-border)",
        color: "var(--cg-text-primary)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "var(--cg-text-muted)" }}>{framework}</span>
      <span style={{ fontFamily: MONO }}>{reference}</span>
    </span>
  );
}

/** Authorization tag. Colour follows meaning, not decoration. */
function AuthTag({ value }: { value: PhaseAuthorization }) {
  const tone: Record<PhaseAuthorization, [string, string]> = {
    Authorized: ["var(--cgx-low)", "transparent"],
    Approved: ["var(--cgx-low)", "transparent"],
    "Requires approval": ["var(--cgx-high)", "var(--cg-accent-bg)"],
    Blocked: ["var(--cgx-critical)", "var(--cg-danger-bg)"],
  };
  const [color, bg] = tone[value];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "1px 8px",
        fontSize: 10.5,
        lineHeight: "17px",
        borderRadius: 10,
        border: `1px solid ${color}`,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {value === "Requires approval" ? (
        <Lock size={9} />
      ) : (
        <ShieldCheck size={9} />
      )}
      {value}
    </span>
  );
}

/**
 * The plan, as checkable work grouped into phases.
 *
 * Each phase closes with its authorization tag rather than opening with one:
 * the tag qualifies the work above it, and the operator needs to have read what
 * the phase DOES before being told whether they may do it.
 */
function PlanList({
  action,
  onOpenTask,
}: {
  action: RemediationAction;
  onOpenTask: (phase: string, phaseLabel: string, label: string) => void;
}) {
  const phases = React.useMemo(() => buildPlan(action), [action]);
  // Local overrides only — ticking a box is a working note, not a state change
  // against the record, and must not be mistaken for one.
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const isDone = (id: string, fallback: boolean) => checked[id] ?? fallback;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {phases.map((p, i) => {
        const total = p.tasks.length;
        const done = p.tasks.filter((t) => isDone(t.id, t.done)).length;
        const pid = phaseId(action.id, p.id);
        const complete = done === total;
        return (
          <TimelineItem
            key={p.id}
            mark={
              <TimelineDot
                tone={complete ? "var(--cgx-low)" : "var(--cg-border-strong)"}
                filled={complete}
              />
            }
            last={i === phases.length - 1}
            done={complete}
          >
            {/*
             * Title, then everything that QUALIFIES the phase, then the work.
             *
             * The authorization and control tags used to sit below the task
             * list, which meant an operator read four tasks before learning
             * whether they were allowed to do them — and on a gated phase that
             * is the first thing they need. Qualifiers belong between the name
             * and the work, in the order the question is asked.
             */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <StepTag>{p.label}</StepTag>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "var(--cg-text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {done}/{total}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 6,
              }}
            >
              <AuthTag value={p.authorization} />
              <AccessTag value={p.access} />
              {p.controls.map((c) => (
                <ControlTag
                  key={`${c.framework}${c.ref}`}
                  framework={c.framework}
                  ref={c.ref}
                  title={c.title}
                />
              ))}
              {/* Phase identifier. An approval or audit entry references THIS,
                  never "the third phase" — which changes meaning if the plan is
                  ever reordered. */}
              <span
                title="Phase identifier"
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  color: "var(--cg-text-muted)",
                  border: "1px solid var(--cg-border-subtle)",
                  borderRadius: 3,
                  padding: "0 5px",
                }}
              >
                {pid}
              </span>
            </div>

            <div
              style={{
                marginTop: 4,
                marginBottom: 8,
                fontSize: 11,
                color: "var(--cg-text-muted)",
              }}
            >
              {p.reason}
            </div>

            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {p.tasks.map((t) => {
                const on = isDone(t.id, t.done);
                const tid = taskId(action.id, p.id, t.label);
                return (
                  <li key={t.id}>
                    <div
                      className="cg-task"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "4px 0",
                        fontSize: 12.5,
                      }}
                    >
                      <input
                        type="checkbox"
                        className="cg-check"
                        aria-label={t.label}
                        checked={on}
                        onChange={() =>
                          setChecked((c) => ({ ...c, [t.id]: !on }))
                        }
                        style={{ marginTop: 2 }}
                      />
                      {/*
                       * The label opens the task; the checkbox stays a
                       * checkbox. If ticking also navigated, marking work done
                       * would be impossible without leaving the plan.
                       */}
                      <button
                        type="button"
                        onClick={() => onOpenTask(p.id, p.label, t.label)}
                        title={tid}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          padding: 0,
                          fontFamily: APP_FONT,
                          fontSize: 12.5,
                          cursor: "pointer",
                          color: on
                            ? "var(--cg-text-muted)"
                            : "var(--cg-text-primary)",
                          textDecoration: on ? "line-through" : "none",
                        }}
                      >
                        {t.label}
                      </button>
                      {/* Revealed on row hover — see `.cg-task-id` in index.css.
                          Always in the DOM so it is copyable and reachable by
                          assistive tech, not conjured by the pointer. */}
                      <span
                        className="cg-task-id"
                        style={{
                          fontFamily: MONO,
                          fontSize: 9.5,
                          color: "var(--cg-text-muted)",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {tid}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </TimelineItem>
        );
      })}
    </div>
  );
}

/**
 * Overview is the one bespoke pane.
 *
 * The other views are uniform field lists and are generated from the structure.
 * Overview has to answer "what is this, where is it, and what happens next" —
 * three different shapes (rows, prose, checklist) that a generic renderer
 * cannot produce without pretending prose is a field value.
 */
/**
 * Execution category and strategy.
 *
 * Two layers, shown as two chips, because they answer different questions:
 * the CATEGORY is what a human governs ("no Direct Configuration Change in
 * production" is a rule someone can write and audit), the STRATEGY is what the
 * executor dispatches on. Exposing 44 strategies as a flat list would ask the
 * operator an implementation question; showing only the category would hide
 * which mechanism actually runs.
 */
function ExecutionChips({ action }: { action: RemediationAction }) {
  const strategy = strategyFor(action);
  const tone = CATEGORY_TONE[strategy.category];
  const siblings = strategiesIn(strategy.category);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
      }}
    >
      <span
        title={`${siblings.length} strategies in this category`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "1px 8px",
          fontSize: 10.5,
          lineHeight: "17px",
          borderRadius: 10,
          border: `1px solid ${tone}`,
          color: tone,
          whiteSpace: "nowrap",
        }}
      >
        <Layers size={9} />
        {strategy.category}
      </span>
      <ChevronRight size={11} style={{ color: "var(--cg-text-muted)" }} />
      <span
        title={`${strategy.purpose} · targets ${strategy.targets} · e.g. ${strategy.examples}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "1px 8px",
          fontSize: 10.5,
          lineHeight: "17px",
          borderRadius: 3,
          border: "1px solid var(--cg-border)",
          fontFamily: MONO,
          color: "var(--cg-text-primary)",
          whiteSpace: "nowrap",
        }}
      >
        <Terminal size={9} />
        {strategy.id}
      </span>
      {!strategy.writes && (
        <span style={{ fontSize: 10.5, color: "var(--cg-text-muted)" }}>
          no estate write
        </span>
      )}
    </span>
  );
}

/**
 * Overview is the one bespoke pane.
 *
 * It answers "what is this, where exactly, why now, and what happens next" —
 * rows, prose and a checklist. A generic field renderer cannot produce that
 * without pretending prose is a field value.
 */
function OverviewPane({
  action,
  onOpenScope,
  onOpenTask,
  onOpenApprovals,
}: {
  action: RemediationAction;
  onOpenScope: () => void;
  onOpenTask: (phase: string, phaseLabel: string, label: string) => void;
  onOpenApprovals: () => void;
}) {
  const loc = locationOf(action);
  const paragraphs = describeAction(action);
  const strategy = strategyFor(action);
  const country = REGION_COUNTRY[action.region];
  const plan = React.useMemo(() => buildPlan(action), [action]);
  const attack = React.useMemo(() => buildAttack(action), [action]);
  const defend = React.useMemo(() => buildDefend(action), [action]);
  const controls = React.useMemo(() => buildControls(action), [action]);
  const frameworks = React.useMemo(() => buildFrameworks(action), [action]);
  /** Phases the policy gates — the count the Approvals pane will show. */
  const gatedCount = plan.filter((ph) => ph.access === "Write").length;

  /** Plain-text renderings for the copy control — never scraped from the DOM. */
  const summaryText = () =>
    [
      `${action.id} — ${action.title}`,
      `Summary: ${fieldValue(action, "Summary")}`,
      `Scope: ${fieldValue(action, "Scope")}`,
      `Lifecycle: ${fieldValue(action, "Lifecycle")}`,
      `Execution: ${strategy.category} → ${strategy.id}`,
      `Controls: ${[...attack.map((t) => t.technique), ...defend.map((d) => d.id), ...controls.map((c) => c.id), ...frameworks.map((f) => f.id)].join(", ")}`,
      `Provider: ${loc.provider}`,
      `Account: ${loc.account}`,
      `Region: ${loc.region}${country ? ` (${country})` : ""}`,
      `Environment: ${loc.environment}`,
      `Target: ${loc.path}`,
    ].join("\n");

  const planText = () =>
    plan
      .map((ph) =>
        [
          `${ph.label}  [${ph.access}] [${ph.authorization}]  ${phaseId(action.id, ph.id)}`,
          ...ph.tasks.map(
            (t) => `  - ${t.label}  (${taskId(action.id, ph.id, t.label)})`,
          ),
          `  reason: ${ph.reason}`,
        ].join("\n"),
      )
      .join("\n\n");

  return (
    <>
      <Section title="Summary" count={12} open copyText={summaryText}>
        <IconRow label="Summary">{fieldValue(action, "Summary")}</IconRow>

        {/*
         * Scope is a LINK, not a value. "12 assets" invites the question "which
         * twelve", and the answer belongs in a table rather than in a sentence
         * the reader has to trust.
         */}
        <IconRow label="Scope" icon={undefined}>
          <button
            type="button"
            onClick={onOpenScope}
            title="List the assets in scope"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "none",
              border: "none",
              padding: 0,
              fontFamily: APP_FONT,
              fontSize: 12.5,
              color: "var(--cg-accent)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {fieldValue(action, "Scope")}
            <ChevronRight size={12} />
          </button>
        </IconRow>

        <IconRow label="Lifecycle">{fieldValue(action, "Lifecycle")}</IconRow>

        <IconRow label="Execution">
          <ExecutionChips action={action} />
        </IconRow>

        {/*
         * Approvals required, as a link rather than a count.
         *
         * The number alone raises the question it cannot answer — WHICH
         * approvals, and who owes them. Sending the reader to the pane that
         * holds the requests is the only useful thing a count can do here.
         */}
        <IconRow label="Approvals required">
          <button
            type="button"
            onClick={onOpenApprovals}
            title="Open the Approvals pane"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "none",
              border: "none",
              padding: 0,
              fontFamily: APP_FONT,
              fontSize: 12.5,
              color: "var(--cg-accent)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {gatedCount} of {plan.length} phase
            {plan.length === 1 ? "" : "s"} gated · {action.approvals} approved
            <ChevronRight size={12} />
          </button>
        </IconRow>

        {/*
         * Control coverage, not the internal gate name.
         *
         * "standard-change@2.6" is a platform implementation detail; the
         * control IDs are what an auditor, a ticket and a compliance report all
         * ask for. ATT&CK and D3FEND stay visibly distinct — one is the
         * technique the weakness exposes, the other the countermeasure this fix
         * implements, and collapsing them is the usual way products overstate
         * their MITRE coverage.
         */}
        <IconRow label="Controls">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 5,
            }}
          >
            {attack.map((t) => (
              <ControlTag
                key={t.technique}
                framework="MITRE ATT&CK"
                ref={t.technique}
                title={`${t.techniqueName} — ${t.tactic}`}
              />
            ))}
            {defend.map((d) => (
              <ControlTag
                key={d.id}
                framework="MITRE D3FEND"
                ref={d.id}
                title={`${d.name} — counters ${d.counters}`}
              />
            ))}
            {controls.map((c) => (
              <ControlTag
                key={c.id}
                framework="NIST SP 800-53"
                ref={c.id}
                title={`${c.title} — CSF ${c.csf}`}
              />
            ))}
            {frameworks.map((f) => (
              <ControlTag
                key={f.id}
                framework={f.short}
                ref={f.ref}
                title={`${f.name} — ${f.requirement}`}
              />
            ))}
          </span>
        </IconRow>

        {/* Location — each part with its own mark. Provider and region are
            recognised far faster by logo and flag than by reading a slug. */}
        <IconRow
          label="Provider"
          icon={
            PROVIDER_SLUG[loc.provider] ? (
              <SvgIcon
                slug={PROVIDER_SLUG[loc.provider]}
                size={14}
                useBrandColor
              />
            ) : undefined
          }
        >
          {loc.provider}
        </IconRow>
        <IconRow label="Account" icon={<Building2 size={13} />}>
          {loc.account}
        </IconRow>
        <IconRow
          label="Region"
          icon={<CountryFlag code={country} width={15} />}
        >
          {loc.region}
          {country && (
            <span style={{ color: "var(--cg-text-muted)" }}>· {country}</span>
          )}
        </IconRow>
        <IconRow
          label="Environment"
          icon={<GitBranch size={13} color={ENV_COLOR[loc.environment]} />}
        >
          {loc.environment}
        </IconRow>
        <IconRow
          label="Target resource"
          icon={<ResourceIcon kind={action.resource.split("-")[0]} size={13} />}
        >
          <span
            style={{
              ...({ fontFamily: MONO } as React.CSSProperties),
              fontSize: 11.5,
              wordBreak: "break-all",
            }}
          >
            {loc.path}
          </span>
        </IconRow>
      </Section>

      <Section
        title="Description"
        count={paragraphs.length}
        open
        copyText={() => paragraphs.join("\n\n")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {paragraphs.map((t) => (
            <p
              key={t.slice(0, 40)}
              style={{
                margin: 0,
                fontSize: 12.5,
                lineHeight: 1.65,
                color: "var(--cg-text-primary)",
                maxWidth: "72ch",
              }}
            >
              {t}
            </p>
          ))}
        </div>
      </Section>

      <Section
        title="Remediation plan"
        count={plan.length}
        open
        copyText={planText}
      >
        <PlanList action={action} onOpenTask={onOpenTask} />
      </Section>
    </>
  );
}

export function RemediationActionView({
  action,
  onBack,
}: {
  action: RemediationAction;
  onBack: () => void;
}) {
  const [view, setView] = React.useState("overview");
  /** Header completeness line reads from the same plan the Overview renders. */
  const plan = React.useMemo(() => buildPlan(action), [action]);

  /**
   * Overview drill-downs.
   *
   * Scope and task detail are DRILL-DOWNS of Overview, not rail destinations —
   * each is a property of the summary rather than a facet of the record, and
   * giving them rail entries would imply they sit alongside Lifecycle and
   * Audit. Both return to Overview by their own back control.
   */
  const [sub, setSub] = React.useState<
    | null
    | { kind: "scope" }
    | { kind: "task"; phase: string; phaseLabel: string; label: string }
    // Findings and assets are different objects and open different panels.
    // They cross-reference each other, so the drill-down is a small stack
    // rather than a single slot — walking finding → asset → its other findings
    // must be able to come back the way it went in.
    | { kind: "field"; stageIndex: number; field: string }
    | { kind: "finding"; finding: LinkedFinding }
    | { kind: "asset"; asset: LinkedAsset; from?: LinkedFinding }
    | { kind: "evidence"; record: EvidenceRecord }
    | { kind: "audit"; entry: AuditChange }
    | { kind: "ticket"; ticket: LinkedTicket }
    | { kind: "undo"; entry: UndoEntry }
  >(null);

  // Changing rail section abandons any drill-down — returning to Overview
  // later should show Overview, not whatever task was open three views ago.
  React.useEffect(() => setSub(null), [view]);
  const [save, setSave] = React.useState<"idle" | "saved" | "error">("idle");
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!msg) return undefined;
    const t = window.setTimeout(() => setMsg(null), 6000);
    return () => window.clearTimeout(t);
  }, [msg]);

  /**
   * The rail, flattened from the structure.
   *
   * Lifecycle contributes a non-selectable heading plus its ten stages at
   * depth 1 — selecting "Lifecycle" itself would open a pane whose entire
   * content is already listed directly beneath it.
   */
  /**
   * A flat rail of the seven views.
   *
   * The ten Lifecycle stages used to sit here as their own destinations. They
   * are gone: the timeline already IS the navigation for a sequence, and
   * duplicating it in the rail cost half the rail's height to reach content the
   * pane shows in one scroll. Moving between views is now the pager below,
   * which is one control instead of seventeen.
   */
  const sections: RailSection[] = React.useMemo(() => {
    // A heading is emitted whenever the group changes, so the separators come
    // from the structure rather than from a second list that has to be kept in
    // step with it — reorder a view there and the rail regroups itself.
    const out: RailSection[] = [];
    let group: string | null = null;
    REMEDIATION_VIEWS.forEach((v) => {
      if (v.group !== group) {
        group = v.group;
        out.push({ id: `group-${v.group}`, label: v.group, heading: true });
      }
      out.push({ id: v.id, label: v.label, icon: VIEW_ICON[v.id] });
    });
    return out;
  }, []);

  const onExport = () => {
    const r = exportAction(action);
    setMsg(r.ok ? `Exported to ${r.filename}` : `Export failed — ${r.error}`);
  };

  return (
    <div style={{ height: "100%", minHeight: 0, fontFamily: APP_FONT }}>
      <GridPalette />
      <SideRailPanel
        /*
         * The whole header stack is passed as `title`, with `subtitle` unused.
         *
         * `subtitle` renders as a sibling of the title, which puts it under the
         * severity gauge rather than under the NAME — so the identity line and
         * the status started one glyph-width left of the thing they describe.
         * Nesting them inside the title's text column aligns all three on the
         * name's left edge, which is the line the eye tracks.
         */
        title={
          <div style={{ minWidth: 0 }}>
            {/* Back sits above the title, not among the verbs on the right:
                it is navigation out of the record, not an action on it. */}
            <button
              type="button"
              className="cg-report-action"
              onClick={onBack}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 22,
                padding: "0 7px",
                marginBottom: 8,
                fontSize: 11.5,
                fontWeight: 400,
                fontFamily: APP_FONT,
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={12} /> Actions
            </button>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span
                style={{ display: "inline-flex", paddingTop: 2, flexShrink: 0 }}
              >
                <SeverityGauge severity={action.severity} size={16} />
              </span>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}
                >
                  {action.title}
                </div>

                <div
                  style={{
                    marginTop: 3,
                    fontSize: 11.5,
                    fontWeight: 400,
                    color: "var(--cg-text-muted)",
                  }}
                >
                  {action.id} · {action.resource} · {action.provider} ·{" "}
                  {action.region} · {action.environment} · {action.team} · stage{" "}
                  {action.stage} of 10
                </div>

                <div
                  style={{
                    marginTop: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11.5,
                    fontWeight: 400,
                  }}
                >
                  <span
                    style={{
                      color: "var(--cg-text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {action.status}
                  </span>
                  <span style={{ color: "var(--cg-text-muted)" }}>
                    {plan.filter((ph) => ph.tasks.every((t) => t.done)).length}{" "}
                    of {plan.length} phases complete
                  </span>
                </div>
              </div>
            </div>
          </div>
        }
        sections={sections}
        active={view}
        onSelect={setView}
        background="var(--cg-bg-page)"
        actions={
          <>
            <button
              type="button"
              className="cg-report-action"
              style={btn}
              onClick={onExport}
            >
              <FileJson size={12} /> Export
            </button>
            <button
              type="button"
              className={`cg-report-action ${
                save === "error"
                  ? "cg-report-action-danger"
                  : "cg-report-action-primary"
              }`}
              style={btn}
              onClick={() => setSave("saved")}
            >
              {save === "saved" ? <Check size={12} /> : <Save size={12} />}
              {save === "saved" ? "Saved" : "Save to reports"}
            </button>
          </>
        }
        footer={
          <span
            style={{
              marginRight: "auto",
              alignSelf: "center",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontSize: 11,
              color: "var(--cg-text-muted)",
            }}
          >
            {save === "saved" ? "Saved to reports" : "Unsaved report"}
            {msg && (
              <span style={{ color: "var(--cg-text-primary)" }}>{msg}</span>
            )}
          </span>
        }
      >
        {/* One pane per rail entry. Each is bespoke because none of these is a
            uniform field list — prose and checklists, gated requests, a stage
            timeline, hash-chained tables. */}
        {view === "overview" && sub?.kind === "scope" && (
          <ScopeAssetsView
            key="scope"
            action={action}
            onBack={() => setSub(null)}
          />
        )}
        {view === "overview" && sub?.kind === "task" && (
          <RemediationTaskView
            key={`${sub.phase}:${sub.label}`}
            action={action}
            phase={sub.phase}
            phaseLabel={sub.phaseLabel}
            taskLabel={sub.label}
            taskIdentifier={taskId(action.id, sub.phase, sub.label)}
            onBack={() => setSub(null)}
          />
        )}
        {view === "overview" && !sub && (
          <OverviewPane
            action={action}
            onOpenScope={() => setSub({ kind: "scope" })}
            onOpenTask={(phase, phaseLabel, label) =>
              setSub({ kind: "task", phase, phaseLabel, label })
            }
            onOpenApprovals={() => setView("approvals")}
          />
        )}
        {view === "related-findings" && sub?.kind === "finding" && (
          <FindingPanel
            // Keyed by the node so a sibling navigation REMOUNTS rather than
            // updating in place — without it the entrance animation runs once
            // and every later drill-down is silent.
            key={sub.finding.id}
            action={action}
            finding={sub.finding}
            trail={[{ label: "Findings", onClick: () => setSub(null) }]}
            onOpenAsset={(asset) =>
              setSub({ kind: "asset", asset, from: sub.finding })
            }
          />
        )}
        {view === "related-findings" && sub?.kind === "asset" && (
          <AssetPanel
            key={sub.asset.id}
            action={action}
            asset={sub.asset}
            // The full path, so three levels in the reader can jump to the
            // table directly instead of pressing back twice. The arrow still
            // goes up exactly one — to the finding when there is one.
            trail={[
              { label: "Findings", onClick: () => setSub(null) },
              ...((from) =>
                from
                  ? [
                      {
                        label: from.id,
                        onClick: () =>
                          setSub({ kind: "finding", finding: from }),
                      },
                    ]
                  : [])(sub.from),
            ]}
            onOpenFinding={(finding) => setSub({ kind: "finding", finding })}
            onOpenInventory={openInventory}
          />
        )}
        {view === "related-findings" && !sub && (
          <RelatedFindingsPane
            action={action}
            onOpenFinding={(finding) => setSub({ kind: "finding", finding })}
          />
        )}
        {view === "lifecycle" && sub?.kind === "field" && (
          <StageFieldView
            key={`${sub.stageIndex}:${sub.field}`}
            action={action}
            stageIndex={sub.stageIndex}
            field={sub.field}
            onBack={() => setSub(null)}
          />
        )}
        {view === "lifecycle" && !sub && (
          <LifecyclePane
            action={action}
            onOpenField={(stageIndex, field) =>
              setSub({ kind: "field", stageIndex, field })
            }
          />
        )}
        {view === "approvals" && <ApprovalsPane action={action} />}
        {view === "simulation-results" && (
          <SimulationPane
            action={action}
            // The rollback plan is generated by the Lifecycle stage that owns
            // it, so this hands off rather than growing a second copy here.
            onOpenRollback={() => setView("rollback")}
          />
        )}
        {view === "rollback" && sub?.kind === "undo" && (
          <UndoEntryView
            key={sub.entry.entryId}
            entry={sub.entry}
            onBack={() => setSub(null)}
          />
        )}
        {view === "rollback" && !sub && (
          <RollbackPane
            action={action}
            onOpenEntry={(entry) => setSub({ kind: "undo", entry })}
          />
        )}
        {view === "tickets" && sub?.kind === "ticket" && (
          <TicketView
            key={sub.ticket.key}
            ticket={sub.ticket}
            onBack={() => setSub(null)}
          />
        )}
        {view === "tickets" && !sub && (
          <TicketsPane
            action={action}
            onOpenTicket={(ticket) => setSub({ kind: "ticket", ticket })}
          />
        )}
        {view === "evidence" && sub?.kind === "evidence" && (
          <EvidenceRecordView
            key={sub.record.id}
            action={action}
            record={sub.record}
            onBack={() => setSub(null)}
          />
        )}
        {view === "evidence" && !sub && (
          <EvidencePane
            action={action}
            onOpenRecord={(record) => setSub({ kind: "evidence", record })}
          />
        )}
        {view === "audit" && sub?.kind === "audit" && (
          <AuditEntryView
            key={sub.entry.index}
            entry={sub.entry}
            onBack={() => setSub(null)}
          />
        )}
        {view === "audit" && !sub && (
          <AuditPane
            action={action}
            onOpenEntry={(entry) => setSub({ kind: "audit", entry })}
          />
        )}
      </SideRailPanel>
    </div>
  );
}

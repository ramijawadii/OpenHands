/* eslint-disable i18next/no-literal-string -- remediation record */
import React from "react";
import {
  Activity,
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileJson,
  Eye,
  FileSearch,
  GitBranch,
  Layers,
  LayoutGrid,
  Lock,
  Pencil,
  Save,
  ShieldCheck,
  Terminal,
  TriangleAlert,
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
import { FilterSelect } from "#/components/features/explore/cloudguard-grid/FilterSelect";
import {
  buildApprovals,
  buildPlan,
  describeAction,
  fieldValue,
  locationOf,
  type ApprovalState,
  type PhaseAuthorization,
  type RemediationAction,
} from "./remediation-data";
import { exportAction } from "./remediation-export";
import {
  buildAttack,
  buildControls,
  buildDefend,
  buildFrameworks,
} from "./remediation-detail-data";
import { CATEGORY_TONE, strategiesIn } from "./remediation-strategy";
import { phaseId, strategyFor, taskId } from "./remediation-task-data";
import { RemediationTaskView } from "./RemediationTaskView";
import { ScopeAssetsView } from "./ScopeAssetsView";
import {
  ActivityPane,
  AuditPane,
  EvidencePane,
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
  "related-findings": <FileSearch size={13} />,
  lifecycle: <Workflow size={13} />,
  approvals: <ShieldCheck size={13} />,
  activity: <Activity size={13} />,
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

/** Label → value row. Matches `ResourceReport`'s row rhythm exactly. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "7px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
        fontSize: 12.5,
      }}
    >
      <span
        style={{
          width: 210,
          flexShrink: 0,
          color: "var(--cg-text-muted)",
        }}
      >
        {label}
      </span>
      <span style={{ color: "var(--cg-text-primary)", minWidth: 0 }}>
        {value}
      </span>
    </div>
  );
}

/**
 * Collapsible section with a hover-revealed copy control.
 *
 * The button appears on hover/focus rather than sitting there permanently: six
 * always-visible copy icons compete with the content for attention, and the
 * affordance is only wanted at the moment someone reaches for it. It stays
 * reachable by keyboard because `:focus-within` reveals it too — a hover-only
 * control is invisible to anyone not using a pointer.
 *
 * `copyText` is a callback rather than scraped `innerText`: scraping would
 * capture chevrons, counts and button labels, so what reached the clipboard
 * would not be what the reader believed they copied.
 */
function Section({
  title,
  count,
  open: initial,
  copyText,
  children,
}: {
  title: string;
  count: number;
  open?: boolean;
  copyText?: () => string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(Boolean(initial));
  const [copied, setCopied] = React.useState(false);

  return (
    <section
      className="cg-sec"
      style={{ borderBottom: "1px solid var(--cg-border-subtle)" }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 0,
            padding: "12px 2px",
            background: "none",
            border: "none",
            color: "var(--cg-text-primary)",
            fontSize: 13.5,
            fontWeight: 600,
            fontFamily: APP_FONT,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {title}
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11.5,
              color: "var(--cg-text-muted)",
            }}
          >
            {count}
          </span>
        </button>
        {copyText && (
          <button
            type="button"
            className="cg-sec-copy"
            aria-label={`Copy ${title}`}
            title={`Copy ${title}`}
            onClick={() => {
              navigator.clipboard?.writeText(copyText());
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginLeft: 8,
              padding: "3px 7px",
              background: "none",
              border: "1px solid var(--cg-border-subtle)",
              borderRadius: 4,
              color: copied ? "var(--cgx-low)" : "var(--cg-text-muted)",
              fontSize: 10.5,
              fontFamily: APP_FONT,
              cursor: "pointer",
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      {open && <div style={{ padding: "0 2px 16px 22px" }}>{children}</div>}
    </section>
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

/** Read vs Write, stated plainly — it is the reason the gate exists. */
function AccessTag({ value }: { value: "Read" | "Write" }) {
  const write = value === "Write";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 7px",
        fontSize: 10.5,
        lineHeight: "17px",
        borderRadius: 3,
        border: `1px solid ${write ? "var(--cgx-high)" : "var(--cg-border)"}`,
        color: write ? "var(--cgx-high)" : "var(--cg-text-muted)",
        whiteSpace: "nowrap",
      }}
    >
      {write ? <Pencil size={9} /> : <Eye size={9} />}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--cg-text-primary)",
                }}
              >
                {p.label}
              </span>
              <AccessTag value={p.access} />
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
              <span
                style={{
                  fontSize: 11,
                  color: "var(--cg-text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {done}/{total}
              </span>
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 7,
                paddingTop: 7,
                borderTop: "1px solid var(--cg-border-subtle)",
              }}
            >
              <AuthTag value={p.authorization} />
              <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
                {p.reason}
              </span>
            </div>
          </TimelineItem>
        );
      })}
    </div>
  );
}

/** Small labelled fact inside an approval card. */
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          color: "var(--cg-text-muted)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12, color: "var(--cg-text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

/** One tone per approval state, shared by the tag and the timeline marker. */
const STATE_TONE: Record<ApprovalState, string> = {
  Approved: "var(--cgx-low)",
  "Awaiting approval": "var(--cgx-high)",
  Escalated: "var(--cgx-critical)",
  "Not required": "var(--cg-text-muted)",
};

function StateTag({ value }: { value: ApprovalState }) {
  const tone: Record<ApprovalState, [string, string]> = {
    Approved: ["var(--cgx-low)", "transparent"],
    "Awaiting approval": ["var(--cgx-high)", "var(--cg-accent-bg)"],
    Escalated: ["var(--cgx-critical)", "var(--cg-danger-bg)"],
    "Not required": ["var(--cg-text-muted)", "transparent"],
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
      {value === "Escalated" ? <TriangleAlert size={9} /> : null}
      {value}
    </span>
  );
}

function slaLabel(hours: number): { text: string; overdue: boolean } {
  if (hours < 0) return { text: `${Math.abs(hours)}h overdue`, overdue: true };
  return { text: `${hours}h remaining`, overdue: false };
}

/**
 * Approvals — the same gates the plan shows, from the approver's side.
 *
 * Each card names the plan phase it gates, so the two panes are visibly one
 * workflow: the plan says "this phase needs approval", this pane says who owes
 * that decision, by when, and over what. Everything shown here is what an
 * approver needs in order to say yes without opening another tab — the access
 * level, the exact target, what else is in range, and whether it can be undone.
 */
type Decision = { verdict: "Approved" | "Rejected"; why: string };

function ApprovalsPane({ action }: { action: RemediationAction }) {
  const all = React.useMemo(() => buildApprovals(action), [action]);
  const [state, setState] = React.useState("All");
  const [approver, setApprover] = React.useState("All");
  const [sla, setSla] = React.useState("All");

  /**
   * Decisions taken in this session.
   *
   * Local only — there is no decision endpoint yet. The controls are built to
   * the plan (SoD, mandatory justification, staleness blocking) so the workflow
   * is reviewable, and each decision is labelled `not persisted` rather than
   * pretending to have granted something.
   */
  const [decisions, setDecisions] = React.useState<Record<string, Decision>>(
    {},
  );
  const [drafting, setDrafting] = React.useState<string | null>(null);
  const [why, setWhy] = React.useState("");

  /**
   * Separation of duties, checked at the point of click.
   *
   * The console operator is the acting identity. They may not approve work they
   * authored, and the agent can never approve at all — it is a permanent
   * proposer. A gate that is documented but not enforced is not a gate.
   */
  const actingUser = action.owner;
  const sodBlocked = (requestedByEmail: string) =>
    requestedByEmail.startsWith(`${actingUser}@`);

  const rows = all.filter(
    (r) =>
      (state === "All" || r.state === state) &&
      (approver === "All" ||
        r.approver.email === approver ||
        r.escalatedTo?.email === approver) &&
      (sla === "All" ||
        (sla === "Overdue" && r.slaHoursRemaining < 0) ||
        (sla === "Due within 24h" &&
          r.slaHoursRemaining >= 0 &&
          r.slaHoursRemaining <= 24) ||
        (sla === "Later" && r.slaHoursRemaining > 24)),
  );

  const approvers = [
    { value: "All", label: "All approvers" },
    ...[
      ...new Map(
        all
          .flatMap((r) => [r.approver, r.escalatedTo])
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
          .map((p) => [p.email, p]),
      ).values(),
    ].map((p) => ({ value: p.email, label: `${p.name} · ${p.email}` })),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
        }}
      >
        <FilterSelect
          variant="tab"
          label="State"
          value={state}
          onChange={setState}
          options={[
            { value: "All", label: "All requests" },
            { value: "Approved", label: "Approved" },
            { value: "Awaiting approval", label: "Awaiting approval" },
            { value: "Escalated", label: "Escalated" },
            { value: "Not required", label: "Not required" },
          ]}
        />
        <FilterSelect
          variant="tab"
          label="Approver"
          value={approver}
          onChange={setApprover}
          options={approvers}
        />
        <FilterSelect
          variant="tab"
          label="SLA"
          value={sla}
          onChange={setSla}
          options={[
            { value: "All", label: "Any SLA" },
            { value: "Overdue", label: "Overdue" },
            { value: "Due within 24h", label: "Due within 24h" },
            { value: "Later", label: "Later" },
          ]}
        />
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11.5,
            color: "var(--cg-text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {rows.length} of {all.length}
        </span>
      </div>

      {rows.length === 0 && (
        <div
          style={{
            padding: "18px 4px",
            fontSize: 12,
            color: "var(--cg-text-muted)",
          }}
        >
          No approval requests match these filters.
        </div>
      )}

      {rows.map((r, idx) => {
        const s = slaLabel(r.slaHoursRemaining);
        const decided = decisions[r.id];
        // Demo staleness signal: a real build compares the approval's recorded
        // environment fingerprint against the live one (plan §1.3).
        const stale = r.state !== "Approved" && r.slaHoursRemaining < -24;
        const blocked = sodBlocked(r.requestedBy.email);
        const needsWhy =
          r.blastRadius.rating === "Elevated" ||
          r.blastRadius.rating === "High";
        const needsDecision =
          !decided &&
          (r.state === "Awaiting approval" || r.state === "Escalated");
        return (
          <TimelineItem
            key={r.id}
            mark={
              <TimelineDot
                tone={STATE_TONE[r.state]}
                filled={r.state === "Approved"}
              />
            }
            last={idx === rows.length - 1}
            done={r.state === "Approved"}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                {/* The join to the plan is the FIRST thing on the card. */}
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--cg-text-primary)",
                  }}
                >
                  {r.phaseLabel}
                </span>
                <AccessTag value={r.access} />
                <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: s.overdue
                        ? "var(--cgx-critical)"
                        : "var(--cg-text-muted)",
                      fontWeight: s.overdue ? 600 : 400,
                      alignSelf: "center",
                    }}
                  >
                    SLA {s.text}
                  </span>
                  <StateTag value={r.state} />
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))",
                  gap: 12,
                }}
              >
                <Fact
                  label="Target resource"
                  value={
                    <span
                      style={{
                        fontFamily: "var(--font-mono, ui-monospace, monospace)",
                        fontSize: 11,
                        wordBreak: "break-all",
                      }}
                    >
                      {r.targetPath}
                    </span>
                  }
                />
                <Fact
                  label="Blast radius"
                  value={
                    <>
                      {r.blastRadius.rating} — {r.blastRadius.resources}{" "}
                      resource(s), {r.blastRadius.identities} identity(ies),{" "}
                      {r.blastRadius.services} service(s)
                      <div
                        style={{ color: "var(--cg-text-muted)", fontSize: 11 }}
                      >
                        {r.blastRadius.reachability}
                      </div>
                    </>
                  }
                />
                <Fact
                  label="Rollback"
                  value={
                    <>
                      {r.rollback.method}
                      <div
                        style={{ color: "var(--cg-text-muted)", fontSize: 11 }}
                      >
                        {r.rollback.window} · {r.rollback.confidence}
                      </div>
                    </>
                  }
                />
                <Fact
                  label="Approver"
                  value={
                    <>
                      {r.approver.name}
                      <div
                        style={{ color: "var(--cg-text-muted)", fontSize: 11 }}
                      >
                        {r.approver.email} · {r.approver.role}
                      </div>
                    </>
                  }
                />
                {r.escalatedTo && (
                  <Fact
                    label="Escalated to"
                    value={
                      <>
                        {r.escalatedTo.name}
                        <div
                          style={{
                            color: "var(--cg-text-muted)",
                            fontSize: 11,
                          }}
                        >
                          {r.escalatedTo.email}
                        </div>
                      </>
                    }
                  />
                )}
                <Fact
                  label={r.decidedAt ? "Decided" : "Due"}
                  value={(r.decidedAt ?? r.slaDueAt)
                    .toISOString()
                    .replace("T", " ")
                    .slice(0, 16)}
                />
                <Fact
                  label="Policy"
                  value={
                    <>
                      {r.access === "Write"
                        ? `gate-${action.environment}@2.4`
                        : "read-auto@1.1"}
                      <div
                        style={{ color: "var(--cg-text-muted)", fontSize: 11 }}
                      >
                        Quorum {action.approvals}
                      </div>
                    </>
                  }
                />
              </div>

              {/*
               * Decision controls.
               *
               * Plan §6. Everything that makes the gate real is enforced here:
               * a stale simulation cannot be consumed, an author cannot approve
               * their own work, and an Elevated-or-worse blast radius demands a
               * written justification before Approve becomes available.
               */}
              {needsDecision && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: "1px solid var(--cg-border-subtle)",
                  }}
                >
                  {stale && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 8,
                        fontSize: 11.5,
                        color: "var(--cgx-critical)",
                      }}
                    >
                      <TriangleAlert size={12} />
                      Stale — the target changed since this simulation ran.
                      Re-simulate before approving.
                    </div>
                  )}
                  {blocked && !stale && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 8,
                        fontSize: 11.5,
                        color: "var(--cgx-high)",
                      }}
                    >
                      <Lock size={12} />
                      You raised this change — separation of duties requires a
                      different approver.
                    </div>
                  )}

                  {needsWhy && drafting === r.id && (
                    <textarea
                      value={why}
                      onChange={(e) => setWhy(e.target.value)}
                      placeholder="Justification required — blast radius is Elevated or higher"
                      rows={2}
                      style={{
                        width: "100%",
                        marginBottom: 8,
                        padding: "6px 8px",
                        fontSize: 12,
                        fontFamily: APP_FONT,
                        background: "var(--cg-input-bg)",
                        color: "var(--cg-text-primary)",
                        border: "1px solid var(--cg-input-border)",
                        borderRadius: 4,
                        resize: "vertical",
                      }}
                    />
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      className="cg-report-action cg-report-action-primary"
                      style={btn}
                      disabled={stale || blocked || (needsWhy && !why.trim())}
                      onClick={() => {
                        if (needsWhy && drafting !== r.id) {
                          setDrafting(r.id);
                          return;
                        }
                        setDecisions((d) => ({
                          ...d,
                          [r.id]: { verdict: "Approved", why: why.trim() },
                        }));
                        setDrafting(null);
                        setWhy("");
                      }}
                    >
                      <Check size={12} /> Approve
                    </button>
                    <button
                      type="button"
                      className="cg-report-action"
                      style={btn}
                      disabled={blocked}
                      onClick={() =>
                        setDecisions((d) => ({
                          ...d,
                          [r.id]: { verdict: "Rejected", why: why.trim() },
                        }))
                      }
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="cg-report-action"
                      style={btn}
                    >
                      Request changes
                    </button>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--cg-text-muted)",
                        marginLeft: "auto",
                      }}
                    >
                      Acting as {actingUser}
                      {needsWhy ? " · justification required" : ""}
                    </span>
                  </div>
                </div>
              )}

              {decided && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 9,
                    borderTop: "1px solid var(--cg-border-subtle)",
                    fontSize: 11.5,
                    color: "var(--cg-text-muted)",
                  }}
                >
                  <strong
                    style={{
                      color:
                        decided.verdict === "Approved"
                          ? "var(--cgx-low)"
                          : "var(--cgx-critical)",
                    }}
                  >
                    {decided.verdict}
                  </strong>{" "}
                  by {actingUser} in this session — not persisted (no decision
                  endpoint yet).
                  {decided.why && <div>Justification: {decided.why}</div>}
                </div>
              )}
            </div>
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

/**
 * A value, optionally preceded by its own mark.
 *
 * Every row starts at the SAME left edge whether or not it has an icon — a
 * reserved-but-empty slot indented the text-only rows away from the icon rows
 * and broke the column's left edge, which is the line the eye actually tracks
 * down a summary. Rows that do carry a mark size it identically, so the marks
 * form their own column without pushing their text out of line with each other.
 */
const ICON_SLOT = 18;

function IconRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Row
      label={label}
      value={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {icon && (
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: ICON_SLOT,
                flexShrink: 0,
              }}
            >
              {icon}
            </span>
          )}
          {children}
        </span>
      }
    />
  );
}

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
  const sections: RailSection[] = React.useMemo(
    () =>
      REMEDIATION_VIEWS.map((v) => ({
        id: v.id,
        label: v.label,
        icon: VIEW_ICON[v.id],
      })),
    [],
  );

  /** Pager position — the rail order is the reading order. */
  const viewIndex = REMEDIATION_VIEWS.findIndex((v) => v.id === view);
  const goTo = (delta: number) => {
    const next = REMEDIATION_VIEWS[viewIndex + delta];
    if (next) setView(next.id);
  };
  const prevView = REMEDIATION_VIEWS[viewIndex - 1];
  const nextView = REMEDIATION_VIEWS[viewIndex + 1];

  const onExport = () => {
    const r = exportAction(action);
    setMsg(r.ok ? `Exported to ${r.filename}` : `Export failed — ${r.error}`);
  };

  return (
    <div style={{ height: "100%", minHeight: 0, fontFamily: APP_FONT }}>
      <GridPalette />
      <SideRailPanel
        title={
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <SeverityGauge severity={action.severity} size={16} />
            {action.title}
          </span>
        }
        subtitle={
          <>
            {action.id} · {action.resource} · {action.provider} ·{" "}
            {action.region} · {action.environment} · {action.team} · stage{" "}
            {action.stage} of 10 ·{" "}
            <span style={{ color: "var(--cg-text-primary)", fontWeight: 600 }}>
              {action.status}
            </span>
          </>
        }
        sections={sections}
        active={view}
        onSelect={setView}
        background="var(--cg-bg-page)"
        actions={
          <>
            {/*
             * Section pager. Sits first and is separated by a rule, so it reads
             * as navigation rather than as another verb alongside Save/Export.
             * Each arrow names its destination in the tooltip — an unlabelled
             * arrow makes the operator click to find out where it goes.
             */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                paddingRight: 8,
                marginRight: 2,
                borderRight: "1px solid var(--cg-border-subtle)",
              }}
            >
              <button
                type="button"
                className="cg-report-action"
                style={{ ...btn, padding: "0 7px" }}
                disabled={!prevView}
                aria-label={
                  prevView
                    ? `Previous section — ${prevView.label}`
                    : "Previous section"
                }
                title={prevView ? `Previous — ${prevView.label}` : undefined}
                onClick={() => goTo(-1)}
              >
                <ChevronLeft size={14} />
              </button>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--cg-text-muted)",
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 34,
                  textAlign: "center",
                }}
              >
                {viewIndex + 1}/{REMEDIATION_VIEWS.length}
              </span>
              <button
                type="button"
                className="cg-report-action"
                style={{ ...btn, padding: "0 7px" }}
                disabled={!nextView}
                aria-label={
                  nextView ? `Next section — ${nextView.label}` : "Next section"
                }
                title={nextView ? `Next — ${nextView.label}` : undefined}
                onClick={() => goTo(1)}
              >
                <ChevronRight size={14} />
              </button>
            </span>

            <button
              type="button"
              className="cg-report-action"
              style={btn}
              onClick={onBack}
            >
              <ArrowLeft size={12} /> Actions
            </button>
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
          <ScopeAssetsView action={action} onBack={() => setSub(null)} />
        )}
        {view === "overview" && sub?.kind === "task" && (
          <RemediationTaskView
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
        {view === "related-findings" && <RelatedFindingsPane action={action} />}
        {view === "lifecycle" && <LifecyclePane action={action} />}
        {view === "approvals" && <ApprovalsPane action={action} />}
        {view === "activity" && <ActivityPane action={action} />}
        {view === "evidence" && <EvidencePane action={action} />}
        {view === "audit" && <AuditPane action={action} />}
      </SideRailPanel>
    </div>
  );
}

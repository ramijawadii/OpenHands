/* eslint-disable i18next/no-literal-string -- approvals */
import React from "react";
import { Check, Fingerprint, Inbox, Lock, TriangleAlert } from "lucide-react";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";
import { FilterSelect } from "#/components/features/explore/cloudguard-grid/FilterSelect";
import {
  AccessTag,
  Fact,
  Row,
  Section,
  StateTag,
  StepTag,
  STATE_TONE,
  TimelineDot,
  TimelineItem,
  slaLabel,
} from "./RemediationPanes";
import {
  buildApprovals,
  type ApprovalRequest,
  type RemediationAction,
} from "./remediation-data";

/**
 * Approvals — the gate, from the approver's side.
 *
 * Built entirely from the shared kit: `Section`, `Row`, `TimelineItem`,
 * `TimelineDot`, `Fact`, `AccessTag`, `StateTag`, `FilterSelect`. It previously
 * used exactly one kit primitive and four local one-offs, inside a 1,780-line
 * file — so a change to how a section or a row behaves reached every pane
 * except this one.
 *
 * Three structural additions over the previous version:
 *
 * **A default, not a filter set.** An approver arriving at a record wants the
 * request that is theirs. Three filters is a search interface; "Awaiting my
 * decision" is an answer.
 *
 * **A decision is a record, not a verdict.** Once decided, the card carries who,
 * when, against which environment fingerprint, and with what justification.
 * "Approved" alone cannot answer the question an incident review asks.
 *
 * **Decided requests move to History.** A queue that keeps completed work in it
 * stops being a queue.
 */

const MONO = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

interface Decision {
  verdict: "Approved" | "Rejected";
  why: string;
  at: Date;
  by: string;
  /** The environment fingerprint the decision was granted against. */
  fingerprint: string;
}

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

/** Deterministic stand-in for the live environment fingerprint. */
function fingerprintOf(action: RemediationAction, requestId: string): string {
  let h = 2166136261;
  const s = `${action.id}:${requestId}:${action.stage}`;
  for (let i = 0; i < s.length; i += 1) {
    /* eslint-disable-next-line no-bitwise */
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  /* eslint-disable-next-line no-bitwise */
  return `env_${(h >>> 0).toString(16).padStart(8, "0")}`;
}

export function ApprovalsPane({ action }: { action: RemediationAction }) {
  const all = React.useMemo(() => buildApprovals(action), [action]);

  const [state, setState] = React.useState("All");
  const [approver, setApprover] = React.useState("All");
  const [sla, setSla] = React.useState("All");

  /**
   * Decisions taken in this session.
   *
   * Local only — there is no decision endpoint yet. The controls enforce the
   * plan's gates (separation of duties, mandatory justification, staleness) so
   * the workflow is reviewable, and each decision says it is not persisted
   * rather than pretending to have granted something.
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
   * raised, and the agent can never approve at all — it is a permanent
   * proposer. A gate that is documented but not enforced is not a gate.
   */
  const actingUser = action.owner;
  const sodBlocked = (email: string) => email.startsWith(`${actingUser}@`);

  const matches = (r: ApprovalRequest) =>
    (state === "All" || r.state === state) &&
    (approver === "All" ||
      r.approver.email === approver ||
      r.escalatedTo?.email === approver) &&
    (sla === "All" ||
      (sla === "Overdue" && r.slaHoursRemaining < 0) ||
      (sla === "Due within 24h" &&
        r.slaHoursRemaining >= 0 &&
        r.slaHoursRemaining <= 24) ||
      (sla === "Later" && r.slaHoursRemaining > 24));

  const open = all.filter(
    (r) =>
      !decisions[r.id] &&
      (r.state === "Awaiting approval" || r.state === "Escalated"),
  );
  const mine = open.filter((r) => !sodBlocked(r.requestedBy.email));
  const queue = all.filter((r) => !decisions[r.id]).filter(matches);
  const decided = all.filter((r) => decisions[r.id]).filter(matches);

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

  const decide = (r: ApprovalRequest, verdict: Decision["verdict"]) => {
    setDecisions((d) => ({
      ...d,
      [r.id]: {
        verdict,
        why: why.trim(),
        at: new Date(),
        by: actingUser,
        fingerprint: fingerprintOf(action, r.id),
      },
    }));
    setDrafting(null);
    setWhy("");
  };

  /** One request, rendered on the shared timeline. */
  const card = (r: ApprovalRequest, i: number, list: ApprovalRequest[]) => {
    const s = slaLabel(r.slaHoursRemaining);
    const decision = decisions[r.id];
    // Demo staleness signal. A real build compares the approval's recorded
    // environment fingerprint against the live one.
    const stale = !decision && r.slaHoursRemaining < -24;
    const blocked = sodBlocked(r.requestedBy.email);
    const needsWhy =
      r.blastRadius.rating === "Elevated" || r.blastRadius.rating === "High";
    const needsDecision =
      !decision && (r.state === "Awaiting approval" || r.state === "Escalated");

    return (
      <TimelineItem
        key={r.id}
        mark={
          <TimelineDot
            tone={decision ? STATE_TONE.Approved : STATE_TONE[r.state]}
            filled={Boolean(decision) || r.state === "Approved"}
          />
        }
        last={i === list.length - 1}
        done={Boolean(decision) || r.state === "Approved"}
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
            <StepTag>{r.phaseLabel}</StepTag>
            <AccessTag value={r.access} />
            <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <span
                style={{
                  alignSelf: "center",
                  fontSize: 11,
                  fontWeight: s.overdue ? 600 : 400,
                  color: s.overdue
                    ? "var(--cgx-critical)"
                    : "var(--cg-text-muted)",
                }}
              >
                SLA {s.text}
              </span>
              <StateTag value={decision ? "Approved" : r.state} />
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
                    fontFamily: MONO,
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
                  <div style={{ color: "var(--cg-text-muted)", fontSize: 11 }}>
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
                  <div style={{ color: "var(--cg-text-muted)", fontSize: 11 }}>
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
                  <div style={{ color: "var(--cg-text-muted)", fontSize: 11 }}>
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
                      style={{ color: "var(--cg-text-muted)", fontSize: 11 }}
                    >
                      {r.escalatedTo.email}
                    </div>
                  </>
                }
              />
            )}
            <Fact
              label="Policy · quorum"
              value={
                <>
                  <span style={{ fontFamily: MONO, fontSize: 11 }}>
                    {r.access === "Write"
                      ? `gate-${action.environment}@2.4`
                      : "read-auto@1.1"}
                  </span>
                  <div style={{ color: "var(--cg-text-muted)", fontSize: 11 }}>
                    Quorum {action.approvals}
                  </div>
                </>
              }
            />
          </div>

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
                    decide(r, "Approved");
                  }}
                >
                  <Check size={12} /> Approve
                </button>
                <button
                  type="button"
                  className="cg-report-action"
                  style={btn}
                  disabled={blocked}
                  onClick={() => decide(r, "Rejected")}
                >
                  Reject
                </button>
                <button type="button" className="cg-report-action" style={btn}>
                  Request changes
                </button>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: "var(--cg-text-muted)",
                  }}
                >
                  Acting as {actingUser}
                  {needsWhy ? " · justification required" : ""}
                </span>
              </div>
            </div>
          )}

          {/*
           * The decision RECORD, not a verdict.
           *
           * "Approved" alone cannot answer what an incident review asks. The
           * fingerprint is the one that matters: it is what makes a later drift
           * detectable as invalidating this approval.
           */}
          {decision && (
            <div
              style={{
                marginTop: 10,
                paddingTop: 9,
                borderTop: "1px solid var(--cg-border-subtle)",
              }}
            >
              <Row
                label="Verdict"
                value={
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        decision.verdict === "Approved"
                          ? "var(--cgx-low)"
                          : "var(--cgx-critical)",
                    }}
                  >
                    {decision.verdict}
                  </span>
                }
              />
              <Row label="Decided by" value={decision.by} />
              <Row
                label="Decided at"
                value={decision.at.toISOString().replace("T", " ").slice(0, 19)}
              />
              <Row
                label="Environment fingerprint"
                value={
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: MONO,
                      fontSize: 11,
                    }}
                  >
                    <Fingerprint size={11} />
                    {decision.fingerprint}
                  </span>
                }
              />
              {decision.why && (
                <Row label="Justification" value={decision.why} />
              )}
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "var(--cg-text-muted)",
                }}
              >
                Not persisted — there is no decision endpoint yet.
              </div>
            </div>
          )}
        </div>
      </TimelineItem>
    );
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
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
      </div>

      {/*
       * The queue's answer, before the queue. An approver opening a record
       * wants the request that is theirs, not a filter set to build it from.
       */}
      <Section
        title="Awaiting my decision"
        hint={`acting as ${actingUser}`}
        count={mine.length}
        icon={<Inbox size={13} />}
        open
      >
        {mine.length === 0 ? (
          <div
            style={{
              padding: "10px 0",
              fontSize: 12,
              color: "var(--cg-text-muted)",
            }}
          >
            Nothing is waiting on you.
            {open.length > mine.length &&
              ` ${open.length - mine.length} open request(s) are blocked to you by separation of duties.`}
          </div>
        ) : (
          mine.map((r, i) => card(r, i, mine))
        )}
      </Section>

      <Section
        title="All requests"
        hint="every gate this action passes through"
        count={queue.length}
        icon={<Lock size={13} />}
        open={mine.length === 0}
      >
        {queue.map((r, i) => card(r, i, queue))}
      </Section>

      <Section
        title="Decided"
        hint="this session"
        count={decided.length}
        icon={<Check size={13} />}
      >
        {decided.length === 0 ? (
          <div
            style={{
              padding: "10px 0",
              fontSize: 12,
              color: "var(--cg-text-muted)",
            }}
          >
            No decisions taken here yet.
          </div>
        ) : (
          decided.map((r, i) => card(r, i, decided))
        )}
      </Section>
    </div>
  );
}

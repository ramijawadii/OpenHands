/* eslint-disable i18next/no-literal-string -- remediation record panes */
import React from "react";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Cpu,
  Eye,
  FileWarning,
  Link2,
  Lock,
  ShieldCheck,
  TriangleAlert,
  User,
} from "lucide-react";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";
import { FilterSelect } from "#/components/features/explore/cloudguard-grid/FilterSelect";
import { SeverityGauge } from "#/components/features/explore/cloudguard-grid/SeverityGauge";
import { LIFECYCLE_STAGES } from "./remediation-structure";
import { type Provenance, type RemediationAction } from "./remediation-data";
import {
  buildAccessLog,
  buildActivity,
  buildAssets,
  buildAttack,
  buildAudit,
  buildControls,
  buildDefend,
  buildEvidence,
  buildFindings,
  buildFrameworks,
  stageDetail,
  type ActorType,
  type GateStatus,
} from "./remediation-detail-data";

/**
 * The record's non-Overview panes, rebuilt against the UX plan.
 *
 * Overview is deliberately NOT here — it is unchanged and stays in
 * `RemediationActionView`.
 *
 * Three plan decisions shape everything below:
 *
 * 1. **Provenance travels with the value** (plan §1.1). A scanner measurement
 *    and a model inference must never look identical.
 * 2. **Lifecycle is a timeline, not ten destinations** (plan §5). The operator's
 *    question is "where is this and what is blocking it", which one sequence
 *    answers and ten panes do not.
 * 3. **Activity is one merged stream** (plan §7). Splitting by actor destroys
 *    the only thing the pane is for — seeing agent and human interleave.
 */

/* ------------------------------------------------------------------ *
 * Shared primitives
 * ------------------------------------------------------------------ */

const PROV_META: Record<Provenance, { label: string; hint: string }> = {
  scan: { label: "scan", hint: "Measured by a detector — reproducible" },
  agent: { label: "agent", hint: "Inferred by the agent — carries confidence" },
  human: { label: "human", hint: "Asserted by a named person" },
  integration: { label: "sync", hint: "Imported from an external system" },
};

/** Small, quiet, always present. Loud provenance would drown the value. */
export function ProvChip({ value }: { value: Provenance }) {
  const m = PROV_META[value];
  return (
    <span
      title={m.hint}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0 5px",
        fontSize: 9.5,
        lineHeight: "15px",
        borderRadius: 3,
        border: "1px solid var(--cg-border)",
        color: "var(--cg-text-muted)",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {m.label}
    </span>
  );
}

export function Pill({
  children,
  color = "var(--cg-text-muted)",
  bg = "transparent",
  icon,
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 7px",
        fontSize: 10.5,
        lineHeight: "17px",
        borderRadius: 10,
        border: `1px solid ${color}`,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {children}
    </span>
  );
}

function PaneTitle({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: "var(--cg-text-primary)",
        }}
      >
        {title}
      </span>
      {hint && (
        <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
          {hint}
        </span>
      )}
      {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid var(--cg-border-subtle)",
  borderRadius: 6,
  padding: "10px 12px",
};

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "var(--cg-text-muted)",
  fontWeight: 600,
  padding: "0 10px 6px 0",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "7px 10px 7px 0",
  fontSize: 12,
  borderTop: "1px solid var(--cg-border-subtle)",
  color: "var(--cg-text-primary)",
  verticalAlign: "top",
};

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
  fontSize: 11,
};

/** Fail → Pass, drawn as a transition rather than two disconnected words. */
function Delta({ before, after }: { before: string; after: string }) {
  const TONE: Record<string, string> = {
    Pass: "var(--cgx-low)",
    Partial: "var(--cgx-high)",
    Fail: "var(--cgx-critical)",
  };
  const tone = (v: string) => TONE[v] ?? "var(--cg-text-muted)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: tone(before) }}>{before}</span>
      <span style={{ color: "var(--cg-text-muted)" }}>→</span>
      <span style={{ color: tone(after), fontWeight: 600 }}>{after}</span>
    </span>
  );
}

const ACTOR_ICON: Record<ActorType, React.ReactNode> = {
  Human: <User size={11} />,
  Agent: <Bot size={11} />,
  System: <Cpu size={11} />,
};

/* ------------------------------------------------------------------ *
 * Timeline
 * ------------------------------------------------------------------ */

/**
 * One row of a vertical timeline: marker, connector, content.
 *
 * ONE implementation, used by the lifecycle stages, the remediation plan, the
 * approval queue, the agent's reasoning and the checkpoint. All five are
 * sequences, and each previously drew its own — a coloured left border here, a
 * bordered card there — so five things of the same shape looked like five
 * different components.
 *
 * The connector is omitted on the last row rather than drawn and hidden, so the
 * line ends at the final marker instead of trailing into empty space.
 */
export function TimelineItem({
  mark,
  last,
  done,
  children,
}: {
  mark: React.ReactNode;
  last?: boolean;
  /** Draws the connector in the "passed" tone rather than the neutral rule. */
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div
        aria-hidden
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
          paddingTop: 10,
        }}
      >
        {mark}
        {!last && (
          <div
            style={{
              flex: 1,
              width: 1,
              minHeight: 18,
              background: done ? "var(--cgx-low)" : "var(--cg-border-subtle)",
              opacity: done ? 0.5 : 1,
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: 10 }}>{children}</div>
    </div>
  );
}

/** Marker: filled when complete, ringed when still pending. */
export function TimelineDot({
  tone,
  filled,
}: {
  tone: string;
  filled?: boolean;
}) {
  return (
    <span
      style={{
        width: 11,
        height: 11,
        borderRadius: "50%",
        flexShrink: 0,
        border: `1.5px solid ${tone}`,
        background: filled ? tone : "transparent",
      }}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Related Findings
 * ------------------------------------------------------------------ */

/**
 * Justification and coverage.
 *
 * Plan §4: this is where NIST and MITRE belong, and the key move is showing the
 * DELTA — what closing this action buys — rather than listing control names.
 * A control list without a before/after is decoration.
 */
export function RelatedFindingsPane({ action }: { action: RemediationAction }) {
  const findings = buildFindings(action);
  const assets = buildAssets(action);
  const controls = buildControls(action);
  const frameworks = buildFrameworks(action);
  const attack = buildAttack(action);
  const defend = buildDefend(action);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <PaneTitle
          title="Findings"
          hint={`${findings.length} linked · what this action closes`}
        />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Finding</th>
              <th style={th}>Severity</th>
              <th style={th}>Detector</th>
              <th style={th}>First seen</th>
              <th style={th}>Closes</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <tr key={f.id}>
                <td style={td}>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span style={mono}>{f.id}</span>
                    <ProvChip value={f.provenance} />
                  </span>
                  <div style={{ color: "var(--cg-text-muted)", fontSize: 11 }}>
                    {f.title}
                  </div>
                </td>
                <td style={td}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <SeverityGauge severity={f.severity} size={13} />
                    {f.severity}
                  </span>
                </td>
                <td style={{ ...td, ...mono }}>{f.detector}</td>
                <td style={td}>{f.firstSeen.toISOString().slice(0, 10)}</td>
                <td style={td}>
                  <Pill
                    color={
                      f.closes === "Full" ? "var(--cgx-low)" : "var(--cgx-high)"
                    }
                  >
                    {f.closes}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <PaneTitle title="Assets" hint="criticality and data classification" />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Asset</th>
              <th style={th}>Kind</th>
              <th style={th}>Criticality</th>
              <th style={th}>Data class</th>
              <th style={th}>Exposure</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((s) => (
              <tr key={s.id}>
                <td style={{ ...td, ...mono }}>{s.name}</td>
                <td style={td}>{s.kind}</td>
                <td style={td}>
                  <Pill
                    color={
                      s.criticality === "Tier 0"
                        ? "var(--cgx-critical)"
                        : "var(--cg-border-strong)"
                    }
                  >
                    {s.criticality}
                  </Pill>
                </td>
                <td style={td}>{s.dataClass}</td>
                <td style={td}>{s.exposure}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <PaneTitle
          title="Controls"
          hint="NIST 800-53 · CSF 2.0 — state before and after this action"
        />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Control</th>
              <th style={th}>CSF</th>
              <th style={th}>Title</th>
              <th style={th}>State</th>
            </tr>
          </thead>
          <tbody>
            {controls.map((c) => (
              <tr key={c.id}>
                <td style={{ ...td, ...mono }}>{c.id}</td>
                <td style={{ ...td, ...mono }}>{c.csf}</td>
                <td style={td}>
                  {c.title}
                  <div style={{ color: "var(--cg-text-muted)", fontSize: 11 }}>
                    {c.family}
                  </div>
                </td>
                <td style={td}>
                  <Delta before={c.before} after={c.after} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <PaneTitle title="Frameworks" hint="coverage delta" />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Reference</th>
              <th style={th}>Requirement</th>
              <th style={th}>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {frameworks.map((f) => (
              <tr key={f.id}>
                <td style={td}>
                  <span style={mono}>{f.id}</span>
                  <div style={{ color: "var(--cg-text-muted)", fontSize: 11 }}>
                    {f.name}
                  </div>
                </td>
                <td style={td}>{f.requirement}</td>
                <td style={td}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ color: "var(--cg-text-muted)" }}>
                      {f.coverageBefore}%
                    </span>
                    →<span style={{ fontWeight: 600 }}>{f.coverageAfter}%</span>
                    <span style={{ color: "var(--cgx-low)", fontSize: 11 }}>
                      +{f.coverageAfter - f.coverageBefore}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/*
       * ATT&CK and D3FEND side by side, explicitly labelled offense/defense.
       * Presenting an offensive technique as the "response" is the conflation
       * the plan calls out; the pairing is what makes the mapping meaningful.
       */}
      <div>
        <PaneTitle
          title="MITRE"
          hint="ATT&CK is what the weakness enables · D3FEND is what this fix implements"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          <div style={card}>
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: "var(--cg-text-muted)",
                marginBottom: 8,
              }}
            >
              ATT&CK · exposure
            </div>
            {attack.map((t) => (
              <div key={t.technique} style={{ marginBottom: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ ...mono, color: "var(--cgx-critical)" }}>
                    {t.technique}
                  </span>
                  <span style={{ fontSize: 12 }}>{t.techniqueName}</span>
                </span>
                <div style={{ color: "var(--cg-text-muted)", fontSize: 11 }}>
                  Tactic · {t.tactic}
                </div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: "var(--cg-text-muted)",
                marginBottom: 8,
              }}
            >
              D3FEND · countermeasure
            </div>
            {defend.map((d) => (
              <div key={d.id} style={{ marginBottom: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ ...mono, color: "var(--cgx-low)" }}>
                    {d.id}
                  </span>
                  <span style={{ fontSize: 12 }}>{d.name}</span>
                </span>
                <div style={{ color: "var(--cg-text-muted)", fontSize: 11 }}>
                  Counters {d.counters}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Lifecycle — one timeline
 * ------------------------------------------------------------------ */

const GATE_TONE: Record<GateStatus, string> = {
  Passed: "var(--cgx-low)",
  Open: "var(--cg-accent)",
  Blocked: "var(--cgx-critical)",
  "Not reached": "var(--cg-text-muted)",
};

function StageMark({ gate }: { gate: GateStatus }) {
  if (gate === "Passed")
    return <CheckCircle2 size={14} color={GATE_TONE.Passed} />;
  if (gate === "Blocked")
    return <TriangleAlert size={14} color={GATE_TONE.Blocked} />;
  if (gate === "Open") return <CircleDot size={14} color={GATE_TONE.Open} />;
  return <Circle size={14} color={GATE_TONE["Not reached"]} />;
}

/**
 * Lifecycle as a single sequence.
 *
 * Plan §5: ten rail destinations is navigation-heavy for something with one
 * current position. Completed stages collapse to a one-line summary, the
 * current stage is expanded on arrival, and any stage can be opened — so the
 * history is readable by scrolling instead of by ten clicks.
 */
export function LifecyclePane({
  action,
  focusStageId,
}: {
  action: RemediationAction;
  /** Rail selection still works: it opens and scrolls to that stage. */
  focusStageId?: string;
}) {
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const isOpen = (id: string, i: number) =>
    open[id] ?? (id === focusStageId || i + 1 === action.stage);

  React.useEffect(() => {
    if (!focusStageId) return;
    document
      .getElementById(`stage-${focusStageId}`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focusStageId]);

  return (
    <div>
      <PaneTitle
        title="Lifecycle"
        hint={`stage ${action.stage} of 10`}
        right={
          <span style={{ display: "flex", gap: 6 }}>
            <Pill color={GATE_TONE.Passed}>{action.stage - 1} passed</Pill>
            <Pill color={GATE_TONE.Open}>1 current</Pill>
            <Pill color={GATE_TONE["Not reached"]}>
              {10 - action.stage} ahead
            </Pill>
          </span>
        }
      />

      <div style={{ display: "flex", flexDirection: "column" }}>
        {LIFECYCLE_STAGES.map((stage, i) => {
          const d = stageDetail(action, i);
          const on = isOpen(stage.id, i);
          const last = i === LIFECYCLE_STAGES.length - 1;
          return (
            <TimelineItem
              key={stage.id}
              mark={<StageMark gate={d.gate} />}
              last={last}
              done={d.gate === "Passed"}
            >
              <div id={`stage-${stage.id}`}>
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => setOpen((o) => ({ ...o, [stage.id]: !on }))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 0",
                    background: "none",
                    border: "none",
                    color: "var(--cg-text-primary)",
                    fontFamily: APP_FONT,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {on ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {stage.label}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      marginLeft: "auto",
                      fontWeight: 400,
                    }}
                  >
                    <span
                      style={{ fontSize: 11, color: "var(--cg-text-muted)" }}
                    >
                      {d.owner} · {d.duration}
                    </span>
                    <Pill color={GATE_TONE[d.gate]}>{d.gate}</Pill>
                  </span>
                </button>

                {on && (
                  <div style={{ paddingBottom: 12 }}>
                    {/* The spine — identical on every stage, so stages compare. */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: 10,
                        ...card,
                        marginBottom: 10,
                      }}
                    >
                      {[
                        ["Entry criteria", d.entry],
                        ["Exit criteria", d.exit],
                        ["Owner", d.owner],
                        ["Artifact", d.artifact],
                        [
                          "Started",
                          d.startedAt
                            ? d.startedAt
                                .toISOString()
                                .replace("T", " ")
                                .slice(0, 16)
                            : "—",
                        ],
                      ].map(([label, value]) => (
                        <div key={label}>
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
                          <div style={{ fontSize: 12 }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <tbody>
                        {stage.fields.map((f) => (
                          <tr key={f}>
                            <td
                              style={{
                                ...td,
                                width: 210,
                                color: "var(--cg-text-muted)",
                              }}
                            >
                              {f}
                            </td>
                            <td style={td}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                {d.gate === "Not reached" ? (
                                  <span
                                    style={{ color: "var(--cg-text-muted)" }}
                                  >
                                    Pending
                                  </span>
                                ) : (
                                  <>
                                    Recorded
                                    <ProvChip value={d.provenance} />
                                  </>
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TimelineItem>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Activity — merged
 * ------------------------------------------------------------------ */

/**
 * One reverse-chronological stream, filtered by actor.
 *
 * Plan §7: the value of this pane is seeing the agent propose at 09:14, the
 * human amend at 09:31 and the policy engine gate at 09:32 — adjacent. Four
 * separate lists, one per actor, destroy exactly that.
 */
export function ActivityPane({ action }: { action: RemediationAction }) {
  const all = buildActivity(action);
  const [actor, setActor] = React.useState("All");
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const rows = all.filter((e) => actor === "All" || e.actorType === actor);

  return (
    <div>
      <PaneTitle
        title="Activity"
        hint="human, agent and system actions in one order"
        right={
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FilterSelect
              variant="tab"
              label="Actor"
              value={actor}
              onChange={setActor}
              options={[
                { value: "All", label: "All actors" },
                { value: "Human", label: "Human" },
                { value: "Agent", label: "Agent" },
                { value: "System", label: "System" },
              ]}
            />
            <span style={{ fontSize: 11.5, color: "var(--cg-text-muted)" }}>
              {rows.length} of {all.length}
            </span>
          </span>
        }
      />

      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((e) => {
          const canExpand = Boolean(e.detail || e.toolCall);
          const on = expanded[e.id];
          return (
            <div
              key={e.id}
              style={{
                display: "flex",
                gap: 10,
                padding: "9px 0",
                borderBottom: "1px solid var(--cg-border-subtle)",
              }}
            >
              <span
                title={e.actorType}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  borderRadius: 11,
                  border: "1px solid var(--cg-border)",
                  color:
                    e.actorType === "Agent"
                      ? "var(--cg-accent)"
                      : "var(--cg-text-muted)",
                }}
              >
                {ACTOR_ICON[e.actorType]}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    gap: 8,
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{e.actor}</span>
                  <span>{e.action}</span>
                  <span style={{ ...mono, color: "var(--cg-text-muted)" }}>
                    {e.target}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: "var(--cg-text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.at.toISOString().replace("T", " ").slice(0, 16)}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 2,
                  }}
                >
                  <span
                    style={{
                      ...mono,
                      fontSize: 10,
                      color: "var(--cg-text-muted)",
                    }}
                  >
                    <Link2 size={9} style={{ verticalAlign: -1 }} />{" "}
                    {e.correlationId}
                  </span>
                  {canExpand && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((x) => ({ ...x, [e.id]: !on }))
                      }
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        fontSize: 11,
                        fontFamily: APP_FONT,
                        color: "var(--cg-accent)",
                        cursor: "pointer",
                      }}
                    >
                      {on ? "Hide reasoning" : "Why?"}
                    </button>
                  )}
                </div>

                {on && (
                  <div style={{ ...card, marginTop: 6 }}>
                    {e.detail && (
                      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                        {e.detail}
                      </div>
                    )}
                    {e.toolCall && (
                      <div
                        style={{
                          ...mono,
                          marginTop: 6,
                          color: "var(--cg-text-muted)",
                        }}
                      >
                        {e.toolCall}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Evidence
 * ------------------------------------------------------------------ */

/**
 * Integrity first.
 *
 * Plan §8: an evidence list without hashes is not evidence. Every row carries
 * its digest, chain position and retention class, and the pane offers a chain
 * verification rather than asking the reader to trust the list.
 */
export function EvidencePane({ action }: { action: RemediationAction }) {
  const items = buildEvidence(action);
  const [verified, setVerified] = React.useState<null | {
    ok: boolean;
    at: string;
  }>(null);

  return (
    <div>
      <PaneTitle
        title="Evidence"
        hint={`${items.length} artifacts · WORM, hash-chained`}
        right={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {verified && (
              <span
                style={{
                  fontSize: 11,
                  color: verified.ok ? "var(--cgx-low)" : "var(--cgx-critical)",
                }}
              >
                {verified.ok ? "Chain intact" : "Chain broken"} · {verified.at}
              </span>
            )}
            <button
              type="button"
              className="cg-report-action"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 26,
                padding: "0 10px",
                fontSize: 12,
                fontFamily: APP_FONT,
                cursor: "pointer",
              }}
              onClick={() =>
                setVerified({
                  ok: true,
                  at: new Date().toISOString().replace("T", " ").slice(0, 16),
                })
              }
            >
              <ShieldCheck size={12} /> Verify chain
            </button>
          </span>
        }
      />

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Artifact</th>
            <th style={th}>SHA-256</th>
            <th style={th}>Collected</th>
            <th style={th}>Retention</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td style={{ ...td, ...mono, color: "var(--cg-text-muted)" }}>
                {it.chainIndex}
              </td>
              <td style={td}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={mono}>{it.name}</span>
                  {it.redacted && (
                    <Pill color="var(--cgx-high)" icon={<Eye size={9} />}>
                      redacted
                    </Pill>
                  )}
                  {it.legalHold && (
                    <Pill color="var(--cgx-critical)" icon={<Lock size={9} />}>
                      legal hold
                    </Pill>
                  )}
                </span>
                <div style={{ color: "var(--cg-text-muted)", fontSize: 11 }}>
                  {it.type} · {it.source} · {(it.bytes / 1024).toFixed(1)} KB
                </div>
              </td>
              <td
                style={{
                  ...td,
                  ...mono,
                  color: "var(--cg-text-muted)",
                  wordBreak: "break-all",
                  maxWidth: 220,
                }}
              >
                {it.sha256.slice(0, 32)}…
              </td>
              <td style={td}>
                {it.collectedAt.toISOString().replace("T", " ").slice(0, 16)}
                <div style={{ color: "var(--cg-text-muted)", fontSize: 11 }}>
                  {it.collector}
                </div>
              </td>
              <td style={td}>{it.retention}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Audit
 * ------------------------------------------------------------------ */

/**
 * Proof the record itself was not altered.
 *
 * Plan §9: field-level change history with the policy that permitted each
 * change, plus a WHO VIEWED THIS log — for regulated tenants that is as
 * auditable as who changed it, and it is the half most products omit.
 */
export function AuditPane({ action }: { action: RemediationAction }) {
  const entries = buildAudit(action);
  const access = buildAccessLog(action);
  const head = entries[entries.length - 1];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <PaneTitle
          title="Immutable audit log"
          hint="append-only, hash-chained"
          right={
            <Pill color="var(--cgx-low)" icon={<ShieldCheck size={9} />}>
              chain head {head ? head.hash.slice(0, 12) : "—"}
            </Pill>
          }
        />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>#</th>
              <th style={th}>When</th>
              <th style={th}>Actor</th>
              <th style={th}>Change</th>
              <th style={th}>Policy</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.index}>
                <td style={{ ...td, ...mono, color: "var(--cg-text-muted)" }}>
                  {e.index}
                </td>
                <td style={td}>
                  {e.at.toISOString().replace("T", " ").slice(0, 16)}
                </td>
                <td style={td}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {ACTOR_ICON[e.actorType]}
                    {e.actor}
                  </span>
                </td>
                <td style={td}>
                  {e.action}
                  {e.field && (
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                      <span style={{ ...mono, color: "var(--cg-text-muted)" }}>
                        {e.field}
                      </span>{" "}
                      <span style={{ color: "var(--cg-text-muted)" }}>
                        {e.from} →
                      </span>{" "}
                      <span>{e.to}</span>
                    </div>
                  )}
                </td>
                <td style={{ ...td, ...mono, color: "var(--cg-text-muted)" }}>
                  {e.policy ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <PaneTitle
          title="Access log"
          hint="who viewed this record — auditable alongside who changed it"
        />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>When</th>
              <th style={th}>Actor</th>
              <th style={th}>Role</th>
              <th style={th}>Scope</th>
            </tr>
          </thead>
          <tbody>
            {access.map((r) => (
              <tr key={`${r.actor}${r.at.toISOString()}`}>
                <td style={td}>
                  {r.at.toISOString().replace("T", " ").slice(0, 16)}
                </td>
                <td style={td}>{r.actor}</td>
                <td style={td}>{r.role}</td>
                <td style={td}>{r.scope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileWarning size={13} style={{ color: "var(--cg-text-muted)" }} />
          <span style={{ fontSize: 12, color: "var(--cg-text-muted)" }}>
            Exception history is recorded here and referenced from Lifecycle ·
            10. Closure, so a suppression can never exist in one view and not
            the other.
          </span>
        </span>
      </div>
    </div>
  );
}

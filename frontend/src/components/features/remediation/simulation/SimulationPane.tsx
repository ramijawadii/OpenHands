/* eslint-disable i18next/no-literal-string -- blast radius report */
/**
 * Simulation results, as a timeline.
 *
 * Structurally identical to Lifecycle — same `TimelineItem`, same collapsible
 * chip header, same right-hand meta — because it is the same kind of thing: an
 * ordered sequence with a summary at the top and phases beneath it. Using a
 * second idiom for a second sequence is how a product ends up with five
 * timelines that look like five components.
 *
 * Summary opens on arrival; the four phases are collapsed. A reader who wants
 * the verdict gets it without scrolling, and a reader who wants to interrogate
 * the propagation opens the phase that produced it.
 */
import React from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";
import { FilterSelect } from "#/components/features/explore/cloudguard-grid/FilterSelect";
import { Pill, Row, StepTag, TimelineItem } from "../RemediationPanes";
import type { RemediationAction } from "../remediation-data";
import type { BlastRadiusReport, ImpactNode } from "./brr-model";
import { buildVersionChain, useFreshness } from "./brr-lifecycle";
import { buildOutcome, exportBrr } from "./brr-outcome";
import {
  BlastRadiusChart,
  ImpactPropagationChart,
  PropagationChart,
  ReversibilityChart,
} from "./SimulationCharts";

const mono: React.CSSProperties = {
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
};

const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 26,
  padding: "0 9px",
  fontSize: 12,
  fontFamily: APP_FONT,
  cursor: "pointer",
};

const CLASS_TONE: Record<string, string> = {
  CRITICAL: "var(--cgx-critical)",
  HIGH: "var(--cgx-high)",
  MEDIUM: "var(--cgx-medium)",
  LOW: "var(--cgx-low)",
};

/**
 * Reversibility keeps its own tone scale.
 *
 * It is independent of blast radius (`04` §A.5) — a LOW blast-radius action can
 * still be IRREVERSIBLE — and a shared ramp would assert a correlation the
 * spec explicitly denies.
 */
const REV_TONE: Record<string, string> = {
  REVERSIBLE: "var(--cgx-low)",
  REVERSIBLE_WITH_LOSS: "var(--cgx-high)",
  // Partial recovery is a warning state: some of the plan walks back.
  // Only a total loss of the return path earns the critical tone.
  PARTIAL_REVERSIBLE: "rgb(224, 154, 45)",
  IRREVERSIBLE: "var(--cgx-critical)",
};

/** Caption under a chart — the numbers a picture cannot state precisely. */
function Facts({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {items.map((t) => (
        <Pill key={t}>{t}</Pill>
      ))}
    </div>
  );
}

export function SimulationPane({
  action,
  onOpenRollback,
}: {
  action: RemediationAction;
  onOpenRollback?: () => void;
}) {
  /** Bumped by Re-simulate, which re-anchors the newest version to now. */
  const [anchor, setAnchor] = React.useState(() => Date.now());
  const chain = React.useMemo(
    () => buildVersionChain(action, anchor),
    [action, anchor],
  );
  const report: BlastRadiusReport = chain[0];
  const outcome = React.useMemo(
    () => buildOutcome(action, report),
    [action, report],
  );
  const fresh = useFreshness(report);

  // Every phase open on arrival. The pane is a report, not a navigation tree:
  // a reader who has come to read a simulation wants to scroll it, not click
  // five disclosures to find out what it says.
  const [open, setOpen] = React.useState<Record<string, boolean>>({
    summary: true,
    impact: true,
    blast: true,
    propagation: true,
    reversibility: true,
  });
  const [msg, setMsg] = React.useState<string | null>(null);
  const [edge, setEdge] = React.useState("All");
  const [crit, setCrit] = React.useState("All");
  const [hop, setHop] = React.useState("All");
  const [data, setData] = React.useState("All");

  /*
   * Filters narrow the GRAPH, not a table.
   *
   * On a reachability picture the operational question is "show me only the
   * IAM edges" or "only what carries regulated data" — and the answer has to
   * stay a graph, because the shape is the finding. Filtering happens before
   * layout so the survivors re-space rather than leaving holes.
   */
  const visible: ImpactNode[] = React.useMemo(
    () =>
      report.impact.filter(
        (n) =>
          (edge === "All" || n.edgeClass === edge) &&
          (crit === "All" || n.criticality === crit) &&
          (data === "All" ||
            (data === "regulated"
              ? n.dataSensitivity !== "none"
              : n.dataSensitivity === data)) &&
          (hop === "All" ||
            (hop === "≥3" ? n.hop >= 3 : String(n.hop) === hop)),
      ),
    // Memoised on the filter values, not recomputed per render. Without this
    // the array is a new reference every time, which invalidates the chart's
    // option memo, which re-inits the ECharts instance — an infinite
    // mount/dispose loop that reads as the graph flickering.
    [report, edge, crit, data, hop],
  );

  const uniq = (fn: (n: ImpactNode) => string) => [
    { value: "All", label: "All" },
    ...[...new Set(report.impact.map(fn))]
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  React.useEffect(() => {
    if (!msg) return undefined;
    const t = window.setTimeout(() => setMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [msg]);

  const hops = Math.max(...report.impact.map((n) => n.hop), 0);
  const recoverable = report.rollback.filter((r) => r.available).length;
  const states = report.rollback.length;
  const failedGates = report.gates.filter((g) => !g.passed);
  /** The first state with no inverse — where the plan stops being undoable. */
  const pointOfNoReturn = report.rollback.find(
    (r) => r.stepsCompleted > 0 && !r.available,
  );

  let conclusion: string;
  if (report.nulls.length > 0)
    conclusion = `Simulation did not complete — ${report.nulls.join(", ")} came back null. Auto-escalated to TIER 3; re-run before relying on this report.`;
  else if (!fresh.valid)
    conclusion =
      "This report has expired. Execution requires a BRR under 90 seconds old — re-simulate before proceeding.";
  else
    conclusion = `Proceed at ${report.tier.final.replace("_", " ")} with ${recoverable} of ${states} partial states recoverable. ${
      failedGates.length === 0
        ? "All five gates pass."
        : `${failedGates.map((g) => g.name).join(", ")} did not pass.`
    }`;

  const stages: {
    id: string;
    label: string;
    meta: React.ReactNode;
    body: React.ReactNode;
  }[] = [
    {
      id: "summary",
      label: "1. Summary",
      meta: <Pill color={CLASS_TONE[report.class]}>{report.class}</Pill>,
      body: (
        <div>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 12.5,
              lineHeight: 1.75,
              color: "var(--cg-text-primary)",
              maxWidth: "78ch",
            }}
          >
            The proposed change was run as a hypothetical mutation against a
            forked subgraph — nothing live was touched. Traversal reached{" "}
            <strong>{report.impact.length} resources</strong> across{" "}
            <strong>{hops} hops</strong>, classified{" "}
            <strong style={{ color: CLASS_TONE[report.class] }}>
              {report.class}
            </strong>{" "}
            and rated{" "}
            <strong style={{ color: REV_TONE[report.reversibility] }}>
              {report.reversibility}
            </strong>
            .
          </p>

          <Row
            label="Blast radius"
            value={
              <span style={{ color: CLASS_TONE[report.class] }}>
                {report.class} — {report.impact.length} resources,{" "}
                {report.scope.tenants.length} tenant
                {report.scope.tenants.length === 1 ? "" : "s"}
              </span>
            }
          />
          <Row
            label="Reversibility"
            value={
              <span style={{ color: REV_TONE[report.reversibility] }}>
                {report.reversibility}
              </span>
            }
          />
          <Row
            label="Authorization"
            value={
              <span>
                {report.tier.final.replace("_", " ")} — set by{" "}
                <strong>{report.tier.decidedBy}</strong>: {report.tier.because}
              </span>
            }
          />
          <Row
            label="Report"
            value={
              <span style={mono}>
                v{report.version} · {report.subgraphVersion}
              </span>
            }
          />

          {/* The conclusion — the sentence someone acts on. */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
              padding: "9px 11px",
              border: `1px solid ${
                fresh.valid && report.nulls.length === 0
                  ? "var(--cg-border-subtle)"
                  : "var(--cgx-critical)"
              }`,
              borderRadius: 6,
              fontSize: 12.5,
              lineHeight: 1.7,
              // Stated, not inherited: without it the box picked up whatever
              // colour the ancestor happened to set and went white-on-white.
              color: "var(--cg-text-primary)",
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 2 }}>
              {fresh.valid && report.nulls.length === 0 ? (
                <CheckCircle2 size={13} color="var(--cgx-low)" />
              ) : (
                <TriangleAlert size={13} color="var(--cgx-critical)" />
              )}
            </span>
            <span>
              <strong>Conclusion.</strong> {conclusion}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "impact",
      label: "2. Impact propagation",
      meta: (
        <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
          Phase 1 · shadow execution
        </span>
      ),
      body: (
        <div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <FilterSelect
              variant="tab"
              label="Edge"
              value={edge}
              onChange={setEdge}
              options={uniq((n) => n.edgeClass)}
            />
            <FilterSelect
              variant="tab"
              label="Criticality"
              value={crit}
              onChange={setCrit}
              options={uniq((n) => n.criticality)}
            />
            <FilterSelect
              variant="tab"
              label="Hop"
              value={hop}
              onChange={setHop}
              options={[
                { value: "All", label: "All" },
                { value: "1", label: "1 — direct" },
                { value: "2", label: "2" },
                { value: "≥3", label: "≥3 — cascade" },
              ]}
            />
            <FilterSelect
              variant="tab"
              label="Data"
              value={data}
              onChange={setData}
              options={[
                { value: "All", label: "All" },
                { value: "regulated", label: "Regulated only" },
                ...[
                  ...new Set(
                    report.impact
                      .map((n) => n.dataSensitivity)
                      .filter((d) => d !== "none"),
                  ),
                ]
                  .sort()
                  .map((v) => ({ value: v, label: v })),
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
              {visible.length} of {report.impact.length}
            </span>
          </div>

          <ImpactPropagationChart action={action} nodes={visible} />
          <Facts
            items={[
              `${visible.length} resources`,
              `${Math.max(...visible.map((n) => n.hop), 0)} hops`,
              `${new Set(visible.map((n) => n.edgeClass)).size} edge classes`,
            ]}
          />
        </div>
      ),
    },
    {
      id: "blast",
      label: "3. Blast radius",
      meta: (
        <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
          Phase 3 · criticality
        </span>
      ),
      body: (
        <div>
          <BlastRadiusChart report={report} />
          <Facts
            items={[
              `class ${report.class}`,
              `${report.impact.filter((n) => n.environment === "prod").length} in prod`,
              `${report.impact.filter((n) => n.dataSensitivity !== "none").length} carrying regulated data`,
            ]}
          />
        </div>
      ),
    },
    {
      id: "propagation",
      label: "4. Propagation",
      meta: (
        <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
          Phase 2 · scoring
        </span>
      ),
      body: (
        <div>
          <PropagationChart report={report} />
          <div
            style={{
              marginTop: 8,
              fontSize: 11.5,
              color: "var(--cg-text-muted)",
              lineHeight: 1.7,
              maxWidth: "74ch",
            }}
          >
            Mass at hop 3 and beyond is second- and third-order breakage — the
            cascade a traversal that stopped at hop 1 would never have found.
            Scores carry a 0.05 floor: nothing reaches zero, because there is no
            zero risk.
          </div>
        </div>
      ),
    },
    {
      id: "reversibility",
      label: "5. Reversibility",
      meta: (
        <Pill color={REV_TONE[report.reversibility]}>
          {report.reversibility}
        </Pill>
      ),
      body: (
        <div>
          <ReversibilityChart report={report} />
          <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.8 }}>
            <div>
              {recoverable} / {states} states reachable in reverse — solid
              arrows return cleanly, dashed arrows return with loss.
            </div>
            {report.rollback
              .filter((r) => r.loss)
              .map((r) => (
                <div
                  key={r.stepsCompleted}
                  style={{ color: "var(--cgx-high)" }}
                >
                  {r.inverseAction} recovers step {r.stepsCompleted} but{" "}
                  {r.loss}.
                </div>
              ))}
            {pointOfNoReturn && (
              <div style={{ color: "var(--cgx-critical)" }}>
                Point of no return after step {pointOfNoReturn.stepsCompleted} —{" "}
                {pointOfNoReturn.forwardAction} has no inverse in the registry.
                Past this step the plan cannot be walked back, which is why an
                irreversible action is never autonomous.
              </div>
            )}
          </div>
          <button
            type="button"
            className="cg-report-action"
            onClick={onOpenRollback}
            style={{ ...btn, marginTop: 10 }}
          >
            <Undo2 size={12} /> View rollback plan
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Freshness is the one fact that changes while you read it, so it sits
          above the sequence rather than inside a phase. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 12,
          fontSize: 11.5,
          color: "var(--cg-text-muted)",
        }}
      >
        <StepTag>Simulation result</StepTag>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            color: fresh.valid ? "var(--cg-text-muted)" : "var(--cgx-critical)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <Clock size={11} />
          {fresh.valid
            ? `valid ${fresh.remaining}s`
            : `expired ${fresh.ageSeconds}s ago — re-simulation required`}
        </span>

        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            type="button"
            className={
              fresh.valid
                ? "cg-report-action"
                : "cg-report-action cg-report-action-primary"
            }
            onClick={() => {
              setAnchor(Date.now());
              setMsg("Re-simulated — a new BRR version was minted.");
            }}
            style={btn}
          >
            <RefreshCw size={12} /> Re-simulate
          </button>
          <button
            type="button"
            className="cg-report-action"
            onClick={() => {
              const r = exportBrr(action, report, outcome);
              setMsg(
                r.ok
                  ? `Exported to ${r.filename}`
                  : `Export failed — ${r.error}`,
              );
            }}
            style={btn}
          >
            <Download size={12} /> Export BRR
          </button>
        </span>
      </div>

      {msg && (
        <div
          role="status"
          style={{
            marginBottom: 10,
            fontSize: 11.5,
            color: msg.startsWith("Export failed")
              ? "var(--cgx-critical)"
              : "var(--cg-text-muted)",
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {stages.map((stage, i) => {
          const on = Boolean(open[stage.id]);
          return (
            <TimelineItem
              key={stage.id}
              mark={<CheckCircle2 size={14} color="var(--cgx-low)" />}
              last={i === stages.length - 1}
              done
            >
              <div>
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
                  <StepTag>{stage.label}</StepTag>
                  <span
                    style={{
                      marginLeft: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 400,
                    }}
                  >
                    {stage.meta}
                  </span>
                </button>

                {on && (
                  // Indented to the title chip, matching Lifecycle.
                  <div style={{ paddingLeft: 20, paddingBottom: 16 }}>
                    {stage.body}
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

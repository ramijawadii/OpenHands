/**
 * What the simulation turned out to be worth.
 *
 * The pane has a second life after execution. Two thresholds make the delta
 * operational rather than trivia: >20% mid-execution forces re-evaluation, and
 * >50% triggers automatic rollback (`03` §5 step 6). The average across records
 * is a Phase-2 rollout gate (<15%), so a single record's delta is also a vote
 * on whether autonomy expands (`05` §3).
 *
 * Reconciliation lives here too because it answers the same kind of question:
 * the fast track acted without a graph, so the BRR is the first chance anyone
 * has to find out whether it was right (`03` §7).
 */
import { hash, num, type RemediationAction } from "../remediation-data";
import { downloadJson, type ExportResult } from "../remediation-evidence-data";
import type {
  BlastRadiusClass,
  BlastRadiusReport,
  Reversibility,
} from "./brr-model";

/** Delta thresholds, named rather than inlined — they are policy, not styling. */
export const RE_EVALUATE_AT = 20;
export const AUTO_ROLLBACK_AT = 50;
/** Phase-2 rollout gate on the fleet average. */
export const GATE_AVG_DELTA = 15;

export interface Outcome {
  /** Null until execution has happened — before that there is nothing to compare. */
  executed: boolean;
  predictedClass: BlastRadiusClass;
  actualClass?: BlastRadiusClass;
  predictedReversibility: Reversibility;
  actualReversibility?: Reversibility;
  predictedNodes: number;
  actualNodes?: number;
  /** Aggregate blast-radius delta, percent. */
  delta?: number;
  /** The verdict the thresholds produce. */
  verdict?: "within tolerance" | "re-evaluate" | "auto-rollback";
}

export function buildOutcome(
  a: RemediationAction,
  report: BlastRadiusReport,
): Outcome {
  // Nothing to measure until the action has actually run. Stages below 8 have
  // not executed, and inventing a "predicted vs actual" for them would be the
  // exact dishonesty this pane exists to prevent.
  const executed = a.stage >= 8;
  const base: Outcome = {
    executed,
    predictedClass: report.class,
    predictedReversibility: report.reversibility,
    predictedNodes: report.impact.length,
  };
  if (!executed) return base;

  const seed = `${a.id}out`;
  const delta = num(seed, 3, 34);
  const drifted = hash(`${seed}c`) % 9 === 0;
  const order: BlastRadiusClass[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const actualClass = drifted
    ? order[Math.min(order.length - 1, order.indexOf(report.class) + 1)]
    : report.class;

  let verdict: Outcome["verdict"] = "within tolerance";
  if (delta > AUTO_ROLLBACK_AT) verdict = "auto-rollback";
  else if (delta > RE_EVALUATE_AT) verdict = "re-evaluate";

  return {
    ...base,
    actualClass,
    actualReversibility: report.reversibility,
    actualNodes: report.impact.length - (hash(`${seed}n`) % 3),
    delta,
    verdict,
  };
}

/* ------------------------------------------------------------------ *
 * Fleet accuracy — this record's contribution to the rollout gate
 * ------------------------------------------------------------------ */

export interface GateStatus {
  classAccuracy: number;
  sample: number;
  criticalMisclassifications: number;
  irreversibilityAccuracy: number;
  avgDelta: number;
  coverageGapRate: number;
  phase: string;
  /** Criteria that are not met, so an unmet gate is never silent. */
  blocking: string[];
}

export function buildGateStatus(a: RemediationAction): GateStatus {
  const seed = `${a.id}gate`;
  const classAccuracy = 88 + num(seed, 0, 9);
  const avgDelta = 8 + num(`${seed}d`, 0, 9);
  const coverageGapRate = Number((num(`${seed}g`, 10, 62) / 10).toFixed(1));

  const blocking: string[] = [];
  if (classAccuracy < 90)
    blocking.push(`class accuracy ${classAccuracy}% < 90%`);
  if (avgDelta >= GATE_AVG_DELTA)
    blocking.push(`avg delta ${avgDelta}% ≥ ${GATE_AVG_DELTA}%`);
  if (coverageGapRate >= 5)
    blocking.push(`graph coverage gap ${coverageGapRate}% ≥ 5%`);

  return {
    classAccuracy,
    sample: 100 + num(`${seed}s`, 0, 60),
    // Must be zero. A predicted-LOW that was actually CRITICAL is the single
    // failure the rollout gate will not tolerate at any sample size.
    criticalMisclassifications: 0,
    irreversibilityAccuracy: 100,
    avgDelta,
    coverageGapRate,
    phase: blocking.length ? "PHASE_1" : "PHASE_2_ELIGIBLE",
    blocking,
  };
}

/* ------------------------------------------------------------------ *
 * Fast-track reconciliation
 * ------------------------------------------------------------------ */

export type ReconcileVerdict =
  | "correct and complete"
  | "correct but stale"
  | "wrong — roll back first";

export interface Reconciliation {
  ran: boolean;
  latencyMs: number;
  actions: {
    action: string;
    verdict: ReconcileVerdict;
    detail: string;
  }[];
}

/**
 * Fast track buys time; the slow track gets it right.
 *
 * The fast track has no graph, so it cannot know that a NAT gateway is shared
 * or that an instance is an ASG member (`NET-002`, `EX-008`). Reconciliation is
 * the only place those mistakes surface.
 */
export function buildReconciliation(a: RemediationAction): Reconciliation {
  const ran = hash(`${a.id}ft`) % 3 === 0 && a.severity === "Critical";
  if (!ran) return { ran: false, latencyMs: 0, actions: [] };

  return {
    ran: true,
    latencyMs: 900 + num(`${a.id}ftl`, 100, 1100),
    actions: [
      {
        action: `sg/quarantine-${a.resource.split("-").pop()}`,
        verdict: "correct and complete",
        detail: "Scoped to the target alone. Keep — no further action.",
      },
      {
        action: "nacl/deny-egress",
        verdict: "correct but stale",
        detail:
          "Right call, but taken against telemetry older than the BRR. Re-validate before relying on it.",
      },
      {
        action: "nat/shared-egress-a",
        verdict: "wrong — roll back first",
        detail:
          "Shared egress path. Blocking it cut workloads outside the blast radius; roll this back before the scoped action runs.",
      },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

export function exportBrr(
  a: RemediationAction,
  report: BlastRadiusReport,
  outcome: Outcome,
): ExportResult {
  const doc = {
    schema: "cloudguard.remediation.blast-radius-report",
    version: 1,
    exportedAt: new Date().toISOString(),
    action: { id: a.id, title: a.title, environment: a.environment },
    brr: {
      version: report.version,
      subgraphVersion: report.subgraphVersion,
      generatedAt: report.generatedAt.toISOString(),
      class: report.class,
      reversibility: report.reversibility,
      // Hoisted: a null field is the escalation, so a reader must not have to
      // scan the body to discover the report did not complete.
      nulls: report.nulls,
      scope: report.scope,
      tier: report.tier,
      gates: report.gates,
      risk: report.risk,
      rollback: report.rollback,
      impact: report.impact.map((n) => ({
        ...n,
        path: n.path.map((p) => `${p.edgeClass}:${p.resource}`),
      })),
    },
    outcome,
  };

  return downloadJson(doc, `${a.id}-brr-v${report.version}.json`, (parsed) => {
    const d = parsed as unknown as typeof doc;
    if (d.brr.impact.length !== report.impact.length)
      throw new Error("export lost impact nodes during serialisation");
    if (d.brr.tier.final !== report.tier.final)
      throw new Error("export tier does not match the report");
  });
}

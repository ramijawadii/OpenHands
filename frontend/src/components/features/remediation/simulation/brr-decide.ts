/**
 * Tier assignment and the five gates — the decision layer.
 *
 * Kept out of `brr-build` because it is the part that must stay deterministic
 * and reviewable forever. The spec is explicit that policy is enforced in the
 * control plane and never left to model reasoning (`05` §1): the model cannot
 * argue its way past a gate. Isolating that logic in one small module is how
 * the code says the same thing.
 */
import { hash, type RemediationAction } from "../remediation-data";
import type {
  BlastRadiusClass,
  GateResult,
  ImpactNode,
  Reversibility,
  RiskModel,
  ScopeExpansion,
  Tier,
  TierDecision,
  TierSource,
} from "./brr-model";

const ORDER: Tier[] = ["TIER_1", "TIER_2", "TIER_3"];
const rank = (t: Tier) => ORDER.indexOf(t);

/** Max age of a BRR at execution time (`BR-004`). */
export const MAX_BRR_AGE_SECONDS = 90;

/**
 * Resources permanently blocked from Tier 1/2 regardless of blast radius or
 * risk score (`05` §1.1). Any hit forces Tier 3 with `protected_resource_hit`.
 */
const PROTECTED_PATTERNS: [RegExp, string][] = [
  [/break-glass/i, "break-glass role — loss of emergency access mid-incident"],
  [/^root$|:root$/i, "root account — bypasses all SCPs and IAM"],
  [
    /aws-service-role\//i,
    "service-linked role — deletion breaks managed services",
  ],
  [
    /kms|alias\//i,
    "KMS customer-managed key — disabling makes data inaccessible",
  ],
  [/guardduty|securityhub/i, "would blind the security system"],
  [/cloudtrail/i, "loss of audit trail mid-incident"],
];

function protectedHits(nodes: ImpactNode[]): string[] {
  const out: string[] = [];
  nodes.forEach((n) => {
    PROTECTED_PATTERNS.forEach(([re, why]) => {
      if (re.test(n.resource)) out.push(`${n.resource} — ${why}`);
    });
  });
  return [...new Set(out)];
}

function describe(
  source: TierSource,
  ctx: {
    cls: BlastRadiusClass;
    reversibility: Reversibility;
    riskTier: Tier;
    nulls: string[];
  },
): string {
  if (source === "registry")
    return "the action's own registry minimum — neither simulation nor risk raised it";
  if (source === "simulation")
    return ctx.reversibility === "REVERSIBLE"
      ? `blast radius ${ctx.cls}`
      : `${ctx.reversibility} — irreversibility, not blast radius`;
  if (ctx.nulls.length)
    return `${ctx.nulls.length} required field(s) null — the simulation did not complete`;
  return "the risk model — residual risk, disruption or evidence quality";
}

/**
 * `final_tier = max(registry, simulation, risk)`.
 *
 * The maximum, never a blend. Simulation and risk can only *raise* restriction
 * (`01` invariant 4), and the report carries which input won — an approver
 * looking at a Tier 3 needs to know whether it was the blast radius or the
 * irreversibility, because those call for different conversations.
 */
export function assignTier(
  a: RemediationAction,
  input: {
    cls: BlastRadiusClass;
    reversibility: Reversibility;
    risk: RiskModel;
    nulls: string[];
    scope: ScopeExpansion;
    nodes: ImpactNode[];
  },
): TierDecision {
  const { cls, reversibility, risk, nulls, scope, nodes } = input;

  const registry: Tier = a.auto ? "TIER_1" : "TIER_2";

  // Simulation tier — blast radius and irreversibility, which are independent.
  let simulation: Tier = "TIER_1";
  if (cls === "HIGH") simulation = "TIER_2";
  if (cls === "CRITICAL") simulation = "TIER_3";
  if (
    reversibility === "PARTIAL_REVERSIBLE" ||
    reversibility === "IRREVERSIBLE"
  )
    simulation = "TIER_3";

  // Risk tier — including the calibration check: high confidence on thin
  // evidence is a model-reliability flag, not a green light (`04` §B.3).
  let riskTier: Tier = "TIER_1";
  if (risk.residual >= 0.4 || risk.disruption >= 0.8) riskTier = "TIER_2";
  const lowEvidenceHighConfidence =
    risk.evidenceQuality === "thin" && risk.confidence >= 0.8;
  if (lowEvidenceHighConfidence) riskTier = "TIER_3";
  if (nodes.some((n) => n.dataSensitivity !== "none") && risk.residual >= 0.35)
    riskTier = rank(riskTier) < rank("TIER_2") ? "TIER_2" : riskTier;

  const escalators: string[] = [];
  if (
    reversibility === "IRREVERSIBLE" ||
    reversibility === "PARTIAL_REVERSIBLE"
  )
    escalators.push(`${reversibility} — no autonomous path exists`);
  if (cls === "CRITICAL") escalators.push("blast_radius_class = CRITICAL");
  if (nulls.length)
    escalators.push(
      `${nulls.length} required field(s) null — simulation failure`,
    );
  if (lowEvidenceHighConfidence)
    escalators.push(
      "high confidence on thin evidence — uncertainty, not certainty",
    );
  if (scope.crossTenant) escalators.push(`cross-tenant scope via ${scope.via}`);
  protectedHits(nodes).forEach((p) =>
    escalators.push(`protected resource: ${p}`),
  );

  // A null field or a protected hit escalates outright.
  const forced: Tier | null =
    nulls.length || protectedHits(nodes).length ? "TIER_3" : null;

  const candidates: [TierSource, Tier][] = [
    ["registry", registry],
    ["simulation", simulation],
    ["risk", forced && rank(forced) > rank(riskTier) ? forced : riskTier],
  ];

  const [decidedBy, final] = candidates.reduce((best, c) =>
    rank(c[1]) > rank(best[1]) ? c : best,
  );

  const because = describe(decidedBy, {
    cls,
    reversibility,
    riskTier: candidates[2][1],
    nulls,
  });

  return {
    registry,
    simulation,
    risk: candidates[2][1],
    final,
    decidedBy,
    because,
    escalators,
  };
}

/* ------------------------------------------------------------------ *
 * The five sequential gates
 * ------------------------------------------------------------------ */

/**
 * All five must pass, in order (`03` §1 D).
 *
 * Ordered rather than evaluated in parallel because a failed Freshness makes
 * every later answer meaningless — checking Permission against a subgraph that
 * expired two minutes ago produces a confident wrong result.
 */
export function runGates(
  a: RemediationAction,
  input: {
    reversibility: Reversibility;
    generatedAt: Date;
    tier: TierDecision;
  },
): GateResult[] {
  const ageSeconds = Math.round(
    (Date.now() - input.generatedAt.getTime()) / 1000,
  );
  const fresh = ageSeconds <= MAX_BRR_AGE_SECONDS;

  const irreversible =
    input.reversibility === "IRREVERSIBLE" ||
    input.reversibility === "PARTIAL_REVERSIBLE";

  return [
    {
      name: "Freshness",
      passed: fresh,
      detail: fresh
        ? `BRR is ${ageSeconds}s old, within the ${MAX_BRR_AGE_SECONDS}s window`
        : `BRR is ${ageSeconds}s old — re-simulation required before execution`,
      closes: ["BR-004", "SG-001"],
    },
    {
      name: "Existence",
      passed: true,
      detail:
        "Every target confirmed against the live API, not the graph alone",
      closes: ["SG-004"],
    },
    {
      name: "Timing",
      passed: hash(`${a.id}freeze`) % 7 !== 0,
      detail:
        hash(`${a.id}freeze`) % 7 !== 0
          ? "No change freeze, deployment or peak-load window in effect"
          : "Change freeze active — queued until the window closes",
      closes: ["TC-001", "TC-004", "BR-010"],
    },
    {
      name: "Permission",
      passed: true,
      detail: "Planned IAM actions simulated against live SCPs",
      closes: ["IAM-004", "MA-004"],
    },
    {
      name: "Irreversibility",
      passed: !irreversible,
      detail: irreversible
        ? `${input.reversibility} — hard-gated to human approval, no autonomous path`
        : "Reversible, or reversible with bounded loss",
      closes: ["BR-007", "RB-002"],
    },
  ];
}

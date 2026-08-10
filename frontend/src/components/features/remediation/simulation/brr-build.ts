/**
 * The four simulation phases (`03` §1 A–B, `04` §A.1–A.5).
 *
 * Each phase is exported separately, deliberately. The real engine will replace
 * them one at a time — Phase 1 needs the graph fork, Phase 2 needs live
 * CloudWatch, Phase 4 needs the rollback generator — and a single monolithic
 * `buildBrr` would force all four to land together. The composer at the bottom
 * is the only thing the UI imports.
 *
 * Everything here is a deterministic stand-in with the real signature. Swapping
 * in the engine is a data-source change, not a rewrite.
 */
import {
  hash,
  num,
  pick,
  OWNERS,
  type RemediationAction,
} from "../remediation-data";
import type {
  BlastRadiusClass,
  BlastRadiusReport,
  C8EdgeClass,
  DataSensitivity,
  ImpactNode,
  Reversibility,
  RiskModel,
  RollbackArtifact,
  ScopeExpansion,
} from "./brr-model";
import { assignTier, runGates } from "./brr-decide";

/* ------------------------------------------------------------------ *
 * Phase 1 — Shadow execution
 * ------------------------------------------------------------------ */

const NODE_SEED: [string, C8EdgeClass, number, DataSensitivity, string][] = [
  ["sqs/fin-settlement", "Edep", 1, "financial", "payments"],
  ["role/batch-processor", "Eiam", 1, "none", "platform"],
  ["nat/shared-egress-a", "Enet", 2, "none", "network"],
  ["rds/analytics-replica", "Erep", 2, "PII", "data"],
  ["secretsmanager/db-rotation", "Eiam", 2, "secrets", "platform"],
  ["lambda/notify-fanout", "Edep", 3, "none", "platform"],
  ["ecs/reconciliation-worker", "Edep", 3, "financial", "payments"],
  ["alb/internal-api", "Enet", 3, "none", "network"],
  ["s3/audit-archive", "Erep", 4, "none", "security"],
  ["sns/ops-alerts", "Edep", 4, "none", "ops"],
  ["role/readonly-auditor", "Eown", 5, "none", "security"],
];

const BREAKS: Record<C8EdgeClass, string> = {
  Eiam: "Assumption chain severed. Any principal that assumed through this binding loses access mid-flight.",
  Edep: "Async consumer severed. Messages are accepted and never drained — silent corruption rather than a visible outage.",
  Enet: "Shared egress path cut. Every workload behind this route loses connectivity, not only the target.",
  Erep: "Change propagates to the replica. The mutation escapes this region, and on a cross-tenant edge, this tenant.",
  Eown: "Nothing breaks — ownership is not attacker-traversable. Used to decide who gets told.",
};

const CLOSES: Record<C8EdgeClass, string[]> = {
  Eiam: ["IAM-003", "IAM-002"],
  Edep: ["BR-001", "BR-002"],
  Enet: ["NET-001", "NET-002"],
  Erep: ["DS-005", "MA-001"],
  Eown: [],
};

/**
 * Fork the subgraph, apply the hypothetical mutation, read the diff, discard.
 *
 * Nothing live is touched — there is no dry run and no no-op API call. That
 * distinction matters enough to state: a reader who believes a request was made
 * against the account will misjudge both the latency and the risk of this step.
 */
export function shadowExecute(a: RemediationAction): ImpactNode[] {
  return NODE_SEED.map(
    ([resource, edgeClass, hop, dataSensitivity, team], i) => {
      const seed = `${a.id}br${i}`;
      return {
        id: `IN-${num(seed, 1000, 9999)}`,
        resource,
        arn: `arn:aws:${resource.split("/")[0]}:${a.region}:${a.account}:${resource.split("/")[1]}`,
        edgeClass,
        hop,
        // Filled by Phase 2.
        score: 0,
        factors: {
          base: 0,
          coupling: 0,
          attenuation: 0,
          liveLoad: 1,
          dataFlow: 1,
        },
        criticality: "LOW" as BlastRadiusClass,
        dataSensitivity,
        environment: hop <= 3 ? a.environment : "staging",
        slaTier: dataSensitivity === "financial" ? "Tier-0" : "Tier-2",
        tenant: edgeClass === "Erep" && hop > 1 ? "acct-91" : a.account,
        owner: `${team}-${pick(OWNERS, seed).split(".")[1] ?? "team"}`,
        breaks: BREAKS[edgeClass],
        closes: CLOSES[edgeClass],
        path: [],
      };
    },
  );
}

/* ------------------------------------------------------------------ *
 * Phase 2 — Propagation scoring
 * ------------------------------------------------------------------ */

/** SYNC_HARD 1.0 … OPTIONAL 0.1 (`04` §A.3). */
const COUPLING: Record<C8EdgeClass, number> = {
  Eiam: 1.0,
  Edep: 1.0,
  Enet: 0.8,
  Erep: 0.6,
  Eown: 0.1,
};

const DATA_MULTIPLIER: Record<DataSensitivity, number> = {
  secrets: 3.0,
  financial: 2.0,
  PII: 2.0,
  health: 2.0,
  none: 1.0,
};

const ATTENUATION = 0.6;
/** Nothing scores zero. There is no zero risk (`04` §A.3). */
const SCORE_FLOOR = 0.05;

function buildPath(a: RemediationAction, n: ImpactNode) {
  const target = { resource: a.resource, edgeClass: n.edgeClass };
  if (n.hop <= 1) return [target];
  return [
    target,
    { resource: "role/batch-processor", edgeClass: "Eiam" as C8EdgeClass },
    ...(n.hop >= 3
      ? [{ resource: "sqs/fin-settlement", edgeClass: "Edep" as C8EdgeClass }]
      : []),
  ];
}

export function scorePropagation(
  a: RemediationAction,
  nodes: ImpactNode[],
): ImpactNode[] {
  return nodes.map((n, i) => {
    const seed = `${a.id}sc${i}`;
    const base = 0.4 + num(seed, 0, 40) / 100;
    const coupling = COUPLING[n.edgeClass];
    const attenuation = ATTENUATION ** n.hop;
    // A node already in CloudWatch warning has no headroom, so the same
    // mutation costs more there than on an idle one (`BR-006`, `TC-003`).
    const liveLoad =
      hash(`${seed}load`) % 4 === 0 ? 1 + num(seed, 10, 20) / 10 : 1;
    const dataFlow = DATA_MULTIPLIER[n.dataSensitivity];
    const score = Math.max(
      SCORE_FLOOR,
      base * coupling * attenuation * liveLoad * dataFlow,
    );

    return {
      ...n,
      score: Number(score.toFixed(2)),
      factors: { base, coupling, attenuation, liveLoad, dataFlow },
      path: buildPath(a, n),
    };
  });
}

/* ------------------------------------------------------------------ *
 * Phase 3 — Criticality classification
 * ------------------------------------------------------------------ */

const ENV_WEIGHT: Record<string, number> = {
  prod: 3,
  staging: 1.5,
  dev: 0.3,
};

/**
 * Data sensitivity carries the highest weight and overrides node count.
 *
 * Two payment-processor services outrank forty dev services (`04` §A.4), which
 * is why this is a weighted classification and not a total.
 */
export function classify(nodes: ImpactNode[]): {
  nodes: ImpactNode[];
  class: BlastRadiusClass;
} {
  const scored = nodes.map((n) => {
    const weight =
      n.score *
      (ENV_WEIGHT[n.environment] ?? 1) *
      (n.slaTier === "Tier-0" ? 3 : 1);
    let criticality: BlastRadiusClass = "LOW";
    if (n.slaTier === "Tier-0") criticality = "CRITICAL";
    else if (weight >= 3) criticality = "HIGH";
    else if (weight >= 1.2) criticality = "MEDIUM";
    return { ...n, criticality };
  });

  const worst = scored.reduce<BlastRadiusClass>((acc, n) => {
    const order: BlastRadiusClass[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    return order.indexOf(n.criticality) > order.indexOf(acc)
      ? n.criticality
      : acc;
  }, "LOW");

  // A Tier-0 SLA node in scope is always CRITICAL, but the report class is
  // capped one below unless several are hit — a single Tier-0 dependency at
  // hop 4 should not read the same as the target itself being Tier-0.
  const criticalCount = scored.filter(
    (n) => n.criticality === "CRITICAL",
  ).length;
  const cls: BlastRadiusClass =
    worst === "CRITICAL" && criticalCount < 2 ? "HIGH" : worst;

  return { nodes: scored, class: cls };
}

/* ------------------------------------------------------------------ *
 * Phase 4 — Irreversibility assessment
 * ------------------------------------------------------------------ */

/**
 * A separate first-class output, never derived from the score.
 *
 * A LOW blast-radius action can still be IRREVERSIBLE (`04` §A.5), and the
 * final rating is the **worst tag across all actions in the plan** — one
 * irreversible step makes the whole plan irreversible.
 */
export function assessReversibility(a: RemediationAction): Reversibility {
  const roll = hash(`${a.id}rev`) % 10;
  if (roll === 0) return "IRREVERSIBLE";
  if (roll <= 2) return "PARTIAL_REVERSIBLE";
  if (roll <= 5) return "REVERSIBLE_WITH_LOSS";
  return "REVERSIBLE";
}

/**
 * The plan as registry actions, each with its inverse.
 *
 * Action IDs are registry identifiers, never freeform: the model selects, it
 * does not generate (`03` §3). The inverse is what makes a step reversible, so
 * the two travel together — and the step where the inverse runs out is the
 * point of no return the chart is drawn to show.
 */
const PLAN_STEPS: [string, string | null, string?][] = [
  ["CAPTURE_FORENSIC_SNAPSHOT", "DELETE_FORENSIC_SNAPSHOT"],
  ["ACQUIRE_RESOURCE_LOCK", "RELEASE_RESOURCE_LOCK"],
  ["CREATE_ENCRYPTED_COPY", "DELETE_ENCRYPTED_COPY"],
  [
    "REPOINT_CONSUMERS",
    "RESTORE_CONSUMER_BINDING",
    "in-flight messages during the cutover are dropped",
  ],
  ["DELETE_UNENCRYPTED_SNAPSHOT", null],
];

export function buildRollback(
  a: RemediationAction,
  reversibility: Reversibility,
): RollbackArtifact[] {
  // IRREVERSIBLE actions have no rollback path by definition — which is
  // precisely why they can never be autonomous (`03` §6).
  const wholePlanLost = reversibility === "IRREVERSIBLE";

  return [
    {
      stepsCompleted: 0,
      forwardAction: "—",
      inverseAction: null,
      procedure: "nothing has run; no rollback needed",
      available: true,
    },
    ...PLAN_STEPS.map(([forward, inverse, loss], i) => {
      const available = !wholePlanLost && inverse !== null;
      return {
        stepsCompleted: i + 1,
        forwardAction: forward,
        inverseAction: wholePlanLost ? null : inverse,
        procedure: available
          ? `rollback-${a.id.toLowerCase()}-s${i + 1}.json`
          : "no recovery artifact — this state cannot be walked back",
        available,
        ...(loss && available ? { loss } : {}),
      };
    }),
  ];
}

/* ------------------------------------------------------------------ *
 * Risk model (`04` Part B)
 * ------------------------------------------------------------------ */

function buildRisk(a: RemediationAction, nodes: ImpactNode[]): RiskModel {
  const seed = `${a.id}risk`;
  const disruption =
    nodes.reduce((s, n) => s + n.score, 0) / Math.max(1, nodes.length);
  const confidence = 0.6 + num(seed, 0, 39) / 100;
  const quality = hash(`${seed}q`) % 5;
  // Three bands, as a lookup — the calibration check downstream depends on
  // this value, so it should not be buried in nested conditionals.
  const EVIDENCE_BANDS = [
    "thin",
    "adequate",
    "adequate",
    "strong",
    "strong",
  ] as const;
  const evidenceQuality = EVIDENCE_BANDS[quality];

  return {
    residual: Number((num(seed, 10, 60) / 100).toFixed(2)),
    disruption: Number(disruption.toFixed(2)),
    cost: Number((num(`${seed}c`, 10, 80) / 100).toFixed(2)),
    uncertainty: Number((num(`${seed}u`, 5, 45) / 100).toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    evidenceQuality,
    factors: {
      assetCriticality: "Phase 3 classification",
      functionalImpact: `${nodes.length} nodes, aggregate ${disruption.toFixed(2)}`,
      dataImpact: nodes.some((n) => n.dataSensitivity !== "none")
        ? "compliance scope in range"
        : "no regulated data in range",
      activityStage: "ATT&CK Impact — late tactic, raises urgency",
      threatActor: "no elevated sophistication indicators",
      recoverability: "from Phase 4 irreversibility rating",
    },
  };
}

/* ------------------------------------------------------------------ *
 * Composer
 * ------------------------------------------------------------------ */

function buildScope(a: RemediationAction, nodes: ImpactNode[]): ScopeExpansion {
  const foreign = nodes.filter((n) => n.tenant !== a.account);
  if (foreign.length === 0) return { crossTenant: false, tenants: [a.account] };
  return {
    crossTenant: true,
    via: foreign[0].edgeClass,
    tenants: [a.account, ...new Set(foreign.map((n) => n.tenant))],
  };
}

/**
 * One BRR version.
 *
 * `generatedAt` is supplied by the caller rather than computed here so the
 * lifecycle module can anchor the current version to real time — the 90-second
 * window is only meaningful against a clock that moves, and the record's fixed
 * demo EPOCH would make every report permanently expired.
 */
export function buildBrr(
  a: RemediationAction,
  version: number,
  generatedAt: Date,
): BlastRadiusReport {
  const raw = shadowExecute(a);
  const scored = scorePropagation(a, raw);
  const { nodes, class: cls } = classify(scored);
  const reversibility = assessReversibility(a);
  const risk = buildRisk(a, nodes);
  const scope = buildScope(a, nodes);

  // A required field coming back null is a simulation failure, not missing
  // information — it forces TIER_3 (`04` §A.6).
  const nulls: string[] = [];
  if (hash(`${a.id}null${version}`) % 6 === 0) nulls.push("owner_map");
  if (hash(`${a.id}null2${version}`) % 11 === 0) nulls.push("live_load_state");

  const tier = assignTier(a, {
    cls,
    reversibility,
    risk,
    nulls,
    scope,
    nodes,
  });

  return {
    version,
    subgraphVersion: `sg-${a.id.toLowerCase()}-v${version}`,
    generatedAt,
    nulls,
    class: cls,
    reversibility,
    scope,
    impact: nodes,
    risk,
    tier,
    gates: runGates(a, { reversibility, generatedAt, tier }),
    rollback: buildRollback(a, reversibility),
  };
}

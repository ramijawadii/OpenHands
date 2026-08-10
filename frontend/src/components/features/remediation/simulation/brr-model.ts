/**
 * The Blast Radius Report — the execution contract.
 *
 * This is not a report *about* something that happened. Per the remediation
 * infrastructure spec (`01` invariant 1, `03` §1), **no registry action invokes
 * without a valid, non-expired BRR bound to the session**. The BRR is what
 * authorizes execution, which makes it a different class of object from the
 * record's other panes: Evidence records what was collected, Audit records what
 * changed, and both are correct forever. This one expires.
 *
 * Three properties of the contract drive everything downstream, and each is a
 * place a naive model would get it wrong:
 *
 * 1. **Irreversibility is independent of blast radius** (`04` §A.5). A LOW
 *    blast-radius action can still be IRREVERSIBLE. They are separate fields
 *    and must never be derived from one another.
 * 2. **A null required field is not "unknown"** (`04` §A.6). It is a simulation
 *    failure that auto-escalates to Tier 3, so absence is computed and carried,
 *    not left for a reader to notice.
 * 3. **The tier is one-way** (`03` §4). `max(registry, simulation, risk)` can
 *    only ratchet toward more human control — so the report carries *which*
 *    input won, because "why is this Tier 3" is the question an approver
 *    actually asks.
 */

/**
 * The five C8 relationship classes the simulation traverses.
 *
 * Kept as a first-class field rather than folded into a generic "relationship"
 * because each one carries a different remediation danger (`04` §A.2): an Eiam
 * change severs assumption chains, an Edep break causes *silent* corruption
 * rather than a visible outage, and an Erep edge is how a change escapes the
 * tenant. Grouping the impact set by edge class is how an operator learns what
 * *kind* of breakage they are looking at.
 */
export type C8EdgeClass = "Eiam" | "Edep" | "Enet" | "Erep" | "Eown";

export const EDGE_MEANING: Record<C8EdgeClass, string> = {
  Eiam: "IAM binding — a role or policy change severs assumption chains",
  Edep: "Dependency — sync break cascades, async break corrupts silently",
  Enet: "Network — isolation cuts a shared path",
  Erep: "Replication — the change propagates to DR, another region or tenant",
  Eown: "Ownership — not attacker-traversable; used for notification",
};

export type BlastRadiusClass = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type Reversibility =
  | "REVERSIBLE"
  | "REVERSIBLE_WITH_LOSS"
  | "PARTIAL_REVERSIBLE"
  | "IRREVERSIBLE";

export type Tier = "TIER_1" | "TIER_2" | "TIER_3";

/** Which of the three tier inputs set the final value. */
export type TierSource = "registry" | "simulation" | "risk";

export type GateName =
  | "Freshness"
  | "Existence"
  | "Timing"
  | "Permission"
  | "Irreversibility";

export interface GateResult {
  name: GateName;
  passed: boolean;
  /** Why it failed, or what it checked when it passed. */
  detail: string;
  /** The failure taxonomy IDs this gate closes — the audit spine. */
  closes: string[];
}

/**
 * The factors whose product is the score.
 *
 * Carried alongside the score rather than discarded because a bare number is
 * not auditable. "1.80" is not an argument; "0.60 base, ×2.5 because the queue
 * is already in CloudWatch warning, ×2.0 because it carries financial records"
 * is one an approver can accept or attack.
 */
export interface ScoreFactors {
  base: number;
  coupling: number;
  /** attenuation ^ hop, already resolved. */
  attenuation: number;
  /** Live-load injection, up to 3.0× — a stressed system has no headroom. */
  liveLoad: number;
  /** Secrets 3.0×, PII/financial/health 2.0×. */
  dataFlow: number;
}

export type DataSensitivity =
  | "secrets"
  | "financial"
  | "PII"
  | "health"
  | "none";

export interface ImpactNode {
  id: string;
  resource: string;
  arn: string;
  edgeClass: C8EdgeClass;
  /** BFS distance from the target. Traversal runs to 5; it never truncates at 1. */
  hop: number;
  /** Floor 0.05 — nothing scores zero, because there is no zero risk. */
  score: number;
  factors: ScoreFactors;
  criticality: BlastRadiusClass;
  dataSensitivity: DataSensitivity;
  environment: string;
  slaTier: string;
  tenant: string;
  owner: string;
  /** What severing this edge actually does, in words. */
  breaks: string;
  /** Failure taxonomy IDs this node's edge class implicates. */
  closes: string[];
  /** The traversal path from the target, for the drill-down. */
  path: { resource: string; edgeClass: C8EdgeClass }[];
}

/** The six NIST `RS.MA` risk-evaluation factors, adopted verbatim (`04` §B.2). */
export interface RiskFactors {
  assetCriticality: string;
  functionalImpact: string;
  dataImpact: string;
  activityStage: string;
  threatActor: string;
  recoverability: string;
}

export interface RiskModel {
  /** R(S′,F) — residual security risk after the action. */
  residual: number;
  /** D(S,S′) — operational disruption, the blast radius aggregate. */
  disruption: number;
  /** Cost(π), including coordination across teams. */
  cost: number;
  /** Unc(π) = 1 − Π P_success. High uncertainty routes to a human. */
  uncertainty: number;
  /**
   * Calibrated against evidence quality, not threat probability (`04` §B.3).
   * A high confidence on thin evidence is a model-reliability flag, not a
   * green light — the pair is what matters, so both travel together.
   */
  confidence: number;
  evidenceQuality: "strong" | "adequate" | "thin";
  factors: RiskFactors;
}

export interface TierDecision {
  registry: Tier;
  simulation: Tier;
  risk: Tier;
  final: Tier;
  /** The input that won. `max()` is one-way, so this is never ambiguous. */
  decidedBy: TierSource;
  /** Plain-language reason, e.g. "irreversibility, not blast radius". */
  because: string;
  /** Hard escalators present in scope (`03` §4). */
  escalators: string[];
}

/**
 * One rollback procedure per possible partial-execution state (`03` §6).
 *
 * Carries the **pair**: the registry action that moves the plan forward and
 * the inverse that walks it back. Reversibility is a property of that pair —
 * an action with no inverse is where the plan stops being undoable, and a
 * filename alone cannot express that.
 */
export interface RollbackArtifact {
  /** State reached: 0 steps done, 1 step done, … */
  stepsCompleted: number;
  /** The registry action that produced this state. */
  forwardAction: string;
  /** The registry action that undoes it, or null where none exists. */
  inverseAction: string | null;
  procedure: string;
  available: boolean;
  /** What is lost on the way back, when the inverse is not clean. */
  loss?: string;
}

export interface ScopeExpansion {
  crossTenant: boolean;
  via?: C8EdgeClass;
  tenants: string[];
}

export interface BlastRadiusReport {
  version: number;
  /** The forked subgraph this ran against — not the live environment. */
  subgraphVersion: string;
  generatedAt: Date;
  /**
   * Required fields that came back null. Non-empty is a simulation failure and
   * forces TIER_3 — it is an escalation trigger, not missing information.
   */
  nulls: string[];
  class: BlastRadiusClass;
  reversibility: Reversibility;
  scope: ScopeExpansion;
  impact: ImpactNode[];
  risk: RiskModel;
  tier: TierDecision;
  gates: GateResult[];
  rollback: RollbackArtifact[];
  /** Superseded reports keep their reason, so the chain explains itself. */
  supersededReason?: string;
}

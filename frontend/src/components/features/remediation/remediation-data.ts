import { allGroups, LIFECYCLE_STAGES, slug } from "./remediation-structure";

/**
 * Remediation actions, generated deterministically.
 *
 * Same contract as the rest of the explore kit: a seeded generator rather than
 * random values, so a row, its detail pane and an export can never disagree,
 * and a reload does not reshuffle what the operator was reading. A connector
 * replaces `buildActions` and `fieldValue`; nothing else has to change.
 */

export type ActionStatus =
  | "Draft"
  | "Pending approval"
  | "Approved"
  | "Executing"
  | "Validating"
  | "Closed"
  | "Failed"
  | "Rolled back";

export type ActionSeverity = "Critical" | "High" | "Medium" | "Low";

/** Who raised the action. An agent proposal is read differently from a human one. */
export type Origin = "Agent" | "Human" | "Policy" | "Schedule";

/**
 * Who asserted a fact.
 *
 * The distinction between a measurement, a model inference and a human claim is
 * the entire point of an audit, so it travels with the value rather than being
 * implied by which pane the value happens to appear in.
 */
export type Provenance = "scan" | "agent" | "human" | "integration";

export interface RemediationAction {
  id: string;
  title: string;
  status: ActionStatus;
  severity: ActionSeverity;
  /** 1-10, indexing LIFECYCLE_STAGES. */
  stage: number;
  resource: string;
  provider: string;
  account: string;
  region: string;
  environment: string;
  owner: string;
  team: string;
  findings: number;
  assets: number;
  riskBefore: number;
  riskAfter: number;
  auto: boolean;
  approvals: string;
  /** Who raised this. Changes how the whole record should be read. */
  origin: Origin;
  /** Set when the action has been waiting on someone. Drives the ageing badge. */
  blockedSince?: Date;
  openedAt: Date;
  updatedAt: Date;
  dueAt: Date;
}

const STATUSES: ActionStatus[] = [
  "Draft",
  "Pending approval",
  "Approved",
  "Executing",
  "Validating",
  "Closed",
  "Failed",
  "Rolled back",
];
export const SEVERITIES: ActionSeverity[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
];
const PROVIDERS = ["AWS", "Azure", "GCP"];
const REGIONS = ["us-east-1", "eu-west-1", "ap-south-1", "us-west-2"];
const ENVS = ["prod", "staging", "dev"];
const TEAMS = ["Platform", "Security", "Data", "Networking", "AppSec"];
export const OWNERS = [
  "m.haddad",
  "k.novak",
  "j.silva",
  "a.okafor",
  "r.dubois",
  "s.tanaka",
];
export const TITLES = [
  "Public S3 bucket exposure",
  "Unrestricted security group ingress",
  "Unencrypted RDS snapshot",
  "Over-privileged IAM role",
  "Disabled CloudTrail logging",
  "Expired TLS certificate",
  "Public database endpoint",
  "Missing MFA on root account",
  "Stale access keys",
  "Container running as root",
  "Unpatched host CVE-2026-1043",
  "Key vault without purge protection",
];
const ORIGINS: Origin[] = ["Agent", "Human", "Policy", "Schedule"];
export const KINDS = [
  "Bucket",
  "Instance",
  "Database",
  "Function",
  "LoadBalancer",
];

/**
 * FNV-1a — stable across reloads and platforms, unlike `Math.random`.
 *
 * Bitwise operators are the algorithm, not a micro-optimisation: XOR and the
 * unsigned shift are what make it FNV-1a rather than something that merely
 * looks like a hash, so the lint rule is disabled for this function alone.
 */
/* eslint-disable no-bitwise */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/* eslint-enable no-bitwise */

export const pick = <T>(list: T[], seed: string): T =>
  list[hash(seed) % list.length] as T;

export const num = (seed: string, min: number, max: number): number =>
  min + (hash(seed) % (max - min + 1));

/** Fixed epoch so the demo data does not drift between sessions. */
export const EPOCH = Date.UTC(2026, 7, 6, 9, 0, 0);

export function buildActions(count = 48): RemediationAction[] {
  return Array.from({ length: count }, (_, i) => {
    const id = `REM-${String(4100 + i).padStart(4, "0")}`;
    const severity = pick(SEVERITIES, `${id}sev`);
    const status = pick(STATUSES, `${id}st`);
    // A closed action is at stage 10 by definition; anything else would let the
    // table and the lifecycle rail contradict each other.
    const stage =
      status === "Closed" ? 10 : Math.min(9, num(`${id}stage`, 1, 9));
    const riskBefore = num(`${id}rb`, 55, 98);
    return {
      id,
      title: pick(TITLES, `${id}t`),
      status,
      severity,
      stage,
      resource: `${pick(KINDS, `${id}k`).toLowerCase()}-${num(`${id}r`, 1000, 9999)}`,
      provider: pick(PROVIDERS, `${id}p`),
      account: `acct-${num(`${id}a`, 10, 99)}`,
      region: pick(REGIONS, `${id}rg`),
      environment: pick(ENVS, `${id}e`),
      owner: pick(OWNERS, `${id}o`),
      team: pick(TEAMS, `${id}tm`),
      findings: num(`${id}f`, 1, 34),
      assets: num(`${id}as`, 1, 120),
      riskBefore,
      riskAfter:
        status === "Closed" ? num(`${id}ra`, 2, 15) : num(`${id}ra`, 18, 60),
      auto: hash(`${id}auto`) % 3 !== 0,
      approvals: `${num(`${id}ap`, 0, 3)} of 3`,
      origin: pick(ORIGINS, `${id}or`),
      blockedSince:
        status === "Pending approval"
          ? new Date(EPOCH - num(`${id}bl`, 1, 14) * 86400000)
          : undefined,
      openedAt: new Date(EPOCH - num(`${id}op`, 1, 40) * 86400000),
      updatedAt: new Date(EPOCH - num(`${id}up`, 0, 20) * 3600000),
      dueAt: new Date(EPOCH + num(`${id}due`, -4, 20) * 86400000),
    };
  });
}

/**
 * The value shown for one field of one action.
 *
 * Every field named in the structure resolves to something — a pane that
 * rendered "—" for two thirds of its rows would misrepresent the record as
 * mostly empty. Values are derived from the action so they stay consistent with
 * the summary the operator already read in the table.
 */
export function fieldValue(action: RemediationAction, field: string): string {
  const direct: Record<string, string> = {
    Summary: `${action.title} on ${action.resource}`,
    Scope: `${action.assets} asset(s) · ${action.account} · ${action.region}`,
    "Risk Reduction": `${action.riskBefore} → ${action.riskAfter} (−${action.riskBefore - action.riskAfter})`,
    Lifecycle: `Stage ${action.stage} of 10 — ${LIFECYCLE_STAGES[action.stage - 1].label.replace(/^\d+\.\s*/, "")}`,
    Findings: `${action.findings} linked finding(s)`,
    Assets: `${action.assets} affected asset(s)`,
    "Risk Score": `${action.riskBefore} / 100`,
    "Current Status": action.status,
    "Approval Workflow": action.auto
      ? "Automated — policy gate"
      : "Manual — two-person rule",
    "Required Approvers": `${action.team} lead, Security on-call`,
    "SLA Tracking": `Due ${action.dueAt.toISOString().slice(0, 10)}`,
    "Execution Status": action.status,
    "Auto Remediation": action.auto ? "Enabled" : "Disabled — manual only",
    "Rollback Status":
      action.status === "Rolled back" ? "Rolled back" : "Not required",
    "Assigned Teams": action.team,
    "Root Cause": `Misconfiguration introduced in ${action.environment}`,
    "Final Risk Reduction": `${action.riskBefore - action.riskAfter} points`,
    Metadata: `${action.id} · opened ${action.openedAt.toISOString().slice(0, 10)}`,
    Progress: `Stage ${action.stage} of 10`,
    Approvals: action.approvals,
    "Estimated Downtime": action.auto ? "None expected" : "< 5 min",
    "Rollback Risk": action.severity === "Critical" ? "Elevated" : "Low",
  };
  if (direct[field]) return direct[field];

  // Deterministic filler for the remaining structural fields, so each reads as
  // a distinct value rather than a repeated placeholder.
  const seed = `${action.id}:${slug(field)}`;
  const shapes = [
    `${num(seed, 1, 24)} record(s)`,
    `Verified ${new Date(EPOCH - num(seed, 1, 30) * 86400000).toISOString().slice(0, 10)}`,
    `${pick(OWNERS, seed)} · ${pick(TEAMS, `${seed}t`)}`,
    `${num(seed, 2, 96)}% complete`,
    "No exceptions recorded",
  ];
  return pick(shapes, `${seed}shape`);
}

/** Field count across the whole record — shown on the list row as "depth". */
export function totalFields(): number {
  return allGroups().reduce((n, grp) => n + grp.fields.length, 0);
}

/* ------------------------------------------------------------------ *
 * Overview narrative
 * ------------------------------------------------------------------ */

/**
 * The precise thing being changed.
 *
 * Kept as structured parts rather than one pre-joined string: the Summary
 * renders it as rows, the export writes it as fields, and an operator pasting
 * it into a change request needs the account and region separable. Joining
 * early would force every consumer to parse it back apart.
 */
export interface RemediationLocation {
  provider: string;
  account: string;
  region: string;
  environment: string;
  resource: string;
  /** Provider-style path, for copy-paste into a console or CLI. */
  path: string;
}

export function locationOf(a: RemediationAction): RemediationLocation {
  const path =
    a.provider === "AWS"
      ? `arn:aws:${a.region}:${a.account}:${a.resource}`
      : `/${a.provider.toLowerCase()}/${a.account}/${a.region}/${a.resource}`;
  return {
    provider: a.provider,
    account: a.account,
    region: a.region,
    environment: a.environment,
    resource: a.resource,
    path,
  };
}

/**
 * Prose description — what is wrong, why it matters here, and what changes.
 *
 * Three paragraphs rather than one: an operator scanning the record reads the
 * first to decide whether it is theirs, the second to judge urgency, and the
 * third only when they are about to act. One block forces all three decisions
 * through a single wall of text.
 */
export function describeAction(a: RemediationAction): string[] {
  const loc = locationOf(a);
  return [
    `${a.title} was detected on ${loc.resource} in ${loc.account} (${loc.region}, ${loc.environment}). ` +
      `The finding affects ${a.assets} asset${a.assets === 1 ? "" : "s"} and is linked to ${a.findings} open finding${a.findings === 1 ? "" : "s"} owned by the ${a.team} team.`,
    `It is rated ${a.severity} with a risk score of ${a.riskBefore} of 100. ${
      a.environment === "prod"
        ? "Because the affected resource is in production, any change carries user-visible risk and is gated behind approval regardless of the automation available."
        : "The resource is outside production, so the change can proceed on the standard track once pre-checks pass."
    } Completing this remediation is expected to bring the score to ${a.riskAfter}, a reduction of ${a.riskBefore - a.riskAfter} points.`,
    a.auto
      ? `An automated remediation is available and will apply the change through the platform's own executor, capturing a configuration diff and a rollback point before it runs. ${a.severity === "Critical" ? "Because the finding is Critical, the executor pauses for explicit approval before the apply step." : "No manual intervention is expected unless a pre-check fails."}`
      : `No automated path exists for this finding. The change is applied manually against the infrastructure-as-code definition, reviewed as a pull request, and validated by rescan once merged.`,
  ];
}

/* ------------------------------------------------------------------ *
 * Plan
 * ------------------------------------------------------------------ */

/**
 * What a phase does to the estate. Drives the approval it needs.
 *
 * The read/write split is the whole basis of the gate: a phase that only
 * observes cannot be the thing that breaks production, so making someone
 * approve it is ceremony that teaches people to click through approvals
 * without reading them.
 */
export type AccessLevel = "Read" | "Write";

/** Whether a phase may proceed on its own, or is gated behind a human. */
export type PhaseAuthorization =
  | "Authorized"
  | "Requires approval"
  | "Approved"
  | "Blocked";

export interface PlanTask {
  id: string;
  label: string;
  done: boolean;
}

export interface PlanPhase {
  id: string;
  label: string;
  tasks: PlanTask[];
  authorization: PhaseAuthorization;
  /** Why this phase carries that tag — a bare tag invites an argument. */
  reason: string;
  /** Read-only phases need no gate; write phases are what approvals guard. */
  access: AccessLevel;
}

/**
 * The remediation plan, as phases of checkable work.
 *
 * Authorization is DERIVED, never decorative: production and Critical findings
 * gate the phases that mutate or are irreversible, while read-only phases
 * (pre-checks, validation) stay authorized because nothing they do needs a
 * human to accept risk. A plan that tagged every phase the same would train
 * people to ignore the tag.
 */
export function buildPlan(a: RemediationAction): PlanPhase[] {
  const gated = a.environment === "prod" || a.severity === "Critical";
  const loc = locationOf(a);

  /**
   * How many plan phases are complete, from the lifecycle stage.
   *
   * A table rather than a ternary chain: the mapping from the ten lifecycle
   * stages onto the five plan phases is a lookup, and written as nested
   * conditionals it is neither readable nor checkable against the taxonomy.
   * Each entry is the lowest stage at which that phase counts as done.
   */
  const PHASE_AT_STAGE: { stage: number; phases: number }[] = [
    { stage: 10, phases: 5 },
    { stage: 9, phases: 4 },
    { stage: 8, phases: 3 },
    { stage: 6, phases: 2 },
    { stage: 3, phases: 1 },
  ];
  const doneThrough =
    PHASE_AT_STAGE.find((p) => a.stage >= p.stage)?.phases ?? 0;

  /** Gated phases show Approved once passed, and the gate before that. */
  const gateFor = (passed: boolean): PhaseAuthorization => {
    if (!gated) return "Authorized";
    return passed ? "Approved" : "Requires approval";
  };

  const closureAuth = (): PhaseAuthorization => {
    if (doneThrough >= 5) return "Approved";
    if (a.severity === "Critical") return "Requires approval";
    return "Authorized";
  };

  const phase = (
    n: number,
    id: string,
    label: string,
    labels: string[],
    authorization: PhaseAuthorization,
    reason: string,
    access: AccessLevel,
  ): PlanPhase => ({
    id,
    label,
    authorization,
    reason,
    access,
    tasks: labels.map((l, i) => ({
      id: `${id}-${i}`,
      label: l,
      done: n <= doneThrough,
    })),
  });

  return [
    phase(
      1,
      "pre-checks",
      "Phase 1 · Pre-checks",
      [
        `Confirm ${loc.resource} still matches the finding`,
        "Capture current configuration as a rollback point",
        "Verify no change freeze is active for this account",
        "Check dependent services for in-flight deployments",
      ],
      "Authorized",
      "Read-only. Nothing in this phase changes state.",
      "Read",
    ),
    phase(
      2,
      "prepare",
      "Phase 2 · Prepare the change",
      [
        a.auto
          ? "Generate the remediation payload from the detection rule"
          : "Draft the IaC change against the module definition",
        "Run a plan / dry-run and attach the diff",
        "Estimate blast radius and record affected identities",
        "Assign a maintenance window",
      ],
      "Authorized",
      "Produces a proposed change; nothing is applied.",
      "Read",
    ),
    phase(
      3,
      "apply",
      "Phase 3 · Apply",
      [
        a.auto
          ? "Execute the automated remediation"
          : "Merge the reviewed pull request",
        `Apply to ${loc.path}`,
        "Record the configuration diff and policy changes",
        "Confirm no error output from the executor",
      ],
      gateFor(doneThrough >= 3),
      gated
        ? `Mutates a ${a.environment === "prod" ? "production" : a.severity.toLowerCase()} resource — two-person rule applies.`
        : "Non-production and below the approval threshold.",
      "Write",
    ),
    phase(
      4,
      "validate",
      "Phase 4 · Validate",
      [
        "Rescan the affected resource",
        "Compare before / after posture",
        "Run compliance and runtime verification",
        "Check for regressions in dependent services",
      ],
      "Authorized",
      "Verification only. Safe to run unattended.",
      "Read",
    ),
    phase(
      5,
      "close",
      "Phase 5 · Close",
      [
        "Attach audit evidence and the closure report",
        "Map the fix to the affected controls",
        "Link the incident and change request",
        "Record lessons learned",
      ],
      closureAuth(),
      a.severity === "Critical"
        ? "Critical findings need a reviewer to sign off closure."
        : "Closure is recorded automatically once validation passes.",
      "Write",
    ),
  ];
}

/* ------------------------------------------------------------------ *
 * Approvals
 * ------------------------------------------------------------------ */

/**
 * An approval request is NOT a separate record — it is a plan phase seen from
 * the approver's side.
 *
 * This is the whole coordination: `buildApprovals` walks `buildPlan`, so a
 * phase and its approval can never disagree about access level, target or
 * state. Two independently-authored lists would drift the first time a phase
 * was renamed, and an approver would be granting something the plan no longer
 * describes. Every request therefore carries `phaseId`/`phaseLabel`, and the
 * plan's own tag IS that request's state.
 */
export type ApprovalState =
  | "Approved"
  | "Awaiting approval"
  | "Escalated"
  | "Not required";

export interface Approver {
  name: string;
  email: string;
  role: string;
}

export interface BlastRadius {
  resources: number;
  identities: number;
  services: number;
  reachability: string;
  rating: "Low" | "Moderate" | "Elevated" | "High";
}

export interface RollbackOption {
  available: boolean;
  method: string;
  window: string;
  /** Confidence that the rollback restores the prior state cleanly. */
  confidence: "Verified" | "Untested" | "Not available";
}

export interface ApprovalRequest {
  id: string;
  /** The plan phase this gates — the join between the two views. */
  phaseId: string;
  phaseLabel: string;
  state: ApprovalState;
  access: AccessLevel;
  targetResource: string;
  targetPath: string;
  blastRadius: BlastRadius;
  rollback: RollbackOption;
  requestedBy: Approver;
  approver: Approver;
  /** Present only when the SLA elapsed while still awaiting a decision. */
  escalatedTo?: Approver;
  slaDueAt: Date;
  /** Negative means overdue. Whole hours. */
  slaHoursRemaining: number;
  decidedAt?: Date;
  scope: string;
}

export const ROLES = [
  "Security lead",
  "Platform lead",
  "Change manager",
  "Service owner",
  "Compliance officer",
];

function person(seed: string, role: string): Approver {
  const name = pick(OWNERS, seed);
  const [first, last] = name.split(".");
  return {
    name: `${first.toUpperCase()}. ${last.charAt(0).toUpperCase()}${last.slice(1)}`,
    email: `${name}@cloudguard.io`,
    role,
  };
}

export function buildApprovals(a: RemediationAction): ApprovalRequest[] {
  const loc = locationOf(a);
  const plan = buildPlan(a);

  return plan.map((p, i) => {
    const seed = `${a.id}:${p.id}`;

    /**
     * State comes from the phase's authorization, with one addition the plan
     * cannot express: an awaiting request whose SLA has elapsed is ESCALATED.
     * Escalation is a fact about time, not about the plan, so it is derived
     * here rather than duplicated back into the phase.
     */
    const hoursLeft = num(seed, -40, 52) - 12;
    let state: ApprovalState = "Not required";
    if (p.authorization === "Approved") state = "Approved";
    else if (p.authorization === "Requires approval")
      state = hoursLeft < 0 ? "Escalated" : "Awaiting approval";
    else if (p.access === "Read") state = "Approved";

    // A read-only phase can only ever touch what it observes.
    const scale = p.access === "Write" ? 1 : 0;
    const resources = scale === 0 ? 0 : num(`${seed}r`, 3, a.assets);
    const rating: BlastRadius["rating"] =
      p.access === "Read"
        ? "Low"
        : ((): BlastRadius["rating"] => {
            if (a.environment === "prod" && a.severity === "Critical")
              return "High";
            if (a.environment === "prod") return "Elevated";
            if (a.severity === "Critical") return "Elevated";
            return "Moderate";
          })();

    const rollback: RollbackOption =
      p.access === "Read"
        ? {
            available: true,
            method: "No change to revert",
            window: "n/a",
            confidence: "Not available",
          }
        : {
            available: true,
            method: a.auto
              ? "Automated revert to captured snapshot"
              : "Revert the merged IaC commit and re-apply",
            window: a.auto ? "15 min" : "1 h",
            confidence:
              a.environment === "prod" && !a.auto ? "Untested" : "Verified",
          };

    return {
      id: `${a.id}-AP${i + 1}`,
      phaseId: p.id,
      phaseLabel: p.label,
      state,
      access: p.access,
      targetResource: loc.resource,
      targetPath: loc.path,
      blastRadius: {
        resources,
        identities: scale === 0 ? 0 : num(`${seed}i`, 1, 14),
        services: scale === 0 ? 0 : num(`${seed}s`, 0, 6),
        reachability:
          p.access === "Read"
            ? "Read-only — no reachability change"
            : `${a.environment} · ${loc.region}`,
        rating,
      },
      rollback,
      requestedBy: person(`${seed}req`, "Requested by"),
      approver: person(`${seed}app`, pick(ROLES, `${seed}role`)),
      escalatedTo:
        state === "Escalated"
          ? person(`${seed}esc`, "Escalation contact")
          : undefined,
      slaDueAt: new Date(EPOCH + hoursLeft * 3600000),
      slaHoursRemaining: hoursLeft,
      decidedAt:
        state === "Approved"
          ? new Date(EPOCH - num(`${seed}d`, 2, 90) * 3600000)
          : undefined,
      scope:
        p.access === "Write" ? `Write · ${loc.path}` : `Read · ${loc.path}`,
    };
  });
}

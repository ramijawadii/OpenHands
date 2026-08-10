/**
 * The undo journal — the system of record for reversibility.
 *
 * The governing principle from the safety model is a hard gate, not a
 * guideline: **no mutation may execute unless a validated, executable inverse
 * has already been persisted to durable storage outside the target account.**
 * An action whose inverse cannot be computed and stored is not "risky" — it is
 * not eligible for automated execution at all.
 *
 * Three things the model is built to stop the UI from implying, because each
 * is a mistake people make out loud:
 *
 * 1. **A snapshot is not an undo record.** Most remediations are control-plane
 *    — security groups, IAM, bucket settings, logging — where no snapshot
 *    exists and the provider creates none. So `artifacts` is a *separate,
 *    usually empty* field, never the thing that makes an entry revertible.
 * 2. **Logs are not an undo record.** Reconstructing an inverse from CloudTrail
 *    at 03:00 is a forensic exercise, not a rollback mechanism. The inverse is
 *    computed and validated up front or it does not exist.
 * 3. **The journal must not live in the account being remediated.** A
 *    remediation that locks the tenant out must not lock the recovery data
 *    away with it, so storage independence is a first-class, displayed fact.
 */
import {
  hash,
  num,
  pick,
  EPOCH,
  OWNERS,
  type RemediationAction,
} from "../remediation-data";

/**
 * Reversibility tier, from the action classification.
 *
 * `R4` can never be auto-executed. The tiers below it differ in *what the
 * inverse costs*, not in whether one exists — which is why the tier travels
 * with every entry rather than being collapsed into a boolean.
 */
export type ReversibilityTier = "R0" | "R1" | "R2" | "R3" | "R4";

export const TIER_MEANING: Record<ReversibilityTier, string> = {
  R0: "Fully invertible — one clean API call restores prior state",
  R1: "Invertible with side effects — state returns, but something is lost (dropped connections, restarts)",
  R2: "Invertible with data dependency — needs the snapshot artifact to exist and still be in retention",
  R3: "Reconstructible only — no clean inverse; prior state must be rebuilt by hand",
  R4: "Irreversible — never eligible for automated execution",
};

/** Entry lifecycle. `PENDING` past 5 minutes and `REVERT_FAILED` both page. */
export type JournalState =
  | "PENDING"
  | "ACTIVE"
  | "REVERTING"
  | "REVERTED"
  | "REVERT_FAILED"
  | "SUPERSEDED"
  | "EXPIRED"
  | "ABANDONED"
  | "MANUAL_INTERVENTION";

/**
 * The drift gate verdict, computed by comparing the live hash against the
 * journal's recorded hashes. This is the check that decides whether an inverse
 * may run unattended.
 */
export type DriftVerdict =
  | "CLEAN"
  | "ALREADY_REVERTED"
  | "DRIFT_FOREIGN_FIELDS"
  | "DRIFT_SAME_FIELDS"
  | "INDETERMINATE";

export const DRIFT_MEANING: Record<DriftVerdict, string> = {
  CLEAN: "Live state matches what we left. The inverse can run unattended.",
  ALREADY_REVERTED:
    "Live state already matches the prior state — someone reverted this. No-op; do not re-execute.",
  DRIFT_FOREIGN_FIELDS:
    "Someone changed fields the agent never touched. Field-scoped revert only — never overwrite the whole object.",
  DRIFT_SAME_FIELDS:
    "A human changed the same fields the agent did. STOP — reverting would destroy their work.",
  INDETERMINATE:
    "The live state could not be normalised for comparison. Escalate; do not guess.",
};

export interface UndoEntry {
  entryId: string;
  state: JournalState;
  /** Correlation — how an operator selects a revert scope. */
  runId: string;
  waveId: string;
  ruleId: string;
  changeTicket: string;
  initiatedBy: string;

  provider: string;
  account: string;
  region: string;
  resourceType: string;
  resourceId: string;
  environmentTier: string;
  /** IaC-managed resources are PR-only; direct mutation is prohibited. */
  iacManaged: boolean;

  tier: ReversibilityTier;

  /** Hashes of the normalised resource at each point. The drift gate's inputs. */
  priorHash: string;
  postHash: string;
  currentHash: string;
  drift: DriftVerdict;

  forwardApi: string;
  executedAt: Date;

  inverseApi: string;
  /** Validated up front — dry-run where the provider supports one. */
  inverseValidated: boolean;
  validationMethod: string;
  /** Reverts get retried, by automation and by unsure operators. */
  idempotent: boolean;
  /**
   * Revert is not "done" when the API returns 200. IAM ~60s, DNS to TTL,
   * CDN up to 15 min — an operator who declares recovery early is wrong.
   */
  propagationSeconds: number;

  /** Reverse dependency order: these must be reverted before this one. */
  requiresRevertedFirst: string[];
  /** Snapshots/AMIs, when the tier needs one. Usually empty — see the header. */
  artifacts: string[];
  retentionUntil: Date;
  legalHold: boolean;
}

/* ------------------------------------------------------------------ *
 * Builder
 * ------------------------------------------------------------------ */

const MUTATIONS: [string, string, string, string, ReversibilityTier][] = [
  [
    "AWS::EC2::SecurityGroup",
    "ec2:RevokeSecurityGroupIngress",
    "ec2:AuthorizeSecurityGroupIngress",
    "sg-0a1b2c3d4e5f",
    "R0",
  ],
  [
    "AWS::IAM::Role",
    "iam:AttachRolePolicy",
    "iam:DetachRolePolicy",
    "role/batch-processor",
    "R0",
  ],
  [
    "AWS::S3::Bucket",
    "s3:PutPublicAccessBlock",
    "s3:PutPublicAccessBlock",
    "audit-archive",
    "R0",
  ],
  [
    "AWS::RDS::DBSnapshot",
    "rds:ModifyDBSnapshotAttribute",
    "rds:ModifyDBSnapshotAttribute",
    "instance-5116-snap",
    "R2",
  ],
  [
    "AWS::EC2::Instance",
    "ec2:ModifyInstanceAttribute",
    "ec2:ModifyInstanceAttribute",
    "i-05f2c1a9e3b6d47f1",
    "R1",
  ],
];

const STATE_BY_ROLL: JournalState[] = [
  "ACTIVE",
  "ACTIVE",
  "ACTIVE",
  "ACTIVE",
  "REVERTED",
  "SUPERSEDED",
  "PENDING",
  "REVERT_FAILED",
];

function digest16(seed: string): string {
  let out = "";
  for (let i = 0; out.length < 16; i += 1)
    out += hash(`${seed}:${i}`).toString(16).padStart(8, "0");
  return `sha256:${out.slice(0, 16)}…`;
}

/**
 * One entry per mutation the plan made.
 *
 * Entries exist only for steps that have actually executed — the journal
 * records what happened, not what is planned. A record for an unexecuted step
 * would be the same lie as an evidence bundle for a stage that never ran.
 */
export function buildJournal(a: RemediationAction): UndoEntry[] {
  // Stage 7 is Execution; nothing has mutated before it.
  const executed = Math.max(0, Math.min(MUTATIONS.length, a.stage - 6));

  return MUTATIONS.slice(0, executed).map(
    ([resourceType, forwardApi, inverseApi, resourceId, tier], i) => {
      const seed = `${a.id}und${i}`;
      const state = STATE_BY_ROLL[hash(`${seed}st`) % STATE_BY_ROLL.length];

      // The drift gate. CLEAN is the common case; the others are the reason
      // the gate exists at all.
      const driftRoll = hash(`${seed}dr`) % 11;
      let drift: DriftVerdict = "CLEAN";
      if (state === "REVERTED") drift = "ALREADY_REVERTED";
      else if (driftRoll === 0) drift = "DRIFT_SAME_FIELDS";
      else if (driftRoll === 1) drift = "DRIFT_FOREIGN_FIELDS";
      else if (driftRoll === 2) drift = "INDETERMINATE";

      const priorHash = digest16(`${seed}prior`);
      const postHash = digest16(`${seed}post`);
      let currentHash = postHash;
      if (drift === "ALREADY_REVERTED") currentHash = priorHash;
      else if (drift.startsWith("DRIFT") || drift === "INDETERMINATE")
        currentHash = digest16(`${seed}cur`);

      const retentionUntil = new Date(EPOCH);
      retentionUntil.setDate(
        retentionUntil.getDate() + (tier === "R2" ? 35 : 180),
      );

      return {
        entryId: `und_${digest16(seed).slice(7, 17)}`,
        state,
        runId: `run_${a.id.toLowerCase()}`,
        waveId: `wave_${String(Math.floor(i / 2) + 1).padStart(3, "0")}`,
        ruleId: `aws.${resourceType.split("::")[1].toLowerCase()}.${a.id.toLowerCase()}`,
        changeTicket: `CHG-${num(seed, 40000, 49999)}`,
        initiatedBy: a.auto ? "agent" : `operator:${pick(OWNERS, seed)}`,

        provider: a.provider,
        account: a.account,
        region: a.region,
        resourceType,
        resourceId,
        environmentTier: a.environment,
        iacManaged: hash(`${seed}iac`) % 4 === 0,

        tier,
        priorHash,
        postHash,
        currentHash,
        drift,

        forwardApi,
        executedAt: new Date(EPOCH - (executed - i) * num(seed, 4, 40) * 60000),

        inverseApi,
        inverseValidated: true,
        validationMethod: "dry_run",
        idempotent: true,
        // IAM and anything fronted by a CDN are eventually consistent.
        propagationSeconds: resourceType.includes("IAM") ? 60 : 15,

        // Saga ordering: a step can only be undone after the steps that were
        // layered on top of it. Compensating out of order fails — deleting an
        // attached security group, for instance.
        requiresRevertedFirst: MUTATIONS.slice(i + 1, executed).map(
          (_, j) => `und_${digest16(`${a.id}und${i + 1 + j}`).slice(7, 17)}`,
        ),
        artifacts: tier === "R2" ? [`snap-${digest16(seed).slice(7, 15)}`] : [],
        retentionUntil,
        legalHold: hash(`${seed}lh`) % 13 === 0,
      };
    },
  );
}

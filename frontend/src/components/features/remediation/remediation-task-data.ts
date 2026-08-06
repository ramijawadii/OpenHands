import {
  hash,
  num,
  pick,
  EPOCH,
  type RemediationAction,
} from "./remediation-data";
import { digest } from "./remediation-detail-data";
import { STRATEGY_BY_ID, type StrategySpec } from "./remediation-strategy";

/**
 * Per-task execution detail: what the agent ran, why, and what it saved first.
 *
 * A plan task is the unit a human approves and an executor performs, so it has
 * to be individually addressable — hence a content-derived id rather than a
 * positional index. Reordering the plan must not silently repoint an approval
 * or an audit entry at different work.
 */

/** Stable, content-derived task id. `tsk_` + 12 hex. */
export function taskId(actionId: string, phase: string, label: string): string {
  return `tsk_${digest(`${actionId}:${phase}:${label}`).slice(0, 12)}`;
}

export function phaseId(actionId: string, phase: string): string {
  return `phs_${digest(`${actionId}:${phase}`).slice(0, 8)}`;
}

/* ------------------------------------------------------------------ *
 * IN / OUT — the command trace
 * ------------------------------------------------------------------ */

export type StreamKind = "in" | "out";

/** `[command, output, exitCode?]` — one issued step and its response. */
type Pair = [string, string, number?];

export interface TraceStep {
  seq: number;
  kind: StreamKind;
  /** The command as issued, or the response as received. */
  text: string;
  /** Non-zero marks a failed step — rendered, not hidden. */
  exit?: number;
  at: Date;
  /** Present on the step that produced a code change. */
  diff?: CodeDiff;
}

export interface CodeDiff {
  path: string;
  language: string;
  hunks: { line: string; kind: "add" | "del" | "ctx" }[];
}

const TF_DIFF: CodeDiff = {
  path: "terraform/modules/network/security_group.tf",
  language: "hcl",
  hunks: [
    { kind: "ctx", line: 'resource "aws_security_group_rule" "ingress_ssh" {' },
    { kind: "ctx", line: '  type              = "ingress"' },
    { kind: "ctx", line: "  from_port         = 22" },
    { kind: "ctx", line: "  to_port           = 22" },
    { kind: "ctx", line: '  protocol          = "tcp"' },
    { kind: "del", line: '  cidr_blocks       = ["0.0.0.0/0"]' },
    { kind: "add", line: "  cidr_blocks       = var.trusted_admin_cidrs" },
    { kind: "ctx", line: "  security_group_id = aws_security_group.app.id" },
    { kind: "ctx", line: "}" },
    { kind: "ctx", line: "" },
    { kind: "add", line: 'variable "trusted_admin_cidrs" {' },
    { kind: "add", line: "  type        = list(string)" },
    {
      kind: "add",
      line: '  description = "Admin CIDRs permitted to reach SSH."',
    },
    { kind: "add", line: "}" },
  ],
};

/**
 * The trace, alternating in/out.
 *
 * Read-only discovery commands come first, the write last — which is also the
 * order the checkpoint gate depends on: a write step is only reachable once a
 * checkpoint exists.
 */
export function buildTrace(
  action: RemediationAction,
  phase: string,
  label: string,
): TraceStep[] {
  const seed = `${action.id}${phase}${label}`;
  const isWrite = phase === "apply";
  const isPlan = phase === "prepare";

  /**
   * Traces per phase, selected by lookup rather than a ternary chain.
   *
   * The write phase deliberately shows the checkpoint command BETWEEN discovery
   * and apply: the ordering is the control, and a reader must be able to see
   * that nothing was written before the snapshot existed.
   */
  const WRITE_PAIRS: Pair[] = [
    [
      `aws ec2 describe-security-groups --group-ids sg-0a91 --region ${action.region}`,
      `{\n  "SecurityGroups": [\n    {\n      "GroupId": "sg-0a91",\n      "IpPermissions": [\n        { "FromPort": 22, "IpRanges": [{ "CidrIp": "0.0.0.0/0" }] }\n      ]\n    }\n  ]\n}`,
    ],
    [
      "cloudguard checkpoint create --target sg-0a91 --reason pre-write",
      `checkpoint ckpt_${digest(seed).slice(0, 10)} created\nsnapshot captured · rollback verified`,
    ],
    [
      "terraform apply -auto-approve -target=aws_security_group_rule.ingress_ssh",
      "aws_security_group_rule.ingress_ssh: Modifying...\naws_security_group_rule.ingress_ssh: Modifications complete after 3s\n\nApply complete! Resources: 0 added, 1 changed, 0 destroyed.",
    ],
  ];

  const PLAN_PAIRS: Pair[] = [
    [
      "terraform plan -out=remediation.tfplan",
      'Terraform will perform the following actions:\n\n  # aws_security_group_rule.ingress_ssh will be updated in-place\n  ~ resource "aws_security_group_rule" "ingress_ssh" {\n      ~ cidr_blocks = ["0.0.0.0/0"] -> (known after apply)\n    }\n\nPlan: 0 to add, 1 to change, 0 to destroy.',
    ],
    [
      "terraform show -json remediation.tfplan | jq '.resource_changes'",
      "[ 1 change ]",
    ],
  ];

  const READ_PAIRS: Pair[] = [
    [
      `cloudguard inventory get --resource ${action.resource} --json`,
      `{\n  "resource": "${action.resource}",\n  "account": "${action.account}",\n  "region": "${action.region}",\n  "environment": "${action.environment}"\n}`,
    ],
    [
      `cloudguard graph neighbours --resource ${action.resource} --depth 2`,
      `${num(seed, 3, 24)} neighbours · ${num(`${seed}i`, 1, 9)} identities · ${num(`${seed}s`, 0, 5)} services`,
    ],
  ];

  let pairs = READ_PAIRS;
  if (isWrite) pairs = WRITE_PAIRS;
  else if (isPlan) pairs = PLAN_PAIRS;

  const steps: TraceStep[] = [];
  pairs.forEach(([cmd, out, exit], i) => {
    const at = new Date(EPOCH - (pairs.length - i) * 4 * 60000);
    steps.push({ seq: steps.length + 1, kind: "in", text: cmd, at });
    steps.push({
      seq: steps.length + 1,
      kind: "out",
      text: out,
      exit: exit ?? 0,
      at: new Date(at.getTime() + 1200),
      // The diff rides on the step that produced it, so it cannot be shown
      // beside a command that did not generate it.
      diff: isPlan && i === 0 ? TF_DIFF : undefined,
    });
  });
  return steps;
}

/* ------------------------------------------------------------------ *
 * Chain of thought
 * ------------------------------------------------------------------ */

export interface ThoughtStep {
  seq: number;
  kind: "observation" | "reasoning" | "decision" | "rejected";
  text: string;
}

/**
 * The agent's reasoning, typed rather than free prose.
 *
 * A rejected alternative is a first-class kind: reasoning that only records
 * what was chosen is unfalsifiable, and an auditor cannot tell a considered
 * decision from a lucky one.
 */
export function buildThoughts(
  action: RemediationAction,
  phase: string,
): ThoughtStep[] {
  const base: [ThoughtStep["kind"], string][] = [
    [
      "observation",
      `${action.resource} exposes an ingress rule to 0.0.0.0/0. The resource is in ${action.environment} and carries ${action.assets} dependent asset(s).`,
    ],
    [
      "reasoning",
      "The resource is Terraform-managed. Remediating through the cloud API would be reverted by the next apply, so the change must go through the IaC channel to hold.",
    ],
    [
      "reasoning",
      `Blast radius is bounded to the security group and the ${num(action.id, 1, 9)} instances attached to it. No load balancer listener depends on port 22.`,
    ],
    [
      "rejected",
      "Delete the rule outright — rejected: administrative access would be lost and there is no break-glass path configured for this account.",
    ],
    [
      "rejected",
      "Restrict to the VPN CIDR — rejected: the VPN range is dynamically allocated, so the rule would drift back into non-compliance.",
    ],
    [
      "decision",
      "Replace the literal CIDR with a `trusted_admin_cidrs` variable and set it from the account's admin prefix list. Reversible, reviewable as a diff, and holds against the next apply.",
    ],
  ];
  if (phase === "apply")
    base.push([
      "decision",
      "A checkpoint is mandatory before this write. Proceeding only once the snapshot is captured and the rollback path is verified.",
    ]);
  return base.map(([kind, text], i) => ({ seq: i + 1, kind, text }));
}

/* ------------------------------------------------------------------ *
 * Checkpoint
 * ------------------------------------------------------------------ */

export interface Checkpoint {
  id: string;
  createdAt: Date;
  target: string;
  /** What the snapshot actually captured. */
  captured: string[];
  sha256: string;
  sizeBytes: number;
  rollbackVerified: boolean;
  rollbackWindow: string;
  /** Only write tasks require one; read tasks state that plainly. */
  required: boolean;
}

/**
 * A checkpoint is mandatory before any write.
 *
 * It is modelled as an artifact rather than a flag because the operator's real
 * question is "can this be undone, and was that proven" — which a boolean
 * cannot answer. `rollbackVerified` is the gate input: an unverified rollback
 * is not a rollback.
 */
export function buildCheckpoint(
  action: RemediationAction,
  phase: string,
  label: string,
): Checkpoint {
  const seed = `${action.id}${phase}${label}ck`;
  const required = phase === "apply" || phase === "close";
  return {
    id: `ckpt_${digest(seed).slice(0, 10)}`,
    createdAt: new Date(EPOCH - num(seed, 1, 40) * 60000),
    target: action.resource,
    captured: [
      "Resource configuration (pre-change)",
      "Attached policy documents",
      "Security group rule set",
      "Tag set and ownership metadata",
    ],
    sha256: digest(`${seed}h`),
    sizeBytes: num(seed, 2048, 96000),
    rollbackVerified: action.environment !== "prod" || action.auto,
    rollbackWindow: action.auto ? "15 min" : "1 h",
    required,
  };
}

/** The strategy this action executes through — resolved, not chosen by hand. */
export function strategyFor(action: RemediationAction): StrategySpec {
  const id = action.auto
    ? pick(
        ["IAC_PR", "CLOUD_API", "POLICY_AS_CODE", "AUTOMATION_RUNBOOK"],
        action.id,
      )
    : pick(
        [
          "IAC_PR",
          "CHANGE_REQUEST",
          "CONFIGURATION_MANAGEMENT",
          "TICKET_ASSIGNMENT",
        ],
        action.id,
      );
  return STRATEGY_BY_ID[id];
}

/** The policy that gated it. Version included — an unversioned policy is untraceable. */
export function policyFor(action: RemediationAction): {
  id: string;
  version: string;
  effect: string;
} {
  const prod = action.environment === "prod";
  return {
    id: prod ? "prod-write-two-person" : "standard-change",
    version: `${1 + (hash(action.id) % 3)}.${hash(`${action.id}v`) % 10}`,
    effect: prod
      ? "Requires two approvals before any write"
      : "Single approval, auto-authorized for read phases",
  };
}

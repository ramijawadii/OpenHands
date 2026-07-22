/* eslint-disable i18next/no-literal-string */
import { useLogStore, LogEntry } from "#/state/log-store";
import { LogTimeline } from "#/components/features/logs/log-timeline";

/** Logs — the audit trail: what the agent did, whether it was permitted, and
 *  whether it can be undone. Read-only by design. */

const T0 = Date.now();
const at = (secondsAgo: number) => T0 - secondsAgo * 1000;

const COMMON = {
  tenantId: "tnt_8f21c4",
  conversationId: "2df22847",
  assessmentId: "asm_2026_07_21_a",
  actor: {
    principal: "cloudguard-agent",
    kind: "agent" as const,
    model: "claude-opus-4-8",
    agentVersion: "0.59.0",
    onBehalfOf: "rami@devence.io",
  },
};

const SAMPLE: LogEntry[] = [
  {
    ...COMMON,
    id: -1,
    cause: 1204,
    ts: at(600),
    kind: "bash",
    title: "aws sts get-caller-identity",
    effect: "read",
    verdict: "allowed",
    skillId: "aws/identity/whoami",
    executionMode: "autonomous",
    target: {
      provider: "aws",
      accountId: "123456789012",
      region: "eu-west-1",
      resourceType: "iam:Role",
      resourceId: "arn:aws:iam::123456789012:role/CloudGuardAudit",
    },
    status: "ok",
    exitCode: 0,
    durationMs: 840,
    resourcesAffected: 0,
    reversibility: "n/a",
    source: "agent",
  },
  {
    ...COMMON,
    id: -2,
    cause: 1211,
    ts: at(540),
    kind: "read",
    title: "142 describe-* calls across 4 regions (aggregated)",
    detail:
      "ec2:DescribeInstances ×19\ns3:GetBucketPolicy ×41\niam:ListRoles ×12\n… 70 more",
    effect: "read",
    verdict: "allowed",
    skillId: "aws/inventory/sweep",
    executionMode: "autonomous",
    target: { provider: "aws", accountId: "123456789012", region: "multi" },
    status: "ok",
    durationMs: 192_000,
    resourcesAffected: 0,
    reversibility: "n/a",
    source: "agent",
  },
  {
    ...COMMON,
    id: -3,
    cause: 1240,
    ts: at(430),
    kind: "bash",
    title: "aws iam list-policies --scope Local",
    effect: "unknown",
    verdict: "allowed",
    executionMode: "autonomous",
    target: {
      provider: "aws",
      accountId: "123456789012",
      region: "us-east-1",
      resourceType: "iam:Policy",
    },
    status: "failed",
    exitCode: 254,
    durationMs: 1_310,
    errorClass: "AccessDenied",
    reversibility: "n/a",
    source: "agent",
  },
  {
    ...COMMON,
    id: -4,
    cause: 1266,
    ts: at(320),
    kind: "bash",
    title: "aws s3api put-public-access-block --bucket prod-artifacts",
    effect: "write",
    verdict: "approved",
    approver: "rami@devence.io",
    skillId: "aws/s3/block-public-access",
    executionMode: "ask",
    blastRadius: 3,
    target: {
      provider: "aws",
      accountId: "123456789012",
      region: "eu-west-1",
      resourceType: "s3:Bucket",
      resourceId: "prod-artifacts",
    },
    status: "ok",
    exitCode: 0,
    durationMs: 2_040,
    resourcesAffected: 1,
    reversibility: "reversible",
    snapshotId: "snap_7c19ae",
    source: "agent",
  },
  {
    ...COMMON,
    id: -5,
    cause: 1281,
    ts: at(240),
    kind: "bash",
    title: "aws iam delete-role --role-name legacy-ci-deployer",
    effect: "write",
    verdict: "denied",
    policyRuleId: "POL-IAM-014",
    executionMode: "ask",
    blastRadius: 27,
    target: {
      provider: "aws",
      accountId: "123456789012",
      region: "global",
      resourceType: "iam:Role",
      resourceId: "legacy-ci-deployer",
    },
    status: "failed",
    durationMs: 60,
    errorClass: "PolicyDenied",
    resourcesAffected: 0,
    reversibility: "irreversible",
    source: "agent",
  },
  {
    ...COMMON,
    id: -6,
    cause: 1290,
    ts: at(150),
    kind: "error",
    title: "output redacted — 2 credentials matched in command output",
    detail: "aws_secret_access_key=***REDACTED***\nAKIA***REDACTED***",
    effect: "read",
    verdict: "redacted",
    policyRuleId: "FILTER-SECRET-03",
    target: { provider: "aws", accountId: "123456789012" },
    status: "ok",
    durationMs: 12,
    reversibility: "n/a",
    source: "environment",
  },
  {
    ...COMMON,
    id: -7,
    cause: 1302,
    ts: at(40),
    kind: "edit",
    title: "remediation/iam-least-privilege.tf",
    effect: "write",
    verdict: "approved",
    approver: "rami@devence.io",
    executionMode: "plan",
    blastRadius: 6,
    target: {
      provider: "aws",
      accountId: "123456789012",
      resourceType: "terraform:Module",
      resourceId: "iam-least-privilege",
    },
    status: "ok",
    durationMs: 310,
    resourcesAffected: 4,
    reversibility: "reversible",
    snapshotId: "snap_91b0f2",
    source: "agent",
  },
];

/** Filler so the sample spans more than one page and the pagination/filter
 *  controls can be exercised. Deliberately mundane read traffic — in a real
 *  session this is exactly the volume the aggregation rule collapses. */
const FILLER: LogEntry[] = Array.from({ length: 30 }, (_, i) => {
  const svc = ["ec2", "s3", "iam", "rds", "lambda", "kms"][i % 6];
  const region = ["eu-west-1", "us-east-1", "ap-southeast-1"][i % 3];
  const failed = i % 9 === 4;
  return {
    ...COMMON,
    id: -100 - i,
    cause: 1400 + i,
    ts: at(620 + i * 11),
    kind: "bash" as const,
    title: `aws ${svc} describe-${svc === "s3" ? "buckets" : "instances"} --region ${region}`,
    effect: "read" as const,
    verdict: "allowed" as const,
    skillId: `aws/${svc}/inventory`,
    executionMode: "autonomous",
    target: {
      provider: "aws" as const,
      accountId: "123456789012",
      region,
      resourceType: `${svc}:*`,
    },
    status: failed ? ("failed" as const) : ("ok" as const),
    exitCode: failed ? 255 : 0,
    durationMs: 300 + ((i * 137) % 2400),
    resourcesAffected: 0,
    errorClass: failed ? "Throttling" : undefined,
    reversibility: "n/a" as const,
    source: "agent" as const,
  };
});

function LogsTab() {
  const entries = useLogStore((s) => s.entries);
  const truncated = useLogStore((s) => s.truncated);

  const isSample = entries.length === 0;
  const shown = isSample
    ? [...SAMPLE, ...FILLER].sort((a, b) => b.ts - a.ts)
    : entries;

  return (
    <div className="flex h-full w-full flex-col">
      {isSample && (
        <div className="mx-3 mt-3 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-accent-purple-bg)] px-3 py-1.5 text-[11px] text-[var(--cg-text-nav)]">
          Sample — the full audit record. Live entries currently fill only the
          fields the WS stream carries; the rest need the backend event sink.
        </div>
      )}
      <div className="min-h-0 flex-1">
        <LogTimeline entries={shown} truncated={!isSample && truncated} />
      </div>
    </div>
  );
}

export default LogsTab;

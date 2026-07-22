/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useCommandStore } from "#/state/command-store";
import {
  ExecutionCell,
  type ExecStatus,
} from "#/components/features/execution/execution-cell";

type Status = ExecStatus;

/** Real status from the process exit code. We never guess from output text:
 *  an absent code is reported as "unknown", not silently as success. */
function statusOf(cell: Cell): Status {
  if (!cell.output && cell.exitCode == null) {
    return { kind: "running" };
  }
  if (cell.exitCode == null) {
    return { kind: "unknown" };
  }
  if (cell.exitCode === 0) {
    return { kind: "ok" };
  }
  // Distinguish the shell's well-known terminal cases from a plain failure.
  const label =
    cell.exitCode === 124
      ? "timeout"
      : cell.exitCode === 137
        ? "killed"
        : cell.exitCode === 126
          ? "not executable"
          : cell.exitCode === 127
            ? "not found"
            : "failed";
  return { kind: "failed", code: cell.exitCode, label };
}

/** Short title for the cell — the executed binary/subcommand. */
function titleOf(input: string): string {
  const first = input.trim().split("\n")[0];
  return first.length > 64 ? `${first.slice(0, 64)}…` : first;
}

type Kind = "bash" | "python";
type Cell = {
  n: number;
  input: string;
  output: string;
  kind: Kind;
  /** ordering key (epoch ms when known) + stable arrival tiebreaker */
  ts?: number;
  seq: number;
  execState?: "idle" | "queued" | "running" | "success" | "error";
  exitCode?: number | null;
  /** output that arrived with no preceding input (e.g. reconnect mid-command) */
  orphan?: boolean;
};

type Entry = {
  content: string;
  type: "input" | "output";
  execState?: "idle" | "queued" | "running" | "success" | "error";
  ts?: number;
  seq?: number;
  exitCode?: number | null;
};

/** Pair a flat {input,output} stream into In/Out cells.
 *  Production paths handled: output with no preceding input (reconnect mid
 *  command) becomes an orphan cell rather than being dropped; the cell inherits
 *  the exit code of its LAST output chunk. */
function toCells(entries: Entry[], kind: Kind, offset: number): Cell[] {
  const cells: Cell[] = [];
  entries.forEach((c, i) => {
    const seq = c.seq ?? offset + i;
    if (c.type === "input") {
      cells.push({
        n: 0,
        input: c.content,
        output: "",
        kind,
        ts: c.ts,
        seq,
        execState: c.execState,
      });
      return;
    }
    const last = cells[cells.length - 1];
    if (!last) {
      // orphan output — surface it instead of silently discarding
      cells.push({
        n: 0,
        input: "(output received without a matching command)",
        output: c.content,
        kind,
        ts: c.ts,
        seq,
        exitCode: c.exitCode ?? null,
        orphan: true,
      });
      return;
    }
    last.output = last.output ? `${last.output}\n${c.content}` : c.content;
    if (c.exitCode !== undefined) last.exitCode = c.exitCode;
  });
  return cells;
}

function CommandCell({ cell }: { cell: Cell }) {
  const status = statusOf(cell);
  return (
    <ExecutionCell
      n={cell.n}
      kindLabel="bash"
      title={titleOf(cell.input)}
      status={status}
      code={cell.input}
      output={cell.output}
    />
  );
}

// Shown only while no real command has run, so the tab can be reviewed with
// representative content. Replaced by live cells the moment the agent executes.
const SAMPLE_CELLS: Cell[] = [
  {
    n: 1,
    input: "aws sts get-caller-identity",
    kind: "bash",
    seq: 0,
    exitCode: 0,
    output:
      '{ "Account": "418293744019", "Alias": "inference-defense" }\n→ authenticated as agent@inference-defense',
  },
  {
    n: 2,
    input:
      "aws organizations list-accounts --query 'Accounts[].{Id:Id,Name:Name,Status:Status}'",
    kind: "bash",
    seq: 0,
    exitCode: 0,
    output:
      "[ { Id: 4182…, Name: prod,           Status: ACTIVE },\n  { Id: 8120…, Name: staging,        Status: ACTIVE },\n  { Id: 5540…, Name: security-audit, Status: ACTIVE } ]\n→ 3 accounts in the organisation",
  },
  {
    n: 3,
    input:
      "top = df.groupby(['userIdentity.userName','eventName']).size()\ntop = top.reset_index(name='calls').sort_values('calls', ascending=False).head(20)\nprint(top.to_string())",
    kind: "python",
    seq: 0,
    exitCode: 0,
    output:
      "ci-bot                  GetObject                142,031\ndevops                  DescribeInstances         89,204\nAssumedRole/Lambda      Invoke                    67,118\nci-bot                  PutObject                 41,902\nanalytics               StartQueryExecution       28,640\ndevops                  AssumeRole                19,855",
  },
  {
    n: 4,
    input: "aws s3 ls s3://cloudtrail-archive-prod --recursive",
    kind: "bash",
    seq: 0,
    exitCode: 254,
    output:
      "An error occurred (AccessDenied) when calling the ListObjectsV2 operation: Access Denied",
  },
  {
    // long on purpose — exercises the 12-line cutoff + Show more / Show less
    n: 5,
    input:
      "aws ec2 describe-instances --query 'Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,State:State.Name}' --output text",
    kind: "bash",
    seq: 0,
    exitCode: 0,
    output: [
      "i-04a1f2 t3.large   running   us-east-1a  (eks-node-1)",
      "i-04a2b7 t3.large   running   us-east-1a  (eks-node-2)",
      "i-04a39c t3.large   running   us-east-1b  (eks-node-3)",
      "i-04a4d1 t3.micro   running   us-east-1a  (bastion)",
      "i-04a5e8 m5.xlarge  running   us-east-1c  (build-runner)",
      "i-04a6f3 m5.xlarge  stopped   us-east-1c  (build-runner-2)",
      "i-04a7aa t3.small   running   us-east-1b  (metrics-collector)",
      "i-04a8bc t3.small   running   us-east-1b  (log-shipper)",
      "i-04a9cd r5.large   running   us-east-1a  (redis-primary)",
      "i-04aade r5.large   running   us-east-1b  (redis-replica)",
      "i-04abef c5.2xlarge running   us-east-1c  (scanner-pool-1)",
      "i-04ac01 c5.2xlarge running   us-east-1c  (scanner-pool-2)",
      "i-04ad12 c5.2xlarge stopped   us-east-1c  (scanner-pool-3)",
      "i-04ae23 t3.medium  running   eu-west-1a  (eu-gateway)",
      "i-04af34 t3.medium  running   eu-west-1b  (eu-worker-1)",
      "i-04b045 t3.medium  running   eu-west-1b  (eu-worker-2)",
      "i-04b156 t3.nano    running   eu-west-1a  (eu-bastion)",
      "i-04b267 m6g.large  running   ap-southeast-1a (apac-api-1)",
      "i-04b378 m6g.large  running   ap-southeast-1b (apac-api-2)",
      "→ 19 instances across 4 regions (3 stopped)",
    ].join("\n"),
  },
];

/** Transcript of executed commands as In/Out cells (replaces the git-diff tab). */
function CommandsTab() {
  // Shell executions only. IPython/Jupyter cells live in the Jupyter tab — mixing
  // the two made neither surface readable.
  const commands = useCommandStore((s) => s.commands);
  const liveCells = React.useMemo(() => {
    const cells = toCells(commands, "bash", 0);
    // True chronological order. Timestamps win; `seq` (monotonic arrival) breaks
    // ties and covers entries whose timestamp was missing/unparseable, so the
    // sort is always total and never NaN-driven.
    cells.sort((a, b) => {
      if (a.ts != null && b.ts != null && a.ts !== b.ts) return a.ts - b.ts;
      return a.seq - b.seq;
    });
    return cells.map((c, i) => ({ ...c, n: i + 1 }));
  }, [commands]);

  const isSample = liveCells.length === 0;
  const cells = isSample ? SAMPLE_CELLS : liveCells;

  return (
    <div className="cg-scroll h-full w-full overflow-y-auto px-3 py-3">
      {isSample && (
        <div className="mb-3 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-accent-purple-bg)] px-3 py-1.5 text-[11px] text-[var(--cg-text-nav)]">
          Sample — no commands executed yet. Live cells replace this as the agent
          runs.
        </div>
      )}
      <div className="flex flex-col gap-3">
        {cells.map((cell) => (
          <CommandCell key={cell.n} cell={cell} />
        ))}
      </div>
    </div>
  );
}

export default CommandsTab;

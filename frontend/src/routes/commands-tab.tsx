/* eslint-disable i18next/no-literal-string */
import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useCommandStore } from "#/state/command-store";

// Keep every card the same height: clip long code/output and mark it.
const MAX_LINES = 12;

function clip(text: string): { body: string; clipped: boolean } {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.length <= MAX_LINES) {
    return { body: lines.join("\n"), clipped: false };
  }
  return { body: lines.slice(0, MAX_LINES).join("\n"), clipped: true };
}

/** Heuristic status: a non-zero exit / obvious error text marks the cell failed. */
function isFailure(output: string): boolean {
  return /(^|\n)\s*(error|traceback|command not found|permission denied)/i.test(
    output,
  );
}

/** Short title for the cell — the executed binary/subcommand. */
function titleOf(input: string): string {
  const first = input.trim().split("\n")[0];
  return first.length > 64 ? `${first.slice(0, 64)}…` : first;
}

type Cell = { n: number; input: string; output: string };

/** Pair the flat command stream into In/Out cells. */
function toCells(commands: { content: string; type: "input" | "output" }[]) {
  const cells: Cell[] = [];
  commands.forEach((c) => {
    if (c.type === "input") {
      cells.push({ n: cells.length + 1, input: c.content, output: "" });
    } else if (cells.length) {
      const last = cells[cells.length - 1];
      last.output = last.output ? `${last.output}\n${c.content}` : c.content;
    }
  });
  return cells;
}

function CommandCell({ cell }: { cell: Cell }) {
  const code = clip(cell.input.trim());
  const out = clip(cell.output.trim());
  const failed = isFailure(cell.output);

  return (
    <div className="cg-msg-in overflow-hidden rounded-lg border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)]">
      {/* header: In [n] · title · status */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--cg-border-subtle)] bg-black/20 px-3 py-1.5 text-[11px] text-[var(--cg-text-muted)]">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className="shrink-0">In [{cell.n}]</span>
          <span className="truncate font-mono text-[var(--cg-text-nav)]">
            {titleOf(cell.input)}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 font-mono">
          {cell.output ? (
            <>
              {failed ? (
                <XCircle className="h-3 w-3 text-[var(--cg-danger)]" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              )}
              {failed ? "failed" : "ok"}
            </>
          ) : (
            "running"
          )}
        </span>
      </div>

      {/* the executed command */}
      <pre className="cg-scroll overflow-x-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed text-[var(--cg-text-primary)] whitespace-pre-wrap break-words">
        {code.body}
        {code.clipped && (
          <span className="text-[var(--cg-text-muted)]">{"\n… truncated"}</span>
        )}
      </pre>

      {/* the output */}
      {cell.output && (
        <div className="border-t border-[var(--cg-border-subtle)] bg-black/30 px-3 py-2 font-mono text-[11.5px] text-[var(--cg-text-nav)]">
          <span className="mr-2 text-[var(--cg-text-muted)]">
            Out[{cell.n}]:
          </span>
          <pre className="inline whitespace-pre-wrap break-words">
            {out.body}
          </pre>
          {out.clipped && (
            <div className="mt-1 text-[11px] text-[var(--cg-text-muted)]">
              … output truncated
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Transcript of executed commands as In/Out cells (replaces the git-diff tab). */
function CommandsTab() {
  const commands = useCommandStore((s) => s.commands);
  const cells = React.useMemo(() => toCells(commands), [commands]);

  if (cells.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center px-6 text-center text-[12.5px] text-[var(--cg-text-muted)]">
        No commands executed yet — the agent&apos;s shell activity will appear
        here.
      </div>
    );
  }

  return (
    <div className="cg-scroll h-full w-full overflow-y-auto px-3 py-3">
      <div className="flex flex-col gap-3">
        {cells.map((cell) => (
          <CommandCell key={cell.n} cell={cell} />
        ))}
      </div>
    </div>
  );
}

export default CommandsTab;

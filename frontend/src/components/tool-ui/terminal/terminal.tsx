"use client";

import { useState, useCallback } from "react";
import Ansi from "ansi-to-react";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal as TerminalIcon,
} from "lucide-react";
import type { TerminalProps } from "./schema";
import { useCopyToClipboard } from "../shared/use-copy-to-clipboard";

import { Button, Collapsible, CollapsibleTrigger, cn } from "./_adapter";

const COPY_ID = "terminal-output";

type TerminalControlledProps = {
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

type TerminalRootProps = TerminalProps & TerminalControlledProps;

type TerminalHeaderProps = Pick<
  TerminalProps,
  "command" | "cwd" | "exitCode"
> & {
  formattedDuration: string | null;
  hasOutput: boolean;
  copiedId: string | null;
  onCopy: () => void;
  /** LOCAL EDIT (CloudGuard): clamp a long input to this many lines */
  maxLines?: number;
};

type TerminalOutputProps = Pick<
  TerminalProps,
  "stdout" | "stderr" | "truncated"
> & {
  isCollapsed: boolean;
  shouldCollapse: boolean;
  lineCount: number;
  onToggleCollapse: () => void;
  /** LOCAL EDIT (CloudGuard): clamp collapsed output to this many lines */
  maxLines?: number;
};

/**
 * LOCAL EDIT (CloudGuard): the `IN` / `OUT` gutter label.
 *
 * Fixed width so both halves of the card align on the same left edge, and
 * borderless — the label alone is enough separation.
 */
function GutterLabel({ children }: { children: string }) {
  return (
    <span
      aria-hidden
      className="text-muted-foreground mt-0.5 w-7 shrink-0 font-mono text-[10px] leading-4 tracking-wider select-none"
    >
      {children}
    </span>
  );
}

function formatDuration(durationMs?: number): string | null {
  if (durationMs == null) return null;
  if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function countOutputLines(output: string): number {
  const trimmedTrailingNewlines = output.replace(/\n+$/, "");
  if (!trimmedTrailingNewlines) return 0;
  return trimmedTrailingNewlines.split("\n").length;
}

function TerminalHeader({
  command,
  cwd,
  exitCode,
  formattedDuration,
  hasOutput,
  copiedId,
  onCopy,
  maxLines,
}: TerminalHeaderProps) {
  /*
    LOCAL EDIT (CloudGuard): upstream truncates the command to one line, which
    is right for bash but unreadable for the multi-line inputs we also route
    through this component — an IPython cell, or an MCP tool's JSON arguments.
    A multi-line command keeps its line breaks, and is itself clamped to
    `maxLines` so a 200-line cell cannot push the output off the screen. The
    remainder is reachable through the card's full view.
  */
  const commandLines = command.split("\n");
  const clamped = maxLines !== undefined && commandLines.length > maxLines;
  const shownCommand = clamped
    ? commandLines.slice(0, maxLines).join("\n")
    : command;

  return (
    <div className="bg-card flex items-start justify-between gap-3 px-4 py-2">
      <div className="flex min-w-0 items-start gap-2 overflow-hidden">
        {/*
          LOCAL EDIT (CloudGuard): an `IN` / `OUT` gutter, borrowed from the
          notebook cell this component replaced. Two blocks of monospace with
          nothing between them read as one blob; the label says which half you
          are looking at without drawing a rule across the card.
        */}
        <GutterLabel>IN</GutterLabel>
        <TerminalIcon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        {command.includes("\n") ? (
          <div className="min-w-0 flex-1">
            <pre
              className={cn(
                "text-foreground font-mono text-xs whitespace-pre",
                // same rule as the output: a compacted card shows no scrollbar
                maxLines === undefined ? "overflow-x-auto" : "overflow-hidden",
              )}
            >
              {cwd && <span className="text-muted-foreground">{cwd}$ </span>}
              {shownCommand}
            </pre>
            {clamped && (
              <span className="text-muted-foreground font-mono text-[11px]">
                +{commandLines.length - (maxLines ?? 0)} more lines
              </span>
            )}
          </div>
        ) : (
          <code className="text-foreground truncate font-mono text-xs">
            {cwd && <span className="text-muted-foreground">{cwd}$ </span>}
            {command}
          </code>
        )}
      </div>
      <div className="flex items-center gap-3">
        {formattedDuration && (
          <span className="text-muted-foreground font-mono text-sm tabular-nums">
            {formattedDuration}
          </span>
        )}
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            exitCode === 0
              ? "text-muted-foreground"
              : "text-red-600 dark:text-red-400",
          )}
        >
          {exitCode}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          disabled={!hasOutput}
          className="h-7 w-7 p-0"
          aria-label={
            !hasOutput
              ? "No output to copy"
              : copiedId === COPY_ID
                ? "Copied"
                : "Copy output"
          }
        >
          {hasOutput && copiedId === COPY_ID ? (
            <Check className="h-4 w-4 text-green-700 dark:text-green-400" />
          ) : (
            <Copy className="text-muted-foreground h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function TerminalOutput({
  stdout,
  stderr,
  truncated,
  isCollapsed,
  shouldCollapse,
  lineCount,
  onToggleCollapse,
  maxLines,
}: TerminalOutputProps) {
  /*
    LOCAL EDIT (CloudGuard): upstream clamps the collapsed output with a fixed
    `max-h-[200px]`, which is a guess at a line count that changes with font
    size and wrapping. We clamp by LINES instead, so "5 lines" is exactly what
    the reader gets.
  */
  const clamp = (text?: string) =>
    isCollapsed && text && maxLines !== undefined
      ? text.split("\n").slice(0, maxLines).join("\n")
      : text;
  const shownStdout = clamp(stdout);
  const shownStderr = clamp(stderr);

  return (
    <Collapsible open={!isCollapsed}>
      <div className="relative font-mono text-sm">
        {/*
          LOCAL EDIT (CloudGuard): no scrollbar while collapsed. A compacted
          card is a summary — a horizontal scrollbar under five clipped lines
          is chrome offering a way to read something the card is not trying to
          show. Long lines are clipped; the full view scrolls.
        */}
        <div className="flex gap-2 px-4 pt-0 pb-4">
          <GutterLabel>OUT</GutterLabel>
          <div
            className={cn(
              "min-w-0 flex-1",
              isCollapsed ? "overflow-hidden" : "overflow-x-auto",
            )}
          >
            {shownStdout && (
              <div className="text-foreground whitespace-pre">
                <Ansi>{shownStdout}</Ansi>
              </div>
            )}
            {shownStderr && (
              <div className="mt-2 whitespace-pre text-red-500 dark:text-red-400">
                <Ansi>{shownStderr}</Ansi>
              </div>
            )}
            {truncated && (
              <div className="text-muted-foreground mt-2 text-xs italic">
                Output truncated...
              </div>
            )}
          </div>
        </div>
      </div>

      {shouldCollapse && (
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            onClick={onToggleCollapse}
            className="text-muted-foreground w-full justify-start rounded-none px-4 font-normal"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="mr-1 size-4" />
                Show all {lineCount} lines
              </>
            ) : (
              <>
                <ChevronUp className="mr-1 size-4" />
                Collapse
              </>
            )}
          </Button>
        </CollapsibleTrigger>
      )}
    </Collapsible>
  );
}

function TerminalEmpty() {
  return (
    <div className="text-muted-foreground px-4 py-3 font-mono text-sm italic">
      No output
    </div>
  );
}

function TerminalRoot({
  id,
  command,
  stdout,
  stderr,
  exitCode,
  durationMs,
  cwd,
  truncated,
  maxCollapsedLines,
  className,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
}: TerminalRootProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] =
    useState(defaultExpanded);
  const { copiedId, copy } = useCopyToClipboard();

  const isExpanded = expanded ?? uncontrolledExpanded;
  const hasOutput = Boolean(stdout || stderr);
  const fullOutput = [stdout, stderr].filter(Boolean).join("\n");
  const formattedDuration = formatDuration(durationMs);
  const lineCount = countOutputLines(fullOutput);
  // LOCAL EDIT (CloudGuard): the INPUT counts too. A 40-line IPython cell with
  // two lines of output still needs the expander, so the collapse decision is
  // made on whichever side actually overflows.
  const commandLineCount = command.split("\n").length;
  const shouldCollapse =
    maxCollapsedLines !== undefined &&
    (lineCount > maxCollapsedLines || commandLineCount > maxCollapsedLines);
  const isCollapsed = shouldCollapse && !isExpanded;
  const clampLines = isCollapsed ? maxCollapsedLines : undefined;

  const setExpanded = useCallback(
    (nextExpanded: boolean) => {
      if (expanded === undefined) {
        setUncontrolledExpanded(nextExpanded);
      }
      onExpandedChange?.(nextExpanded);
    },
    [expanded, onExpandedChange],
  );

  const handleCopy = useCallback(() => {
    if (!hasOutput) return;
    copy(fullOutput, COPY_ID);
  }, [hasOutput, fullOutput, copy]);

  return (
    <div
      className={cn(
        "@container flex w-full min-w-80 flex-col gap-3",
        className,
      )}
      data-tool-ui-id={id}
      data-slot="terminal"
    >
      <div className="border-border bg-card overflow-hidden rounded-lg border shadow-xs">
        <TerminalHeader
          command={command}
          cwd={cwd}
          exitCode={exitCode}
          formattedDuration={formattedDuration}
          hasOutput={hasOutput}
          copiedId={copiedId}
          onCopy={handleCopy}
          maxLines={clampLines}
        />

        {hasOutput && (
          <TerminalOutput
            stdout={stdout}
            stderr={stderr}
            truncated={truncated}
            isCollapsed={isCollapsed}
            shouldCollapse={shouldCollapse}
            lineCount={lineCount}
            onToggleCollapse={() => setExpanded(!isExpanded)}
            maxLines={clampLines}
          />
        )}

        {!hasOutput && <TerminalEmpty />}
      </div>
    </div>
  );
}

type TerminalComponent = typeof TerminalRoot & {
  Header: typeof TerminalHeader;
  Output: typeof TerminalOutput;
  Empty: typeof TerminalEmpty;
};

export const Terminal = Object.assign(TerminalRoot, {
  Header: TerminalHeader,
  Output: TerminalOutput,
  Empty: TerminalEmpty,
}) as TerminalComponent;

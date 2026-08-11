import React from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";
import { isOpenHandsAction, isOpenHandsObservation } from "#/types/core/guards";
import { Terminal } from "#/components/tool-ui/terminal";
import { CodeDiff } from "#/components/tool-ui/code-diff";
import { ToolError } from "#/components/tool-ui/elements/tool-error";
import { RetrievalChunks } from "#/components/tool-ui/elements/retrieval-chunks";
import { SpecSheet } from "#/components/tool-ui/elements/spec-sheet";
import { ScoreBreakdown } from "#/components/tool-ui/elements/score-breakdown";
import { matchPayload } from "#/components/tool-ui/elements/payload-dispatch";
import {
  ToolFallbackRoot,
  ToolFallbackTrigger,
  ToolFallbackContent,
  ToolFallbackArgs,
  ToolFallbackResult,
} from "#/components/tool-ui/elements/tool-fallback";
import { cn } from "#/utils/utils";

/**
 * ONE renderer for every tool in/out in the transcript.
 *
 * Before this, the same conceptual event — "the agent ran something, here is
 * what came back" — was drawn three different ways depending on which tool
 * produced it: a notebook-style CommandCell for bash, a markdown code fence
 * inside a collapsed GenericEventMessage for IPython/read, and a bespoke
 * MCPObservationContent for MCP. Same information, three visual languages.
 *
 * Now every one of them is a `@tool-ui/terminal`, and anything that changes
 * code is a `@tool-ui/code-diff`. The tool that produced the event only
 * decides what goes in the header, never what the block looks like.
 */

/**
 * How many lines survive collapse before the reader has to ask for more —
 * 5 of the input and 5 of the output, so a card stays a glanceable summary of
 * the turn rather than a wall the transcript has to scroll past.
 */
const COLLAPSED_LINES = 5;

/**
 * The dispatch vocabulary.
 *
 * One union, one switch, one place a widget is chosen. Frontier assistants do
 * the same thing: the model calls a tool and the CLIENT decides how the result
 * renders — there is deliberately no widget vocabulary the agent can address,
 * so scan output can never steer what an analyst sees.
 */
export type ToolEventKind = "terminal" | "diff" | "tool" | "error";

type Extras = Record<string, unknown>;

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

/** `name({"a": 1})` — an MCP call written the way a shell would show it. */
const formatToolCall = (name: string, args: unknown): string => {
  if (!args || (typeof args === "object" && !Object.keys(args).length)) {
    return `${name}()`;
  }
  try {
    return `${name}(${JSON.stringify(args, null, 2)})`;
  } catch {
    return `${name}(…)`;
  }
};

/**
 * Which of the two components an event belongs to — or null when it is not a
 * tool event at all (a plain message, a state change) and the existing
 * renderers should keep it.
 */
export const getToolEventKind = (
  event: OpenHandsAction | OpenHandsObservation,
  // Optional so the existing `!== null` probe in the message wrapper keeps
  // working: whether an event renders at all does not depend on success.
  success?: boolean,
): ToolEventKind | null => {
  const key = isOpenHandsAction(event) ? event.action : event.observation;
  // A failed command is not a terminal transcript with red text in it — it is
  // an error with a cause worth surfacing. Checked before the switch so it
  // applies to every executing kind rather than being repeated per case.
  if (success === false && (key === "run" || key === "run_ipython")) {
    return "error";
  }
  switch (key) {
    case "run":
    case "run_ipython":
    // MCP calls are structured request/response, not a shell transcript.
    // Rendering them as a terminal was always a compromise — the Element shows
    // the tool name, a live status and collapsible args/result instead.
    case "call_tool_mcp":
    case "mcp":
      return "tool";
    case "read":
      return "terminal";
    case "edit":
    case "write":
      return "diff";
    default:
      return null;
  }
};

interface TerminalFields {
  command: string;
  stdout?: string;
  exitCode: number;
  cwd?: string;
}

const toTerminalFields = (
  event: OpenHandsAction | OpenHandsObservation,
  success: boolean | undefined,
): TerminalFields => {
  const isAction = isOpenHandsAction(event);
  const args = (isAction ? event.args : {}) as Extras;
  const extras = (isOpenHandsObservation(event) ? event.extras : {}) as Extras;
  const key = isAction
    ? event.action
    : (event as OpenHandsObservation).observation;
  const output = isOpenHandsObservation(event) ? event.content : undefined;

  // The runtime reports the process's real exit code for bash; everything else
  // only has a success/failure verdict, so 0/1 stands in for it.
  const metadata = (extras.metadata ?? {}) as Extras;
  const reported = metadata.exit_code;
  let exitCode = 0;
  if (typeof reported === "number") {
    exitCode = reported;
  } else if (success === false) {
    exitCode = 1;
  }

  let command = "";
  switch (key) {
    case "run":
      command = str(args.command) ?? str(extras.command) ?? "";
      break;
    case "run_ipython":
      command = str(args.code) ?? str(extras.code) ?? "";
      break;
    case "call_tool_mcp":
    case "mcp":
      command = formatToolCall(
        str(args.name) ?? str(extras.name) ?? "tool",
        args.arguments ?? extras.arguments,
      );
      break;
    case "read":
      command = `cat ${str(args.path) ?? str(extras.path) ?? ""}`.trim();
      break;
    default:
      command = key;
  }

  return {
    command,
    stdout: output,
    exitCode,
    cwd: str(extras.cwd) ?? str(args.cwd),
  };
};

interface DiffFields {
  filename?: string;
  patch?: string;
  oldCode?: string;
  newCode?: string;
  language: string;
}

/** Guess a highlighter language from the file extension. */
const languageOf = (path?: string): string => {
  const ext = path?.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    sh: "bash",
    json: "json",
    yml: "yaml",
    yaml: "yaml",
    md: "markdown",
    css: "css",
    html: "html",
    tf: "hcl",
    sql: "sql",
  };
  return (ext && map[ext]) || "text";
};

const toDiffFields = (
  event: OpenHandsAction | OpenHandsObservation,
): DiffFields | null => {
  const isAction = isOpenHandsAction(event);
  const args = (isAction ? event.args : {}) as Extras;
  const extras = (isOpenHandsObservation(event) ? event.extras : {}) as Extras;
  const filename = str(args.path) ?? str(extras.path);
  const language = languageOf(filename);

  // BOTH FILE VERSIONS FIRST — this is what makes deletions render.
  //
  // `extras.diff` is a minimal patch: the ACI emits only `+` hunks for an edit
  // that adds lines, so a diff built from it has nothing red in it and the
  // reader cannot see what was removed. Handing the component the old and new
  // file instead lets it compute the real two-sided diff, with removed lines in
  // red and added lines in green.
  //
  // These fields are NOT in the upstream `EditObservation` type, but the
  // runtime does send them — and it sends them even when `diff` is empty (a
  // failed write, or a `create` with no previous file).
  const oldContent = str(extras.old_content);
  const newContent = str(extras.new_content);
  if (oldContent || newContent) {
    return { filename, oldCode: oldContent, newCode: newContent, language };
  }

  // Only if the runtime gave us no file versions do we fall back to the patch.
  const patch = str(extras.diff);
  if (patch) return { filename, patch, language };

  // Action: a str_replace pair, or a whole-file write.
  const oldCode = str(args.old_str);
  const newCode = str(args.new_str) ?? str(args.file_text) ?? str(args.content);
  if (oldCode || newCode) return { filename, oldCode, newCode, language };

  // Nothing to compare — a failed edit still has an error body worth reading,
  // and the caller falls back to the terminal block for it.
  return null;
};

/**
 * Full view: a tab strip of files, not a modal.
 *
 * A dialog over the conversation was the wrong shape for this — you cannot read
 * the transcript while it is open, and the thing being shown is not a decision,
 * it is a document. So it opens the way an editor would: the input is one file,
 * the output is another, and you switch between them. It still occupies the
 * chat surface only (`[data-chat-surface]`), never the dashboard around it.
 */
function ToolEventPanel({
  host,
  title,
  files,
  onClose,
}: {
  host: HTMLElement | null;
  title: string;
  files: { name: string; body: React.ReactNode }[];
  onClose: () => void;
}) {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!host) return null;

  return createPortal(
    <div
      className="bg-background absolute inset-0 z-40 flex flex-col"
      role="region"
      aria-label={title}
    >
      {/* The tab strip. Square tabs sharing an edge with the content below,
          the way an editor draws them — a pill row would read as filters. */}
      <div className="border-border bg-card flex shrink-0 items-stretch border-b">
        {files.map((f, i) => (
          <button
            key={f.name}
            type="button"
            onClick={() => setActive(i)}
            aria-selected={active === i}
            role="tab"
            className={cn(
              "border-border max-w-52 truncate border-r px-3 py-2 text-left font-mono text-xs transition-colors",
              active === i
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.name}
          </button>
        ))}
        <div className="text-muted-foreground flex flex-1 items-center justify-end gap-2 px-3">
          <span className="truncate font-mono text-[11px]">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close full view"
            className="hover:text-foreground hover:bg-muted/60 rounded p-1 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {files[active]?.body}
      </div>
    </div>,
    host,
  );
}

interface ToolEventViewProps {
  event: OpenHandsAction | OpenHandsObservation;
  /** success/failure verdict for observations, when the caller computed one */
  success?: boolean;
  className?: string;
}

export function ToolEventView({
  event,
  success,
  className,
}: ToolEventViewProps) {
  const [fullOpen, setFullOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [host, setHost] = React.useState<HTMLElement | null>(null);
  // `success` is passed so a failed run dispatches to the error Element.
  const kind = getToolEventKind(event, success);
  const id = String((event as { id?: number }).id ?? "tool-event");

  // Resolved on open rather than on mount: the chat surface is the closest
  // marked ancestor, and every card in a long transcript resolving it eagerly
  // would be pure work for a view most of them never open.
  const openFull = React.useCallback(() => {
    setHost(
      rootRef.current?.closest<HTMLElement>("[data-chat-surface]") ?? null,
    );
    setFullOpen(true);
  }, []);

  const diff = kind === "diff" ? toDiffFields(event) : null;
  // A "diff" with nothing to compare (an edit that failed before touching the
  // file) still has an error body worth showing — fall back to the terminal.
  const useDiff = kind === "diff" && diff !== null;

  const term = !useDiff ? toTerminalFields(event, success) : null;

  const title = useDiff
    ? (diff?.filename ?? "diff")
    : (term?.command.split("\n")[0] ?? "");

  // A failed command. The terminal card showed the same body whether a command
  // succeeded or not, leaving the reader to notice a non-zero exit buried in
  // the transcript. This states it: what ran, what it touched, and why it
  // failed. Retry/skip are omitted deliberately — re-running a cloud command
  // is the agent's decision under the permission gate, not a UI affordance.
  if (kind === "error") {
    const failed = toTerminalFields(event, success);
    const command = failed?.command ?? "";
    return (
      <div ref={rootRef} className={cn("cg-tool-card", className)}>
        <ToolError
          name={command.split(/\s+/)[0] || "command"}
          target={command}
          message={failed?.stdout || "Command failed with no output."}
          attempt={1}
          maxAttempts={1}
          retrying={false}
        />
      </div>
    );
  }

  // Tier 2: a validated MCP payload renders as its own widget.
  //
  // Gated by matchPayload, which dispatches on the TOOL NAME and requires the
  // body to satisfy a schema. Tool results carry attacker-supplied text —
  // resource tags, IAM names, scanner output — so the body never chooses the
  // widget. Anything unrecognised falls through to the plain tool card below,
  // which is the honest answer rather than a guess.
  if (kind === "tool") {
    const toolName =
      (isOpenHandsObservation(event)
        ? (event.extras as { name?: string } | undefined)?.name
        : (event.args as { name?: string } | undefined)?.name) ?? undefined;
    const payload = matchPayload(
      toolName,
      isOpenHandsObservation(event) ? event.content : undefined,
    );

    if (payload.kind === "kb-controls") {
      const controls = payload.data as {
        control: string;
        title: string;
        severity?: string;
      }[];
      return (
        <div ref={rootRef} className={cn("cg-tool-card", className)}>
          <RetrievalChunks
            query={toolName ?? "kb_search"}
            chunks={controls.map((c, idx) => ({
              id: `${c.control}-${idx}`,
              source: c.control,
              locator: c.severity ?? "",
              // The KB returns ranked controls without a numeric score; rank
              // order is the only signal we have, so it is shown as that
              // rather than invented as a confidence value.
              score: 1 - idx / Math.max(controls.length, 1),
              text: c.title,
            }))}
            // The observation has already arrived by the time this renders, so
            // every chunk is visible and nothing is still searching.
            visibleCount={controls.length}
            searching={false}
          />
        </div>
      );
    }

    if (payload.kind === "findings") {
      const findings = payload.data as {
        severity: string;
        title?: string;
        resource?: string;
      }[];
      // Severity weights follow the posture model already used in reporting:
      // one CRITICAL outweighs a pile of LOWs, so a count alone would flatter
      // a bad result. Unknown severities score 0 rather than being dropped —
      // an unclassified finding is still a finding and must stay visible.
      const WEIGHT: Record<string, number> = {
        CRITICAL: 10,
        HIGH: 5,
        MEDIUM: 2,
        LOW: 1,
      };
      const bySeverity = new Map<string, number>();
      for (const f of findings) {
        const sev = (f.severity || "UNKNOWN").toUpperCase();
        bySeverity.set(sev, (bySeverity.get(sev) ?? 0) + 1);
      }
      const criteria = [...bySeverity.entries()]
        .sort((a, b) => (WEIGHT[b[0]] ?? 0) - (WEIGHT[a[0]] ?? 0))
        .map(([sev, count]) => ({
          label: sev,
          score: count,
          weight: WEIGHT[sev] ?? 0,
          note: `${count} finding${count === 1 ? "" : "s"}`,
        }));
      const risk = criteria.reduce((sum, c) => sum + c.score * c.weight, 0);
      return (
        <div ref={rootRef} className={cn("cg-tool-card", className)}>
          <ScoreBreakdown
            verdict={
              bySeverity.has("CRITICAL")
                ? "Critical exposure"
                : bySeverity.has("HIGH")
                  ? "Needs attention"
                  : "Within tolerance"
            }
            total={risk}
            outOf={risk}
            criteria={criteria}
            // Every severity band is shown at once: the observation has landed,
            // and a partially revealed risk breakdown would understate it.
            visibleCount={criteria.length}
          />
        </div>
      );
    }

    if (payload.kind === "kg-schema") {
      const schema = payload.data as {
        required?: string[];
        optional?: string[];
        returns?: string;
      };
      return (
        <div ref={rootRef} className={cn("cg-tool-card", className)}>
          <SpecSheet
            title={toolName ?? "schema"}
            subtitle={schema.returns}
            rows={[
              // Required params are emphasised: omitting one is the failure
              // an operator actually hits.
              ...(schema.required ?? []).map((r) => ({
                label: r,
                value: "required",
                emphasis: true,
              })),
              ...(schema.optional ?? []).map((o) => ({
                label: o,
                value: "optional",
              })),
            ]}
            visibleCount={
              (schema.required?.length ?? 0) + (schema.optional?.length ?? 0)
            }
          />
        </div>
      );
    }
  }

  // MCP tool calls render as an assistant-ui Element rather than a terminal
  // card. Returned before the terminal/diff body is assembled — every hook
  // above has already run, so this is a safe early return.
  //
  // The Element's own sub-components are used rather than the `ToolFallback`
  // wrapper: the wrapper expects a ToolCallMessagePart from assistant-ui's
  // runtime, whereas these take plain props and can be fed straight from our
  // event. `useToolCallElapsed` inside returns undefined outside a tool-call
  // context and the duration simply does not render — no crash, no context.
  if (kind === "tool") {
    return (
      <div ref={rootRef} className={cn("cg-tool-card", className)}>
        <ToolFallbackRoot>
          <ToolFallbackTrigger
            toolName={title || "tool"}
            status={
              success === false
                ? { type: "incomplete", reason: "error" }
                : { type: "complete" }
            }
          />
          <ToolFallbackContent>
            <ToolFallbackArgs argsText={term?.command} />
            <ToolFallbackResult result={term?.stdout} />
          </ToolFallbackContent>
        </ToolFallbackRoot>
      </div>
    );
  }

  const body = useDiff ? (
    <CodeDiff
      id={id}
      filename={diff?.filename}
      patch={diff?.patch}
      oldCode={diff?.oldCode}
      newCode={diff?.newCode}
      language={diff?.language ?? "text"}
      lineNumbers="visible"
      diffStyle="unified"
      maxCollapsedLines={COLLAPSED_LINES}
    />
  ) : (
    <Terminal
      id={id}
      command={term?.command ?? ""}
      stdout={term?.stdout}
      exitCode={term?.exitCode ?? 0}
      cwd={term?.cwd}
      maxCollapsedLines={COLLAPSED_LINES}
    />
  );

  /*
    The full view's "files".

    A tool call has exactly two documents worth reading — what went in and what
    came back — so they are named like files and shown in an editor's tab strip.
    A diff has only one: the change itself is the document.
  */
  const files = useDiff
    ? [
        {
          name: (diff?.filename ?? "diff").split("/").pop() ?? "diff",
          body: (
            <CodeDiff
              id={`${id}-full`}
              filename={diff?.filename}
              patch={diff?.patch}
              oldCode={diff?.oldCode}
              newCode={diff?.newCode}
              language={diff?.language ?? "text"}
              lineNumbers="visible"
              diffStyle="unified"
              expanded
            />
          ),
        },
      ]
    : [
        {
          name: "input",
          body: (
            <pre className="text-foreground overflow-auto font-mono text-xs whitespace-pre">
              {term?.command ?? ""}
            </pre>
          ),
        },
        {
          name: "output",
          body: (
            <pre className="text-foreground overflow-auto font-mono text-xs whitespace-pre">
              {term?.stdout ?? "(no output)"}
            </pre>
          ),
        },
      ];

  return (
    <div
      ref={rootRef}
      className={cn("cg-tool-card group/tool relative", className)}
    >
      {body}
      <button
        type="button"
        onClick={openFull}
        aria-label="Open full view"
        title="Open full view"
        className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-1.5 right-1.5 rounded p-1 opacity-0 transition-opacity group-hover/tool:opacity-100 focus-visible:opacity-100"
      >
        <Maximize2 className="size-3.5" />
      </button>
      {fullOpen && (
        <ToolEventPanel
          host={host}
          title={title}
          files={files}
          onClose={() => setFullOpen(false)}
        />
      )}
    </div>
  );
}

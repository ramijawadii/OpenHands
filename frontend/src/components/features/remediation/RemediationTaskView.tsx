/* eslint-disable i18next/no-literal-string -- remediation task detail */
import React from "react";
import {
  Brain,
  ChevronDown,
  Check,
  Copy,
  FileCode2,
  ShieldCheck,
  SquareTerminal,
  TriangleAlert,
} from "lucide-react";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";
import { type RemediationAction } from "./remediation-data";
import {
  NestedNav,
  StepTag,
  TimelineDot,
  TimelineItem,
} from "./RemediationPanes";
import {
  buildCheckpoint,
  buildThoughts,
  buildTrace,
  type CodeDiff,
  type TraceStep,
} from "./remediation-task-data";

/**
 * One plan task, opened.
 *
 * Three views, because a task is three different questions:
 *
 *   IN / OUT   what was actually run, and what came back — the record
 *   Reasoning  why the agent chose it — the justification
 *   Checkpoint what was saved before it ran — the safety net
 *
 * They are tabs rather than one long page because an operator arrives with one
 * of the three questions, not all of them. Stacking would make the answer to
 * "can this be undone" sit below a 40-line command log.
 */

type TaskTab = "io" | "reasoning" | "checkpoint";

const MONO = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

/**
 * Diff line tones. The +/- sign carries the meaning as well as the colour, so
 * an added and a removed line stay distinguishable without colour vision.
 */
const HUNK_TONE: Record<string, { bg: string; fg: string; sign: string }> = {
  add: { bg: "rgba(63,185,80,.14)", fg: "#7ee787", sign: "+" },
  del: { bg: "rgba(248,81,73,.14)", fg: "#ffa198", sign: "-" },
  ctx: { bg: "transparent", fg: "#b9c0ca", sign: " " },
};

/** Unified diff. Colour AND a +/- gutter, so it survives colour-blindness. */
function DiffWidget({ diff }: { diff: CodeDiff }) {
  const adds = diff.hunks.filter((h) => h.kind === "add").length;
  const dels = diff.hunks.filter((h) => h.kind === "del").length;
  return (
    <div style={{ borderTop: "1px solid var(--cg-border-subtle)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 9px",
          background: "var(--cg-bg-badge)",
          fontSize: 10.5,
          fontFamily: APP_FONT,
        }}
      >
        <FileCode2 size={12} style={{ color: "var(--cg-text-muted)" }} />
        <span style={{ fontFamily: MONO, fontSize: 11 }}>{diff.path}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <span style={{ color: "var(--cgx-low)" }}>+{adds}</span>
          <span style={{ color: "var(--cgx-critical)" }}>−{dels}</span>
          <span style={{ color: "var(--cg-text-muted)" }}>{diff.language}</span>
        </span>
      </div>
      <div style={{ background: "var(--cg-code-bg)", overflowX: "auto" }}>
        {diff.hunks.map((h, i) => {
          const tone = HUNK_TONE[h.kind];
          return (
            <div
              // Index is stable here: a diff is an immutable artifact and its
              // lines are never reordered or filtered.
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              style={{
                display: "flex",
                background: tone.bg,
                fontFamily: MONO,
                fontSize: 11.5,
                lineHeight: 1.55,
                whiteSpace: "pre",
              }}
            >
              <span
                style={{
                  width: 20,
                  flexShrink: 0,
                  textAlign: "center",
                  color: tone.fg,
                  opacity: 0.8,
                  userSelect: "none",
                }}
              >
                {tone.sign}
              </span>
              <span style={{ color: tone.fg, paddingRight: 10 }}>{h.line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One executed step: the command, and what came back.
 *
 * Labels are a muted `IN` / `OUT` in a left gutter rather than coloured
 * `In [n]:` / `Out [n]:` prompts. Colour on this surface means severity — an
 * output label permanently rendered in critical red trains the eye to ignore
 * red, which is the one thing it must not do. The only colour here now is an
 * actual failure.
 *
 * Content WRAPS instead of scrolling horizontally. A long command or a wide JSON
 * body used to disappear off the right edge of a narrow drawer with no
 * indication there was more; wrapping makes the cell grow in place, which is the
 * behaviour the reader expects from a transcript.
 *
 * `--cg-code-bg` stays dark in both themes on purpose: this IS a shell
 * transcript, and a terminal that inverts to white stops reading as one.
 */
const MAX_LINES = 14;

/** Gutter label. Fixed width so IN and OUT content share a left edge. */
function StreamLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: 34,
        paddingTop: 8,
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: 0.5,
        color: "var(--cg-text-muted)",
        userSelect: "none",
      }}
    >
      {children}
    </span>
  );
}

const streamPre: React.CSSProperties = {
  margin: 0,
  padding: "8px 10px 8px 0",
  fontFamily: MONO,
  fontSize: 11.5,
  lineHeight: 1.55,
  // Wrap, never scroll: content grows the cell rather than hiding off-edge.
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  flex: 1,
  minWidth: 0,
};

function CmdCell({ step, output }: { step: TraceStep; output?: TraceStep }) {
  const [copied, setCopied] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const outLines = output ? output.text.split("\n") : [];
  const truncated = !expanded && outLines.length > MAX_LINES;
  const shown = truncated ? outLines.slice(0, MAX_LINES) : outLines;
  const failed = (output?.exit ?? 0) !== 0;

  return (
    <div
      style={{
        border: `1px solid ${failed ? "var(--cg-danger-border)" : "var(--cg-border-subtle)"}`,
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 10,
        background: "var(--cg-code-bg)",
      }}
    >
      {/* Header: a status dot, the interpreter, and the step's identity. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderBottom: "1px solid var(--cg-border-subtle)",
          fontFamily: APP_FONT,
          fontSize: 11.5,
          minWidth: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            flexShrink: 0,
            background: failed ? "var(--cg-danger)" : "var(--cgx-low)",
          }}
        />
        <span style={{ color: "#e6edf3", fontWeight: 600 }}>Bash</span>
        <span
          style={{
            color: "var(--cg-text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
            flex: 1,
          }}
        >
          {step.text}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            color: "var(--cg-text-muted)",
            fontFamily: MONO,
            fontSize: 10.5,
          }}
        >
          <span>{step.at.toISOString().slice(11, 19)}</span>
          {failed && (
            <span style={{ color: "var(--cg-danger)" }}>
              exit {output?.exit}
            </span>
          )}
          <button
            type="button"
            aria-label="Copy command"
            title="Copy command"
            onClick={() => {
              navigator.clipboard?.writeText(step.text);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: copied ? "var(--cgx-low)" : "var(--cg-text-muted)",
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
        </span>
      </div>

      {/* IN — the command as issued. Shown once; the header carries only a
          truncated echo for scanning. */}
      <div style={{ display: "flex", padding: "0 0 0 10px" }}>
        <StreamLabel>IN</StreamLabel>
        <pre style={{ ...streamPre, color: "#e6edf3" }}>{step.text}</pre>
      </div>

      {output && (
        <div style={{ borderTop: "1px solid var(--cg-border-subtle)" }}>
          <div style={{ display: "flex", padding: "0 0 0 10px" }}>
            <StreamLabel>OUT</StreamLabel>
            <pre style={{ ...streamPre, color: "#b9c0ca" }}>
              {shown.join("\n")}
              {truncated && (
                <span style={{ color: "var(--cg-text-muted)" }}>
                  {`\n… ${outLines.length - MAX_LINES} more lines`}
                </span>
              )}
            </pre>
          </div>

          {outLines.length > MAX_LINES && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                width: "100%",
                padding: "5px 0",
                background: "none",
                border: "none",
                borderTop: "1px solid var(--cg-border-subtle)",
                color: "var(--cg-text-muted)",
                fontFamily: APP_FONT,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              <ChevronDown
                size={12}
                style={{
                  transform: expanded ? "rotate(180deg)" : "none",
                  transition: "transform .15s ease",
                }}
              />
              {expanded ? "Collapse" : `Expand (${outLines.length} lines)`}
            </button>
          )}
        </div>
      )}

      {output?.diff && <DiffWidget diff={output.diff} />}
    </div>
  );
}

/** Display case lives here now that the chip no longer shouts. */
const THOUGHT_LABEL: Record<string, string> = {
  observation: "Observation",
  reasoning: "Reasoning",
  decision: "Decision",
  rejected: "Rejected",
};

const THOUGHT_TONE: Record<string, string> = {
  observation: "var(--cg-text-muted)",
  reasoning: "var(--cg-accent)",
  decision: "var(--cgx-low)",
  rejected: "var(--cgx-critical)",
};

export function RemediationTaskView({
  action,
  phase,
  phaseLabel,
  taskLabel,
  taskIdentifier,
  onBack,
}: {
  action: RemediationAction;
  phase: string;
  phaseLabel: string;
  taskLabel: string;
  taskIdentifier: string;
  onBack: () => void;
}) {
  const [tab, setTab] = React.useState<TaskTab>("io");
  const trace = React.useMemo(
    () => buildTrace(action, phase, taskLabel),
    [action, phase, taskLabel],
  );
  const thoughts = React.useMemo(
    () => buildThoughts(action, phase),
    [action, phase],
  );
  const checkpoint = React.useMemo(
    () => buildCheckpoint(action, phase, taskLabel),
    [action, phase, taskLabel],
  );

  const tabs: { id: TaskTab; label: string; icon: React.ReactNode }[] = [
    { id: "io", label: "IN / OUT", icon: <SquareTerminal size={12} /> },
    { id: "reasoning", label: "Chain of thought", icon: <Brain size={12} /> },
    { id: "checkpoint", label: "Checkpoint", icon: <ShieldCheck size={12} /> },
  ];

  return (
    // Explicit colour: the notebook cells inside set their own light-on-dark
    // type, and without a colour here the surrounding pane inherited it in
    // light mode — white text on a white surface.
    <div className="cg-nested" style={{ color: "var(--cg-text-primary)" }}>
      {/* Breadcrumb back to the plan — the task is a drill-down, not a route. */}
      <NestedNav
        trail={[{ label: "Plan", onClick: onBack }, { label: phaseLabel }]}
        current={taskLabel}
        right={
          <span
            title="Content-derived task id — stable across plan reordering"
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              color: "var(--cg-text-muted)",
              border: "1px solid var(--cg-border-subtle)",
              borderRadius: 3,
              padding: "1px 6px",
            }}
          >
            {taskIdentifier}
          </span>
        }
      />

      {/*
       * The drawer's own tab pills, not an underline strip — this sits inside
       * the drawer and a second tab idiom two levels down reads as a different
       * product. Tokens are shared with `ConversationTabNav`.
       */}
      <div
        role="tablist"
        aria-label="Task detail"
        style={{ display: "flex", gap: 4, marginBottom: 12 }}
      >
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              className={
                on
                  ? "cg-report-action cg-report-action-primary"
                  : "cg-report-action"
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 28,
                padding: "0 10px",
                fontFamily: APP_FONT,
                fontSize: 12.5,
                lineHeight: 1,
                fontWeight: on ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "io" && (
        <div>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 11.5,
              color: "var(--cg-text-muted)",
            }}
          >
            The agent&apos;s command sequence for this task, in order.{" "}
            <strong style={{ color: "var(--cg-accent)" }}>IN</strong> is what it
            issued, <strong>OUT</strong> what came back. A step that produced a
            code change carries its diff.
          </p>
          {trace
            .filter((t) => t.kind === "in")
            .map((t) => (
              <CmdCell
                key={`in${t.seq}`}
                step={t}
                // Output is the step immediately after its command; pairing them
                // in one cell is what makes the In/Out numbering meaningful.
                output={trace[trace.indexOf(t) + 1]}
              />
            ))}
        </div>
      )}

      {tab === "reasoning" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 11.5,
              color: "var(--cg-text-muted)",
            }}
          >
            Typed reasoning, including what was considered and{" "}
            <strong>rejected</strong> — reasoning that records only the chosen
            path cannot be audited.
          </p>
          {thoughts.map((t, i) => (
            <TimelineItem
              key={t.seq}
              mark={
                <TimelineDot
                  tone={THOUGHT_TONE[t.kind]}
                  filled={t.kind === "decision"}
                />
              }
              last={i === thoughts.length - 1}
            >
              <div style={{ display: "flex", gap: 10, paddingTop: 2 }}>
                {/* Fixed slot so the reasoning text keeps one left edge;
                    the chip inside it hugs its own word. */}
                <span style={{ minWidth: 74, flexShrink: 0, paddingTop: 2 }}>
                  <StepTag>{THOUGHT_LABEL[t.kind] ?? t.kind}</StepTag>
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.6,
                    color: "var(--cg-text-primary)",
                  }}
                >
                  {t.text}
                </span>
              </div>
            </TimelineItem>
          ))}
        </div>
      )}

      {tab === "checkpoint" && (
        <div>
          {!checkpoint.required ? (
            <div
              style={{
                padding: "12px 14px",
                border: "1px solid var(--cg-border-subtle)",
                borderRadius: 6,
                fontSize: 12.5,
                color: "var(--cg-text-muted)",
              }}
            >
              This task performs no write, so no checkpoint is required. A
              checkpoint is created and verified before every write action.
            </div>
          ) : (
            <div style={{ color: "var(--cg-text-primary)" }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <ShieldCheck size={14} style={{ color: "var(--cgx-low)" }} />
                <StepTag>Checkpoint captured before write</StepTag>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    color: "var(--cg-text-muted)",
                  }}
                >
                  {checkpoint.id}
                </span>
                {/* Same rule as the timeline: the mark carries the tone,
                    the word is a chip. */}
                <span
                  style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      color: checkpoint.rollbackVerified
                        ? "var(--cgx-low)"
                        : "var(--cgx-critical)",
                    }}
                  >
                    {checkpoint.rollbackVerified ? (
                      <Check size={11} />
                    ) : (
                      <TriangleAlert size={11} />
                    )}
                  </span>
                  <StepTag>
                    {checkpoint.rollbackVerified
                      ? "Rollback verified"
                      : "Rollback untested"}
                  </StepTag>
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                {[
                  ["Target", checkpoint.target],
                  [
                    "Created",
                    checkpoint.createdAt
                      .toISOString()
                      .replace("T", " ")
                      .slice(0, 16),
                  ],
                  ["Rollback window", checkpoint.rollbackWindow],
                  ["Size", `${(checkpoint.sizeBytes / 1024).toFixed(1)} KB`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                        color: "var(--cg-text-muted)",
                        marginBottom: 2,
                      }}
                    >
                      {k}
                    </div>
                    <div style={{ fontSize: 12 }}>{v}</div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  color: "var(--cg-text-muted)",
                  marginBottom: 4,
                }}
              >
                Captured
              </div>
              {/* Same timeline as everywhere else — a capture is a sequence
                  of things the snapshot took, in the order it took them. */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {checkpoint.captured.map((c, i) => (
                  <TimelineItem
                    key={c}
                    mark={<TimelineDot tone="var(--cgx-low)" filled />}
                    last={i === checkpoint.captured.length - 1}
                    done
                  >
                    <div
                      style={{
                        fontSize: 12,
                        paddingTop: 3,
                        color: "var(--cg-text-primary)",
                      }}
                    >
                      {c}
                    </div>
                  </TimelineItem>
                ))}
              </div>

              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: "1px solid var(--cg-border-subtle)",
                  fontFamily: MONO,
                  fontSize: 10.5,
                  color: "var(--cg-text-muted)",
                  wordBreak: "break-all",
                }}
              >
                sha256 {checkpoint.sha256}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

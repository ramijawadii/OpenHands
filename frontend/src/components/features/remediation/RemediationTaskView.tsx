/* eslint-disable i18next/no-literal-string -- remediation task detail */
import React from "react";
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronRight,
  Copy,
  FileCode2,
  ShieldCheck,
  SquareTerminal,
  TriangleAlert,
} from "lucide-react";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";
import { type RemediationAction } from "./remediation-data";
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
 * Terminal block, matching the chat's command styling.
 *
 * `--cg-code-bg` is deliberately theme-independent (it stays dark in both
 * themes) — a terminal that inverts to white in light mode stops reading as a
 * terminal, and this content IS a shell transcript.
 */
function CmdBlock({ step }: { step: TraceStep }) {
  const [copied, setCopied] = React.useState(false);
  const isIn = step.kind === "in";
  const failed = (step.exit ?? 0) !== 0;

  return (
    <div
      style={{
        border: `1px solid ${failed ? "var(--cg-danger-border)" : "var(--cg-border-subtle)"}`,
        borderRadius: 5,
        overflow: "hidden",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 9px",
          background: "var(--cg-bg-badge)",
          borderBottom: "1px solid var(--cg-border-subtle)",
          fontSize: 10.5,
          fontFamily: APP_FONT,
        }}
      >
        <SquareTerminal
          size={12}
          style={{
            color: isIn ? "var(--cg-accent)" : "var(--cg-text-muted)",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontWeight: 700,
            letterSpacing: 0.4,
            color: isIn ? "var(--cg-accent)" : "var(--cg-text-muted)",
          }}
        >
          {isIn ? "IN" : "OUT"}
        </span>
        <span style={{ color: "var(--cg-text-muted)" }}>#{step.seq}</span>
        {failed && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "var(--cg-danger)",
            }}
          >
            <TriangleAlert size={10} /> exit {step.exit}
          </span>
        )}
        <span
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "var(--cg-text-muted)" }}>
            {step.at.toISOString().slice(11, 19)}
          </span>
          <button
            type="button"
            aria-label={`Copy ${isIn ? "command" : "output"}`}
            onClick={() => {
              navigator.clipboard?.writeText(step.text);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: copied ? "var(--cgx-low)" : "var(--cg-text-muted)",
              fontSize: 10.5,
              fontFamily: APP_FONT,
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </span>
      </div>

      <pre
        style={{
          margin: 0,
          padding: "8px 10px",
          background: "var(--cg-code-bg)",
          color: isIn ? "#e6edf3" : "#b9c0ca",
          fontFamily: MONO,
          fontSize: 11.5,
          lineHeight: 1.55,
          overflowX: "auto",
          whiteSpace: "pre",
        }}
      >
        {isIn ? `$ ${step.text}` : step.text}
      </pre>

      {step.diff && <DiffWidget diff={step.diff} />}
    </div>
  );
}

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
    <div>
      {/* Breadcrumb back to the plan — the task is a drill-down, not a route. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          className="cg-report-action"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 26,
            padding: "0 9px",
            fontSize: 12,
            fontFamily: APP_FONT,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={12} /> Plan
        </button>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11.5,
            color: "var(--cg-text-muted)",
          }}
        >
          {phaseLabel}
          <ChevronRight size={11} />
          <span style={{ color: "var(--cg-text-primary)" }}>{taskLabel}</span>
        </span>
        <span
          title="Content-derived task id — stable across plan reordering"
          style={{
            marginLeft: "auto",
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
      </div>

      <div
        role="tablist"
        aria-label="Task detail"
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 12,
          borderBottom: "1px solid var(--cg-border-subtle)",
        }}
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
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 10px",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${on ? "var(--cg-accent)" : "transparent"}`,
                color: on ? "var(--cg-text-primary)" : "var(--cg-text-nav)",
                fontFamily: APP_FONT,
                fontSize: 12.5,
                fontWeight: on ? 600 : 400,
                cursor: "pointer",
                marginBottom: -1,
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
          {trace.map((s) => (
            <CmdBlock key={`${s.kind}${s.seq}`} step={s} />
          ))}
        </div>
      )}

      {tab === "reasoning" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11.5,
              color: "var(--cg-text-muted)",
            }}
          >
            Typed reasoning, including what was considered and{" "}
            <strong>rejected</strong> — reasoning that records only the chosen
            path cannot be audited.
          </p>
          {thoughts.map((t) => (
            <div
              key={t.seq}
              style={{
                display: "flex",
                gap: 10,
                padding: "9px 11px",
                border: "1px solid var(--cg-border-subtle)",
                borderLeft: `3px solid ${THOUGHT_TONE[t.kind]}`,
                borderRadius: 5,
              }}
            >
              <span
                style={{
                  fontSize: 9.5,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  fontWeight: 700,
                  color: THOUGHT_TONE[t.kind],
                  minWidth: 74,
                  flexShrink: 0,
                  paddingTop: 2,
                }}
              >
                {t.kind}
              </span>
              <span style={{ fontSize: 12.5, lineHeight: 1.6 }}>{t.text}</span>
            </div>
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
            <div
              style={{
                border: "1px solid var(--cg-border-subtle)",
                borderRadius: 6,
                padding: "12px 14px",
              }}
            >
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
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                  Checkpoint captured before write
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    color: "var(--cg-text-muted)",
                  }}
                >
                  {checkpoint.id}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "1px 8px",
                    borderRadius: 10,
                    fontSize: 10.5,
                    border: `1px solid ${checkpoint.rollbackVerified ? "var(--cgx-low)" : "var(--cgx-critical)"}`,
                    color: checkpoint.rollbackVerified
                      ? "var(--cgx-low)"
                      : "var(--cgx-critical)",
                  }}
                >
                  {checkpoint.rollbackVerified ? (
                    <Check size={9} />
                  ) : (
                    <TriangleAlert size={9} />
                  )}
                  {checkpoint.rollbackVerified
                    ? "Rollback verified"
                    : "Rollback UNTESTED"}
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
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                {checkpoint.captured.map((c) => (
                  <li key={c} style={{ padding: "2px 0" }}>
                    {c}
                  </li>
                ))}
              </ul>

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

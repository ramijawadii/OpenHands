import React from "react";
import { GridPalette } from "#/components/features/explore/cloudguard-grid/palette";
import { SuccessIndicator } from "./success-indicator";
import type { ObservationResultStatus } from "./event-content-helpers/get-observation-result";

/**
 * A command rendered as a notebook cell — `In [n]` / `Out [n]`.
 *
 * A shell command in a chat is an *executed* thing, and the notebook idiom is
 * the one every analyst already reads for that: an input cell with its
 * language and status on the right, an output cell beneath it, and a counter
 * tying the two together. The previous generic row said only "Command" and hid
 * the command itself behind a chevron, so the transcript could not be skimmed.
 *
 * `GridPalette` is mounted because this cell resolves `--cgx-*` for its token
 * colours and `.cg-scroll` for its scrollbars, and an undefined custom property
 * does not fall back — it drops to `currentColor`, so every token would render
 * in the surrounding text colour. Mounting it twice is harmless: identical
 * declarations at the same specificity.
 *
 * Deliberately NOT a full syntax highlighter. Shell is tokenised just far
 * enough to separate the executable, its flags, quoted strings and comments —
 * four colours the eye can use. A real grammar would pull a parser into the
 * chat bundle to colour lines that are usually under 80 characters.
 */

const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

interface Props {
  /** The command, verbatim. Multi-line is normal (heredocs, pipelines). */
  command: string;
  /** Output, when the observation has arrived. */
  output?: string;
  /** Execution counter, matched between In and Out. */
  index?: number;
  status?: ObservationResultStatus;
  /** Badge on the right of the input header. */
  language?: string;
  /** Cap on rendered output lines; the rest collapses behind a toggle. */
  maxOutputLines?: number;
}

/* ------------------------------------------------------------------ *
 * Minimal shell tokeniser
 * ------------------------------------------------------------------ */

const TOKEN = {
  cmd: "var(--cgx-account)",
  flag: "var(--cgx-medium)",
  str: "var(--cgx-low)",
  comment: "var(--cg-text-muted)",
  plain: "var(--cg-text-primary)",
} as const;

/** Split one line into coloured spans. Order matters: strings before flags. */
function tokenise(line: string, first: boolean): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /("[^"]*"|'[^']*'|#.*$|\s+|[^\s"'#]+)/g;
  let m = re.exec(line);
  let wordIndex = 0;

  while (m) {
    const t = m[0];
    let color: string = TOKEN.plain;

    if (/^\s+$/.test(t)) {
      // Whitespace keeps the layout but carries no colour of its own.
      out.push(t);
    } else {
      if (t.startsWith("#")) color = TOKEN.comment;
      else if (t.startsWith('"') || t.startsWith("'")) color = TOKEN.str;
      else if (t.startsWith("-")) color = TOKEN.flag;
      // The first word of the first line is the executable being run.
      else if (first && wordIndex === 0) color = TOKEN.cmd;

      wordIndex += 1;
      out.push(
        <span key={`${m.index}-${t}`} style={{ color }}>
          {t}
        </span>,
      );
    }
    m = re.exec(line);
  }
  return out;
}

function Gutter({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: "0 0 auto",
        minWidth: 54,
        paddingRight: 10,
        textAlign: "right",
        fontFamily: MONO,
        fontSize: 12,
        lineHeight: "20px",
        color: dim ? "var(--cg-text-muted)" : "var(--cg-accent)",
        userSelect: "none",
      }}
    >
      {label}
    </span>
  );
}

export function CommandCell({
  command,
  output,
  index,
  status,
  language = "bash",
  maxOutputLines = 40,
}: Props) {
  const [expanded, setExpanded] = React.useState(false);

  const lines = command.replace(/\s+$/, "").split("\n");
  const outLines = (output ?? "").replace(/\s+$/, "").split("\n");
  const truncated = Boolean(output) && outLines.length > maxOutputLines;
  const shown =
    truncated && !expanded ? outLines.slice(0, maxOutputLines) : outLines;

  const n = index !== undefined ? `[${index}]` : "[ ]";

  return (
    <div
      style={{
        margin: "6px 0",
        border: "1px solid var(--cg-border)",
        borderRadius: 6,
        overflow: "hidden",
        background: "var(--cg-bg-card)",
      }}
    >
      <GridPalette />

      {/* ── In [n] ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          padding: "8px 10px 8px 0",
          borderBottom: output ? "1px solid var(--cg-border-subtle)" : "none",
        }}
      >
        <Gutter label={`In ${n}`} />

        {/* The command itself, horizontally scrollable rather than wrapped:
            a wrapped pipeline reads as several commands. */}
        <pre
          className="cg-scroll"
          style={{
            flex: 1,
            minWidth: 0,
            margin: 0,
            overflowX: "auto",
            fontFamily: MONO,
            fontSize: 12,
            lineHeight: "20px",
            whiteSpace: "pre",
          }}
        >
          {lines.map((l, i) => (
            // Static, ordered lines: the index IS the identity.
            // eslint-disable-next-line react/no-array-index-key
            <div key={i}>{tokenise(l, i === 0)}</div>
          ))}
        </pre>

        <span
          style={{
            flex: "0 0 auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            paddingTop: 1,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: "var(--cg-text-muted)",
            }}
          >
            {language}
          </span>
          {status && <SuccessIndicator status={status} />}
        </span>
      </div>

      {/* ── Out [n] ────────────────────────────────────────────────── */}
      {output !== undefined && output !== "" && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "8px 10px 8px 0",
          }}
        >
          <Gutter label={`Out ${n}:`} dim />
          <pre
            className="cg-scroll"
            style={{
              flex: 1,
              minWidth: 0,
              margin: 0,
              overflowX: "auto",
              fontFamily: MONO,
              fontSize: 12,
              lineHeight: "20px",
              whiteSpace: "pre",
              color: "var(--cg-text-primary)",
            }}
          >
            {shown.join("\n")}
            {truncated && !expanded && "\n…"}
          </pre>
        </div>
      )}

      {truncated && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: "block",
            width: "100%",
            padding: "4px 0 6px",
            background: "none",
            border: "none",
            borderTop: "1px solid var(--cg-border-subtle)",
            color: "var(--cg-text-muted)",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          {expanded
            ? "Show less"
            : `Show all ${outLines.length.toLocaleString()} lines`}
        </button>
      )}
    </div>
  );
}

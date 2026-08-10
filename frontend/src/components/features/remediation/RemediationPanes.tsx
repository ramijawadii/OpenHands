/* eslint-disable i18next/no-literal-string -- remediation record panes */
import React from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Copy,
  Eye,
  Radar,
  Pencil,
  TriangleAlert,
} from "lucide-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useTheme } from "#/context/theme-context";
import {
  APP_FONT,
  eventsThemeFor,
} from "#/components/features/explore/cloudguard-grid/theme";
import { FilterSelect } from "#/components/features/explore/cloudguard-grid/FilterSelect";
import { SeverityGauge } from "#/components/features/explore/cloudguard-grid/SeverityGauge";
import { LIFECYCLE_STAGES } from "./remediation-structure";
import { assetCountFor } from "./remediation-node-data";
import { STAGE_CONTROLS } from "./remediation-field-data";
import {
  type ApprovalState,
  type Provenance,
  type RemediationAction,
} from "./remediation-data";
import {
  type LinkedFinding,
  buildFindings,
  stageDetail,
  stageFieldValue,
  type GateStatus,
} from "./remediation-detail-data";

/**
 * The record's non-Overview panes, rebuilt against the UX plan.
 *
 * Overview is deliberately NOT here — it is unchanged and stays in
 * `RemediationActionView`.
 *
 * Three plan decisions shape everything below:
 *
 * 1. **Provenance travels with the value** (plan §1.1). A scanner measurement
 *    and a model inference must never look identical.
 * 2. **Lifecycle is a timeline, not ten destinations** (plan §5). The operator's
 *    question is "where is this and what is blocking it", which one sequence
 *    answers and ten panes do not.
 * 3. **Activity is one merged stream** (plan §7). Splitting by actor destroys
 *    the only thing the pane is for — seeing agent and human interleave.
 */

/* ------------------------------------------------------------------ *
 * Shared primitives
 * ------------------------------------------------------------------ */

ModuleRegistry.registerModules([AllCommunityModule]);

/** One monospace stack for identifiers across these panes. */
const MONO_STACK =
  "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

const PROV_META: Record<Provenance, { label: string; hint: string }> = {
  scan: { label: "scan", hint: "Measured by a detector — reproducible" },
  agent: { label: "agent", hint: "Inferred by the agent — carries confidence" },
  human: { label: "human", hint: "Asserted by a named person" },
  integration: { label: "sync", hint: "Imported from an external system" },
};

/** Small, quiet, always present. Loud provenance would drown the value. */
export function ProvChip({ value }: { value: Provenance }) {
  const m = PROV_META[value];
  return (
    <span
      title={m.hint}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0 5px",
        fontSize: 9.5,
        lineHeight: "15px",
        borderRadius: 3,
        border: "1px solid var(--cg-border)",
        color: "var(--cg-text-muted)",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {m.label}
    </span>
  );
}

export function Pill({
  children,
  color = "var(--cg-text-muted)",
  bg = "transparent",
  icon,
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 7px",
        fontSize: 10.5,
        lineHeight: "17px",
        borderRadius: 10,
        border: `1px solid ${color}`,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * The name of a step, as an inverted chip.
 *
 * Colour is carried by the marker beside it, not by the word. Tinting the
 * label too spent the timeline's whole colour budget on text that is already
 * the least interesting thing in the row — six words in four colours competing
 * with the reasoning they label. Worse, the tone that reads as "rejected" on a
 * 10px dot is barely legible as body text, so the semantic colour was being
 * asked to do two jobs and doing the second badly.
 *
 * The chip inverts instead: it paints itself with the theme's TEXT colour and
 * writes in the theme's PAGE colour, so it is a white chip on dark and a black
 * chip on light without either value being hard-coded. That reads as a label —
 * a thing stuck onto the row — rather than as more prose.
 *
 * It hugs its word, so the chips form a ragged left column of different widths.
 * Callers that need the following text to line up wrap this in a fixed-width
 * slot; the chip itself must not stretch, or it stops looking like a tag.
 */
export function StepTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        // A soft capsule, not a 3px-radius tag. At this radius the chip reads
        // as one object you could press rather than as a coloured background
        // that happens to sit behind some letters.
        borderRadius: 8,
        background: "var(--cg-text-primary)",
        color: "var(--cg-bg-page)",
        fontSize: 11.5,
        lineHeight: "17px",
        fontWeight: 600,
        // Case is the caller's, not the chip's: a chip that uppercases
        // everything mangles "Rollback verified" into a shout, and the same
        // component now labels sections, phases and reasoning steps.
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function PaneTitle({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <StepTag>{title}</StepTag>
      {hint && (
        <span style={{ fontSize: 11, color: "var(--cg-text-muted)" }}>
          {hint}
        </span>
      )}
      {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
    </div>
  );
}

const td: React.CSSProperties = {
  padding: "7px 10px 7px 0",
  fontSize: 12,
  borderTop: "1px solid var(--cg-border-subtle)",
  color: "var(--cg-text-primary)",
  verticalAlign: "top",
};

/* ------------------------------------------------------------------ *
 * Timeline
 * ------------------------------------------------------------------ */

/**
 * One row of a vertical timeline: marker, connector, content.
 *
 * ONE implementation, used by the lifecycle stages, the remediation plan, the
 * approval queue, the agent's reasoning and the checkpoint. All five are
 * sequences, and each previously drew its own — a coloured left border here, a
 * bordered card there — so five things of the same shape looked like five
 * different components.
 *
 * The connector is omitted on the last row rather than drawn and hidden, so the
 * line ends at the final marker instead of trailing into empty space.
 */
export function TimelineItem({
  mark,
  last,
  done,
  children,
}: {
  mark: React.ReactNode;
  last?: boolean;
  /** Draws the connector in the "passed" tone rather than the neutral rule. */
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div
        aria-hidden
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
          paddingTop: 10,
        }}
      >
        {mark}
        {!last && (
          <div
            style={{
              flex: 1,
              width: 1,
              minHeight: 18,
              background: done ? "var(--cgx-low)" : "var(--cg-border-subtle)",
              opacity: done ? 0.5 : 1,
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: 10 }}>{children}</div>
    </div>
  );
}

/** Marker: filled when complete, ringed when still pending. */
export function TimelineDot({
  tone,
  filled,
}: {
  tone: string;
  filled?: boolean;
}) {
  return (
    <span
      style={{
        width: 11,
        height: 11,
        borderRadius: "50%",
        flexShrink: 0,
        border: `1.5px solid ${tone}`,
        background: filled ? tone : "transparent",
      }}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Related Findings
 * ------------------------------------------------------------------ */

/** Label → value row. Matches `ResourceReport`'s row rhythm exactly. */
export function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "7px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
        fontSize: 12.5,
      }}
    >
      <span
        style={{
          width: 210,
          flexShrink: 0,
          color: "var(--cg-text-muted)",
        }}
      >
        {label}
      </span>
      <span style={{ color: "var(--cg-text-primary)", minWidth: 0 }}>
        {value}
      </span>
    </div>
  );
}

/**
 * A value, optionally preceded by its own mark.
 *
 * Every row starts at the SAME left edge whether or not it has an icon — a
 * reserved-but-empty slot indented the text-only rows away from the icon rows
 * and broke the column's left edge, which is the line the eye actually tracks
 * down a summary. Rows that do carry a mark size it identically, so the marks
 * form their own column without pushing their text out of line with each other.
 */
const ICON_SLOT = 18;

export function IconRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Row
      label={label}
      value={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {icon && (
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: ICON_SLOT,
                flexShrink: 0,
              }}
            >
              {icon}
            </span>
          )}
          {children}
        </span>
      }
    />
  );
}

/** Read vs Write, stated plainly — it is the reason the gate exists. */
export function AccessTag({ value }: { value: "Read" | "Write" }) {
  const write = value === "Write";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 7px",
        fontSize: 10.5,
        lineHeight: "17px",
        borderRadius: 3,
        border: `1px solid ${write ? "var(--cgx-high)" : "var(--cg-border)"}`,
        color: write ? "var(--cgx-high)" : "var(--cg-text-muted)",
        whiteSpace: "nowrap",
      }}
    >
      {write ? <Pencil size={9} /> : <Eye size={9} />}
      {value}
    </span>
  );
}

/** Small labelled fact inside an approval card. */
export function Fact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          color: "var(--cg-text-muted)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12, color: "var(--cg-text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

/** One tone per approval state, shared by the tag and the timeline marker. */
export const STATE_TONE: Record<ApprovalState, string> = {
  Approved: "var(--cgx-low)",
  "Awaiting approval": "var(--cgx-high)",
  Escalated: "var(--cgx-critical)",
  "Not required": "var(--cg-text-muted)",
};

export function StateTag({ value }: { value: ApprovalState }) {
  const tone: Record<ApprovalState, [string, string]> = {
    Approved: ["var(--cgx-low)", "transparent"],
    "Awaiting approval": ["var(--cgx-high)", "var(--cg-accent-bg)"],
    Escalated: ["var(--cgx-critical)", "var(--cg-danger-bg)"],
    "Not required": ["var(--cg-text-muted)", "transparent"],
  };
  const [color, bg] = tone[value];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "1px 8px",
        fontSize: 10.5,
        lineHeight: "17px",
        borderRadius: 10,
        border: `1px solid ${color}`,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {value === "Escalated" ? <TriangleAlert size={9} /> : null}
      {value}
    </span>
  );
}

export function slaLabel(hours: number): { text: string; overdue: boolean } {
  if (hours < 0) return { text: `${Math.abs(hours)}h overdue`, overdue: true };
  return { text: `${hours}h remaining`, overdue: false };
}

/**
 * Approvals — the same gates the plan shows, from the approver's side.
 *
 * Each card names the plan phase it gates, so the two panes are visibly one
 * workflow: the plan says "this phase needs approval", this pane says who owes
 * that decision, by when, and over what. Everything shown here is what an
 * approver needs in order to say yes without opening another tab — the access
 * level, the exact target, what else is in range, and whether it can be undone.
 */
/**
 * A collapsible section, shared by every pane on this surface.
 *
 * Exported so the record view uses this one rather than keeping its own — two
 * Section implementations drift, and then two panes disagree about how a
 * heading behaves.
 */
/**
 * The header of any nested view: one back arrow, then a clickable trail.
 *
 * Every drill-down already had a back arrow, but each one was a lone button
 * labelled with its parent — which tells you where one step back goes and
 * nothing about where you are. Three levels in (Findings → a finding → one of
 * its assets) that is a problem: the trail is the only thing that says how you
 * got here, and without it the only way out is to press back repeatedly and
 * watch what happens.
 *
 * The arrow and the trail are deliberately redundant. The arrow is the
 * muscle-memory target and always means "up one"; the crumbs are for jumping
 * further than one. Keeping both in one component is what makes them
 * consistent across six different drill-downs that were each drawing their own.
 *
 * Styled as the overview breadcrumb is (12.5px, muted, `›`, current in primary)
 * so nested navigation reads the same everywhere in the product.
 */
export function NestedNav({
  trail,
  current,
  right,
}: {
  /** Ancestors, outermost first. Entries without `onClick` are context only. */
  trail: { label: string; onClick?: () => void }[];
  current: string;
  right?: React.ReactNode;
}) {
  // The arrow goes up ONE level — the nearest ancestor that can be navigated
  // to, which is not always the last crumb when the trail carries context.
  const up = [...trail].reverse().find((t) => t.onClick);

  const crumb: React.CSSProperties = {
    background: "none",
    border: "none",
    padding: 0,
    font: "inherit",
    color: "var(--cg-text-muted)",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
      }}
    >
      {up && (
        <button
          type="button"
          className="cg-report-action"
          onClick={up.onClick}
          aria-label={`Back to ${up.label}`}
          title={`Back to ${up.label}`}
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
          <ArrowLeft size={12} /> {up.label}
        </button>
      )}

      <nav
        aria-label="Breadcrumb"
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 7,
          minWidth: 0,
          fontSize: 12.5,
          color: "var(--cg-text-muted)",
        }}
      >
        {trail.map((t) => (
          <React.Fragment key={t.label}>
            {t.onClick ? (
              <button type="button" style={crumb} onClick={t.onClick}>
                {t.label}
              </button>
            ) : (
              <span>{t.label}</span>
            )}
            <span style={{ opacity: 0.6 }}>›</span>
          </React.Fragment>
        ))}
        <span
          aria-current="page"
          style={{
            color: "var(--cg-text-primary)",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "38ch",
          }}
          title={current}
        >
          {current}
        </span>
      </nav>

      {right && (
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {right}
        </span>
      )}
    </div>
  );
}

export function Section({
  title,
  hint,
  count,
  icon,
  open: initial,
  copyText,
  children,
}: {
  title: string;
  hint?: string;
  count?: number;
  /** Optional mark before the title — a long pane becomes scannable by shape. */
  icon?: React.ReactNode;
  open?: boolean;
  /**
   * Supplies the clipboard text on demand.
   *
   * A callback rather than scraped `innerText`: scraping would capture
   * chevrons, counts and button labels, so what reached the clipboard would
   * not be what the reader believed they copied.
   */
  copyText?: () => string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(Boolean(initial));
  const [copied, setCopied] = React.useState(false);
  return (
    <section
      className="cg-sec"
      style={{ borderBottom: "1px solid var(--cg-border-subtle)" }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 0,
            padding: "12px 2px",
            background: "none",
            border: "none",
            color: "var(--cg-text-primary)",
            fontSize: 13.5,
            fontWeight: 600,
            fontFamily: APP_FONT,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {icon && (
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                color: "var(--cg-text-muted)",
                flexShrink: 0,
              }}
            >
              {icon}
            </span>
          )}
          {/* Every section heading on this surface is the same chip, so a
            heading is recognisable as a heading before it is read. */}
          <StepTag>{title}</StepTag>
          {hint && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: "var(--cg-text-muted)",
              }}
            >
              {hint}
            </span>
          )}
          {count !== undefined && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11.5,
                fontWeight: 400,
                color: "var(--cg-text-muted)",
              }}
            >
              {count}
            </span>
          )}
        </button>
        {/* Revealed on hover/focus: six always-visible copy icons compete with
          the content, and the affordance is only wanted at the moment someone
          reaches for it. `:focus-within` keeps it reachable by keyboard. */}
        {copyText && (
          <button
            type="button"
            className="cg-sec-copy"
            aria-label={`Copy ${title}`}
            title={`Copy ${title}`}
            onClick={() => {
              navigator.clipboard?.writeText(copyText());
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginLeft: 8,
              padding: "3px 7px",
              background: "none",
              border: "1px solid var(--cg-border-subtle)",
              borderRadius: 4,
              color: copied ? "var(--cgx-low)" : "var(--cg-text-muted)",
              fontSize: 10.5,
              fontFamily: APP_FONT,
              cursor: "pointer",
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      {open && <div style={{ padding: "0 2px 16px 22px" }}>{children}</div>}
    </section>
  );
}

function SeverityCell({ value }: { value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <SeverityGauge
        severity={value as "Critical" | "High" | "Medium" | "Low"}
        size={13}
      />
      {value}
    </span>
  );
}

/** `Full` closes it outright; `Partial` leaves a follow-up. Tone says which. */
function ClosesCell({ value }: { value: string }) {
  const full = value === "Full";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0 6px",
        fontSize: 10.5,
        lineHeight: "17px",
        borderRadius: 3,
        border: `1px solid ${full ? "var(--cgx-low)" : "var(--cgx-high)"}`,
        color: full ? "var(--cgx-low)" : "var(--cgx-high)",
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </span>
  );
}

const ALL = { value: "All", label: "All" };

/**
 * Justification and coverage.
 *
 * **Findings is the only list here.** Assets used to sit beside it as a second
 * table — same `buildAssets` data as the Scope drill-down, same five columns,
 * but a different click behaviour. Two parallel tables also assert that
 * findings and assets are peers, which they are not: a finding is ABOUT an
 * asset. The relationship is now rendered as an `Assets` column that opens the
 * asset from the finding that names it, and Scope keeps the estate-wide list.
 *
 * Controls, Frameworks and MITRE were three sections making one coverage claim
 * look like three obligations. They are one `Coverage` section now.
 */
export function RelatedFindingsPane({
  action,
  onOpenFinding,
}: {
  action: RemediationAction;
  onOpenFinding?: (finding: LinkedFinding) => void;
}) {
  const { theme } = useTheme();
  const all = React.useMemo(() => buildFindings(action), [action]);

  const [severity, setSeverity] = React.useState("All");
  const [closes, setCloses] = React.useState("All");
  const [detector, setDetector] = React.useState("All");

  const findings = all.filter(
    (f) =>
      (severity === "All" || f.severity === severity) &&
      (closes === "All" || f.closes === closes) &&
      (detector === "All" || f.detector === detector),
  );

  const uniq = (fn: (f: LinkedFinding) => string) => [
    ALL,
    ...[...new Set(all.map(fn))].sort().map((v) => ({ value: v, label: v })),
  ];

  const gridTheme = eventsThemeFor(theme);
  const gridDefaults: ColDef = {
    sortable: true,
    resizable: false,
    suppressMovable: true,
  };

  const cols = React.useMemo<ColDef<LinkedFinding>[]>(
    () => [
      { field: "id", headerName: "Finding", width: 114 },
      { field: "title", headerName: "Title", flex: 1, minWidth: 180 },
      {
        field: "severity",
        headerName: "Severity",
        width: 102,
        cellRenderer: SeverityCell,
      },
      { field: "detector", headerName: "Detector", width: 146 },
      {
        field: "firstSeen",
        headerName: "First seen",
        width: 104,
        valueFormatter: (p) =>
          p.value instanceof Date ? p.value.toISOString().slice(0, 10) : "—",
      },
      {
        colId: "assets",
        headerName: "Assets",
        width: 82,
        // The join, rendered. Without it the pane states two collections and
        // never says how they relate.
        valueGetter: (p) => (p.data ? assetCountFor(action, p.data.id) : 0),
        type: "numericColumn",
      },
      {
        field: "closes",
        headerName: "Closes",
        width: 88,
        cellRenderer: ClosesCell,
      },
    ],
    [action],
  );

  return (
    /*
     * Findings is the whole pane now.
     *
     * It was wrapped in a `Section` alongside a `Coverage` section — but a
     * collapsible heading over the only thing in a view is chrome that can only
     * ever hide the content the reader came for. Without the wrapper the table
     * also takes the full height instead of a 360px cap, which is what a list
     * of unknown length needs.
     *
     * Coverage moved out entirely: the controls a finding breaches now live on
     * the finding itself, where the question is actually asked.
     */
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            marginRight: 4,
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--cg-text-primary)",
          }}
        >
          <Radar size={13} style={{ color: "var(--cg-text-muted)" }} />
          <StepTag>Findings</StepTag>
        </span>
        <FilterSelect
          variant="tab"
          label="Severity"
          value={severity}
          onChange={setSeverity}
          options={uniq((f) => f.severity)}
        />
        <FilterSelect
          variant="tab"
          label="Closes"
          value={closes}
          onChange={setCloses}
          options={uniq((f) => f.closes)}
        />
        <FilterSelect
          variant="tab"
          label="Detector"
          value={detector}
          onChange={setDetector}
          options={uniq((f) => f.detector)}
        />
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11.5,
            color: "var(--cg-text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {findings.length} of {all.length}
        </span>
      </div>

      <div className="cg-scroll" style={{ flex: 1, minHeight: 180 }}>
        <AgGridReact<LinkedFinding>
          theme={gridTheme}
          headerHeight={24}
          rowHeight={28}
          defaultColDef={gridDefaults}
          rowData={findings}
          columnDefs={cols}
          getRowId={(p) => p.data.id}
          onRowClicked={(e) => e.data && onOpenFinding?.(e.data)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Lifecycle — one timeline
 * ------------------------------------------------------------------ */

const GATE_TONE: Record<GateStatus, string> = {
  Passed: "var(--cgx-low)",
  Open: "var(--cg-accent)",
  Blocked: "var(--cgx-critical)",
  "Not reached": "var(--cg-text-muted)",
};

function StageMark({ gate }: { gate: GateStatus }) {
  if (gate === "Passed")
    return <CheckCircle2 size={14} color={GATE_TONE.Passed} />;
  if (gate === "Blocked")
    return <TriangleAlert size={14} color={GATE_TONE.Blocked} />;
  if (gate === "Open") return <CircleDot size={14} color={GATE_TONE.Open} />;
  return <Circle size={14} color={GATE_TONE["Not reached"]} />;
}

/**
 * Lifecycle as a single sequence.
 *
 * Plan §5: ten rail destinations is navigation-heavy for something with one
 * current position. Completed stages collapse to a one-line summary, the
 * current stage is expanded on arrival, and any stage can be opened — so the
 * history is readable by scrolling instead of by ten clicks.
 */
export function LifecyclePane({
  action,
  focusStageId,
  onOpenField,
}: {
  action: RemediationAction;
  /** Rail selection still works: it opens and scrolls to that stage. */
  focusStageId?: string;
  /** Opening a field is the drill-down to its derivation and its artifact. */
  onOpenField?: (stageIndex: number, field: string) => void;
}) {
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const isOpen = (id: string, i: number) =>
    open[id] ?? (id === focusStageId || i + 1 === action.stage);

  React.useEffect(() => {
    if (!focusStageId) return;
    document
      .getElementById(`stage-${focusStageId}`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focusStageId]);

  return (
    <div>
      <PaneTitle
        title="Lifecycle"
        hint={`stage ${action.stage} of 10`}
        right={
          <span style={{ display: "flex", gap: 6 }}>
            <Pill color={GATE_TONE.Passed}>{action.stage - 1} passed</Pill>
            <Pill color={GATE_TONE.Open}>1 current</Pill>
            <Pill color={GATE_TONE["Not reached"]}>
              {10 - action.stage} ahead
            </Pill>
          </span>
        }
      />

      <div style={{ display: "flex", flexDirection: "column" }}>
        {LIFECYCLE_STAGES.map((stage, i) => {
          const d = stageDetail(action, i);
          const on = isOpen(stage.id, i);
          const last = i === LIFECYCLE_STAGES.length - 1;
          return (
            <TimelineItem
              key={stage.id}
              mark={<StageMark gate={d.gate} />}
              last={last}
              done={d.gate === "Passed"}
            >
              <div id={`stage-${stage.id}`}>
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => setOpen((o) => ({ ...o, [stage.id]: !on }))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 0",
                    background: "none",
                    border: "none",
                    color: "var(--cg-text-primary)",
                    fontFamily: APP_FONT,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {on ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <StepTag>{stage.label}</StepTag>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      marginLeft: "auto",
                      fontWeight: 400,
                    }}
                  >
                    <span
                      style={{ fontSize: 11, color: "var(--cg-text-muted)" }}
                    >
                      {d.owner} · {d.duration}
                    </span>
                    <Pill color={GATE_TONE[d.gate]}>{d.gate}</Pill>
                  </span>
                </button>

                {on && (
                  // Indented to the title chip, not to the chevron: the chip is
                  // the line the eye tracks down, and content starting 20px to
                  // its left reads as belonging to the stage above it.
                  <div style={{ paddingLeft: 20, paddingBottom: 12 }}>
                    {/*
                     * What this stage evidences. A stage is not only work — it
                     * is what an auditor points at when asking "how do you know
                     * you assessed risk". Naming the control here makes the
                     * record self-justifying instead of relying on someone
                     * remembering the mapping.
                     */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 5,
                        marginBottom: 10,
                      }}
                    >
                      {(STAGE_CONTROLS[i] ?? []).map((c) => (
                        <span
                          key={`${c.framework}${c.ref}`}
                          title={c.title}
                          style={{
                            display: "inline-flex",
                            alignItems: "baseline",
                            gap: 4,
                            padding: "0 6px",
                            fontSize: 10,
                            lineHeight: "16px",
                            borderRadius: 3,
                            border: "1px solid var(--cg-border)",
                            color: "var(--cg-text-primary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span style={{ color: "var(--cg-text-muted)" }}>
                            {c.framework}
                          </span>
                          <span style={{ fontFamily: MONO_STACK }}>
                            {c.ref}
                          </span>
                        </span>
                      ))}
                    </div>

                    {/*
                     * The spine, in the SAME label/value geometry as the field
                     * rows below it. It was a card of auto-fit columns, so its
                     * text started at a different x from the fields' — two
                     * lists in one expanded stage, each with its own left edge.
                     * One 210px label column makes the whole stage read as one
                     * table.
                     */}
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginBottom: 4,
                      }}
                    >
                      <tbody>
                        {[
                          ["Entry criteria", d.entry],
                          ["Exit criteria", d.exit],
                          ["Owner", d.owner],
                          ["Artifact", d.artifact],
                          [
                            "Started",
                            d.startedAt
                              ? d.startedAt
                                  .toISOString()
                                  .replace("T", " ")
                                  .slice(0, 16)
                              : "—",
                          ],
                        ].map(([label, value]) => (
                          <tr key={label}>
                            <td
                              style={{
                                ...td,
                                width: 210,
                                color: "var(--cg-text-muted)",
                              }}
                            >
                              {label}
                            </td>
                            <td style={td}>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <tbody>
                        {stage.fields
                          .map((f) => ({
                            field: f,
                            value: stageFieldValue(action, i, f),
                          }))
                          // A field with nothing behind it is omitted, not
                          // padded with a placeholder. A short honest list
                          // beats a long one that says "Recorded" ninety times.
                          .filter((r) => r.value !== null)
                          .map((r) => (
                            <tr key={r.field}>
                              <td
                                style={{
                                  ...td,
                                  width: 210,
                                  color: "var(--cg-text-muted)",
                                }}
                              >
                                {r.field}
                              </td>
                              <td style={td}>
                                {d.gate === "Not reached" ? (
                                  <span
                                    style={{ color: "var(--cg-text-muted)" }}
                                  >
                                    Not reached
                                  </span>
                                ) : (
                                  /*
                                   * The value is a SUMMARY of a record. Opening
                                   * it reaches the derivation and the artifact —
                                   * without that the field list is a set of
                                   * assertions nobody can check.
                                   */
                                  <button
                                    type="button"
                                    className="cg-task"
                                    onClick={() => onOpenField?.(i, r.field)}
                                    title={`Open ${r.field}`}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      flexWrap: "wrap",
                                      width: "100%",
                                      padding: 0,
                                      background: "none",
                                      border: "none",
                                      color: "var(--cg-text-primary)",
                                      fontFamily: APP_FONT,
                                      fontSize: 12,
                                      textAlign: "left",
                                      cursor: "pointer",
                                    }}
                                  >
                                    {r.value}
                                    <ProvChip value={d.provenance} />
                                    <ChevronRight
                                      size={12}
                                      className="cg-task-id"
                                      style={{
                                        marginLeft: "auto",
                                        color: "var(--cg-accent)",
                                        flexShrink: 0,
                                      }}
                                    />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TimelineItem>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A pane that exists in the taxonomy but is not built yet.
 *
 * Stated plainly rather than rendered as an empty table: an empty table claims
 * "no data", which is a different thing from "not implemented" and sends the
 * reader hunting for a filter to clear. Naming what it WILL hold also makes the
 * gap legible instead of mysterious.
 */
export function PanePlaceholder({
  title,
  hint,
  icon,
  expected,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  expected: string[];
}) {
  return (
    <div style={{ padding: "8px 0" }}>
      <PaneTitle title={title} hint={hint} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          padding: "36px 20px",
          border: "1px dashed var(--cg-border)",
          borderRadius: 6,
          textAlign: "center",
        }}
      >
        <span style={{ color: "var(--cg-text-muted)" }}>{icon}</span>
        <div style={{ fontSize: 12.5, color: "var(--cg-text-primary)" }}>
          Not built yet
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--cg-text-muted)",
            maxWidth: "52ch",
            lineHeight: 1.7,
            textAlign: "left",
          }}
        >
          This pane will hold:
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {expected.map((e) => (
              <li key={e} style={{ padding: "1px 0" }}>
                {e}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

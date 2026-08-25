/* eslint-disable i18next/no-literal-string -- event report page */
import React from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileJson,
  FileSearch,
  LayoutGrid,
  LifeBuoy,
  MoreHorizontal,
  Network,
  Radar,
  Save,
  Ticket,
  UserPlus,
} from "lucide-react";

import { saveReportToLibrary } from "./report-library";
import { useConversationId } from "#/hooks/use-conversation-id";
import { SideRailPanel } from "#/components/admin/admin-kit";
import { APP_FONT } from "./theme";
import { GridPalette } from "./palette";
import { SvgIcon } from "./SvgIcon";
import { ResourceIcon } from "./icons";
import { SeverityGauge } from "./SeverityGauge";
import { SEVERITY_OF, eventAsText } from "./event-data";
import type { EventRow, LogLine } from "./event-data";
import { eventAsJson } from "./EventMenu";
import { eventReportFilename, eventReportMarkdown } from "./event-report";
import { SecurityGraph } from "./SecurityGraph";

/**
 * The event drawer, built to the Security Event Drawer spec (v2.0).
 *
 * The governing rule is the ten-second test: what happened, how bad, which
 * resource, where, what impact, who owns it, what next — all answerable from
 * the header and the Overview tab, without switching views. Everything that
 * fails that test is demoted rather than deleted.
 *
 * Three consequences worth naming, because they are why the layout looks the
 * way it does:
 *
 *  - **The title is the event, not the resource.** "Storage Bucket Outage",
 *    with `bucket-1001` beneath it. A queue of resource identifiers tells you
 *    what was involved and never what happened.
 *  - **Cards, not key/value rows.** A label→value list forces the eye across
 *    the full width for every field; a card groups the values that are read
 *    together into one fixation.
 *  - **Colour carries severity, status and health — nothing else.** Cloud,
 *    region, environment and type are told by icon, so that when something on
 *    screen is coloured it always means the same thing.
 *
 * Chrome is `SideRailPanel` — the same header / left rail / footer the
 * workspace detail drawer uses in Platform settings, factored out of
 * `SideRailDrawer` so this is the identical component rather than a lookalike.
 * Severity still uses the grid's own `SeverityGauge`: this is opened from the
 * events table, and a severity must not change glyph between a row and its
 * detail.
 */

type ViewId = "overview" | "finding" | "evidence" | "response" | "graph";

const VIEWS: { id: ViewId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={13} /> },
  { id: "finding", label: "Finding", icon: <Radar size={13} /> },
  { id: "evidence", label: "Evidence", icon: <FileSearch size={13} /> },
  { id: "response", label: "Response", icon: <LifeBuoy size={13} /> },
  { id: "graph", label: "Security graph", icon: <Network size={13} /> },
];

/* ------------------------------------------------------------------ *
 * Tokens
 * ------------------------------------------------------------------ */

const GAP_SECTION = 24;
const GAP_CARD = 16;
const GAP_CHIP = 8;

const PROVIDER_SLUG: Record<string, string> = {
  AWS: "aws",
  Azure: "microsoft_azure",
  GCP: "google_cloud",
};

const SERVICE_SLUG: Record<string, { slug: string; color: string }> = {
  Compute: { slug: "azure_virtual_machine", color: "#0078d4" },
  Storage: { slug: "azure_storage_accounts", color: "#d9a441" },
  Database: { slug: "azure_sql_database", color: "#c74634" },
  Serverless: { slug: "azure_function_apps", color: "#c65eb4" },
  Networking: { slug: "azure_load_balancers", color: "#0078d4" },
};

const STATUS_COLOR: Record<string, string> = {
  Open: "var(--cgx-critical)",
  Acknowledged: "var(--cgx-medium)",
  Suppressed: "var(--cgx-neutral)",
  Resolved: "var(--cgx-low)",
};

const LEVEL_COLOR: Record<string, string> = {
  info: "var(--cgx-neutral)",
  warn: "var(--cgx-medium)",
  error: "var(--cgx-critical)",
};

function untilLabel(due: Date): { text: string; overdue: boolean } {
  const ms = due.getTime() - Date.now();
  const overdue = ms < 0;
  const h = Math.round(Math.abs(ms) / 36e5);
  const text = h >= 48 ? `${Math.round(h / 24)}d` : `${h}h`;
  return { text: overdue ? `${text} overdue` : text, overdue };
}

function agoLabel(at: Date): string {
  const mins = Math.round((Date.now() - at.getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

const clock = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

/**
 * Metrics copied from `ConversationTabNav` so the report actions and the drawer
 * tabs are the same control: 28px tall, 10px padding, 12.5px type, 6px gap.
 * Colour, background, radius and every interactive state come from the
 * `.cg-report-action` class — inline styles beat a class, so nothing the class
 * owns may be repeated here.
 */
const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 10px",
  fontSize: 12.5,
  lineHeight: 1,
  fontFamily: APP_FONT,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

/** Metadata chip: the icon carries the meaning, the type carries the value. */
function Chip({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 9px",
        fontSize: 11.5,
        lineHeight: "18px",
        borderRadius: 11,
        border: "1px solid var(--cg-border)",
        color: "var(--cg-text-primary)",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * Cards hold stacked value/caption pairs, not label→value rows: the value
 * leads because it is what is being read, and the caption qualifies it.
 */
function Stat({
  value,
  caption,
  tint,
}: {
  value: React.ReactNode;
  caption: string;
  tint?: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 13.5,
          fontWeight: 600,
          color: tint ?? "var(--cg-text-primary)",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--cg-text-muted)" }}>
        {caption}
      </div>
    </div>
  );
}

/**
 * The stats inside a section, wrapping into columns as the drawer allows.
 * Two-up when wide, one-up when narrow — expressed by the content rather than
 * a breakpoint, so it responds to the drawer and not to the window.
 */
function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: `${GAP_CARD}px ${GAP_SECTION}px`,
      }}
    >
      {children}
    </div>
  );
}

function Disclosure({
  title,
  count,
  children,
  open: initial = false,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  open?: boolean;
}) {
  const [open, setOpen] = React.useState(initial);
  return (
    <section style={{ borderBottom: "1px solid var(--cg-border-subtle)" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "10px 2px",
          background: "none",
          border: "none",
          color: "var(--cg-text-primary)",
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: APP_FONT,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {title}
        {count !== undefined && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--cg-text-muted)",
            }}
          >
            {count}
          </span>
        )}
      </button>
      {open && (
        <div style={{ padding: `0 2px ${GAP_CARD}px 21px` }}>{children}</div>
      )}
    </section>
  );
}

interface Moment {
  at: Date;
  text: React.ReactNode;
  /** Dot colour — the only place colour is used in a timeline. */
  tint?: string;
}

/**
 * Vertical timeline: a rail with a dot per moment, time to its left.
 *
 * The rail is one absolutely-positioned line rather than a border on each row,
 * so it starts at the first dot and stops at the last instead of running off
 * into the padding above and below the sequence.
 */
function Timeline({ rows }: { rows: Moment[] }) {
  const RAIL = 58;
  return (
    <div style={{ position: "relative" }}>
      {rows.length > 1 && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: RAIL,
            top: 8,
            bottom: 8,
            width: 1,
            background: "var(--cg-border)",
          }}
        />
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r, i) => (
          <div
            // Two moments can share a minute; the index disambiguates them.
            key={`${r.at.toISOString()}-${i}`}
            style={{ display: "flex", alignItems: "flex-start", fontSize: 12 }}
          >
            <span
              style={{
                width: RAIL - 10,
                flexShrink: 0,
                textAlign: "right",
                color: "var(--cg-text-muted)",
                fontVariantNumeric: "tabular-nums",
                lineHeight: "16px",
              }}
            >
              {clock(r.at)}
            </span>
            <span
              aria-hidden="true"
              style={{
                width: 20,
                flexShrink: 0,
                display: "flex",
                justifyContent: "center",
                paddingTop: 4,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: r.tint ?? "var(--cg-bg-page)",
                  border: `2px solid ${r.tint ?? "var(--cg-text-muted)"}`,
                  boxSizing: "border-box",
                }}
              />
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                lineHeight: "16px",
                color: "var(--cg-text-primary)",
                overflowWrap: "anywhere",
              }}
            >
              {r.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Log lines are moments too — the level tints the dot, not the text. */
function logMoments(lines: LogLine[]): Moment[] {
  return lines.map((l) => ({
    at: l.at,
    tint: LEVEL_COLOR[l.level],
    text: (
      <>
        {l.message}
        <span style={{ color: "var(--cg-text-muted)" }}>
          {" "}
          · {l.source} · {l.level}
        </span>
      </>
    ),
  }));
}

function Pairs({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 10, fontSize: 11.5 }}>
          <span style={{ flex: "0 0 132px", color: "var(--cg-text-muted)" }}>
            {k}
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              color: "var(--cg-text-primary)",
              overflowWrap: "anywhere",
            }}
          >
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 12.5,
        lineHeight: 1.55,
        color: "var(--cg-text-primary)",
      }}
    >
      {children}
    </p>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, color: "var(--cg-text-muted)" }}>
      {children}
    </span>
  );
}

function download(name: string, body: string) {
  const url = URL.createObjectURL(
    new Blob([body], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Deterministic from the event, so the same event never gets two numbers. */
function newTicketId(e: EventRow): string {
  let h = 0;
  for (let i = 0; i < e.id.length; i += 1) {
    h = (h * 31 + e.id.charCodeAt(i)) % 1000003;
  }
  return `INC-${10000 + (h % 89999)}`;
}

type SaveState = "idle" | "saving" | "saved" | "error";
type Sla = { text: string; overdue: boolean };

/* ------------------------------------------------------------------ *
 * Views
 * ------------------------------------------------------------------ */

function OverviewTab({
  event,
  ticket,
  assignee,
  severity,
  sla,
}: {
  event: EventRow;
  ticket: string | null;
  assignee: string;
  severity: string;
  sla: Sla;
}) {
  const service = SERVICE_SLUG[event.serviceType];
  return (
    <div>
      <Disclosure title="Status" open>
        <StatGrid>
          <Stat
            value={
              <>
                <SeverityGauge severity={severity} size={16} />
                {severity}
              </>
            }
            caption="Severity"
          />
          <Stat value={event.message} caption="Current state" />
          <Stat
            value={sla.text}
            caption="SLA remaining"
            tint={sla.overdue ? "var(--cgx-critical)" : undefined}
          />
          <Stat
            value={event.status}
            caption="Workflow"
            tint={STATUS_COLOR[event.status]}
          />
        </StatGrid>
      </Disclosure>

      <Disclosure title="Resource" open>
        <StatGrid>
          <Stat
            value={
              <>
                <ResourceIcon kind={event.kind} size={18} />
                {event.resource}
              </>
            }
            caption={event.kind}
          />
          <Stat
            value={
              <>
                {PROVIDER_SLUG[event.provider] && (
                  <SvgIcon
                    slug={PROVIDER_SLUG[event.provider]}
                    size={16}
                    useBrandColor
                  />
                )}
                {event.provider}
              </>
            }
            caption={`${event.account} · ${event.region}`}
          />
          <Stat
            value={
              <>
                {service && (
                  <SvgIcon
                    slug={service.slug}
                    size={16}
                    color={service.color}
                  />
                )}
                {event.serviceType}
              </>
            }
            caption={`${event.env} environment`}
          />
        </StatGrid>
      </Disclosure>

      <Disclosure title="Impact" open>
        <StatGrid>
          <Stat
            value={`${event.blastRadius} services`}
            caption="Blast radius, downstream"
          />
          <Stat
            value={`${event.affectedResources} resources`}
            caption="Directly affected"
          />
          <Stat value={event.businessImpact} caption="Business impact" />
          <Stat
            value={event.internetFacing ? "Internet facing" : "Internal only"}
            caption="Exposure"
            tint={
              event.internetFacing ? "var(--cgx-critical)" : "var(--cgx-low)"
            }
          />
        </StatGrid>
      </Disclosure>

      <Disclosure title="Ownership">
        <StatGrid>
          <Stat value={event.owner} caption="Owner team" />
          <Stat value={assignee} caption="Assigned engineer" />
          <Stat value={event.escalation} caption="Escalation" />
          <Stat value={ticket ?? "No ticket"} caption="Tracking" />
        </StatGrid>
      </Disclosure>

      <Disclosure title="Timeline" count={event.timeline.length} open>
        <Timeline
          rows={event.timeline.map((t) => ({ at: t.at, text: t.label }))}
        />
      </Disclosure>

      <Disclosure
        title="Recommended actions"
        count={event.recommendations.length}
        open
      >
        <ol
          style={{
            margin: 0,
            paddingLeft: 18,
            display: "grid",
            gap: 6,
            fontSize: 12.5,
            color: "var(--cg-text-primary)",
          }}
        >
          {event.recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </Disclosure>
    </div>
  );
}

function FindingTab({
  event,
  severity,
}: {
  event: EventRow;
  severity: string;
}) {
  return (
    <div>
      <Disclosure title="Detection rule" open>
        <StatGrid>
          <Stat value={event.detector} caption="Detector" />
          <Stat value={event.ruleId} caption="Rule" />
          <Stat value={`${event.confidence}%`} caption="Confidence" />
          <Stat value={String(event.occurrences)} caption="Occurrences" />
          <Stat
            value={
              <>
                <SeverityGauge severity={severity} size={15} />
                {severity}
              </>
            }
            caption="Severity"
          />
          <Stat value={event.firstSeen.toLocaleString()} caption="First seen" />
        </StatGrid>
      </Disclosure>

      <Disclosure title="MITRE ATT&CK" open>
        <StatGrid>
          <Stat value={event.mitreTactic} caption="Tactic" />
          <Stat value={event.mitreTechnique} caption="Technique" />
          <Stat value={event.mitreId} caption="Technique ID" />
        </StatGrid>
      </Disclosure>

      <Disclosure title="Detection logic" open>
        <Prose>{event.detectionLogic}</Prose>
      </Disclosure>

      <Disclosure title="False positive guidance">
        <Prose>{event.falsePositive}</Prose>
      </Disclosure>

      <Disclosure title="Related findings" count={event.relatedFindings.length}>
        {event.relatedFindings.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: GAP_CHIP }}>
            {event.relatedFindings.map((f) => (
              <Chip key={f}>{f}</Chip>
            ))}
          </div>
        ) : (
          <Empty>None correlated</Empty>
        )}
      </Disclosure>
    </div>
  );
}

function EvidenceTab({ event }: { event: EventRow }) {
  return (
    <div>
      <Disclosure title="Logs" count={event.logs.length} open>
        <Timeline rows={logMoments(event.logs)} />
      </Disclosure>
      <Disclosure title="Telemetry" count={event.telemetry.length}>
        <Pairs rows={event.telemetry} />
      </Disclosure>
      <Disclosure title="Cloud events" count={event.cloudEvents.length}>
        <Timeline rows={logMoments(event.cloudEvents)} />
      </Disclosure>
      <Disclosure title="API calls" count={event.apiCalls.length}>
        <Pairs rows={event.apiCalls} />
      </Disclosure>
      <Disclosure title="Artifacts" count={3}>
        <Pairs
          rows={[
            ["Signal", event.evidence],
            ["Log reference", event.logRef],
            ["Fingerprint", event.fingerprint],
          ]}
        />
      </Disclosure>
      <Disclosure title="Related alerts" count={event.relatedFindings.length}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: GAP_CHIP }}>
          {event.relatedFindings.map((f) => (
            <Chip key={f}>{f}</Chip>
          ))}
        </div>
      </Disclosure>
      <Disclosure title="Timeline" count={event.timeline.length}>
        <Timeline
          rows={event.timeline.map((t) => ({ at: t.at, text: t.label }))}
        />
      </Disclosure>
    </div>
  );
}

function ResponseTab({
  event,
  ticket,
  assignee,
  sla,
}: {
  event: EventRow;
  ticket: string | null;
  assignee: string;
  sla: Sla;
}) {
  return (
    <div>
      <Disclosure title="Assignment" open>
        <StatGrid>
          <Stat value={assignee} caption="Owner" />
          <Stat
            value={event.status}
            caption="Status"
            tint={STATUS_COLOR[event.status]}
          />
          <Stat value={ticket ?? "No ticket"} caption="Ticket" />
          <Stat
            value={sla.text}
            caption="SLA remaining"
            tint={sla.overdue ? "var(--cgx-critical)" : undefined}
          />
        </StatGrid>
      </Disclosure>

      <Disclosure title="Playbook and automation" open>
        <StatGrid>
          <Stat value={event.automation} caption="Available action" />
          <Stat value={event.playbook} caption="Playbook" />
          <Stat value={event.runbook} caption="Runbook" />
          <Stat value={event.escalation} caption="Escalation path" />
        </StatGrid>
      </Disclosure>

      <Disclosure title="Response history" count={event.history.length} open>
        <Timeline
          rows={event.history.map((h) => ({
            at: h.at,
            // Agent and human steps are the one distinction worth a colour
            // here: it says who moved the incident without a second column.
            tint:
              h.actorType === "agent" ? "var(--cgx-account)" : "var(--cgx-low)",
            text: (
              <>
                {h.action}
                <span style={{ color: "var(--cg-text-muted)" }}>
                  {" "}
                  · {h.actor} ({h.actorType})
                </span>
              </>
            ),
          }))}
        />
      </Disclosure>

      <Disclosure title="Comments" count={event.comments.length}>
        {event.comments.length ? (
          <Timeline
            rows={event.comments.map((c) => ({
              at: c.at,
              text: (
                <>
                  <span style={{ color: "var(--cg-text-muted)" }}>{c.who}</span>
                  <br />
                  {c.text}
                </>
              ),
            }))}
          />
        ) : (
          <Empty>No comments yet</Empty>
        )}
      </Disclosure>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Drawer
 * ------------------------------------------------------------------ */

export function EventReport({
  event,
  onBack,
  onSaved,
}: {
  event: EventRow;
  /** Back to the artifact listing. */
  onBack: () => void;
  /** Fired after a successful write, so the listing can pick the file up. */
  onSaved: () => void;
}) {
  const { conversationId } = useConversationId();
  const [view, setView] = React.useState<ViewId>("overview");
  const [save, setSave] = React.useState<SaveState>("idle");
  const [ticket, setTicket] = React.useState<string | null>(event.ticket);
  const [assignee, setAssignee] = React.useState(event.assignee);
  const [overflow, setOverflow] = React.useState(false);

  const severity = SEVERITY_OF[event.type] ?? "Low";
  const sla = untilLabel(event.slaDue);
  const isGraph = view === "graph";

  // A different event is a different report — never inherit state from the last.
  React.useEffect(() => {
    setSave("idle");
    setView("overview");
    setTicket(event.ticket);
    setAssignee(event.assignee);
    setOverflow(false);
  }, [event.id, event.ticket, event.assignee]);

  const current = { ...event, ticket, assignee };

  const onSave = async () => {
    // NO conversation guard. The artifact library is a SHARED store, not
    // per-conversation state — the id is threaded through only so the audit
    // entry records which session a save came from when there is one. Refusing
    // without it meant the button failed outright on any surface opened outside
    // a conversation, which is most of Explore.
    setSave("saving");
    try {
      // Save what is on screen — a ticket raised or an assignment made in this
      // session is part of the record, not a detail the table happened to hold.
      //
      // Into the LIBRARY, not the sandbox: this used to upload into the agent's
      // working directory, which is deleted with the conversation and is not the
      // tree the Files tab shows. The report appeared to save and then was
      // nowhere to be found.
      await saveReportToLibrary(
        eventReportFilename(event),
        eventReportMarkdown(current),
        conversationId ?? "",
      );
      setSave("saved");
      onSaved();
    } catch {
      setSave("error");
    }
  };

  return (
    <div style={{ height: "100%", minHeight: 0, fontFamily: APP_FONT }}>
      {/* Icon tints resolve to currentColor without the kit's palette. */}
      <GridPalette />

      <SideRailPanel
        title={
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <SeverityGauge severity={severity} size={16} />
            {event.title}
          </span>
        }
        subtitle={
          <>
            {event.resource} · {event.provider} · {event.region} · {event.env} ·{" "}
            {event.serviceType} · blast radius {event.blastRadius} · owner{" "}
            {event.owner} · opened {agoLabel(event.at)} ·{" "}
            <span
              style={{
                color: sla.overdue ? "var(--cgx-critical)" : undefined,
                fontWeight: sla.overdue ? 600 : undefined,
              }}
            >
              SLA {sla.text}
            </span>
          </>
        }
        sections={VIEWS.map((v) => ({
          id: v.id,
          label: v.label,
          icon: v.icon,
        }))}
        active={view}
        onSelect={(id) => setView(id as ViewId)}
        footer={
          <span
            style={{
              marginRight: "auto",
              alignSelf: "center",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "var(--cg-text-muted)",
            }}
          >
            {save === "saved" ? "Saved to reports" : "Unsaved report"}
            {ticket && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: "var(--cg-text-primary)",
                }}
              >
                <Ticket size={11} />
                {ticket}
              </span>
            )}
          </span>
        }
        actions={
          <>
            <button
              type="button"
              className="cg-report-action"
              style={btn}
              onClick={onBack}
            >
              <ArrowLeft size={12} /> Reports
            </button>
            <button
              type="button"
              className="cg-report-action"
              style={btn}
              disabled={assignee !== "unassigned"}
              onClick={() => setAssignee("me")}
            >
              <UserPlus size={12} />{" "}
              {assignee === "unassigned" ? "Assign" : assignee}
            </button>
            <button
              type="button"
              className="cg-report-action"
              style={btn}
              disabled={Boolean(ticket)}
              onClick={() => setTicket(newTicketId(event))}
            >
              <Ticket size={12} /> {ticket ?? "Open ticket"}
            </button>
            <span style={{ position: "relative", display: "inline-flex" }}>
              <button
                type="button"
                aria-label="More actions"
                aria-expanded={overflow}
                className="cg-report-action"
                style={{ ...btn, padding: "0 6px" }}
                onClick={() => setOverflow((v) => !v)}
              >
                <MoreHorizontal size={13} />
              </button>
              {overflow && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    // Opens DOWNWARD: the bar moved from the panel footer to
                    // the header, so a menu anchored to the button's top edge
                    // would open off the top of the drawer.
                    top: "calc(100% + 4px)",
                    right: 0,
                    zIndex: 20,
                    minWidth: 180,
                    padding: "4px 0",
                    background: "var(--cg-bg-card)",
                    border: "1px solid var(--cg-border)",
                    borderRadius: 4,
                    boxShadow:
                      "var(--cg-shadow-dropdown, 0 8px 24px rgba(0,0,0,.45))",
                  }}
                >
                  <button
                    type="button"
                    className="cg-report-action"
                    style={{
                      ...btn,
                      width: "100%",
                      justifyContent: "flex-start",
                      border: "none",
                      borderRadius: 0,
                    }}
                    onClick={() => {
                      download(`${event.id}.json`, eventAsJson(current));
                      setOverflow(false);
                    }}
                  >
                    <FileJson size={12} /> Export JSON
                  </button>
                  <button
                    type="button"
                    className="cg-report-action"
                    style={{
                      ...btn,
                      width: "100%",
                      justifyContent: "flex-start",
                      border: "none",
                      borderRadius: 0,
                    }}
                    onClick={() => {
                      navigator.clipboard?.writeText(eventAsText(current));
                      setOverflow(false);
                    }}
                  >
                    <Copy size={12} /> Copy details
                  </button>
                </div>
              )}
            </span>
            <button
              type="button"
              className={`cg-report-action ${
                save === "error"
                  ? "cg-report-action-danger"
                  : "cg-report-action-primary"
              }`}
              style={btn}
              disabled={save === "saving"}
              onClick={onSave}
            >
              {save === "saved" ? <Check size={12} /> : <Save size={12} />}
              {
                {
                  idle: "Save to reports",
                  saving: "Saving…",
                  saved: "Saved",
                  error: "Save failed — retry",
                }[save]
              }
            </button>
          </>
        }
      >
        {view === "overview" && (
          <OverviewTab
            event={event}
            ticket={ticket}
            assignee={assignee}
            severity={severity}
            sla={sla}
          />
        )}
        {view === "finding" && <FindingTab event={event} severity={severity} />}
        {view === "evidence" && <EvidenceTab event={event} />}
        {view === "response" && (
          <ResponseTab
            event={event}
            ticket={ticket}
            assignee={assignee}
            sla={sla}
          />
        )}
        {isGraph && (
          <div style={{ height: "100%", minHeight: 420 }}>
            <SecurityGraph event={event} />
          </div>
        )}
      </SideRailPanel>
    </div>
  );
}

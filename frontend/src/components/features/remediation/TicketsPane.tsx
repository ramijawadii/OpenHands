/* eslint-disable i18next/no-literal-string -- ticket links */
/**
 * Tickets.
 *
 * The table is the pane, as in Evidence and Audit. What changes here is the
 * emphasis: the first thing the header says is whether this action is
 * **blocked**, because that is the only fact on the page that changes what the
 * reader does next. Everything else — who owns it, how old it is, whether the
 * two systems still agree — is why it is blocked.
 */
import React from "react";
import {
  Bot,
  Download,
  ExternalLink,
  GitPullRequest,
  Scale,
  ShieldAlert,
  Ticket as TicketIcon,
  TriangleAlert,
  User,
  Workflow,
} from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useTheme } from "#/context/theme-context";
import {
  eventsThemeFor,
  APP_FONT,
} from "#/components/features/explore/cloudguard-grid/theme";
import { FilterSelect } from "#/components/features/explore/cloudguard-grid/FilterSelect";
import {
  NestedNav,
  Section,
  Row,
  IconRow,
  StepTag,
  Pill,
} from "./RemediationPanes";
import type { RemediationAction } from "./remediation-data";
import {
  buildTickets,
  blockedBy,
  ageDays,
  exportTicketLinks,
  type Ticket,
  type TicketKind,
  type CreatorKind,
  type SyncState,
} from "./remediation-ticket-data";

const mono: React.CSSProperties = {
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
};

const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 26,
  padding: "0 9px",
  fontSize: 12,
  fontFamily: APP_FONT,
  cursor: "pointer",
};

const ALL = { value: "All", label: "All" };

const KIND_ICON: Record<TicketKind, React.ReactNode> = {
  "Change request": <Scale size={11} />,
  Incident: <ShieldAlert size={11} />,
  "Pull request": <GitPullRequest size={11} />,
  Task: <TicketIcon size={11} />,
};

const CREATOR_ICON: Record<CreatorKind, React.ReactNode> = {
  Agent: <Bot size={11} />,
  Human: <User size={11} />,
  Policy: <Workflow size={11} />,
};

const SYNC_TONE: Record<SyncState, string> = {
  "In sync": "var(--cg-text-muted)",
  Drifted: "var(--cgx-critical)",
  Stale: "var(--cgx-high)",
  "Link broken": "var(--cgx-critical)",
};

/** The external key, marked by what kind of thing it is. */
function KeyCell({ data: d }: ICellRendererParams<Ticket>) {
  if (!d) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "var(--cg-text-muted)", display: "inline-flex" }}>
        {KIND_ICON[d.kind]}
      </span>
      <span style={mono}>{d.key}</span>
      {d.blocking && d.status !== "Done" && d.status !== "Cancelled" && (
        <Pill color="var(--cgx-critical)">blocking</Pill>
      )}
    </span>
  );
}

/** Who raised it, and whether that was a person. */
function CreatorCell({ data: d }: ICellRendererParams<Ticket>) {
  if (!d) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "var(--cg-text-muted)", display: "inline-flex" }}>
        {CREATOR_ICON[d.createdByKind]}
      </span>
      {d.createdBy}
    </span>
  );
}

/**
 * Agreement between the two ends.
 *
 * In sync is deliberately quiet — it is the expected case, and colouring it
 * green would spend attention on the rows that need none.
 */
function SyncCell({ data: d }: ICellRendererParams<Ticket>) {
  if (!d) return null;
  if (d.sync === "In sync")
    return <span style={{ color: "var(--cg-text-muted)" }}>in sync</span>;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        color: SYNC_TONE[d.sync],
      }}
      title={d.drift}
    >
      <TriangleAlert size={11} />
      {d.sync}
    </span>
  );
}

export function TicketsPane({
  action,
  onOpenTicket,
}: {
  action: RemediationAction;
  onOpenTicket?: (ticket: Ticket) => void;
}) {
  const { theme } = useTheme();
  const tickets = React.useMemo(() => buildTickets(action), [action]);

  const [msg, setMsg] = React.useState<string | null>(null);
  const [system, setSystem] = React.useState("All");
  const [kind, setKind] = React.useState("All");
  const [status, setStatus] = React.useState("All");
  const [assignee, setAssignee] = React.useState("All");
  const [creator, setCreator] = React.useState("All");
  const [sync, setSync] = React.useState("All");

  React.useEffect(() => {
    if (!msg) return undefined;
    const t = window.setTimeout(() => setMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [msg]);

  const rows = tickets.filter(
    (t) =>
      (system === "All" || t.system === system) &&
      (kind === "All" || t.kind === kind) &&
      (status === "All" || t.status === status) &&
      (assignee === "All" || t.assignee === assignee) &&
      (creator === "All" || t.createdBy === creator) &&
      (sync === "All" ||
        (sync === "Out of sync" ? t.sync !== "In sync" : t.sync === sync)),
  );

  const uniq = (fn: (t: Ticket) => string) => [
    ALL,
    ...[...new Set(tickets.map(fn))]
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const blocked = blockedBy(tickets);
  const outOfSync = tickets.filter((t) => t.sync !== "In sync").length;

  const gridTheme = eventsThemeFor(theme);
  const cols = React.useMemo<ColDef<Ticket>[]>(
    () => [
      {
        colId: "key",
        headerName: "Ticket",
        width: 176,
        valueGetter: (p) => p.data?.key ?? "",
        cellRenderer: KeyCell,
      },
      { field: "system", headerName: "System", width: 108 },
      { field: "kind", headerName: "Type", width: 132 },
      { field: "title", headerName: "Summary", flex: 1, minWidth: 200 },
      { field: "status", headerName: "Status", width: 108 },
      { field: "assignee", headerName: "Assignee", width: 150 },
      {
        colId: "createdBy",
        headerName: "Raised by",
        width: 156,
        valueGetter: (p) => p.data?.createdBy ?? "",
        cellRenderer: CreatorCell,
      },
      {
        colId: "age",
        headerName: "Idle",
        width: 78,
        // Time since last movement, not since creation: a three-week-old
        // ticket touched this morning is fine, a three-day-old one nobody has
        // opened is the one stalling the work.
        valueGetter: (p) => (p.data ? ageDays(p.data) : 0),
        valueFormatter: (p) => `${p.value}d`,
        type: "numericColumn",
      },
      {
        colId: "sync",
        headerName: "Link",
        width: 116,
        valueGetter: (p) => p.data?.sync ?? "",
        cellRenderer: SyncCell,
      },
    ],
    [],
  );

  return (
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
          <TicketIcon size={13} style={{ color: "var(--cg-text-muted)" }} />
          <StepTag>Linked tickets</StepTag>
        </span>

        <FilterSelect
          variant="tab"
          label="System"
          value={system}
          onChange={setSystem}
          options={uniq((t) => t.system)}
        />
        <FilterSelect
          variant="tab"
          label="Type"
          value={kind}
          onChange={setKind}
          options={uniq((t) => t.kind)}
        />
        <FilterSelect
          variant="tab"
          label="Status"
          value={status}
          onChange={setStatus}
          options={uniq((t) => t.status)}
        />
        <FilterSelect
          variant="tab"
          label="Assignee"
          value={assignee}
          onChange={setAssignee}
          options={uniq((t) => t.assignee)}
        />
        <FilterSelect
          variant="tab"
          label="Raised by"
          value={creator}
          onChange={setCreator}
          options={uniq((t) => t.createdBy)}
        />
        <FilterSelect
          variant="tab"
          label="Link"
          value={sync}
          onChange={setSync}
          options={[
            ALL,
            { value: "Out of sync", label: "Out of sync" },
            { value: "Drifted", label: "Drifted" },
            { value: "Stale", label: "Stale" },
            { value: "Link broken", label: "Link broken" },
          ]}
        />

        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* The one fact that changes what the reader does next. */}
          {blocked.length > 0 && (
            <Pill color="var(--cgx-critical)">
              blocked by {blocked.map((t) => t.key).join(", ")}
            </Pill>
          )}
          {outOfSync > 0 && (
            <Pill color="var(--cgx-high)">{outOfSync} out of sync</Pill>
          )}
          <span
            style={{
              fontSize: 11.5,
              color: "var(--cg-text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {rows.length} of {tickets.length}
          </span>
          <button
            type="button"
            className="cg-report-action cg-report-action-primary"
            onClick={() => {
              const r = exportTicketLinks(action, tickets);
              setMsg(
                r.ok
                  ? `Exported to ${r.filename}`
                  : `Export failed — ${r.error}`,
              );
            }}
            style={btn}
          >
            <Download size={12} /> Export links
          </button>
        </span>
      </div>

      {msg && (
        <div
          role="status"
          style={{
            marginBottom: 8,
            flexShrink: 0,
            fontSize: 11.5,
            color: msg.startsWith("Export failed")
              ? "var(--cgx-critical)"
              : "var(--cg-text-muted)",
          }}
        >
          {msg}
        </div>
      )}

      <div className="cg-scroll" style={{ flex: 1, minHeight: 180 }}>
        <AgGridReact<Ticket>
          theme={gridTheme}
          headerHeight={24}
          rowHeight={28}
          defaultColDef={{
            sortable: true,
            resizable: false,
            suppressMovable: true,
          }}
          rowData={rows}
          columnDefs={cols}
          getRowId={(p) => p.data.key}
          onRowClicked={(e) => e.data && onOpenTicket?.(e.data)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * One ticket
 * ------------------------------------------------------------------ */

/**
 * A single linkage.
 *
 * Ordered by what the reader is deciding: whether it blocks, who to chase,
 * whether the link can be trusted, and only then the change-control detail.
 * The ticket's own contents deliberately stay thin — this is not a Jira
 * client, and pretending otherwise means maintaining a worse Jira forever.
 */
export function TicketView({
  ticket,
  onBack,
}: {
  ticket: Ticket;
  onBack: () => void;
}) {
  const idle = ageDays(ticket);
  const open = ticket.status !== "Done" && ticket.status !== "Cancelled";

  return (
    <div className="cg-nested" style={{ color: "var(--cg-text-primary)" }}>
      <NestedNav
        trail={[
          { label: "Tickets", onClick: onBack },
          { label: ticket.system },
        ]}
        current={ticket.key}
        right={
          <a
            href={ticket.url}
            target="_blank"
            rel="noopener noreferrer"
            className="cg-report-action"
            style={{ ...btn, textDecoration: "none" }}
          >
            <ExternalLink size={12} /> Open in {ticket.system}
          </a>
        }
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <StepTag>{ticket.kind}</StepTag>
        <span style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>
          {ticket.title}
        </span>
        {ticket.blocking && open && (
          <Pill color="var(--cgx-critical)">blocking this action</Pill>
        )}
      </div>

      <Section title="Where it sits" open>
        <Row label="Status" value={ticket.status} />
        <IconRow label="Gates this action" icon={KIND_ICON[ticket.kind]}>
          {ticket.blocking
            ? "Yes — the action cannot proceed until this closes"
            : "No — tracked alongside, does not gate execution"}
        </IconRow>
        <IconRow label="Raised at stage" icon={<Workflow size={11} />}>
          {ticket.stageLabel}
        </IconRow>
        <Row label="Key" value={<span style={mono}>{ticket.key}</span>} />
      </Section>

      <Section title="Who owns it" open>
        <Row label="Assignee" value={ticket.assignee} />
        <Row label="Team" value={ticket.team} />
        <IconRow label="Raised by" icon={CREATOR_ICON[ticket.createdByKind]}>
          {ticket.createdBy} ({ticket.createdByKind})
        </IconRow>
        <Row
          label="Created"
          value={ticket.createdAt.toISOString().replace("T", " ").slice(0, 16)}
        />
        <Row
          label="Last movement"
          value={
            <span style={{ color: idle > 7 ? "var(--cgx-high)" : undefined }}>
              {ticket.updatedAt.toISOString().replace("T", " ").slice(0, 16)}
              {` · idle ${idle}d`}
            </span>
          }
        />
      </Section>

      <Section title="Link health" open>
        <IconRow
          label="State"
          icon={
            ticket.sync === "In sync" ? undefined : (
              <TriangleAlert size={11} color={SYNC_TONE[ticket.sync]} />
            )
          }
        >
          <span
            style={{
              color:
                ticket.sync === "In sync" ? undefined : SYNC_TONE[ticket.sync],
            }}
          >
            {ticket.sync}
          </span>
        </IconRow>
        {ticket.drift && (
          // Spelled out rather than left as a status word: "Drifted" tells you
          // something is wrong, not what, and the what is the whole point.
          <Row label="What disagrees" value={ticket.drift} />
        )}
        <Row label="Reference" value={<span style={mono}>{ticket.url}</span>} />
      </Section>

      {ticket.approvals && (
        <Section title="Change control" open>
          <Row label="Approvals" value={ticket.approvals} />
          <Row label="Change window" value={ticket.window ?? "—"} />
          <IconRow label="Note" icon={<Scale size={11} />}>
            These are the external tool&apos;s approvals. They are separate from
            this platform&apos;s gates — a cleared gate here is not an approved
            change request there.
          </IconRow>
        </Section>
      )}
    </div>
  );
}

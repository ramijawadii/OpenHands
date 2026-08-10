/* eslint-disable i18next/no-literal-string -- audit trail */
/**
 * Audit.
 *
 * **The table is the pane.** Changes and Access are two tables, not two
 * sections stacked down a scroll — stacking them means the second one is
 * discovered by accident, and it halves the height of the first, which is the
 * one people came for. A switch costs one click and keeps both at full size.
 *
 * Integrity and export live in the header row rather than in a banner above
 * the data, for the same reason: a chain that is verified on demand is a
 * button, and a button does not need forty pixels of its own.
 */
import React from "react";
import { Bot, Cpu, Download, ShieldCheck, User } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useTheme } from "#/context/theme-context";
import {
  eventsThemeFor,
  APP_FONT,
} from "#/components/features/explore/cloudguard-grid/theme";
import { FilterSelect } from "#/components/features/explore/cloudguard-grid/FilterSelect";
import { NestedNav, Section, Row, StepTag, Pill } from "./RemediationPanes";
import type { RemediationAction } from "./remediation-data";
import {
  buildAuditTrail,
  buildAccessTrail,
  verifyAuditChain,
  exportAuditTrail,
  type AuditChange,
  type ActorKind,
} from "./remediation-audit-data";
import type { ChainCheck } from "./remediation-evidence-data";

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

const ACTOR_ICON: Record<ActorKind, React.ReactNode> = {
  System: <Cpu size={11} />,
  Agent: <Bot size={11} />,
  Human: <User size={11} />,
};

/** Actor, with its kind carried by the mark rather than by tinting the name. */
function ActorCell({ data: d }: ICellRendererParams<AuditChange>) {
  if (!d) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "var(--cg-text-muted)", display: "inline-flex" }}>
        {ACTOR_ICON[d.actorType]}
      </span>
      {d.actor}
    </span>
  );
}

/** `field: from → to`, which is the whole content of a mutation row. */
function ChangeCell({ data: d }: ICellRendererParams<AuditChange>) {
  if (!d) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ ...mono, color: "var(--cg-text-muted)" }}>{d.field}</span>
      <span style={{ color: "var(--cg-text-muted)" }}>{d.from} →</span>
      <span>{d.to}</span>
    </span>
  );
}

/**
 * The policy that permitted the change, or the fact that none did.
 *
 * An empty cell reads as "not applicable". This is the opposite: it is the one
 * row on the page worth stopping at.
 */
function PolicyCell({ data: d }: ICellRendererParams<AuditChange>) {
  if (!d) return null;
  if (d.policed)
    return (
      <span style={{ ...mono, color: "var(--cg-text-muted)" }}>{d.policy}</span>
    );
  return <Pill color="var(--cgx-critical)">no policy</Pill>;
}

type Trail = "changes" | "access";

export function AuditPane({
  action,
  onOpenEntry,
}: {
  action: RemediationAction;
  onOpenEntry?: (entry: AuditChange) => void;
}) {
  const { theme } = useTheme();
  const changes = React.useMemo(() => buildAuditTrail(action), [action]);
  const access = React.useMemo(() => buildAccessTrail(action), [action]);

  const [trail, setTrail] = React.useState<Trail>("changes");
  const [check, setCheck] = React.useState<ChainCheck | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [actor, setActor] = React.useState("All");
  const [field, setField] = React.useState("All");
  const [policy, setPolicy] = React.useState("All");

  React.useEffect(() => {
    if (!msg) return undefined;
    const t = window.setTimeout(() => setMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [msg]);

  const rows = changes.filter(
    (c) =>
      (actor === "All" || c.actorType === actor) &&
      (field === "All" || c.field === field) &&
      (policy === "All" ||
        (policy === "Unpoliced" && !c.policed) ||
        (policy === "Policed" && c.policed)),
  );

  const uniq = (fn: (c: AuditChange) => string) => [
    ALL,
    ...[...new Set(changes.map(fn))]
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const unpoliced = changes.filter((c) => !c.policed).length;

  const gridTheme = eventsThemeFor(theme);
  const defaults: ColDef = {
    sortable: true,
    resizable: false,
    suppressMovable: true,
  };

  const changeCols = React.useMemo<ColDef<AuditChange>[]>(
    () => [
      { field: "index", headerName: "#", width: 52 },
      {
        field: "at",
        headerName: "When",
        width: 128,
        valueFormatter: (p) =>
          p.value instanceof Date
            ? p.value.toISOString().replace("T", " ").slice(0, 16)
            : "—",
      },
      {
        colId: "actor",
        headerName: "Actor",
        width: 156,
        valueGetter: (p) => p.data?.actor ?? "",
        cellRenderer: ActorCell,
      },
      { field: "actorType", headerName: "Kind", width: 86 },
      { field: "action", headerName: "Action", width: 122 },
      {
        colId: "change",
        headerName: "Change",
        flex: 1,
        minWidth: 220,
        valueGetter: (p) =>
          p.data ? `${p.data.field} ${p.data.from} ${p.data.to}` : "",
        cellRenderer: ChangeCell,
      },
      {
        colId: "policy",
        headerName: "Policy",
        width: 148,
        valueGetter: (p) => p.data?.policy ?? "",
        cellRenderer: PolicyCell,
      },
    ],
    [],
  );

  const accessCols = React.useMemo<ColDef[]>(
    () => [
      {
        field: "at",
        headerName: "When",
        width: 128,
        valueFormatter: (p) =>
          p.value instanceof Date
            ? p.value.toISOString().replace("T", " ").slice(0, 16)
            : "—",
      },
      { field: "actor", headerName: "Actor", width: 156 },
      { field: "role", headerName: "Role", width: 168 },
      { field: "scope", headerName: "Returned", width: 120 },
      { field: "purpose", headerName: "Purpose", flex: 1, minWidth: 150 },
      { field: "sourceIp", headerName: "Source", width: 118 },
      {
        field: "exported",
        headerName: "Exported",
        width: 96,
        valueFormatter: (p) => (p.value ? "yes" : "—"),
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
        {/* Two trails, one at a time — both at full height. */}
        <span
          role="tablist"
          aria-label="Audit trail"
          style={{ display: "inline-flex", gap: 4, marginRight: 4 }}
        >
          {(
            [
              ["changes", "Changes", changes.length],
              ["access", "Access", access.length],
            ] as const
          ).map(([id, label, n]) => {
            const on = trail === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTrail(id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 26,
                  padding: "0 10px",
                  borderRadius: 6,
                  border: "none",
                  background: on ? "var(--cg-tab-active-bg)" : "transparent",
                  color: on ? "var(--cg-text-primary)" : "var(--cg-text-nav)",
                  fontSize: 12.5,
                  fontWeight: on ? 600 : 400,
                  fontFamily: APP_FONT,
                  cursor: "pointer",
                }}
              >
                {label}
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--cg-text-muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </span>

        {trail === "changes" && (
          <>
            <FilterSelect
              variant="tab"
              label="Actor"
              value={actor}
              onChange={setActor}
              options={uniq((c) => c.actorType)}
            />
            <FilterSelect
              variant="tab"
              label="Field"
              value={field}
              onChange={setField}
              options={uniq((c) => c.field)}
            />
            <FilterSelect
              variant="tab"
              label="Policy"
              value={policy}
              onChange={setPolicy}
              options={[
                ALL,
                { value: "Policed", label: "Policed" },
                { value: "Unpoliced", label: "Unpoliced" },
              ]}
            />
          </>
        )}

        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {unpoliced > 0 && (
            <Pill color="var(--cgx-critical)">
              {unpoliced} unpoliced change{unpoliced === 1 ? "" : "s"}
            </Pill>
          )}
          {check && (
            <span
              style={{
                fontSize: 11.5,
                color: check.ok ? "var(--cgx-low)" : "var(--cgx-critical)",
              }}
            >
              {check.ok
                ? `Chain intact · ${check.checked} links`
                : `Chain BROKEN at ${check.broken.join(", ")}`}
            </span>
          )}
          <button
            type="button"
            className="cg-report-action"
            onClick={() => setCheck(verifyAuditChain(changes))}
            style={btn}
          >
            <ShieldCheck size={12} /> Verify chain
          </button>
          <button
            type="button"
            className="cg-report-action cg-report-action-primary"
            onClick={() => {
              const r = exportAuditTrail(action, changes, access);
              setMsg(
                r.ok
                  ? `Exported to ${r.filename}`
                  : `Export failed — ${r.error}`,
              );
            }}
            style={btn}
          >
            <Download size={12} /> Export trail
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
        {trail === "changes" ? (
          <AgGridReact<AuditChange>
            theme={gridTheme}
            headerHeight={24}
            rowHeight={28}
            defaultColDef={defaults}
            rowData={rows}
            columnDefs={changeCols}
            getRowId={(p) => String(p.data.index)}
            onRowClicked={(e) => e.data && onOpenEntry?.(e.data)}
          />
        ) : (
          <AgGridReact
            theme={gridTheme}
            headerHeight={24}
            rowHeight={28}
            defaultColDef={defaults}
            rowData={access}
            columnDefs={accessCols}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * One mutation
 * ------------------------------------------------------------------ */

/**
 * A single change, with the two things the table cannot show.
 *
 * The table answers *what* changed; this answers *on whose authority* and
 * *how do I know the row was not inserted later*. Both are sections rather
 * than columns because both are arguments a reviewer either accepts or
 * attacks, and neither fits in a cell.
 */
export function AuditEntryView({
  entry,
  onBack,
}: {
  entry: AuditChange;
  onBack: () => void;
}) {
  return (
    <div className="cg-nested" style={{ color: "var(--cg-text-primary)" }}>
      <NestedNav
        trail={[{ label: "Audit", onClick: onBack }]}
        current={`#${entry.index} · ${entry.field}`}
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
        <StepTag>{entry.action}</StepTag>
        <span style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>
          <span style={mono}>{entry.field}</span>
        </span>
        {!entry.policed && <Pill color="var(--cgx-critical)">no policy</Pill>}
      </div>

      <Section title="The change" open>
        <Row label="Field" value={<span style={mono}>{entry.field}</span>} />
        <Row label="From" value={entry.from} />
        <Row label="To" value={entry.to} />
        <Row
          label="At"
          value={entry.at.toISOString().replace("T", " ").slice(0, 16)}
        />
      </Section>

      <Section title="Authority" open>
        <Row label="Actor" value={entry.actor} />
        <Row label="Actor kind" value={entry.actorType} />
        <Row
          label="Permitted by"
          value={
            entry.policed ? (
              <span style={mono}>{entry.policy}</span>
            ) : (
              // Stated, not left blank: a mutation nothing authorised is the
              // finding, and a blank cell would read as "not applicable".
              <span style={{ color: "var(--cgx-critical)" }}>
                No policy recorded — this change was not gated
              </span>
            )
          }
        />
        <Row
          label="Session"
          value={<span style={mono}>{entry.session}</span>}
        />
        <Row label="Source" value={entry.sourceIp} />
      </Section>

      <Section title="Integrity" open>
        <Row label="Chain position" value={`#${entry.index}`} />
        <Row
          label="Previous link"
          value={
            <span style={{ ...mono, wordBreak: "break-all" }}>
              {entry.prevHash}
            </span>
          }
        />
        <Row
          label="This link"
          value={
            <span style={{ ...mono, wordBreak: "break-all" }}>
              {entry.hash}
            </span>
          }
        />
      </Section>
    </div>
  );
}

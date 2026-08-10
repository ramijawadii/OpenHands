/* eslint-disable i18next/no-literal-string -- rollback runbook */
/**
 * Rollback — the guarantee that a wrong action can be undone.
 *
 * ## Why HALT and REVERT are two controls, not one
 *
 * They differ in every dimension that matters. Halt stops future mutations in
 * under 30 seconds, carries near-zero risk, and any on-call engineer may pull
 * it unilaterally. Revert undoes mutations already made, takes minutes to
 * hours, and is itself a bulk change requiring two people or a customer
 * request. Putting them behind one button would make the free control feel as
 * consequential as the dangerous one — and the safety model is explicit that
 * halt should be pulled early and often, with no post-incident criticism for
 * an unnecessary one.
 *
 * ## Why the drift gate is prominent rather than a column
 *
 * The most damaging thing an automated rollback can do is silently discard the
 * fix an engineer applied thirty minutes ago while responding to the same
 * incident. An entry that fails the drift gate is not "skipped" quietly — it
 * is named, with the reason, before anyone presses anything.
 */
import React from "react";
import {
  AlertOctagon,
  Bot,
  Download,
  FileWarning,
  GitBranch,
  Lock,
  OctagonX,
  ShieldCheck,
  TriangleAlert,
  Undo2,
  User,
} from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useTheme } from "#/context/theme-context";
import {
  eventsThemeFor,
  APP_FONT,
} from "#/components/features/explore/cloudguard-grid/theme";
import { FilterSelect } from "#/components/features/explore/cloudguard-grid/FilterSelect";
import { Pill, StepTag } from "../RemediationPanes";
import type { RemediationAction } from "../remediation-data";
import {
  buildJournal,
  type DriftVerdict,
  type JournalState,
  type UndoEntry,
} from "./undo-journal";
import {
  assessReadiness,
  exportJournal,
  planRevert,
  SCOPE_MEANING,
  type DryRun,
  type RevertScope,
} from "./revert-gates";

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

const STATE_TONE: Record<JournalState, string> = {
  PENDING: "var(--cgx-high)",
  ACTIVE: "var(--cgx-low)",
  REVERTING: "var(--cg-accent)",
  REVERTED: "var(--cg-text-muted)",
  REVERT_FAILED: "var(--cgx-critical)",
  SUPERSEDED: "rgb(224, 154, 45)",
  EXPIRED: "var(--cg-text-muted)",
  ABANDONED: "var(--cg-text-muted)",
  MANUAL_INTERVENTION: "var(--cgx-critical)",
};

const DRIFT_TONE: Record<DriftVerdict, string> = {
  CLEAN: "var(--cg-text-muted)",
  ALREADY_REVERTED: "var(--cg-text-muted)",
  DRIFT_FOREIGN_FIELDS: "rgb(224, 154, 45)",
  DRIFT_SAME_FIELDS: "var(--cgx-critical)",
  INDETERMINATE: "var(--cgx-critical)",
};

function StateCell({ data: d }: ICellRendererParams<UndoEntry>) {
  if (!d) return null;
  return <span style={{ color: STATE_TONE[d.state] }}>{d.state}</span>;
}

/** Drift stays quiet when clean — only a failing gate earns attention. */
function DriftCell({ data: d }: ICellRendererParams<UndoEntry>) {
  if (!d) return null;
  if (d.drift === "CLEAN")
    return <span style={{ color: "var(--cg-text-muted)" }}>clean</span>;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        color: DRIFT_TONE[d.drift],
      }}
    >
      {d.drift.startsWith("DRIFT") && <TriangleAlert size={11} />}
      {d.drift.replace("DRIFT_", "").replace(/_/g, " ").toLowerCase()}
    </span>
  );
}

function TargetCell({ data: d }: ICellRendererParams<UndoEntry>) {
  if (!d) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={mono}>{d.resourceId}</span>
      {d.iacManaged && (
        <Pill color="rgb(224, 154, 45)" icon={<GitBranch size={9} />}>
          IaC
        </Pill>
      )}
      {d.legalHold && (
        <Pill color="var(--cgx-critical)" icon={<Lock size={9} />}>
          hold
        </Pill>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Dry run
 * ------------------------------------------------------------------ */

/**
 * What a revert would do, before it does it.
 *
 * Three things are non-negotiable in this panel and each corresponds to a step
 * operators skip: the skipped entries and *why*, the propagation wait before
 * recovery may be declared, and the rules that must be disabled — because a
 * reverted change with a live rule is re-applied by the next scan.
 */
function DryRunPanel({
  dry,
  halted,
  onClose,
}: {
  dry: DryRun;
  halted: boolean;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--cg-accent)",
        borderRadius: 6,
        padding: 10,
        marginBottom: 8,
        fontSize: 12,
        lineHeight: 1.7,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <StepTag>Dry run · {dry.scope}</StepTag>
        <span style={{ fontSize: 11.5, color: "var(--cg-text-muted)" }}>
          {SCOPE_MEANING[dry.scope]}
        </span>
        <button
          type="button"
          className="cg-report-action"
          onClick={onClose}
          style={{ ...btn, marginLeft: "auto" }}
        >
          Close
        </button>
      </div>

      {/* Reverting while the executor is still applying creates a fight. */}
      {!halted && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 8,
            padding: "7px 10px",
            border: "1px solid var(--cgx-critical)",
            borderRadius: 6,
            color: "var(--cgx-critical)",
            fontSize: 11.5,
          }}
        >
          <AlertOctagon size={13} style={{ flexShrink: 0, marginTop: 2 }} />
          Halt first. Reverting while the agent is still applying changes puts
          the two in a fight over the same resources.
        </div>
      )}

      <div>
        <strong>{dry.willRevert.length}</strong> entr
        {dry.willRevert.length === 1 ? "y" : "ies"} would be reverted, newest
        first, respecting dependency chains.
      </div>

      {dry.willSkip.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <strong>{dry.willSkip.length} skipped</strong> — named, not silent:
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {dry.willSkip.map((s) => (
              <li
                key={s.entry.entryId}
                style={{ color: "var(--cg-text-muted)" }}
              >
                <span style={mono}>{s.entry.resourceId}</span> — {s.because}
              </li>
            ))}
          </ul>
        </div>
      )}

      {dry.propagationSeconds > 0 && (
        <div style={{ marginTop: 6, color: "var(--cg-text-muted)" }}>
          Recovery cannot be declared for{" "}
          <strong>{dry.propagationSeconds}s</strong> after the last call returns
          — the API returning 200 is not the change taking effect.
        </div>
      )}

      {dry.rules.length > 0 && (
        <div
          style={{
            marginTop: 8,
            padding: "7px 10px",
            border: "1px solid rgb(224, 154, 45)",
            borderRadius: 6,
            color: "var(--cg-text-primary)",
            fontSize: 11.5,
          }}
        >
          <strong>Then disable these rules.</strong> A reverted change with a
          live rule is re-applied on the next scan cycle — this is the step that
          causes the second outage.
          <div style={{ ...mono, marginTop: 4, color: "var(--cg-text-muted)" }}>
            {dry.rules.join("  ·  ")}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button
          type="button"
          className="cg-report-action cg-report-action-danger"
          disabled={!halted || dry.willRevert.length === 0}
          style={btn}
        >
          <Undo2 size={12} /> Revert {dry.willRevert.length} — needs two people
        </button>
        <span
          style={{
            alignSelf: "center",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--cg-text-muted)",
          }}
        >
          <User size={11} />
          <Bot size={11} />
          Mass revert is itself a bulk change — two-person, or
          customer-requested
        </span>
      </div>
    </div>
  );
}

export function RollbackPane({
  action,
  onOpenEntry,
}: {
  action: RemediationAction;
  onOpenEntry?: (entry: UndoEntry) => void;
}) {
  const { theme } = useTheme();
  const entries = React.useMemo(() => buildJournal(action), [action]);
  const readiness = React.useMemo(
    () => assessReadiness(action, entries),
    [action, entries],
  );

  const [halted, setHalted] = React.useState(false);
  const [scope, setScope] = React.useState<RevertScope>("run");
  const [dry, setDry] = React.useState<DryRun | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [state, setState] = React.useState("All");
  const [drift, setDrift] = React.useState("All");
  const [env, setEnv] = React.useState("All");

  React.useEffect(() => {
    if (!msg) return undefined;
    const t = window.setTimeout(() => setMsg(null), 6000);
    return () => window.clearTimeout(t);
  }, [msg]);

  const rows = React.useMemo(
    () =>
      entries.filter(
        (e) =>
          (state === "All" || e.state === state) &&
          (drift === "All" ||
            (drift === "Failing gate"
              ? e.drift !== "CLEAN" && e.drift !== "ALREADY_REVERTED"
              : e.drift === drift)) &&
          (env === "All" || e.environmentTier === env),
      ),
    [entries, state, drift, env],
  );

  const uniq = (fn: (e: UndoEntry) => string) => [
    ALL,
    ...[...new Set(entries.map(fn))]
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];

  const gridTheme = eventsThemeFor(theme);
  const cols = React.useMemo<ColDef<UndoEntry>[]>(
    () => [
      { field: "entryId", headerName: "Entry", width: 152 },
      {
        colId: "target",
        headerName: "Resource",
        flex: 1,
        minWidth: 190,
        valueGetter: (p) => p.data?.resourceId ?? "",
        cellRenderer: TargetCell,
      },
      { field: "resourceType", headerName: "Type", width: 178 },
      { field: "tier", headerName: "Tier", width: 66 },
      {
        colId: "state",
        headerName: "State",
        width: 132,
        valueGetter: (p) => p.data?.state ?? "",
        cellRenderer: StateCell,
      },
      {
        colId: "drift",
        headerName: "Drift gate",
        width: 132,
        valueGetter: (p) => p.data?.drift ?? "",
        cellRenderer: DriftCell,
      },
      { field: "inverseApi", headerName: "Inverse", width: 210 },
      { field: "waveId", headerName: "Wave", width: 92 },
    ],
    [],
  );

  const anchor = rows[0] ?? null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* ── HALT — free, unilateral, always available ─────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          padding: "9px 11px",
          marginBottom: 10,
          border: `1px solid ${halted ? "var(--cgx-critical)" : "var(--cg-border-subtle)"}`,
          borderRadius: 6,
          flexShrink: 0,
        }}
      >
        <StepTag>{halted ? "Halted" : "Executing"}</StepTag>
        <span
          style={{
            fontSize: 11.5,
            color: "var(--cg-text-muted)",
            lineHeight: 1.6,
            maxWidth: "62ch",
          }}
        >
          {halted
            ? "No new mutations will start. In-flight single calls complete; nothing else begins."
            : "Halt stops every future mutation within 30 seconds. It is free, reversible and needs no second approver — pull it early."}
        </span>
        <button
          type="button"
          className={
            halted
              ? "cg-report-action"
              : "cg-report-action cg-report-action-danger"
          }
          onClick={() => {
            setHalted((v) => !v);
            setMsg(
              halted
                ? "Halt released — the executor may resume."
                : "HALTED. All pending mutations stopped for this action.",
            );
          }}
          style={{ ...btn, marginLeft: "auto" }}
        >
          {halted ? <ShieldCheck size={12} /> : <OctagonX size={12} />}
          {halted ? "Release halt" : "Halt now"}
        </button>
      </div>

      {/* ── Readiness — can we actually get the customer back? ────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <Pill
          color={
            readiness.covered === readiness.total
              ? "var(--cgx-low)"
              : "var(--cgx-critical)"
          }
        >
          {readiness.covered}/{readiness.total} with a validated inverse
        </Pill>
        <Pill
          color={
            readiness.drifted ? "rgb(224, 154, 45)" : "var(--cg-text-muted)"
          }
        >
          {readiness.drifted} failing the drift gate
        </Pill>
        <Pill
          color={
            readiness.storage.independentRead
              ? "var(--cgx-low)"
              : "var(--cgx-critical)"
          }
          icon={<ShieldCheck size={9} />}
        >
          journal{" "}
          {readiness.storage.independentRead
            ? "retrievable without the control plane"
            : "NOT independently retrievable"}
        </Pill>
        <Pill color="var(--cg-text-muted)">
          cross-account · WORM {readiness.storage.wormDays}d · replicated
        </Pill>
      </div>

      {readiness.blockers.map((b) => (
        <div
          key={b}
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 6,
            padding: "7px 10px",
            border: "1px solid var(--cgx-high)",
            borderRadius: 6,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: "var(--cg-text-primary)",
            flexShrink: 0,
          }}
        >
          <FileWarning
            size={13}
            style={{ flexShrink: 0, color: "var(--cgx-high)", marginTop: 2 }}
          />
          {b}
        </div>
      ))}

      {/* ── REVERT — scoped, dry-run first ───────────────────────── */}
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
        <StepTag>Undo journal</StepTag>
        <FilterSelect
          variant="tab"
          label="State"
          value={state}
          onChange={setState}
          options={uniq((e) => e.state)}
        />
        <FilterSelect
          variant="tab"
          label="Drift"
          value={drift}
          onChange={setDrift}
          options={[
            ALL,
            { value: "Failing gate", label: "Failing gate" },
            ...[...new Set(entries.map((e) => e.drift))]
              .sort()
              .map((v) => ({ value: v, label: v })),
          ]}
        />
        <FilterSelect
          variant="tab"
          label="Environment"
          value={env}
          onChange={setEnv}
          options={uniq((e) => e.environmentTier)}
        />
        <FilterSelect
          variant="tab"
          label="Scope"
          value={scope}
          onChange={(v) => {
            setScope(v as RevertScope);
            setDry(null);
          }}
          options={(["entry", "wave", "run", "window"] as RevertScope[]).map(
            (v) => ({ value: v, label: v }),
          )}
        />

        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              color: "var(--cg-text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {rows.length} of {entries.length}
          </span>
          <button
            type="button"
            className="cg-report-action"
            onClick={() => setDry(planRevert(entries, scope, anchor))}
            style={btn}
          >
            <Undo2 size={12} /> Dry run
          </button>
          <button
            type="button"
            className="cg-report-action"
            onClick={() => {
              const r = exportJournal(action, entries, readiness);
              setMsg(
                r.ok
                  ? `Exported to ${r.filename}`
                  : `Export failed — ${r.error}`,
              );
            }}
            style={btn}
          >
            <Download size={12} /> Export journal
          </button>
        </span>
      </div>

      {dry && (
        <DryRunPanel dry={dry} halted={halted} onClose={() => setDry(null)} />
      )}

      {msg && (
        <div
          role="status"
          style={{
            marginBottom: 8,
            flexShrink: 0,
            fontSize: 11.5,
            color: msg.startsWith("HALTED")
              ? "var(--cgx-critical)"
              : "var(--cg-text-muted)",
          }}
        >
          {msg}
        </div>
      )}

      <div className="cg-scroll" style={{ flex: 1, minHeight: 160 }}>
        <AgGridReact<UndoEntry>
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
          getRowId={(p) => p.data.entryId}
          onRowClicked={(e) => e.data && onOpenEntry?.(e.data)}
        />
      </div>
    </div>
  );
}

/* eslint-disable i18next/no-literal-string -- overview events table */
import React from "react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type CellContextMenuEvent,
  type CellKeyDownEvent,
  type ColDef,
  type FullWidthCellKeyDownEvent,
  type GridApi,
  type GridReadyEvent,
  type RowClickedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import {
  Download,
  GitBranch,
  Inbox,
  Layers,
  RotateCcw,
  Server,
  X,
} from "lucide-react";
import { useTheme } from "#/context/theme-context";
import { APP_FONT, eventsThemeFor } from "./theme";
import { FilterSelect, type FilterOption } from "./FilterSelect";
import { EventMenu, type EventTarget } from "./EventMenu";
import { exportEvents } from "./events-export";
import { openEventReport } from "./event-report";
import {
  ENVIRONMENTS,
  EVENT_TYPES,
  KINDS,
  SERVICE_OF,
  SEVERITY_OF,
  type EventRow,
} from "./event-data";
import { GridPalette } from "./palette";
import { ENV_COLOR, EnvBadge, ResourceIcon, ServiceTypeBadge } from "./icons";
import { SeverityGauge } from "./SeverityGauge";
import type { Density } from "./OverviewScope";

/**
 * Recent events — the Overview's only actionable region.
 *
 * Time, environment and account now come from the PAGE scope
 * (`OverviewScope`), not from here: this table used to own the date filter and
 * scope only itself, while the strip and the charts showed everything ever
 * recorded. What remains local are the filters that only narrow this list.
 *
 * Three things make it triage-ready rather than merely correct:
 *
 * **Severity leads the sort.** Rows arrive severity-descending, then most
 * recent first. An unsorted queue forces a full linear scan before
 * prioritisation can even begin; every mature console defaults to risk-first
 * for exactly this reason.
 *
 * **The row says WHICH resource.** The old `Resource` column showed the kind
 * ("Bucket"), not the identity. You cannot triage a finding without knowing
 * what it is on.
 *
 * **Filter state is visible.** Active filters render as removable chips with a
 * result count. Five silent filters is an empty-state trap: someone who left
 * `env=prod` set yesterday sees a short list today and concludes it was a
 * quiet night. That is the most common false-negative pattern in filtered ops
 * tables, and it is a correctness problem.
 *
 * Registration is repeated here because this table can render without the main
 * inventory grid ever mounting; `registerModules` is idempotent.
 */

ModuleRegistry.registerModules([AllCommunityModule]);

/** Sort rank — Incident first. AG Grid sorts the raw field otherwise. */
const TYPE_RANK: Record<string, number> = { Incident: 3, Alert: 2, Normal: 1 };

function TypeCell({ value }: { value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <SeverityGauge severity={SEVERITY_OF[value] ?? "Low"} size={16} />
      {value}
    </span>
  );
}

function KindCell({ value }: { value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <ResourceIcon kind={value} size={12} />
      {value}
    </span>
  );
}

/**
 * Identity plus finding in one column.
 *
 * Two lines rather than two columns: the resource name is only meaningful
 * beside what happened to it, and a narrow quadrant cannot spare the width for
 * both as separate sortable fields.
 */
function EventCell({ data }: { data?: EventRow }) {
  if (!data) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          color: "var(--cg-text-primary)",
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {data.resource}
      </span>
      <span
        style={{
          color: "var(--cg-text-muted)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {data.message}
      </span>
    </span>
  );
}

const timeFmt = (p: { value: unknown }) =>
  p.value instanceof Date
    ? p.value.toLocaleString([], {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const ALL: FilterOption = { value: "All", label: "All" };

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  height: 21,
  padding: "0 7px",
  fontSize: 10.5,
  fontFamily: APP_FONT,
  background: "var(--cg-accent-bg)",
  color: "var(--cg-text-primary)",
  border: "1px solid var(--cg-border-card)",
  borderRadius: 3,
  cursor: "pointer",
};

function EmptyState({
  filtered,
  scopeNarrowed,
  onClear,
  onResetScope,
}: {
  filtered: boolean;
  scopeNarrowed: boolean;
  onClear: () => void;
  onResetScope?: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: "28px 0 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        textAlign: "center",
        padding: 20,
        fontFamily: APP_FONT,
        color: "var(--cg-text-muted)",
      }}
    >
      <Inbox size={22} />
      <div style={{ fontSize: 12.5, color: "var(--cg-text-primary)" }}>
        {filtered
          ? "No events match these filters"
          : "No events in the selected window"}
      </div>
      <div style={{ fontSize: 11, maxWidth: 320 }}>
        {filtered
          ? "The window has events — the filters above are hiding them."
          : "Nothing was recorded here. Widen the range to look further back."}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
        {filtered && (
          <button type="button" onClick={onClear} style={chipStyle}>
            <RotateCcw size={10} /> Clear filters
          </button>
        )}
        {!filtered && scopeNarrowed && onResetScope && (
          <button type="button" onClick={onResetScope} style={chipStyle}>
            <RotateCcw size={10} /> Reset scope
          </button>
        )}
      </div>
    </div>
  );
}

export interface EventsFilter {
  type: string;
  kind: string;
  service: string;
}

const EMPTY_FILTER: EventsFilter = {
  type: "All",
  kind: "All",
  service: "All",
};

export function RecentEvents({
  rows,
  density = "comfortable",
  filter,
  onFilter,
  scopeNarrowed = false,
  onResetScope,
}: {
  /** Already scoped by the page — this component does not re-apply the window. */
  rows: EventRow[];
  density?: Density;
  /** Controlled so a chart click can set it (cross-filtering). */
  filter?: EventsFilter;
  onFilter?: (f: EventsFilter) => void;
  scopeNarrowed?: boolean;
  onResetScope?: () => void;
}) {
  const { theme } = useTheme();
  const [local, setLocal] = React.useState<EventsFilter>(EMPTY_FILTER);
  const active = filter ?? local;
  const setActive = React.useCallback(
    (f: EventsFilter) => (onFilter ? onFilter(f) : setLocal(f)),
    [onFilter],
  );

  const [env, setEnv] = React.useState("All");
  const [api, setApi] = React.useState<GridApi<EventRow> | null>(null);
  const [menu, setMenu] = React.useState<EventTarget | null>(null);

  /**
   * Export outcome, shown inline rather than thrown away.
   *
   * A download that silently does nothing is the worst failure mode for this
   * control — the operator believes they have the file. Success is also
   * reported, because a browser that saves without prompting gives no other
   * confirmation that anything happened.
   */
  const [exportMsg, setExportMsg] = React.useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  React.useEffect(() => {
    if (!exportMsg) return undefined;
    const t = window.setTimeout(() => setExportMsg(null), 6000);
    return () => window.clearTimeout(t);
  }, [exportMsg]);

  const filtered = React.useMemo(
    () =>
      rows.filter(
        (r) =>
          (active.type === "All" || r.type === active.type) &&
          (active.kind === "All" || r.kind === active.kind) &&
          (active.service === "All" || r.serviceType === active.service) &&
          (env === "All" || r.env === env),
      ),
    [rows, active, env],
  );

  const columnDefs = React.useMemo<ColDef<EventRow>[]>(
    () => [
      {
        field: "at",
        headerName: "When",
        width: 104,
        valueFormatter: timeFmt,
        sort: "desc",
        // Second key: within a severity band, newest first.
        sortIndex: 1,
      },
      {
        field: "type",
        headerName: "Severity",
        width: 100,
        cellRenderer: TypeCell,
        // Primary key, descending — Incident before Alert before Normal.
        sort: "desc",
        sortIndex: 0,
        comparator: (a: string, b: string) =>
          (TYPE_RANK[a] ?? 0) - (TYPE_RANK[b] ?? 0),
      },
      {
        field: "kind",
        headerName: "Type",
        width: 112,
        cellRenderer: KindCell,
      },
      { field: "env", headerName: "Env", width: 78, cellRenderer: EnvBadge },
      {
        field: "resource",
        headerName: "Resource / finding",
        flex: 1,
        minWidth: 220,
        cellRenderer: EventCell,
      },
    ],
    [],
  );

  const onGridReady = React.useCallback((e: GridReadyEvent<EventRow>) => {
    setApi(e.api);
  }, []);

  // A narrowed list can otherwise leave you scrolled into empty space.
  React.useEffect(() => {
    api?.ensureIndexVisible(0, "top");
  }, [api, filtered]);

  /*
   * AG Grid Community has no context-menu module, so the browser menu is
   * suppressed and ours is positioned at the pointer.
   */
  const onCellContextMenu = React.useCallback(
    (e: CellContextMenuEvent<EventRow>) => {
      const src = e.event as MouseEvent | null;
      if (!src || !e.data) return;
      src.preventDefault();
      setMenu({ row: e.data, x: src.clientX, y: src.clientY });
    },
    [],
  );

  const onRowClicked = React.useCallback((e: RowClickedEvent<EventRow>) => {
    if (e.data) openEventReport(e.data);
  }, []);

  /**
   * Keyboard activation.
   *
   * The report drawer was mouse-only: rows opened on click with no key path,
   * so the primary workflow was unreachable without a pointer. Enter/Space on
   * the focused row opens the same report.
   */
  const onCellKeyDown = React.useCallback(
    (e: CellKeyDownEvent<EventRow> | FullWidthCellKeyDownEvent<EventRow>) => {
      // AG Grid types this as the DOM `Event`; only keyboard events reach here.
      const src = e.event as KeyboardEvent | null;
      if ((src?.key === "Enter" || src?.key === " ") && e.data) {
        src.preventDefault();
        openEventReport(e.data);
      }
    },
    [],
  );

  const typeOptions: FilterOption[] = [
    ALL,
    ...EVENT_TYPES.map((t) => ({
      value: t,
      label: t,
      icon: <SeverityGauge severity={SEVERITY_OF[t]} size={14} />,
    })),
  ];

  const kindOptions: FilterOption[] = [
    ALL,
    ...KINDS.map((k) => ({
      value: k,
      label: k,
      icon: <ResourceIcon kind={k} size={12} />,
    })),
  ];

  const serviceOptions: FilterOption[] = [
    ALL,
    ...[...new Set(Object.values(SERVICE_OF))].map((sv) => ({
      value: sv,
      label: sv,
      icon: <ServiceTypeBadge service={sv} iconOnly />,
    })),
  ];

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (active.type !== "All")
    chips.push({
      key: "type",
      label: `Severity: ${active.type}`,
      clear: () => setActive({ ...active, type: "All" }),
    });
  if (active.kind !== "All")
    chips.push({
      key: "kind",
      label: `Type: ${active.kind}`,
      clear: () => setActive({ ...active, kind: "All" }),
    });
  if (active.service !== "All")
    chips.push({
      key: "service",
      label: `Service: ${active.service}`,
      clear: () => setActive({ ...active, service: "All" }),
    });
  if (env !== "All")
    chips.push({
      key: "env",
      label: `Env: ${env}`,
      clear: () => setEnv("All"),
    });

  const rowHeight = density === "compact" ? 22 : 28;

  return (
    <div
      className="cg-events"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Without this the kit's icons resolve to currentColor, not their tint. */}
      <GridPalette />
      <style>{`
        .cg-events *::-webkit-scrollbar { width: 8px; height: 8px; }
        .cg-events *::-webkit-scrollbar-track { background: transparent; }
        .cg-events *::-webkit-scrollbar-thumb {
          background: var(--cgx-scroll-thumb);
          border-radius: 5px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .cg-events *::-webkit-scrollbar-thumb:hover {
          background: var(--cgx-scroll-thumb-hover);
          background-clip: content-box;
        }
        .cg-events *::-webkit-scrollbar-corner { background: transparent; }
        .cg-events * {
          scrollbar-width: thin;
          scrollbar-color: var(--cgx-scroll-thumb) transparent;
        }

        /* Rows are openable, so they must look it. */
        .cg-events .ag-row { cursor: pointer; }

        /* Filter pills match the drawer tab strip — see OverviewScope. */
        .cg-events .cg-scope-tab { transition: background-color .12s, color .12s; }
        .cg-events .cg-scope-tab:hover {
          background: var(--cg-bg-hover);
          color: var(--cg-text-primary);
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 4,
          marginBottom: 5,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            marginRight: "auto",
            display: "inline-flex",
            alignItems: "baseline",
            gap: 7,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: APP_FONT,
            color: "var(--cg-text-primary)",
          }}
        >
          Recent events
          {/*
           * The count appears only when a filter is narrowing the list — an
           * always-on "160 of 160" is noise, but a silent "24" when 160 exist
           * is a misread waiting to happen.
           */}
          {filtered.length !== rows.length && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                color: "var(--cg-text-muted)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {filtered.length.toLocaleString()} of{" "}
              {rows.length.toLocaleString()}
            </span>
          )}
        </span>

        <FilterSelect
          variant="tab"
          label="Severity"
          icon={<SeverityGauge severity="Low" size={14} />}
          value={active.type}
          onChange={(v) => setActive({ ...active, type: v })}
          options={typeOptions}
        />
        <FilterSelect
          variant="tab"
          label="Type"
          icon={<Server size={12} color="var(--cgx-compute)" />}
          value={active.kind}
          onChange={(v) => setActive({ ...active, kind: v })}
          options={kindOptions}
        />
        <FilterSelect
          variant="tab"
          label="Service"
          icon={<Layers size={12} color="var(--cgx-network)" />}
          value={active.service}
          onChange={(v) => setActive({ ...active, service: v })}
          options={serviceOptions}
        />
        <FilterSelect
          variant="tab"
          label="Env"
          icon={<GitBranch size={12} color="var(--cgx-neutral)" />}
          value={env}
          onChange={setEnv}
          options={[
            ALL,
            ...ENVIRONMENTS.map((e) => ({
              value: e,
              label: e,
              icon: <GitBranch size={12} color={ENV_COLOR[e]} />,
            })),
          ]}
        />

        {/*
         * Export sits at the END of the filter row because it acts on exactly
         * what that row produced — the verb belongs beside the controls that
         * decided its subject. The count is in the label so the operator
         * confirms the size of what they are about to take BEFORE the file is
         * written, rather than discovering it in their downloads folder.
         */}
        <button
          type="button"
          className="cg-report-action"
          disabled={filtered.length === 0}
          title={
            filtered.length === 0
              ? "No events match the current filters"
              : `Export ${filtered.length} event${filtered.length === 1 ? "" : "s"} as JSON`
          }
          onClick={() => {
            const result = exportEvents(rows, filtered, {
              severity: active.type,
              type: active.kind,
              service: active.service,
              environment: env,
            });
            setExportMsg(
              result.ok
                ? {
                    ok: true,
                    text: `Exported ${result.count} to ${result.filename}`,
                  }
                : { ok: false, text: `Export failed — ${result.error}` },
            );
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 28,
            padding: "0 10px",
            marginLeft: 4,
            fontSize: 12.5,
            lineHeight: 1,
            fontFamily: APP_FONT,
            // No `color` — `.cg-report-action` owns it, and an inline value
            // would win and break the shared hover treatment.
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Download size={12} />
          Export
          <span
            style={{
              fontVariantNumeric: "tabular-nums",
              color: "var(--cg-text-muted)",
            }}
          >
            {filtered.length.toLocaleString()}
          </span>
        </button>
      </div>

      {exportMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: 6,
            padding: "4px 8px",
            borderRadius: 3,
            fontSize: 11,
            fontFamily: APP_FONT,
            border: `1px solid ${exportMsg.ok ? "var(--cg-border)" : "var(--cg-danger-border)"}`,
            color: exportMsg.ok ? "var(--cg-text-muted)" : "var(--cg-danger)",
            flexShrink: 0,
          }}
        >
          {exportMsg.text}
        </div>
      )}

      {/* Applied-filter chips — each individually removable. */}
      {chips.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            marginBottom: 6,
            flexShrink: 0,
          }}
        >
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              style={chipStyle}
              aria-label={`Remove filter ${c.label}`}
            >
              {c.label}
              <X size={10} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setActive(EMPTY_FILTER);
              setEnv("All");
            }}
            style={{ ...chipStyle, borderStyle: "dashed" }}
          >
            <RotateCcw size={10} /> Clear all
          </button>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <AgGridReact<EventRow>
          theme={eventsThemeFor(theme)}
          rowData={filtered}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          onGridReady={onGridReady}
          onCellContextMenu={onCellContextMenu}
          onRowClicked={onRowClicked}
          onCellKeyDown={onCellKeyDown}
          preventDefaultOnContextMenu
          headerHeight={24}
          rowHeight={rowHeight}
          suppressHorizontalScroll
          defaultColDef={{
            sortable: true,
            resizable: false,
            suppressMovable: true,
          }}
        />

        {/*
         * Empty state. "No events" and "your filters hid them" demand opposite
         * responses, so they are never rendered as the same blank table.
         */}
        {filtered.length === 0 && (
          <EmptyState
            filtered={chips.length > 0}
            scopeNarrowed={scopeNarrowed}
            onClear={() => {
              setActive(EMPTY_FILTER);
              setEnv("All");
            }}
            onResetScope={onResetScope}
          />
        )}
      </div>

      <EventMenu
        target={menu}
        onOpen={openEventReport}
        onClose={() => setMenu(null)}
      />
    </div>
  );
}

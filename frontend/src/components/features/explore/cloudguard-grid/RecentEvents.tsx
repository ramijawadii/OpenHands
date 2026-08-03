/* eslint-disable i18next/no-literal-string -- overview events table */
import React from "react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type CellContextMenuEvent,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
  type RowClickedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { CalendarDays, GitBranch, Layers, Server } from "lucide-react";
import { useTheme } from "#/context/theme-context";
import { APP_FONT, eventsThemeFor } from "./theme";
import { FilterSelect, type FilterOption } from "./FilterSelect";
import { EventMenu, type EventTarget } from "./EventMenu";
import { openEventReport } from "./event-report";
import {
  ENVIRONMENTS,
  EVENT_TYPES,
  KINDS,
  SERVICE_OF,
  SEVERITY_OF,
  buildEvents,
  type EventRow,
} from "./event-data";
import { GridPalette } from "./palette";
import { ENV_COLOR, EnvBadge, ResourceIcon, ServiceTypeBadge } from "./icons";
import { SeverityGauge } from "./SeverityGauge";

/**
 * Recent events — a compact AG Grid sized to the Overview's empty quadrant.
 *
 * Filters are custom dropdowns rather than native `<select>`s: a browser
 * select renders its own option list and cannot show an icon per option, so
 * matching the inventory's iconography requires owning the popup. See
 * `FilterSelect`.
 *
 * Event type reuses the inventory's **severity gauge** — Normal / Alert /
 * Incident map onto Low / Medium / Critical — so a severity reads identically
 * on both surfaces instead of inventing a second visual language.
 *
 * Registration is repeated here because this table can render without the main
 * inventory grid ever mounting; `registerModules` is idempotent.
 */

ModuleRegistry.registerModules([AllCommunityModule]);

const DATE_RANGES: { value: string; label: string; hours: number }[] = [
  { value: "All", label: "Any time", hours: Number.POSITIVE_INFINITY },
  { value: "1h", label: "Last hour", hours: 1 },
  { value: "24h", label: "Last 24 h", hours: 24 },
  { value: "7d", label: "Last 7 days", hours: 24 * 7 },
  { value: "30d", label: "Last 30 days", hours: 24 * 30 },
];

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

export function RecentEvents() {
  const { theme } = useTheme();
  const [range, setRange] = React.useState("All");
  const [type, setType] = React.useState("All");
  const [kind, setKind] = React.useState("All");
  const [service, setService] = React.useState("All");
  const [env, setEnv] = React.useState("All");
  const [api, setApi] = React.useState<GridApi<EventRow> | null>(null);
  const [menu, setMenu] = React.useState<EventTarget | null>(null);
  const rows = React.useMemo(() => buildEvents(160), []);

  const filtered = React.useMemo(() => {
    const hours =
      DATE_RANGES.find((d) => d.value === range)?.hours ??
      Number.POSITIVE_INFINITY;
    const cutoff = Date.now() - hours * 3600000;
    return rows.filter(
      (r) =>
        r.at.getTime() >= cutoff &&
        (type === "All" || r.type === type) &&
        (kind === "All" || r.kind === kind) &&
        (service === "All" || r.serviceType === service) &&
        (env === "All" || r.env === env),
    );
  }, [rows, range, type, kind, service, env]);

  const columnDefs = React.useMemo<ColDef<EventRow>[]>(
    () => [
      { field: "at", headerName: "When", width: 104, valueFormatter: timeFmt },
      { field: "type", headerName: "Type", width: 92, cellRenderer: TypeCell },
      {
        field: "kind",
        headerName: "Resource",
        width: 114,
        cellRenderer: KindCell,
      },
      { field: "env", headerName: "Env", width: 80, cellRenderer: EnvBadge },
      { field: "message", headerName: "Event", flex: 1, minWidth: 150 },
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
   * suppressed and ours is positioned at the pointer. Coordinates are viewport
   * ones (`clientX/Y`) to match the menu's `position: fixed`.
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

  // Clicking the open row again collapses it — the same affordance as a
  // disclosure control, without spending a column on a chevron.
  const onRowClicked = React.useCallback((e: RowClickedEvent<EventRow>) => {
    if (e.data) openEventReport(e.data);
  }, []);

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
        /* Firefox has no ::-webkit pseudo-elements. */
        .cg-events * {
          scrollbar-width: thin;
          scrollbar-color: var(--cgx-scroll-thumb) transparent;
        }

        /*
         * Every layer here is transparent so the table sits on the chart
         * canvas — which leaves header labels competing with whatever scrolls
         * or paints behind them. A translucent veil plus a blur separates the
         * header without going back to an opaque bar and losing the effect.
         * z-index keeps it painting above the body in every stacking order.
         */
        /* Rows are openable, so they must look it. */
        .cg-events .ag-row { cursor: pointer; }

      `}</style>

      {/*
       * Title and filters share one row — the filters sit right, against the
       * table's right edge, so the eye lands on the title first and the
       * controls read as chrome rather than as content.
       */}
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
            fontSize: 12,
            fontWeight: 700,
            fontFamily: APP_FONT,
            color: "var(--cg-text-primary)",
          }}
        >
          Recent events
        </span>

        {/* Date first — the range decides what every other filter is filtering. */}
        <FilterSelect
          label="Date"
          icon={<CalendarDays size={12} color="var(--cgx-account)" />}
          value={range}
          onChange={setRange}
          options={DATE_RANGES.map((d) => ({
            value: d.value,
            label: d.label,
            icon: <CalendarDays size={12} color="var(--cgx-account)" />,
          }))}
        />
        <FilterSelect
          label="Type"
          icon={<SeverityGauge severity="Low" size={14} />}
          value={type}
          onChange={setType}
          options={typeOptions}
        />
        <FilterSelect
          label="Resource"
          icon={<Server size={12} color="var(--cgx-compute)" />}
          value={kind}
          onChange={setKind}
          options={kindOptions}
        />
        <FilterSelect
          label="Service"
          icon={<Layers size={12} color="var(--cgx-network)" />}
          value={service}
          onChange={setService}
          options={serviceOptions}
        />
        <FilterSelect
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
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <AgGridReact<EventRow>
          theme={eventsThemeFor(theme)}
          rowData={filtered}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          onGridReady={onGridReady}
          onCellContextMenu={onCellContextMenu}
          onRowClicked={onRowClicked}
          preventDefaultOnContextMenu
          headerHeight={24}
          rowHeight={24}
          // The quadrant is too narrow to spare a row of chrome, and the last
          // column flexes — there is nothing to scroll to horizontally.
          suppressHorizontalScroll
          suppressCellFocus
          defaultColDef={{
            sortable: true,
            resizable: false,
            suppressMovable: true,
          }}
        />
      </div>

      <EventMenu
        target={menu}
        onOpen={openEventReport}
        onClose={() => setMenu(null)}
      />
    </div>
  );
}

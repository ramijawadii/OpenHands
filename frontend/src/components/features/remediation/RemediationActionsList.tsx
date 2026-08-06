/* eslint-disable i18next/no-literal-string -- remediation list */
import React from "react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import {
  Bookmark,
  Bot,
  Clock,
  PlayCircle,
  Search,
  ShieldCheck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useTheme } from "#/context/theme-context";
import {
  APP_FONT,
  eventsThemeFor,
} from "#/components/features/explore/cloudguard-grid/theme";
import { FilterSelect } from "#/components/features/explore/cloudguard-grid/FilterSelect";
import { GridPalette } from "#/components/features/explore/cloudguard-grid/palette";
import { SeverityGauge } from "#/components/features/explore/cloudguard-grid/SeverityGauge";
import { LIFECYCLE_STAGES } from "./remediation-structure";
import { type RemediationAction } from "./remediation-data";

/**
 * Remediation Actions — the list half of the workflow.
 *
 * Carries the five capabilities the structure names: Search, Filters, Saved
 * Views, Bulk Actions and the Action Table. It is built on the same AG Grid
 * Community setup and the same `FilterSelect` the events table uses, so the two
 * lists behave identically — selection, sorting and filter chrome included.
 */

ModuleRegistry.registerModules([AllCommunityModule]);

const ALL = { value: "All", label: "All" };

/** Matches the generator's fixed epoch, so ageing is stable across reloads. */
const NOW = Date.UTC(2026, 7, 6, 9, 0, 0);

/** Saved views are named filter presets — the list's own shortcuts. */
const SAVED_VIEWS: {
  id: string;
  label: string;
  apply: (a: RemediationAction) => boolean;
}[] = [
  /*
   * Ordered so the DEFAULT is a work queue, not a data dump (plan §2). An
   * operator opening the tab cold should see what needs them, not 48 rows to
   * filter down by hand.
   */
  {
    id: "awaiting",
    label: "Awaiting my decision",
    apply: (a) => a.status === "Pending approval",
  },
  { id: "all", label: "All actions", apply: () => true },
  {
    id: "failed",
    label: "Failed & rolled back",
    apply: (a) => a.status === "Failed" || a.status === "Rolled back",
  },
  {
    id: "critical-open",
    label: "Critical, still open",
    apply: (a) => a.severity === "Critical" && a.status !== "Closed",
  },
  { id: "auto", label: "Auto-remediated", apply: (a) => a.auto },
];

const STATUS_TINT: Record<string, string> = {
  Closed: "var(--cgx-low)",
  Failed: "var(--cgx-critical)",
  "Rolled back": "var(--cgx-critical)",
  Executing: "var(--cg-accent)",
  Validating: "var(--cg-accent)",
};

function StatusCell({ value }: { value: string }) {
  return (
    <span style={{ color: STATUS_TINT[value] ?? "var(--cg-text-primary)" }}>
      {value}
    </span>
  );
}

function SeverityCell({ value }: { value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <SeverityGauge
        severity={value as "Critical" | "High" | "Medium" | "Low"}
        size={14}
      />
      {value}
    </span>
  );
}

/** `3 / 10 · Investigation` — position in the lifecycle, not a bare number. */
function StageCell({ value }: { value: number }) {
  const stage = LIFECYCLE_STAGES[value - 1];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "var(--cg-text-muted)" }}>{value}/10</span>
      {stage?.label.replace(/^\d+\.\s*/, "")}
    </span>
  );
}

const ORIGIN_ICON: Record<string, React.ReactNode> = {
  Agent: <Bot size={11} />,
  Human: <User size={11} />,
  Policy: <ShieldCheck size={11} />,
  Schedule: <Clock size={11} />,
};

/**
 * Origin, because an agent proposal is read differently from a human request.
 * Icon plus word — the icon alone would need a legend.
 */
function OriginCell({ value }: { value: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color:
          value === "Agent" ? "var(--cg-accent)" : "var(--cg-text-primary)",
      }}
    >
      {ORIGIN_ICON[value]}
      {value}
    </span>
  );
}

/** Ageing badge. A wait that is days long must not look like one that is hours. */
function BlockedCell({ value }: { value?: Date }) {
  if (!value) return <span style={{ color: "var(--cg-text-muted)" }}>—</span>;
  const days = Math.max(0, Math.round((NOW - value.getTime()) / 86400000));
  const bad = days >= 7;
  return (
    <span
      style={{
        color: bad ? "var(--cgx-critical)" : "var(--cg-text-primary)",
        fontWeight: bad ? 600 : 400,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {days}d
    </span>
  );
}

/** Overdue in critical tone — the reason the column exists. */
function SlaCell({ value }: { value?: Date }) {
  if (!value) return <span style={{ color: "var(--cg-text-muted)" }}>—</span>;
  const days = Math.round((value.getTime() - NOW) / 86400000);
  const overdue = days < 0;
  return (
    <span
      style={{
        color: overdue ? "var(--cgx-critical)" : "var(--cg-text-primary)",
        fontWeight: overdue ? 600 : 400,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {overdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
    </span>
  );
}

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

export function RemediationActionsList({
  actions,
  onOpen,
}: {
  actions: RemediationAction[];
  onOpen: (a: RemediationAction) => void;
}) {
  const { theme } = useTheme();
  const [api, setApi] = React.useState<GridApi<RemediationAction> | null>(null);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("All");
  const [severity, setSeverity] = React.useState("All");
  const [team, setTeam] = React.useState("All");
  const [savedView, setSavedView] = React.useState("awaiting");
  const [selected, setSelected] = React.useState(0);

  const preset = SAVED_VIEWS.find((v) => v.id === savedView) ?? SAVED_VIEWS[0];

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return actions.filter(
      (a) =>
        preset.apply(a) &&
        (status === "All" || a.status === status) &&
        (severity === "All" || a.severity === severity) &&
        (team === "All" || a.team === team) &&
        (!q ||
          a.id.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.resource.toLowerCase().includes(q) ||
          a.owner.toLowerCase().includes(q)),
    );
  }, [actions, preset, status, severity, team, query]);

  const columnDefs = React.useMemo<ColDef<RemediationAction>[]>(
    () => [
      { field: "id", headerName: "Action", width: 118 },
      { field: "title", headerName: "Remediation", flex: 1, minWidth: 220 },
      {
        field: "severity",
        headerName: "Severity",
        width: 118,
        cellRenderer: SeverityCell,
      },
      {
        field: "status",
        headerName: "Status",
        width: 148,
        cellRenderer: StatusCell,
      },
      {
        field: "stage",
        headerName: "Lifecycle",
        width: 190,
        cellRenderer: StageCell,
      },
      {
        field: "origin",
        headerName: "Origin",
        width: 112,
        cellRenderer: OriginCell,
      },
      { field: "resource", headerName: "Resource", width: 140 },
      { field: "team", headerName: "Team", width: 116 },
      { field: "owner", headerName: "Owner", width: 116 },
      { field: "approvals", headerName: "Approvals", width: 110 },
      {
        field: "blockedSince",
        headerName: "Blocked",
        width: 118,
        cellRenderer: BlockedCell,
        // Breach-first: the point of the column is that long waits surface
        // themselves. Ascending on the date puts the oldest block on top.
        sort: "asc",
        sortIndex: 0,
      },
      {
        field: "dueAt",
        headerName: "SLA",
        width: 132,
        cellRenderer: SlaCell,
      },
    ],
    [],
  );

  const uniq = (fn: (a: RemediationAction) => string) => [
    ALL,
    ...[...new Set(actions.map(fn))].sort().map((v) => ({
      value: v,
      label: v,
    })),
  ];

  /** Bulk actions operate on the grid's selection, never on the filtered set. */
  const bulk = (verb: string) => {
    const picked = api?.getSelectedRows() ?? [];
    if (picked.length === 0) return;
    // eslint-disable-next-line no-alert
    window.alert(
      `${verb} ${picked.length} action(s):\n${picked
        .slice(0, 8)
        .map((a) => a.id)
        .join(", ")}${picked.length > 8 ? "…" : ""}`,
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        fontFamily: APP_FONT,
        padding: "10px 12px 12px",
        boxSizing: "border-box",
      }}
    >
      <GridPalette />

      {/* Search · Saved Views · Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 28,
            padding: "0 8px",
            minWidth: 210,
            background: "var(--cg-input-bg)",
            border: "1px solid var(--cg-input-border)",
            borderRadius: 6,
          }}
        >
          <Search size={12} style={{ color: "var(--cg-text-muted)" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions, resources, owners…"
            aria-label="Search remediation actions"
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 12.5,
              fontFamily: APP_FONT,
              color: "var(--cg-text-primary)",
            }}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--cg-text-muted)",
                display: "inline-flex",
              }}
            >
              <X size={12} />
            </button>
          )}
        </span>

        <FilterSelect
          variant="tab"
          label="Saved view"
          icon={<Bookmark size={12} />}
          value={savedView}
          onChange={setSavedView}
          options={SAVED_VIEWS.map((v) => ({ value: v.id, label: v.label }))}
        />
        <FilterSelect
          variant="tab"
          label="Status"
          value={status}
          onChange={setStatus}
          options={uniq((a) => a.status)}
        />
        <FilterSelect
          variant="tab"
          label="Severity"
          value={severity}
          onChange={setSeverity}
          options={uniq((a) => a.severity)}
        />
        <FilterSelect
          variant="tab"
          label="Team"
          value={team}
          onChange={setTeam}
          options={uniq((a) => a.team)}
        />

        <span
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {/* Bulk actions stay visible but disabled with nothing selected, so
              the capability is discoverable before it is usable. */}
          <span
            style={{
              fontSize: 11.5,
              color: "var(--cg-text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {selected > 0
              ? `${selected} selected`
              : `${rows.length} of ${actions.length}`}
          </span>
          <button
            type="button"
            className="cg-report-action"
            style={btn}
            disabled={selected === 0}
            onClick={() => bulk("Approve")}
          >
            <PlayCircle size={12} /> Approve
          </button>
          <button
            type="button"
            className="cg-report-action"
            style={btn}
            disabled={selected === 0}
            onClick={() => bulk("Cancel")}
          >
            <XCircle size={12} /> Cancel
          </button>
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <AgGridReact<RemediationAction>
          theme={eventsThemeFor(theme)}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          onGridReady={(e: GridReadyEvent<RemediationAction>) => setApi(e.api)}
          onSelectionChanged={(e) =>
            setSelected(e.api.getSelectedRows().length)
          }
          onRowClicked={(e) => {
            // The checkbox column is a selection affordance, not a link —
            // opening the record from it would fight bulk selection.
            const t = e.event?.target as HTMLElement | null;
            if (t?.closest(".ag-selection-checkbox")) return;
            if (e.data) onOpen(e.data);
          }}
          /*
           * Identical to the events table: 24px header, 28px comfortable rows,
           * no resize or reorder. Two tables on the same surface that differ in
           * row rhythm read as two different products, and this one is the more
           * frequently visited of the pair.
           */
          headerHeight={24}
          rowHeight={28}
          defaultColDef={{
            sortable: true,
            resizable: false,
            suppressMovable: true,
          }}
          rowSelection={{ mode: "multiRow" }}
          selectionColumnDef={{
            pinned: "left",
            lockPosition: "left",
            width: 34,
            maxWidth: 34,
            resizable: false,
            suppressMovable: true,
          }}
          pagination
          paginationPageSize={25}
          paginationPageSizeSelector={[25, 50, 100]}
          enableCellTextSelection
        />
      </div>
    </div>
  );
}

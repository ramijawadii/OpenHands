/* eslint-disable i18next/no-literal-string, no-nested-ternary, @typescript-eslint/no-use-before-define, react/no-unstable-nested-components -- CloudGuard Discovery UI kit */
import React from "react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type ICellRendererParams,
  type ValueGetterParams,
  type RowClickedEvent,
  type GridApi,
  type GridReadyEvent,
  type SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useTheme } from "#/context/theme-context";
import { type Column, type CommandItem } from "#/components/admin/admin-kit";
import {
  AssetStatStrip,
  type Stat,
} from "#/components/features/explore/cloudguard-grid/AssetStats";
import {
  FilterSelect,
  type FilterOption,
  type FilterVariant,
} from "#/components/features/explore/cloudguard-grid/FilterSelect";
import {
  eventsThemeFor,
  APP_FONT,
} from "#/components/features/explore/cloudguard-grid/theme";

/**
 * Discovery UI kit — literal reuse of the Multi-Cloud **Discovery / Overview** components
 * (`components/features/explore/cloudguard-grid`), not a re-implementation. Any admin surface adopts the
 * exact same UI by rendering the SAME code:
 *   • StatStrip        → the real `AssetStatStrip` (extracted from `AssetStats`).
 *   • DiscoverySelect  → the real `FilterSelect` (with an admin `""`↔`"All"` default remap).
 *   • DiscoveryTable   → the real AG-Grid via `AgGridReact` + `gridThemeFor` (the borderless Balham grid).
 *   • DiscoveryListView→ composes the three under an admin-kit Card, mirroring identity's ListView API.
 *
 * Column defs port straight from admin-kit's `Column<R>`; the kit maps them to AG-Grid ColDefs.
 */

// Registering even one Community module once enables the grid app-wide (idempotent).
ModuleRegistry.registerModules([AllCommunityModule]);

// ════════════════════════ StatStrip (real AssetStatStrip) ════════════════════════
export interface StatItem {
  label: string;
  value: number | string;
  unit?: string;
  previous?: number;
  icon?: React.ReactNode;
  adverse?: boolean;
}

/** Renders the real Discovery asset-overview strip with arbitrary figures. */
export function StatStrip({
  title,
  scope,
  items,
  note,
}: {
  title?: string;
  scope?: string;
  items: StatItem[];
  note?: React.ReactNode;
}) {
  const stats: Stat[] = items.map((s) => ({
    label: s.label,
    value:
      typeof s.value === "number"
        ? s.value
        : Number.parseFloat(String(s.value)) || 0,
    unit: s.unit ?? "",
    previous: s.previous,
    icon: s.icon,
    adverse: s.adverse,
  }));
  return (
    <AssetStatStrip title={title} scope={scope} stats={stats} note={note} />
  );
}

// ════════════════════════ DiscoverySelect (real FilterSelect) ════════════════════════
export interface DiscoveryOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

/**
 * The real `FilterSelect`, wrapped only to bridge the admin default sentinel (`""` from `facet()`) to the
 * grid's (`"All"`), so a default filter renders as the source does (icon + "All"). Nothing visual changes.
 */
export function DiscoverySelect({
  label,
  icon,
  value,
  options,
  onChange,
  variant = "input",
  searchable,
  placeholderIsName = true,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: DiscoveryOption[];
  onChange: (v: string) => void;
  variant?: FilterVariant;
  searchable?: boolean;
  /** Admin default: show the filter NAME on the trigger until a value is chosen. */
  placeholderIsName?: boolean;
}) {
  const remapVal = value === "" ? "All" : value;
  const remapOpts: FilterOption[] = options.map((o) => ({
    value: o.value === "" ? "All" : o.value,
    label: o.label,
    icon: o.icon,
  }));
  return (
    <FilterSelect
      label={label}
      icon={icon}
      value={remapVal}
      options={remapOpts}
      variant={variant}
      searchable={searchable}
      placeholderIsName={placeholderIsName}
      onChange={(v) => onChange(v === "All" ? "" : v)}
    />
  );
}

// ════════════════════════ DiscoveryTable (real AG-Grid) ════════════════════════
interface SortState {
  key: string;
  dir: "asc" | "desc";
}

/** Stable cell component — reads the admin column's render() from cellRendererParams (AG-Grid pattern). */
function AdminCell<R>(
  p: ICellRendererParams<R> & { render?: (r: R) => React.ReactNode },
) {
  return p.data && p.render ? <>{p.render(p.data)}</> : null;
}

/**
 * The real AG-Grid table, styled exactly like the Remediation actions list: `eventsThemeFor` +
 * `cellHorizontalPadding:6`, 24px header, 28px rows, a pinned-left checkbox column via v33
 * `rowSelection: multiRow`, and a bulk-action bar driven by AG-Grid selection.
 */
export function DiscoveryTable<R extends { id: string }>({
  columns,
  rows,
  pageSize = 15,
  onRowClick,
  selectable,
  bulkActions,
  rowActions,
  empty,
  initialSort,
}: {
  columns: Column<R>[];
  rows: R[];
  pageSize?: number;
  onRowClick?: (r: R) => void;
  selectable?: boolean;
  bulkActions?: (ids: string[], clear: () => void) => React.ReactNode;
  rowActions?: (r: R) => React.ReactNode;
  empty?: React.ReactNode;
  initialSort?: SortState;
}) {
  const { theme } = useTheme();
  const [api, setApi] = React.useState<GridApi<R> | null>(null);
  const [selCount, setSelCount] = React.useState(0);

  const colDefs = React.useMemo<ColDef<R>[]>(() => {
    const defs: ColDef<R>[] = columns.map((c) => ({
      colId: c.key,
      headerName: c.header,
      flex: c.width ? undefined : 1,
      width: typeof c.width === "number" ? c.width : undefined,
      minWidth: 90,
      sortable: !!c.sortValue,
      valueGetter: c.sortValue
        ? (p: ValueGetterParams<R>) => (p.data ? c.sortValue!(p.data) : null)
        : undefined,
      cellRenderer: AdminCell,
      cellRendererParams: { render: c.render },
      sort: initialSort?.key === c.key ? initialSort.dir : undefined,
    }));
    if (rowActions) {
      defs.push({
        colId: "__actions",
        headerName: "",
        width: 56,
        sortable: false,
        resizable: false,
        cellRenderer: (p: ICellRendererParams<R>) =>
          p.data ? <>{rowActions(p.data)}</> : null,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          overflow: "visible",
        },
      });
    }
    return defs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, rowActions, initialSort?.key, initialSort?.dir]);

  if (rows.length === 0 && empty) return <>{empty}</>;

  const selectedIds = () => api?.getSelectedRows().map((r) => r.id) ?? [];

  return (
    // Fill the viewport so the data region — not empty space below it — is the
    // dominant use of vertical space; pagination anchors to the bottom of the
    // grid rather than floating under a couple of rows. Viewport-relative height
    // (the page scrolls) with a sensible floor for short screens.
    <div
      style={{
        width: "100%",
        fontFamily: APP_FONT,
        height: "calc(100vh - 340px)",
        minHeight: 360,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {selectable && bulkActions && selCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 2px 8px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--cg-text-muted)" }}>
            {selCount} selected
          </span>
          {bulkActions(selectedIds(), () => api?.deselectAll())}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
      <AgGridReact<R>
        theme={eventsThemeFor(theme === "light" ? "light" : "dark").withParams({
          cellHorizontalPadding: 6,
        })}
        rowData={rows}
        columnDefs={colDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e: GridReadyEvent<R>) => setApi(e.api)}
        onSelectionChanged={(e: SelectionChangedEvent<R>) =>
          setSelCount(e.api.getSelectedRows().length)
        }
        onRowClicked={
          onRowClick
            ? (e: RowClickedEvent<R>) => {
                // The checkbox column is a selection affordance, not a link.
                const t = e.event?.target as HTMLElement | null;
                if (t?.closest(".ag-selection-checkbox")) return;
                if (e.data) onRowClick(e.data);
              }
            : undefined
        }
        rowHeight={40}
        headerHeight={32}
        pagination
        paginationPageSize={pageSize}
        paginationPageSizeSelector={false}
        suppressCellFocus
        defaultColDef={{
          sortable: true,
          resizable: false,
          suppressMovable: true,
        }}
        {...(selectable
          ? {
              rowSelection: { mode: "multiRow" as const },
              selectionColumnDef: {
                pinned: "left" as const,
                lockPosition: "left" as const,
                width: 34,
                maxWidth: 34,
                resizable: false,
                suppressMovable: true,
              },
            }
          : {})}
      />
      </div>
    </div>
  );
}

// ════════════════════════ DiscoveryListView ════════════════════════
export interface DiscoveryPill {
  key: string;
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: DiscoveryOption[];
}
export interface DiscoveryPreset {
  label: string;
  onApply: () => void;
}

/**
 * Discovery-styled surface shell — the real strip + real filters + real grid under an admin Card, with
 * the same prop shape as identity's ListView so a tab swaps look with one component change.
 */
export function DiscoveryListView<R extends { id: string }>({
  // `title` is intentionally not rendered — the phrase in front of the filters
  // was removed. It stays in the props type for call-site compatibility.
  stats,
  commands,
  commandFarItems,
  presets,
  pills,
  filterRightSlot,
  search,
  onSearch,
  searchPlaceholder,
  count,
  columns,
  rows,
  pageSize = 15,
  onRowClick,
  selectable,
  bulkActions,
  rowActions,
  empty,
  initialSort,
}: {
  title: string;
  desc?: string;
  stats?: {
    title?: string;
    scope?: string;
    items: StatItem[];
    note?: React.ReactNode;
  };
  commands?: CommandItem[];
  commandFarItems?: React.ReactNode;
  presets?: DiscoveryPreset[];
  pills?: DiscoveryPill[];
  filterRightSlot?: React.ReactNode;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
  count: number;
  columns: Column<R>[];
  rows: R[];
  pageSize?: number;
  onRowClick?: (r: R) => void;
  /** Accepted for API-compat with ListView; the literal Discovery grid has no row-checkbox column. */
  selectable?: boolean;
  bulkActions?: (ids: string[], clear: () => void) => React.ReactNode;
  rowActions?: (r: R) => React.ReactNode;
  empty?: React.ReactNode;
  initialSort?: SortState;
}) {
  const filtered = count;
  return (
    <>
      {stats && (
        <StatStrip
          title={stats.title}
          scope={stats.scope}
          items={stats.items}
          note={stats.note}
        />
      )}
      {/*
       * No admin Card — the overview's table sits directly on the page background inside a `.cg-events`
       * wrapper (which supplies the tab-filter hover). Header row mirrors RecentEvents: title + count on
       * the left, `variant="tab"` filters and cg-report-action toolbar buttons on the right.
       */}
      <section
        className="cg-events"
        style={{
          margin: "0 10px 22px",
          fontFamily: APP_FONT,
          color: "var(--cg-text-primary)",
        }}
      >
        <style>{`
          .cg-events .cg-scope-tab { transition: background-color .12s, color .12s; }
          .cg-events .cg-scope-tab:hover { background: var(--cg-bg-hover); }
          .cg-events .cgd-preset { transition: background-color .12s, color .12s; }
          .cg-events .cgd-preset:hover { background: var(--cg-bg-hover); color: var(--cg-text-primary); }
        `}</style>

        {/* Line 1 — action buttons, right-aligned; the live count stays on the
            left. */}
        {(commands?.length || commandFarItems) && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 4,
              marginBottom: 12,
            }}
          >
            {filtered !== rows.length && (
              <span
                style={{
                  marginRight: "auto",
                  fontSize: 10.5,
                  fontWeight: 500,
                  fontFamily: APP_FONT,
                  color: "var(--cg-text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {filtered.toLocaleString()} of {rows.length.toLocaleString()}
              </span>
            )}
            {commands?.map((c) => (
              <button
                key={c.key}
                type="button"
                className={
                  c.primary
                    ? "cg-report-action cg-report-action-primary"
                    : "cg-report-action"
                }
                disabled={c.disabled}
                onClick={(e) => c.onClick?.(e)}
                title={c.label}
                style={{
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
                }}
              >
                {c.icon}
                {c.label}
              </button>
            ))}
            {commandFarItems}
          </div>
        )}

        {/* Line 2 — filters, left-aligned so they start at the table's left edge.
            Kept tight to the view-tabs/search row below (one operational cluster). */}
        {(pills?.length || filterRightSlot) && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 4,
              marginBottom: 8,
            }}
          >
            {pills?.map((p) => (
              <DiscoverySelect
                key={p.key}
                variant="tab"
                label={p.label}
                icon={p.icon}
                value={p.value}
                options={p.options}
                onChange={p.onChange}
              />
            ))}
            {filterRightSlot}
          </div>
        )}

        {(presets?.length || searchPlaceholder) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            {presets?.map((p) => (
              <button
                key={p.label}
                type="button"
                className="cgd-preset"
                onClick={p.onApply}
                style={{
                  height: 24,
                  padding: "0 9px",
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: "var(--cg-text-nav)",
                  fontSize: 12,
                  lineHeight: 1,
                  fontFamily: APP_FONT,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {p.label}
              </button>
            ))}
            <span
              style={{
                position: "relative",
                flex: "0 1 300px",
                marginLeft: "auto",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 9,
                  top: 6,
                  color: "var(--cg-text-muted)",
                  fontSize: 12,
                }}
              >
                ⌕
              </span>
              <input
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                style={{
                  height: 28,
                  width: "100%",
                  padding: "0 9px 0 26px",
                  background: "var(--cg-input-bg)",
                  border: "1px solid var(--cg-border)",
                  borderRadius: 6,
                  color: "var(--cg-text-primary)",
                  fontSize: 12.5,
                  fontFamily: APP_FONT,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </span>
          </div>
        )}

        <DiscoveryTable
          columns={columns}
          rows={rows}
          pageSize={pageSize}
          onRowClick={onRowClick}
          selectable={selectable}
          bulkActions={bulkActions}
          rowActions={rowActions}
          empty={empty}
          initialSort={initialSort}
        />
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Page chrome — the overview page's own header and navigation.
 *
 * The console's `Page`/`PageHeader`/`Tabs` are a different visual system from
 * the explore pages: a 19px h1 with a subtitle paragraph, then a strip of
 * 36px-tall padded tab buttons. The overview pages have no h1 at all — they
 * open with a breadcrumb, then underline tabs that sit on the text baseline
 * with no button padding, then pill-shaped view switches.
 *
 * That difference is the bulk of why a console page still reads as "console"
 * even after its table and drawer have been converted: the first 120px of the
 * page are the part you see before anything else, and they were untouched.
 *
 * These mirror `routes/explore-view.tsx` exactly — same metrics, same tokens,
 * same roving-tablist keyboard model — so a console page can adopt the
 * overview chrome without re-deriving it.
 * ------------------------------------------------------------------ */

/** Page box: the overview's tighter gutter, not the console's 36px one. */
export function DiscoveryPage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 14px 12px",
        maxWidth: 1760,
        margin: "0 auto",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Breadcrumb, in place of a title block.
 *
 * The overview pages state where you are in one 12.5px line rather than a
 * heading plus a sentence of description. The tab strip immediately under it
 * already names the view, so a heading would be saying it twice — and the
 * description sentence is the thing that pushes the actual data below the fold.
 */
export function DiscoveryCrumb({
  parent,
  current,
  onParent,
  actions,
}: {
  parent: string;
  current: string;
  onParent?: () => void;
  actions?: React.ReactNode;
}) {
  const crumb: React.CSSProperties = {
    background: "transparent",
    border: "none",
    padding: 0,
    font: "inherit",
    color: "var(--cg-text-muted)",
    cursor: onParent ? "pointer" : "default",
  };
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        fontSize: 12.5,
        color: "var(--cg-text-muted)",
        marginBottom: 10,
      }}
    >
      <button
        type="button"
        style={crumb}
        onClick={onParent}
        disabled={!onParent}
      >
        {parent}
      </button>
      <span style={{ opacity: 0.6 }}>›</span>
      <span
        aria-current="page"
        style={{ color: "var(--cg-text-primary)", fontWeight: 600 }}
      >
        {current}
      </span>
      {actions && (
        <span style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          {actions}
        </span>
      )}
    </nav>
  );
}

/** Arrow-key movement within a tablist, matching the explore strips. */
function rovingKey(
  e: React.KeyboardEvent<HTMLButtonElement>,
  i: number,
  count: number,
) {
  let next = i;
  if (e.key === "ArrowRight") next = (i + 1) % count;
  else if (e.key === "ArrowLeft") next = (i - 1 + count) % count;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = count - 1;
  else return;
  e.preventDefault();
  const sibling = e.currentTarget.parentElement?.children[next] as
    | HTMLElement
    | undefined;
  sibling?.focus();
  sibling?.click();
}

/**
 * Primary navigation — underline tabs.
 *
 * Spaced by a 22px gap rather than separated by button padding: the label is
 * the target, so the underline sits directly under the word it marks instead
 * of under a box that is wider than it.
 */
export function DiscoveryTabs({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 22,
        rowGap: 2,
        flexWrap: "wrap",
        borderBottom: "1px solid var(--cg-border-card)",
        marginBottom: 16,
      }}
    >
      {tabs.map((t, i) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            title={t.label}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => rovingKey(e, i, tabs.length)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${on ? "var(--cg-accent)" : "transparent"}`,
              marginBottom: -1,
              padding: "0 1px 10px",
              color: on ? "var(--cg-text-primary)" : "var(--cg-text-nav)",
              fontSize: 13,
              fontWeight: on ? 600 : 400,
              fontFamily: APP_FONT,
              whiteSpace: "nowrap",
              cursor: "pointer",
              flexShrink: 0,
              transition: "color 120ms ease",
            }}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Secondary navigation — view pills, for a slice of the tab above. */
export function DiscoveryPills({
  items,
  active,
  onChange,
  label,
}: {
  items: { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexWrap: "wrap",
        marginBottom: 16,
      }}
    >
      {/* ui-system tabPill — identical to the Sessions sub-tab strip: borderless,
          active = the darkest token (--cg-tab-active-bg), hover = --cg-tab-hover-bg,
          no blue mouse-click ring. */}
      <style>{`
        .cg-disc-pill { transition: background-color .12s ease, color .12s ease; }
        .cg-disc-pill:hover { background: var(--cg-tab-hover-bg); color: var(--cg-text-primary); }
        .cg-disc-pill:focus:not(:focus-visible) { outline: none; }
      `}</style>
      {items.map((v, i) => {
        const on = v.id === active;
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(v.id)}
            onKeyDown={(e) => rovingKey(e, i, items.length)}
            className="cg-disc-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 10px",
              borderRadius: 6,
              border: "none",
              background: on ? "var(--cg-tab-active-bg)" : "transparent",
              color: on ? "var(--cg-text-primary)" : "var(--cg-text-nav)",
              fontSize: 12.5,
              fontWeight: on ? 600 : 400,
              fontFamily: APP_FONT,
              lineHeight: 1,
              whiteSpace: "nowrap",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {v.icon}
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

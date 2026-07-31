/* eslint-disable i18next/no-literal-string -- explore capability grid */
import React from "react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
  type IRowNode,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { buildColumns } from "./columns";
import { branchIds, buildRows, type ResourceRow } from "./data";
import { gridThemeFor } from "./theme";
import { HeaderCell } from "./HeaderCell";
import { FloatingFilter } from "./FloatingFilter";
import { HeaderMenu, type MenuTarget } from "./HeaderMenu";
import { SidePanel, type PanelTab } from "./SidePanel";
import { CellMenu, type CellTarget } from "./CellMenu";
import { useTheme } from "#/context/theme-context";

/**
 * CloudGuard resource grid — AG Grid **Community only** (MIT).
 *
 * `ag-grid-enterprise` and `ag-charts-enterprise` are intentionally not
 * dependencies: registering even one Enterprise module puts the grid into
 * licensed mode and renders a watermark without a paid key. The Enterprise
 * features worth having are rebuilt on Community APIs:
 *
 * | Enterprise module            | Our replacement                        |
 * |------------------------------|----------------------------------------|
 * | `SetFilterModule`            | `SetFilter.tsx` via `useGridFilter`    |
 * | `SideBar`+`ColumnsToolPanel` | `SidePanel.tsx` via column-state API   |
 * | `FiltersToolPanelModule`     | `SidePanel.tsx` Filters tab            |
 * | `ColumnMenuModule`           | `HeaderMenu.tsx` + `HeaderCell.tsx`    |
 * | `SparklinesModule`           | `Sparkline.tsx`, inline SVG            |
 * | `ExcelExportModule`          | `exportDataAsCsv` (Community)          |
 * | `TreeDataModule`             | flat `parentId` rows + external filter |
 *
 * Column *groups* in the header are Community (`ColGroupDef`) and cost nothing.
 * Genuinely not rebuilt: the drag-to-group row-group panel and Pivot Mode —
 * both change the row model itself. Our tree hierarchy is the substitute.
 *
 * ## How the hierarchy works
 *
 * Community has no tree row model, so rows are generated flat in depth-first
 * order carrying `level` / `parentId` / `hasChildren` (see `data.ts`). Every
 * row stays in `rowData` at all times; an **external filter** hides any row
 * with a collapsed ancestor, which is what lets column filters and quick
 * search operate over the whole tree rather than only the expanded part.
 */

ModuleRegistry.registerModules([AllCommunityModule]);

const LEAF_COUNT = 1000;

/**
 * Gap left below the grid so its bottom edge lines up with the chat composer
 * in the right-hand panel. Measured against the viewport rather than hard-coded
 * as `calc(100vh - Npx)`: the chrome above the grid changes height when the
 * capability tab strip wraps to a second row, and a fixed subtraction silently
 * mis-sizes the grid when that happens.
 */
const BOTTOM_GAP = 22;
const MIN_HEIGHT = 360;
const PAGE_SIZES = [25, 50, 100, 500];

export function CloudGuardGrid() {
  const { theme } = useTheme();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const measure = () => {
      const el = rootRef.current;
      if (!el) return;
      const { top } = el.getBoundingClientRect();
      setHeight(Math.max(MIN_HEIGHT, window.innerHeight - top - BOTTOM_GAP));
    };
    measure();
    window.addEventListener("resize", measure);
    // Catches the tab strip reflowing without a window resize.
    const ro = new ResizeObserver(measure);
    if (rootRef.current?.parentElement)
      ro.observe(rootRef.current.parentElement);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);
  const [api, setApi] = React.useState<GridApi<ResourceRow> | null>(null);
  const [panelTab, setPanelTab] = React.useState<PanelTab>(null);
  const [menu, setMenu] = React.useState<MenuTarget | null>(null);
  const [cellMenu, setCellMenu] = React.useState<CellTarget | null>(null);

  const rowData = React.useMemo(() => buildRows(LEAF_COUNT), []);

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    setExpanded(new Set(branchIds(rowData)));
  }, [rowData]);

  const parentOf = React.useMemo(() => {
    const m = new Map<string, string | null>();
    rowData.forEach((r) => m.set(r.id, r.parentId));
    return m;
  }, [rowData]);

  // Refs because AG Grid calls doesExternalFilterPass outside React's render
  // cycle — a stale closure here silently shows the wrong rows.
  const expandedRef = React.useRef(expanded);
  expandedRef.current = expanded;
  const parentRef = React.useRef(parentOf);
  parentRef.current = parentOf;

  const isVisible = React.useCallback((row: ResourceRow) => {
    let p = parentRef.current.get(row.id) ?? null;
    while (p) {
      if (!expandedRef.current.has(p)) return false;
      p = parentRef.current.get(p) ?? null;
    }
    return true;
  }, []);

  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  React.useEffect(() => {
    if (!api) return;
    api.onFilterChanged();
    api.refreshCells({ force: true, columns: ["resource"] });
  }, [api, expanded]);

  // Stable identity, mutated in place: a new object here would give columnDefs
  // a new identity on every expand and make AG Grid rebuild every column.
  const treeParams = React.useRef({ expanded, onToggle: toggle }).current;
  treeParams.expanded = expanded;
  treeParams.onToggle = toggle;

  const columnDefs = React.useMemo(
    () => buildColumns(treeParams),
    [treeParams],
  );

  const defaultColDef = React.useMemo<ColDef<ResourceRow>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: true,
      minWidth: 80,
      headerComponent: HeaderCell,
      headerComponentParams: { onOpenMenu: setMenu },
      floatingFilterComponent: FloatingFilter,
      suppressFloatingFilterButton: true,
    }),
    [],
  );

  const onGridReady = React.useCallback((e: GridReadyEvent<ResourceRow>) => {
    setApi(e.api);
  }, []);

  // Autosize once, after the first rows render. `firstDataRendered` is the
  // earliest point cell content exists to measure — calling it on gridReady
  // measures empty cells and collapses every column to its header width.
  const autoSized = React.useRef(false);
  const onFirstDataRendered = React.useCallback(() => {
    if (autoSized.current || !api) return;
    autoSized.current = true;
    api.autoSizeAllColumns();
  }, [api]);

  return (
    // height:100% + overflow:hidden — the page itself must not scroll; only
    // the grid viewport does.
    <div
      ref={rootRef}
      className="cg-grid-root"
      style={{
        height: height ? `${height}px` : "70vh",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid var(--cg-border-subtle)",
        borderRadius: 6,
        background: "var(--cg-bg-card)",
      }}
    >
      <style>{`
        .cg-grp-start { box-shadow: inset 1px 0 0 var(--cg-border); }
        .ag-header-group-cell.cg-grp .ag-header-group-cell-label { gap: 6px; }

        /*
         * Semantic colours for the grid's icons and status text.
         *
         * Declared as variables at :root rather than inline hexes because the
         * same values are used inside AG Grid's filter popups, which render in
         * a portal outside this component's DOM — scoping them to the grid
         * wrapper would leave popup icons uncoloured.
         *
         * The dark values are the originals, unchanged. The light overrides are
         * ~3 shades darker: the pastels were tuned against a #292929 surface
         * and wash out badly on white.
         */
        :root {
          --cgx-critical: #f87171;
          --cgx-high:     #fb923c;
          --cgx-medium:   #fbbf24;
          --cgx-low:      #4ade80;
          --cgx-account:  #7dd3fc;
          --cgx-cluster:  #c4b5fd;
          --cgx-database: #fca5a5;
          --cgx-storage:  #fcd34d;
          --cgx-function: #a5b4fc;
          --cgx-compute:  #86efac;
          --cgx-network:  #5eead4;
          --cgx-scroll-thumb: #4b4b4f;
          --cgx-scroll-thumb-hover: #63636a;
        }
        :root[data-theme="light"] {
          --cgx-critical: #b91c1c;
          --cgx-high:     #c2410c;
          --cgx-medium:   #a16207;
          --cgx-low:      #15803d;
          --cgx-account:  #0369a1;
          --cgx-cluster:  #6d28d9;
          --cgx-database: #b91c1c;
          --cgx-storage:  #a16207;
          --cgx-function: #4338ca;
          --cgx-compute:  #15803d;
          --cgx-network:  #0f766e;
          --cgx-scroll-thumb: #c2c6cc;
          --cgx-scroll-thumb-hover: #a5aab2;
        }

        .cg-grid-root *::-webkit-scrollbar { width: 10px; height: 10px; }
        .cg-grid-root *::-webkit-scrollbar-track { background: transparent; }
        .cg-grid-root *::-webkit-scrollbar-thumb {
          background: var(--cgx-scroll-thumb);
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .cg-grid-root *::-webkit-scrollbar-thumb:hover {
          background: var(--cgx-scroll-thumb-hover);
          background-clip: content-box;
        }
        .cg-grid-root *::-webkit-scrollbar-corner { background: transparent; }
        /* Firefox has no ::-webkit pseudo-elements. */
        .cg-grid-root * {
          scrollbar-width: thin;
          scrollbar-color: var(--cgx-scroll-thumb) transparent;
        }
      `}</style>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <AgGridReact<ResourceRow>
            theme={gridThemeFor(theme)}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(p) => p.data.id}
            onGridReady={onGridReady}
            onFirstDataRendered={onFirstDataRendered}
            preventDefaultOnContextMenu
            onCellContextMenu={(e) => {
              const ev = e.event as MouseEvent | null;
              if (!e.data || !ev) return;
              setCellMenu({ row: e.data, x: ev.clientX, y: ev.clientY });
            }}
            isExternalFilterPresent={() => true}
            doesExternalFilterPass={(node: IRowNode<ResourceRow>) =>
              node.data ? isVisible(node.data) : true
            }
            rowSelection={{ mode: "multiRow" }}
            selectionColumnDef={{
              pinned: "left",
              lockPosition: "left",
              lockPinned: true,
              width: 42,
              maxWidth: 42,
              resizable: false,
              suppressMovable: true,
            }}
            cellSelection
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={PAGE_SIZES}
            animateRows
            enableCellTextSelection
            suppressDragLeaveHidesColumns
          />
        </div>

        <SidePanel
          api={api}
          groups={columnDefs}
          tab={panelTab}
          onTab={setPanelTab}
        />
      </div>

      <CellMenu
        target={cellMenu}
        rows={rowData}
        onClose={() => setCellMenu(null)}
      />

      <HeaderMenu
        target={menu}
        api={api}
        onClose={() => setMenu(null)}
        onChooseColumns={() => setPanelTab("columns")}
      />
    </div>
  );
}

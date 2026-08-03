/* eslint-disable i18next/no-literal-string -- grid header menu */
import React from "react";
import {
  ArrowDown,
  ArrowUp,
  Columns3,
  Maximize2,
  Pin,
  RotateCcw,
} from "lucide-react";
import type { GridApi } from "ag-grid-community";

/**
 * Column header `⋮` menu — our stand-in for the Enterprise `ColumnMenuModule`
 * (`showColumnChooser` / context menu).
 *
 * Every action here is a Community grid-API call; Enterprise ships the menu
 * UI, not the underlying capability:
 *   - sort            → `applyColumnState`
 *   - pin             → `setColumnsPinned`
 *   - autosize        → `autoSizeColumns` / `autoSizeAllColumns`
 *   - choose columns  → opens our own column panel
 *   - reset           → `resetColumnState`
 *
 * Rendered in a fixed-position layer at the click point rather than inside the
 * header cell: header cells clip their overflow, so an in-flow menu would be
 * cut off at the first row.
 */

export interface MenuTarget {
  colId: string;
  x: number;
  y: number;
}

interface Props {
  target: MenuTarget | null;
  api: GridApi | null;
  onClose: () => void;
  onChooseColumns: () => void;
  onResetDisplay?: () => void;
}

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "6px 12px",
  background: "none",
  border: "none",
  color: "var(--cg-text-primary)",
  fontSize: 13,
  cursor: "pointer",
  textAlign: "left",
};

const sep: React.CSSProperties = {
  height: 1,
  background: "var(--cg-border-subtle)",
  margin: "4px 0",
};

export function HeaderMenu({
  target,
  api,
  onClose,
  onChooseColumns,
  onResetDisplay,
}: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!target) return undefined;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [target, onClose]);

  if (!target || !api) return null;

  const { colId } = target;
  const act = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const sort = (dir: "asc" | "desc" | null) =>
    api.applyColumnState({
      state: [{ colId, sort: dir }],
      defaultState: { sort: null },
    });

  const items: (React.ReactNode | "sep")[] = [
    <button
      key="asc"
      type="button"
      style={row}
      onClick={act(() => sort("asc"))}
    >
      <ArrowUp size={14} /> Sort Ascending
    </button>,
    <button
      key="desc"
      type="button"
      style={row}
      onClick={act(() => sort("desc"))}
    >
      <ArrowDown size={14} /> Sort Descending
    </button>,
    <button
      key="nosort"
      type="button"
      style={row}
      onClick={act(() => sort(null))}
    >
      <RotateCcw size={14} /> Clear Sort
    </button>,
    "sep",
    <button
      key="pinl"
      type="button"
      style={row}
      onClick={act(() => api.setColumnsPinned([colId], "left"))}
    >
      <Pin size={14} /> Pin Left
    </button>,
    <button
      key="pinr"
      type="button"
      style={row}
      onClick={act(() => api.setColumnsPinned([colId], "right"))}
    >
      <Pin size={14} /> Pin Right
    </button>,
    <button
      key="pinn"
      type="button"
      style={row}
      onClick={act(() => api.setColumnsPinned([colId], null))}
    >
      <Pin size={14} /> No Pin
    </button>,
    "sep",
    <button
      key="asz"
      type="button"
      style={row}
      onClick={act(() => api.autoSizeColumns([colId]))}
    >
      <Maximize2 size={14} /> Autosize This Column
    </button>,
    <button
      key="aszall"
      type="button"
      style={row}
      onClick={act(() => api.autoSizeAllColumns())}
    >
      <Maximize2 size={14} /> Autosize All Columns
    </button>,
    "sep",
    <button
      key="choose"
      type="button"
      style={row}
      onClick={act(onChooseColumns)}
    >
      <Columns3 size={14} /> Choose Columns
    </button>,
    <button
      key="reset"
      type="button"
      style={row}
      onClick={act(() => api.resetColumnState())}
    >
      <RotateCcw size={14} /> Reset Columns
    </button>,
    <button
      key="resetall"
      type="button"
      style={row}
      onClick={act(() => onResetDisplay?.())}
    >
      <RotateCcw size={14} /> Reset All Display
    </button>,
  ];

  return (
    <div
      ref={ref}
      role="menu"
      style={{
        position: "fixed",
        top: target.y,
        left: target.x,
        zIndex: 60,
        minWidth: 210,
        padding: "4px 0",
        background: "var(--cg-bg-card)",
        border: "1px solid var(--cg-border)",
        borderRadius: 6,
        boxShadow: "var(--cg-shadow-dropdown, 0 8px 24px rgba(0,0,0,.4))",
      }}
    >
      {items.map((it, i) =>
        it === "sep" ? (
          // eslint-disable-next-line react/no-array-index-key -- static list
          <div key={`sep${i}`} style={sep} />
        ) : (
          it
        ),
      )}
    </div>
  );
}

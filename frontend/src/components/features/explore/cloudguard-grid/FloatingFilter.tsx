/* eslint-disable i18next/no-literal-string -- grid floating filter */
import React from "react";
import { Filter as FilterIcon } from "lucide-react";
import type { IFloatingFilterParams } from "ag-grid-community";

/**
 * Floating filter shown under every column header.
 *
 * AG Grid's built-in floating filters are per-filter-type and a custom filter
 * (our `SetFilter`) gets none, which left those columns with an empty strip.
 * This gives every column the same affordance: a button that opens that
 * column's full filter popup — which for set filters includes the search form.
 *
 * The button reflects filter state, so an applied filter is visible without
 * opening anything.
 */
export function FloatingFilter(params: IFloatingFilterParams) {
  const { api, column } = params;
  const colId = column.getColId();
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const sync = () => setActive(column.isFilterActive());
    sync();
    column.addEventListener("filterChanged", sync);
    return () => column.removeEventListener("filterChanged", sync);
  }, [column]);

  return (
    <button
      type="button"
      aria-label={`Filter ${column.getColDef().headerName ?? colId}`}
      onClick={() => api.showColumnFilter(colId)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        width: "100%",
        height: "100%",
        padding: "0 6px",
        background: active ? "var(--cg-accent-bg)" : "transparent",
        border: "1px solid var(--cg-border-subtle)",
        borderRadius: 3,
        color: active ? "var(--cg-accent)" : "var(--cg-text-muted)",
        fontSize: 11,
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <FilterIcon size={11} style={{ flexShrink: 0 }} />
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {active ? "Filtered" : "Filter"}
      </span>
    </button>
  );
}

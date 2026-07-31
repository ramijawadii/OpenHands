/* eslint-disable i18next/no-literal-string -- grid header cell */
import React from "react";
import { ArrowDown, ArrowUp, MoreVertical } from "lucide-react";
import type { IHeaderParams } from "ag-grid-community";
import type { MenuTarget } from "./HeaderMenu";

/**
 * Custom header cell, so the `⋮` menu trigger exists on every column.
 *
 * AG Grid Community renders a header with sort and filter affordances but no
 * column menu — the menu is `ColumnMenuModule`, which is Enterprise. Supplying
 * our own header component is the Community-supported way to put the trigger
 * there; the menu itself is `HeaderMenu.tsx`.
 */

export interface HeaderCellParams extends IHeaderParams {
  onOpenMenu: (t: MenuTarget) => void;
}

export function HeaderCell(props: HeaderCellParams) {
  const { displayName, column, progressSort, onOpenMenu, enableSorting } =
    props;
  const [sort, setSort] = React.useState(column.getSort());

  React.useEffect(() => {
    const listener = () => setSort(column.getSort());
    column.addEventListener("sortChanged", listener);
    return () => column.removeEventListener("sortChanged", listener);
  }, [column]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        width: "100%",
        height: "100%",
      }}
    >
      <button
        type="button"
        onClick={(e) => enableSorting && progressSort(e.shiftKey)}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          padding: 0,
          color: "inherit",
          font: "inherit",
          cursor: enableSorting ? "pointer" : "default",
          textAlign: "left",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayName}
        </span>
        {sort === "asc" && <ArrowUp size={12} />}
        {sort === "desc" && <ArrowDown size={12} />}
      </button>

      <button
        type="button"
        aria-label={`${displayName} column menu`}
        onClick={(e) => {
          e.stopPropagation();
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onOpenMenu({
            colId: column.getColId(),
            x: r.left - 180,
            y: r.bottom + 4,
          });
        }}
        style={{
          display: "flex",
          alignItems: "center",
          background: "none",
          border: "none",
          padding: 0,
          color: "inherit",
          opacity: 0.65,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <MoreVertical size={14} />
      </button>
    </div>
  );
}

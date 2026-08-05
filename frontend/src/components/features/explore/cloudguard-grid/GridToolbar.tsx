/* eslint-disable i18next/no-literal-string -- inventory grid toolbar */
import React from "react";
import type { GridApi } from "ag-grid-community";
import { Download, FilterX, RotateCcw, X } from "lucide-react";
import { APP_FONT } from "./theme";

/**
 * Toolbar above the inventory grid: what is filtered, how to undo it, and what
 * can be done with a selection.
 *
 * It exists because AG Grid Community gives no standing indication that a
 * filter is applied — the funnel lives inside a header menu the user has to go
 * looking for. A grid that silently hides 900 of 1,150 rows, with the only
 * evidence three columns to the right, is a grid people mistrust.
 *
 * State is read from the grid rather than mirrored in React. A second copy of
 * "what is filtered" is a second thing that can be wrong, and the grid is
 * authoritative — so the toolbar subscribes to `filterChanged` /
 * `selectionChanged` and re-reads.
 */

interface Props {
  api: GridApi | null;
  /** Header name per field, so a chip says "Provider" not "provider". */
  labelFor: (field: string) => string;
}

interface ActiveFilter {
  field: string;
  label: string;
  /** Short human summary of the filter model — "3 selected", "contains foo". */
  summary: string;
}

function summarise(model: unknown): string {
  if (Array.isArray(model)) return `${model.length} selected`;
  if (model && typeof model === "object") {
    const m = model as { filter?: unknown; type?: string };
    if (m.filter !== undefined) return `${m.type ?? "is"} ${String(m.filter)}`;
    if (m.type) return String(m.type);
  }
  return "filtered";
}

const btn = (enabled: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  height: 24,
  padding: "0 9px",
  fontSize: 11.5,
  fontFamily: APP_FONT,
  background: "transparent",
  color: enabled ? "var(--cg-text-primary)" : "var(--cg-text-muted)",
  border: "1px solid var(--cg-border)",
  borderRadius: 3,
  cursor: enabled ? "pointer" : "not-allowed",
  opacity: enabled ? 1 : 0.55,
  whiteSpace: "nowrap",
});

export function GridToolbar({ api, labelFor }: Props) {
  const [filters, setFilters] = React.useState<ActiveFilter[]>([]);
  const [selected, setSelected] = React.useState(0);
  const [shown, setShown] = React.useState(0);
  const [total, setTotal] = React.useState(0);

  const read = React.useCallback(() => {
    if (!api) return;
    const model = api.getFilterModel() ?? {};
    setFilters(
      Object.entries(model).map(([field, m]) => ({
        field,
        label: labelFor(field),
        summary: summarise(m),
      })),
    );
    setSelected(api.getSelectedRows().length);
    setShown(api.getDisplayedRowCount());
    let all = 0;
    api.forEachNode(() => {
      all += 1;
    });
    setTotal(all);
  }, [api, labelFor]);

  // Subscribe rather than mirror: the grid is the source of truth for both
  // filter model and selection, and it mutates outside React's cycle.
  React.useEffect(() => {
    if (!api) return undefined;
    read();
    const events = [
      "filterChanged",
      "selectionChanged",
      "modelUpdated",
    ] as const;
    events.forEach((e) => api.addEventListener(e, read));
    return () => {
      events.forEach((e) => api.removeEventListener(e, read));
    };
  }, [api, read]);

  const clearOne = (field: string) => {
    if (!api) return;
    const model = { ...(api.getFilterModel() ?? {}) };
    delete model[field];
    api.setFilterModel(model);
  };

  /**
   * Reset is filters + sort + selection, not filters alone.
   *
   * "Why am I still not seeing it" is as often a stale sort or a leftover
   * selection as a filter, and a Reset that clears only some of the state
   * teaches people it cannot be trusted.
   */
  const resetAll = () => {
    if (!api) return;
    api.setFilterModel(null);
    api.applyColumnState({ defaultState: { sort: null } });
    api.deselectAll();
  };

  const exportCsv = () => {
    if (!api || selected === 0) return;
    api.exportDataAsCsv({
      onlySelected: true,
      fileName: `inventory-${selected}-resources.csv`,
    });
  };

  const hasFilters = filters.length > 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        padding: "6px 8px",
        borderBottom: "1px solid var(--cg-border-subtle)",
        fontFamily: APP_FONT,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 11.5, color: "var(--cg-text-muted)" }}>
        {hasFilters ? (
          <>
            <strong style={{ color: "var(--cg-text-primary)" }}>
              {shown.toLocaleString()}
            </strong>{" "}
            of {total.toLocaleString()}
          </>
        ) : (
          <>
            <strong style={{ color: "var(--cg-text-primary)" }}>
              {total.toLocaleString()}
            </strong>{" "}
            resources
          </>
        )}
      </span>

      {/* One chip per active filter — the standing indication AG Grid lacks. */}
      {filters.map((f) => (
        <span
          key={f.field}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "1px 4px 1px 8px",
            fontSize: 11,
            lineHeight: "18px",
            borderRadius: 9,
            border: "1px solid var(--cg-accent)",
            color: "var(--cg-text-primary)",
            whiteSpace: "nowrap",
          }}
        >
          {f.label}
          <span style={{ color: "var(--cg-text-muted)" }}>{f.summary}</span>
          <button
            type="button"
            aria-label={`Clear ${f.label} filter`}
            onClick={() => clearOne(f.field)}
            style={{
              display: "inline-flex",
              padding: 2,
              background: "none",
              border: "none",
              color: "var(--cg-text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={11} />
          </button>
        </span>
      ))}

      <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
        {selected > 0 && (
          <span
            aria-live="polite"
            style={{
              alignSelf: "center",
              fontSize: 11.5,
              color: "var(--cg-text-primary)",
            }}
          >
            {selected.toLocaleString()} selected
          </span>
        )}
        <button
          type="button"
          style={btn(selected > 0)}
          disabled={selected === 0}
          onClick={exportCsv}
          title={
            selected > 0
              ? `Export ${selected} selected resources as CSV`
              : "Select rows to export"
          }
        >
          <Download size={12} /> Export
        </button>
        <button
          type="button"
          style={btn(hasFilters)}
          disabled={!hasFilters}
          onClick={() => api?.setFilterModel(null)}
          title="Clear all column filters"
        >
          <FilterX size={12} /> Clear filters
        </button>
        <button
          type="button"
          style={btn(true)}
          onClick={resetAll}
          title="Clear filters, sort and selection"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </span>
    </div>
  );
}

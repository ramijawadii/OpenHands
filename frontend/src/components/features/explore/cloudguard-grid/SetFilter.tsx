/* eslint-disable i18next/no-literal-string -- grid filter UI */
import React from "react";
import { type CustomFilterProps, useGridFilter } from "ag-grid-react";
import type { IRowNode } from "ag-grid-community";
import { ICON_FIELDS, ValueWithIcon } from "./icons";

/**
 * Checkbox set filter — our Community-licensed stand-in for the Enterprise
 * `SetFilterModule` (`agSetColumnFilter`).
 *
 * Built on AG Grid Community's custom-filter API (`useGridFilter`), which is
 * MIT. The model is the list of *selected* values, or `null` for "no filter",
 * matching how AG Grid treats an inactive filter.
 *
 * Distinct values are derived from the grid's own row nodes on open rather
 * than from a static list, so the options always reflect the loaded data.
 *
 * **Tree-aware.** The grid holds a hierarchy flattened into rows linked by
 * `parentId`, and AG Grid evaluates a filter per row in isolation. Testing only
 * a row's own value therefore drops account and cluster rows whose *children*
 * match — the matching resources survive but their headings vanish, so the
 * first account looks truncated away and the tree is left headless. A row here
 * passes if it matches, or if anything beneath it does.
 */

type Model = string[] | null;

export function SetFilter({
  model,
  onModelChange,
  api,
  colDef,
}: CustomFilterProps<unknown, unknown, Model>) {
  const [search, setSearch] = React.useState("");
  const [values, setValues] = React.useState<string[]>([]);

  const field = colDef.field ?? "";

  /**
   * `id → every value of this field at or below that row`.
   *
   * Built once and cached: computing it per row during filtering would be
   * quadratic over the whole tree, and the data behind a grid instance does
   * not change under us.
   */
  const subtreeValues = React.useRef<Map<string, Set<string>> | null>(null);

  const buildIndex = React.useCallback(() => {
    const childrenOf = new Map<string, string[]>();
    const ownValue = new Map<string, string>();
    const roots: string[] = [];

    api.forEachNode((node: IRowNode) => {
      const row = node.data as
        | { id?: string; parentId?: string | null }
        | undefined;
      const id = row?.id;
      if (!id) return;
      const raw = (row as Record<string, unknown>)[field];
      ownValue.set(id, raw === undefined || raw === null ? "" : String(raw));
      const parent = row?.parentId ?? null;
      if (parent) {
        const list = childrenOf.get(parent);
        if (list) list.push(id);
        else childrenOf.set(parent, [id]);
      } else {
        roots.push(id);
      }
    });

    const index = new Map<string, Set<string>>();
    // Iterative post-order: the tree is shallow but a recursive walk over
    // thousands of rows is an avoidable stack risk.
    const stack: [string, boolean][] = roots.map((r) => [r, false]);
    while (stack.length) {
      const [id, visited] = stack.pop() as [string, boolean];
      if (visited) {
        const set = new Set<string>();
        const own = ownValue.get(id);
        if (own) set.add(own);
        (childrenOf.get(id) ?? []).forEach((c) => {
          index.get(c)?.forEach((v) => set.add(v));
        });
        index.set(id, set);
      } else {
        stack.push([id, true]);
        (childrenOf.get(id) ?? []).forEach((c) => stack.push([c, false]));
      }
    }

    subtreeValues.current = index;
    return index;
  }, [api, field]);

  // Recompute distinct values whenever the filter is opened.
  const refreshValues = React.useCallback(() => {
    const seen = new Set<string>();
    api.forEachNode((node: IRowNode) => {
      const v = node.data?.[field];
      if (v !== undefined && v !== null) seen.add(String(v));
    });
    setValues([...seen].sort());
  }, [api, field]);

  useGridFilter({
    doesFilterPass: ({ node }) => {
      if (!model) return true;
      const row = node.data as
        | (Record<string, unknown> & { id?: string })
        | undefined;
      if (model.includes(String(row?.[field]))) return true;
      const index = subtreeValues.current ?? buildIndex();
      const beneath = row?.id ? index.get(row.id) : undefined;
      return beneath ? model.some((m) => beneath.has(m)) : false;
    },
    afterGuiAttached: () => {
      refreshValues();
      buildIndex();
      setSearch("");
    },
  });

  const visible = React.useMemo(
    () =>
      search
        ? values.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
        : values,
    [values, search],
  );

  // `null` model means unfiltered, which displays as everything checked.
  const selected = model ?? values;
  const allChecked =
    visible.length > 0 && visible.every((v) => selected.includes(v));

  const toggle = (v: string) => {
    const next = selected.includes(v)
      ? selected.filter((x) => x !== v)
      : [...selected, v];
    onModelChange(next.length === values.length ? null : next);
  };

  const toggleAll = () => {
    if (allChecked) {
      onModelChange(selected.filter((v) => !visible.includes(v)));
    } else {
      const next = [...new Set([...selected, ...visible])];
      onModelChange(next.length === values.length ? null : next);
    }
  };

  return (
    <div style={{ padding: 8, minWidth: 200, maxWidth: 260 }}>
      <input
        type="search"
        aria-label="Search filter values"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          marginBottom: 6,
          padding: "4px 6px",
          fontSize: 12,
          background: "var(--cg-input-bg)",
          color: "var(--cg-text-primary)",
          border: "1px solid var(--cg-border)",
          borderRadius: 4,
        }}
      />
      <label
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          fontSize: 12,
          padding: "3px 2px",
          borderBottom: "1px solid var(--cg-border-subtle)",
          marginBottom: 4,
        }}
      >
        <input type="checkbox" checked={allChecked} onChange={toggleAll} />
        <span style={{ fontWeight: 600 }}>(Select all)</span>
      </label>
      <div style={{ maxHeight: 210, overflowY: "auto" }}>
        {visible.map((v) => (
          <label
            key={v}
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
              padding: "3px 2px",
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(v)}
              onChange={() => toggle(v)}
            />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {ICON_FIELDS.has(field) ? (
                <ValueWithIcon field={field} value={v} />
              ) : (
                v
              )}
            </span>
          </label>
        ))}
        {visible.length === 0 && (
          <div style={{ fontSize: 12, opacity: 0.6, padding: 4 }}>
            No matches
          </div>
        )}
      </div>
    </div>
  );
}

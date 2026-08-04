/* eslint-disable i18next/no-literal-string -- grid side panel */
import React from "react";
import {
  ChevronDown,
  ChevronRight,
  Columns3,
  Filter as FilterIcon,
  GripVertical,
  Search,
} from "lucide-react";
import type { ColGroupDef, ColDef, GridApi } from "ag-grid-community";
import { useTheme } from "#/context/theme-context";
import { chromeFor } from "./theme";
import { GridCheckbox } from "./GridCheckbox";

/**
 * Right-hand side panel with a vertical tab rail — our stand-in for the
 * Enterprise `SideBarModule` + `ColumnsToolPanelModule` +
 * `FiltersToolPanelModule`.
 *
 * The **Columns** tab reproduces the reference tool panel: a master row
 * (collapse-all / select-all / search) above a collapsible group tree, each
 * row carrying the same checkbox the grid uses plus a drag grip.
 *
 * The grip is not decorative — it reorders columns through Community's
 * `moveColumns`. A handle that looks draggable but is not is worse than no
 * handle, so it is wired to the real API.
 *
 * All of this runs on Community column-state APIs (`getColumnState`,
 * `setColumnsVisible`, `moveColumns`) — Enterprise ships the panel UI, not the
 * underlying capability.
 */

export type PanelTab = "columns" | "filters" | null;

interface Props {
  api: GridApi | null;
  groups: ColGroupDef[];
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
}

const railBtn = (active: boolean): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  padding: "10px 6px",
  borderRadius: 0,
  background: active ? "var(--cg-bg-card)" : "transparent",
  color: active ? "var(--cg-text-primary)" : "var(--cg-text-muted)",
  border: "none",
  borderLeft: active ? "2px solid var(--cg-accent)" : "2px solid transparent",
  fontSize: 12,
  letterSpacing: 0.2,
  cursor: "pointer",
});

const rowBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  height: 26,
  padding: "0 4px",
  fontSize: 12,
  color: "var(--cg-text-primary)",
  userSelect: "none",
};

const chevBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 14,
  flexShrink: 0,
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--cg-text-muted)",
  cursor: "pointer",
};

/** Vertical rule down a group's children, so hierarchy reads at a glance. */
const childBlock: React.CSSProperties = {
  marginLeft: 11,
  paddingLeft: 9,
  borderLeft: "1px solid var(--cg-border-subtle)",
};

const label: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

/** Splits a group's children into its sub-groups, preserving column order. */
function subGroupsOf(children: ColDef[]): { name: string; cols: ColDef[] }[] {
  const out: { name: string; cols: ColDef[] }[] = [];
  children.forEach((c) => {
    const name = (c.context?.subGroup as string) ?? "Other";
    const last = out[out.length - 1];
    if (last && last.name === name) last.cols.push(c);
    else out.push({ name, cols: [c] });
  });
  return out;
}

export function SidePanel({ api, groups, tab, onTab }: Props) {
  const { theme } = useTheme();
  const chrome = chromeFor(theme);
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  const [q, setQ] = React.useState("");
  // The two tabs list different things, so they search separately: carrying
  // one query across would silently hide rows on a tab you had not typed in.
  const [fq, setFq] = React.useState("");
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [hover, setHover] = React.useState<string | null>(null);
  const dragged = React.useRef<string | null>(null);

  const activeFilters = new Set(Object.keys(api?.getFilterModel() ?? {}));

  const hidden = new Set(
    (api?.getColumnState() ?? []).filter((c) => c.hide).map((c) => c.colId),
  );

  const setCols = (fields: string[], visible: boolean) => {
    api?.setColumnsVisible(fields, visible);
    force();
  };

  const allFields = groups.flatMap((g) =>
    (g.children as ColDef[]).map((c) => c.field as string),
  );
  const allOn = allFields.every((f) => !hidden.has(f));
  const someOn = allFields.some((f) => !hidden.has(f));
  const allCollapsed = collapsed.size === groups.length;

  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());
  const matchFilter = (s: string) => s.toLowerCase().includes(fq.toLowerCase());

  const toggleGroup = (name: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const toggleAllGroups = () =>
    setCollapsed(
      allCollapsed
        ? new Set()
        : new Set(groups.map((g) => g.headerName as string)),
    );

  /** Reorder via Community's moveColumns, using the live column order. */
  const onDrop = (targetField: string) => {
    const from = dragged.current;
    dragged.current = null;
    if (!from || !api || from === targetField) return;
    const to = api
      .getColumnState()
      .map((c) => c.colId)
      .indexOf(targetField);
    if (to < 0) return;
    api.moveColumns([from], to);
    force();
  };

  const rowStyle = (key: string, indent: number): React.CSSProperties => ({
    ...rowBase,
    paddingLeft: 4 + indent,
    background: hover === key ? "var(--cg-bg-hover)" : "transparent",
  });

  return (
    <div style={{ display: "flex", flexShrink: 0, height: "100%" }}>
      {tab && (
        <div
          style={{
            width: 248,
            borderLeft: "1px solid var(--cg-border-subtle)",
            background: chrome,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {tab === "columns" && (
            <>
              {/* Master row: collapse all · select all · search */}
              <div style={{ ...rowBase, height: 34, padding: "0 6px" }}>
                <button
                  type="button"
                  style={chevBtn}
                  onClick={toggleAllGroups}
                  aria-label={
                    allCollapsed ? "Expand all groups" : "Collapse all groups"
                  }
                >
                  {allCollapsed ? (
                    <ChevronRight size={13} />
                  ) : (
                    <ChevronDown size={13} />
                  )}
                </button>
                <GridCheckbox
                  checked={allOn}
                  indeterminate={!allOn && someOn}
                  onChange={() => setCols(allFields, !allOn)}
                  ariaLabel="Toggle all columns"
                />
                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <Search
                    size={12}
                    style={{
                      position: "absolute",
                      left: 6,
                      top: 6,
                      opacity: 0.5,
                    }}
                  />
                  <input
                    aria-label="Search columns"
                    placeholder="Search..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "3px 6px 3px 22px",
                      fontSize: 12,
                      background:
                        theme === "light"
                          ? "rgba(0,0,0,0.05)"
                          : "rgba(0,0,0,0.32)",
                      color: "var(--cg-text-primary)",
                      border: "1px solid var(--cg-border)",
                      borderRadius: 0,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ overflowY: "auto", padding: "2px 6px 8px" }}>
                {groups.map((g) => {
                  const gName = g.headerName as string;
                  const kids = (g.children as ColDef[]).filter(
                    (c) => match(c.headerName ?? "") || match(gName),
                  );
                  if (kids.length === 0) return null;
                  const fields = kids.map((c) => c.field as string);
                  const gOn = fields.every((f) => !hidden.has(f));
                  const gSome = fields.some((f) => !hidden.has(f));
                  const isCollapsed = collapsed.has(gName);

                  return (
                    <div key={gName}>
                      <div
                        style={rowStyle(gName, 0)}
                        onMouseEnter={() => setHover(gName)}
                        onMouseLeave={() => setHover(null)}
                      >
                        <button
                          type="button"
                          style={chevBtn}
                          onClick={() => toggleGroup(gName)}
                          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${gName}`}
                          aria-expanded={!isCollapsed}
                        >
                          {isCollapsed ? (
                            <ChevronRight size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          )}
                        </button>
                        <GridCheckbox
                          checked={gOn}
                          indeterminate={!gOn && gSome}
                          onChange={() => setCols(fields, !gOn)}
                          ariaLabel={gName}
                        />
                        <GripVertical
                          size={12}
                          style={{ opacity: 0.35, flexShrink: 0 }}
                        />
                        <span style={{ ...label, fontWeight: 600 }}>
                          {gName}
                        </span>
                      </div>

                      {!isCollapsed && (
                        <div style={childBlock}>
                          {subGroupsOf(kids).map((sg) => {
                            const sgKey = `${gName}/${sg.name}`;
                            const sgFields = sg.cols.map(
                              (c) => c.field as string,
                            );
                            const sgOn = sgFields.every((f) => !hidden.has(f));
                            const sgSome = sgFields.some((f) => !hidden.has(f));
                            const sgCollapsed = collapsed.has(sgKey);
                            return (
                              <div key={sgKey}>
                                <div
                                  style={rowStyle(sgKey, 0)}
                                  onMouseEnter={() => setHover(sgKey)}
                                  onMouseLeave={() => setHover(null)}
                                >
                                  <button
                                    type="button"
                                    style={chevBtn}
                                    onClick={() => toggleGroup(sgKey)}
                                    aria-label={`${sgCollapsed ? "Expand" : "Collapse"} ${sg.name}`}
                                    aria-expanded={!sgCollapsed}
                                  >
                                    {sgCollapsed ? (
                                      <ChevronRight size={12} />
                                    ) : (
                                      <ChevronDown size={12} />
                                    )}
                                  </button>
                                  <GridCheckbox
                                    checked={sgOn}
                                    indeterminate={!sgOn && sgSome}
                                    onChange={() => setCols(sgFields, !sgOn)}
                                    ariaLabel={sg.name}
                                  />
                                  <span
                                    style={{
                                      ...label,
                                      fontSize: 11,
                                      textTransform: "uppercase",
                                      letterSpacing: 0.4,
                                      color: "var(--cg-text-muted)",
                                    }}
                                  >
                                    {sg.name}
                                  </span>
                                </div>

                                {!sgCollapsed && (
                                  <div style={childBlock}>
                                    {sg.cols.map((c) => {
                                      const f = c.field as string;
                                      return (
                                        <div
                                          key={f}
                                          draggable
                                          onDragStart={() => {
                                            dragged.current = f;
                                          }}
                                          onDragOver={(e) => e.preventDefault()}
                                          onDrop={() => onDrop(f)}
                                          style={rowStyle(f, 0)}
                                          onMouseEnter={() => setHover(f)}
                                          onMouseLeave={() => setHover(null)}
                                        >
                                          <GridCheckbox
                                            checked={!hidden.has(f)}
                                            onChange={() =>
                                              setCols([f], hidden.has(f))
                                            }
                                            ariaLabel={c.headerName ?? f}
                                          />
                                          <GripVertical
                                            size={12}
                                            style={{
                                              opacity: 0.35,
                                              flexShrink: 0,
                                              cursor: "grab",
                                            }}
                                          />
                                          <span style={label}>
                                            {c.headerName ?? f}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === "filters" && (
            <>
              {/* Same search affordance as the columns tab: 60-odd filterable
                  fields are no more scannable here than they are there. */}
              <div style={{ ...rowBase, height: 34, padding: "0 6px" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <Search
                    size={12}
                    style={{
                      position: "absolute",
                      left: 6,
                      top: 6,
                      opacity: 0.5,
                    }}
                  />
                  <input
                    aria-label="Search filters"
                    placeholder="Search..."
                    value={fq}
                    onChange={(e) => setFq(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "3px 6px 3px 22px",
                      fontSize: 12,
                      background:
                        theme === "light"
                          ? "rgba(0,0,0,0.05)"
                          : "rgba(0,0,0,0.32)",
                      color: "var(--cg-text-primary)",
                      border: "1px solid var(--cg-border)",
                      borderRadius: 0,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ overflowY: "auto", padding: "4px 6px 8px" }}>
                {groups.map((g) => {
                  const gName = g.headerName as string;
                  const kids = (g.children as ColDef[]).filter(
                    (c) =>
                      c.filter !== false &&
                      // A group name match keeps the whole group, the way the
                      // columns tab behaves.
                      (matchFilter(c.headerName ?? (c.field as string)) ||
                        matchFilter(gName)),
                  );
                  if (kids.length === 0) return null;
                  const isCollapsed = collapsed.has(gName);
                  return (
                    <div key={gName}>
                      <div
                        style={rowStyle(`f:${gName}`, 0)}
                        onMouseEnter={() => setHover(`f:${gName}`)}
                        onMouseLeave={() => setHover(null)}
                      >
                        <button
                          type="button"
                          style={chevBtn}
                          onClick={() => toggleGroup(gName)}
                          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${gName}`}
                          aria-expanded={!isCollapsed}
                        >
                          {isCollapsed ? (
                            <ChevronRight size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          )}
                        </button>
                        <span style={{ ...label, fontWeight: 600 }}>
                          {gName}
                        </span>
                      </div>

                      {!isCollapsed && (
                        <div style={childBlock}>
                          {subGroupsOf(kids).map((sg) => (
                            <div key={`f:${gName}/${sg.name}`}>
                              <div
                                style={{
                                  ...rowBase,
                                  height: 20,
                                  fontSize: 10,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.4,
                                  color: "var(--cg-text-muted)",
                                }}
                              >
                                {sg.name}
                              </div>
                              <div style={childBlock}>
                                {sg.cols.map((c) => {
                                  const f = c.field as string;
                                  const active = activeFilters.has(f);
                                  return (
                                    <button
                                      key={f}
                                      type="button"
                                      onClick={() => api?.showColumnFilter(f)}
                                      onMouseEnter={() => setHover(`f:${f}`)}
                                      onMouseLeave={() => setHover(null)}
                                      style={{
                                        ...rowStyle(`f:${f}`, 0),
                                        width: "100%",
                                        border: "none",
                                        cursor: "pointer",
                                        textAlign: "left",
                                      }}
                                    >
                                      <FilterIcon
                                        size={11}
                                        style={{
                                          opacity: active ? 1 : 0.45,
                                          color: active
                                            ? "var(--cg-accent)"
                                            : "inherit",
                                          flexShrink: 0,
                                        }}
                                      />
                                      <span style={label}>
                                        {c.headerName ?? f}
                                      </span>
                                      {active && (
                                        <span
                                          style={{
                                            marginLeft: "auto",
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: "var(--cg-accent)",
                                            flexShrink: 0,
                                          }}
                                        />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <div
        style={{
          width: 30,
          flexShrink: 0,
          borderLeft: "1px solid var(--cg-border-subtle)",
          background: chrome,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <button
          type="button"
          style={railBtn(tab === "columns")}
          aria-pressed={tab === "columns"}
          onClick={() => onTab(tab === "columns" ? null : "columns")}
        >
          <Columns3 size={14} style={{ writingMode: "horizontal-tb" }} />
          <span style={{ writingMode: "vertical-rl" }}>Columns</span>
        </button>
        <button
          type="button"
          style={railBtn(tab === "filters")}
          aria-pressed={tab === "filters"}
          onClick={() => onTab(tab === "filters" ? null : "filters")}
        >
          <FilterIcon size={14} style={{ writingMode: "horizontal-tb" }} />
          <span style={{ writingMode: "vertical-rl" }}>Filters</span>
        </button>
      </div>
    </div>
  );
}

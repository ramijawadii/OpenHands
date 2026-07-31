# CloudGuard Data Grid Kit

A complete, **clone-and-adapt** data table for CloudGuard surfaces. Built on
**AG Grid Community (MIT) only** — no `ag-grid-enterprise`, no watermark, no
licence exposure.

The Enterprise features worth having are rebuilt here on Community APIs.
Copy this folder, swap the data layer and the column defs, and you have a new
table with the same behaviour and look.

---

## Why Community-only

Registering **even one** Enterprise module puts the grid into licensed mode and
renders AG Grid's watermark without a paid key — there is no partial mode. Full
analysis of the 40 Enterprise-only modules in 36.0.2, what each gates, and the
licence mechanics: [`docs/architecture/ag-grid/`](../../../../../../docs/architecture/ag-grid/).

| Enterprise module | Our replacement | Built on |
|---|---|---|
| `SetFilterModule` | `SetFilter.tsx` | `useGridFilter` |
| `SideBar` + `ColumnsToolPanel` | `SidePanel.tsx` | `getColumnState` / `setColumnsVisible` / `moveColumns` |
| `FiltersToolPanelModule` | `SidePanel.tsx` Filters tab | `showColumnFilter` |
| `ColumnMenuModule` | `HeaderMenu.tsx` + `HeaderCell.tsx` | `applyColumnState`, `setColumnsPinned`, `autoSizeColumns` |
| `ContextMenuModule` | `CellMenu.tsx` | `onCellContextMenu` |
| `SparklinesModule` | `Sparkline.tsx` | inline SVG (no chart engine) |
| `ExcelExportModule` | `exportDataAsCsv` | Community |
| `TreeDataModule` | flat `parentId` rows + external filter | `isExternalFilterPresent` / `doesExternalFilterPass` |

**Not rebuilt** — these replace the row model itself, and faking them means
reimplementing AG Grid: drag-to-group row-group panel, Pivot Mode, cross-group
aggregation, master/detail. If the product needs them, buy the licence.

---

## Files

| File | Role |
|---|---|
| `CloudGuardGrid.tsx` | Assembly, layout, viewport sizing, `--cgx-*` palette, scrollbars |
| `data.ts` | **Swap this.** Row type + generator + hierarchy |
| `columns.tsx` | **Swap this.** Column groups, renderers, filter assignment |
| `theme.ts` | Balham + `--cg-*` tokens, light/dark variants |
| `TreeCell.tsx` | Hierarchy cell — indent, chevron, icon |
| `SetFilter.tsx` | Checkbox set filter with search |
| `FloatingFilter.tsx` | Per-column filter launcher |
| `HeaderCell.tsx` / `HeaderMenu.tsx` | Header with `⋮` menu |
| `SidePanel.tsx` | Columns + Filters tool panels with rail |
| `CellMenu.tsx` | Right-click: copy, JSON export, ask-the-agent |
| `GridCheckbox.tsx` | Checkbox matching AG Grid's own |
| `icons.tsx` / `flags.tsx` / `SvgIcon.tsx` | Icon registries |
| `Sparkline.tsx` | Inline SVG trend |

---

## Cloning for a new table

1. **Copy the folder**, rename to `<feature>-grid`.
2. **Rewrite `data.ts`** — your row interface. Keep `id`, and if you want the
   tree keep `level` / `parentId` / `hasChildren`, generated **depth-first** so
   the flat array is already display order.
3. **Rewrite `columns.tsx`** — your `ColGroupDef[]`. Add low-cardinality fields
   to `SET_FILTER_FIELDS`.
4. **Extend `icons.tsx`** if you have new value types; add to `ICON_FIELDS` so
   the value renders identically in cells and filter lists.
5. **Drop the tree** if you don't need it: remove `TreeCell`, the
   `isExternalFilterPresent` / `doesExternalFilterPass` pair, and the
   `expanded` state.

---

## Traps already paid for

Each of these cost real debugging time. Do not reintroduce them.

- **Never put changing state in `cellRendererParams`.** A new object identity
  rebuilds every column on each change — losing pinning, widths and the header
  row. Use a **stable ref mutated in place**, then
  `refreshCells({ columns: [...] })`.
- **`doesExternalFilterPass` runs outside React's render cycle.** Read state
  from refs, or a stale closure silently shows the wrong rows.
- **Autosize on `firstDataRendered`, not `gridReady`.** On `gridReady` cells
  are empty, so every column collapses to header width.
- **Selection column is unpinned by default** and renders *after* pinned
  columns — i.e. mid-table. Pin it with `selectionColumnDef`.
- **`checkboxSelection` on a colDef is the legacy API.** With
  `rowSelection: { mode: 'multiRow' }` you get *two* checkbox columns.
- **`accentColor` must be a literal, not `var()`.** AG Grid colour-mixes it;
  colour-mix cannot resolve a variable and yields broken tints silently.
- **Semantic colours belong at `:root`, not scoped to the wrapper.** Filter
  popups render in a portal outside this DOM and would lose their colours.
- **`thesvg` subpaths are hyphenated** (`thesvg/microsoft-azure`) while its
  runtime export names are underscored. Its barrel is also unparseable —
  `export type` in a `.js` file — so always import per icon.
- **Import flags per country.** `import * as Flags` costs ~237KB for four.
- **Sorting the tree column breaks the hierarchy** — it reorders rows out of
  depth-first sequence. Keep it `sortable: false`.

---

## Verification checklist

```bash
npm run typecheck
npx eslint src/components/features/<feature>-grid --ext .ts,.tsx
npm run build
# No Enterprise code must ship:
grep -rl "ag-watermark\|LicenseManager" build/assets/   # must be empty
```

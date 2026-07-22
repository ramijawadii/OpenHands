/* eslint-disable @typescript-eslint/no-explicit-any, i18next/no-literal-string */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { HotTableRef } from "@handsontable/react-wrapper";
import { HotTable } from "@handsontable/react-wrapper";
import { registerAllModules } from "handsontable/registry";
import { textRenderer, registerRenderer } from "handsontable/renderers";
import FormulaParser from "fast-formula-parser";
import * as XLSX from "xlsx";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import { useConversationId } from "#/hooks/use-conversation-id";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  TableCellsMerge,
  Rows3,
  Columns3,
  Search as SearchIcon,
  FileDown,
  Sheet as SheetIcon,
  Save,
  Check,
  Keyboard,
  X,
} from "lucide-react";
// Handsontable v18 split CSS into a structural base + a theme (the old
// `dist/handsontable.full.min.css` no longer exists). We ship both themes and
// pick per app theme below.
import "handsontable/styles/handsontable.min.css";
// main theme ships light (`ht-theme-main`) + dark (`ht-theme-main-dark`) in one
// file; we pick the variant per app theme via `themeName`.
import "handsontable/styles/ht-theme-main.min.css";
import "./SpreadSheet.css";

// Handsontable modules are registered once for the whole app.
registerAllModules();

/** The Report tab shows one spreadsheet at a time, so a single module-level
 *  context is enough for the registered renderer to reach the live evaluated
 *  grid + formatting. The mounted component keeps this pointed at its refs. */
const RCTX: {
  evalGrid: any[][];
  fmt: FmtMap;
  styles: Map<string, { background?: string; color?: string }>;
  activeSheet: number;
} = { evalGrid: [], fmt: new Map(), styles: new Map(), activeSheet: 0 };

/** Classic renderer, registered by name (the react-wrapper's `renderer` prop
 *  expects a React component; a string name resolves to this classic fn). Shows
 *  the evaluated value for formula cells and applies our formatting classes. */
registerRenderer(
  "cgFormula",
  (instance: any, td: any, row: number, col: number, prop: any, value: any, cellProps: any) => {
    const display =
      typeof value === "string" && value.startsWith("=")
        ? RCTX.evalGrid[row]?.[col] ?? value
        : value;
    textRenderer(instance, td, row, col, prop, display, cellProps);
    const key = `${RCTX.activeSheet}:${row}:${col}`;
    const set = RCTX.fmt.get(key);
    if (set) set.forEach((cls) => td.classList.add(cls));
    const st = RCTX.styles.get(key);
    if (st?.background) td.style.background = st.background;
    if (st?.color) td.style.color = st.color;
  },
);

/** Formatting is stored outside Handsontable (which has no formatting model of
 *  its own) keyed by "sheet:row:col" → set of CSS classes, applied in the cell
 *  renderer. Alignment classes are HT built-ins (htLeft/htCenter/htRight);
 *  bold/italic/underline are ours (SpreadSheet.css). */
type FmtMap = Map<string, Set<string>>;
const fmtKey = (sheet: number, r: number, c: number) => `${sheet}:${r}:${c}`;
const ALIGN = ["htLeft", "htCenter", "htRight"];
const AUTOSAVE_PREFIX = "cg-sheet:";
/** blank rows + columns padded past the content so there is room to work */
const SPARE = 10;

interface Props {
  /** xlsx/csv bytes to render. Omit to show the built-in sample sheet. */
  arrayBuffer?: ArrayBuffer;
  filename?: string;
  /** Reports a successful parse + metadata (sheets, dims) to the health layer. */
  onReady?: (meta: Record<string, unknown>) => void;
  /** Reports a parse/display error to the health layer. */
  onDisplayError?: (error: string) => void;
  /** start from a blank editable grid (manual new sheet) rather than the sample */
  startBlank?: boolean;
  /** workspace-relative path to write on save (default: pages/<filename>.csv) */
  savePath?: string;
}

const blankSheet = (): Sheet => ({
  name: "Sheet1",
  data: Array.from({ length: 20 }, () => Array(8).fill("")),
});

interface MergeSpec {
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
}
/** inline styles that aren't class-based (background / text colour) */
type StyleMap = Map<string, { background?: string; color?: string }>;

interface Sheet {
  name: string;
  /** raw grid — formula cells keep their leading "=" so they stay editable */
  data: any[][];
  /** merged ranges preserved from the workbook */
  merges?: MergeSpec[];
  /** class-based formatting parsed from the workbook (bold/italic/align) */
  fmt?: Map<string, Set<string>>;
  /** colour styles parsed from the workbook, applied inline in the renderer */
  styles?: StyleMap;
}

// ── formula evaluation (MIT: fast-formula-parser, no GPL HyperFormula) ────────

/** Resolve every `=…` cell in a raw grid. Recursive with a cycle guard + memo,
 *  so a formula referencing another formula resolves and a circular reference
 *  degrades to #REF! instead of hanging. Pure over the grid it is given. */
function evaluateSheet(raw: any[][], sheetName: string): any[][] {
  const cache = new Map<string, any>();
  const inProgress = new Set<string>();

  const numify = (v: any) => {
    if (typeof v !== "string" || v === "") return v ?? null;
    const n = Number(v);
    return Number.isNaN(n) ? v : n;
  };

  const getVal = (row: number, col: number): any => {
    const key = `${row},${col}`;
    if (cache.has(key)) return cache.get(key);
    const rawVal = raw[row - 1]?.[col - 1];
    if (typeof rawVal === "string" && rawVal.startsWith("=")) {
      if (inProgress.has(key)) return "#REF!";
      inProgress.add(key);
      let res: any;
      try {
        res = parser.parse(rawVal.slice(1), { row, col, sheet: sheetName });
      } catch {
        res = "#ERROR!";
      }
      inProgress.delete(key);
      cache.set(key, res);
      return res;
    }
    const v = numify(rawVal);
    cache.set(key, v);
    return v;
  };

  const parser = new FormulaParser({
    onCell: (ref: any) => getVal(ref.row, ref.col),
    onRange: (ref: any) => {
      const out: any[][] = [];
      for (let r = ref.from.row; r <= ref.to.row; r += 1) {
        const row: any[] = [];
        for (let c = ref.from.col; c <= ref.to.col; c += 1)
          row.push(getVal(r, c));
        out.push(row);
      }
      return out;
    },
  });

  return raw.map((row, r) =>
    row.map((_, c) => {
      const cell = getVal(r + 1, c + 1);
      return cell == null ? "" : cell;
    }),
  );
}

// ── workbook parsing ─────────────────────────────────────────────────────────

const rgb = (hex?: string) =>
  hex ? `#${hex.length === 8 ? hex.slice(2) : hex}` : undefined;

/** Build raw grids from an xlsx/csv buffer, preserving formulas AND formatting
 *  (merges, bold/italic/alignment, background/text colour) so an uploaded sheet
 *  opens looking like it did in Excel. Styles need `cellStyles: true`. */
function parseWorkbook(buf: ArrayBuffer): Sheet[] {
  const wb = XLSX.read(buf, {
    type: "array",
    cellFormula: true,
    cellText: true,
    cellStyles: true,
  });
  return wb.SheetNames.map((name, si) => {
    const ws = wb.Sheets[name];
    const ref = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : null;
    const data: any[][] = [];
    const fmt = new Map<string, Set<string>>();
    const styles: StyleMap = new Map();
    if (ref) {
      for (let r = ref.s.r; r <= ref.e.r; r += 1) {
        const row: any[] = [];
        for (let c = ref.s.c; c <= ref.e.c; c += 1) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (!cell) {
            row.push("");
          } else {
            if (cell.f) row.push(`=${cell.f}`);
            else row.push(cell.v ?? "");
            const s = (cell as any).s;
            if (s) {
              const key = `${si}:${r}:${c}`;
              const cls = new Set<string>();
              if (s.font?.bold) cls.add("ss-bold");
              if (s.font?.italic) cls.add("ss-italic");
              if (s.font?.underline) cls.add("ss-underline");
              const h = s.alignment?.horizontal;
              if (h === "center") cls.add("htCenter");
              else if (h === "right") cls.add("htRight");
              else if (h === "left") cls.add("htLeft");
              if (cls.size) fmt.set(key, cls);
              const bg = rgb(s.fgColor?.rgb);
              const fg = rgb(s.color?.rgb);
              if (bg || fg) styles.set(key, { background: bg, color: fg });
            }
          }
        }
        data.push(row);
      }
    }
    const merges: MergeSpec[] = (ws["!merges"] ?? []).map((m: any) => ({
      row: m.s.r,
      col: m.s.c,
      rowspan: m.e.r - m.s.r + 1,
      colspan: m.e.c - m.s.c + 1,
    }));
    return { name, data, merges, fmt, styles };
  });
}

const SAMPLE: Sheet[] = [
  {
    name: "Findings",
    data: [
      ["Severity", "Service", "Count", "Weight", "Weighted"],
      ["Critical", "IAM", 14, 10, "=C2*D2"],
      ["High", "S3", 9, 6, "=C3*D3"],
      ["Medium", "EC2", 19, 3, "=C4*D4"],
      ["Low", "RDS", 11, 1, "=C5*D5"],
      ["Total", "", "=SUM(C2:C5)", "", "=SUM(E2:E5)"],
    ],
  },
];

/** Deep copy a grid so Handsontable owns its own array (it mutates in place). */
const cloneGrid = (g: any[][]) => g.map((r) => [...r]);

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: "Ctrl/⌘ + F", desc: "Focus the find box" },
  { keys: "Enter / Shift+Enter", desc: "Next / previous search match" },
  { keys: "Esc", desc: "Clear search" },
  { keys: "Ctrl/⌘ + S", desc: "Save (autosave + persist to workspace)" },
  { keys: "Ctrl/⌘ + Z / Y", desc: "Undo / redo" },
  { keys: "Ctrl/⌘ + C / V / X", desc: "Copy / paste / cut" },
  { keys: "Ctrl/⌘ + A", desc: "Select all" },
  { keys: "Arrows / Tab / Enter", desc: "Move between cells" },
  { keys: "Ctrl/⌘ + Arrow", desc: "Jump to edge of data" },
  { keys: "Shift + Arrow", desc: "Extend selection" },
  { keys: "Drag corner handle", desc: "Fill / copy into adjacent cells" },
  { keys: "Double-click", desc: "Edit cell" },
  { keys: "Delete / Backspace", desc: "Clear selected cells" },
  { keys: "Right-click", desc: "Context menu (insert, remove, align, …)" },
];

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="ss-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="ss-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ss-modal-head">
          <span>Keyboard shortcuts</span>
          <button
            type="button"
            className="ss-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>
        <div className="ss-modal-body">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="ss-shortcut-row">
              <kbd className="ss-kbd">{s.keys}</kbd>
              <span>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── component ────────────────────────────────────────────────────────────────

function SpreadSheet({
  arrayBuffer,
  filename,
  onReady,
  onDisplayError,
  startBlank,
  savePath,
}: Props) {
  const { conversationId } = useConversationId();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<{ row: number; col: number }[]>([]);
  const [matchIdx, setMatchIdx] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  // always-latest pointer so the keydown effect ([] deps) calls the current fn
  const saveToWorkspaceRef = useRef<() => void>(() => {});

  const hotRef = useRef<HotTableRef | null>(null);
  // `any`: plugin methods (undo/redo/getPlugin) aren't on the base type.
  const hot = (): any => hotRef.current?.hotInstance ?? null;

  // formatting map — a ref so the renderer always reads the latest; a counter
  // forces the React re-render that lights up the toolbar's active states.
  const fmtRef = useRef<FmtMap>(new Map());
  const [, bumpFmt] = useState(0);
  // evaluated grid for the ACTIVE sheet — recomputed only when data changes,
  // never per render, and read by the cell renderer.
  const evalRef = useRef<any[][]>([]);
  // colour styles parsed from an uploaded workbook, applied inline in renderer
  const styleRef = useRef<StyleMap>(new Map());

  const lsKey = filename ? `${AUTOSAVE_PREFIX}${filename}` : null;

  // The spreadsheet is deliberately theme-INVARIANT: it always presents in its
  // light styling regardless of the app theme (grid pinned to ht-theme-main;
  // the toolbar's --cg-* tokens are forced to light values on .ss-root in CSS).

  // ── load (with crash-recovery from localStorage) ──────────────────────────
  useEffect(() => {
    try {
      const parsed = arrayBuffer
        ? parseWorkbook(arrayBuffer)
        : startBlank
          ? [blankSheet()]
          : SAMPLE;
      let usable = parsed.filter((s) => s.data.length > 0);
      if (!usable.length) usable = startBlank ? [blankSheet()] : SAMPLE;

      // seed formatting parsed from the workbook (bold/italic/align + colours)
      const seededFmt: FmtMap = new Map();
      const seededStyles: StyleMap = new Map();
      usable.forEach((s) => {
        s.fmt?.forEach((v, k) => seededFmt.set(k, new Set(v)));
        s.styles?.forEach((v, k) => seededStyles.set(k, v));
      });
      fmtRef.current = seededFmt;
      styleRef.current = seededStyles;
      RCTX.styles = seededStyles;

      // recover a locally-autosaved edit if one exists for this file
      if (lsKey) {
        try {
          const saved = localStorage.getItem(lsKey);
          if (saved) {
            const j = JSON.parse(saved);
            if (Array.isArray(j.sheets) && j.sheets.length) {
              usable = j.sheets;
              fmtRef.current = new Map(
                (j.fmt ?? []).map(([k, v]: [string, string[]]) => [
                  k,
                  new Set(v),
                ]),
              );
              setDirty(true);
            }
          }
        } catch {
          /* ignore corrupt autosave */
        }
      }

      setSheets(usable);
      setActive(0);
      setError(null);
      onReady?.({
        kind: "spreadsheet",
        sheets: usable.map((s) => s.name),
        rows: usable[0]?.data.length ?? 0,
        cols: usable[0]?.data[0]?.length ?? 0,
        source: arrayBuffer ? "workbook" : "sample",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      onDisplayError?.(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrayBuffer]);

  const sheet = sheets[active];

  // Grid handed to Handsontable. Cloned + memoised per (file, sheet) ONLY, so
  // selection/format re-renders never re-pass data (which would run loadData
  // and wipe undo/selection/menus). HT owns edits from here on.
  const gridData = useMemo(() => {
    if (!sheet) return [];
    const base = cloneGrid(sheet.data);
    // Give the user room to work: 10 blank rows + 10 blank columns past content.
    const cols = Math.max(0, ...base.map((r) => r.length)) + SPARE;
    const padded = base.map((r) => {
      const rr = [...r];
      while (rr.length < cols) rr.push("");
      return rr;
    });
    for (let i = 0; i < SPARE; i += 1) padded.push(new Array(cols).fill(""));
    return padded;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.name, active, sheets.length]);

  const recomputeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Recompute the evaluated grid from HT's live source data + repaint. Wrapped
   *  so a bad formula can never break the render loop, and debounced so rapid
   *  typing on a large sheet batches into one evaluation pass. */
  const recompute = useCallback(
    (immediate = false) => {
      const run = () => {
        const inst = hot();
        if (!inst || !sheet) return;
        try {
          const raw = inst.getSourceData() as any[][];
          evalRef.current = evaluateSheet(raw, sheet.name);
          RCTX.evalGrid = evalRef.current;
          inst.render();
        } catch {
          /* keep the last good evaluated grid rather than crashing the view */
        }
      };
      if (recomputeTimer.current) clearTimeout(recomputeTimer.current);
      if (immediate) run();
      else recomputeTimer.current = setTimeout(run, 90);
    },
    [sheet],
  );

  const persistLocal = useCallback(() => {
    if (!lsKey) return;
    const inst = hot();
    if (!inst) return;
    try {
      const raw = inst.getSourceData() as any[][];
      const nextSheets = sheets.map((s, i) =>
        i === active ? { ...s, data: raw } : s,
      );
      localStorage.setItem(
        lsKey,
        JSON.stringify({
          sheets: nextSheets,
          fmt: Array.from(fmtRef.current.entries()).map(([k, v]) => [
            k,
            Array.from(v),
          ]),
          ts: Date.now(),
        }),
      );
      setSavedAt(
        new Date().toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch {
      /* quota / serialisation — non-fatal */
    }
  }, [lsKey, sheets, active]);

  // debounced autosave whenever the sheet becomes dirty
  useEffect(() => {
    if (!dirty) return undefined;
    const id = setTimeout(persistLocal, 800);
    return () => clearTimeout(id);
  }, [dirty, persistLocal]);

  const markDirty = useCallback(() => setDirty(true), []);

  // keep the module-level renderer context pointed at this instance's state
  RCTX.fmt = fmtRef.current;
  RCTX.styles = styleRef.current;
  RCTX.activeSheet = active;

  // recompute once the grid is mounted / data swapped
  useEffect(() => {
    recompute(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridData]);

  // ── stable HT callbacks (identity stability keeps updateSettings from
  //    firing on every render, which is what closed the context menu) ─────────
  const afterChange = useCallback(
    (changes: any, source: string) => {
      if (source === "loadData" || !changes) return;
      recompute();
      markDirty();
    },
    [recompute, markDirty],
  );

  const afterSelectionEnd = useCallback(
    (r: number, c: number) => setSel({ r: Math.max(0, r), c: Math.max(0, c) }),
    [],
  );

  // ── toolbar actions ────────────────────────────────────────────────────────
  const eachSelected = (fn: (r: number, c: number) => void) => {
    const inst = hot();
    const ranges = inst?.getSelectedRange();
    if (ranges && ranges.length) {
      ranges.forEach((range: any) => {
        const { from, to } = range;
        for (
          let r = Math.min(from.row, to.row);
          r <= Math.max(from.row, to.row);
          r += 1
        )
          for (
            let c = Math.min(from.col, to.col);
            c <= Math.max(from.col, to.col);
            c += 1
          )
            if (r >= 0 && c >= 0) fn(r, c);
      });
    } else if (sel) {
      fn(sel.r, sel.c);
    }
  };

  const toggleClass = (cls: string) => {
    eachSelected((r, c) => {
      const key = fmtKey(active, r, c);
      const set = fmtRef.current.get(key) ?? new Set<string>();
      if (set.has(cls)) set.delete(cls);
      else set.add(cls);
      fmtRef.current.set(key, set);
    });
    bumpFmt((n) => n + 1);
    markDirty();
    hot()?.render();
  };

  const setAlign = (cls: string) => {
    eachSelected((r, c) => {
      const key = fmtKey(active, r, c);
      const set = fmtRef.current.get(key) ?? new Set<string>();
      ALIGN.forEach((a) => set.delete(a));
      set.add(cls);
      fmtRef.current.set(key, set);
    });
    bumpFmt((n) => n + 1);
    markDirty();
    hot()?.render();
  };

  const activeOn = (cls: string): boolean => {
    let any = false;
    let all = true;
    eachSelected((r, c) => {
      any = true;
      if (!fmtRef.current.get(fmtKey(active, r, c))?.has(cls)) all = false;
    });
    return any && all;
  };

  const alter = (op: string) => {
    const inst = hot();
    if (!inst) return;
    const row = sel?.r ?? inst.countRows() - 1;
    const col = sel?.c ?? inst.countCols() - 1;
    if (op.includes("row")) inst.alter(op, row, 1);
    else inst.alter(op, col, 1);
    recompute();
    markDirty();
  };

  const toggleMergeSelection = () => {
    const inst = hot();
    const plugin = inst?.getPlugin("mergeCells");
    const range = inst?.getSelectedRangeLast();
    if (!plugin || !range) return;
    plugin.toggleMerge(range);
    inst.render();
    markDirty();
  };

  const doUndo = () => {
    hot()?.undo();
    recompute(true);
    markDirty();
  };
  const doRedo = () => {
    hot()?.redo();
    recompute(true);
    markDirty();
  };

  const buildWorkbook = () => {
    const inst = hot();
    const raw = (inst?.getSourceData() as any[][]) ?? sheet.data;
    const aoa = evaluateSheet(raw, sheet.name);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31) || "Sheet1");
    return wb;
  };

  const exportAs = (kind: "csv" | "xlsx") => {
    const base = (filename ?? "sheet").replace(/\.[^.]+$/, "");
    XLSX.writeFile(buildWorkbook(), `${base}.${kind}`, { bookType: kind });
  };

  /** Deterministic save: flush the local autosave, then write the file straight
   *  to the workspace through the upload endpoint (a FileWriteAction server-side).
   *  No agent, no prompt — this is a plain code-level write. */
  const saveToWorkspace = async () => {
    persistLocal();
    const rel =
      savePath ??
      (filename
        ? `pages/${filename.replace(/\.(xlsx|xls|xlsm)$/i, ".csv")}`
        : null);
    if (!conversationId || !rel) {
      setDirty(false);
      return;
    }
    try {
      const csv = XLSX.utils.sheet_to_csv(buildWorkbook().Sheets[sheet.name]);
      // filename carries the sub-path; the endpoint joins it under /workspace.
      const file = new File([csv], rel, { type: "text/csv" });
      await ConversationService.uploadFiles(conversationId, [file]);
      setDirty(false);
      setSavedAt(
        new Date().toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch {
      // leave dirty; the local autosave still holds the edit for recovery
    }
  };
  saveToWorkspaceRef.current = () => {
    void saveToWorkspace();
  };

  const commitFormula = (raw: string) => {
    if (!sel) return;
    hot()?.setDataAtCell(sel.r, sel.c, raw);
    // afterChange handles recompute + dirty
  };

  const jumpTo = (m: { row: number; col: number }) => {
    const inst = hot();
    if (!inst) return;
    inst.selectCell(m.row, m.col);
    inst.scrollViewportTo({ row: m.row, col: m.col, verticalSnap: "top" });
  };

  const runSearch = (q: string) => {
    setSearch(q);
    const inst = hot();
    if (!inst) return;
    const results = (inst.getPlugin("search").query(q) as any[]) ?? [];
    const ms = results.map((r) => ({ row: r.row, col: r.col }));
    setMatches(ms);
    setMatchIdx(0);
    inst.render();
    if (ms.length) jumpTo(ms[0]);
  };

  const stepMatch = (dir: 1 | -1) => {
    if (!matches.length) return;
    const next = (matchIdx + dir + matches.length) % matches.length;
    setMatchIdx(next);
    jumpTo(matches[next]);
  };

  // App-level shortcuts, active only while focus is inside this sheet so they
  // never hijack keys elsewhere. Ctrl/⌘+F focuses find; Ctrl/⌘+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!rootRef.current?.contains(document.activeElement)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveToWorkspaceRef.current();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  const cellRef =
    sel != null ? `${XLSX.utils.encode_col(sel.c)}${sel.r + 1}` : "";
  const rawAtSel =
    sel != null
      ? String(hot()?.getSourceDataAtCell(sel.r, sel.c) ?? "")
      : "";

  // The grid element is memoised on (data, theme) ONLY. The wrapper re-applies
  // updateSettings on every re-render it receives (its update effect has no dep
  // array), which closes an open context menu. Keeping this element reference
  // stable means a selection/toolbar re-render never reaches the grid, so the
  // menu stays open. All props below are already stable (useCallback/useMemo).
  const grid = useMemo(
    () => (
      <HotTable
        ref={hotRef}
        // Pinned to the light theme — the sheet stays light in both app themes.
        themeName="ht-theme-main"
        data={gridData}
        colHeaders
        rowHeaders
        filters
        dropdownMenu
        contextMenu
        manualColumnResize
        manualRowResize
        columnSorting
        comments
        // merges preserved from an uploaded workbook (empty array = none)
        mergeCells={sheet?.merges?.length ? sheet.merges : true}
        search
        undo
        // drag-fill: drag a cell's corner handle to copy/extend into others
        fillHandle
        // auto-fit column widths to content for the best display of uploads
        autoColumnSize={{ useHeaders: true, syncLimit: 60 }}
        autoWrapRow
        autoWrapCol
        width="100%"
        height="100%"
        stretchH="all"
        licenseKey="non-commercial-and-evaluation"
        // string renderer name resolves to our registered classic renderer;
        // spread past the wrapper's prop type, which only allows a component.
        {...({ renderer: "cgFormula" } as any)}
        afterChange={afterChange}
        afterSelectionEnd={afterSelectionEnd}
      />
    ),
    [gridData, afterChange, afterSelectionEnd],
  );

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center px-6 text-center text-[13px] text-[var(--cg-danger)]">
        Could not open {filename ?? "spreadsheet"}: {error}
      </div>
    );
  }
  if (!sheet) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[13px] text-[var(--cg-text-muted)]">
        Loading spreadsheet…
      </div>
    );
  }

  return (
    // `ss-root` creates an isolated stacking context so HT's high internal
    // z-indexes (headers ~210, menus 9999) can't paint over app-level drawers.
    <div
      ref={rootRef}
      className="ss-root flex h-full w-full flex-col overflow-hidden bg-[var(--cg-bg-page)]"
    >
      <div className="ss-toolbar">
        <span className="ss-cellref">{cellRef || "—"}</span>
        <input
          className="ss-formula"
          placeholder="value or =FORMULA"
          value={rawAtSel}
          disabled={!sel}
          onChange={(e) => commitFormula(e.target.value)}
          spellCheck={false}
        />

        <span className="ss-sep" />
        <button className="ss-btn" title="Undo" onClick={doUndo}>
          <Undo2 size={14} />
        </button>
        <button className="ss-btn" title="Redo" onClick={doRedo}>
          <Redo2 size={14} />
        </button>

        <span className="ss-sep" />
        <button
          className={`ss-btn ${activeOn("ss-bold") ? "is-active" : ""}`}
          title="Bold"
          onClick={() => toggleClass("ss-bold")}
        >
          <Bold size={14} />
        </button>
        <button
          className={`ss-btn ${activeOn("ss-italic") ? "is-active" : ""}`}
          title="Italic"
          onClick={() => toggleClass("ss-italic")}
        >
          <Italic size={14} />
        </button>
        <button
          className={`ss-btn ${activeOn("ss-underline") ? "is-active" : ""}`}
          title="Underline"
          onClick={() => toggleClass("ss-underline")}
        >
          <Underline size={14} />
        </button>

        <span className="ss-sep" />
        <button
          className={`ss-btn ${activeOn("htLeft") ? "is-active" : ""}`}
          title="Align left"
          onClick={() => setAlign("htLeft")}
        >
          <AlignLeft size={14} />
        </button>
        <button
          className={`ss-btn ${activeOn("htCenter") ? "is-active" : ""}`}
          title="Align center"
          onClick={() => setAlign("htCenter")}
        >
          <AlignCenter size={14} />
        </button>
        <button
          className={`ss-btn ${activeOn("htRight") ? "is-active" : ""}`}
          title="Align right"
          onClick={() => setAlign("htRight")}
        >
          <AlignRight size={14} />
        </button>

        <span className="ss-sep" />
        <button
          className="ss-btn"
          title="Insert row above"
          onClick={() => alter("insert_row_above")}
        >
          <Rows3 size={14} />＋
        </button>
        <button
          className="ss-btn"
          title="Insert column left"
          onClick={() => alter("insert_col_start")}
        >
          <Columns3 size={14} />＋
        </button>
        <button
          className="ss-btn"
          title="Remove row"
          onClick={() => alter("remove_row")}
        >
          <Rows3 size={14} />－
        </button>
        <button
          className="ss-btn"
          title="Remove column"
          onClick={() => alter("remove_col")}
        >
          <Columns3 size={14} />－
        </button>
        <button
          className="ss-btn"
          title="Merge / unmerge selected cells"
          onClick={toggleMergeSelection}
        >
          <TableCellsMerge size={14} />
        </button>

        <span className="ss-sep" />
        <div className="relative flex items-center">
          <SearchIcon
            size={13}
            style={{
              position: "absolute",
              left: 7,
              color: "var(--cg-text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            ref={searchInputRef}
            className="ss-search"
            style={{ paddingLeft: 24, paddingRight: search ? 52 : 8 }}
            placeholder="Find…"
            value={search}
            onChange={(e) => runSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                stepMatch(e.shiftKey ? -1 : 1);
              } else if (e.key === "Escape") {
                runSearch("");
              }
            }}
            spellCheck={false}
          />
          {search && (
            <span
              className="absolute right-1.5 text-[10px] tabular-nums"
              style={{ color: "var(--cg-text-muted)" }}
            >
              {matches.length ? `${matchIdx + 1}/${matches.length}` : "0/0"}
            </span>
          )}
        </div>
        <button
          className="ss-btn"
          title="Previous match (Shift+Enter)"
          disabled={!matches.length}
          onClick={() => stepMatch(-1)}
        >
          ‹
        </button>
        <button
          className="ss-btn"
          title="Next match (Enter)"
          disabled={!matches.length}
          onClick={() => stepMatch(1)}
        >
          ›
        </button>

        <span className="ss-sep" />
        <button className="ss-btn" title="Export CSV" onClick={() => exportAs("csv")}>
          <FileDown size={14} />
          CSV
        </button>
        <button className="ss-btn" title="Export XLSX" onClick={() => exportAs("xlsx")}>
          <SheetIcon size={14} />
          XLSX
        </button>

        <span className="ss-sep" />
        <button
          className={`ss-btn ${dirty ? "is-active" : ""}`}
          title="Save — writes the sheet to the workspace (autosaved locally too)"
          onClick={() => void saveToWorkspace()}
        >
          {dirty ? <Save size={14} /> : <Check size={14} />}
          {dirty ? "Save" : "Saved"}
        </button>
        <button
          className="ss-btn"
          title="Keyboard shortcuts"
          onClick={() => setShowShortcuts(true)}
        >
          <Keyboard size={14} />
        </button>
        <span className="ml-auto text-[10.5px] text-[var(--cg-text-muted)]">
          {dirty
            ? "unsaved changes"
            : savedAt
              ? `autosaved ${savedAt}`
              : ""}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{grid}</div>

      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      {sheets.length > 1 && (
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-[var(--cg-border-subtle)] bg-[var(--cg-bg-sidebar)] px-2 py-1">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setActive(i)}
              className={`shrink-0 rounded px-2 py-0.5 text-[11px] transition-colors ${
                i === active
                  ? "bg-[var(--cg-bg-card)] text-[var(--cg-text-primary)]"
                  : "text-[var(--cg-text-nav)] hover:text-[var(--cg-text-primary)]"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SpreadSheet;

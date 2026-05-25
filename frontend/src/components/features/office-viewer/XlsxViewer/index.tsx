/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import "./XlsxViewer.css";
import { CG_ASK_ABOUT_EVENT } from "#/hooks/chat/use-chat-input-logic";

interface Props {
  arrayBuffer: ArrayBuffer;
  filename?: string;
}

interface CellCoord { r: number; c: number }
interface MergeCell { s: CellCoord; e: CellCoord }

const MAX_ROWS = 1000;
const MAX_COLS = 52;

function colLabel(c: number): string {
  return XLSX.utils.encode_col(c);
}

function toRgb(hex: string): string {
  return hex.length === 8 ? hex.slice(2) : hex;
}

function cellStyle(cell: any): React.CSSProperties {
  if (!cell?.s) return {};
  const s = cell.s;
  const style: React.CSSProperties = {};
  if (s.fgColor?.rgb) style.backgroundColor = `#${toRgb(s.fgColor.rgb)}`;
  if (s.font?.bold) style.fontWeight = 700;
  if (s.font?.italic) style.fontStyle = "italic";
  if (s.font?.color?.rgb) style.color = `#${toRgb(s.font.color.rgb)}`;
  if (s.alignment?.horizontal) style.textAlign = s.alignment.horizontal as any;
  if (s.alignment?.wrapText) style.whiteSpace = "normal";
  return style;
}

function typeClass(cell: any): string {
  if (!cell) return "";
  if (cell.f) return "xlsx-formula";
  switch (cell.t) {
    case "n": return "xlsx-num";
    case "b": return "xlsx-bool";
    case "e": return "xlsx-err";
    default: return "";
  }
}

function cellDisplay(cell: any): string {
  if (!cell) return "";
  if (cell.w !== undefined && cell.w !== null) return String(cell.w);
  if (cell.v instanceof Date) return cell.v.toLocaleDateString();
  if (cell.v !== undefined && cell.v !== null) return String(cell.v);
  return "";
}

// ── Selection helpers ─────────────────────────────────────────────────────────

interface NormRange { r1: number; c1: number; r2: number; c2: number }

function normalizeRange(a: CellCoord, b: CellCoord): NormRange {
  return {
    r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c),
    r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c),
  };
}

function isCellInRange(r: number, c: number, a: CellCoord | null, b: CellCoord | null): boolean {
  if (!a || !b) return false;
  const { r1, c1, r2, c2 } = normalizeRange(a, b);
  return r >= r1 && r <= r2 && c >= c1 && c <= c2;
}

function rangeAddress(a: CellCoord, b: CellCoord): string {
  const { r1, c1, r2, c2 } = normalizeRange(a, b);
  const start = XLSX.utils.encode_cell({ r: r1, c: c1 });
  const end = XLSX.utils.encode_cell({ r: r2, c: c2 });
  return start === end ? start : `${start}:${end}`;
}

function isMultiCell(a: CellCoord | null, b: CellCoord | null): boolean {
  if (!a || !b) return false;
  return a.r !== b.r || a.c !== b.c;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function XlsxViewer({ arrayBuffer, filename = "workbook.xlsx" }: Props) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [selectedCell, setSelectedCell] = useState<string>("A1");
  const [error, setError] = useState<string | null>(null);
  const [selectionStats, setSelectionStats] = useState<{ sum: number; avg: number; count: number } | null>(null);

  // ── Drag selection state ──────────────────────────────────────────────────
  const [selAnchor, setSelAnchor] = useState<CellCoord | null>(null);
  const [selHead, setSelHead] = useState<CellCoord | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [popup, setPopup] = useState<{ rangeStr: string; x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ rangeStr: string; x: number; y: number } | null>(null);

  // Refs for auto-scroll during drag
  const gridAreaRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const selAnchorRef = useRef<CellCoord | null>(null);
  selAnchorRef.current = selAnchor;

  // ── Load workbook ─────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const wb = XLSX.read(arrayBuffer, {
        type: "array",
        cellStyles: true,
        cellFormula: true,
        cellDates: true,
        sheetStubs: true,
      });
      setWorkbook(wb);
      setActiveSheet(wb.SheetNames[0] ?? "");
      setSelectedCell("A1");
      setSelAnchor(null);
      setSelHead(null);
      setPopup(null);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
    }
  }, [arrayBuffer]);

  // Close popup/context-menu on outside click
  useEffect(() => {
    if (!popup) return;
    const handler = () => setPopup(null);
    window.addEventListener("mousedown", handler, { capture: true });
    return () => window.removeEventListener("mousedown", handler, { capture: true });
  }, [popup]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("mousedown", handler, { capture: true });
    return () => window.removeEventListener("mousedown", handler, { capture: true });
  }, [contextMenu]);

  // ── Auto-scroll + selection extension during drag ─────────────────────────
  useEffect(() => {
    if (!isDragging) {
      if (scrollAnimRef.current !== null) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
      return;
    }

    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const tick = () => {
      const el = gridAreaRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const { x, y } = mousePosRef.current;
        const zone = 50;
        let dx = 0;
        let dy = 0;
        if (x > rect.right - zone) dx = Math.min(16, (x - (rect.right - zone)) * 0.4);
        else if (x < rect.left + zone) dx = -Math.min(16, ((rect.left + zone) - x) * 0.4);
        if (y > rect.bottom - zone) dy = Math.min(16, (y - (rect.bottom - zone)) * 0.4);
        else if (y < rect.top + zone) dy = -Math.min(16, ((rect.top + zone) - y) * 0.4);

        if (dx !== 0 || dy !== 0) {
          el.scrollBy(dx, dy);
          // After scrolling, re-detect which cell the cursor is over and extend selection
          const underCursor = document.elementFromPoint(x, y);
          const td = underCursor?.closest("td[data-cellrow]") as HTMLElement | null;
          if (td) {
            const r = parseInt(td.dataset.cellrow ?? "", 10);
            const c = parseInt(td.dataset.cellcol ?? "", 10);
            if (!isNaN(r) && !isNaN(c)) {
              setSelHead({ r, c });
            }
          }
        }
      }
      scrollAnimRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMouseMove);
    scrollAnimRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (scrollAnimRef.current !== null) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
    };
  }, [isDragging]);

  // ── Active worksheet ──────────────────────────────────────────────────────
  const ws = useMemo(
    () => (workbook && activeSheet ? workbook.Sheets[activeSheet] : null),
    [workbook, activeSheet],
  );

  // ── Decode range ──────────────────────────────────────────────────────────
  const { startR, startC, endR, endC, isCapped, totalRows, totalCols } = useMemo(() => {
    if (!ws || !ws["!ref"]) {
      return { startR: 0, startC: 0, endR: 0, endC: 0, isCapped: false, totalRows: 0, totalCols: 0 };
    }
    const range = XLSX.utils.decode_range(ws["!ref"]);
    const tr = range.e.r - range.s.r + 1;
    const tc = range.e.c - range.s.c + 1;
    const cappedR = Math.min(range.e.r, range.s.r + MAX_ROWS - 1);
    const cappedC = Math.min(range.e.c, range.s.c + MAX_COLS - 1);
    return {
      startR: range.s.r,
      startC: range.s.c,
      endR: cappedR,
      endC: cappedC,
      isCapped: tr > MAX_ROWS || tc > MAX_COLS,
      totalRows: tr,
      totalCols: tc,
    };
  }, [ws]);

  // ── Build merge skip set ──────────────────────────────────────────────────
  const { skipSet, mergeMap } = useMemo(() => {
    const skip = new Set<string>();
    const mmap = new Map<string, { colspan: number; rowspan: number }>();
    for (const m of (ws?.["!merges"] ?? []) as MergeCell[]) {
      for (let r = m.s.r; r <= m.e.r; r++) {
        for (let c = m.s.c; c <= m.e.c; c++) {
          if (r !== m.s.r || c !== m.s.c) {
            skip.add(`${r},${c}`);
          } else {
            mmap.set(`${r},${c}`, {
              colspan: m.e.c - m.s.c + 1,
              rowspan: m.e.r - m.s.r + 1,
            });
          }
        }
      }
    }
    return { skipSet: skip, mergeMap: mmap };
  }, [ws]);

  // ── Column widths / row heights ───────────────────────────────────────────
  const colWidthPx = useCallback(
    (c: number): number => {
      const wch = (ws?.["!cols"] as any[])?.[c]?.wch;
      return Math.max(60, (wch ?? 10) * 7);
    },
    [ws],
  );

  const rowHeightPx = useCallback(
    (r: number): number => {
      const hpx = (ws?.["!rows"] as any[])?.[r]?.hpx;
      return hpx ?? 22;
    },
    [ws],
  );

  // ── Formula bar ───────────────────────────────────────────────────────────
  const formulaBarValue = useMemo(() => {
    if (!ws || !selectedCell) return "";
    const cell = ws[selectedCell];
    if (!cell) return "";
    if (cell.f) return `=${cell.f}`;
    return cell.w ?? String(cell.v ?? "");
  }, [ws, selectedCell]);

  const nameBoxValue = useMemo(() => {
    if (selAnchor && selHead && isMultiCell(selAnchor, selHead)) {
      return rangeAddress(selAnchor, selHead);
    }
    return selectedCell;
  }, [selAnchor, selHead, selectedCell]);

  // ── Cell click (single) ───────────────────────────────────────────────────
  const handleCellClick = useCallback(
    (r: number, c: number) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      setSelectedCell(addr);
      if (!ws) return;
      const cell = ws[addr];
      if (cell?.t === "n" && typeof cell.v === "number") {
        setSelectionStats({ sum: cell.v, avg: cell.v, count: 1 });
      } else {
        setSelectionStats(null);
      }
    },
    [ws],
  );

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleCellMouseDown = useCallback((r: number, c: number, e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setSelAnchor({ r, c });
    setSelHead({ r, c });
    setPopup(null);
    handleCellClick(r, c);
  }, [handleCellClick]);

  const handleCellMouseEnter = useCallback((r: number, c: number) => {
    if (!isDragging) return;
    setSelHead({ r, c });
  }, [isDragging]);

  // Mouse-up: end drag, show popup if multi-cell
  useEffect(() => {
    if (!isDragging) return;
    const onMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      setSelHead((head) => {
        setSelAnchor((anchor) => {
          if (anchor && head && isMultiCell(anchor, head)) {
            setPopup({ rangeStr: rangeAddress(anchor, head), x: e.clientX, y: e.clientY });
          }
          return anchor;
        });
        return head;
      });
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [isDragging]);

  // ── "Ask about this" ──────────────────────────────────────────────────────
  const handleAskAbout = useCallback((rangeStr: string, closePopup: () => void) => {
    const sheetLabel = activeSheet ? `${activeSheet}!` : "";
    const text = `[Spreadsheet: ${filename} · ${sheetLabel}${rangeStr}] `;
    window.dispatchEvent(new CustomEvent(CG_ASK_ABOUT_EVENT, { detail: { text } }));
    closePopup();
  }, [activeSheet, filename]);

  // ── Right-click context menu ───────────────────────────────────────────────
  const handleCellContextMenu = useCallback((r: number, c: number, e: React.MouseEvent) => {
    e.preventDefault();
    const addr = XLSX.utils.encode_cell({ r, c });
    let rangeStr = addr;
    if (selAnchor && selHead && isMultiCell(selAnchor, selHead) && isCellInRange(r, c, selAnchor, selHead)) {
      rangeStr = rangeAddress(selAnchor, selHead);
    }
    setContextMenu({ x: e.clientX, y: e.clientY, rangeStr });
  }, [selAnchor, selHead]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="xlsx-shell">
        <div className="xlsx-empty">⚠ {error}</div>
      </div>
    );
  }
  if (!workbook) {
    return (
      <div className="xlsx-shell">
        <div className="xlsx-empty">Loading…</div>
      </div>
    );
  }

  const rows: React.ReactNode[] = [];

  const colHeaders: React.ReactNode[] = [<th key="corner" className="xlsx-corner" />];
  for (let c = startC; c <= endC; c++) {
    colHeaders.push(
      <th key={c} className="xlsx-col-header" style={{ minWidth: colWidthPx(c), width: colWidthPx(c) }}>
        {colLabel(c)}
      </th>,
    );
  }
  rows.push(<tr key="header">{colHeaders}</tr>);

  for (let r = startR; r <= endR; r++) {
    const cells: React.ReactNode[] = [
      <td key="rn" className="xlsx-row-num" style={{ height: rowHeightPx(r) }}>{r + 1}</td>,
    ];
    for (let c = startC; c <= endC; c++) {
      if (skipSet.has(`${r},${c}`)) continue;
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws ? ws[addr] : undefined;
      const merge = mergeMap.get(`${r},${c}`);
      const tc = typeClass(cell);
      const extraStyle = cellStyle(cell);
      const inDragRange = isCellInRange(r, c, selAnchor, selHead) && isMultiCell(selAnchor, selHead);
      cells.push(
        <td
          key={c}
          data-cellrow={r}
          data-cellcol={c}
          className={`xlsx-cell${tc ? ` ${tc}` : ""}${selectedCell === addr && !inDragRange ? " selected" : ""}${inDragRange ? " xlsx-range-selected" : ""}`}
          style={{ minWidth: colWidthPx(c), width: colWidthPx(c), height: rowHeightPx(r), ...extraStyle }}
          colSpan={merge?.colspan}
          rowSpan={merge?.rowspan}
          onMouseDown={(e) => handleCellMouseDown(r, c, e)}
          onMouseEnter={() => handleCellMouseEnter(r, c)}
          onClick={() => { if (!isMultiCell(selAnchor, selHead)) handleCellClick(r, c); }}
          onContextMenu={(e) => handleCellContextMenu(r, c, e)}
          title={cell?.f ? `=${cell.f}` : undefined}
        >
          {cellDisplay(cell)}
        </td>,
      );
    }
    rows.push(<tr key={r}>{cells}</tr>);
  }

  const sheetDims = ws?.["!ref"] ?? "empty";

  return (
    <div className="xlsx-shell">
      {/* Sheet tabs */}
      <div className="xlsx-tabs">
        {workbook.SheetNames.map((name) => (
          <button
            key={name}
            type="button"
            className={`xlsx-tab${name === activeSheet ? " active" : ""}`}
            onClick={() => {
              setActiveSheet(name);
              setSelectedCell("A1");
              setSelectionStats(null);
              setSelAnchor(null);
              setSelHead(null);
              setPopup(null);
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Formula bar */}
      <div className="xlsx-formulabar">
        <span className="xlsx-cell-addr">{nameBoxValue}</span>
        <span className="xlsx-formulabar-fx">fx</span>
        <span className="xlsx-formula-value">{formulaBarValue}</span>
      </div>

      {/* Cap banner */}
      {isCapped && (
        <div className="xlsx-cap-banner">
          Showing first {Math.min(MAX_ROWS, totalRows)} rows × {Math.min(MAX_COLS, totalCols)} columns
          of {totalRows} × {totalCols} — sheet truncated for performance
        </div>
      )}

      {/* Grid */}
      <div className="xlsx-grid-area" ref={gridAreaRef} style={{ userSelect: "none" }}>
        {(!ws || !ws["!ref"]) ? (
          <div className="xlsx-empty">Sheet is empty</div>
        ) : (
          <table className="xlsx-table">
            <thead>{rows[0]}</thead>
            <tbody>{rows.slice(1)}</tbody>
          </table>
        )}
      </div>

      {/* Status bar */}
      <div className="xlsx-status">
        <span>{filename} · {activeSheet} · {sheetDims}</span>
        <span className="xlsx-status-right">
          {selectionStats && (
            <>
              <span>SUM: {selectionStats.sum}</span>
              <span>AVG: {selectionStats.avg}</span>
              <span>COUNT: {selectionStats.count}</span>
            </>
          )}
        </span>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="xlsx-context-menu"
          style={{
            position: "fixed",
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            top: Math.min(contextMenu.y, window.innerHeight - 120),
            zIndex: 9998,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="xlsx-ctx-range">{contextMenu.rangeStr}</div>
          <button
            type="button"
            className="xlsx-ctx-item"
            onClick={() => handleAskAbout(contextMenu.rangeStr, () => setContextMenu(null))}
          >
            Ask about this
          </button>
          <button
            type="button"
            className="xlsx-ctx-item"
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.rangeStr);
              setContextMenu(null);
            }}
          >
            Copy reference
          </button>
        </div>
      )}

      {/* Ask about this popup */}
      {popup && (
        <div
          className="xlsx-ask-popup"
          style={{
            position: "fixed",
            left: Math.min(popup.x + 8, window.innerWidth - 280),
            top: Math.min(popup.y + 8, window.innerHeight - 80),
            zIndex: 9999,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="xlsx-ask-range">{popup.rangeStr}</span>
          <button type="button" className="xlsx-ask-btn" onClick={() => handleAskAbout(popup!.rangeStr, () => setPopup(null))}>
            Ask agent about this
          </button>
          <button
            type="button"
            className="xlsx-ask-dismiss"
            onClick={() => setPopup(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default XlsxViewer;

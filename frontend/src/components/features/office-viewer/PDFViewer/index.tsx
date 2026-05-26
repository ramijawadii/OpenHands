/* eslint-disable */
/* tslint:disable */
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { TextLayerBuilder } from "pdfjs-dist/web/pdf_viewer.mjs";
import "pdfjs-dist/web/pdf_viewer.css";
import "./PDFViewer.css";

// Worker — Vite ?url import gives the asset URL of the minified worker bundle
import PDFWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWorkerUrl;

type PDFDocProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;

interface Props {
  arrayBuffer: ArrayBuffer;
  filename?: string;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 4.0;
const SCALE_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];

export function PDFViewer({ arrayBuffer, filename = "document.pdf" }: Props) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Find state
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findResults, setFindResults] = useState<
    { page: number; index: number }[]
  >([]);
  const [findPos, setFindPos] = useState(0);
  const [findCase, setFindCase] = useState(false);
  const pageTexts = useRef<Record<number, string>>({});

  const surroundRef = useRef<HTMLDivElement>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Per-page DOM refs and rendered-flag map
  const pageContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const renderedPages = useRef<Set<number>>(new Set());
  const renderingPages = useRef<Set<number>>(new Set());

  // ── Load PDF ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    renderedPages.current.clear();
    renderingPages.current.clear();
    pageTexts.current = {};

    const copy = arrayBuffer.slice(0);
    const task = pdfjsLib.getDocument({ data: copy });
    task.promise
      .then(async (doc) => {
        // Compute page-fit scale before surfacing the doc — all state updates
        // below are React-batched, so IntersectionObserver fires once with the
        // correct scale already set, preventing a double-render flicker.
        let fitScale = 1.0;
        if (surroundRef.current && surroundRef.current.clientWidth > 0) {
          try {
            const pg = await doc.getPage(1);
            const vp = pg.getViewport({ scale: 1 });
            const containerW = surroundRef.current.clientWidth - 40;
            fitScale = Math.max(
              MIN_SCALE,
              Math.min(MAX_SCALE, containerW / vp.width),
            );
          } catch {
            // keep 1.0 fallback
          }
        }
        setScale(fitScale);
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load PDF");
        setIsLoading(false);
      });
    return () => {
      task.destroy();
    };
  }, [arrayBuffer]);

  // ── Render a single page into its container ───────────────────────────────
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc) return;
      if (renderedPages.current.has(pageNum)) return;
      if (renderingPages.current.has(pageNum)) return;
      const container = pageContainerRefs.current[pageNum];
      if (!container) return;

      renderingPages.current.add(pageNum);
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // ── Canvas layer ──
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas 2d context unavailable");
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        // ── Text layer ──
        const textLayerDiv = document.createElement("div");
        textLayerDiv.className = "textLayer";
        textLayerDiv.style.cssText = `position:absolute;inset:0;overflow:hidden;`;
        try {
          const tlb = new TextLayerBuilder({ pdfPage: page });
          textLayerDiv.appendChild(tlb.div);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await tlb.render({ viewport, images: [] as any });
        } catch {
          // skip text layer silently — canvas rendering is what matters
        }

        // Cache text for find
        try {
          const content = await page.getTextContent();
          pageTexts.current[pageNum] = (content.items as any[])
            .map((i) => i.str)
            .join("");
        } catch {
          /* non-critical */
        }

        container.style.width = `${Math.floor(viewport.width)}px`;
        container.style.height = `${Math.floor(viewport.height)}px`;
        container.appendChild(canvas);
        container.appendChild(textLayerDiv);
        renderedPages.current.add(pageNum);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        container.innerHTML = `<div style="color:#f48771;padding:12px;font-size:12px;font-family:monospace">Page ${pageNum} render error: ${msg}</div>`;
      } finally {
        renderingPages.current.delete(pageNum);
      }
    },
    [pdfDoc, scale],
  );

  // ── Eagerly render page 1 when doc first loads (before observer fires) ──────
  useEffect(() => {
    if (!pdfDoc) return;
    // Short delay so page containers are in the DOM before we render
    const t = setTimeout(() => renderPage(1), 100);
    return () => clearTimeout(t);
  }, [pdfDoc, renderPage]);

  // ── IntersectionObserver — lazy-render visible pages ──────────────────────
  useEffect(() => {
    if (!pdfDoc || !surroundRef.current) return;

    // Reset rendered state when scale changes
    renderedPages.current.clear();
    renderingPages.current.clear();
    // Clear container children
    for (const [, el] of Object.entries(pageContainerRefs.current)) {
      if (el) el.innerHTML = "";
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = Number((entry.target as HTMLElement).dataset.page);
            renderPage(pageNum);
          }
        }
      },
      { root: surroundRef.current, rootMargin: "200px 0px" },
    );

    // Observe all page containers
    for (let i = 1; i <= numPages; i++) {
      const el = pageContainerRefs.current[i];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [pdfDoc, numPages, scale, renderPage]);

  // ── Scroll → currentPage sync ─────────────────────────────────────────────
  useEffect(() => {
    const surround = surroundRef.current;
    if (!surround) return;
    const onScroll = () => {
      let best = 1;
      let bestOverlap = -1;
      for (let i = 1; i <= numPages; i++) {
        const el = pageContainerRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const surroundRect = surround.getBoundingClientRect();
        const overlap =
          Math.min(rect.bottom, surroundRect.bottom) -
          Math.max(rect.top, surroundRect.top);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          best = i;
        }
      }
      setCurrentPage(best);
    };
    surround.addEventListener("scroll", onScroll, { passive: true });
    return () => surround.removeEventListener("scroll", onScroll);
  }, [numPages]);

  // ── Navigate to page ──────────────────────────────────────────────────────
  const goToPage = useCallback(
    (n: number) => {
      const target = Math.max(1, Math.min(numPages, n));
      const el = pageContainerRefs.current[target];
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(target);
    },
    [numPages],
  );

  // ── Keyboard: Ctrl+F ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setFindOpen(true);
        setTimeout(() => findInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && findOpen) {
        setFindOpen(false);
        setFindQuery("");
        setFindResults([]);
        clearHighlights();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [findOpen]);

  // ── Page-fit zoom ─────────────────────────────────────────────────────────
  const pageFit = useCallback(async () => {
    if (!pdfDoc || !surroundRef.current) return;
    const page = await pdfDoc.getPage(1);
    const vp = page.getViewport({ scale: 1 });
    const containerW = surroundRef.current.clientWidth - 40;
    setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, containerW / vp.width)));
  }, [pdfDoc]);

  const zoomIn = () =>
    setScale((s) => {
      const next = SCALE_STEPS.find((v) => v > s);
      return Math.min(MAX_SCALE, next ?? s + 0.25);
    });
  const zoomOut = () =>
    setScale((s) => {
      const prev = [...SCALE_STEPS].reverse().find((v) => v < s);
      return Math.max(MIN_SCALE, prev ?? s - 0.25);
    });

  // ── Find logic ────────────────────────────────────────────────────────────
  const clearHighlights = () => {
    document.querySelectorAll(".pdf-find-mark").forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent ?? ""), el);
        parent.normalize();
      }
    });
  };

  const runFind = useCallback(
    async (query: string, caseSens: boolean) => {
      clearHighlights();
      if (!query || !pdfDoc) {
        setFindResults([]);
        return;
      }
      // Ensure we have text for all pages
      for (let i = 1; i <= numPages; i++) {
        if (!pageTexts.current[i]) {
          try {
            const pg = await pdfDoc.getPage(i);
            const ct = await pg.getTextContent();
            pageTexts.current[i] = (ct.items as any[])
              .map((x) => x.str)
              .join("");
          } catch {
            /* skip */
          }
        }
      }
      const results: { page: number; index: number }[] = [];
      const cmp = caseSens ? query : query.toLowerCase();
      for (let p = 1; p <= numPages; p++) {
        const text = caseSens
          ? (pageTexts.current[p] ?? "")
          : (pageTexts.current[p] ?? "").toLowerCase();
        let idx = 0;
        while ((idx = text.indexOf(cmp, idx)) !== -1) {
          results.push({ page: p, index: idx });
          idx += cmp.length;
        }
      }
      setFindResults(results);
      setFindPos(0);
      if (results.length > 0) goToPage(results[0].page);
    },
    [pdfDoc, numPages, goToPage],
  );

  const navigateFind = (dir: 1 | -1) => {
    if (findResults.length === 0) return;
    const next = (findPos + dir + findResults.length) % findResults.length;
    setFindPos(next);
    goToPage(findResults[next].page);
  };

  // ── Placeholder height for unrendered pages ───────────────────────────────
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});
  useEffect(() => {
    if (!pdfDoc) return;
    (async () => {
      const heights: Record<number, number> = {};
      const containerW = (surroundRef.current?.clientWidth ?? 800) - 40;
      for (let i = 1; i <= numPages; i++) {
        const pg = await pdfDoc.getPage(i);
        const vp = pg.getViewport({ scale: 1 });
        heights[i] = (containerW / vp.width) * vp.height * (scale / 1);
      }
      setPageHeights(heights);
    })();
  }, [pdfDoc, numPages, scale]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pdf-shell">
      {/* Toolbar */}
      <div className="pdf-toolbar">
        <span className="pdf-filename">{filename}</span>
        <div className="pdf-sep" />

        <button
          type="button"
          className="pdf-toolbar-btn"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1 || !pdfDoc}
          title="Previous page"
        >
          ←
        </button>
        <input
          ref={pageInputRef}
          className="pdf-page-input"
          type="number"
          min={1}
          max={numPages}
          value={currentPage}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) goToPage(v);
          }}
          disabled={!pdfDoc}
        />
        <span className="pdf-page-info">of {numPages}</span>
        <button
          type="button"
          className="pdf-toolbar-btn"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= numPages || !pdfDoc}
          title="Next page"
        >
          →
        </button>

        <div className="pdf-sep" />
        <button
          type="button"
          className="pdf-toolbar-btn"
          onClick={zoomOut}
          disabled={!pdfDoc}
          title="Zoom out"
        >
          −
        </button>
        <span className="pdf-zoom-label">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          className="pdf-toolbar-btn"
          onClick={zoomIn}
          disabled={!pdfDoc}
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="pdf-toolbar-btn"
          onClick={pageFit}
          disabled={!pdfDoc}
          title="Page fit"
        >
          ⊞
        </button>

        <div className="pdf-toolbar-spacer" />
        <button
          type="button"
          className={`pdf-toolbar-btn${findOpen ? " active" : ""}`}
          onClick={() => {
            setFindOpen((o) => !o);
            setTimeout(() => findInputRef.current?.focus(), 50);
          }}
          title="Find (Ctrl+F)"
        >
          ⌕
        </button>
      </div>

      {/* Find bar */}
      {findOpen && (
        <div className="pdf-find-bar">
          <input
            ref={findInputRef}
            className="pdf-find-input"
            type="text"
            placeholder="Find in document…"
            value={findQuery}
            onChange={(e) => {
              setFindQuery(e.target.value);
              runFind(e.target.value, findCase);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigateFind(e.shiftKey ? -1 : 1);
              if (e.key === "Escape") {
                setFindOpen(false);
                setFindQuery("");
              }
            }}
          />
          <span className="pdf-find-count">
            {findResults.length > 0
              ? `${findPos + 1} of ${findResults.length}`
              : findQuery
                ? "Not found"
                : ""}
          </span>
          <button
            type="button"
            className="pdf-toolbar-btn"
            onClick={() => navigateFind(-1)}
            title="Previous match"
          >
            ↑
          </button>
          <button
            type="button"
            className="pdf-toolbar-btn"
            onClick={() => navigateFind(1)}
            title="Next match"
          >
            ↓
          </button>
          <button
            type="button"
            className={`pdf-toolbar-btn${findCase ? " active" : ""}`}
            onClick={() => {
              const next = !findCase;
              setFindCase(next);
              runFind(findQuery, next);
            }}
            title="Case sensitive"
          >
            Aa
          </button>
          <button
            type="button"
            className="pdf-toolbar-btn"
            onClick={() => {
              setFindOpen(false);
              setFindQuery("");
              clearHighlights();
              setFindResults([]);
            }}
            title="Close"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page surround */}
      <div className="pdf-surround" ref={surroundRef}>
        {isLoading && (
          <div className="pdf-center">
            <span>Loading PDF…</span>
          </div>
        )}
        {loadError && (
          <div className="pdf-center pdf-error">
            <span>⚠ {loadError}</span>
          </div>
        )}
        {!isLoading &&
          !loadError &&
          Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              className="pdf-page-wrapper"
              data-page={pageNum}
              ref={(el) => {
                pageContainerRefs.current[pageNum] = el;
              }}
              style={{
                minWidth: "100px",
                minHeight: pageHeights[pageNum]
                  ? `${Math.floor(pageHeights[pageNum])}px`
                  : "800px",
              }}
            />
          ))}
      </div>

      {/* Status bar */}
      <div className="pdf-status">
        <span>
          {filename} · page {currentPage} of {numPages}
        </span>
        <span>{Math.round(scale * 100)}% zoom</span>
      </div>
    </div>
  );
}

export default PDFViewer;

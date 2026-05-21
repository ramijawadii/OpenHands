/* eslint-disable i18next/no-literal-string */
/* eslint-disable react/no-unstable-nested-components */
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaArrowRotateRight } from "react-icons/fa6";
import { useConversationId } from "#/hooks/use-conversation-id";
import ConversationService from "#/api/conversation-service/conversation-service.api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageEntry {
  file: string;
  name: string;
  ts: number;
  valid: boolean;
  type?: "mmd" | "md";
}

interface PagesManifest {
  diagrams: PageEntry[];
  latest: string;
}

interface RenderErrorRecord {
  file: string;
  error: string;
  count: number;
  last_ts: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_MS = 3000;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 6;
const MAX_ERR_COUNT = 3;
const COOLDOWN_MS = 30_000;
const ERR_LS_KEY = "cg-render-errors";
const PAGES_MANIFEST = "/workspace/pages/.manifest.json";
const LEGACY_MANIFEST = "/workspace/diagrams/.manifest.json";

// ── Mermaid module singleton ──────────────────────────────────────────────────
// Loaded once; callers queue until ready.

type MermaidModule = typeof import("mermaid");
let mermaidInstance: MermaidModule | null = null;
let mermaidLoading = false;
let mermaidReady = false;
const mermaidQueue: ((m: MermaidModule) => void)[] = [];

function getMermaid(cb: (m: MermaidModule) => void): void {
  if (mermaidReady && mermaidInstance) {
    cb(mermaidInstance);
    return;
  }
  mermaidQueue.push(cb);
  if (!mermaidLoading) {
    mermaidLoading = true;
    import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          primaryColor: "#1e1b4b",
          primaryTextColor: "#e2e8f0",
          primaryBorderColor: "#4b4b9f",
          lineColor: "#6366f1",
          secondaryColor: "#252050",
          tertiaryColor: "#181818",
          background: "#181818",
          mainBkg: "#1e1b4b",
          nodeBorder: "#4b4b9f",
          clusterBkg: "#13132a",
          clusterBorder: "#3b3b8a",
          titleColor: "#c7d2fe",
          edgeLabelBackground: "#1a1a2e",
          darkMode: true,
          fontFamily: "Inter, ui-sans-serif, sans-serif",
        },
        flowchart: { curve: "basis", padding: 20 },
        securityLevel: "loose",
      });
      mermaidInstance = m;
      mermaidReady = true;
      mermaidQueue.forEach((fn) => fn(m));
      mermaidQueue.length = 0;
    });
  }
}

// ── MermaidBlock — renders a single fenced mermaid block ──────────────────────

interface MermaidBlockProps {
  code: string;
  onError?: (err: string) => void;
  onSuccess?: () => void;
}

function MermaidBlock({ code, onError, onSuccess }: MermaidBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !code) return;
    setErr(null);
    el.innerHTML = "";
    const id = `cg-md-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    getMermaid(async (m) => {
      try {
        const { svg } = await m.default.render(id, code);
        el.innerHTML = svg;
        onSuccess?.();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg);
        el.innerHTML = "";
        onError?.(msg);
      }
    });
  }, [code, onError, onSuccess]);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-[#2d2d5e]">
      <div
        ref={ref}
        className="bg-[#181818] flex justify-center items-center p-4 min-h-[80px]"
      />
      {err && (
        <div className="px-4 py-2 bg-[#1a0a0a] border-t border-red-900/50 text-red-400 text-xs font-mono">
          {err}
        </div>
      )}
      <div className="flex justify-end px-3 py-1.5 bg-[#13132a] border-t border-[#2d2d5e]">
        <button
          type="button"
          onClick={copy}
          className="text-xs text-[#6b7280] hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-white/10"
        >
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>
    </div>
  );
}

// ── DiagramsTab ───────────────────────────────────────────────────────────────

function DiagramsTab() {
  const { conversationId } = useConversationId();

  const [manifest, setManifest] = useState<PagesManifest | null>(null);
  const [basePath, setBasePath] = useState("/workspace/pages");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);

  const mermaidRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const dragStart = useRef<{
    mx: number;
    my: number;
    px: number;
    py: number;
  } | null>(null);

  // Keep refs in sync for wheel handler closure
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Trigger mermaid singleton init early
  useEffect(() => {
    getMermaid(() => {});
  }, []);

  const isMdFile = selectedFile?.endsWith(".md") ?? false;

  // Wheel zoom — passive:false so we can preventDefault
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, zoomRef.current * factor),
      );
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const ratio = newZoom / zoomRef.current;
      const newPan = {
        x: cx - (cx - panRef.current.x) * ratio,
        y: cy - (cy - panRef.current.y) * ratio,
      };
      zoomRef.current = newZoom;
      panRef.current = newPan;
      setZoom(newZoom);
      setPan(newPan);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
    // Re-attach when switching between md/mmd views
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMdFile]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      px: pan.x,
      py: pan.y,
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx),
      y: dragStart.current.py + (e.clientY - dragStart.current.my),
    });
  };

  const handleMouseUp = () => {
    dragStart.current = null;
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
  };

  const zoomBy = (factor: number) => {
    const newZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, zoomRef.current * factor),
    );
    zoomRef.current = newZoom;
    setZoom(newZoom);
  };

  // Reset view whenever page content changes
  useLayoutEffect(() => {
    resetView();
  }, [pageContent]);

  // ── T4: render error feedback ───────────────────────────────────────────────

  const reportRenderError = useCallback(
    async (file: string, error: string) => {
      const raw = localStorage.getItem(ERR_LS_KEY);
      const records: RenderErrorRecord[] = raw ? JSON.parse(raw) : [];
      const idx = records.findIndex((r) => r.file === file);
      const now = Date.now();

      if (idx >= 0) {
        if (records[idx].count >= MAX_ERR_COUNT) return;
        if (now - records[idx].last_ts < COOLDOWN_MS) return;
        records[idx].count += 1;
        records[idx].last_ts = now;
        records[idx].error = error;
      } else {
        records.push({ file, error, count: 1, last_ts: now });
      }

      localStorage.setItem(ERR_LS_KEY, JSON.stringify(records));

      if (!conversationId) return;
      try {
        const blob = JSON.stringify({ updated: now, errors: records }, null, 2);
        const f = new File([blob], ".render_errors.json", {
          type: "application/json",
        });
        await ConversationService.uploadFiles(conversationId, [f]);
      } catch {
        // non-critical — localStorage already updated
      }
    },
    [conversationId],
  );

  const clearRenderError = useCallback((file: string) => {
    const raw = localStorage.getItem(ERR_LS_KEY);
    if (!raw) return;
    const updated: RenderErrorRecord[] = JSON.parse(raw).filter(
      (r: RenderErrorRecord) => r.file !== file,
    );
    localStorage.setItem(ERR_LS_KEY, JSON.stringify(updated));
  }, []);

  // ── File reading ────────────────────────────────────────────────────────────

  const readFile = useCallback(
    async (path: string): Promise<string | null> => {
      if (!conversationId) return null;
      try {
        return (await ConversationService.getFile(
          conversationId,
          path,
        )) as unknown as string;
      } catch {
        return null;
      }
    },
    [conversationId],
  );

  // ── Manifest polling ────────────────────────────────────────────────────────

  const pollManifest = useCallback(async () => {
    let raw = await readFile(PAGES_MANIFEST);
    let base = "/workspace/pages";
    if (!raw) {
      raw = await readFile(LEGACY_MANIFEST);
      base = "/workspace/diagrams";
    }
    if (!raw) {
      setIsEmpty(true);
      return;
    }
    try {
      const parsed: PagesManifest = JSON.parse(raw);
      setManifest(parsed);
      setBasePath(base);
      setIsEmpty(false);
      setSelectedFile((prev) => prev ?? parsed.latest ?? null);
    } catch {
      setIsEmpty(true);
    }
  }, [readFile]);

  useEffect(() => {
    pollManifest();
    pollRef.current = setInterval(pollManifest, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pollManifest]);

  // ── Load selected page content ──────────────────────────────────────────────

  useEffect(() => {
    if (!selectedFile) return;
    readFile(`${basePath}/${selectedFile}`).then((content) => {
      setPageContent(content ?? "");
      setRenderError(null);
    });
  }, [selectedFile, basePath, readFile]);

  // ── Mermaid render for pure .mmd files ─────────────────────────────────────

  useEffect(() => {
    if (isMdFile || !pageContent || !mermaidRef.current) return;
    const el = mermaidRef.current;
    el.innerHTML = "";
    setRenderError(null);
    const id = `cg-diagram-${Date.now()}`;
    getMermaid(async (m) => {
      try {
        const { svg } = await m.default.render(id, pageContent);
        el.innerHTML = svg;
        if (selectedFile) clearRenderError(selectedFile);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setRenderError(msg);
        el.innerHTML = "";
        if (selectedFile) reportRenderError(selectedFile, msg);
      }
    });
  }, [
    pageContent,
    isMdFile,
    selectedFile,
    clearRenderError,
    reportRenderError,
  ]);

  const selectedEntry = manifest?.diagrams.find((d) => d.file === selectedFile);

  // ── Download helpers ────────────────────────────────────────────────────────

  const downloadSVG = () => {
    const svgEl = mermaidRef.current?.querySelector("svg");
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const data = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedEntry?.name ?? "diagram"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySource = useCallback(() => {
    navigator.clipboard.writeText(pageContent).then(() => {
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);
    });
  }, [pageContent]);

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4 bg-[#181818] text-[#8D95A9]">
        <svg
          className="w-16 h-16 opacity-25"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          viewBox="0 0 24 24"
        >
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
        <p className="text-lg font-medium text-[#6b7280]">No pages yet</p>
        <p className="text-sm text-center max-w-xs text-[#4b5563]">
          Ask the agent to generate a diagram or page — it will appear here
          automatically.
        </p>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full h-full bg-[#181818] overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e1e3f] flex-shrink-0 bg-[#181818]">
        {manifest && manifest.diagrams.length > 0 && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[10px] font-medium text-[#4b5563] uppercase tracking-widest flex-shrink-0 select-none">
              Pages
            </span>
            <select
              className="bg-[#13132a] text-[#e2e8f0] text-sm rounded px-2 py-1 border border-[#2d2d5e] flex-1 min-w-0 focus:outline-none focus:border-[#4b4b9f]"
              value={selectedFile ?? ""}
              onChange={(e) => setSelectedFile(e.target.value)}
            >
              {[...manifest.diagrams].reverse().map((d) => (
                <option key={d.file} value={d.file}>
                  {d.name}
                  {!d.valid ? " (invalid)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedEntry && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-semibold flex-shrink-0 ${
              selectedEntry.valid
                ? "bg-green-950/60 text-green-400 border border-green-900/40"
                : "bg-red-950/60 text-red-400 border border-red-900/40"
            }`}
          >
            {selectedEntry.valid ? "valid" : "invalid"}
          </span>
        )}

        {/* T3: error indicator badge instead of banner */}
        {renderError && (
          <span
            className="text-[10px] text-red-400 bg-red-950/40 border border-red-900/40 px-2 py-0.5 rounded flex-shrink-0 cursor-help"
            title={renderError}
          >
            ⚠ render error
          </span>
        )}

        <div className="flex-1" />

        {/* T6: Zoom controls with solid white background — only for .mmd */}
        {!isMdFile && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => zoomBy(1 / 1.25)}
              className="w-6 h-6 flex items-center justify-center rounded bg-white text-black hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm font-bold leading-none"
              title="Zoom out"
            >
              −
            </button>
            <span className="text-xs text-[#6b7280] w-10 text-center select-none tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => zoomBy(1.25)}
              className="w-6 h-6 flex items-center justify-center rounded bg-white text-black hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm font-bold leading-none"
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={resetView}
              className="text-xs px-2 py-0.5 rounded bg-white text-black hover:bg-gray-100 active:bg-gray-200 transition-colors ml-0.5 font-semibold"
              title="Reset view"
            >
              Reset
            </button>
          </div>
        )}

        {/* Download — only for .mmd */}
        {!isMdFile && (
          <div className="flex items-center gap-1 flex-shrink-0 border-l border-[#1e1e3f] pl-2 ml-1">
            <button
              type="button"
              onClick={downloadSVG}
              className="text-xs px-2 py-0.5 rounded text-[#6b7280] hover:text-white hover:bg-white/10 transition-colors border border-[#2d2d5e]"
              title="Download SVG"
            >
              SVG
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={pollManifest}
          className="text-[#4b5563] hover:text-white transition-colors flex-shrink-0 ml-1 p-1 rounded hover:bg-white/10"
          aria-label="Refresh pages"
        >
          <FaArrowRotateRight className="w-3 h-3" />
        </button>
      </div>

      {/* ── Content area ── */}
      {isMdFile ? (
        // T1: Markdown page renderer — Notion-like dark prose
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-6 bg-[#181818]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // eslint-disable-next-line react/jsx-no-useless-fragment
              pre: ({ children }) => <>{children}</>,
              code: (props) => {
                const { className, children } =
                  props as React.HTMLAttributes<HTMLElement>;
                const lang = /language-(\w+)/.exec(className ?? "")?.[1];
                const content = String(children).replace(/\n$/, "");

                if (lang === "mermaid") {
                  return (
                    <MermaidBlock
                      code={content}
                      onError={(err) => {
                        if (selectedFile) reportRenderError(selectedFile, err);
                      }}
                      onSuccess={() => {
                        if (selectedFile) clearRenderError(selectedFile);
                      }}
                    />
                  );
                }

                if (className?.startsWith("language-")) {
                  return (
                    <div className="relative my-4 rounded-lg overflow-hidden border border-[#2d2d5e]">
                      <pre className="bg-[#13132a] p-4 overflow-x-auto">
                        <code className="text-xs text-[#c7d2fe] font-mono block whitespace-pre">
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                }

                return (
                  <code className="bg-[#1e1b4b] text-[#c7d2fe] px-1.5 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                );
              },
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-white mb-4 mt-6 pb-2 border-b border-[#1e1e3f]">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold text-[#e2e8f0] mb-3 mt-5">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-[#c7d2fe] mb-2 mt-4">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-sm font-semibold text-[#a5b4fc] mb-2 mt-3">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="text-[#94a3b8] mb-3 leading-relaxed text-sm">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 text-[#94a3b8] mb-3 space-y-1 text-sm">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 text-[#94a3b8] mb-3 space-y-1 text-sm">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-[#4b4b9f] pl-4 my-4 text-[#6b7280] italic text-sm">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="w-full text-sm text-[#94a3b8] border border-[#2d2d5e] rounded-lg overflow-hidden">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-[#13132a]">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-3 py-2 text-[#e2e8f0] font-semibold text-left border-b border-[#2d2d5e] text-xs uppercase tracking-wider">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 border-b border-[#1a1a2e] text-[#94a3b8] text-sm">
                  {children}
                </td>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#818cf8] hover:text-[#a5b4fc] underline underline-offset-2 transition-colors"
                >
                  {children}
                </a>
              ),
              hr: () => <hr className="border-[#1e1e3f] my-6" />,
              strong: ({ children }) => (
                <strong className="text-[#e2e8f0] font-semibold">
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em className="text-[#a5b4fc] italic">{children}</em>
              ),
            }}
          >
            {pageContent}
          </ReactMarkdown>
        </div>
      ) : (
        // Pure .mmd — zoom/pan canvas
        <>
          <div
            ref={canvasRef}
            className="flex-1 overflow-hidden relative select-none bg-[#181818]"
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "50% 50%",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div ref={mermaidRef} className="mermaid-container" />
            </div>
          </div>

          {/* T8: Source view with Copy code button */}
          {pageContent && (
            <details className="flex-shrink-0 border-t border-[#1e1e3f] group">
              <summary className="px-3 py-2 text-xs text-[#4b5563] cursor-pointer select-none hover:text-white list-none flex items-center gap-1.5 bg-[#181818] hover:bg-[#13132a] transition-colors">
                <span className="group-open:rotate-90 transition-transform inline-block text-[10px]">
                  ▶
                </span>
                View source (.mmd)
              </summary>
              <div className="relative bg-[#181818] border-t border-[#1e1e3f]">
                <button
                  type="button"
                  onClick={copySource}
                  className="absolute top-2 right-3 text-xs text-[#4b5563] hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-white/10 z-10"
                >
                  {copiedSource ? "Copied!" : "Copy code"}
                </button>
                <pre className="text-xs text-[#6b7280] px-4 py-3 overflow-auto whitespace-pre max-h-48 pr-24 font-mono">
                  {pageContent}
                </pre>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

export default DiagramsTab;

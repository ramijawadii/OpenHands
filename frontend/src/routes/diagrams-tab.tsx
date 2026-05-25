/* eslint-disable i18next/no-literal-string */
/* eslint-disable react/no-unstable-nested-components */
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ReactFlow, Background, Controls, BackgroundVariant } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RotateCw, ChevronDown, Download } from "lucide-react";
import { MarkdownRenderer } from "#/components/features/markdown/MarkdownRenderer";
import { useConversationId } from "#/hooks/use-conversation-id";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import { PDFViewer } from "#/components/features/office-viewer/PDFViewer";
import { XlsxViewer } from "#/components/features/office-viewer/XlsxViewer";

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
          primaryColor: "#252525",
          primaryTextColor: "#e2e8f0",
          primaryBorderColor: "#3a3a3a",
          lineColor: "#666666",
          secondaryColor: "#1e1e1e",
          tertiaryColor: "#181818",
          background: "#181818",
          mainBkg: "#252525",
          nodeBorder: "#3a3a3a",
          clusterBkg: "#1a1a1a",
          clusterBorder: "#2d2d2d",
          titleColor: "#e2e8f0",
          edgeLabelBackground: "#1a1a1a",
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

// ── React Flow node — hosts the rendered Mermaid SVG ─────────────────────────

interface MermaidNodeData extends Record<string, unknown> {
  html: string;
}

function MermaidSvgNode({ data }: { data: MermaidNodeData }) {
  return (
    <div
      style={{ userSelect: "none" }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: data.html }}
    />
  );
}

const NODE_TYPES = { mermaidSvg: MermaidSvgNode };


// ── MermaidBlock — renders a fenced mermaid block inside a .md page ───────────

interface MermaidBlockProps {
  code: string;
  onError?: (err: string) => void;
  onSuccess?: () => void;
  onExpand?: (code: string) => void;
}

function MermaidBlock({ code, onError, onSuccess, onExpand }: MermaidBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);

  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);
  onErrorRef.current = onError;
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    const el = ref.current;
    if (!el || !code) return;
    setErr(null);
    setHasRendered(false);
    el.innerHTML = "";
    const id = `cg-md-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    getMermaid(async (m) => {
      try {
        const { svg } = await m.default.render(id, code);
        const scaledSvg = svg
          .replace(/(<svg[^>]*)\swidth="[^"]*"/, "$1")
          .replace(/(<svg[^>]*)\sheight="[^"]*"/, "$1");
        el.innerHTML = scaledSvg;
        const svgEl = el.querySelector("svg");
        if (svgEl) {
          (svgEl as SVGElement).style.display = "block";
          (svgEl as SVGElement).style.margin = "0 auto";
          (svgEl as SVGElement).style.width = "100%";
          (svgEl as SVGElement).style.maxWidth = "100%";
          (svgEl as SVGElement).style.height = "auto";
        }
        setHasRendered(true);
        onSuccessRef.current?.();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg);
        el.innerHTML = "";
        onErrorRef.current?.(msg);
      } finally {
        // Mermaid appends a hidden work container to document.body with the render
        // id; remove it so its error text never leaks into the visible page.
        document.getElementById(id)?.remove();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-[var(--cg-border)] group relative">
      {/* SVG area — click anywhere to expand into the ReactFlow canvas */}
      <div
        ref={ref}
        className={`bg-[var(--cg-bg-page)] p-4 min-h-[80px]${hasRendered && onExpand ? " cursor-pointer" : ""}`}
        onClick={hasRendered && onExpand ? () => onExpand(code) : undefined}
        title={hasRendered && onExpand ? "Click to open in diagram canvas" : undefined}
      />
      {/* Always-visible expand button in top-right corner */}
      {hasRendered && onExpand && (
        <button
          type="button"
          aria-label="Open as standalone diagram"
          onClick={() => onExpand(code)}
          className="absolute top-2 right-2 bg-[var(--cg-bg-badge)] border border-[var(--cg-border)] text-[var(--cg-text-muted)]
            hover:text-[var(--cg-text-primary)] hover:border-[var(--cg-border-strong)] rounded p-1.5 z-10 transition-colors"
          title="Open in diagram canvas"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      )}
      {err && (
        <div className="px-4 py-2 bg-[#1a0a0a] border-t border-red-900/50 text-red-400 text-xs font-mono">
          {err}
        </div>
      )}
      <div className="flex justify-end px-3 py-1.5 bg-[var(--cg-bg-page)] border-t border-[var(--cg-border)]">
        <button
          type="button"
          onClick={copy}
          className="text-xs text-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)] transition-colors px-2 py-0.5 rounded hover:bg-white/10"
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
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prevRealPage, setPrevRealPage] = useState<string | null>(null);
  const [binaryData, setBinaryData] = useState<ArrayBuffer | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveEmptyRef = useRef(0);
  const lastLatestRef = useRef<string | null>(null);

  // Mark client-side mount — guards ReactFlow from SSR hydration mismatch (#418)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Trigger mermaid singleton init early
  useEffect(() => {
    getMermaid(() => {});
  }, []);

  // Derive file type from extension
  const fileType: "md" | "mmd" | "pdf" | "xlsx" | null = useMemo(() => {
    if (!selectedFile) return null;
    const ext = selectedFile.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "md") return "md";
    if (ext === "mmd") return "mmd";
    if (ext === "pdf") return "pdf";
    if (["xlsx", "xls", "xlsm", "csv"].includes(ext)) return "xlsx";
    return "md"; // fallback
  }, [selectedFile]);

  const isMdFile = fileType === "md";

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

  // ── Expand mermaid inline block → standalone .mmd in XYFlow canvas ───────────
  // Virtual files: code is served immediately from memory, uploaded in background.
  const virtualFilesRef = useRef<Map<string, string>>(new Map());

  const expandToStandalone = useCallback((code: string) => {
    // Save the current real page so the back button can restore it
    setSelectedFile((prev) => {
      if (prev && !virtualFilesRef.current.has(prev)) setPrevRealPage(prev);
      return prev;
    });
    const name = `diagram_${Date.now()}.mmd`;
    virtualFilesRef.current.set(name, code);
    setSelectedFile(name);
    if (conversationId) {
      const f = new File([code], name, { type: "text/plain" });
      ConversationService.uploadFiles(conversationId, [f]).catch(() => {});
    }
  }, [conversationId]);

  // Stable refs for notionComponents — lets the components memo use empty deps
  // so NotionRenderer never gets a new components reference on manifest polls,
  // which would remount MermaidBlock and cause the 3-second re-render glitch.
  const selectedFileRef = useRef<string | null>(selectedFile);
  selectedFileRef.current = selectedFile;
  const reportRenderErrorRef = useRef(reportRenderError);
  reportRenderErrorRef.current = reportRenderError;
  const clearRenderErrorRef = useRef(clearRenderError);
  clearRenderErrorRef.current = clearRenderError;
  const expandToStandaloneRef = useRef(expandToStandalone);
  expandToStandaloneRef.current = expandToStandalone;

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

  const readFileBinary = useCallback(
    async (path: string): Promise<ArrayBuffer | null> => {
      if (!conversationId) return null;
      return ConversationService.getFileBinary(conversationId, path);
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
      consecutiveEmptyRef.current += 1;
      setIsEmpty(true);
      return;
    }
    try {
      const parsed: PagesManifest = JSON.parse(raw);
      consecutiveEmptyRef.current = 0;
      setManifest(parsed);
      setBasePath(base);
      setIsEmpty(false);
      const newLatest = parsed.latest ?? null;
      if (newLatest && newLatest !== lastLatestRef.current) {
        // A new page was saved — auto-switch to it
        setSelectedFile(newLatest);
        lastLatestRef.current = newLatest;
      } else {
        setSelectedFile((prev) => prev ?? newLatest);
        if (!lastLatestRef.current) lastLatestRef.current = newLatest;
      }
    } catch {
      consecutiveEmptyRef.current += 1;
      setIsEmpty(true);
    }
  }, [readFile]);

  useEffect(() => {
    let alive = true;
    const schedule = async () => {
      await pollManifest();
      if (!alive) return;
      // Back off to 20 s after 5 consecutive empty/error polls to reduce console noise
      const delay = consecutiveEmptyRef.current > 5 ? 20_000 : POLL_MS;
      pollRef.current = setTimeout(schedule, delay);
    };
    schedule();
    return () => {
      alive = false;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [pollManifest]);

  // ── Load selected page content ──────────────────────────────────────────────

  useEffect(() => {
    if (!selectedFile) return;
    setSvgHtml("");
    setBinaryData(null);

    // Virtual files (expanded inline mermaid blocks) are served from memory
    const virtual = virtualFilesRef.current.get(selectedFile);
    if (virtual !== undefined) {
      setPageContent(virtual);
      setRenderError(null);
      return;
    }

    // Binary file types — load as ArrayBuffer
    if (fileType === "pdf" || fileType === "xlsx") {
      readFileBinary(`${basePath}/${selectedFile}`).then((ab) => {
        setBinaryData(ab);
        setRenderError(null);
      });
      return;
    }

    readFile(`${basePath}/${selectedFile}`).then((content) => {
      setPageContent(content ?? "");
      setRenderError(null);
    });
  // refreshKey intentionally triggers a re-fetch of the current file on manual refresh
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile, basePath, fileType, readFile, readFileBinary, refreshKey]);

  // ── Mermaid render for pure .mmd files ─────────────────────────────────────

  useEffect(() => {
    if (isMdFile || !pageContent) return;
    setSvgHtml("");
    setRenderError(null);
    const id = `cg-diagram-${Date.now()}`;
    getMermaid(async (m) => {
      try {
        const { svg } = await m.default.render(id, pageContent);
        setSvgHtml(svg);
        if (selectedFile) clearRenderError(selectedFile);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setRenderError(msg);
        setSvgHtml("");
        if (selectedFile) reportRenderError(selectedFile, msg);
      } finally {
        document.getElementById(id)?.remove();
      }
    });
  }, [pageContent, isMdFile, selectedFile, clearRenderError, reportRenderError]);

  const selectedEntry = manifest?.diagrams?.find((d) => d.file === selectedFile);

  // ── Download SVG ────────────────────────────────────────────────────────────

  const downloadSVG = () => {
    if (!svgHtml) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgHtml, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return;
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const data = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedEntry?.name ?? "diagram"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBinary = useCallback(() => {
    if (!binaryData || !selectedFile) return;
    const ext = selectedFile.split(".").pop()?.toLowerCase() ?? "";
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
      csv: "text/csv",
    };
    const mime = mimeMap[ext] ?? "application/octet-stream";
    const blob = new Blob([binaryData], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile;
    a.click();
    URL.revokeObjectURL(url);
  }, [binaryData, selectedFile]);

  const copySource = useCallback(() => {
    navigator.clipboard.writeText(pageContent).then(() => {
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);
    });
  }, [pageContent]);

  // Mermaid code block renderer for MarkdownRenderer
  const mermaidCodeRenderer = useMemo(
    () =>
      ({
        language,
        code,
        inline,
      }: {
        language: string;
        code: string;
        inline: boolean;
      }): React.ReactNode | null => {
        if (inline || language.toLowerCase() !== "mermaid") return null;
        return (
          <MermaidBlock
            code={code}
            onError={(err) => {
              if (selectedFileRef.current)
                reportRenderErrorRef.current(selectedFileRef.current, err);
            }}
            onSuccess={() => {
              if (selectedFileRef.current)
                clearRenderErrorRef.current(selectedFileRef.current);
            }}
            onExpand={(c) => expandToStandaloneRef.current(c)}
          />
        );
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // All hooks are declared above this line.
  // Return a blank shell until client-side mount so the initial client render
  // always matches the server pre-render (both empty div), eliminating #418.
  if (!mounted) return <div className="w-full h-full bg-[var(--cg-bg-page)]" />;

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4 bg-[var(--cg-bg-page)] text-[var(--cg-text-muted)]">
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
        <p className="text-lg font-medium text-[var(--cg-text-primary)]">No pages yet</p>
        <p className="text-sm text-center max-w-xs text-[var(--cg-text-muted)]">
          Ask the agent to generate a diagram or page — it will appear here
          automatically.
        </p>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full h-full bg-[var(--cg-bg-page)] overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--cg-border)] flex-shrink-0 bg-[var(--cg-bg-page)]">
        {/* Back button — only visible when viewing an expanded virtual diagram */}
        {selectedFile && virtualFilesRef.current.has(selectedFile) && (
          <button
            type="button"
            onClick={() => {
              const target = prevRealPage ?? manifest?.latest ?? null;
              setSelectedFile(target);
              setPrevRealPage(null);
            }}
            className="flex items-center gap-1 text-xs text-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)] bg-[var(--cg-input-bg)] border border-[var(--cg-border)] hover:border-[var(--cg-border-strong)] rounded px-2 py-1 transition-colors flex-shrink-0"
            title="Back to pages"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back
          </button>
        )}

        {manifest && (manifest.diagrams ?? []).length > 0 && (
          <div className="relative flex-1 min-w-0">
            <select
              className="w-full appearance-none bg-[var(--cg-input-bg)] text-[var(--cg-text-nav)] text-[13px] rounded-[3px] pl-2.5 pr-7 py-1 border border-[var(--cg-border)] focus:outline-none focus:border-[var(--cg-accent)] cursor-pointer hover:border-[var(--cg-border-strong)] transition-colors"
              value={selectedFile && !virtualFilesRef.current.has(selectedFile) ? selectedFile : (manifest.latest ?? "")}
              onChange={(e) => { setSelectedFile(e.target.value); setPrevRealPage(null); }}
            >
              {[...(manifest.diagrams ?? [])].reverse().map((d) => {
                // Derive version from filename (e.g. report-v2.md → v2) if not already in name
                const vMatch = d.file.match(/-v(\d+)\.[^.]+$/);
                const vTag = vMatch && !d.name.toLowerCase().includes(`v${vMatch[1]}`) ? ` (v${vMatch[1]})` : "";
                return (
                  <option key={d.file} value={d.file}>
                    {d.name}{vTag}{!d.valid ? " ⚠" : ""}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--cg-text-muted)]" />
          </div>
        )}

        {/* Download — SVG for .mmd, binary for PDF/Excel */}
        {fileType === "mmd" && svgHtml && (
          <button
            type="button"
            onClick={downloadSVG}
            className="text-xs px-2 py-0.5 rounded text-[var(--cg-text-muted)] hover:text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)] transition-colors border border-[var(--cg-border)] flex-shrink-0"
            title="Download SVG"
          >
            SVG
          </button>
        )}
        {(fileType === "pdf" || fileType === "xlsx") && binaryData && (
          <button
            type="button"
            onClick={downloadBinary}
            className="text-[var(--cg-text-muted)] hover:text-[var(--cg-text-nav)] transition-colors flex-shrink-0 p-1 rounded hover:bg-[var(--cg-bg-hover)]"
            aria-label={`Download ${fileType === "pdf" ? "PDF" : "spreadsheet"}`}
            title={`Download ${selectedFile ?? "file"}`}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={async () => { await pollManifest(); setRefreshKey((k) => k + 1); }}
          className="text-[#858585] hover:text-[#cccccc] transition-colors flex-shrink-0 p-1 rounded hover:bg-[#2a2d2e]"
          aria-label="Refresh"
          title="Refresh"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Content area ── */}
      {fileType === "pdf" ? (
        // PDF viewer
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {binaryData ? (
            <PDFViewer arrayBuffer={binaryData} filename={selectedFile ?? "document.pdf"} />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-[var(--cg-bg-page)] text-[var(--cg-text-muted)] text-sm">
              Loading PDF…
            </div>
          )}
        </div>
      ) : fileType === "xlsx" ? (
        // Excel viewer
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {binaryData ? (
            <XlsxViewer arrayBuffer={binaryData} filename={selectedFile ?? "workbook.xlsx"} />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-[var(--cg-bg-page)] text-[var(--cg-text-muted)] text-sm">
              Loading spreadsheet…
            </div>
          )}
        </div>
      ) : isMdFile ? (
        // VSCode Dark Modern markdown renderer
        <div
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: "var(--cg-bg-page)", minHeight: 0 }}
        >
          <MarkdownRenderer
            content={pageContent}
            codeRenderer={mermaidCodeRenderer}
          />
        </div>
      ) : (
        // Pure .mmd — React Flow canvas with dot-grid background
        <>
          <div
            className="flex-1 relative overflow-hidden"
            style={
              {
                "--xy-controls-button-background-color": "var(--cg-bg-card)",
                "--xy-controls-button-background-color-hover": "var(--cg-bg-hover)",
                "--xy-controls-button-border-color": "var(--cg-border)",
                "--xy-controls-button-color": "var(--cg-text-nav)",
                "--xy-controls-background-color": "var(--cg-bg-card)",
                "--xy-controls-border-color": "var(--cg-border)",
                "--xy-controls-border-radius": "6px",
              } as React.CSSProperties
            }
          >
            {svgHtml ? (
              <ReactFlow
                key={selectedFile}
                defaultNodes={[
                  {
                    id: "diagram",
                    type: "mermaidSvg",
                    position: { x: 0, y: 0 },
                    data: { html: svgHtml } as MermaidNodeData,
                    draggable: false,
                    selectable: false,
                  },
                ]}
                defaultEdges={[]}
                nodeTypes={NODE_TYPES}
                fitView
                fitViewOptions={{ padding: 0.15 }}
                minZoom={0.05}
                maxZoom={6}
                proOptions={{ hideAttribution: true }}
                style={{ background: "var(--cg-bg-page)" }}
              >
                <Background
                  color="var(--cg-border)"
                  gap={20}
                  size={1}
                  variant={BackgroundVariant.Dots}
                />
                <Controls showInteractive={false} />
              </ReactFlow>
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-[var(--cg-bg-page)]">
                <span className="text-[var(--cg-text-muted)] text-sm">Rendering…</span>
              </div>
            )}
          </div>

          {/* T8: Source view with Copy code button */}
          {pageContent && (
            <details className="flex-shrink-0 border-t border-[var(--cg-border)] group">
              <summary className="px-3 py-2 text-xs text-[var(--cg-text-muted)] cursor-pointer select-none hover:text-[var(--cg-text-primary)] list-none flex items-center gap-1.5 bg-[var(--cg-bg-page)] hover:bg-[var(--cg-bg-hover)] transition-colors">
                <span className="group-open:rotate-90 transition-transform inline-block text-[10px]">
                  ▶
                </span>
                View source (.mmd)
              </summary>
              <div className="relative bg-[var(--cg-bg-page)] border-t border-[var(--cg-border)]">
                <button
                  type="button"
                  onClick={copySource}
                  className="absolute top-2 right-3 text-xs text-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)] transition-colors px-2 py-0.5 rounded hover:bg-[var(--cg-bg-hover)] z-10"
                >
                  {copiedSource ? "Copied!" : "Copy code"}
                </button>
                <pre className="text-xs text-[var(--cg-text-muted)] px-4 py-3 overflow-auto whitespace-pre max-h-48 pr-24 font-mono">
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

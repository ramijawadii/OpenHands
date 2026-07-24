/* eslint-disable i18next/no-literal-string */
/* eslint-disable react/no-unstable-nested-components */
/* Pre-existing legacy lint debt in this large file, unrelated to the ONLYOFFICE
   change below — disabled here so a one-spot edit stays committable. Worth a
   dedicated cleanup pass, tracked as BUG-OO-1. */
/* eslint-disable no-nested-ternary, no-promise-executor-return, react/display-name, no-param-reassign */
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RotateCw, ChevronDown, Download } from "lucide-react";
import { MarkdownRenderer } from "#/components/features/markdown/MarkdownRenderer";
import { sanitizeMermaid } from "#/utils/sanitize-mermaid";
import { useConversationId } from "#/hooks/use-conversation-id";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import SpreadSheet from "#/components/features/office-viewer/SpreadSheet";
import OnlyOfficeFile from "#/components/features/office-viewer/OnlyOfficeFile";
import {
  setHealthConversation,
  reportArtifactHealth,
  reportPanelState,
} from "#/utils/artifact-health";

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

// ── Count rendered nodes/edges from a Mermaid SVG (for health metadata) ──────
// DOM-based, version-robust: regex on class names misses current Mermaid output
// (edge paths are `.edgePaths path` / `.flowchart-link`, not `edgePath`).
function countMermaidParts(svg: string): {
  nodes: number;
  edges: number;
  subgraphs: number;
} {
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const nodes = doc.querySelectorAll("g.node").length;
    // Comma-selector returns a deduped union, so a path matching both counts once.
    const edges = doc.querySelectorAll(
      ".edgePaths path.flowchart-link, path.flowchart-link, .edgePaths > path",
    ).length;
    const subgraphs = doc.querySelectorAll("g.cluster").length;
    return { nodes, edges, subgraphs };
  } catch {
    return { nodes: 0, edges: 0, subgraphs: 0 };
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

function MermaidBlock({
  code,
  onError,
  onSuccess,
  onExpand,
}: MermaidBlockProps) {
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
        const { svg } = await m.default.render(id, sanitizeMermaid(code));
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
        title={
          hasRendered && onExpand
            ? "Click to open in diagram canvas"
            : undefined
        }
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
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
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
  // a user-started (blank) or uploaded spreadsheet, rendered independently of
  // the agent-generated manifest
  const [localSheet, setLocalSheet] = useState<{
    buffer?: ArrayBuffer;
    filename: string;
    blank?: boolean;
  } | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const onUploadSheet = (file: File) => {
    const reader = new FileReader();
    reader.onload = () =>
      setLocalSheet({
        buffer: reader.result as ArrayBuffer,
        filename: file.name,
      });
    reader.readAsArrayBuffer(file);
  };
  const [copiedSource, setCopiedSource] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prevRealPage, setPrevRealPage] = useState<string | null>(null);
  const [binaryData, setBinaryData] = useState<ArrayBuffer | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveEmptyRef = useRef(0);
  const lastLatestRef = useRef<string | null>(null);

  // ── Content cache — keyed by "<basePath>/<file>", avoids a network
  // round-trip every time the user switches back to the Artifact tab.
  const textCacheRef = useRef<Map<string, string>>(new Map());
  const binaryCacheRef = useRef<Map<string, ArrayBuffer>>(new Map());

  // Mark client-side mount — guards ReactFlow from SSR hydration mismatch (#418)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Trigger mermaid singleton init early
  useEffect(() => {
    getMermaid(() => {});
  }, []);

  // ── Artifact Health: bind conversation + report panel selection ──────────────
  useEffect(() => {
    setHealthConversation(conversationId ?? null);
  }, [conversationId]);

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

  // Report which artifact is selected + that the panel is open.
  useEffect(() => {
    reportPanelState({
      active_file: selectedFile,
      tab: fileType,
      open: true,
    });
  }, [selectedFile, fileType]);

  // A markdown page that loaded content is, by default, displaying OK. This gives
  // the agent a positive health entry for .md pages (embedded-diagram errors below
  // flip it to "error"). Without this, a healthy page produced an empty artifact list.
  useEffect(() => {
    if (!isMdFile || !selectedFile || !pageContent) return;
    reportArtifactHealth({
      file: selectedFile,
      tab: "markdown",
      status: "ok",
      meta: { kind: "markdown" },
    });
  }, [isMdFile, selectedFile, pageContent]);

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

  const expandToStandalone = useCallback(
    (code: string) => {
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
    },
    [conversationId],
  );

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
        // A new page was saved — bust cache and auto-switch to it
        const cacheKey = `${base}/${newLatest}`;
        textCacheRef.current.delete(cacheKey);
        binaryCacheRef.current.delete(cacheKey);
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

    // Virtual files (expanded inline mermaid blocks) are served from memory
    const virtual = virtualFilesRef.current.get(selectedFile);
    if (virtual !== undefined) {
      setSvgHtml("");
      setPageContent(virtual);
      setRenderError(null);
      return;
    }

    const cacheKey = `${basePath}/${selectedFile}`;

    // Binary file types — load as ArrayBuffer
    if (fileType === "pdf" || fileType === "xlsx") {
      const cached = binaryCacheRef.current.get(cacheKey);
      if (cached) {
        // Instant: serve from cache, no blank flash
        setBinaryData(cached);
        setRenderError(null);
        return;
      }
      setBinaryData(null);
      readFileBinary(cacheKey).then((ab) => {
        if (ab) binaryCacheRef.current.set(cacheKey, ab);
        setBinaryData(ab);
        setRenderError(null);
      });
      return;
    }

    const cachedText = textCacheRef.current.get(cacheKey);
    if (cachedText !== undefined) {
      // Instant: serve from cache
      setSvgHtml("");
      setPageContent(cachedText);
      setRenderError(null);
      return;
    }

    setSvgHtml("");
    setBinaryData(null);
    readFile(cacheKey).then((content) => {
      const text = content ?? "";
      textCacheRef.current.set(cacheKey, text);
      setPageContent(text);
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
    const id = `cg-diagram-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let settled = false;
    getMermaid(async (m) => {
      try {
        // Race the render against a timeout so a malformed/huge diagram can never
        // leave the panel stuck on "Rendering…" forever.
        const { svg } = (await Promise.race([
          m.default.render(id, sanitizeMermaid(pageContent)),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Render timed out (15s) — the diagram is too large or has a syntax error. Open “View source” to fix it.",
                  ),
                ),
              15000,
            ),
          ),
        ])) as { svg: string };
        if (settled) return;
        settled = true;
        setSvgHtml(svg);
        if (selectedFile) {
          clearRenderError(selectedFile);
          reportArtifactHealth({
            file: selectedFile,
            tab: "diagram",
            status: "ok",
            meta: { kind: "mermaid", ...countMermaidParts(svg) },
          });
        }
      } catch (e: unknown) {
        if (settled) return;
        settled = true;
        const msg = e instanceof Error ? e.message : String(e);
        setRenderError(msg);
        setSvgHtml("");
        if (selectedFile) {
          reportRenderError(selectedFile, msg);
          reportArtifactHealth({
            file: selectedFile,
            tab: "diagram",
            status: "error",
            error: msg,
            meta: { kind: "mermaid" },
          });
        }
      } finally {
        document.getElementById(id)?.remove();
      }
    });
  }, [
    pageContent,
    isMdFile,
    selectedFile,
    clearRenderError,
    reportRenderError,
  ]);

  const selectedEntry = manifest?.diagrams?.find(
    (d) => d.file === selectedFile,
  );

  // Collapse "<base>-v<N>.<ext>" version spam → one entry per base (latest version).
  // The agent saves a new -vN.pdf on every recompile; the selector should show the
  // latest of each report, not all 8 intermediate versions.
  const collapsedDiagrams = useMemo(() => {
    const list = manifest?.diagrams ?? [];
    const VER = /^(.*)-v(\d+)(\.[^.]+)$/;
    const groups = new Map<string, PageEntry>();
    for (const d of list) {
      const m = d.file.match(VER);
      const key = m ? `${m[1]}${m[3]}` : d.file; // base + ext (versionless key)
      const ver = m ? parseInt(m[2], 10) : -1;
      const cur = groups.get(key);
      if (!cur) {
        groups.set(key, d);
      } else {
        const cm = cur.file.match(VER);
        const cv = cm ? parseInt(cm[2], 10) : -1;
        if (ver > cv || (ver === cv && d.ts > cur.ts)) groups.set(key, d);
      }
    }
    return [...groups.values()].sort((a, b) => b.ts - a.ts);
  }, [manifest]);

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
      function ({
        language,
        code,
        inline,
      }: {
        language: string;
        code: string;
        inline: boolean;
      }): React.ReactNode | null {
        if (inline || language.toLowerCase() !== "mermaid") return null;
        return (
          <MermaidBlock
            code={code}
            onError={(err) => {
              if (selectedFileRef.current) {
                reportRenderErrorRef.current(selectedFileRef.current, err);
                reportArtifactHealth({
                  file: selectedFileRef.current,
                  tab: "markdown",
                  status: "error",
                  error: err,
                  meta: { kind: "mermaid-in-markdown" },
                });
              }
            }}
            onSuccess={() => {
              if (selectedFileRef.current) {
                clearRenderErrorRef.current(selectedFileRef.current);
                // Re-assert OK (do NOT clear — the page-level md-ok entry must
                // survive so the agent always sees a positive record for the page).
                reportArtifactHealth({
                  file: selectedFileRef.current,
                  tab: "markdown",
                  status: "ok",
                  meta: { kind: "markdown" },
                });
              }
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

  // ── User-started / uploaded spreadsheet ───────────────────────────────────
  // Takes precedence over the manifest so the user can work in their own sheet
  // regardless of what the agent produced.
  if (localSheet) {
    return (
      <div className="flex h-full w-full flex-col bg-[var(--cg-bg-page)]">
        <div className="flex items-center gap-2 border-b border-[var(--cg-border)] px-3 py-1.5">
          <button
            type="button"
            onClick={() => setLocalSheet(null)}
            className="flex items-center gap-1 rounded border border-[var(--cg-border)] bg-[var(--cg-input-bg)] px-2 py-1 text-xs text-[var(--cg-text-muted)] transition-colors hover:border-[var(--cg-border-strong)] hover:text-[var(--cg-text-primary)]"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to pages
          </button>
          <span className="truncate font-mono text-[12px] text-[var(--cg-text-nav)]">
            {localSheet.filename}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <SpreadSheet
            arrayBuffer={localSheet.buffer}
            filename={localSheet.filename}
            startBlank={localSheet.blank}
          />
        </div>
      </div>
    );
  }

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
        <p className="text-lg font-medium text-[var(--cg-text-primary)]">
          No pages yet
        </p>
        <p className="text-sm text-center max-w-xs text-[var(--cg-text-muted)]">
          Ask the agent to generate a diagram or page — or start your own
          spreadsheet below.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setLocalSheet({ filename: "untitled.csv", blank: true })
            }
            className="rounded-md border border-[var(--cg-border)] bg-[var(--cg-input-bg)] px-3 py-1.5 text-[13px] text-[var(--cg-text-nav)] transition-colors hover:border-[var(--cg-border-strong)] hover:text-[var(--cg-text-primary)]"
          >
            New spreadsheet
          </button>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="rounded-md border border-[var(--cg-border)] bg-[var(--cg-input-bg)] px-3 py-1.5 text-[13px] text-[var(--cg-text-nav)] transition-colors hover:border-[var(--cg-border-strong)] hover:text-[var(--cg-text-primary)]"
          >
            Upload spreadsheet
          </button>
        </div>
        <input
          ref={uploadRef}
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadSheet(f);
            e.target.value = "";
          }}
        />
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
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back
          </button>
        )}

        {manifest && collapsedDiagrams.length > 0 && (
          <div className="relative flex-1 min-w-0">
            <select
              className="w-full appearance-none bg-[var(--cg-input-bg)] text-[var(--cg-text-nav)] text-[13px] rounded-[3px] pl-2.5 pr-7 py-1 border border-[var(--cg-border)] focus:outline-none focus:border-[var(--cg-accent)] cursor-pointer hover:border-[var(--cg-border-strong)] transition-colors"
              style={{ colorScheme: "light dark" }}
              value={
                selectedFile && !virtualFilesRef.current.has(selectedFile)
                  ? selectedFile
                  : (manifest.latest ?? "")
              }
              onChange={(e) => {
                setSelectedFile(e.target.value);
                setPrevRealPage(null);
              }}
            >
              {collapsedDiagrams.map((d) => {
                // Derive version from filename (e.g. report-v2.md → v2) if not already in name
                const vMatch = d.file.match(/-v(\d+)\.[^.]+$/);
                const vTag =
                  vMatch && !d.name.toLowerCase().includes(`v${vMatch[1]}`)
                    ? ` (v${vMatch[1]})`
                    : "";
                return (
                  <option
                    key={d.file}
                    value={d.file}
                    style={{
                      backgroundColor: "var(--cg-bg-page)",
                      color: "var(--cg-text-nav)",
                    }}
                  >
                    {d.name}
                    {vTag}
                    {!d.valid ? " ⚠" : ""}
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
          onClick={async () => {
            // Bust cache for the current file so the refetch is actually fresh
            if (selectedFile) {
              const ck = `${basePath}/${selectedFile}`;
              textCacheRef.current.delete(ck);
              binaryCacheRef.current.delete(ck);
            }
            await pollManifest();
            setRefreshKey((k) => k + 1);
          }}
          className="text-[#858585] hover:text-[#cccccc] transition-colors flex-shrink-0 p-1 rounded hover:bg-[#2a2d2e]"
          aria-label="Refresh"
          title="Refresh"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Content area ── */}
      {fileType === "pdf" ? (
        // PDF viewer — ONLYOFFICE, backed by the workspace file (signed proxy).
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {selectedFile ? (
            <OnlyOfficeFile
              filePath={selectedFile}
              fileName={selectedFile}
              mode="view"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-[var(--cg-bg-page)] text-[var(--cg-text-muted)] text-sm">
              Loading PDF…
            </div>
          )}
        </div>
      ) : fileType === "xlsx" ? (
        // Excel viewer — ONLYOFFICE cell editor, backed by the workspace file.
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {selectedFile ? (
            <OnlyOfficeFile
              filePath={selectedFile}
              fileName={selectedFile}
              mode="edit"
            />
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
          // scrollbarGutter:stable reserves the scrollbar gutter so it can't
          // thrash the layout width as embedded mermaid diagrams render async
          // (each SVG replacing its placeholder grows the height and would
          // otherwise toggle the scrollbar → reflow → toggle loop).
          style={{
            backgroundColor: "var(--cg-bg-page)",
            minHeight: 0,
            scrollbarGutter: "stable",
          }}
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
                "--xy-controls-button-background-color-hover":
                  "var(--cg-bg-hover)",
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
            ) : renderError ? (
              <div className="flex flex-col items-center justify-center w-full h-full bg-[var(--cg-bg-page)] gap-2 px-6 text-center">
                <span className="text-red-400 text-sm font-medium">
                  Diagram failed to render
                </span>
                <span className="text-[var(--cg-text-muted)] text-xs font-mono max-w-full overflow-auto whitespace-pre-wrap">
                  {renderError}
                </span>
                <span className="text-[var(--cg-text-muted)] text-xs">
                  Open “View source (.mmd)” below to inspect / fix the syntax.
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-[var(--cg-bg-page)]">
                <span className="text-[var(--cg-text-muted)] text-sm">
                  Rendering…
                </span>
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

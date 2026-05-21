/* eslint-disable i18next/no-literal-string */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { FaArrowRotateRight } from "react-icons/fa6";
import { useConversationId } from "#/hooks/use-conversation-id";
import ConversationService from "#/api/conversation-service/conversation-service.api";

interface DiagramEntry {
  file: string;
  name: string;
  ts: number;
  valid: boolean;
}

interface Manifest {
  diagrams: DiagramEntry[];
  latest: string;
}

const POLL_INTERVAL_MS = 3000;
const MANIFEST_PATH = "/workspace/diagrams/.manifest.json";

function DiagramsTab() {
  const { conversationId } = useConversationId();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diagramCode, setDiagramCode] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const mermaidModule = useRef<typeof import("mermaid") | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load mermaid once
  useEffect(() => {
    import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          primaryColor: "#1a1f2e",
          primaryTextColor: "#e2e8f0",
          primaryBorderColor: "#4a5568",
          lineColor: "#718096",
          secondaryColor: "#2d3748",
          tertiaryColor: "#1a202c",
          background: "#0d1117",
          mainBkg: "#1a1f2e",
          nodeBorder: "#4a5568",
          clusterBkg: "#161b27",
          titleColor: "#e2e8f0",
          edgeLabelBackground: "#1a1f2e",
          attributeBackgroundColorOdd: "#1a1f2e",
          attributeBackgroundColorEven: "#161b27",
        },
        flowchart: { curve: "basis", padding: 20 },
        securityLevel: "loose",
      });
      mermaidModule.current = m;
    });
  }, []);

  const readFile = useCallback(
    async (path: string): Promise<string | null> => {
      if (!conversationId) return null;
      try {
        const text = await ConversationService.getFile(conversationId, path);
        return text as unknown as string;
      } catch {
        return null;
      }
    },
    [conversationId],
  );

  const pollManifest = useCallback(async () => {
    const raw = await readFile(MANIFEST_PATH);
    if (!raw) {
      setIsEmpty(true);
      return;
    }
    try {
      const parsed: Manifest = JSON.parse(raw);
      setManifest(parsed);
      setIsEmpty(false);
      // Auto-select latest if nothing selected yet
      setSelectedFile((prev) => prev ?? parsed.latest ?? null);
    } catch {
      setIsEmpty(true);
    }
  }, [readFile]);

  // Start polling
  useEffect(() => {
    pollManifest();
    pollRef.current = setInterval(pollManifest, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pollManifest]);

  // Load diagram code when selection changes
  useEffect(() => {
    if (!selectedFile) return;
    readFile(`/workspace/diagrams/${selectedFile}`).then((code) => {
      setDiagramCode(code ?? "");
      setRenderError(null);
    });
  }, [selectedFile, readFile]);

  // Render diagram when code or mermaid module loads
  useEffect(() => {
    if (!diagramCode || !mermaidRef.current || !mermaidModule.current) return;

    const el = mermaidRef.current;
    el.innerHTML = "";
    setRenderError(null);

    const id = `cg-diagram-${Date.now()}`;
    mermaidModule.current.default
      .render(id, diagramCode)
      .then(({ svg }) => {
        el.innerHTML = svg;
      })
      .catch((err: Error) => {
        setRenderError(err.message || "Mermaid render error");
        el.innerHTML = "";
      });
  }, [diagramCode]);

  const selectedEntry = manifest?.diagrams.find((d) => d.file === selectedFile);

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4 text-[#8D95A9]">
        <svg
          className="w-16 h-16 opacity-30"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <rect x="9" y="1" width="6" height="4" rx="1" />
          <rect x="1" y="15" width="6" height="4" rx="1" />
          <rect x="17" y="15" width="6" height="4" rx="1" />
          <line x1="12" y1="5" x2="4" y2="15" />
          <line x1="12" y1="5" x2="20" y2="15" />
        </svg>
        <p className="text-lg font-medium">No diagrams yet</p>
        <p className="text-sm text-center max-w-xs">
          Ask CloudGuard to draw an architecture, threat model, or any Mermaid
          diagram — it will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-[#0D0F11] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-neutral-700 flex-shrink-0">
        {/* Diagram selector */}
        {manifest && manifest.diagrams.length > 0 && (
          <select
            className="bg-[#1a1d23] text-[#e2e8f0] text-sm rounded px-2 py-1 border border-neutral-600 flex-1 min-w-0"
            value={selectedFile ?? ""}
            onChange={(e) => setSelectedFile(e.target.value)}
          >
            {[...manifest.diagrams].reverse().map((d) => (
              <option key={d.file} value={d.file}>
                {d.name} {!d.valid ? "(invalid)" : ""}
              </option>
            ))}
          </select>
        )}
        {/* Validity badge */}
        {selectedEntry && (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${
              selectedEntry.valid
                ? "bg-green-900/50 text-green-300"
                : "bg-red-900/50 text-red-300"
            }`}
          >
            {selectedEntry.valid ? "valid" : "invalid"}
          </span>
        )}
        {/* Refresh */}
        <button
          type="button"
          onClick={pollManifest}
          className="text-[#9299AA] hover:text-white transition-colors flex-shrink-0"
          aria-label="Refresh diagrams"
        >
          <FaArrowRotateRight className="w-4 h-4" />
        </button>
      </div>

      {/* Diagram render area */}
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
        {renderError && (
          <div className="rounded-md bg-red-950/60 border border-red-700 px-4 py-3 text-sm text-red-300">
            <strong>Render error:</strong> {renderError}
            <pre className="mt-2 text-xs opacity-70 overflow-auto whitespace-pre-wrap">
              {diagramCode}
            </pre>
          </div>
        )}

        {!renderError && diagramCode && (
          <div
            ref={mermaidRef}
            className="mermaid-container flex justify-center"
            style={{ minHeight: 200 }}
          />
        )}

        {/* Raw source toggle */}
        {diagramCode && (
          <details className="mt-2">
            <summary className="text-xs text-[#9299AA] cursor-pointer select-none hover:text-white">
              View source (.mmd)
            </summary>
            <pre className="mt-2 text-xs text-[#9299AA] bg-[#0D0F11] border border-neutral-700 rounded p-3 overflow-auto whitespace-pre">
              {diagramCode}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default DiagramsTab;

/* eslint-disable i18next/no-literal-string */
import React from "react";
import { FileText, Table2, FileTerminal, PenTool } from "lucide-react";
import { cn } from "#/utils/utils";
import Jupyter from "#/routes/jupyter-tab";
import OnlyOfficeFile from "#/components/features/office-viewer/OnlyOfficeFile";
import DocumentsView from "#/components/features/canvas/documents-view";
import MarkdownView from "#/components/features/canvas/markdown-view";
import SurfaceHost from "#/components/features/surfaces/surface-host";
import { useConversationId } from "#/hooks/use-conversation-id";

/** Canvas — the working surface. One tab, four views:
 *  Markdown · Documents · Sheet · Notebook · Whiteboard.
 *
 *  Notebook is the full embedded JupyterLab IDE; Whiteboard is Excalidraw and is
 *  code-split so its bundle only loads when opened. */

const LazyWhiteboard = React.lazy(
  () => import("#/components/features/canvas/whiteboard-view"),
);

type View = "markdown" | "documents" | "sheet" | "notebook" | "whiteboard";

const VIEWS: {
  id: View;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  // Markdown first: it is what the agent produces most, and the ONLYOFFICE
  // document surface is the heavier, rarer case.
  { id: "markdown", label: "Markdown", icon: FileText },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "sheet", label: "Sheet", icon: Table2 },
  { id: "notebook", label: "Notebook", icon: FileTerminal },
  { id: "whiteboard", label: "Whiteboard", icon: PenTool },
];

// Hover-intent dwell before we prewarm — an incidental mouse pass must not mount
// a heavy editor. Matches the plan's §4.1 debounced prewarm.
const HOVER_INTENT_MS = 250;

function ViewSwitcher({
  view,
  onChange,
  onPrewarm,
}: {
  view: View;
  onChange: (v: View) => void;
  onPrewarm: (v: View) => void;
}) {
  const hoverTimer = React.useRef<number | undefined>(undefined);
  const clearHover = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
  };
  React.useEffect(() => clearHover, []);

  return (
    /*
     * Explicitly the drawer strip's colour, not the page's.
     *
     * The primary tab strip above (Chat · Canvas · …) has no background of its
     * own, so it shows the drawer root's `--cg-bg-sidebar`. This bar inherited
     * the pane's `--cg-bg-page` instead, and under `.cg-m365` those tokens are
     * NOT the same value — #1b1a19 against #1f1f1f — so the two strips sat as
     * visibly different bands with a seam between them. Only the bar takes the
     * strip colour; the pane below keeps the page background it should have.
     */
    <div className="flex items-center gap-1 border-b border-[var(--cg-border-subtle)] bg-[var(--cg-bg-sidebar)] px-3 py-1.5">
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          // Prewarm on hover-intent: after a short dwell, mount the pane hidden
          // so clicking hits an already-warm editor.
          onMouseEnter={() => {
            clearHover();
            hoverTimer.current = window.setTimeout(
              () => onPrewarm(id),
              HOVER_INTENT_MS,
            );
          }}
          onMouseLeave={clearHover}
          onFocus={() => onPrewarm(id)}
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] transition-colors",
            // Same pill tokens as the primary strip above, so the two bars
            // cannot express "selected" differently.
            view === id
              ? "cg-tab-selected"
              : "cg-tab-hoverable text-[var(--cg-text-nav)]",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// How many heavy editor panes may stay resident at once, and how long a hidden
// pane survives before it's evicted to free memory. This is the VS-Code model:
// keep-alive so switching is instant, but BOUNDED so memory can't grow without
// limit (each pane is a whole JupyterLab app / ONLYOFFICE or draw.io iframe).
const MAX_RESIDENT = 2; // active + 1 most-recently-used
const IDLE_EVICT_MS = 3 * 60_000; // drop a hidden pane after 3 min unused

function CanvasTab() {
  // MARKDOWN FIRST. Opening on Notebook meant every visit to Canvas started a
  // JupyterLab frame and a kernel — seconds of spinner for a tab most visits are
  // not about — while markdown, the format the agent actually produces most, was
  // a click away behind it. The cheapest and most-wanted pane is the one that
  // should be on screen when the tab opens.
  const [view, setView] = React.useState<View>("markdown");
  const { conversationId } = useConversationId();

  // Bounded LRU keep-alive. `resident` is MRU-ordered; a view mounts the first
  // time it becomes active (so it initialises while visible, which ONLYOFFICE /
  // draw.io require for correct sizing), stays mounted+hidden on later switches
  // for instant return, and is EVICTED once it falls past MAX_RESIDENT or sits
  // idle past IDLE_EVICT_MS — re-created on demand. Bounds memory to at most
  // MAX_RESIDENT heavy iframes instead of all four.
  const [resident, setResident] = React.useState<View[]>([view]);

  React.useEffect(() => {
    setResident((prev) => {
      const next = [view, ...prev.filter((v) => v !== view)].slice(
        0,
        MAX_RESIDENT,
      );
      // Same membership+order → keep the ref so we don't churn renders.
      return next.length === prev.length && next.every((v, i) => v === prev[i])
        ? prev
        : next;
    });
  }, [view]);

  // Prewarm: mount a pane (hidden) ahead of a click WITHOUT disturbing the active
  // pane (index 0 is never evicted). Reuses the LRU + idle-eviction, so a
  // prewarmed-but-never-clicked pane is reclaimed after IDLE_EVICT_MS.
  const prewarm = React.useCallback((v: View) => {
    setResident((prev) => {
      if (prev.includes(v)) return prev;
      const active = prev[0];
      const rest = prev.slice(1).filter((x) => x !== v);
      return [active, v, ...rest].slice(0, MAX_RESIDENT);
    });
  }, []);

  // Idle eviction: if a resident pane has been hidden for IDLE_EVICT_MS, drop it.
  React.useEffect(() => {
    if (resident.length <= 1) return undefined;
    const t = window.setTimeout(() => {
      setResident((prev) => (prev.length > 1 ? [prev[0]] : prev));
    }, IDLE_EVICT_MS);
    return () => window.clearTimeout(t);
  }, [resident, view]);

  // When a pane becomes active, nudge a resize on the next frame so an editor
  // that was mounted while hidden (prewarmed) lays out to full size on show —
  // ONLYOFFICE, draw.io and Lumino all relayout on window resize. Cheap + safe,
  // and keeps the proven display:none visibility model (no behavioural change).
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() =>
      window.dispatchEvent(new Event("resize")),
    );
    return () => window.cancelAnimationFrame(id);
  }, [view]);

  const isResident = (v: View) => resident.includes(v);
  const paneClass = (v: View) =>
    cn("h-full w-full", view === v ? "block" : "hidden");

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--cg-bg-page)]">
      <ViewSwitcher view={view} onChange={setView} onPrewarm={prewarm} />
      <div className="relative min-h-0 flex-1">
        {isResident("notebook") && (
          <div className={paneClass("notebook")}>
            <Jupyter />
          </div>
        )}

        {isResident("markdown") && (
          <div className={paneClass("markdown")}>
            <MarkdownView conversationId={conversationId} />
          </div>
        )}

        {isResident("documents") && (
          <div className={paneClass("documents")}>
            <DocumentsView conversationId={conversationId} />
          </div>
        )}

        {isResident("sheet") && (
          <div className={paneClass("sheet")}>
            {/* The spreadsheet opens in ONLYOFFICE (full cell editor), backed by
                the workspace file via the signed file proxy. */}
            <OnlyOfficeFile
              filePath="pages/analysis.csv"
              fileName="analysis.csv"
              mode="edit"
            />
          </div>
        )}

        {isResident("whiteboard") && (
          <div className={paneClass("whiteboard")}>
            <SurfaceHost
              surfaceId="whiteboard"
              conversationId={conversationId ?? "default"}
              title="Whiteboard"
            >
              {(nonce) => (
                <React.Suspense
                  fallback={
                    <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--cg-text-muted)]">
                      Loading whiteboard…
                    </div>
                  }
                >
                  <LazyWhiteboard key={nonce} conversationId={conversationId} />
                </React.Suspense>
              )}
            </SurfaceHost>
          </div>
        )}
      </div>
    </div>
  );
}

export default CanvasTab;

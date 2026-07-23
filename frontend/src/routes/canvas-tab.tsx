/* eslint-disable i18next/no-literal-string */
import React from "react";
import { FileText, Table2, FileTerminal, PenTool } from "lucide-react";
import { cn } from "#/utils/utils";
import Jupyter from "#/routes/jupyter-tab";
import OnlyOfficeFile from "#/components/features/office-viewer/OnlyOfficeFile";
import DocumentsView from "#/components/features/canvas/documents-view";
import { useConversationId } from "#/hooks/use-conversation-id";

/** Canvas — the working surface. One tab, four views:
 *  Documents · Sheet · Notebook · Whiteboard.
 *
 *  Notebook is the full embedded JupyterLab IDE; Whiteboard is Excalidraw and is
 *  code-split so its bundle only loads when opened. */

const LazyWhiteboard = React.lazy(
  () => import("#/components/features/canvas/whiteboard-view"),
);

type View = "documents" | "sheet" | "notebook" | "whiteboard";

const VIEWS: {
  id: View;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "documents", label: "Documents", icon: FileText },
  { id: "sheet", label: "Sheet", icon: Table2 },
  { id: "notebook", label: "Notebook", icon: FileTerminal },
  { id: "whiteboard", label: "Whiteboard", icon: PenTool },
];

function ViewSwitcher({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-[var(--cg-border-subtle)] px-3 py-1.5">
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] transition-colors",
            view === id
              ? "bg-[var(--cg-bg-card)] text-[var(--cg-text-primary)]"
              : "text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-primary)]",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

function CanvasTab() {
  const [view, setView] = React.useState<View>("notebook");
  const { conversationId } = useConversationId();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--cg-bg-page)]">
      <ViewSwitcher view={view} onChange={setView} />
      <div className="min-h-0 flex-1">
        {/* Notebook stays MOUNTED across view switches: the JupyterLab app is
            expensive to initialise and re-mounting it re-registers every plugin
            (and would drop the live kernel). Hide it instead of unmounting. */}
        <div className={cn("h-full", view === "notebook" ? "block" : "hidden")}>
          <Jupyter />
        </div>

        {view === "documents" && (
          <DocumentsView conversationId={conversationId} />
        )}

        {view === "sheet" && (
          <div className="h-full">
            {/* The spreadsheet opens in ONLYOFFICE (full cell editor), backed by
                the workspace file via the signed file proxy. */}
            <OnlyOfficeFile
              filePath="pages/analysis.csv"
              fileName="analysis.csv"
              mode="edit"
            />
          </div>
        )}

        {view === "whiteboard" && (
          <React.Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--cg-text-muted)]">
                Loading whiteboard…
              </div>
            }
          >
            <LazyWhiteboard conversationId={conversationId} />
          </React.Suspense>
        )}
      </div>
    </div>
  );
}

export default CanvasTab;

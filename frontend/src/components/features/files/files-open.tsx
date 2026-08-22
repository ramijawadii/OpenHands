/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { X, Download, Pencil, Eye, Loader2 } from "lucide-react";
import { filesApi, baseName } from "./files-api";
import { extensionOf } from "./files-filetypes";
import { TextView } from "./files-textview";

/**
 * Open an artifact in the tool that understands it.
 *
 * A registry, not a chain of ifs in the click handler: the set of "types we can
 * open" is a product fact that the context menu, the tiles and the details panel
 * all need to agree on, so it is stated once here.
 *
 * VIEW IS THE DEFAULT for every type. These are finished artifacts under
 * versioning and audit — opening one to look at it must not be able to produce a
 * new revision by accident. Edit is one deliberate click away, and only for
 * formats whose editor can actually write back.
 *
 * Anything with no viewer downloads instead. A tool that is not deployed must
 * degrade to a download, never to a blank tab.
 */

export type OpenKind = "office" | "diagram" | "notebook" | "text" | "none";

const OFFICE = new Set([
  "doc",
  "docx",
  "odt",
  "rtf",
  "xls",
  "xlsx",
  "ods",
  "csv",
  "ppt",
  "pptx",
  "odp",
  "pdf",
]);
const DIAGRAM = new Set(["drawio", "dio", "mmd", "mermaid"]);
const NOTEBOOK = new Set(["ipynb"]);

/** Rendered in-app, no external editor needed. Markdown gets the product's own
 *  renderer — which also draws mermaid fences — and everything else is shown as
 *  source. These are the formats the agent writes most, and downloading a
 *  finding note to read one paragraph was the sharpest edge in the surface. */
const TEXT = new Set([
  "md",
  "markdown",
  "txt",
  "log",
  "json",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "csv",
  "tsv",
  "py",
  "sh",
  "bash",
  "ps1",
  "js",
  "ts",
  "tsx",
  "jsx",
  "go",
  "rs",
  "java",
  "rb",
  "sql",
  "html",
  "css",
  "xml",
  "tex",
  "rst",
  "mmd",
  "mermaid",
]);

/** Which tool, if any, opens this path. */
export function openKindFor(path: string): OpenKind {
  const ext = extensionOf(path);
  if (OFFICE.has(ext)) return "office";
  if (DIAGRAM.has(ext)) return "diagram";
  if (NOTEBOOK.has(ext)) return "notebook";
  // Checked AFTER diagram: .mmd is both a text file and a diagram, and seeing
  // the rendered graph is more useful than seeing its source.
  if (TEXT.has(ext)) return "text";
  return "none";
}

/** Only some formats have an editor that can write back to this store. */
export function canEdit(path: string): boolean {
  const kind = openKindFor(path);
  if (kind === "office") return extensionOf(path) !== "pdf";
  return kind === "diagram";
}

const OnlyOfficeFile = React.lazy(
  () => import("#/components/features/office-viewer/OnlyOfficeFile"),
);
const DrawioViewer = React.lazy(
  () => import("#/components/features/office-viewer/drawio-viewer"),
);

function Busy() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-[12px] text-[var(--cg-text-muted)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      Opening…
    </div>
  );
}

/**
 * Shown when a tool exists but cannot reach this store.
 *
 * Deliberately explicit about WHY, and offers the download that does work. A
 * spinner that never resolves, or an empty editor, would leave someone assuming
 * their artifact was corrupt.
 */
function NotWired({
  tool,
  reason,
  path,
  store,
  conversationId,
}: {
  tool: string;
  reason: string;
  path: string;
  store: string;
  conversationId: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-[13px] text-[var(--cg-text-nav)]">
        Cannot open this in {tool} yet.
      </p>
      <p className="max-w-md text-[11px] leading-relaxed text-[var(--cg-text-muted)]">
        {reason}
      </p>
      <a
        href={filesApi.downloadUrl(path, conversationId, store)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-3 py-1.5 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
      >
        <Download className="h-3 w-3" />
        Download instead
      </a>
    </div>
  );
}

/**
 * The viewer overlay.
 *
 * Fills the Files pane rather than opening a browser tab: the point of a library
 * is that you stay in it while you check things, and a new tab loses the folder,
 * the selection and the scroll position you were working from.
 */
export function FileViewer({
  path,
  store,
  conversationId,
  onClose,
}: {
  path: string;
  store: string;
  conversationId: string;
  onClose: () => void;
}) {
  const kind = openKindFor(path);
  const [mode, setMode] = React.useState<"view" | "edit">("view");
  const editable = canEdit(path);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[var(--cg-bg-page)]">
      <div className="flex items-center gap-2 border-b border-[var(--cg-border)] px-3 py-2">
        <span
          className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--cg-text-nav)]"
          title={path}
        >
          {baseName(path)}
        </span>

        {editable && (
          <button
            type="button"
            onClick={() => setMode((m) => (m === "view" ? "edit" : "view"))}
            className="flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
          >
            {mode === "view" ? (
              <>
                <Pencil className="h-3 w-3" />
                Edit
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                View only
              </>
            )}
          </button>
        )}

        <a
          href={filesApi.downloadUrl(path, conversationId, store)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
        >
          <Download className="h-3 w-3" />
          Download
        </a>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          className="rounded p-1 text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <React.Suspense fallback={<Busy />}>
          {kind === "office" && (
            <OnlyOfficeFile
              filePath={path}
              fileName={baseName(path)}
              mode={mode}
              store={store === "sandbox" ? "sandbox" : "artifacts"}
            />
          )}
          {kind === "diagram" && (
            <DrawioViewer
              conversationId={conversationId}
              filePath={path}
              store={store === "sandbox" ? "sandbox" : "artifacts"}
            />
          )}
          {kind === "text" && (
            <TextView
              path={path}
              store={store}
              conversationId={conversationId}
            />
          )}
          {kind === "notebook" && (
            <NotWired
              tool="JupyterLab"
              reason="JupyterLab serves its own filesystem, which is not the artifact library. Opening a library notebook needs the gateway to mount this store."
              path={path}
              store={store}
              conversationId={conversationId}
            />
          )}
        </React.Suspense>
      </div>
    </div>
  );
}

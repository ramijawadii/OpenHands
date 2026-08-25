/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import {
  X,
  Download,
  Pencil,
  Eye,
  Loader2,
  History,
  Play,
  FileCode,
} from "lucide-react";
import { filesApi, baseName } from "./files-api";
import { extensionOf } from "./files-filetypes";
import { TextView } from "./files-textview";
import { MermaidFileView } from "./files-mermaid";
import { JupyterFileView } from "./files-jupyter";

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

export type OpenKind =
  | "office"
  | "diagram"
  | "mermaid"
  | "notebook"
  | "text"
  | "none";

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
/** draw.io's own format. `.mmd` is NOT here: draw.io cannot read mermaid source,
 *  so routing one to it produced an empty canvas with no error — a diagram file
 *  that opened to nothing. Mermaid has its own viewer below. */
const DIAGRAM = new Set(["drawio", "dio"]);
const MERMAID = new Set(["mmd", "mermaid"]);
/** Runnable in the conversation's JupyterLab. `.py` is here as well as in TEXT:
 *  a script's default is still to be READ (it is usually evidence, not a thing
 *  to execute), so `openKindFor` keeps it as text and the viewer offers "Run in
 *  JupyterLab" as a deliberate second action. A notebook has no such reading
 *  mode worth defaulting to — it IS the kernel — so it opens in Jupyter. */
const NOTEBOOK = new Set(["ipynb"]);
const RUNNABLE = new Set(["ipynb", "py"]);

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
  if (MERMAID.has(ext)) return "mermaid";
  if (NOTEBOOK.has(ext)) return "notebook";
  // Checked LAST: several of these extensions are also plain text, and the
  // rendered form is what someone opening the file wants to see first. The
  // source is one toggle away inside each viewer.
  if (TEXT.has(ext)) return "text";
  return "none";
}

/** Can this be handed to JupyterLab to run? */
export function canRunInJupyter(path: string): boolean {
  return RUNNABLE.has(extensionOf(path));
}

/** Only some formats have an editor that can write back to this store. */
export function canEdit(path: string): boolean {
  const kind = openKindFor(path);
  if (kind === "office") return extensionOf(path) !== "pdf";
  if (kind === "text") {
    const ext = extensionOf(path);
    // Only markdown has a real editor here. The rest are shown as source, and
    // an Edit button over a read-only <pre> would be a control that does nothing.
    return ext === "md" || ext === "markdown";
  }
  // Mermaid is deliberately NOT editable here: there is no mermaid editor in
  // this surface, only a renderer, and an Edit button that opened a read-only
  // diagram would be a control that does nothing.
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
  onHistory,
  reloadToken = 0,
}: {
  path: string;
  store: string;
  conversationId: string;
  onClose: () => void;
  /** Opens the file's version history. Present on the viewer because deciding
   *  whether to trust a document usually means checking what changed in it. */
  onHistory?: (path: string) => void;
  /** Changes when the file's CONTENT changed under the same path. */
  reloadToken?: number;
}) {
  const baseKind = openKindFor(path);
  const [mode, setMode] = React.useState<"view" | "edit">("view");
  // A script opens as SOURCE and is handed to Jupyter only when asked. Held per
  // path so switching files does not carry the last one's choice over.
  const [runnable, setRunnable] = React.useState(false);
  React.useEffect(() => setRunnable(false), [path]);
  const kind = runnable ? "notebook" : baseKind;
  const editable = canEdit(path) && !runnable;
  const offersJupyter = canRunInJupyter(path) && baseKind !== "notebook";

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

        {offersJupyter && (
          <button
            type="button"
            onClick={() => setRunnable((v) => !v)}
            title="Open this file in the conversation's JupyterLab, where it can be run"
            className="flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
          >
            {runnable ? (
              <>
                <FileCode className="h-3 w-3" />
                Show source
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Run in JupyterLab
              </>
            )}
          </button>
        )}

        {onHistory && (
          <button
            type="button"
            onClick={() => onHistory(path)}
            className="flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-1 text-[11px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
          >
            <History className="h-3 w-3" />
            Versions
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
              key={`office|${path}|${reloadToken}`}
              filePath={path}
              fileName={baseName(path)}
              mode={mode}
              store={store === "sandbox" ? "sandbox" : "artifacts"}
            />
          )}
          {kind === "diagram" && (
            <DrawioViewer
              key={`drawio|${path}|${reloadToken}`}
              conversationId={conversationId}
              filePath={path}
              store={store === "sandbox" ? "sandbox" : "artifacts"}
            />
          )}
          {kind === "text" && (
            <TextView
              // KEYED BY DOCUMENT, as the Canvas surface does. Without a key
              // this component persists across a switch from one file to
              // another, and for a moment its autosave holds the OLD document's
              // text while already pointing at the NEW document's path — which
              // is a write of A's contents over B.
              key={`${store}|${path}`}
              path={path}
              store={store}
              conversationId={conversationId}
              readOnly={mode === "view"}
              reloadToken={reloadToken}
            />
          )}
          {kind === "mermaid" && (
            <MermaidFileView
              path={path}
              store={store}
              conversationId={conversationId}
              reloadToken={reloadToken}
            />
          )}
          {kind === "notebook" && (
            // `reloadToken` IS part of the key, like the other viewers.
            //
            // Without it a restore left the notebook frame untouched: the file
            // on the server went back to an earlier revision while JupyterLab
            // carried on showing the one it had already loaded, with no signal
            // that the two had diverged. Remounting mints a fresh gateway
            // session and boots the app again, which re-fetches the document
            // through the contents API — the only way an iframe on another
            // origin can be made to re-read anything.
            <JupyterFileView
              key={`jlab|${path}|${store}|${reloadToken}`}
              path={path}
              store={store}
              conversationId={conversationId}
              reloadToken={reloadToken}
            />
          )}
        </React.Suspense>
      </div>
    </div>
  );
}

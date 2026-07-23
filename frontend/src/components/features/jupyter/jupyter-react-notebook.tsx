/* eslint-disable i18next/no-literal-string */
// MUST be first: installs a `require` shim before any jupyter-react/JupyterLab
// module evaluates (they contain raw CJS `require(...)` calls that Rollup leaves
// in place and that would otherwise throw "require is not defined" on mount).
import "./jupyter-require-shim";
import React from "react";
import type { INotebookContent } from "@jupyterlab/nbformat";
import { ServiceManager, ServerConnection } from "@jupyterlab/services";
// Import from the tree-shakeable SUBPATH entries, not the top-level barrel. The
// barrel does `export * from './app'`, which drags in the full JupyterLab app
// shell (@jupyterlab/apputils-extension) and its legacy webpack-`~` CSS — none
// of which an embedded notebook needs, and which breaks the Vite/Tailwind CSS
// resolver. We also build the ServiceManager by hand instead of the package's
// `useJupyter` hook: the hook's `./jupyter` barrel re-exports the JupyterLite
// in-browser-kernel code (a webpack `?text` raw import Vite can't parse), which
// we don't use — we talk to the server-backed kernel via the proxy. This keeps
// our supply-chain surface minimal and the build clean.
import {
  Notebook,
  NotebookToolbar,
  CellSidebar,
  CellSidebarExtension,
} from "@datalayer/jupyter-react/notebook";
import { JupyterReactTheme } from "@datalayer/jupyter-react/theme";
// JupyterLab base styling (the --jp-* CSS variables + notebook/cell layout).
// Without it the notebook mounts but renders invisible on a dark background.
// This is the `./style/*` export (self-contained base.css — no webpack-`~`
// imports, unlike the app-shell extension CSS we deliberately avoid).
import "@datalayer/jupyter-react/style/index.css";

/** The full JupyterLab notebook (step 4 of the jupyter-react track).
 *
 *  This file is the ONLY place `@datalayer/jupyter-react` (726 transitive pkgs)
 *  is imported, and it is loaded via React.lazy from jupyter.tsx, so the heavy
 *  JupyterLab bundle is split into its own chunk and only fetched when a live
 *  Jupyter server is actually available for the conversation. The store-based
 *  notebook view remains the default; this is progressive enhancement.
 *
 *  Auth: the browser talks ONLY to the control-plane proxy (baseUrl/wsUrl),
 *  never the sandbox. The proxy injects the sandbox token server-side, so
 *  `token` here is empty on purpose — the app session (same-origin cookies,
 *  hence `credentials: "same-origin"`) authenticates the fetch/WS to the proxy.
 *  The proxy shares one `/jupyter/api/...` prefix for both HTTP and WS, matching
 *  how ServerConnection joins `api/...` and `api/kernels/{id}/channels`. */

/** A one-cell starter so the panel always renders a usable notebook, even on a
 *  brand-new sandbox where no .ipynb exists yet — never depend on a pre-existing
 *  file (that would be an opaque contents-API 404 on first open). */
const STARTER_NB: INotebookContent = {
  cells: [
    {
      cell_type: "code",
      source: [],
      metadata: {},
      outputs: [],
      execution_count: null,
    },
  ],
  metadata: {
    kernelspec: {
      name: "python3",
      display_name: "Python 3",
      language: "python",
    },
    language_info: { name: "python" },
  },
  nbformat: 4,
  nbformat_minor: 5,
};

interface Props {
  baseUrl: string;
  wsUrl: string;
  /** empty in the proxy model — kept for API symmetry / local-dev override */
  token: string;
  // NOTE: no `path` prop — we intentionally mount in-memory nbformat rather
  // than loading a file from the contents API (see the note below). A
  // save-to-path binding is a later step and will reintroduce it then.
}

export default function JupyterReactNotebook({ baseUrl, wsUrl, token }: Props) {
  // Build the ServiceManager against the proxied URLs. `credentials:
  // "same-origin"` so the browser sends the app session cookie to the proxy
  // (which then injects the sandbox token). Memoised on the URLs so a re-render
  // doesn't spin up a second manager/kernel.
  const serviceManager = React.useMemo(() => {
    const serverSettings = ServerConnection.makeSettings({
      baseUrl,
      wsUrl,
      token,
      appendToken: false,
      init: { credentials: "same-origin" },
    });
    return new ServiceManager({ serverSettings });
  }, [baseUrl, wsUrl, token]);

  // Dispose the manager (and its kernel sockets) when we unmount or the URLs
  // change, so we don't leak WebSockets across conversation switches.
  React.useEffect(() => () => serviceManager.dispose(), [serviceManager]);

  // Per-cell controls (run / insert / delete beside each cell). Memoised so the
  // extension isn't re-created every render.
  const extensions = React.useMemo(
    () => [new CellSidebarExtension({ factory: CellSidebar })],
    [],
  );

  // IMPORTANT: pass `nbformat` (in-memory starter) and DO NOT pass `path`. With a
  // `path`, the Notebook tries to LOAD that file from the contents API — and a
  // brand-new sandbox has no such file, so it 404s with a "File Load Error"
  // modal. In-memory content mounts cleanly; saving to a path is a later step.
  // Sizing: JupyterLab's Notebook is a Lumino widget that needs a CONCRETE height
  // — `height="100%"` collapses to 0 through the JupyterReactTheme wrapper (whose
  // div isn't height:100%), so the notebook mounts but renders invisible. Give it
  // a real viewport-relative height inside an explicitly-sized, light, scrollable
  // container so the cells are visible on the dark app shell.
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        minHeight: 480,
        width: "100%",
        overflow: "auto",
        background: "#ffffff",
      }}
    >
      <JupyterReactTheme>
        <Notebook
          id="cg-analysis-notebook"
          serviceManager={serviceManager}
          startDefaultKernel
          nbformat={STARTER_NB}
          Toolbar={NotebookToolbar}
          extensions={extensions}
          cellSidebarMargin={120}
          height="calc(100vh - 150px)"
        />
      </JupyterReactTheme>
    </div>
  );
}

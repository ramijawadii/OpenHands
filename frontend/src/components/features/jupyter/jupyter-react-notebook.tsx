/* eslint-disable i18next/no-literal-string */
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
import { Notebook } from "@datalayer/jupyter-react/notebook";
import { JupyterReactTheme } from "@datalayer/jupyter-react/theme";

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
  /** notebook path in /workspace to bind saves to; optional */
  path?: string;
}

export default function JupyterReactNotebook({
  baseUrl,
  wsUrl,
  token,
  path,
}: Props) {
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

  return (
    <JupyterReactTheme>
      <Notebook
        id="cg-analysis-notebook"
        serviceManager={serviceManager}
        startDefaultKernel
        nbformat={STARTER_NB}
        path={path}
        height="100%"
      />
    </JupyterReactTheme>
  );
}

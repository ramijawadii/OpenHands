/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { Loader2, AlertTriangle, Download } from "lucide-react";
import { openHands } from "#/api/open-hands-axios";
import { filesApi } from "./files-api";

/**
 * Open a notebook or a script in the conversation's real JupyterLab.
 *
 * WHY AN IFRAME AND NOT A RENDERER. A notebook is not a document, it is a
 * program with a kernel. Rendering the `.ipynb` JSON read-only would show cells
 * and stale outputs while quietly removing the only thing anyone opens a
 * notebook to do — run it. The conversation already has a JupyterLab, process-
 * isolated on its own origin (`{cid}.jlab.<host>`), so this points at that and
 * lands on the file rather than on the launcher.
 *
 * WHICH STORE IT CAN REACH:
 *
 *   sandbox   — works now. JupyterLab is started against `/workspace`, which IS
 *               the sandbox, so a relative path resolves directly.
 *   artifacts — needs `cloudguard/jupyter/contents.py` (`VfsContentsManager`)
 *               registered in the sandbox's `jupyter_server_config.py`, which
 *               mounts the library under `library/`. Until the runtime image
 *               carries that config, this says so plainly instead of opening an
 *               empty tab against a path Jupyter has never heard of.
 *
 * The library is deliberately NOT mounted into the sandbox filesystem — see
 * deploy/seafile/README.md. `VfsContentsManager` reaches it over the audited VFS
 * HTTP API instead, so a notebook opened from the library is read and saved
 * through the same policy and the same audit chain as every other access.
 */

/** Where the library appears inside JupyterLab. Must match `MOUNT` in
 *  `cloudguard/jupyter/contents.py` — two spellings of this would produce a
 *  file browser that lists the library at one path and opens it at another. */
const LIBRARY_MOUNT = "library";

export function JupyterFileView({
  path,
  store,
  conversationId,
  reloadToken = 0,
}: {
  path: string;
  store: string;
  conversationId: string;
  /** Bumped when the bytes changed under the same path — a revert or a restore.
   *  Re-mints the session so the frame boots against the current revision. */
  reloadToken?: number;
}) {
  const [state, setState] = React.useState<
    | { kind: "loading" }
    | { kind: "ready"; url: string }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  React.useEffect(() => {
    if (!conversationId) {
      setState({
        kind: "error",
        // Not a failure to dress up: JupyterLab belongs to a conversation's
        // sandbox, so there is genuinely nothing to open one in from here.
        message:
          "JupyterLab runs inside a conversation's sandbox, and this surface is not open in one. Start or open a conversation to run this file.",
      });
      return undefined;
    }

    let cancelled = false;
    setState({ kind: "loading" });
    const target =
      store === "sandbox"
        ? path
        : `${LIBRARY_MOUNT}/${path}`.replace(/^\/+/, "");

    openHands
      .get<{ url: string }>("/api/cloudguard/jupyter/session", {
        params: { conversation_id: conversationId, path: target },
      })
      .then((res) => {
        if (!cancelled) setState({ kind: "ready", url: res.data.url });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // THE SERVER'S REASON WINS. This used to answer every failure with "the
        // gateway is not available yet", which was one specific guess presented
        // as fact — and it was the WRONG guess for the most common failure: the
        // gateway was fine, JupyterLab simply could not see the path because the
        // sandbox predates the library mount. The route says exactly that; the
        // generic sentence hid it and sent people to look at the wrong thing.
        const detail = (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail;
        setState({
          kind: "error",
          message:
            typeof detail === "string" && detail.trim()
              ? detail
              : // Kept only as the genuine fallback: no response body at all,
                // which really does mean the gateway did not answer.
                "The notebook gateway did not answer. It starts with the conversation's sandbox — if the agent has not run anything yet, give it a moment.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [path, store, conversationId, reloadToken]);

  if (state.kind === "loading") {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[12px] text-[var(--cg-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Opening in JupyterLab…
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle className="h-5 w-5 text-amber-400" />
        <p className="max-w-md text-[12px] leading-relaxed text-[var(--cg-text-muted)]">
          {state.message}
        </p>
        {/* A tool that is not reachable degrades to the download that is —
            never to a blank frame. */}
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

  return (
    <iframe
      title={`JupyterLab — ${path}`}
      src={state.url}
      // The same lock as the Notebook tab (FAIL_SAFE_ISOLATION_SPEC §2.5):
      // `allow-same-origin` is safe here precisely because the frame is
      // CROSS-origin to the app — it gets its own origin, not ours.
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-modals"
      style={{ width: "100%", height: "100%", border: 0, display: "block" }}
    />
  );
}

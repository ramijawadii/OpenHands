/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { filesApi, VfsError, baseName } from "./files-api";
import { extensionOf } from "./files-filetypes";

const MarkdownEditor = React.lazy(() =>
  import("./files-mdx").then((m) => ({ default: m.MarkdownEditor })),
);

/**
 * In-app reader for text the agent writes.
 *
 * Markdown goes through the product's own renderer — the same one the chat uses,
 * so a finding note reads identically wherever you meet it, and mermaid fences
 * draw as diagrams rather than as code. Everything else is shown as source.
 *
 * This exists because downloading a file to read one paragraph was the sharpest
 * edge left in the surface: `.md` is the format the agent produces most, and it
 * was the one type with no way to look at it.
 */

/** Above this, render as plain source regardless of type.
 *
 *  Markdown rendering builds a React tree per block; a multi-megabyte document
 *  would lock the tab. Source in a `<pre>` is one node and stays responsive, so
 *  the large-file path degrades to something usable rather than to a freeze. */
const RENDER_LIMIT = 512 * 1024;
const READ_LIMIT = 4 * 1024 * 1024;

export function TextView({
  path,
  store,
  conversationId,
  readOnly = true,
  onSaved,
  reloadToken = 0,
}: {
  path: string;
  store: string;
  conversationId: string;
  /** Markdown is editable when the viewer is in edit mode; everything else is
   *  always source-only, because there is no editor for it here. */
  readOnly?: boolean;
  onSaved?: () => void;
  /** Bumped when the bytes changed under the same path — a revert or a restore.
   *  Without it the fetch effect never re-runs, because its other inputs are
   *  identical and the viewer keeps showing the version you just replaced. */
  reloadToken?: number;
}) {
  const [saving, setSaving] = React.useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");
  const [saveError, setSaveError] = React.useState("");
  const [state, setState] = React.useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; text: string; truncated: boolean; tooBig: boolean }
  >({ kind: "loading" });

  /**
   * RETURNS THE PROMISE. The editor above awaits it and only marks the buffer
   * clean once it resolves — a save that failed must leave the document dirty,
   * the unload guard armed, and Revert pointing at the last text the store
   * actually has. Returning void here is what made a failed write look like a
   * successful one.
   */
  const save = React.useCallback(
    (markdown: string) => {
      setSaving("saving");
      setSaveError("");
      return fetch("/api/cloudguard/vfs/write", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          path,
          text: markdown,
          mime: "text/markdown",
          store,
        }),
      })
        .then(async (r) => {
          if (!r.ok) {
            let detail = `HTTP ${r.status}`;
            try {
              detail = (await r.json())?.detail ?? detail;
            } catch {
              /* a non-JSON error body is still an error */
            }
            throw new Error(detail);
          }
          setSaving("saved");
          onSaved?.();
          window.setTimeout(
            () => setSaving((v) => (v === "saved" ? "idle" : v)),
            2500,
          );
        })
        .catch((e: Error) => {
          // Surfaced, never swallowed: a save that silently failed is the worst
          // outcome for an editor, because the analyst closes the pane believing
          // the edit is stored.
          setSaving("failed");
          setSaveError(e.message);
          // RE-THROWN as well as shown. This banner is one of two places the
          // failure has to land; the other is the editor's own dirty state,
          // which only learns about it if the promise rejects.
          throw e;
        });
    },
    [path, store, conversationId, onSaved],
  );

  React.useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    fetch(filesApi.downloadUrl(path, conversationId, store), {
      credentials: "same-origin",
    })
      .then(async (r) => {
        if (!r.ok) throw new VfsError(r.status, `HTTP ${r.status}`);
        const buf = new Uint8Array(await r.arrayBuffer());
        if (cancelled) return;
        const truncated = buf.length > READ_LIMIT;
        const text = new TextDecoder("utf-8", { fatal: false }).decode(
          truncated ? buf.subarray(0, READ_LIMIT) : buf,
        );
        setState({
          kind: "ready",
          text,
          truncated,
          tooBig: buf.length > RENDER_LIMIT,
        });
      })
      .catch((e: VfsError) => {
        if (cancelled) return;
        // A revert rewrites the file server-side; a read issued in the same
        // moment can land between commits and 404. Retry once before declaring
        // the document unreadable — showing an error for a file that exists is
        // worse than a short wait.
        window.setTimeout(() => {
          if (cancelled) return;
          fetch(filesApi.downloadUrl(path, conversationId, store), {
            credentials: "same-origin",
          })
            .then(async (r) => {
              if (!r.ok) throw new VfsError(r.status, `HTTP ${r.status}`);
              const buf = new Uint8Array(await r.arrayBuffer());
              if (cancelled) return;
              const truncated = buf.length > READ_LIMIT;
              setState({
                kind: "ready",
                text: new TextDecoder("utf-8", { fatal: false }).decode(
                  truncated ? buf.subarray(0, READ_LIMIT) : buf,
                ),
                truncated,
                tooBig: buf.length > RENDER_LIMIT,
              });
            })
            .catch(() => {
              if (!cancelled)
                setState({
                  kind: "error",
                  message: e.message || "Could not read this file.",
                });
            });
        }, 400);
      });
    return () => {
      cancelled = true;
    };
  }, [path, store, conversationId, reloadToken]);

  if (state.kind === "loading") {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[12px] text-[var(--cg-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading {baseName(path)}…
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex h-full items-center justify-center gap-2 p-6 text-[12px] text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        {state.message}
      </div>
    );
  }

  const ext = extensionOf(path);
  const asMarkdown = (ext === "md" || ext === "markdown") && !state.tooBig;

  return (
    <div
      className={
        asMarkdown ? "flex h-full flex-col" : "h-full overflow-auto p-4"
      }
    >
      {saving !== "idle" && (
        <p
          role="status"
          className={`mb-3 rounded-md px-3 py-1.5 text-[11px] ${
            saving === "failed"
              ? "border border-amber-500/40 bg-amber-500/10 text-[var(--cg-text-nav)]"
              : "text-[var(--cg-text-muted)]"
          }`}
        >
          {saving === "saving" && "Saving…"}
          {saving === "saved" && "Saved as a new version."}
          {saving === "failed" && `Not saved — ${saveError}`}
        </p>
      )}
      {state.truncated && (
        <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[11px] text-[var(--cg-text-nav)]">
          Showing the first 4 MB of a larger file. Download it to read the rest.
        </p>
      )}
      {asMarkdown ? (
        <React.Suspense
          fallback={
            <div className="flex items-center gap-2 p-4 text-[12px] text-[var(--cg-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading editor…
            </div>
          }
        >
          <MarkdownEditor
            markdown={state.text}
            readOnly={readOnly}
            onSave={save}
            // Store-qualified: the SAME path exists in the sandbox and in the
            // library, and one draft key for both would offer a sandbox draft
            // when opening the library copy.
            autosaveKey={`${store}:${path}`}
            conversationId={conversationId}
            store={store}
            // Images land beside the document they belong to, so moving or
            // sharing the folder keeps them together.
            imageDir={
              path.includes("/")
                ? `${path.slice(0, path.lastIndexOf("/"))}/assets`
                : "assets"
            }
          />
        </React.Suspense>
      ) : (
        /* Rendered as TEXT, never markup. These bytes are whatever an agent
           wrote, and this pane is on the console's own origin. */
        <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-[var(--cg-text-nav)]">
          {state.text}
        </pre>
      )}
    </div>
  );
}

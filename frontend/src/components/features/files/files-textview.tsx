/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { filesApi, VfsError, baseName } from "./files-api";
import { extensionOf } from "./files-filetypes";
import { MarkdownRenderer } from "#/components/features/markdown/MarkdownRenderer";

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
}: {
  path: string;
  store: string;
  conversationId: string;
}) {
  const [state, setState] = React.useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; text: string; truncated: boolean; tooBig: boolean }
  >({ kind: "loading" });

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
        if (!cancelled)
          setState({
            kind: "error",
            message: e.message || "Could not read this file.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [path, store, conversationId]);

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
    <div className="h-full overflow-auto p-4">
      {state.truncated && (
        <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[11px] text-[var(--cg-text-nav)]">
          Showing the first 4 MB of a larger file. Download it to read the rest.
        </p>
      )}
      {asMarkdown ? (
        <div className="mx-auto max-w-[900px]">
          <MarkdownRenderer content={state.text} />
        </div>
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

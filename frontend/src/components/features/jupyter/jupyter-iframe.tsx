/* eslint-disable i18next/no-literal-string */
import React from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { openHands } from "#/api/open-hands-axios";

/**
 * JupyterIframe — the process-isolated Notebook (Step 3 of the isolation plan).
 * Fetches a cid-bound gateway session from the app and mounts the conversation's
 * NATIVE JupyterLab in a cross-origin iframe ({cid}.jlab.<host>), so it runs in
 * its own OS process and can be destroyed to free the whole process.
 *
 * This is THE notebook surface (it replaced the in-process @datalayer embed).
 * See docs/architecture/artifact-fast-isolation-plan.md.
 */

interface Props {
  conversationId: string;
}

export default function JupyterIframe({ conversationId }: Props) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);
    openHands
      .get<{ url: string }>("/api/cloudguard/jupyter/session", {
        params: { conversation_id: conversationId },
      })
      .then((res) => {
        if (!cancelled) setUrl(res.data.url);
      })
      .catch(() => {
        if (!cancelled) setError("Notebook gateway not available yet.");
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--cg-text-muted)]">
        <AlertTriangle className="h-6 w-6 text-amber-400" />
        <span className="text-[12px]">{error}</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--cg-text-muted)]">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-[12px]">Loading notebook…</span>
      </div>
    );
  }

  return (
    <iframe
      title="Notebook"
      src={url}
      // Locked per §2.5: only what native JupyterLab needs. allow-same-origin is
      // safe because the iframe is CROSS-origin to the app (its own jlab origin).
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-modals"
      style={{ width: "100%", height: "100%", border: 0, display: "block" }}
    />
  );
}

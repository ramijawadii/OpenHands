/* eslint-disable i18next/no-literal-string */
import React from "react";
import { DocumentEditor } from "@onlyoffice/document-editor-react";
import { Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { openHands } from "#/api/open-hands-axios";
import { browserReachableOrigin } from "#/utils/browser-reachable-origin";
import { useOnlyOfficeLive } from "./use-onlyoffice-live";

/**
 * OnlyOfficeEditor — embeds the self-hosted ONLYOFFICE document server to view or
 * edit docx / xlsx / pptx / pdf files.
 *
 * The JWT that ONLYOFFICE requires is signed SERVER-SIDE: on mount we POST the
 * file details to `/api/onlyoffice/token`, and the backend returns a signed
 * `token` + the document config. The signing secret never reaches the browser.
 *
 * See ONLYOFFICE_SETUP.md — notably that `fileUrl` / `callbackUrl` are resolved
 * from INSIDE the ONLYOFFICE container, so on a single host they must use
 * `host.docker.internal`, not `localhost`.
 */

// The connector's Config type is intentionally loose; the shape is validated by
// the server which signs it. Keep a local alias rather than pulling the heavy
// @onlyoffice/doceditor-types surface into app types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OnlyOfficeConfig = Record<string, any>;

interface TokenResponse {
  token: string;
  documentServerUrl: string;
  config: OnlyOfficeConfig;
}

export interface OnlyOfficeEditorProps {
  /** Publicly (container-)reachable URL to the file. Provide this OR
   *  conversationId + filePath (the backend then mints a signed proxy URL). */
  fileUrl?: string;
  /** Conversation whose sandbox holds the file. */
  conversationId?: string;
  /** Path to the file inside the selected store. */
  filePath?: string;
  /** Which store filePath refers to: the conversation sandbox (default) or the
   *  durable artifact library. The two hold different documents at the same
   *  relative path, so this is not a hint — the backend binds it into the
   *  signature that authorises the read and the save-back. */
  store?: "sandbox" | "artifacts";
  /** Display name including extension, e.g. "report.xlsx". */
  fileName: string;
  /** File extension: xlsx, docx, pptx, pdf, csv… */
  fileType: string;
  /** "edit" (default) or "view". */
  mode?: "edit" | "view";
  /** Where ONLYOFFICE posts save events. */
  callbackUrl?: string;
  /** CSS height, defaults to "100%". */
  height?: string;
  /** CSS width, defaults to "100%". */
  width?: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: TokenResponse };

// Browser-facing document-server origin. VITE_ONLYOFFICE_SERVER_URL is the public
// :80 origin (NOT the JWT secret). Falls back to the URL the backend reports.
const ENV_SERVER_URL =
  (import.meta.env.VITE_ONLYOFFICE_SERVER_URL as string | undefined) || "";

function OnlyOfficeEditor({
  fileUrl,
  conversationId,
  filePath,
  fileName,
  fileType,
  mode = "edit",
  callbackUrl,
  store = "sandbox",
  height = "100%",
  width = "100%",
}: OnlyOfficeEditorProps) {
  const [state, setState] = React.useState<LoadState>({ status: "loading" });

  // UNIQUE per instance. ONLYOFFICE's DocsAPI mounts each editor by DOM id, so a
  // hardcoded id collides when two editors are alive at once (e.g. Canvas
  // Documents + Sheet both resident under the keep-alive) — the second silently
  // fails to load. React.useId() is stable across renders; strip characters
  // that aren't valid in an id/selector.
  const rawId = React.useId();
  const editorId = `onlyoffice-editor-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // Layer 2: live agent co-pilot for THIS editor (best-effort; degrades to
  // headless when unavailable — see use-onlyoffice-live).
  const { onDocumentReady, agentWorking } = useOnlyOfficeLive(
    editorId,
    conversationId,
    filePath,
    fileType,
  );

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    openHands
      .post<TokenResponse>("/api/onlyoffice/token", {
        fileUrl,
        conversationId,
        filePath,
        fileName,
        fileType,
        mode,
        callbackUrl,
        store,
      })
      .then((res) => {
        if (!cancelled) setState({ status: "ready", data: res.data });
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          // Named for what it is to the reader — the document editor — not for
          // the vendor behind it. An error is the worst place to leak an
          // implementation detail: it is read by someone who already has a
          // problem and does not need a second unfamiliar noun.
          "The document editor could not be started.";
        // eslint-disable-next-line no-console
        console.error("[OnlyOfficeEditor] token fetch failed:", err);
        setState({ status: "error", message: String(message) });
      });

    return () => {
      cancelled = true;
    };
  }, [
    fileUrl,
    conversationId,
    filePath,
    fileName,
    fileType,
    mode,
    callbackUrl,
    store,
  ]);

  // -- @-mentions ----------------------------------------------------------
  // ONLYOFFICE owns no user directory. Typing "@" raises `onRequestUsers`, and
  // the editor shows NOTHING until the host answers by calling setUsers on the
  // editor instance - so without this handler the mention menu is simply empty
  // and the feature looks broken rather than unconfigured.
  const handleRequestUsers = React.useCallback(async () => {
    const instance = (
      window as unknown as {
        DocEditor?: {
          instances?: Record<string, { setUsers?: (a: object) => void }>;
        };
      }
    ).DocEditor?.instances?.[editorId];
    if (!instance?.setUsers) return;
    try {
      const res = await openHands.get<{
        users: { id: string; name: string }[];
      }>("/api/onlyoffice/collaborators");
      // `c: "mention"` is required - the same callback serves protection and
      // sharing lists, and an answer without it is discarded silently.
      instance.setUsers({ c: "mention", users: res.data.users ?? [] });
    } catch {
      instance.setUsers({ c: "mention", users: [] });
    }
  }, [editorId]);

  // Fired when a comment mentioning someone is posted. The editor has already
  // stored the comment; this is only the notification, so a failure here must
  // not surface as a document error.
  const handleSendNotify = React.useCallback(
    (event: {
      data?: { emails?: string[]; actionLink?: object; message?: string };
    }) => {
      const data = event?.data ?? {};
      openHands
        .post("/api/onlyoffice/mention", {
          conversationId,
          filePath,
          fileName,
          store,
          emails: data.emails ?? [],
          actionLink: data.actionLink ?? null,
          message: data.message ?? "",
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error("[OnlyOfficeEditor] mention notify failed:", err);
        });
    },
    [conversationId, filePath, fileName, store],
  );

  if (state.status === "loading") {
    return (
      <div
        style={{ height, width }}
        className="flex flex-col items-center justify-center gap-2 text-[var(--cg-text-muted)]"
      >
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-[12px]">Loading editor…</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        style={{ height, width }}
        className="flex flex-col items-center justify-center gap-2 px-4 text-center text-[var(--cg-text-muted)]"
      >
        <AlertTriangle className="h-6 w-6 text-amber-400" />
        <span className="text-[12px]">Could not load the document.</span>
        <span className="max-w-md text-[11px] opacity-70">{state.message}</span>
      </div>
    );
  }

  const { token, documentServerUrl, config } = state.data;
  // The backend reports a loopback origin (ONLYOFFICE_SERVER_URL defaults to
  // 127.0.0.1) — correct on the host, wrong for any other device on the LAN,
  // where loopback is the visiting device. Repaired at the point of use.
  const serverUrl = browserReachableOrigin(ENV_SERVER_URL || documentServerUrl);

  // The DocumentEditor wants the full config WITH the signed token embedded.
  //
  // Events are declared HERE rather than through the wrapper's `events_on*`
  // props, and that is not a style choice. The wrapper builds its own events
  // object from the props it knows about and then does
  // `Object.assign(itsObject, config)` — so a config carrying `events` replaces
  // the wrapper's set outright. Splitting them would mean the half declared as
  // props is silently discarded.
  //
  // It also has to be this way for mentions at all: this version of
  // @onlyoffice/document-editor-react has no `events_onRequestSendNotify` prop,
  // so the notify half of the mention flow can only be delivered through the
  // config.
  const editorConfig: OnlyOfficeConfig = {
    ...config,
    token,
    width,
    height,
    events: {
      onDocumentReady: () => onDocumentReady(),
      onDocumentStateChange: (event: unknown) => {
        // event.data === true → the document has unsaved changes.
        // eslint-disable-next-line no-console
        console.log("[OnlyOfficeEditor] document state change:", event);
      },
      onError: (event: unknown) => {
        // eslint-disable-next-line no-console
        console.error("[OnlyOfficeEditor] editor error:", event);
      },
      onRequestUsers: handleRequestUsers,
      onRequestSendNotify: handleSendNotify,
    },
  };

  return (
    <div style={{ height, width, position: "relative" }}>
      {agentWorking && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 14,
            zIndex: 30,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--cg-text-primary)",
            background: "var(--cg-accent-purple-bg)",
            border: "1px solid var(--cg-accent-purple)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          }}
        >
          <Sparkles
            className="h-3.5 w-3.5"
            style={{ animation: "pulse 1.2s infinite" }}
          />
          Agent is working…
        </div>
      )}
      <DocumentEditor
        id={editorId}
        documentServerUrl={serverUrl}
        config={editorConfig}
        onLoadComponentError={(code, description) => {
          // eslint-disable-next-line no-console
          console.error("[OnlyOfficeEditor] load error:", code, description);
        }}
      />
    </div>
  );
}

export default OnlyOfficeEditor;

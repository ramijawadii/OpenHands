/* eslint-disable i18next/no-literal-string */
import React from "react";
import { DocumentEditor } from "@onlyoffice/document-editor-react";
import { Loader2, AlertTriangle } from "lucide-react";
import { openHands } from "#/api/open-hands-axios";

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
  /** Workspace-relative path to the file inside that sandbox. */
  filePath?: string;
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
  height = "100%",
  width = "100%",
}: OnlyOfficeEditorProps) {
  const [state, setState] = React.useState<LoadState>({ status: "loading" });

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
      })
      .then((res) => {
        if (!cancelled) setState({ status: "ready", data: res.data });
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to initialise the ONLYOFFICE editor.";
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
  ]);

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
  const serverUrl = ENV_SERVER_URL || documentServerUrl;

  // The DocumentEditor wants the full config WITH the signed token embedded.
  const editorConfig: OnlyOfficeConfig = {
    ...config,
    token,
    width,
    height,
  };

  return (
    <div style={{ height, width }}>
      <DocumentEditor
        id="onlyoffice-editor"
        documentServerUrl={serverUrl}
        config={editorConfig}
        events_onDocumentStateChange={(event) => {
          // event.data === true → the document has unsaved changes.
          // eslint-disable-next-line no-console
          console.log("[OnlyOfficeEditor] document state change:", event);
        }}
        events_onError={(event) => {
          // eslint-disable-next-line no-console
          console.error("[OnlyOfficeEditor] editor error:", event);
        }}
        onLoadComponentError={(code, description) => {
          // eslint-disable-next-line no-console
          console.error("[OnlyOfficeEditor] load error:", code, description);
        }}
      />
    </div>
  );
}

export default OnlyOfficeEditor;

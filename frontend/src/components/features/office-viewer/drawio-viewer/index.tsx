/* eslint-disable i18next/no-literal-string */
import React from "react";
import { DrawIoEmbed } from "react-drawio";
import { Loader2, AlertTriangle } from "lucide-react";
import ConversationService from "#/api/conversation-service/conversation-service.api";

/** Self-hosted draw.io origin the BROWSER loads the embed iframe from (our own
 *  container on :8085, never embed.diagrams.net). Shared by the Whiteboard and
 *  the Report architecture-diagram viewer. */
export const DRAWIO_BASE_URL =
  (import.meta.env.VITE_DRAWIO_SERVER_URL as string | undefined) ||
  "http://localhost:8085";

interface Props {
  /** conversation whose sandbox holds the diagram file */
  conversationId: string;
  /** workspace-relative path to a .drawio / .xml / .dio diagram */
  filePath: string;
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; xml: string };

/** DrawioViewer — opens a workspace draw.io diagram in the self-hosted editor.
 *  Loaded lazily so react-drawio only ships when a diagram is actually opened. */
export default function DrawioViewer({ conversationId, filePath }: Props) {
  const [state, setState] = React.useState<State>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    ConversationService.getFile(conversationId, filePath)
      .then((content) => {
        if (cancelled) return;
        if (content == null || content.trim() === "") {
          setState({ status: "error", message: "Diagram is empty." });
        } else if (!content.trimStart().startsWith("<")) {
          // Not XML — e.g. a .xml that isn't a draw.io file. Say so ourselves
          // instead of letting draw.io throw its "Not a diagram file" modal.
          setState({
            status: "error",
            message: "This file isn't a draw.io diagram.",
          });
        } else {
          setState({ status: "ready", xml: content });
        }
      })
      .catch(() => {
        if (!cancelled)
          setState({ status: "error", message: "Could not load the diagram." });
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, filePath]);

  if (state.status === "loading") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--cg-text-muted)]">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-[12px]">Loading diagram…</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-[var(--cg-text-muted)]">
        <AlertTriangle className="h-6 w-6 text-amber-400" />
        <span className="text-[12px]">{state.message}</span>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <DrawIoEmbed
        baseUrl={DRAWIO_BASE_URL}
        xml={state.xml}
        // Same defaults as the Whiteboard: white (light) mode, grid OFF,
        // page view OFF. Viewer-oriented: minimal chrome, no save button
        // (save-back into the sandbox is a later step).
        configuration={{
          defaultGridEnabled: false,
          defaultPageVisible: false,
        }}
        urlParameters={{
          ui: "min",
          dark: false,
          grid: false,
          spin: true,
          noSaveBtn: true,
          noExitBtn: true,
        }}
      />
    </div>
  );
}

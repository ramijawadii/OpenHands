/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useConversationId } from "#/hooks/use-conversation-id";
import OnlyOfficeEditor from "#/components/features/office-viewer/OnlyOfficeEditor";
import SurfaceHost from "#/components/features/surfaces/surface-host";

/**
 * OnlyOfficeFile — open a file that lives in the CURRENT conversation's sandbox
 * workspace in the ONLYOFFICE editor. Thin wrapper over OnlyOfficeEditor that
 * resolves the conversation id and derives the fileType from the path, so the
 * Documents / Sheet / Report surfaces can drop it in with just a workspace path.
 *
 * The backend turns (conversationId, filePath) into a short-lived signed URL the
 * ONLYOFFICE container can fetch — see cloudguard_onlyoffice.py.
 */

// Extensions ONLYOFFICE can render. Used by the surfaces to decide whether to
// hand a file to ONLYOFFICE or fall back to download.
export const ONLYOFFICE_EXTENSIONS = new Set<string>([
  // word
  "docx",
  "doc",
  "odt",
  "rtf",
  "txt",
  // cell
  "xlsx",
  "xls",
  "ods",
  "csv",
  // slide
  "pptx",
  "ppt",
  "odp",
  // pdf
  "pdf",
]);

export function extOf(path: string): string {
  const base = path.replace(/\\/g, "/").split("/").pop() ?? path;
  const i = base.lastIndexOf(".");
  return i === -1 ? "" : base.slice(i + 1).toLowerCase();
}

export function isOnlyOfficeSupported(path: string): boolean {
  return ONLYOFFICE_EXTENSIONS.has(extOf(path));
}

function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? path;
}

export interface OnlyOfficeFileProps {
  /** Workspace-relative path inside the current conversation's sandbox. */
  filePath: string;
  /** Display name; defaults to the path's basename. */
  fileName?: string;
  /** "edit" (default) or "view". */
  mode?: "edit" | "view";
  /** Which store `filePath` refers to. `OnlyOfficeEditor` has always accepted
   *  this; not forwarding it here meant a document opened from the durable
   *  library was looked up in the conversation sandbox and 404'd. */
  store?: "sandbox" | "artifacts";
  height?: string;
  width?: string;
}

export default function OnlyOfficeFile({
  filePath,
  fileName,
  mode = "edit",
  store = "sandbox",
  height = "100%",
  width = "100%",
}: OnlyOfficeFileProps) {
  const { conversationId } = useConversationId();

  if (!conversationId) {
    return (
      <div
        style={{ height, width }}
        className="flex items-center justify-center text-[12px] text-[var(--cg-text-muted)]"
      >
        {/* eslint-disable-next-line i18next/no-literal-string */}
        No active conversation.
      </div>
    );
  }

  return (
    <SurfaceHost
      surfaceId="onlyoffice"
      conversationId={conversationId}
      title="Editor"
    >
      {(nonce) => (
        <OnlyOfficeEditor
          // A fresh editor (unique document key) per file+mode, and per Reopen
          // (the SurfaceHost nonce) so recovery loads a clean session.
          key={`${conversationId}|${store}|${filePath}|${mode}|${nonce}`}
          conversationId={conversationId}
          filePath={filePath}
          fileName={fileName ?? basename(filePath)}
          fileType={extOf(filePath)}
          mode={mode}
          store={store}
          height={height}
          width={width}
        />
      )}
    </SurfaceHost>
  );
}

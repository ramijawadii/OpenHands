/* eslint-disable i18next/no-literal-string */
import React from "react";
import { Loader2, FileText } from "lucide-react";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import OnlyOfficeFile, {
  isOnlyOfficeSupported,
} from "#/components/features/office-viewer/OnlyOfficeFile";

/** Documents — the embedded ONLYOFFICE Word editor for the workspace's primary
 *  document. No file browser: this is just the editor, like the Sheet view.
 *
 *  It finds a document to open by listing the workspace and preferring a real
 *  Word file (docx/doc/odt), then PDF, then any editor-supported file.
 */

function extOf(path: string): string {
  const base = path.replace(/\\/g, "/").split("/").pop() ?? path;
  const i = base.lastIndexOf(".");
  return i === -1 ? "" : base.slice(i + 1).toLowerCase();
}

function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? path;
}

// Prefer a real Word doc, then PDF, then any supported file.
function pickDocument(files: string[]): string | null {
  const supported = files.filter(
    (f) => !basename(f).startsWith(".") && isOnlyOfficeSupported(f),
  );
  return (
    supported.find((f) => ["docx", "doc", "odt", "rtf"].includes(extOf(f))) ??
    supported.find((f) => extOf(f) === "pdf") ??
    supported.find((f) => ["txt", "md"].includes(extOf(f))) ??
    supported[0] ??
    null
  );
}

interface Props {
  conversationId: string;
}

export default function DocumentsView({ conversationId }: Props) {
  const [doc, setDoc] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    ConversationService.getFiles(conversationId)
      .then((list) => {
        if (cancelled) return;
        const picked = pickDocument(list ?? []);
        setDoc(picked);
        if (!picked) setError("No document to open yet.");
      })
      .catch(() => {
        if (!cancelled) setError("Workspace not reachable yet.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--cg-text-muted)]">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-[12px]">Loading document…</span>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-[var(--cg-text-muted)]">
        <FileText className="h-8 w-8 opacity-30" />
        <span className="text-[12px]">{error ?? "No document to open."}</span>
        <span className="max-w-xs text-[11px] opacity-70">
          Documents the agent writes to the workspace (.docx, .pdf, .txt…) open
          here automatically.
        </span>
      </div>
    );
  }

  // Just the editor — no file system, mirroring the Sheet view.
  return (
    <div className="h-full w-full">
      <OnlyOfficeFile filePath={doc} fileName={basename(doc)} mode="edit" />
    </div>
  );
}

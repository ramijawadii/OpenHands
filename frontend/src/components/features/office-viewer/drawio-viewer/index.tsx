/* eslint-disable i18next/no-literal-string */
import React from "react";
import { DrawIoEmbed } from "react-drawio";
import { Loader2, AlertTriangle, Sparkles } from "lucide-react";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import { browserReachableOrigin } from "#/utils/browser-reachable-origin";
import { useDiagramLive } from "./use-diagram-live";

/** Self-hosted draw.io origin the BROWSER loads the embed iframe from (our own
 *  container on :8085, never embed.diagrams.net). Shared by the Whiteboard and
 *  the Report architecture-diagram viewer.
 *
 *  Passed through `browserReachableOrigin` so the default loopback value still
 *  works when the app is opened from another device on the LAN — there,
 *  `localhost` is the visiting device, not the machine hosting the container. */
export const DRAWIO_BASE_URL = browserReachableOrigin(
  (import.meta.env.VITE_DRAWIO_SERVER_URL as string | undefined) ||
    "http://localhost:8085",
);

/** Shared draw.io editor configuration for both the Whiteboard and the viewer.
 *  Defaults (white mode, grid off, page view off) live here, plus best-effort
 *  CSS to hide the vendor's About/help/logo chrome. NOTE: the branded loading
 *  spinner is removed via `spin: false` in urlParameters, not CSS — it renders
 *  before config loads. See docs/rebranding/drawio-branding-surface.md.
 *  (draw.io is Apache-2.0; only the chrome we control is de-branded.) */
export const DRAWIO_CONFIGURATION = {
  defaultGridEnabled: false,
  defaultPageVisible: false,
  css: [
    "a[href*='diagrams.net'],",
    "a[href*='drawio.com'],",
    "a[href*='draw.io'],",
    // Hide the vendor GitHub link/icon from draw.io's status bar — our own bottom
    // status bar (whiteboard-view) carries the save state in its place.
    "a[href*='github'],",
    ".geAboutDialog { display: none !important; }",
    ".geStatus > img, .geMenubarContainer .geLogo { display: none !important; }",
  ].join("\n"),
};

interface Props {
  /** conversation whose sandbox holds the diagram file */
  conversationId: string;
  /** workspace-relative path to a .drawio / .xml / .dio diagram */
  filePath: string;
  /**
   * Which store `filePath` lives in.
   *
   * The sandbox is read through `ConversationService`, which needs a live
   * runtime. The durable library has no runtime and is conversation-independent,
   * so it is read through the VFS instead — the same path the Files surface
   * uses, which means a library diagram is policed and audited like every other
   * read of it.
   */
  store?: "sandbox" | "artifacts";
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; xml: string };

/** DrawioViewer — opens a workspace draw.io diagram in the self-hosted editor.
 *  Loaded lazily so react-drawio only ships when a diagram is actually opened. */
/** One reader for both stores, so the component below does not branch twice. */
async function readDiagram(
  store: "sandbox" | "artifacts",
  conversationId: string,
  filePath: string,
): Promise<string | null> {
  if (store === "sandbox") {
    return ConversationService.getFile(conversationId, filePath);
  }
  const res = await fetch(
    `/api/cloudguard/vfs/read?conversation_id=${encodeURIComponent(conversationId)}&path=${encodeURIComponent(filePath)}&store=artifacts`,
    { credentials: "same-origin" },
  );
  if (!res.ok) throw new Error(`vfs read failed (${res.status})`);
  return res.text();
}

/**
 * Persist edited diagram XML back to whichever store it came from.
 *
 * The library goes through the VFS `/write` route — the same policed, evented,
 * audited path everything else uses, which is what makes a saved diagram a
 * versioned artifact rather than a blob that overwrote its own history. The
 * sandbox keeps using the conversation upload path, which is what the runtime
 * can see.
 */
async function writeDiagram(
  store: "sandbox" | "artifacts",
  conversationId: string,
  filePath: string,
  xml: string,
): Promise<void> {
  if (store === "artifacts") {
    const res = await fetch("/api/cloudguard/vfs/write", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        path: filePath,
        text: xml,
        mime: "application/xml",
        store: "artifacts",
      }),
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        detail = (await res.json())?.detail ?? detail;
      } catch {
        /* a non-JSON error body is still an error */
      }
      throw new Error(detail);
    }
    return;
  }
  const file = new File([xml], filePath.slice(filePath.lastIndexOf("/") + 1), {
    type: "application/xml",
  });
  await ConversationService.uploadFiles(conversationId, [file]);
}

/** Quiet period before a diagram change becomes a durable revision. Long enough
 *  that a burst of edits is one version, short enough that a closed tab loses
 *  at most a few seconds of work. */
const AUTOSAVE_IDLE_MS = 6000;

export default function DrawioViewer({
  conversationId,
  filePath,
  store = "sandbox",
}: Props) {
  const [state, setState] = React.useState<State>({ status: "loading" });
  // The embed handle (react-drawio ref: .load({xml})) + the authoritative agent XML.
  // The live co-pilot mutates this copy and re-loads it into the open editor.
  const drawioRef = React.useRef<React.ElementRef<typeof DrawIoEmbed>>(null);
  const [saving, setSaving] = React.useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "saved" }
    | { kind: "failed"; message: string }
  >({ kind: "idle" });

  const xmlRef = React.useRef<string>("");

  const onSave = React.useCallback(
    async (evt: { xml?: string }) => {
      const xml = evt?.xml;
      // An empty payload means the editor had nothing to give us. Writing that
      // would replace a real diagram with a blank file and burn a version doing
      // it, so refuse rather than "succeed".
      if (!xml || !xml.trimStart().startsWith("<")) {
        setSaving({
          kind: "failed",
          message: "The editor returned no diagram.",
        });
        return;
      }
      setSaving({ kind: "saving" });
      try {
        await writeDiagram(store, conversationId, filePath, xml);
        xmlRef.current = xml;
        setSaving({ kind: "saved" });
        window.setTimeout(
          () =>
            setSaving((s2) => (s2.kind === "saved" ? { kind: "idle" } : s2)),
          2500,
        );
      } catch (err) {
        // Surfaced, never swallowed. A save that silently failed is the worst
        // outcome for an editor — the analyst closes the tab believing the work
        // is stored.
        setSaving({
          kind: "failed",
          message: err instanceof Error ? err.message : "Save failed.",
        });
      }
    },
    [store, conversationId, filePath],
  );

  /**
   * Autosave, throttled into revisions rather than keystrokes.
   *
   * draw.io fires `autosave` on EVERY change — every drag, every resize, every
   * character typed into a label. Writing each one would be correct in the sense
   * that nothing is lost, and useless in the sense that the diagram's version
   * history would become several hundred entries of one editing session.
   *
   * So the change is remembered immediately (free, in memory and in the draft)
   * and the durable write happens after the editing pauses. The pending XML is
   * held in a ref rather than state so the timer always writes the LATEST
   * diagram, not the one that existed when the timer was set.
   */
  const pendingXml = React.useRef<string | null>(null);
  const autosaveTimer = React.useRef<number | null>(null);

  const flushAutosave = React.useCallback(() => {
    const xml = pendingXml.current;
    if (!xml || xml === xmlRef.current) return;
    pendingXml.current = null;
    onSave({ xml }).catch(() => {
      /* onSave records the failure in its own state */
    });
  }, [onSave]);

  const onAutoSave = React.useCallback(
    (evt: { xml?: string }) => {
      const xml = evt?.xml;
      if (!xml || !xml.trimStart().startsWith("<")) return;
      pendingXml.current = xml;
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = window.setTimeout(
        flushAutosave,
        AUTOSAVE_IDLE_MS,
      );
    },
    [flushAutosave],
  );

  // The last chance to write. `visibilitychange` and `pagehide` are the two the
  // platform actually guarantees — `beforeunload` is skipped on tab discard and
  // on mobile — and unmount covers closing the pane while the tab lives on.
  React.useEffect(() => {
    const onGone = () => flushAutosave();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushAutosave();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onGone);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onGone);
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      flushAutosave();
    };
  }, [flushAutosave]);

  // Fetch the diagram file; returns its content (used both for the initial open and
  // for the live `reload` op, which picks up an agent-regenerated file in place).
  const fetchDiagram = React.useCallback(async (): Promise<string | null> => {
    const content = await readDiagram(store, conversationId, filePath);
    if (content && content.trimStart().startsWith("<")) return content;
    return null;
  }, [store, conversationId, filePath]);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    readDiagram(store, conversationId, filePath)
      .then((content) => {
        if (cancelled) return;
        if (content == null || content.trim() === "") {
          setState({ status: "error", message: "Diagram is empty." });
        } else if (!content.trimStart().startsWith("<")) {
          // Not XML — e.g. a .xml that isn't a diagram file. Say so ourselves
          // instead of letting the editor throw its "Not a diagram file" modal.
          setState({
            status: "error",
            message: "This file isn't a diagram.",
          });
        } else {
          xmlRef.current = content;
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
  }, [store, conversationId, filePath]);

  // Live co-pilot: pulls the agent's queued highlight/annotate/reload/export commands and
  // applies them to THIS open editor (no-ops entirely when the seam is disabled).
  const { agentWorking, onExport } = useDiagramLive(
    conversationId,
    drawioRef as unknown as React.MutableRefObject<{
      load: (d: { xml: string }) => void;
      exportDiagram: (d: { format: string }) => void;
    } | null>,
    xmlRef,
    fetchDiagram,
  );

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
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {saving.kind !== "idle" && (
        <div
          role="status"
          className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-md ${
            saving.kind === "failed"
              ? "bg-amber-500 text-black"
              : "bg-[var(--cg-accent,#4C9AFF)] text-white"
          }`}
        >
          {saving.kind === "saving" && "Saving…"}
          {saving.kind === "saved" && "Saved"}
          {saving.kind === "failed" && `Not saved — ${saving.message}`}
        </div>
      )}
      {agentWorking && (
        <div
          className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-[var(--cg-accent,#4C9AFF)] px-2.5 py-1 text-[11px] font-medium text-white shadow-md"
          role="status"
        >
          <Sparkles className="h-3 w-3 animate-pulse" />
          Agent is drawing…
        </div>
      )}
      <DrawIoEmbed
        ref={drawioRef}
        onExport={onExport}
        baseUrl={DRAWIO_BASE_URL}
        xml={state.xml}
        onSave={onSave}
        // AUTOSAVE ON. draw.io emits `autosave` on every change; the handler
        // below throttles it into a durable write so a diagram survives the tab
        // closing without minting a revision per dragged shape.
        autosave
        onAutoSave={onAutoSave}
        // Same defaults as the Whiteboard: white (light) mode, grid OFF,
        // page view OFF, de-branded chrome. The save button is now ON — edits
        // persist through `onSave` to the store the diagram came from.
        configuration={DRAWIO_CONFIGURATION}
        urlParameters={{
          ui: "min",
          dark: false,
          grid: false,
          spin: false,
          noSaveBtn: false,
          noExitBtn: true,
        }}
      />
    </div>
  );
}

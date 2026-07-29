/* eslint-disable i18next/no-literal-string */
import React from "react";
import { DrawIoEmbed, type DrawIoEmbedRef } from "react-drawio";
import {
  DRAWIO_BASE_URL,
  DRAWIO_CONFIGURATION,
} from "#/components/features/office-viewer/drawio-viewer";
import ConversationService from "#/api/conversation-service/conversation-service.api";

// Durable copy of the whiteboard in the sandbox workspace (Tier A2: backend is
// the source of truth so the iframe is disposable). Also makes the whiteboard a
// first-class artifact — it shows up in the Report tab's diagram list.
const WORKSPACE_PATH = "whiteboard.drawio";
const WORKSPACE_SAVE_DEBOUNCE_MS = 2500;

/** draw.io's save/autosave hands us the file in **xmlsvg** format — a
 *  `data:image/svg+xml;base64,…` string with the real `<mxfile>` embedded
 *  (HTML-escaped) in the SVG's `content` attribute — NOT raw XML. Storing that
 *  verbatim was the saving bug: the load guard (`startsWith("<")`) rejected it,
 *  so the whiteboard came up blank on reload. Return the actual diagram XML from
 *  either representation (raw XML or xmlsvg), or "" if it's neither. */
function toDiagramXml(value: string | null | undefined): string {
  if (!value) return "";
  const v = value.trimStart();
  if (v.startsWith("<")) return value;
  if (!v.startsWith("data:image/svg+xml")) return "";
  try {
    const b64 = value.slice(value.indexOf(",") + 1);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const svg = new TextDecoder().decode(bytes);
    const m = svg.match(/content="([^"]*)"/);
    if (!m) return "";
    const [, escaped] = m;
    // Reuse the browser's HTML entity table to unescape &lt; &gt; &quot; &amp; …
    const ta = document.createElement("textarea");
    ta.innerHTML = escaped;
    const xml = ta.value.trim();
    return xml.startsWith("<") ? xml : "";
  } catch {
    return "";
  }
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Whiteboard — freeform diagramming on the Canvas tab, powered by SELF-HOSTED
 *  draw.io (diagrams.net). The editor iframe loads from our own draw.io container
 *  (never embed.diagrams.net), keeping the own-the-supply-chain principle.
 *
 *  Loaded via React.lazy from canvas-tab.tsx, so this bundle is code-split.
 *
 *  Diagrams persist to localStorage per conversation: a scratch whiteboard
 *  shouldn't round-trip to the sandbox (or pollute /workspace) just to survive a
 *  tab switch. draw.io's own menu exports to a real file when wanted.
 */

interface Props {
  /** scopes the persisted diagram so conversations don't share a whiteboard */
  conversationId?: string;
}

export default function WhiteboardView({ conversationId }: Props) {
  // NOTE the `drawio` namespace: the old `cg-whiteboard-*` key holds EXCALIDRAW
  // JSON from before the swap. Feeding that to draw.io makes it pop
  // "Not a diagram file (Start tag expected, '<' not found)", so we start a
  // fresh key rather than trying to read the previous format.
  const storageKey = `cg-drawio-${conversationId ?? "default"}`;
  const ref = React.useRef<DrawIoEmbedRef>(null);

  // AP1 — durable-save state, surfaced so a diagram is never SILENTLY localStorage-only.
  // idle→saving→saved on the debounced workspace upload; error if the runtime is unreachable
  // (localStorage still holds it and the next edit retries).
  const [saveState, setSaveState] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Resolve the initial diagram: instant localStorage cache first, then fall back
  // to the DURABLE workspace copy (backend is the source of truth, so the board
  // survives a cleared cache or a different browser). null = still resolving.
  const [initialXml, setInitialXml] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const local = toDiagramXml(safeGetItem(storageKey));
    if (local) {
      setInitialXml(local);
      return undefined;
    }
    if (!conversationId) {
      setInitialXml("");
      return undefined;
    }
    setInitialXml(null);
    ConversationService.getFile(conversationId, WORKSPACE_PATH)
      .then((raw) => {
        if (cancelled) return;
        const xml = toDiagramXml(raw);
        if (xml) {
          try {
            localStorage.setItem(storageKey, xml);
          } catch {
            // ignore quota / private-mode
          }
        }
        setInitialXml(xml);
      })
      .catch(() => {
        // No durable copy yet (or runtime unreachable) — start blank.
        if (!cancelled) setInitialXml("");
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey, conversationId]);

  // Debounced durable save to the workspace. Autosave fires on every change, so
  // we write localStorage instantly (fast cache) but only upload to the sandbox
  // after the user pauses — the durable copy the backend owns.
  const wsSaveTimer = React.useRef<number | undefined>(undefined);
  const lastSavedXml = React.useRef<string>("");
  const saveToWorkspace = React.useCallback(
    (xml: string) => {
      if (!conversationId || xml === lastSavedXml.current) return;
      if (wsSaveTimer.current) window.clearTimeout(wsSaveTimer.current);
      wsSaveTimer.current = window.setTimeout(() => {
        lastSavedXml.current = xml;
        setSaveState("saving");
        const file = new File([xml], WORKSPACE_PATH, {
          type: "application/xml",
        });
        ConversationService.uploadFiles(conversationId, [file])
          .then(() => setSaveState("saved"))
          .catch(() => {
            // Runtime not reachable — localStorage still holds it; retry on next edit.
            lastSavedXml.current = "";
            setSaveState("error");
          });
      }, WORKSPACE_SAVE_DEBOUNCE_MS);
    },
    [conversationId],
  );

  React.useEffect(
    () => () => {
      if (wsSaveTimer.current) window.clearTimeout(wsSaveTimer.current);
    },
    [],
  );

  // Persist on save/autosave: NORMALISE draw.io's xmlsvg payload to real diagram
  // XML first (that was the bug — the raw data-URI never restored), then write the
  // instant localStorage cache + debounced durable workspace copy.
  const persist = React.useCallback(
    (raw: string) => {
      const xml = toDiagramXml(raw);
      if (!xml) return; // don't overwrite good state with an empty/failed export
      try {
        localStorage.setItem(storageKey, xml);
      } catch {
        // Quota / private-mode — drawing still works, it just won't persist.
      }
      saveToWorkspace(xml);
    },
    [storageKey, saveToWorkspace],
  );

  // AP1 — drive draw.io's OWN status bar (bottom-left) with the durable-save state, the
  // same place draw.io shows its native status — like the ONLYOFFICE editor's "All changes
  // saved". No custom strip. Best-effort: draw.io may re-set its own status on the next edit.
  React.useEffect(() => {
    const el = ref.current;
    if (!el || saveState === "idle") return;
    const msg: Record<
      "saving" | "saved" | "error",
      { message: string; modified: boolean }
    > = {
      saving: { message: "Saving…", modified: true },
      saved: { message: "All changes saved", modified: false },
      error: { message: "Not saved — will retry", modified: true },
    };
    try {
      el.status(msg[saveState]);
    } catch {
      // status is best-effort chrome; never let it break editing
    }
  }, [saveState]);

  // Wait until the initial diagram is resolved so DrawIoEmbed mounts once with the
  // correct XML (remounting it with a late xml prop would not reload the canvas).
  if (initialXml === null) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--cg-text-muted)]">
        Loading whiteboard…
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <DrawIoEmbed
        key={storageKey}
        ref={ref}
        baseUrl={DRAWIO_BASE_URL}
        xml={initialXml}
        // Fire onAutoSave on every change so a tab switch never loses work.
        autosave
        // Defaults: white (light) mode, grid OFF, page view OFF, de-branded
        // chrome. grid/dark are URL params; page view + CSS live in the config.
        configuration={DRAWIO_CONFIGURATION}
        urlParameters={{
          ui: "min",
          spin: false,
          // Keep it a contained embed: no exit button, no "save & exit" flow —
          // autosave feeds our persist() and the diagram never leaves the app.
          saveAndExit: false,
          noSaveBtn: false,
          noExitBtn: true,
          dark: false,
          grid: false,
        }}
        onSave={(e) => persist(e.xml)}
        onAutoSave={(e) => persist(e.xml)}
      />
    </div>
  );
}

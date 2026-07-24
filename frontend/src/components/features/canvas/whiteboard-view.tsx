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

  const initialXml = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      // Only hand draw.io something that actually looks like diagram XML —
      // anything else (legacy JSON, truncated write) would throw its error modal.
      return raw && raw.trimStart().startsWith("<") ? raw : "";
    } catch {
      return "";
    }
  }, [storageKey]);

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
        const file = new File([xml], WORKSPACE_PATH, {
          type: "application/xml",
        });
        ConversationService.uploadFiles(conversationId, [file]).catch(() => {
          // Runtime not reachable — localStorage still holds it; retry on next edit.
          lastSavedXml.current = "";
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

  // Persist on save/autosave: instant localStorage cache + debounced durable
  // workspace copy (backend source of truth, iframe disposable).
  const persist = React.useCallback(
    (xml: string) => {
      try {
        localStorage.setItem(storageKey, xml);
      } catch {
        // Quota / private-mode — drawing still works, it just won't persist.
      }
      saveToWorkspace(xml);
    },
    [storageKey, saveToWorkspace],
  );

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <DrawIoEmbed
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

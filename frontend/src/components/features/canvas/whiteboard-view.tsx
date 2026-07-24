/* eslint-disable i18next/no-literal-string */
import React from "react";
import { DrawIoEmbed, type DrawIoEmbedRef } from "react-drawio";
import {
  DRAWIO_BASE_URL,
  DRAWIO_CONFIGURATION,
} from "#/components/features/office-viewer/drawio-viewer";

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

  // Persist on save/autosave. draw.io emits onSave for explicit saves; we enable
  // autosave via urlParameters so edits survive a tab switch without a Save click.
  const persist = React.useCallback(
    (xml: string) => {
      try {
        localStorage.setItem(storageKey, xml);
      } catch {
        // Quota / private-mode — drawing still works, it just won't persist.
      }
    },
    [storageKey],
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

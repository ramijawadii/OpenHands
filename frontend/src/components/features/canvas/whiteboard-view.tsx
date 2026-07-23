/* eslint-disable i18next/no-literal-string */
import React from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

/** Whiteboard — freeform diagramming on the Canvas tab.
 *
 *  This file is the ONLY import site for Excalidraw and is loaded via React.lazy
 *  from canvas-tab.tsx, so its bundle is code-split and only fetched when the
 *  Whiteboard view is actually opened.
 *
 *  Scenes persist to localStorage per conversation: the sandbox filesystem is the
 *  agent's workspace, and a scratch whiteboard shouldn't require a round-trip (or
 *  pollute /workspace) just to survive a tab switch. Export via Excalidraw's own
 *  menu when a drawing should become a real artifact.
 */

interface Props {
  /** scopes the persisted scene so conversations don't share a whiteboard */
  conversationId?: string;
}

export default function WhiteboardView({ conversationId }: Props) {
  const storageKey = `cg-whiteboard-${conversationId ?? "default"}`;

  const initialData = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      return {
        elements: parsed.elements ?? [],
        appState: { ...(parsed.appState ?? {}), collaborators: new Map() },
      };
    } catch {
      // Corrupt/legacy payload — start clean rather than blocking the view.
      return undefined;
    }
  }, [storageKey]);

  // Persist on change, coalesced: Excalidraw fires onChange on every pointer
  // move while drawing, so writing straight through would thrash localStorage.
  const saveTimer = React.useRef<number | undefined>(undefined);
  const handleChange = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly any[], appState: any) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              elements,
              // Only keep view state worth restoring; the rest is transient.
              appState: {
                viewBackgroundColor: appState?.viewBackgroundColor,
                scrollX: appState?.scrollX,
                scrollY: appState?.scrollY,
                zoom: appState?.zoom,
              },
            }),
          );
        } catch {
          // Quota or private-mode — drawing still works, it just won't persist.
        }
      }, 500);
    },
    [storageKey],
  );

  React.useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <Excalidraw initialData={initialData} onChange={handleChange} />
    </div>
  );
}

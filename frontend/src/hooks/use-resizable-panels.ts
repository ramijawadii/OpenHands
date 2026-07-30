import { useState, useRef, useCallback, useEffect } from "react";
import { useLocalStorage } from "@uidotdev/usehooks";

interface UseResizablePanelsOptions {
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  storageKey?: string;
}

/**
 * Resizable split for the conversation page.
 *
 * Rewritten on pointer events for the same reasons as the explore drawer (see
 * BUG-UI-4). The panel this drives hosts ONLYOFFICE, draw.io and JupyterLab in
 * cross-origin iframes, and a mouse-event drag over an iframe is lost: the
 * frame swallows `mousemove`/`mouseup`, so the drag freezes mid-gesture and —
 * because the `mouseup` never arrives — stays latched on afterwards.
 *
 * The guarantees now are:
 *  - pointer capture routes every event to the handle, even over an iframe
 *  - `buttons === 0` ends a drag whose `pointerup` was missed (released
 *    off-window, during a devtools pause, in another frame)
 *  - `pointercancel` / window `blur` end it on OS-level interruption
 *  - one state write per animation frame instead of one per event
 *  - localStorage is written ONCE at the end, not ~100x/second
 */
export function useResizablePanels({
  defaultLeftWidth = 50,
  minLeftWidth = 30,
  maxLeftWidth = 80,
  storageKey = "desktop-layout-panel-width",
}: UseResizablePanelsOptions = {}) {
  const [persistedWidth, setPersistedWidth] = useLocalStorage<number>(
    storageKey,
    defaultLeftWidth,
  );

  const clampWidth = useCallback(
    (width: number) => Math.max(minLeftWidth, Math.min(maxLeftWidth, width)),
    [minLeftWidth, maxLeftWidth],
  );

  const [leftWidth, setLeftWidth] = useState(() => clampWidth(persistedWidth));
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = useRef(false);
  const drag = useRef({ raf: 0, next: defaultLeftWidth });

  const endDrag = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    if (drag.current.raf) {
      cancelAnimationFrame(drag.current.raf);
      drag.current.raf = 0;
    }
    setIsDragging(false);
    setPersistedWidth(clampWidth(drag.current.next));
  }, [clampWidth, setPersistedWidth]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      drag.current.next = leftWidth;
      active.current = true;
      setIsDragging(true);
    },
    [leftWidth],
  );

  useEffect(() => {
    if (!isDragging) return undefined;

    const onMove = (e: PointerEvent) => {
      if (e.buttons === 0) {
        endDrag();
        return;
      }
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const next = clampWidth(((e.clientX - rect.left) / rect.width) * 100);
      drag.current.next = next;
      if (!drag.current.raf) {
        drag.current.raf = requestAnimationFrame(() => {
          drag.current.raf = 0;
          setLeftWidth(drag.current.next);
        });
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("blur", endDrag);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("blur", endDrag);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (drag.current.raf) {
        cancelAnimationFrame(drag.current.raf);
        drag.current.raf = 0;
      }
    };
  }, [isDragging, endDrag, clampWidth]);

  const rightWidth = 100 - leftWidth;

  return {
    leftWidth,
    rightWidth,
    isDragging,
    containerRef,
    /** Kept for call-site compatibility; now a pointer-down handler. */
    handleMouseDown: handlePointerDown,
    handlePointerDown,
  };
}

import React from "react";
import { useLocation } from "react-router";
import { useConversationStore } from "#/state/conversation-store";
import { DockedComposer } from "./docked-composer";

/**
 * The composer floating over the page, shown only when the drawer is shut.
 *
 * Gated rather than always-on for one reason: with the drawer open there is
 * already a composer inside it, and two inputs for one conversation is a
 * question about which of them is real. When the drawer closes, that composer
 * goes with it — this is what keeps the agent reachable from a dashboard.
 *
 * The conversation page is excluded. It is a full-height chat with its own
 * composer at the bottom; a second one floating over it would sit directly on
 * top of the first.
 */

/** Clearance below the composer, so the last row does not touch it. */
const BREATHING_ROOM = 20;

/** The composer sits `bottom-6`; that offset is space it occupies too. */
const BOTTOM_OFFSET = 24;

/**
 * Reserve the composer's own height at the foot of the page.
 *
 * A `fixed` element takes no layout space, so without this the bottom of every
 * scrollable page sits underneath the composer and cannot be read at all —
 * the last table rows, the foot of a chart. The gutter is published as a
 * custom property that `#root-outlet` consumes, which means one rule covers
 * every route rather than each page remembering to leave room.
 *
 * It is measured rather than hardcoded because the composer is not one height:
 * it grows from 48px collapsed to ~164px with a long message and an attachment
 * strip, and a constant would be wrong in both directions.
 */
function useComposerGutter(active: boolean) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const root = document.documentElement;
    if (!active || !ref.current) {
      root.style.removeProperty("--cg-composer-gutter");
      return undefined;
    }

    const el = ref.current;
    const publish = () => {
      const { height } = el.getBoundingClientRect();
      root.style.setProperty(
        "--cg-composer-gutter",
        `${Math.round(height + BOTTOM_OFFSET + BREATHING_ROOM)}px`,
      );
    };

    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);

    return () => {
      ro.disconnect();
      // Cleared on unmount, or a page with no composer would keep the hole.
      root.style.removeProperty("--cg-composer-gutter");
    };
  }, [active]);

  return ref;
}

export function FloatingComposer() {
  const { pathname } = useLocation();
  const { isRightPanelShown } = useConversationStore();

  const active = !isRightPanelShown && !pathname.startsWith("/conversations/");
  const ref = useComposerGutter(active);

  if (!active) return null;

  return <DockedComposer placement="floating" measureRef={ref} />;
}

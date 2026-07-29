/* eslint-disable i18next/no-literal-string -- CloudGuard explore drawer */
import React from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router";
import { useLocalStorage } from "@uidotdev/usehooks";
import {
  PanelRight,
  Play,
  RefreshCw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "#/utils/utils";
import { ResizeHandle } from "#/components/ui/resize-handle";
import { Conversation } from "#/api/open-hands.types";
import { ConversationIdProvider } from "#/context/conversation-id-context";
import { WsClientProvider } from "#/context/ws-client-provider";
import { ConversationSubscriptionsProvider } from "#/context/conversation-subscriptions-provider";
import { EventHandler } from "#/wrapper/event-handler";
import { usePaginatedConversations } from "#/hooks/query/use-paginated-conversations";
import { useConversationConfig } from "#/hooks/query/use-conversation-config";
import { useConversationId } from "#/hooks/use-conversation-id";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useStartConversation } from "#/hooks/mutation/use-start-conversation";
import { useUserProviders } from "#/hooks/use-user-providers";
import { useConversationStore } from "#/state/conversation-store";
import { ConversationTabs } from "./conversation-tabs/conversation-tabs";
import { ConversationTabContent } from "./conversation-tabs/conversation-tab-content/conversation-tab-content";

const WIDTH_KEY = "explore-drawer-width";

/**
 * ── Drawer geometry ─────────────────────────────────────────────────────────
 * One place decides every width question, so the drag handler, the resize
 * listener, the persistence layer and the mode selector can never disagree.
 *
 *   DOCK_RATIO   share of the viewport the drawer occupies when docked. This is
 *                simultaneously the drawer's MINIMUM width and the docked
 *                ceiling: the drawer is never narrower, and going wider means
 *                it stops sharing space and floats over the view instead.
 *   ABSOLUTE_MIN safety floor for very small viewports, where the ratio alone
 *                would leave the panel unusably narrow.
 *   MAX_RATIO    the widest a drag may go (always in overlay by then).
 */
const DOCK_RATIO = 0.36;
const ABSOLUTE_MIN = 460;
const MAX_RATIO = 0.85;
/** Extra travel required to ENTER overlay, so a stray pixel of drag does not
 *  lift the panel. Returning happens at the dock width exactly — see
 *  `isOverlayWidth` for why the slack cannot live on the return path. */
const OVERLAY_ENTER_SLACK = 24;

type DrawerMode = "docked" | "overlay" | "fullscreen";

/** Viewport width, guarded for SSR/first paint. */
function viewport(): number {
  return typeof window === "undefined" ? 1440 : window.innerWidth;
}

/** The docked width — also the minimum the drawer may ever be. */
function dockWidth(): number {
  const vw = viewport();
  // On a narrow window the absolute floor can exceed the ratio; the floor wins,
  // but never past the hard maximum, or min would end up above max.
  return Math.min(
    Math.max(ABSOLUTE_MIN, Math.round(vw * DOCK_RATIO)),
    Math.round(vw * MAX_RATIO),
  );
}

/** The single clamp. Every write to `width` goes through this. */
function clampWidth(w: number): number {
  const min = dockWidth();
  const max = Math.max(min, Math.round(viewport() * MAX_RATIO));
  return Math.max(min, Math.min(max, Math.round(w)));
}

/** Docked at the minimum width; anything wider floats above the view.
 *
 *  The hysteresis has to sit on the ENTER path. Putting it on the return path
 *  (the previous version) required dragging BELOW the dock width to go back —
 *  but the dock width is also the minimum, so the clamp made that unreachable
 *  and overlay became a one-way door: dragging back to the initial width left
 *  the panel floating with its shadow still on. */
function isOverlayWidth(w: number, wasOverlay: boolean): boolean {
  const ceiling = dockWidth();
  return wasOverlay ? w > ceiling : w > ceiling + OVERLAY_ENTER_SLACK;
}

/** Live conversations rank above dormant ones; recency breaks the tie. */
function pickLastActive(conversations: Conversation[]): Conversation | null {
  const rank = (c: Conversation) => {
    if (c.status === "RUNNING") return 0;
    if (c.status === "STARTING") return 1;
    if (c.status === "STOPPED") return 2;
    return 3; // ARCHIVED / ERROR — never auto-bound ahead of a usable one
  };
  const usable = conversations.filter((c) => c.status !== "ARCHIVED");
  if (!usable.length) return null;
  return [...usable].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    const at = Date.parse(a.last_updated_at || a.created_at) || 0;
    const bt = Date.parse(b.last_updated_at || b.created_at) || 0;
    return bt - at;
  })[0];
}

/**
 * The conversation drawer, bound to a conversation and rendered exactly as it
 * is on the conversation page: the tab strip (Chat · Canvas · Report ·
 * Remediation · Settings) over {@link ConversationTabContent}.
 *
 * A STOPPED conversation is NOT auto-started — browsing a dashboard page must
 * not silently boot a sandbox runtime. The drawer offers an explicit resume.
 */
/** How long a loading phase may run before we stop pretending and offer a way
 *  out. Without this the drawer can sit on a skeleton forever when the runtime
 *  never reports ready — the "stuck" state, just prettier. */
const LOADING_TIMEOUT_MS = 25000;

/** Our own busy state. Replaces the stock OpenHands circular spinner inside the
 *  drawer: a structural placeholder says WHAT is arriving, and using one
 *  treatment everywhere (warm-up, agent connect, lazy tab swap) means the panel
 *  never appears to load twice. */
function DrawerSkeleton() {
  return (
    <div
      className="flex h-full w-full flex-col bg-[var(--cg-bg-sidebar)]"
      role="status"
      aria-busy="true"
      aria-label="Loading conversation panel"
    >
      <div className="flex flex-1 flex-col gap-3 p-4">
        {["78%", "56%", "88%", "44%", "70%", "62%"].map((w, i) => (
          <div
            key={w}
            className="h-3 animate-pulse rounded bg-[var(--cg-border-card)] opacity-30"
            style={{ width: w, animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Expands the drawer over the whole view. NOT the browser Fullscreen API:
 *  that is a document-level mode which fights the app shell, drops out on any
 *  navigation, and cannot be entered without a user-gesture chain. This is
 *  plain layout state, so it composes with loading, error and tab switching
 *  instead of being a separate universe. */
function FullscreenToggle({
  isFullscreen,
  onToggle,
}: {
  isFullscreen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isFullscreen}
      aria-label={isFullscreen ? "Exit full view" : "Expand to full view"}
      title={isFullscreen ? "Exit full view (Esc)" : "Expand to full view"}
      onClick={onToggle}
      className="ml-auto shrink-0 rounded p-1 text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-primary)] transition-colors cursor-pointer"
    >
      {isFullscreen ? (
        <Minimize2 className="h-4 w-4" />
      ) : (
        <Maximize2 className="h-4 w-4" />
      )}
    </button>
  );
}

/** Terminal state for a load that never completed — always recoverable. */
function DrawerStalled({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-[13px] text-[var(--cg-text-muted)]">
        The conversation panel is taking longer than expected to load.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--cg-border-card)] px-3 py-1.5 text-[12.5px] text-[var(--cg-text-primary)] hover:bg-[var(--cg-bg-hover)] cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}

function DrawerBody({
  isFullscreen,
  onToggleFullscreen,
}: {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  useConversationConfig();
  // From context (set by the host below), so it is populated on the FIRST
  // render. `useActiveConversation` only tells us the status, and it is still
  // fetching initially — passing its undefined id to WsClientProvider trips its
  // "No conversation ID provided" throw.
  const { conversationId } = useConversationId();
  const { data: conversation, isFetched, refetch } = useActiveConversation();
  const { mutate: startConversation, isPending: isStarting } =
    useStartConversation();
  const { providers } = useUserProviders();

  const isStopped = conversation?.status === "STOPPED";
  // A runtime that has not reported ready yet. STARTING is a real, expected
  // phase — showing the live panel during it is what produced the empty,
  // apparently-hung drawer.
  const isWarmingUp = !isFetched || conversation?.status === "STARTING";

  // Bound the wait. The timer is keyed on the phase, so it restarts whenever
  // the phase genuinely changes and can never accumulate across renders.
  const [stalled, setStalled] = React.useState(false);
  React.useEffect(() => {
    if (!isWarmingUp) {
      setStalled(false);
      return undefined;
    }
    const t = window.setTimeout(() => setStalled(true), LOADING_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [isWarmingUp, conversation?.status]);

  const retry = React.useCallback(() => {
    setStalled(false);
    refetch();
  }, [refetch]);

  if (isWarmingUp) {
    if (stalled) return <DrawerStalled onRetry={retry} />;
    // Deliberately the SAME component the tab-content overlay uses. The two
    // phases (runtime warm-up, then agent/WebSocket connect) are genuinely
    // different, but showing two different loaders back to back read as the
    // panel loading twice.
    return <DrawerSkeleton />;
  }

  if (isStopped) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-[13px] text-[var(--cg-text-muted)]">
          {conversation?.title || "This conversation"} is stopped. Resume it to
          use the panel here.
        </p>
        <button
          type="button"
          disabled={isStarting}
          onClick={() =>
            startConversation({
              conversationId: conversation.conversation_id,
              providers,
            })
          }
          className="inline-flex items-center gap-2 rounded-md border border-[var(--cg-border-card)] px-3 py-1.5 text-[12.5px] text-[var(--cg-text-primary)] hover:bg-[var(--cg-bg-hover)] disabled:opacity-60 cursor-pointer"
        >
          <Play className="h-3.5 w-3.5" />
          {isStarting ? "Resuming…" : "Resume conversation"}
        </button>
      </div>
    );
  }

  return (
    <WsClientProvider conversationId={conversationId}>
      <ConversationSubscriptionsProvider>
        <EventHandler>
          {/* Fixed to --cg-topbar-h (not padding-derived) so this strip's bottom
              border lines up exactly with the global top bar's beside it. */}
          <div className="shrink-0 flex h-[var(--cg-topbar-h)] min-w-0 items-center gap-1 overflow-x-auto border-b border-[var(--cg-border-subtle)] px-3">
            <ConversationTabs />
            <FullscreenToggle
              isFullscreen={isFullscreen}
              onToggle={onToggleFullscreen}
            />
          </div>
          <div className="flex flex-col flex-1 min-h-0 w-full">
            {/* The tab components are React.lazy and NOTHING in this tree
                provided a Suspense boundary — switching tabs in the drawer had
                nothing to suspend against. The skeleton is the fallback, so a
                tab swap shows structure instead of a blank panel. */}
            <React.Suspense fallback={<DrawerSkeleton />}>
              <ConversationTabContent loadingFallback={<DrawerSkeleton />} />
            </React.Suspense>
          </div>
        </EventHandler>
      </ConversationSubscriptionsProvider>
    </WsClientProvider>
  );
}

/**
 * Hosts {@link DrawerBody} beside the explore (dashboard) views. Mounted from
 * the root layout — NOT from the view — so navigating between capabilities and
 * sub-tabs never remounts the drawer and never drops its WebSocket.
 */
export function ExploreConversationDrawer() {
  const { pathname } = useLocation();
  const {
    isRightPanelShown,
    hasRightPanelToggled,
    setHasRightPanelToggled,
    setIsRightPanelShown,
  } = useConversationStore();
  // Live width is component state; localStorage is written ONCE at drag end.
  // Persisting on every pointermove meant a synchronous JSON write + a
  // cross-hook sync event ~100x a second, which is what made the drag stutter
  // and feel stuck.
  // No stored default: a fresh load derives its width from the viewport ratio
  // rather than inheriting a px constant that only suits one screen size.
  const [persistedWidth, setPersistedWidth] = useLocalStorage<number | null>(
    WIDTH_KEY,
    null,
  );
  const [width, setWidth] = React.useState(() =>
    clampWidth(persistedWidth ?? dockWidth()),
  );
  const [isDragging, setIsDragging] = React.useState(false);
  const onExplore = pathname.startsWith("/explore");

  // ── Presentation mode ───────────────────────────────────────────────────
  // ONE source of truth with three values, rather than a set of booleans that
  // can contradict each other (docked && fullscreen was representable before).
  //   docked      the drawer takes layout width; the view shrinks beside it
  //   overlay     the drawer floats above the view; the view keeps its width
  //   fullscreen  the drawer covers the view entirely
  // `fullscreen` is user-chosen and sticky. `docked <-> overlay` is automatic:
  // the view is never squeezed below MIN_VIEW_WIDTH.
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [autoOverlay, setAutoOverlay] = React.useState(false);

  React.useEffect(() => {
    // Docked up to the default ratio; wider than that and the drawer floats
    // over the view rather than taking more space from it. The hysteresis is
    // applied on the way BACK, so a drag parked on the threshold cannot
    // oscillate between the two modes.
    const evaluate = () => setAutoOverlay((was) => isOverlayWidth(width, was));
    evaluate();
    window.addEventListener("resize", evaluate);
    return () => window.removeEventListener("resize", evaluate);
  }, [width]);

  const mode: DrawerMode = isFullscreen
    ? "fullscreen"
    : (autoOverlay && "overlay") || "docked";

  // Escape leaves fullscreen. Bound only in fullscreen so it can never swallow
  // an Escape meant for a dialog, menu or the composer inside the panel.
  React.useEffect(() => {
    if (!isFullscreen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // Fullscreen is a view mode, not a route. Leaving the explore views or
  // closing the panel must not strand the app under an invisible cover.
  React.useEffect(() => {
    if (!onExplore || !isRightPanelShown) setIsFullscreen(false);
  }, [onExplore, isRightPanelShown]);

  // On the conversation page the chat input carries `hasRightPanelToggled`
  // through to `isRightPanelShown` (use-chat-input-logic). There is no chat
  // input here, so without this bridge the tab strip's own close button would
  // do nothing. Scoped to the explore views so the conversation page keeps its
  // existing single source of truth. Persisted, so it survives a reload.
  React.useEffect(() => {
    if (!onExplore) return;
    setIsRightPanelShown(hasRightPanelToggled);
    localStorage.setItem(
      "conversation-right-panel-shown",
      JSON.stringify(hasRightPanelToggled),
    );
  }, [onExplore, hasRightPanelToggled, setIsRightPanelShown]);

  const { data } = usePaginatedConversations(20);
  const conversation = React.useMemo(() => {
    const all = data?.pages?.flatMap((p) => p.results) ?? [];
    return pickLastActive(all);
  }, [data]);

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const active = React.useRef(false);
  const drag = React.useRef({
    raf: 0,
    next: 0,
    right: 0,
    start: 0,
  });

  // THE only way `width` changes. Drag, Escape-revert, resize and hydration all
  // go through it, so an unclamped value cannot enter state by any path.
  const commitWidth = React.useCallback((next: number) => {
    const safe = clampWidth(next);
    drag.current.next = safe;
    setWidth(safe);
    return safe;
  }, []);

  const endDrag = React.useCallback(() => {
    if (!active.current) return;
    active.current = false;
    if (drag.current.raf) {
      cancelAnimationFrame(drag.current.raf);
      drag.current.raf = 0;
    }
    setIsDragging(false);
    // Persist the CLAMPED value, so a stale bound can never be stored.
    setPersistedWidth(clampWidth(drag.current.next)); // one write, at the end
  }, [setPersistedWidth]);

  const beginDrag = (e: React.PointerEvent<HTMLElement>) => {
    e.preventDefault();
    // Pointer capture routes every later pointer event to this element even
    // when the cursor is over a cross-origin iframe. The drawer hosts three
    // (ONLYOFFICE, draw.io, JupyterLab), and without capture they swallow the
    // move/up events — the drag freezes mid-gesture and never ends. This is
    // the main reason it "sometimes" got stuck: it depended on the open tab.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current.right =
      rootRef.current?.getBoundingClientRect().right ?? window.innerWidth;
    drag.current.start = width;
    drag.current.next = width;
    active.current = true;
    setIsDragging(true);
  };

  React.useEffect(() => {
    if (!isDragging) return undefined;
    const onMove = (e: PointerEvent) => {
      // No button held means we missed the pointerup (released off-window, in
      // a devtools pause, or over another frame). End rather than follow the
      // cursor forever — that was the stuck state users actually saw.
      if (e.buttons === 0) {
        endDrag();
        return;
      }
      const next = clampWidth(drag.current.right - e.clientX);
      drag.current.next = next;
      // Coalesce to one DOM write per frame; pointermove can fire far faster.
      if (!drag.current.raf) {
        drag.current.raf = requestAnimationFrame(() => {
          drag.current.raf = 0;
          commitWidth(drag.current.next);
        });
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      commitWidth(drag.current.start); // revert, then persist the revert
      endDrag();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("blur", endDrag);
    window.addEventListener("keydown", onKey);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("blur", endDrag);
      window.removeEventListener("keydown", onKey);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (drag.current.raf) {
        cancelAnimationFrame(drag.current.raf);
        drag.current.raf = 0;
      }
    };
  }, [isDragging, endDrag, commitWidth]);

  // The bounds are viewport-derived, so a resize can invalidate the current
  // width in BOTH directions — too wide for the new max, or now below the new
  // minimum. Re-clamping on every resize restores the invariant either way.
  React.useEffect(() => {
    const onResize = () => setWidth((w) => clampWidth(w));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!onExplore || !conversation) return null;

  // Collapsed — a rail so the drawer is always reachable. The conversation page
  // reopens from its chat header; the explore views have no such header.
  if (!isRightPanelShown) {
    return (
      <div
        ref={rootRef}
        className="hidden md:flex shrink-0 md:-ml-2 flex-col items-center border-l border-[var(--cg-border-subtle)] bg-[var(--cg-bg-sidebar)] px-1.5 py-2"
      >
        <button
          type="button"
          aria-label="Open conversation panel"
          title="Open conversation panel"
          onClick={() => setHasRightPanelToggled(true)}
          className="rounded p-1.5 text-[var(--cg-text-muted)] hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-primary)] transition-colors cursor-pointer"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    // `-ml-2` cancels the root layout's `md:gap-2` so the drawer sits FLUSH
    // against the page column with only its divider between them; the gap read
    // as a floating panel rather than a docked one. Hidden below `md`, where the
    // root layout stacks its children vertically and a side panel makes no sense.
    <div
      ref={rootRef}
      data-mode={mode}
      className={cn(
        "hidden md:flex shrink-0 md:-ml-2 min-h-0",
        // DOCKED is plain layout: the drawer occupies real width and the view
        // shrinks beside it. OVERLAY/FULLSCREEN lift out of flow so the view
        // keeps its own width and the drawer paints above it.
        mode !== "docked" &&
          "!fixed inset-y-0 right-0 z-[1200] !ml-0 shadow-[0_10px_60px_rgba(0,0,0,0.45)]",
      )}
    >
      {/* Belt-and-braces with pointer capture: a full-viewport shield above the
          iframes for the duration of the drag, so nothing below can intercept
          the gesture even if capture is unavailable. Portalled to <body> so no
          ancestor stacking context can trap it under the panel. */}
      {isDragging &&
        createPortal(
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2147483000,
              cursor: "ew-resize",
            }}
          />,
          document.body,
        )}
      {/* No grip in fullscreen: there is no edge left to drag. */}
      {mode !== "fullscreen" && (
        <ResizeHandle
          // Hover highlights the GRIP only (handled inside ResizeHandle); the
          // full-height accent line is reserved for an active drag, so the two
          // states stay distinguishable.
          className={cn("shrink-0", isDragging && "bg-[var(--cg-accent)]")}
          onPointerDown={beginDrag}
        />
      )}
      <div
        className="flex flex-col min-h-0 shrink-0 overflow-hidden border-l border-[var(--cg-border-subtle)] bg-[var(--cg-bg-sidebar)]"
        // Fullscreen deliberately does NOT write to `width` — the dragged width
        // is preserved and restored on exit rather than being overwritten.
        style={{ width: mode === "fullscreen" ? "100vw" : width }}
      >
        <ConversationIdProvider conversationId={conversation.conversation_id}>
          <DrawerBody
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((f) => !f)}
          />
        </ConversationIdProvider>
      </div>
    </div>
  );
}

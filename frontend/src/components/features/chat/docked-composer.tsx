/* eslint-disable i18next/no-literal-string -- docked composer */
import React from "react";
import { useLocation } from "react-router";
import { ChevronRight, X } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import { useConversationStore } from "#/state/conversation-store";
import { AgentState } from "#/types/agent-state";
import { useOptimisticUserMessageStore } from "#/stores/optimistic-user-message-store";
import { useErrorMessageStore } from "#/stores/error-message-store";
import { ErrorMessageBanner } from "./error-message-banner";
import { useTheme } from "#/context/theme-context";
import { useAgentStore } from "#/stores/agent-store";
import { PromptInput } from "./prompt-input";

/**
 * The composer, outside the conversation surface.
 *
 * Two placements, one component:
 *
 * - **Docked** — at the foot of the drawer's non-chat tabs (Canvas, Report,
 *   Remediation, Settings). You can be reading an artifact and still say
 *   something without navigating away from it.
 * - **Floating** — centred over the page when the drawer is shut, so the agent
 *   is reachable from a dashboard without opening anything first.
 *
 * It cannot send by itself, and deliberately so: the socket, the agent state
 * and the file pipeline all live in `InteractiveChatBox`. This posts the
 * message to the store, opens the drawer on the Chat tab, and lets the one
 * real sender do the work. Two send paths would be two sets of bugs.
 */

/**
 * Which dashboard the composer is sitting over.
 *
 * Exported because the drawer's composers want it too: the drawer overlays a
 * dashboard rather than replacing it, so "which page am I about to talk
 * about" is the same question there — the answer just was not being shown.
 */
export function viewLabel(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "Home";

  const pretty = (s: string) =>
    s
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

  // /admin/identity → Identity · /explore/<domain>/<subtab> → the sub-tab,
  // which is the level a reader actually thinks in.
  if (parts[0] === "admin") return parts[1] ? pretty(parts[1]) : "Admin";
  if (parts[0] === "explore") return pretty(parts[2] ?? parts[1] ?? "Explore");
  if (parts[0] === "settings") return parts[1] ? pretty(parts[1]) : "Settings";
  if (parts[0] === "conversations") return null;
  return pretty(parts[0]);
}

export function DockedComposer({
  placement,
  measureRef,
}: {
  /** `docked` sits in the drawer; `floating` sits over the page. */
  placement: "docked" | "floating";
  /**
   * Attached to the box that actually has height.
   *
   * The outer shell is `fixed`/`absolute` and its parent measures zero, so a
   * ref higher up would report nothing — the caller needs this element to
   * reserve the right amount of page for it.
   */
  measureRef?: React.Ref<HTMLDivElement>;
}) {
  const { pathname } = useLocation();
  const { setSubmittedMessage, setSelectedTab, setHasRightPanelToggled } =
    useConversationStore();

  /*
   * Opening goes through `hasRightPanelToggled`, never `isRightPanelShown`.
   *
   * On the explore views the drawer derives `isRightPanelShown` from
   * `hasRightPanelToggled` in an effect. Setting the derived value directly
   * showed the panel but left the source at `false` — so the close button then
   * wrote `false` over `false`, the effect never re-ran, and the drawer could
   * not be closed at all once a composer had opened it.
   */
  const openDrawerPanel = () => {
    setSelectedTab("terminal");
    setHasRightPanelToggled(true);
  };

  // Shown in both placements now. Inside the drawer it names the dashboard
  // underneath, which is the context the message is about.
  const label = viewLabel(pathname);

  const { curAgentState } = useAgentStore();
  const { getOptimisticUserMessage } = useOptimisticUserMessageStore();
  const { theme } = useTheme();
  /*
   * Errors are already global state; only their surface was not.
   *
   * `ErrorMessageBanner` rendered exclusively inside `ChatInterface`, which
   * unmounts with the drawer — so an error raised there vanished the moment
   * the panel closed, even though the store still held it. Reading the same
   * store here means one error has one value and appears wherever the composer
   * currently lives.
   */
  const { errorMessage, removeErrorMessage } = useErrorMessageStore();

  /*
   * The run, whoever started it.
   *
   * The banner used to know only about tasks this composer had sent, so
   * closing the drawer mid-run left it blank — the work carried on with no
   * sign of it anywhere. Both senders write the last user message to the
   * optimistic store, and agent state is global, so reading those two makes
   * the banner reflect the conversation rather than this component's history.
   */
  const [localTask, setLocalTask] = React.useState<string | null>(null);
  const running =
    curAgentState === AgentState.RUNNING ||
    curAgentState === AgentState.AWAITING_USER_CONFIRMATION;
  const task = getOptimisticUserMessage() ?? localTask;

  const handleSubmit = (message: string) => {
    if (!message.trim()) return;
    setSubmittedMessage(message);
    setLocalTask(message);

    /*
     * Floating: send and stay put.
     *
     * Throwing the drawer open on submit yanked the reader off the dashboard
     * they were reading in order to show them a reply they had not asked to
     * watch. The message still goes; what they get instead is a line saying
     * what is running, and a way in when they want it.
     */
    if (placement === "floating") return;

    openDrawerPanel();
  };

  const openDrawer = openDrawerPanel;

  /**
   * The running task, in the composer's own strip.
   *
   * The label shimmers rather than sitting beside a spinner: a separate
   * indicator would be a second thing to watch, and the point is that this
   * line is the live one.
   */
  const errorBanner = errorMessage ? (
    <div className="flex w-full items-start gap-2">
      <ErrorMessageBanner message={errorMessage} />
      <button
        type="button"
        onClick={removeErrorMessage}
        aria-label="Dismiss error"
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-opacity hover:opacity-80"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-muted-foreground)",
        }}
      >
        <X size={11} />
      </button>
    </div>
  ) : null;

  const runningBanner = running ? (
    <div className="flex w-full items-center gap-2.5 text-xs">
      {/* The same orb the transcript shows, so the state reads identically
            whether the drawer is open or shut. */}
      <span className="shrink-0">
        <ThinkingOrb
          state="composing"
          size={20}
          theme={theme === "light" ? "light" : "dark"}
        />
      </span>
      <span
        className="cg-task-shimmer min-w-0 flex-1 truncate font-medium"
        title={task ?? "Thinking…"}
      >
        {task ?? "Thinking…"}
      </span>
      <button
        type="button"
        onClick={openDrawer}
        className="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold transition-opacity hover:opacity-80"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-foreground)",
        }}
      >
        View detail
        <ChevronRight size={12} />
      </button>
    </div>
  ) : null;

  /*
   * Both can be true — a run can fail and keep going — so they stack rather
   * than one winning. `undefined` when neither is present, which is what lets
   * the strip measure zero and stay shut.
   */
  const banner =
    errorBanner || runningBanner ? (
      <>
        {errorBanner}
        {runningBanner}
      </>
    ) : undefined;

  /*
   * An explicit width, not a shrink-to-fit one.
   *
   * `PromptInput`'s root is `w-full` with a max-width it animates between 320
   * and 480. Dropped into a flex parent that shrink-wraps its children, that
   * `w-full` resolves against a zero-width box and the composer collapses to
   * almost nothing. The wrapper has to state a width for the component's own
   * sizing to mean anything.
   */
  const composer = (
    <div className="relative z-10 flex w-[480px] max-w-[calc(100vw-2rem)] flex-col items-center">
      <PromptInput
        placeholder="Ask anything"
        onSubmit={handleSubmit}
        banner={banner}
        // The location travels INTO the box as an `@name` chip beside the mode
        // control. Floating it above the card read as a notification about the
        // composer rather than as part of it.
        tag={label ?? undefined}
      />
    </div>
  );

  if (placement === "docked")
    // Overlaid, not docked into the layout. As a flex child it stole ~120px
    // from whatever the tab was showing — a notebook, a report, a graph — all
    // of which want their full height. Floating it over the bottom edge costs
    // the content nothing, and `pointer-events-none` on the shell keeps the
    // area beside the composer clickable.
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3">
        <div
          ref={measureRef}
          className="cg-composer-arrive pointer-events-auto relative"
        >
          {/* Same feathered separation the floating placement gets. Docked, the
              composer sits over a scrolling transcript, so it needs the same
              soft plane break — without it the box reads as pasted onto the
              messages that run underneath it. `relative` is required here: the
              halo is absolutely positioned against this wrapper. */}
          <span aria-hidden className="cg-composer-halo" />
          {composer}
        </div>
      </div>
    );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div
        ref={measureRef}
        className="cg-composer-arrive pointer-events-auto relative"
      >
        {/* Behind the box, not around it — the halo is a sibling rendered
            first so it never sits over the controls. */}
        <span aria-hidden className="cg-composer-halo" />
        {composer}
      </div>
    </div>
  );
}

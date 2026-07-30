/* eslint-disable i18next/no-literal-string -- reliability chrome */
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  registerCrash,
  reportReliability,
  resetCrashLog,
  type ReliabilitySurface,
} from "./reliability";

/**
 * SurfaceErrorBoundary — containment + recovery for one shell surface.
 *
 * Generalises the per-tab boundary to every independently-failable region of
 * the UI (drawer, sidebar, explore view, tabs). Three properties matter:
 *
 *  1. CONTAINMENT — a throw degrades this surface only. Without a boundary at
 *     each surface, React unwinds to the nearest one; for anything mounted in
 *     the root layout that is the ROUTE boundary, which replaces the entire
 *     shell (sidebar + top bar + page) over one component's bug.
 *  2. RECOVERY — one automatic remount, because a large class of failures is
 *     transient (a race on first paint, a chunk that arrived late). If the
 *     retry also fails we stop and show a manual control, so a component that
 *     throws on every render cannot become an infinite remount loop.
 *  3. VISIBILITY — every crash and recovery is counted. A contained failure
 *     that nobody counts is a failure nobody fixes.
 *
 * `resetKeys` clears the error when the surface's inputs change (e.g. the user
 * navigated), so a stale failure does not outlive the state that caused it.
 */

interface Props {
  surface: ReliabilitySurface;
  /** Human name for the message and the counter dimension. */
  name: string;
  children: React.ReactNode;
  /** Rendered instead of the default panel. Receives a retry callback. */
  fallback?: (props: { error?: string; retry: () => void }) => React.ReactNode;
  /** Changing any value clears a latched error. */
  resetKeys?: unknown[];
  /** Compact styling for narrow surfaces such as the collapsed rail. */
  compact?: boolean;
}

interface State {
  failed: boolean;
  message?: string;
  /** Auto-retries already spent. Capped at 1 — see RECOVERY above. */
  attempts: number;
  /** Crash-looping: stop recovering silently and say so. */
  unstable: boolean;
}

const MAX_AUTO_RETRIES = 1;

export class SurfaceErrorBoundary extends React.Component<Props, State> {
  private retryTimer: number | undefined;

  constructor(props: Props) {
    super(props);
    this.state = { failed: false, attempts: 0, unstable: false };
  }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return {
      failed: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidUpdate(prev: Props) {
    const { resetKeys } = this.props;
    const { failed } = this.state;
    if (!failed || !resetKeys) return;
    const changed =
      prev.resetKeys?.length !== resetKeys.length ||
      resetKeys.some((k, i) => prev.resetKeys?.[i] !== k);
    // Inputs moved on: the latched error is about state that no longer exists.
    if (changed) this.reset();
  }

  componentDidCatch(error: unknown) {
    const { surface, name } = this.props;
    const { attempts } = this.state;
    reportReliability(surface, "crash", {
      detail: name,
      message: error instanceof Error ? error.message : String(error),
    });

    // Crash history is tracked OUTSIDE React, because a remount resets
    // component state and would make "recover once" effectively unlimited.
    const { unstable } = registerCrash(`${surface}.${name}`);
    if (unstable) {
      this.setState({ unstable: true });
      reportReliability(surface, "degraded", {
        detail: name,
        message: "crash loop — automatic recovery suspended",
      });
      return;
    }

    // One delayed remount. Delayed rather than immediate so a synchronous
    // throw-on-render cannot spin the main thread.
    if (attempts < MAX_AUTO_RETRIES) {
      this.retryTimer = window.setTimeout(() => {
        this.setState((s) => ({
          failed: false,
          message: undefined,
          attempts: s.attempts + 1,
        }));
        reportReliability(surface, "recovered", { detail: name });
      }, 400);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) window.clearTimeout(this.retryTimer);
  }

  reset = () => {
    if (this.retryTimer) window.clearTimeout(this.retryTimer);
    this.setState({ failed: false, message: undefined });
  };

  manualRetry = () => {
    const { surface, name } = this.props;
    reportReliability(surface, "retry", { detail: name });
    // A human asking again is new intent, not a loop: clear both the local
    // budget and the shared crash history so the surface gets a clean chance.
    resetCrashLog(`${surface}.${name}`);
    this.setState({
      failed: false,
      message: undefined,
      attempts: 0,
      unstable: false,
    });
  };

  render() {
    const { failed, message, unstable } = this.state;
    const { children, fallback, name, compact } = this.props;
    if (!failed) return children;

    if (fallback) return fallback({ error: message, retry: this.manualRetry });

    return (
      <div
        role="alert"
        className={
          compact
            ? "flex h-full w-full flex-col items-center justify-center gap-2 p-2"
            : "flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center"
        }
      >
        <AlertTriangle className="h-5 w-5 text-amber-400" />
        {!compact && (
          <>
            <span className="text-[13px] text-[var(--cg-text-nav)]">
              {unstable
                ? `${name} keeps failing — automatic recovery stopped`
                : `${name} hit an error`}
            </span>
            {message && (
              <span className="max-w-md text-center text-[11px] text-[var(--cg-text-muted)] opacity-70">
                {message}
              </span>
            )}
          </>
        )}
        <button
          type="button"
          onClick={this.manualRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-[var(--cg-border-card)] px-2.5 py-1 text-[12px] text-[var(--cg-text-primary)] hover:bg-[var(--cg-bg-hover)] cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {compact ? "" : "Retry"}
        </button>
      </div>
    );
  }
}

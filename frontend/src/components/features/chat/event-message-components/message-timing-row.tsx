import React from "react";
import {
  MessageTiming,
  type TimingStat,
} from "#/components/tool-ui/elements/message-timing";

interface MessageTimingRowProps {
  /** ISO 8601, straight off the event. */
  timestamp?: string;
  /** Timestamp of the turn this replies to, when there is one. */
  previousTimestamp?: string;
}

/** "3:41 PM" in the viewer's locale — the transcript showed no time at all. */
function formatClock(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Whole seconds between two events, omitted when it would read as "0s". */
function formatElapsed(from: string, to: string): string | null {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 1) return null;
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/**
 * The timing footer under an assistant message.
 *
 * Only stats backed by real event data are shown. Token counts and cost are
 * deliberately absent: events carry no per-event metrics, and inventing a
 * plausible-looking number under a "tokens" label would misreport spend.
 *
 * Renders nothing when there is nothing true to say.
 */
export function MessageTimingRow({
  timestamp,
  previousTimestamp,
}: MessageTimingRowProps) {
  const stats = React.useMemo<TimingStat[]>(() => {
    if (!timestamp) return [];
    const out: TimingStat[] = [];

    const clock = formatClock(timestamp);
    if (clock) out.push({ label: "at", value: clock });

    if (previousTimestamp) {
      const elapsed = formatElapsed(previousTimestamp, timestamp);
      if (elapsed) out.push({ label: "took", value: elapsed });
    }

    return out;
  }, [timestamp, previousTimestamp]);

  if (stats.length === 0) return null;

  // Always visible: a reveal-on-hover variant would need a `group/msg` parent
  // that the message article does not declare, so the footer would simply
  // never appear.
  return <MessageTiming className="mt-1" stats={stats} />;
}

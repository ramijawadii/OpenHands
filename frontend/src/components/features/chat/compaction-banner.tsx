/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useCompactStore } from "#/stores/compact-store";

/** After this many ms with no CondensationObservation, assume the agent was idle
 *  and the compaction is queued for its next run — show a softer message. */
const COMPACTING_TIMEOUT_MS = 30_000;

export function CompactionBanner() {
  const { isCompacting, compactionCount } = useCompactStore();
  const [showComplete, setShowComplete] = React.useState(false);
  const [showQueued, setShowQueued] = React.useState(false);
  const prevCount = React.useRef(compactionCount);

  // Completion flash
  React.useEffect(() => {
    if (compactionCount > prevCount.current) {
      prevCount.current = compactionCount;
      setShowQueued(false);
      setShowComplete(true);
      const timer = setTimeout(() => setShowComplete(false), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [compactionCount]);

  // If isCompacting stays true for >30s, the agent was idle — show "queued" and dismiss
  React.useEffect(() => {
    if (!isCompacting) {
      setShowQueued(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      setShowQueued(true);
      // Auto-clear the stuck isCompacting flag so the banner disappears after 4s
      const dismissTimer = setTimeout(() => {
        useCompactStore.getState().reset();
        // restore compactionCount after reset so the counter isn't lost
      }, 4000);
      return () => clearTimeout(dismissTimer);
    }, COMPACTING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isCompacting]);

  if (isCompacting && !showQueued) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-400 border border-neutral-700 bg-neutral-800/60 rounded-md">
        <span className="inline-block animate-spin">↻</span>
        Compacting context…
      </div>
    );
  }

  if (isCompacting && showQueued) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-400 border border-neutral-700 bg-neutral-800/60 rounded-md">
        Compaction queued — runs on next task
      </div>
    );
  }

  if (showComplete) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-emerald-400 border border-emerald-800/50 bg-emerald-900/20 rounded-md">
        ✓ Context compacted ({compactionCount}×)
      </div>
    );
  }

  return null;
}

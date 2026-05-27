/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useCompactStore } from "#/stores/compact-store";

export function CompactionBanner() {
  const { isCompacting, compactionCount } = useCompactStore();
  const [showComplete, setShowComplete] = React.useState(false);
  const prevCount = React.useRef(compactionCount);

  React.useEffect(() => {
    if (compactionCount > prevCount.current) {
      prevCount.current = compactionCount;
      setShowComplete(true);
      const timer = setTimeout(() => setShowComplete(false), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [compactionCount]);

  if (isCompacting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-400 border border-neutral-700 bg-neutral-800/60 rounded-md">
        <span className="inline-block animate-spin">↻</span>
        Compacting context…
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

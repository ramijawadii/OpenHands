/* eslint-disable i18next/no-literal-string */
import React from "react";

/**
 * MemoryHud — an opt-in, dev-only JS-heap readout so you can verify the app's
 * memory actually plateaus (and catch regressions) instead of trusting a claim.
 * Zero cost for normal users: it renders nothing unless explicitly enabled.
 *
 * Enable:  add ?memhud=1 to the URL, or run
 *          localStorage.setItem("cg-mem-hud", "1") and reload.
 * Disable: ?memhud=0, or localStorage.removeItem("cg-mem-hud").
 *
 * Reads performance.memory (Chromium-only, non-standard). On other browsers it
 * shows "n/a" — use the DevTools Memory panel there.
 */

interface PerfMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

function readMemory(): PerfMemory | null {
  const m = (performance as unknown as { memory?: PerfMemory }).memory;
  return m && typeof m.usedJSHeapSize === "number" ? m : null;
}

const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(0);

function toneFor(pct: number | null): string {
  if (pct == null) return "#9CA3AF";
  if (pct > 80) return "#E2574C";
  if (pct > 60) return "#F59E0B";
  return "#1D9E6E";
}

function isEnabled(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get("memhud");
    if (q === "1") {
      localStorage.setItem("cg-mem-hud", "1");
      return true;
    }
    if (q === "0") {
      localStorage.removeItem("cg-mem-hud");
      return false;
    }
    return localStorage.getItem("cg-mem-hud") === "1";
  } catch {
    return false;
  }
}

export default function MemoryHud() {
  const [enabled] = React.useState(isEnabled);
  const [used, setUsed] = React.useState<number | null>(null);
  const [limit, setLimit] = React.useState<number | null>(null);
  const peakRef = React.useRef(0);
  const [peak, setPeak] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => {
      const m = readMemory();
      if (m) {
        setUsed(m.usedJSHeapSize);
        setLimit(m.jsHeapSizeLimit);
        if (m.usedJSHeapSize > peakRef.current) {
          peakRef.current = m.usedJSHeapSize;
          setPeak(m.usedJSHeapSize);
        }
      } else {
        setUsed(-1);
      }
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  const pct =
    used && used > 0 && limit ? Math.round((used / limit) * 100) : null;
  const tone = toneFor(pct);

  return (
    <div
      style={{ borderColor: tone }}
      className="pointer-events-none fixed bottom-2 left-2 z-[9999] select-none rounded-md border bg-black/70 px-2 py-1 font-mono text-[10px] leading-tight text-white shadow-lg backdrop-blur"
      title="JS heap (performance.memory) — dev only"
    >
      {used === -1 ? (
        <span>heap: n/a (non-Chromium)</span>
      ) : (
        <span style={{ color: tone }}>
          heap {used != null ? mb(used) : "…"}
          {limit ? ` / ${mb(limit)}MB` : "MB"}
          {pct != null ? ` (${pct}%)` : ""} · peak {mb(peak)}
        </span>
      )}
    </div>
  );
}

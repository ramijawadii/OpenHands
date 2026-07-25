/* eslint-disable i18next/no-literal-string */
import React from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import {
  useSurfaceHealth,
  refreshSurfaceHealth,
  type SurfaceId,
} from "./surface-health";

/**
 * SurfaceHost — the uniform isolation + fail-safe wrapper for a heavy Canvas
 * surface (Notebook / ONLYOFFICE / draw.io), each of which renders from its own
 * cross-origin backend in a separate OS process.
 *
 * It provides, identically for every surface:
 *  - Health-gated mount: don't show a broken iframe — wait until the backend is
 *    confirmed healthy the FIRST time (fail closed on initial mount).
 *  - Non-destructive degradation: once mounted, a later backend blip shows a
 *    degraded OVERLAY but keeps the iframe (and any unsaved state) alive, so a
 *    one-poll hiccup never nukes an editor. It auto-clears when health returns.
 *  - Manual Reopen: a hard remount (bumps a nonce passed to the child) with a
 *    fresh session — the recovery path when the surface itself is wedged.
 *
 * The child is a render-prop that receives `reopenNonce`; key your iframe on it so
 * Reopen remounts a clean surface. See FAIL_SAFE_ISOLATION_SPEC.md.
 */

interface Props {
  surfaceId: SurfaceId;
  conversationId: string;
  /** Human label for the degraded/loading cards, e.g. "Notebook". */
  title: string;
  children: (reopenNonce: number) => React.ReactNode;
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--cg-text-muted)]">
      {children}
    </div>
  );
}

export default function SurfaceHost({
  surfaceId,
  conversationId,
  title,
  children,
}: Props) {
  const status = useSurfaceHealth(surfaceId, conversationId);
  const [nonce, setNonce] = React.useState(0);

  // Latch: once a surface has been healthy we keep it mounted through transient
  // backend blips (overlay instead of unmount), so we never lose editor state.
  const everHealthyRef = React.useRef(false);
  if (status?.healthy) everHealthyRef.current = true;

  const reopen = React.useCallback(() => {
    refreshSurfaceHealth();
    setNonce((n) => n + 1);
  }, []);

  const degraded = (overlay: boolean) => (
    <div
      className={
        overlay
          ? "absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--cg-bg-page)]/85 backdrop-blur-sm text-[var(--cg-text-muted)]"
          : "flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--cg-text-muted)]"
      }
    >
      <AlertTriangle className="h-6 w-6 text-amber-400" />
      <span className="text-[13px] text-[var(--cg-text-nav)]">
        {title} is unavailable
      </span>
      <span className="max-w-md text-center text-[11px] opacity-70">
        {status?.reason ?? "backend not reachable"}
        {overlay ? " — retrying automatically" : ""}
      </span>
      <button
        type="button"
        onClick={reopen}
        className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded border border-[var(--cg-border-subtle)] px-2 py-1 text-[11px] hover:text-[var(--cg-text-primary)]"
      >
        <RefreshCw className="h-3 w-3" />
        Reopen
      </button>
    </div>
  );

  // Before the first confirmed-healthy mount: fail closed (no broken iframe).
  if (!everHealthyRef.current) {
    if (status === null) {
      return (
        <CenteredCard>
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-[12px]">Checking {title}…</span>
        </CenteredCard>
      );
    }
    if (!status.healthy) return degraded(false);
  }

  // Mounted at least once: keep the child alive; overlay if currently unhealthy.
  return (
    <div className="relative h-full w-full">
      {children(nonce)}
      {status && !status.healthy && degraded(true)}
    </div>
  );
}

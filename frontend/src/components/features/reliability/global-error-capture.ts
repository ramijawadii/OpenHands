import { reportReliability } from "./reliability";

/**
 * Capture for the failures a React error boundary CANNOT see.
 *
 * `getDerivedStateFromError` / `componentDidCatch` only fire for errors thrown
 * during render, in a lifecycle method, or in a constructor. Everything else is
 * invisible to them:
 *
 *   - a throw inside an event handler (onClick, onPointerMove)
 *   - a throw inside setTimeout / requestAnimationFrame
 *   - an unhandled promise rejection (a failed fetch nobody awaited)
 *
 * Those are precisely where this app does its riskiest work — drag handlers over
 * cross-origin iframes, timers driving hover intent, fire-and-forget POSTs. So
 * without this, "every surface is contained" was true only for the render path,
 * and the most common runtime faults were dropped on the floor entirely.
 *
 * This does NOT swallow anything: the browser still logs, and any existing
 * handler still runs. It only ensures the failure is COUNTED, so a surface that
 * is quietly throwing on every pointer move is visible instead of invented.
 */

let installed = false;

/** Errors we know are not ours and cannot act on — keeping them out stops the
 *  ring buffer being flooded by third-party noise during an incident. */
function isIgnorable(message: string): boolean {
  return (
    // Cross-origin script errors are opaque by design ("Script error." with no
    // stack); they carry no actionable information.
    message === "Script error." ||
    message === "" ||
    // Benign: fires when an observer callback outruns layout. Browsers emit it
    // for code we do not own and it has no user-visible effect.
    message.startsWith("ResizeObserver loop")
  );
}

export function installGlobalErrorCapture(): () => void {
  if (installed || typeof window === "undefined") return () => {};
  installed = true;

  const onError = (e: ErrorEvent) => {
    const message = e.message || String(e.error ?? "");
    if (isIgnorable(message)) return;
    reportReliability("request", "crash", {
      detail: "uncaught",
      message: `${message}${e.filename ? ` @ ${e.filename}:${e.lineno}` : ""}`,
    });
  };

  const onRejection = (e: PromiseRejectionEvent) => {
    const { reason } = e;
    let message: string;
    if (reason instanceof Error) message = reason.message;
    else if (typeof reason === "string") message = reason;
    else message = JSON.stringify(reason ?? null);
    if (isIgnorable(String(message))) return;
    reportReliability("request", "crash", {
      detail: "unhandled-rejection",
      message: String(message).slice(0, 300),
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    installed = false;
  };
}

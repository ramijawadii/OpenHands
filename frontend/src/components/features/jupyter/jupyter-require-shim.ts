/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal CommonJS `require` shim for the jupyter-react / JupyterLab bundle.
 *
 * A few JupyterLab dependencies contain raw CJS `require(...)` calls that Rollup
 * leaves untransformed inside otherwise-ESM modules — notably an UNGUARDED
 * `const version = require("../package.json")` (a package reading its own
 * version) and a try/guarded `require("crypto")`. In a browser ESM bundle there
 * is no `require`, so the unguarded one throws `ReferenceError: require is not
 * defined` the moment the Notebook mounts, which our error boundary then catches
 * — the user sees the store-view fallback instead of the live notebook.
 *
 * This is imported for its side effect FIRST in jupyter-react-notebook.tsx, so
 * `globalThis.require` exists before the jupyter-react modules evaluate. It only
 * installs when `require` is missing, and is scoped to the lazy notebook chunk;
 * the rest of the app is pure ESM and never touches `require`.
 */
const g = globalThis as any;

if (typeof g.require === "undefined") {
  g.require = (id: string): unknown => {
    // Packages that read their own version at module-eval time.
    if (id.endsWith("package.json")) return { version: "0.0.0", default: {} };
    // Node's crypto — callers already fall back to window.crypto in a try/catch.
    if (id === "crypto" || id === "node:crypto") return {};
    // Unknown module: return an empty object rather than throwing, so a stray
    // require can never take down the whole notebook mount.
    return {};
  };
}

export {};

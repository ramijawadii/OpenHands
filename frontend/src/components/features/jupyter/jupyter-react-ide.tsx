/* eslint-disable i18next/no-literal-string */
// MUST be first: installs the `require` shim before any JupyterLab module
// evaluates (they contain raw CJS `require(...)` calls that would otherwise throw
// "require is not defined" on mount).
import "./jupyter-require-shim";
import React from "react";
import { IRouter } from "@jupyterlab/application";
import { PageConfig } from "@jupyterlab/coreutils";
import { ServiceManager, ServerConnection } from "@jupyterlab/services";
// The FULL JupyterLab IDE as a React component. Only exported from the package
// barrel, which pulls the app shell + core extensions (file browser, launcher,
// menu bar, multi-document tabs) and their legacy webpack-`~` / `.raw.css` CSS —
// handled by the vite.config plugins. Heavy, so this file is the ONLY import
// site and jupyter.tsx loads it via React.lazy (own code-split chunk).
import {
  JupyterLabApp,
  JupyterLabAppCorePlugins,
} from "@datalayer/jupyter-react";
// The light theme plugin — CorePlugins doesn't register a theme, so without this
// the ThemeManager throws "Neither theme JupyterLab Light nor default … loaded".
import * as lightThemeExtension from "@jupyterlab/theme-light-extension";
import "@datalayer/jupyter-react/style/index.css";
// Embedded-layout corrections: constrain body-attached dialogs to this panel and
// make the shell/notebook reflow with it. Imported AFTER the lab CSS so it wins.
import "./jupyter-react-ide.css";

// The Jupyter server serves theme CSS under `<baseUrl>/lab/api/themes/...`; tell
// the client's ThemeManager to look there instead of `<baseUrl>/...` (which 404s
// with "Stylesheet failed to load"). Set once at module load, before any lab app
// initialises. The other lab-server APIs (settings/translations/workspaces) are
// bridged in the proxy (api/* → lab/api/*), so they need no PageConfig here.
PageConfig.setOption("themesUrl", "lab/api/themes");

// Default to SIMPLE (single-document) mode. In a narrow embedded side panel the
// multi-document tab bar wastes vertical space and invites layout thrash; simple
// mode shows one document at a time and reads much better here. Users can still
// flip the "Simple" switch in the status bar.
PageConfig.setOption("mode", "single-document");

// Embedded JupyterLab must NEVER own the browser URL.
//
// We cannot disable the router (~30 core plugins require its IRouter service), so
// we neutralise `router.navigate` instead. Standalone JupyterLab uses it to sync
// the address bar (/lab/tree/…, /doc/workspaces/…); embedded in our SPA that
// rewrites the URL to something like
//   /conversations/api/conversations/<id>/jupyter/doc/workspaces
// which is not a route this app knows — so a reload 404s.
//
// This is a FULL no-op rather than a pattern match: the datalayer guard blocks a
// bare '/lab/workspaces' prefix and our earlier substring guard blocked
// '/lab/workspaces'|'/lab/tree', but this build routes under '/doc/workspaces'
// and slipped through. Pattern-matching lab's route shapes is whack-a-mole.
// Nothing user-facing depends on it: the launcher, file browser and menus all go
// through the command registry, not the router's URL sync.
const cgNavigateGuard = {
  id: "cloudguard:router-navigate-guard",
  description: "Prevent embedded JupyterLab from rewriting the browser URL.",
  autoStart: true,
  requires: [IRouter],
  // Mutating the live router instance is intentional here: this guard
  // neutralises JupyterLab's own navigation so it cannot rewrite our URL.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-param-reassign
  activate: (_app: unknown, router: any) => {
    if (router.__cgPatched) return;
    /* eslint-disable no-param-reassign */
    router.navigate = () => undefined;
    router.__cgPatched = true;
    /* eslint-enable no-param-reassign */
  },
};

// ⚠️ These are TEMPLATES ONLY — never pass them to JupyterLabApp directly.
//
// JupyterLabAppAdapter MUTATES the arrays it receives: it destructures
// `plugins: extensions = []` / `disabledPlugins = []` and then PUSHES its own
// guard plugins AND every resolved core plugin into `extensions`, plus extra ids
// into `disabledPlugins`, before calling `registerPluginModules(extensions)`.
// Sharing one module-level array across mounts therefore accumulates the whole
// core plugin set, so a second mount re-registers every id into a single
// registry → "Plugin '…' is already registered" (which is exactly the error we
// were chasing). Build a FRESH array on every mount instead.
const BASE_EXTRA_PLUGINS = [lightThemeExtension, cgNavigateGuard];
const BASE_DISABLED_PLUGINS = [
  // The "Would you like to get notified about official Jupyter news?" popup.
  "@jupyterlab/apputils-extension:announcements",
];

interface Props {
  baseUrl: string;
  wsUrl: string;
  /** empty in the proxy model — the app session authenticates to the proxy */
  token: string;
}

export default function JupyterReactIde({ baseUrl, wsUrl, token }: Props) {
  // Same proxied ServiceManager as the notebook: the browser talks only to the
  // control-plane proxy (credentials: same-origin), never the sandbox directly.
  // NOTE: do NOT dispose it on unmount — JupyterLabApp owns its lifecycle, and a
  // premature dispose kills the SessionManager poll ("… is disposed" → File Load
  // Error). The sockets are reclaimed when the page/conversation unloads.
  const serviceManager = React.useMemo(() => {
    const serverSettings = ServerConnection.makeSettings({
      baseUrl,
      wsUrl,
      token,
      appendToken: false,
      init: { credentials: "same-origin" },
    });
    return new ServiceManager({ serverSettings });
  }, [baseUrl, wsUrl, token]);

  // Core JupyterLab plugins = file browser, launcher, notebook, terminal,
  // console, settings, menu bar, etc. Fresh per mount (see the mutation note on
  // BASE_EXTRA_PLUGINS): the adapter consumes these promise arrays and pushes the
  // resolved plugins into the `plugins` array we hand it.
  const core = React.useMemo(() => JupyterLabAppCorePlugins(), []);

  // FRESH per mount — the adapter mutates both of these in place.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugins = React.useMemo<any[]>(() => [...BASE_EXTRA_PLUGINS], []);
  const disabledPlugins = React.useMemo(() => [...BASE_DISABLED_PLUGINS], []);

  // JupyterLab is a Lumino app: the shell needs CONCRETE pixel dimensions. `100%`
  // collapses (the Box/host wrappers between us and the shell have auto size), so
  // the IDE renders in a corner box and leaves a dead gutter. Measure the host and
  // feed real pixels for BOTH axes. Safe: the datalayer init effect keys on
  // [hostId, ref, serviceManager, theme] — size is NOT a dep, so updating it
  // re-renders without re-initialising the lab app.
  //
  // We also publish the panel's viewport rect as CSS vars so dialogs (which
  // attach to document.body and are viewport-fixed) can be constrained to this
  // panel instead of centring over the chat — see jupyter-react-ide.css.
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ w: 800, h: 600 });
  React.useEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.floor(r.width);
      const h = Math.floor(r.height);
      if (w > 0 && h > 0) {
        // Only commit real changes so we can't oscillate with the shell's layout.
        setSize((prev) =>
          Math.abs(prev.w - w) > 2 || Math.abs(prev.h - h) > 2
            ? { w, h }
            : prev,
        );
      }
      const root = document.documentElement.style;
      root.setProperty("--cg-jp-left", `${Math.round(r.left)}px`);
      root.setProperty("--cg-jp-top", `${Math.round(r.top)}px`);
      root.setProperty("--cg-jp-width", `${Math.round(r.width)}px`);
      root.setProperty("--cg-jp-height", `${Math.round(r.height)}px`);
    };

    measure();
    // rAF-coalesce: ResizeObserver + scroll can fire in bursts, and measuring
    // (getBoundingClientRect) forces layout. Coalescing keeps resizing smooth and
    // guarantees we can never feed a runaway resize loop.
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    // Size alone isn't enough — the panel can MOVE (window resize, drawer
    // open/close, page scroll) which changes the rect used to place dialogs.
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      ro.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, []);

  // Lumino recomputes widget geometry from WINDOW resize events. Our panel can
  // change size without the window changing (drawer resize, tab switch), so the
  // shell keeps stale geometry and documents render mispositioned — the notebook
  // ends up jammed to one side with dead space. Nudge Lumino whenever our
  // measured size changes so it re-fits every attached widget.
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    return () => window.cancelAnimationFrame(id);
  }, [size.w, size.h]);

  // Drive the shell once the lab app is ready: Simple (single-document) mode is
  // the right default in a narrow panel, and PageConfig alone doesn't reliably
  // apply it. Also re-fit here, since documents opened later must pick up the
  // current panel geometry.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleJupyterLab = React.useCallback((adapter: any) => {
    try {
      const shell = adapter?.shell;
      if (shell) shell.mode = "single-document";
      window.dispatchEvent(new Event("resize"));
    } catch {
      // Non-fatal: the IDE still works in multi-document mode.
    }
  }, []);

  // Safety net for runaway errors that escape React (JupyterLab reports many
  // failures asynchronously, so the error boundary never sees them). A recursion
  // blow-up like the FAST design-token loop used to emit thousands of identical
  // RangeErrors, which freezes devtools and hides the real first error. Throttle
  // the reporting so the first occurrence is preserved and the flood is dropped.
  React.useEffect(() => {
    let stackOverflows = 0;
    const onError = (e: ErrorEvent) => {
      const msg = e.message || "";
      if (!msg.includes("Maximum call stack size exceeded")) return;
      stackOverflows += 1;
      if (stackOverflows > 3) {
        // Stop the flood; the first few are already in the console.
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      if (stackOverflows === 4) {
        // eslint-disable-next-line no-console
        console.warn(
          "[jupyter-ide] suppressing repeated stack-overflow reports; " +
            "see the first occurrence above for the real stack.",
        );
      }
    };
    window.addEventListener("error", onError, true);
    return () => window.removeEventListener("error", onError, true);
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      {/* NO <JupyterReactTheme> here. JupyterLabApp renders its OWN theme layer
          (JupyterLabAppCss). Nesting a second provider means TWO systems drive
          the same FAST design tokens, so each `Store.set` notifies the other's
          DesignTokenBindingObserver, which re-evaluates a derived token and sets
          again → "Maximum call stack size exceeded". JupyterReactTheme is for the
          standalone components (Notebook/Cell), not for the full lab app. */}
      <JupyterLabApp
        hostId="cg-jupyterlab-ide"
        serviceManager={serviceManager}
        plugins={plugins}
        pluginPromises={core.extensionPromises}
        mimeRendererPromises={core.mimeExtensionPromises}
        disabledPlugins={disabledPlugins}
        onJupyterLab={handleJupyterLab}
        // NO startDefaultKernel: it spawns a kernel on EVERY app init, and
        // nothing reclaims it — every page refresh leaked another Python
        // process into the sandbox (we saw the kernel count climb to 8).
        // Notebooks start their own kernel when opened, which is what a user
        // actually expects, and those are visible/stoppable in the Running panel.
        nosplash
        height={`${size.h}px`}
        width={`${size.w}px`}
      />
    </div>
  );
}

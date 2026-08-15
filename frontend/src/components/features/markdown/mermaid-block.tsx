/* eslint-disable i18next/no-literal-string -- diagram affordance copy, pending i18n keys */
/**
 * A rendered mermaid diagram, with the source kept as a fallback.
 *
 * Lived inside chat-message.tsx, which meant every other markdown surface
 * either duplicated it or — as the report view did — silently rendered mermaid
 * as source text. Shared so there is one implementation to fix.
 */
import * as React from "react";
import { BarChart2 } from "lucide-react";
import { useConversationStore } from "#/state/conversation-store";
import { sanitizeMermaid } from "#/utils/sanitize-mermaid";
import { ICON_PACKS } from "./icon-packs";

type MermaidMod = typeof import("mermaid");
const appIsLight = () =>
  typeof document !== "undefined" &&
  document.documentElement.getAttribute("data-theme") === "light";
let mermaidMod: MermaidMod | null = null;
let mermaidReady = false;
let mermaidLoading = false;
// Waiters get (module | null). null means the load FAILED — previously the
// catch below just reset the loading flag and dropped the queue, so a failed
// import left every diagram blank forever with no error and no source
// fallback: the one state that looks identical to "still working".
const mermaidQueue: ((m: MermaidMod | null) => void)[] = [];
let mermaidFailed = false;
// Exported so the standalone canvas shares this singleton: two copies would
// each initialise mermaid and race on the global theme config.
/**
 * Apply the current theme before every render.
 *
 * mermaid.initialize is global and was called once, at module load, pinned to
 * "dark". On a light page that produced light text and light icons on white —
 * invisible — and switching theme afterwards changed nothing because init had
 * already run. Re-initialising per render is cheap and makes the diagram track
 * the app.
 */
export function applyMermaidTheme(
  m: MermaidMod,
  colored: boolean,
  forceLight = false,
) {
  // forceLight: architecture diagrams always draw on white, whatever the app
  // theme, because the vendor artwork is designed for it.
  const light = forceLight || appIsLight();
  m.default.initialize({
    startOnLoad: false,
    theme: light ? "default" : "dark",
    securityLevel: "loose",
    themeVariables: {
      primaryColor: light ? "#f4f4f5" : "#252525",
      primaryTextColor: light ? "#18181b" : "#e2e8f0",
      primaryBorderColor: light ? "#d4d4d8" : "#3a3a3a",
      lineColor: light ? "#52525b" : "#888888",
      background: light ? "#ffffff" : "#181818",
      mainBkg: light ? "#ffffff" : "#252525",
      clusterBkg: light ? "#fafafa" : "#1a1a1a",
      fontFamily: "Inter, ui-sans-serif, sans-serif",
    },
  });
  return { light, colored };
}

export function loadMermaid(cb: (m: MermaidMod | null) => void) {
  if (mermaidReady && mermaidMod) {
    cb(mermaidMod);
    return;
  }
  // Once it has failed, fail fast rather than queueing behind a load that will
  // never resolve.
  if (mermaidFailed) {
    cb(null);
    return;
  }
  mermaidQueue.push(cb);
  if (mermaidLoading) return;
  mermaidLoading = true;
  import("mermaid")
    .then((m) => {
      // Cloud icon packs for architecture-beta. Lazy: 3.1MB across four packs,
      // loaded only when a diagram is actually rendered, never on first paint.
      // Converted from the draw.io stencils we already ship (scripts/
      // stencils_to_iconify.py) so the icon vocabulary matches the draw.io
      // catalogue rather than being a second, divergent set.
      // Every converted stencil family. Loaders are dynamic imports, so only
      // the packs a diagram actually references are fetched.
      try {
        m.default.registerIconPacks(ICON_PACKS);
      } catch {
        // A bad pack must not stop every other diagram rendering.
      }
      m.default.initialize({
        startOnLoad: false,
        // Follow the app theme. This was pinned to "dark", so on a light page
        // mermaid emitted light text and light icons onto white — invisible.
        // The icons use currentColor, so they inherit whatever this sets.
        theme: appIsLight() ? "default" : "dark",
        securityLevel: "loose",
        themeVariables: {
          primaryColor: appIsLight() ? "#f4f4f5" : "#252525",
          primaryTextColor: appIsLight() ? "#18181b" : "#e2e8f0",
          primaryBorderColor: appIsLight() ? "#d4d4d8" : "#3a3a3a",
          lineColor: appIsLight() ? "#52525b" : "#888888",
          background: appIsLight() ? "#ffffff" : "#181818",
          mainBkg: appIsLight() ? "#ffffff" : "#252525",
          clusterBkg: appIsLight() ? "#fafafa" : "#1a1a1a",
          fontFamily: "Inter, ui-sans-serif, sans-serif",
        },
      });
      mermaidMod = m;
      mermaidReady = true;
      mermaidQueue.forEach((fn) => fn(m));
      mermaidQueue.length = 0;
    })
    .catch(() => {
      mermaidLoading = false;
      mermaidFailed = true;
      // Tell the waiters, so each block can show its source instead of a void.
      mermaidQueue.forEach((fn) => fn(null));
      mermaidQueue.length = 0;
    });
}

export function MermaidBlock({ code }: { code: string }) {
  const { setSelectedTab, setHasRightPanelToggled } = useConversationStore();
  const ref = React.useRef<HTMLDivElement>(null);
  const [err, setErr] = React.useState<string | null>(null);
  // Render only after mount. mermaid writes the SVG in with innerHTML, and
  // doing that while React is hydrating makes the server and client markup
  // disagree — React error #418, which showed as a diagram box that stayed
  // empty with no error. The diagrams tab already guards ReactFlow the same
  // way; this is the same fix for the same cause.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return undefined;
    const el = ref.current;
    if (!el || !code.trim()) return undefined;
    setErr(null);
    el.innerHTML = "";
    const id = `cg-chat-mmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    loadMermaid(async (m) => {
      if (!m) {
        setErr("Diagram renderer unavailable.");
        return;
      }
      try {
        const { svg } = await m.default.render(id, sanitizeMermaid(code));
        // An empty render is a failure too — it produced no diagram and no
        // exception, which would otherwise leave a blank box.
        if (!svg || !svg.includes("<svg")) {
          setErr("Diagram produced no output.");
          return;
        }
        el.innerHTML = svg
          .replace(/(<svg[^>]*)\swidth="[^"]*"/, "$1")
          .replace(/(<svg[^>]*)\sheight="[^"]*"/, "$1");
        const s = el.querySelector("svg");
        if (s) {
          const el2 = s as SVGElement;
          el2.style.display = "block";
          el2.style.margin = "0 auto";
          // Fit inside a bounded box rather than filling the width and taking
          // whatever height the aspect ratio implies. A tall flowchart did the
          // latter and ran to ~2000px, pushing the prose around it off screen.
          // max-height caps it; `object-fit`-style scaling comes from the
          // viewBox plus preserveAspectRatio.
          el2.style.width = "100%";
          el2.style.maxWidth = "100%";
          el2.style.height = "auto";
          el2.style.maxHeight = "440px";
          el2.setAttribute("preserveAspectRatio", "xMidYMid meet");
        }
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
        el.innerHTML = "";
      } finally {
        // Remove mermaid's scratch node ONLY if it is outside our container.
        // The rendered SVG carries the SAME id, so an unconditional
        // getElementById(id).remove() deleted the diagram immediately after
        // inserting it — the element measured 589x1252, then vanished, which
        // is why every attempt looked blank with no error.
        const stray = document.getElementById(id);
        if (stray && !el.contains(stray)) stray.remove();
      }
    });
    return undefined;
  }, [code, mounted]);

  return (
    <div
      style={{
        position: "relative",
        marginBottom: "8px",
        border: "1px solid var(--cg-border)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Rendered diagram (the embedded image) */}
      <div
        ref={ref}
        style={{
          background: "var(--cg-bg-page)",
          padding: "12px",
          minHeight: "48px",
        }}
      />
      {/* Fallback: only if render failed, show the raw source so nothing is lost */}
      {err && (
        <pre
          style={{
            background: "var(--cg-input-bg)",
            padding: "10px 12px",
            margin: 0,
            fontSize: "12px",
            color: "var(--cg-text-nav)",
            overflowX: "auto",
            whiteSpace: "pre",
            fontFamily: "monospace",
            borderTop: "1px solid var(--cg-border)",
          }}
        >
          {code}
        </pre>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "6px 10px",
          borderTop: "1px solid var(--cg-border)",
          background: "var(--cg-bg-page)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setSelectedTab("diagrams");
            setHasRightPanelToggled(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            background: "var(--cg-workspace-bg-hover)",
            border: "1px solid var(--cg-border)",
            borderRadius: "6px",
            color: "var(--cg-text-nav)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          <BarChart2 size={13} />
          View Diagram
        </button>
      </div>
    </div>
  );
}

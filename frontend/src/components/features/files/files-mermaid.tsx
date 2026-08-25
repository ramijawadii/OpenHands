/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import {
  Loader2,
  AlertTriangle,
  Code2,
  Image as ImageIcon,
  Play,
  Copy,
  Check,
} from "lucide-react";
import { useCodeBlockEditorContext } from "@mdxeditor/editor";
import {
  loadMermaid,
  applyMermaidTheme,
} from "#/components/features/markdown/mermaid-block";
import { sanitizeMermaid } from "#/utils/sanitize-mermaid";
import { ZoomPan } from "./files-mermaid-zoom";

/**
 * Mermaid, drawn in the artifact reader.
 *
 * THIS WAS BROKEN AND THE COMMENTS SAID IT WORKED. `files-open` and
 * `files-textview` both claimed markdown here "draws mermaid fences", which was
 * true when this surface used the chat's `MarkdownRenderer`. It now uses
 * MDXEditor, whose code-block pipeline knew nothing about mermaid — so a
 ```mermaid``` fence rendered as a CodeMirror block in an unrecognised language,
 * and a `.mmd` file was routed to draw.io, which cannot read mermaid source at
 * all. Two stale comments and a viewer that showed an empty canvas.
 *
 * The rendering machinery is the chat's — `loadMermaid` memoises the dynamic
 * import and the theme across every consumer, so a report with nine diagrams
 * pays for the library once. What is NOT reused is `MermaidBlock` itself: its
 * footer has a "View Diagram" button that switches the conversation drawer to
 * the Report tab, which is meaningless here because the diagram is already the
 * thing on screen.
 */

/**
 * Is the surface this element sits on a light one?
 *
 * Walks up for the first ancestor with a non-transparent background, because a
 * component's own box is usually transparent and inherits the pane's colour.
 * Falls back to "light" when nothing can be read: the artifact library is light,
 * and dark text on a light ground is legible on both, while the reverse is not.
 */
function surfaceIsLight(el: HTMLElement | null): boolean {
  let node: HTMLElement | null = el;
  for (let i = 0; node && i < 12; i += 1) {
    const bg = window.getComputedStyle(node).backgroundColor;
    const m = /rgba?\(([^)]+)\)/.exec(bg);
    if (m) {
      const [r, g, b, a] = m[1].split(",").map((v) => parseFloat(v.trim()));
      if (a === undefined || a > 0.1) {
        // Rec. 601 luma — good enough to answer "light or dark", and cheaper
        // than a correct sRGB relative-luminance computation nobody can see the
        // difference from at this threshold.
        return 0.299 * r + 0.587 * g + 0.114 * b > 140;
      }
    }
    node = node.parentElement;
  }
  return true;
}

/**
 * Ceiling for a rendered diagram.
 *
 * A diagram is an illustration inside a document, not the document. Past roughly
 * this height it stops being something you glance at and becomes something you
 * scroll through, and the prose it belongs to is off screen while you do.
 * Matches the chat renderer's cap so the same fence looks the same in both
 * places.
 */
const MAX_DIAGRAM_HEIGHT = 440;

/**
 * Renders are SERIALISED, one diagram at a time.
 *
 * Mermaid's configuration is global and `render()` is async, so two blocks on
 * one page interleave: A applies the light palette, B applies the dark one, then
 * A's render resolves and draws itself with B's colours. Whichever loses the
 * race is simply wrong, and nothing tells it so.
 *
 * An earlier attempt repaired this by redrawing whenever a block scrolled back
 * into view — which created a far worse bug. The observer watched the very
 * element the render clears and refills, so emptying it reported "not visible",
 * filling it reported "visible again", and that triggered another render:
 * a diagram that redrew forever, at whatever speed the machine allowed.
 *
 * A queue removes the race at its source instead of watching for its symptoms.
 * Each block waits its turn, applies its own theme, renders, and only then
 * releases the next — so the config is never changed underneath an in-flight
 * render, and nothing observes the output to decide whether to run again.
 */
let renderQueue: Promise<unknown> = Promise.resolve();

function queueRender<T>(job: () => Promise<T>): Promise<T> {
  // The tail is replaced BEFORE awaiting, so callers queue behind each other
  // rather than all behind whatever was running when they arrived.
  const run = renderQueue.then(job, job);
  // A failed render must not poison the queue for every diagram after it.
  renderQueue = run.catch(() => undefined);
  return run;
}

export function MermaidView({
  code,
  /** Editing a fence should still be possible — the source toggle is how. */
  showSourceToggle = true,
  /** Wrap the diagram in a pan/zoom viewport. Off for the standalone `.mmd`
   *  viewer, which owns the whole pane and can simply be scrolled. */
  zoomable = false,
  /** Draw a frame. OFF when embedded in the code block, which already has one —
   *  a bordered box immediately inside a bordered box is two outlines a few
   *  pixels apart, which is what "double border" looks like. */
  framed = true,
}: {
  code: string;
  showSourceToggle?: boolean;
  zoomable?: boolean;
  framed?: boolean;
}) {
  const host = React.useRef<HTMLDivElement>(null);
  /**
   * Bumped to force a re-render of the DIAGRAM (not of React) when nothing about
   * the code changed but the way it should be drawn did.
   *
   * Mermaid's configuration is GLOBAL and applied per render, so a diagram is
   * only ever correct for the theme that was current when it was drawn. Switch
   * the app between light and dark and every already-rendered diagram keeps the
   * old palette — dark boxes on a cream page — because nothing about its code
   * changed and nothing asked it to redraw.
   *
   * There is no cheaper fix than redrawing: the SVG has the colours baked into
   * its elements. Redrawing is what "recompile on mode switch" means here.
   */
  const [renderNonce, setRenderNonce] = React.useState(0);
  // Read inside the render effect, which must not re-run just because the flag
  // changed — the flag never changes for a given mount.
  const zoomableRef = React.useRef(zoomable);
  zoomableRef.current = zoomable;
  const [state, setState] = React.useState<
    { kind: "loading" } | { kind: "ok" } | { kind: "error"; message: string }
  >({ kind: "loading" });
  const [source, setSource] = React.useState(false);

  React.useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    if (!code.trim()) {
      setState({ kind: "error", message: "This diagram is empty." });
      return undefined;
    }

    let cancelled = false;
    setState({ kind: "loading" });
    el.innerHTML = "";
    // Unique per render: mermaid keys its scratch node by this id, and reusing
    // one across two diagrams on the same page makes the second overwrite the
    // first.
    const id = `cg-files-mmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    loadMermaid(async (m) => {
      if (cancelled) return;
      if (!m) {
        setState({
          kind: "error",
          message: "The diagram renderer could not be loaded.",
        });
        return;
      }
      try {
        // THEME THE DIAGRAM TO THE SURFACE IT IS DRAWN ON, not to the app.
        //
        // `applyMermaidTheme` defaults to `document.documentElement[data-theme]`,
        // and the artifact library is a LIGHT surface that lives inside an app
        // whose root is dark. So mermaid was initialised dark and produced
        // near-black participant boxes with white message labels on cream —
        // the labels were effectively invisible.
        //
        // Measured rather than assumed: walking up from the container to the
        // first element with a real background and reading its luminance is
        // correct however the surface came by its colour, and keeps working if
        // this component is ever used somewhere else.
        // THEME AND RENDER ARE ONE QUEUED JOB.
        //
        // Applying the palette outside the queue would leave the race intact:
        // this block sets its colours, waits its turn, and by the time it draws
        // another block has re-initialised the global config underneath it.
        // Configuration and the render it configures cannot be separated.
        const { svg } = await queueRender(async () => {
          const light = surfaceIsLight(el);
          applyMermaidTheme(m, false, light);
          if (light) {
            // A COMPLETE LIGHT PALETTE, for the same reason the dark one exists.
            //
            // `applyMermaidTheme` sets eight variables — enough for a flowchart,
            // nowhere near enough for a sequence diagram. Everything it does not
            // name falls back to mermaid's own defaults, which are tuned for a
            // white page and a grey-on-grey aesthetic: message labels came out
            // light grey on cream and were barely legible, while the participant
            // boxes took a dark fill from a different default entirely. Half a
            // palette is worse than none, because the half that lands makes the
            // rest look deliberate.
            //
            // These are the app's own light tokens, stated in full.
            m.default.initialize({
              startOnLoad: false,
              theme: "default",
              securityLevel: "loose",
              themeVariables: {
                background: "#ffffff",
                mainBkg: "#ffffff",
                primaryColor: "#f7f6f3",
                secondaryColor: "#efeee9",
                tertiaryColor: "#faf9f7",
                // Near-black, not grey. This is body text in a picture.
                primaryTextColor: "#1a1a19",
                secondaryTextColor: "#1a1a19",
                tertiaryTextColor: "#1a1a19",
                textColor: "#1a1a19",
                primaryBorderColor: "#d8d5cd",
                secondaryBorderColor: "#d8d5cd",
                tertiaryBorderColor: "#d8d5cd",
                lineColor: "#6b6862",
                // Sequence diagrams — the ones that were unreadable. Every label
                // colour is stated; each omission is a grey.
                actorBkg: "#ffffff",
                actorBorder: "#d8d5cd",
                actorTextColor: "#1a1a19",
                actorLineColor: "#9b978e",
                signalColor: "#4a4842",
                signalTextColor: "#1a1a19",
                labelBoxBkgColor: "#f7f6f3",
                labelBoxBorderColor: "#d8d5cd",
                labelTextColor: "#1a1a19",
                loopTextColor: "#1a1a19",
                noteBkgColor: "#fdf6dd",
                noteBorderColor: "#e0d4a0",
                noteTextColor: "#1a1a19",
                clusterBkg: "#faf9f7",
                clusterBorder: "#e2dfd7",
                nodeTextColor: "#1a1a19",
                edgeLabelBackground: "#ffffff",
                fontFamily: "Inter, ui-sans-serif, sans-serif",
              },
            });
          } else {
            // A SOFTER DARK, applied after the shared theme.
            //
            // The default dark palette is built for maximum separation — near-black
            // fills under near-white text, saturated edges — which is right for a
            // dashboard read at a glance and wrong inside a document you sit and
            // read. Next to prose it reads as a set of warning boxes.
            //
            // These are the values a reading surface wants instead: fills a step
            // above the page rather than a hole in it, borders that describe a
            // shape without drawing attention, and text at comfortable rather than
            // maximum contrast. Same family as the app's own dark tokens, so a
            // diagram sits in the page instead of on top of it.
            m.default.initialize({
              startOnLoad: false,
              theme: "dark",
              securityLevel: "loose",
              themeVariables: {
                background: "#1a1a19",
                mainBkg: "#242423",
                primaryColor: "#242423",
                secondaryColor: "#2b2b29",
                tertiaryColor: "#201f1e",
                primaryTextColor: "#d6d3cb",
                secondaryTextColor: "#d6d3cb",
                tertiaryTextColor: "#d6d3cb",
                textColor: "#d6d3cb",
                primaryBorderColor: "#3a3a37",
                secondaryBorderColor: "#3a3a37",
                tertiaryBorderColor: "#3a3a37",
                lineColor: "#6f6b63",
                // Sequence diagrams: the labels that were white-on-cream when the
                // theme was wrong, and are the first thing to become unreadable if
                // any of these is missed.
                actorBkg: "#242423",
                actorBorder: "#3a3a37",
                actorTextColor: "#d6d3cb",
                actorLineColor: "#6f6b63",
                signalColor: "#a8a49b",
                signalTextColor: "#d6d3cb",
                labelBoxBkgColor: "#2b2b29",
                labelBoxBorderColor: "#3a3a37",
                labelTextColor: "#d6d3cb",
                loopTextColor: "#d6d3cb",
                noteBkgColor: "#2f2d27",
                noteBorderColor: "#4a463d",
                noteTextColor: "#d6d3cb",
                // Clusters/subgraphs: a shade BELOW the node fill, so grouping
                // reads as depth rather than as another box.
                clusterBkg: "#1f1f1e",
                clusterBorder: "#33322f",
                nodeTextColor: "#d6d3cb",
                edgeLabelBackground: "#1a1a19",
                fontFamily: "Inter, ui-sans-serif, sans-serif",
              },
            });
          }
          return m.default.render(id, sanitizeMermaid(code));
        });
        if (cancelled) return;
        // An empty render is a failure too: no diagram and no exception would
        // otherwise leave a blank box that looks like a successful render of
        // nothing.
        if (!svg || !svg.includes("<svg")) {
          setState({
            kind: "error",
            message: "The diagram produced no output.",
          });
          return;
        }
        // The intrinsic width/height are stripped so the viewBox drives scaling;
        // left in place they pin the diagram to whatever size mermaid guessed.
        el.innerHTML = svg
          .replace(/(<svg[^>]*)\swidth="[^"]*"/, "$1")
          .replace(/(<svg[^>]*)\sheight="[^"]*"/, "$1");
        const svgEl = el.querySelector("svg") as SVGElement | null;
        if (svgEl) {
          svgEl.style.display = "block";
          svgEl.style.margin = "0 auto";

          /*
           * THE SVG MUST BE GIVEN A SIZE, because we just took its own away.
           *
           * The two `.replace` calls above strip the `width` and `height`
           * ATTRIBUTES so the diagram can be scaled by CSS rather than pinned to
           * whatever mermaid guessed. But an inline `<svg>` with no width/height
           * attribute has NO INTRINSIC SIZE, and `width: auto` on something with
           * no intrinsic size resolves to nothing — the element collapsed and the
           * block rendered as an empty box. It only looked fine while the style
           * said `width: 100%`, which was hiding the missing size rather than
           * supplying one.
           *
           * The viewBox already carries the real dimensions, so they are read
           * back and applied as the natural size. Zoom then scales THAT, and the
           * inline case still shrinks to fit via max-width/max-height.
           */
          const vb = (svgEl.getAttribute("viewBox") || "")
            .split(/[\s,]+/)
            .map(Number);
          const naturalW = vb.length === 4 && vb[2] > 0 ? vb[2] : 0;
          const naturalH = vb.length === 4 && vb[3] > 0 ? vb[3] : 0;

          if (zoomableRef.current) {
            // Natural size, unbounded: the viewport clips and the transform
            // scales. A cap here would fight the zoom — scaling up would still
            // be clamped and nothing would get closer.
            svgEl.style.width = naturalW ? `${naturalW}px` : "100%";
            svgEl.style.height = naturalH ? `${naturalH}px` : "100%";
            svgEl.style.maxWidth = "none";
            svgEl.style.maxHeight = "none";
          } else {
            // Inline illustration: natural size as the STARTING point, then
            // bounded so a large diagram shrinks to fit instead of taking over
            // the document.
            svgEl.style.width = naturalW ? `${naturalW}px` : "100%";
            svgEl.style.height = "auto";
            svgEl.style.maxWidth = "100%";
            svgEl.style.maxHeight = `${MAX_DIAGRAM_HEIGHT}px`;
          }
          svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
        }
        setState({ kind: "ok" });
      } catch (e: unknown) {
        if (cancelled) return;
        el.innerHTML = "";
        // The parser's own message names the offending line, which is the only
        // useful thing to show someone whose diagram will not draw.
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      } finally {
        // Remove mermaid's scratch node ONLY if it landed outside our container:
        // the rendered SVG carries the same id, so an unconditional removal
        // deletes the diagram immediately after inserting it.
        const stray = document.getElementById(id);
        if (stray && !el.contains(stray)) stray.remove();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, renderNonce]);

  /**
   * Watch the app's theme attribute and redraw when it flips.
   *
   * An attribute observer rather than a hook: the theme lives on
   * `document.documentElement` as `data-theme`, and this component may be
   * rendered inside surfaces that do not thread a theme context through. The
   * DOM is the one place every consumer agrees on.
   */
  React.useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() => setRenderNonce((n) => n + 1));
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className={
        framed
          ? "overflow-hidden rounded-lg border border-[var(--cg-border)]"
          : "overflow-hidden"
      }
    >
      <div
        className={zoomable ? "" : "bg-[var(--cg-bg-page)] p-3"}
        // Hidden rather than unmounted while showing source: re-mounting would
        // re-run the whole render for a toggle that is meant to be instant.
        style={{ display: source ? "none" : "block", minHeight: 48 }}
      >
        {/* In a zoom viewport the diagram is MOVED rather than fitted, so the
            height cap that keeps an inline illustration reasonable would just
            shrink what you are trying to look at. The viewport supplies the
            bounds instead. */}
        {zoomable ? (
          <ZoomPan height={MAX_DIAGRAM_HEIGHT} resetKey={code}>
            <div ref={host} />
          </ZoomPan>
        ) : (
          <div ref={host} />
        )}
        {state.kind === "loading" && (
          <div className="flex items-center gap-2 text-[11px] text-[var(--cg-text-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Drawing diagram…
          </div>
        )}
        {state.kind === "error" && (
          <div className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{state.message}</span>
          </div>
        )}
      </div>

      {/* The source is always reachable, and is shown automatically when the
          diagram will not draw — losing the author's text because the renderer
          disagreed with it would be the worst possible failure here. */}
      {(source || state.kind === "error") && (
        <pre className="m-0 max-h-[50vh] overflow-auto whitespace-pre border-t border-[var(--cg-border)] bg-[var(--cg-bg-hover)] p-3 font-mono text-[11px] leading-relaxed text-[var(--cg-text-nav)]">
          {code}
        </pre>
      )}

      {showSourceToggle && state.kind !== "error" && (
        <div className="flex justify-end border-t border-[var(--cg-border)] bg-[var(--cg-bg-page)] px-2 py-1">
          <button
            type="button"
            onClick={() => setSource((v) => !v)}
            className="flex items-center gap-1.5 rounded border border-[var(--cg-border-card)] px-2 py-0.5 text-[10px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)]"
          >
            {source ? (
              <>
                <ImageIcon className="h-3 w-3" />
                Show diagram
              </>
            ) : (
              <>
                <Code2 className="h-3 w-3" />
                Show source
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A mermaid block: CODE or PREVIEW, never both at once.
 *
 * The first version stacked the source above the diagram, which meant a block
 * cost the height of two things whichever one you cared about, and reading a
 * document full of diagrams meant scrolling past a lot of markup nobody was
 * looking at. Two views with one control is what the rest of the product does
 * with source/rendered pairs, and it makes each block the size of the thing you
 * asked for.
 *
 * COMPILE STAYS EXPLICIT. Mermaid throws on partial input, so rendering as you
 * type shows a parse error for most of the time you are writing — the editor
 * would be correcting a sentence you had not finished. Switching to Preview
 * compiles, and so does Ctrl+Enter.
 */
type BlockView = "code" | "preview";

function SegButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded p-1 transition-colors ${
        active
          ? "bg-[var(--cg-bg-page)] text-[var(--cg-text-nav)]"
          : "text-[var(--cg-text-muted)] hover:text-[var(--cg-text-nav)]"
      }`}
    >
      {children}
    </button>
  );
}

function MermaidCodeBlock({ code }: { code: string }) {
  const { setCode } = useCodeBlockEditorContext();
  const [draft, setDraft] = React.useState(code);
  // What is currently DRAWN, which lags the text until it is compiled.
  const [compiled, setCompiled] = React.useState(code);
  // Preview first: a block that already renders is being READ, and a document
  // that opens as a wall of markup is the thing this replaces.
  const [view, setView] = React.useState<BlockView>("preview");
  const [copied, setCopied] = React.useState(false);

  // A fence replaced from outside (undo, a document switch) re-seeds both.
  React.useEffect(() => {
    setDraft(code);
    setCompiled(code);
  }, [code]);

  const dirty = draft !== compiled;

  const compile = React.useCallback(() => {
    setCompiled(draft);
    // Written back to the document in the SAME action. A diagram that renders
    // but is not in the markdown would vanish on the next save, which is the
    // worst surprise this block could produce.
    setCode(draft);
  }, [draft, setCode]);

  const show = React.useCallback(
    (next: BlockView) => {
      // Switching to the picture is the moment you are asking to see the
      // result, so that is when it compiles. No separate button to forget.
      if (next === "preview" && dirty) compile();
      setView(next);
    },
    [dirty, compile],
  );

  /** Copy the MERMAID SOURCE, whichever view is on screen. Copying a diagram
   *  means copying the thing you can paste somewhere and get a diagram from. */
  const copy = React.useCallback(() => {
    navigator.clipboard
      ?.writeText(draft)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {
        /* a refused clipboard is not worth an error banner */
      });
  }, [draft]);

  return (
    // `cg-mmd-block` is a HOOK, not a style. MDXEditor wraps every custom code
    // block in `_codeMirrorWrapper_`, which draws its own 1px border and 0.8rem
    // padding — so this block's frame was the SECOND one around it. The CSS uses
    // `:has(.cg-mmd-block)` to strip the vendor frame for our blocks only,
    // leaving CodeMirror fences with theirs.
    <div className="cg-mmd-block my-2 overflow-hidden rounded-lg border border-[var(--cg-border)]">
      <div className="flex items-center gap-2 border-b border-[var(--cg-border)] bg-[var(--cg-bg-hover)] px-2 py-1">
        <span className="text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
          Mermaid diagram
        </span>
        {dirty && view === "code" && (
          <span className="text-[10px] text-amber-400">not compiled</span>
        )}

        {/* One segmented control, the shape used across the product's
            source/rendered pairs. */}
        <span className="ml-auto flex items-center gap-0.5 rounded-md border border-[var(--cg-border-card)] p-0.5">
          <SegButton
            label="Show the mermaid source"
            active={view === "code"}
            onClick={() => show("code")}
          >
            <Code2 className="h-3.5 w-3.5" />
          </SegButton>
          <SegButton
            label="Compile and show the diagram (Ctrl+Enter)"
            active={view === "preview"}
            onClick={() => show("preview")}
          >
            <Play className="h-3.5 w-3.5" />
          </SegButton>
          <SegButton
            label={copied ? "Copied" : "Copy the mermaid source"}
            active={false}
            onClick={copy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[var(--cg-ok)]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </SegButton>
        </span>
      </div>

      {view === "code" ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              compile();
              setView("preview");
            }
            // Lexical owns the document's key handling; without this a
            // keystroke here can be read as a document-level shortcut.
            e.stopPropagation();
          }}
          spellCheck={false}
          rows={Math.min(18, Math.max(5, draft.split("\n").length + 1))}
          aria-label="Mermaid source"
          className="block w-full resize-y border-0 bg-[var(--cg-bg-page)] p-3 font-mono text-[12px] leading-relaxed text-[var(--cg-text-nav)] outline-none"
        />
      ) : (
        <MermaidView
          code={compiled}
          showSourceToggle={false}
          zoomable
          framed={false}
        />
      )}
    </div>
  );
}

/**
 * The MDXEditor code-block descriptor for ```mermaid fences.
 *
 * `priority: 10` beats the CodeMirror catch-all so mermaid never falls through
 * to a syntax-highlighted box. The aliases are the spellings people actually
 * write — `mmd` in particular, which agents produce because it matches the file
 * extension.
 */
export const MERMAID_CODE_BLOCK_DESCRIPTOR = {
  priority: 10,
  match: (language: string | null | undefined) =>
    ["mermaid", "mmd"].includes((language ?? "").toLowerCase()),
  Editor: MermaidCodeBlock,
};

/**
 * A `.mmd` file, opened.
 *
 * Its own fetch rather than a mode on `TextView`: that component's whole job is
 * "decode bytes and hand them to an editor", and threading a third rendering
 * branch through it would make the one component that reads every text format
 * also responsible for diagram state. The read itself is the same audited
 * `/vfs/read` call every other viewer makes.
 */
export function MermaidFileView({
  path,
  store,
  conversationId,
  reloadToken = 0,
}: {
  path: string;
  store: string;
  conversationId: string;
  reloadToken?: number;
}) {
  const [state, setState] = React.useState<
    | { kind: "loading" }
    | { kind: "ready"; text: string }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    const url = new URL("/api/cloudguard/vfs/read", window.location.origin);
    url.searchParams.set("conversation_id", conversationId);
    url.searchParams.set("path", path);
    url.searchParams.set("store", store);
    fetch(url.toString(), { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        if (!cancelled) setState({ kind: "ready", text });
      })
      .catch((e: Error) => {
        if (!cancelled)
          setState({
            kind: "error",
            message: e.message || "Could not read this diagram.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [path, store, conversationId, reloadToken]);

  if (state.kind === "loading") {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[12px] text-[var(--cg-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading diagram…
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="flex h-full items-center justify-center gap-2 p-6 text-[12px] text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        {state.message}
      </div>
    );
  }
  return (
    <div className="h-full overflow-auto p-4">
      <MermaidView code={state.text} />
    </div>
  );
}

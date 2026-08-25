/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import {
  SLIDING_MENU_PANEL,
  SlidingHighlight,
  SlidingMenuRow,
  slidingMenuState,
  useSlidingHighlight,
} from "#/components/shared/sliding-menu";

/**
 * Section navigator — the minimap rail down the right edge.
 *
 * A specification or a finding report is long and read by jumping, not by
 * scrolling: "where does the Evidence section start" is the actual question. The
 * rail shows one tick per heading, indented by level, and highlights the section
 * you are currently in.
 *
 * Ticks rather than a text outline on purpose. A full table of contents costs
 * real width in a drawer that is already narrow, and the shape of the document —
 * how many sections, how deep, where you are in it — is what you need at a
 * glance. Hovering opens the names; clicking jumps.
 *
 * THE RAIL MUST NOT SCROLL WITH THE DOCUMENT. It was `position: absolute` inside
 * `.cg-mdx`, which IS the scroll container — so `top: 50%` resolved against the
 * full scroll height and the rail slid off the top of a long report, which is
 * precisely the document where it earns its place. It is now rendered as a
 * sibling of the scroller instead of a child of it, so the browser keeps it
 * pinned with no scroll listener and nothing to fall out of sync.
 */

export interface OutlineEntry {
  id: string;
  text: string;
  level: number;
  top: number;
}

/**
 * Read headings straight from the DOM rather than parsing the markdown.
 *
 * The editor is the source of truth for what is on screen — it renders frontmatter,
 * admonitions and tables that a naive `^#+` scan would mis-count — and the DOM
 * already carries the vertical position each tick needs.
 */
export function useOutline(
  container: HTMLElement | null,
  markdown: string,
): OutlineEntry[] {
  const [entries, setEntries] = React.useState<OutlineEntry[]>([]);

  React.useEffect(() => {
    if (!container) return undefined;

    const read = () => {
      const heads = Array.from(
        container.querySelectorAll("h1, h2, h3, h4"),
      ) as HTMLElement[];
      setEntries(
        heads.map((h, i) => ({
          id: `h-${i}`,
          text: (h.textContent || "").trim().slice(0, 120),
          level: Number(h.tagName.slice(1)),
          top: h.offsetTop,
        })),
      );
    };

    read();
    // The document changes as it is edited, so the outline is observed rather
    // than computed once — a heading typed after mount must appear.
    const obs = new MutationObserver(() => window.requestAnimationFrame(read));
    obs.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => obs.disconnect();
  }, [container, markdown]);

  return entries;
}

/** Row height of one section in the menu. Must match what the highlight is
 *  sized against, or it lands between rows. */
const ROW = 28;

export function OutlineRail({
  entries,
  scroller,
}: {
  entries: OutlineEntry[];
  scroller: HTMLElement | null;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  // Expanded on hover into a real list of section names. The ticks alone say
  // how the document is shaped and where you are; they cannot tell you WHICH
  // section is which, which is the question you have when you actually want to
  // jump somewhere.
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<number | null>(null);
  const highlight = useSlidingHighlight(ROW);
  const ticksRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!scroller || entries.length === 0) return undefined;
    const onScroll = () => {
      // The active section is the LAST heading above the fold line, not the
      // nearest one — that is what "which section am I reading" means when a
      // section is taller than the viewport.
      const line = scroller.scrollTop + 80;
      let idx = 0;
      entries.forEach((e, i) => {
        if (e.top <= line) idx = i;
      });
      setActiveIndex(idx);
    };
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [scroller, entries]);

  React.useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  /**
   * Scroll the active tick into view once the rail is taller than its cap.
   *
   * `nearest` rather than `center`: centring yanks the whole rail on every
   * section change, which turns a quiet position indicator into something that
   * moves in the corner of your eye while you read.
   */
  React.useEffect(() => {
    const rail = ticksRef.current;
    if (!rail || rail.scrollHeight <= rail.clientHeight) return;
    const tick = rail.children[activeIndex] as HTMLElement | undefined;
    tick?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // One heading is not an outline; a document with no structure should not grow
  // a navigation rail it does not need.
  if (entries.length < 2) return null;

  const jump = (e: OutlineEntry) => {
    scroller?.scrollTo({ top: Math.max(0, e.top - 24), behavior: "smooth" });
    setOpen(false);
  };

  // A short grace period on leave, so crossing the gap between the ticks and the
  // panel does not dismiss it mid-reach.
  const hold = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const release = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      highlight.reset();
    }, 220);
  };

  return (
    <div
      // `absolute` against the PANE, which does not scroll — see the note at the
      // top of this file. `pointer-events-none` on the wrapper so the strip of
      // empty space beside the ticks does not swallow clicks meant for the
      // document underneath; each interactive child turns them back on.
      className="pointer-events-none absolute right-1 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1"
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocus={hold}
      onBlur={release}
    >
      {/* Kept MOUNTED and animated by class, not conditionally rendered: the
          panel's spring-open transition needs both states to exist for the
          browser to interpolate between them. Rendering it only when open
          made it appear fully-formed with no motion at all. */}
      <nav
        aria-label="Sections"
        aria-hidden={!open}
        onMouseLeave={highlight.onMenuLeave}
        style={{ width: 224 }}
        className={`pointer-events-auto max-h-[60vh] overflow-y-auto overflow-x-hidden ${SLIDING_MENU_PANEL} ${slidingMenuState(
          open,
        )}`}
      >
        <div className="relative flex flex-col gap-0.5">
          <SlidingHighlight style={highlight.style} rowHeight={ROW} />
          {entries.map((e, i) => (
            <SlidingMenuRow
              key={e.id}
              index={i}
              rowHeight={ROW}
              onRowEnter={highlight.onRowEnter}
              onSelect={() => jump(e)}
              active={i === activeIndex}
              title={e.text}
            >
              <span
                className={`min-w-0 flex-1 truncate text-[11px] ${
                  i === activeIndex
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
                // Indented by heading level, so subsections read as subsections.
                style={{ paddingLeft: (e.level - 1) * 10 }}
              >
                {e.text || "(untitled section)"}
              </span>
            </SlidingMenuRow>
          ))}
        </div>
      </nav>

      {/* CAPPED, and scrolled if it does not fit.
          A tick per heading with a fixed gap means the rail's height is a
          function of how many headings the document has — a spec with fifty of
          them produced a rail taller than the pane, running off both ends and
          overlapping the toolbar. The rail is a minimap: it has to stay inside
          the viewport to be one. Past the cap it scrolls, and the active tick is
          kept in view so "where am I" still answers itself. */}
      <div
        ref={ticksRef}
        className="cg-surface-scroll pointer-events-auto flex max-h-[min(60vh,420px)] flex-col items-end gap-1.5 overflow-y-auto overflow-x-hidden rounded-md bg-[var(--cg-bg-page)]/70 px-1.5 py-2 backdrop-blur-sm"
      >
        {entries.map((e, i) => (
          <button
            key={e.id}
            type="button"
            title={e.text}
            aria-label={`Jump to ${e.text}`}
            aria-current={i === activeIndex ? "true" : undefined}
            onMouseEnter={() => highlight.onRowEnter(i)}
            onClick={() => jump(e)}
            className="group flex h-3 items-center justify-end"
          >
            <span
              className={`rounded-full transition-all ${
                i === activeIndex
                  ? "bg-[var(--cg-text-nav)]"
                  : "bg-[var(--cg-text-muted)] opacity-50 group-hover:opacity-100"
              }`}
              style={{
                // Deeper headings get shorter ticks, so the rail reads as an
                // outline rather than as a row of identical marks.
                width: Math.max(8, 26 - (e.level - 1) * 5),
                height: i === activeIndex ? 2 : 1,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

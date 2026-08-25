/* eslint-disable i18next/no-literal-string -- shared control chrome */
import * as React from "react";
import { cn } from "#/utils/utils";

/**
 * The composer menu's look and feel, as a primitive other menus can wear.
 *
 * The mode picker in the chat composer (`features/chat/pill-select`) established
 * what a menu is in this product: a rounded, blurred card that springs open, and
 * ONE highlight that slides between rows instead of each row painting its own
 * hover. That second part is the whole character of it — a single moving element
 * reads as one list being traversed, where N independent hovers read as N
 * buttons that happen to be stacked.
 *
 * It is extracted here rather than copied because `pill-select`'s own comment
 * predicted the failure: "Copying the markup would have produced two pickers
 * that drift apart the first time either is adjusted." A second menu that only
 * *resembles* the first is the same bug with extra steps.
 *
 * What this does NOT own is behaviour. A select tracks a current value and
 * closes on choose; the document outline is a jump list with no value at all.
 * Those belong to the callers — this module is the chrome and the highlight.
 */

/**
 * The panel itself.
 *
 * Kept as a class string rather than a component so a caller can compose it with
 * its own positioning (the composer opens upward from a fixed bar; the outline
 * rail opens sideways from a floating rail) without this module having to know
 * every placement that will ever exist.
 */
export const SLIDING_MENU_PANEL =
  "flex flex-col gap-0.5 rounded-2xl border border-border bg-card/95 p-1 shadow-xl backdrop-blur-md transition-all duration-300 cursor-default";

/** Open/closed transition. The spring on entry is what makes it feel like the
 *  composer's menu rather than a div that changed opacity. */
export function slidingMenuState(open: boolean): string {
  return open
    ? "opacity-100 scale-100 translate-y-0 pointer-events-auto ease-[cubic-bezier(0.34,1.56,0.64,1)]"
    : "opacity-0 scale-95 translate-y-2 pointer-events-none ease-[cubic-bezier(0.175,0.885,0.32,1.275)]";
}

export interface HighlightStyle {
  opacity: number;
  transform: string;
  transition: string;
}

const HIDDEN: HighlightStyle = {
  opacity: 0,
  transform: "translateY(0px) scale(0.95)",
  transition: "none",
};

/**
 * The single highlight that follows the pointer.
 *
 * `rowHeight` is a number rather than measured from the DOM on purpose: the
 * highlight has to move to a row's position BEFORE that row has been hovered
 * long enough to measure, and a measured version stuttered on the first entry
 * into the menu.
 *
 * The transition is asymmetric and that is deliberate. Arriving from nowhere
 * fades in with no travel (the highlight was not anywhere, so sliding it from
 * the top of the list would be a lie about where the pointer came from); moving
 * between rows springs. That distinction is what makes the effect read as
 * tracking rather than as animation.
 */
export function useSlidingHighlight(rowHeight: number) {
  const [style, setStyle] = React.useState<HighlightStyle>(HIDDEN);

  const onRowEnter = React.useCallback(
    (index: number) => {
      setStyle((prev) => ({
        opacity: 1,
        transform: `translateY(${index * rowHeight}px) scale(1)`,
        transition:
          prev.opacity === 0
            ? "opacity 0.15s ease-out"
            : "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.15s ease",
      }));
    },
    [rowHeight],
  );

  const onMenuLeave = React.useCallback(() => {
    // Shrinks in place rather than sliding away — the pointer left sideways, and
    // travelling to the top of the list on the way out looks like a selection
    // nobody made.
    setStyle((prev) => ({
      ...prev,
      opacity: 0,
      transform: prev.transform.replace("scale(1)", "scale(0.95)"),
      transition: "opacity 0.2s ease-in, transform 0.2s ease-out",
    }));
  }, []);

  const reset = React.useCallback(() => setStyle(HIDDEN), []);

  return { style, onRowEnter, onMenuLeave, reset };
}

/** The moving block. Sits behind the rows (`-z-10`) so row text stays readable
 *  and the highlight never eats a click on its way past. */
export function SlidingHighlight({
  style,
  rowHeight,
}: {
  style: HighlightStyle;
  rowHeight: number;
}) {
  return (
    <div
      aria-hidden="true"
      style={{ ...style, height: rowHeight }}
      className="absolute left-0 right-0 top-0 -z-10 rounded-xl bg-accent pointer-events-none"
    />
  );
}

/** One row, with the shape the highlight is sized against. A caller supplying
 *  its own row markup must keep `rowHeight` in agreement or the highlight will
 *  land between rows. */
export function SlidingMenuRow({
  index,
  rowHeight,
  onRowEnter,
  onSelect,
  active,
  children,
  className,
  title,
}: {
  index: number;
  rowHeight: number;
  onRowEnter: (index: number) => void;
  onSelect: () => void;
  /** Marks the row the caller considers current. Styling is the caller's. */
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-current={active ? "true" : undefined}
      // Prevented everywhere, as in the composer: the textarea (or the reader's
      // scroll position) must not lose focus when the menu is used.
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={() => onRowEnter(index)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ height: rowHeight }}
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-xl px-2.5 text-left outline-none active:scale-[0.98] cursor-default",
        className,
      )}
    >
      {children}
    </button>
  );
}

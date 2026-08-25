/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { Palette } from "lucide-react";
import { rootEditor$, useCellValue } from "@mdxeditor/editor";
import { $getSelection, $isRangeSelection } from "lexical";
import { $patchStyleText } from "@lexical/selection";
import {
  SLIDING_MENU_PANEL,
  slidingMenuState,
} from "#/components/shared/sliding-menu";

/**
 * Text colour for the markdown editor.
 *
 * MARKDOWN HAS NO COLOUR SYNTAX, so a coloured run is an inline HTML span —
 * `<span style="color:#c0392b">…</span>` — which is the one spelling every
 * markdown renderer in this product (and GitHub, and Pandoc) already
 * understands. That is deliberate over a directive or a custom JSX element:
 * these documents leave the console as findings and get rendered by tools we do
 * not control, and a bespoke syntax would arrive there as literal punctuation.
 * `files-mdx.css` carries the matching rule so the editor does not restyle it.
 *
 * The palette is FIXED rather than a free colour picker. This surface writes
 * security findings, where colour is a severity signal and not decoration; an
 * arbitrary-hex control invites a report where three different reds mean three
 * different things to three different readers. Nine named entries, each with an
 * obvious job, keeps the vocabulary shared.
 *
 * Presented as a GRID OF SWATCHES. The names are real and meaningful, but they
 * belong in a tooltip: nine rows of prose to choose a colour turns looking into
 * reading, and the colour is a better label for itself than any word for it.
 */

/** Hex is stored, not a CSS variable: the document must render the same colour
 *  outside this console, where our theme variables do not exist. */
interface Swatch {
  value: string;
  name: string;
}

const SWATCHES: Swatch[] = [
  { value: "#c0392b", name: "Critical red" },
  { value: "#e67e22", name: "High orange" },
  { value: "#b7950b", name: "Medium amber" },
  { value: "#1e8449", name: "Resolved green" },
  { value: "#1f6feb", name: "Reference blue" },
  { value: "#6c3fb5", name: "Note purple" },
  { value: "#0e7490", name: "Evidence teal" },
  { value: "#6b7280", name: "Muted grey" },
  { value: "#111827", name: "Ink" },
];

/**
 * Backgrounds are TINTS of the same nine, not a second unrelated palette.
 *
 * A highlight has to sit under black text and stay readable, so these are the
 * text colours at roughly 15% over white — the same vocabulary ("this is the
 * critical one") expressed as a fill rather than as ink. A separate set of
 * saturated fills would give the document two colour languages that mean the
 * same thing.
 */
const BACKGROUNDS: Swatch[] = [
  { value: "#fae5e2", name: "Critical red" },
  { value: "#fbe8d5", name: "High orange" },
  { value: "#f7f0cd", name: "Medium amber" },
  { value: "#d9ecdf", name: "Resolved green" },
  { value: "#dde9fb", name: "Reference blue" },
  { value: "#e6ddf4", name: "Note purple" },
  { value: "#d7e9ed", name: "Evidence teal" },
  { value: "#e9eaec", name: "Muted grey" },
  { value: "#fdf6dd", name: "Highlight" },
];

/** What a colour wraps when nothing is selected. Real words rather than a bare
 *  placeholder, so the run is visible and immediately replaceable by typing. */
const PLACEHOLDER = "coloured text";

/** No props. The control reaches the live editor through `rootEditor$`, which
 *  is also the only thing that can tell it what is selected — see `apply`. */
export function ColorControl() {
  // The live Lexical editor, for reading the selection the toolbar cannot see.
  const editor = useCellValue(rootEditor$);
  const [open, setOpen] = React.useState(false);
  const wrap = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const away = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node))
        setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  /**
   * Colour the selection.
   *
   * `$patchStyleText` is Lexical's own API for this, and using anything else was
   * the mistake. Two earlier attempts failed in different ways:
   *
   *  - `insertMarkdown("<span …>")` REPLACED the block, so colouring a word in
   *    a heading turned that heading into a paragraph.
   *  - hand-wrapping the extracted nodes in a `GenericHTMLNode` preserved the
   *    block but did not paint anything, and left the run split in two.
   *
   * `$patchStyleText` splits the text nodes at the selection boundaries itself,
   * writes the style onto exactly the pieces inside it, and touches no block
   * node at all. It is the thing every other Lexical editor uses to do this, and
   * it works because it is not fighting the model.
   */
  const apply = React.useCallback(
    (prop: "color" | "background-color", value: string) => {
      if (!editor) return;
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        if (selection.isCollapsed()) {
          // Nothing selected: give the colour something to be, then colour it,
          // so the run is visible and can be typed straight over.
          selection.insertText(PLACEHOLDER);
          const after = $getSelection();
          if ($isRangeSelection(after)) {
            const anchor = after.anchor.offset;
            after.anchor.set(
              after.anchor.key,
              anchor - PLACEHOLDER.length,
              "text",
            );
            $patchStyleText(after, { [prop]: value });
          }
          return;
        }
        $patchStyleText(selection, { [prop]: value });
      });
      setOpen(false);
    },
    [editor],
  );

  /** Clear both properties from the selection. A palette with no way back is a
   *  trap: the only way to undo a colour would otherwise be Ctrl+Z, which is
   *  gone as soon as anything else is typed. */
  const clear = React.useCallback(() => {
    if (!editor) return;
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection))
        $patchStyleText(selection, { color: null, "background-color": null });
    });
    setOpen(false);
  }, [editor]);

  return (
    <div ref={wrap} className="relative inline-flex">
      <button
        type="button"
        title="Text colour"
        aria-label="Text colour"
        aria-haspopup="menu"
        aria-expanded={open}
        // Focus must not leave the document, or Lexical's selection — the thing
        // `apply` reads — is gone before a swatch is ever clicked.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="cg-mdx-toolbar-btn"
      >
        <Palette className="h-4 w-4" />
      </button>

      {/*
       * A GRID OF SWATCHES, not a list of names.
       *
       * It was a vertical menu of "Critical red", "High orange", … — nine rows
       * of prose to pick a colour from, which is reading where looking would do.
       * The colour IS the label; the name only ever restated it more slowly. The
       * names survive as tooltips and as `aria-label`, so the vocabulary is
       * still there for anyone who needs it or cannot see the swatch.
       */}
      {/* The grid is a CHILD of the panel, not the panel itself.
          `SLIDING_MENU_PANEL` begins `flex flex-col`, so putting `grid` on the
          same element set two display modes on one box — whichever Tailwind
          emitted last won, and the swatches piled up on each other. */}
      <div
        role="menu"
        aria-label="Text colour"
        style={{ transformOrigin: "top left" }}
        className={`absolute left-0 top-full z-50 mt-2 w-max ${SLIDING_MENU_PANEL} ${slidingMenuState(
          open,
        )}`}
      >
        <div className="px-1 pb-1 pt-0.5 text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
          Text
        </div>
        <div className="grid grid-cols-5 gap-1">
          {SWATCHES.map((sw) => (
            <button
              key={`fg-${sw.value}`}
              type="button"
              role="menuitem"
              title={sw.name}
              aria-label={`Text ${sw.name}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply("color", sw.value)}
              // The Notion feel is in the transition: a swatch that lifts and
              // brightens under the pointer and settles back when it leaves.
              // `duration-150` reads as responsive — faster snaps, slower drags.
              className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold ring-1 ring-inset ring-black/10 transition-all duration-150 ease-out hover:scale-[1.12] hover:ring-2 hover:ring-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cg-accent,#4C9AFF)] active:scale-95"
              style={{ background: "transparent", color: sw.value }}
            >
              {/* A letterform, not a filled square: this row sets the colour of
                  TEXT, and showing it as text is the difference between the two
                  rows at a glance. */}
              A
            </button>
          ))}
        </div>

        <div className="px-1 pb-1 pt-2 text-[10px] uppercase tracking-wide text-[var(--cg-text-muted)]">
          Background
        </div>
        <div className="grid grid-cols-5 gap-1">
          {BACKGROUNDS.map((sw) => (
            <button
              key={`bg-${sw.value}`}
              type="button"
              role="menuitem"
              title={sw.name}
              aria-label={`Background ${sw.name}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply("background-color", sw.value)}
              className="h-6 w-6 rounded-md ring-1 ring-inset ring-black/10 transition-all duration-150 ease-out hover:scale-[1.12] hover:ring-2 hover:ring-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cg-accent,#4C9AFF)] active:scale-95"
              style={{ background: sw.value }}
            />
          ))}
        </div>

        <button
          type="button"
          role="menuitem"
          onMouseDown={(e) => e.preventDefault()}
          onClick={clear}
          className="mt-2 rounded-md px-2 py-1 text-left text-[11px] text-[var(--cg-text-muted)] transition-colors duration-150 hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-nav)]"
        >
          Clear colour
        </button>
      </div>
    </div>
  );
}

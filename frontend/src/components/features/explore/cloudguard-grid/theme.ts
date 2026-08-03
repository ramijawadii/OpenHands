import {
  colorSchemeDark,
  colorSchemeLight,
  themeBalham,
} from "ag-grid-community";

/**
 * Balham, adapted to the app's `--cg-*` tokens.
 *
 * Uses the v33+ Theming API rather than importing a legacy `ag-theme-*.css`:
 * the Theming API injects grid-scoped styles, so nothing outside the grid can
 * be restyled by it.
 *
 * Two variants, because AG Grid theme params are resolved once when the theme
 * object is built — a single theme cannot follow the app's light/dark toggle
 * on its own. `CloudGuardGrid` picks the variant from the app's `useTheme()`.
 *
 * The look targets AG Grid's own reference demo: **no cell or column borders**,
 * compact rows, one uniform type size. Only the header keeps a bottom rule, to
 * separate the header block from the data without drawing a grid of lines.
 *
 * `accentColor` is a concrete hex on purpose: AG Grid derives selection and
 * focus tints from it by colour mixing, and colour-mix cannot operate on a
 * `var()` reference, so a variable there yields broken tints rather than an
 * error.
 */

const shared = {
  accentColor: "#2d86d4",
  backgroundColor: "var(--cg-bg-card)",
  foregroundColor: "var(--cg-text-primary)",
  borderColor: "var(--cg-border-subtle)",
  rowHoverColor: "var(--cg-bg-hover)",
  inputBackgroundColor: "var(--cg-input-bg)",
  menuBackgroundColor: "var(--cg-bg-card)",

  // Borderless, compact — the defining traits of the reference look.
  rowBorder: false,
  columnBorder: false,
  wrapperBorder: false,
  headerColumnBorder: false,
  headerRowBorder: true,

  fontSize: 13,
  headerFontSize: 13,
  rowHeight: 32,
  headerHeight: 30,
  cellHorizontalPadding: 10,
  wrapperBorderRadius: 0,
};

/** Dark: the requested #292929 header with white header text. */
const darkTheme = themeBalham.withPart(colorSchemeDark).withParams({
  ...shared,
  oddRowBackgroundColor: "rgba(255, 255, 255, 0.028)",
  chromeBackgroundColor: "#292929",
  headerBackgroundColor: "#292929",
  headerTextColor: "#ffffff",
  browserColorScheme: "dark",
});

/**
 * Light: an ordinary light header. The dark header values are deliberately
 * NOT reused here — a #292929 header on a light page is the bug this variant
 * exists to prevent.
 */
const lightTheme = themeBalham.withPart(colorSchemeLight).withParams({
  ...shared,
  oddRowBackgroundColor: "rgba(0, 0, 0, 0.022)",
  chromeBackgroundColor: "var(--cg-bg-page)",
  headerBackgroundColor: "var(--cg-bg-page)",
  headerTextColor: "var(--cg-text-primary)",
  browserColorScheme: "light",
});

export function gridThemeFor(theme: "dark" | "light") {
  return theme === "light" ? lightTheme : darkTheme;
}

/**
 * The app's body stack, from `index.css`. Shared so canvas text, HTML tooltips
 * and the grids all resolve to the same typeface — mixing them is immediately
 * visible when a tooltip sits beside an axis label.
 */
export const APP_FONT =
  '-apple-system, "SF Pro", BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif';

/**
 * Grid theme for the Overview's events table: transparent, so it sits on the
 * chart canvas rather than punching a card-coloured hole in it.
 */
export function eventsThemeFor(theme: "dark" | "light") {
  return gridThemeFor(theme).withParams({
    backgroundColor: "transparent",
    headerBackgroundColor: "transparent",
    oddRowBackgroundColor: "transparent",
    fontFamily: APP_FONT,
    wrapperBorder: false,
    headerRowBorder: true,
    fontSize: 11,
    headerFontSize: 11,
    cellHorizontalPadding: 8,
  });
}

export const THEME_NAME = "Balham";

/** Grey used by the grid header; the side rail matches it. */
export function chromeFor(theme: "dark" | "light") {
  return theme === "light" ? "var(--cg-bg-page)" : "#292929";
}

/** Accent AG Grid tints its own checkboxes with — reused by the side panel. */
export const CHECKBOX_ACCENT = "#2d86d4";

export const SEVERITY_COLOR: Record<string, string> = {
  Critical: "var(--cgx-critical)",
  High: "var(--cgx-high)",
  Medium: "var(--cgx-medium)",
  Low: "var(--cgx-low)",
};

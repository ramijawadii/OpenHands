/**
 * Semantic colours for every icon and status glyph in the kit.
 *
 * Declared as variables at `:root` rather than inline hexes for two reasons:
 * AG Grid's filter popups render in a portal outside the grid's own DOM, so
 * scoping them to a wrapper leaves popup icons uncoloured; and the same tokens
 * are read by surfaces that never mount the grid at all.
 *
 * That second case is why this lives in its own module. `iconSpecFor`,
 * `SeverityGauge` and friends all resolve `var(--cgx-*)`, and an undefined
 * custom property does not fall back — it drops to `currentColor`, so every
 * icon silently renders in the surrounding text colour. Any surface using
 * those components must mount `<GridPalette />`, not just the grid.
 *
 * The dark values are the originals. The light overrides are ~3 shades darker:
 * the pastels were tuned against a #292929 surface and wash out on white.
 */

export const PALETTE_CSS = `
/*
 * Themed scrollbar, opt-in per element via \`className="cg-scroll"\`.
 *
 * Lives with the palette because it is the same kind of thing — a token every
 * surface in the kit resolves — and because the browser default is a light
 * grey slab that reads as a rendering fault on a #292929 panel.
 */
.cg-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.cg-scroll::-webkit-scrollbar-track { background: transparent; }
.cg-scroll::-webkit-scrollbar-thumb {
  background: var(--cgx-scroll-thumb);
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.cg-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--cgx-scroll-thumb-hover);
  background-clip: content-box;
}
.cg-scroll::-webkit-scrollbar-corner { background: transparent; }
/* Firefox has no ::-webkit pseudo-elements. */
.cg-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--cgx-scroll-thumb) transparent;
}

:root {
  --cgx-critical: #f87171;
  --cgx-high:     #fb923c;
  --cgx-medium:   #fbbf24;
  --cgx-low:      #4ade80;
  --cgx-account:  #7dd3fc;
  --cgx-cluster:  #c4b5fd;
  --cgx-database: #fca5a5;
  --cgx-storage:  #fcd34d;
  --cgx-function: #a5b4fc;
  --cgx-compute:  #86efac;
  --cgx-network:  #5eead4;
  --cgx-neutral:  #9ca3af;
  --cgx-gauge-empty: #3f3f46;
  --cgx-scroll-thumb: #4b4b4f;
  --cgx-scroll-thumb-hover: #63636a;
}
:root[data-theme="light"] {
  --cgx-critical: #b91c1c;
  --cgx-high:     #c2410c;
  --cgx-medium:   #a16207;
  --cgx-low:      #15803d;
  --cgx-account:  #0369a1;
  --cgx-cluster:  #6d28d9;
  --cgx-database: #b91c1c;
  --cgx-storage:  #a16207;
  --cgx-function: #4338ca;
  --cgx-compute:  #15803d;
  --cgx-network:  #0f766e;
  --cgx-neutral:  #6b7280;
  --cgx-gauge-empty: #d4d8de;
  --cgx-scroll-thumb: #c2c6cc;
  --cgx-scroll-thumb-hover: #a5aab2;
}
`;

/**
 * Mount once per surface that renders kit icons. Mounting it twice is
 * harmless — identical declarations at the same specificity.
 */
export function GridPalette() {
  // eslint-disable-next-line react/no-danger
  return <style dangerouslySetInnerHTML={{ __html: PALETTE_CSS }} />;
}

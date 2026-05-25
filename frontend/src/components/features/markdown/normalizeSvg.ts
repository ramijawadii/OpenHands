/**
 * Normalize inline SVG in agent-generated markdown:
 * - Ensure xmlns="http://www.w3.org/2000/svg" is present on every <svg>
 * - Fix viewbox → viewBox casing (parse5/hast lowercases it)
 * - Ensure blank lines surround the SVG so remark treats it as an HTML block
 *   rather than inline content (prevents the <p> wrapping bug)
 */
export function normalizeSvgInMarkdown(markdown: string): string {
  return markdown
    .replace(/<svg([^>]*)>/gi, (_match, attrs: string) => {
      const withXmlns = /xmlns\s*=/.test(attrs)
        ? attrs
        : ` xmlns="http://www.w3.org/2000/svg"${attrs}`;
      const withViewBox = withXmlns.replace(/viewbox\s*=/gi, "viewBox=");
      return `<svg${withViewBox}>`;
    })
    .replace(/([^\n])\n(<svg[\s>])/g, "$1\n\n$2")
    .replace(/(<\/svg>)\n([^\n])/g, "$1\n\n$2");
}

/**
 * Auto-quote Mermaid edge labels that contain parentheses.
 *
 * Agents frequently write `-->|Allow HTTPS (443)| node`, which Mermaid rejects
 * with `Parse error … got 'PS'` because `(` starts shape syntax. Wrap such a
 * `|…|` edge label in double quotes so it parses. Already-quoted labels are left
 * alone, and shape delimiters like `[( )]`, `(( ))`, `{{ }}` are never touched
 * (only `|…|` edge labels are matched).
 */
export function sanitizeMermaid(src: string): string {
  if (!src) return src;
  return src.replace(/\|([^|\n]*)\|/g, (full, label: string) => {
    const t = label.trim();
    if (!t) return full;
    const quoted = t.startsWith('"') && t.endsWith('"');
    if (!quoted && /[()]/.test(t)) return `|"${t.replace(/"/g, "'")}"|`;
    return full;
  });
}

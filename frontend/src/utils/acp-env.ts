/**
 * Parse a `.env`-style block into a plain `Record<string, string>`.
 *
 * - One `KEY=value` per line.
 * - Blank lines and lines starting with `#` are ignored.
 * - Surrounding single or double quotes around the value are stripped.
 * - Leading/trailing whitespace on the key and value is trimmed.
 * - Lines without `=` are silently skipped.
 *
 * Intentionally minimal — no escapes, no multi-line values, no shell expansion.
 * Users who need more get `.env` files at the agent-server level.
 */
export function parseAcpEnv(input: string): Record<string, string> {
  const out: Record<string, string> = {};
  input.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;
    const eq = line.indexOf("=");
    if (eq <= 0) return;
    const key = line.slice(0, eq).trim();
    if (!key) return;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  });
  return out;
}

/** Format a Record<string, string> back as a `.env`-style block for editing. */
export function formatAcpEnv(
  env: Record<string, string> | null | undefined,
): string {
  if (!env) return "";
  return Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

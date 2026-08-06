import { toJsonSafe } from "#/components/features/explore/cloudguard-grid/events-export";
import { REMEDIATION_VIEWS } from "./remediation-structure";
import { fieldValue, type RemediationAction } from "./remediation-data";

/**
 * Export one remediation action as structured JSON.
 *
 * Reuses the events export's sanitiser rather than re-deriving it — the same
 * `JSON.stringify` losses (invalid dates, non-finite numbers, `undefined`,
 * cycles) apply here, and two copies of that logic would drift.
 *
 * The export mirrors the RECORD STRUCTURE, not the rendered pane: it walks
 * `REMEDIATION_VIEWS`, so every field in the taxonomy appears exactly once
 * whether or not its section happened to be expanded on screen. An export that
 * depended on UI state would silently omit whatever was collapsed.
 */

export type ExportResult =
  | { ok: true; filename: string }
  | { ok: false; error: string };

export function buildActionExport(
  action: RemediationAction,
): Record<string, unknown> {
  const views: Record<string, unknown> = {};
  REMEDIATION_VIEWS.forEach((v) => {
    const groups = v.stages ?? v.groups ?? [];
    const out: Record<string, unknown> = {};
    groups.forEach((grp) => {
      const fields: Record<string, string> = {};
      grp.fields.forEach((f) => {
        fields[f] = fieldValue(action, f);
      });
      out[grp.label] = fields;
    });
    views[v.label] = out;
  });

  return {
    schema: "cloudguard.remediation.action",
    version: 1,
    action: toJsonSafe(action),
    record: views,
  };
}

/** Field count in the produced document — used to verify nothing was dropped. */
function countFields(): number {
  return REMEDIATION_VIEWS.reduce(
    (n, v) =>
      n + (v.stages ?? v.groups ?? []).reduce((m, g) => m + g.fields.length, 0),
    0,
  );
}

export function exportAction(action: RemediationAction): ExportResult {
  try {
    const payload = buildActionExport(action);
    const text = JSON.stringify(payload, null, 2);

    // Verify before writing, as the events export does: parse back and confirm
    // the document carries every field the structure defines.
    const parsed = JSON.parse(text) as ReturnType<typeof buildActionExport>;
    const record = parsed.record as Record<
      string,
      Record<string, Record<string, string>>
    >;
    let seen = 0;
    Object.values(record).forEach((groups) =>
      Object.values(groups).forEach((fields) => {
        seen += Object.keys(fields).length;
      }),
    );
    const expected = countFields();
    if (seen !== expected)
      throw new Error(`export has ${seen} fields, expected ${expected}`);

    const filename = `${action.id}-remediation.json`;
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
    return { ok: true, filename };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

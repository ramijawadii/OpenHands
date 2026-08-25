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

/* ------------------------------------------------------------------ *
 * Markdown, for "Save to reports"
 * ------------------------------------------------------------------ */

/**
 * The same record, as a document rather than a payload.
 *
 * JSON export answers "give me this for another system"; a saved report answers
 * "keep this where the team reads things". Markdown is what the Report tab
 * renders, what the agent can read back as context and what a person can paste
 * into a ticket — so the artifact written into the library is markdown, exactly
 * as the event and resource reports are.
 *
 * It walks `REMEDIATION_VIEWS` for the same reason `buildActionExport` does: the
 * taxonomy is the source of truth, so a field added to the record appears here
 * without anyone remembering to update a second list, and a section collapsed on
 * screen never silently drops out of the document.
 */
export function remediationReportMarkdown(action: RemediationAction): string {
  const table = (fields: string[]) =>
    [
      "| Field | Value |",
      "| --- | --- |",
      ...fields.map((f) => `| ${f} | ${fieldValue(action, f) || "—"} |`),
    ].join("\n");

  const lines: string[] = [
    `# ${action.title}`,
    "",
    `\`${action.resource}\` · **${action.severity}** · status **${action.status}**`,
    "",
    `${action.provider} · ${action.account} · ${action.region} · ${action.environment}`,
    "",
    `\`${action.id}\` · raised by ${action.origin} · owner ${action.owner} (${action.team})`,
    "",
    "## At a glance",
    "",
    [
      "| Field | Value |",
      "| --- | --- |",
      `| Findings addressed | ${action.findings} |`,
      `| Assets affected | ${action.assets} |`,
      `| Risk before | ${action.riskBefore} |`,
      `| Risk after | ${action.riskAfter} |`,
      `| Automated | ${action.auto ? "Yes" : "No"} |`,
      `| Approvals | ${action.approvals} |`,
      `| Opened | ${action.openedAt.toISOString()} |`,
      `| Due | ${action.dueAt.toISOString()} |`,
      `| Last updated | ${action.updatedAt.toISOString()} |`,
    ].join("\n"),
    "",
  ];

  REMEDIATION_VIEWS.forEach((v) => {
    const groups = v.stages ?? v.groups ?? [];
    if (!groups.length) return;
    lines.push(`## ${v.label}`, "");
    groups.forEach((grp) => {
      lines.push(`### ${grp.label}`, "", table(grp.fields), "");
    });
  });

  lines.push(
    "---",
    "",
    `_Generated from the Remediation record on ${new Date().toISOString()}._`,
    "",
  );
  return lines.join("\n");
}

/** Filesystem-safe, sortable, and stable per action — re-saving versions the
 *  SAME file rather than littering the folder with near-duplicates. */
export function remediationReportFilename(action: RemediationAction): string {
  const slug = action.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `remediation-${action.id}-${slug}.md`;
}

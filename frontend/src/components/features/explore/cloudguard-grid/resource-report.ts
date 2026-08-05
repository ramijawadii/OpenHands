import React from "react";
import { useConversationStore } from "#/state/conversation-store";
import type { ResourceRow } from "./data";

/**
 * The bridge between "a resource was opened" and the Report tab that renders it.
 *
 * Deliberately the same shape as `event-report.ts`, for the same reason: the
 * Report tab is lazily mounted, so a window event dispatched before it mounts
 * lands on nobody. A module-level value plus `useSyncExternalStore` holds the
 * pending report until the tab appears.
 *
 * Two separate pending slots (event and resource) rather than one union: they
 * open from different surfaces and a shared slot would make "open a resource"
 * silently close an event report the analyst was still reading.
 */

let pending: ResourceRow | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot() {
  return pending;
}

const TAB_KEY = "conversation-selected-tab";
const SHOWN_KEY = "conversation-right-panel-shown";

/**
 * Persist the way `useLocalStorage` does, including the synthetic `storage`
 * event its own setter dispatches — the browser fires the native one only for
 * OTHER tabs, so without this the tab bar keeps its stale value and its restore
 * effect snaps the panel back off the Report tab.
 */
function persist(key: string, value: unknown) {
  try {
    const raw = JSON.stringify(value);
    window.localStorage.setItem(key, raw);
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: raw }));
  } catch {
    // Storage can be unavailable (private mode, quota). The live store below
    // still applies; losing persistence is not a reason to lose the click.
  }
}

/** Show a resource as a report, revealing the Report tab. */
export function openResourceReport(row: ResourceRow) {
  pending = row;
  emit();

  persist(TAB_KEY, "diagrams");
  persist(SHOWN_KEY, true);

  const store = useConversationStore.getState();
  store.setSelectedTab("diagrams");
  store.setHasRightPanelToggled(true);
}

export function clearResourceReport() {
  pending = null;
  emit();
}

export function useResourceReport(): ResourceRow | null {
  return React.useSyncExternalStore(subscribe, snapshot, snapshot);
}

/* ------------------------------------------------------------------ *
 * Serialisation
 * ------------------------------------------------------------------ */

function scalar(v: unknown): string {
  if (v instanceof Date) return v.toISOString().replace(".000Z", "Z");
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export function resourceReportFilename(r: ResourceRow): string {
  const slug = r.resource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `resource-${slug}.md`;
}

/**
 * Markdown, grouped exactly as the table groups its columns.
 *
 * Sections are passed in rather than derived here so the report and the grid
 * cannot drift: both read the same `buildColumns` output.
 */
export function resourceReportMarkdown(
  r: ResourceRow,
  groups: { group: string; fields: { field: string; label: string }[] }[],
): string {
  const table = (rows: [string, string][]) =>
    [
      "| Field | Value |",
      "| --- | --- |",
      ...rows.map(([k, v]) => `| ${k} | ${v} |`),
    ].join("\n");

  const record = r as unknown as Record<string, unknown>;
  const body = groups.flatMap((g) => {
    const pairs: [string, string][] = g.fields.map((f) => [
      f.label,
      scalar(record[f.field]),
    ]);
    return [`## ${g.group}`, "", table(pairs), ""];
  });

  return [
    `# ${r.resource}`,
    "",
    `\`${r.kind}\` · ${r.provider} · ${r.region} · ${r.environment}`,
    "",
    `Severity **${r.severity}** · health **${r.health}** · compliance **${r.compliance}**`,
    "",
    ...body,
    "---",
    "",
    `_Generated from the cloud asset inventory on ${new Date()
      .toISOString()
      .replace(".000Z", "Z")}._`,
    "",
  ].join("\n");
}

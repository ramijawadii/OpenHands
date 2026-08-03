import React from "react";
import { useConversationStore } from "#/state/conversation-store";
import type { EventRow } from "./event-data";
import { SEVERITY_OF } from "./event-data";

/**
 * The bridge between "an event was opened" and the Report tab that renders it.
 *
 * A window event will not do here: the Report tab is lazily mounted and only
 * exists while it is the selected tab, so a dispatch made before it mounts
 * would land on nobody. A module-level value plus `useSyncExternalStore` holds
 * the pending report until the tab appears and reads it.
 *
 * The report is **transient** until saved. Opening an event costs nothing on
 * disk; only "Save to reports" writes a file, which is what puts it in the
 * artifact listing alongside everything else the agent produced.
 */

let pending: EventRow | null = null;
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

/**
 * Persisted tab selection, written the way `useLocalStorage` writes it.
 *
 * The tab bar keeps the selection in BOTH zustand and localStorage, and an
 * effect re-applies the stored value. Setting only the live store is therefore
 * not enough: on the next run of that effect the stored value wins and the
 * panel snaps back to whatever tab it was on — which is exactly what opening a
 * report from a closed panel looked like.
 *
 * `useLocalStorage` subscribes to the native `storage` event, which the browser
 * fires only for *other* tabs; its own setter dispatches a synthetic one. Doing
 * the same here means the hook re-reads instead of keeping its stale value, so
 * the two sources of truth agree in the same tick rather than fighting.
 */
const TAB_KEY = "conversation-selected-tab";
const SHOWN_KEY = "conversation-right-panel-shown";

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

/**
 * Show an event as a one-page report, revealing the Report tab.
 *
 * Reveals rather than assumes: the panel may be collapsed, or sitting on
 * another tab, and an "open" that silently changed nothing would read as a
 * broken click. Store keys are historical — `diagrams` is the Report tab.
 *
 * Order matters. The pending report is set *first* so the Report tab has it
 * before it mounts; a tab that mounted first would render the artifact listing
 * for a frame and then swap, which is the flicker this avoids.
 */
export function openEventReport(event: EventRow) {
  pending = event;
  emit();

  persist(TAB_KEY, "diagrams");
  persist(SHOWN_KEY, true);

  const store = useConversationStore.getState();
  store.setSelectedTab("diagrams");
  store.setHasRightPanelToggled(true);
}

export function clearEventReport() {
  pending = null;
  emit();
}

export function useEventReport(): EventRow | null {
  return React.useSyncExternalStore(subscribe, snapshot, snapshot);
}

/* ------------------------------------------------------------------ *
 * Serialisation
 * ------------------------------------------------------------------ */

function iso(d: Date): string {
  return d.toISOString().replace(".000Z", "Z");
}

/** Filesystem-safe, sortable, and unique per event. */
export function eventReportFilename(e: EventRow): string {
  const slug = e.message
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `report-${e.id}-${slug}.md`;
}

/**
 * The saved artifact: markdown, not JSON.
 *
 * Markdown is what the Report tab can already render, what the agent can read
 * back as context, and what a person can paste into a ticket — a JSON dump
 * would satisfy none of those. Tables keep it scannable at the same time.
 */
export function eventReportMarkdown(e: EventRow): string {
  const severity = SEVERITY_OF[e.type] ?? "Low";
  const rows = (pairs: [string, string][]) =>
    [
      "| Field | Value |",
      "| --- | --- |",
      ...pairs.map(([k, v]) => `| ${k} | ${v} |`),
    ].join("\n");

  return [
    `# ${e.title}`,
    "",
    `\`${e.resource}\` · **${e.type}** · severity **${severity}** · status **${e.status}**`,
    "",
    `${e.provider} · ${e.region} · ${e.env} · ${e.serviceType}`,
    "",
    `\`${e.id}\` · rule \`${e.ruleId}\` · detected ${iso(e.at)}`,
    "",
    "## Recommended actions",
    "",
    ...e.recommendations.map((r, i) => `${i + 1}. ${r}`),
    "",
    "## At a glance",
    "",
    rows([
      ["Severity", severity],
      ["Confidence", `${e.confidence}%`],
      ["Blast radius", `${e.blastRadius} downstream services`],
      ["Affected resources", String(e.affectedResources)],
      ["Business impact", e.businessImpact],
      ["Owner", e.owner],
      ["Assignee", e.assignee],
      ["SLA due", iso(e.slaDue)],
      ["Occurrences", String(e.occurrences)],
    ]),
    "",
    "## Affected resource",
    "",
    rows([
      ["Resource", e.resource],
      ["Kind", e.kind],
      ["Service type", e.serviceType],
      ["Provider", e.provider],
      ["Environment", e.env],
      ["Account", e.account],
      ["Region", e.region],
      ["Owning team", e.owner],
      ["Resource ID", `\`${e.resourceId}\``],
    ]),
    "",
    "## Finding",
    "",
    rows([
      ["Detector", e.detector],
      ["Rule", e.ruleId],
      ["Confidence", `${e.confidence}%`],
      ["MITRE tactic", e.mitreTactic],
      ["MITRE technique", `${e.mitreTechnique} (${e.mitreId})`],
      ["Occurrences", String(e.occurrences)],
      ["First seen", iso(e.firstSeen)],
      ["Last seen", iso(e.at)],
    ]),
    "",
    `**Detection logic** — ${e.detectionLogic}`,
    "",
    `**False positives** — ${e.falsePositive}`,
    "",
    "## Impact",
    "",
    rows([
      ["Severity", severity],
      ["Blast radius", `${e.blastRadius} resources`],
      ["Internet facing", e.internetFacing ? "Yes" : "No"],
      ["Data classification", e.dataClassification],
      ["Frameworks", e.compliance.length ? e.compliance.join(", ") : "—"],
    ]),
    "",
    "## Evidence",
    "",
    rows([
      ["Signal", e.evidence],
      ["Log reference", `\`${e.logRef}\``],
      ["Fingerprint", `\`${e.fingerprint}\``],
    ]),
    "",
    "## Timeline",
    "",
    ...e.timeline.map((t) => `- ${iso(t.at)} — ${t.label}`),
    "",
    "## Response",
    "",
    rows([
      ["Assignee", e.assignee],
      ["Escalation", e.escalation],
      ["Ticket", e.ticket ?? "—"],
      ["SLA due", iso(e.slaDue)],
      ["Playbook", e.playbook],
      ["Automation", e.automation],
      ["Runbook", `\`${e.runbook}\``],
    ]),
    "",
    "---",
    "",
    `_Generated from the Overview events table on ${iso(new Date())}._`,
    "",
  ].join("\n");
}

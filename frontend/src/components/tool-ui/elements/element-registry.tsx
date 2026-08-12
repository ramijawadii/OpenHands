/**
 * The Element registry.
 *
 * One entry per widget: which tools trigger it, the schema its payload must
 * satisfy, and how to render it. Adding an Element is data, not code — nothing
 * in the dispatch path changes, so `getToolEventKind` stays the single place a
 * widget is chosen.
 *
 * SECURITY. Same contract as payload-dispatch, and it is not optional:
 *   - `tools` is an allowlist of names from OUR MCP registry. Tool results carry
 *     attacker-supplied text (resource tags, IAM names, scanner output), so the
 *     BODY never selects a widget — only the tool name does.
 *   - `schema` must pass before anything renders. The tool name says which shape
 *     is expected; the schema proves it arrived. On failure the caller falls
 *     back to the plain tool card rather than guessing.
 *   - Payload values are rendered as TEXT only. No entry may interpolate a
 *     payload field into markup, a URL, or a style.
 */

import type { ReactNode } from "react";
import { z } from "zod";

import { RetrievalChunks } from "./retrieval-chunks";
import { SpecSheet } from "./spec-sheet";
import { ScoreBreakdown } from "./score-breakdown";
import { Sources } from "./sources";
import { WebSearch } from "./web-search";
import { FileTree } from "./file-tree";
import { TodoList } from "./todo-list";
import { Timeline } from "./timeline";
import { MemoryChips } from "./memory-chips";

export interface ElementEntry {
  /** Element id — matches the file name, so a route is traceable to its source. */
  id: string;
  /** MCP tool names that trigger this widget. Allowlist, never a pattern. */
  tools: readonly string[];
  schema: z.ZodTypeAny;
  render: (data: unknown, ctx: { toolName: string }) => ReactNode;
}

/* ── shared shapes ───────────────────────────────────────────────────────── */

const Controls = z
  .array(
    z.object({
      control: z.string(),
      title: z.string(),
      severity: z.string().optional(),
    }),
  )
  .min(1);

const Findings = z
  .array(
    z.object({
      severity: z.string(),
      title: z.string().optional(),
      resource: z.string().optional(),
    }),
  )
  .min(1);

// Risk points deducted from a 100-point posture score. CRITICAL dominates
// deliberately: a linear scale lets a pile of LOWs read like a breach path.
const SEVERITY_WEIGHT: Record<string, number> = {
  CRITICAL: 40,
  HIGH: 15,
  MEDIUM: 5,
  LOW: 1,
};

export const ELEMENTS: readonly ElementEntry[] = [
  {
    id: "retrieval-chunks",
    tools: ["kb_search", "kb_get_control"],
    schema: Controls,
    render: (data, { toolName }) => {
      const rows = data as z.infer<typeof Controls>;
      return (
        <RetrievalChunks
          query={toolName}
          chunks={rows.map((c, i) => ({
            id: `${c.control}-${i}`,
            source: c.control,
            locator: c.severity ?? "",
            // The KB ranks without scoring, so rank order is shown as-is
            // rather than dressed up as a confidence value.
            score: 1 - i / Math.max(rows.length, 1),
            text: c.title,
          }))}
          visibleCount={rows.length}
          searching={false}
        />
      );
    },
  },
  {
    id: "spec-sheet",
    tools: ["kg_get_command_schema"],
    schema: z.object({
      required: z.array(z.string()).optional(),
      optional: z.array(z.string()).optional(),
      returns: z.string().optional(),
    }),
    render: (data, { toolName }) => {
      const s = data as {
        required?: string[];
        optional?: string[];
        returns?: string;
      };
      return (
        <SpecSheet
          title={toolName}
          subtitle={s.returns}
          rows={[
            // Required first and emphasised: omitting one is the failure an
            // operator actually hits.
            ...(s.required ?? []).map((r) => ({
              label: r,
              value: "required",
              emphasis: true,
            })),
            ...(s.optional ?? []).map((o) => ({ label: o, value: "optional" })),
          ]}
          visibleCount={(s.required?.length ?? 0) + (s.optional?.length ?? 0)}
        />
      );
    },
  },
  {
    id: "score-breakdown",
    tools: ["kg_get_findings", "kg_posture_summary"],
    schema: Findings,
    render: (data) => {
      const findings = data as z.infer<typeof Findings>;
      const counts = new Map<string, number>();
      for (const f of findings) {
        const sev = (f.severity || "UNKNOWN").toUpperCase();
        counts.set(sev, (counts.get(sev) ?? 0) + 1);
      }
      const criteria = [...counts.entries()]
        .sort((a, b) => (SEVERITY_WEIGHT[b[0]] ?? 0) - (SEVERITY_WEIGHT[a[0]] ?? 0))
        .map(([sev, n]) => ({
          label: sev,
          score: n,
          weight: SEVERITY_WEIGHT[sev] ?? 0,
          note: `${n} finding${n === 1 ? "" : "s"}`,
        }));
      const risk = criteria.reduce((sum, c) => sum + c.score * c.weight, 0);
      // Inverted into a posture score: the Element fills its bar as
      // total/outOf, so passing risk straight through drew a FULL bar for a
      // critical account — visually "perfect" beside a critical verdict.
      const posture = Math.max(0, 100 - risk);
      return (
        <ScoreBreakdown
          verdict={
            counts.has("CRITICAL")
              ? "Critical exposure"
              : counts.has("HIGH")
                ? "Needs attention"
                : "Within tolerance"
          }
          total={posture}
          outOf={100}
          criteria={criteria}
          visibleCount={criteria.length}
        />
      );
    },
  },
  {
    id: "sources",
    tools: ["kb_cite", "kb_sources"],
    schema: z
      .array(z.object({ title: z.string(), url: z.string().optional() }))
      .min(1),
    render: (data) => {
      const rows = data as { title: string; url?: string }[];
      return (
        <Sources
          sources={rows.map((s) => ({
            title: s.title,
            // Compliance citations are document references, not live links.
            // The domain is shown when present and never linked out from here.
            domain: s.url ?? "",
          }))}
          // Expanded: a citation the operator has to click to see is a
          // citation they will not check.
          open
          onOpenChange={() => {}}
        />
      );
    },
  },
  {
    id: "web-search",
    tools: ["web_search", "threat_intel_search"],
    schema: z
      .object({
        query: z.string(),
        results: z
          .array(z.object({ title: z.string(), host: z.string().optional() }))
          .min(1),
      })
      .strip(),
    render: (data) => {
      const d = data as {
        query: string;
        results: { title: string; host?: string }[];
      };
      return (
        <WebSearch
          query={d.query}
          results={d.results.map((r) => ({
            title: r.title,
            domain: r.host ?? "",
          }))}
          visibleResults={d.results.length}
          searching={false}
          cycle={0}
        />
      );
    },
  },
  {
    id: "file-tree",
    tools: ["list_files", "kg_list_artifacts"],
    schema: z.array(z.object({ path: z.string() })).min(1),
    render: (data) => {
      const rows = data as { path: string }[];
      return (
        <FileTree
          nodes={rows.map((f) => ({
            path: f.path,
            name: f.path.split("/").filter(Boolean).pop() ?? f.path,
            depth: Math.max(0, f.path.split("/").filter(Boolean).length - 1),
            kind: f.path.endsWith("/") ? ("folder" as const) : ("file" as const),
          }))}
          visibleCount={rows.length}
          // A listing is not a changeset: nothing was added or removed, so the
          // diff counters stay at zero rather than inventing churn.
          totalAdditions={0}
          totalDeletions={0}
        />
      );
    },
  },
  {
    id: "todo-list",
    tools: ["kg_get_remediation_plan", "plan_status"],
    schema: z
      .array(z.object({ title: z.string(), done: z.boolean().optional() }))
      .min(1),
    render: (data) => {
      const rows = data as { title: string; done?: boolean }[];
      return (
        <TodoList
          items={rows.map((t, i) => ({
            id: String(i),
            text: t.title,
            status: t.done ? ("done" as const) : ("pending" as const),
          }))}
          // The Element animates on revision change; a plan snapshot has no
          // version of its own, so the item count stands in — it moves exactly
          // when the list does.
          revision={rows.length}
        />
      );
    },
  },
  {
    id: "timeline",
    tools: ["kg_get_timeline", "kg_change_history"],
    schema: z
      .array(z.object({ label: z.string(), at: z.string().optional() }))
      .min(1),
    render: (data) => {
      const rows = data as { label: string; at?: string }[];
      return (
        <Timeline
          events={rows.map((e, i) => ({
            id: String(i),
            // Everything the graph returns has already happened; "now" is the
            // reader's position, not a datum in the payload.
            when: "past" as const,
            time: e.at ?? "",
            title: e.label,
          }))}
          visibleCount={rows.length}
        />
      );
    },
  },


  {
    id: "memory-chips",
    tools: ["memory_recall", "working_set"],
    schema: z.array(z.object({ label: z.string() })).min(1),
    render: (data) => {
      const rows = data as { label: string }[];
      return (
        <MemoryChips
          chips={rows.map((c, i) => ({
            id: String(i),
            text: c.label,
            // The payload says what is in the working set, not how it got
            // there, so nothing is claimed as newly added.
            change: "existing" as const,
          }))}
          // Forgetting is a server-side operation on the working set, not a
          // transcript affordance — the chips are a read-only view here.
          onForget={undefined}
        />
      );
    },
  },

];

/** Index by tool name. Built once — the list is static. */
export const ELEMENT_BY_TOOL: ReadonlyMap<string, ElementEntry> = new Map(
  ELEMENTS.flatMap((e) => e.tools.map((t) => [t, e] as const)),
);

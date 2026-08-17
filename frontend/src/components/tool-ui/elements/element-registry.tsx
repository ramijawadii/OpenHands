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
import { FileTree } from "./file-tree";
import { TodoList } from "./todo-list";
import { Timeline } from "./timeline";
import { MemoryChips } from "./memory-chips";
import { NumberTicker } from "./number-ticker";
import { MermaidBlock } from "#/components/features/markdown/mermaid-block";
import { Chart } from "./chart";
import { DataTable } from "../data-table";
import { ArtifactCard } from "./artifact-card";

export interface ElementEntry {
  /** Element id — matches the file name, so a route is traceable to its source. */
  id: string;
  /** MCP tool names that trigger this widget. Allowlist, never a pattern. */
  tools: readonly string[];
  schema: z.ZodTypeAny;
  render: (data: unknown, ctx: { toolName: string }) => ReactNode;
}

/* ── shared shapes ───────────────────────────────────────────────────────── */

const Findings = z
  .array(
    z.object({
      severity: z.string(),
      title: z.string().optional(),
      resource: z.string().optional(),
    }),
  )
  .min(1);

// Every env_* tool answers with an envelope — prose under `text`, data beside
// it — so a schema matches the envelope, never the bare collection. The tools
// returned formatted prose only until 2026-08-15, which is why no entry below
// could ever validate.
const FindingsEnvelope = z.object({ text: z.string(), findings: Findings });

/**
 * A payload string made safe to embed in mermaid SOURCE.
 *
 * Everywhere else in this registry a payload value becomes a text node, where
 * React escapes it. Here it becomes diagram source, so a quote, bracket or
 * newline could close the label and inject further mermaid directives --
 * including click handlers. Allow only the characters that appear in resource
 * names and collapse everything else.
 */
export function mmLabel(value: string): string {
  return value
    .replace(/[^A-Za-z0-9 ._:/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

/**
 * Split a numbered remediation blob into steps.
 *
 * The KB stores a fix as one paragraph numbered "1. ... 2. ...". Rendering
 * that as a single checklist item defeats the point of a checklist, and
 * splitting on sentences would cut mid-instruction.
 */
function splitSteps(text: string): string[] {
  const parts = text
    .split(/(?=\b\d{1,2}\.\s)/g)
    .map((t) => t.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [text.trim()];
}

/**
 * The headline state for a status sheet.
 *
 * Health tools report a status string; the action tools report a boolean
 * outcome instead, and "executed" vs "refused" is the distinction that matters
 * — a refusal is not a failure.
 */
function outcomeOf(d: {
  status?: string;
  executed?: boolean;
  undone?: boolean;
}): string {
  if (d.status !== undefined) return d.status;
  if (d.executed !== undefined) return d.executed ? "executed" : "refused";
  return d.undone ? "undone" : "not undone";
}

/** A job's checklist state. Stuck reads as active, never as quietly pending. */
function jobStatus(j: {
  done?: boolean;
  stuck?: boolean;
  status?: string;
}): "pending" | "active" | "done" {
  if (j.stuck) return "active";
  return (j.done ?? j.status === "completed") ? "done" : "pending";
}

/** Sparse boolean security properties, collapsed into a single flags column. */
function isFlagColumn(key: string): boolean {
  return /_(enabled|accessible|blocked|inbound)$/.test(key);
}

/**
 * A flag as a short chip: `imdsv1_enabled=True` -> `imdsv1`,
 * `mfa_enabled=False` -> `no mfa`.
 *
 * `key=value` pairs were long enough that the column clipped mid-word, which
 * loses the value — the part that decides whether the flag is a problem.
 * Dropping the suffix and moving falsity to a prefix keeps both visible.
 */
function flagLabel(key: string, value: string): string {
  const name = key.replace(/_(enabled|accessible|blocked|inbound)$/, "");
  const off = /^(false|0|no)$/i.test(value);
  return off ? `no ${name}` : name;
}

/**
 * The host of a payload URL, as text.
 *
 * Parsed rather than pattern-matched so a malformed or non-http value yields
 * nothing instead of something that merely looks like a domain. The result is
 * only ever rendered as text -- this must not become an href.
 */
function hostOf(url?: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.hostname
      : "";
  } catch {
    return "";
  }
}

/** Columns that hold an ARN or resource id, which are long enough to need a cap. */
function isIdColumn(key: string): boolean {
  return key === "id" || key === "arn" || key.endsWith("_id");
}

/** Column widths, so no nowrap cell can grow over its neighbour. */
function columnWidth(key: string): string {
  if (isIdColumn(key)) return "13rem";
  if (key === "flags") return "9rem";
  if (key === "risk" || key === "severity") return "6rem";
  return "11rem";
}

/**
 * The distinguishing tail of a resource identifier.
 *
 * An ARN's prefix (`arn:aws:s3:::`) is identical for every resource of that
 * type in the account, so a truncated-from-the-right label reads as several
 * copies of the same thing. Keep the last segment, which is the name.
 */
function shortId(id: string): string {
  const tail = id.split(/[/:]/).filter(Boolean).at(-1) ?? id;
  return tail.length > 18 ? `…${tail.slice(-17)}` : tail;
}

/** Headline verdict, worst severity first. */
function verdictFor(counts: Map<string, number>): string {
  if (counts.has("CRITICAL")) return "Critical exposure";
  if (counts.has("HIGH")) return "Needs attention";
  return "Within tolerance";
}

// Risk points deducted from a 100-point posture score. CRITICAL dominates
// deliberately: a linear scale lets a pile of LOWs read like a breach path.
const SEVERITY_WEIGHT: Record<string, number> = {
  CRITICAL: 40,
  HIGH: 15,
  MEDIUM: 5,
  LOW: 1,
};

/*
 * RETIRED 2026-08-17 — entries removed because no live tool serves them.
 *
 * Each of these rendered correctly but was keyed to a tool name that does not
 * exist on either MCP server, so it could only ever appear behind a hand-made
 * fixture. A registry that lists capability the product does not have is worse
 * than a short one: it reads as done.
 *
 *   web-search         web_search, threat_intel_search
 *   todo-list          kg_get_remediation_plan, plan_status
 *   timeline           kg_get_timeline, kg_change_history
 *   memory-chips       memory_recall, working_set
 *   agent-plan         plan_steps, kg_plan_outline
 *   number-ticker      kg_count, resource_count
 *   guardrail-notice   policy_block, gate_denied
 *   confidence-marker  kg_claims, evidence_confidence
 *   math-block         risk_calculation, kg_score_math
 *   trace-waterfall    trace_spans, kg_query_trace
 *   quota-banner       quota_status, budget_status
 *   artifact-card      artifact_created, report_generated
 *
 * The components remain on disk. Two have a plausible data source if anyone
 * wants to build the tool: trace-waterfall could be fed from the traces query
 * hook, and quota-banner from cloudguard/metrics. The rest need data that does
 * not exist anywhere yet.
 *
 * TodoList, Timeline, MemoryChips, NumberTicker and ArtifactCard are still
 * rendered — by the entries that DO have a tool behind them.
 */

export const ELEMENTS: readonly ElementEntry[] = [
  {
    // Every health-style tool answers with a status flag and a rendered report.
    // One entry covers them all: the shape is identical and a second widget
    // would only differ by title.
    id: "spec-sheet-status",
    tools: [
      "kg_health",
      "kg_system_health",
      "kg_kernel_status",
      "env_scan",
      "kg_execute_command",
      "kg_undo_last",
    ],
    schema: z.union([
      z.object({ text: z.string(), status: z.string() }),
      z.object({ text: z.string(), executed: z.boolean() }),
      z.object({ text: z.string(), undone: z.boolean() }),
    ]),
    render: (data, { toolName }) => {
      const d = data as {
        text: string;
        status?: string;
        commands?: number;
        executed?: boolean;
        undone?: boolean;
        reason?: string;
      };
      // A boolean outcome is the headline for the action tools; a status
      // string is the headline for the health ones.
      const state = outcomeOf(d);
      const rows = [
        { label: "state", value: state, emphasis: true },
        ...(d.reason ? [{ label: "reason", value: d.reason }] : []),
        ...(d.commands !== undefined
          ? [{ label: "commands", value: d.commands.toLocaleString() }]
          : []),
      ];
      return (
        <SpecSheet
          title={toolName}
          // The report itself is the detail; its first line is the summary.
          subtitle={d.text.split("\n")[0].slice(0, 90)}
          rows={rows}
          visibleCount={rows.length}
        />
      );
    },
  },
  {
    // Background work and assessment runs are both job queues.
    id: "todo-list-jobs",
    tools: ["kg_bg_jobs", "kg_assessments"],
    schema: z.union([
      z.object({
        text: z.string(),
        jobs: z
          .array(
            z.object({
              title: z.string(),
              done: z.boolean().optional(),
              stuck: z.boolean().optional(),
            }),
          )
          .min(1),
      }),
      z.object({
        text: z.string(),
        jobs: z
          .array(z.object({ job_id: z.string(), status: z.string() }))
          .min(1),
      }),
    ]),
    render: (data) => {
      const d = data as {
        jobs: {
          title?: string;
          done?: boolean;
          stuck?: boolean;
          job_id?: string;
          status?: string;
        }[];
      };
      return (
        <TodoList
          items={d.jobs.map((j, i) => ({
            id: String(i),
            // TodoStatus is pending | active | done, with no blocked state, so
            // stuckness is carried in the text. Flattening it into "pending"
            // would hide the one condition worth surfacing.
            text: `${j.stuck ? "STUCK - " : ""}${j.title ?? `${j.status} [${j.job_id}]`}`,
            status: jobStatus(j),
          }))}
          revision={d.jobs.length}
        />
      );
    },
  },
  {
    // Notebook cells in execution order are a timeline.
    id: "timeline-cells",
    tools: ["kg_cell_history"],
    schema: z.object({
      text: z.string(),
      cells: z
        .array(z.object({ label: z.string(), at: z.string().optional() }))
        .min(1),
    }),
    render: (data) => {
      const d = data as { cells: { label: string; at?: string }[] };
      return (
        <Timeline
          events={d.cells.map((c, i) => ({
            id: String(i),
            // Cell history is already executed, so every entry is past.
            when: "past" as const,
            time: c.at ?? "",
            title: c.label,
          }))}
          visibleCount={d.cells.length}
        />
      );
    },
  },
  {
    // The allowed set IS the answer; a chip per value beats an indented list.
    id: "memory-chips-enums",
    tools: ["kg_get_enum_values"],
    schema: z.object({
      text: z.string(),
      values: z.array(z.string()).min(1),
    }),
    render: (data) => {
      const d = data as { values: string[] };
      return (
        <MemoryChips
          chips={d.values.map((v, i) => ({
            id: String(i),
            text: v,
            // These are the values the API already accepts, not a change set.
            change: "existing" as const,
          }))}
        />
      );
    },
  },
  {
    // A notebook that was written or run is a deliverable, not a log line.
    id: "artifact-card-notebook",
    tools: ["kg_save_notebook", "kg_run_notebook"],
    schema: z.object({
      text: z.string(),
      artifact: z.object({
        title: z.string(),
        meta: z.string().optional(),
      }),
    }),
    render: (data) => {
      const d = data as { artifact: { title: string; meta?: string } };
      return (
        <ArtifactCard title={d.artifact.title} meta={d.artifact.meta ?? ""} />
      );
    },
  },
  {
    // Remediation arrives as one numbered blob of prose. Split on the numbering
    // the KB already uses, so a fix reads as a checklist an analyst can work
    // through rather than a paragraph they have to parse.
    id: "todo-list-remediation",
    tools: ["kb_remediation"],
    schema: z.object({
      commands: z
        .array(z.object({ value: z.object({ remediation: z.string() }) }))
        .min(1),
    }),
    render: (data) => {
      const r = data as { commands: { value: { remediation: string } }[] };
      const steps = r.commands.flatMap((c) => splitSteps(c.value.remediation));
      return (
        <TodoList
          items={steps.map((text, i) => ({
            id: String(i),
            text,
            status: "pending" as const,
          }))}
          revision={steps.length}
        />
      );
    },
  },
  {
    // A CLI spec is exactly a spec sheet: the flags are what an operator needs
    // before running anything.
    id: "spec-sheet-cli",
    tools: ["kb_cli_spec"],
    schema: z.object({
      value: z.object({
        cmd: z.string(),
        service: z.string().optional(),
        method: z.string().optional(),
        path: z.string().optional(),
        flags: z.string().optional(),
        summary: z.string().optional(),
      }),
    }),
    render: (data) => {
      const v = (
        data as {
          value: {
            cmd: string;
            service?: string;
            method?: string;
            path?: string;
            flags?: string;
            summary?: string;
          };
        }
      ).value;
      const rows = [
        { label: "service", value: v.service },
        { label: "method", value: v.method },
        { label: "path", value: v.path },
      ]
        .filter((row) => row.value)
        .map((row) => ({ label: row.label, value: String(row.value) }))
        .concat(
          // One row per flag: a single space-separated string is unreadable at
          // the width these cards render.
          (v.flags ?? "")
            .split(/\s+/)
            .filter(Boolean)
            .map((f) => ({ label: f, value: "" })),
        );
      return (
        <SpecSheet
          title={v.cmd}
          subtitle={v.summary}
          rows={rows}
          visibleCount={rows.length}
        />
      );
    },
  },
  {
    // The benchmark control and its parent safeguards. Two KB tools answer with
    // different envelopes for the same idea, so one entry normalises both.
    id: "spec-sheet-control",
    tools: ["kb_ground_control", "kb_ccm_control"],
    schema: z.union([
      z.object({
        control: z.string(),
        benchmark: z.string().optional(),
        cis_v8_safeguards: z.array(z.string()).optional(),
      }),
      z.object({
        value: z.object({
          control: z.string(),
          name: z.string().optional(),
          domain: z.string().optional(),
          caiq_questions: z
            .array(z.object({ id: z.string(), question: z.string() }))
            .optional(),
        }),
      }),
    ]),
    render: (data) => {
      const d = data as Record<string, unknown>;
      if ("value" in d) {
        const v = d.value as {
          control: string;
          name?: string;
          domain?: string;
          caiq_questions?: { id: string; question: string }[];
        };
        const rows = [
          ...(v.domain ? [{ label: "domain", value: v.domain }] : []),
          ...(v.caiq_questions ?? []).map((q) => ({
            label: q.id,
            value: q.question,
          })),
        ];
        return (
          <SpecSheet
            title={v.control}
            subtitle={v.name}
            rows={rows}
            visibleCount={rows.length}
          />
        );
      }
      const g = d as {
        control: string;
        benchmark?: string;
        cis_v8_safeguards?: string[];
      };
      const rows = (g.cis_v8_safeguards ?? []).map((sg) => ({
        label: "CIS v8",
        value: sg,
      }));
      return (
        <SpecSheet
          title={g.control}
          subtitle={g.benchmark}
          rows={rows}
          visibleCount={rows.length}
        />
      );
    },
  },
  {
    // Cross-framework mappings are a table in the KB and stay one on the way out.
    id: "data-table-mappings",
    tools: ["kb_map_frameworks"],
    schema: z.object({
      mappings: z
        .array(
          z.object({
            value: z.object({
              framework: z.string(),
              id: z.string(),
            }),
          }),
        )
        .min(1),
    }),
    render: (data) => {
      const r = data as {
        mappings: { value: { framework: string; id: string } }[];
      };
      return (
        <DataTable
          id="cg-kb-mappings"
          columns={[
            {
              key: "framework",
              label: "framework",
              width: "10rem",
              truncate: true,
            },
            { key: "id", label: "control", width: "20rem", truncate: true },
          ]}
          data={r.mappings.map((m, i) => ({
            __id: String(i),
            framework: m.value.framework,
            id: m.value.id,
          }))}
          rowIdKey="__id"
        />
      );
    },
  },
  {
    // How much of a provider the KB actually covers. Without it, "the KB says
    // nothing about X" and "the KB has not indexed X" look identical.
    id: "number-ticker-coverage",
    tools: ["kb_coverage"],
    schema: z.object({
      provider: z.string(),
      status: z.string(),
      pages: z.number(),
    }),
    render: (data) => {
      const c = data as { provider: string; status: string; pages: number };
      return (
        <NumberTicker
          value={c.pages}
          label={`pages indexed - ${c.provider} ${c.status.toLowerCase()}`}
        />
      );
    },
  },
  {
    id: "spec-sheet-kb-health",
    tools: ["kb_health"],
    schema: z.object({
      status: z.string(),
      version: z.union([z.string(), z.number()]).optional(),
    }),
    render: (data) => {
      const h = data as { status: string; version?: string | number };
      const rows = [
        { label: "status", value: h.status, emphasis: true },
        ...(h.version !== undefined
          ? [{ label: "version", value: String(h.version) }]
          : []),
      ];
      return (
        <SpecSheet
          title="Knowledge base"
          rows={rows}
          visibleCount={rows.length}
        />
      );
    },
  },
  {
    // kb_nist_search already answers with structured matches, so this needed
    // no backend change -- only a key onto the tool that actually exists.
    // `kb_search` and `kb_get_control`, which this used to name, do not.
    id: "retrieval-chunks",
    tools: ["kb_nist_search"],
    schema: z.object({
      query: z.string(),
      matches: z
        .array(
          z.object({
            value: z.object({
              publication: z.string().optional(),
              title: z.string().optional(),
              locator: z.string().optional(),
              heading: z.string().optional(),
              excerpt: z.string().optional(),
              score: z.number().optional(),
            }),
          }),
        )
        .min(1),
    }),
    render: (data) => {
      const r = data as {
        query: string;
        matches: {
          value: {
            publication?: string;
            title?: string;
            locator?: string;
            heading?: string;
            excerpt?: string;
            score?: number;
          };
        }[];
      };
      return (
        <RetrievalChunks
          query={r.query}
          chunks={r.matches.map((m, i) => ({
            id: `${m.value.publication ?? "match"}-${m.value.locator ?? i}`,
            source: m.value.publication ?? m.value.title ?? "",
            locator: m.value.locator ?? "",
            // Rank order stands in when the KB returns no score, rather than
            // dressing position up as a confidence value.
            score: m.value.score ?? 1 - i / Math.max(r.matches.length, 1),
            text: m.value.excerpt ?? m.value.heading ?? m.value.title ?? "",
          }))}
          visibleCount={r.matches.length}
          searching={false}
        />
      );
    },
  },
  {
    // A resource's own properties, plus the edges it sits on. env_get_resource
    // could only render those edges as `-[REL]-> (Label) id`, which the
    // transcript would have had to parse back out of prose.
    id: "spec-sheet-resource",
    tools: ["env_get_resource"],
    schema: z.object({
      text: z.string(),
      labels: z.array(z.string()),
      properties: z.record(z.string(), z.unknown()),
      relationships: z.array(
        z.object({
          type: z.string(),
          target_label: z.string(),
          target_id: z.string(),
        }),
      ),
    }),
    render: (data) => {
      const r = data as {
        labels: string[];
        properties: Record<string, unknown>;
        relationships: {
          type: string;
          target_label: string;
          target_id: string;
        }[];
      };
      const propRows = Object.entries(r.properties).map(([label, value]) => ({
        label,
        value: String(value),
        // Risk is the property an operator scans for first.
        emphasis: label === "risk_level",
      }));
      const edgeRows = r.relationships.map((e) => ({
        label: e.type,
        value: `(${e.target_label}) ${e.target_id}`,
      }));
      const rows = [...propRows, ...edgeRows];
      return (
        <SpecSheet
          title={r.labels[0] ?? "Resource"}
          subtitle={
            r.relationships.length
              ? `${r.relationships.length} relationship${r.relationships.length === 1 ? "" : "s"}`
              : undefined
          }
          rows={rows}
          visibleCount={rows.length}
        />
      );
    },
  },
  {
    // Graph size at a glance. `status` is carried so an empty graph reads as
    // empty rather than as a zero that might mean "not scanned".
    id: "number-ticker-health",
    tools: ["env_health"],
    schema: z.object({
      text: z.string(),
      status: z.string(),
      total: z.number(),
    }),
    render: (data) => {
      const h = data as { status: string; total: number };
      return (
        <NumberTicker
          value={h.total}
          label={h.status === "ok" ? "resources in graph" : `graph ${h.status}`}
        />
      );
    },
  },
  {
    // A blast radius is the one result that genuinely wants drawing. The prose
    // rendered each path as a single `(Label) id -[REL]-> (Label) id` string.
    // No matching file: this one renders through MermaidBlock rather than a
    // component in this directory, so the id names what it draws.
    id: "attack-path",
    tools: ["env_find_paths"],
    schema: z.object({
      text: z.string(),
      paths: z
        .array(
          z.object({
            index: z.number(),
            hops: z.number(),
            nodes: z.array(z.object({ label: z.string(), id: z.string() })),
            edges: z.array(z.string()),
          }),
        )
        .min(1),
    }),
    render: (data) => {
      const { paths } = data as {
        paths: {
          index: number;
          hops: number;
          nodes: { label: string; id: string }[];
          edges: string[];
        }[];
      };
      // Drawn by the transcript's own mermaid renderer rather than a bespoke
      // SVG. Mermaid lays a graph out properly, so hops space themselves and
      // edge labels stop colliding with the boxes they sit between — and an
      // attack path then looks like every other diagram in the product.
      const lines = ["flowchart LR"];
      paths.forEach((path) => {
        path.nodes.forEach((n, col) => {
          lines.push(
            `  p${path.index}n${col}["${mmLabel(n.label)}<br/>${mmLabel(shortId(n.id))}"]`,
          );
        });
        path.edges.forEach((label, i) => {
          lines.push(
            `  p${path.index}n${i} -->|${mmLabel(label)}| p${path.index}n${i + 1}`,
          );
        });
        // The first node is where an attacker starts and the last is what they
        // reach; those two ends are what a reader looks for first.
        lines.push(`  class p${path.index}n0 src`);
        lines.push(`  class p${path.index}n${path.nodes.length - 1} tgt`);
      });
      lines.push(
        "  classDef src fill:#1e3a5f,stroke:#3b82f6,color:#e6edf5",
        "  classDef tgt fill:#4a1d1d,stroke:#ef4444,color:#f5e6e6",
      );
      return <MermaidBlock code={lines.join("\n")} />;
    },
  },
  {
    // Risk distribution was drawn as a bar of block characters because prose
    // was the only channel; these are the same counts as numbers.
    id: "chart-risk",
    tools: ["env_summary"],
    schema: z.object({
      text: z.string(),
      risk: z.record(z.string(), z.number()),
    }),
    render: (data) => {
      const { risk } = data as { risk: Record<string, number> };
      const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
      const points = order.map((lvl) => risk[lvl] ?? 0);
      const total = points.reduce((a, b) => a + b, 0);
      // Emphasise the worst severity that actually has findings. The default
      // is the last bar, which here would spotlight LOW.
      const worst = points.findIndex((n) => n > 0);
      return (
        <Chart
          label="Risk distribution"
          value={`${total} finding${total === 1 ? "" : "s"}`}
          points={points}
          categories={order}
          highlightIndex={worst === -1 ? undefined : worst}
          visibleCount={points.length}
          variant="bars"
        />
      );
    },
  },
  {
    // Resource lookups and Cypher results are already tabular; the prose
    // flattened them to `key: value` lines, which is the one shape a table
    // reads worse than the data it came from.
    id: "data-table-rows",
    tools: ["env_find_resources", "env_graph_query", "kg_search_commands"],
    schema: z.object({
      text: z.string(),
      rows: z.array(z.record(z.string(), z.unknown())).min(1),
      columns: z.array(z.string()).min(1),
    }),
    render: (data, { toolName }) => {
      const t = data as {
        rows: Record<string, unknown>[];
        columns: string[];
      };
      // Values are stringified rather than passed through: a payload field must
      // never reach the DOM as anything but text.
      // Security properties are sparse: `publicly_accessible` is set on one row,
      // `mfa_enabled` on another. As columns they were four mostly-empty
      // headers that together overflowed the panel — and the container clips
      // horizontally rather than scrolling, so the headers overlapped instead.
      // Collapsed into one "flags" column, each row shows only what it has.
      const CORE = t.columns.filter((c) => !isFlagColumn(c)).slice(0, 3);
      const FLAGS = t.columns.filter(isFlagColumn);

      const rows = t.rows.map((row, i) => {
        const flat: Record<string, string> = { __id: String(i) };
        for (const key of CORE) {
          const raw = row[key] === undefined ? "" : String(row[key]);
          // A full ARN widened its column until it ran over the next one, and
          // the colgroup width is only a hint without a fixed table layout.
          // The untruncated value is still in the tool's own text output.
          flat[key] = isIdColumn(key) ? shortId(raw) : raw;
        }
        if (FLAGS.length) {
          flat.flags = FLAGS.filter(
            (f) => row[f] !== undefined && String(row[f]) !== "",
          )
            .map((f) => flagLabel(f, String(row[f])))
            .join(" · ");
        }
        return flat;
      });
      const columnKeys = FLAGS.length ? [...CORE, "flags"] : CORE;
      return (
        <DataTable
          id={`cg-${toolName}`}
          columns={columnKeys.map((key) => ({
            key,
            label: key,
            // Identifiers are ARNs. Cells are nowrap by design, so without a
            // width and truncation a single ARN ran straight over the next
            // column instead of widening its own.
            // Every column needs a width. The colgroup hint is what stops a
            // nowrap cell widening until it runs over its neighbour; leaving
            // `name` unsized let it collide with `risk`.
            width: columnWidth(key),
            truncate: true,
          }))}
          data={rows}
          rowIdKey="__id"
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
    tools: ["env_risk_findings"],
    schema: FindingsEnvelope,
    render: (data) => {
      const { findings } = data as z.infer<typeof FindingsEnvelope>;
      const counts = new Map<string, number>();
      for (const f of findings) {
        const sev = (f.severity || "UNKNOWN").toUpperCase();
        counts.set(sev, (counts.get(sev) ?? 0) + 1);
      }
      const criteria = [...counts.entries()]
        .sort(
          (a, b) => (SEVERITY_WEIGHT[b[0]] ?? 0) - (SEVERITY_WEIGHT[a[0]] ?? 0),
        )
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
          verdict={verdictFor(counts)}
          total={posture}
          outOf={100}
          criteria={criteria}
          visibleCount={criteria.length}
        />
      );
    },
  },
  {
    // Every KB lookup carries where the answer came from and how far it is
    // trusted. That provenance was previously invisible -- the agent read it
    // and the analyst never saw it.
    id: "sources",
    tools: ["kb_technique", "kb_weakness", "kb_threat_actor", "kb_nist"],
    schema: z.object({
      provenance: z.object({
        source_url: z.string().optional(),
        basis: z.string().optional(),
      }),
      trust: z
        .object({
          tier: z.string().optional(),
          confidence: z.number().optional(),
        })
        .optional(),
    }),
    render: (data) => {
      const r = data as {
        provenance: { source_url?: string; basis?: string };
        trust?: { tier?: string; confidence?: number };
      };
      const tier = r.trust?.tier;
      const confidence = r.trust?.confidence;
      const rows = [
        {
          title: [
            r.provenance.basis,
            tier,
            confidence !== undefined
              ? `${Math.round(confidence * 100)}%`
              : undefined,
          ]
            .filter(Boolean)
            .join(" · "),
          url: r.provenance.source_url,
        },
      ];
      return (
        <Sources
          sources={rows.map((s) => ({
            title: s.title,
            // Shown as TEXT, never linked: the value is attacker-reachable and
            // an href would make it navigable.
            domain: hostOf(s.url),
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
    // Two shapes reach the same widget: `list_files` answers with a bare
    // array, kg_list_notebooks with the {text, files} envelope every converted
    // tool uses. Normalising here beats a second near-identical entry.
    id: "file-tree",
    tools: ["list_files", "kg_list_notebooks"],
    schema: z.union([
      z.array(z.object({ path: z.string() })).min(1),
      z.object({
        text: z.string(),
        files: z.array(z.object({ path: z.string() })).min(1),
      }),
    ]),
    render: (data) => {
      const rows = Array.isArray(data)
        ? (data as { path: string }[])
        : (data as { files: { path: string }[] }).files;
      return (
        <FileTree
          nodes={rows.map((f) => ({
            path: f.path,
            name: f.path.split("/").filter(Boolean).pop() ?? f.path,
            depth: Math.max(0, f.path.split("/").filter(Boolean).length - 1),
            kind: f.path.endsWith("/")
              ? ("folder" as const)
              : ("file" as const),
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
];

/** Index by tool name. Built once — the list is static. */
export const ELEMENT_BY_TOOL: ReadonlyMap<string, ElementEntry> = new Map(
  ELEMENTS.flatMap((e) => e.tools.map((t) => [t, e] as const)),
);

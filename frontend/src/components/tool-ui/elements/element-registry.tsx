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
import { AgentPlan } from "./agent-plan";
import { NumberTicker } from "./number-ticker";
import { MermaidBlock } from "#/components/features/markdown/mermaid-block";
import { Chart } from "./chart";
import { DataTable } from "../data-table";
import { GuardrailNotice } from "./guardrail-notice";
import { ConfidenceMarker } from "./confidence-marker";
import { MathBlock } from "./math-block";
import { TraceWaterfall } from "./trace-waterfall";
import { QuotaBanner } from "./quota-banner";
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

export const ELEMENTS: readonly ElementEntry[] = [
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
    id: "flow-graph-paths",
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
    tools: ["env_find_resources", "env_graph_query"],
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

  {
    id: "agent-plan",
    tools: ["plan_steps", "kg_plan_outline"],
    schema: z.object({
      steps: z.array(z.string()).min(1),
      active: z.number().optional(),
    }),
    render: (data) => {
      const d = data as { steps: string[]; active?: number };
      return (
        <AgentPlan
          steps={d.steps}
          // Absent an explicit cursor the plan is treated as not yet started,
          // which is safer than implying progress the payload never claimed.
          activeIndex={d.active ?? 0}
        />
      );
    },
  },
  {
    id: "number-ticker",
    tools: ["kg_count", "resource_count"],
    schema: z.object({ value: z.number(), label: z.string() }),
    render: (data) => {
      const d = data as { value: number; label: string };
      return <NumberTicker value={d.value} label={d.label} />;
    },
  },
  {
    id: "guardrail-notice",
    tools: ["policy_block", "gate_denied"],
    schema: z.object({
      title: z.string(),
      explanation: z.string(),
      policy: z.string(),
      alternatives: z.array(z.string()).optional(),
    }),
    render: (data) => {
      const d = data as {
        title: string;
        explanation: string;
        policy: string;
        alternatives?: string[];
      };
      return (
        <GuardrailNotice
          title={d.title}
          explanation={d.explanation}
          policy={d.policy}
          alternatives={d.alternatives ?? []}
          // Suggested alternatives are read-only here: acting on one is a new
          // command that must go through the permission gate, not a click that
          // bypasses the block being explained.
          onPick={undefined}
        />
      );
    },
  },
  {
    id: "confidence-marker",
    tools: ["kg_claims", "evidence_confidence"],
    schema: z
      .array(
        z.object({
          text: z.string(),
          confidence: z.enum(["grounded", "inferred", "uncertain"]),
          basis: z.string().optional(),
        }),
      )
      .min(1),
    render: (data) => {
      const rows = data as {
        text: string;
        confidence: "grounded" | "inferred" | "uncertain";
        basis?: string;
      }[];
      return (
        <ConfidenceMarker
          claims={rows.map((c, i) => ({
            id: String(i),
            text: c.text,
            confidence: c.confidence,
            // An unstated basis is shown as such rather than left blank: a
            // claim with no evidence behind it is the thing worth noticing.
            basis: c.basis ?? "no basis recorded",
          }))}
          // Nothing is hovered on first paint; the Element owns hover from
          // there, so the transcript does not hold interaction state.
          hoveredId=""
          onHover={() => {}}
        />
      );
    },
  },
  {
    id: "math-block",
    tools: ["risk_calculation", "kg_score_math"],
    schema: z.object({
      label: z.string(),
      steps: z
        .array(
          z.object({ expression: z.string(), note: z.string().optional() }),
        )
        .min(1),
    }),
    render: (data) => {
      const d = data as {
        label: string;
        steps: { expression: string; note?: string }[];
      };
      return (
        <MathBlock
          label={d.label}
          steps={d.steps}
          visibleSteps={d.steps.length}
        />
      );
    },
  },
  {
    id: "trace-waterfall",
    tools: ["trace_spans", "kg_query_trace"],
    schema: z.object({
      totalMs: z.number(),
      spans: z
        .array(
          z.object({
            name: z.string(),
            depth: z.number().optional(),
            startMs: z.number(),
            durationMs: z.number(),
            status: z.enum(["running", "completed", "failed"]).optional(),
          }),
        )
        .min(1),
    }),
    render: (data) => {
      const d = data as {
        totalMs: number;
        spans: {
          name: string;
          depth?: number;
          startMs: number;
          durationMs: number;
          status?: "running" | "completed" | "failed";
        }[];
      };
      return (
        <TraceWaterfall
          spans={d.spans.map((sp, i) => ({
            id: String(i),
            name: sp.name,
            depth: sp.depth ?? 0,
            startMs: sp.startMs,
            durationMs: sp.durationMs,
            // A span with no status has already returned, or it would
            // not be in a completed trace.
            status: sp.status ?? "completed",
          }))}
          totalMs={d.totalMs}
          visibleCount={d.spans.length}
        />
      );
    },
  },
  {
    id: "quota-banner",
    tools: ["quota_status", "budget_status"],
    schema: z.object({
      used: z.number(),
      limit: z.number(),
      unit: z.string().optional(),
      resetsIn: z.string().optional(),
    }),
    render: (data) => {
      const d = data as {
        used: number;
        limit: number;
        unit?: string;
        resetsIn?: string;
      };
      return (
        <QuotaBanner
          used={d.used}
          limit={d.limit}
          unit={d.unit ?? "calls"}
          resetsIn={d.resetsIn ?? "unknown"}
          // No upgrade path is offered from a transcript: budget is an
          // account-level decision, not something to action mid-assessment.
          upgradeLabel=""
          onUpgrade={undefined}
        />
      );
    },
  },
  {
    id: "artifact-card",
    tools: ["artifact_created", "report_generated"],
    schema: z.object({ title: z.string(), meta: z.string().optional() }),
    render: (data) => {
      const d = data as { title: string; meta?: string };
      return <ArtifactCard title={d.title} meta={d.meta ?? ""} />;
    },
  },
];

/** Index by tool name. Built once — the list is static. */
export const ELEMENT_BY_TOOL: ReadonlyMap<string, ElementEntry> = new Map(
  ELEMENTS.flatMap((e) => e.tools.map((t) => [t, e] as const)),
);

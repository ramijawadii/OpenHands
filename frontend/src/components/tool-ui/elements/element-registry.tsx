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
import { FlowGraph } from "./flow-graph";
import { Chart } from "./chart";
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

// Every env_* tool answers with an envelope — prose under `text`, data beside
// it — so a schema matches the envelope, never the bare collection. The tools
// returned formatted prose only until 2026-08-15, which is why no entry below
// could ever validate.
const FindingsEnvelope = z.object({ text: z.string(), findings: Findings });

/**
 * Where a hop sits on an attack path. The source is where an attacker starts
 * and the last node is what they reach; the hops between are the ones worth
 * breaking.
 */
function hopState(col: number, length: number): "done" | "active" | "pending" {
  if (col === 0) return "done";
  if (col === length - 1) return "active";
  return "pending";
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
      // One row per path, one column per hop, so parallel routes to the same
      // target read as parallel rather than as one tangled chain.
      const nodes = paths.flatMap((path, row) =>
        path.nodes.map((n, col) => ({
          id: `p${path.index}-${col}`,
          label: `${n.label}
${n.id}`,
          column: col,
          row,
          state: hopState(col, path.nodes.length),
        })),
      );
      const edges = paths.flatMap((path) =>
        path.edges.map((label, i) => ({
          from: `p${path.index}-${i}`,
          to: `p${path.index}-${i + 1}`,
          label,
        })),
      );
      return (
        <FlowGraph nodes={nodes} edges={edges} visibleCount={nodes.length} />
      );
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
      return (
        <Chart
          label="Risk distribution"
          value={String(total)}
          delta={order.map((l, i) => `${l[0]}${points[i]}`).join(" ")}
          points={points}
          visibleCount={points.length}
          variant="bars"
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

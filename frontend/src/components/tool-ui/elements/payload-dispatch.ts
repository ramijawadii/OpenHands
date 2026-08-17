/**
 * Tier 2 dispatch — payload → Element.
 *
 * SECURITY BOUNDARY. Read this before adding a schema.
 *
 * Tier 1 dispatches on the event type, which the agent cannot influence. Tier 2
 * has to look at what a tool RETURNED, and tool results carry attacker-supplied
 * text: resource tags, IAM role names, bucket names, scanner output. A crafted
 * tag is untrusted input that reaches the renderer.
 *
 * Two rules follow, and they are the whole point of this module:
 *
 *   1. Dispatch on the TOOL NAME, never on payload content. The tool name comes
 *      from our own MCP registry, not from the cloud account under assessment.
 *      Sniffing the body ("does it look like a table?") would let a resource
 *      tag choose the widget.
 *
 *   2. The payload must satisfy a schema before it renders. A tool name only
 *      says which shape is EXPECTED; the schema is what proves it arrived. On
 *      failure we fall back to the plain tool card rather than guessing —
 *      degrading to something honest beats rendering a half-parsed structure.
 *
 * Values that pass are still only ever rendered as TEXT by the Elements. No
 * payload field is interpolated into markup, a URL, or a style.
 */

import { z } from "zod";
import { ELEMENT_BY_TOOL } from "./element-registry";

/** Kinds a validated payload can resolve to. Extend with the schema, together. */
/**
 * Kinds a validated payload can resolve to.
 *
 * Registry ids are also PayloadKinds, so declaring an Element is enough to make
 * it dispatchable — there is no second list to keep in step. The literals below
 * are the pre-registry routes kept for their tests.
 */
export type PayloadKind =
  | "kg-commands"
  | "kg-schema"
  | "kb-controls"
  | "findings"
  // Keeps autocomplete for the literals above while still accepting any
  // registry id. `string & {}` says the same thing but trips ban-types.
  | (string & Record<never, never>);

/**
 * Schemas are deliberately LOOSE about extra keys and STRICT about the fields
 * we actually render. Upstream adding a field must not blank the widget, but a
 * missing field we depend on must fail rather than render `undefined`.
 */
const KgCommandsSchema = z
  .array(
    z.object({
      command: z.string(),
      service: z.string().optional(),
      description: z.string().optional(),
    }),
  )
  .min(1);

const KgSchemaSchema = z.object({
  required: z.array(z.string()).optional(),
  optional: z.array(z.string()).optional(),
  returns: z.string().optional(),
});

const KbControlsSchema = z
  .array(
    z.object({
      control: z.string(),
      title: z.string(),
      severity: z.string().optional(),
    }),
  )
  .min(1);

const FindingsSchema = z
  .array(
    z.object({
      severity: z.string(),
      title: z.string().optional(),
      resource: z.string().optional(),
    }),
  )
  .min(1);

/**
 * The allowlist. A tool absent from this map gets the plain tool card — that is
 * the safe default, and it is why the map is exhaustive rather than a
 * fall-through with a regex.
 */
const BY_TOOL: Record<string, { kind: PayloadKind; schema: z.ZodTypeAny }> = {
  kg_search_commands: { kind: "kg-commands", schema: KgCommandsSchema },
  kg_get_command_schema: { kind: "kg-schema", schema: KgSchemaSchema },
  kb_search: { kind: "kb-controls", schema: KbControlsSchema },
  kg_get_findings: { kind: "findings", schema: FindingsSchema },
};

export type PayloadMatch =
  | { kind: PayloadKind; data: unknown }
  | { kind: null; reason: "unknown-tool" | "unparseable" | "schema-mismatch" };

/** Sentinel: a well-formed MCP envelope that reports the tool itself failed. */
const MCP_ERROR = Symbol("mcp-error");

/**
 * Unwrap the MCP result envelope, if that is what arrived.
 *
 * A REAL agent run does not hand us the tool's own JSON. OpenHands stores the
 * whole MCP result — `{meta, content: [{type, text}], isError}` — and the tool
 * payload sits inside `content[0].text` as a JSON *string*. Validating the
 * envelope against an element schema therefore failed every time, so no widget
 * could ever render from an actual agent turn. (Seeded fixtures written with
 * the inner payload directly hid this completely: they matched, real traffic
 * did not.)
 *
 * A payload that is not an envelope passes through untouched, so both shapes
 * work and older events keep rendering.
 */
function unwrapMcp(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return parsed;
  const env = parsed as {
    content?: unknown;
    isError?: unknown;
    text?: unknown;
  };
  // `text` present means this is already a tool payload, not an envelope.
  if (env.text !== undefined || !Array.isArray(env.content)) return parsed;

  // A failed tool is not a widget: its payload describes the failure, not the
  // shape the element expects.
  if (env.isError === true) return MCP_ERROR;

  const first = env.content[0] as { text?: unknown } | undefined;
  if (!first || typeof first.text !== "string") return parsed;
  try {
    return JSON.parse(first.text);
  } catch {
    // Inner content is prose — a tool that has not been converted yet.
    return MCP_ERROR;
  }
}

/**
 * Resolve a tool result to a widget, or explain why it could not be.
 *
 * `reason` is returned rather than a bare null so a mismatch is debuggable
 * without instrumenting the caller — a schema that silently stops matching
 * after an upstream change is otherwise invisible.
 */
export const matchPayload = (
  toolName: string | undefined,
  rawContent: string | undefined,
): PayloadMatch => {
  if (!toolName) return { kind: null, reason: "unknown-tool" };

  // The registry is consulted first: it is where Elements are declared, and a
  // tool must never resolve differently here than it does at render time.
  const registryEntry = ELEMENT_BY_TOOL.get(toolName);
  const entry = registryEntry
    ? { kind: registryEntry.id as PayloadKind, schema: registryEntry.schema }
    : BY_TOOL[toolName];
  if (!entry) return { kind: null, reason: "unknown-tool" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent ?? "");
  } catch {
    // Tools legitimately return prose (an error string, a status line). Not an
    // anomaly, just not a structured payload.
    return { kind: null, reason: "unparseable" };
  }

  const unwrapped = unwrapMcp(parsed);
  if (unwrapped === MCP_ERROR) return { kind: null, reason: "schema-mismatch" };

  const result = entry.schema.safeParse(unwrapped);
  if (!result.success) return { kind: null, reason: "schema-mismatch" };

  return { kind: entry.kind, data: result.data };
};

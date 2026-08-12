/**
 * The security-relevant cases first: a payload must not be able to choose its
 * own widget. The happy paths matter less than the refusals.
 */
import { describe, expect, it } from "vitest";
import { matchPayload } from "./payload-dispatch";

describe("payload dispatch — refusals", () => {
  it("refuses a tool that is not on the allowlist", () => {
    // Well-formed data, unknown tool. Shape must not earn a widget.
    const r = matchPayload(
      "some_untrusted_tool",
      JSON.stringify([{ command: "aws s3 ls", service: "s3" }]),
    );
    expect(r.kind).toBeNull();
  });

  it("refuses when the tool name is absent", () => {
    expect(matchPayload(undefined, "[]").kind).toBeNull();
  });

  it("refuses a payload that does not match the schema", () => {
    // Right tool, wrong shape — an upstream change or a poisoned response.
    const r = matchPayload("kg_search_commands", JSON.stringify([{ nope: 1 }]));
    expect(r.kind).toBeNull();
    if (r.kind === null) expect(r.reason).toBe("schema-mismatch");
  });

  it("refuses prose rather than throwing", () => {
    const r = matchPayload("kb_search", "connection reset by peer");
    expect(r.kind).toBeNull();
    if (r.kind === null) expect(r.reason).toBe("unparseable");
  });

  it("refuses an empty result set", () => {
    // An empty table is a worse answer than the plain tool card.
    expect(matchPayload("kg_search_commands", "[]").kind).toBeNull();
  });

  it("does not let attacker-controlled TEXT change the routing", () => {
    // A resource tag that names another tool must not redirect dispatch: the
    // tool name is ours, the content is theirs.
    const hostile = JSON.stringify([
      { control: "kg_search_commands", title: "kb_search", severity: "HIGH" },
    ]);
    const r = matchPayload("kb_search", hostile);
    // Routes by the TOOL, so it stays retrieval-chunks regardless of the body.
    expect(r.kind).toBe("retrieval-chunks");
  });
});

describe("payload dispatch — matches", () => {
  it("routes kg_search_commands to a table", () => {
    const r = matchPayload(
      "kg_search_commands",
      JSON.stringify([{ command: "aws s3api get-bucket-policy", service: "s3" }]),
    );
    expect(r.kind).toBe("kg-commands");
  });

  it("routes kb_search to controls", () => {
    const r = matchPayload(
      "kb_search",
      JSON.stringify([{ control: "CIS AWS 2.1.1", title: "Deny HTTP" }]),
    );
    expect(r.kind).toBe("retrieval-chunks");
  });

  it("tolerates unknown extra keys", () => {
    // Upstream adding a field must not blank the widget.
    const r = matchPayload(
      "kg_get_command_schema",
      JSON.stringify({ required: ["Bucket"], newFieldFromUpstream: true }),
    );
    expect(r.kind).toBe("spec-sheet");
  });
});

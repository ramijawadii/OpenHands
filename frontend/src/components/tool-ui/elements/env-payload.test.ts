/**
 * The registry gates on a schema, so an upstream shape change silently stops a
 * widget rendering. These fixtures are real env_* MCP responses -- if a tool's
 * envelope changes, this fails instead of the transcript quietly reverting to a
 * plain block.
 */
import { describe, expect, it } from "vitest";
import { matchPayload } from "./payload-dispatch";
import { mmLabel } from "./element-registry";

describe("env_* structured payloads", () => {
  it("matches env_risk_findings", () => {
    const raw = JSON.stringify({
      text: "Risk findings (>= HIGH): 1 resources",
      findings: [
        {
          severity: "CRITICAL",
          title: "public-logs",
          resource: "ES3Bucket",
          detail: {},
        },
      ],
    });
    expect(matchPayload("env_risk_findings", raw).kind).toBe("score-breakdown");
  });

  it("matches env_get_resource", () => {
    const raw = JSON.stringify({
      text: "Resource: ['EIAMUser']",
      labels: ["EIAMUser"],
      properties: { arn: "arn:aws:iam::1:user/bot", mfa_enabled: false },
      relationships: [
        {
          type: "HAS_ROLE",
          target_label: "EIAMRole",
          target_id: "arn:role/admin",
        },
      ],
    });
    expect(matchPayload("env_get_resource", raw).kind).toBe(
      "spec-sheet-resource",
    );
  });

  it("matches env_health", () => {
    const raw = JSON.stringify({
      text: "ENV GRAPH: OK",
      status: "ok",
      total: 3,
      counts: { EAccount: 1 },
      risk: { CRITICAL: 0 },
      stale: "",
    });
    expect(matchPayload("env_health", raw).kind).toBe("number-ticker-health");
  });

  it("matches env_find_paths", () => {
    const raw = JSON.stringify({
      text: "Found 1 path(s)",
      paths: [
        {
          index: 1,
          hops: 1,
          nodes: [
            { label: "EEC2Instance", id: "i-1" },
            { label: "ES3Bucket", id: "arn:s3" },
          ],
          edges: ["CAN_ACCESS"],
        },
      ],
    });
    expect(matchPayload("env_find_paths", raw).kind).toBe("attack-path");
  });

  it("matches env_summary", () => {
    const raw = JSON.stringify({
      text: "=== ENVIRONMENT INTELLIGENCE SUMMARY ===",
      layers: [],
      risk: { CRITICAL: 2, HIGH: 1, MEDIUM: 0, LOW: 0 },
      critical: [],
    });
    expect(matchPayload("env_summary", raw).kind).toBe("chart-risk");
  });

  it("matches env_find_resources and env_graph_query", () => {
    const raw = JSON.stringify({
      text: "Found 1 ES3Bucket resource(s):",
      rows: [{ id: "arn:aws:s3:::demo", name: "demo", risk: "CRITICAL" }],
      columns: ["id", "name", "risk"],
    });
    expect(matchPayload("env_find_resources", raw).kind).toBe(
      "data-table-rows",
    );
    expect(matchPayload("env_graph_query", raw).kind).toBe("data-table-rows");
  });

  it("falls back rather than guessing when the envelope is prose", () => {
    // What every env_* tool returned before 2026-08-15.
    const match = matchPayload("env_risk_findings", "No resources found");
    expect(match.kind).toBeNull();
    // `reason` lives only on the no-match branch of the union.
    if (match.kind === null) expect(match.reason).toBe("unparseable");
  });

  it("falls back when findings are absent", () => {
    const raw = JSON.stringify({ text: "No resources found", findings: [] });
    expect(matchPayload("env_risk_findings", raw).kind).toBeNull();
  });
});

describe("mermaid label sanitiser", () => {
  // In the attack-path entry a payload value becomes diagram SOURCE, not a
  // text node, so React does not escape it. A quote or bracket could close the
  // label and inject further mermaid directives, including click handlers.
  it("strips characters that could break out of a label", () => {
    const out = mmLabel('evil"] ; click x "javascript:alert(1)');
    expect(out).not.toContain('"');
    expect(out).not.toContain("]");
    expect(out).not.toContain(";");
    expect(out).not.toContain("(");
  });

  it("keeps the characters real resource names use", () => {
    expect(mmLabel("arn:aws:s3:::demo-public_logs.v2/path")).toBe(
      "arn:aws:s3:::demo-public_logs.v2/path",
    );
  });

  it("caps length so one label cannot dominate the diagram", () => {
    expect(mmLabel("x".repeat(200)).length).toBeLessThanOrEqual(40);
  });
});

describe("KB tools re-keyed onto real names", () => {
  // These entries used to name kb_search / kb_cite, which do not exist on the
  // live server. Fixtures below are real kb_* responses.
  it("kb_nist_search -> retrieval chunks", () => {
    const raw = JSON.stringify({
      query: "s3 public access",
      matches: [
        {
          value: {
            publication: "SP.800-146",
            title: "Cloud Computing Synopsis",
            locator: "4.6",
            heading: "4.6 The Public Cloud Scenario",
            excerpt: "Figure 7 depicts a public cloud.",
          },
        },
      ],
    });
    expect(matchPayload("kb_nist_search", raw).kind).toBe("retrieval-chunks");
  });

  it("kb_technique -> sources, carrying provenance and trust", () => {
    const raw = JSON.stringify({
      value: { technique: "T1078" },
      provenance: {
        source_url: "https://attack.mitre.org/techniques/T1078",
        basis: "mitre-official",
      },
      trust: { tier: "AUTHORITATIVE", confidence: 0.98 },
    });
    expect(matchPayload("kb_technique", raw).kind).toBe("sources");
  });

  it("does not fire on the tool names that never existed", () => {
    const raw = JSON.stringify({ query: "x", matches: [{ value: {} }] });
    expect(matchPayload("kb_search", raw).kind).toBeNull();
    expect(matchPayload("kb_cite", raw).kind).toBeNull();
  });
});

describe("kg_* tools converted to structured payloads", () => {
  it("kg_list_notebooks -> file tree, and the bare list_files shape still works", () => {
    const envelope = JSON.stringify({
      text: "Notebooks in /workspace (52 found):",
      files: [{ path: "chart_notebook.ipynb", size_kb: 1.9 }],
    });
    expect(matchPayload("kg_list_notebooks", envelope).kind).toBe("file-tree");
    // The older bare-array shape must keep matching: one widget, two inputs.
    const bare = JSON.stringify([{ path: "reports/posture.md" }]);
    expect(matchPayload("list_files", bare).kind).toBe("file-tree");
  });

  it("kg_search_commands -> data table", () => {
    const raw = JSON.stringify({
      text: "Found 3 command(s):",
      rows: [{ service: "s3", command: "get-bucket-policy", docs: "" }],
      columns: ["service", "command", "docs"],
    });
    expect(matchPayload("kg_search_commands", raw).kind).toBe(
      "data-table-rows",
    );
  });
});

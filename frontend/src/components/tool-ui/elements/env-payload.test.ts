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

describe("kb_* tools wired to widgets", () => {
  // Fixtures below are real responses captured from the live KB server.
  it("kb_remediation -> a remediation checklist", () => {
    const raw = JSON.stringify({
      commands: [
        {
          value: {
            remediation:
              "1. Identify a dedicated member account. 2. Navigate to AWS Organizations console. 3. Enable the delegated administrator.",
          },
        },
      ],
    });
    expect(matchPayload("kb_remediation", raw).kind).toBe(
      "todo-list-remediation",
    );
  });

  it("kb_cli_spec -> a command spec sheet", () => {
    const raw = JSON.stringify({
      value: {
        cmd: "aws s3api put-bucket-policy",
        service: "aws/s3",
        method: "PUT",
        path: "/{Bucket}?policy",
        flags: "--bucket --policy",
        summary: "Applies a policy to a bucket.",
      },
    });
    expect(matchPayload("kb_cli_spec", raw).kind).toBe("spec-sheet-cli");
  });

  it("kb_ground_control and kb_ccm_control share one entry, two envelopes", () => {
    const benchmark = JSON.stringify({
      control: "Ensure delegated admin manages AWS Organizations policies",
      benchmark: "CIS Amazon Web Services Foundations Benchmark",
      cis_v8_safeguards: ["6.8", "5.4"],
    });
    const ccm = JSON.stringify({
      value: {
        control: "IAM-01",
        name: "Identity and Access Management Policy",
        domain: "Identity & Access Management",
        caiq_questions: [
          { id: "IAM-01.1", question: "Are policies documented?" },
        ],
      },
    });
    expect(matchPayload("kb_ground_control", benchmark).kind).toBe(
      "spec-sheet-control",
    );
    expect(matchPayload("kb_ccm_control", ccm).kind).toBe("spec-sheet-control");
  });

  it("kb_map_frameworks -> a mapping table", () => {
    const raw = JSON.stringify({
      mappings: [
        { value: { framework: "ExternalControl", id: "ISO 27001:2022|8.3" } },
      ],
    });
    expect(matchPayload("kb_map_frameworks", raw).kind).toBe(
      "data-table-mappings",
    );
  });

  it("kb_coverage -> indexed page count", () => {
    const raw = JSON.stringify({
      provider: "aws",
      status: "COVERED",
      pages: 211942,
      kb_version: 6,
    });
    expect(matchPayload("kb_coverage", raw).kind).toBe(
      "number-ticker-coverage",
    );
  });

  it("kb_health -> a status sheet", () => {
    const raw = JSON.stringify({
      status: "GREEN",
      checked_at: "2026-08-16T11:36:55Z",
      version: 6,
    });
    expect(matchPayload("kb_health", raw).kind).toBe("spec-sheet-kb-health");
  });
});

describe("remediation step splitting", () => {
  it("splits on the numbering the KB uses", () => {
    const raw = JSON.stringify({
      commands: [{ value: { remediation: "1. First step. 2. Second step." } }],
    });
    const m = matchPayload("kb_remediation", raw);
    expect(m.kind).toBe("todo-list-remediation");
  });
});

describe("the last twelve kg_* / env_scan tools", () => {
  // Every fixture below is a real response captured from the live server.
  it("health-style tools share one status sheet", () => {
    expect(
      matchPayload(
        "kg_health",
        JSON.stringify({ text: "KG: GREEN", status: "GREEN", commands: 17517 }),
      ).kind,
    ).toBe("spec-sheet-status");
    expect(
      matchPayload(
        "kg_system_health",
        JSON.stringify({ text: "System health: DOWN", status: "DEGRADED" }),
      ).kind,
    ).toBe("spec-sheet-status");
    expect(
      matchPayload(
        "env_scan",
        JSON.stringify({ text: "Scanned 3 regions", status: "ok" }),
      ).kind,
    ).toBe("spec-sheet-status");
  });

  it("execute and undo report an outcome, not just prose", () => {
    expect(
      matchPayload(
        "kg_execute_command",
        JSON.stringify({ text: "ERROR: refused", executed: false }),
      ).kind,
    ).toBe("spec-sheet-status");
    expect(
      matchPayload(
        "kg_undo_last",
        JSON.stringify({
          text: "UndoStack is empty",
          undone: false,
          reason: "empty-stack",
        }),
      ).kind,
    ).toBe("spec-sheet-status");
  });

  it("job queues share one checklist", () => {
    expect(
      matchPayload(
        "kg_bg_jobs",
        JSON.stringify({
          text: "Background jobs: 1 active / 1 total",
          jobs: [
            {
              title: "scan [abc123]",
              done: false,
              status: "running",
              stuck: true,
            },
          ],
        }),
      ).kind,
    ).toBe("todo-list-jobs");
    expect(
      matchPayload(
        "kg_assessments",
        JSON.stringify({
          text: "Assessments: 1/4 running",
          jobs: [{ job_id: "a1b2c3d4", status: "running" }],
          reachable: true,
        }),
      ).kind,
    ).toBe("todo-list-jobs");
  });

  it("cell history -> timeline, enum values -> chips, notebooks -> artifact", () => {
    expect(
      matchPayload(
        "kg_cell_history",
        JSON.stringify({
          text: "Last 2 code cells",
          cells: [{ label: "import pandas as pd", at: "In[1]" }],
        }),
      ).kind,
    ).toBe("timeline-cells");
    expect(
      matchPayload(
        "kg_get_enum_values",
        JSON.stringify({
          text: "Allowed values",
          values: ["private", "public-read"],
        }),
      ).kind,
    ).toBe("memory-chips-enums");
    expect(
      matchPayload(
        "kg_save_notebook",
        JSON.stringify({
          text: "Notebook saved",
          artifact: { title: "analysis.ipynb", meta: "Notebook - 3 cells" },
        }),
      ).kind,
    ).toBe("artifact-card-notebook");
  });

  it("an empty job list falls back rather than drawing an empty checklist", () => {
    expect(
      matchPayload(
        "kg_bg_jobs",
        JSON.stringify({ text: "No background jobs", jobs: [] }),
      ).kind,
    ).toBeNull();
  });
});

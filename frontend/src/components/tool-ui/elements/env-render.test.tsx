/**
 * Renders each env_* Element from a REAL MCP response.
 *
 * matchPayload only proves a schema accepts the envelope; it says nothing
 * about whether the render function survives the data. These fixtures were
 * captured from the live server against a seeded graph, so a render that
 * throws on a real shape fails here rather than in the transcript.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ELEMENTS } from "./element-registry";
import { matchPayload } from "./payload-dispatch";

function renderTool(toolName: string, payload: unknown) {
  const match = matchPayload(toolName, JSON.stringify(payload));
  // `data` exists only on the matched branch of the union.
  if (match.kind === null) throw new Error(`no match: ${match.reason}`);
  const entry = ELEMENTS.find((e) => e.tools.includes(toolName));
  expect(entry).toBeDefined();
  return render(<>{entry!.render(match.data, { toolName })}</>);
}

describe("env_* Elements render live payloads", () => {
  it("env_risk_findings -> score breakdown", () => {
    renderTool("env_risk_findings", {
      text: "Risk findings (>= HIGH): 3 resources",
      findings: [
        {
          severity: "CRITICAL",
          title: "demo-public-logs",
          resource: "ES3Bucket",
          detail: { finding_type: "PublicBucket" },
        },
        {
          severity: "HIGH",
          title: "demo-deploy-bot",
          resource: "EIAMUser",
          detail: { finding_type: "NoMFA" },
        },
        {
          severity: "HIGH",
          title: "demo-bastion",
          resource: "EEC2Instance",
          detail: { finding_type: "IMDSv1Enabled" },
        },
      ],
    });
    expect(screen.getByText("Critical exposure")).toBeInTheDocument();
    // Posture inverts risk: 100 - (1 CRITICAL x40 + 2 HIGH x15) = 30.
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it("env_summary -> risk chart", () => {
    renderTool("env_summary", {
      text: "=== ENVIRONMENT INTELLIGENCE SUMMARY ===",
      layers: [{ layer: "Layer 0", total: 2, breakdown: { EAccount: 2 } }],
      risk: { CRITICAL: 1, HIGH: 2, MEDIUM: 1, LOW: 0 },
      critical: [
        {
          severity: "CRITICAL",
          title: "demo-public-logs",
          resource: "ES3Bucket",
        },
      ],
    });
    expect(screen.getByText("Risk distribution")).toBeInTheDocument();
    expect(screen.getByText("4 findings")).toBeInTheDocument();
    // Categories are labelled: bars alone cannot say which severity is which.
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });

  it("env_health -> resource count", () => {
    renderTool("env_health", {
      text: "ENV GRAPH: OK",
      status: "ok",
      total: 11,
      counts: { EAccount: 2 },
      risk: { CRITICAL: 1 },
      stale: "",
    });
    expect(screen.getByText("resources in graph")).toBeInTheDocument();
  });

  it("env_get_resource -> spec sheet with edges", () => {
    renderTool("env_get_resource", {
      text: "Resource: ['EEC2Instance']",
      labels: ["EEC2Instance"],
      properties: { instance_id: "i-demo0000000001", risk_level: "HIGH" },
      relationships: [
        {
          type: "CAN_ACCESS",
          target_label: "ES3Bucket",
          target_id: "arn:aws:s3:::demo-public-logs",
        },
      ],
    });
    expect(screen.getByText("EEC2Instance")).toBeInTheDocument();
    expect(screen.getByText("CAN_ACCESS")).toBeInTheDocument();
  });

  it("env_find_paths -> flow graph", () => {
    renderTool("env_find_paths", {
      text: "Found 1 path(s)",
      paths: [
        {
          index: 1,
          hops: 1,
          nodes: [
            { label: "EEC2Instance", id: "i-demo0000000001" },
            { label: "ES3Bucket", id: "arn:aws:s3:::demo-public-logs" },
          ],
          edges: ["CAN_ACCESS"],
        },
      ],
    });
    // Mermaid renders into a ref asynchronously and its container carries only
    // inline styles, so there is no source or class in the DOM to assert on.
    // The block's own affordance is the stable proof it mounted; the label
    // sanitiser is unit-tested separately.
    expect(screen.getByText("View Diagram")).toBeInTheDocument();
  });

  it("env_find_resources -> data table", () => {
    renderTool("env_find_resources", {
      text: "Found 2 resource(s):",
      rows: [
        {
          id: "arn:aws:s3:::demo-public-logs",
          name: "demo-public-logs",
          risk: "CRITICAL",
        },
        { id: "i-demo0000000001", name: "demo-bastion", risk: "HIGH" },
      ],
      columns: ["id", "name", "risk"],
    });
    // The table renders each value in both its desktop and narrow layouts, so
    // a value legitimately appears more than once.
    expect(screen.getAllByText("demo-public-logs").length).toBeGreaterThan(0);
    expect(screen.getAllByText("demo-bastion").length).toBeGreaterThan(0);
  });
});

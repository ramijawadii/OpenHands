/**
 * The registry gates on a schema, so an upstream shape change silently stops a
 * widget rendering. These fixtures are real env_* MCP responses -- if a tool's
 * envelope changes, this fails instead of the transcript quietly reverting to a
 * plain block.
 */
import { describe, expect, it } from "vitest";
import { matchPayload } from "./payload-dispatch";

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

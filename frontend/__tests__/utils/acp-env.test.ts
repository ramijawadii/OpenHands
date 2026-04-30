import { describe, it, expect } from "vitest";
import { parseAcpEnv, formatAcpEnv } from "../../src/utils/acp-env";

describe("parseAcpEnv", () => {
  it("parses KEY=value pairs", () => {
    expect(parseAcpEnv("FOO=bar\nBAZ=qux")).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  it("ignores blank lines and comments", () => {
    const input = "\n# a comment\nFOO=bar\n  \n# another\nBAZ=qux\n";
    expect(parseAcpEnv(input)).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  it("trims whitespace and strips quotes", () => {
    expect(parseAcpEnv('  KEY  =  "value"  ')).toEqual({ KEY: "value" });
    expect(parseAcpEnv("KEY='value'")).toEqual({ KEY: "value" });
  });

  it("preserves '=' inside the value", () => {
    expect(parseAcpEnv("URL=https://x?a=1&b=2")).toEqual({
      URL: "https://x?a=1&b=2",
    });
  });

  it("skips lines without '='", () => {
    expect(parseAcpEnv("not_a_line\nGOOD=ok")).toEqual({ GOOD: "ok" });
  });

  it("handles empty input", () => {
    expect(parseAcpEnv("")).toEqual({});
  });
});

describe("formatAcpEnv", () => {
  it("renders KEY=value lines", () => {
    expect(formatAcpEnv({ A: "1", B: "2" })).toBe("A=1\nB=2");
  });

  it("returns empty for null/undefined", () => {
    expect(formatAcpEnv(null)).toBe("");
    expect(formatAcpEnv(undefined)).toBe("");
    expect(formatAcpEnv({})).toBe("");
  });
});

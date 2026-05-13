import { describe, expect, it } from "vitest";
import { formatCommand, tokenizeCommand } from "#/utils/shell-tokenize";

describe("tokenizeCommand", () => {
  it("splits on runs of whitespace including newlines", () => {
    expect(tokenizeCommand("npx   -y\n@scope/pkg")).toEqual([
      "npx",
      "-y",
      "@scope/pkg",
    ]);
  });

  it("preserves arguments wrapped in double quotes", () => {
    expect(tokenizeCommand('npx -y "my pkg"')).toEqual(["npx", "-y", "my pkg"]);
  });

  it("preserves arguments wrapped in single quotes", () => {
    expect(tokenizeCommand("node 'path with spaces/cli.js' --acp")).toEqual([
      "node",
      "path with spaces/cli.js",
      "--acp",
    ]);
  });

  it("returns an empty array for whitespace-only input", () => {
    expect(tokenizeCommand("   \n\t  ")).toEqual([]);
  });
});

describe("formatCommand", () => {
  it("joins tokens with a single space when none need quoting", () => {
    expect(formatCommand(["npx", "-y", "@scope/pkg"])).toBe(
      "npx -y @scope/pkg",
    );
  });

  it("wraps tokens containing whitespace in double quotes", () => {
    expect(formatCommand(["node", "my path/cli.js", "--acp"])).toBe(
      'node "my path/cli.js" --acp',
    );
  });

  it("falls back to single quotes when a whitespace token contains a double quote", () => {
    expect(formatCommand(["echo", 'say "hi"'])).toBe(`echo 'say "hi"'`);
  });

  it("round-trips through tokenizeCommand", () => {
    const tokens = [
      "node",
      "my path/cli.js",
      "--acp",
      "--flag=value with space",
    ];
    expect(tokenizeCommand(formatCommand(tokens))).toEqual(tokens);
  });
});

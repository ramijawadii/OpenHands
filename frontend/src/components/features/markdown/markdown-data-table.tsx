import React from "react";
import { DataTable } from "#/components/tool-ui/data-table";
import type { Column } from "#/components/tool-ui/data-table/types";

/**
 * A markdown cell is text, or a number when the whole cell is one. Typing the
 * row this precisely (rather than `RowData`, whose values are `unknown`) is
 * what lets a column declare a numeric format: `FormatFor<unknown>` collapses
 * to text-only.
 */
type MarkdownCell = string | number;
type MarkdownRow = Record<string, MarkdownCell>;

/**
 * A GFM table in an agent message, rendered as `@tool-ui/data-table`.
 *
 * The agent writes tables as markdown, so what arrived here was a bare `<table>`
 * styled by the markdown stylesheet — no sorting, no alignment beyond what the
 * pipe syntax carries, and a layout that broke out of the message column as
 * soon as a row got wide. This lifts the parsed table out of the markdown AST
 * and hands it to the same component family the rest of the transcript uses.
 */

interface HastNode {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const textOf = (node?: HastNode): string => {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
};

/** All descendants with the given tag name, depth-first. */
const findAll = (node: HastNode | undefined, tag: string): HastNode[] => {
  if (!node) return [];
  const hits: HastNode[] = [];
  const walk = (n: HastNode) => {
    if (n.tagName === tag) hits.push(n);
    (n.children ?? []).forEach(walk);
  };
  walk(node);
  return hits;
};

/** GFM carries per-column alignment as an inline `text-align` style. */
const alignOf = (cell: HastNode): "left" | "right" | "center" | undefined => {
  const style = cell.properties?.style;
  if (typeof style !== "string") return undefined;
  if (style.includes("right")) return "right";
  if (style.includes("center")) return "center";
  return undefined;
};

/**
 * A cell that is a bare number should sort and align like one. Everything else
 * stays a string — we deliberately do not guess dates or currencies from text.
 */
const coerce = (raw: string): string | number => {
  const trimmed = raw.trim();
  if (!trimmed || !/^-?[\d,]*\.?\d+%?$/.test(trimmed)) return trimmed;
  const n = Number(trimmed.replace(/[,%]/g, ""));
  return Number.isFinite(n) && !trimmed.endsWith("%") ? n : trimmed;
};

export interface ParsedMarkdownTable {
  columns: Column<MarkdownRow>[];
  rows: MarkdownRow[];
}

/** Pull columns + rows out of a HAST `<table>` node, or null if it is not one. */
export function parseMarkdownTable(
  node: HastNode | undefined,
): ParsedMarkdownTable | null {
  const headCells = findAll(findAll(node, "thead")[0], "th");
  if (!headCells.length) return null;

  const headers = headCells.map(
    (c, i) => textOf(c).trim() || `Column ${i + 1}`,
  );
  // Duplicate headers would collide as row keys, so the index disambiguates.
  const keys = headers.map((h, i) => `${h || "col"}__${i}`);

  const bodyRows = findAll(findAll(node, "tbody")[0], "tr");
  const rows: MarkdownRow[] = bodyRows.map((tr) => {
    const cells = findAll(tr, "td");
    const row: MarkdownRow = {};
    keys.forEach((key, i) => {
      row[key] = coerce(textOf(cells[i]));
    });
    return row;
  });

  if (!rows.length) return null;

  const columns: Column<MarkdownRow>[] = keys.map((key, i) => ({
    key,
    label: headers[i],
    align: alignOf(headCells[i]),
    // Numeric columns right-align and sort numerically; text stays as written.
    ...(rows.some((r) => typeof r[key] === "number")
      ? { format: { kind: "number" as const } }
      : {}),
  }));

  return { columns, rows };
}

/** Tall tables scroll inside the card rather than stretching the transcript. */
const MAX_HEIGHT = "420px";

export function MarkdownDataTable({
  node,
  fallback,
}: {
  node: HastNode | undefined;
  /** The plain `<table>` react-markdown would have rendered. */
  fallback: React.ReactNode;
}): React.ReactNode {
  const parsed = React.useMemo(() => parseMarkdownTable(node), [node]);

  // A table we cannot read confidently (no header row, no body) is still a
  // table — render markdown's own rather than dropping the content.
  if (!parsed) return fallback;

  return (
    <div className="cg-tool-card my-2 w-full">
      <DataTable
        id="md-table"
        columns={parsed.columns}
        data={parsed.rows}
        maxHeight={MAX_HEIGHT}
      />
    </div>
  );
}

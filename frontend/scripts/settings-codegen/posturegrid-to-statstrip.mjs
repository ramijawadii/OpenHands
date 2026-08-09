#!/usr/bin/env node
/**
 * Platform Settings — PostureGrid → StatStripPlain codemod.
 *
 * Replaces every chromed KPI dashboard
 *   <PostureGrid><PostureCard title=… value=… tone=… sub=…/>…</PostureGrid>
 * with the sanctioned plain-tile strip
 *   <StatStripPlain items={[{ label, value, tone }, …]} />
 * — the "plain tiles everywhere" treatment (settings-kit), matching Identity &
 * Access. title→label, value/tone carried verbatim (PostureCard and
 * StatStripPlain share the tone vocabulary); `sub` / `to` / `cta` are dropped
 * (plain tiles are label + value only).
 *
 * Parses with the repo's own TypeScript compiler API (no new deps). Formatting is
 * approximate; run `eslint --fix` after. Idempotent (skips files with no
 * PostureGrid). Leaves everything else untouched.
 *
 * Usage:
 *   node scripts/settings-codegen/posturegrid-to-statstrip.mjs "<glob…>"           # dry-run
 *   node scripts/settings-codegen/posturegrid-to-statstrip.mjs "<glob…>" --write   # apply
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const STATSTRIP_IMPORT = {
  module: "#/components/admin/settings-kit",
  specifier: "StatStripPlain",
};

function tagOf(node) {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  return null;
}
function findAll(root, predicate) {
  const out = [];
  const visit = (n) => {
    if (predicate(n)) out.push(n);
    n.forEachChild(visit);
  };
  visit(root);
  return out;
}
function getAttr(el, name) {
  const opening = ts.isJsxSelfClosingElement(el) ? el : el.openingElement;
  for (const p of opening.attributes.properties) {
    if (ts.isJsxAttribute(p) && p.name.getText() === name) return p;
  }
  return null;
}
/** Object-literal value for an attribute: string literal → JSON string; `{expr}` → expr text. */
function attrValueText(attr) {
  if (!attr || !attr.initializer) return null;
  const init = attr.initializer;
  if (ts.isStringLiteral(init)) return JSON.stringify(init.text);
  if (ts.isJsxExpression(init)) return init.expression ? init.expression.getText() : null;
  return init.getText();
}

function convert(filePath, srcText) {
  if (!/\bPostureGrid\b/.test(srcText)) {
    return { status: "skip", notes: ["no PostureGrid"] };
  }
  const sf = ts.createSourceFile(filePath, srcText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const grids = findAll(sf, (n) => ts.isJsxElement(n) && tagOf(n) === "PostureGrid");
  if (grids.length === 0) return { status: "skip", notes: ["PostureGrid referenced but no element"] };

  // A PostureCard generated inside a .map()/arrow callback can't be flattened to a
  // static items array (its attrs reference the callback param), so such a grid is
  // left as-is for manual conversion (e.g. `items={rows.map(r => ({…}))}`).
  const inCallback = (node, stopAt) => {
    let p = node.parent;
    while (p && p !== stopAt) {
      if (ts.isArrowFunction(p) || ts.isFunctionExpression(p)) return true;
      p = p.parent;
    }
    return false;
  };

  const edits = [];
  let cardTotal = 0;
  const skippedGrids = [];
  for (const grid of grids) {
    // Direct PostureCard children (also catch cards nested in {cond && <PostureCard/>} via findAll).
    const cards = findAll(grid, (n) => n !== grid && tagOf(n) === "PostureCard");
    if (cards.some((c) => inCallback(c, grid))) {
      skippedGrids.push(grid);
      continue; // map-generated — leave for manual conversion
    }
    const items = cards.map((card) => {
      const label = attrValueText(getAttr(card, "title")) ?? '"—"';
      const value = attrValueText(getAttr(card, "value")) ?? '""';
      const tone = attrValueText(getAttr(card, "tone"));
      const parts = [`label: ${label}`, `value: ${value}`];
      if (tone) parts.push(`tone: ${tone}`);
      return `    { ${parts.join(", ")} },`;
    });
    cardTotal += cards.length;
    const el = `<StatStripPlain\n  items={[\n${items.join("\n")}\n  ]}\n/>`;
    edits.push({ start: grid.getStart(sf), end: grid.getEnd(), text: el });
  }

  const notes = [];
  if (skippedGrids.length) notes.push(`${skippedGrids.length} map-generated grid(s) left for manual conversion`);
  if (edits.length === 0) {
    return { status: "skip", notes: notes.length ? notes : ["no convertible PostureGrid"] };
  }

  // Ensure the StatStripPlain import (merge into an existing settings-kit import if present).
  const importDecls = findAll(sf, (n) => ts.isImportDeclaration(n));
  const existing = importDecls.find(
    (d) => ts.isStringLiteral(d.moduleSpecifier) && d.moduleSpecifier.text === STATSTRIP_IMPORT.module,
  );
  if (existing) {
    const named = existing.importClause?.namedBindings;
    if (named && ts.isNamedImports(named)) {
      const has = named.elements.some((e) => e.name.getText() === STATSTRIP_IMPORT.specifier);
      if (!has) {
        const brace = named.getStart(sf) + 1;
        edits.push({ start: brace, end: brace, text: ` ${STATSTRIP_IMPORT.specifier},` });
      }
    }
  } else {
    const adminKit = importDecls.find(
      (d) => ts.isStringLiteral(d.moduleSpecifier) && d.moduleSpecifier.text === "#/components/admin/admin-kit",
    );
    const anchor = (adminKit ?? importDecls[importDecls.length - 1])?.getEnd() ?? 0;
    edits.push({
      start: anchor,
      end: anchor,
      text: `\nimport { ${STATSTRIP_IMPORT.specifier} } from "${STATSTRIP_IMPORT.module}";`,
    });
  }

  edits.sort((a, b) => b.start - a.start);
  let out = srcText;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return {
    status: "convert",
    output: out,
    gridCount: grids.length - skippedGrids.length,
    cardTotal,
    notes,
  };
}

function expandGlobs(args) {
  const files = [];
  for (const a of args) {
    if (a.includes("*")) {
      const dir = path.dirname(a);
      const pat = path.basename(a).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      const re = new RegExp(`^${pat}$`);
      if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (re.test(f)) files.push(path.join(dir, f));
    } else if (fs.existsSync(a)) {
      files.push(a);
    }
  }
  return [...new Set(files)];
}

function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  const files = expandGlobs(argv.filter((a) => !a.startsWith("--")));
  if (files.length === 0) {
    console.error("No files matched. Usage: posturegrid-to-statstrip.mjs <glob…> [--write]");
    process.exit(2);
  }
  let converted = 0;
  let skipped = 0;
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    let res;
    try {
      res = convert(file, src);
    } catch (err) {
      res = { status: "skip", notes: [`ERROR: ${err.message}`] };
    }
    const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
    if (res.status === "convert") {
      converted += 1;
      if (write) fs.writeFileSync(file, res.output, "utf8");
      console.log(
        `${write ? "WROTE  " : "CONVERT"} ${rel}  (${res.gridCount} grid → ${res.cardTotal} tiles)${res.notes?.length ? "  ⚠ " + res.notes.join("; ") : ""}`,
      );
    } else {
      skipped += 1;
      console.log(`SKIP    ${rel}  — ${res.notes.join("; ")}`);
    }
  }
  console.log(`\n${write ? "Wrote" : "Would convert"} ${converted} · skipped ${skipped}`);
  if (!write && converted) console.log("Re-run with --write to apply, then `eslint --fix` the touched files.");
  process.exit(0);
}

main();

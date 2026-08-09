#!/usr/bin/env node
/**
 * Strip named reference/explainer blocks from admin pages.
 *
 * Removes every <Card>/<Section> whose title is in REMOVE_TITLES (the flow / tree /
 * hierarchy / ownership / delegation / comparison / behavior / relationship
 * "explainer" blocks), together with the smallest fully-dead surrounding wrapper
 * (a layout div/Card/Section, or a `{cond && ( … )}` branch), and deletes any
 * component whose entire render was one of those blocks (recursively). Leaves each
 * page as its operational surface: KPI stat strip + toolbar + filters + table +
 * detail drawer.
 *
 * Parses with the repo's TypeScript. Run eslint --fix after; box-diagram helper
 * components that become unused are surfaced by eslint and removed in a cleanup.
 *
 * Usage: node scripts/settings-codegen/strip-titled-blocks.mjs "<glob…>" [--write]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const REMOVE_TITLES = new Set([
  "Template inheritance",
  "Environment comparison",
  "Template hierarchy",
  "Operational lifecycle & relationships",
  "Ownership model",
  "Enterprise delegation model",
  "Hierarchy tree",
  "Hierarchy visualization",
  "Inheritance preview",
  "Hierarchy validation",
  "Operational relationships",
  "Operational relationships & permissions",
  "Lifecycle flow",
  "Lifecycle & suspension behavior",
  "Archive types",
  "Retention policies",
  "Archive behavior",
  "Archive vs Suspension",
  "Decommission behavior",
  "Decommission checklist",
  "Lifecycle comparison",
]);
const BLOCK_TAGS = new Set(["Card", "Section"]);
const LAYOUT_TAGS = new Set(["Card", "Section", "div", "span", "React.Fragment", ""]);

function tagOf(n) {
  if (ts.isJsxElement(n)) return n.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(n)) return n.tagName.getText();
  return null;
}
function findAll(root, pred) {
  const out = [];
  const visit = (n) => {
    if (pred(n)) out.push(n);
    n.forEachChild(visit);
  };
  visit(root);
  return out;
}
function getAttr(el, name) {
  const opening = ts.isJsxSelfClosingElement(el) ? el : el.openingElement;
  for (const p of opening.attributes.properties)
    if (ts.isJsxAttribute(p) && p.name.getText() === name) return p;
  return null;
}
function titleOf(el) {
  const a = getAttr(el, "title");
  if (a && a.initializer && ts.isStringLiteral(a.initializer)) return a.initializer.text;
  return null;
}
function isTargetBlock(n) {
  return (
    (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) &&
    BLOCK_TAGS.has(tagOf(n)) &&
    REMOVE_TITLES.has(titleOf(n))
  );
}
function isWs(node) {
  return ts.isJsxText(node) && /^\s*$/.test(node.text);
}
function isDeadJsx(node, dead) {
  if (!node) return true;
  if (isWs(node)) return true;
  if (ts.isParenthesizedExpression(node)) return isDeadJsx(node.expression, dead);
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    if (isTargetBlock(node)) return true;
    const t = tagOf(node);
    if (dead.has(t)) return true;
    if (LAYOUT_TAGS.has(t)) {
      const kids = ts.isJsxElement(node) ? node.children : [];
      return kids.every((c) => isDeadJsx(c, dead));
    }
    return false;
  }
  if (ts.isJsxFragment(node)) return node.children.every((c) => isDeadJsx(c, dead));
  if (ts.isJsxExpression(node)) {
    if (!node.expression) return true;
    const e = node.expression;
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
      return isDeadJsx(e.right, dead);
    return false;
  }
  return false;
}
function returnedJsx(fn) {
  if (!fn.body || !ts.isBlock(fn.body)) return null;
  const ret = fn.body.statements.find((s) => ts.isReturnStatement(s));
  return ret && ret.expression ? ret.expression : null;
}
function computeDeadSet(sf) {
  const dead = new Set();
  const fns = findAll(sf, (n) => ts.isFunctionDeclaration(n) && n.name).filter((f) =>
    /^[A-Z]/.test(f.name.getText()),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of fns) {
      const name = f.name.getText();
      if (dead.has(name)) continue;
      const r = returnedJsx(f);
      const hasTarget =
        findAll(f, (n) => isTargetBlock(n)).length > 0 ||
        findAll(f, (n) => (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) && dead.has(tagOf(n)))
          .length > 0;
      if (r && hasTarget && isDeadJsx(r, dead)) {
        dead.add(name);
        changed = true;
      }
    }
  }
  return dead;
}
function removalNode(node, dead) {
  let target = node;
  while (target.parent) {
    const p = target.parent;
    if ((ts.isJsxElement(p) || ts.isJsxFragment(p)) && isDeadJsx(p, dead)) {
      target = p;
      continue;
    }
    break;
  }
  let n = target;
  while (n.parent && ts.isParenthesizedExpression(n.parent)) n = n.parent;
  if (
    n.parent &&
    ts.isBinaryExpression(n.parent) &&
    n.parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
    n.parent.right === n
  ) {
    let be = n.parent;
    while (be.parent && ts.isParenthesizedExpression(be.parent)) be = be.parent;
    if (be.parent && ts.isJsxExpression(be.parent)) return be.parent;
  }
  return target;
}

function convert(filePath, src) {
  const sf = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const targets = findAll(sf, (n) => isTargetBlock(n));
  const dead = computeDeadSet(sf);
  const defs = findAll(sf, (n) => ts.isFunctionDeclaration(n) && n.name && dead.has(n.name.getText()));
  if (targets.length === 0 && defs.length === 0) return { status: "skip" };

  const inRemovedDef = (n) => defs.some((d) => n.getStart(sf) >= d.getStart(sf) && n.getEnd() <= d.getEnd());
  const usages = findAll(
    sf,
    (n) => (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) && dead.has(tagOf(n)),
  ).filter((n) => !inRemovedDef(n));
  const blockTargets = targets.filter((n) => !inRemovedDef(n));

  const raw = [];
  for (const t of [...blockTargets, ...usages]) {
    const node = removalNode(t, dead);
    raw.push({ start: node.getStart(sf), end: node.getEnd() });
  }
  for (const d of defs) {
    let start = d.getStart(sf);
    const fullStart = d.getFullStart();
    const lead = src.slice(fullStart, start);
    const m = lead.match(/\n(\/\/[^\n]*\n)+\s*$/);
    if (m) start = fullStart + lead.lastIndexOf(m[0]) + 1;
    let end = d.getEnd();
    while (end < src.length && src[end] !== "\n") end += 1;
    if (src[end] === "\n") end += 1;
    raw.push({ start, end });
  }
  raw.sort((a, b) => a.start - b.start || b.end - a.end);
  const ranges = [];
  for (const r of raw) {
    const last = ranges[ranges.length - 1];
    if (last && r.start < last.end) last.end = Math.max(last.end, r.end);
    else ranges.push({ ...r });
  }
  ranges.sort((a, b) => b.start - a.start);
  let out = src;
  for (const r of ranges) out = out.slice(0, r.start) + out.slice(r.end);
  return { status: "convert", output: out, blocks: blockTargets.length, defs: defs.length };
}

function expandGlobs(args) {
  const files = [];
  for (const a of args) {
    if (a.includes("*")) {
      const dir = path.dirname(a);
      const re = new RegExp(
        `^${path.basename(a).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`,
      );
      if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (re.test(f)) files.push(path.join(dir, f));
    } else if (fs.existsSync(a)) files.push(a);
  }
  return [...new Set(files)];
}

function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  const files = expandGlobs(argv.filter((a) => !a.startsWith("--")));
  if (!files.length) {
    console.error("No files matched. Usage: strip-titled-blocks.mjs <glob…> [--write]");
    process.exit(2);
  }
  let n = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    let res;
    try {
      res = convert(f, src);
    } catch (e) {
      res = { status: "skip", note: `ERROR: ${e.message}` };
    }
    const rel = path.relative(process.cwd(), f).replace(/\\/g, "/");
    if (res.status === "convert") {
      n += 1;
      if (write) fs.writeFileSync(f, res.output, "utf8");
      console.log(`${write ? "WROTE  " : "STRIP  "} ${rel}  (${res.blocks} block, ${res.defs} def)`);
    } else if (res.note) console.log(`SKIP    ${rel}  — ${res.note}`);
  }
  console.log(`\n${write ? "Wrote" : "Would strip"} ${n} file(s)`);
  process.exit(0);
}

main();

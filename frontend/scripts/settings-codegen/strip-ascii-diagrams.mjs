#!/usr/bin/env node
/**
 * Strip ASCII-art diagram blocks from admin pages.
 *
 * Removes every usage of the hand-rolled ASCII flow/graph/tree components
 * (Viz, AsciiFlow, LifecycleFlow, LifecycleFlowCard, FlowChain) together with the
 * smallest sensible surrounding block, and deletes the now-dead component
 * definitions. For each usage:
 *   - if its nearest enclosing <Card>/<Section> holds it as the sole element child,
 *     the whole Card/Section is removed;
 *   - if that block sits in a `{cond && ( … )}` branch, the whole branch is removed;
 *   - otherwise just the element is removed.
 *
 * Parses with the repo's TypeScript. Formatting is approximate; run eslint --fix
 * after. Empty view-branches / orphan nav entries left behind are surfaced by
 * tsc/eslint and fixed by hand.
 *
 * Usage: node scripts/settings-codegen/strip-ascii-diagrams.mjs "<glob…>" [--write]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const ASCII_TAGS = new Set(["Viz", "AsciiFlow", "LifecycleFlow", "LifecycleFlowCard", "FlowChain"]);
const WRAPPER_TAGS = new Set(["Card", "Section"]);
// Tags that are pure layout wrappers: a wrapper is "dead" iff all its children are.
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
function elementChildren(el) {
  if (!ts.isJsxElement(el)) return [];
  return el.children.filter((c) => ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c));
}

// ── Dead-component analysis: a component that renders ONLY dead diagrams is dead ──
function isWs(node) {
  return ts.isJsxText(node) && /^\s*$/.test(node.text);
}
function isDeadJsx(node, dead) {
  if (!node) return true;
  if (isWs(node)) return true;
  if (ts.isParenthesizedExpression(node)) return isDeadJsx(node.expression, dead);
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
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
    if (!node.expression) return true; // {/* comment */} / whitespace
    let e = node.expression;
    if (
      ts.isBinaryExpression(e) &&
      e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    )
      return isDeadJsx(e.right, dead);
    return false; // any other expression is real content
  }
  return false;
}
function returnedJsx(fn) {
  if (!fn.body || !ts.isBlock(fn.body)) return null;
  const ret = fn.body.statements.find((s) => ts.isReturnStatement(s));
  return ret && ret.expression ? ret.expression : null;
}
function containsDeadTag(fn, dead) {
  return (
    findAll(fn, (n) => (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) && dead.has(tagOf(n)))
      .length > 0
  );
}
function computeDeadSet(sf) {
  const dead = new Set(ASCII_TAGS);
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
      if (r && containsDeadTag(f, dead) && isDeadJsx(r, dead)) {
        dead.add(name);
        changed = true;
      }
    }
  }
  return dead;
}

// Resolve the node whose range we should delete for a given diagram usage.
function removalNode(usage, dead) {
  // Climb to the nearest Card/Section wrapper all of whose element children are dead.
  let target = usage;
  let p = usage.parent;
  while (p) {
    if ((ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p)) && WRAPPER_TAGS.has(tagOf(p))) {
      const kids = elementChildren(p);
      if (kids.length >= 1 && kids.every((k) => dead.has(tagOf(k)))) {
        target = p;
        p = p.parent;
        continue;
      }
    }
    break;
  }
  // If target sits in `{cond && ( target )}`, remove the whole JsxExpression.
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
  if (![...ASCII_TAGS].some((t) => new RegExp(`\\b${t}\\b`).test(src)))
    return { status: "skip" };
  const sf = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const dead = computeDeadSet(sf);

  const defs = findAll(
    sf,
    (n) => ts.isFunctionDeclaration(n) && n.name && dead.has(n.name.getText()),
  );
  const inRemovedDef = (n) => defs.some((d) => n.getStart(sf) >= d.getStart(sf) && n.getEnd() <= d.getEnd());
  // Usages of any dead tag, excluding those inside a def we're deleting wholesale.
  const usages = findAll(
    sf,
    (n) => (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) && dead.has(tagOf(n)),
  ).filter((n) => !inRemovedDef(n));
  if (usages.length === 0 && defs.length === 0) return { status: "skip" };

  // Build removal ranges (dedup + drop ranges contained in a larger removal).
  const raw = [];
  for (const u of usages) {
    const node = removalNode(u, dead);
    raw.push({ start: node.getStart(sf), end: node.getEnd() });
  }
  for (const d of defs) {
    // include a leading `// …` comment block and one trailing blank line
    let start = d.getStart(sf);
    const fullStart = d.getFullStart();
    const lead = src.slice(fullStart, start);
    const mComment = lead.match(/\n(\/\/[^\n]*\n)+\s*$/);
    if (mComment) start = fullStart + lead.lastIndexOf(mComment[0]) + 1;
    let end = d.getEnd();
    while (end < src.length && src[end] !== "\n") end += 1;
    if (src[end] === "\n") end += 1;
    raw.push({ start, end });
  }
  raw.sort((a, b) => a.start - b.start || b.end - a.end);
  const ranges = [];
  for (const r of raw) {
    const last = ranges[ranges.length - 1];
    if (last && r.start < last.end) {
      last.end = Math.max(last.end, r.end); // merge/contain
    } else {
      ranges.push({ ...r });
    }
  }

  ranges.sort((a, b) => b.start - a.start);
  let out = src;
  for (const r of ranges) out = out.slice(0, r.start) + out.slice(r.end);
  return { status: "convert", output: out, usages: usages.length, defs: defs.length };
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
    console.error("No files matched. Usage: strip-ascii-diagrams.mjs <glob…> [--write]");
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
      console.log(`${write ? "WROTE  " : "STRIP  "} ${rel}  (${res.usages} usage, ${res.defs} def)`);
    } else if (res.note) {
      console.log(`SKIP    ${rel}  — ${res.note}`);
    }
  }
  console.log(`\n${write ? "Wrote" : "Would strip"} ${n} file(s)`);
  process.exit(0);
}

main();

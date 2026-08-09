#!/usr/bin/env node
/**
 * Platform Settings — unwrap a Card-wrapped StatStripPlain into the bare KPI strip.
 *
 * The sanctioned page KPI strip is a small-caps label + a bare <StatStripPlain>
 * (no Card chrome), as on Provisioning Queue / Shared Workspaces. Some leaves still
 * wrap the strip in a <Card title=… desc=…> (e.g. after the PostureGrid sweep left
 * the strip inside its old dashboard Card). This rewrites
 *   <Card title=T desc=… right={<SampleTag/>}><StatStripPlain …/></Card>
 * to
 *   <div class=label>T <SampleTag/></div>
 *   <div marginBottom:18><StatStripPlain …/></div>
 *
 * Only fires when the Card's sole element child is a StatStripPlain (so aux Cards
 * are untouched). Parses with the repo's TypeScript. Idempotent; run eslint --fix
 * after.
 *
 * Usage: node scripts/settings-codegen/unwrap-statstrip-card.mjs "<glob…>" [--write]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const LABEL_STYLE =
  '{{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 10 }}';

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

function convert(filePath, src) {
  if (!/StatStripPlain/.test(src)) return { status: "skip", note: "no StatStripPlain" };
  const sf = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hasSampleTag = /\bSampleTag\b/.test(src);

  const cards = findAll(sf, (n) => ts.isJsxElement(n) && tagOf(n) === "Card");
  const edits = [];
  for (const card of cards) {
    const elemChildren = card.children.filter(
      (c) => ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c),
    );
    if (elemChildren.length !== 1) continue;
    const only = elemChildren[0];
    if (tagOf(only) !== "StatStripPlain") continue;

    const titleAttr = getAttr(card, "title");
    let title = "Operational dashboard";
    if (titleAttr && titleAttr.initializer) {
      if (ts.isStringLiteral(titleAttr.initializer)) title = titleAttr.initializer.text;
      else if (ts.isJsxExpression(titleAttr.initializer))
        title = titleAttr.initializer.getText(); // keep {expr}
    }
    const titleNode = title.startsWith("{") ? title : JSON.stringify(title).slice(1, -1);
    const sample = hasSampleTag ? " <SampleTag />" : "";
    const strip = only.getText();

    const replacement =
      `<div style=${LABEL_STYLE}>\n  ${titleNode}${sample}\n</div>\n` +
      `<div style={{ marginBottom: 18 }}>\n  ${strip}\n</div>`;
    edits.push({ start: card.getStart(sf), end: card.getEnd(), text: replacement });
  }

  if (edits.length === 0) return { status: "skip", note: "no Card-wrapped StatStripPlain" };
  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return { status: "convert", output: out, count: edits.length };
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
    console.error("No files matched. Usage: unwrap-statstrip-card.mjs <glob…> [--write]");
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
      console.log(`${write ? "WROTE  " : "UNWRAP "} ${rel}  (${res.count})`);
    }
  }
  console.log(`\n${write ? "Wrote" : "Would unwrap"} ${n} file(s)`);
  process.exit(0);
}

main();

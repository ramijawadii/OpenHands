#!/usr/bin/env node
/**
 * Platform Settings — leaf conversion engine.
 *
 * Converts a bespoke admin leaf page (the legacy
 *   <Card><CommandBar/><FilterBar>…Selects…</FilterBar><DirectoryTable …/></Card>
 * shape) onto the packaged framework's <DiscoveryListView> — the exact,
 * deterministic recipe documented in
 *   docs/design/platform-settings-ui-patterns-kit.md
 * and applied by hand across Identity & Access and Workspace Management.
 *
 * It parses each file with the TypeScript compiler API to locate the *main-list*
 * Card (the one Card whose subtree directly holds a CommandBar, a FilterBar and a
 * DirectoryTable — which structurally excludes aux dashboards and drawer-embedded
 * FilterBars), then rewrites only that region and injects the small amount of
 * state the framework needs. Everything else — aux Cards, visualizations, the
 * detail drawer, sample data — is left byte-for-byte untouched.
 *
 * Formatting is intentionally approximate: the pipeline runs `eslint --fix`
 * (Prettier) afterwards, so the engine optimizes for *correctness of the AST
 * rewrite*, not whitespace.
 *
 * Usage:
 *   node scripts/settings-codegen/convert-leaf.mjs <glob…>            # dry-run (default)
 *   node scripts/settings-codegen/convert-leaf.mjs <glob…> --write    # apply in place
 *   node scripts/settings-codegen/convert-leaf.mjs <glob…> --diff     # dry-run + show new element
 *
 * Exit code: 0 if every matched file converted or was already-converted; 1 if any
 * file was SKIPPED (ambiguous / unsupported) so CI can gate on a clean sweep.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// Resolve the repo's own TypeScript (no new dependency added).
const require = createRequire(import.meta.url);
const ts = require("typescript");

const IMPORTS = [
  { module: "#/components/admin/discovery-kit", specifier: "DiscoveryListView" },
  { module: "#/components/admin/settings-kit", specifier: "ColumnChooser" },
];

// ───────────────────────── AST helpers ─────────────────────────

function tagOf(node) {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  return null;
}

/** Collect JSX elements matching `tag` within `root`, without descending into a
 *  nested element whose tag is in `stopTags` (so a Card's search never leaks into
 *  a nested Card). `root` itself is not tested. */
function collectWithin(root, tag, stopTags = []) {
  const out = [];
  const visit = (node, isRoot) => {
    if (!isRoot) {
      const t = tagOf(node);
      if (t === tag) out.push(node);
      if (t && stopTags.includes(t)) return; // don't descend past a boundary tag
    }
    node.forEachChild((c) => visit(c, false));
  };
  visit(root, true);
  return out;
}

function findAll(sourceFile, predicate) {
  const out = [];
  const visit = (node) => {
    if (predicate(node)) out.push(node);
    node.forEachChild(visit);
  };
  visit(sourceFile);
  return out;
}

function getAttr(el, name) {
  const opening = ts.isJsxSelfClosingElement(el) ? el : el.openingElement;
  for (const p of opening.attributes.properties) {
    if (ts.isJsxAttribute(p) && p.name.getText() === name) return p;
  }
  return null;
}

/** Raw initializer text of an attribute: `"str"` | `{expr}` | "" (bare boolean). */
function attrInit(attr) {
  if (!attr || !attr.initializer) return "";
  return attr.initializer.getText();
}

/** Inner expression text of a `{expr}` attribute (no braces); StringLiteral → its text. */
function attrExpr(attr) {
  if (!attr || !attr.initializer) return "";
  const init = attr.initializer;
  if (ts.isJsxExpression(init)) return init.expression ? init.expression.getText() : "";
  if (ts.isStringLiteral(init)) return init.text;
  return init.getText();
}

function stringLiteralValue(attr) {
  if (!attr || !attr.initializer) return null;
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
  return null;
}

// label → camelCase pill key. "Business Unit" → "businessUnit".
function slugKey(label) {
  const words = String(label)
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/);
  if (words.length === 0) return "filter";
  return (
    words[0].toLowerCase() +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("")
  );
}

// ───────────────────────── core conversion ─────────────────────────

function convert(filePath, srcText) {
  const notes = [];
  const sf = ts.createSourceFile(filePath, srcText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  // Already on the framework?
  if (/DiscoveryListView/.test(srcText)) {
    return { status: "already", notes: ["already imports DiscoveryListView"] };
  }

  // Find the main-list Card: a Card whose subtree (not crossing into a nested
  // Card) contains a CommandBar, a FilterBar and a DirectoryTable.
  const cards = findAll(sf, (n) => ts.isJsxElement(n) && tagOf(n) === "Card");
  const candidates = cards.filter((card) => {
    const cbs = collectWithin(card, "CommandBar", ["Card"]);
    const fbs = collectWithin(card, "FilterBar", ["Card"]);
    const dts = collectWithin(card, "DirectoryTable", ["Card"]);
    return cbs.length >= 1 && fbs.length >= 1 && dts.length >= 1;
  });

  if (candidates.length === 0) {
    return { status: "skip", notes: ["no main-list Card (CommandBar+FilterBar+DirectoryTable)"] };
  }
  if (candidates.length > 1) {
    return { status: "skip", notes: [`ambiguous: ${candidates.length} candidate Cards`] };
  }

  const card = candidates[0];

  // Safety: the main-list Card must hold ONLY the toolbar/filter/table primitives.
  // If it also wraps other UI (e.g. a graph's layer-toggle chips, an inline
  // visualization), replacing the whole Card would delete that UI — so refuse and
  // leave the page for manual conversion. We check the Card's *direct* JSX element
  // children against the allow-list.
  const ALLOWED_CARD_CHILDREN = new Set(["CommandBar", "FilterBar", "DirectoryTable"]);
  const strayChild = card.children.find((c) => {
    if (!ts.isJsxElement(c) && !ts.isJsxSelfClosingElement(c)) return false;
    return !ALLOWED_CARD_CHILDREN.has(tagOf(c));
  });
  if (strayChild) {
    return {
      status: "skip",
      notes: [`main-list Card wraps extra UI <${tagOf(strayChild)}> — convert by hand`],
    };
  }

  const commandBar = collectWithin(card, "CommandBar", ["Card"])[0];
  const filterBar = collectWithin(card, "FilterBar", ["Card"])[0];
  const table = collectWithin(card, "DirectoryTable", ["Card"])[0];

  // FilterBar children: only <Select> become pills. Any *other* JSX child element
  // (a view-switcher, a custom toggle) means we'd silently drop UI → skip for
  // manual review. This is what excludes the graph/history leaves.
  const selects = [];
  let foreignChild = null;
  if (ts.isJsxElement(filterBar)) {
    for (const child of filterBar.children) {
      if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
        const t = tagOf(child);
        if (t === "Select") selects.push(child);
        else foreignChild = t;
      }
    }
  }
  if (foreignChild) {
    return { status: "skip", notes: [`FilterBar has non-Select child <${foreignChild}> (view-switcher?)`] };
  }
  if (selects.length === 0) {
    notes.push("FilterBar has no Select filters — pills=[]");
  }

  // ── Gather the pieces ──
  const cardTitle = getAttr(card, "title");
  const cardDesc = getAttr(card, "desc");
  const titleInit = attrInit(cardTitle);
  const descInit = attrInit(cardDesc);
  const titleStr = stringLiteralValue(cardTitle);

  const cbItems = attrInit(getAttr(commandBar, "items")); // `{toolbar}`

  const fbSearch = attrInit(getAttr(filterBar, "search"));
  const fbOnSearch = attrInit(getAttr(filterBar, "onSearch"));
  const fbPlaceholder = attrInit(getAttr(filterBar, "searchPlaceholder"));
  const fbCount = attrInit(getAttr(filterBar, "count"));
  const fbOnClear = attrExpr(getAttr(filterBar, "onClear")) || "() => {}";

  const pills = selects.map((sel) => {
    const label = stringLiteralValue(getAttr(sel, "label")) ?? "Filter";
    const value = attrExpr(getAttr(sel, "value"));
    const onChange = attrExpr(getAttr(sel, "onChange"));
    const options = attrExpr(getAttr(sel, "options"));
    return { key: slugKey(label), label, value, onChange, options };
  });
  // De-duplicate pill keys (two "Type" filters → type, type2).
  const seen = new Map();
  for (const p of pills) {
    const n = seen.get(p.key) ?? 0;
    seen.set(p.key, n + 1);
    if (n > 0) p.key = `${p.key}${n + 1}`;
  }

  // DirectoryTable attributes → carried verbatim except `columns`.
  const tableOpening = ts.isJsxSelfClosingElement(table) ? table : table.openingElement;
  let colsExpr = "cols";
  const carried = [];
  for (const p of tableOpening.attributes.properties) {
    if (!ts.isJsxAttribute(p)) {
      carried.push(p.getText());
      continue;
    }
    const name = p.name.getText();
    if (name === "columns") {
      colsExpr = attrExpr(p) || "cols";
      continue; // replaced below
    }
    carried.push(p.initializer ? `${name}=${p.initializer.getText()}` : name);
  }

  // ── Assemble the replacement element ──
  const q = (s) => s; // initializer text already carries its quotes/braces
  const lines = [];
  lines.push(`<DiscoveryListView`);
  if (titleInit) lines.push(`  title=${q(titleInit)}`);
  if (descInit) lines.push(`  desc=${q(descInit)}`);
  if (cbItems) lines.push(`  commands=${cbItems}`);
  if (fbSearch) lines.push(`  search=${fbSearch}`);
  if (fbOnSearch) lines.push(`  onSearch=${fbOnSearch}`);
  if (fbPlaceholder) lines.push(`  searchPlaceholder=${fbPlaceholder}`);
  if (fbCount) lines.push(`  count=${fbCount}`);

  const pillText = pills
    .map(
      (p) =>
        `    { key: ${JSON.stringify(p.key)}, label: ${JSON.stringify(p.label)}, value: ${p.value}, onChange: ${p.onChange}, options: ${p.options} },`,
    )
    .join("\n");
  lines.push(`  pills={[\n${pillText}\n  ]}`);

  const presetLabel = titleStr ? `All ${titleStr.toLowerCase()}` : "All";
  lines.push(`  presets={[{ label: ${JSON.stringify(presetLabel)}, onApply: ${fbOnClear} }]}`);
  lines.push(
    `  filterRightSlot={<ColumnChooser cols={${colsExpr}} hidden={hidden} onToggle={toggleCol} />}`,
  );
  lines.push(`  columns={${colsExpr}.filter((c) => !hidden.has(c.key))}`);
  for (const attr of carried) lines.push(`  ${attr}`);
  lines.push(`/>`);
  const newElement = lines.join("\n");

  // ── Build the edit list (apply high→low so offsets stay valid) ──
  const edits = [];
  edits.push({ start: card.getStart(sf), end: card.getEnd(), text: newElement });

  // Inject hidden/toggleCol after the selection-id useState.
  const selIdStmt =
    findAll(sf, (n) => ts.isVariableStatement(n) && /setSelId\b/.test(n.getText()))[0] ??
    findAll(
      sf,
      (n) => ts.isVariableStatement(n) && /React\.useState<string \| null>\(null\)/.test(n.getText()),
    )[0];
  if (selIdStmt) {
    const inject =
      "\n  const [hidden, setHidden] = React.useState<Set<string>>(new Set());" +
      "\n  const toggleCol = (k: string) =>" +
      "\n    setHidden((s) => {" +
      "\n      const n = new Set(s);" +
      "\n      if (n.has(k)) n.delete(k);" +
      "\n      else n.add(k);" +
      "\n      return n;" +
      "\n    });";
    edits.push({ start: selIdStmt.getEnd(), end: selIdStmt.getEnd(), text: inject });
  } else {
    notes.push("no selId useState found — hidden/toggleCol NOT injected (add manually)");
  }

  // Remove the now-dead `const hasFilters = …;` (+ trailing whitespace/newline).
  const hasFilters = findAll(
    sf,
    (n) => ts.isVariableStatement(n) && /\bhasFilters\b/.test(n.declarationList.getText()),
  )[0];
  if (hasFilters) {
    let end = hasFilters.getEnd();
    while (end < srcText.length && srcText[end] !== "\n") end += 1;
    if (srcText[end] === "\n") end += 1;
    edits.push({ start: hasFilters.getStart(sf), end, text: "" });
  }

  // Ensure framework imports (merge into an existing import from the module if present).
  const importDecls = findAll(sf, (n) => ts.isImportDeclaration(n));
  const adminKitImport = importDecls.find(
    (d) => ts.isStringLiteral(d.moduleSpecifier) && d.moduleSpecifier.text === "#/components/admin/admin-kit",
  );
  const importAnchorEnd = (adminKitImport ?? importDecls[importDecls.length - 1])?.getEnd() ?? 0;

  for (const { module, specifier } of IMPORTS) {
    const existing = importDecls.find(
      (d) => ts.isStringLiteral(d.moduleSpecifier) && d.moduleSpecifier.text === module,
    );
    if (existing) {
      const named = existing.importClause?.namedBindings;
      if (named && ts.isNamedImports(named)) {
        const has = named.elements.some((e) => e.name.getText() === specifier);
        if (!has) {
          // insert `specifier, ` after the opening brace
          const brace = named.getStart(sf) + 1; // just past `{`
          edits.push({ start: brace, end: brace, text: ` ${specifier},` });
        }
      }
    } else {
      edits.push({
        start: importAnchorEnd,
        end: importAnchorEnd,
        text: `\nimport { ${specifier} } from "${module}";`,
      });
    }
  }

  // Apply edits high→low.
  edits.sort((a, b) => b.start - a.start);
  let out = srcText;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);

  return { status: "convert", output: out, notes, newElement, pillCount: pills.length };
}

// ───────────────────────── CLI ─────────────────────────

function expandGlobs(args) {
  // Minimal glob: supports `dir/*.tsx` and explicit files. Keeps deps at zero.
  const files = [];
  for (const a of args) {
    if (a.includes("*")) {
      const dir = path.dirname(a);
      const pat = path.basename(a).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      const re = new RegExp(`^${pat}$`);
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) if (re.test(f)) files.push(path.join(dir, f));
      }
    } else if (fs.existsSync(a)) {
      files.push(a);
    }
  }
  return [...new Set(files)];
}

function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  const showDiff = argv.includes("--diff");
  // Conformance gate: fail (exit 1) if any admin page still uses the legacy
  // main-list pattern, so CI can require the whole surface stay on the framework.
  const check = argv.includes("--check");
  const globs = argv.filter((a) => !a.startsWith("--"));
  const files = expandGlobs(globs);

  if (files.length === 0) {
    console.error("No files matched. Usage: convert-leaf.mjs <glob…> [--write | --diff | --check]");
    process.exit(2);
  }

  const summary = { convert: [], already: [], skip: [] };
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
      summary.convert.push(rel);
      if (write) fs.writeFileSync(file, res.output, "utf8");
      const tag = check ? "LEGACY " : write ? "WROTE  " : "CONVERT";
      console.log(`${tag} ${rel}  (${res.pillCount} pills)${res.notes.length ? "  ⚠ " + res.notes.join("; ") : ""}`);
      if (showDiff) console.log("\n" + res.newElement + "\n");
    } else if (res.status === "already") {
      summary.already.push(rel);
      if (!check) console.log(`ALREADY ${rel}`);
    } else {
      summary.skip.push(rel);
      console.log(`SKIP    ${rel}  — ${res.notes.join("; ")}`);
    }
  }

  if (check) {
    console.log(
      `\nConformance: ${summary.already.length} on-framework · ${summary.convert.length} LEGACY · ${summary.skip.length} manual/bespoke`,
    );
    if (summary.convert.length) {
      console.log(`✖ ${summary.convert.length} page(s) still on the legacy main-list. Run the engine with --write.`);
      process.exit(1);
    }
    console.log("✓ No legacy main-list pages.");
    process.exit(0);
  }

  console.log(
    `\n${write ? "Wrote" : "Would convert"} ${summary.convert.length} · already ${summary.already.length} · skipped ${summary.skip.length}`,
  );
  if (!write && summary.convert.length) console.log("Re-run with --write to apply, then `eslint --fix` the touched files.");
  // Non-check runs succeed regardless of skips (skips are intentional bespoke pages).
  process.exit(0);
}

main();

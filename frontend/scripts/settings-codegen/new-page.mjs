#!/usr/bin/env node
/**
 * Platform Settings — new-page scaffolder.
 *
 * Rolls a brand-new settings/admin leaf page straight onto the framework, as a
 * declarative `SettingsTabConfig` rendered by `<SettingsTab>` (settings-kit.tsx).
 * The generated page has search, facet-pill filters, KPI stat strip, Choose
 * columns, pagination, bulk/row actions and a row-click entity drawer — all
 * wired by the renderer, so a new surface *cannot* drift from the house style.
 *
 * Input is a tiny JSON/JS spec (or inline flags for the common case). The heavy
 * concepts — how filtering, pills, columns-hiding, the drawer and presets are
 * wired — live once in <SettingsTab>; the page only declares its shape.
 *
 * Usage:
 *   node scripts/settings-codegen/new-page.mjs --spec path/to/spec.json
 *   node scripts/settings-codegen/new-page.mjs \
 *        --dir src/components/admin/pages/workspace-operations \
 *        --name capacity-planning --title "Capacity planning" \
 *        --columns name,region,owner,status --filters region,status,owner
 *
 * Writes <dir>/<name>.tsx (refuses to overwrite unless --force). Run
 * `eslint --fix` on the result afterwards.
 */
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { columns: [], filters: [], force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--force") args.force = true;
    else if (a === "--spec") args.spec = argv[++i];
    else if (a === "--dir") args.dir = argv[++i];
    else if (a === "--name") args.name = argv[++i];
    else if (a === "--title") args.title = argv[++i];
    else if (a === "--desc") args.desc = argv[++i];
    else if (a === "--columns") args.columns = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--filters") args.filters = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
  }
  return args;
}

function pascal(s) {
  return String(s)
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}
function title(s) {
  const t = String(s).replace(/[^a-zA-Z0-9]+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function render(spec) {
  const Comp = pascal(spec.name) + "View";
  const Rec = pascal(spec.name) + "Record";
  const cols = spec.columns.length ? spec.columns : ["name", "status"];
  const filters = spec.filters.length ? spec.filters : cols.slice(1, 4);
  const displayTitle = spec.title || title(spec.name);
  const desc = spec.desc || `${displayTitle} — describe the surface here.`;

  const recordFields = cols.map((c) => `  ${c}: string;`).join("\n");
  const sampleRow = (i) =>
    `  { id: ${JSON.stringify(`ID-${1000 + i}`)}, ${cols
      .map((c) => `${c}: ${JSON.stringify(`${title(c)} ${i + 1}`)}`)
      .join(", ")} }`;
  const sample = Array.from({ length: 6 }, (_, i) => sampleRow(i)).join(",\n");

  const columnDefs = cols
    .map(
      (c) =>
        `  { key: ${JSON.stringify(c)}, header: ${JSON.stringify(title(c))}, render: (r) => r.${c} }`,
    )
    .join(",\n");

  const filterDefs = filters
    .map((f) => `    { key: ${JSON.stringify(f)}, label: ${JSON.stringify(title(f))} }`)
    .join(",\n");

  const drawerSections = cols
    .slice(0, 3)
    .map(
      (c) =>
        `        {\n          label: ${JSON.stringify(title(c))},\n          render: () => <div style={{ fontSize: 13 }}>{r.${c}}</div>,\n        }`,
    )
    .join(",\n");

  return `/* eslint-disable i18next/no-literal-string -- generated settings page; replace SAMPLE_${Rec.toUpperCase()} with the live query */
import React from "react";
import {
  SettingsTab,
  EntityDrawer,
  type SettingsTabConfig,
} from "#/components/admin/settings-kit";
import { HeaderButton, type Column } from "#/components/admin/admin-kit";
import { Download, Plus } from "lucide-react";

/**
 * ${displayTitle} — a Platform Settings leaf page.
 *
 * Authored as a declarative config (\`SettingsTabConfig\`) and rendered by
 * <SettingsTab>. All layout, filtering, pills, column-hiding, pagination and the
 * detail drawer are owned by the renderer — this file only declares the shape.
 * Swap SAMPLE_${Rec.toUpperCase()} for the live query when the backend lands; the API stays identical.
 */

interface ${Rec} {
  id: string;
${recordFields}
}

// Representative sample data (tag with a Sample chip in the UI if you surface it).
const SAMPLE_${Rec.toUpperCase()}: ${Rec}[] = [
${sample},
];

const columns: Column<${Rec}>[] = [
${columnDefs},
];

const config: SettingsTabConfig<${Rec}> = {
  title: ${JSON.stringify(displayTitle)},
  desc: ${JSON.stringify(desc)},
  searchPlaceholder: ${JSON.stringify(`Search ${displayTitle.toLowerCase()}…`)},
  commands: [
    { key: "new", label: "New", icon: <Plus size={13} />, primary: true, onClick: () => {} },
    { key: "export", label: "Export", icon: <Download size={13} />, onClick: () => {} },
  ],
  filters: [
${filterDefs},
  ],
  columns,
  pageSize: 12,
  bulk: (ids, clear) => (
    <>
      <HeaderButton icon={<Download size={13} />} onClick={clear}>
        Export ({ids.length})
      </HeaderButton>
    </>
  ),
  rowMenu: (r, open) => [
    { label: "View", onClick: open },
    { label: "Edit", onClick: open },
  ],
  drawer: (r, close) => (
    <EntityDrawer
      title={r.${cols[0]}}
      onClose={close}
      sections={[
${drawerSections},
      ]}
    />
  ),
};

export function ${Comp}() {
  return <SettingsTab<${Rec}> config={config} rows={SAMPLE_${Rec.toUpperCase()}} />;
}
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let spec = args;
  if (args.spec) {
    const raw = JSON.parse(fs.readFileSync(args.spec, "utf8"));
    spec = { ...raw, force: args.force, dir: raw.dir || args.dir, columns: raw.columns || [], filters: raw.filters || [] };
  }
  if (!spec.name || !spec.dir) {
    console.error("Required: --name and --dir (or a --spec JSON with name + dir).");
    process.exit(2);
  }
  const outPath = path.join(spec.dir, `${spec.name}.tsx`);
  if (fs.existsSync(outPath) && !spec.force) {
    console.error(`Refusing to overwrite ${outPath} (pass --force).`);
    process.exit(2);
  }
  fs.mkdirSync(spec.dir, { recursive: true });
  fs.writeFileSync(outPath, render(spec), "utf8");
  console.log(`Scaffolded ${outPath}`);
  console.log(`Next: register the view in its module shell, then \`eslint --fix ${outPath}\`.`);
}

main();

/**
 * File-type artwork registry.
 *
 * One table maps an extension (or a folder name) to a PNG under
 * `/filetypes/`. Everything that draws a file — tiles, the table, the details
 * panel, the trash — resolves through `artFor()`, so adding a format is one row
 * here rather than an edit in four components that would inevitably drift.
 *
 * PNG rather than the inline SVG this replaced: the set is authored art with a
 * consistent style, and reproducing it as hand-written paths would neither match
 * nor survive the next addition. They are served from the app origin as ordinary
 * static assets, so the CSP is satisfied and the browser caches them.
 *
 * UNKNOWN IS DELIBERATE. A format with no entry gets `unkown.png`, not a
 * document icon — a file the surface cannot identify should look unidentified,
 * because guessing "probably a document" is how a .exe ends up wearing a Word
 * icon.
 */

const BASE = "/filetypes";

/** Extension → asset. Lower-case, no leading dot. */
const BY_EXTENSION: Record<string, string> = {
  // office
  doc: "word.png",
  docx: "word.png",
  odt: "word.png",
  rtf: "word.png",
  xls: "excel.png",
  xlsx: "excel.png",
  ods: "excel.png",
  csv: "excel.png",
  tsv: "excel.png",
  ppt: "powerpoint.png",
  pptx: "powerpoint.png",
  odp: "powerpoint.png",
  pdf: "pdf.png",

  // text the agent actually writes
  md: "file.png",
  markdown: "file.png",
  txt: "text.png",
  rst: "text.png",
  adoc: "text.png",
  nfo: "text.png",
  text: "text.png",
  log: "file-1.png",

  // diagrams — `structure.png` is a node graph, which is what these are
  drawio: "structure.png",
  mmd: "structure.png",
  mermaid: "structure.png",
  vsdx: "structure.png",
  svg: "structure.png",

  // typesetting
  tex: "latex.png",
  latex: "latex.png",
  bib: "latex.png",
  cls: "latex.png",
  sty: "latex.png",

  // code and config
  py: "python.png",
  ipynb: "python.png",
  json: "log-file.png",
  yaml: "log-file.png",
  yml: "log-file.png",
  toml: "log-file.png",
  ini: "log-file.png",
  cfg: "log-file.png",
  conf: "log-file.png",
  sh: "log-file.png",
  bash: "log-file.png",
  ps1: "log-file.png",
  js: "log-file.png",
  ts: "log-file.png",
  tsx: "log-file.png",
  jsx: "log-file.png",
  go: "log-file.png",
  rs: "log-file.png",
  java: "log-file.png",
  rb: "log-file.png",
  html: "log-file.png",
  css: "log-file.png",
  xml: "log-file.png",

  // infrastructure — worth their own marks in a cloud-security console, where
  // spotting a Kubernetes manifest in a folder of YAML is the whole point
  tf: "docker.png",
  tfvars: "docker.png",
  dockerfile: "docker.png",

  // data
  sql: "database.png",
  db: "database.png",
  sqlite: "database.png",
  parquet: "database.png",

  // images — screenshots are evidence in this product, so every raster format
  // an analyst might attach gets the same photo mark rather than falling
  // through to `unkown.png`
  png: "photo.png",
  jpg: "photo.png",
  jpeg: "photo.png",
  gif: "photo.png",
  webp: "photo.png",
  bmp: "photo.png",
  avif: "photo.png",
  ico: "photo.png",
  tif: "photo.png",
  tiff: "photo.png",
  heic: "photo.png",
  heif: "photo.png",
  jfif: "photo.png",

  // archives
  zip: "zip.png",
  tar: "zip.png",
  gz: "zip.png",
  tgz: "zip.png",
  bz2: "zip.png",
  xz: "zip.png",
  "7z": "zip.png",
  rar: "zip.png",
};

/** Whole filenames that carry meaning regardless of extension. Checked before
 *  the extension table, because `Dockerfile` and `docker-compose.yml` are the
 *  file people are looking for and a generic YAML mark hides them. */
const BY_FILENAME: Record<string, string> = {
  dockerfile: "docker.png",
  "docker-compose.yml": "docker.png",
  "docker-compose.yaml": "docker.png",
  ".dockerignore": "docker.png",
};

/** Folder names that earn a distinct mark. Everything else is a plain folder —
 *  a library where every folder looks different is noise, not information. */
const BY_FOLDER: Record<string, string> = {
  reports: "documents.png",
  report: "documents.png",
  documents: "documents.png",
  docs: "documents.png",
  evidence: "documents.png",
  findings: "documents.png",

  src: "folder-code.png",
  code: "folder-code.png",
  scripts: "folder-code.png",
  notebooks: "folder-code.png",

  config: "folder-management.png",
  settings: "folder-management.png",
  policies: "folder-management.png",
  manifests: "folder-management.png",

  k8s: "kubernetes.png",
  kubernetes: "kubernetes.png",
  helm: "kubernetes.png",

  archive: "zip.png",
  archives: "zip.png",
  history: "history.png",
  trash: "delete-folder.png",
  deleted: "delete-folder.png",
};

export const PHOTO_ART = `${BASE}/photo.png`;
export const FOLDER_ART = `${BASE}/folder.png`;
export const FOLDER_OPEN_ART = `${BASE}/folder-1.png`;
export const UNKNOWN_ART = `${BASE}/unkown.png`;
export const TRASH_ART = `${BASE}/delete-folder.png`;
export const HISTORY_ART = `${BASE}/history.png`;
export const DOCUMENTS_ART = `${BASE}/documents.png`;

export function baseNameOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

export function extensionOf(path: string): string {
  const name = baseNameOf(path);
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

/**
 * The asset URL for one entry. `kind` decides folder vs file first, because a
 * directory called `report.docx` is still a directory.
 */
export function artFor(path: string, kind: string): string {
  const name = baseNameOf(path).toLowerCase();
  if (kind === "dir") {
    return `${BASE}/${BY_FOLDER[name] ?? "folder.png"}`;
  }
  const byName = BY_FILENAME[name];
  if (byName) return `${BASE}/${byName}`;
  const art = BY_EXTENSION[extensionOf(path)];
  return `${BASE}/${art ?? "unkown.png"}`;
}

/**
 * Whether an extension is one the agent authors as a deliverable.
 *
 * Used by the Activity view: "agent activity" in this product means the agent
 * PRODUCED OR CHANGED an artifact — a report, a spreadsheet, a deck, a diagram —
 * not that it called a tool. A feed of `mcp_call` rows is a runtime trace; a
 * feed of "the agent rewrote finding-3.docx" is what someone reviewing the
 * agent's work actually needs to see.
 */
const AUTHORED = new Set([
  "doc",
  "docx",
  "odt",
  "rtf",
  "xls",
  "xlsx",
  "ods",
  "csv",
  "ppt",
  "pptx",
  "odp",
  "pdf",
  "md",
  "markdown",
  "tex",
  "drawio",
  "mmd",
  "mermaid",
  "svg",
  "ipynb",
  "json",
  "yaml",
  "yml",
  "png",
  "jpg",
  "jpeg",
]);

export function isAuthoredArtifact(resource: string): boolean {
  return AUTHORED.has(extensionOf(resource));
}

/* eslint-disable i18next/no-literal-string */
import React from "react";
import {
  FileTerminal,
  Table2,
  Plug,
  FolderTree,
  FileJson,
  FileText,
  FileSpreadsheet,
  ScrollText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Plus,
} from "lucide-react";
import { cn } from "#/utils/utils";
import Jupyter from "#/routes/jupyter-tab";
import SpreadSheet from "#/components/features/office-viewer/SpreadSheet";

/** Data Analysis — the analyst workspace. One tab, four views:
 *  Jupyter (notebook) · Sheet (spreadsheet) · Data Connector (cloud ingestion
 *  catalog) · File Systems (input/output data by type). */

type View = "jupyter" | "sheet" | "connector" | "files";

const VIEWS: {
  id: View;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "jupyter", label: "Jupyter", icon: FileTerminal },
  { id: "sheet", label: "Sheet", icon: Table2 },
  { id: "connector", label: "Data Connector", icon: Plug },
  { id: "files", label: "File Systems", icon: FolderTree },
];

function ViewSwitcher({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-[var(--cg-border-subtle)] px-3 py-1.5">
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] transition-colors",
            view === id
              ? "bg-[var(--cg-bg-card)] text-[var(--cg-text-primary)]"
              : "text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)] hover:text-[var(--cg-text-primary)]",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Data Connector view ──────────────────────────────────────────────────────

type Connector = {
  name: string;
  provider: "aws" | "gcp" | "azure" | "k8s" | "saas";
  kind: string;
  connected: boolean;
};

const CONNECTORS: { group: string; items: Connector[] }[] = [
  {
    group: "AWS",
    items: [
      { name: "CloudTrail", provider: "aws", kind: "audit logs", connected: true },
      { name: "S3 Inventory", provider: "aws", kind: "object store", connected: true },
      { name: "GuardDuty", provider: "aws", kind: "findings", connected: false },
      { name: "Config", provider: "aws", kind: "resource state", connected: false },
      { name: "VPC Flow Logs", provider: "aws", kind: "network", connected: false },
    ],
  },
  {
    group: "GCP",
    items: [
      { name: "Cloud Audit Logs", provider: "gcp", kind: "audit logs", connected: false },
      { name: "GCS", provider: "gcp", kind: "object store", connected: false },
      { name: "BigQuery", provider: "gcp", kind: "warehouse", connected: false },
      { name: "SCC", provider: "gcp", kind: "findings", connected: false },
    ],
  },
  {
    group: "Azure",
    items: [
      { name: "Activity Log", provider: "azure", kind: "audit logs", connected: false },
      { name: "Blob Storage", provider: "azure", kind: "object store", connected: false },
      { name: "Defender", provider: "azure", kind: "findings", connected: false },
    ],
  },
  {
    group: "Platform / SaaS",
    items: [
      { name: "Kubernetes Audit", provider: "k8s", kind: "audit logs", connected: false },
      { name: "Splunk", provider: "saas", kind: "SIEM", connected: false },
      { name: "Snowflake", provider: "saas", kind: "warehouse", connected: false },
    ],
  },
];

const PROVIDER_TONE: Record<Connector["provider"], string> = {
  aws: "text-amber-400",
  gcp: "text-sky-400",
  azure: "text-blue-400",
  k8s: "text-indigo-400",
  saas: "text-emerald-400",
};

function DataConnectorView() {
  return (
    <div className="cg-scroll h-full w-full overflow-y-auto px-3 py-3">
      <p className="mb-3 text-[11px] text-[var(--cg-text-muted)]">
        Catalog of cloud data sources to ingest for analysis. Connect a source to
        pull its data into the notebook and sheets.
      </p>
      <div className="flex flex-col gap-4">
        {CONNECTORS.map((g) => (
          <div key={g.group} className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium tracking-wider text-[var(--cg-text-nav)] uppercase">
              {g.group}
            </span>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {g.items.map((c) => (
                <div
                  key={`${g.group}:${c.name}`}
                  className="flex items-center gap-2 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-2.5 py-1.5"
                >
                  <Plug className={cn("h-3.5 w-3.5 shrink-0", PROVIDER_TONE[c.provider])} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-[var(--cg-text-primary)]">
                      {c.name}
                    </p>
                    <p className="truncate text-[10.5px] text-[var(--cg-text-muted)]">
                      {c.kind}
                    </p>
                  </div>
                  {c.connected ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
                      <Check className="h-3 w-3" />
                      connected
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-[var(--cg-border-subtle)] px-2 py-0.5 text-[10.5px] text-[var(--cg-text-nav)] transition-colors hover:border-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)]"
                    >
                      <Plus className="h-3 w-3" />
                      Connect
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── File Systems view ────────────────────────────────────────────────────────

type FsFile = { name: string; type: "json" | "csv" | "pdf" | "log" | "other"; size: string };

const INPUT_FILES: FsFile[] = [
  { name: "prowler.json", type: "json", size: "1.2 MB" },
  { name: "cloudtrail-90d.json", type: "json", size: "48 MB" },
  { name: "iam-inventory.csv", type: "csv", size: "310 KB" },
  { name: "vpc-flow.log", type: "log", size: "12 MB" },
];
const OUTPUT_FILES: FsFile[] = [
  { name: "event-analysis.csv", type: "csv", size: "6 KB" },
  { name: "findings.csv", type: "csv", size: "9 KB" },
  { name: "assessment-report.pdf", type: "pdf", size: "1.2 KB" },
];

const TYPE_ICON: Record<FsFile["type"], React.ComponentType<{ className?: string }>> = {
  json: FileJson,
  csv: FileSpreadsheet,
  pdf: FileText,
  log: ScrollText,
  other: FileText,
};

function FileList({ files }: { files: FsFile[] }) {
  // group by type
  const groups = files.reduce<Record<string, FsFile[]>>((acc, f) => {
    (acc[f.type] ??= []).push(f);
    return acc;
  }, {});
  return (
    <div className="flex flex-col gap-3">
      {Object.entries(groups).map(([type, items]) => {
        const Icon = TYPE_ICON[type as FsFile["type"]];
        return (
          <div key={type} className="flex flex-col gap-1">
            <span className="text-[10px] tracking-wide text-[var(--cg-text-muted)] uppercase">
              {type}
            </span>
            {items.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-2 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-2.5 py-1.5"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--cg-text-muted)]" />
                <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-[var(--cg-text-primary)]">
                  {f.name}
                </span>
                <span className="shrink-0 text-[10.5px] tabular-nums text-[var(--cg-text-muted)]">
                  {f.size}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function FileSystemsView() {
  return (
    <div className="cg-scroll h-full w-full overflow-y-auto px-3 py-3">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <ArrowDownToLine className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-[10px] font-medium tracking-wider text-[var(--cg-text-nav)] uppercase">
              Input data
            </span>
          </div>
          <FileList files={INPUT_FILES} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <ArrowUpFromLine className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] font-medium tracking-wider text-[var(--cg-text-nav)] uppercase">
              Output artifacts
            </span>
          </div>
          <FileList files={OUTPUT_FILES} />
        </div>
      </div>
    </div>
  );
}

// ── tab ──────────────────────────────────────────────────────────────────────

function DataAnalysisTab() {
  const [view, setView] = React.useState<View>("jupyter");

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--cg-bg-page)]">
      <ViewSwitcher view={view} onChange={setView} />
      <div className="min-h-0 flex-1">
        {/* Jupyter stays MOUNTED across view switches so kernel/cell state is not
            lost when the user peeks at another view; others mount lazily. */}
        <div className={cn("h-full", view === "jupyter" ? "block" : "hidden")}>
          <Jupyter />
        </div>
        {view === "sheet" && (
          <div className="h-full">
            {/* a named scratch sheet so autosave + Save-to-workspace work */}
            <SpreadSheet filename="analysis.csv" savePath="pages/analysis.csv" />
          </div>
        )}
        {view === "connector" && <DataConnectorView />}
        {view === "files" && <FileSystemsView />}
      </div>
    </div>
  );
}

export default DataAnalysisTab;

/* eslint-disable i18next/no-literal-string -- evidence ledger */
/**
 * Evidence.
 *
 * The pane answers three questions in the order an auditor asks them, and the
 * order matters more than the contents:
 *
 * 1. **Is it complete?** — coverage against the lifecycle. This is first
 *    because it is the only question whose answer can be "no", and a reader
 *    who scrolls a list of present artifacts will never discover an absent one.
 * 2. **What obligation does it discharge?** — coverage by control. The same
 *    ledger indexed the way a request actually arrives ("show me CIS AWS 4.1").
 * 3. **What is in it?** — the records themselves, each one openable.
 *
 * The previous version had only (3), as a flat table with a subtitle claiming
 * "WORM, hash-chained" and a Verify button that could not fail. Everything a
 * reader would need in order to *rely* on the evidence — where it came from,
 * who touched it, what stops it being deleted, why it is kept for seven years —
 * was absent, so the pane asserted trustworthiness rather than showing it.
 */
import React from "react";
import {
  Check,
  CircleDot,
  Copy,
  Download,
  Eye,
  FileJson,
  Lock,
  Package,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { useTheme } from "#/context/theme-context";
import {
  eventsThemeFor,
  APP_FONT,
} from "#/components/features/explore/cloudguard-grid/theme";
import { FilterSelect } from "#/components/features/explore/cloudguard-grid/FilterSelect";
import {
  NestedNav,
  Section,
  Row,
  IconRow,
  Pill,
  StepTag,
} from "./RemediationPanes";
import type { RemediationAction } from "./remediation-data";
import {
  buildEvidenceLedger,
  exportEvidenceBundle,
  exportEvidenceRecord,
  CATEGORY_MEANING,
  type EvidenceRecord,
} from "./remediation-evidence-data";

const mono: React.CSSProperties = {
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
};

const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 26,
  padding: "0 9px",
  fontSize: 12,
  fontFamily: APP_FONT,
  cursor: "pointer",
};

const ALL = { value: "All", label: "All" };

/* ------------------------------------------------------------------ *
 * Pane
 * ------------------------------------------------------------------ */

export function EvidencePane({
  action,
  onOpenRecord,
}: {
  action: RemediationAction;
  onOpenRecord?: (record: EvidenceRecord) => void;
}) {
  const { theme } = useTheme();
  const items = React.useMemo(() => buildEvidenceLedger(action), [action]);

  const [msg, setMsg] = React.useState<string | null>(null);
  const [stage, setStage] = React.useState("All");
  const [category, setCategory] = React.useState("All");
  const [kind, setKind] = React.useState("All");
  const [source, setSource] = React.useState("All");
  const [hold, setHold] = React.useState("All");

  React.useEffect(() => {
    if (!msg) return undefined;
    const t = window.setTimeout(() => setMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [msg]);

  const rows = items.filter(
    (it) =>
      (stage === "All" || it.stageLabel === stage) &&
      (category === "All" || it.category === category) &&
      (kind === "All" || it.kind === kind) &&
      (source === "All" || it.source === source) &&
      (hold === "All" ||
        (hold === "Legal hold" && it.legalHold) ||
        (hold === "Redacted" && it.redacted) ||
        (hold === "Unrestricted" && !it.legalHold && !it.redacted)),
  );

  const uniq = (fn: (it: EvidenceRecord) => string) => [
    ALL,
    ...[...new Set(items.map(fn))].sort().map((v) => ({ value: v, label: v })),
  ];

  const gridTheme = eventsThemeFor(theme);
  const cols = React.useMemo<ColDef<EvidenceRecord>[]>(
    () => [
      { field: "chainIndex", headerName: "#", width: 52 },
      { field: "name", headerName: "Artifact", flex: 1, minWidth: 190 },
      // The taxonomy group. Coarse on purpose — it is the column a reader
      // sorts by when the question is "what kind of proof is this", before
      // they care which of the forty artifacts it happens to be.
      { field: "category", headerName: "Category", width: 108 },
      { field: "kind", headerName: "Kind", width: 158 },
      {
        field: "stage",
        headerName: "Stage",
        width: 74,
        // The join to the lifecycle. Without it the table is a file list; with
        // it, every row says which step of the work produced it.
        valueFormatter: (p) => (p.value ? `${p.value}` : "—"),
      },
      {
        colId: "controls",
        headerName: "Evidences",
        width: 172,
        valueGetter: (p) =>
          p.data?.controls.map((c) => `${c.framework} ${c.ref}`).join(", ") ??
          "",
      },
      {
        field: "collectedAt",
        headerName: "Collected",
        width: 122,
        valueFormatter: (p) =>
          p.value instanceof Date
            ? p.value.toISOString().replace("T", " ").slice(0, 16)
            : "—",
      },
      {
        colId: "retention",
        headerName: "Retained until",
        width: 122,
        valueGetter: (p) =>
          p.data ? p.data.retention.until.toISOString().slice(0, 10) : "",
      },
      {
        colId: "flags",
        headerName: "Restrictions",
        width: 116,
        valueGetter: (p) =>
          !p.data
            ? ""
            : [
                p.data.legalHold ? "legal hold" : "",
                p.data.redacted ? "redacted" : "",
              ]
                .filter(Boolean)
                .join(" · ") || "—",
      },
    ],
    [],
  );

  return (
    /*
     * Records is the whole pane.
     *
     * The coverage sections and the integrity bar sat above the table and
     * pushed it down; a wrapping `Section` around the only thing in a view is
     * chrome that can only ever hide what the reader came for. Without them the
     * grid also takes the full height instead of a fixed 260px window, which is
     * what a list of unknown length needs.
     *
     * Coverage and chain verification are not lost — both are computed for, and
     * carried by, the exported bundle.
     */
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            marginRight: 4,
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--cg-text-primary)",
          }}
        >
          <FileJson size={13} style={{ color: "var(--cg-text-muted)" }} />
          <StepTag>Records</StepTag>
        </span>
        <FilterSelect
          variant="tab"
          label="Stage"
          value={stage}
          onChange={setStage}
          options={uniq((it) => it.stageLabel)}
        />
        <FilterSelect
          variant="tab"
          label="Category"
          value={category}
          onChange={(v) => {
            setCategory(v);
            // The kind list is about to change under it; a kind from the old
            // category would silently filter everything out.
            setKind("All");
          }}
          options={uniq((it) => it.category)}
        />
        <FilterSelect
          variant="tab"
          label="Kind"
          value={kind}
          onChange={setKind}
          // Narrowed by the chosen category — offering "Exit codes" while the
          // filter says Changes would produce an empty table and no clue why.
          options={[
            ALL,
            ...[
              ...new Set(
                items
                  .filter(
                    (it) => category === "All" || it.category === category,
                  )
                  .map((it) => it.kind),
              ),
            ]
              .sort()
              .map((v) => ({ value: v, label: v })),
          ]}
        />
        <FilterSelect
          variant="tab"
          label="Source"
          value={source}
          onChange={setSource}
          options={uniq((it) => it.source)}
        />
        <FilterSelect
          variant="tab"
          label="Restrictions"
          value={hold}
          onChange={setHold}
          options={[
            ALL,
            { value: "Legal hold", label: "Legal hold" },
            { value: "Redacted", label: "Redacted" },
            { value: "Unrestricted", label: "Unrestricted" },
          ]}
        />
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              color: "var(--cg-text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {rows.length} of {items.length}
          </span>
          <button
            type="button"
            className="cg-report-action cg-report-action-primary"
            onClick={() => {
              const r = exportEvidenceBundle(action, items);
              setMsg(
                r.ok
                  ? `Exported to ${r.filename}`
                  : `Export failed — ${r.error}`,
              );
            }}
            style={btn}
          >
            <Package size={12} /> Export bundle
          </button>
        </span>
      </div>

      {msg && (
        <div
          role="status"
          style={{
            marginBottom: 8,
            flexShrink: 0,
            fontSize: 11.5,
            color: msg.startsWith("Export failed")
              ? "var(--cgx-critical)"
              : "var(--cg-text-muted)",
          }}
        >
          {msg}
        </div>
      )}

      <div className="cg-scroll" style={{ flex: 1, minHeight: 180 }}>
        <AgGridReact<EvidenceRecord>
          theme={gridTheme}
          headerHeight={24}
          rowHeight={28}
          defaultColDef={{
            sortable: true,
            resizable: false,
            suppressMovable: true,
          }}
          rowData={rows}
          columnDefs={cols}
          getRowId={(p) => p.data.id}
          onRowClicked={(e) => e.data && onOpenRecord?.(e.data)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * One record
 * ------------------------------------------------------------------ */

/**
 * A single artifact, with the four things that make it evidence.
 *
 * Custody and retention are given their own sections rather than squeezed into
 * table columns because both are arguments, not values: "collected by a
 * read-only role, over TLS, into a Compliance-mode lock that expires in 2033"
 * is a chain of reasoning a reviewer either accepts or attacks, and it has to
 * be readable as a whole.
 */
export function EvidenceRecordView({
  action,
  record,
  onBack,
}: {
  action: RemediationAction;
  record: EvidenceRecord;
  onBack: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!msg) return undefined;
    const t = window.setTimeout(() => setMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [msg]);

  const json = JSON.stringify(
    {
      id: record.id,
      name: record.name,
      category: record.category,
      kind: record.kind,
      stage: record.stage,
      sha256: record.sha256,
      chainIndex: record.chainIndex,
      prevHash: record.prevHash,
      chainHash: record.chainHash,
      custody: record.custody,
      retention: {
        ...record.retention,
        until: record.retention.until.toISOString(),
      },
      controls: record.controls,
    },
    null,
    2,
  );

  return (
    <div className="cg-nested" style={{ color: "var(--cg-text-primary)" }}>
      <NestedNav
        trail={[
          { label: "Evidence", onClick: onBack },
          { label: record.stageLabel },
        ]}
        current={record.name}
        right={
          <>
            <button
              type="button"
              className="cg-report-action"
              onClick={() => {
                navigator.clipboard?.writeText(record.sha256);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1400);
              }}
              style={btn}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy SHA-256"}
            </button>
            <button
              type="button"
              className="cg-report-action cg-report-action-primary"
              onClick={() => {
                const r = exportEvidenceRecord(action, record);
                setMsg(
                  r.ok
                    ? `Exported to ${r.filename}`
                    : `Export failed — ${r.error}`,
                );
              }}
              style={btn}
            >
              <Download size={12} /> Download record
            </button>
          </>
        }
      />

      <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>
        <span style={mono}>{record.name}</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 5,
          marginBottom: 14,
          fontSize: 12,
          color: "var(--cg-text-muted)",
        }}
      >
        <span style={mono}>{record.id}</span>
        <span>·</span>
        <span>{record.category}</span>
        <span>·</span>
        <span>{record.kind}</span>
        <span>·</span>
        <span>{(record.bytes / 1024).toFixed(1)} KB</span>
        {record.redacted && (
          <Pill color="var(--cgx-high)" icon={<Eye size={9} />}>
            redacted
          </Pill>
        )}
        {record.legalHold && (
          <Pill color="var(--cgx-critical)" icon={<Lock size={9} />}>
            legal hold
          </Pill>
        )}
      </div>

      {msg && (
        <div
          role="status"
          style={{
            marginBottom: 10,
            fontSize: 11.5,
            color: msg.startsWith("Export failed")
              ? "var(--cgx-critical)"
              : "var(--cg-text-muted)",
          }}
        >
          {msg}
        </div>
      )}

      <Section title="Classification" icon={<FileJson size={12} />} open>
        <IconRow label="Category" icon={<CircleDot size={11} />}>
          {record.category}
          <span style={{ color: "var(--cg-text-muted)", marginLeft: 6 }}>
            — {CATEGORY_MEANING[record.category]}
          </span>
        </IconRow>
        <Row label="Kind" value={record.kind} />
        <Row label="Format" value={record.format} />
        <Row
          label="Produced by"
          value={`Stage ${record.stage} · ${record.stageLabel}`}
        />
      </Section>

      <Section title="Integrity" icon={<ShieldCheck size={12} />} open>
        <Row label="Algorithm" value="SHA-256" />
        <Row
          label="Content digest"
          value={
            <span style={{ ...mono, wordBreak: "break-all" }}>
              {record.sha256}
            </span>
          }
        />
        <Row label="Chain position" value={`#${record.chainIndex}`} />
        <Row
          label="Previous link"
          value={
            <span style={{ ...mono, wordBreak: "break-all" }}>
              {record.prevHash}
            </span>
          }
        />
        <Row
          label="This link"
          value={
            <span style={{ ...mono, wordBreak: "break-all" }}>
              {record.chainHash}
            </span>
          }
        />
      </Section>

      <Section title="Chain of custody" icon={<Lock size={12} />} open>
        <IconRow label="Collected by" icon={<CircleDot size={11} />}>
          {record.custody.collectedBy} ({record.custody.actorType})
        </IconRow>
        <Row label="Collected from" value={record.custody.from} />
        <Row label="Authorization" value={record.custody.authorization} />
        <Row label="Transfer" value={record.custody.transfer} />
        <Row
          label="Collected at"
          value={record.collectedAt
            .toISOString()
            .replace("T", " ")
            .slice(0, 16)}
        />
      </Section>

      <Section title="Retention & immutability" icon={<Scale size={12} />} open>
        <Row label="Policy" value={record.retention.name} />
        <IconRow
          label="Lock mode"
          icon={
            <Lock
              size={11}
              color={
                record.retention.mode === "Compliance"
                  ? "var(--cgx-low)"
                  : "var(--cgx-high)"
              }
            />
          }
        >
          {record.retention.mode}
          <span style={{ color: "var(--cg-text-muted)", marginLeft: 6 }}>
            {record.retention.mode === "Compliance"
              ? "— cannot be shortened or deleted by anyone, including root"
              : "— a named privileged role can shorten this"}
          </span>
        </IconRow>
        <Row label="Retained for" value={`${record.retention.years} years`} />
        <Row
          label="Retained until"
          value={record.retention.until.toISOString().slice(0, 10)}
        />
        <Row label="Clock set by" value={record.retention.basis} />
        <Row
          label="Legal hold"
          value={
            record.legalHold ? "Active — overrides expiry until lifted" : "None"
          }
        />
      </Section>

      <Section
        title="Controls evidenced"
        icon={<Scale size={12} />}
        count={record.controls.length}
        open
      >
        {record.controls.map((c) => (
          <Row
            key={`${c.framework} ${c.ref}`}
            label={`${c.framework} ${c.ref}`}
            value={c.title}
          />
        ))}
      </Section>

      <Section title="Record" icon={<FileJson size={12} />}>
        <pre
          className="cg-scroll"
          style={{
            ...mono,
            margin: 0,
            padding: 10,
            maxHeight: 320,
            overflow: "auto",
            border: "1px solid var(--cg-border-subtle)",
            borderRadius: 6,
            fontSize: 11.5,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {json}
        </pre>
      </Section>
    </div>
  );
}

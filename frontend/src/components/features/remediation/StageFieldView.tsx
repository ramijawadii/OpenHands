/* eslint-disable i18next/no-literal-string -- stage field detail */
import React from "react";
import {
  Check,
  Copy,
  Download,
  FileJson,
  Gavel,
  Microscope,
} from "lucide-react";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";
import { NestedNav, Row, Section } from "./RemediationPanes";
import type { RemediationAction } from "./remediation-data";
import {
  buildFieldDetail,
  exportFieldDetail,
  type ControlRef,
} from "./remediation-field-data";

/**
 * One lifecycle field, opened.
 *
 * A stage card shows a one-line value; that line is a SUMMARY of a record. The
 * record is what an auditor, a reviewer or the next analyst actually needs —
 * how the value was derived, by what, when, whether it is reproducible, and
 * which artifact it came from. Without a way to reach it, the field list is a
 * set of assertions nobody can check.
 *
 * Everything here is exportable because the same question gets asked outside
 * the product: a field pasted into a ticket needs its provenance with it, or it
 * is hearsay.
 */

const MONO = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

const PROV_LABEL: Record<string, string> = {
  scan: "Measured by a detector",
  agent: "Inferred by the agent",
  human: "Asserted by a person",
  integration: "Imported from a connected system",
};

function ControlChip({ control }: { control: ControlRef }) {
  return (
    <span
      title={control.title}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 4,
        padding: "0 6px",
        fontSize: 10,
        lineHeight: "16px",
        borderRadius: 3,
        border: "1px solid var(--cg-border)",
        color: "var(--cg-text-primary)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "var(--cg-text-muted)" }}>{control.framework}</span>
      <span style={{ fontFamily: MONO }}>{control.ref}</span>
    </span>
  );
}

export function StageFieldView({
  action,
  stageIndex,
  field,
  onBack,
}: {
  action: RemediationAction;
  stageIndex: number;
  field: string;
  onBack: () => void;
}) {
  const detail = React.useMemo(
    () => buildFieldDetail(action, stageIndex, field),
    [action, stageIndex, field],
  );
  const [copied, setCopied] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!msg) return undefined;
    const t = window.setTimeout(() => setMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [msg]);

  const json = JSON.stringify(detail.payload, null, 2);

  return (
    <div className="cg-nested" style={{ color: "var(--cg-text-primary)" }}>
      <NestedNav
        trail={[
          { label: "Lifecycle", onClick: onBack },
          { label: detail.stageLabel },
        ]}
        current={detail.field}
        right={
          <>
            <button
              type="button"
              className="cg-report-action"
              onClick={() => {
                navigator.clipboard?.writeText(json);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1400);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 26,
                padding: "0 9px",
                fontSize: 12,
                fontFamily: APP_FONT,
                cursor: "pointer",
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy JSON"}
            </button>
            <button
              type="button"
              className="cg-report-action cg-report-action-primary"
              disabled={!detail.exportable}
              onClick={() => {
                const r = exportFieldDetail(detail);
                setMsg(
                  r.ok
                    ? `Exported to ${r.filename}`
                    : `Export failed — ${r.error}`,
                );
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 26,
                padding: "0 9px",
                fontSize: 12,
                fontFamily: APP_FONT,
                cursor: "pointer",
              }}
            >
              <Download size={12} /> Export
            </button>
          </>
        }
      />

      {/* Identity: the field, and the value the stage card showed. */}
      <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>
        {detail.field}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 5,
        }}
      >
        <span style={{ fontSize: 13 }}>{detail.value}</span>
        <span
          title={PROV_LABEL[detail.provenance]}
          style={{
            padding: "0 6px",
            fontSize: 10,
            lineHeight: "16px",
            borderRadius: 3,
            border: "1px solid var(--cg-border)",
            color: "var(--cg-text-muted)",
          }}
        >
          {detail.provenance}
        </span>
      </div>

      {msg && (
        <div
          role="status"
          style={{
            marginTop: 10,
            padding: "5px 9px",
            borderRadius: 4,
            fontSize: 11.5,
            border: "1px solid var(--cg-border-subtle)",
            color: "var(--cg-text-muted)",
          }}
        >
          {msg}
        </div>
      )}

      {/*
       * Derivation first. "What is the value" is already answered above; the
       * question that brought the reader here is "how do you know".
       */}
      <Section
        title="Derivation"
        hint="how this value was produced"
        count={detail.derivation.length}
        icon={<Microscope size={13} />}
        open
      >
        {detail.derivation.map((d) => (
          <Row
            key={d.label}
            label={d.label}
            value={
              d.mono ? (
                <span style={{ fontFamily: MONO, fontSize: 11.5 }}>
                  {d.value}
                </span>
              ) : (
                d.value
              )
            }
          />
        ))}
      </Section>

      <Section
        title="Controls evidenced"
        hint="what this field is proof of"
        count={detail.controls.length}
        icon={<Gavel size={13} />}
        open
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            marginBottom: 10,
          }}
        >
          {detail.controls.map((c) => (
            <ControlChip key={`${c.framework}${c.ref}`} control={c} />
          ))}
        </div>
        {detail.controls.map((c) => (
          <Row
            key={`${c.framework}${c.ref}`}
            label={`${c.framework} ${c.ref}`}
            value={c.title}
          />
        ))}
      </Section>

      {detail.artifact && (
        <Section
          title="Source artifact"
          hint="the file this value was read from"
          count={3}
          icon={<FileJson size={13} />}
        >
          <Row
            label="Artifact"
            value={
              <span style={{ fontFamily: MONO, fontSize: 11.5 }}>
                {detail.artifact.name}
              </span>
            }
          />
          <Row
            label="SHA-256"
            value={
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  overflowWrap: "anywhere",
                  color: "var(--cg-text-muted)",
                }}
              >
                {detail.artifact.sha256}
              </span>
            }
          />
          <Row
            label="Size"
            value={`${(detail.artifact.bytes / 1024).toFixed(1)} KB`}
          />
        </Section>
      )}

      <Section
        title="Record"
        hint="the raw entry behind the summary"
        count={Object.keys(detail.payload).length}
        icon={<FileJson size={13} />}
        open
      >
        <pre
          className="cg-cmd-scroll"
          style={{
            margin: 0,
            padding: "10px 12px",
            background: "var(--cg-code-bg)",
            color: "#b9c0ca",
            border: "1px solid var(--cg-border-subtle)",
            borderRadius: 6,
            fontFamily: MONO,
            fontSize: 11,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {json}
        </pre>
      </Section>
    </div>
  );
}

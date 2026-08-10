/* eslint-disable i18next/no-literal-string -- undo entry detail */
/**
 * One undo record.
 *
 * The centrepiece is the **three-way comparison** — prior, post, current. It is
 * not a nicety: the drift gate's entire job is to stop an automated revert from
 * silently discarding the fix a human applied thirty minutes ago, and an
 * operator can only override that gate responsibly if they can see which of the
 * three states the live resource actually matches.
 */
import React from "react";
import {
  Check,
  Copy,
  GitBranch,
  Lock,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";
import { IconRow, NestedNav, Pill, Row, Section } from "../RemediationPanes";
import { DRIFT_MEANING, TIER_MEANING, type UndoEntry } from "./undo-journal";

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

/** One row of the three-way comparison, marked with what the live state matches. */
function HashRow({
  label,
  value,
  matches,
  note,
}: {
  label: string;
  value: string;
  matches: boolean;
  note: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "8px 10px",
        borderRadius: 5,
        border: `1px solid ${matches ? "var(--cg-accent)" : "var(--cg-border-subtle)"}`,
        marginBottom: 6,
        fontSize: 12,
      }}
    >
      <span
        style={{
          width: 76,
          flexShrink: 0,
          fontWeight: 600,
          color: "var(--cg-text-primary)",
        }}
      >
        {label}
      </span>
      <span style={{ ...mono, flexShrink: 0, color: "var(--cg-text-muted)" }}>
        {value}
      </span>
      <span style={{ color: "var(--cg-text-muted)", lineHeight: 1.6 }}>
        {note}
      </span>
      {matches && (
        <span style={{ marginLeft: "auto", flexShrink: 0 }}>
          <Pill color="var(--cg-accent)">live matches this</Pill>
        </span>
      )}
    </div>
  );
}

export function UndoEntryView({
  entry,
  onBack,
}: {
  entry: UndoEntry;
  onBack: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const gateFails =
    entry.drift !== "CLEAN" && entry.drift !== "ALREADY_REVERTED";

  const json = JSON.stringify(
    {
      entryId: entry.entryId,
      state: entry.state,
      tier: entry.tier,
      target: {
        provider: entry.provider,
        account: entry.account,
        region: entry.region,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        environmentTier: entry.environmentTier,
        iacManaged: entry.iacManaged,
      },
      forwardAction: { api: entry.forwardApi, executedAt: entry.executedAt },
      inverseAction: {
        api: entry.inverseApi,
        validated: entry.inverseValidated,
        validationMethod: entry.validationMethod,
        idempotent: entry.idempotent,
        propagationSeconds: entry.propagationSeconds,
      },
      hashes: {
        prior: entry.priorHash,
        post: entry.postHash,
        current: entry.currentHash,
        verdict: entry.drift,
      },
      dependencies: { requiresRevertedFirst: entry.requiresRevertedFirst },
      artifacts: entry.artifacts,
    },
    null,
    2,
  );

  return (
    <div className="cg-nested" style={{ color: "var(--cg-text-primary)" }}>
      <NestedNav
        trail={[
          { label: "Rollback", onClick: onBack },
          { label: entry.waveId },
        ]}
        current={entry.entryId}
        right={
          <button
            type="button"
            className="cg-report-action"
            onClick={() => {
              navigator.clipboard?.writeText(json);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            }}
            style={btn}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy record"}
          </button>
        }
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>
          <span style={mono}>{entry.resourceId}</span>
        </span>
        <Pill>{entry.tier}</Pill>
        {entry.iacManaged && (
          <Pill color="rgb(224, 154, 45)" icon={<GitBranch size={9} />}>
            IaC-managed
          </Pill>
        )}
        {entry.legalHold && (
          <Pill color="var(--cgx-critical)" icon={<Lock size={9} />}>
            legal hold
          </Pill>
        )}
      </div>

      {/* The gate verdict, stated before anything else can be acted on. */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "9px 11px",
          marginBottom: 14,
          border: `1px solid ${gateFails ? "var(--cgx-critical)" : "var(--cg-border-subtle)"}`,
          borderRadius: 6,
          fontSize: 12.5,
          lineHeight: 1.7,
          color: "var(--cg-text-primary)",
        }}
      >
        <span style={{ flexShrink: 0, marginTop: 2 }}>
          {gateFails ? (
            <TriangleAlert size={13} color="var(--cgx-critical)" />
          ) : (
            <ShieldCheck size={13} color="var(--cgx-low)" />
          )}
        </span>
        <span>
          <strong>{entry.drift.replace(/_/g, " ")}.</strong>{" "}
          {DRIFT_MEANING[entry.drift]}
        </span>
      </div>

      <Section title="Three-way comparison" open>
        <div style={{ paddingTop: 4 }}>
          <HashRow
            label="PRIOR"
            value={entry.priorHash}
            matches={entry.currentHash === entry.priorHash}
            note="before the agent's change — what a revert restores"
          />
          <HashRow
            label="POST"
            value={entry.postHash}
            matches={entry.currentHash === entry.postHash}
            note="immediately after the agent's change"
          />
          <HashRow
            label="CURRENT"
            value={entry.currentHash}
            matches
            note="live right now, normalised"
          />
          <div
            style={{
              fontSize: 11.5,
              color: "var(--cg-text-muted)",
              lineHeight: 1.7,
              marginTop: 4,
              maxWidth: "76ch",
            }}
          >
            Hashes are taken after stripping provider-generated volatile fields
            — timestamps, request IDs, version IDs, computed ARNs. An over-eager
            normaliser hides real drift; an under-eager one produces false
            alarms that train operators to click through.
          </div>
        </div>
      </Section>

      <Section title="The inverse" open>
        <Row
          label="Forward action"
          value={<span style={mono}>{entry.forwardApi}</span>}
        />
        <Row
          label="Inverse action"
          value={<span style={mono}>{entry.inverseApi}</span>}
        />
        <IconRow
          label="Validated"
          icon={
            entry.inverseValidated ? (
              <ShieldCheck size={11} color="var(--cgx-low)" />
            ) : (
              <TriangleAlert size={11} color="var(--cgx-critical)" />
            )
          }
        >
          {entry.inverseValidated
            ? `Yes — by ${entry.validationMethod}, before the mutation ran`
            : "No — this mutation should never have executed"}
        </IconRow>
        <Row
          label="Idempotent"
          value={
            entry.idempotent
              ? "Yes — safe to run more than once, which reverts always are"
              : "No — wrap with a client token and a pre-check read"
          }
        />
        <Row
          label="Propagation"
          value={`${entry.propagationSeconds}s — recovery cannot be declared until this elapses`}
        />
        <Row label="Reversibility tier" value={TIER_MEANING[entry.tier]} />
      </Section>

      <Section title="Ordering & artifacts" open>
        <Row
          label="Revert after"
          value={
            entry.requiresRevertedFirst.length === 0 ? (
              "Nothing — this is the head of its chain"
            ) : (
              <span style={mono}>{entry.requiresRevertedFirst.join(", ")}</span>
            )
          }
        />
        <Row
          label="Artifacts"
          value={
            entry.artifacts.length === 0 ? (
              // Said explicitly: an empty artifact list is normal, and it is
              // not what makes the entry revertible.
              "None — this is a control-plane change, so no snapshot exists or is needed"
            ) : (
              <span style={mono}>{entry.artifacts.join(", ")}</span>
            )
          }
        />
        <Row
          label="Retention"
          value={`${entry.retentionUntil.toISOString().slice(0, 10)}${entry.legalHold ? " — held indefinitely" : ""}`}
        />
      </Section>

      <Section title="Provenance">
        <Row label="Run" value={<span style={mono}>{entry.runId}</span>} />
        <Row label="Wave" value={<span style={mono}>{entry.waveId}</span>} />
        <Row label="Rule" value={<span style={mono}>{entry.ruleId}</span>} />
        <Row label="Change ticket" value={entry.changeTicket} />
        <Row label="Initiated by" value={entry.initiatedBy} />
        <Row
          label="Executed"
          value={entry.executedAt.toISOString().replace("T", " ").slice(0, 16)}
        />
      </Section>
    </div>
  );
}

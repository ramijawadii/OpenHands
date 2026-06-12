/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ShieldCheck,
  FileText,
  Globe,
  HeartPulse,
  CreditCard,
  Cloud,
} from "lucide-react";
import {
  ConfirmButton,
  ScopeBadge,
} from "#/components/features/settings/settings-kit";
import { SettingsSaveBar } from "#/components/features/settings/settings-save-bar";

const S = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  warning: "#e09a2d",
  danger: "var(--cg-danger)",
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

const ATTESTATIONS = [
  {
    name: "SOC 2 Type II",
    status: "Valid",
    until: "Audited through Dec 2026",
    Icon: ShieldCheck,
  },
  {
    name: "ISO/IEC 27001",
    status: "Valid",
    until: "Certified to Sep 2027",
    Icon: FileText,
  },
  { name: "GDPR", status: "Compliant", until: "DPA available", Icon: Globe },
  {
    name: "HIPAA",
    status: "Available",
    until: "BAA on request",
    Icon: HeartPulse,
  },
  {
    name: "PCI-DSS",
    status: "SAQ-D",
    until: "Attestation 2026",
    Icon: CreditCard,
  },
  {
    name: "CSA STAR",
    status: "Level 2",
    until: "Registry listed",
    Icon: Cloud,
  },
];

const LEGAL = [
  {
    name: "Data Processing Addendum (DPA)",
    state: "Signed",
    action: "Download",
  },
  {
    name: "Master Service Agreement (MSA)",
    state: "Signed",
    action: "Download",
  },
  {
    name: "Business Associate Agreement (BAA)",
    state: "Not signed",
    action: "Request",
  },
  { name: "Acceptable Use Policy", state: "—", action: "View" },
];

const SUBPROCESSORS = [
  {
    name: "Amazon Web Services",
    purpose: "Infrastructure hosting",
    region: "US / EU",
    added: "2025",
  },
  {
    name: "Google Cloud (Vertex AI)",
    purpose: "Model inference",
    region: "EU",
    added: "2026",
  },
  { name: "Cloudflare", purpose: "CDN / WAF", region: "Global", added: "2025" },
  { name: "Stripe", purpose: "Billing", region: "US", added: "2025" },
];

function statusColor(s: string) {
  return s === "Valid" || s === "Compliant" || s === "Signed"
    ? S.success
    : s === "Not signed"
      ? S.warning
      : S.accent;
}
function H2({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: S.textPrimary,
          margin: 0,
        }}
      >
        {children}
      </h2>
      {sub && (
        <p
          style={{
            fontSize: 12.5,
            color: S.textMuted,
            margin: "5px 0 0",
            lineHeight: 1.5,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export default function ComplianceSettings() {
  const [subSubscribed, setSubSubscribed] = React.useState(true);
  const [siemDest, setSiemDest] = React.useState("Splunk HEC");
  const [siemFmt, setSiemFmt] = React.useState("JSON");

  const cSelect: React.CSSProperties = {
    width: "100%",
    height: 34,
    padding: "0 26px 0 10px",
    background: "var(--cg-input-bg)",
    border: `1px solid ${S.border}`,
    borderRadius: 6,
    color: S.textPrimary,
    fontSize: 13,
    outline: "none",
    appearance: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
  return (
    <div style={{ padding: "40px 48px", maxWidth: 900 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 400,
              color: S.textPrimary,
              margin: 0,
            }}
          >
            Compliance & Trust
          </h1>
          <ScopeBadge scope="Organization" />
        </div>
        <a
          href="https://trust.cloudguard.io"
          style={{
            height: 32,
            padding: "0 12px",
            borderRadius: 6,
            background: "transparent",
            border: `1px solid ${S.borderStrong}`,
            color: S.textSecondary,
            fontSize: 12.5,
            cursor: "pointer",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Open Trust Center ↗
        </a>
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 28,
          marginTop: 0,
        }}
      >
        Attestations, legal agreements, sub-processors and evidence for your
        auditors and procurement teams.
      </p>

      <div style={{ marginBottom: 30 }}>
        <H2 sub="Download current reports under NDA. Data residency & retention live under Data Residency.">
          Certifications & attestations
        </H2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          {ATTESTATIONS.map((a) => (
            <div
              key={a.name}
              style={{
                background: S.cardBg,
                border: `1px solid ${S.border}`,
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <a.Icon size={20} strokeWidth={1.7} color={S.accent} />
                <span
                  style={{
                    height: 18,
                    padding: "0 7px",
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 600,
                    color: statusColor(a.status),
                    background: S.badgeBg,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {a.status}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: S.textSecondary,
                  fontWeight: 500,
                }}
              >
                {a.name}
              </div>
              <div style={{ fontSize: 11.5, color: S.textMuted, marginTop: 2 }}>
                {a.until}
              </div>
              <button
                type="button"
                style={{
                  marginTop: 12,
                  background: "none",
                  border: "none",
                  color: S.accent,
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Download →
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 30 }}>
        <H2>Legal agreements</H2>
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {LEGAL.map((l, i) => (
            <div
              key={l.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom:
                  i < LEGAL.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, color: S.textSecondary }}>
                  {l.name}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: statusColor(l.state),
                    marginTop: 2,
                  }}
                >
                  {l.state}
                </div>
              </div>
              <button
                type="button"
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid ${S.borderStrong}`,
                  color: S.textSecondary,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {l.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 30 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <H2 sub="Third parties that may process your data. Subscribe to be notified 30 days before changes.">
            Sub-processors
          </H2>
          <button
            type="button"
            onClick={() => setSubSubscribed((v) => !v)}
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 6,
              background: subSubscribed
                ? "rgba(76,175,125,0.15)"
                : "transparent",
              border: `1px solid ${S.borderStrong}`,
              color: subSubscribed ? S.success : S.textSecondary,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {subSubscribed ? "✓ Subscribed" : "Subscribe to changes"}
          </button>
        </div>
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1.4fr 1fr 70px",
              padding: "8px 16px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {["Sub-processor", "Purpose", "Region", "Since"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: S.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {h}
              </span>
            ))}
          </div>
          {SUBPROCESSORS.map((sp, i) => (
            <div
              key={sp.name}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1.4fr 1fr 70px",
                padding: "10px 16px",
                borderBottom:
                  i < SUBPROCESSORS.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, color: S.textSecondary }}>
                {sp.name}
              </span>
              <span style={{ fontSize: 12.5, color: S.textMuted }}>
                {sp.purpose}
              </span>
              <span style={{ fontSize: 12.5, color: S.textMuted }}>
                {sp.region}
              </span>
              <span style={{ fontSize: 12.5, color: S.textMuted }}>
                {sp.added}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 30 }}>
        <H2 sub="Stream the tamper-evident audit log to your SIEM. Every record is hash-chained — gaps and edits are detectable.">
          Audit streaming (SIEM)
        </H2>
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <div
                style={{ fontSize: 12, color: S.textMuted, marginBottom: 6 }}
              >
                Destination
              </div>
              <select
                value={siemDest}
                onChange={(e) => setSiemDest(e.target.value)}
                style={cSelect}
              >
                {[
                  "Splunk HEC",
                  "Microsoft Sentinel",
                  "Amazon S3",
                  "Datadog",
                  "Google Chronicle",
                ].map((o) => (
                  <option
                    key={o}
                    value={o}
                    style={{ background: "var(--cg-bg-card)" }}
                  >
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div
                style={{ fontSize: 12, color: S.textMuted, marginBottom: 6 }}
              >
                Format
              </div>
              <select
                value={siemFmt}
                onChange={(e) => setSiemFmt(e.target.value)}
                style={cSelect}
              >
                {["JSON", "CEF", "LEEF"].map((o) => (
                  <option
                    key={o}
                    value={o}
                    style={{ background: "var(--cg-bg-card)" }}
                  >
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 4,
            }}
          >
            <span
              style={{
                height: 20,
                padding: "0 8px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 500,
                color: S.success,
                background: "rgba(76,175,125,0.15)",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Chain verified ✓
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid ${S.borderStrong}`,
                  color: S.textSecondary,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Verify integrity
              </button>
              <button
                type="button"
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid ${S.borderStrong}`,
                  color: S.textSecondary,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Send test event
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 30 }}>
        <H2 sub="Periodically recertify who has access — a SOC 2 / ISO 27001 control.">
          Access reviews
        </H2>
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 13.5, color: S.textSecondary }}>
              Recertification campaign
            </div>
            <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
              Cadence: <span style={{ color: S.textSecondary }}>Quarterly</span>{" "}
              · last completed Apr 1, 2026 · next due Jul 1, 2026
            </div>
          </div>
          <button
            type="button"
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: 6,
              background: "var(--cg-text-primary)",
              color: "var(--cg-bg-card)",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Start access review
          </button>
        </div>
      </div>

      <div>
        <H2 sub="Generate evidence for auditors or fulfil a data-subject request.">
          Evidence & requests
        </H2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${S.borderStrong}`,
              color: S.textSecondary,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Export audit evidence pack
          </button>
          <button
            type="button"
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${S.borderStrong}`,
              color: S.textSecondary,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Submit DSAR (data-subject request)
          </button>
          <ConfirmButton
            variant="ghost"
            label="Request data deletion"
            title="Request full data deletion?"
            body="This starts a verified, irreversible erasure of this organization's data with a deletion certificate (cryptographic erasure). Subject to contractual retention."
            confirmLabel="Start deletion request"
            confirmWord="DELETE"
            onConfirm={() => {}}
          />
        </div>
      </div>

      <SettingsSaveBar
        tab="compliance"
        doc={{ subSubscribed, siemDest, siemFmt }}
        onLoad={(d) => {
          if (typeof d.subSubscribed === "boolean")
            setSubSubscribed(d.subSubscribed);
          if (typeof d.siemDest === "string") setSiemDest(d.siemDest);
          if (typeof d.siemFmt === "string") setSiemFmt(d.siemFmt);
        }}
      />
    </div>
  );
}

/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ScopeBadge,
  Toggle,
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
  purple: "var(--cg-accent-purple)",
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

const ENTITLEMENTS: {
  group: string;
  rows: { feature: string; value: string }[];
}[] = [
  {
    group: "Coverage",
    rows: [
      { feature: "Cloud connectors", value: "Unlimited (AWS · Azure · GCP)" },
      { feature: "CNAPP layers", value: "All 15" },
      { feature: "Assets scanned", value: "Unlimited" },
      { feature: "Continuous scanning", value: "Included" },
    ],
  },
  {
    group: "AI & analysis",
    rows: [
      { feature: "Agentic investigations", value: "Included" },
      { feature: "AI auto-remediation", value: "Beta (opt-in)" },
      { feature: "Threat-intel enrichment", value: "Add-on" },
    ],
  },
  {
    group: "Governance",
    rows: [
      { feature: "SSO (SAML) + SCIM", value: "Included" },
      { feature: "Custom roles", value: "Unlimited" },
      { feature: "Audit log retention", value: "1 year (7y add-on)" },
      { feature: "BYOK / HYOK", value: "Add-on" },
    ],
  },
  {
    group: "Support",
    rows: [
      { feature: "Support tier", value: "Standard (Premium add-on)" },
      { feature: "Critical SLA", value: "4h (1h with Premium)" },
    ],
  },
];

interface AddOn {
  id: string;
  name: string;
  desc: string;
  price: string;
  on: boolean;
}
const INITIAL_ADDONS: AddOn[] = [
  {
    id: "seats",
    name: "Additional seats (pack of 10)",
    desc: "Extend your licensed seat count.",
    price: "$1,200 / yr",
    on: false,
  },
  {
    id: "retention",
    name: "Extended retention (7 years)",
    desc: "Audit log & finding history for compliance.",
    price: "$250 / mo",
    on: true,
  },
  {
    id: "support",
    name: "Premium support (24/7)",
    desc: "1h critical response, dedicated CSM.",
    price: "$500 / mo",
    on: true,
  },
  {
    id: "ti",
    name: "Advanced threat intel",
    desc: "Curated IoCs + exploit-in-the-wild signals.",
    price: "$400 / mo",
    on: false,
  },
  {
    id: "hyok",
    name: "BYOK / HYOK key management",
    desc: "Hold your own key; revoke to cut access.",
    price: "$600 / mo",
    on: false,
  },
  {
    id: "cell",
    name: "Dedicated cell isolation",
    desc: "Shared-nothing per-tenant compute & KG.",
    price: "Contact sales",
    on: false,
  },
];

interface Flag {
  id: string;
  name: string;
  desc: string;
  on: boolean;
  stage: "Beta" | "Preview";
}
const INITIAL_FLAGS: Flag[] = [
  {
    id: "dash",
    name: "New risk dashboard",
    desc: "Redesigned posture overview with attack-path view.",
    on: true,
    stage: "Beta",
  },
  {
    id: "autorem",
    name: "AI auto-remediation",
    desc: "Agent proposes & applies fixes (approval-gated).",
    on: false,
    stage: "Beta",
  },
  {
    id: "graph",
    name: "Graph explorer v2",
    desc: "Interactive knowledge-graph query UI.",
    on: false,
    stage: "Preview",
  },
  {
    id: "copilot",
    name: "Investigations copilot",
    desc: "Natural-language incident triage.",
    on: true,
    stage: "Beta",
  },
];

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: S.textPrimary,
        margin: "0 0 14px",
      }}
    >
      {children}
    </h2>
  );
}

export default function PlanSettings() {
  const [addons, setAddons] = React.useState(INITIAL_ADDONS);
  const [flags, setFlags] = React.useState(INITIAL_FLAGS);
  const toggleAddon = (id: string) =>
    setAddons((p) => p.map((a) => (a.id === id ? { ...a, on: !a.on } : a)));
  const toggleFlag = (id: string) =>
    setFlags((p) => p.map((f) => (f.id === id ? { ...f, on: !f.on } : f)));

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
            Plan & Add-ons
          </h1>
          <ScopeBadge scope="Organization" />
        </div>
        <span
          style={{
            height: 22,
            padding: "0 10px",
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 600,
            color: S.purple,
            background: "rgba(155,135,245,0.15)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Enterprise
        </span>
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 28,
          marginTop: 0,
        }}
      >
        What's enabled for this organization, optional add-ons, and early-access
        features.
      </p>

      <div style={{ marginBottom: 28 }}>
        <H2>What's included</H2>
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderRadius: 10,
            overflow: "hidden",
            background: S.cardBg,
          }}
        >
          {ENTITLEMENTS.map((g, gi) => (
            <div key={g.group}>
              <div
                style={{
                  padding: "8px 16px",
                  background: S.badgeBg,
                  fontSize: 11,
                  fontWeight: 600,
                  color: S.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {g.group}
              </div>
              {g.rows.map((r, i) => (
                <div
                  key={r.feature}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    borderBottom:
                      gi === ENTITLEMENTS.length - 1 && i === g.rows.length - 1
                        ? "none"
                        : "1px solid var(--cg-border-subtle)",
                  }}
                >
                  <span style={{ fontSize: 13, color: S.textSecondary }}>
                    {r.feature}
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: r.value.includes("Add-on")
                        ? S.warning
                        : r.value.includes("Beta")
                          ? S.accent
                          : S.textMuted,
                    }}
                  >
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <H2>Add-ons</H2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {addons.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                background: S.cardBg,
                border: `1px solid ${a.on ? S.accent : S.border}`,
                borderRadius: 8,
                padding: "12px 16px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    color: S.textSecondary,
                    fontWeight: 500,
                  }}
                >
                  {a.name}
                </div>
                <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                  {a.desc}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 12.5,
                    color: S.textSecondary,
                    fontWeight: 500,
                  }}
                >
                  {a.price}
                </span>
                <Toggle
                  on={a.on}
                  onChange={() => toggleAddon(a.id)}
                  label={a.name}
                />
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: S.textMuted, marginTop: 10 }}>
          Add-on changes are prorated and reflected on your next invoice.
        </p>
      </div>

      <div>
        <H2>Early access (feature flags)</H2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {flags.map((f) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                padding: "12px 16px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13.5,
                      color: S.textSecondary,
                      fontWeight: 500,
                    }}
                  >
                    {f.name}
                  </span>
                  <span
                    style={{
                      height: 17,
                      padding: "0 6px",
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 600,
                      color: f.stage === "Beta" ? S.accent : S.warning,
                      background: S.badgeBg,
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    {f.stage}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                  {f.desc}
                </div>
              </div>
              <Toggle
                on={f.on}
                onChange={() => toggleFlag(f.id)}
                label={f.name}
              />
            </div>
          ))}
        </div>
      </div>

      <SettingsSaveBar
        tab="plan"
        doc={{ addons, flags }}
        onLoad={(d) => {
          if (Array.isArray(d.addons)) setAddons(d.addons as AddOn[]);
          if (Array.isArray(d.flags)) setFlags(d.flags as Flag[]);
        }}
      />
    </div>
  );
}

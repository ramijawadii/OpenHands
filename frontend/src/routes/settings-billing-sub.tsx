/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import { ScopeBadge } from "#/components/features/settings/settings-kit";

const S = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  inputBg: "var(--cg-input-bg)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  warning: "#e09a2d",
  danger: "var(--cg-danger)",
  purple: "var(--cg-accent-purple)",
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

const USAGE_COST = [
  { label: "Scans", qty: "342 runs", included: "500 / mo", cost: 0 },
  { label: "API calls", qty: "128,440", included: "250k / mo", cost: 0 },
  {
    label: "Sandbox compute",
    qty: "1,204 vCPU-hrs",
    included: "800 vCPU-hrs",
    cost: 484.0,
  },
  {
    label: "Extended retention (7y audit)",
    qty: "add-on",
    included: "—",
    cost: 250.0,
  },
  { label: "Premium support", qty: "add-on", included: "—", cost: 500.0 },
];
const INVOICES = [
  {
    num: "INV-2026-005",
    date: "May 1, 2026",
    amount: "$4,250.00",
    status: "Paid",
  },
  {
    num: "INV-2026-004",
    date: "Apr 1, 2026",
    amount: "$4,250.00",
    status: "Paid",
  },
  {
    num: "INV-2026-003",
    date: "Mar 1, 2026",
    amount: "$4,250.00",
    status: "Paid",
  },
  {
    num: "INV-2026-002",
    date: "Feb 1, 2026",
    amount: "$3,980.00",
    status: "Paid",
  },
];
const BY_WORKSPACE = [
  { ws: "Production Cloud", pct: 62, cost: "$2,635" },
  { ws: "Sentinel Security Workspace", pct: 28, cost: "$1,190" },
  { ws: "Sandbox / Dev", pct: 10, cost: "$425" },
];

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: S.cardBg,
        border: `1px solid ${S.border}`,
        borderRadius: 10,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
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
function KV({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "7px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
      }}
    >
      <span style={{ fontSize: 12.5, color: S.textMuted }}>{k}</span>
      <span
        style={{
          fontSize: 12.5,
          color: accent ? S.textPrimary : S.textSecondary,
          fontWeight: accent ? 600 : 400,
        }}
      >
        {v}
      </span>
    </div>
  );
}

export default function BillingSettings() {
  const nextInvoice = USAGE_COST.reduce((s, r) => s + r.cost, 0) + 3000; // base + overage/add-ons
  return (
    <div style={{ padding: "40px 48px", maxWidth: 960 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: S.textPrimary,
            margin: 0,
          }}
        >
          Billing & Subscription
        </h1>
        <ScopeBadge scope="Organization" />
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 28,
          marginTop: 0,
        }}
      >
        Plan, seats, usage-based costs, invoices and payment method.
      </p>

      {/* Plan + payment */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <H2>Current plan</H2>
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
          <KV k="Billing cycle" v="Annual (invoiced monthly)" />
          <KV k="Contract term" v="Mar 1, 2026 → Feb 28, 2027" />
          <KV k="Renews" v="Auto-renew on Mar 1, 2027" />
          <KV k="Seats" v="5 active / 25 licensed" />
          <KV k="Contract value" v="$51,000 / yr" accent />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <a
              href="/settings/plan"
              style={{
                fontSize: 12.5,
                color: S.accent,
                textDecoration: "none",
              }}
            >
              Manage plan & add-ons →
            </a>
          </div>
        </Card>
        <Card>
          <H2>Payment & billing details</H2>
          <KV k="Payment method" v="Visa ···· 4242 (exp 08/28)" />
          <KV k="Billing email" v="billing@sentinel-org.io" />
          <KV k="PO number" v="PO-2026-SENTINEL-CG" />
          <KV k="Tax ID (VAT)" v="FR 12 345 678 901" />
          <KV k="Billing address" v="100 Market St, San Francisco, CA" />
          <button
            type="button"
            style={{
              marginTop: 14,
              height: 32,
              padding: "0 12px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${S.borderStrong}`,
              color: S.textSecondary,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            Update payment method
          </button>
        </Card>
      </div>

      {/* Current period usage -> cost */}
      <Card style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <H2>This period (May 1 – May 31)</H2>
          <span style={{ fontSize: 12, color: S.textMuted }}>
            Next invoice estimate:{" "}
            <strong style={{ color: S.textPrimary }}>
              ${nextInvoice.toLocaleString()}
            </strong>
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 90px",
            padding: "6px 0",
            borderBottom: `1px solid ${S.border}`,
          }}
        >
          {["Item", "This period", "Included", "Cost"].map((h) => (
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
        {USAGE_COST.map((r) => (
          <div
            key={r.label}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 90px",
              padding: "9px 0",
              borderBottom: "1px solid var(--cg-border-subtle)",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: S.textSecondary }}>
              {r.label}
            </span>
            <span style={{ fontSize: 12.5, color: S.textMuted }}>{r.qty}</span>
            <span style={{ fontSize: 12.5, color: S.textMuted }}>
              {r.included}
            </span>
            <span
              style={{
                fontSize: 12.5,
                color: r.cost > 0 ? S.warning : S.success,
                fontFamily: "monospace",
              }}
            >
              {r.cost > 0 ? `$${r.cost.toFixed(2)}` : "incl."}
            </span>
          </div>
        ))}
        <a
          href="/settings/limits"
          style={{
            display: "inline-block",
            marginTop: 12,
            fontSize: 12,
            color: S.accent,
            textDecoration: "none",
          }}
        >
          Set a monthly spend cap in Limits →
        </a>
      </Card>

      {/* Cost by workspace */}
      <Card style={{ marginBottom: 16 }}>
        <H2>Cost by workspace</H2>
        {BY_WORKSPACE.map((w) => (
          <div key={w.ws} style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 5,
              }}
            >
              <span style={{ fontSize: 12.5, color: S.textSecondary }}>
                {w.ws}
              </span>
              <span style={{ fontSize: 12.5, color: S.textMuted }}>
                {w.cost} · {w.pct}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 99,
                background: S.badgeBg,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${w.pct}%`,
                  background: S.accent,
                }}
              />
            </div>
          </div>
        ))}
      </Card>

      {/* Invoices */}
      <div>
        <H2>Invoices</H2>
        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: `1px solid ${S.border}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 90px 90px",
              padding: "8px 16px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {["Invoice", "Date", "Amount", "Status", ""].map((h) => (
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
          {INVOICES.map((iv, i) => (
            <div
              key={iv.num}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 90px 90px",
                padding: "10px 16px",
                borderBottom:
                  i < INVOICES.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  color: S.textSecondary,
                  fontFamily: "monospace",
                }}
              >
                {iv.num}
              </span>
              <span style={{ fontSize: 12.5, color: S.textMuted }}>
                {iv.date}
              </span>
              <span style={{ fontSize: 12.5, color: S.textSecondary }}>
                {iv.amount}
              </span>
              <span style={{ fontSize: 11, fontWeight: 500, color: S.success }}>
                {iv.status}
              </span>
              <button
                type="button"
                style={{
                  justifySelf: "start",
                  background: "none",
                  border: "none",
                  color: S.accent,
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

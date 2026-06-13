/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ScopeBadge,
  SaveBar,
  Toggle,
  useDirty,
  LiveCardSkeleton,
  RelatedLinks,
} from "#/components/features/settings/settings-kit";
import {
  useIsolation,
  useSettingsDoc,
  useSaveSettingsDoc,
} from "#/hooks/query/use-cloudguard";

// Live effective isolation policy from the backend tenant_policy. Additive read card.
function EffectiveIsolationCard() {
  const { data, isError, isLoading } = useIsolation();
  if (isLoading) return <LiveCardSkeleton />;
  if (isError || !data) return null;
  const rows: [string, string][] = [
    ["Isolation tier", data.tier],
    ["Egress policy", data.egress],
  ];
  return (
    <div
      style={{
        background: S.cardBg,
        border: `1px solid ${S.border}`,
        borderRadius: 10,
        padding: 16,
        marginBottom: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: S.textPrimary }}>
          Effective isolation
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: S.success,
            background: "rgba(76,175,125,0.15)",
            borderRadius: 99,
            padding: "2px 7px",
          }}
        >
          live
        </span>
      </div>
      {rows.map(([k, v]) => (
        <div
          key={k}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: "1px solid var(--cg-border-subtle)",
          }}
        >
          <span style={{ fontSize: 12.5, color: S.textMuted }}>{k}</span>
          <span style={{ fontSize: 12.5, color: S.textPrimary }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

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

const TIERS = [
  {
    id: "T1",
    name: "Logical",
    desc: "Namespaced data in shared infrastructure.",
  },
  {
    id: "T2",
    name: "Siloed data",
    desc: "Per-tenant database & encryption keys.",
  },
  {
    id: "T3",
    name: "Dedicated instance",
    desc: "Isolated app + KG per tenant.",
  },
  {
    id: "T4",
    name: "Shared-nothing cell",
    desc: "Per-tenant cell, HYOK, microVM — leak-proof by construction.",
  },
];
const CURRENT_TIER = "T4";

const NET_MODES = [
  { id: "No internet", desc: "Sandbox has zero outbound access." },
  { id: "Allowlist only", desc: "Only the destinations below are reachable." },
  { id: "Open", desc: "Full outbound — not recommended for production." },
] as const;

const selectStyle: React.CSSProperties = {
  height: 34,
  padding: "0 26px 0 10px",
  background: S.inputBg,
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
const inputStyle: React.CSSProperties = {
  ...selectStyle,
  appearance: "auto",
  cursor: "text",
  paddingRight: 10,
};
const optBg = { background: "var(--cg-bg-card)" } as const;

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
function Row({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 44,
        padding: "10px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
        gap: 24,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: S.textSecondary }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

export default function IsolationSettings() {
  const [cfg, setCfg] = React.useState({
    netMode: "Allowlist only",
    blockMetadata: true,
    exfilGuard: true,
    ephemeral: true,
    scrubOnExit: true,
    maxLifetime: "4 hours",
  });
  const [allow, setAllow] = React.useState([
    "*.cloudguard.io",
    "sts.amazonaws.com",
    "169.254.x — blocked",
  ]);
  const [newDest, setNewDest] = React.useState("");
  const [savedAt, setSavedAt] = React.useState(0);
  // Track BOTH the config and the egress allowlist so allowlist edits trigger the Save button.
  const { dirty, baseline, reset } = useDirty({ cfg, allow });
  const docQ = useSettingsDoc("isolation");
  const saveMut = useSaveSettingsDoc("isolation");
  const hydrated = React.useRef(false);
  React.useEffect(() => {
    const d = docQ.data;
    if (!hydrated.current && d && Object.keys(d).length) {
      hydrated.current = true;
      const nextCfg = (d.cfg as typeof cfg) ?? cfg;
      const nextAllow = Array.isArray(d.allow) ? (d.allow as string[]) : allow;
      if (d.cfg) setCfg(nextCfg);
      if (Array.isArray(d.allow)) setAllow(nextAllow);
      reset({ cfg: nextCfg, allow: nextAllow });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docQ.data, reset]);
  const upd = (patch: Partial<typeof cfg>) =>
    setCfg((p) => ({ ...p, ...patch }));
  const addDest = () => {
    if (!newDest.trim()) return;
    setAllow((p) => [...p, newDest.trim()]);
    setNewDest("");
  };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 760 }}>
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
          Isolation & Containment
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
        How your tenant is separated from others, and how the agent sandbox is
        contained. What the agent is allowed to do lives in{" "}
        <a
          href="/settings/agent-guardrails"
          style={{ color: S.accent, textDecoration: "none" }}
        >
          Agent Guardrails
        </a>
        .
      </p>

      <div style={{ marginBottom: 24 }}>
        <RelatedLinks
          label="Live in Agent Control Plane"
          items={[
            ["Egress policy", "/agent-control-plane/enforcement"],
            ["Sandbox network", "/agent-control-plane/sandboxes"],
          ]}
        />
      </div>

      <EffectiveIsolationCard />

      <div style={{ marginBottom: 32 }}>
        <H2 sub="Your data-separation guarantee. Higher tiers reduce shared surface — T4 is leak-proof by construction.">
          Tenant isolation
        </H2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          {TIERS.map((t) => {
            const on = t.id === CURRENT_TIER;
            return (
              <div
                key={t.id}
                style={{
                  border: `1px solid ${on ? S.success : S.border}`,
                  background: on ? "rgba(76,175,125,0.06)" : "transparent",
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: S.textPrimary,
                      fontWeight: 600,
                    }}
                  >
                    {t.id} · {t.name}
                  </span>
                  {on && (
                    <span
                      style={{
                        height: 17,
                        padding: "0 7px",
                        borderRadius: 99,
                        fontSize: 10,
                        fontWeight: 600,
                        color: S.success,
                        background: "rgba(76,175,125,0.15)",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      Current
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: S.textMuted,
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  {t.desc}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            style={{
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
            Download isolation evidence
          </button>
          <button
            type="button"
            style={{
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
            Request tier change
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <H2 sub="Outbound network the agent sandbox may reach. Default-deny is strongest.">
          Sandbox egress
        </H2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {NET_MODES.map((m) => {
            const on = cfg.netMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => upd({ netMode: m.id })}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  textAlign: "left",
                  padding: "11px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: `1px solid ${on ? (m.id === "Open" ? S.warning : S.accent) : S.border}`,
                  background: on
                    ? m.id === "Open"
                      ? "rgba(224,154,45,0.07)"
                      : "rgba(45,134,212,0.07)"
                    : "transparent",
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    flexShrink: 0,
                    marginTop: 1,
                    border: `2px solid ${on ? S.accent : S.borderStrong}`,
                    background: on ? S.accent : "transparent",
                  }}
                />
                <span>
                  <span
                    style={{
                      fontSize: 13.5,
                      color: S.textPrimary,
                      fontWeight: 500,
                    }}
                  >
                    {m.id}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: S.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {m.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {cfg.netMode === "Allowlist only" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                value={newDest}
                onChange={(e) => setNewDest(e.target.value)}
                placeholder="domain or CIDR (e.g. sts.amazonaws.com)"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={addDest}
                style={{
                  height: 34,
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
                Add
              </button>
            </div>
            <div
              style={{
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              {allow.map((d, i) => (
                <div
                  key={d}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 14px",
                    borderBottom:
                      i < allow.length - 1
                        ? "1px solid var(--cg-border-subtle)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: S.textSecondary,
                      fontFamily: "monospace",
                    }}
                  >
                    {d}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAllow((p) => p.filter((x) => x !== d))}
                    style={{
                      background: "none",
                      border: "none",
                      color: S.danger,
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        <Row
          label="Block instance-metadata endpoint"
          sublabel="Deny 169.254.169.254 (prevents SSRF credential theft)."
        >
          <Toggle
            on={cfg.blockMetadata}
            onChange={(v) => upd({ blockMetadata: v })}
            label="block metadata"
          />
        </Row>
        <Row
          label="Data-exfiltration guard"
          sublabel="Inspect & cap outbound payload size from the sandbox."
        >
          <Toggle
            on={cfg.exfilGuard}
            onChange={(v) => upd({ exfilGuard: v })}
            label="exfil guard"
          />
        </Row>
      </div>

      <div>
        <H2 sub="How long sandboxes live and how their state is destroyed.">
          Sandbox lifecycle
        </H2>
        <Row
          label="Ephemeral sandboxes"
          sublabel="Destroy the sandbox after each conversation."
        >
          <Toggle
            on={cfg.ephemeral}
            onChange={(v) => upd({ ephemeral: v })}
            label="ephemeral"
          />
        </Row>
        <Row
          label="Scrub on exit"
          sublabel="Wipe filesystem & memory when a sandbox is torn down."
        >
          <Toggle
            on={cfg.scrubOnExit}
            onChange={(v) => upd({ scrubOnExit: v })}
            label="scrub"
          />
        </Row>
        <Row label="Max sandbox lifetime">
          <select
            value={cfg.maxLifetime}
            onChange={(e) => upd({ maxLifetime: e.target.value })}
            style={selectStyle}
          >
            {["1 hour", "4 hours", "12 hours", "24 hours"].map((o) => (
              <option key={o} value={o} style={optBg}>
                {o}
              </option>
            ))}
          </select>
        </Row>
      </div>

      <SaveBar
        dirty={dirty}
        savedAt={savedAt}
        onSave={() => {
          saveMut.mutate({ cfg, allow } as unknown as Record<string, unknown>, {
            onSuccess: () => {
              reset({ cfg, allow });
              setSavedAt(Date.now());
            },
          });
        }}
        onDiscard={() => {
          setCfg(baseline.cfg);
          setAllow(baseline.allow);
        }}
      />
    </div>
  );
}

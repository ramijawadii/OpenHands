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
  useGuardrails,
  useSettingsDoc,
  useSaveSettingsDoc,
} from "#/hooks/query/use-cloudguard";

// Live effective guardrails from the backend tenant_policy (the value runs actually seed from).
// Additive; renders only when reachable.
function EffectiveGuardrailsCard() {
  const { data, isError, isLoading } = useGuardrails();
  if (isLoading) return <LiveCardSkeleton />;
  if (isError || !data) return null;
  const gates = Object.entries(data.action_gates || {});
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
          Effective guardrails
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px 0",
          borderBottom: "1px solid var(--cg-border-subtle)",
        }}
      >
        <span style={{ fontSize: 12.5, color: S.textMuted }}>
          Autonomy mode
        </span>
        <span style={{ fontSize: 12.5, color: S.textPrimary }}>
          {data.autonomy_mode}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {gates.map(([k, v]) => (
          <span
            key={k}
            style={{
              fontSize: 11,
              color: v === "ask" || v === "deny" ? S.warning : S.textMuted,
              background: S.badgeBg,
              borderRadius: 99,
              padding: "2px 8px",
            }}
          >
            {k} → {v}
          </span>
        ))}
      </div>
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

const MODES = [
  {
    id: "Autonomous",
    desc: "Acts without asking. Approval gates below still apply.",
  },
  {
    id: "Ask-first",
    desc: "Proposes each action and waits for a human to approve.",
  },
  { id: "Plan-only", desc: "Produces a plan and never executes changes." },
] as const;

type PolicyState = "Allow" | "Ask" | "Never";
const POLICY: PolicyState[] = ["Allow", "Ask", "Never"];
const ACTIONS = [
  { key: "readInventory", label: "Read inventory & config", risk: "READ" },
  { key: "runScans", label: "Run scans", risk: "READ" },
  { key: "applyRemediation", label: "Apply remediation", risk: "WRITE" },
  { key: "modifyIam", label: "Modify IAM / policies", risk: "WRITE" },
  { key: "deleteResources", label: "Delete cloud resources", risk: "WRITE" },
  { key: "execShell", label: "Execute shell in sandbox", risk: "WRITE" },
  {
    key: "networkEgress",
    label: "Outbound network from sandbox",
    risk: "WRITE",
  },
] as const;

const REVIEWERS = ["Admin", "Security Engineer", "Workspace Admin"];

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
function PolicyPicker({
  value,
  onChange,
}: {
  value: PolicyState;
  onChange: (v: PolicyState) => void;
}) {
  const color = (s: PolicyState) =>
    s === "Allow" ? S.success : s === "Ask" ? S.warning : S.danger;
  return (
    <div
      style={{
        display: "inline-flex",
        border: `1px solid ${S.border}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {POLICY.map((s, i) => {
        const on = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            style={{
              height: 28,
              padding: "0 12px",
              fontSize: 12,
              fontWeight: on ? 600 : 400,
              cursor: "pointer",
              border: "none",
              borderRight: i < 2 ? `1px solid ${S.border}` : "none",
              background: on ? "var(--cg-input-bg)" : "transparent",
              color: on ? color(s) : S.textMuted,
            }}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

export default function AgentGuardrailsSettings() {
  const [cfg, setCfg] = React.useState({
    mode: "Ask-first",
    approveWrites: true,
    approveDelete: true,
    approveIam: true,
    approveCrossAccount: true,
    spendGate: "100",
    reviewer: "Security Engineer",
    actions: {
      readInventory: "Allow",
      runScans: "Allow",
      applyRemediation: "Ask",
      modifyIam: "Ask",
      deleteResources: "Never",
      execShell: "Ask",
      networkEgress: "Never",
    } as Record<string, PolicyState>,
    maxChanges: "25",
    maxParallel: "4",
    dryRun: true,
    changeWindow: "Business hours only",
  });
  const [savedAt, setSavedAt] = React.useState(0);
  const { dirty, baseline, reset } = useDirty(cfg);
  const docQ = useSettingsDoc("guardrails");
  const saveMut = useSaveSettingsDoc("guardrails");
  const hydrated = React.useRef(false);
  // Hydrate the form from the persisted backend doc (every field), then re-baseline so it
  // isn't shown dirty on load.
  React.useEffect(() => {
    const d = docQ.data;
    if (!hydrated.current && d && Object.keys(d).length) {
      hydrated.current = true;
      setCfg((p) => {
        const merged = { ...p, ...(d as Partial<typeof p>) };
        reset(merged);
        return merged;
      });
    }
  }, [docQ.data, reset]);
  const upd = (patch: Partial<typeof cfg>) =>
    setCfg((p) => ({ ...p, ...patch }));
  const setAction = (k: string, v: PolicyState) =>
    setCfg((p) => ({ ...p, actions: { ...p.actions, [k]: v } }));
  const save = () => {
    saveMut.mutate(cfg as unknown as Record<string, unknown>, {
      onSuccess: () => {
        reset(cfg);
        setSavedAt(Date.now());
      },
    });
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
          Agent Guardrails
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
        Control what the CloudGuard agent may do in your environment, and what
        requires a human. Sandbox sizing lives in{" "}
        <a
          href="/settings/sandbox-compute"
          style={{ color: S.accent, textDecoration: "none" }}
        >
          Sandbox Compute
        </a>
        ; containment in{" "}
        <a
          href="/settings/isolation"
          style={{ color: S.accent, textDecoration: "none" }}
        >
          Isolation & Containment
        </a>
        .
      </p>

      <div style={{ marginBottom: 24 }}>
        <RelatedLinks
          label="Live in Agent Control Plane"
          items={[
            ["Active policy", "/agent-control-plane/enforcement"],
            ["Approvals queue", "/agent-control-plane/enforcement"],
            ["Runs", "/agent-control-plane/runs"],
          ]}
        />
      </div>

      <EffectiveGuardrailsCard />

      <div style={{ marginBottom: 32 }}>
        <H2 sub="The default for new conversations. Individual runs can be more restrictive, never more permissive.">
          Default autonomy
        </H2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {MODES.map((m) => {
            const on = cfg.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => upd({ mode: m.id })}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: `1px solid ${on ? S.accent : S.border}`,
                  background: on ? "rgba(45,134,212,0.08)" : "transparent",
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
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 13.5,
                        color: S.textPrimary,
                        fontWeight: 500,
                      }}
                    >
                      {m.id}
                    </span>
                    {m.id === "Autonomous" && (
                      <span
                        style={{
                          height: 17,
                          padding: "0 6px",
                          borderRadius: 99,
                          fontSize: 10,
                          fontWeight: 600,
                          color: S.warning,
                          background: S.badgeBg,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        elevated risk
                      </span>
                    )}
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
      </div>

      <div style={{ marginBottom: 32 }}>
        <H2 sub="Even in Autonomous mode, these actions always pause for human approval.">
          Approval gates
        </H2>
        <Row label="Require approval for any write">
          <Toggle
            on={cfg.approveWrites}
            onChange={(v) => upd({ approveWrites: v })}
            label="approve writes"
          />
        </Row>
        <Row label="Require approval to delete resources">
          <Toggle
            on={cfg.approveDelete}
            onChange={(v) => upd({ approveDelete: v })}
            label="approve delete"
          />
        </Row>
        <Row label="Require approval for IAM / policy changes">
          <Toggle
            on={cfg.approveIam}
            onChange={(v) => upd({ approveIam: v })}
            label="approve iam"
          />
        </Row>
        <Row label="Require approval for cross-account actions">
          <Toggle
            on={cfg.approveCrossAccount}
            onChange={(v) => upd({ approveCrossAccount: v })}
            label="approve cross-account"
          />
        </Row>
        <Row
          label="Require approval above estimated spend"
          sublabel="Per remediation run, in USD."
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: S.textMuted }}>$</span>
            <input
              value={cfg.spendGate}
              inputMode="numeric"
              onChange={(e) =>
                upd({ spendGate: e.target.value.replace(/[^0-9]/g, "") })
              }
              style={{
                ...selectStyle,
                width: 90,
                appearance: "auto",
                cursor: "text",
                paddingRight: 10,
              }}
            />
          </div>
        </Row>
        <Row
          label="Approvers"
          sublabel="Roles allowed to approve agent actions."
        >
          <select
            value={cfg.reviewer}
            onChange={(e) => upd({ reviewer: e.target.value })}
            style={selectStyle}
          >
            {REVIEWERS.map((r) => (
              <option key={r} value={r} style={optBg}>
                {r} and up
              </option>
            ))}
          </select>
        </Row>
      </div>

      <div style={{ marginBottom: 32 }}>
        <H2 sub="Per-capability policy. 'Ask' pauses for approval; 'Never' blocks the action entirely.">
          Action policy
        </H2>
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {ACTIONS.map((a, i) => (
            <div
              key={a.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderBottom:
                  i < ACTIONS.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    height: 17,
                    padding: "0 6px",
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    color: a.risk === "WRITE" ? S.danger : S.textMuted,
                    background: S.badgeBg,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {a.risk}
                </span>
                <span style={{ fontSize: 13, color: S.textSecondary }}>
                  {a.label}
                </span>
              </div>
              <PolicyPicker
                value={cfg.actions[a.key]}
                onChange={(v) => setAction(a.key, v)}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <H2 sub="Hard caps that bound the impact of any single run.">
          Blast radius
        </H2>
        <Row label="Max resources changed per run">
          <input
            value={cfg.maxChanges}
            inputMode="numeric"
            onChange={(e) =>
              upd({ maxChanges: e.target.value.replace(/[^0-9]/g, "") })
            }
            style={{
              ...selectStyle,
              width: 90,
              appearance: "auto",
              cursor: "text",
              paddingRight: 10,
            }}
          />
        </Row>
        <Row label="Max parallel actions">
          <input
            value={cfg.maxParallel}
            inputMode="numeric"
            onChange={(e) =>
              upd({ maxParallel: e.target.value.replace(/[^0-9]/g, "") })
            }
            style={{
              ...selectStyle,
              width: 90,
              appearance: "auto",
              cursor: "text",
              paddingRight: 10,
            }}
          />
        </Row>
        <Row
          label="Dry-run by default"
          sublabel="Preview changes before anything is applied."
        >
          <Toggle
            on={cfg.dryRun}
            onChange={(v) => upd({ dryRun: v })}
            label="dry run"
          />
        </Row>
        <Row
          label="Change window"
          sublabel="When remediation is allowed to execute."
        >
          <select
            value={cfg.changeWindow}
            onChange={(e) => upd({ changeWindow: e.target.value })}
            style={selectStyle}
          >
            {[
              "Anytime",
              "Business hours only",
              "Maintenance window only",
              "Approval required (no window)",
            ].map((o) => (
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
        onSave={save}
        onDiscard={() => setCfg(baseline)}
      />
    </div>
  );
}

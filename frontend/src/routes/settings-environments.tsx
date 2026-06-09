/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ConfirmButton,
  ScopeBadge,
  Toggle,
} from "#/components/features/settings/settings-kit";

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

interface Env {
  id: string;
  name: string;
  color: string;
  workspaces: string[];
  policy: string;
  locked: boolean;
}
const INITIAL_ENVS: Env[] = [
  {
    id: "prod",
    name: "Production",
    color: S.danger,
    workspaces: ["Production Cloud"],
    policy: "Remediation requires approval · change-window enforced",
    locked: true,
  },
  {
    id: "staging",
    name: "Staging",
    color: S.warning,
    workspaces: ["Sentinel Security Workspace"],
    policy: "Auto-remediation allowed for Low/Medium",
    locked: false,
  },
  {
    id: "dev",
    name: "Development",
    color: S.success,
    workspaces: ["Sandbox / Dev"],
    policy: "No change control",
    locked: false,
  },
];

interface TagKey {
  key: string;
  values: string[];
  required: boolean;
  desc: string;
}
const INITIAL_TAGS: TagKey[] = [
  {
    key: "environment",
    values: ["prod", "staging", "dev"],
    required: true,
    desc: "Lifecycle stage of the asset.",
  },
  {
    key: "data-classification",
    values: ["public", "internal", "confidential", "restricted"],
    required: true,
    desc: "Sensitivity tier — drives policy.",
  },
  {
    key: "team",
    values: ["platform", "secops", "data", "payments"],
    required: false,
    desc: "Owning team for routing.",
  },
  {
    key: "cost-center",
    values: ["cc-1001", "cc-2200", "cc-3050"],
    required: false,
    desc: "Chargeback / showback code.",
  },
];

const inputStyle: React.CSSProperties = {
  height: 32,
  padding: "0 10px",
  background: S.inputBg,
  border: `1px solid ${S.border}`,
  borderRadius: 6,
  color: S.textPrimary,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
function H2({
  children,
  sub,
  action,
}: {
  children: React.ReactNode;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 14,
      }}
    >
      <div>
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
      {action}
    </div>
  );
}

export default function EnvironmentsSettings() {
  const [envs, setEnvs] = React.useState<Env[]>(INITIAL_ENVS);
  const [tags, setTags] = React.useState<TagKey[]>(INITIAL_TAGS);
  const [newEnv, setNewEnv] = React.useState("");
  const [newTag, setNewTag] = React.useState("");

  const addEnv = () => {
    if (!newEnv.trim()) return;
    setEnvs((p) => [
      ...p,
      {
        id: newEnv.toLowerCase().replace(/\s+/g, "-"),
        name: newEnv.trim(),
        color: S.accent,
        workspaces: [],
        policy: "No change control",
        locked: false,
      },
    ]);
    setNewEnv("");
  };
  const removeEnv = (id: string) =>
    setEnvs((p) => p.filter((e) => e.id !== id));
  const toggleReq = (key: string) =>
    setTags((p) =>
      p.map((t) => (t.key === key ? { ...t, required: !t.required } : t)),
    );
  const addTag = () => {
    if (!newTag.trim()) return;
    setTags((p) => [
      ...p,
      {
        key: newTag.trim().toLowerCase(),
        values: [],
        required: false,
        desc: "New tag key.",
      },
    ]);
    setNewTag("");
  };
  const removeTag = (key: string) =>
    setTags((p) => p.filter((t) => t.key !== key));

  return (
    <div style={{ padding: "40px 48px", maxWidth: 880 }}>
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
          Environments & Tags
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
        Group workspaces into environments with their own change-control policy,
        and govern the tag taxonomy applied to assets and connectors.
      </p>

      {/* Environments */}
      <div style={{ marginBottom: 36 }}>
        <H2 sub="Each environment maps to workspaces and carries a remediation/change-control policy.">
          Environments
        </H2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 12,
          }}
        >
          {envs.map((e) => (
            <div
              key={e.id}
              style={{
                background: S.cardBg,
                border: `1px solid ${S.border}`,
                borderLeft: `3px solid ${e.color}`,
                borderRadius: 8,
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontSize: 13.5,
                      color: S.textSecondary,
                      fontWeight: 600,
                    }}
                  >
                    {e.name}
                  </span>
                  {e.locked && (
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
                      protected
                    </span>
                  )}
                </div>
                <ConfirmButton
                  variant="link"
                  label="Delete"
                  disabled={e.locked}
                  disabledReason="Protected environments can't be deleted"
                  title={`Delete environment "${e.name}"?`}
                  body="Workspaces mapped here will become unassigned."
                  confirmLabel="Delete environment"
                  onConfirm={() => removeEnv(e.id)}
                />
              </div>
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 6 }}>
                Workspaces:{" "}
                {e.workspaces.length ? e.workspaces.join(", ") : "none"} ·
                Policy: {e.policy}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newEnv}
            onChange={(e) => setNewEnv(e.target.value)}
            placeholder="New environment name…"
            style={{ ...inputStyle, flex: 1, maxWidth: 280 }}
          />
          <button
            type="button"
            onClick={addEnv}
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: 6,
              background: S.accent,
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Create environment
          </button>
        </div>
      </div>

      {/* Tag taxonomy */}
      <div>
        <H2 sub="Allowed tag keys and values. Required keys are enforced on new connectors and assets.">
          Tag taxonomy
        </H2>
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.6fr 90px 70px",
              padding: "8px 16px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {["Key", "Allowed values", "Required", ""].map((h) => (
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
          {tags.map((t, i) => (
            <div
              key={t.key}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.6fr 90px 70px",
                padding: "11px 16px",
                borderBottom:
                  i < tags.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: S.textSecondary,
                    fontFamily: "monospace",
                  }}
                >
                  {t.key}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: S.textMuted,
                    marginTop: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.desc}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {t.values.length ? (
                  t.values.map((v) => (
                    <span
                      key={v}
                      style={{
                        height: 19,
                        padding: "0 7px",
                        borderRadius: 99,
                        fontSize: 11,
                        background: S.badgeBg,
                        color: S.textSecondary,
                        display: "inline-flex",
                        alignItems: "center",
                        fontFamily: "monospace",
                      }}
                    >
                      {v}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 12, color: S.textMuted }}>any</span>
                )}
              </div>
              <Toggle
                on={t.required}
                onChange={() => toggleReq(t.key)}
                label={`${t.key} required`}
              />
              <button
                type="button"
                onClick={() => removeTag(t.key)}
                style={{
                  justifySelf: "end",
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
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag key (e.g. owner)…"
            style={{ ...inputStyle, flex: 1, maxWidth: 280 }}
          />
          <button
            type="button"
            onClick={addTag}
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: 6,
              background: S.accent,
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Add tag key
          </button>
        </div>
      </div>
    </div>
  );
}

/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import { Bot } from "lucide-react";
import {
  ConfirmButton,
  EmptyState,
  ScopeBadge,
  useDialogA11y,
} from "#/components/features/settings/settings-kit";
import { LiveCollectionCard } from "#/components/features/settings/live-collection-card";

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

const ROLES = ["Admin", "Security Engineer", "Analyst", "Read-only"];
const WORKSPACES = [
  "Sentinel Security Workspace",
  "Production Cloud",
  "Sandbox / Dev",
];
const EXPIRY = ["30 days", "90 days", "1 year", "No expiry"];

interface SA {
  id: string;
  name: string;
  clientId: string;
  role: string;
  workspace: string;
  lastUsed: string;
  created: string;
  owner: string;
  expires: string;
  active: boolean;
}

const INITIAL: SA[] = [
  {
    id: "1",
    name: "ci-scanner",
    clientId: "sa_7f3c…a91b",
    role: "Security Engineer",
    workspace: "Production Cloud",
    lastUsed: "4 min ago",
    created: "Jan 12, 2026",
    owner: "Rami S.",
    expires: "Oct 12, 2026",
    active: true,
  },
  {
    id: "2",
    name: "terraform-bot",
    clientId: "sa_2d8e…44f0",
    role: "Admin",
    workspace: "Production Cloud",
    lastUsed: "1 h ago",
    created: "Feb 3, 2026",
    owner: "Jana D.",
    expires: "No expiry",
    active: true,
  },
  {
    id: "3",
    name: "nightly-audit",
    clientId: "sa_9b1a…c2d7",
    role: "Read-only",
    workspace: "Sentinel Security Workspace",
    lastUsed: "8 h ago",
    created: "Mar 20, 2026",
    owner: "Rami S.",
    expires: "Jun 20, 2026",
    active: true,
  },
  {
    id: "4",
    name: "siem-forwarder",
    clientId: "sa_4e6f…0b9c",
    role: "Read-only",
    workspace: "Sentinel Security Workspace",
    lastUsed: "12 d ago",
    created: "Nov 2, 2025",
    owner: "Marc T.",
    expires: "Expired",
    active: false,
  },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 36,
  padding: "0 10px",
  background: S.inputBg,
  border: `1px solid ${S.border}`,
  borderRadius: 6,
  color: S.textPrimary,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none" as const,
  cursor: "pointer",
};
const optBg = { background: "var(--cg-bg-card)" } as const;

function RoleBadge({ role }: { role: string }) {
  const color =
    role === "Admin"
      ? S.purple
      : role === "Security Engineer"
        ? S.accent
        : S.textMuted;
  const bg =
    role === "Admin"
      ? "rgba(155,135,245,0.15)"
      : role === "Security Engineer"
        ? "rgba(45,134,212,0.15)"
        : S.badgeBg;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 8px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 500,
        color,
        background: bg,
        whiteSpace: "nowrap",
      }}
    >
      {role}
    </span>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const dref = useDialogA11y(true, onClose);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        ref={dref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: "92vw",
          background: S.cardBg,
          border: `1px solid ${S.borderStrong}`,
          borderRadius: 12,
          padding: 24,
          outline: "none",
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: S.textPrimary,
            margin: 0,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            style={{
              fontSize: 13,
              color: S.textMuted,
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            {subtitle}
          </p>
        )}
        <div style={{ marginTop: 18 }}>{children}</div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 36,
              padding: "0 16px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${S.borderStrong}`,
              color: S.textSecondary,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Close
          </button>
          {footer}
        </div>
      </div>
    </div>
  );
}

function MField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          color: S.textMuted,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ServiceAccountsSettings() {
  const [rows, setRows] = React.useState<SA[]>(INITIAL);
  const [modal, setModal] = React.useState<null | "create" | "key">(null);
  const [form, setForm] = React.useState({
    name: "",
    role: "Read-only",
    workspace: WORKSPACES[0],
    expiry: "90 days",
  });
  const [newKey, setNewKey] = React.useState("");

  const create = () => {
    if (!form.name.trim()) return;
    const id = String(Date.now());
    setRows((p) => [
      ...p,
      {
        id,
        name: form.name.trim(),
        clientId: `sa_${Math.random().toString(16).slice(2, 6)}…${Math.random().toString(16).slice(2, 6)}`,
        role: form.role,
        workspace: form.workspace,
        lastUsed: "never",
        created: "Just now",
        owner: "Rami S.",
        expires:
          form.expiry === "No expiry" ? "No expiry" : "in " + form.expiry,
        active: true,
      },
    ]);
    setForm({
      name: "",
      role: "Read-only",
      workspace: WORKSPACES[0],
      expiry: "90 days",
    });
    setNewKey(
      `cg_sa_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
    );
    setModal("key");
  };

  const toggleActive = (id: string) =>
    setRows((p) =>
      p.map((r) => (r.id === id ? { ...r, active: !r.active } : r)),
    );
  const rotate = (id: string) => {
    void id;
    setNewKey(
      `cg_sa_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
    );
    setModal("key");
  };
  const remove = (id: string) => setRows((p) => p.filter((r) => r.id !== id));

  return (
    <div style={{ padding: "40px 48px", maxWidth: 880 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 8,
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
            Service Accounts
          </h1>
          <ScopeBadge scope="Organization" />
        </div>
        <button
          type="button"
          onClick={() => setModal("create")}
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
          + Create service account
        </button>
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 28,
          marginTop: 0,
        }}
      >
        Non-human identities for CI/CD, IaC pipelines and scheduled scans. Scope
        each to least privilege, rotate keys, and set expiry.
      </p>

      <LiveCollectionCard
        seg="service-accounts"
        title="Service accounts"
        field="name"
        placeholder="name — e.g. ci-scanner@svc"
      />

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
            gridTemplateColumns: "1.2fr 1fr 130px 1fr 90px 80px 90px",
            padding: "8px 16px",
            borderBottom: `1px solid ${S.border}`,
          }}
        >
          {[
            "Name",
            "Client ID",
            "Role",
            "Workspace",
            "Last used",
            "Status",
            "",
          ].map((h, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: S.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              {h}
            </span>
          ))}
        </div>
        {rows.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 130px 1fr 90px 80px 90px",
              padding: "10px 16px",
              borderBottom:
                i < rows.length - 1
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
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.name}
              </div>
              <div style={{ fontSize: 11, color: S.textMuted }}>
                by {r.owner} · exp {r.expires}
              </div>
            </div>
            <span
              style={{
                fontSize: 12,
                color: S.textMuted,
                fontFamily: "monospace",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.clientId}
            </span>
            <div>
              <RoleBadge role={r.role} />
            </div>
            <span
              style={{
                fontSize: 12,
                color: S.textMuted,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.workspace}
            </span>
            <span
              style={{
                fontSize: 12,
                color: r.lastUsed === "never" ? S.textMuted : S.textSecondary,
              }}
            >
              {r.lastUsed}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: r.active ? S.success : S.textMuted,
              }}
            >
              {r.active ? "Active" : "Disabled"}
            </span>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                onClick={() => rotate(r.id)}
                title="Rotate key"
                style={{
                  background: "none",
                  border: "none",
                  color: S.accent,
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Rotate
              </button>
              <button
                type="button"
                onClick={() => toggleActive(r.id)}
                title={r.active ? "Disable" : "Enable"}
                style={{
                  background: "none",
                  border: "none",
                  color: S.textMuted,
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {r.active ? "Disable" : "Enable"}
              </button>
              <ConfirmButton
                variant="link"
                label="✕"
                title={`Delete service account "${r.name}"?`}
                body="Any automation using this key will immediately lose access. This cannot be undone."
                confirmLabel="Delete service account"
                onConfirm={() => remove(r.id)}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 16 }}>
            <EmptyState
              icon={<Bot size={24} />}
              title="No service accounts yet"
              hint="Create a scoped, non-human identity for CI/CD pipelines or scheduled scans."
              cta="Create service account"
              onCta={() => setModal("create")}
            />
          </div>
        )}
      </div>

      {modal === "create" && (
        <Modal
          title="Create service account"
          subtitle="A scoped, non-human identity for automation."
          onClose={() => setModal(null)}
          footer={
            <button
              type="button"
              onClick={create}
              style={{
                height: 36,
                padding: "0 16px",
                borderRadius: 6,
                background: "var(--cg-text-primary)",
                color: "var(--cg-bg-card)",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              Create
            </button>
          }
        >
          <MField label="Name">
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. ci-scanner"
              style={inputStyle}
            />
          </MField>
          <MField label="Role (least privilege)">
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              style={selectStyle}
            >
              {ROLES.map((r) => (
                <option key={r} value={r} style={optBg}>
                  {r}
                </option>
              ))}
            </select>
          </MField>
          <MField label="Workspace">
            <select
              value={form.workspace}
              onChange={(e) =>
                setForm((p) => ({ ...p, workspace: e.target.value }))
              }
              style={selectStyle}
            >
              {WORKSPACES.map((w) => (
                <option key={w} value={w} style={optBg}>
                  {w}
                </option>
              ))}
            </select>
          </MField>
          <MField label="Key expiry">
            <select
              value={form.expiry}
              onChange={(e) =>
                setForm((p) => ({ ...p, expiry: e.target.value }))
              }
              style={selectStyle}
            >
              {EXPIRY.map((x) => (
                <option key={x} value={x} style={optBg}>
                  {x}
                </option>
              ))}
            </select>
          </MField>
        </Modal>
      )}

      {modal === "key" && (
        <Modal
          title="Service account key"
          subtitle="Copy this key now — it won't be shown again."
          onClose={() => setModal(null)}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              background: S.inputBg,
              border: `1px solid ${S.border}`,
              borderRadius: 6,
              padding: "10px 12px",
            }}
          >
            <code
              style={{
                flex: 1,
                fontSize: 12,
                color: S.textPrimary,
                wordBreak: "break-all",
              }}
            >
              {newKey}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(newKey)}
              style={{
                height: 28,
                padding: "0 10px",
                borderRadius: 6,
                background: "transparent",
                border: `1px solid ${S.borderStrong}`,
                color: S.textSecondary,
                fontSize: 12,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Copy
            </button>
          </div>
          <p
            style={{
              fontSize: 12,
              color: S.warning,
              marginTop: 12,
              marginBottom: 0,
            }}
          >
            ⚠ Store it in your secret manager. CloudGuard never displays it
            again.
          </p>
        </Modal>
      )}
    </div>
  );
}

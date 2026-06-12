/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ConfirmButton,
  ScopeBadge,
  useDialogA11y,
} from "#/components/features/settings/settings-kit";
import { useOrgRoles } from "#/hooks/query/use-cloudguard";
import { useLiveCollection } from "#/hooks/use-live-collection";

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

// Live authoritative RBAC matrix from cloudguard/rbac.py (the enforced model the UI roles map
// onto). Purely additive — renders only when the backend endpoint is reachable.
function RbacModelCard() {
  const { data, isError, isLoading } = useOrgRoles();
  if (isLoading || isError || !data) return null;
  return (
    <div
      style={{
        background: S.cardBg,
        border: `1px solid ${S.border}`,
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: S.textPrimary }}>
          Enforced RBAC model
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
      <p style={{ fontSize: 12, color: S.textMuted, margin: "0 0 12px" }}>
        The authoritative capability + tier each role grants, read from the
        backend (cloudguard/rbac.py). Built-in roles above map onto these.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.roles.map((r) => (
          <div
            key={r.role}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 90px",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
              borderBottom: "1px solid var(--cg-border-subtle)",
            }}
          >
            <span
              style={{ fontSize: 13, color: S.textPrimary, fontWeight: 500 }}
            >
              {r.role}
              {r.is_default && (
                <span style={{ color: S.textMuted, fontWeight: 400 }}>
                  {" "}
                  · default
                </span>
              )}
            </span>
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {r.capabilities.map((c) => (
                <span
                  key={c}
                  style={{
                    fontSize: 11,
                    color: S.accent,
                    background: "rgba(45,134,212,0.12)",
                    borderRadius: 99,
                    padding: "2px 8px",
                  }}
                >
                  {c}
                </span>
              ))}
            </span>
            <span style={{ fontSize: 12, color: S.textMuted }}>
              max tier {r.max_tier}
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11.5, color: S.textMuted, margin: "10px 0 0" }}>
        Tier 4 is never grantable to any role.
      </p>
    </div>
  );
}

// Permission catalog — the custom capabilities a role can grant. Maps to cloudguard/rbac.py capabilities.
const PERMISSIONS = [
  "View findings & coverage",
  "Run scans",
  "Manage connectors",
  "Manage secrets",
  "Manage webhooks",
  "Manage service accounts",
  "Manage members",
  "Manage roles",
  "Manage billing",
  "Org admin",
];

const ORGS = ["Sentinel Security Corp", "Acme Inc (sandbox)"];

interface Role {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  rbac: string; // mapping to cloudguard/rbac.py
  members: string[];
  perms: string[];
}

const INITIAL: Role[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full administrative access.",
    builtin: true,
    rbac: "ADMIN",
    members: ["Rami Sentinel"],
    perms: [...PERMISSIONS],
  },
  {
    id: "seceng",
    name: "Security Engineer",
    description: "Run scans and manage security config.",
    builtin: true,
    rbac: "OPERATOR",
    members: ["Jana Doe", "Sam K."],
    perms: [
      "View findings & coverage",
      "Run scans",
      "Manage connectors",
      "Manage secrets",
      "Manage webhooks",
      "Manage service accounts",
    ],
  },
  {
    id: "analyst",
    name: "Analyst",
    description: "Triage findings and run scoped scans.",
    builtin: true,
    rbac: "OPERATOR",
    members: ["Marc T."],
    perms: ["View findings & coverage", "Run scans"],
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access to findings and coverage.",
    builtin: true,
    rbac: "END_USER",
    members: ["Auditor (ext.)"],
    perms: ["View findings & coverage"],
  },
  {
    id: "wsadmin",
    name: "Workspace Admin",
    description: "Full control within assigned workspaces (not org-wide).",
    builtin: true,
    rbac: "OPERATOR",
    members: ["Sam Okoye"],
    perms: [
      "View findings & coverage",
      "Run scans",
      "Manage connectors",
      "Manage secrets",
      "Manage webhooks",
      "Manage service accounts",
      "Manage members",
    ],
  },
  {
    id: "billing",
    name: "Billing Manager",
    description:
      "Manage subscription, invoices and seats — no security access.",
    builtin: true,
    rbac: "END_USER",
    members: ["Lena Park"],
    perms: ["Manage billing"],
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

function RbacBadge({ rbac }: { rbac: string }) {
  const color =
    rbac === "ADMIN" ? S.purple : rbac === "OPERATOR" ? S.accent : S.textMuted;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 18,
        padding: "0 7px",
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 600,
        color,
        background: S.badgeBg,
        fontFamily: "monospace",
      }}
    >
      rbac:{rbac}
    </span>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
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
          width: wide ? 560 : 460,
          maxWidth: "92vw",
          maxHeight: "88vh",
          overflowY: "auto",
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
            Cancel
          </button>
          {footer}
        </div>
      </div>
    </div>
  );
}

function PermChecklist({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (p: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {PERMISSIONS.map((p) => {
        const on = selected.includes(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => onToggle(p)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textAlign: "left",
              padding: "8px 10px",
              borderRadius: 6,
              cursor: "pointer",
              border: `1px solid ${on ? S.accent : S.border}`,
              background: on ? "rgba(45,134,212,0.10)" : "transparent",
              color: on ? S.textPrimary : S.textSecondary,
              fontSize: 12.5,
            }}
          >
            <span
              style={{
                width: 15,
                height: 15,
                borderRadius: 4,
                flexShrink: 0,
                border: `1px solid ${on ? S.accent : S.borderStrong}`,
                background: on ? S.accent : "transparent",
                color: "#fff",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {on ? "✓" : ""}
            </span>
            {p}
          </button>
        );
      })}
    </div>
  );
}

export default function UserRolesSettings() {
  const [org, setOrg] = React.useState(ORGS[0]);
  // Live, backend-persisted (admin) — survives refresh. Custom roles are a collection; create/
  // edit/delete hit /collections/roles and are audited.
  const rolesC = useLiveCollection(
    "roles",
    INITIAL as unknown as Record<string, unknown>[],
  );
  const roles = rolesC.items as unknown as Role[];
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<null | "create" | "edit">(null);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    perms: ["View findings & coverage"] as string[],
  });

  const togglePerm = (p: string) =>
    setForm((f) => ({
      ...f,
      perms: f.perms.includes(p)
        ? f.perms.filter((x) => x !== p)
        : [...f.perms, p],
    }));

  const openCreate = () => {
    setForm({ name: "", description: "", perms: ["View findings & coverage"] });
    setModal("create");
  };
  const openEdit = (r: Role) => {
    setEditId(r.id);
    setForm({ name: r.name, description: r.description, perms: [...r.perms] });
    setModal("edit");
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (modal === "create") {
      rolesC.add({
        name: form.name.trim(),
        description: form.description,
        builtin: false,
        rbac: form.perms.includes("Org admin")
          ? "ADMIN"
          : form.perms.includes("Run scans")
            ? "OPERATOR"
            : "END_USER",
        members: [],
        perms: form.perms,
      });
    } else if (modal === "edit" && editId) {
      rolesC.update(editId, {
        name: form.name.trim(),
        description: form.description,
        perms: form.perms,
      });
    }
    setModal(null);
    setEditId(null);
  };
  const remove = (id: string) => rolesC.remove(id);

  return (
    <div style={{ padding: "40px 48px", maxWidth: 900 }}>
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
            User Roles
          </h1>
          <ScopeBadge scope="Organization" />
        </div>
        <button
          type="button"
          onClick={openCreate}
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
          + Create role
        </button>
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 24,
          marginTop: 0,
        }}
      >
        Define roles and their custom permissions, and see which members hold
        each role. Built-in roles map to CloudGuard's RBAC tiers.
      </p>

      <RbacModelCard />

      <div style={{ marginBottom: 24, maxWidth: 320 }}>
        <label
          style={{
            display: "block",
            fontSize: 10,
            fontWeight: 600,
            color: S.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 6,
          }}
        >
          Organization
        </label>
        <select
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          style={selectStyle}
        >
          {ORGS.map((o) => (
            <option key={o} value={o} style={optBg}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {roles.map((r) => {
          const open = expanded === r.id;
          return (
            <div
              key={r.id}
              style={{
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                background: S.cardBg,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : r.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    minWidth: 0,
                    flex: 1,
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      color: S.textMuted,
                      fontSize: 12,
                      transform: open ? "rotate(90deg)" : "none",
                      transition: "transform 120ms",
                    }}
                  >
                    ▶
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: S.textPrimary,
                    }}
                  >
                    {r.name}
                  </span>
                  <RbacBadge rbac={r.rbac} />
                  {r.builtin && (
                    <span
                      style={{
                        height: 18,
                        padding: "0 7px",
                        borderRadius: 99,
                        fontSize: 10,
                        fontWeight: 600,
                        color: S.textMuted,
                        background: S.badgeBg,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      built-in
                    </span>
                  )}
                </button>
                <span
                  style={{ fontSize: 12, color: S.textMuted, flexShrink: 0 }}
                >
                  {r.members.length} member{r.members.length === 1 ? "" : "s"} ·{" "}
                  {r.perms.length} perms
                </span>
                <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    style={{
                      background: "none",
                      border: "none",
                      color: S.accent,
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Edit
                  </button>
                  <ConfirmButton
                    variant="link"
                    label="Delete"
                    disabled={r.builtin}
                    disabledReason="Built-in roles can't be deleted"
                    title={`Delete role "${r.name}"?`}
                    body={`${r.members.length} member(s) currently hold this role and will need reassigning. This cannot be undone.`}
                    confirmLabel="Delete role"
                    onConfirm={() => remove(r.id)}
                  />
                </div>
              </div>
              {open && (
                <div
                  style={{
                    padding: "0 16px 16px",
                    borderTop: `1px solid var(--cg-border-subtle)`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: S.textMuted,
                      margin: "12px 0",
                    }}
                  >
                    {r.description}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: S.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8,
                    }}
                  >
                    Permissions
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 16,
                    }}
                  >
                    {r.perms.map((p) => (
                      <span
                        key={p}
                        style={{
                          height: 22,
                          padding: "0 9px",
                          borderRadius: 99,
                          fontSize: 11,
                          background: S.badgeBg,
                          color: S.textSecondary,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: S.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8,
                    }}
                  >
                    Members
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {r.members.length === 0 ? (
                      <span style={{ fontSize: 12, color: S.textMuted }}>
                        No members yet.
                      </span>
                    ) : (
                      r.members.map((m) => (
                        <span
                          key={m}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            height: 26,
                            padding: "0 10px",
                            borderRadius: 99,
                            background: S.badgeBg,
                            color: S.textSecondary,
                            fontSize: 12,
                          }}
                        >
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: "var(--cg-text-primary)",
                              color: "var(--cg-bg-card)",
                              fontSize: 9,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {m
                              .split(" ")
                              .slice(0, 2)
                              .map((s) => s[0])
                              .join("")}
                          </span>
                          {m}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(modal === "create" || modal === "edit") && (
        <Modal
          title={modal === "create" ? "Create role" : "Edit role"}
          subtitle="Pick a name and the custom permissions this role grants."
          wide
          onClose={() => {
            setModal(null);
            setEditId(null);
          }}
          footer={
            <button
              type="button"
              onClick={save}
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
              {modal === "create" ? "Create role" : "Save changes"}
            </button>
          }
        >
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: S.textMuted,
                marginBottom: 6,
              }}
            >
              Role name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Compliance Auditor"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: S.textMuted,
                marginBottom: 6,
              }}
            >
              Description
            </label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="What this role is for"
              style={inputStyle}
            />
          </div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              color: S.textMuted,
              marginBottom: 8,
            }}
          >
            Custom permissions
          </label>
          <PermChecklist selected={form.perms} onToggle={togglePerm} />
        </Modal>
      )}
    </div>
  );
}

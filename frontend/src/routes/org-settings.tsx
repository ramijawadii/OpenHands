/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ConfirmButton,
  ScopeBadge,
  useDialogA11y,
} from "#/components/features/settings/settings-kit";
import { useLiveCollection } from "#/hooks/use-live-collection";
import {
  useSettingsDoc,
  useSaveSettingsDoc,
} from "#/hooks/query/use-cloudguard";

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
  cardBg: "var(--cg-bg-card)",
  purple: "var(--cg-accent-purple)",
  badgeBg: "var(--cg-bg-badge)",
} as const;

const MEMBERS = [
  {
    initials: "RS",
    name: "Rami Sentinel",
    email: "rami@sentinel-org.io",
    role: "Admin",
    last: "Now",
    color: S.purple,
  },
  {
    initials: "JD",
    name: "Jana Doe",
    email: "jana@sentinel-org.io",
    role: "Security Engineer",
    last: "1h ago",
    color: S.accent,
  },
  {
    initials: "MT",
    name: "Marc T.",
    email: "marc@sentinel-org.io",
    role: "Viewer",
    last: "3d ago",
    color: "#4caf7d",
  },
];

const ROLES_TABLE = [
  {
    role: "Admin",
    view: true,
    scan: true,
    connectors: true,
    orgAdmin: true,
    color: S.purple,
  },
  {
    role: "Security Engineer",
    view: true,
    scan: true,
    connectors: true,
    orgAdmin: false,
    color: S.accent,
  },
  {
    role: "Analyst",
    view: true,
    scan: false,
    connectors: false,
    orgAdmin: false,
    color: S.textMuted,
  },
  {
    role: "Viewer",
    view: true,
    scan: false,
    connectors: false,
    orgAdmin: false,
    color: S.textMuted,
  },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: S.textPrimary,
          paddingBottom: 12,
          borderBottom: `1px solid ${S.border}`,
          marginBottom: 20,
          marginTop: 0,
        }}
      >
        {title}
      </h2>
      {children}
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
        alignItems: "flex-start",
        justifyContent: "space-between",
        minHeight: 44,
        padding: "10px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
        gap: 24,
      }}
    >
      <div style={{ flexShrink: 0, maxWidth: 280 }}>
        <div style={{ fontSize: 14, color: S.textSecondary }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      <div style={{ flex: 1, maxWidth: 400 }}>{children}</div>
    </div>
  );
}

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
        width: "fit-content",
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

function Check({ on }: { on: boolean }) {
  return (
    <span style={{ fontSize: 13, color: on ? S.success : S.textMuted }}>
      {on ? "✓" : "—"}
    </span>
  );
}

function Toggle({
  on,
  onChange,
  label,
  sublabel,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        minHeight: 44,
        padding: "10px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
        gap: 24,
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: S.textSecondary }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          background: on ? S.accent : "var(--cg-toggle-off)",
          position: "relative",
          transition: "background 120ms ease",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 14 : 2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: S.textPrimary,
            transition: "left 120ms ease",
          }}
        />
      </button>
    </div>
  );
}

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

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "France",
  "Germany",
  "Canada",
  "Tunisia",
  "United Arab Emirates",
  "Australia",
  "Singapore",
  "Other",
];

// UI role vocabulary — maps to cloudguard/rbac.py: Admin->ADMIN, Security Engineer/Analyst->OPERATOR, Viewer->END_USER
const ROLE_OPTIONS = ["Admin", "Security Engineer", "Analyst", "Viewer"];

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
          width: 460,
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
            Cancel
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

function Cap({
  on,
  editable,
  onToggle,
}: {
  on: boolean;
  editable: boolean;
  onToggle: () => void;
}) {
  if (!editable) return <Check on={on} />;
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 14,
        color: on ? S.success : S.textMuted,
        padding: 0,
      }}
    >
      {on ? "✓" : "—"}
    </button>
  );
}

export default function OrgSettings() {
  const [sso, setSso] = React.useState(true);
  const [scim, setScim] = React.useState(false);
  const [org, setOrg] = React.useState({
    name: "Sentinel Security Corp",
    location: "100 Market Street, Suite 300",
    country: "United States",
    state: "California",
    postal: "94105",
  });
  const updOrg = (patch: Partial<typeof org>) =>
    setOrg((p) => ({ ...p, ...patch }));

  // Members share the canonical, backend-persisted (admin) "members" collection with the
  // dedicated Members tab — invite/remove survive refresh. Seed (mapped to the rich shape so
  // both tabs stay compatible) only runs once if the collection is still empty.
  const deriveInitials = (name: string, email: string) =>
    (name || email)
      .split(/[\s@.]+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || "")
      .join("") || "?";
  const ORG_MEMBER_SEED = MEMBERS.map((m) => ({
    name: m.name,
    email: m.email,
    role: m.role,
    status: "active",
    lastActive: m.last,
    mfa: false,
    provisioned: "Manual",
    color: m.color,
  }));
  const membersC = useLiveCollection(
    "members",
    ORG_MEMBER_SEED as unknown as Record<string, unknown>[],
  );
  const members = membersC.items.map((m) => ({
    ...(m as Record<string, unknown>),
    id: m.id as string,
    initials:
      (m.initials as string) ||
      deriveInitials(m.name as string, m.email as string),
    last: (m.last as string) || (m.lastActive as string) || "—",
  })) as unknown as ((typeof MEMBERS)[number] & { id: string })[];

  // Role-capability matrix persisted as one settings doc (admin console writes it).
  const [roles, setRoles] = React.useState(ROLES_TABLE);
  const rolesDocQ = useSettingsDoc("org-role-matrix");
  const rolesSave = useSaveSettingsDoc("org-role-matrix");
  const rolesHydrated = React.useRef(false);
  React.useEffect(() => {
    if (rolesHydrated.current) return;
    const d = rolesDocQ.data as { roles?: typeof ROLES_TABLE } | undefined;
    if (rolesDocQ.isError) {
      rolesHydrated.current = true;
      return;
    }
    if (d) {
      rolesHydrated.current = true;
      if (Array.isArray(d.roles) && d.roles.length) setRoles(d.roles);
    }
  }, [rolesDocQ.data, rolesDocQ.isError]);
  const [rolesEditable, setRolesEditable] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [invite, setInvite] = React.useState({
    name: "",
    email: "",
    role: "Analyst",
  });

  const removeMember = (id: string) => membersC.remove(id);
  const toggleCap = (
    idx: number,
    cap: "view" | "scan" | "connectors" | "orgAdmin",
  ) =>
    setRoles((p) => {
      const next = p.map((r, i) => (i === idx ? { ...r, [cap]: !r[cap] } : r));
      rolesSave.mutate({ roles: next });
      return next;
    });
  const sendInvite = () => {
    if (!invite.email.trim()) return;
    membersC.add({
      name: invite.name || invite.email,
      email: invite.email,
      role: invite.role,
      status: "active",
      lastActive: "Invited",
      mfa: false,
      provisioned: "Manual",
      color: S.accent,
    });
    setInvite({ name: "", email: "", role: "Analyst" });
    setInviteOpen(false);
  };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 760 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
          Organization
        </h1>
        <ScopeBadge scope="Organization" />
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 32,
          marginTop: 0,
        }}
      >
        Manage your organization's identity, members, and security policies.
      </p>

      <Section title="Organization Details">
        <Row label="Organization name">
          <input
            type="text"
            value={org.name}
            onChange={(e) => updOrg({ name: e.target.value })}
            style={inputStyle}
          />
        </Row>
        <Row
          label="Primary business location"
          sublabel="Registered street address of the organization."
        >
          <input
            type="text"
            value={org.location}
            onChange={(e) => updOrg({ location: e.target.value })}
            placeholder="Street address"
            style={inputStyle}
          />
        </Row>
        <Row label="Country">
          <select
            value={org.country}
            onChange={(e) => updOrg({ country: e.target.value })}
            style={selectStyle}
          >
            {COUNTRIES.map((c) => (
              <option
                key={c}
                value={c}
                style={{ background: "var(--cg-bg-card)" }}
              >
                {c}
              </option>
            ))}
          </select>
        </Row>
        <Row label="State / Province">
          <input
            type="text"
            value={org.state}
            onChange={(e) => updOrg({ state: e.target.value })}
            placeholder="State or province"
            style={inputStyle}
          />
        </Row>
        <Row label="Postal code">
          <input
            type="text"
            value={org.postal}
            onChange={(e) => updOrg({ postal: e.target.value })}
            placeholder="ZIP / postal code"
            style={{ ...inputStyle, maxWidth: 160 }}
          />
        </Row>
        <Row label="Plan">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                height: 20,
                padding: "0 8px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 500,
                color: S.purple,
                background: "rgba(155,135,245,0.15)",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Enterprise
            </span>
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: S.accent,
                fontSize: 13,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Manage billing →
            </button>
          </div>
        </Row>
        <Row label="Organization ID">
          <span
            style={{
              fontSize: 12,
              color: S.textMuted,
              fontFamily: "monospace",
            }}
          >
            org_8c2f4a1e-9b3d-4e7f-a2c1-5d8e6f3a0b9c
          </span>
        </Row>
        <Row label="Primary domain">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, color: S.textSecondary }}>
              sentinel-org.io
            </span>
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
              Verified ✓
            </span>
          </div>
        </Row>
      </Section>

      <Section title="Members">
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
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
            Invite member
          </button>
        </div>
        <input
          type="text"
          placeholder="Search members…"
          style={{
            width: "100%",
            height: 36,
            padding: "0 12px",
            background: S.inputBg,
            border: `1px solid ${S.border}`,
            borderRadius: 6,
            color: S.textPrimary,
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 12,
            fontFamily: "inherit",
          }}
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
              gridTemplateColumns: "40px 1fr 1fr 120px 80px 32px",
              padding: "8px 16px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {["", "Name", "Email", "Role", "Last active", ""].map((h, i) => (
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
          {members.map((m: (typeof MEMBERS)[number] & { id: string }, i) => (
            <div
              key={m.id}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 1fr 120px 80px 32px",
                padding: "10px 16px",
                borderBottom:
                  i < members.length - 1
                    ? `1px solid var(--cg-border-subtle)`
                    : "none",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: m.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {m.initials}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: S.textSecondary,
                  fontWeight: 500,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.name}
              </span>
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
                {m.email}
              </span>
              <div style={{ minWidth: 0 }}>
                <RoleBadge role={m.role} />
              </div>
              <span style={{ fontSize: 12, color: S.textMuted }}>{m.last}</span>
              <ConfirmButton
                variant="link"
                label="✕"
                title={`Remove ${m.name}?`}
                body={`${m.name} will lose access to this organization. You can re-invite them later.`}
                confirmLabel="Remove member"
                onConfirm={() => removeMember(m.id)}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Roles & Permissions">
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
              gridTemplateColumns: "140px repeat(4, 1fr)",
              padding: "8px 16px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {[
              "Role",
              "Coverage view",
              "Run scans",
              "Manage connectors",
              "Org admin",
            ].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 11,
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
          {roles.map((r, i) => (
            <div
              key={r.role}
              style={{
                display: "grid",
                gridTemplateColumns: "140px repeat(4, 1fr)",
                padding: "10px 16px",
                borderBottom:
                  i < roles.length - 1
                    ? `1px solid var(--cg-border-subtle)`
                    : "none",
                alignItems: "center",
              }}
            >
              <RoleBadge role={r.role} />
              <Cap
                on={r.view}
                editable={rolesEditable}
                onToggle={() => toggleCap(i, "view")}
              />
              <Cap
                on={r.scan}
                editable={rolesEditable}
                onToggle={() => toggleCap(i, "scan")}
              />
              <Cap
                on={r.connectors}
                editable={rolesEditable}
                onToggle={() => toggleCap(i, "connectors")}
              />
              <Cap
                on={r.orgAdmin}
                editable={rolesEditable}
                onToggle={() => toggleCap(i, "orgAdmin")}
              />
            </div>
          ))}
        </div>
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}
        >
          <button
            type="button"
            onClick={() => setRolesEditable((v) => !v)}
            style={{
              background: "none",
              border: "none",
              color: S.accent,
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {rolesEditable ? "Done editing" : "Edit roles"}
          </button>
        </div>
      </Section>

      <Section title="SSO & Provisioning">
        <Toggle
          on={sso}
          onChange={setSso}
          label="SAML 2.0 SSO"
          sublabel="Single sign-on via your identity provider."
        />
        <Toggle
          on={scim}
          onChange={setScim}
          label="SCIM Provisioning"
          sublabel="Automatic user provisioning. Requires SSO."
        />
        <Row label="Allowed email domains">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                height: 26,
                padding: "0 10px",
                borderRadius: 99,
                fontSize: 12,
                background: S.badgeBg,
                color: S.textSecondary,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              sentinel-org.io{" "}
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: S.textMuted,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
            <button
              type="button"
              style={{
                height: 26,
                padding: "0 10px",
                borderRadius: 99,
                fontSize: 12,
                background: "transparent",
                border: `1px dashed ${S.borderStrong}`,
                color: S.textMuted,
                cursor: "pointer",
              }}
            >
              + Add domain
            </button>
          </div>
        </Row>
        <Row label="Default role for new SSO members">
          <select
            style={{
              height: 36,
              padding: "0 10px",
              background: S.inputBg,
              border: `1px solid ${S.border}`,
              borderRadius: 6,
              color: S.textPrimary,
              fontSize: 14,
              outline: "none",
              appearance: "none",
              width: "100%",
              fontFamily: "inherit",
            }}
          >
            <option style={{ background: "var(--cg-bg-card)" }}>Viewer</option>
            <option style={{ background: "var(--cg-bg-card)" }}>Analyst</option>
            <option style={{ background: "var(--cg-bg-card)" }}>
              Security Engineer
            </option>
          </select>
        </Row>
      </Section>

      <Section title="Danger Zone">
        <div
          style={{
            border: `1px solid ${S.border}`,
            borderLeft: `3px solid ${S.danger}`,
            borderRadius: 8,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 14, color: S.textSecondary }}>
                Transfer workspace ownership
              </div>
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                Transfer ownership to another admin.
              </div>
            </div>
            <ConfirmButton
              variant="ghost"
              label="Transfer"
              title="Transfer organization ownership?"
              body="The selected admin becomes the owner. You will lose owner-level controls. This can only be reversed by the new owner."
              confirmLabel="Transfer ownership"
              onConfirm={() => {}}
            />
          </div>
          <div style={{ height: 1, background: S.border }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 14, color: S.danger }}>
                Delete organization
              </div>
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                Permanently delete the organization and all data. This cannot be
                undone.
              </div>
            </div>
            <ConfirmButton
              variant="ghost"
              label="Delete org"
              title="Delete this organization?"
              body="This permanently deletes the organization, all workspaces, findings, connectors and audit history. This cannot be undone."
              confirmLabel="Delete organization"
              confirmWord="DELETE"
              onConfirm={() => {}}
            />
          </div>
        </div>
      </Section>

      {inviteOpen && (
        <Modal
          title="Invite member"
          subtitle="They'll receive an email to join this organization."
          onClose={() => setInviteOpen(false)}
          footer={
            <button
              type="button"
              onClick={sendInvite}
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
              Send invite
            </button>
          }
        >
          <MField label="Full name (optional)">
            <input
              type="text"
              value={invite.name}
              onChange={(e) =>
                setInvite((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Jane Doe"
              style={inputStyle}
            />
          </MField>
          <MField label="Email address">
            <input
              type="email"
              value={invite.email}
              onChange={(e) =>
                setInvite((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="name@sentinel-org.io"
              style={inputStyle}
            />
          </MField>
          <MField label="Role">
            <select
              value={invite.role}
              onChange={(e) =>
                setInvite((p) => ({ ...p, role: e.target.value }))
              }
              style={selectStyle}
            >
              {ROLE_OPTIONS.map((r) => (
                <option
                  key={r}
                  value={r}
                  style={{ background: "var(--cg-bg-card)" }}
                >
                  {r}
                </option>
              ))}
            </select>
          </MField>
        </Modal>
      )}
    </div>
  );
}

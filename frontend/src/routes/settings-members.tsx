/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import { Users, Mail } from "lucide-react";
import {
  ConfirmButton,
  EmptyState,
  ScopeBadge,
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

const SEATS_LIMIT = 25;
const ROLES = ["Admin", "Security Engineer", "Analyst", "Viewer"];

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "suspended";
  lastActive: string;
  mfa: boolean;
  provisioned: "SSO" | "SCIM" | "Manual";
  color: string;
}
interface Invite {
  email: string;
  role: string;
  invitedBy: string;
  sent: string;
}

const INITIAL_MEMBERS: Member[] = [
  {
    id: "1",
    name: "Rami Sentinel",
    email: "rami@sentinel-org.io",
    role: "Admin",
    status: "active",
    lastActive: "Just now",
    mfa: true,
    provisioned: "SSO",
    color: S.purple,
  },
  {
    id: "2",
    name: "Jana Doe",
    email: "jana@sentinel-org.io",
    role: "Security Engineer",
    status: "active",
    lastActive: "2h ago",
    mfa: true,
    provisioned: "SCIM",
    color: S.accent,
  },
  {
    id: "3",
    name: "Marc Tarek",
    email: "marc@sentinel-org.io",
    role: "Analyst",
    status: "active",
    lastActive: "3d ago",
    mfa: false,
    provisioned: "Manual",
    color: "#4caf7d",
  },
  {
    id: "4",
    name: "Sam Okoye",
    email: "sam@sentinel-org.io",
    role: "Security Engineer",
    status: "active",
    lastActive: "1w ago",
    mfa: true,
    provisioned: "SCIM",
    color: "#e09a2d",
  },
  {
    id: "5",
    name: "Auditor (ext.)",
    email: "audit@partner.io",
    role: "Viewer",
    status: "suspended",
    lastActive: "32d ago",
    mfa: false,
    provisioned: "Manual",
    color: S.textMuted,
  },
];
const INITIAL_INVITES: Invite[] = [
  {
    email: "lena@sentinel-org.io",
    role: "Analyst",
    invitedBy: "Rami Sentinel",
    sent: "2d ago",
  },
  {
    email: "devops@sentinel-org.io",
    role: "Security Engineer",
    invitedBy: "Jana Doe",
    sent: "5h ago",
  },
];

const inputStyle: React.CSSProperties = {
  height: 34,
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
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none" as const,
  cursor: "pointer",
  paddingRight: 26,
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
function Pill({ text, color }: { text: string; color: string }) {
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
        whiteSpace: "nowrap",
      }}
    >
      {text}
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
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          maxWidth: "92vw",
          background: S.cardBg,
          border: `1px solid ${S.borderStrong}`,
          borderRadius: 12,
          padding: 24,
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

export default function MembersSettings() {
  const [members, setMembers] = React.useState<Member[]>(INITIAL_MEMBERS);
  const [invites, setInvites] = React.useState<Invite[]>(INITIAL_INVITES);
  const [tab, setTab] = React.useState<"active" | "pending">("active");
  const [search, setSearch] = React.useState("");
  const [fRole, setFRole] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [invite, setInvite] = React.useState({ email: "", role: "Analyst" });

  const seatsUsed = members.filter((m) => m.status === "active").length;
  const shown = members.filter((m) => {
    if (
      search &&
      !`${m.name} ${m.email}`.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (fRole && m.role !== fRole) return false;
    if (fStatus && m.status !== fStatus) return false;
    return true;
  });

  const setRole = (id: string, role: string) =>
    setMembers((p) => p.map((m) => (m.id === id ? { ...m, role } : m)));
  const toggleSuspend = (id: string) =>
    setMembers((p) =>
      p.map((m) =>
        m.id === id
          ? { ...m, status: m.status === "active" ? "suspended" : "active" }
          : m,
      ),
    );
  const offboard = (id: string) =>
    setMembers((p) => p.filter((m) => m.id !== id));
  const sendInvite = () => {
    if (!invite.email.trim()) return;
    setInvites((p) => [
      ...p,
      {
        email: invite.email.trim(),
        role: invite.role,
        invitedBy: "Rami Sentinel",
        sent: "just now",
      },
    ]);
    setInvite({ email: "", role: "Analyst" });
    setInviteOpen(false);
    setTab("pending");
  };
  const revokeInvite = (email: string) =>
    setInvites((p) => p.filter((i) => i.email !== email));

  const th = (h: string) => (
    <span
      style={{
        fontSize: 10,
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
  );
  const GRID = "1.6fr 110px 70px 90px 90px 90px 40px";

  return (
    <div style={{ padding: "40px 48px", maxWidth: 980 }}>
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
            Members
          </h1>
          <ScopeBadge scope="Organization" />
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          style={{
            height: 34,
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
          + Invite member
        </button>
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 20,
          marginTop: 0,
        }}
      >
        Manage who can access this organization, their roles, and their
        lifecycle.
      </p>

      {/* Seat usage */}
      <div
        style={{
          border: `1px solid ${S.border}`,
          borderRadius: 8,
          padding: "14px 16px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 13, color: S.textSecondary }}>
              Seats used
            </span>
            <span
              style={{
                fontSize: 13,
                color: S.textPrimary,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {seatsUsed} / {SEATS_LIMIT}
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
                width: `${(seatsUsed / SEATS_LIMIT) * 100}%`,
                background:
                  seatsUsed / SEATS_LIMIT > 0.9 ? S.warning : S.accent,
              }}
            />
          </div>
        </div>
        <a
          href="/settings/billing"
          style={{
            fontSize: 12,
            color: S.accent,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          Add seats →
        </a>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `1px solid ${S.border}`,
          marginBottom: 16,
        }}
      >
        {(["active", "pending"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              height: 34,
              padding: "0 12px",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${tab === t ? S.accent : "transparent"}`,
              color: tab === t ? S.textPrimary : S.textMuted,
              fontSize: 13,
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t === "active"
              ? `Members (${members.length})`
              : `Pending invites (${invites.length})`}
          </button>
        ))}
      </div>

      {tab === "active" && (
        <>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              style={{ ...inputStyle, flex: 1, minWidth: 200 }}
            />
            <select
              value={fRole}
              onChange={(e) => setFRole(e.target.value)}
              style={selectStyle}
            >
              <option value="" style={optBg}>
                All roles
              </option>
              {ROLES.map((r) => (
                <option key={r} value={r} style={optBg}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              style={selectStyle}
            >
              <option value="" style={optBg}>
                All statuses
              </option>
              <option value="active" style={optBg}>
                Active
              </option>
              <option value="suspended" style={optBg}>
                Suspended
              </option>
            </select>
          </div>
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
                gridTemplateColumns: GRID,
                padding: "8px 16px",
                borderBottom: `1px solid ${S.border}`,
              }}
            >
              {th("Member")}
              {th("Role")}
              {th("MFA")}
              {th("Source")}
              {th("Last active")}
              {th("Status")}
              {th("")}
            </div>
            {shown.map((m, i) => (
              <div
                key={m.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  padding: "10px 16px",
                  borderBottom:
                    i < shown.length - 1
                      ? "1px solid var(--cg-border-subtle)"
                      : "none",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0,
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
                    {m.name
                      .split(" ")
                      .slice(0, 2)
                      .map((s) => s[0])
                      .join("")}
                  </div>
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
                      {m.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: S.textMuted,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.email}
                    </div>
                  </div>
                </div>
                <select
                  value={m.role}
                  onChange={(e) => setRole(m.id, e.target.value)}
                  style={{ ...selectStyle, height: 28, fontSize: 12 }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} style={optBg}>
                      {r}
                    </option>
                  ))}
                </select>
                <div>
                  {m.mfa ? (
                    <Pill text="On" color={S.success} />
                  ) : (
                    <Pill text="Off" color={S.warning} />
                  )}
                </div>
                <div>
                  {m.provisioned === "Manual" ? (
                    <span style={{ fontSize: 12, color: S.textMuted }}>
                      Manual
                    </span>
                  ) : (
                    <Pill text={m.provisioned} color={S.accent} />
                  )}
                </div>
                <span style={{ fontSize: 12, color: S.textMuted }}>
                  {m.lastActive}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: m.status === "active" ? S.success : S.warning,
                    textTransform: "capitalize",
                  }}
                >
                  {m.status}
                </span>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 6,
                  }}
                >
                  <button
                    type="button"
                    title={m.status === "active" ? "Suspend" : "Reactivate"}
                    onClick={() => toggleSuspend(m.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: S.textMuted,
                      fontSize: 13,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {m.status === "active" ? "⏸" : "▶"}
                  </button>
                  <ConfirmButton
                    variant="link"
                    label="✕"
                    title={`Offboard ${m.name}?`}
                    body="They lose all access immediately and their sessions/tokens are revoked. Resources they own should be transferred first."
                    confirmLabel="Offboard member"
                    onConfirm={() => offboard(m.id)}
                  />
                </div>
              </div>
            ))}
            {shown.length === 0 && (
              <div style={{ padding: 16 }}>
                <EmptyState
                  icon={<Users size={24} />}
                  title="No members match"
                  hint="Adjust the filters or invite someone new."
                />
              </div>
            )}
          </div>
        </>
      )}

      {tab === "pending" && (
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
              gridTemplateColumns: "1.6fr 120px 1fr 90px 120px",
              padding: "8px 16px",
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {th("Email")}
            {th("Role")}
            {th("Invited by")}
            {th("Sent")}
            {th("")}
          </div>
          {invites.map((iv, i) => (
            <div
              key={iv.email}
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 120px 1fr 90px 120px",
                padding: "10px 16px",
                borderBottom:
                  i < invites.length - 1
                    ? "1px solid var(--cg-border-subtle)"
                    : "none",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: S.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {iv.email}
              </span>
              <RoleBadge role={iv.role} />
              <span style={{ fontSize: 12, color: S.textMuted }}>
                {iv.invitedBy}
              </span>
              <span style={{ fontSize: 12, color: S.textMuted }}>
                {iv.sent}
              </span>
              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
              >
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: S.accent,
                    fontSize: 12,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Resend
                </button>
                <button
                  type="button"
                  onClick={() => revokeInvite(iv.email)}
                  style={{
                    background: "none",
                    border: "none",
                    color: S.danger,
                    fontSize: 12,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
          {invites.length === 0 && (
            <div style={{ padding: 16 }}>
              <EmptyState
                icon={<Mail size={24} />}
                title="No pending invites"
                hint="Invite teammates to collaborate in this organization."
                cta="Invite member"
                onCta={() => setInviteOpen(true)}
              />
            </div>
          )}
        </div>
      )}

      {inviteOpen && (
        <Modal
          title="Invite member"
          subtitle="They'll get an email to join. Seat is consumed when they accept."
          onClose={() => setInviteOpen(false)}
          footer={
            <button
              type="button"
              onClick={sendInvite}
              style={{
                height: 36,
                padding: "0 16px",
                borderRadius: 6,
                background: S.accent,
                color: "#fff",
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
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: S.textMuted,
                marginBottom: 6,
              }}
            >
              Email address
            </label>
            <input
              type="email"
              value={invite.email}
              onChange={(e) =>
                setInvite((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="name@sentinel-org.io"
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: S.textMuted,
                marginBottom: 6,
              }}
            >
              Role
            </label>
            <select
              value={invite.role}
              onChange={(e) =>
                setInvite((p) => ({ ...p, role: e.target.value }))
              }
              style={{ ...selectStyle, width: "100%" }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r} style={optBg}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}

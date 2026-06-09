/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import { NavLink, Navigate, useLocation } from "react-router";
import {
  User,
  SunMoon,
  ShieldCheck,
  LayoutGrid,
  Building2,
  BarChart2,
  Gauge,
  Plug2,
  KeyRound,
  Cpu,
  Bot,
  Globe,
  Webhook,
  ScrollText,
  Users,
} from "lucide-react";
import { RoleChip, useCurrentRole } from "./settings-kit";

const S = {
  navBg: "var(--cg-bg-sidebar)",
  pageBg: "var(--cg-bg-page)",
  textPrimary: "var(--cg-text-primary)",
  textNav: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  activeBg: "var(--cg-bg-active)",
} as const;

type LucideIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  color?: string;
}>;

type NavLeaf = { to: string; text: string; Icon: LucideIcon };
type NavGroup = { group: string; items: NavLeaf[] };

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Account",
    items: [
      { to: "/settings/profile", text: "Profile", Icon: User },
      { to: "/settings/theme", text: "Theme & Language", Icon: SunMoon },
      { to: "/settings/security", text: "Account Security", Icon: ShieldCheck },
    ],
  },
  {
    group: "Organization",
    items: [
      { to: "/settings/org", text: "Organization", Icon: Building2 },
      { to: "/settings/user-roles", text: "User Roles", Icon: Users },
      { to: "/settings/usage", text: "Usage", Icon: BarChart2 },
      { to: "/settings/limits", text: "Limits", Icon: Gauge },
    ],
  },
  {
    group: "Workspace",
    items: [
      { to: "/settings/workspace", text: "Workspace", Icon: LayoutGrid },
      { to: "/settings/sandbox-compute", text: "Sandbox Compute", Icon: Cpu },
      { to: "/settings/audit-log", text: "Audit Log", Icon: ScrollText },
    ],
  },
  {
    group: "Security & Data",
    items: [
      { to: "/settings/data-residency", text: "Data Residency", Icon: Globe },
      { to: "/settings/connectors", text: "Connectors", Icon: Plug2 },
      { to: "/settings/vault", text: "Secret Vault", Icon: KeyRound },
    ],
  },
  {
    group: "Developer",
    items: [
      { to: "/settings/service-accounts", text: "Service Accounts", Icon: Bot },
      { to: "/settings/webhooks", text: "Webhooks", Icon: Webhook },
    ],
  },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
  navigationItems?: unknown;
  isSaas?: boolean;
}

const ORGS = ["Sentinel Security Corp"];
const WORKSPACES = [
  "Sentinel Security Workspace",
  "Production Cloud",
  "Sandbox / Dev",
];

const ctxSelect: React.CSSProperties = {
  width: "100%",
  height: 30,
  padding: "0 24px 0 8px",
  background: "var(--cg-bg-page)",
  border: "1px solid var(--cg-border)",
  borderRadius: 6,
  color: "var(--cg-text-primary)",
  fontSize: 12.5,
  outline: "none",
  appearance: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const { pathname } = useLocation();
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [org, setOrg] = React.useState(ORGS[0]);
  const [workspace, setWorkspace] = React.useState(WORKSPACES[0]);
  const role = useCurrentRole();

  if (pathname === "/settings") {
    return <Navigate to="/settings/profile" replace />;
  }

  const q = query.trim().toLowerCase();
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: q
      ? g.items.filter((it) => it.text.toLowerCase().includes(q))
      : g.items,
  })).filter((g) => g.items.length > 0);

  const renderLink = (item: NavLeaf) => {
    const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
    const lit = isActive || hovered === item.to;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 32,
          padding: "0 10px",
          borderRadius: 6,
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 400,
          color: lit ? S.textPrimary : S.textNav,
          background: lit ? S.activeBg : "transparent",
          marginBottom: 1,
          transition: "background 100ms ease, color 100ms ease",
          boxSizing: "border-box",
        }}
        onMouseEnter={() => setHovered(item.to)}
        onMouseLeave={() => setHovered(null)}
      >
        <item.Icon
          size={14}
          strokeWidth={1.6}
          color={lit ? S.textPrimary : S.textMuted}
        />
        {item.text}
      </NavLink>
    );
  };

  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      {/* Settings nav — custom */}
      <nav
        style={{
          width: 248,
          flexShrink: 0,
          background: S.navBg,
          borderRight: `1px solid ${S.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Brand + back */}
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: `1px solid ${S.border}`,
          }}
        >
          <NavLink
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: S.textMuted,
              textDecoration: "none",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 13 }}>←</span> Back to dashboard
          </NavLink>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background:
                  "linear-gradient(135deg, var(--cg-accent), var(--cg-accent-purple))",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 18,
                color: S.textPrimary,
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              Settings
            </span>
          </div>
        </div>

        {/* Org / Workspace context switcher */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${S.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: S.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              Organization
            </div>
            <select
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              aria-label="Organization"
              style={ctxSelect}
            >
              {ORGS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: S.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              Workspace
            </div>
            <select
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              aria-label="Workspace"
              style={ctxSelect}
            >
              {WORKSPACES.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 12px 6px" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settings…"
            aria-label="Search settings"
            style={{
              width: "100%",
              height: 32,
              padding: "0 10px",
              background: S.pageBg,
              border: `1px solid ${S.border}`,
              borderRadius: 6,
              color: S.textPrimary,
              fontSize: 12.5,
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Groups (collapsible) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 12px" }}>
          {groups.length === 0 && (
            <div
              style={{ fontSize: 12, color: S.textMuted, padding: "12px 10px" }}
            >
              No settings match "{query}".
            </div>
          )}
          {groups.map((g) => {
            const isCollapsed = !q && collapsed[g.group];
            return (
              <div key={g.group} style={{ marginBottom: 6 }}>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [g.group]: !c[g.group] }))
                  }
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 10px 4px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 600,
                    color: S.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      transform: isCollapsed ? "rotate(-90deg)" : "none",
                      transition: "transform 120ms",
                      display: "inline-block",
                    }}
                  >
                    ▾
                  </span>
                  {g.group}
                </button>
                {!isCollapsed && g.items.map(renderLink)}
              </div>
            );
          })}
        </div>

        {/* Footer: role */}
        <div
          style={{ padding: "12px 16px", borderTop: `1px solid ${S.border}` }}
        >
          <RoleChip role={role} />
        </div>
      </nav>

      {/* Main content */}
      <main
        style={{ flex: 1, overflowY: "auto", background: S.pageBg }}
        className="custom-scrollbar-always"
      >
        {children}
      </main>
    </div>
  );
}

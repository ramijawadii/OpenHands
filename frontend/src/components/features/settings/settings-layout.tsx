/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import { NavLink, Navigate, useLocation, useNavigate } from "react-router";
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
  UserPlus,
  CreditCard,
  Package,
  Bell,
  LifeBuoy,
  Tags,
  Network,
  BadgeCheck,
  Blocks,
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
type NavGroup = { group: string; Icon: LucideIcon; items: NavLeaf[] };

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Account",
    Icon: User,
    items: [
      { to: "/settings/profile", text: "Profile", Icon: User },
      { to: "/settings/theme", text: "Theme & Language", Icon: SunMoon },
      { to: "/settings/security", text: "Account Security", Icon: ShieldCheck },
    ],
  },
  {
    group: "Organization",
    Icon: Building2,
    items: [
      { to: "/settings/org", text: "General", Icon: Building2 },
      { to: "/settings/members", text: "Members", Icon: UserPlus },
      { to: "/settings/user-roles", text: "Roles & Permissions", Icon: Users },
      { to: "/settings/plan", text: "Plan & Add-ons", Icon: Package },
      { to: "/settings/billing", text: "Billing", Icon: CreditCard },
      { to: "/settings/usage", text: "Usage", Icon: BarChart2 },
      { to: "/settings/limits", text: "Rate Limits", Icon: Gauge },
      { to: "/settings/notifications", text: "Notifications", Icon: Bell },
      { to: "/settings/support", text: "Support", Icon: LifeBuoy },
    ],
  },
  {
    group: "Workspace",
    Icon: LayoutGrid,
    items: [
      { to: "/settings/workspace", text: "Workspace", Icon: LayoutGrid },
      { to: "/settings/environments", text: "Environments & Tags", Icon: Tags },
      { to: "/settings/sandbox-compute", text: "Sandbox Compute", Icon: Cpu },
      { to: "/settings/audit-log", text: "Audit Log", Icon: ScrollText },
    ],
  },
  {
    group: "Security & Data",
    Icon: Globe,
    items: [
      { to: "/settings/data-residency", text: "Data Residency", Icon: Globe },
      { to: "/settings/network", text: "Network & Access", Icon: Network },
      {
        to: "/settings/compliance",
        text: "Compliance & Trust",
        Icon: BadgeCheck,
      },
      { to: "/settings/connectors", text: "Connectors", Icon: Plug2 },
      { to: "/settings/vault", text: "Secret Vault", Icon: KeyRound },
    ],
  },
  {
    group: "Developer",
    Icon: Bot,
    items: [
      { to: "/settings/service-accounts", text: "Service Accounts", Icon: Bot },
      { to: "/settings/webhooks", text: "Webhooks", Icon: Webhook },
      { to: "/settings/integrations", text: "Integrations", Icon: Blocks },
    ],
  },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
  navigationItems?: unknown;
  isSaas?: boolean;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const role = useCurrentRole();

  if (pathname === "/settings") {
    return <Navigate to="/settings/profile" replace />;
  }

  // Which principal group is active = the one owning the current route.
  const activeGroup =
    NAV_GROUPS.find((g) =>
      g.items.some(
        (it) => pathname === it.to || pathname.startsWith(`${it.to}/`),
      ),
    ) ?? NAV_GROUPS[0];

  const q = query.trim().toLowerCase();
  const subItems = q
    ? activeGroup.items.filter((it) => it.text.toLowerCase().includes(q))
    : activeGroup.items;

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
          gap: 9,
          height: 34,
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
          size={15}
          strokeWidth={1.6}
          color={lit ? S.textPrimary : S.textMuted}
        />
        {item.text}
      </NavLink>
    );
  };

  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      {/* Primary group rail */}
      <nav
        style={{
          width: 184,
          flexShrink: 0,
          background: S.navBg,
          borderRight: `1px solid ${S.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 14px 14px",
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
            <span style={{ fontSize: 13 }}>←</span> Back
          </NavLink>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <ShieldCheck
              size={20}
              strokeWidth={1.8}
              color="var(--cg-accent)"
              style={{ flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 17,
                color: S.textPrimary,
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              Settings
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 12px" }}>
          {NAV_GROUPS.map((g) => {
            const isActive = g.group === activeGroup.group;
            const lit = isActive || hovered === `grp-${g.group}`;
            return (
              <button
                key={g.group}
                type="button"
                onClick={() => navigate(g.items[0].to)}
                onMouseEnter={() => setHovered(`grp-${g.group}`)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 38,
                  padding: "0 10px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  color: lit ? S.textPrimary : S.textNav,
                  background: isActive ? S.activeBg : "transparent",
                  marginBottom: 2,
                  transition: "background 100ms ease, color 100ms ease",
                }}
              >
                <g.Icon
                  size={17}
                  strokeWidth={1.6}
                  color={lit ? S.textPrimary : S.textMuted}
                />
                {g.group}
              </button>
            );
          })}
        </div>

        <div
          style={{ padding: "12px 14px", borderTop: `1px solid ${S.border}` }}
        >
          <RoleChip role={role} />
        </div>
      </nav>

      {/* Secondary sub-tab sidebar */}
      <nav
        style={{
          width: 216,
          flexShrink: 0,
          background: S.pageBg,
          borderRight: `1px solid ${S.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 16px 10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <activeGroup.Icon
              size={16}
              strokeWidth={1.7}
              color={S.textPrimary}
            />
            <span
              style={{ fontSize: 15, color: S.textPrimary, fontWeight: 600 }}
            >
              {activeGroup.group}
            </span>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${activeGroup.group.toLowerCase()}…`}
            aria-label="Search settings"
            style={{
              width: "100%",
              height: 30,
              padding: "0 10px",
              background: S.navBg,
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
        <div style={{ flex: 1, overflowY: "auto", padding: "2px 8px 16px" }}>
          {subItems.length === 0 ? (
            <div style={{ fontSize: 12, color: S.textMuted, padding: "10px" }}>
              No matches.
            </div>
          ) : (
            subItems.map(renderLink)
          )}
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

import React from "react";
import { NavLink, Navigate, useLocation } from "react-router";
import {
  User, SunMoon, ShieldCheck, LayoutGrid, Building2,
  BarChart2, Gauge, Plug2, KeyRound,
} from "lucide-react";

const S = {
  navBg: "var(--cg-bg-sidebar)",
  pageBg: "var(--cg-bg-page)",
  textPrimary: "var(--cg-text-primary)",
  textNav: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  activeBg: "var(--cg-bg-active)",
} as const;

type LucideIcon = React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;

type NavItem = { to: string; text: string; Icon: LucideIcon } | null;

const NAV_ITEMS: NavItem[] = [
  { to: "/settings/profile", text: "Profile", Icon: User },
  { to: "/settings/theme", text: "Theme & Language", Icon: SunMoon },
  { to: "/settings/security", text: "Sessions & Security", Icon: ShieldCheck },
  { to: "/settings/workspace", text: "Workspace", Icon: LayoutGrid },
  { to: "/settings/org", text: "Organization", Icon: Building2 },
  { to: "/settings/usage", text: "Usage", Icon: BarChart2 },
  { to: "/settings/limits", text: "Limits", Icon: Gauge },
  null,
  { to: "/settings/connectors", text: "Connectors", Icon: Plug2 },
  { to: "/settings/vault", text: "Secret Vault", Icon: KeyRound },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
  navigationItems?: unknown;
  isSaas?: boolean;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const { pathname } = useLocation();
  const [hovered, setHovered] = React.useState<string | null>(null);

  if (pathname === "/settings") {
    return <Navigate to="/settings/profile" replace />;
  }

  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      {/* Settings nav */}
      <nav
        style={{
          width: 220,
          flexShrink: 0,
          background: S.navBg,
          borderRight: `1px solid ${S.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "28px 20px 16px" }}>
          <span style={{ fontSize: 20, color: S.textPrimary, fontWeight: 500, letterSpacing: "-0.01em" }}>
            Settings
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 12px" }}>
          {NAV_ITEMS.map((item, i) => {
            if (item === null) {
              return (
                <div
                  key={`divider-${i}`}
                  style={{ height: 1, background: S.border, margin: "5px 6px" }}
                />
              );
            }
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
                  size={14}
                  strokeWidth={1.6}
                  color={lit ? S.textPrimary : S.textMuted}
                />
                {item.text}
              </NavLink>
            );
          })}
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

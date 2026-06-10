/* eslint-disable i18next/no-literal-string, react/no-unused-prop-types, @typescript-eslint/naming-convention, jsx-a11y/no-noninteractive-element-interactions -- CloudGuard Agent Control Plane (mock UI) */
import React from "react";
import { NavLink, Navigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  Activity,
  Box,
  Radar,
  Gavel,
  ScrollText,
  Siren,
} from "lucide-react";
import {
  RoleChip,
  useCurrentRole,
} from "#/components/features/settings/settings-kit";
import "#/components/features/settings/settings-polish.css";

const S = {
  navBg: "var(--cg-bg-sidebar)",
  pageBg: "var(--cg-bg-page)",
  textPrimary: "var(--cg-text-primary)",
  textNav: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  activeBg: "var(--cg-bg-active)",
  danger: "var(--cg-danger)",
} as const;

type LucideIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  color?: string;
}>;
type NavItem = { to: string; text: string; Icon: LucideIcon; badge?: string };

const NAV: NavItem[] = [
  {
    to: "/agent-control-plane/overview",
    text: "Overview",
    Icon: LayoutDashboard,
  },
  {
    to: "/agent-control-plane/runs",
    text: "Runs",
    Icon: Activity,
    badge: "3 live",
  },
  { to: "/agent-control-plane/sandboxes", text: "Sandboxes", Icon: Box },
  { to: "/agent-control-plane/monitoring", text: "Monitoring", Icon: Radar },
  {
    to: "/agent-control-plane/enforcement",
    text: "Enforcement",
    Icon: Gavel,
    badge: "2",
  },
  { to: "/agent-control-plane/audit", text: "Audit", Icon: ScrollText },
  {
    to: "/agent-control-plane/incidents",
    text: "Incidents",
    Icon: Siren,
    badge: "1",
  },
];

interface Props {
  children: React.ReactNode;
}

export function AcpLayout({ children }: Props) {
  const { pathname } = useLocation();
  const [hovered, setHovered] = React.useState<string | null>(null);
  const role = useCurrentRole();

  if (pathname === "/agent-control-plane") {
    return <Navigate to="/agent-control-plane/overview" replace />;
  }

  return (
    <div
      className="cg-settings-root"
      style={{ display: "flex", height: "100%", width: "100%" }}
    >
      <nav
        style={{
          width: 232,
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
          <div
            style={{
              fontSize: 16,
              color: S.textPrimary,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Agent Control Plane
          </div>
          <div style={{ fontSize: 11.5, color: S.textMuted, marginTop: 3 }}>
            Watch · operate · contain
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 12px" }}>
          {NAV.map((item) => {
            const isActive =
              pathname === item.to || pathname.startsWith(`${item.to}/`);
            const lit = isActive || hovered === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                onMouseEnter={() => setHovered(item.to)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 38,
                  padding: "0 10px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  color: lit ? S.textPrimary : S.textNav,
                  background: isActive ? S.activeBg : "transparent",
                  marginBottom: 2,
                  boxSizing: "border-box",
                }}
              >
                <item.Icon
                  size={16}
                  strokeWidth={1.6}
                  color={lit ? S.textPrimary : S.textMuted}
                />
                <span style={{ flex: 1 }}>{item.text}</span>
                {item.badge && (
                  <span
                    style={{
                      height: 18,
                      padding: "0 7px",
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 600,
                      color: item.text === "Incidents" ? S.danger : S.textNav,
                      background: "var(--cg-bg-badge)",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        <div
          style={{ padding: "12px 16px", borderTop: `1px solid ${S.border}` }}
        >
          <RoleChip role={role} />
        </div>
      </nav>

      <main
        style={{ flex: 1, overflowY: "auto", background: S.pageBg }}
        className="custom-scrollbar-always"
      >
        {children}
      </main>
    </div>
  );
}

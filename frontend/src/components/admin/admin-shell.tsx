/* eslint-disable i18next/no-literal-string -- CloudGuard Enterprise Administration shell */
import React from "react";
import { NavLink, useLocation } from "react-router";
import {
  LayoutDashboard,
  Building2,
  KeyRound,
  LayoutGrid,
  Scale,
  ShieldCheck,
  BadgeCheck,
  Cable,
  Activity,
  ScrollText,
  CreditCard,
  LifeBuoy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  RoleChip,
  useCurrentRole,
} from "#/components/features/settings/settings-kit";
import "#/components/features/settings/settings-polish.css";
import { T } from "./admin-kit";
import { AdminTopBar } from "./admin-topbar";
import { ConsoleSwitcher } from "./workspace-context";
import { EmergencyButton } from "./emergency-button";

type LucideIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  color?: string;
}>;
type NavChild = { label: string; group: string };
type NavItem = {
  to: string;
  text: string;
  Icon: LucideIcon;
  children?: NavChild[];
};

// §40 final navigation model — Enterprise Administration.
const NAV: NavItem[] = [
  { to: "/admin/overview", text: "Global Overview", Icon: LayoutDashboard },
  { to: "/admin/organization", text: "Organization", Icon: Building2 },
  {
    to: "/admin/identity",
    text: "Identity & Access",
    Icon: KeyRound,
    children: [
      { label: "Identity", group: "identity" },
      { label: "Access", group: "access" },
      { label: "Alerts", group: "alerts" },
      { label: "IAM Graph", group: "iam-graph" },
    ],
  },
  { to: "/admin/workspaces", text: "Workspace Management", Icon: LayoutGrid },
  { to: "/admin/runtime-governance", text: "Runtime Governance", Icon: Scale },
  { to: "/admin/security", text: "Security & Data", Icon: ShieldCheck },
  { to: "/admin/compliance", text: "Compliance Center", Icon: BadgeCheck },
  { to: "/admin/connections", text: "Shared Connections", Icon: Cable },
  { to: "/admin/operations", text: "Enterprise Operations", Icon: Activity },
  { to: "/admin/audit", text: "Global Audit & Evidence", Icon: ScrollText },
  { to: "/admin/capacity", text: "Capacity & Billing", Icon: CreditCard },
  { to: "/admin/support", text: "Support", Icon: LifeBuoy },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { pathname, search } = useLocation();
  const activeGroup = new URLSearchParams(search).get("group") || "identity";
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const role = useCurrentRole();

  return (
    <div
      className="cg-settings-root cg-m365"
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: "var(--cg-bg-page)",
      }}
    >
      <nav
        style={{
          width: 232,
          flexShrink: 0,
          background: "transparent",
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <NavLink
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: T.textMuted,
              textDecoration: "none",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 13 }}>←</span> Back to dashboard
          </NavLink>
          <div
            style={{
              fontSize: 16,
              color: T.textPrimary,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Enterprise Administration
          </div>
          <div style={{ marginTop: 8 }}>
            <ConsoleSwitcher current="enterprise" />
          </div>
          <div style={{ marginTop: 10 }}>
            <EmergencyButton scope="enterprise" />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 12px" }}>
          {NAV.map((item) => {
            const isActive =
              pathname === item.to || pathname.startsWith(`${item.to}/`);
            const lit = isActive || hovered === item.to;
            return (
              <React.Fragment key={item.to}>
                <NavLink
                  to={item.to}
                  end
                  onMouseEnter={() => setHovered(item.to)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    height: 36,
                    padding: "0 10px",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    color: lit ? T.textPrimary : T.textNav,
                    background: isActive
                      ? "var(--cg-bg-active)"
                      : "transparent",
                    marginBottom: 1,
                    boxSizing: "border-box",
                  }}
                >
                  <item.Icon
                    size={16}
                    strokeWidth={1.6}
                    color={lit ? T.textPrimary : T.textMuted}
                  />
                  <span style={{ flex: 1 }}>{item.text}</span>
                  {item.children &&
                    (() => {
                      const open = isActive && !collapsed[item.to];
                      return (
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCollapsed((p) => ({
                              ...p,
                              [item.to]: isActive ? !p[item.to] : false,
                            }));
                          }}
                          style={{
                            display: "inline-flex",
                            padding: 4,
                            margin: -4,
                            cursor: "pointer",
                          }}
                        >
                          {open ? (
                            <ChevronUp size={14} color={T.textMuted} />
                          ) : (
                            <ChevronDown size={14} color={T.textMuted} />
                          )}
                        </span>
                      );
                    })()}
                </NavLink>
                {/* Expandable sub-navigation (e.g. Identity / Access) — flat
                    text rows indented under the parent label; the active item
                    is marked by a thin blue bar attached just left of the word
                    (M365 style), no background fill. Collapsible via chevron. */}
                {item.children && isActive && !collapsed[item.to] && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      margin: "2px 0 6px 0",
                    }}
                  >
                    {item.children.map((c) => {
                      const on = activeGroup === c.group;
                      return (
                        <NavLink
                          key={c.group}
                          to={`${item.to}?group=${c.group}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            height: 32,
                            marginLeft: 22,
                            paddingLeft: 13,
                            paddingRight: 10,
                            textDecoration: "none",
                            fontSize: 13,
                            fontWeight: on ? 600 : 400,
                            color: on ? T.textPrimary : T.textNav,
                            background: "transparent",
                            borderLeft: `2px solid ${on ? "var(--cg-accent)" : "transparent"}`,
                            boxSizing: "border-box",
                          }}
                        >
                          {c.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div
          style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}` }}
        >
          <RoleChip role={role} />
        </div>
      </nav>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
          background: "var(--cg-bg-page)",
        }}
        className="custom-scrollbar-always"
      >
        <AdminTopBar />
        {children}
      </main>
    </div>
  );
}

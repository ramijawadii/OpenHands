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

type LucideIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  color?: string;
}>;
type NavChild = {
  label: string;
  group?: string; // ?group= sub-view (Identity console)
  to?: string; // absolute route link (Workspace Administration leaves)
  header?: boolean; // non-clickable section label
};
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
  {
    to: "/admin/workspaces",
    text: "Workspace Management",
    Icon: LayoutGrid,
    // Sidebar carries only the principal structure — Workspace Management → its
    // consoles. The leaf pages (Active Workspaces, Requests, …) are first-level
    // VIEW tabs inside the console, and their pill strips are the second-level
    // views; neither belongs in the sidebar.
    children: [
      { label: "Administration", to: "/admin/workspaces" },
      { label: "Governance", to: "/admin/workspaces/governance" },
      { label: "Operations", to: "/admin/workspaces/operations" },
    ],
  },
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
            padding: "12px 16px 10px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              fontSize: 15,
              color: T.textPrimary,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Enterprise Administration
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
                    gap: 8,
                    height: 36,
                    padding: "0 8px",
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
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.text}
                  </span>
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
                      // Non-clickable section header (e.g. "Workspace Administration").
                      if (c.header) {
                        return (
                          <div
                            key={c.label}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              height: 26,
                              marginLeft: 22,
                              paddingLeft: 13,
                              fontSize: 10.5,
                              fontWeight: 600,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              color: T.textMuted,
                            }}
                          >
                            {c.label}
                          </div>
                        );
                      }
                      // Either a ?group= sub-view (Identity) or an absolute route link
                      // (Workspace sub-sections). For route links use most-specific-wins so a
                      // parent path (/admin/workspaces) doesn't also light up on a deeper
                      // sibling (/admin/workspaces/templates).
                      const matches = (t: string) =>
                        pathname === t || pathname.startsWith(`${t}/`);
                      const on = c.to
                        ? matches(c.to) &&
                          !item.children!.some(
                            (o) =>
                              o.to &&
                              o.to !== c.to &&
                              o.to.length > c.to!.length &&
                              matches(o.to),
                          )
                        : activeGroup === c.group;
                      const to = c.to ?? `${item.to}?group=${c.group}`;
                      return (
                        <NavLink
                          key={c.label}
                          to={to}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            height: 32,
                            marginLeft: 22,
                            paddingLeft: 13,
                            paddingRight: 8,
                            textDecoration: "none",
                            fontSize: 13,
                            fontWeight: on ? 600 : 400,
                            color: on ? T.textPrimary : T.textNav,
                            background: "transparent",
                            borderLeft: `2px solid ${on ? "var(--cg-accent)" : "transparent"}`,
                            boxSizing: "border-box",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
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
        {/* root path */}
        {(() => {
          const active = NAV.find(
            (n) => pathname === n.to || pathname.startsWith(`${n.to}/`),
          );
          return (
            <nav
              aria-label="Breadcrumb"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 12.5,
                color: T.textMuted,
                padding: "12px 36px 0",
              }}
            >
              <span>Enterprise Administration</span>
              {active && (
                <>
                  <span style={{ opacity: 0.6 }}>›</span>
                  <span style={{ color: T.textPrimary, fontWeight: 600 }}>
                    {active.text}
                  </span>
                </>
              )}
            </nav>
          );
        })()}
        {children}
      </main>
    </div>
  );
}

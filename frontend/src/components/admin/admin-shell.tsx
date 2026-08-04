/* eslint-disable i18next/no-literal-string -- CloudGuard Enterprise Administration shell */
import React from "react";
import { useLocation } from "react-router";
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
} from "lucide-react";
import "#/components/features/settings/settings-polish.css";
import { T } from "./admin-kit";

export type LucideIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  color?: string;
  // The sidebar styles these through a class rather than inline props, and
  // lucide accepts it — the narrower type was only ever this file's own view.
  className?: string;
}>;
export type NavChild = {
  label: string;
  group?: string; // ?group= sub-view (Identity console)
  to?: string; // absolute route link (Workspace Administration leaves)
  header?: boolean; // non-clickable section label
};
export type NavItem = {
  to: string;
  text: string;
  Icon: LucideIcon;
  children?: NavChild[];
};

/**
 * §40 navigation model — Enterprise Administration.
 *
 * Exported because the console's navigation lives in the app's own sidebar
 * rather than in a second one beside it: entering the console swaps the
 * sidebar's contents, the way a section of an app does, instead of stacking
 * two rails and spending ~290px of width on chrome before any content.
 */
export const ADMIN_NAV: NavItem[] = [
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
  const { pathname } = useLocation();

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
      {/* Navigation lives in the app sidebar — see `ADMIN_NAV`. */}
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
          const active = ADMIN_NAV.find(
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

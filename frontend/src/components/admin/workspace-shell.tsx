/* eslint-disable i18next/no-literal-string -- CloudGuard Workspace Administration shell */
import React from "react";
import { NavLink, useLocation, useParams } from "react-router";
import {
  LayoutDashboard,
  Boxes,
  Users,
  Cable,
  KeyRound,
  Bot,
  Workflow,
  Wrench,
  Brain,
  Cpu,
  Database,
  Scale,
  Gauge,
  Bell,
  ScrollText,
  BadgeCheck,
  LifeBuoy,
  Settings,
} from "lucide-react";
import {
  RoleChip,
  useCurrentRole,
} from "#/components/features/settings/settings-kit";
import "#/components/features/settings/settings-polish.css";
import { T } from "./admin-kit";
import { WorkspaceSelector } from "./workspace-context";
import { EmergencyButton } from "./emergency-button";

type LucideIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  color?: string;
}>;
type NavLeaf = { seg: string; text: string; Icon: LucideIcon };

// §40 final navigation model — Workspace. Paths are relative to /workspace/:wsId/.
const NAV: NavLeaf[] = [
  { seg: "overview", text: "Overview", Icon: LayoutDashboard },
  { seg: "scope", text: "Scope & Resources", Icon: Boxes },
  { seg: "members", text: "Members & Access", Icon: Users },
  { seg: "connections", text: "Connections", Icon: Cable },
  { seg: "vault", text: "Secrets Vault", Icon: KeyRound },
  { seg: "service-accounts", text: "Service Accounts & API", Icon: Bot },
  { seg: "agents", text: "Agents & Workflows", Icon: Workflow },
  { seg: "tools", text: "Tools & MCP", Icon: Wrench },
  { seg: "models", text: "Models & Inference", Icon: Brain },
  { seg: "sandbox", text: "Sandbox & Execution", Icon: Cpu },
  { seg: "storage", text: "Storage & Evidence", Icon: Database },
  { seg: "governance", text: "Runtime Governance", Icon: Scale },
  { seg: "limits", text: "Rate Limits & Usage", Icon: Gauge },
  { seg: "notifications", text: "Notifications", Icon: Bell },
  { seg: "audit", text: "Audit Trail", Icon: ScrollText },
  { seg: "compliance", text: "Compliance", Icon: BadgeCheck },
  { seg: "support", text: "Support & Diagnostics", Icon: LifeBuoy },
  { seg: "settings", text: "Settings", Icon: Settings },
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { wsId } = useParams();
  const [hovered, setHovered] = React.useState<string | null>(null);
  const role = useCurrentRole();
  const base = `/workspace/${wsId}`;

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
            padding: "14px 12px 12px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <NavLink
            to="/admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: T.textMuted,
              textDecoration: "none",
              marginBottom: 10,
              paddingLeft: 4,
            }}
          >
            <span style={{ fontSize: 13 }}>←</span> Enterprise
          </NavLink>
          <WorkspaceSelector />
          <div style={{ marginTop: 10 }}>
            <EmergencyButton scope="workspace" />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 12px" }}>
          {NAV.map((item) => {
            const to = `${base}/${item.seg}`;
            const isActive = pathname === to || pathname.startsWith(`${to}/`);
            const lit = isActive || hovered === to;
            return (
              <NavLink
                key={item.seg}
                to={to}
                end
                onMouseEnter={() => setHovered(to)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 34,
                  padding: "0 10px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  color: lit ? T.textPrimary : T.textNav,
                  background: isActive ? "var(--cg-bg-active)" : "transparent",
                  marginBottom: 1,
                  boxSizing: "border-box",
                }}
              >
                <item.Icon
                  size={15}
                  strokeWidth={1.6}
                  color={lit ? T.textPrimary : T.textMuted}
                />
                <span style={{ flex: 1 }}>{item.text}</span>
              </NavLink>
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
        {children}
      </main>
    </div>
  );
}

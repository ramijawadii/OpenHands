import { Link } from "react-router";
import { Settings, User, Building2, LayoutGrid, Plug2 } from "lucide-react";
import { useSettings } from "#/hooks/query/use-settings";

const S = {
  textPrimary: "var(--cg-text-primary)",
  textNav: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  activeBg: "var(--cg-bg-active)",
  border: "var(--cg-border)",
} as const;

const NAV_ITEMS = [
  { to: "/settings/profile",    text: "Profile",      Icon: User },
  { to: "/settings/org",        text: "Organization", Icon: Building2 },
  { to: "/settings/workspace",  text: "Workspace",    Icon: LayoutGrid },
  { to: "/settings/connectors", text: "Connectors",   Icon: Plug2 },
] as const;

export function ConnectToProviderMessage() {
  const { isLoading } = useSettings();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Settings width={20} height={20} style={{ color: S.textNav, flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: S.textPrimary, letterSpacing: "-0.01em" }}>
          Settings
        </span>
      </div>

      {/* Nav items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1 }}>
        {NAV_ITEMS.map(({ to, text, Icon }) => (
          <Link
            key={to}
            to={to}
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
              color: S.textNav,
              transition: "background 100ms ease, color 100ms ease",
              boxSizing: "border-box",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = S.activeBg;
              (e.currentTarget as HTMLAnchorElement).style.color = S.textPrimary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              (e.currentTarget as HTMLAnchorElement).style.color = S.textNav;
            }}
          >
            <Icon size={14} strokeWidth={1.6} color={S.textMuted} />
            {text}
          </Link>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: S.border, margin: "12px 0 14px" }} />

      {/* Footer link */}
      <Link
        data-testid="navigate-to-settings-button"
        to="/settings/profile"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          padding: "8px 16px",
          background: "transparent",
          border: `1px solid ${S.border}`,
          borderRadius: 8,
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 500,
          color: isLoading ? S.textMuted : S.textNav,
          transition: "background 100ms ease, border-color 100ms ease, color 100ms ease",
          boxSizing: "border-box",
          pointerEvents: isLoading ? "none" : "auto",
          opacity: isLoading ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = S.activeBg;
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(222,220,206,0.3)";
          (e.currentTarget as HTMLAnchorElement).style.color = S.textPrimary;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = S.border;
          (e.currentTarget as HTMLAnchorElement).style.color = S.textNav;
        }}
      >
        Open all settings
      </Link>
    </div>
  );
}

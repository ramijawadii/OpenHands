/* eslint-disable i18next/no-literal-string -- CloudGuard standalone Personal Profile */
import { User, SunMoon, ShieldCheck, Bell } from "lucide-react";
import { Tabs, useTabParam } from "#/components/admin/admin-kit";
import { NotificationSettingsPanel } from "#/components/admin/notification-settings";
import ProfileSettings from "./settings-profile";
import ThemeSettings from "./settings-theme";
import SecuritySettings from "./settings-security";

const TABS = [
  { id: "profile", label: "Profile", icon: <User size={14} /> },
  { id: "theme", label: "Theme & Language", icon: <SunMoon size={14} /> },
  {
    id: "security",
    label: "Account Security",
    icon: <ShieldCheck size={14} />,
  },
  { id: "notifications", label: "Notifications", icon: <Bell size={14} /> },
];

/**
 * Personal Profile — STANDALONE view (not under /admin, not in any sidebar nav). Reached only from
 * the profile menus. Uses the same in-main layout as the explore tab views (root-path breadcrumb +
 * underline tab selector, left-aligned, tight top) so it's consistent across the app.
 */
export default function AccountProfile() {
  const [tab, setTab] = useTabParam("profile");
  const active = TABS.find((t) => t.id === tab);
  return (
    <div
      style={{
        padding: "10px 36px 28px",
        maxWidth: 1760,
        margin: "0 auto",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      {/* root path */}
      <nav
        aria-label="Breadcrumb"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 12.5,
          color: "var(--cg-text-muted)",
          marginBottom: 10,
        }}
      >
        <span>Account</span>
        <span style={{ opacity: 0.6 }}>›</span>
        <span style={{ color: "var(--cg-text-primary)", fontWeight: 600 }}>
          {active?.label ?? "Personal Profile"}
        </span>
      </nav>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "notifications" ? (
        // matches the bell drawer's Settings exactly (shared panel)
        <div style={{ maxWidth: 720 }}>
          <NotificationSettingsPanel />
        </div>
      ) : (
        // the reused settings pages have their own 48px left padding — pull it back
        // so the content's left edge lines up with the breadcrumb + tab selector
        <div style={{ marginLeft: -48, marginTop: -24 }}>
          {tab === "profile" && <ProfileSettings />}
          {tab === "theme" && <ThemeSettings />}
          {tab === "security" && <SecuritySettings />}
        </div>
      )}
    </div>
  );
}

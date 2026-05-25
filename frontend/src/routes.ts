import {
  type RouteConfig,
  layout,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/root-layout.tsx", [
    index("routes/home.tsx"),
    route("accept-tos", "routes/accept-tos.tsx"),
    route("settings", "routes/settings.tsx", [
      index("routes/settings-profile.tsx", { id: "settings-profile-index" }),
      route("profile", "routes/settings-profile.tsx"),
      route("theme", "routes/settings-theme.tsx"),
      route("security", "routes/settings-security.tsx"),
      route("workspace", "routes/settings-workspace.tsx"),
      route("org", "routes/org-settings.tsx"),
      route("usage", "routes/settings-usage.tsx"),
      route("limits", "routes/settings-limits.tsx"),
      route("connectors", "routes/settings-connectors.tsx"),
      route("vault", "routes/settings-vault.tsx"),
      route("mcp", "routes/mcp-settings.tsx"),
      route("user", "routes/user-settings.tsx"),
      route("integrations", "routes/git-settings.tsx"),
      route("app", "routes/app-settings.tsx"),
      route("billing", "routes/billing.tsx"),
      route("secrets", "routes/secrets-settings.tsx"),
      route("api-keys", "routes/api-keys.tsx"),
    ]),
    route("conversations/:conversationId", "routes/conversation.tsx"),
    route("microagent-management", "routes/microagent-management.tsx"),
  ]),
] satisfies RouteConfig;

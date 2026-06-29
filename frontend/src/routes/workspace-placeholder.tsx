/* eslint-disable i18next/no-literal-string -- CloudGuard workspace section placeholder */
import { useLocation, useParams, Link } from "react-router";
import { Construction } from "lucide-react";
import { Page, PageHeader, ScopeBadge, T } from "#/components/admin/admin-kit";

const TITLES: Record<string, string> = {
  scope: "Scope & Resources",
  members: "Members & Access",
  connections: "Connections",
  vault: "Secrets Vault",
  "service-accounts": "Service Accounts & API",
  agents: "Agents & Workflows",
  tools: "Tools & MCP",
  models: "Models & Inference",
  sandbox: "Sandbox & Execution",
  storage: "Storage & Evidence",
  governance: "Runtime Governance",
  limits: "Rate Limits & Usage",
  notifications: "Notifications",
  audit: "Audit Trail",
  compliance: "Compliance",
  support: "Support & Diagnostics",
  settings: "Settings",
};

export default function WorkspacePlaceholder() {
  const { pathname } = useLocation();
  const { wsId } = useParams();
  const seg = pathname.split("/").slice(3).join("/").split("/")[0] || "";
  const title = TITLES[seg] ?? seg;
  return (
    <Page>
      <PageHeader
        title={title}
        subtitle="Workspace Administration"
        actions={<ScopeBadge scope="This workspace" />}
      />
      <div
        style={{
          border: `1px dashed ${T.borderStrong}`,
          borderRadius: 10,
          padding: "40px 28px",
          textAlign: "center",
          color: T.textMuted,
        }}
      >
        <Construction size={26} strokeWidth={1.5} />
        <div
          style={{
            marginTop: 12,
            fontSize: 14,
            color: T.textNav,
            fontWeight: 500,
          }}
        >
          {title} — planned
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 12.5,
            maxWidth: 460,
            margin: "6px auto 0",
          }}
        >
          This workspace section is specified (05_WORKSPACE) and on the build
          roadmap. The shell and shared kit are live; the page body is next.
        </div>
        <div style={{ marginTop: 14, fontSize: 12 }}>
          <Link
            to={`/workspace/${wsId}/overview`}
            style={{ color: T.accent, textDecoration: "none" }}
          >
            ← Back to Overview
          </Link>
        </div>
      </div>
    </Page>
  );
}

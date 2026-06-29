/* eslint-disable i18next/no-literal-string -- CloudGuard admin section placeholder */
import { useLocation, Link } from "react-router";
import { Construction } from "lucide-react";
import { Page, PageHeader, T } from "#/components/admin/admin-kit";

const TITLES: Record<string, { title: string; doc: string }> = {
  organization: { title: "Organization", doc: "03_GLOBAL_A §6" },
  identity: { title: "Identity & Enterprise Access", doc: "03_GLOBAL_A §7" },
  workspaces: { title: "Workspace Management", doc: "03_GLOBAL_A §8" },
  "runtime-governance": {
    title: "Global Runtime Governance",
    doc: "03_GLOBAL_A §9",
  },
  security: { title: "Security & Data Controls", doc: "04_GLOBAL_B §10" },
  compliance: { title: "Compliance Center", doc: "04_GLOBAL_B §11" },
  connections: { title: "Shared Connections", doc: "04_GLOBAL_B §12" },
  models: { title: "Models & Inference", doc: "04_GLOBAL_B §13" },
  tools: { title: "Tools & MCP Catalog", doc: "04_GLOBAL_B §14" },
  operations: { title: "Enterprise Operations", doc: "04_GLOBAL_B §15" },
  audit: { title: "Global Audit & Evidence", doc: "04_GLOBAL_B §16" },
  capacity: { title: "Capacity & Billing", doc: "04_GLOBAL_B §17" },
  support: { title: "Support & Service Management", doc: "04_GLOBAL_B §18" },
};

export default function AdminPlaceholder() {
  const { pathname } = useLocation();
  const seg = pathname.replace(/^\/admin\//, "").split("/")[0];
  const meta = TITLES[seg] ?? { title: seg, doc: "org-admin-implementation" };
  return (
    <Page>
      <PageHeader title={meta.title} subtitle="Enterprise Administration" />
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
          {meta.title} — planned
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 12.5,
            maxWidth: 460,
            margin: "6px auto 0",
          }}
        >
          This console section is specified and on the build roadmap. The shell,
          navigation and the shared inheritance/posture kit are live; the page
          body is next.
        </div>
        <div style={{ marginTop: 14, fontSize: 12 }}>
          <Link
            to="/admin/overview"
            style={{ color: T.accent, textDecoration: "none" }}
          >
            ← Back to Global Overview
          </Link>
          <span style={{ color: T.textMuted }}> · plan: {meta.doc}</span>
        </div>
      </div>
    </Page>
  );
}

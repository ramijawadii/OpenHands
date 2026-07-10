/* eslint-disable i18next/no-literal-string -- CloudGuard Workspace Management → Workspace Operations console (placeholder) */
import { Activity } from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
  EmptyState,
} from "#/components/admin/admin-kit";

/**
 * Workspace Operations console — spec: docs/workspace/workspace_module/└── Workspace Operations/.
 * Sub-sections (Catalog & Discovery · Requests & Approvals · Automation · Alerts · Workspace Audit)
 * are on the build roadmap; the console shell + first-level view tabs are stubbed here so the sidebar
 * console is navigable.
 */
const SUBSECTIONS = [
  { id: "catalog", label: "Catalog & Discovery" },
  { id: "requests", label: "Requests & Approvals" },
  { id: "automation", label: "Automation" },
  { id: "alerts", label: "Alerts" },
  { id: "audit", label: "Workspace Audit" },
];

export default function AdminWorkspaceOperations() {
  return (
    <Page>
      <PageHeader
        title="Workspace Operations"
        subtitle="Catalog and discovery, requests and approvals, automation, alerts and the workspace audit trail."
      />
      <Tabs tabs={SUBSECTIONS} active="catalog" onChange={() => {}} />
      <EmptyState
        icon={<Activity size={20} />}
        title="Workspace Operations — coming soon"
        hint="These sub-sections are on the build roadmap. Their leaf views and second-level sub-navigation will appear here."
      />
    </Page>
  );
}

/* eslint-disable i18next/no-literal-string -- CloudGuard Workspace Management → Workspace Governance console (placeholder) */
import { Scale } from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
  EmptyState,
} from "#/components/admin/admin-kit";

/**
 * Workspace Governance console — spec: docs/workspace/workspace_module/── Workspace Governance/.
 * Sub-sections (Workspace Policies · Inheritance & Overrides · Resource Boundaries · Cross-Workspace
 * Governance · Capacity & Quotas) are on the build roadmap; the console shell + first-level view tabs
 * are stubbed here so the sidebar console is navigable.
 */
const SUBSECTIONS = [
  { id: "policies", label: "Workspace Policies" },
  { id: "inheritance", label: "Inheritance & Overrides" },
  { id: "boundaries", label: "Resource Boundaries" },
  { id: "cross", label: "Cross-Workspace Governance" },
  { id: "capacity", label: "Capacity & Quotas" },
];

export default function AdminWorkspaceGovernance() {
  return (
    <Page>
      <PageHeader
        title="Workspace Governance"
        subtitle="Policies, inheritance, resource boundaries, cross-workspace trust and capacity quotas across the organization."
      />
      <Tabs tabs={SUBSECTIONS} active="policies" onChange={() => {}} />
      <EmptyState
        icon={<Scale size={20} />}
        title="Workspace Governance — coming soon"
        hint="These sub-sections are on the build roadmap. Their leaf views and second-level sub-navigation will appear here."
      />
    </Page>
  );
}

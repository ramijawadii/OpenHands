/* eslint-disable i18next/no-literal-string -- CloudGuard Workspace Management → Workspace Administration console */
import React from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  LayoutGrid,
  Inbox,
  ListOrdered,
  Share2,
  FlaskConical,
  Archive,
  Trash2,
  Building2,
  Layers,
  BadgeCheck,
  Wrench,
  PencilRuler,
  Library,
} from "lucide-react";
import { ActiveWorkspacesView } from "#/components/admin/pages/workspace/active-workspaces";
import { WorkspaceRequestsView } from "#/components/admin/pages/workspace/workspace-requests";
import { ProvisioningQueueView } from "#/components/admin/pages/workspace/provisioning-queue";
import { SharedWorkspacesView } from "#/components/admin/pages/workspace/shared-workspaces";
import { SandboxesView } from "#/components/admin/pages/workspace/sandboxes";
import { ArchivedWorkspacesView } from "#/components/admin/pages/workspace/archived-workspaces";
import { DeletedWorkspacesView } from "#/components/admin/pages/workspace/deleted-workspaces";
import { EnterpriseTemplatesView } from "#/components/admin/pages/workspace/enterprise-templates";
import { EnvironmentTemplatesView } from "#/components/admin/pages/workspace/environment-templates";
import { ComplianceTemplatesView } from "#/components/admin/pages/workspace/compliance-templates";
import { OperationalTemplatesView } from "#/components/admin/pages/workspace/operational-templates";
import { CustomTemplatesView } from "#/components/admin/pages/workspace/custom-templates";
import { TemplateLibraryView } from "#/components/admin/pages/workspace/template-library";
import {
  Page,
  PageHeader,
  Tabs,
  SubTabStrip,
  EmptyState,
  HeaderButton,
  ScopeBadge,
  type StripIcon,
  useTabParam,
} from "#/components/admin/admin-kit";

/**
 * Workspace Administration console — the first of the three Workspace Management consoles
 * (Administration · Governance · Operations, selected in the sidebar). Spec:
 * docs/workspace/workspace_module/├── Workspace Administration/.
 *
 * Navigation model (3 levels):
 *   sidebar console (Administration)
 *     → first-level VIEW tabs = the 5 sub-sections (Workspaces, Workspace Templates, Ownership &
 *       Administration, Hierarchy & Relationships, Lifecycle) — underline Tabs
 *       → second-level pill SubTabStrip = that sub-section's leaves (each leaf is a full embeddable
 *         `…View`; its own status/type sub-nav is the leaf's internal pill strip)
 */

interface Leaf {
  id: string;
  label: string;
  Icon: StripIcon;
  render: () => React.ReactNode;
}

const WORKSPACE_LEAVES: Leaf[] = [
  {
    id: "active",
    label: "Active Workspaces",
    Icon: LayoutGrid,
    render: () => <ActiveWorkspacesView />,
  },
  {
    id: "requests",
    label: "Workspace Requests",
    Icon: Inbox,
    render: () => <WorkspaceRequestsView />,
  },
  {
    id: "provisioning",
    label: "Provisioning Queue",
    Icon: ListOrdered,
    render: () => <ProvisioningQueueView />,
  },
  {
    id: "shared",
    label: "Shared Workspaces",
    Icon: Share2,
    render: () => <SharedWorkspacesView />,
  },
  {
    id: "sandboxes",
    label: "Sandboxes",
    Icon: FlaskConical,
    render: () => <SandboxesView />,
  },
  {
    id: "archived",
    label: "Archived",
    Icon: Archive,
    render: () => <ArchivedWorkspacesView />,
  },
  {
    id: "deleted",
    label: "Deleted",
    Icon: Trash2,
    render: () => <DeletedWorkspacesView />,
  },
];

const TEMPLATE_LEAVES: Leaf[] = [
  {
    id: "enterprise",
    label: "Enterprise Templates",
    Icon: Building2,
    render: () => <EnterpriseTemplatesView />,
  },
  {
    id: "environment",
    label: "Environment Templates",
    Icon: Layers,
    render: () => <EnvironmentTemplatesView />,
  },
  {
    id: "compliance",
    label: "Compliance Templates",
    Icon: BadgeCheck,
    render: () => <ComplianceTemplatesView />,
  },
  {
    id: "operational",
    label: "Operational Templates",
    Icon: Wrench,
    render: () => <OperationalTemplatesView />,
  },
  {
    id: "custom",
    label: "Custom Templates",
    Icon: PencilRuler,
    render: () => <CustomTemplatesView />,
  },
  {
    id: "library",
    label: "Template Library",
    Icon: Library,
    render: () => <TemplateLibraryView />,
  },
];

// A sub-section renders its leaves as the second-level pill strip and shows the selected leaf below.
function LeafSubsection({ leaves }: { leaves: Leaf[] }) {
  const [leaf, setLeaf] = React.useState(leaves[0].id);
  const cur = leaves.find((l) => l.id === leaf) ?? leaves[0];
  return (
    <>
      <SubTabStrip
        tabs={leaves.map(({ id, label, Icon }) => ({ id, label, Icon }))}
        active={cur.id}
        onChange={setLeaf}
      />
      {cur.render()}
    </>
  );
}

function ComingSoon({ name }: { name: string }) {
  return (
    <EmptyState
      icon={<LayoutGrid size={20} />}
      title={`${name} — coming soon`}
      hint="This Workspace Administration sub-section is on the build roadmap. Its leaf views and their sub-navigation will appear here."
    />
  );
}

// First-level views (spec: Workspace Administration sub-sections).
const SUBSECTIONS = [
  { id: "workspaces", label: "Workspaces" },
  { id: "templates", label: "Workspace Templates" },
  { id: "ownership", label: "Ownership & Administration" },
  { id: "hierarchy", label: "Hierarchy & Relationships" },
  { id: "lifecycle", label: "Lifecycle" },
];

export function WorkspaceManagementPage() {
  const [tab, setTab] = useTabParam("workspaces");
  const navigate = useNavigate();

  return (
    <Page>
      <PageHeader
        title="Workspace Administration"
        subtitle="Create, classify and govern the isolated workspaces, their templates, ownership, hierarchy and lifecycle across the organization."
        actions={
          <>
            <ScopeBadge scope="Organization" />
            <HeaderButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate("/admin/workspaces?tab=workspaces")}
            >
              New Workspace Request
            </HeaderButton>
          </>
        }
      />
      <Tabs tabs={SUBSECTIONS} active={tab} onChange={setTab} />
      {tab === "workspaces" && <LeafSubsection leaves={WORKSPACE_LEAVES} />}
      {tab === "templates" && <LeafSubsection leaves={TEMPLATE_LEAVES} />}
      {tab === "ownership" && <ComingSoon name="Ownership & Administration" />}
      {tab === "hierarchy" && <ComingSoon name="Hierarchy & Relationships" />}
      {tab === "lifecycle" && <ComingSoon name="Lifecycle" />}
    </Page>
  );
}

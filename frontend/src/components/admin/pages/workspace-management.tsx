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
  UserCog,
  UserCheck,
  Briefcase,
  GitBranch,
  Siren,
  ShieldCheck,
  Network,
  FolderTree,
  Server,
  Link2,
  Waypoints,
  Map,
  ClipboardList,
  Cog,
  PlayCircle,
  PauseCircle,
  Hammer,
  PowerOff,
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
import { WorkspaceOwnersView } from "#/components/admin/pages/workspace/workspace-owners";
import { DelegatedAdministratorsView } from "#/components/admin/pages/workspace/delegated-administrators";
import { BusinessOwnershipView } from "#/components/admin/pages/workspace/business-ownership";
import { ApprovalChainsView } from "#/components/admin/pages/workspace/approval-chains";
import { EscalationContactsView } from "#/components/admin/pages/workspace/escalation-contacts";
import { AdministrativeDelegationView } from "#/components/admin/pages/workspace/administrative-delegation";
import { OrganizationHierarchyView } from "#/components/admin/pages/workspace/organization-hierarchy";
import { ParentChildWorkspacesView } from "#/components/admin/pages/workspace/parent-child-workspaces";
import { SharedServiceWorkspacesView } from "#/components/admin/pages/workspace/shared-service-workspaces";
import { WorkspaceDependenciesView } from "#/components/admin/pages/workspace/workspace-dependencies";
import { WorkspaceRelationshipsView } from "#/components/admin/pages/workspace/workspace-relationships";
import { WorkspaceTopologyView } from "#/components/admin/pages/workspace/workspace-topology";
import { LifecycleRequestedView } from "#/components/admin/pages/workspace/lifecycle-requested";
import { LifecycleProvisioningView } from "#/components/admin/pages/workspace/lifecycle-provisioning";
import { LifecycleActiveView } from "#/components/admin/pages/workspace/lifecycle-active";
import { LifecycleSuspendedView } from "#/components/admin/pages/workspace/lifecycle-suspended";
import { LifecycleMaintenanceView } from "#/components/admin/pages/workspace/lifecycle-maintenance";
import { LifecycleArchivedView } from "#/components/admin/pages/workspace/lifecycle-archived";
import { LifecycleDecommissionedView } from "#/components/admin/pages/workspace/lifecycle-decommissioned";
import {
  HeaderButton,
  ScopeBadge,
  type StripIcon,
  useTabParam,
} from "#/components/admin/admin-kit";
import {
  DiscoveryPage,
  DiscoveryTabs,
  DiscoveryPills,
} from "#/components/admin/discovery-kit";

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

const OWNERSHIP_LEAVES: Leaf[] = [
  {
    id: "owners",
    label: "Workspace Owners",
    Icon: UserCog,
    render: () => <WorkspaceOwnersView />,
  },
  {
    id: "delegated",
    label: "Delegated Administrators",
    Icon: UserCheck,
    render: () => <DelegatedAdministratorsView />,
  },
  {
    id: "business",
    label: "Business Ownership",
    Icon: Briefcase,
    render: () => <BusinessOwnershipView />,
  },
  {
    id: "approvals",
    label: "Approval Chains",
    Icon: GitBranch,
    render: () => <ApprovalChainsView />,
  },
  {
    id: "escalation",
    label: "Escalation Contacts",
    Icon: Siren,
    render: () => <EscalationContactsView />,
  },
  {
    id: "admin-delegation",
    label: "Administrative Delegation",
    Icon: ShieldCheck,
    render: () => <AdministrativeDelegationView />,
  },
];

const HIERARCHY_LEAVES: Leaf[] = [
  {
    id: "org-hierarchy",
    label: "Organization Hierarchy",
    Icon: Network,
    render: () => <OrganizationHierarchyView />,
  },
  {
    id: "parent-child",
    label: "Parent / Child Workspaces",
    Icon: FolderTree,
    render: () => <ParentChildWorkspacesView />,
  },
  {
    id: "shared-service",
    label: "Shared Service Workspaces",
    Icon: Server,
    render: () => <SharedServiceWorkspacesView />,
  },
  {
    id: "dependencies",
    label: "Dependencies",
    Icon: Link2,
    render: () => <WorkspaceDependenciesView />,
  },
  {
    id: "relationships",
    label: "Workspace Relationships",
    Icon: Waypoints,
    render: () => <WorkspaceRelationshipsView />,
  },
  {
    id: "topology",
    label: "Workspace Topology",
    Icon: Map,
    render: () => <WorkspaceTopologyView />,
  },
];

const LIFECYCLE_LEAVES: Leaf[] = [
  {
    id: "requested",
    label: "Requested",
    Icon: ClipboardList,
    render: () => <LifecycleRequestedView />,
  },
  {
    id: "provisioning",
    label: "Provisioning",
    Icon: Cog,
    render: () => <LifecycleProvisioningView />,
  },
  {
    id: "active",
    label: "Active",
    Icon: PlayCircle,
    render: () => <LifecycleActiveView />,
  },
  {
    id: "suspended",
    label: "Suspended",
    Icon: PauseCircle,
    render: () => <LifecycleSuspendedView />,
  },
  {
    id: "maintenance",
    label: "Maintenance",
    Icon: Hammer,
    render: () => <LifecycleMaintenanceView />,
  },
  {
    id: "archived",
    label: "Archived",
    Icon: Archive,
    render: () => <LifecycleArchivedView />,
  },
  {
    id: "decommissioned",
    label: "Decommissioned",
    Icon: PowerOff,
    render: () => <LifecycleDecommissionedView />,
  },
];

// A sub-section renders its leaves as the second-level pill strip and shows the selected leaf below.
function LeafSubsection({ leaves }: { leaves: Leaf[] }) {
  const [leaf, setLeaf] = React.useState(leaves[0].id);
  const cur = leaves.find((l) => l.id === leaf) ?? leaves[0];
  return (
    <>
      <DiscoveryPills
        label="Views"
        items={leaves.map(({ id, label, Icon }) => ({
          id,
          label,
          icon: <Icon size={14} />,
        }))}
        active={cur.id}
        onChange={setLeaf}
      />
      {cur.render()}
    </>
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

const SUB_ICONS: Record<string, React.ReactNode> = {
  workspaces: <LayoutGrid size={14} />,
  templates: <Layers size={14} />,
  ownership: <UserCog size={14} />,
  hierarchy: <Network size={14} />,
  lifecycle: <Waypoints size={14} />,
};

export function WorkspaceManagementPage() {
  const [tab, setTab] = useTabParam("workspaces");
  const navigate = useNavigate();

  return (
    <DiscoveryPage>
      {/* Framework chrome: scope badge + primary action on one row (no heading),
          then the icon tab strip — matching the Identity & Access console. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 10,
          margin: "0 10px 8px",
        }}
      >
        <ScopeBadge scope="Organization" />
        <HeaderButton
          variant="primary"
          icon={<Plus size={14} />}
          onClick={() => navigate("/admin/workspaces?tab=workspaces")}
        >
          New Workspace Request
        </HeaderButton>
      </div>
      <DiscoveryTabs
        tabs={SUBSECTIONS.map((s) => ({ ...s, icon: SUB_ICONS[s.id] }))}
        active={tab}
        onChange={setTab}
        label="Workspace Administration views"
      />
      {tab === "workspaces" && <LeafSubsection leaves={WORKSPACE_LEAVES} />}
      {tab === "templates" && <LeafSubsection leaves={TEMPLATE_LEAVES} />}
      {tab === "ownership" && <LeafSubsection leaves={OWNERSHIP_LEAVES} />}
      {tab === "hierarchy" && <LeafSubsection leaves={HIERARCHY_LEAVES} />}
      {tab === "lifecycle" && <LeafSubsection leaves={LIFECYCLE_LEAVES} />}
    </DiscoveryPage>
  );
}

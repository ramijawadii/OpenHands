/* eslint-disable i18next/no-literal-string -- CloudGuard Workspace Management → Workspace Governance console */
import React from "react";
import {
  FilePlus2,
  Cog,
  Tags,
  BadgeCheck,
  ListChecks,
  Settings2,
  Building2,
  SlidersHorizontal,
  Network,
  Layers,
  Lock,
  Waypoints,
  Boxes,
  Cloud,
  FolderGit2,
  Server,
  UserSquare,
  Share2,
  Shield,
  KeyRound,
  FileCheck2,
  GitGraph,
  ShieldOff,
  Inbox,
  Package,
  Gauge,
  SlidersVertical,
  Scale,
  CalendarClock,
  BarChart3,
  Receipt,
  TrendingUp,
} from "lucide-react";
import {
  Page,
  PageHeader,
  Tabs,
  SubTabStrip,
  EmptyState,
  ScopeBadge,
  type StripIcon,
  useTabParam,
} from "#/components/admin/admin-kit";
import { CreationPoliciesView } from "#/components/admin/pages/workspace-governance/creation-policies";
import { OperationalPoliciesView } from "#/components/admin/pages/workspace-governance/operational-policies";
import { MetadataPoliciesView } from "#/components/admin/pages/workspace-governance/metadata-policies";
import { PolicyAssignmentsView } from "#/components/admin/pages/workspace-governance/policy-assignments";
import { ComplianceAssignmentsView } from "#/components/admin/pages/workspace-governance/compliance-assignments";
import { DefaultConfigurationView } from "#/components/admin/pages/workspace-governance/default-configuration";
import { OrganizationDefaultsView } from "#/components/admin/pages/workspace-governance/organization-defaults";
import { WorkspaceOverridesView } from "#/components/admin/pages/workspace-governance/workspace-overrides";
import { AwsAccountsView } from "#/components/admin/pages/workspace-governance/aws-accounts";
import { AzureSubscriptionsView } from "#/components/admin/pages/workspace-governance/azure-subscriptions";
import { GcpProjectsView } from "#/components/admin/pages/workspace-governance/gcp-projects";
import { KubernetesClustersView } from "#/components/admin/pages/workspace-governance/kubernetes-clusters";
import { InheritanceTreeView } from "#/components/admin/pages/workspace-governance/inheritance-tree";
import { EffectiveConfigurationView } from "#/components/admin/pages/workspace-governance/effective-configuration";
import { LockedConfigurationView } from "#/components/admin/pages/workspace-governance/locked-configuration";
import { ConfigurationDriftView } from "#/components/admin/pages/workspace-governance/configuration-drift";
import { AllowedResourceTypesView } from "#/components/admin/pages/workspace-governance/allowed-resource-types";
import { ResourceOwnershipView } from "#/components/admin/pages/workspace-governance/resource-ownership";
import { SharedResourcesView } from "#/components/admin/pages/workspace-governance/shared-resources";

/**
 * Workspace Governance console — the SECOND of the three Workspace Management consoles
 * (Administration · Governance · Operations, selected in the sidebar). Authoritative spec:
 * docs/workspace/workspace_module/── Workspace Governance/.
 *
 * Navigation model (3 levels), identical to the Workspace Administration console:
 *   sidebar console (Governance)
 *     → first-level VIEW tabs = the 5 sub-sections (Workspace Policies · Inheritance & Overrides ·
 *       Resource Boundaries · Cross-Workspace Governance · Capacity & Quotas) — underline Tabs
 *       → second-level pill SubTabStrip = that sub-section's leaves (each leaf is a full embeddable
 *         `…View`; its own status/type sub-nav is the leaf's internal pill strip)
 *
 * Leaves are built out per spec one sub-section at a time; a leaf with no `render` shows a per-leaf
 * placeholder so the entire information architecture is navigable while the batch build proceeds.
 */

interface Leaf {
  id: string;
  label: string;
  Icon: StripIcon;
  render?: () => React.ReactNode; // omit → coming-soon placeholder (spec view being built)
}

// ── 01 · Workspace Policies ──────────────────────────────────────────────────────────────────────
const POLICY_LEAVES: Leaf[] = [
  {
    id: "creation",
    label: "Creation Policies",
    Icon: FilePlus2,
    render: () => <CreationPoliciesView />,
  },
  {
    id: "operational",
    label: "Operational Policies",
    Icon: Cog,
    render: () => <OperationalPoliciesView />,
  },
  {
    id: "metadata",
    label: "Metadata Policies",
    Icon: Tags,
    render: () => <MetadataPoliciesView />,
  },
  {
    id: "compliance-assignments",
    label: "Compliance Assignments",
    Icon: BadgeCheck,
    render: () => <ComplianceAssignmentsView />,
  },
  {
    id: "policy-assignments",
    label: "Policy Assignments",
    Icon: ListChecks,
    render: () => <PolicyAssignmentsView />,
  },
  {
    id: "default-configuration",
    label: "Default Configuration",
    Icon: Settings2,
    render: () => <DefaultConfigurationView />,
  },
];

// ── 02 · Inheritance & Overrides ─────────────────────────────────────────────────────────────────
const INHERITANCE_LEAVES: Leaf[] = [
  {
    id: "organization-defaults",
    label: "Organization Defaults",
    Icon: Building2,
    render: () => <OrganizationDefaultsView />,
  },
  {
    id: "workspace-overrides",
    label: "Workspace Overrides",
    Icon: SlidersHorizontal,
    render: () => <WorkspaceOverridesView />,
  },
  {
    id: "inheritance-tree",
    label: "Inheritance Tree",
    Icon: Network,
    render: () => <InheritanceTreeView />,
  },
  {
    id: "effective-configuration",
    label: "Effective Configuration",
    Icon: Layers,
    render: () => <EffectiveConfigurationView />,
  },
  {
    id: "locked-configuration",
    label: "Locked Configuration",
    Icon: Lock,
    render: () => <LockedConfigurationView />,
  },
  {
    id: "configuration-drift",
    label: "Configuration Drift",
    Icon: Waypoints,
    render: () => <ConfigurationDriftView />,
  },
  {
    id: "allowed-resource-types",
    label: "Allowed Resource Types",
    Icon: Boxes,
    render: () => <AllowedResourceTypesView />,
  },
  {
    id: "aws-accounts",
    label: "AWS Accounts",
    Icon: Cloud,
    render: () => <AwsAccountsView />,
  },
  {
    id: "azure-subscriptions",
    label: "Azure Subscriptions",
    Icon: Cloud,
    render: () => <AzureSubscriptionsView />,
  },
  {
    id: "gcp-projects",
    label: "GCP Projects",
    Icon: FolderGit2,
    render: () => <GcpProjectsView />,
  },
  {
    id: "kubernetes-clusters",
    label: "Kubernetes Clusters",
    Icon: Server,
    render: () => <KubernetesClustersView />,
  },
  {
    id: "resource-ownership",
    label: "Resource Ownership",
    Icon: UserSquare,
    render: () => <ResourceOwnershipView />,
  },
  {
    id: "shared-resources",
    label: "Shared Resources",
    Icon: Share2,
    render: () => <SharedResourcesView />,
  },
];

// ── 04 · Cross-Workspace Governance ──────────────────────────────────────────────────────────────
const CROSS_LEAVES: Leaf[] = [
  { id: "trust-relationships", label: "Trust Relationships", Icon: Shield },
  {
    id: "cross-workspace-access",
    label: "Cross-Workspace Access",
    Icon: KeyRound,
  },
  {
    id: "shared-resource-policies",
    label: "Shared Resource Policies",
    Icon: FileCheck2,
  },
  { id: "dependency-graph", label: "Dependency Graph", Icon: GitGraph },
  { id: "workspace-isolation", label: "Workspace Isolation", Icon: ShieldOff },
  {
    id: "cross-workspace-requests",
    label: "Cross-Workspace Requests",
    Icon: Inbox,
  },
  { id: "shared-assets", label: "Shared Assets", Icon: Package },
];

// ── 05 · Capacity & Quotas ───────────────────────────────────────────────────────────────────────
const CAPACITY_LEAVES: Leaf[] = [
  { id: "workspace-quotas", label: "Workspace Quotas", Icon: Gauge },
  { id: "resource-limits", label: "Resource Limits", Icon: SlidersVertical },
  { id: "quota-policies", label: "Quota Policies", Icon: Scale },
  {
    id: "capacity-reservations",
    label: "Capacity Reservations",
    Icon: CalendarClock,
  },
  { id: "utilization", label: "Utilization", Icon: BarChart3 },
  { id: "consumption", label: "Consumption", Icon: Receipt },
  { id: "growth-forecasting", label: "Growth Forecasting", Icon: TrendingUp },
];

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
      {cur.render ? (
        cur.render()
      ) : (
        <EmptyState
          icon={<Scale size={20} />}
          title={`${cur.label} — on the build roadmap`}
          hint="This governance leaf's full spec view (dashboard · toolbar · filters · datatable · detail drawer) is being implemented. Its second-level sub-navigation will appear here."
        />
      )}
    </>
  );
}

// First-level views (spec: Workspace Governance sub-sections).
const SUBSECTIONS = [
  { id: "policies", label: "Workspace Policies" },
  { id: "inheritance", label: "Inheritance & Overrides" },
  { id: "boundaries", label: "Resource Boundaries" },
  { id: "cross", label: "Cross-Workspace Governance" },
  { id: "capacity", label: "Capacity & Quotas" },
];

export function WorkspaceGovernancePage() {
  const [tab, setTab] = useTabParam("policies");
  return (
    <Page>
      <PageHeader
        title="Workspace Governance"
        subtitle="Policies, inheritance and overrides, resource boundaries, cross-workspace trust and capacity quotas across every workspace in the organization."
        actions={<ScopeBadge scope="Organization" />}
      />
      <Tabs tabs={SUBSECTIONS} active={tab} onChange={setTab} />
      {tab === "policies" && <LeafSubsection leaves={POLICY_LEAVES} />}
      {tab === "inheritance" && <LeafSubsection leaves={INHERITANCE_LEAVES} />}
      {tab === "boundaries" && (
        <EmptyState
          icon={<Scale size={20} />}
          title="Resource Boundaries"
          hint="Resource-boundary governance (allowed resource types, cloud-account scoping, ownership and shared resources) is covered under Inheritance & Overrides for this release."
        />
      )}
      {tab === "cross" && <LeafSubsection leaves={CROSS_LEAVES} />}
      {tab === "capacity" && <LeafSubsection leaves={CAPACITY_LEAVES} />}
    </Page>
  );
}

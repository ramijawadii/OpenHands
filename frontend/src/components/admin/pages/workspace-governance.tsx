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
  EmptyState,
  ScopeBadge,
  type StripIcon,
  useTabParam,
} from "#/components/admin/admin-kit";
import {
  DiscoveryPage,
  DiscoveryTabs,
  DiscoveryPills,
} from "#/components/admin/discovery-kit";
import { CreationPoliciesView } from "#/components/admin/pages/workspace-governance/creation-policies";
import { OperationalPoliciesView } from "#/components/admin/pages/workspace-governance/operational-policies";
import { MetadataPoliciesView } from "#/components/admin/pages/workspace-governance/metadata-policies";
import { PolicyAssignmentsView } from "#/components/admin/pages/workspace-governance/policy-assignments";
import { ComplianceAssignmentsView } from "#/components/admin/pages/workspace-governance/compliance-assignments";
import { DefaultConfigurationView } from "#/components/admin/pages/workspace-governance/default-configuration";
import { OrganizationDefaultsView } from "#/components/admin/pages/workspace-governance/organization-defaults";
import { WorkspaceOverridesView } from "#/components/admin/pages/workspace-governance/workspace-overrides";
import { AwsAccountsView } from "#/components/admin/pages/workspace-governance/aws-accounts";
import { ResourceBoundariesView } from "#/components/admin/pages/workspace-governance/resource-boundaries";
import { InheritanceTreeView } from "#/components/admin/pages/workspace-governance/inheritance-tree";
import { EffectiveConfigurationView } from "#/components/admin/pages/workspace-governance/effective-configuration";
import { LockedConfigurationView } from "#/components/admin/pages/workspace-governance/locked-configuration";
import { ConfigurationDriftView } from "#/components/admin/pages/workspace-governance/configuration-drift";
import { AllowedResourceTypesView } from "#/components/admin/pages/workspace-governance/allowed-resource-types";
import { TrustRelationshipsView } from "#/components/admin/pages/workspace-governance/trust-relationships";
import { CrossWorkspaceAccessView } from "#/components/admin/pages/workspace-governance/cross-workspace-access";
import { SharedResourcePoliciesView } from "#/components/admin/pages/workspace-governance/shared-resource-policies";
import { DependencyGraphView } from "#/components/admin/pages/workspace-governance/dependency-graph";
import { WorkspaceIsolationView } from "#/components/admin/pages/workspace-governance/workspace-isolation";
import { CrossWorkspaceRequestsView } from "#/components/admin/pages/workspace-governance/cross-workspace-requests";
import { SharedAssetsView } from "#/components/admin/pages/workspace-governance/shared-assets";
import { WorkspaceQuotasView } from "#/components/admin/pages/workspace-governance/workspace-quotas";
import { ResourceLimitsView } from "#/components/admin/pages/workspace-governance/resource-limits";
import { QuotaPoliciesView } from "#/components/admin/pages/workspace-governance/quota-policies";
import { CapacityReservationsView } from "#/components/admin/pages/workspace-governance/capacity-reservations";
import { UtilizationView } from "#/components/admin/pages/workspace-governance/utilization";
import { ConsumptionView } from "#/components/admin/pages/workspace-governance/consumption";
import { GrowthForecastingView } from "#/components/admin/pages/workspace-governance/growth-forecasting";

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
    id: "resource-boundaries",
    label: "Cloud & Resources",
    Icon: Boxes,
    render: () => <ResourceBoundariesView />,
  },
];

// ── 04 · Cross-Workspace Governance ──────────────────────────────────────────────────────────────
const CROSS_LEAVES: Leaf[] = [
  {
    id: "trust-relationships",
    label: "Trust Relationships",
    Icon: Shield,
    render: () => <TrustRelationshipsView />,
  },
  {
    id: "cross-workspace-access",
    label: "Cross-Workspace Access",
    Icon: KeyRound,
    render: () => <CrossWorkspaceAccessView />,
  },
  {
    id: "shared-resource-policies",
    label: "Shared Resource Policies",
    Icon: FileCheck2,
    render: () => <SharedResourcePoliciesView />,
  },
  {
    id: "dependency-graph",
    label: "Dependency Graph",
    Icon: GitGraph,
    render: () => <DependencyGraphView />,
  },
  {
    id: "workspace-isolation",
    label: "Workspace Isolation",
    Icon: ShieldOff,
    render: () => <WorkspaceIsolationView />,
  },
  {
    id: "cross-workspace-requests",
    label: "Cross-Workspace Requests",
    Icon: Inbox,
    render: () => <CrossWorkspaceRequestsView />,
  },
  {
    id: "shared-assets",
    label: "Shared Assets",
    Icon: Package,
    render: () => <SharedAssetsView />,
  },
];

// ── 05 · Capacity & Quotas ───────────────────────────────────────────────────────────────────────
const CAPACITY_LEAVES: Leaf[] = [
  {
    id: "workspace-quotas",
    label: "Workspace Quotas",
    Icon: Gauge,
    render: () => <WorkspaceQuotasView />,
  },
  {
    id: "resource-limits",
    label: "Resource Limits",
    Icon: SlidersVertical,
    render: () => <ResourceLimitsView />,
  },
  {
    id: "quota-policies",
    label: "Quota Policies",
    Icon: Scale,
    render: () => <QuotaPoliciesView />,
  },
  {
    id: "capacity-reservations",
    label: "Capacity Reservations",
    Icon: CalendarClock,
    render: () => <CapacityReservationsView />,
  },
  {
    id: "utilization",
    label: "Utilization",
    Icon: BarChart3,
    render: () => <UtilizationView />,
  },
  {
    id: "consumption",
    label: "Consumption",
    Icon: Receipt,
    render: () => <ConsumptionView />,
  },
  {
    id: "growth-forecasting",
    label: "Growth Forecasting",
    Icon: TrendingUp,
    render: () => <GrowthForecastingView />,
  },
];

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

const SUB_ICONS: Record<string, React.ReactNode> = {
  policies: <ListChecks size={14} />,
  inheritance: <Layers size={14} />,
  boundaries: <Boxes size={14} />,
  cross: <Share2 size={14} />,
  capacity: <Gauge size={14} />,
};

export function WorkspaceGovernancePage() {
  const [tab, setTab] = useTabParam("policies");
  return (
    <DiscoveryPage>
      {/* Framework chrome: scope badge on one row (no heading), then the icon tab
          strip — matching the Identity & Access and Workspace Management consoles. */}
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
      </div>
      <DiscoveryTabs
        tabs={SUBSECTIONS.map((s) => ({ ...s, icon: SUB_ICONS[s.id] }))}
        active={tab}
        onChange={setTab}
        label="Workspace Governance views"
      />
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
    </DiscoveryPage>
  );
}

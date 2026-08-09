/* eslint-disable i18next/no-literal-string -- CloudGuard Workspace Governance → Inheritance & Overrides → Resource Boundaries (consolidated) */
import React from "react";
import { Select } from "#/components/admin/admin-kit";
import { AzureSubscriptionsView } from "#/components/admin/pages/workspace-governance/azure-subscriptions";
import { GcpProjectsView } from "#/components/admin/pages/workspace-governance/gcp-projects";
import { KubernetesClustersView } from "#/components/admin/pages/workspace-governance/kubernetes-clusters";
import { ResourceOwnershipView } from "#/components/admin/pages/workspace-governance/resource-ownership";
import { SharedResourcesView } from "#/components/admin/pages/workspace-governance/shared-resources";

/**
 * Resource Boundaries — a single leaf that consolidates what used to be five
 * separate tabs (Azure Subscriptions · GCP Projects · Kubernetes Clusters ·
 * Resource Ownership · Shared Resources) behind one filter. The dropdown selects
 * which resource-boundary surface to show; each option renders its existing view
 * unchanged.
 */
const OPTIONS = [
  { value: "azure", label: "Azure Subscriptions" },
  { value: "gcp", label: "GCP Projects" },
  { value: "kubernetes", label: "Kubernetes Clusters" },
  { value: "ownership", label: "Resource Ownership" },
  { value: "shared", label: "Shared Resources" },
];

export function ResourceBoundariesView() {
  const [which, setWhich] = React.useState("azure");
  return (
    <>
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Select
          label="Resource boundary"
          value={which}
          onChange={setWhich}
          options={OPTIONS}
        />
      </div>
      {which === "azure" && <AzureSubscriptionsView />}
      {which === "gcp" && <GcpProjectsView />}
      {which === "kubernetes" && <KubernetesClustersView />}
      {which === "ownership" && <ResourceOwnershipView />}
      {which === "shared" && <SharedResourcesView />}
    </>
  );
}

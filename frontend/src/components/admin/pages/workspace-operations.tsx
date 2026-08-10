/* eslint-disable i18next/no-literal-string -- CloudGuard Workspace Management → Workspace Operations console */
import React from "react";
import {
  Waypoints,
  UserCog,
  FileDiff,
  FileCheck2,
  Stamp,
  Repeat,
  Package,
  Compass,
  Inbox,
  Cog,
  BellRing,
  ClipboardList,
} from "lucide-react";
import {
  EmptyState,
  ScopeBadge,
  useTabParam,
} from "#/components/admin/admin-kit";
import {
  DiscoveryPage,
  DiscoveryTabs,
  DiscoveryPills,
} from "#/components/admin/discovery-kit";
import { type Leaf } from "#/components/admin/pages/workspace-operations/ops-leaf";
import { CATALOG_LEAVES } from "#/components/admin/pages/workspace-operations/catalog-discovery";
import { REQUESTS_LEAVES } from "#/components/admin/pages/workspace-operations/requests-approvals";
import { AUTOMATION_LEAVES } from "#/components/admin/pages/workspace-operations/automation";
import { ALERTS_LEAVES } from "#/components/admin/pages/workspace-operations/alerts";
import { WorkspaceTimelineView } from "#/components/admin/pages/workspace-operations/workspace-timeline";
import { AdministrativeActivityView } from "#/components/admin/pages/workspace-operations/administrative-activity";
import { ConfigurationChangesView } from "#/components/admin/pages/workspace-operations/configuration-changes";
import { PolicyChangesView } from "#/components/admin/pages/workspace-operations/policy-changes";
import { ApprovalHistoryView } from "#/components/admin/pages/workspace-operations/approval-history";
import { LifecycleEventsView } from "#/components/admin/pages/workspace-operations/lifecycle-events";
import { ExportEvidenceView } from "#/components/admin/pages/workspace-operations/export-evidence";

/**
 * Workspace Operations console — the THIRD of the three Workspace Management consoles
 * (Administration · Governance · Operations, selected in the sidebar). Authoritative spec:
 * docs/workspace/workspace_module/└── Workspace Operations/.
 *
 * Navigation model (3 levels), identical to Workspace Governance:
 *   sidebar console (Operations)
 *     → first-level VIEW tabs (DiscoveryTabs) = the 5 sub-sections (Catalog & Discovery ·
 *       Requests & Approvals · Automation · Alerts · Workspace Audit)
 *       → second-level pill strip (DiscoveryPills) = that sub-section's leaves (each leaf is a full
 *         embeddable `…View`; its own status/type sub-nav is the leaf's internal pill strip)
 *
 * Catalog & Discovery, Requests & Approvals, Automation and Alerts are generated from the shared
 * ops-leaf framework engine (config-driven — the systematic rollout). Workspace Audit's seven leaves
 * are bespoke immutable-record views.
 */

// ── Workspace Audit (bespoke immutable-record leaves) ────────────────────────────────────────────
const AUDIT_LEAVES: Leaf[] = [
  {
    id: "workspace-timeline",
    label: "Workspace Timeline",
    Icon: Waypoints,
    render: () => <WorkspaceTimelineView />,
  },
  {
    id: "administrative-activity",
    label: "Administrative Activity",
    Icon: UserCog,
    render: () => <AdministrativeActivityView />,
  },
  {
    id: "configuration-changes",
    label: "Configuration Changes",
    Icon: FileDiff,
    render: () => <ConfigurationChangesView />,
  },
  {
    id: "policy-changes",
    label: "Policy Changes",
    Icon: FileCheck2,
    render: () => <PolicyChangesView />,
  },
  {
    id: "approval-history",
    label: "Approval History",
    Icon: Stamp,
    render: () => <ApprovalHistoryView />,
  },
  {
    id: "lifecycle-events",
    label: "Lifecycle Events",
    Icon: Repeat,
    render: () => <LifecycleEventsView />,
  },
  {
    id: "export-evidence",
    label: "Export & Evidence",
    Icon: Package,
    render: () => <ExportEvidenceView />,
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
          icon={<ClipboardList size={20} />}
          title={`${cur.label} — on the build roadmap`}
          hint="This operations leaf's full spec view (dashboard · toolbar · filters · datatable · detail drawer) is being implemented."
        />
      )}
    </>
  );
}

// First-level views (spec: Workspace Operations sub-sections).
const SUBSECTIONS = [
  { id: "catalog", label: "Catalog & Discovery", icon: <Compass size={14} /> },
  { id: "requests", label: "Requests & Approvals", icon: <Inbox size={14} /> },
  { id: "automation", label: "Automation", icon: <Cog size={14} /> },
  { id: "alerts", label: "Alerts", icon: <BellRing size={14} /> },
  { id: "audit", label: "Workspace Audit", icon: <ClipboardList size={14} /> },
];

export function WorkspaceOperationsPage() {
  const [tab, setTab] = useTabParam("catalog");
  return (
    <DiscoveryPage>
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
        tabs={SUBSECTIONS}
        active={tab}
        onChange={setTab}
        label="Workspace Operations views"
      />
      {tab === "catalog" && <LeafSubsection leaves={CATALOG_LEAVES} />}
      {tab === "requests" && <LeafSubsection leaves={REQUESTS_LEAVES} />}
      {tab === "automation" && <LeafSubsection leaves={AUTOMATION_LEAVES} />}
      {tab === "alerts" && <LeafSubsection leaves={ALERTS_LEAVES} />}
      {tab === "audit" && <LeafSubsection leaves={AUDIT_LEAVES} />}
    </DiscoveryPage>
  );
}

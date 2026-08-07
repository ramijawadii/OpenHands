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
  Page,
  PageHeader,
  Tabs,
  SubTabStrip,
  EmptyState,
  ScopeBadge,
  type StripIcon,
  useTabParam,
} from "#/components/admin/admin-kit";
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
 *     → first-level VIEW tabs = the 5 sub-sections (Catalog & Discovery · Requests & Approvals ·
 *       Automation · Alerts · Workspace Audit) — underline Tabs
 *       → second-level pill SubTabStrip = that sub-section's leaves (each leaf is a full embeddable
 *         `…View`; its own status/type sub-nav is the leaf's internal pill strip)
 *
 * Workspace Audit is fully built out per spec (7 leaves). The other four sub-sections are on the build
 * roadmap and show a per-section placeholder so the entire information architecture is navigable.
 */

interface Leaf {
  id: string;
  label: string;
  Icon: StripIcon;
  render?: () => React.ReactNode; // omit → coming-soon placeholder (spec view being built)
}

// ── Workspace Audit ────────────────────────────────────────────────────────────────────────────────
const AUDIT_LEAVES: Leaf[] = [
  { id: "workspace-timeline", label: "Workspace Timeline", Icon: Waypoints, render: () => <WorkspaceTimelineView /> },
  { id: "administrative-activity", label: "Administrative Activity", Icon: UserCog, render: () => <AdministrativeActivityView /> },
  { id: "configuration-changes", label: "Configuration Changes", Icon: FileDiff, render: () => <ConfigurationChangesView /> },
  { id: "policy-changes", label: "Policy Changes", Icon: FileCheck2, render: () => <PolicyChangesView /> },
  { id: "approval-history", label: "Approval History", Icon: Stamp, render: () => <ApprovalHistoryView /> },
  { id: "lifecycle-events", label: "Lifecycle Events", Icon: Repeat, render: () => <LifecycleEventsView /> },
  { id: "export-evidence", label: "Export & Evidence", Icon: Package, render: () => <ExportEvidenceView /> },
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
          icon={<ClipboardList size={20} />}
          title={`${cur.label} — on the build roadmap`}
          hint="This operations leaf's full spec view (dashboard · toolbar · filters · datatable · detail drawer) is being implemented. Its second-level sub-navigation will appear here."
        />
      )}
    </>
  );
}

// First-level views (spec: Workspace Operations sub-sections).
const SUBSECTIONS = [
  { id: "catalog", label: "Catalog & Discovery", icon: <Compass size={13} /> },
  { id: "requests", label: "Requests & Approvals", icon: <Inbox size={13} /> },
  { id: "automation", label: "Automation", icon: <Cog size={13} /> },
  { id: "alerts", label: "Alerts", icon: <BellRing size={13} /> },
  { id: "audit", label: "Workspace Audit", icon: <ClipboardList size={13} /> },
];

function SectionPlaceholder({ label }: { label: string }) {
  return (
    <EmptyState
      icon={<ClipboardList size={20} />}
      title={`${label} — on the build roadmap`}
      hint="This Workspace Operations sub-section's leaf views and second-level sub-navigation will appear here. Workspace Audit is fully built."
    />
  );
}

export function WorkspaceOperationsPage() {
  const [tab, setTab] = useTabParam("audit");
  return (
    <Page>
      <PageHeader
        title="Workspace Operations"
        subtitle="Catalog and discovery, requests and approvals, automation, alerts and the immutable workspace audit trail across every workspace in the organization."
        actions={<ScopeBadge scope="Organization" />}
      />
      <Tabs tabs={SUBSECTIONS} active={tab} onChange={setTab} />
      {tab === "catalog" && <SectionPlaceholder label="Catalog & Discovery" />}
      {tab === "requests" && <SectionPlaceholder label="Requests & Approvals" />}
      {tab === "automation" && <SectionPlaceholder label="Automation" />}
      {tab === "alerts" && <SectionPlaceholder label="Alerts" />}
      {tab === "audit" && <LeafSubsection leaves={AUDIT_LEAVES} />}
    </Page>
  );
}

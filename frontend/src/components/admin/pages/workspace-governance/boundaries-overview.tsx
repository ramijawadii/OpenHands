/* eslint-disable i18next/no-literal-string -- CloudGuard Workspace Governance → Resource Boundaries → Overview */
import React from "react";
import { T } from "#/components/admin/admin-kit";
import { StatStripPlain } from "#/components/admin/settings-kit";
import { OverviewBar } from "#/components/features/explore/cloudguard-grid/OverviewBar";

/**
 * Resource Boundaries → Overview — the landing pill: one glance at the estate's
 * boundaries (cloud tenancies, clusters, allowed types, shared resources,
 * ownership coverage). Built from framework primitives only (StatStripPlain +
 * OverviewBar); no table — it routes into the per-provider leaves. Sample data
 * until the boundary backend lands. See docs/design/resource-boundaries-tab-spec.md §3.
 */

// Transparent chart frame (border + header, no fill) so the ECharts canvas reads
// on the page ground — mirrors the sandboxes ChartCard.
function ChartCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        background: "transparent",
        marginBottom: 18,
        overflow: "hidden",
      }}
    >
      <div
        style={{ padding: "13px 16px", borderBottom: `1px solid ${T.border}` }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
          {title}
        </div>
        {desc && (
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
            {desc}
          </div>
        )}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

const PROVIDER_SPREAD = [
  { label: "AWS", value: 24 },
  { label: "Azure", value: 17 },
  { label: "GCP", value: 11 },
  { label: "Kubernetes", value: 9 },
  { label: "On-Prem", value: 3 },
];

const OWNERSHIP_SPLIT = [
  { label: "Owned", value: 286, color: "#91cc75" },
  { label: "Under Review", value: 22, color: "#e09a2d" },
  { label: "Pending Transfer", value: 9, color: "#5470c6" },
  { label: "Orphaned", value: 6, color: "#e05555" },
];

export function BoundariesOverviewView() {
  return (
    <>
      <StatStripPlain
        items={[
          { label: "Cloud Accounts", value: 52 },
          { label: "Kubernetes Clusters", value: 9 },
          { label: "Allowed Resource Types", value: 48 },
          { label: "Shared Resources", value: 34 },
          { label: "Orphaned Resources", value: 6, tone: "danger" },
          { label: "Guardrail Violations", value: 20, tone: "warn" },
          { label: "Compliance Coverage", value: "89%", tone: "ok" },
        ]}
      />

      <ChartCard
        title="Cloud accounts & clusters by provider"
        desc="Tenancy boundaries across the enterprise estate."
      >
        <OverviewBar
          items={PROVIDER_SPREAD.map((d) => ({
            ...d,
            color: d.value >= 20 ? "#5470c6" : "#91cc75",
          }))}
        />
      </ChartCard>

      <ChartCard
        title="Resources by ownership status"
        desc="Accountability coverage — orphaned resources need an owner."
      >
        <OverviewBar items={OWNERSHIP_SPLIT} />
      </ChartCard>
    </>
  );
}

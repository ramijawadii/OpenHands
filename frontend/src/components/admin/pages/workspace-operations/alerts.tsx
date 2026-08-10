/* eslint-disable i18next/no-literal-string -- CloudGuard Workspace Operations → Alerts */
import React from "react";
import {
  LayoutGrid,
  Rocket,
  Gauge,
  ShieldAlert,
  Repeat,
  Stamp,
  BellRing,
  Check,
  BellOff,
  ArrowUpRight,
  RefreshCcw,
  Download,
} from "lucide-react";
import { T } from "#/components/admin/admin-kit";
import { StatStripPlain } from "#/components/admin/settings-kit";
import { OverviewBar } from "#/components/features/explore/cloudguard-grid/OverviewBar";
import {
  OpsLeaf,
  WORKSPACES,
  BUSINESS_UNITS,
  OWNERS,
  type Leaf,
  type OpsLeafConfig,
} from "#/components/admin/pages/workspace-operations/ops-leaf";

/**
 * Alerts — the operational signal layer of Workspace Operations: the single
 * worklist of in-flight conditions that need attention now, drawn from the five
 * sources (provisioning · capacity · governance · lifecycle · approval). Triage,
 * acknowledge, suppress, resolve — every transition audited. Authoritative spec:
 * docs/workspace/workspace_module/…/Workspace Operations/Alerts/alerts.md.
 */

const SEVERITY = ["Critical", "High", "Medium", "Low", "Info"];
const ALERT_STATUS = [
  "Open",
  "Open",
  "Acknowledged",
  "In Progress",
  "Suppressed",
];
const SLA = ["Within SLA", "Within SLA", "Approaching", "Breached"];
const CHANNELS = ["Email", "Slack", "Teams", "PagerDuty", "Webhook"];

// ── Overview — triage landing (charts side-by-side, no table) ─────────────────────────────────────
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

const BY_SEVERITY = [
  { label: "Critical", value: 6, color: "#e05555" },
  { label: "High", value: 14, color: "#e09a2d" },
  { label: "Medium", value: 23, color: "#5470c6" },
  { label: "Low", value: 31, color: "#91cc75" },
  { label: "Info", value: 18, color: "#9aa4b2" },
];
const BY_SOURCE = [
  { label: "Provisioning", value: 19 },
  { label: "Capacity", value: 22 },
  { label: "Governance", value: 17 },
  { label: "Lifecycle", value: 20 },
  { label: "Approval", value: 14 },
];

function AlertsOverviewView() {
  return (
    <>
      <StatStripPlain
        items={[
          { label: "Open Alerts", value: 92, tone: "warn" },
          { label: "Critical", value: 6, tone: "danger" },
          { label: "SLA Breached", value: 8, tone: "danger" },
          { label: "Acknowledged", value: 27 },
          { label: "Mean Time-to-Ack", value: "14m" },
          { label: "Suppressed", value: 11, tone: "muted" },
          { label: "Auto-Resolved", value: "63%", tone: "ok" },
        ]}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 16,
        }}
      >
        <ChartCard
          title="Open alerts by severity"
          desc="Triage priority — Critical and High first."
        >
          <OverviewBar items={BY_SEVERITY} />
        </ChartCard>
        <ChartCard
          title="Open alerts by source"
          desc="Where the signal originates across the estate."
        >
          <OverviewBar
            items={BY_SOURCE.map((d) => ({
              ...d,
              color: d.value >= 20 ? "#5470c6" : "#91cc75",
            }))}
          />
        </ChartCard>
      </div>
    </>
  );
}

// ── Source leaves — one operational surface per alert source ──────────────────────────────────────
function sourceAlertConfig(opts: {
  entity: string;
  title: string;
  desc: string;
  icon: OpsLeafConfig["icon"];
  idPrefix: string;
  alertPool: string[];
  extraStat?: OpsLeafConfig["stats"][number];
}): OpsLeafConfig {
  const cfg: OpsLeafConfig = {
    entity: opts.entity,
    title: opts.title,
    desc: opts.desc,
    icon: opts.icon,
    idPrefix: opts.idPrefix,
    count: 18,
    initialSortKey: "age",
    fields: [
      {
        key: "alert",
        header: "Alert",
        kind: "primary",
        pool: opts.alertPool,
        searchable: true,
      },
      {
        key: "severity",
        header: "Severity",
        kind: "sev",
        pool: SEVERITY,
        filter: true,
      },
      {
        key: "workspace",
        header: "Workspace",
        kind: "text",
        pool: [...WORKSPACES, "Organization"],
        filter: true,
        searchable: true,
      },
      {
        key: "businessUnit",
        header: "Business Unit",
        kind: "text",
        pool: BUSINESS_UNITS,
        filter: true,
      },
      {
        key: "assignee",
        header: "Assignee",
        kind: "text",
        pool: [...OWNERS, "On-Call"],
        filter: true,
        searchable: true,
      },
      {
        key: "slaState",
        header: "SLA",
        kind: "status",
        pool: SLA,
        filter: true,
      },
      {
        key: "channel",
        header: "Routed To",
        kind: "text",
        pool: CHANNELS,
        filter: true,
      },
      { key: "age", header: "Age (h)", kind: "num", min: 0, max: 48 },
      {
        key: "status",
        header: "Status",
        kind: "status",
        pool: ALERT_STATUS,
        filter: true,
      },
    ],
    stats: [
      { label: "Open", kind: "count", tone: "warn" },
      {
        label: "Critical",
        kind: "where",
        field: "severity",
        eq: ["Critical"],
        tone: "danger",
      },
      {
        label: "SLA Breached",
        kind: "where",
        field: "slaState",
        eq: ["Breached"],
        tone: "danger",
      },
      {
        label: "Acknowledged",
        kind: "where",
        field: "status",
        eq: ["Acknowledged"],
        tone: "ok",
      },
      {
        label: "Suppressed",
        kind: "where",
        field: "status",
        eq: ["Suppressed"],
        tone: "neutral",
      },
      ...(opts.extraStat ? [opts.extraStat] : []),
    ],
    toolbar: [
      { label: "Acknowledge", icon: <Check size={15} />, primary: true },
      { label: "Suppress", icon: <BellOff size={15} /> },
      { label: "Escalate", icon: <ArrowUpRight size={15} /> },
      { label: "Resolve", icon: <Check size={15} /> },
      { label: "Refresh", icon: <RefreshCcw size={15} /> },
      { label: "Export", icon: <Download size={15} /> },
    ],
    rowMenu: ["View", "Acknowledge", "Assign", "Suppress", "Resolve"],
    bulk: [
      { label: "Acknowledge", icon: <Check size={13} /> },
      { label: "Suppress", icon: <BellOff size={13} /> },
      { label: "Resolve", icon: <Check size={13} /> },
    ],
  };
  return cfg;
}

const PROVISIONING = sourceAlertConfig({
  entity: "provisioning alert",
  title: "Provisioning alerts",
  desc: "Failed, stuck or rolled-back provisioning — the conditions blocking workspaces and resources from coming up cleanly.",
  icon: Rocket,
  idPrefix: "PA",
  alertPool: [
    "Provisioning failed",
    "Job stuck",
    "Rollback required",
    "Guardrail blocked",
    "Template error",
    "Timeout",
    "Dependency missing",
  ],
});

const CAPACITY = sourceAlertConfig({
  entity: "capacity alert",
  title: "Capacity alerts",
  desc: "Quota and utilization pressure — workspaces approaching ceilings, spikes and cost thresholds before they bite.",
  icon: Gauge,
  idPrefix: "CA",
  alertPool: [
    "Quota near ceiling",
    "Utilization spike",
    "Cost threshold exceeded",
    "Storage full",
    "Reservation expiring",
    "Limit reached",
  ],
  extraStat: {
    label: "Near Ceiling",
    kind: "where",
    field: "severity",
    eq: ["High", "Critical"],
    tone: "warn",
  },
});

const GOVERNANCE = sourceAlertConfig({
  entity: "governance alert",
  title: "Governance alerts",
  desc: "Policy violations, configuration drift and compliance regressions detected across the estate.",
  icon: ShieldAlert,
  idPrefix: "GA",
  alertPool: [
    "Policy violation",
    "Configuration drift",
    "Compliance regression",
    "Unapproved change",
    "Tag missing",
    "Encryption disabled",
  ],
});

const LIFECYCLE = sourceAlertConfig({
  entity: "lifecycle alert",
  title: "Lifecycle alerts",
  desc: "Time-bound lifecycle conditions — expiring sandboxes, overdue reviews and decommission deadlines.",
  icon: Repeat,
  idPrefix: "LA",
  alertPool: [
    "Sandbox expiring",
    "Review overdue",
    "Decommission due",
    "Owner departed",
    "Idle workspace",
    "Certificate expiring",
  ],
});

const APPROVAL = sourceAlertConfig({
  entity: "approval alert",
  title: "Approval alerts",
  desc: "Approvals past SLA, escalations and stale requests — the decisions holding operations up.",
  icon: Stamp,
  idPrefix: "AA",
  alertPool: [
    "Approval past SLA",
    "Escalation triggered",
    "Stale request",
    "No approver assigned",
    "Delegation expired",
  ],
});

export const ALERTS_LEAVES: Leaf[] = [
  {
    id: "overview",
    label: "Overview",
    Icon: LayoutGrid,
    render: () => <AlertsOverviewView />,
  },
  {
    id: "provisioning-alerts",
    label: "Provisioning Alerts",
    Icon: Rocket,
    render: () => <OpsLeaf cfg={PROVISIONING} />,
  },
  {
    id: "capacity-alerts",
    label: "Capacity Alerts",
    Icon: Gauge,
    render: () => <OpsLeaf cfg={CAPACITY} />,
  },
  {
    id: "governance-alerts",
    label: "Governance Alerts",
    Icon: ShieldAlert,
    render: () => <OpsLeaf cfg={GOVERNANCE} />,
  },
  {
    id: "lifecycle-alerts",
    label: "Lifecycle Alerts",
    Icon: Repeat,
    render: () => <OpsLeaf cfg={LIFECYCLE} />,
  },
  {
    id: "approval-alerts",
    label: "Approval Alerts",
    Icon: Stamp,
    render: () => <OpsLeaf cfg={APPROVAL} />,
  },
];

// re-export for shell icon usage
export { BellRing };

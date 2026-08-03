/* eslint-disable i18next/no-literal-string -- grid column definitions */
import React from "react";
import type {
  ColDef,
  ColGroupDef,
  ValueFormatterParams,
} from "ag-grid-community";
import { SetFilter } from "./SetFilter";
import { TreeCell, type TreeCellParams } from "./TreeCell";
import { Sparkline } from "./Sparkline";
import type { ResourceRow } from "./data";
import {
  AnomalyBadge,
  BoolBadge,
  DataClassBadge,
  DriftBadge,
  EncryptionBadge,
  InternetBadge,
  ManagedByBadge,
  StalenessBadge,
  StateBadge,
  TierBadge,
  ValueWithIcon,
} from "./icons";
import { SeverityGauge } from "./SeverityGauge";
import { safeFormatter, withSafeCell } from "./safe-cell";

/**
 * Column definitions — the 8 groups and 24 sub-groups from
 * `docs/architecture/cmdb-plan/10-field-tree.md`.
 *
 * AG Grid renders one banded header row per group, so the **sub-group** level
 * lives in `columnGroupShow` ordering and in the Columns tool panel rather than
 * as a second band. Sub-group boundaries are marked by comments below and are
 * what saved views select on.
 *
 * `hide: true` is the default-view mechanism: 15 columns visible, the rest
 * reachable through the Columns panel. See `09-column-specification.md`.
 */

const dateFmt = (p: ValueFormatterParams) =>
  p.value instanceof Date ? p.value.toLocaleDateString() : "—";

const relDays = (p: ValueFormatterParams) => {
  if (!(p.value instanceof Date)) return "—";
  const d = Math.floor((Date.now() - p.value.getTime()) / 86400000);
  if (d < 1) return "today";
  if (d === 1) return "1d ago";
  return `${d}d ago`;
};

const num = (p: ValueFormatterParams) =>
  typeof p.value === "number" ? p.value.toLocaleString() : "—";

const pct = (p: ValueFormatterParams) =>
  typeof p.value === "number" ? `${p.value}%` : "—";

function SeverityCell({ value }: { value: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        color: "var(--cg-text-primary)",
      }}
    >
      <SeverityGauge severity={value} size={22} />
      {value}
    </span>
  );
}

function RiskCell({ value }: { value: number }) {
  const p = Math.max(0, Math.min(100, value));
  const hue = 120 - (p / 100) * 120;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 38,
          height: 4,
          borderRadius: 3,
          background: "var(--cg-border)",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "block",
            width: `${p}%`,
            height: "100%",
            background: `hsl(${hue} 70% 50%)`,
          }}
        />
      </span>
      {value}
    </span>
  );
}

function TagsCell({ value }: { value: string[] }) {
  if (!Array.isArray(value) || value.length === 0)
    return <span style={{ opacity: 0.4 }}>—</span>;
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {value.map((t) => (
        <span
          key={t}
          style={{
            fontSize: 10,
            padding: "0 5px",
            borderRadius: 8,
            border: "1px solid var(--cg-border)",
            color: "var(--cg-text-muted)",
            lineHeight: "16px",
          }}
        >
          {t}
        </span>
      ))}
    </span>
  );
}

/** Low-cardinality fields get the checkbox set filter. */
const SET_FILTER_FIELDS = new Set([
  "kind",
  "serviceType",
  "providerService",
  "state",
  "managedBy",
  "driftState",
  "provider",
  "region",
  "country",
  "account",
  "environment",
  "availabilityZone",
  "owner",
  "businessOwner",
  "onCall",
  "application",
  "businessUnit",
  "criticalityTier",
  "dataClassification",
  "severity",
  "exposure",
  "compliance",
  "auditScope",
  "encryptionAtRest",
  "health",
  "staleness",
  "discoverySource",
]);

/**
 * Sub-group membership — the middle tier of the field tree
 * (`docs/architecture/cmdb-plan/10-field-tree.md`).
 *
 * AG Grid renders only one banded header row, so the sub-group cannot be a
 * second header band. It is carried on the colDef instead and rendered as the
 * middle level of the Columns and Filters panels, which is where the hierarchy
 * is actually navigated.
 */
export const SUB_GROUP: Record<string, string> = {
  // Resource
  resource: "Identity",
  urn: "Identity",
  nativeId: "Identity",
  kind: "Classification",
  serviceType: "Classification",
  providerService: "Classification",
  state: "Lifecycle",
  createdAt: "Lifecycle",
  ageDays: "Lifecycle",
  deletionProtection: "Lifecycle",
  managedBy: "Provenance",
  driftState: "Provenance",
  iacRepo: "Provenance",
  // Placement
  provider: "Cloud",
  account: "Cloud",
  environment: "Cloud",
  region: "Geography",
  country: "Geography",
  availabilityZone: "Geography",
  vpcId: "Network",
  subnetId: "Network",
  publicIp: "Network",
  dnsName: "Network",
  // Ownership
  application: "Business",
  businessUnit: "Business",
  costCenter: "Business",
  owner: "People",
  businessOwner: "People",
  onCall: "People",
  criticalityTier: "Classification",
  dataClassification: "Classification",
  tags: "Classification",
  // Risk
  severity: "Summary",
  riskScore: "Summary",
  trend: "Summary",
  internetReachable: "Exposure",
  exposure: "Exposure",
  iamPrincipals: "Exposure",
  cveCritical: "Vulnerabilities",
  cveHigh: "Vulnerabilities",
  cveMedium: "Vulnerabilities",
  cveLow: "Vulnerabilities",
  kev: "Vulnerabilities",
  exploitAvailable: "Vulnerabilities",
  secretsExposed: "Vulnerabilities",
  blastRadius: "Graph",
  attackPaths: "Graph",
  // Compliance
  compliance: "Status",
  controlsFailed: "Status",
  controlsPassed: "Status",
  waiverExpiry: "Exceptions",
  auditScope: "Exceptions",
  lastScan: "Evidence",
  // Resilience
  encryptionAtRest: "Encryption",
  encryptionInTransit: "Encryption",
  backupEnabled: "Backup",
  lastBackup: "Backup",
  restoreTested: "Backup",
  multiAz: "Availability",
  // Operations
  health: "Health",
  uptime30d: "Health",
  incidents30d: "Health",
  mttrMinutes: "Health",
  monitoring: "Coverage",
  logForwarding: "Coverage",
  agentInstalled: "Coverage",
  // Discovery
  staleness: "Freshness",
  lastVerified: "Freshness",
  confidence: "Freshness",
  discoverySource: "Anomalies",
  isShadow: "Anomalies",
  isOrphaned: "Anomalies",
  firstSeen: "Anomalies",
};

const icon = (field: string) => ({
  cellRenderer: ({ value }: { value: string }) => (
    <ValueWithIcon field={field} value={value} />
  ),
});

export function buildColumns(
  treeParams: TreeCellParams,
): ColGroupDef<ResourceRow>[] {
  const groups: ColGroupDef<ResourceRow>[] = [
    {
      headerName: "Resource",
      children: [
        /* Identity */
        {
          field: "resource",
          headerName: "Name",
          width: 300,
          pinned: "left",
          filter: "agTextColumnFilter",
          cellRenderer: TreeCell,
          cellRendererParams: treeParams,
          // Sorting reorders rows out of depth-first sequence and shatters the
          // hierarchy, so the tree column is never sortable.
          sortable: false,
        },
        { field: "urn", headerName: "URN", width: 320, hide: true },
        { field: "nativeId", headerName: "Native ID", width: 340, hide: true },
        /* Lifecycle */
        {
          field: "state",
          headerName: "State",
          width: 130,
          pinned: "left",
          cellRenderer: ({ value }: { value: string }) => (
            <StateBadge value={value} />
          ),
        },
        /* Classification */
        { field: "kind", headerName: "Type", width: 140, ...icon("kind") },
        {
          field: "serviceType",
          headerName: "Service",
          width: 140,
          ...icon("serviceType"),
        },
        {
          field: "providerService",
          headerName: "Provider service",
          width: 145,
          hide: true,
        },
        {
          field: "createdAt",
          headerName: "Created",
          width: 120,
          hide: true,
          filter: "agDateColumnFilter",
          valueFormatter: dateFmt,
        },
        {
          field: "ageDays",
          headerName: "Age (d)",
          width: 105,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
        },
        {
          field: "deletionProtection",
          headerName: "Del. protection",
          width: 140,
          hide: true,
          cellRenderer: ({ value }: { value: boolean }) => (
            <BoolBadge value={value} />
          ),
        },
        /* Provenance */
        {
          field: "managedBy",
          headerName: "Managed by",
          width: 165,
          hide: true,
          cellRenderer: ({ value }: { value: string }) => (
            <ManagedByBadge value={value} />
          ),
        },
        {
          field: "driftState",
          headerName: "Drift",
          width: 150,
          hide: true,
          cellRenderer: ({ value }: { value: string }) => (
            <DriftBadge value={value} />
          ),
        },
        { field: "iacRepo", headerName: "IaC repo", width: 140, hide: true },
      ],
    },
    {
      headerName: "Placement",
      children: [
        /* Cloud */
        {
          field: "provider",
          headerName: "Provider",
          width: 130,
          ...icon("provider"),
        },
        { field: "account", headerName: "Account", width: 130 },
        {
          field: "environment",
          headerName: "Env",
          width: 110,
          ...icon("environment"),
        },
        /* Geography */
        { field: "region", headerName: "Region", width: 135, hide: true },
        {
          field: "country",
          headerName: "Country",
          width: 140,
          hide: true,
          ...icon("country"),
        },
        {
          field: "availabilityZone",
          headerName: "AZ",
          width: 125,
          hide: true,
        },
        /* Network */
        { field: "vpcId", headerName: "VPC", width: 130, hide: true },
        { field: "subnetId", headerName: "Subnet", width: 140, hide: true },
        { field: "publicIp", headerName: "Public IP", width: 140, hide: true },
        { field: "dnsName", headerName: "DNS", width: 190, hide: true },
      ],
    },
    {
      headerName: "Ownership",
      children: [
        /* Business */
        { field: "application", headerName: "Application", width: 150 },
        {
          field: "businessUnit",
          headerName: "Business unit",
          width: 140,
          hide: true,
        },
        {
          field: "costCenter",
          headerName: "Cost centre",
          width: 130,
          hide: true,
        },
        /* People */
        { field: "owner", headerName: "Owner", width: 130 },
        {
          field: "businessOwner",
          headerName: "Business owner",
          width: 165,
          hide: true,
        },
        { field: "onCall", headerName: "On-call", width: 140, hide: true },
        /* Classification */
        {
          field: "criticalityTier",
          headerName: "Criticality",
          width: 125,
          cellRenderer: ({ value }: { value: string }) => (
            <TierBadge value={value} />
          ),
        },
        {
          field: "dataClassification",
          headerName: "Data class",
          width: 155,
          hide: true,
          cellRenderer: ({ value }: { value: string }) => (
            <DataClassBadge value={value} />
          ),
        },
        {
          field: "tags",
          headerName: "Tags",
          width: 220,
          hide: true,
          sortable: false,
          filter: false,
          cellRenderer: ({ value }: { value: string[] }) => (
            <TagsCell value={value} />
          ),
        },
      ],
    },
    {
      headerName: "Risk",
      children: [
        /* Summary */
        {
          field: "severity",
          headerName: "Severity",
          width: 140,
          cellRenderer: ({ value }: { value: string }) => (
            <SeverityCell value={value} />
          ),
        },
        {
          field: "riskScore",
          headerName: "Risk",
          width: 115,
          filter: "agNumberColumnFilter",
          cellRenderer: ({ value }: { value: number }) => (
            <RiskCell value={value} />
          ),
        },
        {
          field: "trend",
          headerName: "30d",
          width: 110,
          hide: true,
          sortable: false,
          filter: false,
          cellRenderer: Sparkline,
        },
        /* Exposure */
        {
          field: "internetReachable",
          headerName: "Internet",
          width: 140,
          cellRenderer: ({ value }: { value: boolean }) => (
            <InternetBadge value={value} />
          ),
        },
        {
          field: "exposure",
          headerName: "Exposure",
          width: 135,
          hide: true,
          ...icon("exposure"),
        },
        {
          field: "iamPrincipals",
          headerName: "IAM principals",
          width: 145,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
        },
        /* Vulnerabilities */
        {
          field: "cveCritical",
          headerName: "CVE crit",
          width: 115,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
          valueFormatter: num,
        },
        {
          field: "cveHigh",
          headerName: "CVE high",
          width: 115,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
          valueFormatter: num,
        },
        {
          field: "cveMedium",
          headerName: "CVE med",
          width: 115,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
          valueFormatter: num,
        },
        {
          field: "cveLow",
          headerName: "CVE low",
          width: 115,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
          valueFormatter: num,
        },
        {
          field: "kev",
          headerName: "KEV",
          width: 95,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
        },
        {
          field: "exploitAvailable",
          headerName: "Exploit",
          width: 120,
          hide: true,
          cellRenderer: ({ value }: { value: boolean }) => (
            <BoolBadge value={value} goodWhenTrue={false} />
          ),
        },
        {
          field: "secretsExposed",
          headerName: "Secrets",
          width: 115,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
        },
        /* Graph */
        {
          field: "blastRadius",
          headerName: "Blast radius",
          width: 140,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
        },
        {
          field: "attackPaths",
          headerName: "Attack paths",
          width: 140,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
        },
      ],
    },
    {
      headerName: "Compliance",
      children: [
        /* Status */
        {
          field: "compliance",
          headerName: "Compliance",
          width: 165,
          ...icon("compliance"),
        },
        {
          field: "controlsFailed",
          headerName: "Failed",
          width: 110,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
        },
        {
          field: "controlsPassed",
          headerName: "Passed",
          width: 110,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
        },
        /* Exceptions */
        {
          field: "waiverExpiry",
          headerName: "Waiver expiry",
          width: 145,
          hide: true,
          filter: "agDateColumnFilter",
          valueFormatter: dateFmt,
        },
        {
          field: "auditScope",
          headerName: "Audit scope",
          width: 135,
          hide: true,
        },
        /* Evidence */
        {
          field: "lastScan",
          headerName: "Last scan",
          width: 130,
          hide: true,
          filter: "agDateColumnFilter",
          valueFormatter: relDays,
        },
      ],
    },
    {
      headerName: "Resilience",
      children: [
        {
          field: "encryptionAtRest",
          headerName: "Encryption",
          width: 165,
          hide: true,
          cellRenderer: ({ value }: { value: string }) => (
            <EncryptionBadge value={value} />
          ),
        },
        {
          field: "encryptionInTransit",
          headerName: "In transit",
          width: 125,
          hide: true,
          cellRenderer: ({ value }: { value: boolean }) => (
            <BoolBadge value={value} />
          ),
        },
        {
          field: "backupEnabled",
          headerName: "Backup",
          width: 120,
          hide: true,
          cellRenderer: ({ value }: { value: boolean }) => (
            <BoolBadge value={value} />
          ),
        },
        {
          field: "lastBackup",
          headerName: "Last backup",
          width: 140,
          hide: true,
          filter: "agDateColumnFilter",
          valueFormatter: relDays,
        },
        {
          field: "restoreTested",
          headerName: "Restore tested",
          width: 150,
          hide: true,
          filter: "agDateColumnFilter",
          valueFormatter: relDays,
        },
        {
          field: "multiAz",
          headerName: "Multi-AZ",
          width: 120,
          hide: true,
          cellRenderer: ({ value }: { value: boolean }) => (
            <BoolBadge value={value} />
          ),
        },
      ],
    },
    {
      headerName: "Operations",
      children: [
        {
          field: "health",
          headerName: "Health",
          width: 135,
          hide: true,
          ...icon("health"),
        },
        {
          field: "uptime30d",
          headerName: "Uptime",
          width: 115,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
          valueFormatter: pct,
        },
        {
          field: "incidents30d",
          headerName: "Incidents",
          width: 120,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
        },
        {
          field: "mttrMinutes",
          headerName: "MTTR (m)",
          width: 120,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
        },
        {
          field: "monitoring",
          headerName: "Monitoring",
          width: 130,
          hide: true,
          cellRenderer: ({ value }: { value: boolean }) => (
            <BoolBadge value={value} />
          ),
        },
        {
          field: "logForwarding",
          headerName: "Log fwd",
          width: 120,
          hide: true,
          cellRenderer: ({ value }: { value: boolean }) => (
            <BoolBadge value={value} />
          ),
        },
        {
          field: "agentInstalled",
          headerName: "Agent",
          width: 115,
          hide: true,
          cellRenderer: ({ value }: { value: boolean }) => (
            <BoolBadge value={value} />
          ),
        },
      ],
    },
    {
      headerName: "Discovery",
      children: [
        /* Freshness */
        {
          field: "staleness",
          headerName: "Freshness",
          width: 145,
          cellRenderer: ({ value }: { value: string }) => (
            <StalenessBadge value={value} />
          ),
        },
        {
          field: "lastVerified",
          headerName: "Last verified",
          width: 145,
          hide: true,
          filter: "agDateColumnFilter",
          valueFormatter: relDays,
        },
        {
          field: "confidence",
          headerName: "Confidence",
          width: 130,
          hide: true,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
        },
        /* Anomalies */
        {
          field: "discoverySource",
          headerName: "Source",
          width: 135,
          hide: true,
        },
        {
          field: "isShadow",
          headerName: "Shadow",
          width: 135,
          hide: true,
          cellRenderer: ({ value }: { value: boolean }) => (
            <AnomalyBadge value={value} kind="shadow" />
          ),
        },
        {
          field: "isOrphaned",
          headerName: "Orphaned",
          width: 140,
          hide: true,
          cellRenderer: ({ value }: { value: boolean }) => (
            <AnomalyBadge value={value} kind="orphaned" />
          ),
        },
        {
          field: "firstSeen",
          headerName: "First seen",
          width: 135,
          hide: true,
          filter: "agDateColumnFilter",
          valueFormatter: dateFmt,
        },
      ],
    },
  ];

  return groups.map((g, gi) => ({
    ...g,
    headerClass: "cg-grp",
    children: (g.children as ColDef<ResourceRow>[]).map((c, ci) => {
      const col = SET_FILTER_FIELDS.has(c.field as string)
        ? { ...c, filter: SetFilter }
        : { ...c };

      col.context = {
        ...(col.context ?? {}),
        subGroup: SUB_GROUP[col.field as string] ?? "Other",
      };

      // Display hardening: a throw inside a cell renderer unmounts the whole
      // grid unless it is boundaried. See safe-cell.tsx.
      if (col.cellRenderer) {
        col.cellRenderer = withSafeCell(
          String(col.field ?? "cell"),
          col.cellRenderer as React.ComponentType<object>,
        );
      } else if (!col.valueFormatter) {
        col.valueFormatter = safeFormatter;
      }
      // Separator on the first child of every group after the first, so the
      // boundary between draggable groups is visible.
      if (ci === 0 && gi > 0) {
        col.headerClass = "cg-grp-start";
        col.cellClass = "cg-grp-start";
      }
      return col;
    }),
  }));
}

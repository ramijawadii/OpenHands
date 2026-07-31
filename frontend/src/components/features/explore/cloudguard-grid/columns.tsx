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
import { SEVERITY_COLOR } from "./theme";
import type { ResourceRow } from "./data";
import { ValueWithIcon } from "./icons";

const currency = (p: ValueFormatterParams) =>
  p.value == null ? "" : `$${Number(p.value).toLocaleString()}`;

const dateFmt = (p: ValueFormatterParams) =>
  p.value instanceof Date ? p.value.toLocaleDateString() : "";

function SeverityCell({ value }: { value: string }) {
  return (
    <span
      style={{ color: SEVERITY_COLOR[value] ?? "inherit", fontWeight: 600 }}
    >
      {value}
    </span>
  );
}

function BoolCell({ value }: { value: boolean }) {
  return (
    <span style={{ color: value ? "var(--cgx-low)" : "var(--cgx-critical)" }}>
      {value ? "Yes" : "No"}
    </span>
  );
}

function RiskCell({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const hue = 120 - (pct / 100) * 120;
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
            width: `${pct}%`,
            height: "100%",
            background: `hsl(${hue} 70% 50%)`,
          }}
        />
      </span>
      {value}
    </span>
  );
}

/** Columns that get the checkbox set filter rather than a text filter. */
const SET_FILTER_FIELDS = new Set([
  "kind",
  "serviceType",
  "country",
  "provider",
  "region",
  "account",
  "environment",
  "owner",
  "severity",
  "exposure",
]);

/**
 * Column groups — the banded header categories in the reference layout.
 *
 * `ColGroupDef` is **Community**; only the row-group *panel* ("drag here to
 * set row groups") is Enterprise. So the grouped header itself costs nothing.
 */
export function buildColumns(
  treeParams: TreeCellParams,
): ColGroupDef<ResourceRow>[] {
  const groups: ColGroupDef<ResourceRow>[] = [
    {
      headerName: "Resource",
      children: [
        {
          field: "resource",
          headerName: "Name",
          width: 300,
          pinned: "left",
          filter: "agTextColumnFilter",
          cellRenderer: TreeCell,
          cellRendererParams: treeParams,
          // Sorting would reorder rows out of their depth-first sequence and
          // break the visual hierarchy, so the tree column is not sortable.
          sortable: false,
        },
        {
          field: "kind",
          headerName: "Type",
          width: 140,
          cellRenderer: ({ value }: { value: string }) => (
            <ValueWithIcon field="kind" value={value} />
          ),
        },
        {
          field: "serviceType",
          headerName: "Service",
          width: 135,
          cellRenderer: ({ value }: { value: string }) => (
            <ValueWithIcon field="serviceType" value={value} />
          ),
        },
        {
          field: "exposure",
          headerName: "Exposure",
          width: 125,
          cellRenderer: ({ value }: { value: string }) => (
            <ValueWithIcon field="exposure" value={value} />
          ),
        },
      ],
    },
    {
      headerName: "Placement",
      children: [
        {
          field: "provider",
          headerName: "Provider",
          width: 130,
          cellRenderer: ({ value }: { value: string }) => (
            <ValueWithIcon field="provider" value={value} />
          ),
        },
        { field: "region", headerName: "Region", width: 130 },
        {
          field: "country",
          headerName: "Country",
          width: 135,
          cellRenderer: ({ value }: { value: string }) => (
            <ValueWithIcon field="country" value={value} />
          ),
        },
        { field: "account", headerName: "Account", width: 120 },
        { field: "environment", headerName: "Env", width: 95 },
        { field: "owner", headerName: "Owner", width: 110 },
      ],
    },
    {
      headerName: "Risk",
      children: [
        {
          field: "severity",
          headerName: "Severity",
          width: 110,
          cellRenderer: SeverityCell,
        },
        {
          field: "riskScore",
          headerName: "Score",
          width: 115,
          filter: "agNumberColumnFilter",
          cellRenderer: RiskCell,
        },
        {
          field: "findings",
          headerName: "Findings",
          width: 105,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
        },
        {
          field: "trend",
          headerName: "30d",
          width: 110,
          sortable: false,
          filter: false,
          cellRenderer: Sparkline,
        },
      ],
    },
    {
      headerName: "Governance",
      children: [
        {
          field: "monthlyCost",
          headerName: "Monthly cost",
          width: 135,
          filter: "agNumberColumnFilter",
          type: "numericColumn",
          valueFormatter: currency,
        },
        {
          field: "compliant",
          headerName: "Compliant",
          width: 115,
          cellRenderer: BoolCell,
          filter: "agTextColumnFilter",
        },
        {
          field: "lastSeen",
          headerName: "Last seen",
          width: 125,
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
      const withFilter = SET_FILTER_FIELDS.has(c.field as string)
        ? { ...c, filter: SetFilter }
        : { ...c };
      // Separator on the first child of every group except the first, so the
      // boundary between draggable groups is visible.
      if (ci === 0 && gi > 0) {
        withFilter.headerClass = "cg-grp-start";
        withFilter.cellClass = "cg-grp-start";
      }
      return withFilter;
    }),
  }));
}

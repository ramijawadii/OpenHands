/* eslint-disable i18next/no-literal-string -- remediation scope */
import React from "react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useTheme } from "#/context/theme-context";
import {
  APP_FONT,
  eventsThemeFor,
} from "#/components/features/explore/cloudguard-grid/theme";
import { CountryFlag } from "#/components/features/explore/cloudguard-grid/flags";
import {
  EnvBadge,
  ProviderBadge,
  ResourceIcon,
} from "#/components/features/explore/cloudguard-grid/icons";
import { REGION_COUNTRY } from "#/components/features/explore/cloudguard-grid/data";
import { type RemediationAction } from "./remediation-data";
import { buildAssets, type LinkedAsset } from "./remediation-detail-data";

/**
 * The assets inside a remediation's scope.
 *
 * Reached from the Overview's Scope row and returning there — a drill-down, not
 * a rail destination, because scope is a property of the summary rather than a
 * facet of the record.
 *
 * Built on the SAME AG Grid setup and `eventsThemeFor` as the events and
 * actions tables. The hand-rolled HTML table this replaces looked close but
 * behaved differently — no sort, no keyboard model, its own row rhythm — and
 * three tables on one surface that each work slightly differently is worse than
 * one that works the same way everywhere.
 */

ModuleRegistry.registerModules([AllCommunityModule]);

/** Consumed by `explore-view`, which owns the inventory route. */
export const CG_OPEN_INVENTORY = "cg:open-inventory";

export interface OpenInventoryDetail {
  resource: string;
}

export function openInventory(resource: string) {
  window.dispatchEvent(
    new CustomEvent<OpenInventoryDetail>(CG_OPEN_INVENTORY, {
      detail: { resource },
    }),
  );
}

function AssetCell({ data }: { data?: LinkedAsset }) {
  if (!data) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <ResourceIcon kind={data.kind} size={12} />
      {data.name}
    </span>
  );
}

/**
 * Hands off rather than duplicating. The inventory grid already answers every
 * question about an asset; rebuilding a slice of it here would create a second
 * answer that can disagree with the first.
 */
function OpenCell({ data }: { data?: LinkedAsset }) {
  if (!data) return null;
  return (
    <button
      type="button"
      className="cg-report-action"
      title={`Open ${data.name} in Inventory`}
      onClick={() => openInventory(data.name)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 20,
        padding: "0 7px",
        fontSize: 11,
        fontFamily: APP_FONT,
        cursor: "pointer",
      }}
    >
      Inventory <ExternalLink size={10} />
    </button>
  );
}

export function ScopeAssetsView({
  action,
  onBack,
}: {
  action: RemediationAction;
  onBack: () => void;
}) {
  const { theme } = useTheme();
  const assets = React.useMemo(() => buildAssets(action), [action]);
  const country = REGION_COUNTRY[action.region];

  const columnDefs = React.useMemo<ColDef<LinkedAsset>[]>(
    () => [
      {
        field: "name",
        headerName: "Asset",
        flex: 1,
        minWidth: 170,
        cellRenderer: AssetCell,
      },
      { field: "kind", headerName: "Kind", width: 130 },
      { field: "criticality", headerName: "Criticality", width: 110 },
      { field: "dataClass", headerName: "Data class", width: 124 },
      { field: "exposure", headerName: "Exposure", width: 136 },
      {
        colId: "open",
        headerName: "",
        width: 108,
        sortable: false,
        cellRenderer: OpenCell,
      },
    ],
    [],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <button
          type="button"
          className="cg-report-action"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 26,
            padding: "0 9px",
            fontSize: 12,
            fontFamily: APP_FONT,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={12} /> Overview
        </button>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Scope</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11.5,
            color: "var(--cg-text-muted)",
          }}
        >
          {assets.length} asset{assets.length === 1 ? "" : "s"}
          <ProviderBadge provider={action.provider} />
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <CountryFlag code={country} width={14} />
            {action.region}
          </span>
          <EnvBadge value={action.environment} />
        </span>
      </div>

      {/* Sized to content up to a ceiling: a fixed height leaves dead space for
          three assets and clips at thirty. */}
      <div style={{ height: Math.min(420, 40 + assets.length * 28) }}>
        <AgGridReact<LinkedAsset>
          theme={eventsThemeFor(theme)}
          rowData={assets}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          headerHeight={24}
          rowHeight={28}
          defaultColDef={{
            sortable: true,
            resizable: false,
            suppressMovable: true,
          }}
          enableCellTextSelection
        />
      </div>
    </div>
  );
}

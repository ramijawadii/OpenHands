/* eslint-disable i18next/no-literal-string -- grid tree cell */
import React from "react";
import { ChevronRight } from "lucide-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ResourceRow } from "./data";
import { ResourceIcon } from "./icons";

/**
 * Hierarchy cell — indent, expand/collapse chevron, and the row label.
 *
 * Our stand-in for the Enterprise `TreeDataModule` / `RowGroupingModule` group
 * cell. AG Grid Community has no tree row model, so the hierarchy lives in the
 * data (`level` / `parentId`) and visibility is decided by an external filter
 * on the grid. This renderer is only the presentation half.
 */

export interface TreeCellParams {
  expanded: Set<string>;
  onToggle: (id: string) => void;
}

export function TreeCell(props: CustomCellRendererProps<ResourceRow>) {
  const { data, value } = props;
  // cellRendererParams are merged into props by AG Grid.
  const { expanded, onToggle } = props as unknown as TreeCellParams;

  if (!data) return null;

  const isOpen = expanded.has(data.id);

  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        paddingLeft: data.level * 18,
      }}
    >
      {data.hasChildren ? (
        <button
          type="button"
          onClick={() => onToggle(data.id)}
          aria-label={
            isOpen ? `Collapse ${data.resource}` : `Expand ${data.resource}`
          }
          aria-expanded={isOpen}
          style={{
            width: 16,
            height: 16,
            lineHeight: "14px",
            padding: 0,
            background: "none",
            border: "none",
            color: "var(--cg-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: isOpen ? "rotate(90deg)" : "none",
            transition: "transform 120ms",
          }}
        >
          <ChevronRight size={13} strokeWidth={2.5} />
        </button>
      ) : (
        <span style={{ width: 16, flexShrink: 0 }} />
      )}
      <ResourceIcon kind={data.kind} />
      <span
        style={{
          fontWeight: data.hasChildren ? 600 : 400,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
      {data.hasChildren && (
        <span style={{ opacity: 0.5, fontSize: 11, flexShrink: 0 }}>
          ({data.kind === "Account" ? "account" : "cluster"})
        </span>
      )}
    </span>
  );
}

/* eslint-disable i18next/no-literal-string -- grid tree cell */
import React from "react";
import { ChevronRight } from "lucide-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ResourceRow } from "./data";
import { ResourceIcon } from "./icons";

/**
 * Hierarchy cell — indent guides, expand/collapse chevron, and the row label.
 *
 * Our stand-in for the Enterprise `TreeDataModule` / `RowGroupingModule` group
 * cell. AG Grid Community has no tree row model, so the hierarchy lives in the
 * data (`level` / `parentId`) and visibility is decided by an external filter
 * on the grid. This renderer is only the presentation half.
 *
 * ## Alignment
 *
 * Indentation alone reads poorly once rows scroll: at 18px a child looks
 * almost level with its parent, and there is nothing connecting them. Instead
 * every ancestor level renders a fixed-width **guide rail** with a vertical
 * rule, so depth is countable and a child is visibly tied to the parent above
 * it.
 *
 * Every row — branch or leaf — reserves the same chevron slot, so icons and
 * labels line up in a single column per depth instead of leaves sitting one
 * chevron-width to the left of their siblings.
 */

export interface TreeCellParams {
  expanded: Set<string>;
  onToggle: (id: string) => void;
}

/** Width of one depth step. Wide enough for the rule to read as a column. */
const INDENT = 22;
/** Chevron slot, reserved on every row so nothing shifts between levels. */
const CHEVRON = 18;

export function TreeCell(props: CustomCellRendererProps<ResourceRow>) {
  const { data, value } = props;
  // cellRendererParams are merged into props by AG Grid.
  const { expanded, onToggle } = props as unknown as TreeCellParams;

  // Defensive: AG Grid can render a cell mid-update with no data attached.
  // Returning null keeps one bad row from taking down the column.
  if (!data) return null;

  const level = Number.isFinite(data.level) ? Math.max(0, data.level) : 0;
  const isOpen = expanded?.has(data.id) ?? false;
  const label = value ?? data.resource ?? "—";

  return (
    <span
      style={{ display: "flex", alignItems: "center", height: "100%" }}
      title={String(label)}
    >
      {/* One guide rail per ancestor level. */}
      {Array.from({ length: level }, (_, i) => (
        <span
          key={`guide-${data.id}-${i}`}
          aria-hidden="true"
          style={{
            width: INDENT,
            flexShrink: 0,
            alignSelf: "stretch",
            borderLeft: "1px solid var(--cg-border-subtle)",
            marginLeft: i === 0 ? 6 : 0,
          }}
        />
      ))}

      <span
        style={{
          width: CHEVRON,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {data.hasChildren && (
          <button
            type="button"
            onClick={() => onToggle?.(data.id)}
            aria-label={
              isOpen ? `Collapse ${data.resource}` : `Expand ${data.resource}`
            }
            aria-expanded={isOpen}
            style={{
              width: 16,
              height: 16,
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
        )}
      </span>

      <ResourceIcon kind={data.kind} />

      <span
        style={{
          marginLeft: 7,
          fontWeight: data.hasChildren ? 600 : 400,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>

      {data.hasChildren && (
        <span
          style={{
            marginLeft: 6,
            opacity: 0.5,
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          {data.kind === "Account" ? "account" : "cluster"}
        </span>
      )}
    </span>
  );
}

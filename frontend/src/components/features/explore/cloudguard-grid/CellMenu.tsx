/* eslint-disable i18next/no-literal-string -- grid cell menu */
import React from "react";
import { Bot, Copy, FileJson, Share2 } from "lucide-react";
import type { ResourceRow } from "./data";
import {
  CG_ASK_ABOUT_EVENT,
  type CgAskAboutDetail,
} from "#/hooks/chat/use-chat-input-logic";

/**
 * Right-click context menu for cells — our stand-in for the Enterprise
 * `ContextMenuModule`.
 *
 * Actions:
 *  - **Copy row** — the row's visible values as tab-separated text.
 *  - **Export JSON** — the row *and its descendants*, nested to match the
 *    real hierarchy rather than the flat display order.
 *  - **Ask the agent** — pastes a stable reference to the row into the chat
 *    composer. Uses the app's existing `cg:ask-about` event (the same path the
 *    Xlsx and PDF viewers use), which inserts text at the cursor **without
 *    submitting** — no DOM poking, and it survives the composer being
 *    re-rendered or re-mounted.
 *  - **Asset graph** — deferred; wired as a disabled entry so the menu shape
 *    is final and adding it later is a one-line change.
 */

export interface CellTarget {
  row: ResourceRow;
  x: number;
  y: number;
}

interface Props {
  target: CellTarget | null;
  rows: ResourceRow[];
  onClose: () => void;
}

/** Row → plain object, dropping the fields that only drive presentation. */
function publicFields(r: ResourceRow) {
  const { level, parentId, hasChildren, trend, lastScan, ...rest } = r;
  return { ...rest, lastScan: lastScan.toISOString() };
}

/**
 * Rebuilds the real tree under `root` from the flat rows.
 *
 * The grid stores rows flat with `parentId` (Community has no tree row model),
 * so an export that just dumped the visible rows would lose the hierarchy and
 * emit siblings and children at the same level. This walks children explicitly
 * so the JSON nests the way the data actually does.
 */
export function toNestedJson(root: ResourceRow, rows: ResourceRow[]): unknown {
  const byParent = new Map<string, ResourceRow[]>();
  rows.forEach((r) => {
    if (r.parentId == null) return;
    const list = byParent.get(r.parentId);
    if (list) list.push(r);
    else byParent.set(r.parentId, [r]);
  });

  const build = (node: ResourceRow): Record<string, unknown> => {
    const children = byParent.get(node.id) ?? [];
    const out: Record<string, unknown> = publicFields(node);
    if (children.length > 0) out.children = children.map(build);
    return out;
  };

  return build(root);
}

/**
 * The text pasted into the composer.
 *
 * Carries the row's stable `id` (the full `account/cluster/resource` path)
 * rather than just the display name, which is not unique across accounts — the
 * agent needs something it can resolve unambiguously.
 */
export function askReference(r: ResourceRow): string {
  return `${r.kind} \`${r.resource}\` (id: \`${r.id}\`) — `;
}

function rowAsText(r: ResourceRow): string {
  return Object.entries(publicFields(r))
    .map(([k, v]) => `${k}\t${String(v)}`)
    .join("\n");
}

function download(name: string, body: string) {
  const url = URL.createObjectURL(
    new Blob([body], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const item = (disabled = false): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "6px 12px",
  background: "none",
  border: "none",
  color: disabled ? "var(--cg-text-muted)" : "var(--cg-text-primary)",
  fontSize: 13,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.55 : 1,
  textAlign: "left",
});

export function CellMenu({ target, rows, onClose }: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!target) return undefined;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [target, onClose]);

  if (!target) return null;
  const { row } = target;

  const act = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <div
      ref={ref}
      role="menu"
      style={{
        position: "fixed",
        top: target.y,
        left: target.x,
        zIndex: 70,
        minWidth: 220,
        padding: "4px 0",
        background: "var(--cg-bg-card)",
        border: "1px solid var(--cg-border)",
        borderRadius: 6,
        boxShadow: "var(--cg-shadow-dropdown, 0 8px 24px rgba(0,0,0,.45))",
      }}
    >
      <div
        style={{
          padding: "5px 12px 6px",
          fontSize: 11,
          color: "var(--cg-text-muted)",
          borderBottom: "1px solid var(--cg-border-subtle)",
          marginBottom: 4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {row.resource}
      </div>

      <button
        type="button"
        style={item()}
        onClick={act(() => {
          navigator.clipboard?.writeText(rowAsText(row));
        })}
      >
        <Copy size={14} /> Copy row text
      </button>

      <button
        type="button"
        style={item()}
        onClick={act(() => {
          download(
            `${row.resource}.json`,
            JSON.stringify(toNestedJson(row, rows), null, 2),
          );
        })}
      >
        <FileJson size={14} /> Export JSON
        {row.hasChildren && (
          <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.6 }}>
            with children
          </span>
        )}
      </button>

      <button
        type="button"
        style={item()}
        onClick={act(() => {
          const detail: CgAskAboutDetail = { text: askReference(row) };
          window.dispatchEvent(new CustomEvent(CG_ASK_ABOUT_EVENT, { detail }));
        })}
      >
        <Bot size={14} /> Ask the agent
      </button>

      <button type="button" style={item(true)} disabled>
        <Share2 size={14} /> Asset graph
        <span style={{ marginLeft: "auto", fontSize: 11 }}>soon</span>
      </button>
    </div>
  );
}

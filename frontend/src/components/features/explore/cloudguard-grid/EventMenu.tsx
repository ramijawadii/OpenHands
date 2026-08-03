/* eslint-disable i18next/no-literal-string -- overview event menu */
import React from "react";
import { Bot, Copy, FileJson, FileText } from "lucide-react";
import {
  CG_ASK_ABOUT_EVENT,
  type CgAskAboutDetail,
} from "#/hooks/chat/use-chat-input-logic";
import { eventAsText, eventAskReference, type EventRow } from "./event-data";

/**
 * Right-click menu for an event row.
 *
 * Deliberately narrower and shorter than the inventory grid's `CellMenu` — the
 * events table lives in a quadrant, so a 220px menu with section headers would
 * cover most of it. Same four verbs, compact metrics.
 *
 * "Ask the agent" reuses the app's `cg:ask-about` event, which inserts text at
 * the composer's cursor without submitting — the same path the inventory menu
 * and the document viewers use, so there is one way to hand context to the
 * agent rather than three.
 */

export interface EventTarget {
  row: EventRow;
  x: number;
  y: number;
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

/** Dates serialise to ISO so the export is machine-readable, not locale-bound. */
export function eventAsJson(e: EventRow): string {
  return JSON.stringify(
    e,
    (_k, v) => (v instanceof Date ? v.toISOString() : v),
    2,
  );
}

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  width: "100%",
  padding: "5px 10px",
  background: "none",
  border: "none",
  color: "var(--cg-text-primary)",
  fontSize: 12,
  cursor: "pointer",
  textAlign: "left",
};

export function EventMenu({
  target,
  onOpen,
  onClose,
}: {
  target: EventTarget | null;
  onOpen: (row: EventRow) => void;
  onClose: () => void;
}) {
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
        minWidth: 176,
        padding: "3px 0",
        background: "var(--cg-bg-card)",
        border: "1px solid var(--cg-border)",
        borderRadius: 5,
        boxShadow: "var(--cg-shadow-dropdown, 0 8px 24px rgba(0,0,0,.45))",
      }}
    >
      <div
        style={{
          padding: "4px 10px 5px",
          fontSize: 10,
          color: "var(--cg-text-muted)",
          borderBottom: "1px solid var(--cg-border-subtle)",
          marginBottom: 3,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {row.message}
      </div>

      <button type="button" style={itemStyle} onClick={act(() => onOpen(row))}>
        <FileText size={13} /> Open report
      </button>

      <button
        type="button"
        style={itemStyle}
        onClick={act(() => {
          navigator.clipboard?.writeText(eventAsText(row));
        })}
      >
        <Copy size={13} /> Copy details
      </button>

      <button
        type="button"
        style={itemStyle}
        onClick={act(() => download(`${row.id}.json`, eventAsJson(row)))}
      >
        <FileJson size={13} /> Export
      </button>

      <button
        type="button"
        style={itemStyle}
        onClick={act(() => {
          const detail: CgAskAboutDetail = { text: eventAskReference(row) };
          window.dispatchEvent(new CustomEvent(CG_ASK_ABOUT_EVENT, { detail }));
        })}
      >
        <Bot size={13} /> Ask the agent
      </button>
    </div>
  );
}

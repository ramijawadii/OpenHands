/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

/**
 * The surface's one dropdown.
 *
 * Two problems it solves at once.
 *
 * **It escapes its container.** `SideRailPanel` gives its content area
 * `overflowY: auto`, which clips an absolutely-positioned child — the sort and
 * group menus opened correctly and were simply invisible, which reads exactly
 * like "the control does nothing". So the list is portalled to `document.body`
 * and positioned `fixed` against the trigger.
 *
 * **It is not a native `<select>`.** The OS widget ignores the app's typeface
 * and metrics, cannot style its option list at all, and on Windows renders a
 * white popup regardless of the dark theme — a bright rectangle in the middle of
 * a dark console. It also cannot show the per-option hints these menus rely on,
 * or disable an option WITH a reason.
 */

export interface MenuOption<T extends string> {
  id: T;
  label: string;
  /** Secondary line, for options whose meaning is not obvious from the label. */
  hint?: string;
  /** Present means disabled; the text is the tooltip explaining why. */
  blocked?: string;
}

const MENU_WIDTH = 232;

export function PortalMenu({
  open,
  onClose,
  anchor,
  width = MENU_WIDTH,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchor: React.RefObject<HTMLElement | null>;
  width?: number;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
    null,
  );

  // Position is recomputed, never cached across opens: the trigger moves when
  // the pane scrolls or the window resizes, and a menu pinned to a stale rect
  // floats over unrelated content.
  const place = React.useCallback(() => {
    const el = anchor.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    setPos({
      // Flipped above the trigger when there is no room below, so a control near
      // the bottom of the pane does not open off-screen.
      top: below < 220 && r.top > 220 ? r.top - 4 - 220 : r.bottom + 4,
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
    });
  }, [anchor, width]);

  React.useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  React.useEffect(() => {
    if (!open) return undefined;
    const away = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    // REPOSITION on scroll/resize — do NOT close.
    //
    // Closing on any capture-phase scroll was the bug: AG Grid emits scroll
    // events as it renders rows, so the menu was dismissed in the same frame it
    // opened. From the outside that is indistinguishable from a control that
    // does nothing, which is exactly how it was reported.
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, onClose, anchor, place]);

  if (!open || !pos) return null;
  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ position: "fixed", top: pos.top, left: pos.left, width }}
      className="z-[70] max-h-[220px] overflow-auto rounded-lg border border-[var(--cg-border-card)] bg-[var(--cg-bg-card,var(--cg-bg-page))] p-1 shadow-xl"
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuRow({
  label,
  hint,
  checked,
  blocked,
  onClick,
}: {
  label: string;
  hint?: string;
  checked?: boolean;
  blocked?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={!!checked}
      disabled={!!blocked}
      title={blocked || hint || ""}
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-[12px] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <Check
        className={`mt-0.5 h-3 w-3 shrink-0 ${checked ? "opacity-100" : "opacity-0"}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {hint && (
          <span className="block text-[10px] leading-tight text-[var(--cg-text-muted)]">
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * A labelled dropdown that replaces a `<select>`.
 *
 * `icon` renders inside the trigger, so the date filter keeps its calendar mark
 * without every caller rebuilding the trigger.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  icon,
  width,
  compact,
}: {
  value: T;
  options: MenuOption<T>[];
  onChange: (v: T) => void;
  ariaLabel: string;
  icon?: React.ReactNode;
  width?: number;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const btn = React.useRef<HTMLButtonElement | null>(null);
  const current = options.find((o) => o.id === value);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded border border-[var(--cg-border-card)] text-[var(--cg-text-nav)] hover:bg-[var(--cg-bg-hover)] ${
          compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-[11px]"
        }`}
      >
        {icon}
        <span className="truncate">{current?.label ?? value}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
      </button>
      <PortalMenu
        open={open}
        anchor={btn}
        width={width}
        onClose={() => setOpen(false)}
      >
        {options.map((o) => (
          <MenuRow
            key={o.id}
            label={o.label}
            hint={o.hint}
            blocked={o.blocked}
            checked={o.id === value}
            onClick={() => {
              onChange(o.id);
              setOpen(false);
            }}
          />
        ))}
      </PortalMenu>
    </>
  );
}

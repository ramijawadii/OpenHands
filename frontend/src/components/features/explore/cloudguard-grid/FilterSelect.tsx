/* eslint-disable i18next/no-literal-string -- overview filter control */
import React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { APP_FONT } from "./theme";

/**
 * Compact dropdown for the Overview's event filters.
 *
 * A native `<select>` cannot render an icon per option — the browser draws the
 * list itself — so filters that need the inventory's icons have to be a custom
 * popup. Styled to match the grid's own filter popups rather than the OS.
 *
 * Keyboard and dismissal behaviour is kept: Escape closes, outside click
 * closes, and the trigger reports `aria-expanded`.
 */

export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

/**
 * `input` — a bordered control, for filters sitting inside a table's chrome.
 * `tab`   — the drawer tab-strip pill, for page-level scope controls. Borderless
 *           until it carries a value, at which point it takes the card
 *           background exactly as an active tab does.
 */
export type FilterVariant = "input" | "tab";

/**
 * Above this many options, the popup grows a search field.
 *
 * Scanning is fine for a handful of choices and a search box over three options
 * is just chrome — but the account filter carries one entry per account, which
 * is a scroll-and-hunt through a list the operator already knows the name of.
 * Auto-enabling on count means a filter gains search when its data grows,
 * rather than when someone remembers to pass a flag.
 */
const SEARCH_THRESHOLD = 8;

export function FilterSelect({
  label,
  icon,
  value,
  options,
  onChange,
  variant = "input",
  searchable,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  variant?: FilterVariant;
  /** Force the search field on or off. Defaults to option count. */
  searchable?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  /** Keyboard cursor. Kept separate from `value` — moving is not choosing. */
  const [cursor, setCursor] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;

  const shown = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Reopening starts clean: a stale query would show a filtered list with no
  // indication that anything had been typed, which reads as missing options.
  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    const i = options.findIndex((o) => o.value === value);
    setCursor(i >= 0 ? i : 0);
    // Focus the field so the dropdown is type-ready — the whole point of an
    // integrated search is not having to click into it first.
    if (showSearch)
      window.requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, options, value, showSearch]);

  // Typing narrows the list under the cursor, so park it back at the top
  // rather than leaving it pointing past the end.
  React.useEffect(() => setCursor(0), [query]);

  // Keep the cursor in view when it moves by keyboard rather than by pointer.
  React.useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-idx="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  /** Arrow/Enter driving the list while focus stays in the search field. */
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (shown.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setCursor((c) => (c + step + shown.length) % shown.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = shown[cursor];
      if (hit) choose(hit.value);
    }
  };

  const current = options.find((o) => o.value === value);
  const isDefault = value === "All";

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={variant === "tab" ? "cg-scope-tab" : undefined}
        style={
          variant === "tab"
            ? {
                // Mirrors `ConversationTabNav`: pill, active = card background.
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                maxWidth: 180,
                height: 28,
                padding: "0 10px",
                fontSize: 12.5,
                lineHeight: 1,
                fontFamily: APP_FONT,
                background: isDefault ? "transparent" : "var(--cg-bg-card)",
                color: isDefault
                  ? "var(--cg-text-nav)"
                  : "var(--cg-text-primary)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }
            : {
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                maxWidth: 124,
                height: 20,
                padding: "0 5px",
                fontSize: 11,
                lineHeight: 1,
                fontFamily: APP_FONT,
                background: "var(--cg-input-bg)",
                color: isDefault
                  ? "var(--cg-text-muted)"
                  : "var(--cg-text-primary)",
                border: `1px solid ${isDefault ? "var(--cg-border)" : "var(--cg-accent)"}`,
                borderRadius: 3,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }
        }
      >
        {/*
         * Fixed-size slot, always rendered. Letting the icon size the span
         * makes a filter with no icon sit at a different height from its
         * neighbours, which is exactly the misalignment this replaces.
         */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: variant === "tab" ? 14 : 13,
            height: variant === "tab" ? 14 : 13,
            flexShrink: 0,
          }}
        >
          {current?.icon ?? icon}
        </span>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {current?.label ?? label}
        </span>
        <ChevronDown
          size={variant === "tab" ? 12 : 11}
          style={{ flexShrink: 0, opacity: 0.6 }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 3px)",
            left: 0,
            minWidth: 178,
            padding: 3,
            background: "var(--cg-bg-card)",
            border: "1px solid var(--cg-border)",
            borderRadius: 4,
            boxShadow: "var(--cg-shadow-dropdown, 0 8px 24px rgba(0,0,0,.45))",
          }}
        >
          {showSearch && (
            /*
             * The search sits INSIDE the popup rather than replacing the
             * trigger's label: the trigger has to keep showing the current
             * selection while the menu is open, otherwise the operator loses
             * the very value they are deciding whether to change.
             */
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                margin: "1px 1px 3px",
                padding: "0 6px",
                height: 24,
                background: "var(--cg-input-bg)",
                border: "1px solid var(--cg-input-border)",
                borderRadius: 3,
              }}
            >
              <Search
                size={11}
                style={{ flexShrink: 0, color: "var(--cg-text-muted)" }}
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onListKey}
                placeholder={`Search ${label.toLowerCase()}…`}
                aria-label={`Search ${label}`}
                aria-controls="cg-filter-list"
                aria-activedescendant={
                  shown[cursor] ? `cg-opt-${shown[cursor].value}` : undefined
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: 0,
                  fontSize: 11,
                  fontFamily: APP_FONT,
                  color: "var(--cg-text-primary)",
                }}
              />
            </div>
          )}

          <div
            id="cg-filter-list"
            ref={listRef}
            role="listbox"
            aria-label={label}
            style={{ maxHeight: 232, overflowY: "auto" }}
          >
            {shown.length === 0 && (
              <div
                style={{
                  padding: "6px 6px 7px",
                  fontSize: 11,
                  fontFamily: APP_FONT,
                  color: "var(--cg-text-muted)",
                }}
              >
                No matches
              </div>
            )}
            {shown.map((o, i) => (
              <button
                key={o.value}
                id={`cg-opt-${o.value}`}
                data-idx={i}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => choose(o.value)}
                onMouseEnter={() => setCursor(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                  padding: "3px 6px",
                  fontSize: 11,
                  fontFamily: APP_FONT,
                  // The keyboard cursor and the current value are DIFFERENT
                  // states: the cursor is where Enter would land, the check is
                  // what is applied. Only the cursor takes a background, so
                  // arrowing past the selected option never makes two rows
                  // look equally chosen.
                  background:
                    i === cursor ? "var(--cg-bg-hover)" : "transparent",
                  border: "none",
                  borderRadius: 3,
                  color: "var(--cg-text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                  }}
                >
                  {o.icon}
                </span>
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {o.label}
                </span>
                {o.value === value && (
                  <Check size={12} style={{ color: "var(--cg-accent)" }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

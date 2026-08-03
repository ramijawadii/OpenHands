/* eslint-disable i18next/no-literal-string -- overview filter control */
import React from "react";
import { Check, ChevronDown } from "lucide-react";
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

export function FilterSelect({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

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

  const current = options.find((o) => o.value === value);
  const isDefault = value === "All";

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
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
          color: isDefault ? "var(--cg-text-muted)" : "var(--cg-text-primary)",
          border: `1px solid ${isDefault ? "var(--cg-border)" : "var(--cg-accent)"}`,
          borderRadius: 3,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
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
            width: 13,
            height: 13,
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
        <ChevronDown size={11} style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 3px)",
            left: 0,
            minWidth: 158,
            maxHeight: 232,
            overflowY: "auto",
            padding: 3,
            background: "var(--cg-bg-card)",
            border: "1px solid var(--cg-border)",
            borderRadius: 4,
            boxShadow: "var(--cg-shadow-dropdown, 0 8px 24px rgba(0,0,0,.45))",
          }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: "3px 6px",
                fontSize: 11,
                fontFamily: APP_FONT,
                background:
                  o.value === value ? "var(--cg-bg-hover)" : "transparent",
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
      )}
    </div>
  );
}

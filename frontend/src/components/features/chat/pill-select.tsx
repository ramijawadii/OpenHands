/* eslint-disable i18next/no-literal-string, react/require-default-props -- shared control */
import * as React from "react";
import { cn } from "#/utils/utils";

/**
 * The composer's mode picker, as a component both surfaces share.
 *
 * It started as inline markup inside `prompt-input`. The Settings tab needs the
 * same control — a native `<select>` beside it renders the operating system's
 * widget, which cannot be themed, ignores the drawer's dark palette, and reads
 * as a different product. Copying the markup would have produced two pickers
 * that drift apart the first time either is adjusted, so the mechanism lives
 * here and the composer imports it like everyone else.
 *
 * Two behaviours are load-bearing rather than decorative:
 *
 * - **The sliding highlight** follows the pointer between options instead of
 *   each option painting its own hover. One moving element reads as a single
 *   list being traversed; eight independent hovers read as eight buttons.
 * - **`onMouseDown` is prevented everywhere.** The composer's textarea must not
 *   lose focus when the menu is used, or the box collapses mid-selection.
 */

/** Width-animating label, so a mode change does not jolt the row. */
export function MorphingText({ text }: { text: string }) {
  const [width, setWidth] = React.useState<number | "auto">("auto");
  const spanRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (spanRef.current) setWidth(spanRef.current.offsetWidth);
  }, [text]);

  return (
    <span
      className="relative inline-flex items-center justify-center overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
      style={{ width }}
    >
      <span ref={spanRef} className="invisible whitespace-nowrap px-1">
        {text}
      </span>
      <span
        key={text}
        className="prompt-text-in absolute inset-0 flex items-center justify-center whitespace-nowrap"
      >
        {text}
      </span>
    </span>
  );
}

export interface PillOption {
  value: string;
  label: string;
  /** Second line, for options whose consequence is not obvious from the name. */
  description?: string;
}

/** Row height of one option — the highlight translates by this. */
const ROW = 34;
const ROW_WITH_DESC = 46;

export function PillSelect({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
  renderIcon,
  placement = "bottom",
  align = "left",
  width = 176,
  className,
}: {
  value: string;
  options: PillOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
  /** Optional glyph for the trigger and each option. */
  renderIcon?: (value: string, className?: string) => React.ReactNode;
  /** `top` opens upward — the composer sits at the bottom of the viewport. */
  placement?: "top" | "bottom";
  align?: "left" | "right";
  width?: number;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState({
    opacity: 0,
    transform: "translateY(0px) scale(0.95)",
    transition: "none",
  });
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  const hasDescriptions = options.some((o) => o.description);
  const rowHeight = hasDescriptions ? ROW_WITH_DESC : ROW;

  const current = options.find((o) => o.value === value);
  const label = current?.label ?? value;

  // A disabled picker must not stay open behind the scenes. The composer
  // disables this while collapsed; without the close, re-expanding would show
  // a menu the operator never reopened.
  React.useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${ariaLabel}. Current: ${label}`}
        className={cn(
          "group flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-foreground outline-none transition-all duration-200 cursor-default",
          disabled ? "opacity-45 cursor-not-allowed" : "hover:bg-accent/60",
          open && !disabled ? "bg-accent/60" : "",
        )}
      >
        {renderIcon?.(
          value,
          "size-3.5 opacity-70 group-hover:opacity-100 transition-opacity shrink-0",
        )}
        <span className="text-xs font-semibold select-none">
          <MorphingText text={label} />
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
          className={cn(
            "shrink-0 opacity-50 transition-transform duration-200",
            open ? "rotate-180" : "",
          )}
        >
          <path
            d="M2 4l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>

      {/* `tabIndex={-1}` rather than 0: the options are buttons and already in
          the tab order, so a focusable container would add a stop that lands on
          nothing. -1 keeps it programmatically focusable without that. */}
      <div
        role="listbox"
        tabIndex={-1}
        aria-label={ariaLabel}
        style={{
          width,
          transformOrigin: `${placement === "top" ? "bottom" : "top"} ${align}`,
        }}
        onMouseLeave={() =>
          setHover((prev) => ({
            ...prev,
            opacity: 0,
            transform: prev.transform.replace("scale(1)", "scale(0.95)"),
            transition: "opacity 0.2s ease-in, transform 0.2s ease-out",
          }))
        }
        className={cn(
          "absolute z-50 flex flex-col gap-0.5 rounded-2xl border border-border bg-card/95 p-1 shadow-xl backdrop-blur-md transition-all duration-300 cursor-default",
          placement === "top" ? "bottom-full mb-2.5" : "top-full mt-2",
          align === "right" ? "right-0" : "left-0",
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            : "opacity-0 scale-95 translate-y-2 pointer-events-none ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
        )}
      >
        <div className="relative flex flex-col gap-0.5">
          <div
            style={{ ...hover, height: rowHeight }}
            className="absolute left-0 right-0 top-0 -z-10 rounded-xl bg-accent pointer-events-none"
          />
          {options.map((o, idx) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() =>
                setHover((prev) => ({
                  opacity: 1,
                  transform: `translateY(${idx * rowHeight}px) scale(1)`,
                  transition:
                    prev.opacity === 0
                      ? "opacity 0.15s ease-out"
                      : "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.15s ease",
                }))
              }
              onClick={(e) => {
                e.stopPropagation();
                onChange(o.value);
                setOpen(false);
              }}
              style={{ height: rowHeight }}
              className="group relative flex w-full items-center justify-between rounded-xl px-2.5 text-left outline-none active:scale-[0.98] cursor-default"
            >
              <span className="flex min-w-0 items-center gap-2">
                {renderIcon?.(
                  o.value,
                  "size-3.5 shrink-0 opacity-85 group-hover:opacity-100 transition-opacity",
                )}
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-foreground/80">
                    {o.label}
                  </span>
                  {o.description && (
                    <span className="block truncate text-[10.5px] text-muted-foreground">
                      {o.description}
                    </span>
                  )}
                </span>
              </span>
              {o.value === value && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                  className="shrink-0 opacity-80"
                >
                  <path
                    d="M2.5 6.5l2.5 2.5 4.5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

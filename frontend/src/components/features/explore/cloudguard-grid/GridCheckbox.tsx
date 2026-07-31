import React from "react";
import { CHECKBOX_ACCENT } from "./theme";

/**
 * Checkbox styled to match AG Grid's own.
 *
 * A native `<input type="checkbox">` with `accentColor` only picks up the tint
 * once checked — unchecked it still renders the browser's default square, which
 * is why the side panel's boxes did not match the grid's selection column. This
 * draws the box itself and keeps a visually-hidden real input underneath, so
 * keyboard focus, labels and form semantics all still work.
 */
export function GridCheckbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  const ref = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  const on = checked || indeterminate;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        width: 16,
        height: 16,
        flexShrink: 0,
      }}
    >
      <input
        ref={ref}
        type="checkbox"
        aria-label={ariaLabel}
        checked={checked}
        onChange={onChange}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          margin: 0,
          opacity: 0,
          cursor: "pointer",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          borderRadius: 3,
          boxSizing: "border-box",
          background: on ? CHECKBOX_ACCENT : "transparent",
          border: `1px solid ${on ? CHECKBOX_ACCENT : "var(--cg-border-strong, var(--cg-border))"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 100ms, border-color 100ms",
          pointerEvents: "none",
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6.2 4.8 8.5 9.5 3.8"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {!checked && indeterminate && (
          <span style={{ width: 8, height: 2, background: "#fff" }} />
        )}
      </span>
    </span>
  );
}

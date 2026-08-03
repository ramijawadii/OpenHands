/* eslint-disable i18next/no-literal-string -- grid cell fallback */
import React from "react";

/**
 * Display hardening for cell renderers.
 *
 * AG Grid renders cell components outside any React error boundary we control,
 * and a throw inside one renderer unmounts the whole grid — a single malformed
 * row takes the entire table with it. That is the failure mode this file
 * exists to prevent.
 *
 * Two layers:
 *
 *  1. `withSafeCell` wraps a renderer in a tiny boundary. A throw degrades that
 *     one cell to a muted marker; every other cell, and the grid, keep working.
 *  2. `safeText` normalises values *before* render, so the common causes —
 *     null, undefined, NaN, Invalid Date — never reach a renderer at all.
 *
 * Failures are counted, not swallowed silently: a renderer that throws on every
 * row would otherwise look like a styling quirk rather than a bug.
 */

/** Per-renderer failure counts, readable from the console for triage. */
const failures = new Map<string, number>();

export function cellFailureCounts(): Record<string, number> {
  return Object.fromEntries(failures);
}

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__cgCellFailures =
    cellFailureCounts;
}

interface BoundaryProps {
  name: string;
  children: React.ReactNode;
}

class CellBoundary extends React.Component<BoundaryProps, { failed: boolean }> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    const { name } = this.props;
    failures.set(name, (failures.get(name) ?? 0) + 1);
    // Warn once per renderer — one per row would flood the console and hide
    // the very signal we are trying to surface.
    if (failures.get(name) === 1) {
      // eslint-disable-next-line no-console
      console.warn(`[cloudguard-grid] cell renderer "${name}" failed`, error);
    }
  }

  render() {
    const { failed } = this.state;
    const { children } = this.props;
    if (failed) {
      return (
        <span
          title="This cell could not be rendered"
          style={{ opacity: 0.45, fontVariantNumeric: "tabular-nums" }}
        >
          ⚠
        </span>
      );
    }
    return children;
  }
}

/** Wraps a cell renderer so a throw degrades one cell, never the grid. */
export function withSafeCell<P extends object>(
  name: string,
  Renderer: React.ComponentType<P>,
): React.ComponentType<P> {
  function Safe(props: P) {
    return (
      <CellBoundary name={name}>
        {/* Spreading is required here: this is a generic wrapper and cannot
            enumerate the props of an arbitrary AG Grid cell renderer. */}
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <Renderer {...props} />
      </CellBoundary>
    );
  }
  Safe.displayName = `Safe(${name})`;
  return Safe;
}

/**
 * Renders any value as display text.
 *
 * Nulls become an em dash rather than blank — blank is indistinguishable from
 * a rendering failure, which is exactly the ambiguity this hardening is meant
 * to remove.
 */
export function safeText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number")
    return Number.isFinite(value) ? value.toLocaleString() : "—";
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? "—" : value.toLocaleDateString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}

/** Value formatter built on `safeText`, for columns with no custom renderer. */
export function safeFormatter(p: { value: unknown }): string {
  return safeText(p.value);
}

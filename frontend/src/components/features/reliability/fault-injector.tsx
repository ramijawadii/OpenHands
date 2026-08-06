/* eslint-disable i18next/no-literal-string -- dev-only diagnostics control */
import React from "react";
import {
  INJECTABLE,
  faultInjectionEnabled,
  injectAsyncFault,
  injectBudgetBurn,
  injectRejection,
  injectRenderFault,
} from "./fault-injection";

/**
 * The control surface for fault injection. Renders nothing unless the harness is
 * enabled, so it is inert in a production build by construction rather than by
 * remembering to remove it.
 *
 * The four fault kinds are separated on purpose: they exercise DIFFERENT parts
 * of the safety net, and conflating them would let a passing check hide a gap.
 *   render     → the error boundary path
 *   async      → the global capture (boundaries cannot see timers)
 *   rejection  → the global capture (unhandled promise)
 *   budget     → the SLO/burn maths, with nothing actually broken
 */
export function FaultInjector() {
  if (!faultInjectionEnabled()) return null;

  const btn: React.CSSProperties = {
    border: "1px solid var(--cg-border-card)",
    borderRadius: 6,
    background: "transparent",
    color: "var(--cg-text-nav)",
    fontSize: 11.5,
    padding: "3px 8px",
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: "var(--cg-text-muted)",
        }}
      >
        Induce a real failure and watch containment hold. Render faults hit the
        boundary; async and rejection faults bypass it entirely and must still
        be counted.
      </p>
      {INJECTABLE.map((surface) => (
        <div
          key={surface}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <span
            style={{
              width: 72,
              fontSize: 12,
              color: "var(--cg-text-primary)",
            }}
          >
            {surface}
          </span>
          <button
            type="button"
            style={btn}
            onClick={() => injectRenderFault(surface)}
          >
            render
          </button>
          <button
            type="button"
            style={btn}
            onClick={() => injectAsyncFault(surface)}
          >
            async
          </button>
          <button
            type="button"
            style={btn}
            onClick={() => injectRejection(surface)}
          >
            rejection
          </button>
          <button
            type="button"
            style={btn}
            onClick={() => injectBudgetBurn(surface)}
          >
            burn budget
          </button>
        </div>
      ))}
    </div>
  );
}

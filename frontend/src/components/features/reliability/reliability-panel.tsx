/* eslint-disable i18next/no-literal-string -- operator diagnostics surface */
import React from "react";
import { AlertTriangle, Bug, CheckCircle2, ShieldAlert } from "lucide-react";
import { reliabilitySnapshot, subscribeReliability } from "./reliability";
import { sloVerdict, type SloResult, type SloStatus } from "./slo";
import { circuitSnapshot } from "./circuit-breaker";
import { useTransportHealth } from "./transport-health";
import { faultInjectionEnabled } from "./fault-injection";
import { FaultInjector } from "./fault-injector";

/**
 * Operator view of the reliability plane: SLO burn, open circuits, transport
 * health, and the recent event tail.
 *
 * This exists so the answer to "is the UI healthy?" is a page rather than a
 * console incantation. Counters that only a developer can read are not
 * observability — they are a debugging aid.
 */

const COLOR: Record<SloStatus, string> = {
  ok: "var(--cg-text-muted)",
  at_risk: "#f0b429",
  exhausted: "var(--cg-danger)",
};

const ICON: Record<SloStatus, typeof CheckCircle2> = {
  ok: CheckCircle2,
  at_risk: AlertTriangle,
  exhausted: ShieldAlert,
};

function SloRow({ result }: { result: SloResult }) {
  const Icon = ICON[result.status];
  const pct = Math.min(100, Math.round(result.burn * 100));
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "18px 1fr auto",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid var(--cg-border-subtle)",
      }}
    >
      <Icon size={15} color={COLOR[result.status]} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--cg-text-primary)" }}>
          {result.objective}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--cg-text-muted)",
            marginTop: 2,
          }}
        >
          {result.surface} · {result.consumed}/{result.budget} in the last hour
        </div>
        {/* Burn bar: the budget, not the raw count, is what matters. */}
        <div
          style={{
            marginTop: 5,
            height: 3,
            borderRadius: 2,
            background: "var(--cg-border-subtle)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: COLOR[result.status],
              transition: "width 200ms ease",
            }}
          />
        </div>
      </div>
      <span style={{ fontSize: 12, color: COLOR[result.status] }}>{pct}%</span>
    </div>
  );
}

export function ReliabilityPanel() {
  // Re-render whenever a new event lands, so the page reflects an incident as it
  // happens rather than when someone remembers to refresh.
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => subscribeReliability(() => bump()), []);

  const verdict = sloVerdict();
  const { events, counters } = reliabilitySnapshot();
  const circuits = circuitSnapshot();
  const transport = useTransportHealth();
  const openCircuits = Object.entries(circuits).filter(
    ([, state]) => state !== "closed",
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <section>
        <h2
          style={{
            margin: "0 0 4px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--cg-text-primary)",
          }}
        >
          Service level objectives
        </h2>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 12.5,
            color: "var(--cg-text-muted)",
          }}
        >
          Error budget over a rolling hour. Recoveries and retries do not
          consume budget — a successful self-heal is the system working.
        </p>
        {verdict.results.map((r) => (
          <SloRow key={r.surface} result={r} />
        ))}
      </section>

      <section style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11.5, color: "var(--cg-text-muted)" }}>
            Agent connection
          </div>
          <div
            style={{
              fontSize: 13,
              color: transport.healthy
                ? "var(--cg-text-primary)"
                : "var(--cg-danger)",
            }}
          >
            {transport.healthy ? "Connected" : `Down — ${transport.reason}`}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: "var(--cg-text-muted)" }}>
            Open circuits
          </div>
          <div style={{ fontSize: 13, color: "var(--cg-text-primary)" }}>
            {openCircuits.length === 0
              ? "None"
              : openCircuits.map(([k, v]) => `${k} (${v})`).join(", ")}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: "var(--cg-text-muted)" }}>
            Events recorded
          </div>
          <div style={{ fontSize: 13, color: "var(--cg-text-primary)" }}>
            {events.length}
          </div>
        </div>
      </section>

      {Object.keys(counters).length > 0 && (
        <section>
          <h2
            style={{
              margin: "0 0 6px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--cg-text-primary)",
            }}
          >
            Counters
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "4px 16px",
            }}
          >
            {Object.entries(counters)
              .sort((a, b) => b[1] - a[1])
              .map(([key, n]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "var(--cg-text-nav)",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {key}
                  </span>
                  <span style={{ color: "var(--cg-text-primary)" }}>{n}</span>
                </div>
              ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <h2
            style={{
              margin: "0 0 6px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--cg-text-primary)",
            }}
          >
            Recent events
          </h2>
          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              fontSize: 11.5,
              fontFamily: "var(--font-mono, monospace)",
              color: "var(--cg-text-muted)",
            }}
          >
            {[...events].reverse().map((e, i) => (
              <div
                key={`${e.at}-${i}`}
                style={{ padding: "2px 0", whiteSpace: "nowrap" }}
              >
                {new Date(e.at).toLocaleTimeString()} · {e.surface}.{e.kind}
                {e.detail ? `.${e.detail}` : ""}{" "}
                {e.message ? `— ${e.message}` : ""}
              </div>
            ))}
          </div>
        </section>
      )}

      {faultInjectionEnabled() && (
        <section>
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              margin: "0 0 6px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--cg-text-primary)",
            }}
          >
            <Bug size={14} /> Fault injection
          </h2>
          <FaultInjector />
        </section>
      )}
    </div>
  );
}

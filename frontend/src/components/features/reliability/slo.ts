import { reliabilitySnapshot, type ReliabilitySurface } from "./reliability";

/**
 * SLOs and error budgets for the UI surfaces.
 *
 * Counters answer "did it fail?". They cannot answer "is that too much?" — and
 * without that second answer nobody can decide whether to ship, roll back, or
 * ignore. This module is that threshold, expressed as data and EVALUATED, so the
 * objective is checkable rather than a sentence in a document nobody re-reads.
 *
 * The model is a simple error budget over a rolling window:
 *   budget       failures we accept in the window (the objective's inverse)
 *   consumed     failures actually observed
 *   burn         consumed / budget — >1 means the budget is spent
 *
 * Budgets are per surface because the surfaces are not equally important: the
 * sidebar is the only way to navigate, so its budget is far tighter than a
 * single tab's. Setting one global number would either over-protect tabs or
 * under-protect navigation.
 */

export interface SloDefinition {
  surface: ReliabilitySurface;
  /** What the objective is about, in operator language. */
  objective: string;
  /** Tolerated failing events per window. */
  budget: number;
  /** Which counter kinds consume the budget. `recovered`/`retry` do not: a
   *  recovery is the system working, and charging for it would make a healthy
   *  self-heal look like an outage. */
  countKinds: string[];
}

export const WINDOW_MS = 60 * 60 * 1000; // 1h rolling

export const SLOS: SloDefinition[] = [
  {
    surface: "sidebar",
    objective: "Navigation is always available",
    budget: 1, // the shell's only navigation — effectively zero tolerance
    countKinds: ["crash"],
  },
  {
    surface: "explore",
    objective: "The page renders",
    budget: 2,
    countKinds: ["crash"],
  },
  {
    surface: "drawer",
    objective: "The conversation panel opens and stays usable",
    budget: 4,
    countKinds: ["crash", "stall"],
  },
  {
    surface: "tab",
    objective: "An individual panel tab renders",
    budget: 6, // contained by design, so a looser budget is honest
    countKinds: ["crash"],
  },
  {
    surface: "websocket",
    objective: "The agent connection stays up",
    budget: 6, // networks flap; sustained flapping is the real signal
    countKinds: ["degraded"],
  },
  {
    surface: "request",
    objective: "Backend calls succeed or fail fast",
    budget: 10,
    countKinds: ["crash", "degraded"],
  },
];

export type SloStatus = "ok" | "at_risk" | "exhausted";

export interface SloResult extends SloDefinition {
  consumed: number;
  /** consumed / budget. 1.0 = exactly spent. */
  burn: number;
  status: SloStatus;
}

function classify(burn: number): SloStatus {
  if (burn >= 1) return "exhausted";
  // 0.5 is a deliberate early-warning line: an operator needs to know a budget
  // is being spent while there is still budget left to act with.
  if (burn >= 0.5) return "at_risk";
  return "ok";
}

/** Evaluate every SLO against the in-memory event ring for the rolling window. */
export function evaluateSlos(now: number = Date.now()): SloResult[] {
  const { events } = reliabilitySnapshot();
  const cutoff = now - WINDOW_MS;
  const recent = events.filter((e) => e.at >= cutoff);

  return SLOS.map((slo) => {
    const consumed = recent.filter(
      (e) => e.surface === slo.surface && slo.countKinds.includes(e.kind),
    ).length;
    // Guard against a zero/negative budget producing Infinity or NaN, which
    // would render as a broken tile rather than a breached objective.
    let burn: number;
    if (slo.budget > 0) burn = consumed / slo.budget;
    else burn = consumed > 0 ? 1 : 0;
    return { ...slo, consumed, burn, status: classify(burn) };
  });
}

export interface SloVerdict {
  /** Worst status across all objectives — what a health badge should show. */
  status: SloStatus;
  exhausted: string[];
  atRisk: string[];
  results: SloResult[];
}

/** One overall verdict. The worst surface wins: a shell with working tabs and a
 *  dead sidebar is not "mostly healthy". */
export function sloVerdict(now: number = Date.now()): SloVerdict {
  const results = evaluateSlos(now);
  const exhausted = results.filter((r) => r.status === "exhausted");
  const atRisk = results.filter((r) => r.status === "at_risk");
  let status: SloStatus = "ok";
  if (exhausted.length) status = "exhausted";
  else if (atRisk.length) status = "at_risk";
  return {
    status,
    exhausted: exhausted.map((r) => r.surface),
    atRisk: atRisk.map((r) => r.surface),
    results,
  };
}

// Inspectable during an incident alongside __cgReliability().
if (typeof window !== "undefined") {
  (window as unknown as { __cgSlo?: typeof sloVerdict }).__cgSlo = sloVerdict;
}

import React from "react";
import { useSearchParams } from "react-router";

/**
 * The Overview's page-level scope — time range, environment, account.
 *
 * **Held in the URL, not in component state.** `explore-view.tsx` already
 * declares the contract: *"Taxonomy lives in the path; the query is reserved
 * for genuine STATE (filters, time range) and is carried across navigation
 * untouched."* This is that state.
 *
 * Three things fall out of putting it there rather than in a store:
 *
 *  - **One scope for the whole page.** The stat strip, the charts and the
 *    events table read the same window. A page where one region is scoped to
 *    24h and the rest is all-time invites the reader to compare numbers that
 *    do not describe the same thing — an error-prevention problem, not a
 *    convenience one.
 *  - **Handoff.** An analyst can send a colleague the exact screen they are
 *    looking at. A dashboard whose state lives in memory cannot be handed over.
 *  - **Back/forward work.** Narrowing the scope is undoable with the browser
 *    control the user already reaches for.
 *
 * Defaults are omitted from the query, so an untouched page has a clean URL and
 * `?range=24h` always means someone chose it.
 */

export interface ScopeRange {
  value: string;
  label: string;
  /** Window length. `Infinity` = no lower bound. */
  hours: number;
}

export const SCOPE_RANGES: ScopeRange[] = [
  { value: "1h", label: "Last hour", hours: 1 },
  { value: "24h", label: "Last 24 hours", hours: 24 },
  { value: "7d", label: "Last 7 days", hours: 24 * 7 },
  { value: "30d", label: "Last 30 days", hours: 24 * 30 },
  { value: "All", label: "Any time", hours: Number.POSITIVE_INFINITY },
];

/**
 * 7 days, not "any time".
 *
 * An operations landing page should open on a window the user can actually act
 * within. "Any time" makes every count monotonically increasing and therefore
 * useless as a signal — the number only ever goes up, so it never means
 * anything changed.
 */
export const DEFAULT_RANGE = "7d";

export interface Scope {
  range: string;
  env: string;
  account: string;
}

export interface ScopeApi extends Scope {
  hours: number;
  /** True when the user has narrowed anything — drives the Clear affordance. */
  narrowed: boolean;
  set: (patch: Partial<Scope>) => void;
  clear: () => void;
}

const DEFAULTS: Scope = { range: DEFAULT_RANGE, env: "All", account: "All" };
const KEYS = ["range", "env", "account"] as const;

export function useScope(): ScopeApi {
  const [params, setParams] = useSearchParams();

  const range = params.get("range") ?? DEFAULTS.range;
  const env = params.get("env") ?? DEFAULTS.env;
  const account = params.get("account") ?? DEFAULTS.account;

  const set = React.useCallback(
    (patch: Partial<Scope>) => {
      const next = new URLSearchParams(params);
      (Object.keys(patch) as (keyof Scope)[]).forEach((k) => {
        const v = patch[k];
        // A default is the ABSENCE of a parameter, so clearing a filter
        // removes it from the URL instead of writing `?env=All`.
        if (v === undefined || v === DEFAULTS[k]) next.delete(k);
        else next.set(k, v);
      });
      // `replace` so dragging through range options does not bury the previous
      // page under a dozen history entries.
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const clear = React.useCallback(() => {
    const next = new URLSearchParams(params);
    KEYS.forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  }, [params, setParams]);

  const hours =
    SCOPE_RANGES.find((r) => r.value === range)?.hours ??
    Number.POSITIVE_INFINITY;

  return {
    range,
    env,
    account,
    hours,
    narrowed:
      range !== DEFAULTS.range ||
      env !== DEFAULTS.env ||
      account !== DEFAULTS.account,
    set,
    clear,
  };
}

/** Row shape every scoped region shares — enough to apply the scope. */
interface Scopable {
  at: Date;
  env: string;
  account: string;
}

/**
 * Apply the page scope to any dated, environment-tagged, account-tagged rows.
 *
 * One implementation so the strip, the charts and the table can never disagree
 * about what "in scope" means.
 */
export function applyScope<T extends Scopable>(rows: T[], scope: Scope): T[] {
  const hours =
    SCOPE_RANGES.find((r) => r.value === scope.range)?.hours ??
    Number.POSITIVE_INFINITY;
  const cutoff = Number.isFinite(hours)
    ? Date.now() - hours * 3600000
    : -Infinity;
  return rows.filter(
    (r) =>
      r.at.getTime() >= cutoff &&
      (scope.env === "All" || r.env === scope.env) &&
      (scope.account === "All" || r.account === scope.account),
  );
}

/**
 * The previous window of equal length — the denominator for "what changed".
 *
 * A count without a delta answers "how many", which is the question an operator
 * has already internalised. "How many MORE than yesterday" is the one that
 * makes them act.
 */
export function previousWindow<T extends Scopable>(
  rows: T[],
  scope: Scope,
): T[] {
  const hours =
    SCOPE_RANGES.find((r) => r.value === scope.range)?.hours ??
    Number.POSITIVE_INFINITY;
  // An unbounded window has no "previous" — there is nothing to compare to.
  if (!Number.isFinite(hours)) return [];
  const end = Date.now() - hours * 3600000;
  const start = end - hours * 3600000;
  return rows.filter(
    (r) =>
      r.at.getTime() >= start &&
      r.at.getTime() < end &&
      (scope.env === "All" || r.env === scope.env) &&
      (scope.account === "All" || r.account === scope.account),
  );
}

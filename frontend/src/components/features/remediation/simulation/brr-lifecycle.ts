/**
 * Freshness and the version chain.
 *
 * This module exists because of one number: **90 seconds** (`BR-004`). A BRR
 * older than that is not stale-ish, it is invalid, and execution must re-run
 * the simulation. That makes this the only surface in the record drawer whose
 * answer changes while you look at it — every other pane renders history and is
 * correct forever.
 *
 * The countdown is kept here rather than in the pane on purpose. A timer that
 * lives in a component gets duplicated the moment a second component needs it,
 * and then the 90-second rule is half-implemented in two places.
 */
import React from "react";
import { EPOCH, type RemediationAction } from "../remediation-data";
import { buildBrr } from "./brr-build";
import { MAX_BRR_AGE_SECONDS } from "./brr-decide";
import type { BlastRadiusReport } from "./brr-model";

export { MAX_BRR_AGE_SECONDS };

export type Freshness = {
  ageSeconds: number;
  remaining: number;
  valid: boolean;
};

export function freshnessOf(report: BlastRadiusReport, now: number): Freshness {
  const ageSeconds = Math.max(
    0,
    Math.round((now - report.generatedAt.getTime()) / 1000),
  );
  return {
    ageSeconds,
    remaining: Math.max(0, MAX_BRR_AGE_SECONDS - ageSeconds),
    valid: ageSeconds <= MAX_BRR_AGE_SECONDS,
  };
}

/**
 * A ticking clock, at one-second resolution.
 *
 * Ticks only while the report is still inside its window: once it has expired
 * the state cannot change again without a re-simulation, so continuing to tick
 * would be a timer that exists purely to re-render the same string.
 */
export function useFreshness(report: BlastRadiusReport): Freshness {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t - report.generatedAt.getTime() > MAX_BRR_AGE_SECONDS * 1000)
        window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [report]);

  return freshnessOf(report, now);
}

/* ------------------------------------------------------------------ *
 * Version chain
 * ------------------------------------------------------------------ */

const SUPERSEDED = [
  "expired (>90s) before execution",
  "pre-step snapshot found drift — environment changed between sim and exec",
  "blast-radius delta exceeded 20% mid-execution — re-evaluated",
];

/**
 * The chain, newest first.
 *
 * The BRR is immutable; re-validation mints a version and never edits one
 * (`04` §A.6). The newest is anchored to **real time** so the freshness window
 * is demonstrable — the record's fixed demo EPOCH would make every report
 * permanently expired, which would show the failure state and nothing else.
 * Superseded versions keep EPOCH-relative stamps, since their age no longer
 * matters to anything.
 */
export function buildVersionChain(
  a: RemediationAction,
  anchor: number,
): BlastRadiusReport[] {
  const count = 1 + (a.stage % 3);
  return Array.from({ length: count }, (_, i) => {
    const version = count - i;
    const latest = i === 0;
    const report = buildBrr(
      a,
      version,
      latest ? new Date(anchor) : new Date(EPOCH - (count - version) * 180000),
    );
    return latest
      ? report
      : { ...report, supersededReason: SUPERSEDED[(version - 1) % 3] };
  });
}

export interface VersionDiff {
  from: number;
  to: number;
  nodesAdded: string[];
  nodesRemoved: string[];
  classChanged?: string;
  reversibilityChanged?: string;
  tierChanged?: string;
}

/**
 * What changed when we re-simulated.
 *
 * This is the question during a paused execution, and it is not answerable from
 * two reports side by side — a reader comparing 27 rows against 25 will not
 * reliably spot which two appeared, and "which two appeared" is precisely what
 * decides whether to resume.
 */
export function diffVersions(
  older: BlastRadiusReport,
  newer: BlastRadiusReport,
): VersionDiff {
  const before = new Set(older.impact.map((n) => n.resource));
  const after = new Set(newer.impact.map((n) => n.resource));

  return {
    from: older.version,
    to: newer.version,
    nodesAdded: [...after].filter((r) => !before.has(r)),
    nodesRemoved: [...before].filter((r) => !after.has(r)),
    ...(older.class !== newer.class
      ? { classChanged: `${older.class} → ${newer.class}` }
      : {}),
    ...(older.reversibility !== newer.reversibility
      ? {
          reversibilityChanged: `${older.reversibility} → ${newer.reversibility}`,
        }
      : {}),
    ...(older.tier.final !== newer.tier.final
      ? { tierChanged: `${older.tier.final} → ${newer.tier.final}` }
      : {}),
  };
}

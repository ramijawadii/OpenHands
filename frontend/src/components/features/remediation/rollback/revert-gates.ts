/**
 * Whether a revert can actually run, and at what scope.
 *
 * Separated from the journal because these are the *decisions*, and the safety
 * model insists the layers stay independent: the blast-radius control must not
 * rely on classification having been right, and recovery must work even when
 * the agent's own control plane is down. Keeping the gate logic in one small
 * module is how the code states that.
 */
import { hash, type RemediationAction } from "../remediation-data";
import { downloadJson, type ExportResult } from "../remediation-evidence-data";
import type { DriftVerdict, UndoEntry } from "./undo-journal";

/**
 * The scope ladder, narrowest first.
 *
 * The runbook is explicit about how to use this: start narrow, confirm within
 * five minutes, widen if unresolved. Widening is cheap; spending twenty
 * minutes identifying the exact resource is not.
 */
export type RevertScope = "entry" | "wave" | "run" | "window";

export const SCOPE_MEANING: Record<RevertScope, string> = {
  entry: "One resource — you have identified the exact target",
  wave: "The wave — the symptom appeared during a known batch",
  run: "The whole run — multiple waves affected, cause unclear",
  window: "Everything since a timestamp — multiple runs, unclear boundaries",
};

/** Drift verdicts an unattended revert is allowed to proceed on. */
const AUTO_SAFE: DriftVerdict[] = ["CLEAN", "ALREADY_REVERTED"];

export function autoRevertable(e: UndoEntry): boolean {
  return (
    AUTO_SAFE.includes(e.drift) &&
    e.state === "ACTIVE" &&
    e.inverseValidated &&
    !e.iacManaged
  );
}

export interface StorageIndependence {
  crossAccount: boolean;
  wormDays: number;
  replicated: boolean;
  /**
   * The independence test: can an on-call engineer retrieve every undo record
   * and execute the inverses with the control plane offline, using only a
   * laptop and break-glass credentials? If not, the design is unfinished.
   */
  independentRead: boolean;
}

export interface RevertReadiness {
  /** Entries that carry a validated inverse, over the total. */
  covered: number;
  total: number;
  clean: number;
  drifted: number;
  blocked: UndoEntry[];
  storage: StorageIndependence;
  /**
   * Reasons an unattended revert cannot proceed. Empty means the narrow path
   * is open — it never means "safe", which is a judgement the operator makes.
   */
  blockers: string[];
}

export function assessReadiness(
  a: RemediationAction,
  entries: UndoEntry[],
): RevertReadiness {
  const covered = entries.filter((e) => e.inverseValidated).length;
  const clean = entries.filter((e) => e.drift === "CLEAN").length;
  const drifted = entries.filter((e) => e.drift.startsWith("DRIFT")).length;
  const blocked = entries.filter(
    (e) => !autoRevertable(e) && e.state === "ACTIVE",
  );

  const blockers: string[] = [];
  if (covered < entries.length)
    blockers.push(
      `${entries.length - covered} mutation(s) have no validated inverse — they were never eligible for automated execution`,
    );
  if (drifted > 0)
    blockers.push(
      `${drifted} entr${drifted === 1 ? "y" : "ies"} failed the drift gate — reverting would overwrite someone's change`,
    );
  const iac = entries.filter(
    (e) => e.iacManaged && e.state === "ACTIVE",
  ).length;
  if (iac > 0)
    blockers.push(
      `${iac} resource(s) are IaC-managed — revert in the repository, not by API, or the next apply clobbers it`,
    );
  const pending = entries.filter((e) => e.state === "PENDING").length;
  if (pending > 0)
    blockers.push(
      `${pending} entr${pending === 1 ? "y" : "ies"} still PENDING — the mutation outcome is unknown until reconciliation re-reads the resource`,
    );
  const failed = entries.filter((e) => e.state === "REVERT_FAILED").length;
  if (failed > 0)
    blockers.push(
      `${failed} revert(s) already failed — do not batch-retry; these need manual restoration`,
    );

  return {
    covered,
    total: entries.length,
    clean,
    drifted,
    blocked,
    storage: {
      // Never the tenant account being remediated.
      crossAccount: true,
      wormDays: 180,
      replicated: true,
      independentRead: hash(`${a.id}indep`) % 7 !== 0,
    },
    blockers,
  };
}

/** Entries a given scope selects, in the order a revert would execute them. */
export function entriesInScope(
  entries: UndoEntry[],
  scope: RevertScope,
  anchor: UndoEntry | null,
): UndoEntry[] {
  const pool = (() => {
    if (scope === "entry") return anchor ? [anchor] : [];
    if (scope === "wave")
      return anchor ? entries.filter((e) => e.waveId === anchor.waveId) : [];
    if (scope === "run") return entries.filter((e) => e.state === "ACTIVE");
    return entries;
  })();

  // Reverse chronological: the last thing applied is the first thing undone,
  // which is also what satisfies the dependency chains.
  return [...pool].sort(
    (x, y) => y.executedAt.getTime() - x.executedAt.getTime(),
  );
}

/**
 * The step operators skip.
 *
 * A reverted change with an enabled rule is re-applied on the next scan cycle
 * — operator reverts, goes to bed, the scanner runs at 02:00, and the exact
 * change that caused the outage lands again. Surfacing it as part of the
 * revert flow is the only way it stops being optional cleanup.
 */
export function rulesToDisable(entries: UndoEntry[]): string[] {
  return [...new Set(entries.map((e) => e.ruleId))];
}

export interface DryRun {
  scope: RevertScope;
  willRevert: UndoEntry[];
  willSkip: { entry: UndoEntry; because: string }[];
  rules: string[];
  /** Longest propagation in the set — when recovery can actually be declared. */
  propagationSeconds: number;
}

export function planRevert(
  entries: UndoEntry[],
  scope: RevertScope,
  anchor: UndoEntry | null,
): DryRun {
  const selected = entriesInScope(entries, scope, anchor);
  const willRevert = selected.filter(autoRevertable);
  const willSkip = selected
    .filter((e) => !autoRevertable(e))
    .map((entry) => {
      let because = `state is ${entry.state}`;
      if (entry.iacManaged) because = "IaC-managed — revert in the repository";
      else if (entry.drift.startsWith("DRIFT"))
        because = `drift gate: ${entry.drift}`;
      else if (entry.drift === "INDETERMINATE")
        because = "live state could not be compared";
      else if (!entry.inverseValidated) because = "no validated inverse";
      return { entry, because };
    });

  return {
    scope,
    willRevert,
    willSkip,
    rules: rulesToDisable(willRevert),
    propagationSeconds: Math.max(
      0,
      ...willRevert.map((e) => e.propagationSeconds),
    ),
  };
}

export function exportJournal(
  a: RemediationAction,
  entries: UndoEntry[],
  readiness: RevertReadiness,
): ExportResult {
  const doc = {
    schema: "cloudguard.remediation.undo-journal",
    version: 1,
    exportedAt: new Date().toISOString(),
    action: { id: a.id, title: a.title, environment: a.environment },
    readiness: {
      ...readiness,
      blocked: readiness.blocked.map((e) => e.entryId),
    },
    // The export doubles as the break-glass artifact: it must be enough to
    // execute the inverses by hand with the control plane offline.
    entries: entries.map((e) => ({
      ...e,
      executedAt: e.executedAt.toISOString(),
      retentionUntil: e.retentionUntil.toISOString(),
    })),
  };

  return downloadJson(doc, `${a.id}-undo-journal.json`, (parsed) => {
    const d = parsed as unknown as typeof doc;
    if (d.entries.length !== entries.length)
      throw new Error("export lost journal entries during serialisation");
  });
}

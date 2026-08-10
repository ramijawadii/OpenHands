/**
 * Evidence — the ledger, its coverage, and its integrity.
 *
 * ## Why this is derived rather than listed
 *
 * The pane used to read from a flat seven-entry `EVIDENCE` array that was the
 * same for every action and had no relationship to anything else in the record.
 * That is the whole problem in one line: evidence is not a list that sits
 * beside the lifecycle, it is the **residue of the lifecycle**. Every stage
 * declares the artifact it produces (`STAGE_ARTIFACT`) and the controls it
 * evidences (`STAGE_CONTROLS`); the ledger is what those stages left behind.
 *
 * Deriving it makes the one question an auditor actually asks answerable:
 * *is this complete?* Two independent lists can never answer it — they can only
 * disagree. One derived ledger can, because a stage that has been passed but
 * produced no artifact is now a computable gap rather than an absence nobody
 * can see.
 *
 * ## What makes a record evidence rather than a file
 *
 * Four things, and the model carries all four:
 *
 * - **Provenance** — which stage produced it, under whose authority.
 * - **Custody** — who collected it, from where, under what grant, moved how.
 * - **Integrity** — a hash chain, so tampering breaks a link rather than
 *   silently editing a row.
 * - **Obligation** — the control that requires it, which is also the thing
 *   that sets the retention clock. "7 years" is not a property of a file; it
 *   is a consequence of a control.
 */
import {
  hash,
  num,
  pick,
  EPOCH,
  OWNERS,
  type RemediationAction,
} from "./remediation-data";
import { digest } from "./remediation-detail-data";
import { STAGE_CONTROLS, type ControlRef } from "./remediation-field-data";
import { LIFECYCLE_STAGES, slug } from "./remediation-structure";

/* ------------------------------------------------------------------ *
 * Model
 * ------------------------------------------------------------------ */

/** Object-Lock semantics, named as the storage layer names them. */
/**
 * The evidence taxonomy's top-level groups.
 *
 * Folded in as a *dimension* on the records the lifecycle already produces,
 * not as a second tree beside them. A parallel `04_Changes / 05_Artifacts / …`
 * hierarchy would be a third place a stage's output is described — after the
 * stage itself and the control it evidences — and the three would disagree
 * within a release. As a column it stays one ledger, and "show me every
 * command this action ran" becomes a filter rather than a different screen.
 *
 * `Record` covers the groups the taxonomy did not enumerate (the stage's own
 * narrative output — detection, triage, risk, investigation, closure). Named
 * rather than left blank so nothing sorts into an unlabelled bucket.
 */
export type EvidenceCategory =
  | "Record"
  | "Changes"
  | "Artifacts"
  | "Commands"
  | "Logs"
  | "Exceptions";

export const CATEGORY_MEANING: Record<EvidenceCategory, string> = {
  Record: "The stage's own output — what it concluded",
  Changes: "What the estate looked like before and after, and the diff between",
  Artifacts: "What was built or proposed — PRs, commits, plans, manifests",
  Commands: "What was actually invoked, and what it returned",
  Logs: "What the systems said while it ran",
  Exceptions: "What went wrong, and what was done about it",
};

export type RetentionMode = "Compliance" | "Governance";

export interface RetentionPolicy {
  name: string;
  /**
   * `Compliance` cannot be shortened or lifted by anyone, including the
   * account root; `Governance` can, by a named privileged role. The
   * distinction is the entire value of the field — a retention period that a
   * sufficiently senior person can delete is a filing convention, not a
   * control.
   */
  mode: RetentionMode;
  years: number;
  until: Date;
  /** The obligation that sets the clock, so the duration is explicable. */
  basis: string;
}

export interface Custody {
  collectedBy: string;
  actorType: "System" | "Agent" | "Platform" | "Human";
  /** The system it was taken from, not the system that stored it. */
  from: string;
  /** The grant the collection ran under — the answer to "was this lawful?". */
  authorization: string;
  transfer: string;
}

export interface EvidenceRecord {
  id: string;
  name: string;
  /** Taxonomy group — the coarse "what kind of proof is this". */
  category: EvidenceCategory;
  kind: string;
  format: string;
  source: string;
  /** Lifecycle stage that produced it — the join to everything else. */
  stage: number;
  stageLabel: string;
  /** Controls this artifact evidences, inherited from its stage. */
  controls: ControlRef[];
  sha256: string;
  bytes: number;
  collectedAt: Date;
  custody: Custody;
  retention: RetentionPolicy;
  legalHold: boolean;
  redacted: boolean;
  /** Position in the chain, and the link backwards. */
  chainIndex: number;
  prevHash: string;
  chainHash: string;
}

/**
 * What each stage is expected to leave behind.
 *
 * The first entry of each stage is its **primary** artifact — the one named by
 * `STAGE_ARTIFACT`, without which the stage cannot be said to have happened.
 * The rest are supporting: valuable, but their absence is a weaker claim.
 */
/** Shorthand for the table below — five positional fields, one per line. */
const r = (
  file: string,
  category: EvidenceCategory,
  kind: string,
  source: string,
  format: string,
) => ({ file, category, kind, source, format });

const STAGE_EVIDENCE: {
  file: string;
  category: EvidenceCategory;
  kind: string;
  source: string;
  format: string;
}[][] = [
  /* 1 Discovery */
  [
    r(
      "detection.json",
      "Record",
      "Detection record",
      "cspm-scanner",
      "application/json",
    ),
    r(
      "scan-api-calls.jsonl",
      "Commands",
      "API calls",
      "cspm-scanner",
      "application/x-ndjson",
    ),
  ],
  /* 2 Triage */
  [
    r(
      "triage-note.md",
      "Record",
      "Triage note",
      "cloudguard-agent",
      "text/markdown",
    ),
    r(
      "asset-context.json",
      "Record",
      "Asset context",
      "inventory",
      "application/json",
    ),
  ],
  /* 3 Risk assessment */
  [
    r(
      "risk-score.json",
      "Record",
      "Risk score sheet",
      "risk-model",
      "application/json",
    ),
  ],
  /* 4 Investigation */
  [
    r(
      "investigation.md",
      "Record",
      "Investigation report",
      "cloudguard-agent",
      "text/markdown",
    ),
    r(
      "cloudtrail-window.jsonl",
      "Logs",
      "API logs",
      "cloudtrail",
      "application/x-ndjson",
    ),
  ],
  /* 5 Blast radius */
  [
    r(
      "blast-radius.json",
      "Record",
      "Blast radius simulation",
      "simulator",
      "application/json",
    ),
  ],
  /* 6 Remediation plan — what was proposed, before anything ran. */
  [
    r(
      "change-proposal.json",
      "Record",
      "Change proposal",
      "cloudguard-agent",
      "application/json",
    ),
    r(
      "terraform.plan.json",
      "Artifacts",
      "Terraform plan",
      "github",
      "application/json",
    ),
    r(
      "pull-request.json",
      "Artifacts",
      "Pull request",
      "github",
      "application/json",
    ),
    r("commits.json", "Artifacts", "Commits", "github", "application/json"),
    r(
      "k8s-manifests.yaml",
      "Artifacts",
      "Kubernetes manifests",
      "github",
      "application/yaml",
    ),
  ],
  /* 7 Execution — what was invoked, and what the systems said. */
  [
    r("run-log.txt", "Logs", "Execution logs", "executor", "text/plain"),
    r(
      "approval-chain.json",
      "Record",
      "Approval record",
      "platform",
      "application/json",
    ),
    r(
      "cli-commands.jsonl",
      "Commands",
      "CLI commands",
      "executor",
      "application/x-ndjson",
    ),
    r(
      "tool-calls.jsonl",
      "Commands",
      "Tool calls",
      "cloudguard-agent",
      "application/x-ndjson",
    ),
    r(
      "agent-actions.jsonl",
      "Commands",
      "Agent actions",
      "cloudguard-agent",
      "application/x-ndjson",
    ),
    r(
      "exit-codes.json",
      "Commands",
      "Exit codes",
      "executor",
      "application/json",
    ),
    r("raw-output.txt", "Commands", "Raw output", "executor", "text/plain"),
    r(
      "terraform.apply.log",
      "Artifacts",
      "Terraform apply",
      "github",
      "text/plain",
    ),
    r("ci-run.json", "Artifacts", "CI/CD run", "github", "application/json"),
    r(
      "agent-log.jsonl",
      "Logs",
      "Agent logs",
      "cloudguard-agent",
      "application/x-ndjson",
    ),
    r("system-log.txt", "Logs", "System logs", "executor", "text/plain"),
  ],
  /* 8 Execution results — the before/after the whole record turns on. */
  [
    r(
      "result-diff.json",
      "Record",
      "Result diff",
      "executor",
      "application/json",
    ),
    r(
      "resources-changed.json",
      "Changes",
      "Resources changed",
      "executor",
      "application/json",
    ),
    r(
      "before-state.json",
      "Changes",
      "Before state",
      "executor",
      "application/json",
    ),
    r(
      "after-state.json",
      "Changes",
      "After state",
      "executor",
      "application/json",
    ),
    r(
      "config-diff.patch",
      "Changes",
      "Configuration diff",
      "executor",
      "text/x-diff",
    ),
    r(
      "infra-diff.patch",
      "Changes",
      "Infrastructure diff",
      "github",
      "text/x-diff",
    ),
    r(
      "change-metadata.json",
      "Changes",
      "Change metadata",
      "platform",
      "application/json",
    ),
    r(
      "errors.jsonl",
      "Exceptions",
      "Errors",
      "executor",
      "application/x-ndjson",
    ),
    r(
      "failed-actions.json",
      "Exceptions",
      "Failed actions",
      "executor",
      "application/json",
    ),
    r(
      "permission-failures.json",
      "Exceptions",
      "Permission failures",
      "executor",
      "application/json",
    ),
    r(
      "partial-execution.json",
      "Exceptions",
      "Partial execution",
      "executor",
      "application/json",
    ),
    r(
      "recovery-actions.json",
      "Exceptions",
      "Recovery actions",
      "platform",
      "application/json",
    ),
    r("error-log.txt", "Logs", "Error logs", "executor", "text/plain"),
  ],
  /* 9 Validation */
  [
    r(
      "rescan.json",
      "Record",
      "Validation report",
      "cspm-scanner",
      "application/json",
    ),
  ],
  /* 10 Closure */
  [
    r(
      "closure-report.pdf",
      "Record",
      "Closure report",
      "platform",
      "application/pdf",
    ),
  ],
];

const ACTOR_BY_SOURCE: Record<string, Custody["actorType"]> = {
  "cspm-scanner": "System",
  inventory: "System",
  cloudtrail: "System",
  "risk-model": "System",
  simulator: "System",
  "cloudguard-agent": "Agent",
  executor: "Platform",
  github: "Platform",
  platform: "Platform",
};

const stageLabel = (n: number) =>
  LIFECYCLE_STAGES[n - 1]?.label ?? `Stage ${n}`;

/* ------------------------------------------------------------------ *
 * Ledger
 * ------------------------------------------------------------------ */

/**
 * The evidence that exists, in chain order.
 *
 * Only stages the action has actually reached can have produced anything, so
 * the ledger stops at `a.stage`. Supporting artifacts are dropped
 * deterministically for a minority of records — real estates have collection
 * gaps, and a coverage view that can only ever report 100% teaches the reader
 * that the view is decorative.
 */
export function buildEvidenceLedger(a: RemediationAction): EvidenceRecord[] {
  const out: EvidenceRecord[] = [];
  let prevHash = "0".repeat(64);

  STAGE_EVIDENCE.slice(0, a.stage).forEach((specs, i) => {
    const n = i + 1;
    specs.forEach((spec, j) => {
      const seed = `${a.id}ev${n}.${j}`;
      // Primary artifacts are never dropped: a passed stage without its
      // primary artifact would be an inconsistency, not a gap.
      if (j > 0 && hash(`${seed}gap`) % 7 === 0) return;

      const sha256 = digest(seed);
      const chainIndex = out.length + 1;
      const chainHash = digest(`${prevHash}${sha256}${chainIndex}`);
      const collectedAt = new Date(
        EPOCH - (a.stage - n + 1) * num(seed, 2, 20) * 3600000,
      );
      const controls = STAGE_CONTROLS[i] ?? [];
      const prod = a.environment === "prod";
      const years = prod ? 7 : 1;
      const until = new Date(collectedAt);
      until.setFullYear(until.getFullYear() + years);
      const actorType = ACTOR_BY_SOURCE[spec.source] ?? "Platform";

      out.push({
        id: `EV-${num(seed, 1000, 9999)}`,
        name: spec.file,
        category: spec.category,
        kind: spec.kind,
        format: spec.format,
        source: spec.source,
        stage: n,
        stageLabel: stageLabel(n),
        controls,
        sha256,
        bytes: num(seed, 900, 480000),
        collectedAt,
        custody: {
          collectedBy:
            actorType === "Agent" || actorType === "System"
              ? spec.source
              : pick(OWNERS, seed),
          actorType,
          from: spec.source,
          authorization: `${a.account} · read-only collector role`,
          transfer: "TLS 1.3 → WORM object store",
        },
        retention: {
          name: prod ? "prod-evidence-7y" : "nonprod-evidence-1y",
          // Production evidence is locked in Compliance mode precisely so that
          // nobody — including whoever is responding to the incident — can
          // shorten it while the incident is still politically live.
          mode: prod ? "Compliance" : "Governance",
          years,
          until,
          basis: controls[0]
            ? `${controls[0].framework} ${controls[0].ref}`
            : "Internal retention standard",
        },
        legalHold: prod && hash(`${seed}lh`) % 11 === 0,
        redacted:
          spec.file.includes("cloudtrail") || spec.file.includes("run-log"),
        chainIndex,
        prevHash,
        chainHash,
      });
      prevHash = chainHash;
    });
  });

  return out;
}

/* ------------------------------------------------------------------ *
 * Integrity
 * ------------------------------------------------------------------ */

export interface ChainCheck {
  ok: boolean;
  checked: number;
  /** Chain indices whose link does not recompute. */
  broken: number[];
  at: string;
}

/**
 * Recompute the chain rather than assert it.
 *
 * The previous pane had a "Verify chain" button that set `ok: true`
 * unconditionally. A verification that cannot fail is worse than no
 * verification: it trains the reader to treat a green result as meaningful
 * when it carries no information. This one walks the links and reports the
 * indices that do not reproduce, so a broken chain is visibly broken.
 */
export function verifyLedger(items: EvidenceRecord[]): ChainCheck {
  const broken: number[] = [];
  let prev = "0".repeat(64);

  items.forEach((it) => {
    const expected = digest(`${prev}${it.sha256}${it.chainIndex}`);
    if (it.prevHash !== prev || it.chainHash !== expected)
      broken.push(it.chainIndex);
    prev = it.chainHash;
  });

  return {
    ok: broken.length === 0,
    checked: items.length,
    broken,
    at: new Date().toISOString().replace("T", " ").slice(0, 16),
  };
}

/* ------------------------------------------------------------------ *
 * Coverage
 * ------------------------------------------------------------------ */

export type CoverageState = "Complete" | "Partial" | "Missing" | "Pending";

export interface StageCoverage {
  stage: number;
  label: string;
  state: CoverageState;
  /** Everything the stage should have produced. */
  expected: string[];
  present: EvidenceRecord[];
  missing: string[];
  controls: ControlRef[];
}

/**
 * Per-stage completeness.
 *
 * `Pending` is kept distinct from `Missing` deliberately. A stage the action
 * has not reached has produced nothing and *should* have produced nothing —
 * folding it in with genuine gaps would make every young record look
 * catastrophically under-evidenced and make the real gaps impossible to spot.
 */
export function buildStageCoverage(
  a: RemediationAction,
  items: EvidenceRecord[],
): StageCoverage[] {
  return STAGE_EVIDENCE.map((specs, i) => {
    const n = i + 1;
    const expected = specs.map((s) => s.kind);
    const present = items.filter((it) => it.stage === n);
    const missing = expected.filter(
      (k) => !present.some((it) => it.kind === k),
    );

    let state: CoverageState = "Complete";
    if (n > a.stage) state = "Pending";
    else if (present.length === 0) state = "Missing";
    else if (missing.length > 0) state = "Partial";

    return {
      stage: n,
      label: stageLabel(n),
      state,
      expected,
      present,
      missing,
      controls: STAGE_CONTROLS[i] ?? [],
    };
  });
}

export interface ControlCoverage {
  framework: string;
  ref: string;
  title: string;
  items: EvidenceRecord[];
  /** Stages that owe this control evidence but have not produced it. */
  gaps: number[];
}

/**
 * The same ledger, indexed the way an audit request arrives.
 *
 * Nobody asks for "artifact 4". They ask "show me what evidences CIS AWS 4.1",
 * and the answer has to be assembled from whichever stages happen to touch
 * that control. Precomputing that index is the difference between answering in
 * a click and answering in an afternoon.
 */
export function buildControlCoverage(
  a: RemediationAction,
  items: EvidenceRecord[],
): ControlCoverage[] {
  const by = new Map<string, ControlCoverage>();

  STAGE_CONTROLS.forEach((controls, i) => {
    const n = i + 1;
    controls.forEach((c) => {
      const key = `${c.framework} ${c.ref}`;
      const row = by.get(key) ?? { ...c, items: [], gaps: [] };
      const fromStage = items.filter((it) => it.stage === n);
      if (fromStage.length) row.items.push(...fromStage);
      // Only a stage that has been reached can owe evidence.
      else if (n <= a.stage) row.gaps.push(n);
      by.set(key, row);
    });
  });

  return [...by.values()].sort(
    (x, y) =>
      x.framework.localeCompare(y.framework) || x.ref.localeCompare(y.ref),
  );
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

export interface ExportResult {
  ok: boolean;
  filename?: string;
  error?: string;
}

/** Build → serialise → re-parse → verify → download, as the field export does. */
export function downloadJson(
  doc: object,
  filename: string,
  check: (d: never) => void,
) {
  try {
    const text = JSON.stringify(doc, null, 2);
    check(JSON.parse(text) as never);

    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
    return { ok: true, filename };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * The whole ledger as one handover document.
 *
 * Includes the chain and the verification result, not just the rows: a bundle
 * that lists hashes without the linkage that binds them lets a recipient check
 * each file individually but not that the set is the set that was collected.
 */
export function exportEvidenceBundle(
  a: RemediationAction,
  items: EvidenceRecord[],
): ExportResult {
  const check = verifyLedger(items);
  const doc = {
    schema: "cloudguard.remediation.evidence-bundle",
    version: 1,
    exportedAt: new Date().toISOString(),
    action: {
      id: a.id,
      title: a.title,
      environment: a.environment,
      account: a.account,
      stage: a.stage,
      stageLabel: stageLabel(a.stage),
    },
    integrity: {
      algorithm: "SHA-256",
      linkage: "prevHash + sha256 + chainIndex",
      verified: check.ok,
      checked: check.checked,
      broken: check.broken,
      head: items[items.length - 1]?.chainHash ?? null,
    },
    coverage: buildStageCoverage(a, items).map((s) => ({
      stage: s.stage,
      label: s.label,
      state: s.state,
      missing: s.missing,
      controls: s.controls.map((c) => `${c.framework} ${c.ref}`),
    })),
    controls: buildControlCoverage(a, items).map((c) => ({
      control: `${c.framework} ${c.ref}`,
      title: c.title,
      evidencedBy: c.items.map((it) => it.id),
      gapStages: c.gaps,
    })),
    records: items.map((it) => ({
      id: it.id,
      name: it.name,
      category: it.category,
      kind: it.kind,
      format: it.format,
      stage: it.stage,
      stageLabel: it.stageLabel,
      sha256: it.sha256,
      bytes: it.bytes,
      collectedAt: it.collectedAt.toISOString(),
      custody: it.custody,
      retention: {
        ...it.retention,
        until: it.retention.until.toISOString(),
      },
      legalHold: it.legalHold,
      redacted: it.redacted,
      chainIndex: it.chainIndex,
      prevHash: it.prevHash,
      chainHash: it.chainHash,
      controls: it.controls.map((c) => `${c.framework} ${c.ref}`),
    })),
  };

  return downloadJson(doc, `${a.id}-evidence-bundle.json`, (parsed) => {
    const d = parsed as unknown as typeof doc;
    if (d.records.length !== items.length)
      throw new Error("bundle lost records during serialisation");
    if (d.integrity.head !== doc.integrity.head)
      throw new Error("bundle chain head does not match the ledger");
  });
}

/** One record, for the case where an auditor asked for exactly one thing. */
export function exportEvidenceRecord(
  a: RemediationAction,
  it: EvidenceRecord,
): ExportResult {
  const doc = {
    schema: "cloudguard.remediation.evidence-record",
    version: 1,
    exportedAt: new Date().toISOString(),
    action: { id: a.id, title: a.title, environment: a.environment },
    record: {
      id: it.id,
      name: it.name,
      category: it.category,
      kind: it.kind,
      format: it.format,
      source: it.source,
      stage: it.stage,
      stageLabel: it.stageLabel,
      sha256: it.sha256,
      bytes: it.bytes,
      collectedAt: it.collectedAt.toISOString(),
      custody: it.custody,
      retention: { ...it.retention, until: it.retention.until.toISOString() },
      legalHold: it.legalHold,
      redacted: it.redacted,
      chainIndex: it.chainIndex,
      prevHash: it.prevHash,
      chainHash: it.chainHash,
      controls: it.controls.map((c) => ({
        framework: c.framework,
        ref: c.ref,
        title: c.title,
      })),
    },
  };

  return downloadJson(
    doc,
    `${a.id}-${slug(it.kind)}-${it.id}.json`,
    (parsed) => {
      const d = parsed as unknown as typeof doc;
      if (d.record.sha256 !== it.sha256)
        throw new Error("export does not describe the requested record");
    },
  );
}

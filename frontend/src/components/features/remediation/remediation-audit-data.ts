/**
 * Audit — the record about the record.
 *
 * ## What makes this different from the other three time-ordered panes
 *
 * Lifecycle holds the work, Approvals the decisions, Evidence the artifacts.
 * All three are about the *cloud change*. Audit is not: its subject is this
 * document — every mutation of it, and every read of it. That is the surface
 * that answers "was this edited after the fact?", which no other pane can.
 *
 * The old builder blurred that line. It emitted `Approval granted` and
 * `Execution recorded` — lifecycle events replayed into the audit table, where
 * they add nothing except the illusion of volume. Every entry here is now a
 * change to a FIELD of the record, or a gate that constrained one.
 *
 * ## The operational question
 *
 * At 2am nobody reads an audit log top to bottom. The question is "did anything
 * change that shouldn't have?", and the shape of the answer is almost always
 * *an actor who should not have touched a field*, or *a change with no policy
 * behind it*. So `actorType` and `policed` are first-class and filterable, and
 * an unpoliced mutation is computed rather than left for the reader to notice.
 */
import {
  hash,
  num,
  pick,
  EPOCH,
  OWNERS,
  ROLES,
  type RemediationAction,
} from "./remediation-data";
import { digest } from "./remediation-detail-data";
import {
  downloadJson,
  type ChainCheck,
  type ExportResult,
} from "./remediation-evidence-data";

export type ActorKind = "System" | "Agent" | "Human";

export interface AuditChange {
  index: number;
  at: Date;
  actor: string;
  actorType: ActorKind;
  /** The session the mutation arrived on — the join to an identity, not a name. */
  session: string;
  sourceIp: string;
  /** What happened to the record, never what happened in the cloud. */
  action: string;
  field: string;
  from: string;
  to: string;
  /** The rule that permitted it. Absent = the anomaly worth surfacing. */
  policy?: string;
  /**
   * Derived, not stored: a mutation with no policy behind it is the thing an
   * auditor hunts for, and asking the reader to notice a blank cell in a long
   * table is asking them to do the system's job.
   */
  policed: boolean;
  hash: string;
  prevHash: string;
}

export interface AuditAccess {
  at: Date;
  actor: string;
  role: string;
  /** How much of the record was returned — a read of everything is not a read of one field. */
  scope: string;
  /** Why it was opened. Unstated reads are their own finding in regulated tenants. */
  purpose: string;
  session: string;
  sourceIp: string;
  /** A read that left the building. Materially different from one that did not. */
  exported: boolean;
}

/**
 * Mutations, in the order the record accrued them.
 *
 * Generated per lifecycle stage so the log grows with the work rather than
 * being a fixed six rows — a six-row audit trail on a ten-stage action is
 * visibly a placeholder, and it trains the reader to distrust the pane.
 */
const STAGE_MUTATIONS: [string, string, string, ActorKind, string?][][] = [
  [["detection", "—", "open", "System", "detector@4.1"]],
  [
    ["severity", "—", "assessed", "Agent", "risk-model@3.2"],
    ["owner", "unassigned", "assigned", "Agent", "routing@1.4"],
  ],
  [["riskScore", "—", "scored", "Agent", "risk-model@3.2"]],
  [["rootCause", "—", "identified", "Agent", "investigator@2.0"]],
  [["blastRadius", "—", "simulated", "Agent", "simulator@1.7"]],
  [["plan", "—", "5 phases", "Agent", "catalog@1.9"]],
  [
    ["authorization", "Authorized", "Requires approval", "System", undefined],
    ["phase.apply", "Requires approval", "Approved", "Human", "two-person@1.0"],
  ],
  [["status", "Approved", "Executing", "System", "executor@2.2"]],
  [["validation", "—", "rescan clean", "Agent", "cspm@4.1"]],
  [["status", "Executing", "Closed", "Human", "closure@1.1"]],
];

const ACTION_FOR: Record<ActorKind, string> = {
  System: "Gate applied",
  Agent: "Field updated",
  Human: "Field updated",
};

export function buildAuditTrail(a: RemediationAction): AuditChange[] {
  const out: AuditChange[] = [];
  let prev = digest(`${a.id}genesis`);

  STAGE_MUTATIONS.slice(0, a.stage).forEach((muts, i) => {
    const n = i + 1;
    muts.forEach(([field, from, to, actorType, policy], j) => {
      const seed = `${a.id}au${n}.${j}`;
      const index = out.length + 1;
      const h = digest(`${a.id}au${index}${prev}`);
      const actorFor: Record<ActorKind, string> = {
        System: "policy-engine",
        Agent: "cloudguard-agent",
        Human: j === 0 ? a.owner : pick(OWNERS, seed),
      };

      out.push({
        index,
        at: new Date(EPOCH - (a.stage - n + 1) * num(seed, 20, 180) * 60000),
        actor: actorFor[actorType],
        actorType,
        session: `sess-${digest(seed).slice(0, 10)}`,
        sourceIp:
          actorType === "Human"
            ? `10.42.${num(seed, 0, 255)}.${num(`${seed}b`, 1, 254)}`
            : "internal",
        action: ACTION_FOR[actorType],
        field,
        from,
        to,
        policy,
        policed: Boolean(policy),
        hash: h,
        prevHash: prev,
      });
      prev = h;
    });
  });

  return out;
}

const PURPOSES = [
  "Incident review",
  "Change approval",
  "Compliance sampling",
  "Handover",
  "Customer escalation",
];

export function buildAccessTrail(a: RemediationAction): AuditAccess[] {
  return Array.from({ length: 6 }, (_, i) => {
    const seed = `${a.id}ac${i}`;
    return {
      at: new Date(EPOCH - num(seed, 1, 200) * 3600000),
      actor: pick(OWNERS, seed),
      role: pick(ROLES, `${seed}r`),
      scope: i === 0 ? "Full record" : "Evidence only",
      purpose: pick(PURPOSES, `${seed}p`),
      session: `sess-${digest(seed).slice(0, 10)}`,
      sourceIp: `10.42.${num(seed, 0, 255)}.${num(`${seed}b`, 1, 254)}`,
      exported: hash(`${seed}x`) % 5 === 0,
    };
  }).sort((x, y) => y.at.getTime() - x.at.getTime());
}

/**
 * Recompute the links rather than display a head and call it proof.
 *
 * The pane previously showed `chain head 9f2c…` in a green pill with nothing
 * behind it. A hash presented without the check that produced it is decoration
 * — it looks exactly the same whether the chain holds or not.
 */
export function verifyAuditChain(entries: AuditChange[]): ChainCheck {
  const broken: number[] = [];
  entries.forEach((e, i) => {
    const prev = i === 0 ? e.prevHash : entries[i - 1].hash;
    if (e.prevHash !== prev) broken.push(e.index);
  });
  return {
    ok: broken.length === 0,
    checked: entries.length,
    broken,
    at: new Date().toISOString().replace("T", " ").slice(0, 16),
  };
}

/** Both trails, plus the verification, as one handover document. */
export function exportAuditTrail(
  a: RemediationAction,
  changes: AuditChange[],
  access: AuditAccess[],
): ExportResult {
  const check = verifyAuditChain(changes);
  const doc = {
    schema: "cloudguard.remediation.audit-trail",
    version: 1,
    exportedAt: new Date().toISOString(),
    action: { id: a.id, title: a.title, environment: a.environment },
    integrity: {
      algorithm: "SHA-256",
      linkage: "prevHash → hash",
      verified: check.ok,
      checked: check.checked,
      broken: check.broken,
      head: changes[changes.length - 1]?.hash ?? null,
    },
    // Surfaced at the top of the document, not left for the reader to derive:
    // an unpoliced mutation is the reason anyone opens this file.
    unpoliced: changes.filter((c) => !c.policed).map((c) => c.index),
    changes: changes.map((c) => ({
      ...c,
      at: c.at.toISOString(),
    })),
    access: access.map((r) => ({ ...r, at: r.at.toISOString() })),
  };

  return downloadJson(doc, `${a.id}-audit-trail.json`, (parsed) => {
    const d = parsed as unknown as typeof doc;
    if (d.changes.length !== changes.length)
      throw new Error("trail lost entries during serialisation");
    if (d.integrity.head !== doc.integrity.head)
      throw new Error("trail head does not match the chain");
  });
}

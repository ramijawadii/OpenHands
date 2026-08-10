/**
 * Tickets — this action as the rest of the organisation sees it.
 *
 * ## What a ticket is here
 *
 * Not a work item this product owns. A **linkage**: a claim that some object in
 * Jira, ServiceNow or GitHub refers to this remediation. Everything valuable
 * about the pane follows from taking that seriously — if the record is a link
 * rather than a copy, then the interesting property is not the ticket's
 * contents but whether the two ends still agree.
 *
 * ## Why it is not Approvals
 *
 * Approvals are gates this platform enforces; a phase does not run until one
 * clears. Tickets are the organisation's own process running alongside — a
 * change request someone must raise, a PR someone must merge, an incident this
 * hangs off. Conflating them would be a category error with real consequences:
 * an approved gate does not mean an approved change request, and shipping when
 * the CR is still Open is exactly the audit finding people get fired for.
 *
 * ## The operational question
 *
 * "Am I blocked, and on whom?" — so `blocking`, `assignee` and age are
 * first-class. And immediately after it, "does the ticket still match
 * reality?" — cross-system drift is computed here rather than left for someone
 * to notice a week later, in the same spirit as an unpoliced mutation in the
 * audit trail.
 */
import {
  hash,
  num,
  pick,
  EPOCH,
  OWNERS,
  type RemediationAction,
} from "./remediation-data";
import { LIFECYCLE_STAGES } from "./remediation-structure";
import { downloadJson, type ExportResult } from "./remediation-evidence-data";

export type TicketSystem = "Jira" | "ServiceNow" | "GitHub";

export type TicketKind =
  | "Change request"
  | "Incident"
  | "Pull request"
  | "Task";

export type TicketStatus =
  | "Open"
  | "In progress"
  | "In review"
  | "Blocked"
  | "Done"
  | "Cancelled";

/**
 * Agreement between the two ends of the link.
 *
 * `Drifted` is the one that matters: both ends are alive and they disagree.
 * `Stale` means nobody has touched the ticket while the action moved on, and
 * `Link broken` means the reference no longer resolves — different problems
 * with different owners, so they are different words.
 */
export type SyncState = "In sync" | "Drifted" | "Stale" | "Link broken";

export type CreatorKind = "Agent" | "Human" | "Policy";

export interface Ticket {
  /** The external key, which is how everyone outside this product refers to it. */
  key: string;
  system: TicketSystem;
  kind: TicketKind;
  title: string;
  url: string;
  status: TicketStatus;
  assignee: string;
  team: string;
  createdBy: string;
  createdByKind: CreatorKind;
  createdAt: Date;
  updatedAt: Date;
  /** The lifecycle stage that caused this ticket to exist. */
  stage: number;
  stageLabel: string;
  /** Whether the action cannot proceed until this closes. */
  blocking: boolean;
  sync: SyncState;
  /** Present whenever `sync` is not `In sync` — what disagrees, in words. */
  drift?: string;
  /** Change-control fields, which only a change request carries. */
  approvals?: string;
  window?: string;
}

const stageLabel = (n: number) =>
  LIFECYCLE_STAGES[n - 1]?.label ?? `Stage ${n}`;

/** The account each kind of creator raises tickets under. */
const CREATOR_ACCOUNT: Partial<Record<CreatorKind, string>> = {
  Agent: "cloudguard-agent",
  Policy: "policy-engine",
};

const TEAM_FOR: Record<TicketKind, string> = {
  "Change request": "Platform",
  Incident: "Security",
  "Pull request": "AppSec",
  Task: "Platform",
};

/** What each stage puts into somebody else's queue. */
const STAGE_TICKETS: {
  system: TicketSystem;
  kind: TicketKind;
  prefix: string;
  title: (a: RemediationAction) => string;
  by: CreatorKind;
}[][] = [
  [
    {
      system: "ServiceNow",
      kind: "Incident",
      prefix: "INC",
      title: (a) => `Exposure detected on ${a.resource}`,
      by: "Policy",
    },
  ],
  [],
  [],
  [],
  [],
  [
    {
      system: "GitHub",
      kind: "Pull request",
      prefix: "PR",
      title: (a) => `Harden ${a.resource} ingress`,
      by: "Agent",
    },
  ],
  [
    {
      system: "ServiceNow",
      kind: "Change request",
      prefix: "CHG",
      title: (a) => `Apply remediation to ${a.resource}`,
      by: "Agent",
    },
  ],
  [],
  [],
  [
    {
      system: "Jira",
      kind: "Task",
      prefix: "SEC",
      title: () => "Record lessons learned and close out",
      by: "Human",
    },
  ],
];

/**
 * Ticket status implied by where the action actually is.
 *
 * This is the reference the drift check compares against: what the ticket
 * *would* say if the two systems agreed.
 */
function expectedStatus(a: RemediationAction, stage: number): TicketStatus {
  if (a.status === ("Cancelled" as string)) return "Cancelled";
  if (stage < a.stage) return "Done";
  if (stage > a.stage) return "Open";
  return "In progress";
}

export function buildTickets(a: RemediationAction): Ticket[] {
  const out: Ticket[] = [];

  STAGE_TICKETS.slice(0, a.stage).forEach((specs, i) => {
    const n = i + 1;
    specs.forEach((spec, j) => {
      const seed = `${a.id}tk${n}.${j}`;
      const key = `${spec.prefix}-${num(seed, 1000, 9999)}`;
      const expected = expectedStatus(a, n);

      // A minority of links go wrong, deterministically. A tickets pane that
      // never disagrees with itself teaches the reader that the sync column is
      // decorative — and the sync column is the only reason to build the pane.
      const roll = hash(`${seed}sync`) % 9;
      let status = expected;
      let sync: SyncState = "In sync";
      let drift: string | undefined;

      if (roll === 0) {
        status = "Open";
        sync = "Drifted";
        drift = `Action reached ${stageLabel(a.stage)} but this is still Open — work was recorded here that the ticket has never acknowledged.`;
      } else if (roll === 1) {
        status = "Done";
        sync = "Drifted";
        drift = `Closed externally while the action is still ${a.status}. Someone resolved the ticket without the change completing.`;
      } else if (roll === 2) {
        sync = "Stale";
        drift = `No update in ${num(seed, 9, 40)} days while the action moved on.`;
      } else if (roll === 3 && n < a.stage) {
        sync = "Link broken";
        drift =
          "The referenced issue no longer resolves — it was moved, merged or deleted.";
      }

      const createdAt = new Date(
        EPOCH - (a.stage - n + 2) * num(seed, 6, 40) * 3600000,
      );
      const isCr = spec.kind === "Change request";

      out.push({
        key,
        system: spec.system,
        kind: spec.kind,
        title: spec.title(a),
        url: `https://example.invalid/${spec.system.toLowerCase()}/${key}`,
        status,
        assignee: spec.by === "Human" ? a.owner : pick(OWNERS, seed),
        team: TEAM_FOR[spec.kind],
        createdBy: CREATOR_ACCOUNT[spec.by] ?? a.owner,
        createdByKind: spec.by,
        createdAt,
        updatedAt: new Date(
          createdAt.getTime() + num(`${seed}u`, 1, 60) * 3600000,
        ),
        stage: n,
        stageLabel: stageLabel(n),
        // Only the change request and the PR actually gate the work; the
        // incident and the closure task travel alongside it.
        blocking: isCr || spec.kind === "Pull request",
        sync,
        drift,
        ...(isCr
          ? {
              approvals: `${num(seed, 1, 3)} of 3 approved`,
              window: `${new Date(EPOCH + 26 * 3600000)
                .toISOString()
                .slice(0, 10)} 02:00–04:00 UTC`,
            }
          : {}),
      });
    });
  });

  return out;
}

/** Blocking tickets that have not closed — the answer to "am I waiting?". */
export function blockedBy(tickets: Ticket[]): Ticket[] {
  return tickets.filter(
    (t) => t.blocking && t.status !== "Done" && t.status !== "Cancelled",
  );
}

/** How long a ticket has sat, which is the number people actually escalate on. */
export function ageDays(t: Ticket): number {
  return Math.max(
    0,
    Math.round((EPOCH - t.updatedAt.getTime()) / (24 * 3600000)),
  );
}

export function exportTicketLinks(
  a: RemediationAction,
  tickets: Ticket[],
): ExportResult {
  const doc = {
    schema: "cloudguard.remediation.ticket-links",
    version: 1,
    exportedAt: new Date().toISOString(),
    action: {
      id: a.id,
      title: a.title,
      status: a.status,
      stage: a.stage,
      stageLabel: stageLabel(a.stage),
    },
    // Hoisted: the two facts that decide whether this action can move.
    blocking: blockedBy(tickets).map((t) => t.key),
    outOfSync: tickets
      .filter((t) => t.sync !== "In sync")
      .map((t) => ({ key: t.key, sync: t.sync, drift: t.drift })),
    tickets: tickets.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      ageDays: ageDays(t),
    })),
  };

  return downloadJson(doc, `${a.id}-ticket-links.json`, (parsed) => {
    const d = parsed as unknown as typeof doc;
    if (d.tickets.length !== tickets.length)
      throw new Error("export lost ticket links during serialisation");
  });
}

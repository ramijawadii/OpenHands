/**
 * The audit vocabulary, translated once.
 *
 * WHY THIS FILE EXISTS
 * ────────────────────
 * The ledger stores the operation id the server actually performed —
 * `vfs_untrash`, `vfs_revert_file`, `str_replace`. Those are the right thing to
 * STORE: they are stable, greppable, and they are what the hash chain commits
 * to. They are the wrong thing to SHOW. A reviewer reading "vfs_untrash" has to
 * translate it before they can decide whether it was reasonable, and a surface
 * that makes people translate is a surface people stop reading.
 *
 * So the raw id is never dropped — the detail modal always shows it — but the
 * ledger reads in sentences.
 *
 * THE REGISTRY IS ALSO THE INVENTORY. This is the one place that enumerates what
 * a person or the agent can DO to an artifact in this product. Adding an audited
 * operation without adding it here shows up immediately as a humanised fallback
 * label, which is the intended failure mode: legible, obviously unregistered,
 * never a lie.
 */

/** Coarse family, used for the row tint and the group filter. */
export type ActionGroup =
  | "open"
  | "create"
  | "change"
  | "organize"
  | "share"
  | "remove"
  | "recover"
  | "run"
  | "govern"
  | "security";

export interface ActionSpec {
  /** Past-tense phrase in the product's own words: "Restored from deleted items". */
  label: string;
  group: ActionGroup;
  /** One line explaining what the operation did, for the detail modal. */
  blurb: string;
  /**
   * The action REPLACED the bytes at `resource`.
   *
   * This is what makes a "before this action" revision meaningful: a write sits
   * BETWEEN two revisions, and the interesting one is the revision it overwrote.
   */
  writes?: boolean;
  /** `details.source` on this action is the SOURCE PATH, not an event origin. */
  sourceIsPath?: boolean;
  /** The agent's own tool vocabulary, as opposed to a console operation. */
  agentTool?: boolean;
}

/**
 * `source` MEANS TWO THINGS in the ledger and there is no way around it here.
 *
 * `VFS.move`/`copy` record `source=<the path it came from>`, while
 * `observability/action_audit` and `workspace_archive` record
 * `source="conversation"` — an event origin. Both land in the same `extra` bag.
 * Rather than rewrite one of them (and orphan every entry already in the chain),
 * the ambiguity is resolved by ACTION, which is deterministic: only these two
 * actions ever put a path there.
 */
const SOURCE_IS_PATH = true;

/**
 * Every audited operation this product performs on the artifact library.
 *
 * Grouped by where the action comes from, because that is how the surface reads:
 * a reviewer is either asking "what did WE do to this library" or "what did the
 * AGENT do", and those are different questions with different answers.
 */
const REGISTRY: Record<string, ActionSpec> = {
  /* ── looking: no bytes changed ───────────────────────────────────────── */
  vfs_list: {
    label: "Folder opened",
    group: "open",
    blurb: "A folder's contents were listed.",
  },
  vfs_stat: {
    label: "Item inspected",
    group: "open",
    blurb: "The size, type and version of one item were read.",
  },
  vfs_read: {
    label: "File opened",
    group: "open",
    blurb: "The file's current contents were read out of the store.",
  },
  vfs_history: {
    label: "Version history opened",
    group: "open",
    blurb: "The list of earlier revisions of this file was read.",
  },
  vfs_read_version: {
    label: "Earlier version viewed",
    group: "open",
    blurb:
      "One earlier revision was read WITHOUT restoring it — looking, not changing.",
  },
  vfs_metadata: {
    label: "Properties read",
    group: "open",
    blurb: "The store's own metadata and tags for this item were read.",
  },
  vfs_permissions: {
    label: "Permissions checked",
    group: "open",
    blurb:
      "The policy engine was asked what each principal may do to this item.",
  },

  /* ── creating and changing ───────────────────────────────────────────── */
  vfs_mkdir: {
    label: "Folder created",
    group: "create",
    blurb: "A new folder was added to the library.",
  },
  vfs_write: {
    label: "File saved",
    group: "change",
    blurb:
      "New bytes were written to this path, producing a new revision. If the path already existed, the revision before this entry is the one it overwrote.",
    writes: true,
  },
  office_write: {
    label: "Document saved from the editor",
    group: "change",
    blurb:
      "The document editor wrote the open document back into the library as a new revision.",
    writes: true,
  },

  /* ── organizing ──────────────────────────────────────────────────────── */
  vfs_move: {
    label: "Moved or renamed",
    group: "organize",
    blurb:
      "The item was relocated. Rename and relocate are ONE operation in this store, so a rename in place appears here too.",
    sourceIsPath: SOURCE_IS_PATH,
  },
  vfs_copy: {
    label: "Copied",
    group: "organize",
    blurb:
      "The item was duplicated to a second path. The original is untouched and keeps its own history.",
    sourceIsPath: SOURCE_IS_PATH,
  },

  /* ── sharing ─────────────────────────────────────────────────────────── */
  vfs_share_grant: {
    label: "Shared",
    group: "share",
    blurb:
      "Someone was granted access to this item. RECORDED AND AUDITED, not yet enforced — the policy engine still treats every console user as one trusted principal.",
  },
  vfs_share_revoke: {
    label: "Sharing revoked",
    group: "share",
    blurb: "A previously recorded grant on this item was withdrawn.",
  },

  /* ── removing ────────────────────────────────────────────────────────── */
  vfs_trash: {
    label: "Moved to deleted items",
    group: "remove",
    blurb:
      "The item left the library but is still recoverable from deleted items.",
  },
  vfs_delete: {
    label: "Deleted",
    group: "remove",
    blurb: "The item was removed from the library.",
  },

  /* ── recovering ──────────────────────────────────────────────────────── */
  vfs_untrash: {
    label: "Restored from deleted items",
    group: "recover",
    blurb: "A deleted item was put back at its original path.",
  },
  vfs_revert_file: {
    label: "Reverted to an earlier version",
    group: "recover",
    blurb:
      "An earlier revision was made current. This WRITES — the revision that was live immediately before it is what this action replaced.",
    writes: true,
  },
  vfs_checkpoint: {
    label: "Checkpoint created",
    group: "recover",
    blurb:
      "A named point in the whole library's history was marked, so everything can be brought back to this moment later.",
  },
  vfs_restore: {
    label: "Library restored to a checkpoint",
    group: "recover",
    blurb:
      "The WHOLE library was rolled back to a checkpoint. Library-wide and destructive — every path is affected, not just this one.",
  },
  workspace_archived: {
    label: "Workspace archived",
    group: "recover",
    blurb: "The conversation's workspace was packed and stored off-box.",
  },

  /* ── the agent's own tool vocabulary ──────────────────────────────────
   * These arrive from the conversation event stream rather than the VFS, so the
   * ids are the agent's tool names. Labelled as the agent's acts because that is
   * what a reviewer is looking for: not "a write happened" but "the agent wrote
   * this".
   */
  read_file: {
    label: "Agent read a file",
    group: "open",
    blurb: "The agent read a file in its sandbox.",
    agentTool: true,
  },
  write_file: {
    label: "Agent wrote a file",
    group: "change",
    blurb: "The agent wrote a file whole, replacing anything already there.",
    writes: true,
    agentTool: true,
  },
  edit_file: {
    label: "Agent edited a file",
    group: "change",
    blurb:
      "The agent changed part of an existing file. The revision immediately before this entry is the file as it stood when the agent opened it.",
    writes: true,
    agentTool: true,
  },
  str_replace: {
    label: "Agent replaced text in a file",
    group: "change",
    blurb:
      "The agent rewrote a matched span of an existing file, leaving the rest alone.",
    writes: true,
    agentTool: true,
  },
  run_command: {
    label: "Agent ran a command",
    group: "run",
    blurb: "A shell command was executed in the agent's sandbox.",
    agentTool: true,
  },
  execute_python: {
    label: "Agent executed Python",
    group: "run",
    blurb: "A Python cell was executed in the agent's sandbox kernel.",
    agentTool: true,
  },
  mcp_call: {
    label: "Agent called a tool",
    group: "run",
    blurb:
      "The agent invoked one of the platform's tools. A runtime trace, not a change to an artifact.",
    agentTool: true,
  },
  browse: {
    label: "Agent browsed a page",
    group: "run",
    blurb: "The agent fetched or interacted with a web page.",
    agentTool: true,
  },

  /* ── governance and safety ───────────────────────────────────────────── */
  "approval.approved": {
    label: "Approval granted",
    group: "govern",
    blurb: "A human approved an action the agent was holding on.",
  },
  "approval.denied": {
    label: "Approval refused",
    group: "govern",
    blurb: "A human refused an action the agent was holding on.",
  },
  "clarification.answered": {
    label: "Clarification answered",
    group: "govern",
    blurb: "A human answered a question the agent had paused for.",
  },
  "config.updated": {
    label: "Configuration changed",
    group: "govern",
    blurb: "A tenant configuration value was changed.",
  },
  "policy.override.created": {
    label: "Policy override created",
    group: "govern",
    blurb: "A policy decision was deliberately overridden for this tenant.",
  },
  "policy.override.revoked": {
    label: "Policy override revoked",
    group: "govern",
    blurb: "A standing policy override was withdrawn.",
  },
  "llm.quota.increase_requested": {
    label: "Model quota increase requested",
    group: "govern",
    blurb: "A limit increase was requested and recorded.",
  },
  "kill_switch.activated": {
    label: "Kill switch activated",
    group: "security",
    blurb: "Agent execution was halted for this tenant.",
  },
  "kill_switch.resumed": {
    label: "Kill switch released",
    group: "security",
    blurb: "Agent execution was allowed to resume.",
  },
  "erasure.requested": {
    label: "Data erasure requested",
    group: "security",
    blurb: "An erasure of this tenant's data was requested.",
  },
  "erasure.cancelled": {
    label: "Data erasure cancelled",
    group: "security",
    blurb: "A pending erasure request was withdrawn.",
  },
  tenant_erased: {
    label: "Tenant data erased",
    group: "security",
    blurb:
      "This tenant's data was destroyed. The final entry a tenant's chain can carry.",
  },
  "incident.opened": {
    label: "Incident opened",
    group: "security",
    blurb: "An incident record was created.",
  },
  "incident.status": {
    label: "Incident status changed",
    group: "security",
    blurb: "An incident moved to a new state.",
  },
  "incident.assigned": {
    label: "Incident assigned",
    group: "security",
    blurb: "An incident was given an owner.",
  },
  "incident.event": {
    label: "Incident note added",
    group: "security",
    blurb: "An entry was appended to an incident's timeline.",
  },
  "search.denied": {
    label: "Search refused",
    group: "security",
    blurb: "A search was refused before it ran.",
  },
  "search.index": {
    label: "Search index updated",
    group: "govern",
    blurb: "Documents were indexed for search.",
  },
  "search.logs": {
    label: "Logs searched",
    group: "open",
    blurb: "The log store was queried.",
  },
  report_scaffold: {
    label: "Report scaffolded",
    group: "create",
    blurb: "A report skeleton was generated for the agent to fill in.",
  },
  report_compile: {
    label: "Report compiled",
    group: "change",
    blurb: "A report source was compiled to its final document.",
    writes: true,
  },
  skill_list: {
    label: "Skills listed",
    group: "open",
    blurb: "The agent asked which skills are available to it.",
  },
  skill_body: {
    label: "Skill loaded",
    group: "open",
    blurb: "The agent loaded a skill's instructions.",
  },
  kg_query: {
    label: "Knowledge graph queried",
    group: "open",
    blurb: "The agent ran a query against the knowledge graph.",
  },
  sandbox_event: {
    label: "Sandbox event",
    group: "run",
    blurb: "The agent's sandbox reported a lifecycle event.",
  },
};

function titleCase(raw: string): string {
  const words = raw.replace(/[._-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Actions whose id is GENERATED, so they can never be table rows.
 *
 * `settings.<tab>.updated` and `<collection>.created` are built with an f-string
 * at the call site, which means the set is open — matching them by pattern is
 * the only correct option, and pretending otherwise would send every settings
 * change and every collection edit to the fallback.
 */
const PATTERNS: { test: RegExp; spec: (m: RegExpMatchArray) => ActionSpec }[] =
  [
    {
      test: /^settings\.(.+)\.updated$/,
      spec: (m) => ({
        label: `${titleCase(m[1])} settings changed`,
        group: "govern",
        blurb: `A value on the ${titleCase(m[1])} settings tab was changed.`,
      }),
    },
    {
      test: /^settings\.(.+)\.reset$/,
      spec: (m) => ({
        label: `${titleCase(m[1])} settings reset`,
        group: "govern",
        blurb: `The ${titleCase(m[1])} settings tab was returned to its defaults.`,
      }),
    },
    {
      test: /^(.+)\.created$/,
      spec: (m) => ({
        label: `${titleCase(m[1])} created`,
        group: "create",
        blurb: `A new ${titleCase(m[1]).toLowerCase()} record was added.`,
      }),
    },
    {
      test: /^(.+)\.updated$/,
      spec: (m) => ({
        label: `${titleCase(m[1])} updated`,
        group: "change",
        blurb: `An existing ${titleCase(m[1]).toLowerCase()} record was changed.`,
      }),
    },
    {
      test: /^(.+)\.removed$/,
      spec: (m) => ({
        label: `${titleCase(m[1])} removed`,
        group: "remove",
        blurb: `A ${titleCase(m[1]).toLowerCase()} record was deleted.`,
      }),
    },
  ];

export interface DescribedAction extends ActionSpec {
  /** The id as stored in the chain. Shown verbatim in the modal — this is an
   *  audit surface, and the reviewer must always be able to see the literal. */
  raw: string;
  unregistered: boolean;
}

/**
 * What one ledger action means, in words.
 *
 * NEVER THROWS AND NEVER RETURNS NOTHING. An audit surface that renders a blank
 * cell for an id it does not recognise is worse than one that renders the id:
 * the reviewer cannot tell "nothing happened" from "we failed to describe what
 * happened". An unregistered action gets its id humanised and is flagged so the
 * caller can say so out loud.
 */
export function describeAction(action: string): DescribedAction {
  const raw = action || "";
  const known = REGISTRY[raw];
  if (known) return { ...known, raw, unregistered: false };
  for (const p of PATTERNS) {
    const m = raw.match(p.test);
    if (m) return { ...p.spec(m), raw, unregistered: false };
  }
  return {
    label: titleCase(raw.replace(/^vfs_/, "")) || "Unknown action",
    group: "run",
    blurb: "This operation is not in the action registry yet.",
    raw,
    unregistered: true,
  };
}

/**
 * Row tints.
 *
 * Deliberately narrow: only the families a reviewer scans FOR are coloured —
 * things that removed data and things that touched safety controls. Painting all
 * ten groups would make the column a rainbow in which nothing stands out, which
 * is the same as painting none of them.
 */
export const GROUP_TINT: Record<ActionGroup, string> = {
  open: "text-[var(--cg-text-muted)]",
  create: "text-[var(--cg-text-nav)]",
  change: "text-[var(--cg-text-nav)]",
  organize: "text-[var(--cg-text-nav)]",
  share: "text-[var(--cg-text-nav)]",
  remove: "text-amber-400",
  recover: "text-[var(--cg-text-nav)]",
  run: "text-[var(--cg-text-muted)]",
  govern: "text-[var(--cg-text-nav)]",
  security: "text-amber-400",
};

/**
 * Whether `resource` is a path in a store at all.
 *
 * Half the ledger's resources are not files: a command line, a URL, a model
 * name, a checkpoint id. Rooting those at a store would invent a location the
 * entry does not have, and offering to open their "version history" would be a
 * dead end dressed as a feature.
 */
export function looksLikeStorePath(resource: string, action: string): boolean {
  const spec = describeAction(action);
  if (spec.group === "govern" || spec.group === "security") return false;
  if (spec.raw === "vfs_restore" || spec.raw === "vfs_checkpoint") return false;
  if (spec.raw === "mcp_call" || spec.raw === "browse") return false;
  if (spec.raw === "run_command" || spec.raw === "execute_python") return false;
  const path = resource || "";
  if (!path) return false;
  if (path.startsWith("http://") || path.startsWith("https://")) return false;
  return true;
}

/**
 * Where the thing this action touched lives, rooted at its store.
 *
 * A bare `resource` is ambiguous in exactly the way that matters: `report.md`
 * exists in the sandbox AND in the library, and those are different files with
 * different histories. Rooting the path at the store is how the rest of this
 * surface addresses a file (see the address bar in `files-browser`), so the
 * ledger uses the same spelling.
 */
export function rootedLocation(resource: string, store?: string): string {
  const path = resource || "";
  const cut = path.lastIndexOf("/");
  const parent = cut < 0 ? "" : path.slice(0, cut);
  // The store is only known for entries the VFS wrote since the tagging sink
  // landed. Older entries get the bare path rather than a guessed root — an
  // invented store name in an audit log is a lie with a plausible shape.
  if (!store) return parent || "/";
  return `${store}://${parent}`;
}

/** The last segment, which is what a person calls the thing. */
export function targetName(resource: string): string {
  const path = resource || "";
  const cut = path.lastIndexOf("/");
  return cut < 0 ? path : path.slice(cut + 1);
}

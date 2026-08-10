/**
 * Artifact Settings — the registry.
 *
 * Five views, each a set of groups, each a set of fields. The UI is one
 * renderer over this file: adding a setting is an edit HERE and nowhere else,
 * so the tab cannot show a control the resolver does not know about.
 *
 * **This tab is operational, not governance.** Platform Settings decide what is
 * permitted; Workspace Settings decide the team default; this decides how THIS
 * artifact runs, within both. The governing rule is that a field may TIGHTEN
 * but never LOOSEN — encoded per field as `tighten`, and enforced by showing
 * the inherited ceiling on every control that has one.
 *
 * See docs/settings/artifact-drawer/ for the full study behind these choices.
 */

export type FieldKind =
  | "toggle"
  | "select"
  | "number"
  | "text"
  | "chips"
  | "readonly"
  | "action";

/** Where the effective value came from — drives the provenance line. */
export type Provenance = "platform" | "workspace" | "artifact" | "derived";

export interface SettingField {
  key: string;
  label: string;
  /** One line under the label. Says what it does, not what it is. */
  hint?: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  unit?: string;
  min?: number;
  max?: number;
  /** Editable here at all. */
  editable: boolean;
  /** May narrow the inherited value, never widen it. */
  tighten?: boolean;
  /**
   * Set above and not editable here at any value. Carries WHO locked it —
   * "why can't I change this" has to be answerable in place.
   */
  lockedBy?: "Enterprise" | "Workspace" | "Always";
  /** Why it is locked. Rendered beside the lock. */
  lockReason?: string;
  /** Destructive — rendered in the danger treatment. */
  danger?: boolean;
  /** Applying needs a sandbox restart; said BEFORE the change, never after. */
  restart?: boolean;
}

export interface SettingGroup {
  id: string;
  label: string;
  hint?: string;
  fields: SettingField[];
}

export interface SettingsView {
  id: string;
  label: string;
  groups: SettingGroup[];
}

const g = (
  id: string,
  label: string,
  hint: string,
  fields: SettingField[],
): SettingGroup => ({ id, label, hint, fields });

/* ------------------------------------------------------------------ *
 * AI
 * ------------------------------------------------------------------ */

const AI: SettingsView = {
  id: "ai",
  label: "AI",
  groups: [
    g("model", "Model", "Which engine answers, and how much it may produce", [
      {
        key: "ai.model.profile",
        label: "Model profile",
        hint: "Chosen by need. The resolved model is shown below.",
        kind: "select",
        options: [
          { value: "fast", label: "Fast — short turnaround" },
          { value: "balanced", label: "Balanced — default" },
          { value: "deep", label: "Deep — long reasoning" },
        ],
        editable: true,
      },
      {
        key: "ai.model.resolved",
        label: "Resolved model",
        kind: "readonly",
        editable: false,
      },
      {
        key: "ai.model.maxOutputTokens",
        label: "Max output tokens",
        kind: "number",
        min: 1024,
        max: 32768,
        editable: true,
        tighten: true,
      },
      {
        key: "ai.model.streaming",
        label: "Stream responses",
        kind: "toggle",
        editable: true,
      },
      {
        key: "ai.model.promptCaching",
        label: "Prompt caching",
        hint: "Reuses the stable prefix across turns. Off for free-tier keys.",
        kind: "toggle",
        editable: true,
      },
    ]),
    g(
      "instructions",
      "Instructions",
      "What the agent is told before it sees your first message",
      [
        {
          key: "ai.instructions.systemPrompt",
          label: "System prompt",
          hint: "Platform-versioned. Editable here it would be an injection vector.",
          kind: "readonly",
          editable: false,
          lockedBy: "Enterprise",
          lockReason: "Versioned platform asset",
        },
        {
          key: "ai.instructions.custom",
          label: "Additional instructions",
          hint: "Applies to this artifact only. Cannot override safety rules.",
          kind: "text",
          editable: true,
        },
        {
          key: "ai.instructions.skillPacks",
          label: "Skill packs",
          kind: "chips",
          editable: true,
          tighten: true,
        },
      ],
    ),
    g("memory", "Memory", "What survives a long conversation", [
      {
        key: "ai.memory.autoCompact",
        label: "Auto-compact",
        hint: "Cannot be disabled — only its threshold moves. Without it the conversation hits the hard limit and fails mid-task.",
        kind: "toggle",
        editable: false,
        lockedBy: "Always",
        lockReason: "Disabling it fails the session rather than degrading it",
      },
      {
        key: "ai.memory.compactAtTokens",
        label: "Compact at",
        unit: "tokens",
        kind: "number",
        min: 50000,
        max: 400000,
        editable: true,
      },
      {
        key: "ai.memory.workingSet",
        label: "Re-inject working set",
        hint: "Scope, command ledger and confirmed findings survive a compact. Off, the agent re-derives — and re-runs discovery against live accounts.",
        kind: "toggle",
        editable: true,
      },
      {
        key: "ai.memory.persist",
        label: "Persist across sessions",
        kind: "toggle",
        editable: true,
      },
    ]),
    g("autonomy", "Autonomy", "How much it may do before asking", [
      {
        key: "ai.autonomy.mode",
        label: "Execution mode",
        kind: "select",
        options: [
          { value: "plan", label: "Plan — propose only, never execute" },
          { value: "ask", label: "Ask — execute reads, confirm writes" },
          { value: "autonomous", label: "Autonomous — no per-action prompt" },
        ],
        editable: true,
        tighten: true,
      },
      {
        key: "ai.autonomy.confirmReads",
        label: "Confirm read operations",
        kind: "toggle",
        editable: true,
      },
      {
        key: "ai.autonomy.confirmWrites",
        label: "Confirm write operations",
        kind: "toggle",
        editable: false,
        lockedBy: "Enterprise",
        lockReason: "Production scope in this artifact",
      },
      {
        key: "ai.autonomy.confirmDestructive",
        label: "Confirm destructive operations",
        hint: "Delete, terminate, revoke and rotate always stop for a human.",
        kind: "toggle",
        editable: false,
        lockedBy: "Always",
      },
      {
        key: "ai.autonomy.maxToolCalls",
        label: "Max tool calls per turn",
        kind: "number",
        min: 1,
        max: 100,
        editable: true,
        tighten: true,
      },
    ]),
    g("usage", "Usage", "What this artifact has consumed", [
      {
        key: "ai.usage.tokens",
        label: "Tokens",
        kind: "readonly",
        editable: false,
      },
      {
        key: "ai.usage.requests",
        label: "Requests",
        kind: "readonly",
        editable: false,
      },
      {
        key: "ai.usage.cacheHit",
        label: "Cache hit rate",
        kind: "readonly",
        editable: false,
      },
      {
        key: "ai.usage.quota",
        label: "Workspace quota",
        kind: "readonly",
        editable: false,
      },
    ]),
  ],
};

/* ------------------------------------------------------------------ *
 * Runtime
 * ------------------------------------------------------------------ */

const RUNTIME: SettingsView = {
  id: "runtime",
  label: "Runtime",
  groups: [
    g("health", "Health", "What you are running inside", [
      {
        key: "rt.health.status",
        label: "Status",
        kind: "readonly",
        editable: false,
      },
      {
        key: "rt.health.uptime",
        label: "Uptime",
        kind: "readonly",
        editable: false,
      },
      {
        key: "rt.health.restarts",
        label: "Restarts",
        kind: "readonly",
        editable: false,
      },
      {
        key: "rt.health.isolation",
        label: "Isolation tier",
        hint: "Granted by platform. A session cannot promote itself, and demoting would be a downgrade attack written as a preference.",
        kind: "readonly",
        editable: false,
        lockedBy: "Enterprise",
      },
      {
        key: "rt.health.attestation",
        label: "Attestation",
        kind: "readonly",
        editable: false,
      },
    ]),
    g("resources", "Resources", "Size and ceilings", [
      {
        key: "rt.res.profile",
        label: "Size profile",
        kind: "select",
        options: [
          { value: "s", label: "S — 1 vCPU / 2 GiB" },
          { value: "m", label: "M — 2 vCPU / 4 GiB" },
          { value: "l", label: "L — 4 vCPU / 8 GiB" },
          { value: "xl", label: "XL — 8 vCPU / 16 GiB" },
        ],
        editable: true,
        tighten: true,
        restart: true,
      },
      {
        key: "rt.res.usage",
        label: "Current usage",
        kind: "readonly",
        editable: false,
      },
      {
        key: "rt.res.idleTimeoutMin",
        label: "Idle timeout",
        unit: "min",
        hint: "A cost control and an exposure window at once.",
        kind: "number",
        min: 5,
        max: 240,
        editable: true,
        tighten: true,
      },
      {
        key: "rt.res.maxConcurrentTools",
        label: "Max concurrent tools",
        kind: "number",
        min: 1,
        max: 16,
        editable: true,
        tighten: true,
      },
      {
        key: "rt.res.commandTimeoutSec",
        label: "Command timeout",
        unit: "sec",
        kind: "number",
        min: 10,
        max: 900,
        editable: true,
        tighten: true,
      },
    ]),
    g("environment", "Environment", "Image, filesystem and packages", [
      {
        key: "rt.env.image",
        label: "Runtime image",
        hint: "Pinned by digest — a supply-chain control, not a preference.",
        kind: "readonly",
        editable: false,
        lockedBy: "Enterprise",
      },
      {
        key: "rt.env.persistence",
        label: "Workspace persistence",
        kind: "select",
        options: [
          { value: "ephemeral", label: "Ephemeral — discard on stop" },
          { value: "session", label: "Session — survives restart" },
          { value: "durable", label: "Durable — volume grant required" },
        ],
        editable: true,
        restart: true,
      },
      {
        key: "rt.env.wormEvidence",
        label: "WORM evidence",
        hint: "Locks on once this artifact produces evidence. Evidence that can be rewritten is not evidence.",
        kind: "toggle",
        editable: false,
        lockedBy: "Always",
        lockReason: "This artifact has produced evidence",
      },
      {
        key: "rt.env.packageInstall",
        label: "Package install",
        hint: "Mirror-only when enabled. A direct registry route is both an exfil channel and a supply-chain hole.",
        kind: "toggle",
        editable: true,
      },
    ]),
    g("activity", "Activity", "What has actually run", [
      {
        key: "rt.act.commands",
        label: "Commands executed",
        kind: "readonly",
        editable: false,
      },
      {
        key: "rt.act.processes",
        label: "Running processes",
        kind: "readonly",
        editable: false,
      },
      {
        key: "rt.act.lastCommand",
        label: "Last command",
        kind: "readonly",
        editable: false,
      },
      {
        key: "rt.act.securityEvents",
        label: "Security events",
        kind: "readonly",
        editable: false,
      },
    ]),
  ],
};

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

const CONTEXT: SettingsView = {
  id: "context",
  label: "Context",
  groups: [
    g("cloud", "Cloud", "Which estate this artifact can see", [
      {
        key: "ctx.cloud.accounts",
        label: "Connected accounts",
        kind: "chips",
        editable: true,
        tighten: true,
      },
      {
        key: "ctx.cloud.regions",
        label: "Regions",
        kind: "chips",
        editable: true,
        tighten: true,
      },
      {
        key: "ctx.cloud.credentials",
        label: "Credential broker",
        hint: "The sandbox holds no cloud credentials. Grants are minted per approval and expire.",
        kind: "readonly",
        editable: false,
        lockedBy: "Enterprise",
      },
      {
        key: "ctx.cloud.activeGrants",
        label: "Active grants",
        kind: "readonly",
        editable: false,
      },
    ]),
    g("knowledge", "Knowledge", "Reference data available to the agent", [
      {
        key: "ctx.kb.packs",
        label: "Knowledge packs",
        kind: "chips",
        editable: true,
        tighten: true,
      },
      {
        key: "ctx.kb.version",
        label: "KB version",
        kind: "readonly",
        editable: false,
      },
      {
        key: "ctx.kb.graphIndex",
        label: "Graph index",
        kind: "readonly",
        editable: false,
      },
      {
        key: "ctx.kb.retrievalDepth",
        label: "Retrieval depth",
        kind: "number",
        min: 1,
        max: 5,
        editable: true,
      },
    ]),
    g("development", "Development", "Where code changes land", [
      {
        key: "ctx.dev.repo",
        label: "Repository",
        kind: "select",
        options: [],
        editable: true,
      },
      {
        key: "ctx.dev.branch",
        label: "Base branch",
        kind: "text",
        editable: true,
      },
      {
        key: "ctx.dev.prTemplate",
        label: "PR template",
        kind: "select",
        options: [],
        editable: true,
      },
      {
        key: "ctx.dev.requireCi",
        label: "Require green CI",
        hint: "Merge is the execution trigger on the IaC path; a red CI merged is an unreviewed apply.",
        kind: "toggle",
        editable: false,
        lockedBy: "Workspace",
      },
    ]),
    g("operations", "Operations", "Where work is tracked", [
      {
        key: "ctx.ops.ticketSystem",
        label: "Ticket system",
        kind: "select",
        options: [],
        editable: true,
      },
      {
        key: "ctx.ops.project",
        label: "Project",
        kind: "text",
        editable: true,
      },
      {
        key: "ctx.ops.autoCreate",
        label: "Create ticket on proposal",
        kind: "toggle",
        editable: true,
      },
      {
        key: "ctx.ops.notify",
        label: "Notification channel",
        kind: "text",
        editable: true,
      },
    ]),
    g("permissions", "Permissions", "What this artifact is allowed to do", [
      {
        key: "ctx.perm.egress",
        label: "Network egress",
        hint: "One policy for the whole sandbox. Default deny.",
        kind: "select",
        options: [
          { value: "deny", label: "Deny — no outbound network" },
          { value: "broker", label: "Broker — platform endpoints only" },
          {
            value: "allowlist",
            label: "Allowlist — broker plus named destinations",
          },
          { value: "open", label: "Open — requires a platform grant" },
        ],
        editable: true,
        tighten: true,
      },
      {
        key: "ctx.perm.allowlist",
        label: "Allowed destinations",
        kind: "chips",
        editable: true,
        tighten: true,
      },
      {
        key: "ctx.perm.remediationCeiling",
        label: "Remediation ceiling",
        hint: "The most this artifact may do to the estate. Lowering it revokes approvals above the new ceiling.",
        kind: "select",
        options: [
          { value: "none", label: "None — read only" },
          { value: "advisory", label: "Advisory — propose only" },
          { value: "iac_pr", label: "IaC pull request" },
          { value: "typed", label: "Typed primitives" },
          { value: "cloud_api", label: "Cloud API" },
        ],
        editable: true,
        tighten: true,
      },
      {
        key: "ctx.perm.tools",
        label: "Enabled tools",
        kind: "chips",
        editable: true,
        tighten: true,
      },
      {
        key: "ctx.perm.role",
        label: "Your role",
        kind: "readonly",
        editable: false,
      },
    ]),
  ],
};

/* ------------------------------------------------------------------ *
 * Sharing
 * ------------------------------------------------------------------ */

const SHARING: SettingsView = {
  id: "sharing",
  label: "Sharing",
  groups: [
    g("visibility", "Visibility", "Who can reach this artifact", [
      {
        key: "sh.visibility",
        label: "Visibility",
        kind: "select",
        options: [
          { value: "private", label: "Private — only you" },
          { value: "workspace", label: "Workspace — anyone in the workspace" },
          { value: "org", label: "Organisation" },
        ],
        editable: true,
      },
      {
        key: "sh.classification",
        label: "Data classification",
        hint: "Derived from the assets in scope. Raises the redaction floor; may be raised, never lowered.",
        kind: "readonly",
        editable: false,
        lockedBy: "Enterprise",
      },
    ]),
    g("members", "Members", "Named access", [
      {
        key: "sh.members.list",
        label: "Members",
        kind: "chips",
        editable: true,
      },
      {
        key: "sh.members.owner",
        label: "Owner",
        kind: "readonly",
        editable: false,
      },
      {
        key: "sh.members.canEditSettings",
        label: "Who may change settings",
        kind: "select",
        options: [
          { value: "owner", label: "Owner only" },
          { value: "delegates", label: "Owner and delegates" },
        ],
        editable: true,
      },
    ]),
    g("links", "Links", "Unauthenticated access", [
      {
        key: "sh.links.enabled",
        label: "Share links",
        kind: "toggle",
        editable: true,
      },
      {
        key: "sh.links.expiry",
        label: "Link expiry",
        unit: "days",
        hint: "A link without an expiry is a permanent unauthenticated door.",
        kind: "number",
        min: 1,
        max: 90,
        editable: true,
      },
      {
        key: "sh.links.active",
        label: "Active links",
        kind: "readonly",
        editable: false,
      },
    ]),
    g("shared", "Shared resources", "What travels with a share", [
      {
        key: "sh.res.reports",
        label: "Reports",
        kind: "toggle",
        editable: true,
      },
      {
        key: "sh.res.evidence",
        label: "Evidence",
        kind: "toggle",
        editable: true,
      },
      {
        key: "sh.res.transcript",
        label: "Conversation transcript",
        hint: "Redaction always applies to a shared transcript.",
        kind: "toggle",
        editable: true,
      },
      {
        key: "sh.res.redaction",
        label: "Redaction on share",
        kind: "readonly",
        editable: false,
        lockedBy: "Always",
        lockReason: "Derived from data classification",
      },
    ]),
  ],
};

/* ------------------------------------------------------------------ *
 * Maintenance
 * ------------------------------------------------------------------ */

const MAINTENANCE: SettingsView = {
  id: "maintenance",
  label: "Maintenance",
  groups: [
    g("restart", "Restart", "Recycle the runtime, keep the work", [
      {
        key: "mt.restart",
        label: "Restart sandbox",
        hint: "Files and conversation survive. Running processes do not.",
        kind: "action",
        editable: true,
      },
      {
        key: "mt.rebuild",
        label: "Rebuild from image",
        hint: "Discards the writable layer — installed packages and untracked files are lost.",
        kind: "action",
        editable: true,
        danger: true,
      },
    ]),
    g("reset", "Reset", "Return to a known state", [
      {
        key: "mt.reset.settings",
        label: "Reset settings to inherited",
        kind: "action",
        editable: true,
      },
      {
        key: "mt.reset.memory",
        label: "Clear conversation memory",
        kind: "action",
        editable: true,
        danger: true,
      },
      {
        key: "mt.reset.workspace",
        label: "Purge workspace files",
        hint: "Blocked while a legal hold is active.",
        kind: "action",
        editable: true,
        danger: true,
      },
    ]),
    g("diagnostics", "Diagnostics", "Evidence for a support case", [
      {
        key: "mt.diag.run",
        label: "Run diagnostics",
        kind: "action",
        editable: true,
      },
      {
        key: "mt.diag.last",
        label: "Last run",
        kind: "readonly",
        editable: false,
      },
      {
        key: "mt.diag.bundle",
        label: "Download diagnostic bundle",
        kind: "action",
        editable: true,
      },
    ]),
    g("export", "Export", "Take the artifact with you", [
      {
        key: "mt.export.transcript",
        label: "Export transcript",
        kind: "action",
        editable: true,
      },
      {
        key: "mt.export.artifacts",
        label: "Export artifacts",
        kind: "action",
        editable: true,
      },
      {
        key: "mt.export.evidence",
        label: "Export evidence bundle",
        hint: "Signed manifest with chain proof. Redaction applies.",
        kind: "action",
        editable: true,
      },
    ]),
    g("delete", "Delete", "Irreversible", [
      {
        key: "mt.delete.artifact",
        label: "Delete this artifact",
        hint: "Retention and legal hold are enforced above this — deletion may be refused.",
        kind: "action",
        editable: true,
        danger: true,
      },
    ]),
  ],
};

export const SETTINGS_VIEWS: SettingsView[] = [
  AI,
  RUNTIME,
  CONTEXT,
  SHARING,
  MAINTENANCE,
];

/** Every field in the registry — used by search and by the reset action. */
export function allFields(): SettingField[] {
  return SETTINGS_VIEWS.flatMap((v) => v.groups.flatMap((grp) => grp.fields));
}

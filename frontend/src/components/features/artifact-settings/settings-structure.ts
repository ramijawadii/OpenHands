/**
 * Artifact Settings — the registry.
 *
 * Ten views, each a set of groups, each a set of fields. The UI is one renderer
 * over this file: adding a setting is an edit HERE and nowhere else, so the tab
 * cannot show a control the resolver does not know about.
 *
 * **This tab is operational, not governance.** Enterprise decides what is
 * permitted, the workspace narrows it for the team, and this decides how THIS
 * conversation runs inside both. The governing rule is that a field may TIGHTEN
 * but never LOOSEN — encoded per field as `tighten` (or `raiseOnly` for the
 * fields where a *higher* value is the stricter one), and made visible by
 * showing the inherited chain on every control that has one.
 *
 * Three kinds of thing live here and they are not interchangeable:
 *
 * - **Controls** — a value the operator sets, bounded above by inheritance.
 * - **Posture** — a truthful, unselectable statement of what the session is
 *   inside. Read-only by construction; making isolation look like a preference
 *   is how an operator comes to believe they chose it.
 * - **Ledgers** — tables of what actually happened (grants, traffic, kernels,
 *   commands). They sit beside the control that produced them, because the
 *   thing an operator does immediately after changing a network setting is look
 *   at what it blocked.
 *
 * See docs/settings/artifact-drawer/ for the study behind these choices.
 */

export type FieldKind =
  | "toggle"
  | "select"
  | "number"
  | "text"
  | "chips"
  | "readonly"
  | "table"
  | "action";

/**
 * The inheritance chain, in order. `conversation` is this tab.
 *
 * Four layers, not three: the workspace-admin model delegates a *narrowing*
 * step between the enterprise ceiling and the team default, and an operator who
 * cannot see which of the two bound them cannot tell who to ask. `derived` is
 * not a layer — it marks a value computed from live state rather than set.
 */
export type Scope =
  | "enterprise"
  | "business_unit"
  | "workspace"
  | "conversation"
  | "derived";

export interface TableColumn {
  key: string;
  label: string;
  /** Rendered monospace — identifiers, paths, digests, durations. */
  mono?: boolean;
  /** Right-aligned. Counts and sizes read better against a common edge. */
  numeric?: boolean;
  minWidth?: number;
}

export interface SettingField {
  key: string;
  label: string;
  /** One line under the label. Says what it does, not what it is. */
  hint?: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  columns?: TableColumn[];
  /**
   * Rows come from live state rather than the seed. Used where the table IS
   * the thing being described — the overrides this conversation holds, the
   * restart queue, the change log of this tab.
   */
  compute?: "overrides" | "restartQueue" | "changeLog" | "profileEffect";
  unit?: string;
  min?: number;
  max?: number;
  /** Rows shown before the "show all" expander. Unset = show everything. */
  maxRows?: number;
  /** Editable here at all. */
  editable: boolean;
  /** May narrow the inherited value, never widen it. */
  tighten?: boolean;
  /** May only strengthen — for fields where a higher value is the stricter one. */
  raiseOnly?: boolean;
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
  /** Collapsed on arrival. For depth an operator reaches for, not scans. */
  advanced?: boolean;
}

export interface SettingsView {
  id: string;
  label: string;
  /** One line under the panel title when this view is active. */
  hint: string;
  groups: SettingGroup[];
}

const g = (
  id: string,
  label: string,
  hint: string,
  fields: SettingField[],
  advanced = false,
): SettingGroup => ({ id, label, hint, fields, advanced });

/* ------------------------------------------------------------------ *
 * Quick — the operator's entry point
 * ------------------------------------------------------------------ */

/**
 * What an operator needs in two clicks, mid-incident.
 *
 * Of roughly 140 keys in this registry a live conversation typically overrides
 * three to five. Opening on the full tree and asking the operator to find them
 * is what makes settings tabs go unused, so the default view is the profile
 * picker, the overrides, and the posture the rest of the tab explains.
 */
const QUICK: SettingsView = {
  id: "quick",
  label: "Quick",
  hint: "The controls worth reaching for mid-session, and what this conversation has already changed",
  groups: [
    g(
      "profile",
      "Session profile",
      "One posture instead of twelve controls — always tighten-only, so switching is safe",
      [
        {
          key: "quick.profile",
          label: "Profile",
          hint: "Composes the controls below. A profile can never widen past what you inherit, so applying one is always safe.",
          kind: "select",
          options: [
            { value: "investigate", label: "Investigate — read-only" },
            { value: "author", label: "Author — documents and reports" },
            { value: "remediate_plan", label: "Remediate — plan only" },
            { value: "remediate_exec", label: "Remediate — execute" },
            { value: "custom", label: "Custom — set individually" },
          ],
          editable: true,
        },
        {
          key: "quick.profile.effect",
          label: "What this profile sets",
          hint: "Applying it changes only the rows that differ.",
          kind: "table",
          compute: "profileEffect",
          columns: [
            { key: "setting", label: "Setting", minWidth: 190 },
            { key: "profile", label: "Profile value", mono: true },
            { key: "current", label: "In force now", mono: true },
          ],
          editable: false,
        },
      ],
    ),
    g(
      "changed",
      "Changed here",
      "Everything this conversation set for itself — everything else is inherited",
      [
        {
          key: "quick.changed",
          label: "Overrides",
          kind: "table",
          compute: "overrides",
          columns: [
            { key: "setting", label: "Setting", minWidth: 200 },
            { key: "inherited", label: "Inherited", mono: true },
            { key: "here", label: "Set here", mono: true },
            { key: "direction", label: "Direction" },
          ],
          maxRows: 6,
          editable: false,
        },
      ],
    ),
    g(
      "posture",
      "Effective posture",
      "The four answers worth knowing before running anything",
      [
        {
          key: "quick.posture.isolation",
          label: "Isolation",
          kind: "readonly",
          editable: false,
        },
        {
          key: "quick.posture.egress",
          label: "Egress",
          kind: "readonly",
          editable: false,
        },
        {
          key: "quick.posture.ceiling",
          label: "Remediation ceiling",
          kind: "readonly",
          editable: false,
        },
        {
          key: "quick.posture.model",
          label: "Model",
          kind: "readonly",
          editable: false,
        },
      ],
    ),
    g(
      "restart",
      "Pending restart",
      "Restart-class changes batch into one restart, not one each",
      [
        {
          key: "quick.restart",
          label: "Queued for next start",
          kind: "table",
          compute: "restartQueue",
          columns: [
            { key: "setting", label: "Setting", minWidth: 200 },
            { key: "value", label: "Will apply", mono: true },
          ],
          editable: false,
        },
        {
          key: "quick.restart.apply",
          label: "Restart now and apply",
          hint: "The sandbox restarts; workspace files and the conversation are preserved.",
          kind: "action",
          editable: true,
          danger: true,
        },
      ],
    ),
  ],
};

/* ------------------------------------------------------------------ *
 * Session — the sandbox this conversation runs in
 * ------------------------------------------------------------------ */

const SESSION: SettingsView = {
  id: "session",
  label: "Session",
  hint: "The sandbox: what it is, how long it lives, what it may reach",
  groups: [
    g(
      "posture",
      "Posture",
      "What this session is inside. Granted by the platform, never chosen here",
      [
        {
          key: "session.posture.isolation",
          label: "Isolation tier",
          hint: "A platform grant. Shown, never selected — a picker here would let you believe you chose it.",
          kind: "readonly",
          editable: false,
          lockedBy: "Enterprise",
          lockReason: "Isolation is granted by the platform, not selected",
        },
        {
          key: "session.posture.tenancy",
          label: "Tenancy",
          hint: "Whether the node is shared with other tenants' sandboxes.",
          kind: "readonly",
          editable: false,
        },
        {
          key: "session.posture.memoryEncryption",
          label: "Memory encryption",
          hint: "When present, warm start is unavailable — encrypted memory and memory snapshots are mutually exclusive.",
          kind: "readonly",
          editable: false,
        },
        {
          key: "session.posture.attestation",
          label: "Attestation",
          kind: "readonly",
          editable: false,
        },
        {
          key: "session.posture.image",
          label: "Runtime image",
          hint: "Pinned by digest. The supply-chain anchor for everything that runs here.",
          kind: "readonly",
          editable: false,
        },
        {
          key: "session.posture.hardening",
          label: "Kernel hardening",
          kind: "readonly",
          editable: false,
          lockedBy: "Enterprise",
          lockReason: "Platform floor",
        },
        {
          key: "session.posture.boot",
          label: "Boot profile",
          hint: "The cost of a restart, and the trade behind the idle timeout below.",
          kind: "readonly",
          editable: false,
        },
        {
          key: "session.posture.health",
          label: "Session health",
          kind: "readonly",
          editable: false,
        },
      ],
    ),
    g(
      "lifecycle",
      "Lifecycle",
      "Idle time is both a cost and an exposure window",
      [
        {
          key: "session.life.idleTimeoutMin",
          label: "Idle timeout",
          hint: "A sandbox left running is a sandbox someone can come back to.",
          kind: "number",
          unit: "min",
          min: 5,
          max: 240,
          editable: true,
          tighten: true,
        },
        {
          key: "session.life.maxDurationMin",
          label: "Max session duration",
          kind: "number",
          unit: "min",
          min: 30,
          max: 1440,
          editable: true,
          tighten: true,
        },
        {
          key: "session.life.warmStart",
          label: "Warm start",
          hint: "Resumes from a memory snapshot. Unavailable under memory encryption.",
          kind: "toggle",
          editable: true,
          restart: true,
        },
        {
          key: "session.life.autoResume",
          label: "Auto-resume on return",
          kind: "toggle",
          editable: true,
        },
        {
          key: "session.life.stopOnDisconnect",
          label: "Stop on disconnect",
          kind: "toggle",
          editable: true,
        },
        {
          key: "session.life.neverExpire",
          label: "Never expire",
          kind: "toggle",
          editable: false,
          lockedBy: "Enterprise",
          lockReason: "Not offered at conversation scope",
        },
      ],
    ),
    g(
      "resources",
      "Resources",
      "Size, and the limits that stop one runaway step taking the session with it",
      [
        {
          key: "session.res.profile",
          label: "Size profile",
          kind: "select",
          options: [
            { value: "s", label: "S — 1 vCPU · 2 GiB" },
            { value: "m", label: "M — 2 vCPU · 4 GiB" },
            { value: "l", label: "L — 4 vCPU · 8 GiB" },
            { value: "xl", label: "XL — 8 vCPU · 16 GiB" },
          ],
          editable: true,
          tighten: true,
          restart: true,
        },
        {
          key: "session.res.usage",
          label: "In use now",
          kind: "readonly",
          editable: false,
        },
        {
          key: "session.res.maxConcurrentTools",
          label: "Max concurrent tools",
          hint: "Bounds runaway fan-out — one plan step spawning forty calls.",
          kind: "number",
          min: 1,
          max: 16,
          editable: true,
          tighten: true,
        },
        {
          key: "session.res.maxProcesses",
          label: "Max processes",
          kind: "number",
          min: 8,
          max: 512,
          editable: true,
          tighten: true,
        },
        {
          key: "session.res.commandTimeoutSec",
          label: "Command timeout",
          kind: "number",
          unit: "sec",
          min: 10,
          max: 900,
          editable: true,
          tighten: true,
        },
        {
          key: "session.res.maxOutputMb",
          label: "Max command output",
          hint: "Truncates. Never fails the command — a truncated result is still a result.",
          kind: "number",
          unit: "MB",
          min: 1,
          max: 64,
          editable: true,
          tighten: true,
        },
      ],
    ),
    g(
      "advanced",
      "Resources · advanced",
      "Individual limits, when the size profile is the wrong shape",
      [
        {
          key: "session.res.vcpu",
          label: "vCPU",
          kind: "number",
          min: 1,
          max: 8,
          editable: true,
          tighten: true,
          restart: true,
        },
        {
          key: "session.res.memoryGb",
          label: "Memory",
          kind: "number",
          unit: "GiB",
          min: 2,
          max: 16,
          editable: true,
          tighten: true,
          restart: true,
        },
        {
          key: "session.res.diskGb",
          label: "Disk",
          kind: "number",
          unit: "GiB",
          min: 10,
          max: 200,
          editable: true,
          tighten: true,
          restart: true,
        },
        {
          key: "session.res.gpu",
          label: "GPU",
          kind: "readonly",
          editable: false,
          lockedBy: "Enterprise",
          lockReason: "Requires a platform grant this workspace does not hold",
        },
      ],
      true,
    ),
    g(
      "filesystem",
      "Filesystem",
      "What persists, how much, and what can no longer be deleted",
      [
        {
          key: "session.fs.persistence",
          label: "Persistence",
          kind: "select",
          options: [
            { value: "ephemeral", label: "Ephemeral — discarded on stop" },
            {
              value: "session",
              label: "Session — kept while the session lives",
            },
            { value: "durable", label: "Durable — survives restarts" },
          ],
          editable: true,
          restart: true,
        },
        {
          key: "session.fs.writablePaths",
          label: "Writable paths",
          kind: "chips",
          editable: true,
          tighten: true,
        },
        {
          key: "session.fs.maxFileMb",
          label: "Max file size",
          kind: "number",
          unit: "MB",
          min: 1,
          max: 2048,
          editable: true,
          tighten: true,
        },
        {
          key: "session.fs.maxTotalGb",
          label: "Max total size",
          hint: "Bounded by the disk allocation above.",
          kind: "number",
          unit: "GiB",
          min: 1,
          max: 200,
          editable: true,
          tighten: true,
        },
        {
          key: "session.fs.worm",
          label: "WORM evidence",
          kind: "toggle",
          editable: false,
          lockedBy: "Always",
          lockReason:
            "Locked on once evidence exists — it cannot be turned back off",
        },
        {
          key: "session.fs.mounts",
          label: "Mounts",
          kind: "table",
          columns: [
            { key: "path", label: "Path", mono: true, minWidth: 170 },
            { key: "source", label: "Source", mono: true },
            { key: "mode", label: "Mode" },
            { key: "why", label: "Why", minWidth: 190 },
          ],
          editable: false,
        },
      ],
    ),
    g(
      "network",
      "Network",
      "One policy for the whole sandbox — Chat and Canvas do not have their own",
      [
        {
          key: "session.net.mode",
          label: "Egress mode",
          hint: "Which destinations the sandbox may reach at all.",
          kind: "select",
          options: [
            { value: "deny", label: "Deny — no egress" },
            { value: "broker", label: "Broker — platform endpoints only" },
            {
              value: "allowlist",
              label: "Allowlist — broker plus the list below",
            },
            { value: "open", label: "Open" },
          ],
          editable: true,
          tighten: true,
        },
        {
          key: "session.net.domains",
          label: "Allowed domains",
          hint: "A subset of the workspace list. No free text — a destination nobody approved is not a destination.",
          kind: "chips",
          editable: true,
          tighten: true,
        },
        {
          key: "session.net.cidrs",
          label: "Allowed CIDRs",
          kind: "chips",
          editable: true,
          tighten: true,
        },
        {
          key: "session.net.registries",
          label: "Package registries",
          kind: "chips",
          editable: false,
          lockedBy: "Enterprise",
          lockReason: "Platform mirrors only",
        },
        {
          key: "session.net.broker",
          label: "Broker endpoints",
          hint: "Reachable in every mode including deny — this is how the agent works without credentials.",
          kind: "readonly",
          editable: false,
        },
        {
          key: "session.net.tlsInspection",
          label: "TLS inspection",
          kind: "readonly",
          editable: false,
        },
        {
          key: "session.net.dnsMode",
          label: "DNS resolver",
          kind: "select",
          options: [
            { value: "platform", label: "Platform resolver" },
            { value: "passthrough", label: "Passthrough" },
          ],
          editable: true,
          tighten: true,
        },
        {
          key: "session.net.blockDoh",
          label: "Block DNS-over-HTTPS",
          kind: "toggle",
          editable: false,
          lockedBy: "Always",
          lockReason: "Without it the allowlist is decorative",
        },
        {
          key: "session.net.onBlocked",
          label: "On blocked request",
          kind: "select",
          options: [
            { value: "fail", label: "Fail the call" },
            { value: "prompt", label: "Ask me — unavailable during a write" },
          ],
          editable: true,
        },
        {
          key: "session.net.oneOffTtlMin",
          label: "One-off allowance TTL",
          kind: "number",
          unit: "min",
          min: 1,
          max: 120,
          editable: true,
          tighten: true,
        },
      ],
    ),
    g(
      "traffic",
      "Live traffic",
      "What the policy above actually did, this session",
      [
        {
          key: "session.net.traffic",
          label: "Destinations",
          kind: "table",
          columns: [
            { key: "dest", label: "Destination", mono: true, minWidth: 200 },
            { key: "verdict", label: "Verdict" },
            { key: "requests", label: "Requests", numeric: true },
            { key: "volume", label: "Volume", numeric: true, mono: true },
            { key: "first", label: "First seen", mono: true },
          ],
          maxRows: 6,
          editable: false,
        },
      ],
    ),
    g(
      "identity",
      "Identity & credentials",
      "The sandbox holds no standing credentials — this section exists to prove it",
      [
        {
          key: "session.id.identity",
          label: "Sandbox identity",
          kind: "readonly",
          editable: false,
        },
        {
          key: "session.id.broker",
          label: "Credential broker",
          kind: "readonly",
          editable: false,
        },
        {
          key: "session.id.grants",
          label: "Active grants",
          kind: "table",
          columns: [
            { key: "grant", label: "Grant", mono: true, minWidth: 170 },
            { key: "scope", label: "Scope", minWidth: 180 },
            { key: "issued", label: "Issued for" },
            { key: "ttl", label: "Expires in", mono: true, numeric: true },
          ],
          maxRows: 6,
          editable: false,
        },
        {
          key: "session.id.revokeAll",
          label: "Revoke all grants",
          hint: "In-flight calls holding a revoked grant fail immediately.",
          kind: "action",
          editable: true,
          danger: true,
        },
      ],
    ),
  ],
};

/* ------------------------------------------------------------------ *
 * Chat
 * ------------------------------------------------------------------ */

const CHAT: SettingsView = {
  id: "chat",
  label: "Chat",
  hint: "Which engine answers, how much autonomy it has, and how much it remembers",
  groups: [
    g("model", "Model", "Which engine answers, and how much it may produce", [
      {
        key: "chat.model.profile",
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
        key: "chat.model.resolved",
        label: "Resolved model",
        kind: "readonly",
        editable: false,
      },
      {
        key: "chat.model.maxOutputTokens",
        label: "Max output tokens",
        kind: "number",
        min: 1024,
        max: 32768,
        editable: true,
        tighten: true,
      },
      {
        key: "chat.model.streaming",
        label: "Stream responses",
        kind: "toggle",
        editable: true,
      },
      {
        key: "chat.model.promptCaching",
        label: "Prompt caching",
        hint: "Reuses the stable prefix across turns. Off for free-tier keys.",
        kind: "toggle",
        editable: true,
      },
    ]),
    g(
      "execution",
      "Execution",
      "How far the agent may act before it comes back to you",
      [
        {
          key: "chat.exec.mode",
          label: "Execution mode",
          kind: "select",
          options: [
            { value: "manual", label: "Manual — I run each step" },
            {
              value: "edit_auto",
              label: "Edit auto — edits apply, actions ask",
            },
            { value: "plan", label: "Plan — propose, never act" },
            {
              value: "autonomous",
              label: "Autonomous — act within the ceiling",
            },
          ],
          editable: true,
          tighten: true,
        },
        {
          key: "chat.exec.maxToolCalls",
          label: "Max tool calls per turn",
          kind: "number",
          min: 1,
          max: 100,
          editable: true,
          tighten: true,
        },
        {
          key: "chat.exec.confirmWrites",
          label: "Confirm before writes",
          kind: "toggle",
          editable: false,
          lockedBy: "Enterprise",
          lockReason: "Write confirmation is a tenant floor",
        },
        {
          key: "chat.exec.confirmDestructive",
          label: "Confirm before destructive actions",
          kind: "toggle",
          editable: false,
          lockedBy: "Enterprise",
          lockReason: "Destructive confirmation is a tenant floor",
        },
      ],
    ),
    g(
      "context",
      "Context",
      "What survives a long session, and what gets compacted away",
      [
        {
          key: "chat.ctx.displayCapTokens",
          label: "Display cap",
          hint: "Above this the transcript compacts. Raising it costs latency on every turn.",
          kind: "number",
          min: 50000,
          max: 400000,
          editable: true,
        },
        {
          key: "chat.ctx.autoCompact",
          label: "Auto-compact",
          kind: "toggle",
          editable: false,
          lockedBy: "Enterprise",
          lockReason:
            "Without it a long session ends in a hard context failure",
        },
        {
          key: "chat.ctx.workingSet",
          label: "Working-set injection",
          hint: "Re-injects scope, command ledger and findings after a compaction.",
          kind: "toggle",
          editable: true,
        },
        {
          key: "chat.ctx.persist",
          label: "Persist context across sessions",
          kind: "toggle",
          editable: true,
        },
      ],
    ),
    g(
      "safety",
      "Instructions & screening",
      "What the agent is told before your first message, and what is filtered",
      [
        {
          key: "chat.safety.systemPrompt",
          label: "System prompt",
          hint: "Platform-versioned. Editable here it would be an injection vector.",
          kind: "readonly",
          editable: false,
          lockedBy: "Enterprise",
          lockReason: "Versioned platform asset",
        },
        {
          key: "chat.safety.custom",
          label: "Additional instructions",
          hint: "Applies to this conversation only. Cannot override safety rules.",
          kind: "text",
          editable: true,
        },
        {
          key: "chat.safety.inputScreening",
          label: "Prompt-injection screening",
          kind: "toggle",
          editable: false,
          lockedBy: "Always",
          lockReason:
            "Ingested cloud data is attacker-reachable; screening cannot be disabled",
        },
        {
          key: "chat.safety.outputFilter",
          label: "Output filtering",
          kind: "toggle",
          editable: false,
          lockedBy: "Always",
          lockReason: "Prevents internal identifiers leaving the tenant",
        },
      ],
    ),
  ],
};

/* ------------------------------------------------------------------ *
 * Tools & catalogs
 * ------------------------------------------------------------------ */

const TOOLS: SettingsView = {
  id: "tools",
  label: "Tools & catalogs",
  hint: "What the agent can invoke and what it can reach — across every tab, not just Chat",
  groups: [
    g(
      "catalog",
      "Command catalog",
      "The commands this session may invoke, and which of them stop for approval",
      [
        {
          key: "tools.cat.groups",
          label: "Enabled command groups",
          kind: "chips",
          editable: true,
          tighten: true,
        },
        {
          key: "tools.cat.commands",
          label: "Catalog",
          kind: "table",
          columns: [
            { key: "group", label: "Group", minWidth: 150 },
            { key: "commands", label: "Commands", numeric: true },
            { key: "tier", label: "Risk tier" },
            { key: "route", label: "Gated by", minWidth: 170 },
          ],
          editable: false,
        },
        {
          key: "tools.cat.neverOffer",
          label: "Suppressed for this session",
          hint: "Removed from the agent's surface entirely — it will not propose them.",
          kind: "chips",
          editable: true,
          raiseOnly: true,
        },
      ],
    ),
    g("skills", "Skill packs", "Which playbooks the agent draws on", [
      {
        key: "tools.skills.packs",
        label: "Enabled packs",
        kind: "chips",
        editable: true,
        tighten: true,
      },
      {
        key: "tools.skills.resolution",
        label: "Dispatch source",
        kind: "readonly",
        editable: false,
      },
    ]),
    g(
      "mcp",
      "MCP servers",
      "Installed by the workspace; scoped down here. Approval is never granted from this tab",
      [
        {
          key: "tools.mcp.servers",
          label: "Available to this session",
          kind: "table",
          columns: [
            { key: "server", label: "Server", mono: true, minWidth: 160 },
            { key: "tools", label: "Tools", numeric: true },
            { key: "tier", label: "Highest tier" },
            { key: "used", label: "Used by", minWidth: 160 },
          ],
          editable: false,
        },
        {
          key: "tools.mcp.enabled",
          label: "Enabled for this session",
          kind: "chips",
          editable: true,
          tighten: true,
        },
        {
          key: "tools.mcp.install",
          label: "Install or approve a server",
          kind: "readonly",
          editable: false,
          lockedBy: "Workspace",
          lockReason:
            "New servers enter through workspace admin review, not a session control",
        },
      ],
    ),
    g(
      "connectors",
      "Cloud connectors",
      "Action connectors can be invoked by the agent; ingestion connectors only feed the inventory",
      [
        {
          key: "tools.conn.action",
          label: "Action connectors",
          hint: "Each can be narrowed to read-only for this session, never widened.",
          kind: "table",
          columns: [
            { key: "connector", label: "Connector", minWidth: 160 },
            { key: "scope", label: "Scope here" },
            { key: "ceiling", label: "Workspace grants" },
            { key: "health", label: "Health" },
            { key: "expires", label: "Auth expires", mono: true },
          ],
          editable: false,
        },
        {
          key: "tools.conn.scope",
          label: "Narrow to read-only",
          hint: "Applies to every action connector above for the rest of this session.",
          kind: "toggle",
          editable: true,
          raiseOnly: true,
        },
        {
          key: "tools.conn.ingestion",
          label: "Ingestion connectors",
          hint: "Passive. Lag matters because a stale feed produces confident wrong answers.",
          kind: "table",
          columns: [
            { key: "feed", label: "Feed", minWidth: 180 },
            { key: "lag", label: "Lag", mono: true },
            { key: "last", label: "Last record", mono: true },
            { key: "health", label: "Health" },
          ],
          editable: false,
        },
      ],
    ),
  ],
};

/* ------------------------------------------------------------------ *
 * Canvas
 * ------------------------------------------------------------------ */

const CANVAS: SettingsView = {
  id: "canvas",
  label: "Canvas",
  hint: "The four editors and the runtimes behind them",
  groups: [
    g(
      "editors",
      "Editors",
      "Keep-alive so switching is instant, bounded so memory cannot grow without limit",
      [
        {
          key: "canvas.editors.defaultView",
          label: "Opens on",
          kind: "select",
          options: [
            { value: "documents", label: "Documents" },
            { value: "sheet", label: "Sheet" },
            { value: "notebook", label: "Notebook" },
            { value: "whiteboard", label: "Whiteboard" },
          ],
          editable: true,
        },
        {
          key: "canvas.editors.enabled",
          label: "Enabled editors",
          kind: "chips",
          editable: true,
          tighten: true,
        },
        {
          key: "canvas.editors.maxResident",
          label: "Max resident panes",
          hint: "Each pane is a whole editor app. This is the control that decides whether the tab reaches multi-GB.",
          kind: "number",
          min: 1,
          max: 6,
          editable: true,
          tighten: true,
        },
        {
          key: "canvas.editors.memory",
          label: "Editor memory now",
          kind: "readonly",
          editable: false,
        },
        {
          key: "canvas.editors.evictAfterMin",
          label: "Evict hidden pane after",
          kind: "number",
          unit: "min",
          min: 1,
          max: 60,
          editable: true,
        },
        {
          key: "canvas.editors.prewarmOnHover",
          label: "Prewarm on hover",
          kind: "toggle",
          editable: true,
        },
      ],
    ),
    g(
      "autosave",
      "Autosave & versions",
      "An evidence document whose intermediate states were never captured cannot support a claim",
      [
        {
          key: "canvas.autosave.enabled",
          label: "Autosave",
          kind: "toggle",
          editable: false,
          lockedBy: "Always",
          lockReason:
            "This conversation's documents are cited as report evidence",
        },
        {
          key: "canvas.autosave.intervalSec",
          label: "Autosave interval",
          kind: "number",
          unit: "sec",
          min: 10,
          max: 300,
          editable: true,
        },
        {
          key: "canvas.versions.keep",
          label: "Versions kept",
          kind: "number",
          min: 5,
          max: 100,
          editable: true,
        },
        {
          key: "canvas.versions.onExport",
          label: "Snapshot on export",
          kind: "toggle",
          editable: true,
        },
      ],
    ),
    g(
      "documents",
      "Documents",
      "The word processor, and the agent's reach into it",
      [
        {
          key: "canvas.doc.agentMayEdit",
          label: "Agent may edit documents",
          kind: "toggle",
          editable: true,
        },
        {
          key: "canvas.doc.liveEditing",
          label: "Live co-editing",
          hint: "The agent drives the editor you have open, rather than writing the file behind it.",
          kind: "toggle",
          editable: true,
        },
        {
          key: "canvas.doc.confirmBeforeOverwrite",
          label: "Confirm before overwriting my edits",
          hint: "Without it an agent regenerating a document while you type silently wins.",
          kind: "toggle",
          editable: true,
        },
        {
          key: "canvas.doc.branding",
          label: "Editor branding",
          kind: "readonly",
          editable: false,
          lockedBy: "Enterprise",
          lockReason: "Licence-bound",
        },
      ],
    ),
    g(
      "sheet",
      "Sheet",
      "Spreadsheet limits, and the one thing that is never permitted",
      [
        {
          key: "canvas.sheet.maxRows",
          label: "Max rows",
          kind: "number",
          min: 1000,
          max: 500000,
          editable: true,
          tighten: true,
        },
        {
          key: "canvas.sheet.importMaxMb",
          label: "Max import size",
          kind: "number",
          unit: "MB",
          min: 1,
          max: 200,
          editable: true,
          tighten: true,
        },
        {
          key: "canvas.sheet.formulaEngine",
          label: "Formula engine",
          kind: "readonly",
          editable: false,
        },
        {
          key: "canvas.sheet.externalRefs",
          label: "External references in formulas",
          kind: "toggle",
          editable: false,
          lockedBy: "Always",
          lockReason:
            "A formula that resolves a URL is an egress path around the allowlist",
        },
      ],
    ),
    g(
      "notebook",
      "Notebook",
      "Kernels are the most expensive thing the Canvas can hold",
      [
        {
          key: "canvas.nb.kernelImage",
          label: "Kernel image",
          kind: "select",
          options: [
            { value: "python-3.12-sec", label: "python-3.12-sec — default" },
            { value: "python-3.12-data", label: "python-3.12-data" },
          ],
          editable: true,
          tighten: true,
          restart: true,
        },
        {
          key: "canvas.nb.maxKernels",
          label: "Max kernels",
          kind: "number",
          min: 1,
          max: 8,
          editable: true,
          tighten: true,
        },
        {
          key: "canvas.nb.idleReapMin",
          label: "Reap idle kernel after",
          hint: "Cannot be disabled — an abandoned kernel holds memory and whatever was in its namespace.",
          kind: "number",
          unit: "min",
          min: 2,
          max: 60,
          editable: true,
          tighten: true,
        },
        {
          key: "canvas.nb.execTimeoutSec",
          label: "Cell execution timeout",
          kind: "number",
          unit: "sec",
          min: 10,
          max: 900,
          editable: true,
          tighten: true,
        },
        {
          key: "canvas.nb.maxOutputMb",
          label: "Max cell output",
          kind: "number",
          unit: "MB",
          min: 1,
          max: 64,
          editable: true,
          tighten: true,
        },
        {
          key: "canvas.nb.packageInstall",
          label: "Allow package install",
          hint: "When on, resolves only through the platform mirror and every install is logged with its resolved hash.",
          kind: "toggle",
          editable: true,
        },
        {
          key: "canvas.nb.kernels",
          label: "Live kernels",
          kind: "table",
          columns: [
            { key: "kernel", label: "Kernel", mono: true, minWidth: 140 },
            { key: "notebook", label: "Notebook", mono: true, minWidth: 170 },
            { key: "memory", label: "Memory", numeric: true, mono: true },
            { key: "idle", label: "Idle", numeric: true, mono: true },
          ],
          editable: false,
        },
      ],
    ),
    g(
      "whiteboard",
      "Whiteboard & diagrams",
      "Diagram fidelity, and no external fetches",
      [
        {
          key: "canvas.dia.shapeCatalog",
          label: "Shape catalog",
          hint: "Strict rejects icons outside the catalog — an agent free-handing shape references produces diagrams that cite shapes which do not exist.",
          kind: "select",
          options: [
            { value: "strict", label: "Strict — catalog only" },
            { value: "permissive", label: "Permissive" },
          ],
          editable: true,
        },
        {
          key: "canvas.dia.templateLibrary",
          label: "Reference template library",
          kind: "toggle",
          editable: true,
        },
        {
          key: "canvas.dia.exportFormats",
          label: "Export formats",
          kind: "chips",
          editable: true,
          tighten: true,
        },
        {
          key: "canvas.dia.remoteAssets",
          label: "Remote image assets",
          kind: "toggle",
          editable: false,
          lockedBy: "Always",
          lockReason:
            "An external image fetch is egress the allowlist never sees",
        },
      ],
    ),
  ],
};

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

const REPORT: SettingsView = {
  id: "report",
  label: "Report",
  hint: "What this conversation produces, in what shape, and what is stripped before it leaves",
  groups: [
    g("output", "Template & output", "The shape of what gets produced", [
      {
        key: "report.template",
        label: "Template",
        kind: "select",
        options: [
          { value: "assessment", label: "Assessment" },
          { value: "incident", label: "Incident report" },
          { value: "remediation", label: "Remediation summary" },
          { value: "audit", label: "Audit pack" },
        ],
        editable: true,
        tighten: true,
      },
      {
        key: "report.formats",
        label: "Output formats",
        kind: "chips",
        editable: true,
        tighten: true,
      },
      {
        key: "report.diagramSource",
        label: "Diagram source",
        hint: "Diagrams compile from the catalog rather than fetching rendered images.",
        kind: "readonly",
        editable: false,
      },
      {
        key: "report.compileGate",
        label: "Compile gate",
        hint: "A report that fails its own structural checks is not produced.",
        kind: "readonly",
        editable: false,
        lockedBy: "Enterprise",
        lockReason: "Structural enforcement is a platform control",
      },
    ]),
    g(
      "evidence",
      "Evidence & redaction",
      "What travels with the report, and what does not",
      [
        {
          key: "report.evidenceManifest",
          label: "Attach evidence manifest",
          kind: "toggle",
          editable: false,
          lockedBy: "Always",
          lockReason: "A report without its manifest cannot be relied on later",
        },
        {
          key: "report.redaction",
          label: "Redaction profile",
          hint: "One profile governs every exit. Change it under Data.",
          kind: "readonly",
          editable: false,
        },
        {
          key: "report.retention",
          label: "Report retention",
          kind: "readonly",
          editable: false,
        },
      ],
    ),
  ],
};

/* ------------------------------------------------------------------ *
 * Remediation
 * ------------------------------------------------------------------ */

const REMEDIATION: SettingsView = {
  id: "remediation",
  label: "Remediation",
  hint: "How far this conversation may act on the estate, and what stops it",
  groups: [
    g(
      "ceiling",
      "Execution ceiling",
      "The furthest this conversation may go, whatever it proposes",
      [
        {
          key: "rem.ceiling",
          label: "Ceiling",
          kind: "select",
          options: [
            { value: "none", label: "None — propose only" },
            { value: "iac_pr", label: "IaC pull request" },
            { value: "canary", label: "Canary — bounded live change" },
            { value: "execute", label: "Execute — full apply" },
          ],
          editable: true,
          tighten: true,
        },
        {
          key: "rem.canaryRequired",
          label: "Require a canary first",
          kind: "toggle",
          editable: true,
          raiseOnly: true,
        },
        {
          key: "rem.brrFreshness",
          label: "Blast-radius report freshness",
          hint: "Older than this, execution re-runs the simulation rather than trusting it.",
          kind: "readonly",
          editable: false,
          lockedBy: "Enterprise",
          lockReason:
            "The execution contract's expiry is not a session setting",
        },
      ],
    ),
    g(
      "approvals",
      "Approvals",
      "Who has to agree before an action with real-world effect runs",
      [
        {
          key: "rem.quorum",
          label: "Required quorum",
          kind: "readonly",
          editable: false,
          lockedBy: "Enterprise",
          lockReason: "Quorum is tenant policy",
        },
        {
          key: "rem.additionalApprovers",
          label: "Additional approvers",
          hint: "Adds to the required quorum. You may add, never remove.",
          kind: "chips",
          editable: true,
          raiseOnly: true,
        },
        {
          key: "rem.approvalTimeoutMin",
          label: "Approval timeout",
          hint: "On expiry the action is abandoned, never auto-approved.",
          kind: "number",
          unit: "min",
          min: 5,
          max: 480,
          editable: true,
          tighten: true,
        },
      ],
    ),
    g(
      "integrations",
      "Where changes land",
      "The repository and tracker this conversation writes to",
      [
        {
          key: "rem.repo",
          label: "Target repository",
          kind: "text",
          editable: true,
        },
        {
          key: "rem.baseBranch",
          label: "Base branch",
          kind: "text",
          editable: true,
        },
        {
          key: "rem.requireCi",
          label: "Require CI green before merge",
          kind: "toggle",
          editable: true,
          raiseOnly: true,
        },
        {
          key: "rem.ticketProject",
          label: "Ticket project",
          kind: "text",
          editable: true,
        },
      ],
    ),
    g(
      "safety",
      "Rollback & halt",
      "The guarantee that a wrong action can be walked back",
      [
        {
          key: "rem.rollbackJournal",
          label: "Undo journal",
          hint: "Every applied change records its inverse. Retention is set by the evidence policy.",
          kind: "readonly",
          editable: false,
        },
        {
          key: "rem.killSwitch",
          label: "Halt all remediation now",
          hint: "Stops in-flight work immediately. No confirmation — halting is always safe.",
          kind: "action",
          editable: true,
          danger: true,
        },
      ],
    ),
  ],
};

/* ------------------------------------------------------------------ *
 * Sharing
 * ------------------------------------------------------------------ */

const SHARING: SettingsView = {
  id: "sharing",
  label: "Sharing",
  hint: "Who can see what this conversation produced — per artifact, not per workspace",
  groups: [
    g(
      "defaults",
      "Visibility",
      "Where new artifacts start, and where they are now",
      [
        {
          key: "share.defaultVisibility",
          label: "New artifacts start as",
          kind: "select",
          options: [
            { value: "private", label: "Private to me" },
            { value: "workspace", label: "Visible to the workspace" },
            { value: "group", label: "Visible to a named group" },
          ],
          editable: true,
          tighten: true,
        },
        {
          key: "share.classification",
          label: "Data classification",
          hint: "Derived from what is in scope. It sets the floors on this page.",
          kind: "readonly",
          editable: false,
        },
        {
          key: "share.artifacts",
          label: "Artifacts in this conversation",
          kind: "table",
          columns: [
            { key: "artifact", label: "Artifact", mono: true, minWidth: 190 },
            { key: "type", label: "Type" },
            { key: "audience", label: "Audience", minWidth: 150 },
            { key: "setBy", label: "Set by" },
          ],
          maxRows: 6,
          editable: false,
        },
      ],
    ),
    g(
      "links",
      "External links",
      "Time-boxed access for people outside the workspace",
      [
        {
          key: "share.links.enabled",
          label: "Allow external links",
          kind: "toggle",
          editable: true,
          tighten: true,
        },
        {
          key: "share.links.maxTtlDays",
          label: "Maximum link lifetime",
          hint: "Short by default. Extending past the workspace cap needs an admin.",
          kind: "number",
          unit: "days",
          min: 1,
          max: 90,
          editable: true,
          tighten: true,
        },
        {
          key: "share.links.active",
          label: "Active links",
          kind: "table",
          columns: [
            { key: "artifact", label: "Artifact", mono: true, minWidth: 180 },
            { key: "audience", label: "Audience" },
            { key: "expires", label: "Expires", mono: true },
            { key: "accesses", label: "Opened", numeric: true },
          ],
          maxRows: 6,
          editable: false,
        },
      ],
    ),
    g("export", "Export", "What can leave, and in what state", [
      {
        key: "share.export.formats",
        label: "Export formats",
        kind: "chips",
        editable: true,
        tighten: true,
      },
      {
        key: "share.export.redaction",
        label: "Export redaction",
        hint: "One profile governs every exit. Change it under Data.",
        kind: "readonly",
        editable: false,
      },
      {
        key: "share.export.evidence",
        label: "Share evidence artifacts",
        kind: "toggle",
        editable: false,
        lockedBy: "Always",
        lockReason:
          "Sharing evidence is an audited action requested from the record, not a toggle",
      },
    ]),
  ],
};

/* ------------------------------------------------------------------ *
 * Data & retention
 * ------------------------------------------------------------------ */

const DATA: SettingsView = {
  id: "data",
  label: "Data",
  hint: "How long this conversation is kept, and what is stripped from it",
  groups: [
    g(
      "retention",
      "Retention",
      "Set by obligation, not preference — shown so the duration is explicable",
      [
        {
          key: "data.transcriptRetention",
          label: "Transcript",
          kind: "readonly",
          editable: false,
        },
        {
          key: "data.evidenceRetention",
          label: "Evidence",
          hint: "Compliance-mode lock — cannot be shortened or deleted by anyone, including root.",
          kind: "readonly",
          editable: false,
          lockedBy: "Enterprise",
          lockReason: "Retention floor is a compliance obligation",
        },
        {
          key: "data.legalHold",
          label: "Legal hold",
          kind: "readonly",
          editable: false,
        },
        {
          key: "data.residency",
          label: "Residency",
          kind: "readonly",
          editable: false,
        },
      ],
    ),
    g(
      "redaction",
      "Redaction",
      "What is removed before anything is stored or exported",
      [
        {
          key: "data.redactionProfile",
          label: "Redaction profile",
          kind: "select",
          options: [
            { value: "standard", label: "Standard" },
            { value: "standard_pii", label: "Standard + PII" },
            { value: "strict", label: "Strict — identifiers removed" },
          ],
          editable: true,
          raiseOnly: true,
        },
        {
          key: "data.customPatterns",
          label: "Additional patterns",
          hint: "Unions with the workspace list. Patterns can be added here, never removed.",
          kind: "chips",
          editable: true,
          raiseOnly: true,
        },
        {
          key: "data.export",
          label: "Export conversation data",
          hint: "Redaction applies to the export.",
          kind: "action",
          editable: true,
        },
      ],
    ),
  ],
};

/* ------------------------------------------------------------------ *
 * Observability
 * ------------------------------------------------------------------ */

const OBSERVABILITY: SettingsView = {
  id: "observability",
  label: "Observability",
  hint: "What this session did — beside the controls that caused it",
  groups: [
    g("ledger", "Command ledger", "Every command this session ran", [
      {
        key: "obs.ledger",
        label: "Commands",
        kind: "table",
        columns: [
          { key: "time", label: "Time", mono: true },
          { key: "command", label: "Command", mono: true, minWidth: 260 },
          { key: "exit", label: "Exit", numeric: true, mono: true },
          { key: "duration", label: "Took", numeric: true, mono: true },
        ],
        maxRows: 6,
        editable: false,
      },
    ]),
    g(
      "security",
      "Security events",
      "Blocked egress, screening hits, denied grants",
      [
        {
          key: "obs.security",
          label: "Events",
          kind: "table",
          columns: [
            { key: "time", label: "Time", mono: true },
            { key: "event", label: "Event", minWidth: 170 },
            { key: "detail", label: "Detail", minWidth: 240 },
          ],
          maxRows: 6,
          editable: false,
        },
      ],
    ),
    g(
      "changes",
      "Settings changes",
      "Who narrowed what, and when — this tab's own audit",
      [
        {
          key: "obs.changes",
          label: "Changes",
          kind: "table",
          compute: "changeLog",
          columns: [
            { key: "time", label: "Time", mono: true },
            { key: "setting", label: "Setting", minWidth: 200 },
            { key: "change", label: "Change", mono: true, minWidth: 170 },
          ],
          maxRows: 6,
          editable: false,
        },
      ],
    ),
    g(
      "diagnostics",
      "Diagnostics",
      "Verbosity, and getting the session out for analysis",
      [
        {
          key: "obs.logLevel",
          label: "Log level",
          kind: "select",
          options: [
            { value: "error", label: "Error" },
            { value: "warn", label: "Warning" },
            { value: "info", label: "Info" },
            { value: "debug", label: "Debug — verbose" },
          ],
          editable: true,
        },
        {
          key: "obs.export",
          label: "Export session log",
          hint: "Redaction applies.",
          kind: "action",
          editable: true,
        },
      ],
    ),
  ],
};

/* ------------------------------------------------------------------ *
 * Danger zone
 * ------------------------------------------------------------------ */

const DANGER: SettingsView = {
  id: "danger",
  label: "Danger zone",
  hint: "Actions that discard state. Each says what it destroys before you press it",
  groups: [
    g("actions", "Session actions", "Ordered by how much they destroy", [
      {
        key: "danger.rebuild",
        label: "Rebuild from image",
        hint: "Discards the writable layer — installed packages and anything outside workspace paths.",
        kind: "action",
        editable: true,
        danger: true,
      },
      {
        key: "danger.purge",
        label: "Purge workspace files",
        hint: "Blocked while a legal hold is active.",
        kind: "action",
        editable: true,
        danger: true,
      },
      {
        key: "danger.revoke",
        label: "Revoke all credentials",
        hint: "In-flight calls holding a grant fail immediately.",
        kind: "action",
        editable: true,
        danger: true,
      },
      {
        key: "danger.kill",
        label: "Kill switch",
        hint: "Halts the agent and all in-flight remediation. No confirmation — halting is always safe.",
        kind: "action",
        editable: true,
        danger: true,
      },
    ]),
  ],
};

export const SETTINGS_VIEWS: SettingsView[] = [
  QUICK,
  SESSION,
  CHAT,
  TOOLS,
  CANVAS,
  REPORT,
  REMEDIATION,
  SHARING,
  DATA,
  OBSERVABILITY,
  DANGER,
];

/** Field lookup, for the computed tables that name settings by key. */
export const FIELD_BY_KEY: Record<string, SettingField> = Object.fromEntries(
  SETTINGS_VIEWS.flatMap((v) =>
    v.groups.flatMap((grp) => grp.fields.map((f) => [f.key, f] as const)),
  ),
);
